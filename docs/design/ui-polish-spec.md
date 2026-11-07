# UI polish spec: one component kit, every screen (3 Nov 2026)

Status: DESIGN ONLY. No source changed. Scope: owner request "replace raw/plain-looking UI on every screen". Spec > Register > this file; if this conflicts with the Spec, fix this file.
Evidence of the problem (owner phone shots): Deen "Mark done" x5 buttons touching; Today suggestion buttons touching; secondary button hugging primary; duplicated disclaimer text; badge glued inside a sentence.

## 0. What the audit found (root causes, not just symptoms)

1. `.cta, .btn` are `display:block; width:100%; margin-top:20px` (styles.css L61). Any two buttons in one container get NO shared gap rule: each screen patched its own margin (`.scr-diary .cta{margin-top:12px}`, `.scr-focus .row .btn`, inline `style: "width:auto;margin:0;min-height:44px"` in `doneBtn`, screens.ts L771). That is why Deen prayer rows and Today suggestions touch.
2. About 70 hand-written `class:"note"` / `disclaimers()` calls. `disclaimers()` (components.ts) emits 1-3 `<p>` inside one `.note`; several screens call it AND print their own sentence, so the same text appears twice.
3. `.note` is a thin left-rule "blockquote" (L81). `.need` is a second, different calm style. `.err` is a third. No single Notice.
4. `valueEl()` appends `<small class="chip">` inside the value span, and `.chip` has `margin-inline-start:6px; vertical-align:middle`: a badge inside a sentence. Same for `.tag` in labels (`.scr-intake label .tag`).
5. Form controls: global `input,select,textarea{border:1.5px solid var(--ink);border-radius:0}`; checkboxes and radios inherit `width:100%; min-height:48px` (huge stretched native box); `select` is native; no switch; labels use ad-hoc `.field` or bare `<label>` followed by input with `margin-top:6px`.
6. Tables (`table-compact`, importUi) and lists (`list-compact`, `ul`) are bare; `.list-compact` uses an undefined `--line` var with `#ddd` fallback (wrong in dark).
7. Markdown-like pages (Glossary, Safety, Status, Fields, About, Hadith, Plan docs) are headings + `<p>` + `<ul>` with browser defaults: no rhythm, no table, no code style, bare links.
8. Looks differ only by tokens plus a few `extraCss` lines in themes.ts (radius/blur/border). There is no spacing, radius, elevation or type token, so a component cannot be written once for four looks. This is the real fix: add the missing token layer.
9. 118 per-screen CSS rules keyed on `.scr-*` (L140-L260) exist only to repair spacing. After the kit lands they are deleted, not extended.

Counts (grep of src/ui): screens.ts 75 buttons / 31 inputs / 23 inline `style:`; planScreens.ts 23 / 43 / 17; modeUi 11; deenPlansUi 8 / 14; lifeUi 8 / 13; deleteUi 8 / 12 inline styles; lockUi 8 / 11 inline styles; notesUi 6 / 12.

---

## 1. Design language per look

### 1.1 Shared token layer (new, added to the base `:root` block in styles.css; every look overrides only what differs)

Existing colour roles stay exactly as they are: `--paper --card --ink --muted --rule --primary --on-primary --ember --moss --demo --demo-bg --danger --calm`. Do not rename (themes.ts `Tokens` type, a11y tests and the 4 DESIGNS depend on them). Add these (all with a safe default in the base block, so Ink & Paper needs no override):

