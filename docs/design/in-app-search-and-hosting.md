# In-app search & hosting (owner request, 23 Oct 2026)

**Goal:** user taps "suggest options" → sees 2–3 cards inside the app → taps one → it fills the field. Never leaves the app, never sees Google.

## How it works
`research()` (src/core/research.ts) is built and tested. It sends nothing without a click, returns max 3 options each with source + date, returns nothing if <2 results, always offers "write my own", works offline from a saved list.

## Which search engine (needs owner decision when G4 starts — money/key)
| Option | Cost | Note |
|---|---|---|
| Google Programmable Search JSON API | ~100 queries/day free, then paid | A browser cannot call it safely (API key would be public) → needs a tiny server function on the host. Scraping Google is not allowed. |
| Brave Search API / similar | free tier, signup | Same: key must live in a server function. |
| Wikipedia / open-data APIs | free, no key | Works straight from the browser; only encyclopedia-type answers. |
Recommended: start with the free open-data provider (no key, no cost), add Google via a server function only if the owner approves the account + daily cap.

## Hosting
`npm run build` makes a plain static folder (`dist/`) with relative paths and hash routing: it runs on any free static host (GitHub Pages, Cloudflare Pages, Netlify) without server settings. Not deployed yet — publishing is the owner's call. Offline use still works after first visit (service worker), and the app never needs the internet except for research/AI features.

## Owner steps for hosting (when you decide; the builder does not create accounts)
Free plan only. Nothing is published until you do steps 1–2 yourself.
1. Make a free Cloudflare account (you sign up; keep the password to yourself).
2. Create a Pages project from the private GitHub repo (or upload the `dist` folder). Build command: `npm run build`. Output folder: `dist`.
3. Open the link on your phone in Chrome. Menu → "Add to Home screen". Turn on airplane mode, open the app again and check that Today still opens (this is the O1 test).
4. Tell the builder the result. Nothing else is needed for the personal edition.
Wikipedia search runs only when you tap "Suggest options". The first result is saved on the phone, so the same search works offline later.
