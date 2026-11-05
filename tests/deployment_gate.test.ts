// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { productionBranch, repository, validateBuildContext, waitForCi } from "../tools/check_deploy.mjs";

const sha = "a".repeat(40);
const run = (changes = {}) => ({ id: 100, run_attempt: 1, head_sha: sha, head_branch: productionBranch, event: "push", path: ".github/workflows/ci.yml", repository: { full_name: repository }, status: "completed", conclusion: "success", ...changes });
const job = { name: "check", status: "completed", conclusion: "success" };
function responses(...payloads: unknown[]) {
  return vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify(payloads.shift()), { status: 200, headers: { "Content-Type": "application/json" } }));
}
const options = { attempts: 1, pause: vi.fn(async () => {}), log: vi.fn() };

describe("production deployment gate", () => {
  it("requires Workers production branch metadata matching the checkout", () => {
    const env = { WORKERS_CI: "1", WORKERS_CI_BRANCH: productionBranch, WORKERS_CI_COMMIT_SHA: sha };
    expect(validateBuildContext(env, sha)).toBe(sha);
    expect(() => validateBuildContext({}, sha)).toThrow(/Workers Builds/);
    expect(() => validateBuildContext({ ...env, WORKERS_CI_BRANCH: "feature" }, sha)).toThrow(/production branch/);
    expect(() => validateBuildContext(env, "b".repeat(40))).toThrow(/match/);
    expect(() => validateBuildContext({ ...env, WORKERS_CI_COMMIT_SHA: "abc" }, "abc")).toThrow(/full commit/);
  });
  it("accepts the exact production push after its required job passes", async () => {
    const fetchImpl = responses({ workflow_runs: [run()] }, { jobs: [job] });
    await waitForCi(sha, { ...options, fetchImpl });
    expect(fetchImpl.mock.calls[0]![0]).toContain(`head_sha=${sha}`);
    expect(fetchImpl.mock.calls[1]![0]).toContain("/runs/100/attempts/1/jobs");
    expect(fetchImpl.mock.calls[0]![1]?.headers).not.toHaveProperty("Authorization");
  });
  it.each(["failure", "cancelled", "timed_out", "skipped", "neutral", "action_required"])("blocks a %s workflow before any build/deploy", async (conclusion) => {
    await expect(waitForCi(sha, { ...options, fetchImpl: responses({ workflow_runs: [run({ conclusion })] }) })).rejects.toThrow(/deployment blocked/);
  });
  it.each([
    { head_sha: "b".repeat(40) }, { event: "pull_request" }, { head_branch: "feature" },
    { repository: { full_name: "someone/fork" } }, { path: ".github/workflows/other.yml" },
  ])("rejects unrelated successful checks: %j", async (changes) => {
    await expect(waitForCi(sha, { ...options, fetchImpl: responses({ workflow_runs: [run(changes)] }) })).rejects.toThrow(/Timed out/);
  });
  it("does not use an older success when the latest run fails", async () => {
    await expect(waitForCi(sha, { ...options, fetchImpl: responses({ workflow_runs: [run(), run({ id: 101, conclusion: "failure" })] }) })).rejects.toThrow(/finished with failure/);
  });
  it.each([{ jobs: [] }, { jobs: [{ ...job, conclusion: "skipped" }] }, { jobs: [{ ...job, name: "unrelated" }] }])("requires the check job, not only workflow success: %j", async ({ jobs }) => {
    await expect(waitForCi(sha, { ...options, fetchImpl: responses({ workflow_runs: [run()] }, { jobs }) })).rejects.toThrow(/required CI check job/);
  });
  it("waits for concurrent CI and uses the successful current attempt", async () => {
    const pause = vi.fn(async () => {});
    const fetchImpl = responses({ workflow_runs: [] }, { workflow_runs: [run({ status: "in_progress", conclusion: null })] }, { workflow_runs: [run({ run_attempt: 2 })] }, { jobs: [job] });
    await waitForCi(sha, { ...options, attempts: 3, pause, fetchImpl });
    expect(pause).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[3]![0]).toContain("/attempts/2/jobs");
  });
  it("fails closed on rate limits, malformed responses, and network errors", async () => {
    await expect(waitForCi(sha, { ...options, fetchImpl: vi.fn(async () => new Response("", { status: 403 })) })).rejects.toThrow(/HTTP 403/);
    await expect(waitForCi(sha, { ...options, fetchImpl: responses({}) })).rejects.toThrow(/Invalid GitHub/);
    await expect(waitForCi(sha, { ...options, fetchImpl: vi.fn(async () => { throw new Error("offline"); }) })).rejects.toThrow(/offline/);
  });
});
