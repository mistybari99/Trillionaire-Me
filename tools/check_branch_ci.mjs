const repository = "mistybari99/Trillionaire-Me";
const api = `https://api.github.com/repos/${repository}`;

// Public, read-only API: no GitHub token is sent to the build service.
export async function waitForBranchCi(sha, branch, {
  fetchImpl = fetch,
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  attempts = 16,
  intervalMs = 60_000,
  log = console.log,
} = {}) {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("Expected a full commit SHA.");
  async function get(url) {
    for (let requestAttempt = 0; requestAttempt < 2; requestAttempt++) {
      const response = await fetchImpl(url, {
        headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "Trillionaire-Me-CI-Gate (mistybari99/Trillionaire-Me)" },
        signal: AbortSignal.timeout(10_000),
        redirect: "error",
      });
      if (response.ok) return response.json();
      const clean = (value) => String(value).replace(/[\x00-\x1f\x7f]/g, " ").slice(0, 240);
      let message = "";
      try { const body = await response.json(); if (typeof body.message === "string") message = clean(body.message); } catch { /* non-JSON failures remain blocked */ }
      const names = ["x-ratelimit-remaining", "x-ratelimit-reset", "retry-after", "x-github-request-id"];
      const info = names.flatMap((name) => { const value = response.headers.get(name); return value === null ? [] : [`${name}=${clean(value)}`]; });
      const error = `GitHub CI verification unavailable (HTTP ${response.status}); deployment blocked.${message ? ` ${message}` : ""}${info.length ? ` [${info.join("; ")}]` : ""}`;
      const retryAfter = response.headers.get("retry-after");
      const remaining = response.headers.get("x-ratelimit-remaining");
      const reset = response.headers.get("x-ratelimit-reset");
      const rateLimited = response.status === 429 || (response.status === 403 && (remaining === "0" || retryAfter !== null));
      const delayMs = retryAfter !== null
        ? (/^\d+(?:\.\d+)?$/.test(retryAfter) ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.now())
        : remaining === "0" && reset !== null && /^\d+$/.test(reset) ? Number(reset) * 1000 - Date.now() : NaN;
      // Retry once only when the server gives a short, explicit rate-limit wait.
      // Long/shared-IP exhaustion and ordinary Forbidden errors stay blocked.
      if (requestAttempt === 0 && rateLimited && Number.isFinite(delayMs) && delayMs >= -1000 && delayMs <= 30_000) {
        log(`${error} Retrying once after the server's rate-limit wait.`);
        await pause(Math.max(0, Math.ceil(delayMs)));
        continue;
      }
      throw new Error(error);
    }
  }
  for (let attempt = 0; attempt < attempts; attempt++) {
    const query = new URLSearchParams({ head_sha: sha, branch, event: "push", per_page: "100" });
    const data = await get(`${api}/actions/workflows/ci.yml/runs?${query}`);
    if (!Array.isArray(data.workflow_runs)) throw new Error("Invalid GitHub workflow response; deployment blocked.");
    // Validate again locally: a PR/other commit/other repository can never authorize this build.
    const runs = data.workflow_runs.filter((run) => run.head_sha === sha && run.head_branch === branch
      && run.event === "push" && run.repository?.full_name === repository
      && run.path === ".github/workflows/ci.yml" && Number.isSafeInteger(run.id) && run.id > 0
      && Number.isSafeInteger(run.run_attempt) && run.run_attempt > 0);
    const run = runs.sort((a, b) => b.id - a.id)[0];
    if (run?.status === "completed") {
      if (run.conclusion !== "success") throw new Error(`CI ${run.id} finished with ${run.conclusion}; deployment blocked.`);
      // Overall workflow success can include skipped jobs: require the actual check job.
      const jobs = await get(`${api}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`);
      if (!Array.isArray(jobs.jobs) || !jobs.jobs.some((job) => job.name === "check" && job.status === "completed" && job.conclusion === "success")) {
        throw new Error("The required CI check job did not pass; deployment blocked.");
      }
      log(`Verified CI ${run.id} attempt ${run.run_attempt} for ${sha}.`);
      return;
    }
    log(`Waiting for successful ${branch} push CI for ${sha} (${attempt + 1}/${attempts}).`);
    if (attempt + 1 < attempts) await pause(intervalMs);
  }
  throw new Error("Timed out waiting for exact-commit CI; deployment blocked. Retry the build after CI passes.");
}

