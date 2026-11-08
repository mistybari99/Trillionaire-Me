# Connect AI and Google cards (W1): what is built and what the owner must do

Status: built, OFF by default, no key shipped, no request can leave this build. Owner words (7 Nov 2026): build the system now, connect only when paid AI is wanted.

## What is already in the app
- Settings > Connections > "Connect AI" (`#/settings/connections/ai`): master switch, key box (hidden, last 4 shown), provider fields, spend limit, optional price, usage, kill switch, a plain list of what is sent and what is never sent, and an Ask box.
- One gate for every request (`src/core/aiGuard.ts`). Order: master switch, kill switch, key present, per-request confirm, spend limit, secret and private-topic check, real data only if ticked for that one request (the tick clears after every send).
- A preview sheet shows the exact text that will be sent, the host, and a cost only if you typed a price. Send or Cancel. Esc cancels.
- Answers are shown as "AI draft, check it" and are never saved as facts.
- Two neutral request styles (chat completions style and messages style). No vendor SDK, no default model, no built-in price.
- The key is stored on this phone only (`tm:secret:conn:aiAssistant`), sealed with the data key when encryption is on, never in backup, CSV, export, logs or error text.
- Google cards for "Suggest options": next to Wikipedia, only when Web search is on and a proxy path is typed. Wikipedia stays first. Fewer than 2 results show none.

## Never sent
Passwords, PINs, one-time codes, ID or card numbers; your key; backup files or locked data; prayer, Deen, health, contacts, bank or location data. Goal and task titles go only if you tick them for that request. Demo items carry the DEMO label.

## Why nothing can leave yet
The page's content security policy (`connect-src` in `index.html` and `public/_headers`) allows only this app, two Wikipedia hosts and the prayer-time host. The shipped transport (`src/adapters/ai/transport.ts`) also always answers "Blocked". The CSP was not changed.

## What the owner must do to connect (in this order; none is done yet)
1. Decide to spend money (D-C). Pick a provider and make an account yourself. Buy or create a key yourself. Nobody else can do this step.
2. Choose how the browser reaches the provider. Two ways:
   - Proxy (recommended): run a tiny proxy on this app's own address, for example a Cloudflare function at `/api/ai`. The proxy holds a secret key and forwards the request. The CSP stays as it is because the proxy is on `'self'`. The real transport sends the request (host, path, headers, body as shown in the preview) to that proxy path.
   - Direct: add the provider host to `connect-src` in BOTH `index.html` and `public/_headers` (one line each), then update `tests/ai_csp.test.ts` and `tests/security_review.test.ts` on purpose.
3. Replace the blocked transport: in `src/ui/aiConnectUi.ts` set `aiWiring.transport` to a real transport (one small file). This is the only wiring point.
4. In the app: Settings > Connections > approve the AI card (cost, data leaving, real data), then open Connect AI, paste your key, type host and model, type a spend limit (number of requests, or an amount if you also type a price), then turn the master switch on.
5. For Google cards: run a small proxy at a path like `/api/search` that calls the Programmable Search service with your own key and engine id, and returns JSON `{ "items": [ { "title", "snippet", "link" } ] }`. Type that path under "Google cards" and turn Web search on. The key and engine id stay on your proxy.

## Undo
Kill switch (Connect AI page) stops AI and Google cards at once. Master switch off, "Remove key", and clearing the proxy path return everything to the shipped state. Removing the files listed in DECISIONS_LOG (W1 entry) removes the feature.