| Group | Variable | Base value (Ink & Paper) | Use |
|---|---|---|---|
| Space (4-pt) | `--s1 4px` `--s2 8px` `--s3 12px` `--s4 16px` `--s5 24px` `--s6 32px` `--s7 48px` | | ALL gaps/padding. No other px values in components. |
| Gutter | `--gutter 16px` | | page side padding (body already 16px) |
| Radius | `--r-sm 6px` `--r-md 10px` `--r-lg 14px` `--r-pill 999px` | Ink & Paper: `--r-sm 2px --r-md 4px --r-lg 4px` | chips / controls / cards / pills |
| Elevation | `--e0 none` `--e1 0 1px 0 var(--rule)` `--e2 0 6px 20px color-mix(in srgb,var(--ink) 10%,transparent)` | | card rest / raised / sheet |
| Hairline | `--hair 1px solid color-mix(in srgb,var(--rule) 55%,transparent)` | | inner dividers (softer than today's full `--rule`) |
| Control | `--ctl-h 48px` `--tap 44px` `--ctl-bw 1.5px` | | min heights (44px is the floor; 48px for form controls and primary buttons; 52px for the big CTA) |
| Surface tints | `--tint-primary color-mix(in srgb,var(--primary) 10%,var(--card))`, `--tint-calm 10% calm`, `--tint-moss 10% moss`, `--tint-demo var(--demo-bg)` | | Notice, Chip, selected rows. Computed from role colours, so each look and dark mode follow for free. |
| Focus | `--focus 3px solid var(--ember)` | | keep current ring; offset 2px |
| Type | `--fs-xs .75rem` `--fs-sm .875rem` `--fs-md 1rem` `--fs-lg 1.125rem` `--fs-xl 1.25rem` `--fs-2xl 1.75rem` `--fs-hero 4rem` | | rem only so 200% text works; never px for text |
| Line | `--lh-tight 1.35` `--lh-body 1.7` `--lh-ui 1.5` | | Bangla needs >= 1.5 in UI text |
| Motion | `--dur-fast 120ms` `--dur 200ms` `--dur-reward 600ms` `--ease cubic-bezier(.2,.7,.2,1)` | | only used inside `@media (prefers-reduced-motion:no-preference)` and not when `[data-motion="reduce"]` |

Colour-role meaning (fixed, applies to every component): `--primary` action and selected; `--ember` focus ring and the single "attention" accent (never an error); `--moss` done/OK; `--calm` "please do this first" and info; `--demo/--demo-bg` DEMO and External markers only; `--danger` ONLY real failures and the destructive confirm step (Delete). A missed goal, empty field, overload, unknown value never uses `--danger`.

### 1.2 Light Futuristic (default, D-E)
Calm glass on a soft indigo-to-pink wash. Radius `--r-md 12px --r-lg 18px --r-pill`. Cards: translucent `--card` 86% + 10px blur + `--e2` tinted by `--primary` (already in themes.ts). Primary button: 135deg gradient `--primary` to 70% mixed with `--ink`; text `--on-primary`. Chips are pills with tinted fill. Hairlines soft (`--hair`). Reward moments get a faint primary glow ring (box-shadow, no blur animation). Type: Hind Siliguri body, Noto Serif Bengali / Fraunces headings; `--fs-2xl` h1. Motion: 200ms ease on shadow/translate only.

### 1.3 Ink & Paper
Editorial, flat, almost no elevation (`--e1` hairline only). Radius 2 to 4px (`--r-sm 2px --r-md 4px --r-lg 4px`, pill stays for chips only). Card = paper-coloured slab with 1px `--rule` border, no blur. Primary button solid `--primary`, 1.5px ink border for ghost. Headings serif with a 2px ink rule above `h1` blocks (current `.stage` look kept). Chips are squared, outlined. Motion: opacity fade only, 150ms.

### 1.4 Emerald Obsidian
Quiet luxury: deep obsidian dark default feel, champagne `--ember` hairlines, emerald `--primary` (champagne on dark). Radius `--r-md 10px --r-lg 12px`. Card border `color-mix(ember 45%, rule)` (already). `--e2` becomes a 1px champagne inner line + soft dark shadow. Headings letter-spacing .01em. Primary button solid emerald (champagne in dark) with a 1px champagne bottom edge. Motion: border-colour transition 200ms only.

### 1.5 Classic (id `broadsheet`)
Newspaper: serif body (existing override), square corners (`--r-* 0`), cards = top 2px ink rule, no side borders, sections separated by double hairline. Buttons square, ink or `--primary` solid, ghost = 1.5px ink outline. Chips are small caps text with underline-style 1px border, no fill. No shadows (`--e2:none`). Motion: none except the reward micro-animations. Reference: docs/design/claude-design/batch-2/broadsheet (styles.css, components, templates).

### 1.6 Rules for all four
1. Phone first 360px; max content width 480px (existing). One column. Never rely on two columns under 360px; a 2-up grid is allowed only when every cell is >= 156px wide and falls to 1 column under 340px or at >= 150% text (`@media (max-width:400px)` plus `min-width:0`).
2. 200% text: nothing fixed-height (use `min-height`), no `overflow:hidden` on text boxes, `overflow-wrap:anywhere` kept on body, buttons wrap to 2-3 lines, trailing actions in a ListRow drop below the text at 200% (flex-wrap, see 2.7).
3. Dark mode: only tokens, never hex in components. Existing hex leftovers to remove: `.inspire.*` border colours (#C9A227 etc.) become role tokens; `.list-compact` `#ddd`; `rgba(0,0,0,.45)` scrim becomes `color-mix(in srgb,var(--ink) 55%,transparent)`.
4. Reduced motion: keep both guards (`@media (prefers-reduced-motion:reduce)` and `[data-motion="reduce"]`). Hidden-start animation states only inside `no-preference`.
5. Micro-animation is for REWARDS only: task done tick draw (180ms), ring fill on Stat/ProgressRing, a one-time `pop` on a newly earned item, `inspireIn` fade for a fresh card. Hover/press feedback = colour/shadow only, no movement. No looping animation except existing star twinkle (already reduced-motion safe). Never animate error or Notice.
6. Copy guardrails unchanged: no rank/grade/streak/red; Unknown shown as a muted "অজানা / Unknown" chip, never 0.

---

## 2. Component library (build once in `src/ui/kit/`, CSS in `src/ui/kit.css` imported by styles.css)

Naming: BEM-lite, prefix `k-` for kit classes so old classes keep working during migration and tests can find leftovers. Each component = a TS builder in `src/ui/kit/<name>.ts` using the existing `h()` helper (pure DOM, no framework) plus CSS. Old classes (`.btn`, `.cta`, `.card`, `.seg`, `.tag`, `.chip`, `.note`, `.need`, `.field`) become thin aliases that map to the same CSS (so e2e selectors keep working) and are removed only at the last step.

### 2.1 Button `k-btn`
Markup: `<button class="k-btn k-btn--primary" type="button"><span class="k-btn__ic" aria-hidden="true">+</span><span class="k-btn__t">Label</span></button>`; links: `<a class="k-btn ...">` same classes. Keep `data-act` attributes untouched.
Variants: `--primary` (solid `--primary`), `--secondary` (`--tint-primary` fill + 1.5px `--primary` border + `--primary` text), `--ghost` (transparent, text `--primary`, underline on focus only; min 44px), `--calm-danger` (for destructive confirm: `--card` fill, 1.5px `--danger` border, `--danger` text; ONLY used on Delete/erase final step; the first step of any delete is secondary).
Sizes: default `min-height:var(--ctl-h)` (48px), `--lg` 52px (single main CTA per screen), `--sm` `min-height:var(--tap)` 44px, `padding-inline:var(--s4)`; never below 44px even for `--sm`.
CSS core: `display:inline-flex;align-items:center;justify-content:center;gap:var(--s2);padding:var(--s2) var(--s4);border-radius:var(--r-md);font:600 var(--fs-md)/var(--lh-ui) "Hind Siliguri";text-align:center;text-decoration:none;cursor:pointer;border:var(--ctl-bw) solid transparent`. NO margins on the button itself: spacing is owned by the container (2.2).
States: `:disabled,[aria-disabled=true]` opacity .55 + `cursor:not-allowed` (contrast of the label must still be >= 3:1 as disabled text is exempt, but keep text readable); `[aria-busy=true]` shows no spinner motion under reduced motion, only the label "...". Press: `transform:none`, only `filter:brightness(.96)`.
Replaces: every `class:"btn"`, `"cta"`, `"btn ghost"` (about 200 sites), the inline `style:"width:auto;margin:0;min-height:44px"` of `doneBtn`.

### 2.2 ActionBar / ButtonRow `k-actions`
Markup: `<div class="k-actions" role="group" aria-label="...">` + buttons. Variants: `k-actions--stack` (default on phone: column, each button `width:100%`), `k-actions--row` (wrap row; buttons `flex:1 1 auto; min-width:min(100%,9rem)`), `k-actions--end` (right-aligned in cards), `k-actions--sticky` (form footers: `position:sticky;bottom:calc(56px + var(--s3))` above the nav, background `--card`, `--e2`).
CSS: `display:flex;flex-direction:column;gap:var(--s3);margin-block:var(--s4)`; row variant `flex-direction:row;flex-wrap:wrap;gap:var(--s3)`. Rule: exactly ONE `--primary` per ActionBar and it is first in DOM order (visual top); others are secondary/ghost. The gap is `var(--s3)` = 12px minimum; this is what the "no adjacent buttons with zero gap" test asserts.
Replaces: `.actions` grid (styles.css L150), `.scr-focus .row`, `.scr-diary .cta{margin-top}` and all one-off margins on buttons.

### 2.3 Card `k-card`
Markup:
```html
<section class="k-card" aria-labelledby="c1">
  <header class="k-card__h"><h2 id="c1" class="k-card__t">Title</h2><span class="k-chip">...</span></header>
  <div class="k-card__b"> ...body (Prose / ListRows / Stat)... </div>
  <footer class="k-card__f"><div class="k-actions k-actions--end">...</div></footer>
</section>
```
Variants: `k-card--link` (whole card is an `<a>`; chevron `›` flips with `dir=rtl`), `k-card--tinted` (`--tint-primary`), `k-card--calm` (`--tint-calm`), `k-card--flat` (no border, for nesting inside a card).
CSS: `background:var(--card);border:var(--hair);border-radius:var(--r-lg);box-shadow:var(--e1);padding:var(--s4);margin-block:var(--s3)`; header: flex, `align-items:center;justify-content:space-between;gap:var(--s2);margin-bottom:var(--s2)`; footer: `margin-top:var(--s3);padding-top:var(--s3);border-top:var(--hair)`. Cards never touch: container is `.k-stack` (`display:grid;gap:var(--s3)`) not margins.
Replaces: `.card`, `.card.link`, `.scr-*` card padding rules, `.inspire`, `.next-step`, `.stage` boxes (keep `.stage` big-number as `k-stat`).

### 2.4 ListRow `k-row` (inside `<ul class="k-list">`)
Markup:
```html
<ul class="k-list" role="list">
  <li class="k-row">
    <span class="k-row__lead" aria-hidden="true">🕌</span>
    <div class="k-row__main"><span class="k-row__title">Fajr</span><span class="k-row__sub">05:12 · Dhaka</span></div>
    <div class="k-row__trail"><button class="k-btn k-btn--secondary k-btn--sm">Mark done</button></div>
  </li>
</ul>
```
CSS: `display:grid;grid-template-columns:auto 1fr auto;gap:var(--s3);align-items:center;padding:var(--s3) var(--s4);min-height:56px`; list rows separated by `border-top:var(--hair)` (first none); inside a Card the list has no extra padding. `@container`-free fallback: `@media (max-width:360px){.k-row{grid-template-columns:auto 1fr}.k-row__trail{grid-column:1/-1}}` and the same at 200% text via `@media (min-resolution:...)` is not reliable, so use `flex-wrap` variant: `.k-row__trail{flex:0 0 auto;min-width:0}` with `.k-row{display:flex;flex-wrap:wrap}` and `.k-row__main{flex:1 1 10rem}` (this wraps at both narrow width and large text without a media query; use this version, not the grid).
Done state: `.k-row[data-state=done]` title gets `--moss` leading tick, trailing button becomes ghost "Undo". Reward tick animation `k-tick` (stroke-dashoffset 180ms, reduced-motion = shown final).
Replaces: Deen prayer rows (screens.ts L1358 `deen.prayer.mark` x5), Today suggestion buttons, task rows (`.task`), `.ladder li`, wheel rows, habit rows, diary links, the 8+ `.row` + `.tag` flexes.

### 2.5 Chip / Badge `k-chip`
Markup: `<span class="k-chip k-chip--demo">DEMO</span>`. Variants by meaning: `--source` (neutral outline), `--external` (`--demo` role, text "External"), `--demo` (`--demo-bg`), `--ok` (`--moss` tint), `--calm` (`--calm` tint, "to do first"), `--warn` (`--demo` role, never red), `--unk` (muted dashed border, "Unknown"). Each has a text label, not colour alone; optional leading icon `aria-hidden`.
CSS: `display:inline-flex;align-items:center;min-height:24px;padding:0 var(--s2);border-radius:var(--r-pill);font:600 var(--fs-xs)/1.6 ...;white-space:normal`. No `vertical-align`, no `margin-inline-start` hack.
PLACEMENT RULE (the "no inline badge in a sentence" fix): a chip is never a child of `<p>`, `<label>` text node run or `.val`. It lives in a `k-meta` slot: card header (`.k-card__h`), `.k-row__sub` line, or `.k-chips` row (`display:flex;flex-wrap:wrap;gap:var(--s2)`) placed after the text block. `valueEl()` is changed to return a `<span class="k-value">` containing `<span class="k-value__n">12,000 BDT</span>` and a SIBLING `.k-chips` (via `display:block` wrapper), keeping attributes `data-value data-label` unchanged so tests still find them.
Replaces: `.chip`, `.tag` (+ `.ok .warn .off`), `.badge`, `.net`, `demoBadge()`.

### 2.6 SectionHeader `k-sec`
Markup: `<header class="k-sec"><h2 class="k-sec__t">Title</h2><p class="k-sec__s">Optional one-line help</p><a class="k-link" href="#/..">See all</a></header>`.
CSS: `display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:var(--s1) var(--s3);margin:var(--s5) 0 var(--s2)`; subtitle takes full row (`flex-basis:100%`, `--muted`, `--fs-sm`). Heading levels unchanged (h1 screen title via existing `h1`; kit uses h2 only; card titles h2 `.k-card__t` as today to keep heading-order tests green).
Replaces: bare `h2` + `.sub`, all `.scr-* h2` margin rules.

### 2.7 Notice `k-notice`
Markup: `<aside class="k-notice k-notice--calm" role="note"><span class="k-notice__ic" aria-hidden="true">i</span><div class="k-notice__b"><p class="k-notice__t">Title (optional)</p><p>Body</p></div></aside>`; for live messages `role="status"` (polite), real failures `role="alert"` with `--error` variant.
Variants: `--info` (`--tint-primary`, left icon), `--calm` (`--tint-calm`, "please do this first", replaces `.need` and `showNeed()`), `--ok` (`--tint-moss`), `--warn` (`--demo-bg`, amber, e.g. DEMO/External/offline), `--error` (`--card` fill, 1.5px `--danger` border, only real failure), `--legal` (small `--fs-sm` muted, for disclaimers, collapsible).
CSS: `display:flex;gap:var(--s3);padding:var(--s3) var(--s4);border-radius:var(--r-md);border:var(--hair);background:var(--tint-*);font-size:var(--fs-sm);line-height:var(--lh-ui)`. No `border-inline-start` bar (that is the "blockquote" look).
Disclaimers fix: `disclaimers(lang, which)` returns ONE `k-notice--legal` with a `<ul>` (no `<p>` run), and a screen-level dedupe: a module `noticeOnce(key)` registers rendered disclaimer keys per route render so the same `disclaimer.*` text can never appear twice in one screen (test in section 5). Where the same text is shown on a screen both as a Notice and as a sentence, delete the sentence (copy files unchanged: only the render call is removed).
Replaces: `.note`, `.need`, `.err` (messages), `.ok-msg`, `disclaimers()`, `showNeed()` (keeps its signature; internally sets `k-notice k-notice--calm`).

### 2.8 FormField `k-field`
Markup:
```html
<div class="k-field" data-state="error">
  <label class="k-field__l" for="f1">Label <span class="k-field__req">required</span></label>
  <p class="k-field__h" id="f1-h">Help text</p>
  <input class="k-input" id="f1" aria-describedby="f1-h f1-e">
  <p class="k-field__e" id="f1-e" role="alert">Calm message</p>
</div>
```
Label and optional/required marker are text, never a chip inside the label sentence (marker sits on its own flex slot after the label). Existing `fieldHelp()` `<details class="help">` is restyled as a `k-help` disclosure (`summary` 44px, `--primary` text, chevron icon, content in `k-notice--info`-like panel).
Controls (all `min-height:var(--ctl-h)`, `border:var(--ctl-bw) solid var(--rule)`, radius `--r-md`, bg `--card`, focus = border `--primary` + ring `--focus`):
- `.k-input` / `.k-textarea` (textarea min 5 lines), numbers `inputmode="decimal"`, dates `type=date` styled with the same box (calendar icon uses `color-scheme` from tokens: `:root{color-scheme:light}` and `dark` under dark tokens).
- `.k-select`: native `<select>` with `appearance:none` + inline SVG chevron via `background-image` using `currentColor` mask; keeps native picker on phones.
- `.k-check` / `.k-radio`: custom box over the native input. Markup `<label class="k-check"><input type="checkbox"><span class="k-check__box" aria-hidden="true"></span><span class="k-check__t">Text</span></label>`; the native input is visually hidden but remains focusable (`position:absolute;opacity:0;inset:0`); row is >= 44px high with the full row clickable; box 24px; checked = `--primary` fill + white tick (SVG mask); focus-visible ring on `.k-check__box`. FIXES the current bug where checkboxes get `width:100%;min-height:48px`: global `input,select,textarea` rule is narrowed to `input:not([type=checkbox]):not([type=radio])`.
- `.k-switch`: `<label class="k-switch"><input type="checkbox" role="switch"><span class="k-switch__track"><i></i></span><span class="k-switch__t">Reminder</span></label>`; track 48x28, knob 22px, on = `--primary`; used for settings toggles (consent tick stays a `k-check`, NOT a switch, because it is a consent act).
- `.k-seg` (see 2.11) for 2-4 exclusive choices.
Error: `[data-state=error]` border `--danger` only for real validation failure; "please fill this first" uses Notice calm (`k-field__e` styled `--calm`) per existing `showNeed` rule. Field spacing: `.k-field + .k-field {margin-top:var(--s4)}`, no per-field bottom border (current `.field` border-bottom goes).
Unknown toggle (`.unk`) becomes `k-check` "I don't know" beside the input.

### 2.9 Stat and ProgressRing `k-stat`, `k-ring`
`k-stat`: `<div class="k-stat"><span class="k-stat__n">1/8</span><span class="k-stat__l">Stage A</span><span class="k-stat__d">hint</span></div>`; number `--fs-hero` (Today stage) or `--fs-2xl`, `font-variant-numeric:tabular-nums`, colour `--ember` (stage) or `--ink`; unknown shows `k-chip--unk`. `k-ring`: reuses `ring.ts` SVG (stroke `--moss`, track `--rule` at 40%), size 64/96px, centre text; text equivalent always present (existing rule). Fill animation `stroke-dashoffset` .6s only in `no-preference`. Linear: `k-bar` replaces `.bar` (height 10px, radius pill, `role="progressbar"` + `aria-valuenow` or `aria-valuetext="Unknown"`). Stage rungs `.rungs` become `k-steps` (flex, gap `--s1`, radius pill, done `--moss`, now `--ember`).

### 2.10 EmptyState `k-empty`
`<div class="k-empty"><div class="k-empty__art" aria-hidden="true"><svg/></div><h3>Nothing yet</h3><p>One calm sentence + what to do</p><div class="k-actions"><a class="k-btn k-btn--primary">Add first</a></div></div>`. Dashed `--rule` border, centred, padding `--s6 --s4`, art 72px line icon in `--muted`. Never says "0" or an error; unknown stays Unknown.

### 2.11 Tabs / Segmented `k-seg`, `k-tabs`
`k-seg` (replaces `.seg`): `<div class="k-seg" role="group">` of `<button aria-pressed>`; grid `repeat(auto-fit,minmax(7rem,1fr))`, gap `--s2`, each 44px+, selected = `--primary` fill + check icon (not colour alone). For true view switches (Money list/compact, templates) use `role="tablist"` `k-tabs` with `role="tab"` `aria-selected` and roving tabindex. Bottom nav `nav .tab` keeps its markup; restyle: icon above label, active = `--tint-primary` pill behind icon, `--e2` top shadow, safe-area `padding-bottom:env(safe-area-inset-bottom)`.

### 2.12 Sheet / Dialog `k-sheet`
Replaces drawer and confirm blocks (deleteUi, lockUi, restoreUi, daily consent). Use native `<dialog>` where available: `<dialog class="k-sheet" aria-labelledby>`; on phone bottom-anchored (radius `--r-lg` top only, max-height 85dvh, scroll inside, grab handle decorative), scrim `color-mix(ink 55%)`. Focus trapped by dialog, ESC closes, focus returns to opener, `inert` on page. Actions in a stacked ActionBar with primary first. The existing `.drawer` markup is kept; only its class styles move onto `k-sheet` tokens (no behaviour change).

### 2.13 Prose `k-prose` (markdown-like pages)
Wrapper class on any long-text container (Glossary, Safety, Status, Fields, About, Hadith text, Plan/print docs, Reality, Topics): `<article class="k-prose">`.
Rules: `max-width:60ch`; `h2{margin:var(--s6) 0 var(--s2)} h3{margin:var(--s5) 0 var(--s1)}`; `p{margin:var(--s3) 0}`; `ul,ol{padding-inline-start:var(--s5)} li+li{margin-top:var(--s1)} li::marker{color:var(--primary)}`; `a{color:var(--primary);text-decoration:underline;text-underline-offset:.2em;text-decoration-thickness:1.5px;min-height:24px}` plus external links get a trailing `↗` (aria-hidden) and `rel="noopener noreferrer"`; `code,kbd{font:500 .9em ui-monospace;padding:0 var(--s1);background:var(--tint-primary);border-radius:var(--r-sm)}`; `pre{overflow-x:auto;padding:var(--s3);background:var(--tint-primary);border-radius:var(--r-md)}` (the ONLY horizontal scroll allowed, with `tabindex=0`); `blockquote` is not used (becomes Notice); `hr{border:0;border-top:var(--hair);margin:var(--s5) 0}`; tables via `k-table`.
`k-table`: wrap `<div class="k-table-wrap" role="region" tabindex="0" aria-label>` for scroll; `table{width:100%;border-collapse:separate;border-spacing:0}` `th{text-align:start;font-weight:600;color:var(--muted);font-size:var(--fs-sm)}` `td,th{padding:var(--s2) var(--s3);border-bottom:var(--hair)}`; at < 420px with `data-stack` the rows become cards (`td::before{content:attr(data-label)}`) so there is no sideways scroll for money/import tables. Replaces `.table-compact`, `.list-compact`, importUi preview table, glossary lists.

### 2.14 Shared a11y contract (all components)
1. Targets >= 44x44 CSS px (incl. inline links in lists: wrap in ListRow, or `min-height:44px;display:inline-flex`); spacing between two targets >= 8px (kit uses 12).
2. Focus: `outline:var(--focus);outline-offset:2px` on every interactive; never `outline:none`; custom checkbox shows ring on its box.
3. Contrast: text >= 4.5:1, large text and UI borders/icons >= 3:1 in all 4 looks x light/dark. Tinted fills must be re-checked: `--tint-*` text colour is always `--ink`, never the role colour on its own tint (role colour is for icon/border). `--muted` on `--card` already passes (existing a11y_looks test); add `--tint-*` pairs to it.
4. State is never colour-only (icon or text or pattern: pressed has check, done has tick, error has text).
5. Names: every control has a visible label; icon-only button gets `aria-label`; groups get `role=group` + label; lists are `<ul>/<li>`; Notice uses `role=note|status|alert` correctly; one `<h1>` per screen; heading order kept.
6. RTL/Bangla: logical properties only (`inline-start`, `padding-inline`), `line-height >= 1.5`, `word-break:keep-all` only on nav tabs (existing), `overflow-wrap:anywhere` elsewhere, no `text-transform`, no letter-spacing on Bangla.
7. Zoom: layouts verified at 200% text (matrix already does).

### 2.15 Mock snippets

Prayer list (replaces 5 touching "Mark done"):
```html
<section class="k-card" aria-labelledby="pr"><header class="k-card__h"><h2 id="pr" class="k-card__t">Today's prayers</h2><span class="k-chip k-chip--ok">3 / 5</span></header>
<ul class="k-list" role="list">
 <li class="k-row" data-state="done"><span class="k-row__lead">✓</span><div class="k-row__main"><span class="k-row__title">Fajr</span><span class="k-row__sub">05:12</span></div><div class="k-row__trail"><button class="k-btn k-btn--ghost k-btn--sm">Undo</button></div></li>
 <li class="k-row"><span class="k-row__lead"></span><div class="k-row__main"><span class="k-row__title">Dhuhr</span><span class="k-row__sub">12:04</span></div><div class="k-row__trail"><button class="k-btn k-btn--secondary k-btn--sm">Mark done</button></div></li>
</ul></section>
```
Core CSS of the gap fix:
```css
.k-actions{display:flex;flex-direction:column;gap:var(--s3);margin-block:var(--s4)}
.k-actions>.k-btn{width:100%}
.k-actions--row{flex-direction:row;flex-wrap:wrap}.k-actions--row>.k-btn{flex:1 1 9rem;width:auto}
.k-row{display:flex;flex-wrap:wrap;align-items:center;gap:var(--s3);padding:var(--s3) var(--s4);min-height:56px}
.k-row__main{flex:1 1 10rem;min-width:0;display:grid}.k-row__trail{flex:0 0 auto}
.k-row+.k-row{border-top:var(--hair)}
```
Notice + single disclaimer:
```html
<aside class="k-notice k-notice--legal" role="note"><span class="k-notice__ic" aria-hidden="true">i</span><div class="k-notice__b"><ul><li>No guarantee of returns.</li><li>General information, not advice.</li></ul></div></aside>
```

---

## 3. Screen-by-screen inventory (ordered by how often the owner sees it)

Routes taken from tools/screenshots.mjs (both lists), src/app.ts and the tests link_check route list. "Raw" = what is plain today; "Use" = kit components. Group letters are used in section 4.

### Group A: daily (build first)
1. **Today** (`#/today`, homeUi.ts, screens.ts): raw: stage block as bordered divs (`.stage .n`), daily inspiration card with coloured hex border, next-step card with floating arrow, suggestion buttons glued, `.actions` grid, `.chip` inside text, overall-progress text. Use: Stat (stage 1/8) + k-steps, Card (`--tinted` for inspiration, theme as Chip in header), ListRow for suggestions (title + trailing button, one primary max), ActionBar, Notice calm for "do this first", EmptyState for no tasks.
2. **Bottom nav + top bar + drawer menu** (app.ts, langMenu.ts): raw: `.tab` text only, `.menu-btn`, `.net` and `.badge` boxes, language menu. Use: restyled nav (2.11), Chip for DEMO/Offline in top bar, Sheet for drawer/language menu, Button ghost for menu button.
3. **Deen home** (`#/deen`, screens.ts L1358): raw: five prayer rows with "Mark done" buttons touching, hint line, entity cards with `.row .tag`, help `<details>`. Use: Card + ListRow (mock above), Chip (done 3/5), Notice legal (private, no fatwa; ONE instance), k-help.
4. **Deen plans / reminders / hadith** (`#/deen/plans`, deenPlansUi.ts, hadithUi.ts, hijriUi.ts): raw: 14 inputs, bare selects/checkboxes for days/times, plan list as plain rows, hadith text as `<p>` + `<blockquote>`-like note, source labels inline. Use: FormField (select/time/check/switch), ListRow (plan + switch trailing), Card, Prose for hadith text with source as Chip in a `k-meta` row (never inline), Notice legal.
5. **Capture** (`#/capture`, screens.ts): raw: textarea + buttons. Use: FormField textarea, ActionBar sticky, Notice calm.
6. **Diary hub** (`#/diary`) and **Intake 1-7** (`#/diary/intake/*`, `#/diary/intake/4`): raw: `.field` blocks with border-bottom, label+`.tag` inline, `<details class="help">`, unknown toggles, long forms with plain buttons. Use: FormField (all types), k-check for unknown, k-help, ActionBar sticky (Back secondary / Next primary), k-steps progress, Stat completeness (k-bar), Card link rows for sections (ListRow chevron).
7. **Diary sub-pages** (`diary/money`, `diary/plan`, `diary/team`, `diary/ventures`, `diary/health`): raw: forms in `form>label` with margin hacks, `data-fin` rows with `.row`+button, tables. Use: FormField, ListRow for records (edit/delete trailing sm ghost), k-table (stack at phone), EmptyState, Notice (DEMO label vs real: `--warn`).
8. **Journey home** (`#/journey`, stage panel, ladder `.ladder li`, reward picture, `.actions`): raw: ladder with square numbers, stage panel card, picture frame, links. Use: ListRow (leading number, `data-state`), Stat, Card, ActionBar, `k-ring` for progress; reward picture frame keeps rewardArt (animations unchanged).
9. **Reward / picture** (`#/reward`, `#/journey/art`): raw: `.reward` box + loose `<p>`s. Use: Card (reward variant with `k-glow`, the only glow), Notice ok, single primary; micro-animation `pop` (existing).
10. **Habits** (`#/habits`): raw: name input, day chips as `.seg` buttons, label+input without wrapper. Use: FormField, `k-seg` (multi-select = `k-chipbtn` with check), ListRow per habit with grid tracker, ProgressRing.
11. **Focus** (`#/focus/:id`): raw: `.stage` timer, `.row` of 3 buttons, `.seg` for minutes. Use: Stat (timer), `k-bar`, ActionBar (primary Done; Rest/Again secondary stacked), `k-seg`.
12. **Stuck** (`#/stuck`): raw: question rows with 3-button seg, result cards, `.note`. Use: FormField group (radio as `k-seg`), Card, Notice calm (never red).

### Group B: weekly / reflective
13. **Journey sub-pages**: `journey/week`, `journey/month`, `journey/log`, `journey/report`, `journey/review`, `journey/history`, `journey/horizon`, `journey/mine`, `journey/leak`, `journey/kpi`, `journey/northstar`, `journey/risks`, `journey/decide`, `journey/legs`, `journey/reality`, `journey/boards`, `journey/universe`, `journey/goals`, `journey/goal/:id`, `journey/backward/:id`. Raw: many `table-compact`/`list-compact` blocks, `ul` lists, view-bar buttons (viewBar.ts), chart wrappers with bare captions, `note` footers, goal forms with inline-style rows (backwardUi, goalLinks, goalDelete, legsUi, realityUi, riskCard, northStarCard, ventureCard, teamCard, kpiUi). Use: Card, k-table (data-stack), ListRow, `k-tabs` for viewBar template chooser, Stat, Chip for source/External/Demo (in header slot), Notice, EmptyState, Prose for text reports; charts keep SVG but get a `k-chart` frame (Card flat + caption as SectionHeader subtitle + text equivalent in `<details class="k-help">`).
14. **Topics** (`#/topics`, `topic/:id`, diagram.ts, `.dg-*`): raw: `.dg-steps` nodes, matrix cells, long prose. Use: Prose + Card for nodes, ListRow for topic index (chevron), Notice for tip.
15. **Money** (`#/diary/money`, journey money views): see 7; plus summary scopes `[data-scope]` as Stat grid (2-up on >= 360 with fallback), compact table switch via `k-tabs`.
16. **Plan** (`#/diary/plan`, planScreens.ts, planSettings.ts, `settings/plan`): raw: 43 inputs/selects, flow SVG card, assessment cards (`.scr-plan` repairs), `seg`, per-form margins. Use: FormField, Card, Stat, `k-tabs`, ActionBar sticky, Notice, EmptyState; SMART funnel keeps SVG in a Card.
17. **Notes** (notesUi.ts, `#/notes` or in diary): raw: 12 inputs/textarea, note list plain. Use: FormField, ListRow, EmptyState, ActionBar.
18. **Boards** (`#/journey/boards`, boardsUi.ts, blocksUi.ts): raw: board columns as bordered divs, move buttons adjacent. Use: Card per column, ListRow per item with trailing menu (sm ghost), ActionBar, Chip for status.
19. **Where we are** (`#/more/where`, whereUi.ts): raw: status list text. Use: Stat row + ListRow (done/now/next with Chip) + Notice info.

### Group C: settings and system (seen less often, many raw controls)
20. **More / Settings home** (`#/more`, `#/settings`, settingsUi.ts, settingsRegistry/Search): raw: `.card.link` menu, `.seg` for look/language/theme, search input, `.tags`. Use: ListRow (leading icon, chevron) inside Cards per group, SectionHeader per group, FormField search, `k-seg`.
21. **Look / design chooser** (`settings/look`, lookUi.ts): raw: 9 inline styles, swatches as divs, text scale buttons. Use: Card per design with swatch strip (3 colours via `--swatch-*` custom props, no inline hex), `k-radio` card (full row), `k-seg` text size, Notice for "applies to all screens".
22. **Prayer settings** (`settings/prayer`, prayerSettingsUi.ts, prayerAlerts.ts, prayerSync*): raw: 9 inline styles, 7 inputs, bare selects (method, city), time inputs, switches as checkboxes. Use: FormField (select/time/number), `k-switch` for alerts, ListRow per prayer offset, Notice warn (permission), ActionBar.
23. **Privacy / consent** (`settings/privacy`, privacyUi.ts, consentGate.ts, `settings/data`, `settings/data/start-real`, dataUi.ts, modeUi.ts, gateCard.ts): raw: 11 buttons in modeUi, consent tick as bare checkbox, long explanation text, mode buttons adjacent. Use: Card, `k-check` (consent: wording unchanged), Notice warn/calm, `k-seg` for Demo/Real, ActionBar stack. DO NOT reword consent text.
24. **Backup / restore / snapshots / data** (`settings/backup`, `settings/backup/restore`, backupUi, encBackup, restoreUi, snapshotsUi, csvUi, importUi, dataUi): raw: passphrase inputs, 7 buttons in snapshotsUi, import preview `table-compact`, file inputs unstyled. Use: FormField (password, file as `k-file` button + filename), ListRow per snapshot (restore secondary / delete ghost), k-table (stack), Notice (warn: passphrase cannot be recovered), Sheet for restore confirm.
25. **Delete** (`settings/delete`, deleteUi.ts, goalDelete.ts): raw: 8 buttons + 12 inline styles, destructive adjacent. Use: Card, Notice warn, ActionBar (Cancel primary-safe first, `k-btn--calm-danger` last with step-2 confirm in Sheet), `k-check` confirm.
26. **Lock / app lock** (lockUi.ts): raw: 11 inline styles, PIN input, buttons. Use: FormField (numeric), `k-switch`, ActionBar, Notice calm. No PIN/passwords stored in plain (unchanged logic).
27. **Connections** (`settings/connections`, connectionsUi.ts, capabilityUi): raw: 8 buttons, status text. Use: ListRow with Chip (External / Off) + `k-switch`, Notice warn (off until owner approves), Prose.
28. **About / Status / Fields / Glossary / Safety** (`settings/about`, `more/status`, `more/fields`, `more/glossary`, `more/safety`, buildInfo, updater): raw: markdown-like heading/para/list/table pages; glossary rows with the "যাচাই হয়নি" unreviewed marker; version text. Use: Prose + k-table + SectionHeader + Chip (unreviewed) in header slot; Notice info for the glossary draft flag (ONE time, top of page).
29. **Print / PDF** (`#/print/:kind`, printUi.ts, printLink.ts, core/printDoc): raw: print doc is plain HTML. Use: Prose + k-table with `@media print` rules: no shadows, `--paper` white, black text, `break-inside:avoid` on rows, no sticky bars; the screen toolbar is an ActionBar hidden in print.
30. **Onboarding / welcome / start** (onboardUi.ts, welcomeUi.ts, `#/start` flow): raw: 6 buttons, language buttons adjacent, intro text. Use: Card hero, `k-seg` for language/look, ActionBar (primary Continue + ghost Skip), Stat for "Stage A 1/8", EmptyState-style art.
31. **Errors / not found / update toast / save banner** (saveBanner.ts, updater.ts, app.ts error boundary): raw: plain text bars. Use: Notice (`error` only for true failure, otherwise calm), ActionBar (Reload secondary), no red for missed goals.
32. **Assessment, SMART funnel, wheel, hijri, halal, health, kpi cards** (assessment.ts, smartFunnel.ts, lifeUi.ts, hijriUi.ts, halalUi.ts, healthUi.ts, kpiUi.ts): raw: 13 inputs in lifeUi (wheel scores), cards with inline styles. Use: FormField (range slider styled `k-range`, label shows value as text), Card, Stat, k-table. Charts keep tokens.

---

## 4. Build order (small end-to-end commits, one PR per block, all gates green before push)

Every commit keeps the old class names working (aliases), changes visuals only, no logic. Run `npx tsc --noEmit`, `npx vitest run`, `npx vite build`, `node tools/e2e.mjs`, then the matrix (`tools/screenshots.mjs`) after each block; commit only when matrix report says `problems: 0`.

1. **K0 Tokens**: add the spacing/radius/elevation/type/motion/tint variables to styles.css base and per-look overrides in themes.ts (`Tokens` type unchanged; add `designExtras` var block via `extraCss` for the four looks). Fix hex leftovers and the undefined `--line`. No visual change expected except fixes. Tests: unit test that every `var(--x)` used in styles.css/kit.css is defined in base or in all 4 looks (parse CSS); dark/light token pairs contrast test extended with `--tint-*` (a11y_looks.test.ts).
2. **K1 Button + ActionBar + FormField controls CSS** (`kit.css`, `kit/button.ts`, `kit/actions.ts`, `kit/field.ts`): narrow the global input rule; old `.btn/.cta/.seg` aliased. Tests: `tests/kit_buttons.test.ts` (jsdom builds every kit variant: min-height >= 44, class contract); matrix assertion in tools/screenshots.mjs: for each visible pair of adjacent interactive elements `gap >= 8px`; checkbox/radio box size 24px not 100% wide.
3. **K2 Card + SectionHeader + Chip + Notice + ListRow + Stat/Ring/Bar + EmptyState** (CSS + builders). Convert `valueEl`, `demoBadge`, `disclaimers`, `showNeed`, `fieldHelp` builders internally (signatures and data-attributes unchanged). Tests: `kit_chip_placement` (no `.k-chip`/`.chip`/`.tag` descendant of `p`, `label`, `.val` text run across a snapshot of all rendered screens); `disclaimer_once` (each `disclaimer.*` string appears at most once per route in EN and BN); Notice roles test.
4. **K3 Group A screens** in this commit order: (a) Deen home prayer rows, (b) Today, (c) nav/top bar/drawer/Sheet, (d) Capture, (e) Diary hub + Intake, (f) Habits/Focus/Stuck/Reward/Journey home. One commit per bullet, each re-screenshot with 4 looks x EN/BN x light/dark x 100/200%.
5. **K4 Prose + k-table + Tabs/Seg**: Topics, Glossary, Safety, Status, Fields, About, print pages (print CSS), Journey sub-pages, viewBar, Money/Plan tables. Tests: `prose_links` (every `a` in `.k-prose` has underline style + >= 44px or in list), table stack test (no horizontal scroll at 360 except `.k-table-wrap` and `pre`), print snapshot test (no shadow/gradient in `@media print`).
6. **K5 Group C settings screens**: More/Settings, Look, Prayer, Privacy/Consent/Mode, Backup/Restore/Snapshots/Import, Delete, Lock, Connections, Onboarding, error/banners. Remove inline `style:` attributes (target: from 23+17+12+11+9+9+7... to 0; a test greps `style: "` in src/ui and fails above an allowlist that only shrinks).
7. **K6 Cleanup**: delete `.scr-*` repair rules (L140-L260), old `.note/.need/.tag/.chip/.badge/.btn/.cta/.card` aliases once grep shows 0 users, update e2e selectors (see risks), re-run full matrix + traceability (`evidence/traceability-result.json`), update Register rows only from real evidence, add Change Log entry and DECISIONS_LOG entry (decision: add kit; alternative: keep per-screen CSS; undo: revert the K0..K6 commits, aliases mean any single commit can be reverted).

Tests to add overall (names suggested):
- `tests/ui_no_adjacent_zero_gap.test.ts` plus a Playwright check inside `tools/screenshots.mjs`: for every screen, every pair of focusable siblings (buttons, links, inputs) has >= 8px between their rects (vertical or horizontal) except inside a `k-seg` joined group (gap still >= 6px).
- `tests/ui_no_inline_badge.test.ts`: no `.k-chip`/`.chip`/`.tag`/`.badge` inside `p`, `label`, `h1-h3`, `.k-value__n`.
- `tests/ui_disclaimer_once.test.ts`.
- Extend `a11y_looks.test.ts`: contrast for notice/chip/tint pairs in 8 token sets; 44px target check for kit components; focus ring present.
- Extend `looks_matrix.test.ts` / `evidence/matrix-report.json`: `problems: 0` over the 4 x 2 x 2 x 2 matrix (+ add new routes `deen/plans`, `settings/*` missing from list 2: `settings/look`, `settings/privacy` etc. are there; add `diary/intake/4`, `journey/week`, `journey/review`, `journey/universe`, `topics`, `topic/procrastination`, `print/plan`, `settings/lock`, `capture`, `stuck`, `focus/shot-task`, `reward`, `deen/plans`, `more/glossary`, `more/safety`, `more/fields` to the matrix list so every screen above is photographed in all 32 combos).
- No horizontal page scroll at 360px / 200% (existing matrix check, keep).
- Bangla wrapping: for each button/ListRow title in BN, `scrollWidth <= clientWidth` and `getBoundingClientRect().height` grows instead of clipping.
- `link_check.test.ts` must still pass (route list unchanged).

### Risks and mitigations
1. **e2e selectors** (`tools/e2e.mjs`, `[data-act]`, `.btn`, `.cta`, `.seg button`, `.tab`, `.card[data-...]`): keep all `data-*` and old classes as aliases until K6; change builders by ADDING classes, not replacing them (`class: "btn k-btn k-btn--primary"` at first). grep e2e + tests for class selectors before K6.
2. **Tests matching text**: copy strings and `t()` keys are not changed, so text matchers survive; but structural tests that assume `.note > p` or `valueEl().querySelector("small.chip")` (see tests/capture, advice, copy_review, b9_plan_flow) will break: update them in the same commit as the builder change, never separately.
3. **Bangla length**: Bangla labels and the loanword rule (e.g. "স্টাফ") are longer; avoid fixed widths, use `flex-wrap`, `min-width:0`, `overflow-wrap:anywhere`; test with the longest BN string per component; nav tabs stay `keep-all` and scroll-free via 5 tabs max.
4. **Glass/blur cost** on low-end phones: blur only on `.k-card` of Light Futuristic and nav, not on list rows; no backdrop-filter inside Sheet content.
5. **Native control styling** (`select`, date, file) differs by phone browser: keep native pickers, style only the box; test with Chromium + WebKit in Playwright if available; fall back to native look rather than break.
6. **Custom checkbox a11y regression**: native input must stay in the accessibility tree and focusable; verify with the a11y tests and a manual TalkBack note (owner device test is a later human task, TM-TST).
7. **Doubling effort / big diff**: do NOT restyle and refactor logic in one commit; builders change class lists only.
8. **Reduced-motion and `data-motion="reduce"`** must be copied to every new `@keyframes` (a test greps new keyframes for a `no-preference` or `reduce` guard).
9. **Print**: kit CSS must not leak shadows/gradients into print; add print block in K4.

### What NOT to change
- Logic, calculations, storage, schema, migrations, i18n keys and their wording, Bangla/English copy, loanword rules, the unreviewed ("যাচাই হয়নি") glossary marker.
- Deen: no score/rank/streak-shame wording, no fatwa, no scripture text (D-D), private-by-default behaviour, the exact prayer-mark toggle behaviour (tap to mark, tap again to undo); only layout/visuals change.
- Consent (D-B) tick text and gating order, the DEMO/real labelling (labels stay on every value, Register TM-REQ-006), "Saved on this device" text, D-C no-AI/no-cost rule, Connections off-by-default.
- `data-*` attributes, `data-act`, `data-value`, `data-label`, route hashes and the link_check route list.
- Colour semantics: red/`--danger` never for missed goals, empty, overload or unknown; Unknown is never 0.
- Fonts bundled locally, zero network calls, the 4 Design ids and their migration (`classic` to `ink-paper`).
- Existing reward art and its animations (rewardArt.ts, ring.ts): only wrapped in new Card; Ink & Paper stays the base block (no tokens needed).

## 5. Definition of done for the whole polish
All screens in section 3 use kit components; `grep "style: \""` in src/ui under the allowlist (target 0); old aliases deleted; matrix `problems: 0` over 32 combos x every route; new tests green; screenshot sheets regenerated into evidence/looks-sheets and reviewed once for each look; Change Log + DECISIONS_LOG updated.
