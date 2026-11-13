# Trillionaire Me: বাকি কাজের পুরো প্ল্যান (13 Nov 2026)

Branch: `ccr-8b686ba2-vitt45`, HEAD `1088516`. সোর্স: [PLAN_TRACKER.md](PLAN_TRACKER.md), [visual-ref-build-queue.md](../design/visual-ref-build-queue.md), [work-orders-2026-11-07.md](../process/work-orders-2026-11-07.md), Spec §gates ([Canonical Spec](../spec/Trillionaire_Me_Canonical_Spec_v2_0.md)), Codex blueprint ([charter 2026-11-08](../charter/2026-11-08/TRILLIONAIRE_ME_UNIFIED_UPGRADE_BLUEPRINT.md)).

চিহ্ন: 🔨 = আমি বানাব · 🔍 = আমি যাচাই করব · 📱 = আপনার হাতে (ফোন/রিভিউয়ার) · 🔒 = আপনার অনুমতি লাগবে

---

## 0. এক নজরে

| ভাগ | কতগুলো | কে |
|---|---|---|
| A. নতুন বিল্ড (W2, Q-14 থেকে Q-33, ছোট কাজ) | 20 Q + W2 + 4 ছোট | 🔨 আমি |
| B. Codex upgrade blueprint (TMV2-01 থেকে TMV2-10) | 10 প্যাকেজ | 🔨 আমি, ধাপে ধাপে |
| C. "Needs verification" রো | 19টি | 🔍 আমি (কিছু 📱 আপনার ফোন টেস্টের পর বন্ধ হবে) |
| D. Owner কাজ | OWNER-01 থেকে OWNER-08 | 📱 আপনি |
| E. Owner সিদ্ধান্ত | DECISION-02, 03, 04 | 🔒 আপনি |
| F. Spec gate G2 থেকে G8 | 7 gate | মিশ্র |

ইতিমধ্যে শেষ (রেফারেন্স): এনক্রিপশন (DECISION-01 বিল্ড), Q-01 থেকে Q-13 ও Q-34, W3 work block, W4 sector toolkit (BUILD-02 Done), W5 brand ও ফ্লোটিং হেড, W1 AI layer (বন্ধ), আজান 1 থেকে 4, LIVECALC-01 What-if, text size lock।

---

## A. নতুন বিল্ড, আমার কাজ 🔨

### A1. W2: Share, cloud ও viewer edition (বানিয়ে রাখা, ডিফল্ট OFF)
Owner-এর কথা: "বিল্ড করে রাখবা, যখন মারকেটিং করবো তখন যেন সব ভাবে ইউজ করাতে পারি"।
1. `src/core/share.ts`: মডিউল, ফিল্ড ও তারিখ বেছে read-only share pack বানানো যাবে। Real, Deen ও Health ডাটা প্রতিটির টিক ছাড়া যাবে না। Export-এর আগে preview থাকবে।
2. Vault seal দিয়ে sealed file তৈরি হবে। দুটো adapter থাকবে: `fileAdapter` (নেটওয়ার্ক নেই) আর `httpAdapter`। `httpAdapter` টেস্টে mock দিয়ে চলবে, আর শিপ করা অবস্থায় বন্ধ থাকবে।
3. `/viewer` route হবে শুধু দেখার জন্য, এডিট কন্ট্রোল থাকবে না। Revocable code থাকবে (শুধু hash রাখা হবে, ঐচ্ছিক মেয়াদ)। Settings-এ Revoke লিস্ট থাকবে।
4. Staff ও customer-এর জন্য একটা অফলাইন HTML/PDF ফাইল export, যাতে খরচ শূন্য।
5. Settings → "Sharing": মাস্টার সুইচ OFF, চালু share-এর লিস্ট, kill switch।
6. `docs/design/share-viewer.md`-এ লেখা থাকবে owner-কে কী কী করতে হবে: hosting, backend, domain, CSP, privacy text, আইনি রিভিউ।

টেস্ট: seal round trip, ভুল code ফেল, টিক না দেওয়া ক্যাটাগরি বাদ, revoke করা code বাতিল, viewer-এ write ফাংশন নেই, file mode-এ 0 নেটওয়ার্ক।

