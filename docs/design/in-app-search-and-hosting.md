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
