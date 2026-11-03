// In-page check: neighbouring buttons / cards / boxes that touch (vertical gap under 4 px while overlapping sideways).
// Used by tools/e2e.mjs and tools/screenshots.mjs. `TOUCHING_FN` is a function body string for page.evaluate.
export const TOUCHING_FN = `(() => {
  const SEL = ".row,.btn,.cta,button:not(.tab):not(.skip),.card,.next-step,.note,blockquote,table,details,.reward,label.btn";
  const vis = (e) => { const b = e.getBoundingClientRect(); const s = getComputedStyle(e); return b.width > 4 && b.height > 4 && s.visibility !== "hidden" && s.position !== "fixed" && s.position !== "absolute"; };
  const out = [];
  for (const a of document.querySelectorAll("main " + SEL.split(",").join(",main "))) {
    if (!vis(a)) continue;
    const bEl = a.nextElementSibling; if (!bEl || !bEl.matches(SEL) || !vis(bEl)) continue;
    if (a.contains(bEl) || bEl.contains(a)) continue;
    const ra = a.getBoundingClientRect(), rb = bEl.getBoundingClientRect();
    const overlap = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
    const gap = rb.top - ra.bottom;
    if (overlap > 20 && gap < 4 && gap > -2) out.push({ a: (a.className || a.tagName) + ":" + (a.textContent || "").trim().slice(0, 24), b: (bEl.className || bEl.tagName) + ":" + (bEl.textContent || "").trim().slice(0, 24), gap: Math.round(gap * 10) / 10 });
  }
  return out;
})()`;
