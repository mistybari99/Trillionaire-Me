# Optional feature descriptions — 6 November 2026

The owner's screenshots showed long module descriptions and six-part build status lists filling Journey. These reference cards now live inside one closed-by-default native “Feature details” disclosure at the bottom of Journey, Diary and Deen. Remove the redundant main-screen “Parts (structure only)” headings. Tool links, working features, data, calculations, consent/save warnings and ordinary guidance remain unchanged.

Opening the summary reveals the same module cards, build boxes, missing/blocked reasons and current-mode data status. The separate Build status page retains all25 cards directly visible. No new preference or schema migration is introduced. English, Bangla and Mix reuse the existing localization pipeline.

Validation: typecheck/build and74 focused tests pass. [Browser report](feature-details/e2e-report.json):104/104 checks pass, including native keyboard/pointer opening and closing on all three screens in English/Bangla; dedicated status availability; existing slider, offline/install/update and consent checks. Unit checks cover default closure and unchanged module data in demo/real modes and all three languages. Fresh360px Bangla previews: [closed](feature-details/journey-closed-bn.jpg) and [opened](feature-details/journey-open-bn.jpg). Physical-device/TalkBack acceptance remains separate.
