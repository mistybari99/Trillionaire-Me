// Secret-pattern rejection (TM-REQ-034) and no-guarantee copy hooks (TM-REQ-004).
export type SecretKind = "password" | "otp" | "cvv" | "card" | "pin" | "recovery" | "national_id" | "bank_account";

const luhn = (digits: string): boolean => {
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
};

// Bangla digits are normalised first so ১২৩৪ is caught the same as 1234.
const normDigits = (s: string) => s.replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));

const KEYWORD_SECRET: [SecretKind, RegExp][] = [
  ["password", /(pass(word|code|wd)?|pwd|পাসওয়ার্ড|পাসকোড)\s*[:=\-]?\s*\S+/i],
  ["otp", /(\botp\b|one[- ]time|ওটিপি|ভেরিফিকেশন কোড|verification code)\D{0,12}\d{4,8}/i],
  ["cvv", /(\bcvv2?\b|\bcvc\b|security code|সিভিভি)\D{0,8}\d{3,4}/i],
  ["pin", /(\bpin\b|পিন)\s*(code|number|নম্বর)?\D{0,6}\d{4,6}/i],
  ["recovery", /(seed phrase|recovery (phrase|key|code)|secret key|private key|রিকভারি (ফ্রেজ|কোড)|সিড ফ্রেজ)/i],
  ["national_id", /(\bnid\b|national id|জাতীয় পরিচয়|passport (no|number))\D{0,10}\d{8,17}/i],
  ["bank_account", /(account (no|number)|a\/c|অ্যাকাউন্ট নম্বর|হিসাব নম্বর)\D{0,8}\d{8,20}/i],
];

export function detectSecret(input: string): SecretKind | null {
  const s = normDigits(input);
  for (const [kind, re] of KEYWORD_SECRET) if (re.test(s)) return kind;
  for (const m of s.matchAll(/(?:\d[ -]?){13,19}/g)) {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length >= 13 && digits.length <= 19 && luhn(digits)) return "card";
  }
  // 12 or 24 lowercase words in a row looks like a wallet recovery phrase
  const words = s.trim().split(/\s+/);
  if ((words.length === 12 || words.length === 24) && words.every((w) => /^[a-z]{3,8}$/.test(w))) return "recovery";
  return null;
}

export type SecretCheck = { ok: true; value: string } | { ok: false; kind: SecretKind };

export function checkFreeText(input: string): SecretCheck {
  const kind = detectSecret(input);
  return kind ? { ok: false, kind } : { ok: true, value: input };
}

/** Redact for any log/export path; callers must use this instead of raw strings. */
export function redact(input: string): string {
  return detectSecret(input) ? "[redacted]" : input;
}
