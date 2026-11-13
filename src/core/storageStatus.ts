// Device storage status (pure: the navigator is passed in). Asks the browser to keep this app's data, and reads whether it will.
// Unknown stays unknown: an unsupported browser gives null, never 0 or "no".
export interface StorageLike { persist?: () => Promise<boolean>; persisted?: () => Promise<boolean>; estimate?: () => Promise<{ usage?: number; quota?: number }> }
export interface StorageStatus { persisted: boolean | null; usage: number | null; quota: number | null }

const num = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : null);

/** Asks the browser to keep the data (call after the real-data tick or the first real entry). Never throws; null when unsupported. */
export async function requestPersist(s: StorageLike | undefined): Promise<boolean | null> {
  try { if (!s?.persist) return null; return (await s.persist()) === true; } catch { return null; }
}

export async function readStorageStatus(s: StorageLike | undefined): Promise<StorageStatus> {
  let persisted: boolean | null = null, usage: number | null = null, quota: number | null = null;
  try { if (s?.persisted) persisted = (await s.persisted()) === true; } catch { /* unknown */ }
  try { if (s?.estimate) { const e = await s.estimate(); usage = num(e?.usage); quota = num(e?.quota); } } catch { /* unknown */ }
  return { persisted, usage, quota };
}

/** Plain size text with Latin digits: "Unknown" is the caller's job (null in, null out). */
export function sizeText(bytes: number | null): string | null {
  if (bytes === null) return null;
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}
