// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { productionBranch, repository, waitForCi } from "../tools/check_deploy.mjs";
const sha = "a".repeat(40);
const run = { id: 100, run_attempt: 1, head_sha: sha, head_branch: productionBranch, event: "push", path: ".github/workflows/ci.yml", repository: { full_name: repository }, status: "completed", conclusion: "success" };
const success = () => new Response(JSON.stringify({ workflow_runs: [run] }));
const jobs = () => new Response(JSON.stringify({ jobs: [{ name: "check", status: "completed", conclusion: "success" }] }));
const options = { attempts: 1, pause: vi.fn(async () => {}), log: vi.fn() };
describe("GitHub gate HTTP handling", () => {
  it("identifies the application and still sends no credentials", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(success()).mockResolvedValueOnce(jobs());
    await waitForCi(sha, { ...options, fetchImpl });
    for (const [, init] of fetchImpl.mock.calls) {
      expect(init?.headers).toHaveProperty("User-Agent", "Trillionaire-Me-CI-Gate (mistybari99/Trillionaire-Me)");
      expect(init?.headers).not.toHaveProperty("Authorization");
    }
  });
  it("exposes public rate-limit diagnostics without claiming a cause from status alone", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ message: "API rate limit exceeded" }), { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 3600), "x-github-request-id": "ABC" } }));
    await expect(waitForCi(sha, { ...options, fetchImpl })).rejects.toThrow(/HTTP 403.*API rate limit exceeded.*x-ratelimit-remaining=0.*x-github-request-id=ABC/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("does not retry ordinary Forbidden or bypass verification", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ message: "User agent required" }), { status: 403 }));
    await expect(waitForCi(sha, { ...options, fetchImpl })).rejects.toThrow(/User agent required/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it.each([403, 429])("retries one explicit short rate wait for HTTP %s, then verifies run and job", async (status) => {
    const pause = vi.fn(async () => {});
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response("{}", { status, headers: { "retry-after": "0" } })).mockResolvedValueOnce(success()).mockResolvedValueOnce(jobs());
    await waitForCi(sha, { ...options, pause, fetchImpl });
    expect(pause).toHaveBeenCalledTimes(1); expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
  it("fails closed after its single rate retry", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () => new Response("{}", { status: 429, headers: { "retry-after": "0" } }));
    await expect(waitForCi(sha, { ...options, fetchImpl })).rejects.toThrow(/HTTP 429/);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it.each(["invalid", "60"])("does not retry malformed or long Retry-After: %s", async (retry) => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 429, headers: { "retry-after": retry } }));
    await expect(waitForCi(sha, { ...options, fetchImpl })).rejects.toThrow(/HTTP 429/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