### A2. ভিজ্যুয়াল রেফারেন্স কিউ: বাকি 20টি (Q-14 থেকে Q-33)
| Q | কাজ | নোট |
|---|---|---|
| Q-14 | Decision helper: 7টি চিন্তার প্রশ্ন, 4টি framework কার্ড (10/10/10, pros/cons, six hats, OODA) | রিভিউয়ার pending ট্যাগ |
| Q-15 | Horizon: প্রতি লেভেলে "one thing", নিজের milestone থেকে checkpoint, চলমান marker | V37 bike timeline সহ |
| Q-16 | Flow ডায়াগ্রাম: systems→routines→habits→identity; goal→system→minimum→review→adjust | টেক্সট বিকল্প সহ |
| Q-17 | Path ছবি: S-curve snake path, A থেকে H 8টি পাথর, Plan/Action/Success caption | নিজের ডাটা থেকে |
| Q-18 | Progress shape: skill ring, momentum shape, 3টি pillar bar | Unknown = ড্যাশ, 0 না |
| Q-19 | Reward metaphor: পাথরের জার, রিং বা ব্রিজ; courage bridge; ধীর motion | reduced motion মানবে |
| Q-20 | Setup checklist (3 phase) + "আমি কোথায়" (lost/learning/executing) | কোনো percent স্কোর নেই |
| Q-21 | Challenge tracker `#/journey/challenge`: N দিনের grid, rules, শেষের checklist | streak নেই |
| Q-22 | Venture cluster checklist | |
| Q-23 | SOP-এ purpose/trigger/check/handoff ফিল্ড + print | schema-তে অতিরিক্ত ফিল্ড যোগ |
| Q-24 | System ও glossary-তে source লাইন + systems search (EN+BN) | O8 |
| Q-25 | Daily plan sheet: mantra, আগামীকালের লিস্ট, make-time-for | Q-09 style |
| Q-26 | Task সাজানো (impact/effort 4 ভাগ, top 3) + batching | |
| Q-27 | পরিস্থিতি বাছাই (চাকরি + সাইড প্রজেক্ট / ফুল-টাইম / ছাত্র) → নমুনা সপ্তাহ | W3 block দিয়ে |
| Q-28 | Reflection ছবি: নিজের feeling wave, 6টি setback panel, mindset stair | লাল রং নেই |
| Q-29 | নোটে ছবি (300 KB, ডিভাইসে, export-এ শুধু টিক দিলে) | D-B-এর আওতায় |
| Q-30 থেকে বাকি | SMART wizard (Q-30 batch 2-এ আংশিক হয়েছে, বাকিটা যাচাই) | |
| Q-31 | ছোট chooser: working style, maturity funnel, quick-pick | কোনো "type score" নেই |
| Q-32 | Focus grid: 16টি কার্ডের tick পেজ | |
| Q-33 | প্রতি স্ক্রিনে আলাদা look (ঐচ্ছিক) | Q-05-এর উপর নির্ভর |

এর সাথে আংশিক থাকা রো যা বন্ধ হবে: O5/O17 (Deen, Stuck, Topics, North Star ও Capture-এ template chooser), O7/O20 (motion), O15/O16, O18/O19 (Stuck-এর ছবি, Q-03-এর বাকি অংশ)। পুরো ম্যাপ [visual-ref-build-queue.md](../design/visual-ref-build-queue.md)-এ আছে: 45 STILL-PARTIAL, 29 STILL-MISSING, 15 BLOCKED।

### A3. ছোট কাজ
1. Sector family লেবেল নরম করা: "Good output" হবে "Sellable output", "best month" হবে "highest month", "Customers lost" হবে "Customers who left", "Late" হবে "Overdue", "Average" হবে "Your average" (W4 audit-এর সুপারিশ)।
2. PR #1-এর title ও body এখনকার scope অনুযায়ী আপডেট (OPS-02; সোর্স [PR reconciliation](../audit/PR_RECONCILIATION_2026-11-06.md))। Merge শুধু শান্ত সময়ে, CI সবুজ থাকলে, normal merge commit দিয়ে।
3. W1-এর বাকি: Suggest flow-এর AI পথ guard দিয়ে যাচ্ছে কিনা নিশ্চিত করা, আর scripture (D-D) block guard-এ স্পষ্ট করা (audit নোট)।
4. What-if-এর বাকি: sheet-এ focus trap, বাকি library formula-গুলো ক্যালকুলেটর হিসেবে (contribution margin, receivable/inventory/payable days, LTV ইত্যাদি)।

