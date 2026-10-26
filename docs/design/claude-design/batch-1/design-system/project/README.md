Use this system for the Trillionaire Me app: a Bangla-first, calm planning PWA for one person's goals, money and Deen. Look is "Ink and Paper": warm paper, ink text, one navy action colour, flat square shapes.

## Content fundamentals
- Write Bangla first, English second. Both are always present; never drop Bangla for English-only UI.
- Short, calm, concrete sentences. One next step at a time. No hype, no emoji, no exclamation marks.
- Label unfinished or sample data with the `badge` "DEMO". Never show a made-up number as real; offer "I don't know" instead of defaulting to 0.

## Colour
- Page is `paper`; raised surfaces are `card`; text is `ink`, secondary text `muted`. Put `ink` or `muted` on `paper`/`card` only.
- Actions use `primary` with `on-primary` text. Use `ember` for the current stage, numbers and the focus ring; `moss` for done/positive; `danger` for errors; `demo` on `demo-bg` for DEMO and cautions.
- `rule` is for hairlines and empty bars, never text. Always pair a colour with a word or numeral.
- Every token has a light and a dark value; switch with `data-theme="dark"`. Do not hand-pick dark colours.
- `inspire-*` colours are decorative left bars on inspiration cards only.

## Type
- Body and UI: `sans` (Hind Siliguri) at `body`; titles `h1`, `h2` in `serif` (Noto Serif Bengali, Fraunces fallback); big numerals in `display` (Fraunces) via `stage-number`.
- Card titles use `card-title`. Notes and tab labels use `small`; chips and tags use `caption`.
- Fonts come from Google Fonts / Fontsource; no font files are bundled here.

## Shape, space, layout
- Everything is square: `radius-none`. Only the DEMO badge uses `radius-badge`. No shadows except `shadow-rule` under reward pictures.
- Separate with 1px `rule` borders, not fills. Spacing uses the `space-*` steps.
- App (phone): one column, max `column-max` 480px, `gutter` 16px, bottom `TabBar` (56px). Every tap target is at least `tap-min` 44px; main buttons `cta-min` 52px.
- Web: use the same single centred 480px column. The source defines no wider desktop layout; do not invent one, ask the owner first.
- Focus: 3px `ember` outline, offset 2px. Honour `prefers-reduced-motion`: stop twinkle, draw and fade animations.

## Components
`Button`, `Card`, `Tag`, `Field`, `Segmented`, `Progress`, `StageHeader`, `TabBar`, `InspirationCard`. Load `components/bundle.css` after the tokens and use the class names in each component README. They are CSS classes copied from the app, not a JS library.

## Logo
`assets/Logos/trillionaire-me-mark.svg`: use it as the app icon, unmodified.

## Not synced
- Skipped: nothing in `styles.css` used `calc()`/`color-mix()`; the 24 fixed spacing values were reduced to 10 observed steps (the source declares no spacing tokens, so these are observed, not defined).
- Not fetched: `public/icon-192.png`, `icon-512.png` (binary), Fontsource font files, screen-level markup in `src/ui/screens.ts`, Capability Status modules.
- Components are static renditions from CSS only; no build was run. Hand-drawn reward art (`src/ui/rewardArt.ts`) and flow diagrams are not included.
