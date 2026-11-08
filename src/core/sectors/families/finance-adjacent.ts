// Finance-adjacent coordination: micro-lending groups, agent banking, MFS cash points, insurance agency. Record keeping only, not advice. Data only. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const financeAdjacent: SectorFamily = {
  id: "finance-adjacent",
  name: { en: "Finance-adjacent work (agent, cash point, group coordination)", bn: "ফাইন্যান্স-সংশ্লিষ্ট কাজ (এজেন্ট, ক্যাশ পয়েন্ট, গ্রুপ সমন্বয়)" },
  summary: {
    en: "Records for work around money services: group loan coordination, agent banking, mobile money cash points, insurance agency. This is record keeping only, not advice. Ask the rule maker about licences and rules.",
    bn: "মানি সার্ভিস ঘিরে কাজের রেকর্ড: গ্রুপ ঋণের সমন্বয়, এজেন্ট ব্যাংকিং, মোবাইল মানি ক্যাশ পয়েন্ট, বিমা এজেন্সি। এটা শুধু রেকর্ড রাখার জন্য, পরামর্শ নয়। লাইসেন্স ও নিয়ম নিয়মকারী সংস্থার কাছ থেকে জেনে নিন।",
  },
  aliases: {
    en: ["agent banking", "mobile money", "cash point", "mfs agent", "insurance agent", "micro lending", "microfinance", "loan group", "cash in cash out"],
    bn: ["এজেন্ট ব্যাংকিং", "মোবাইল ব্যাংকিং", "ক্যাশ পয়েন্ট", "ক্যাশ ইন ক্যাশ আউট", "বিমা এজেন্ট", "ক্ষুদ্রঋণ", "সমিতি", "এমএফএস এজেন্ট"],
  },
  inputs: [
    { id: "feePerTxn", label: { en: "Commission or fee you earn per transaction or policy", bn: "প্রতি লেনদেন বা পলিসিতে আপনার কমিশন বা ফি" }, unit: "money", perPeriod: false, required: true },
    { id: "costPerTxn", label: { en: "Direct cost per transaction or policy (SMS, form, travel)", bn: "প্রতি লেনদেন বা পলিসির সরাসরি খরচ (এসএমএস, ফর্ম, যাতায়াত)" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the month (shop rent, staff, internet, device)", bn: "মাসের ফিক্সড খরচ (দোকান ভাড়া, স্টাফ, ইন্টারনেট, ফোন)" }, unit: "money", perPeriod: true, required: true },
    { id: "commissionIncome", label: { en: "Commission and fees earned in the month", bn: "মাসে পাওয়া কমিশন ও ফি" }, unit: "money", perPeriod: true },
    { id: "floatHeld", label: { en: "Cash and e-float you keep to serve customers", bn: "গ্রাহককে সেবা দিতে হাতে রাখা ক্যাশ ও ই-ফ্লোট" }, unit: "money", perPeriod: false },
    { id: "monthlyFlow", label: { en: "Total money handled for customers in the month", bn: "মাসে গ্রাহকের জন্য সামলানো মোট টাকা" }, unit: "money", perPeriod: true },
    { id: "groupDue", label: { en: "Instalments due from your group in the period", bn: "পিরিয়ডে গ্রুপের কাছ থেকে পাওনা কিস্তি" }, unit: "money", perPeriod: true },
    { id: "groupCollected", label: { en: "Instalments actually collected in the period", bn: "পিরিয়ডে আসলে আদায় হওয়া কিস্তি" }, unit: "money", perPeriod: true },
    { id: "txnCount", label: { en: "Number of transactions or policies handled in the month", bn: "মাসে সামলানো লেনদেন বা পলিসির সংখ্যা" }, unit: "count", perPeriod: true },
    { id: "policiesRenewed", label: { en: "Policies renewed by customers", bn: "গ্রাহক যে পলিসি নবায়ন করেছেন" }, unit: "count", perPeriod: true },
    { id: "policiesDue", label: { en: "Policies that were due for renewal", bn: "নবায়নের সময় হওয়া পলিসি" }, unit: "count", perPeriod: true },
  ],
  formulas: [
    { id: "txnMargin", use: "contributionMargin", map: { price: "feePerTxn", varCost: "costPerTxn" }, name: { en: "Earning left per transaction", bn: "প্রতি লেনদেনে হাতে থাকা আয়" } },
    { id: "breakEvenTxn", use: "breakEvenUnits", map: { fixed: "fixed", price: "feePerTxn", varCost: "costPerTxn" }, name: { en: "Transactions needed to cover fixed costs", bn: "ফিক্সড খরচ তুলতে কতটা লেনদেন লাগে" } },
    { id: "collectionRate", use: "shareOfMoney", map: { part: "groupCollected", whole: "groupDue" }, name: { en: "Instalments collected (percent of due)", bn: "আদায় হওয়া কিস্তি (পাওনার শতাংশ)" } },
    { id: "renewalRate", use: "occupancy", map: { occupiedUnits: "policiesRenewed", availableUnits: "policiesDue" }, name: { en: "Policies renewed (percent of due)", bn: "নবায়ন হওয়া পলিসি (পাওনা নবায়নের শতাংশ)" } },
    { id: "earnPerFlow", use: "shareOfMoney", map: { part: "commissionIncome", whole: "monthlyFlow" }, name: { en: "Commission (percent of money handled)", bn: "কমিশন (সামলানো টাকার শতাংশ)" } },
    { id: "monthNet", name: { en: "Left after fixed costs (own expression)", bn: "ফিক্সড খরচের পর হাতে থাকা টাকা (নিজের লেখা এক্সপ্রেশন)" }, expr: "commissionIncome - fixed", needs: ["commissionIncome", "fixed"], result: "money" },
    { id: "gapToDue", name: { en: "Instalments still to collect (own expression)", bn: "এখনো আদায় বাকি কিস্তি (নিজের লেখা এক্সপ্রেশন)" }, expr: "groupDue - groupCollected", needs: ["groupDue", "groupCollected"], result: "money" },
  ],
  questions: [
    { en: "Which licence or approval does your work need, and who gave it to you? Ask the rule maker if unsure.", bn: "আপনার কাজে কোন লাইসেন্স বা অনুমোদন লাগে, আর কে দিয়েছে? নিশ্চিত না হলে নিয়মকারী সংস্থাকে জিজ্ঞেস করুন।" },
    { en: "How do you record every transaction so it can be checked later?", bn: "প্রতিটা লেনদেন পরে যাচাই করার মতো করে কীভাবে লিখে রাখেন?" },
    { en: "How much cash and float do you keep, and where is it kept safe?", bn: "কতটা ক্যাশ ও ফ্লোট রাখেন, আর কোথায় নিরাপদে থাকে?" },
    { en: "How do you protect customer details and never keep PINs or passwords?", bn: "গ্রাহকের তথ্য কীভাবে সুরক্ষিত রাখেন, আর পিন বা পাসওয়ার্ড কখনো রাখবেন না তা কীভাবে নিশ্চিত করেন?" },
  ],
  risks: [
    { en: "Cash or float runs short when customers need it.", bn: "গ্রাহকের দরকারের সময় ক্যাশ বা ফ্লোট কম পড়ে।" },
    { en: "Theft, fraud or a fake note or message.", bn: "চুরি, প্রতারণা বা জাল নোট বা মেসেজ।" },
    { en: "Group members miss instalments and the gap falls on you.", bn: "গ্রুপের সদস্য কিস্তি দিতে না পারলে ঘাটতি আপনার ওপর আসে।" },
    { en: "Licence or rules change, or the partner company changes terms.", bn: "লাইসেন্স বা নিয়ম বদলায়, বা পার্টনার কোম্পানি শর্ত বদলায়।" },
    { en: "System downtime stops service and loses customers.", bn: "সিস্টেম বন্ধ থাকলে সেবা থেমে যায় ও গ্রাহক হারান।" },
  ],
  seasonal: false,
  related: { paths: [], halalCheck: true },
};
