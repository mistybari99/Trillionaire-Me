import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const repository = "mistybari99/Trillionaire-Me";
export const productionBranch = "ccr-8b686ba2-vitt45";
const api = `https://api.github.com/repos/${repository}`;

export function validateBuildContext(env, checkoutSha) {
  if (env.WORKERS_CI !== "1" || env.WORKERS_CI_BRANCH !== productionBranch) {
    throw new Error("Production gate requires Workers Builds on the configured production branch.");
  }
  const sha = env.WORKERS_CI_COMMIT_SHA;
  if (!/^[a-f0-9]{40}$/.test(sha ?? "") || sha !== checkoutSha) {
    throw new Error("Workers commit metadata must match the checked-out full commit SHA.");
  }
  return sha;
}

// Public, read-only API: no GitHub token is sent to the build service.
export async function waitForCi(sha, {
  fetchImpl = fetch,
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  attempts = 16,
  intervalMs = 60_000,
  log = console.log,
} = {}) {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("Expected a full commit SHA.");
  async function get(url) {
    const response = await fetchImpl(url, {
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      signal: AbortSignal.timeout(10_000),
      redirect: "error",
    });
    if (!response.ok) throw new Error(`GitHub CI verification unavailable (HTTP ${response.status}); deployment blocked.`);
    return response.json();
  }
  for (let attempt = 0; attempt < attempts; attempt++) {
    const query = new URLSearchParams({ head_sha: sha, branch: productionBranch, event: "push", per_page: "100" });
    const data = await get(`${api}/actions/workflows/ci.yml/runs?${query}`);
    if (!Array.isArray(data.workflow_runs)) throw new Error("Invalid GitHub workflow response; deployment blocked.");
    // Validate again locally: a PR/other commit/other repository can never authorize this build.
    const runs = data.workflow_runs.filter((run) => run.head_sha === sha && run.head_branch === productionBranch
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
    log(`Waiting for successful production push CI for ${sha} (${attempt + 1}/${attempts}).`);
    if (attempt + 1 < attempts) await pause(intervalMs);
  }
  throw new Error("Timed out waiting for exact-commit CI; deployment blocked. Retry the build after CI passes.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const checkoutSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    await waitForCi(validateBuildContext(process.env, checkoutSha));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
