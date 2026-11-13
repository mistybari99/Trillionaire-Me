import type { waitForCi } from "./check_deploy.mjs";
export function validatePreviewBuildContext(env: Record<string, string | undefined>, checkoutSha: string): { sha: string; branch: string };
export function waitForPreviewCi(sha: string, branch: string, options?: Parameters<typeof waitForCi>[1]): Promise<void>;
