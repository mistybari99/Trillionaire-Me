// Capability status (TM-REQ-144), redefined 2 Nov 2026 (owner): the card answers ONE question: "is the software's own build complete?"
// It does not depend on whether any data was typed. Whether THIS phone holds demo or real data is a separate line (src/modules/dataStatus.ts).
//
// Build pipeline, six boxes per module (BuildBox): input form, storage, calculation or rule, output screens, export/backup, links to dependent screens.
// Each box is built (B), missing (M) or not needed (-). The label is computed from the boxes, never typed by hand:
//   complete = no box missing · partial = some box missing (the boxes are listed by name) · not-built = nothing user-reachable ·
//   blocked  = waits for an owner approval (a D-number), whatever else is missing.
// tests/m_list_status.test.ts checks every claim against routes, exported functions and tests; tests/field_reach.test.ts checks fields.
import type { Bi } from "../i18n/registry";

export const BUILD_BOXES = ["input", "store", "calc", "output", "export", "links"] as const;
export type BuildBox = (typeof BUILD_BOXES)[number];
export type BoxState = "built" | "missing" | "na";
export const BOX_STATES: readonly BoxState[] = ["built", "missing", "na"];
export type BuildLabel = "complete" | "partial" | "not-built" | "blocked";
/** Small facts about a module. They are not statuses. */
export type CapAttr = "offline" | "tap-internet" | "private";
export const CAP_ATTRS: readonly CapAttr[] = ["offline", "tap-internet", "private"];

export interface ModuleDef {
  id: string; name: Bi; tab: "journey" | "diary" | "deen" | "more";
  build: Record<BuildBox, BoxState>; attrs: CapAttr[];
  /** An owner approval this module waits for (D-C, D-D ...). Set only when that approval is the blocker. */
  blockedBy: string | null;
  note: Bi; missing: Bi; gate: string;
}

const CODE: Record<string, BoxState> = { B: "built", M: "missing", "-": "na" };
const boxes = (s: string): Record<BuildBox, BoxState> => {
  if (s.length !== BUILD_BOXES.length) throw new Error(`need ${BUILD_BOXES.length} box letters, got ${s}`);
  return Object.fromEntries(BUILD_BOXES.map((b, i) => [b, CODE[s[i]!]!])) as Record<BuildBox, BoxState>;
};

export const missingBoxes = (m: Pick<ModuleDef, "build">): BuildBox[] => BUILD_BOXES.filter((b) => m.build[b] === "missing");
export const builtBoxes = (m: Pick<ModuleDef, "build">): BuildBox[] => BUILD_BOXES.filter((b) => m.build[b] === "built");
export function buildLabel(m: Pick<ModuleDef, "build" | "blockedBy">): BuildLabel {
  if (m.blockedBy) return "blocked";
  const miss = missingBoxes(m).length;
  if (miss === 0) return "complete";
  return builtBoxes(m).length === 0 ? "not-built" : "partial";
}

const m = (id: string, bn: string, en: string, tab: ModuleDef["tab"], b: string, attrs: CapAttr[], blockedBy: string | null, gate: string, nbn: string, nen: string, mbn: string, men: string): ModuleDef =>
  ({ id, name: { bn, en }, tab, build: boxes(b), attrs, blockedBy, gate, note: { bn: nbn, en: nen }, missing: { bn: mbn, en: men } });

