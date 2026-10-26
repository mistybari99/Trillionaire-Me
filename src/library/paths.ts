// O5: path & opportunity library (Spec §3.3, M04). Neutral, generic paths; each one is a practice-based DRAFT shown as "যাচাই হয়নি".
// No income, return or success figures here: every path is a set of plain steps. Themes connect user answers to paths.
import type { Bi } from "../i18n/registry";

export type Theme = "creative" | "tech" | "people" | "numbers" | "trade" | "making" | "organising" | "language" | "learning";

export const THEME_LABEL: Record<Theme, Bi> = {
  creative: { bn: "সৃজনশীল কাজ", en: "Creative work" },
  tech: { bn: "প্রযুক্তি", en: "Technology" },
  people: { bn: "মানুষের সঙ্গে কাজ", en: "Working with people" },
  numbers: { bn: "হিসাব ও সংখ্যা", en: "Numbers & accounts" },
  trade: { bn: "কেনাবেচা", en: "Buying & selling" },
  making: { bn: "হাতে বানানো", en: "Making things" },
  organising: { bn: "পরিকল্পনা ও গোছানো", en: "Planning & organising" },
  language: { bn: "ভাষা ও লেখা", en: "Language" },
  learning: { bn: "শেখা ও পড়াশোনা", en: "Learning & study" },
};

/** Keywords (Bangla and English) that show a theme in free text. English keys match at the start of a word; Bangla keys match as part of a word. */
export const THEME_KEYWORDS: Record<Theme, string[]> = {
  creative: ["draw", "paint", "art", "design", "photo", "music", "sing", "writ", "story", "video", "film", "creative", "ছবি", "আঁক", "নকশা", "ডিজাইন", "লেখা", "লিখ", "গান", "ভিডিও", "ফটো", "সৃজন"],
  tech: ["computer", "code", "coding", "program", "software", "web", "mobile app", "কম্পিউটার", "কোড", "প্রোগ্রাম", "ওয়েব", "অ্যাপ", "তথ্যপ্রযুক্তি"],
  people: ["people", "teach", "tutor", "custom", "support", "mentor", "help", "team", "মানুষ", "পড়ান", "শেখান", "সহায়তা", "কাস্টমার", "সেবা"],
  numbers: ["account", "bookkeep", "excel", "math", "financ", "money", "budget", "ledger", "হিসাব", "হিসেব", "অঙ্ক", "টাকা", "খাতা", "বাজেট"],
  trade: ["trade", "shop", "business", "buy", "sell", "sale", "retail", "ব্যবসা", "দোকান", "কেনাবেচা", "বিক্রি", "কেনা"],
  making: ["craft", "sew", "tailor", "cook", "bak", "food", "farm", "garden", "repair", "handmade", "build", "হাতের কাজ", "সেলাই", "রান্না", "খাবার", "কৃষি", "বাগান", "তৈরি", "মেরামত"],
  organising: ["plan", "organi", "event", "schedul", "logist", "manag", "সংগঠন", "গোছ", "পরিকল্পনা", "অনুষ্ঠান", "ইভেন্ট"],
  language: ["english", "translat", "languag", "ভাষা", "অনুবাদ", "ইংরেজি"],
  learning: ["study", "research", "reading", "learn", "science", "পড়াশোনা", "গবেষণা", "পড়ার", "শিখ"],
};

export interface PathEntry {
  id: string;
  name: Bi;
  summary: Bi;
  themes: Theme[];
  /** What it needs, in plain words. */
  needs: Bi;
  /** One small step to test it before any spending. */
  firstTest: Bi;
  /** Optional check before starting (legal, privacy, halal-sensitive matters). Neutral wording. */
  caution?: Bi;
}

const P = (id: string, name: Bi, summary: Bi, themes: Theme[], needs: Bi, firstTest: Bi, caution?: Bi): PathEntry =>
  ({ id, name, summary, themes, needs, firstTest, caution });

