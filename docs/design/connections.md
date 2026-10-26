# Connections: how to connect a facility later (docs only, not shipped)

Owner request 26 Oct 2026. Four optional facilities, all OFF by default, no network call while off.

## What exists
- `src/core/ports.ts`: pure port types (aiAssistant, cloudSync, webSearch, licensedContent) and the null adapters. A null adapter returns `{ ok: false, reason: "not_connected" }`.
- `src/core/connections.ts`: approval flag, enabled flag and the device-only key per facility, on the per-device KV (`consentKv`).
  - approval: `tm:ui:conn:approved:<id>`; enabled: `tm:ui:conn:on:<id>`; key: `tm:secret:conn:<id>`.
  - The key prefix is not a record prefix, so backup, export and the encrypted bundle never read it.
- `src/adapters/registry.ts`: `createRegistry(kv)` gives `status(id)` (off, needs_approval, connected) and `get(id)` (null adapter unless approved and enabled).
- `src/adapters/connectedStubs.ts`: connected-mode stubs. Every call throws `NotEnabledError` ("not enabled in this build").
- `src/ui/connectionsUi.ts`: More > Connections. Enable stays disabled until the approval confirm is ticked.
- Tests: `tests/connections.test.ts`.

## Steps to connect one facility (needs owner approval first: cost, account, key)
1. Owner approves cost and provider (D-C for AI, D-D for scripture or licensed content). Owner creates the account and key; the builder never does.
2. Write one real adapter file in `src/adapters/` that implements the port from `src/core/ports.ts` (for example `cloudSyncX.ts`). It reads the key with `readKey(consentKv, id)`.
3. Replace only that facility's entry in `CONNECTED_STUBS`. Keep the null adapter as the default.
4. Network code lives only in that adapter file. Update the allow-lists in `tests/g1.test.ts` and `tests/m11_background_cache.test.ts` (they currently allow only `wikipedia.ts`) and add the host to the CSP and `tools/e2e.mjs` allowed requests.
5. Send only what the user chose in that moment. Run text through `detectSecret` first. Real data goes out only with a separate per-use choice. cloudSync sends only an already encrypted blob from `encryptBackup`.
6. Add tests: a fake fetch proves the call happens only when status is connected, never when off; keys still excluded from exports.
7. Update the copy in `src/i18n/packs.ts` (`conn.<id>.*`, en and bn), then the Register and `DECISIONS_LOG.md`.
8. Undo: set the stub back, remove the adapter file and its allow-list lines. Withdrawing approval in the app switches the facility off at once.

## Notes
- Web search: Wikipedia stays the first provider through `src/core/research.ts`; a second provider would implement `WebSearchPort` and map into the same option cards.
- The port boundary returns plain data; nothing in `src/core` imports UI or network code.
