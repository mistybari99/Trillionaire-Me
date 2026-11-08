# Sector model (BUILD-02, work order W4)

A sector family tells the app WHICH inputs, formulas, questions and risks apply to a kind of business. The user supplies every number. The app never ships a benchmark, a typical margin, a price, a tax rate, a market size, a rating or a ranking. Unknown is never 0.

Honest scope: the aim is wide coverage. About 28 families cover most business types, and the `custom` family (user-defined inputs and formulas) is the fallback so no business is left out. We do not claim any coverage percentage in the app.

## Code map

| File | What |
|---|---|
| `src/core/sectors/types.ts` | `SectorFamily`, `SectorInput`, `FormulaDef`, unit kinds |
| `src/core/sectors/engine.ts` | safe parser and evaluator (no `eval`), unit-kind check |
| `src/core/sectors/formulas.ts` | shared formula library (EN and BN names) |
| `src/core/sectors/custom.ts` | the `custom` family, `validateCustomDef`, `buildCustomFamily` |
| `src/core/sectors/index.ts` | registry: `getFamily`, `searchFamilies`, `listFamilies`, `evaluateFamily`, `validateFamily`, `validateRegistry` |
| `src/core/sectors/families/<id>.ts` | one data file per family (the files writers create) |
| `tests/sector_engine.test.ts`, `tests/sector_family_files.test.ts` | engine, library, registry, custom, per-file check |

## Engine rules

- Grammar only: numbers, input ids, `+ - * /`, unary minus, parentheses, `min(...)`, `max(...)`, `abs(x)`. Anything else is rejected with an error (`a.b`, `a[0]`, `;`, `**`, `%`, `? :`, strings, any other function name).
- A formula gives a number only when every input it names is a finite number. Missing, blank, null, NaN: the answer is Unknown (`null`). No default values. A real 0 typed by the user is a number.
- Division by zero is Unknown.
- Unit kinds: inputs have `money | qty | percent | days | count | rate`. Results may also be `ratio`. The checker rejects money plus quantity, quantity times days, quantity divided by money, and so on. Allowed: money - money, money x qty (money), money / qty (money), money / money (plain number), plain number x days (days), percent / 100 (plain number). Percent results are written as `part / whole * 100` and declared `percent`.
- Writers: use `shareOfMoney`, `shareOfQty`, `contributionMarginPct` and the other library formulas for percent results, so family files carry no digits.

## Shared formula library (`LIB_FORMULAS`)

Use it with `{ id, use: "<libId>", map: { <libParam>: "<yourInputId>" } }`. Every parameter must be mapped. Optional `name` overrides the library name.

