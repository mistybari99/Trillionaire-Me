// Education and training. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const educationTraining: SectorFamily = {
  id: "education-training",
  name: { en: "Education and training (school, coaching, tutor, course)", bn: "শিক্ষা ও ট্রেনিং (স্কুল, কোচিং, টিউটর, কোর্স)" },
  summary: {
    en: "Teaches students for a fee. Seats filled, fees collected on time and teacher cost decide the result.",
    bn: "ফি নিয়ে শিক্ষার্থীদের পড়ানো। সিট কতটা ভরে, ফি সময়মতো আসে কি না আর শিক্ষকের খরচের ওপর ফলাফল নির্ভর করে।",
  },
  aliases: {
    en: ["school", "coaching centre", "tutor", "training institute", "online course", "madrasa", "kindergarten", "tuition", "academy"],
    bn: ["স্কুল", "কোচিং সেন্টার", "টিউশনি", "ট্রেনিং সেন্টার", "অনলাইন কোর্স", "মাদ্রাসা", "কিন্ডারগার্টেন"],
  },
  inputs: [
    { id: "fee", label: { en: "Fee per student for one period", bn: "প্রতি শিক্ষার্থীর এক পিরিয়ডের ফি" }, unit: "money", perPeriod: false, required: true },
    { id: "varCost", label: { en: "Extra cost per student (books, material, certificate)", bn: "প্রতি শিক্ষার্থীর বাড়তি খরচ (বই, ম্যাটেরিয়াল, সার্টিফিকেট)" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the month (rent, utilities, admin)", bn: "মাসের ফিক্সড খরচ (ভাড়া, ইউটিলিটি, অ্যাডমিন)" }, unit: "money", perPeriod: true, required: true },
    { id: "seatsFilled", label: { en: "Students enrolled", bn: "ভর্তি থাকা শিক্ষার্থী" }, unit: "count", perPeriod: true },
    { id: "seatsTotal", label: { en: "Seats you can offer", bn: "মোট কতজনকে সিট দেওয়া সম্ভব" }, unit: "count", perPeriod: true },
    { id: "revenue", label: { en: "Fees due for the month", bn: "মাসে পাওনা ফি" }, unit: "money", perPeriod: true },
    { id: "feesOwed", label: { en: "Fees not yet collected", bn: "এখনো আদায় হয়নি এমন ফি" }, unit: "money", perPeriod: false },
    { id: "teacherCost", label: { en: "Teacher pay for the month", bn: "মাসের শিক্ষকের বেতন" }, unit: "money", perPeriod: true },
    { id: "periodDays", label: { en: "Days in the period", bn: "পিরিয়ডের দিন সংখ্যা" }, unit: "days", perPeriod: true },
    { id: "newStudents", label: { en: "New students joined", bn: "নতুন ভর্তি হওয়া শিক্ষার্থী" }, unit: "count", perPeriod: true },
    { id: "marketingSpend", label: { en: "Marketing spend for the period", bn: "পিরিয়ডের মার্কেটিং খরচ" }, unit: "money", perPeriod: true },
  ],
  formulas: [
    { id: "studentMargin", use: "contributionMargin", map: { price: "fee", varCost: "varCost" } },
    { id: "breakEvenStudents", use: "breakEvenUnits", map: { fixed: "fixed", price: "fee", varCost: "varCost" } },
    { id: "seatFill", use: "occupancy", map: { occupiedUnits: "seatsFilled", availableUnits: "seatsTotal" } },
    { id: "feeDays", use: "receivableDays", map: { receivables: "feesOwed", revenue: "revenue", periodDays: "periodDays" } },
    { id: "teacherShare", use: "shareOfMoney", map: { part: "teacherCost", whole: "revenue" }, name: { en: "Teacher cost (percent of fees)", bn: "শিক্ষকের খরচ (ফির শতাংশ)" } },
    { id: "studentCost", use: "cac", map: { marketingSpend: "marketingSpend", newCustomers: "newStudents" }, name: { en: "Marketing cost per new student", bn: "নতুন শিক্ষার্থী প্রতি মার্কেটিং খরচ" } },
    { id: "monthProfit", name: { en: "Profit for the month", bn: "মাসের মুনাফা" }, expr: "revenue - teacherCost - fixed", needs: ["revenue", "teacherCost", "fixed"], result: "money" },
  ],
  questions: [
    { en: "How many students leave before the course or term ends, and why?", bn: "কোর্স বা টার্ম শেষের আগে কতজন ছেড়ে যায়, আর কেন?" },
    { en: "Which batch or class times stay empty?", bn: "কোন ব্যাচ বা ক্লাসের সময়ে সিট খালি থাকে?" },
    { en: "How do you keep good teachers, and what if one leaves?", bn: "ভালো শিক্ষককে কীভাবে ধরে রাখেন, আর একজন চলে গেলে কী হবে?" },
    { en: "Do you need a registration or approval, and is it in order?", bn: "রেজিস্ট্রেশন বা অনুমোদন লাগে কি না, আর সেটা ঠিক আছে কি না?" },
  ],
  risks: [
    { en: "Fees are paid late or not at all.", bn: "ফি দেরিতে আসে বা একেবারেই আসে না।" },
    { en: "Students move to a rival centre or to free online lessons.", bn: "শিক্ষার্থীরা অন্য সেন্টারে বা ফ্রি অনলাইন ক্লাসে চলে যায়।" },
    { en: "Exam and syllabus changes make material old.", bn: "টেস্ট ও সিলেবাস বদলালে ম্যাটেরিয়াল পুরনো হয়ে যায়।" },
    { en: "Depending on one or two key teachers.", bn: "এক-দুইজন মূল শিক্ষকের ওপর নির্ভর করা।" },
  ],
  seasonal: true,
  related: { paths: [], halalCheck: true },
};
