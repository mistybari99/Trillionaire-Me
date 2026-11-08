# Template pattern (family -> inputs, formulas, questions, risks)

The sector toolkit (M09) uses one pattern that other modules can reuse: a **family** is a small data record, and the app only reads it. Code never holds the content.

## The pattern

```
family id
  -> name, summary, aliases (EN and BN search words)
  -> inputs     what the user tells us (each with a unit kind)
  -> formulas   what we work out from those inputs (shared library first)
  -> questions  what the user should think about
  -> risks      what can go wrong (plain, no prediction)
```

Rules that carry over to every module:

1. Data only: no stored numbers, benchmarks, prices, ratings or rankings. The user supplies every figure. Unknown is never 0.
2. Bilingual: every text has `en` and `bn`, Bangla per CLAUDE.md 2b.
3. One file per family, a registry that validates all files, a test that checks each file, and a custom fallback for anything not covered.
4. No advice: no fatwa, no medical norms, no legal or financial advice. Coordination, record keeping and questions only.
5. Done only after an Audit PASS (links, dependents, no stubs).

## Where the pattern applies next

| Module | Family key | What the record holds | Notes |
|---|---|---|---|
| M07 money profiles | income type (salary, business, gig, farm, remittance) | inputs for income and costs, formulas for monthly spare money, questions, risks | reuses the unit-kind checker |
| M15 risk prompts by sector | sector family id from M09 | extra risk prompts and review questions | reads M09 families, adds no numbers |
| M17 topic guides | topic id | questions to ask, steps to think through, common mistakes in plain words | no scripture text until D-D |
| M14 health templates | routine type (sleep, movement, food, checkup) | what to note, questions | no norms, no targets, no diagnosis |
| M13 Deen plan templates | plan type | what to note, questions, reminders | no rulings, no scores, private by default |
| M10 team role sets | sector family id | typical role names and what each role records | names only, no pay figures |
| M24 templates | template kind | starting layouts built from the records above | after the modules they use |

## Recommended order

Build only **M09 now** (the sector families, engine and custom fallback). After M09 is wired and audited, the suggested order is M07, M15, M10, M17, M24, then M14 and M13 with extra care for privacy.

## Adding a new module on this pattern

1. Write the record type in a `types.ts` next to the module (data shapes only).
2. Add a validator that rejects digits, benchmarks and missing Bangla.
3. Write one data file per family, with the per-file test.
4. Wire the UI through the registry, never by importing a data file directly.
5. Add the module to the Register with test links.