---

## B. Codex upgrade blueprint (TMV2) 🔨
সোর্স: [CODEX_NEXT_EXECUTION_QUEUE.md](../charter/2026-11-08/CODEX_NEXT_EXECUTION_QUEUE.md)। এটা প্রস্তাব, এখনো শুরু হয়নি। একবারে একটা প্যাকেজ।

| ক্রম | প্যাকেজ | কী |
|---|---|---|
| 1 | TMV2-01 | Recall contract: capture, নোট, task, গোল, venture-এর lifecycle ও index (শুধু core) |
| 2 | TMV2-02 | Inbox lifecycle: inbox/active/waiting/paused/done/archived; migration, কিছুই মুছবে না |
| 3 | TMV2-03 | Recall ও লোকাল search স্ক্রিন (ফিল্টার; archive করা জিনিসও খোঁজা যাবে) |
| 4 | TMV2-04 | সব venture মিলিয়ে next-action, কারণসহ (blocker, waiting, review); সর্বোচ্চ 3টি |
| 5 | TMV2-05 | Guided breakdown journey: worksheet, tree, backward, capacity এক flow-তে |
| 6 | TMV2-06 | Domain-pack contract (versioned; sector family দিয়ে প্রমাণ) |
| 7 | TMV2-07 | Scenario core + সেভ করা scenario (schema 6 + migration) |
| 8 | TMV2-08 | Simulation Lab: What-if-এর বড় ভার্সন, তুলনা ও সেভ |
| 9 | TMV2-09 | Scenario থেকে প্ল্যানে প্রস্তাব: diff → approve/cancel/rollback |
| 10 | TMV2-10 | 7/14 দিনের experiment + ফুল regression + ফোন checklist |

নোট: LIVECALC-01 (What-if) ইতিমধ্যে TMV2-07/08-এর ছোট ভার্সন। "What-if ফল গোল হিসেবে সেভ" এখানে আসবে।

---

## C. যাচাই বাকি ("Needs verification") 🔍
| ID | কী বাকি |
|---|---|
| OPS-01 | Failed-CI হলে deploy আটকায় কিনা, আলাদা remote-এ ট্রায়াল |
| OPS-03 | Preview build-এর শেষ নিশ্চিতকরণ |
| VERIFY-01 | Legacy task map-এর 189টি রো-র মধ্যে 13টি পড়া বাকি, 3টি নাম পুরোনো |
| VERIFY-02 | নতুন স্ক্রিন (What-if, AI connect, sector, work block) সহ নতুন screenshot matrix |
| VERIFY-03 | নামাজের সময়ের সোর্স: 20/20 পাস; owner তুলনা (OWNER-03) বাকি |
| VERIFY-04 | Register mapping আবার মেলানো (14 Pass, 30 Partial ছিল); নতুন feature যোগ |
| PERF-01 | ফোনে প্রথম ডাউনলোডের সাইজ; hadith chunk |
| DESIGN-01 | PR #2-এর design proposal মেলানো (শুধু ডক) |
| OPS-02 | PR #1-এর scope (A3.2) |
| BUILD-01 | Work block: audit হয়েছে; tracker বন্ধ করা বাকি |
| BUILD-03 | Visual queue (A2) শেষ হলে বন্ধ হবে |
| DECISION-01 | এনক্রিপশন: আলাদা audit + ফোনে টেস্ট |
| UI-02, UI-03, UI-04, UI-05 | ফোনে TalkBack ও contrast চেক (📱) |
| AZAN-01 | ফোনে আসল প্লেব্যাক (OWNER-08) |
| LIVECALC-01 | UI-05 Done হলে Done হবে |