export const MODULES: ModuleDef[] = [
  m("M01", "Profile ও সম্মতি", "Profile & consent", "diary", "BBBMBB", [], null, "G1",
    "ধাপে ধাপে ডেটা লেখা, সম্মতি টিক, সেভ ও আবার শুরু করা পুরোটা তৈরি।", "Step-by-step entry, consent tick, save and resume are all built.",
    "আউটপুট: নাম, জন্মসাল ও টাইম জোন সেভ হয়, কিন্তু কোনো স্ক্রিন বা হিসাব সেগুলো পড়ে না।", "Output: name, birth year and time zone are saved, but no screen or calculation reads them."),
  m("M02", "নিজেকে চেনা (মূল্যায়ন)", "Discover (assessment)", "journey", "MBBMBB", ["offline", "private"], null, "G3",
    "আগ্রহ, শক্তি, মূল্যবোধ ও স্কিল লিখে প্ল্যান পাতায় মিলিয়ে কার্ড দেখা যায়।", "Enter interests, strengths, values and skills; the Plan screen shows matching cards.",
    "ইনপুট: অভিজ্ঞতা, রিস্কের ধরন ও শেখার ধরনের প্রশ্ন নেই। আউটপুট: স্কিলের উদাহরণ ও হাতের সম্পদ এখন প্ল্যান পাতায় দেখায়; মূল্যবোধ ও সীমাবদ্ধতার ধরন পথের কার্ডে বা ফাঁকের ছবিতে ব্যবহার হয় না।", "Input: no questions on experience, risk preference or learning style. Output: skill examples and resources now show on the Plan screen; values and constraint kind are not used in path cards or a gap view."),
  m("M03", "মূল লক্ষ্য ও ধাপ-সিঁড়ি", "North Star & ladder", "journey", "BBBBBB", ["offline"], null, "G3",
    "মূল মাপকাঠি লিখুন (শুরু, এখন ও টার্গেট)। ‘এখন’ সংখ্যা নিজে লেখা যায়, অথবা টাকার পাতার নেট ওয়ার্থ বা উদ্যোগের মূল্য ও অংশ থেকে আসে। শুরু থেকে টার্গেট পর্যন্ত ধাপ ও কত ধাপ পার হলেন দেখা যায়। একাধিক মাপকাঠিতে নিজের ওজন দিলে মোট প্রোগ্রেস হিসাব হয় (সবগুলোর সংখ্যা থাকলে)। যাত্রা, আজকের পাতা ও রিপোর্টে দেখা যায়; লক্ষ্য মেয়াদ অনুযায়ী সাজানো। না জানলে ফাঁকা, 0 ধরা হয় না।",
    "Write North Star measures (start, now and target). The ‘now’ number is typed, or taken from net worth on the Money screen or from the value or your share of the ventures. See the steps from start to target and how many you passed. With several measures, your own weights give one overall progress (when every measure has its figure). Shown on Journey, Today and the report; goals are grouped by time horizon. Unknown stays blank, never 0.",
    "", ""),
  m("M04", "পথ ও সুযোগ-লাইব্রেরি", "Paths & opportunity library", "journey", "BBBBBB", ["offline"], null, "G3",
    "প্ল্যান পাতায় স্কিল, আগ্রহ ও শক্তি মিলিয়ে পথের কার্ড আসে। প্রতিটি কার্ডে কেন মিলল, মেলার জোর, প্রতিটি কারণের ওজন, সোর্স ও লেখার তারিখ (180 দিনের বেশি পুরোনো হলে ‘আবার দেখুন’ চিহ্ন) এবং হালাল-চেকের প্রশ্নের লিংক আছে। স্কিল, আগ্রহ ও শক্তির ওজন আপনি বদলাতে ও আবার অ্যাপের নিজের ওজনে ফেরাতে পারেন। আপনার নিজের উদ্যোগ আলাদা অপশন হিসেবে দেখায়, ক্রম বা নম্বর ছাড়া। লাইব্রেরিতে এখন 10টি খসড়া পথ আছে; আরও পথ লেখা কনটেন্টের কাজ, যাচাইয়ের লোক লাগবে।",
    "Path cards on the Plan screen match your skills, interests and strengths. Each card shows why it matched, the match strength, the weight of each reason, a source and the day it was written (an entry older than 180 days is flagged to check again), and a link to the halal-check questions. You can change the weights of a skill, an interest and a strength and go back to the built-in ones. Your own venture shows as a separate option, unranked and unscored. The library holds 10 draft paths; writing more is content work that needs a reviewer.",
    "", ""),
  m("M05", "স্টেজ ও যাত্রা-লগ", "Stages & journey log", "journey", "BBBBBB", ["offline"], null, "G3",
    "স্টেজের সিঁড়ি, স্টেজ পাস ও যাত্রা-লগ চলে। স্টেজ B থেকে H প্রতিটির জন্য নিজের নিয়ম লেখা যায়: শুরুর শর্ত, মাপা-যায় এমন বের-শর্ত (টাকার পাতা, উদ্যোগ, হস্তান্তর, কাজ ও ফোকাস থেকে সংখ্যা নেয়, বা নিজের সংখ্যা), রিভিউয়ের তারিখ ও থামার নিয়ম। সব বের-শর্ত পূরণ না হলে স্টেজ পাস হয় না; সংখ্যা না থাকলে ‘জানা নেই’, 0 নয়। স্টেজ পাতা, আজকের পাতা ও রিপোর্টে দেখা যায়।",
    "The stage ladder, stage pass and journey log work. For each Stage B to H you can write your own rules: an entry condition, measurable exit conditions (a number read from Money, ventures, hand-overs, tasks and focus, or your own number), a review date and a pause rule. A stage cannot be passed until every exit condition is reached; with no number it shows Unknown, never 0. Shown on the stage page, Today and the report.",
    "", ""),
  m("M06", "লক্ষ্য, কাজ ও অভ্যাস", "Goals, tasks & habits", "journey", "BBBBBB", ["offline"], null, "G3",
    "লক্ষ্য, উপ-লক্ষ্য ও প্রজেক্টের গাছ: নাম, স্তর, কোনটির অংশ, কী দিয়ে মাপা হয়, তারিখ। প্রতিটি শাখার প্রোগ্রেস তার সব কাজ ধরে গোনা হয় (কাজ না থাকলে ‘জানা নেই’)। কাজ লেখা ও পরে বদলানো, কাজ আরেকটির পরে রাখা, আজকের কাজ, ফোকাস টাইমার, অভ্যাস (সপ্তাহে কত দিন সহ), ফ্ল্যাশকার্ড, SMART ও SWOT।",
    "A tree of goals, sub-goals and projects: name, level, what it is part of, how it is measured, date. Each branch's progress is counted from all its steps (Unknown when it has none). Write and later change a step, put a step after another, today's tasks, focus timer, habits (with days a week), flashcards, SMART and SWOT.",
    "", ""),
  m("M07", "সম্পদ ও অর্থ", "Resources & finance", "diary", "BBBBBB", ["offline", "private"], null, "G3",
    "ইনকাম, খরচ, সম্পদ ও দায় লিখে নিট ওয়ার্থ, মাসের ক্যাশ ফ্লো, রানওয়ে ও ৯০ দিনের ক্যাশ ফ্লো দেখা যায় (BDT)। লাইন মাসিক, বার্ষিক (মাসে বারো ভাগের এক ভাগ ধরা) বা একবারের (তারিখ দিলে ৯০ দিনের হিসাবে আসে) হতে পারে। অন্য মুদ্রায় লিখলে আপনার নিজের দেওয়া রেটে টাকায় বদলায়; রেট না দিলে ‘জানা নেই’, 0 নয়, আর অ্যাপ নিজে কোনো রেট আনে না। লাইন উদ্যোগের সাথে জোড়া যায়। না জানা হলে ‘জানা নেই’ দেখায়। যাকাতের হিসাব দ্বীন অংশের (M13) ও ইউনিট ইকোনমিক্স নথিতে ফিল্ড-তালিকায় নেই, তাই এখানে বানানো হয়নি।",
    "Enter income, spending, assets and liabilities to see net worth, monthly cash flow, runway and 90-day cash flow (BDT). A line can be monthly, yearly (counted as one twelfth a month) or one-off (added to the 90-day figure when it has a date). An amount in another currency is converted with the rate you type; with no rate it is Unknown, never 0, and the app never fetches a rate. A line can be tied to a venture. Unknown stays unknown. A zakat figure belongs to the Deen module (M13) and unit economics is not in the documents' field list, so neither is part of this module.",
    "", ""),
  m("M08", "সময় ও সক্ষমতা", "Time & capacity", "diary", "BBBBBB", ["offline"], null, "G3",
    "ফ্রি সময় লিখলে আজকের ও সপ্তাহের কাজের সূচি তৈরি হয়; জায়গা না হলে কারণসহ দেখায়। বরাদ্দ সময় (নামাজ, পরিবার, বিশ্রাম, কাজ) যোগ করা যায়: নামাজের সময় ফোনেই হিসাব হয় এবং প্রতি নামাজে কত মিনিট ফাঁকা রাখবেন তা আপনি লেখেন (অ্যাপ নিজে ধরে না); অন্য ধরনে প্রতিদিনের শুরু-শেষ সময়। কোনো কাজ এই ব্লকে বসে না। সপ্তাহে ঘণ্টার যোগফল ফ্রি ঘণ্টার সাথে মিলিয়ে দেখা যায় (না জানলে ‘জানা নেই’)। প্ল্যান পাতা ও আজকের পাতায় দেখা যায়। দিনের কোন সময়ে এনার্জি বেশি, তার কোনো ফিল্ড নথির তালিকায় নেই, তাই তা মডেল করা হয়নি।",
    "Enter your free time and the day and week schedule is built; steps that do not fit are listed with a reason. You can add committed time (prayer, family, rest, work): prayer times are worked out on this phone and you type how many minutes to keep free at each prayer (the app assumes none); other kinds take a daily start and end. No task is placed in a block. The weekly hours add up and are set beside your free hours (Unknown when not written). Shown on the Plan screen and Today. Energy by time of day has no field in the documents, so it is not modelled.",
    "", ""),
  m("M09", "উদ্যোগের পোর্টফোলিও", "Venture portfolio", "journey", "BBMBBB", ["offline", "private"], null, "G3",
    "যেকোনো সংখ্যক উদ্যোগ বা সম্পদ: নাম, অবস্থা, মালিকানা, আনুমানিক মূল্য, মূল্যে আপনার অংশ, আর উদ্যোগের নিজের মাসিক ইনকাম ও খরচ। সব উদ্যোগের মোট দেখা যায় (প্রতিটির সংখ্যা থাকলে), টাকার পাতায়, আজকের পাতায় ও রিপোর্টে। না জানলে ফাঁকা, 0 ধরা হয় না।",
    "Any number of ventures or assets: name, stage, ownership, estimated value, your share of it, and the venture's own monthly income and expenses. A total across ventures (when each has its figure) shows on the Money screen, Today and the report. Unknown stays blank, never 0.",
    "হিসাব: ইউনিট ইকোনমিক্স (প্রতি ইউনিটের দাম ও খরচ) নেই।", "Calculation: unit economics (price and cost per unit) is not built."),
  m("M10", "টিম ও দায়িত্ব বণ্টন", "Team & delegation", "diary", "BBBBBB", ["offline", "private"], null, "G3",
    "কাজের রোল লেখা, কে দেখছেন বদলানো, কাজ রোলের সাথে জোড়া, হস্তান্তরের প্ল্যান ও ‘হয়েছে’ চিহ্ন (রোল ‘অন্য কেউ’ হয়, খোলা কাজ আপনার শিডিউল থেকে সরে কিন্তু লক্ষ্যের প্রোগ্রেসে থাকে), কেউ না থাকলে ‘লোক খোঁজা’ কাজ যোগ, আর ফাঁকের হিসাব (কোন রোল ফাঁকা অথচ কাজ অপেক্ষায়, নিজের রোলের কাজের জানা সময় বনাম ফ্রি সময়)। আজকের পাতা ও রিপোর্টে দেখা যায়। নাম লেখা হয় না। না জানলে ফাঁকা, 0 ধরা হয় না।",
    "Write work roles, change who covers each one, tie steps to roles, plan a hand-over and mark it done (the role becomes ‘Someone else’; its open steps leave your schedule but still count toward the goal's progress), add a ‘find someone’ step when nobody covers a role, and see the gap analysis (which role is uncovered while steps wait; known estimates of your own roles against your free time). Shown on Today and the report. No names are stored. Unknown stays blank, never 0.",
    "", ""),
  m("M11", "গবেষণা ও অপশন", "Research & options", "more", "BBBBBB", ["tap-internet", "private"], null, "G4",
    "ইনপুট ঘরের 'Suggest options' বাটনে চাপলে Wikipedia থেকে 2-3টি অপশন আসে। প্রথম খোঁজের ফল ফোনে সেভ করা থাকে। অ্যাপ খোলার সময় কোনো খোঁজ যায় না।", "Tap 'Suggest options' in an input to get 2-3 Wikipedia options. The first search is saved on this phone. No search runs when the app opens.",
    "", ""),
  m("M12", "বাস্তবতা বদল ও প্ল্যানের ইতিহাস", "Reality-changed & plan history", "journey", "BBBBBB", ["offline"], null, "G3",
    "ঘটনা লেখা (ইনকাম বা খরচ বদল, সময় কমা, নতুন দায়িত্ব, ধাক্কা, সুযোগ, বাজার, অসুস্থতা), নিয়মে প্রভাব দেখা (কাজ, লক্ষ্য, তারিখ, টাকা, রিস্ক, কোন ধারণা আর ঠিক নয়), সর্বোচ্চ তিনটি অপশন (তারিখ সরানো, কাজ কমানো, পথ বদলানো, বিরতি), পুরোনো ও নতুন প্ল্যান পাশাপাশি, অনুমোদন, প্ল্যানের ভার্সন, সিদ্ধান্ত-লগ, আর ধীরে ফেরা। পুরোনো ভার্সন কখনো ডিলিট বা বদল হয় না। কাজকে ‘আর সত্য নয়’ বলাও চলে।",
    "Write an event (income or spending change, less time, new duty, setback, opportunity, market, illness); see what it touches by fixed rules (steps, goals, dates, money, risks, which assumption no longer holds); up to three options (move dates, reduce scope, change path, pause); old and new plan side by side; approval; saved plan versions; a decision log; and Resume gently. An old version is never deleted or overwritten. A step can still be marked 'no longer true'.",
    "", ""),
  m("M13", "দ্বীন, ইবাদত ও আখিরাত", "Deen, ibadah & akhirah", "deen", "MBMMBB", ["offline", "private"], null, "G3",
    "নামাজ ও রোজার চিহ্ন, নামাজের সময় (এই ফোনে হিসাব), রিমাইন্ডার ও হালাল-চেকের প্রশ্ন আছে। নম্বর বা ক্রম দেখানো হয় না।", "Prayer and fasting marks, prayer times (worked out on this phone), reminders and halal-check questions. Nothing is totalled or ranked.",
    "ইনপুট: কুরআন, যাকাত, দান, হজ, দ্বীনি শিক্ষা ও হকের ফর্ম নেই। হিসাব: যাকাতের হিসাব, হিজরি তারিখ নেই। আউটপুট: নামাজের নোট দেখায় না। ধর্মীয় পাঠ্য অপেক্ষায় (D-D)।", "Input: no forms for Quran, zakat, giving, hajj, Deen learning or rights. Calculation: no zakat figure, no Hijri date. Output: the prayer note is not shown. Scripture text waits for D-D."),
  m("M14", "স্বাস্থ্য ও পরিবার", "Health & family", "diary", "MMMMMM", ["private"], null, "G3",
    "স্বাস্থ্য-নোটের ঘরের বিবরণ আছে; লেখার জায়গা বা দেখানোর স্ক্রিন নেই।", "A health-note field is defined; there is no place to write it and no screen that shows it.",
    "পুরোটা: স্বাস্থ্য ও পরিবারের নিজস্ব ইনপুট, সেভ, রুটিন/লক্ষ্যের লিংক ও ব্যক্তিগত স্ক্রিন তৈরি হয়নি।", "Everything: own input, storage, routine/goal link and private screen for health and family are not built."),
  m("M15", "রিস্ক ও থামার শর্ত", "Risk & stop criteria", "journey", "BBBBBB", ["offline"], null, "G3",
    "রিস্ক লিখে রিভিউয়ের তারিখ ও থামার শর্ত রাখা যায়। তারিখ এলে রিস্কটি আজকের পাতা, রিপোর্ট ও রিস্কের পাতায় শান্তভাবে দেখায় এবং থামার শর্তটি আপনাকে ফেরত দেখিয়ে জিজ্ঞেস করে ঘটেছে কি না। ‘এখনো না’ বললে পরের রিভিউয়ের তারিখ বসে; ‘ঘটেছে’ বললে ‘বাস্তবতা বদলালে’ পাতায় একটি ঘটনা তৈরি হয়। থামার শর্ত না থাকলে গোনা হয়। তারিখ না থাকলে কোনো ট্রিগার নেই।",
    "Write a risk with a review date and a stop rule. When the date comes, the risk shows calmly on Today, the report and the risk page, the app shows your stop rule back and asks whether it has happened. If you say it has not happened, the next review date is set; ‘It has happened’ starts an event on the reality-changed page. Risks without a stop rule are counted. With no date there is no trigger.",
    "", ""),
  m("M16", "রিভিউ ও KPI", "Reviews & KPIs", "journey", "BBBBBB", ["offline"], null, "G3",
    "সাপ্তাহিক (৭ দিন), মাসিক (৩০ দিন) ও ৯০ দিনের রিভিউ এবং রিপোর্ট পাতা আছে। KPI টার্গেট নিজের রেকর্ডের পাশে দেখা যায়। তিনটি রিভিউতেই আপনার লেখা মাসিক টাকার অঙ্ক ও নজরে রাখার রিস্ক আসে (না জানলে ‘জানা নেই’, 0 নয়)। মাসিক রিভিউতে ধারণা যাচাই: ফ্রি সময়, মাসিক ইনকাম ও খরচ ‘এখনো ঠিক’ না ‘বদলে গেছে’ আপনি বলেন; বদলালে বাস্তবতা-বদলের ঘটনা শুরু হয়।",
    "Weekly (7 days), monthly (30 days) and 90-day reviews and the report screen exist. KPI targets show beside your own records. All three reviews show your monthly money figures and the risks to keep in view (Unknown when not known, never 0). The monthly review has an assumptions check: you say whether free time, monthly income and spending are still true; if one changed, a reality-changed event starts.",
    "", ""),
  m("M17", "জ্ঞান ও সূত্র", "Knowledge & sources", "more", "BBBBBB", ["offline"], null, "G4",
    "২১টি বিষয়-গাইড, ফ্ল্যাশকার্ড (বাক্স ও দিন অনুযায়ী) ও শব্দকোষ চলে। নোট, সোর্স ও SOP পাতায় নিজের সোর্স (নাম, ধরন, রেফারেন্স, শেষ দেখার তারিখ; 180 দিনের বেশি পুরোনো হলে ‘আবার দেখুন’), সোর্স ও লক্ষ্যের সাথে জোড়া নোট, আর রোলের জন্য ধাপে ধাপে SOP লেখা যায়। SOP টিম পাতার রোলে ও হস্তান্তর PDF-এ আসে। অ্যাপ কোনো রেফারেন্স খোলে বা আনে না।",
    "21 topic guides, flashcards (boxes and due days) and a glossary work. On the Notes, sources and SOPs page you write your own sources (name, kind, reference, last-checked day; older than 180 days is flagged to check again), notes tied to a source and a goal, and step-by-step SOPs for a role. SOPs show on the role on the Team page and in the hand-over PDF. The app never opens or fetches a reference.",
    "", ""),
  m("M18", "ভিজ্যুয়াল স্তর", "Visual layer", "more", "--BM-B", ["offline"], null, "G3",
    "স্টেজের সিঁড়ি, যাত্রার ছবি, টাকার বার, লক্ষ্যের রিং, অভ্যাসের গ্রিড ও অন্যান্য চার্ট আছে; প্রতিটির লেখা অপশন আছে।", "Stage ladder, journey art, money bars, goal rings, habit grid and other charts exist, each with a text version.",
    "আউটপুট: টাইমলাইন, Kanban, রিসোর্স ম্যাপ ও অপশন বোর্ড নেই। লক্ষ্যের গাছ লেখা ও বারসহ তালিকা আকারে আছে, ছবি আকারে নয়।", "Output: no timeline, Kanban, resource map or option board. The goal tree exists as a written list with bars, not as a drawing."),
  m("M19", "অটোমেশন নিয়ম", "Automation rules", "more", "BBBBBB", ["offline"], null, "G6",
    "চারটি ছোট নিয়ম ফোনেই চলে (ডিফল্টে বন্ধ)। কোনো নোটিফিকেশন যায় না, নিয়ম নিজে কাজ যোগ করে না।", "Four small rules run on this phone (off by default). No notifications are sent and a rule never adds a task.",
    "", ""),
  m("M20", "Sync, Backup ও export", "Sync, backup & export", "more", "BBBBBB", ["offline", "private"], null, "G2",
    "ব্যাকআপ সেভ ও ফেরত আনা, এনক্রিপ্টেড ব্যাকআপ, CSV export ও import, সাপ্তাহিক রিমাইন্ডার, আর রিপোর্ট, প্ল্যান ও হস্তান্তর PDF হিসেবে সেভ (ফোনের প্রিন্ট উইন্ডো দিয়ে, নেটওয়ার্ক ছাড়া) চলে। ক্লাউড সিঙ্ক বন্ধ রাখা হয়েছে; তা চালু করতে মালিকের অনুমতি (D-C) লাগবে, তাই এই কার্ডে ধরা হয়নি।",
    "Backup save and restore, encrypted backup, CSV export and import, the weekly reminder, and the report, plan and hand-over saved as PDF (through the phone's print window, no network) all work. Cloud sync is switched off and needs your approval (D-C), so it is outside this card.",
    "", ""),
  m("M21", "নিরাপত্তা ও প্রাইভেসি", "Security & privacy", "more", "BMBBBB", ["offline", "private"], null, "G7",
    "গোপন তথ্য (পাসওয়ার্ড, OTP ইত্যাদি) লিখতে দেয় না। ঐচ্ছিক PIN লক আছে। লক-স্ক্রিন গোপন থাকে।", "Blocks secrets (passwords, OTP and similar). Optional PIN lock. The lock screen stays private.",
    "সেভ: ডিভাইসে ডেটা এনক্রিপ্ট করা নেই (PIN শুধু পর্দা ঢাকে)। আইনি রিভিউ G7-এ।", "Storage: data on the device is not encrypted (the PIN only covers the screen). Legal review is at G7."),
  m("M22", "সক্ষমতার অবস্থা ও Demo", "Capability status & demo", "more", "--BB-B", ["offline"], null, "G1",
    "এই স্ক্রিন: প্রতিটি মডিউলের বানানো অবস্থা ছয় ধাপে ও এই ফোনের ডেটা অবস্থা আলাদা দেখায়।", "This screen: shows each module's build state in six boxes and this phone's data state separately.",
    "", ""),
  m("M23", "AI স্তর", "AI layer", "more", "--MM--", ["private"], "D-C", "G6",
    "AI পোর্ট ও 'সংযুক্ত নয়' অ্যাডাপ্টার তৈরি আছে। AI ছাড়াই সব চলে।", "The AI port and a 'not connected' adapter exist. Everything works without AI.",
    "মালিকের অনুমতি (D-C: খরচ, প্রোভাইডার, সীমা) পেলে তবে বাকিটা তৈরি হবে।", "The rest is built only after your approval (D-C: cost, provider, cap)."),
  m("M24", "template লাইব্রেরি", "Template library", "more", "BBBBBB", ["offline"], null, "G3",
    "ছয়টি তৈরি সিস্টেম (এক ট্যাপে লক্ষ্য, কাজ ও অভ্যাস যোগ, আবার সরানো), তিনটি স্টেজ-নামের সেট।", "Six ready systems (one tap adds goals, tasks and habits; remove takes them out) and three stage-name sets.",
    "", ""),
  m("M25", "আটকে গেলে", "When stuck", "journey", "BBBBBB", ["offline"], null, "G3",
    "৬টি ট্যাপে সম্ভাব্য কারণ ও ছোট সাহায্য; AI ছাড়া।", "Six taps lead to likely causes and small helpers; no AI.",
    "", ""),
];
