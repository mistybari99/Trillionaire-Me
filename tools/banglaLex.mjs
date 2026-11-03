// Tiny TypeScript string-literal scanner (no compiler API needed). Yields the text segments of string literals so a tool can edit
// them by position. Handles comments, '...' "..." `...` (with ${} nesting) and simple regex literals. Only used by bangla_plain_apply.mjs and tests.
export function scanStrings(src) {
  const out = []; // {start, end, quote} where src.slice(start,end) is the raw body of the segment
  const n = src.length; let i = 0; let prevSig = ""; // last significant char / word
  const regexOk = () => prevSig === "" || /[(,=:\[!&|?{};+\-*%<>~^]/.test(prevSig) || prevSig === "return";
  const tplStack = []; // brace depth markers for ${ }
  let depth = 0;
  const readTemplate = () => {
    // i is just after the opening backtick or after the closing } of a ${...}
    let s = i;
    while (i < n) {
      const c = src[i];
      if (c === "\\") { i += 2; continue; }
      if (c === "`") { out.push({ start: s, end: i, quote: "`" }); i++; prevSig = "`"; return; }
      if (c === "$" && src[i + 1] === "{") { out.push({ start: s, end: i, quote: "`" }); i += 2; tplStack.push(depth); depth++; prevSig = "{"; return; }
      i++;
    }
  };
  while (i < n) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") { while (i < n && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i + 2); i = i < 0 ? n : i + 2; continue; }
    if (c === '"' || c === "'") {
      const q = c; const s = ++i;
      while (i < n && src[i] !== q) { if (src[i] === "\\") i++; i++; }
      out.push({ start: s, end: i, quote: q }); i++; prevSig = q; continue;
    }
    if (c === "`") { i++; readTemplate(); continue; }
    if (c === "{") { depth++; prevSig = c; i++; continue; }
    if (c === "}") {
      depth--; i++;
      if (tplStack.length && tplStack[tplStack.length - 1] === depth) { tplStack.pop(); readTemplate(); continue; }
      prevSig = "}"; continue;
    }
    if (c === "/" && regexOk()) {
      i++; let cls = false;
      while (i < n && (src[i] !== "/" || cls) && src[i] !== "\n") { if (src[i] === "\\") i++; else if (src[i] === "[") cls = true; else if (src[i] === "]") cls = false; i++; }
      i++; while (/[a-z]/i.test(src[i] ?? "")) i++; prevSig = "/r"; continue;
    }
    if (/\s/.test(c)) { i++; continue; }
    if (/[A-Za-z_$]/.test(c)) { let s = i; while (/[\w$]/.test(src[i] ?? "")) i++; prevSig = src.slice(s, i) === "return" ? "return" : "w"; continue; }
    if (/\d/.test(c)) { while (/[\w.]/.test(src[i] ?? "")) i++; prevSig = "0"; continue; }
    prevSig = c; i++;
  }
  return out;
}
