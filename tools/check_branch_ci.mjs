const repository = "mistybari99/Trillionaire-Me";
const api = `https://api.github.com/repos/${repository}`;

// A temporary problem (shared-IP rate limit, GitHub 5xx, network blip, timeout) must not fail a build that is simply waiting for CI:
// the poll goes on and the problem only counts as one used attempt. If every attempt hits it, the build still fails closed with the last reason.
// Everything else (CI failed, wrong shape, 404/401, redirect) fails at once, as before.
class TransientError extends Error {}

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
    let response;
    try {
      response = await fetchImpl(url, {
        headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
        signal: AbortSignal.timeout(10_000),
        redirect: "error",
      });
    } catch (error) {
      throw new TransientError(error instanceof Error ? error.message : String(error));
    }
    if (!response.ok) {
      const failure = `GitHub CI verification unavailable (HTTP ${response.status}); deployment blocked.`;
      // 403 and 429 are how the public API answers when the build network's shared address has used its hourly allowance.
      throw (response.status === 403 || response.status === 429 || response.status >= 500) ? new TransientError(failure) : new Error(failure);
    }
    try { return await response.json(); } catch (error) { throw new TransientError(error instanceof Error ? error.message : String(error)); }
  }
  let lastTransient = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
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
    lastTransient = null;
    log(`Waiting for successful ${branch} push CI for ${sha} (${attempt + 1}/${attempts}).`);
    } catch (error) {
      if (!(error instanceof TransientError)) throw error;
      lastTransient = error;
      log(`Temporary problem while checking CI (${error.message}); trying again (${attempt + 1}/${attempts}).`);
    }
    if (attempt + 1 < attempts) await pause(intervalMs);
  }
  if (lastTransient) throw new Error(lastTransient.message);
  throw new Error("Timed out waiting for exact-commit CI; deployment blocked. Retry the build after CI passes.");
}