---

## D. Owner কাজ 📱 (শুধু আপনি পারবেন)
| ID | কী করবেন |
|---|---|
| OWNER-01 | Android ফোনে install, airplane mode-এ চালু, আপডেট মাঝপথে, নতুন ফোনে restore |
| OWNER-02 | অ্যাপ বন্ধ থাকলে রিমাইন্ডার আসে কিনা, lock screen-এ প্রাইভেট টেক্সট, Bangla কীবোর্ড |
| OWNER-03 | নামাজের সময় বনাম ইসলামিক ফাউন্ডেশনের সরকারি সময় (Asr method, offset) |
| OWNER-04 | Bangla রিভিউয়ার সাইন-অফ (TM-TST-161) |
| OWNER-05 | 7 দিন নিজে ব্যবহার + 5টি usability session (01 ও 02-এর পরে) |
| OWNER-06 | Bangladesh pack, সোর্স, halal-check কনটেন্ট রিভিউ |
| OWNER-07 | 4টি look ফোনে দেখে পছন্দ জানানো |
| OWNER-08 | আজান ফাইল 1 থেকে 4-এর লাইসেন্স বা সোর্স নিশ্চিত করা |
| (Cloudflare) | Deployments সবুজ কিনা দেখা; API connector যোগ করা (ঐচ্ছিক) |

---

## E. Owner সিদ্ধান্ত 🔒
| ID | কী | এখনকার অবস্থা |
|---|---|---|
| DECISION-02 | AI, Google search: provider, খরচের সীমা | বানানো ও audit PASS, **OFF**। আপনি বলেছেন এখন সব ফ্রি |
| DECISION-03 | কোরআন বা হাদিসের টেক্সট: লাইসেন্স + আলেম রিভিউ | বন্ধ (D-D) |
| DECISION-04 | Cloud copy, share, staff বা public edition | W2 বানানো হলেও OFF থাকবে |

---

## F. Spec gate (G0 থেকে G8)
| Gate | নাম | অবস্থা |
|---|---|---|
| G0, G1 | Spec freeze, safe shell | পার হয়েছে |
| G2 | Android offline prototype | কোড তৈরি; **ফোন টেস্ট (OWNER-01, 02) বাকি** |
| G3 | নিয়মভিত্তিক planner | প্রায় সব মডিউল তৈরি (M01 থেকে M25-এর মধ্যে 23টি পুরো); UI-02 থেকে UI-05-এর যাচাই বাকি |
| G4 | Research ও option | Wikipedia চালু, Google port বানানো, OFF |
| G5 | Deen কনটেন্ট যাচাই | 📱 রিভিউয়ার ও লাইসেন্স লাগবে (DECISION-03, OWNER-03, 06) |
| G6 | AI ও automation | Port তৈরি; server proxy, red-team, খরচের সীমা: 🔒 আপনি চালু করলে |
| G7 | Privacy, recovery, real data | Vault ও backup তৈরি; **আইনজীবীর রিভিউ** ও clean-device restore বাকি |
| G8 | Pilot → PC → Public | সবার শেষে; নতুন owner অনুমোদন |

---

## G. আমার কাজের ক্রম (আপনি না বদলালে)
1. A3.1 family লেবেল + A3.3 W1 ছোট ফিক্স (দ্রুত)
2. A1 W2 share ও viewer (OFF)
3. A2 Q-14 থেকে Q-33, 4 থেকে 5টি করে batch-এ (প্রতিটির জন্য Prompt-Engineer → builder → Audit PASS → push)
4. C যাচাই: VERIFY-02 নতুন screenshot, VERIFY-04 Register, BUILD-01 ও BUILD-03 বন্ধ করা
5. A3.2 PR #1 আপডেট
6. B TMV2-01 থেকে ধাপে ধাপে

প্রতিটি কাজ Audit PASS ছাড়া "Done" হবে না। Unknown ≠ 0। কোনো score, rank, streak বা লাল রং নেই। খরচ বা ডাটা বাইরে পাঠানো লাগলে আগে আপনাকে জিজ্ঞেস করব।
