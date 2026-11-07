// Gig work and freelance (freelancers, platform drivers, tutors, home-based work). Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const gigFreelance: SectorFamily = {
  id: "gig-freelance",
  name: { en: "Gig work and freelance", bn: "গিগ ওয়ার্ক ও ফ্রিল্যান্স" },
  summary: {
    en: "Earns by the job, hour or ride, often through a platform or a few clients. Paid hours, platform cut and slow payments decide the result.",
    bn: "কাজ, ঘণ্টা বা ট্রিপ অনুযায়ী আয়, অনেক সময় প্ল্যাটফর্ম বা অল্প কয়েকজন ক্লায়েন্টের মাধ্যমে। পেইড ঘণ্টা, প্ল্যাটফর্মের কাট আর দেরিতে পেমেন্টের ওপর ফলাফল নির্ভর করে।",
  },
  aliases: {
    en: ["freelancer", "freelance", "gig", "uber driver", "pathao rider", "online tutor", "home tutor", "home based work", "upwork", "fiverr", "delivery rider"],
    bn: ["ফ্রিল্যান্সার", "ফ্রিল্যান্স", "টিউটর", "টিউশন", "রাইডার", "ড্রাইভার", "বাসা থেকে কাজ", "আউটসোর্সিং"],
  },
  inputs: [
    { id: "price", label: { en: "Average income from one job, hour or ride before platform cut", bn: "প্ল্যাটফর্মের কাটের আগে একটা কাজ, ঘণ্টা বা ট্রিপের গড় আয়" }, unit: "money", perPeriod: false, required: true },
    { id: "varCost", label: { en: "Direct cost of one job, hour or ride (fuel, data, tools)", bn: "একটা কাজ, ঘণ্টা বা ট্রিপের সরাসরি খরচ (জ্বালানি, ডাটা, টুল)" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the month (device, internet, vehicle upkeep, workspace)", bn: "মাসের ফিক্সড খরচ (ফোন, ইন্টারনেট, গাড়ির মেইনটেন্যান্স, কাজের জায়গা)" }, unit: "money", perPeriod: true, required: true },
    { id: "revenue", label: { en: "Total earned in the month before platform cut", bn: "মাসে প্ল্যাটফর্মের কাটের আগে মোট আয়" }, unit: "money", perPeriod: true },
    { id: "platformFee", label: { en: "Platform cut and payout fees for the month", bn: "মাসে প্ল্যাটফর্মের কাট ও পেআউট ফি" }, unit: "money", perPeriod: true },
    { id: "paidHours", label: { en: "Hours that were paid in the month", bn: "মাসে যে ঘণ্টাগুলোর টাকা পেয়েছেন" }, unit: "qty", perPeriod: true },
    { id: "workedHours", label: { en: "All hours you spent in the month (paid, waiting, finding work)", bn: "মাসে মোট ব্যয় করা ঘণ্টা (পেইড, অপেক্ষা, কাজ খোঁজা)" }, unit: "qty", perPeriod: true },
    { id: "unpaid", label: { en: "Money earned but not yet received", bn: "আয় হয়েছে কিন্তু এখনো হাতে পাননি" }, unit: "money", perPeriod: false },
    { id: "periodDays", label: { en: "Days in the period you are looking at", bn: "যে সময়টা দেখছেন তার মোট দিন" }, unit: "days", perPeriod: true },
    { id: "biggestClient", label: { en: "Income from your biggest client or platform", bn: "সবচেয়ে বড় ক্লায়েন্ট বা প্ল্যাটফর্ম থেকে আয়" }, unit: "money", perPeriod: true },
  ],
  formulas: [
    { id: "jobMargin", use: "contributionMargin", map: { price: "price", varCost: "varCost" } },
    { id: "jobMarginPct", use: "contributionMarginPct", map: { price: "price", varCost: "varCost" } },
    { id: "breakEvenJobs", use: "breakEvenUnits", map: { fixed: "fixed", price: "price", varCost: "varCost" } },
    { id: "paidHourPct", use: "shareOfQty", map: { partQty: "paidHours", wholeQty: "workedHours" }, name: { en: "Paid hours (percent of all hours spent)", bn: "পেইড ঘণ্টা (মোট ব্যয় ঘণ্টার শতাংশ)" } },
    { id: "incomePerHour", use: "revenuePerCapacity", map: { revenue: "revenue", capacityUnits: "workedHours" }, name: { en: "Income per hour spent", bn: "প্রতি ব্যয় ঘণ্টায় আয়" } },
    { id: "platformCutPct", use: "shareOfMoney", map: { part: "platformFee", whole: "revenue" }, name: { en: "Platform cut (percent of earnings)", bn: "প্ল্যাটফর্মের কাট (আয়ের শতাংশ)" } },
    { id: "biggestClientPct", use: "shareOfMoney", map: { part: "biggestClient", whole: "revenue" }, name: { en: "Biggest client (percent of earnings)", bn: "সবচেয়ে বড় ক্লায়েন্ট (আয়ের শতাংশ)" } },
    { id: "waitDays", use: "receivableDays", map: { receivables: "unpaid", revenue: "revenue", periodDays: "periodDays" }, name: { en: "Days of earnings still unpaid", bn: "যত দিনের আয় এখনো পাওনা" } },
    { id: "monthKeep", name: { en: "Kept for the month after cuts and costs (own expression)", bn: "কাট ও খরচের পর মাসে হাতে থাকা টাকা (নিজের লেখা এক্সপ্রেশন)" }, expr: "revenue - platformFee - fixed", needs: ["revenue", "platformFee", "fixed"], result: "money" },
  ],
  questions: [
    { en: "How much of your income comes from one client or one platform?", bn: "আপনার আয়ের কতটা একজন ক্লায়েন্ট বা একটা প্ল্যাটফর্ম থেকে আসে?" },
    { en: "How many of your hours are unpaid, such as waiting or finding work?", bn: "আপনার কতটা সময় আনপেইড, যেমন অপেক্ষা বা কাজ খোঁজা?" },
    { en: "What happens to your income if your account is paused or your device breaks?", bn: "অ্যাকাউন্ট পজ হলে বা ফোন বা কম্পিউটার নষ্ট হলে আয়ের কী হয়?" },
    { en: "Have you set money aside for slow months and for tax or licence rules?", bn: "ধীর মাসের জন্য এবং ট্যাক্স বা লাইসেন্সের নিয়মের জন্য টাকা আলাদা রেখেছেন কি না?" },
  ],
  risks: [
    { en: "Platform rules or cuts can change without notice.", bn: "প্ল্যাটফর্মের নিয়ম বা কাট নোটিস ছাড়াই বদলাতে পারে।" },
    { en: "Clients pay late or not at all.", bn: "ক্লায়েন্ট দেরিতে পেমেন্ট করেন বা একেবারেই করেন না।" },
    { en: "Income is uneven and there is no paid leave or cover for illness.", bn: "আয় অসমান, আর ছুটি বা অসুস্থতার জন্য কোনো কভার নেই।" },
    { en: "Your own vehicle or device wears out and needs replacing.", bn: "নিজের গাড়ি বা ফোন ক্ষয় হয়ে যায়, বদলাতে হয়।" },
  ],
  seasonal: true,
  related: { paths: [], halalCheck: true },
};
