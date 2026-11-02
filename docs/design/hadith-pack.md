# Hadith pack (D-D): how entries get in

Default OFF. The pack is `src/library/hadithPack.json`. It holds ENTRIES ONLY IF their text was copied verbatim by `tools/hadith_import.mjs` from a source whose licence allows bundling. Nothing is written from memory.

State on 2 Nov 2026: the pack is EMPTY (0 entries). Reason: the only open dataset reachable from the build machine (fawazahmed0/hadith-api, Unlicense on the repository) lists the Bengali edition's author as "Unknown" and the English editions as translations by Muhsin Khan (Bukhari) and Abdul Hamid Siddiqui (Muslim). The repository's licence does not clearly cover those translators' copyright, so bundling them was not done. The Arabic originals are classical texts, but the edition's own terms are also not stated.

To fill the pack (any builder session or the owner):
1. Pick a source and read its licence. Record source name, address and licence text.
2. Write a selection file (id, number, topics, collection, lang).
3. Run the importer. It copies text and grades exactly as given and drops numbers it cannot find.
4. Run a separate read-only check that re-fetches each number and compares the text and reference. Fix or drop mismatches.
5. A scholar review is optional and later: a named reviewer changes `status` to `reviewed` (the app then shows the reviewer's name). Until then every card says "Unreviewed by a scholar".
