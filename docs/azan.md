# Add your own azan file

The app ships with no azan recording. You add one; the app does the rest. Nothing is downloaded from the internet.

## Steps
1. Get an azan recording you have the right to use (see Licence below).
2. Save it as **azan.mp3**. Optional: a second file **azan-fajr.mp3** for Fajr only (if missing, azan.mp3 is used for Fajr too).
3. Put the file(s) in the folder **public/audio/** of the project (next to `.gitkeep`). Do not rename the folder.
4. Publish the app again (the builder does this when you say so).
5. Open the app: More > Deen > Azan sound or vibration. Switch **Azan alert** On and **Azan sound** On. Tap **Play a preview** to hear it. Use the volume slider to set the level.

## Format and size
- Format: MP3 (AAC .m4a renamed is not supported; use real MP3).
- Size: 3 MB or less per file (about 3 to 4 minutes at 128 kbps is plenty; a short azan is fine). Larger files are ignored.
- Both files together are saved on the phone for offline use after the first visit.

## How it behaves
- Default is OFF. Sound plays only for the azan alert, only if you switched it on, and only while the app is open (a closed page cannot play sound).
- No file added: a short vibration (if the phone allows), otherwise silent. No error is shown.
- Volume 0 means silent. With "reduce motion" on in the phone, the vibration is skipped.
- Phones may block sound until you have tapped something in the app once; the card still shows.

## Licence reminder
Use only a recording you made yourself, one in the public domain, or one whose licence allows use in an app. Keep the licence note somewhere safe (for example in DECISIONS_LOG.md). The builder cannot check licences for you.

## Undo
Delete the file(s) from public/audio/ and publish again. The app returns to vibration or silent.