| use | Parameters (unit) | Result |
|---|---|---|
| `contributionMargin` | price (money), varCost (money) | money |
| `contributionMarginPct` | price, varCost | percent |
| `grossMargin` | revenue (money), cogs (money) | percent |
| `breakEvenUnits` | fixed, price, varCost (money) | qty |
| `breakEvenRevenue` | fixed, price, varCost | money |
| `receivableDays` | receivables, revenue (money), periodDays (days) | days |
| `inventoryDays` | inventory, cogs (money), periodDays | days |
| `payableDays` | payables, cogs, periodDays | days |
| `cashConversion` | receivables, inventory, payables, revenue, cogs, periodDays | days |
| `cac` | marketingSpend (money), newCustomers (count) | money |
| `ltv` | marginPerPeriod (money), churnPct (percent); Unknown if churn is not given | money |
| `payback` | investment (money), profitPerPeriod (money) | count (periods) |
| `capacityUtilisation` | used (qty), capacity (qty) | percent |
| `yieldRate` / `lossRate` | outputQty (qty), inputQty (qty) | percent |
| `seasonalitySpread` / `seasonalitySpreadPct` | jan, feb, ... dec (money, the user's monthly figures) | money / percent |
| `shareOfMoney` | part (money), whole (money) | percent |
| `shareOfQty` | partQty (qty), wholeQty (qty) | percent |
| `occupancy` | occupiedUnits (count), availableUnits (count) | percent |
| `revenuePerCapacity` | revenue (money), capacityUnits (qty) | money |
| `loadFactor` | usedLoad (qty), availableLoad (qty) | percent |

A family may also write its own expression (see `monthProfit` in `food-service.ts`): `{ id, name, expr, needs, result }`. `needs` must list exactly the ids in `expr`; `result` must fit the unit kinds.

Seasonality: a family with `seasonal: true` is offered the monthly entry (twelve figures, ids `jan` ... `dec`) and the two seasonality formulas by the UI in phase C. The family file does not list the twelve months as inputs.

## The data file template (copy this, change the content)

File: `src/core/sectors/families/<family-id>.ts` (id = lower-case letters, digits and hyphens; export name = camelCase of the id; exactly one export).

```ts
// <Family name>. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const myFamily: SectorFamily = {
  id: "my-family",
  name: { en: "English name", bn: "বাংলা নাম" },
  summary: { en: "One or two plain sentences.", bn: "এক-দুই লাইনের সহজ বর্ণনা।" },
  aliases: {
    en: ["lower case search word", "another word"],   // 5 or more, lower case
    bn: ["বাংলা সার্চ শব্দ", "আরেকটা শব্দ"],             // 4 or more
  },
  inputs: [   // 5 or more; ids: letters and digits, start with a letter
    { id: "price", label: { en: "Price per unit", bn: "প্রতি ইউনিটের দাম" }, unit: "money", perPeriod: false, required: true },
    { id: "varCost", label: { en: "...", bn: "..." }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "...", bn: "..." }, unit: "money", perPeriod: true, required: true,
      hint: { en: "optional help line", bn: "ঐচ্ছিক সাহায্য লাইন" } },
    // ... at least two more, each with a unit: money | qty | percent | days | count | rate
  ],
  formulas: [   // 3 or more
    { id: "unitMargin", use: "contributionMargin", map: { price: "price", varCost: "varCost" } },
    { id: "breakEven", use: "breakEvenUnits", map: { fixed: "fixed", price: "price", varCost: "varCost" } },
    { id: "ownOne", name: { en: "...", bn: "..." }, expr: "price - varCost", needs: ["price", "varCost"], result: "money" },
  ],
  questions: [{ en: "A question the owner should think about?", bn: "মালিকের ভেবে দেখার একটা প্রশ্ন?" }],   // 3 or more
  risks: [{ en: "A plain risk.", bn: "একটা সহজ ঝুঁকি।" }],                                                  // 3 or more
  seasonal: false,
  related: { paths: [], halalCheck: true },   // paths = ids in src/library/paths.ts only if they exist; halalCheck: true when a halal check is relevant
};
```

## Rules for writers (the tests enforce most of these)

1. Bilingual: every label, hint, name, summary, question and risk has `en` and `bn`. Bangla follows CLAUDE.md section 2b, `docs/design/bangla-plain-final-decision.md` and `docs/design/bangla-plain-pass2.md`: plain spoken Bangla, আপনি form, Latin digits, English everyday words in Bangla script (স্টাফ, ইউনিট, মার্জিন, স্টক), no banned words (the Bangla test lists them).
2. No numeric benchmark anywhere: no typical margin, price, rate, tax, market size, range, "good" or "bad" rating, sector ranking. A family file contains no digit and no `%`, `৳`, `$` (the test greps for this). No "best" or "typical" wording.
3. Aliases: English lower case (5 or more), Bangla (4 or more), include everyday and Bangladesh words people really use.
4. At least 5 inputs and 3 formulas (a family may declare a reason in its summary if fewer truly apply, but ask the integrator first). Every input has a unit kind; per-period figures say `perPeriod: true`. Ask for what a person can read from their own books or memory.
5. Formulas: prefer library formulas. Own expressions use only input ids and the grammar above; `needs` lists exactly the ids used; the unit kinds must fit.
6. 3 or more questions and 3 or more risks, each one short and neutral. Risks name what can go wrong, never a prediction or a statistic. No fatwa, no financial or legal advice.
7. Finance-adjacent families (micro-lending coordination, agent banking, MFS cash points, insurance agency): coordination and record keeping only, not advice; mention rules and licences as a question, never state a legal threshold.
8. Do not edit `index.ts`, `types.ts`, `engine.ts`, `formulas.ts`, `src/catalog/fields.ts` or any UI file. Create only your data files. If a formula you need is missing from the library, write it as an own expression and tell the integrator.
9. Check your work: `npx vitest run tests/sector_family_files.test.ts tests/sector_engine.test.ts tests/bangla_plain.test.ts`. The integrator adds your file to `ALL_FAMILIES`, to `tests/fixtures/bangla_counts.json` (the Bangla string count of your file) and runs the full checklist. (`tools/banglaPlainCore.mjs` picks up every file in `families/` by itself.)

## Coverage matrix

ISIC-style sections and common Bangladesh business types, mapped to a family. Status: `done` = data file written and validated; `todo` = writer pending; `written` = file written in phase B, integrator wiring pending. Anything not listed maps to `custom`.

| # | Family id | Covers (ISIC-style section / Bangladesh business types) | Status |
|---|---|---|---|
| 1 | `retail` | G retail: grocery, mini mart, stall, pharmacy counter sales (not dispensing), general store | done (worked example) |
| 2 | `wholesale-trading` | G wholesale: aratdar, dealer, distributor, commodity trading | todo |
| 3 | `manufacturing-discrete` | C: small factory, workshop, furniture, metal, plastics, packaging | todo |
| 4 | `food-processing` | C10-11: rice mill, flour, spices, pickles, dairy products, bakery production | todo |
| 5 | `garments-textile` | C13-14: RMG, knitwear, weaving, dyeing, boutique production | todo |
| 6 | `agriculture-crops` | A01: rice, vegetables, fruits, jute, tea, nursery | todo |
| 7 | `livestock-poultry-dairy` | A01: cattle, goat, poultry, eggs, dairy farm | todo |
| 8 | `fisheries-aquaculture` | A03: pond fish, shrimp, hatchery, fishing | todo |
| 9 | `food-service` | I56: restaurant, cafe, tea stall, catering, food cart, cloud kitchen | done (worked example) |
| 10 | `hospitality-travel` | I55, N79: hotel, guest house, resort, tour and travel agency | todo |
| 11 | `professional-consulting` | M69-74: consultant, lawyer, accountant, architect, engineer, agency | todo |
| 12 | `healthcare-pharmacy` | Q86, G47: clinic, diagnostic centre, pharmacy, dental | todo |
| 13 | `education-training` | P85: school, coaching centre, tutor, training institute, online course | todo |
| 14 | `construction-contracting` | F41-43: builder, civil contractor, electrical, plumbing, interior | todo |
| 15 | `real-estate` | L68: rental property, brokerage, land development | todo |
| 16 | `transport-logistics` | H49-53: ride, CNG, truck, bus, courier, warehouse, rider | todo |
| 17 | `ict-software-saas` | J58-63: software house, SaaS, IT services, app, hosting | todo |
| 18 | `e-commerce-f-commerce` | G47.9: online store, Facebook page shop, marketplace seller | todo |
| 19 | `digital-creator-media` | J59-60, R90: YouTube, content creator, photographer, studio, publisher | todo |
| 20 | `creative-design-print` | M74, C18: graphics, printing press, signage, advertising | todo |
| 21 | `import-export` | G46, H52: importer, exporter, C and F agent, sourcing | todo |
| 22 | `repair-maintenance` | S95: mobile, electronics, vehicle, appliance, machine repair | todo |
| 23 | `energy-utilities-solar` | D35-36, E: solar, generator, water supply, waste collection | todo |
| 24 | `mining-materials-quarry` | B: sand, stone, brick field, clay (light) | todo |
| 25 | `finance-adjacent` | K64-66: micro-lending coordination, agent banking, MFS cash point, insurance agency (not advice) | todo |
| 26 | `ngo-social-enterprise` | S94, Q88: NGO project, cooperative, social enterprise, foundation | todo |
| 27 | `personal-services` | S96: salon, parlour, laundry, tailor, cleaning, photo studio | written |
| 28 | `gig-freelance` | N78, M: freelancer, gig worker, online marketplace worker, driver-partner, home tutor | written |
| - | `custom` | Fallback for everything not mapped above: user-defined inputs and formulas | done (phase A) |

ISIC sections with no dedicated family fall to `custom` or to the nearest family: O public administration (not a business), T households as employers, U extra-territorial bodies. Section R (arts, sports) maps to `digital-creator-media` or `custom`; section N (admin and support) maps to `professional-consulting`, `gig-freelance` or `transport-logistics`.

### ISIC Rev.4 sections A-U to families

| Section | Meaning | Family |
|---|---|---|
| A | Agriculture, forestry, fishing | `agriculture-crops`, `livestock-poultry-dairy`, `fisheries-aquaculture` |
| B | Mining and quarrying | `mining-materials-quarry` |
| C | Manufacturing | `manufacturing-discrete`, `food-processing`, `garments-textile`, `creative-design-print` (printing) |
| D | Electricity, gas, steam | `energy-utilities-solar` |
| E | Water, sewerage, waste | `energy-utilities-solar` |
| F | Construction | `construction-contracting` |
| G | Wholesale and retail trade | `retail`, `wholesale-trading`, `e-commerce-f-commerce`, `import-export` |
| H | Transport and storage | `transport-logistics` |
| I | Accommodation and food service | `hospitality-travel`, `food-service` |
| J | Information and communication | `ict-software-saas`, `digital-creator-media` |
| K | Finance and insurance | `finance-adjacent` (record keeping only, not advice) |
| L | Real estate | `real-estate` |
| M | Professional, scientific, technical | `professional-consulting`, `gig-freelance` |
| N | Administrative and support | `professional-consulting`, `gig-freelance`, `transport-logistics`, `hospitality-travel` (travel agency) |
| O | Public administration | unmapped -> `custom` (not a business) |
| P | Education | `education-training` |
| Q | Human health and social work | `healthcare-pharmacy`, `ngo-social-enterprise` |
| R | Arts, entertainment, recreation | `digital-creator-media`, else `custom` |
| S | Other service activities | `personal-services`, `repair-maintenance`, `ngo-social-enterprise` |
| T | Households as employers | unmapped -> `custom` |
| U | Extra-territorial bodies | unmapped -> `custom` |

### Common Bangladesh business types to families

| Business type | Family |
|---|---|
| Tea stall, street food, restaurant | `food-service` |
| Mobile recharge shop, bKash or Nagad agent | `finance-adjacent` (cash point record keeping) |
| Pharmacy | `healthcare-pharmacy` (counter sales also fit `retail`) |
| Poultry farm | `livestock-poultry-dairy` |
| Garment factory | `garments-textile` |
| CNG, rickshaw, truck, courier | `transport-logistics` |
| Coaching centre, home tutor | `education-training` (a lone tutor may also use `gig-freelance`) |
| Brick field | `mining-materials-quarry` |
| F-commerce page | `e-commerce-f-commerce` |
| Freelancer, ride-app driver | `gig-freelance` |
| Tailor, salon, laundry | `personal-services` |
| Grocery, mini mart | `retail` |
| Clinic, diagnostic centre | `healthcare-pharmacy` |
| NGO, cooperative | `ngo-social-enterprise` |
| Contractor | `construction-contracting` |
| Import trader, C and F agent | `import-export` |
| Aratdar, dealer, distributor | `wholesale-trading` |
| Mobile or electronics repair | `repair-maintenance` |
| Rice mill, spice or pickle maker | `food-processing` |
| Anything else (unmapped) | `custom` |

Unmapped -> `custom`: any business type or ISIC section not in the tables above uses the `custom` family, where the user defines their own inputs and formulas.

Honest statement: coverage is by family plus the `custom` fallback. We do not promise any coverage percentage, such as 99 percent. A business may fit a family only roughly; the user can switch family or use `custom`.

## Next phases

- B: writer agents add rows 2-28 as data files only.
- C: integrator wires the UI on the venture screen, the migration (`sectorId`, `sectorInputs`), links to goal measures, Money and the report, the M09 "calc" box (only after Audit PASS), `docs/design/template-pattern.md`, screens and evidence.
