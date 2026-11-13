// Numbers are always shown with Latin digits (0–9), in every mode. Bangla digits (০–৯) were hard to read on phones (owner feedback).
// Input parsing still accepts Bangla digits; only output is converted.
export const latinDigits = (s: string): string => s.replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
