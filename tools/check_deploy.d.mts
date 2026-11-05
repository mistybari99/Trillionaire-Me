export const repository: string;
export const productionBranch: string;
export function validateBuildContext(env: Record<string, string | undefined>, checkoutSha: string): string;
export function waitForCi(sha: string, options?: {
  fetchImpl?: typeof fetch;
  pause?: (ms: number) => Promise<void>;
  attempts?: number;
  intervalMs?: number;
  log?: (message: string) => void;
}): Promise<void>;
