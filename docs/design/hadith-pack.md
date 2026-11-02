# Hadith pack (D-D): source, licence, how entries get in, how they were checked

Default OFF. The pack is `src/library/hadithPack.json`. Nothing is written from memory or paraphrased: every Arabic, English and Bangla text is a cell copied unchanged by `tools/hadith_import_hadeethenc.mjs`. The in-app label stays "Unreviewed by a scholar" until a named reviewer signs.

## State on 2 Nov 2026
- 212 entries (Sahih al-Bukhari 100, Sahih Muslim 58, Jami at-Tirmidhi 24, Sunan Abi Dawud 21, Musnad Ahmad 5, Sunan Ibn Majah 3, Sunan an-Nasa'i 1). Topic tags (an entry can carry up to three): character 103, purpose 52, life 20, intention 19, family 13, wealth 10, knowledge 10, halal earning 8, patience 7, time 3. Time, patience and halal earning are thin because only hadith whose source reference carries a collection number could be used.
- Every entry has: Arabic, English, Bangla (when the Bangla release has the same hadith; all 212 do), collection, hadith number, the source's own reference lines, the authenticity label the source gives (named "HadeethEnc.com"), source with versions, the address of that hadith on hadeethenc.com, licence line, status "unreviewed".
- Topic tags are the builder's own labels (taken from the source's category tree and headline words); they are not a scholarly classification.

## Source and licence
- Source: HadeethEnc.com, "Encyclopedia of Translated Prophetic Hadiths" (Arabic v1.8.0, English v1.25.0, Bangla v1.56.0). hadeethenc.com itself was not reachable from the build machine, so the files came from an unchanged mirror: github.com/Younes12345698/hadeethenc-mirror, commit 429f7bd041246a943751121590287c7877b15372 (files `data/v1/hadeeths/{ar-1.8.0,en-1.25.0,bn-1.56.0}.json.gz`; their SHA-256 are listed in the mirror's `data/v1/index.json`).
- Terms (quoted in the mirror's `TERMS.md` from the site's "Terms and policies", and stated again in the README of the publishers' own organisation `IslamHouse-API`): download and republish are allowed with no change, addition or deletion to the content; name the publisher and source (HadeethEnc.com); state the version number; keep the version information; send notes on a translation to the source; follow new versions; no unsuitable advertising. Storing for offline use and use in apps are named as allowed. How this app follows them: text unchanged (checked by `tools/hadith_verify.mjs`); the source and versions are on every card and in the page note; no ads; notes go to HadeethEnc.com (page note).
- Caveat to confirm later by the owner: the terms were read in the mirror's quotation and the publishers' README, not on hadeethenc.com. If the owner prefers, a one-line email to the publishers (address in the IslamHouse-API README) can confirm. Per-hadith translator names are not given by the source.
- Not used: fawazahmed0/hadith-api (Unlicense on the repository, but translators' rights unclear). It is used only to cross-check numbers (read-only, nothing copied).

## Rebuild (any builder session)
1. Get the three gz files from the mirror commit above into an empty folder.
2. `node tools/hadith_import_hadeethenc.mjs --dir <folder> --mirror-commit 429f7bd041246a943751121590287c7877b15372` (writes the pack and `docs/design/hadith-selection.json`). Selection rules are in the script: authentic or hasan label, a reference line with collection and hadith number, length limit, a list of words to avoid (violence, sexual detail, self-harm), one entry per collection number, plus a visible EXCLUDE list of ids skimmed as off topic.
3. `node tools/hadith_verify.mjs` (read-only; re-downloads the source, compares every cell, cross-checks Bukhari and Muslim numbers with a second dataset). `--strict` also fails on unresolved cross-check mismatches.
4. A scholar review is optional and later: a named reviewer changes `status` to `reviewed` (the app then shows the reviewer's name).
The older `tools/hadith_import.mjs` (fawazahmed0 file format) is kept for other sources.

## Verification result (2 Nov 2026)
- Cell-by-cell against the re-fetched source: 212 of 212 entries match (Arabic, English, Bangla, grade, address, every reference line, collection and number).
- Second dataset (fawazahmed0, Bukhari and Muslim, 158 entries): headline found at the claimed number for 143; 15 could not be confirmed automatically. By hand, 13 Bukhari ones show the same hadith at the claimed number in wording that differs from the headline (for example the intention hadith at 6953, a repeat of hadith 1); 2 Muslim numbers (2977, 2759) are missing from the second dataset, so they rest on the source's own reference only. 54 entries from other collections were not cross-checked.
- A separate verification session (not the builder) re-checked the pushed commit; its result is in DECISIONS_LOG.
