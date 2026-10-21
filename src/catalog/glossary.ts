// Bangla glossary & term help (TM-REQ-161). Reviewer sign-off is a HUMAN gate: `reviewed` stays false until a qualified reviewer signs.
import type { Bi } from "../i18n/registry";

export type GlossaryDomain = "finance" | "islamic" | "business";
export interface Term { id: string; domain: GlossaryDomain; term: Bi; meaning: Bi; reviewed: false }

const g = (id: string, domain: GlossaryDomain, tb: string, te: string, mb: string, me: string): Term =>
  ({ id, domain, term: { bn: tb, en: te }, meaning: { bn: mb, en: me }, reviewed: false });

export const GLOSSARY: Term[] = [
  g("net_worth", "finance", "নিট সম্পদ", "Net worth", "মোট সম্পদ থেকে মোট দায় বাদ দিলে যা থাকে।", "Everything you own minus everything you owe."),
  g("asset", "finance", "সম্পদ", "Asset", "যা আপনার মালিকানায় আছে এবং মূল্য আছে।", "Something you own that has value."),
  g("liability", "finance", "দায়", "Liability", "যা আপনাকে অন্যকে দিতে হবে।", "Something you owe to others."),
  g("income", "finance", "আয়", "Income", "নিয়মিত বা এককালীন আসা টাকা।", "Money coming in, regular or one-off."),
  g("expense", "finance", "খরচ", "Expense", "যে টাকা বেরিয়ে যায়।", "Money going out."),
  g("cash_flow", "finance", "নগদ প্রবাহ", "Cash flow", "একটি সময়ে হাতে আসা ও বেরিয়ে যাওয়া নগদের হিসাব।", "Cash in versus cash out over a period."),
  g("runway", "finance", "রানওয়ে", "Runway", "বর্তমান নগদে আর কত মাস চলা যাবে।", "How many months current cash lasts."),
  g("budget", "finance", "বাজেট", "Budget", "আয়-খরচের আগাম পরিকল্পনা; ছাঁচ বাধ্যতামূলক নয়।", "A plan for income and spending; templates are optional."),
  g("savings", "finance", "সঞ্চয়", "Savings", "ভবিষ্যতের জন্য আলাদা করে রাখা টাকা।", "Money set aside for later."),
  g("working_capital", "business", "চলতি মূলধন", "Working capital", "প্রতিদিনের ব্যবসা চালাতে দরকারি নগদ।", "Cash needed to run day-to-day operations."),
  g("venture", "business", "উদ্যোগ", "Venture", "যেকোনো ব্যবসা বা প্রকল্প, ধরন নির্বিশেষে।", "Any business or project, of any type."),
  g("equity", "business", "মালিকানা-অংশ", "Equity", "উদ্যোগে আপনার মালিকানার অংশ।", "Your ownership share in a venture."),
  g("valuation", "business", "মূল্যায়ন", "Valuation", "উদ্যোগটির আনুমানিক মূল্য; এটি অনুমান।", "An estimate of what a venture is worth."),
  g("revenue", "business", "রাজস্ব", "Revenue", "বিক্রি থেকে মোট আসা টাকা, খরচ বাদ দেওয়ার আগে।", "Total sales income before costs."),
  g("profit", "business", "মুনাফা", "Profit", "রাজস্ব থেকে খরচ বাদ দিলে যা থাকে।", "Revenue minus costs."),
  g("unit_economics", "business", "ইউনিট অর্থনীতি", "Unit economics", "এক একক বিক্রিতে কত আয় ও কত খরচ।", "Income and cost for one unit sold."),
  g("stage_gate", "business", "স্টেজ-গেট", "Stage-gate", "পরের ধাপে যাওয়ার আগে পূরণ করার পরিমাপযোগ্য শর্ত।", "A measurable condition to meet before the next stage."),
  g("salah", "islamic", "নামাজ (সালাত)", "Prayer (salah)", "দৈনিক পাঁচ ওয়াক্ত ইবাদত।", "The five daily prayers."),
  g("sawm", "islamic", "রোজা (সওম)", "Fasting (sawm)", "নির্ধারিত সময়ে পানাহার থেকে বিরত থাকা।", "Abstaining from food and drink during set times."),
  g("zakat", "islamic", "যাকাত", "Zakat", "নির্দিষ্ট সম্পদের ওপর ফরজ দান; হিসাবের নিয়ম যাচাই করে পরে যোগ হবে।", "Obligatory giving on qualifying wealth; rules are added after verification."),
  g("sadaqah", "islamic", "সদকা", "Sadaqah", "স্বেচ্ছায় দান।", "Voluntary charity."),
  g("fitrah", "islamic", "ফিতরা", "Fitrah", "ঈদুল ফিতরের আগে দেয় নির্ধারিত দান।", "Charity given before Eid al-Fitr."),
  g("qurbani", "islamic", "কুরবানি", "Qurbani", "ঈদুল আজহায় পশু উৎসর্গ।", "Animal sacrifice at Eid al-Adha."),
  g("hajj", "islamic", "হজ", "Hajj", "সামর্থ্যবানদের জন্য মক্কায় ফরজ তীর্থযাত্রা।", "The obligatory pilgrimage to Makkah for those able."),
  g("umrah", "islamic", "উমরাহ", "Umrah", "যেকোনো সময় করা যায় এমন ছোট তীর্থযাত্রা।", "The lesser pilgrimage, performed at any time."),
  g("halal", "islamic", "হালাল", "Halal", "ইসলামে বৈধ; টুল রায় দেয় না, যাচাইয়ের পথ দেখায়।", "Permissible in Islam; the tool gives no rulings, only a way to verify."),
  g("riba", "islamic", "সুদ (রিবা)", "Interest (riba)", "ঋণের ওপর অতিরিক্ত নেওয়া; নিষিদ্ধ বলে চিহ্নিত হয়।", "Excess charged on loans; flagged as prohibited."),
  g("gharar", "islamic", "গারার", "Gharar", "অতিরিক্ত অনিশ্চয়তাপূর্ণ লেনদেন।", "Excessive uncertainty in a transaction."),
  g("akhirah", "islamic", "আখিরাত", "Akhirah", "পরকাল; জীবনের লক্ষ্যের অংশ, কোনো পরিমাপের বিষয় নয়।", "The hereafter; part of life goals, never a measure to chase."),
  g("ibadah", "islamic", "ইবাদত", "Ibadah", "আল্লাহর উদ্দেশ্যে করা উপাসনা ও কাজ; ব্যক্তিগত।", "Worship and acts done for Allah; private."),
];
