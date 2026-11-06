// In-page check: neighbouring buttons / cards / boxes that touch (vertical gap under 4 px while overlapping sideways).
// Used by tools/e2e.mjs and tools/screenshots.mjs. `TOUCHING_FN` is a function body string for page.evaluate.
export const TOUCHING_FN = `(() => {
  const SEL = ".row,.btn,.cta,button:not(.tab):not(.skip),.card,.next-step,.note,blockquote,table,details,.reward,label.btn";
  const vis = (e) => { if (e.checkVisibility && !e.checkVisibility({ visibilityProperty: true })) return false; const b = e.getBoundingClientRect(); const s = getComputedStyle(e); return b.width > 4 && b.height > 4 && s.visibility !== "hidden" && s.position !== "fixed" && s.position !== "absolute"; };
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

// Spec rule: no two visible interactive controls (button, link, input, select, textarea, summary) closer than 8 px (6 px inside a segmented group),
// when they overlap along the other axis. Text links inside a sentence are skipped (they share a line by design).
export const ADJACENT_FN = `(() => {
  const vis = (e) => { if (e.checkVisibility && !e.checkVisibility({ visibilityProperty: true })) return false; const b = e.getBoundingClientRect(); const s = getComputedStyle(e); return b.width > 4 && b.height > 4 && s.visibility !== "hidden" && s.display !== "none" && !e.closest(".sr-only,[aria-hidden=true],nav,.skip"); };
  const els = [...document.querySelectorAll("main a[href], main button, main input:not([type=hidden]):not([type=checkbox]):not([type=radio]), main select, main textarea, main summary")].filter(vis)
    .filter((e) => !(e.tagName === "A" && !e.className && e.closest("p,li,dd,span") && e.parentElement && e.parentElement.childNodes.length > 1));
  const out = [];
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = els[i], b = els[j]; if (a.contains(b) || b.contains(a)) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    const need = a.closest(".seg,.k-seg") && a.parentElement === b.parentElement ? 6 : 8;
    const gapY = Math.max(rb.top - ra.bottom, ra.top - rb.bottom), gapX = Math.max(rb.left - ra.right, ra.left - rb.right);
    if ((oy > 2 && gapX >= -0.5 && gapX < need) || (ox > 2 && gapY >= -0.5 && gapY < need)) out.push((a.textContent || a.tagName).trim().slice(0, 20) + " | " + (b.textContent || b.tagName).trim().slice(0, 20) + " gap " + Math.round(Math.min(gapX < 0 ? 99 : gapX, gapY < 0 ? 99 : gapY)));
  }
  return out;
})()`;
