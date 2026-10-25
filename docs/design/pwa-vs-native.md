# PWA vs native — G2 comparison note (D-A approved: PWA-first)

| | PWA (chosen) | Native / Capacitor wrapper |
|---|---|---|
| Cost | free hosting, no store fee | Play Store one-off fee (owner approval) |
| Install | link → "Add to Home screen" | Play Store |
| Offline data | IndexedDB ✅ (tested in browser) | same + SQLite |
| Reminders when app is closed | limited on Android/iOS | reliable |
| Update | instant on next open | store review |

**Verified here (browser):** installable manifest with PNG icons, offline reload, data survives reload, no external requests.
**NOT verified (needs the owner's real phone):** airplane-mode use over a day, storage not evicted under low space, closed-app notifications, behaviour on a low-end Android. If those fail → wrap with Capacitor (record in DECISIONS_LOG).
