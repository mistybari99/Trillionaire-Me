// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { productionBranch, repository, waitForCi } from "../tools/check_deploy.mjs";
import { validatePreviewBuildContext, waitForPreviewCi } from "../tools/check_preview_deploy.mjs";

const sha = "a".repeat(40), branch = "feat/contextual-help-navigation";
const run = (changes = {}) => ({ id: 100, run_attempt: 1, head_sha: sha, head_branch: branch, event: "push", path: ".github/workflows/ci.yml", repository: { full_name: repository }, status: "completed", conclusion: "success", ...changes });
const job = { name: "check", status: "completed", conclusion: "success" };
const options = { attempts: 1, pause: vi.fn(async () => {}), log: vi.fn() };
function responses(...payloads: unknown[]) {
  return vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify(payloads.shift()), { status: 200 }));
}

describe("nonproduction preview gate", () => {
  it("checks Workers metadata against the actual checkout", () => {
    const env = { WORKERS_CI: "1", WORKERS_CI_BRANCH: branch, WORKERS_CI_COMMIT_SHA: sha };
    expect(validatePreviewBuildContext(env, sha)).toEqual({ sha, branch });
    expect(() => validatePreviewBuildContext({}, sha)).toThrow(/nonproduction/);
    expect(() => validatePreviewBuildContext(env, "b".repeat(40))).toThrow(/match/);
    expect(() => validatePreviewBuildContext({ ...env, WORKERS_CI_COMMIT_SHA: "abc" }, "abc")).toThrow(/full commit/);
  });
  it.each([productionBranch, "", "refs/heads/feature", "bad\nbranch"])("refuses unsafe/production branch %j even for direct callers", async (candidate) => {
    const fetchImpl = responses({ workflow_runs: [run()] });
    await expect(waitForPreviewCi(sha, candidate, { ...options, fetchImpl })).rejects.toThrow(/nonproduction/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("authorizes only current branch exact-SHA push CI and current-attempt check job", async () => {
    const fetchImpl = responses({ workflow_runs: [run({ run_attempt: 2 })] }, { jobs: [job] });
    await waitForPreviewCi(sha, branch, { ...options, fetchImpl });
    const url = new URL(String(fetchImpl.mock.calls[0]![0]));
    expect(url.searchParams.get("branch")).toBe(branch);
    expect(url.searchParams.get("head_sha")).toBe(sha);
    expect(url.searchParams.get("event")).toBe("push");
    expect(fetchImpl.mock.calls[1]![0]).toContain("/attempts/2/jobs");
    expect(fetchImpl.mock.calls[0]![1]?.headers).not.toHaveProperty("Authorization");
  });
  it.each([{ head_branch: productionBranch }, { head_branch: "feat/other" }, { head_sha: "b".repeat(40) }, { event: "pull_request" }, { repository: { full_name: "someone/fork" } }, { path: ".github/workflows/other.yml" }])("cannot use an unrelated success: %j", async (changes) => {
    await expect(waitForPreviewCi(sha, branch, { ...options, fetchImpl: responses({ workflow_runs: [run(changes)] }) })).rejects.toThrow(/Timed out/);
  });
  it.each(["failure", "cancelled", "skipped", "timed_out"])("blocks %s CI", async (conclusion) => {
    await expect(waitForPreviewCi(sha, branch, { ...options, fetchImpl: responses({ workflow_runs: [run({ conclusion })] }) })).rejects.toThrow(/deployment blocked/);
  });
  it("blocks a failed latest run even when an older run passed", async () => {
    await expect(waitForPreviewCi(sha, branch, { ...options, fetchImpl: responses({ workflow_runs: [run(), run({ id: 101, conclusion: "failure" })] }) })).rejects.toThrow(/finished with failure/);
  });
  it("blocks a skipped check job, missing CI, rate limits and offline verification", async () => {
    await expect(waitForPreviewCi(sha, branch, { ...options, fetchImpl: responses({ workflow_runs: [run()] }, { jobs: [{ ...job, conclusion: "skipped" }] }) })).rejects.toThrow(/required CI check job/);
    await expect(waitForPreviewCi(sha, branch, { ...options, fetchImpl: responses({ workflow_runs: [] }) })).rejects.toThrow(/Timed out/);
    await expect(waitForPreviewCi(sha, branch, { ...options, fetchImpl: vi.fn(async () => new Response("", { status: 403 })) })).rejects.toThrow(/HTTP 403/);
    await expect(waitForPreviewCi(sha, branch, { ...options, fetchImpl: vi.fn(async () => { throw new Error("offline"); }) })).rejects.toThrow(/offline/);
  });
  it("does not broaden the production gate to accept feature CI", async () => {
    await expect(waitForCi(sha, { ...options, fetchImpl: responses({ workflow_runs: [run()] }) })).rejects.toThrow(/Timed out/);
  });
  it("pins local CLI and keeps static previews free of production bindings", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
    const config = JSON.parse(readFileSync("wrangler.jsonc", "utf8"));
    expect(pkg.devDependencies.wrangler).toBe("4.158.0");
    expect(lock.packages["node_modules/wrangler"].version).toBe("4.158.0");
    expect(pkg.scripts["build:verified"]).toBe("node tools/check_deploy.mjs && npm run build");
    expect(pkg.scripts["build:preview:verified"]).toBe("node tools/check_preview_deploy.mjs && npm run build");
    expect(config.compatibility_date).toBe("2026-10-19");
    expect(config.previews).toEqual({});
    expect(Object.keys(config).sort()).toEqual(["$schema", "assets", "compatibility_date", "name", "previews"]);
    expect(config.assets).toEqual({ directory: "./dist", not_found_handling: "single-page-application" });
  });
});
