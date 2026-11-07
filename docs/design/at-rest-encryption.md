# At-rest encryption of REAL records (design note, 1 Nov 2026)

Status: **Built, stage 1** (7 Nov 2026; owner approved option C on 7 Nov 2026). Code: `src/core/dataVault.ts`, `src/core/persist.ts`, `src/ui/vaultUi.ts`, text in `src/i18n/vault.ts`. Tests: `tests/data_vault.test.ts`, `tests/data_vault_persist.test.ts`, `tests/vault_ui.test.ts`, e2e in `tools/e2e.mjs`. Audit PASS is still pending, so nothing is marked Verified. Stage 2 (passkey) is not built.

How it works, in short: a random 256-bit data key is wrapped by AES-GCM under PBKDF2-SHA256 (600 000 rounds) of the passphrase (8+ characters, digits only refused) and the wrapper sits under `tm:secret:vault`. Only `values` and `links` of REAL records are sealed (AES-GCM, new random IV on every write, `real|id` as AAD, marker `enc: 1`); id, entity, namespace, schemaVersion, createdAt and ownerId stay plain. Demo records are never sealed. The key lives in memory only, so the app asks for the passphrase at every start. Turning on needs a warning tick, a recovery file (encrypted backup with its own passphrase, test-decrypted before it is offered), a second tick, and a sealed safety copy; then records are sealed in place, 200 per batch, each batch read back before the next. Turning off opens them in place the same way. Forgot the passphrase: the unlock screen can restore from the recovery file. The design text below is the original note and is kept for the reasons behind the choices.

## 1. Today
- Records sit in IndexedDB (Dexie, table `records`) as plain JSON, plus a copy in memory. Snapshots (same database) and plain backup files are also plain.
- The optional PIN lock (Block 9 step 4) is a privacy screen only. It does not encrypt anything.
- Protection against someone with the unlocked phone or a copy of the browser profile: the phone's own screen lock only.
- The encrypted backup file (`src/core/cryptoBackup.ts`, PBKDF2 600k + AES-GCM-256) already exists, so the crypto parts are proven in this codebase.

## 2. Threats we care about
1. Phone lost or stolen while locked: phone encryption already covers most of this.
2. Someone borrows the unlocked phone: the PIN screen covers casual cases.
3. Browser profile or backup copied (cloud phone backup, shared device, malware): **not covered today**. This is what at-rest encryption would add.
4. Owner forgets the secret: must not mean permanent loss of data without an explicit, informed choice.

## 3. Options
| Option | What is encrypted | Key comes from | Pros | Cons |
|---|---|---|---|---|
| A. Passphrase-derived key (like the encrypted backup) | Each real record value blob (AES-GCM, random IV, record id as AAD) | PBKDF2 of a user passphrase or PIN | No key stored; strong if passphrase is strong | Forgotten secret = data gone; 4-8 digit PIN is weak against offline guessing (10^4 to 10^8 tries) |
| B. Device-bound random key (non-extractable WebCrypto key kept in IndexedDB) | Same | Random key generated on the device | No secret to remember; copying only the data file is useless | Key sits in the same profile, so copying the whole profile still works; lost if browser data is cleared (data becomes unreadable) |
| C. A + B (wrap the device key with the passphrase) | Same | Random data key, wrapped by PBKDF2(passphrase) | Passphrase can change without re-encrypting; can add a recovery file | More code, more states to test |
| D. WebAuthn/passkey PRF | Same | Authenticator | Strongest, no password | Browser support uneven on target phones; cannot be tested here; cost of mistakes high |

## 4. What stays plain (needed for the app to work)
Record ids, entity names, namespace, schemaVersion, createdAt (index keys: `[ns+id]`, `ns`, `entity`). Only `values` would be encrypted. Demo records stay plain (they are not private).

## 5. Key handling rules for any option
- Key and secret are never written to backups, exports, snapshots, CSV or logs; the key lives under `tm:secret:` or as a non-extractable CryptoKey.
- Unlock decrypts into the in-memory store at start; the screens keep using the sync Store (no UI change). Writes encrypt on the way to IndexedDB (the `MirrorKV` layer in `src/core/persist.ts` is the single place).
- Snapshots and the save-failed one-tap backup must stay readable: they are written from memory (plain) only when the user asks for a plain file, otherwise as the existing encrypted backup. Auto-snapshots in IndexedDB would also have to be encrypted.
- Migration: encrypt in place in small batches with a "before encryption" encrypted backup taken first, a version marker per record (`enc: 1`), and a read path that accepts both plain and encrypted records until the marker is global. Rolling back = decrypt in place while unlocked.
- Forgot secret: with A or C there is no way back. The app must say this in plain words before turning it on, make the user save a **recovery file** (encrypted backup with a separate passphrase, or a printed recovery code), and require a tick.
- Wrong-secret tries are slowed on the device (as the PIN lock does); this does not stop offline guessing, only a strong passphrase does.

## 6. Recommendation
Option **C**, in two stages, only after the owner agrees:
1. Stage 1: random data key (B) with the PIN/passphrase wrap, passphrase 8+ characters (digits-only PIN not accepted for encryption), mandatory recovery file before activation, in-place migration with the rollback path above.
2. Stage 2 (later, optional): passkey PRF as another way to unwrap the same data key (D).
Do not ship option A with a 4-digit PIN: it looks safe and is not.

## 7. Needs the owner (one short decision)
"Do you want real data encrypted on this phone, knowing that if you lose both the passphrase and the recovery file, the data cannot be recovered by anyone?" Recommended default: **not yet**. Keep the PIN screen plus regular backup files (reminder is now on by default for real data) until a real-phone test (O1/O8) shows the need. Tests to write first: round trip, wrong secret, migration with a power cut half-way (fake-indexeddb), rollback, backup of an encrypted store, 10k-record speed on a phone.