export const PATHS: PathEntry[] = [
  P("design-freelance", { bn: "নকশা ও ছবির কাজ", en: "Design and visual work" },
    { bn: "ছোট ব্যবসার জন্য নকশা ও ছবির কাজ, প্রতি প্রকল্প হিসাবে।", en: "Design and visual work for small businesses, sold per project." },
    ["creative", "tech"],
    { bn: "দেখানোর মতো একটি দক্ষতা, ফোন বা ল্যাপটপ, কয়েকটি নমুনা কাজ", en: "A visual skill you can show, a phone or laptop, a few sample works" },
    { bn: "৩টি নমুনা নকশা বানিয়ে ৩ জনকে দেখান। তারা কী বলল লিখে রাখুন।", en: "Make 3 sample designs and show them to 3 people. Write down what they say." }),
  P("bookkeeping", { bn: "হিসাব গোছানো", en: "Bookkeeping for small shops" },
    { bn: "ছোট দোকান বা পরিবারের হিসাব গুছিয়ে রাখা।", en: "Keeping accounts in order for small shops or households." },
    ["numbers", "organising"],
    { bn: "সংখ্যায় স্বাচ্ছন্দ্য, একটি সহজ খাতা, রেকর্ড ঠিক রাখার ধৈর্য", en: "Comfort with numbers, a simple ledger, patience with records" },
    { bn: "এক মাসের নিজের খরচ একটি সহজ খাতায় লিখে যোগফল করুন।", en: "Keep one month of your own spending in a simple ledger and total it." },
    { bn: "ক্লায়েন্টের টাকা ও রেকর্ড গোপন। ব্যাংকের পাসওয়ার্ড বা আইডি নম্বর অ্যাপে রাখবেন না।", en: "Client money and records are private. Never store bank passwords or ID numbers in the app." }),
  P("tutoring", { bn: "শিক্ষা সহায়তা (পড়ানো)", en: "Tutoring" },
    { bn: "একটি বিষয় এক-এক করে পড়ানো, সরাসরি বা অনলাইনে।", en: "Teaching a subject one-to-one, in person or online." },
    ["people", "language", "learning"],
    { bn: "একটি বিষয়ে জ্ঞান, সপ্তাহে একটি শান্ত সময়, শিক্ষার্থী খোঁজার উপায়", en: "Knowledge of a subject, a quiet hour each week, a way to meet learners" },
    { bn: "একজন বন্ধুকে ৩০ মিনিটের একটি ক্লাস নিয়ে উন্নতির ৩টি বিষয় চান।", en: "Teach one 30-minute lesson to one friend and ask for 3 things to improve." }),
  P("home-food", { bn: "বাসা থেকে খাবার", en: "Home food orders" },
    { bn: "বাসা থেকে ছোট অর্ডারে রান্না বা বেকিং।", en: "Cooking or baking for small orders from home." },
    ["making", "trade", "people"],
    { bn: "রান্নার দক্ষতা, পরিষ্কার রান্নাঘর, সহজ খরচের হিসাব", en: "Cooking skill, a clean kitchen, simple costing" },
    { bn: "৫ জন প্রতিবেশীর জন্য একটি খাবার বানিয়ে খরচ ও তাদের মতামত লিখুন।", en: "Cook one item for 5 neighbours, note the cost and what they say." },
    { bn: "খাবার বিক্রির নিয়ম ও লাইসেন্স এলাকা ভেদে আলাদা। আগে স্থানীয় নিয়ম দেখুন।", en: "Food sale rules and licences differ by area. Check local rules first." }),
  P("content-writing", { bn: "লেখার কাজ", en: "Content writing" },
    { bn: "অন্যের জন্য ছোট লেখা, ক্যাপশন বা ওয়েবের লেখা।", en: "Writing short articles, captions or web copy for others." },
    ["creative", "language"],
    { bn: "পরিষ্কার লেখা, কয়েকটি নমুনা, খোঁজার সময়", en: "Clear writing, a few samples, time to research" },
    { bn: "যে বিষয় জানেন তাতে ৫টি ছোট লেখা লিখে একটি পেজে রাখুন।", en: "Write 5 short pieces on one topic you know and post them on one page." }),
  P("simple-web", { bn: "সহজ ওয়েবসাইট", en: "Simple websites" },
    { bn: "স্থানীয় ব্যবসার জন্য সহজ ওয়েবসাইট বা এক পাতার পরিচিতি।", en: "Simple websites or one-page profiles for local businesses." },
    ["tech", "creative"],
    { bn: "কম্পিউটারের মূল জ্ঞান, একটি পেজ বানানোর টুল শেখার আগ্রহ, ল্যাপটপ", en: "Basic computer skill, willingness to learn a page builder, a laptop" },
    { bn: "নিজের বা বন্ধুর দোকানের এক পাতার পরিচিতি বানিয়ে ৩ জনকে দেখান।", en: "Make a one-page profile for yourself or a friend's shop and show it to 3 people." }),
  P("event-planning", { bn: "অনুষ্ঠান পরিকল্পনা", en: "Small event planning" },
    { bn: "পরিবার বা সমাজের ছোট অনুষ্ঠান পরিকল্পনা ও পরিচালনা।", en: "Planning and running small family or community events." },
    ["organising", "people"],
    { bn: "গোছানোর দক্ষতা, যোগাযোগের তালিকা, একটি বাজেট", en: "Organising skill, a list of contacts, a budget" },
    { bn: "একটি ছোট অনুষ্ঠানের পরিকল্পনা করুন: তারিখ, কাজের তালিকা, বাজেট, কে কী করবে।", en: "Plan one small gathering: date, task list, budget, and who does what." }),
  P("handcraft", { bn: "হাতের তৈরি পণ্য", en: "Handmade products" },
    { bn: "ছোট হাতের তৈরি পণ্য বানিয়ে বিক্রি।", en: "Making and selling small handmade items." },
    ["making", "creative", "trade"],
    { bn: "বানানোর দক্ষতা, উপকরণ, পণ্য দেখানোর উপায়", en: "A making skill, materials, a way to show products" },
    { bn: "৩টি নমুনা বানিয়ে উপকরণের খরচ ও সময় লিখুন। একটির দাম রেখে দেখুন কে জানতে চায়।", en: "Make 3 samples, note material cost and time, price one and see who asks." }),
  P("small-trade", { bn: "ছোট পণ্য কেনাবেচা", en: "Small trading" },
    { bn: "সতর্ক হিসাব রেখে ছোট পণ্য কেনাবেচা।", en: "Buying and selling small goods with careful records." },
    ["trade", "numbers"],
    { bn: "যে টাকা আছে তা দিয়ে শুরু, নির্ভরযোগ্য সরবরাহকারী, হিসাবের খাতা", en: "Starting money you already have, a reliable supplier, a records book" },
    { bn: "একটি পণ্য ২ সপ্তাহ লক্ষ করুন: কেনা দাম, বেচা দাম, কতটা বিক্রি হলো।", en: "Track one product for 2 weeks: buy price, sell price, how much sold." },
    { bn: "ধারে কেনার আগে শর্ত ও অতিরিক্ত চার্জ দেখুন। সুদভিত্তিক লেনদেন এড়িয়ে চলুন।", en: "Check credit terms and extra charges before you accept. Avoid interest-based deals." }),
  P("structured-learning", { bn: "নতুন দক্ষতা শেখা", en: "Structured learning" },
    { bn: "নতুন দক্ষতা ধাপে ধাপে শেখার ছোট পড়ার পরিকল্পনা।", en: "A short study plan to build a new skill step by step." },
    ["learning", "organising"],
    { bn: "নিয়মিত পড়ার সময়, পাঠের উৎস, অনুশীলনের উপায়", en: "Time for regular study, a source of lessons, a way to practise" },
    { bn: "একটি দক্ষতার জন্য ৭ দিনের পরিকল্পনা লিখুন, প্রতিদিন একটি অনুশীলন।", en: "Write a 7-day plan for one skill, with one practice task each day." }),
];
