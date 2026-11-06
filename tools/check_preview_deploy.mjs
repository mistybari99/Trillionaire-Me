import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { productionBranch } from "./check_deploy.mjs";
import { waitForBranchCi } from "./check_branch_ci.mjs";

export function validatePreviewBuildContext(env, checkoutSha) {
  const branch = env.WORKERS_CI_BRANCH;
  if (env.WORKERS_CI !== "1" || !branch || branch === productionBranch
    || branch.startsWith("refs/") || /[\s\x00-\x1f\x7f]/.test(branch)) {
    throw new Error("Preview gate requires Workers Builds on an explicit nonproduction branch.");
  }
  const sha = env.WORKERS_CI_COMMIT_SHA;
  if (!/^[a-f0-9]{40}$/.test(sha ?? "") || sha !== checkoutSha) {
    throw new Error("Workers commit metadata must match the checked-out full commit SHA.");
  }
  return { sha, branch };
}

export async function waitForPreviewCi(sha, branch, options) {
  // Enforce the preview boundary for direct module callers as well as the CLI.
  validatePreviewBuildContext({ WORKERS_CI: "1", WORKERS_CI_BRANCH: branch, WORKERS_CI_COMMIT_SHA: sha }, sha);
  return waitForBranchCi(sha, branch, options);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const checkoutSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const { sha, branch } = validatePreviewBuildContext(process.env, checkoutSha);
    await waitForPreviewCi(sha, branch);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
