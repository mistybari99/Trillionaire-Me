import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { waitForBranchCi } from "./check_branch_ci.mjs";

export const repository = "mistybari99/Trillionaire-Me";
export const productionBranch = "ccr-8b686ba2-vitt45";

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

// Production callers cannot override the protected branch.
export function waitForCi(sha, options) {
  return waitForBranchCi(sha, productionBranch, options);
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
