# Add your own azan files

**Update 7 Nov 2026:** the owner supplied 4 recordings; they are bundled as `azan-1.mp3` to `azan-4.mp3` with the labels 1 · Noor (১ · নূর), 2 · Sakinah, 3 · Salam and 4 · Hidayah (numbered in sequence, then a name) in `public/audio/azan-manifest.json`. The labels are only display names, not claims about the reciter. The manifest notes that the builder did not check the licence; the owner confirms the right to use them (files 1 and 2 carry the tag www.islamcan.com). The app also works with fewer or other files as described below; you can replace them any time.

The app otherwise ships with no azan recording. You add up to **4**; the app does the rest. Nothing is downloaded from the internet.

## Steps
1. Get azan recordings you have the right to use (see Licence below).
2. Save them as **azan-1.mp3**, **azan-2.mp3**, **azan-3.mp3**, **azan-4.mp3**. Add as many as you have (1 to 4).
   - Optional Fajr version of a recording: **azan-1-fajr.mp3** ... **azan-4-fajr.mp3** (if missing, the main file is used for Fajr too).
   - The older names still work: **azan.mp3** and **azan-fajr.mp3** count as recording 1 (if azan-1.mp3 also exists, azan-1.mp3 wins).
3. Put the file(s) in the folder **public/audio/** of the project (next to `azan-manifest.json`). Do not rename the folder.
4. Optional: open **public/audio/azan-manifest.json** and write a short **source / licence note** for each recording (for example "Own recording, 2026" or the licence name). Labels are neutral ("Recording 1" ...); you may change them. File names cannot be changed in the manifest.
5. Publish the app again (the builder does this when you say so).
6. Open the app: More > Settings > Prayer & alerts > **Azan sound or vibration**. Switch **Azan alert** On and **Azan sound** On. Under **Azan recording** tap **Choose** on the one you like (**Play** lets you hear each one). Recordings you did not add say **Not added** and cannot be chosen. If you choose none, the first added recording plays.

## Speed
- Under **Azan speed** the slider goes from **0.75x to 1.5x** in steps of 0.05. Normal is 1.0x.
- A live line shows the recording's real length (read from the audio file itself) and the length at the chosen speed, for example `Length: 4:10 → 3:20, 50 s shorter (at 1.25x)`.
- If the length is not known yet (no file, or the phone has not read it yet) the line says **unknown**. It never shows 0.
- Moving the slider changes nothing until you tap **Save speed**. **Play a preview** plays at the slider's speed, so you can hear it before saving. The voice keeps its natural pitch (the phone does the speed change).
- The saved speed is used for the real azan alert too.

## Format and size
- Format: MP3 (AAC .m4a renamed is not supported; use real MP3).
- Size: 3 MB or less per file (about 3 to 4 minutes at 128 kbps is plenty). Larger files are ignored and show **Not added**.
- The manifest and every added file are saved on the phone for offline use after the first visit (the build lists everything in public/audio/ automatically).

## How it behaves
- Default is OFF. Sound plays only for the azan alert, only if you switched it on, and only while the app is open (a closed page cannot play sound).
- No file added: a short vibration (if the phone allows), otherwise silent. No error is shown.
- Volume 0 means silent. With "reduce motion" on in the phone, the vibration is skipped.
- Phones may block sound until you have tapped something in the app once; the card still shows.
- Your choice and speed are stored on the phone only (setting `tm:ui:prayerAlerts`, new fields `azanSlot` and `azanSpeed`). Older saved settings without them use the defaults (first added recording, 1.0x), so nothing needs converting.

## Licence reminder
Use only a recording you made yourself, one in the public domain, or one whose licence allows use in an app. Keep the licence note in the manifest and somewhere safe (for example in DECISIONS_LOG.md). The builder cannot check licences for you.

## Undo
Delete the file(s) from public/audio/ and publish again. The app returns to vibration or silent. The choice and speed stay saved but have no effect without files.
