// Typed-word confirmation for the one action that has no undo (Clear all real data). Pure.
// Accepted after trim, Unicode NFC and case folding: delete, DELETE, ডিলিট, ডিলেট. Same in every language mode.
export const DELETE_WORDS: readonly string[] = ["delete", "ডিলিট", "ডিলেট"];
const norm = (s: string) => s.normalize("NFC").trim().toLowerCase();
const NORM_WORDS = DELETE_WORDS.map(norm);
export const isDeleteWord = (input: string): boolean => NORM_WORDS.includes(norm(input));
