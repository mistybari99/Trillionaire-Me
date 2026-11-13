// Worked example 2 (template for writers): Food service (restaurant, cafe, catering, food cart). Data only. No numbers, no benchmarks.
// Shows an own expression (monthProfit) next to library formulas (the `name` of a library formula is optional), and a capacity/occupancy style formula.
import type { SectorFamily } from "../types";

export const foodService: SectorFamily = {
  id: "food-service",
  name: { en: "Food service (restaurant, cafe, catering)", bn: "খাবারের ব্যবসা (রেস্টুরেন্ট, ক্যাফে, ক্যাটারিং)" },
  summary: {
    en: "Cooks and serves food and drink. Food cost, staff cost and how full the seats are decide the result.",
    bn: "রান্না করে খাবার ও পানীয় বিক্রি। খাবারের খরচ, স্টাফের খরচ আর সিট কতটা ভরে তার ওপর ফলাফল নির্ভর করে।",
  },
  aliases: {
    en: ["restaurant", "cafe", "catering", "food cart", "food truck", "canteen", "bakery shop", "tea stall", "fast food", "cloud kitchen"],
    bn: ["রেস্টুরেন্ট", "ক্যাফে", "ক্যাটারিং", "খাবারের দোকান", "চায়ের দোকান", "হোটেল", "ক্যান্টিন", "ক্লাউড কিচেন"],
  },
  inputs: [
    { id: "price", label: { en: "Average price of one plate or order", bn: "একটা প্লেট বা অর্ডারের গড় দাম" }, unit: "money", perPeriod: false, required: true },
    { id: "varCost", label: { en: "Average ingredient and packing cost of one plate or order", bn: "একটা প্লেট বা অর্ডারের গড় উপকরণ ও প্যাকিং খরচ" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the month (rent, utilities, licence)", bn: "মাসের ফিক্সড খরচ (ভাড়া, ইউটিলিটি, লাইসেন্স)" }, unit: "money", perPeriod: true, required: true },
    { id: "revenue", label: { en: "Sales for the month", bn: "মাসের মোট বিক্রি" }, unit: "money", perPeriod: true },
    { id: "foodCost", label: { en: "Food and drink bought for the month", bn: "মাসে কেনা খাবার ও পানীয়ের উপকরণ" }, unit: "money", perPeriod: true },
    { id: "staffCost", label: { en: "Staff pay for the month", bn: "মাসের স্টাফের বেতন" }, unit: "money", perPeriod: true },
    { id: "seatsSold", label: { en: "Seat-turns used in the month (each time a seat is used once)", bn: "মাসে সিট কতবার ব্যবহার হয়েছে (একবার বসা মানে একবার)" }, unit: "qty", perPeriod: true },
    { id: "seatsAvailable", label: { en: "Seat-turns you could offer in the month", bn: "মাসে সিট মোট কতবার দেওয়া সম্ভব ছিল" }, unit: "qty", perPeriod: true },
    { id: "wasteQty", label: { en: "Food made or bought but thrown away (weight or portions)", bn: "রান্না বা কেনা হয়েও ফেলে দেওয়া খাবার (ওজন বা পোর্শন)" }, unit: "qty", perPeriod: true },
    { id: "totalQty", label: { en: "All food made or bought (same unit as thrown away)", bn: "মোট রান্না বা কেনা খাবার (ফেলে দেওয়ার একই ইউনিটে)" }, unit: "qty", perPeriod: true },
  ],
  formulas: [
    { id: "plateMargin", use: "contributionMargin", map: { price: "price", varCost: "varCost" } },
    { id: "platePct", use: "contributionMarginPct", map: { price: "price", varCost: "varCost" } },
    { id: "breakEvenPlates", use: "breakEvenUnits", map: { fixed: "fixed", price: "price", varCost: "varCost" } },
    { id: "seatUse", use: "capacityUtilisation", map: { used: "seatsSold", capacity: "seatsAvailable" } },
    { id: "salesPerSeat", use: "revenuePerCapacity", map: { revenue: "revenue", capacityUnits: "seatsAvailable" } },
    { id: "foodCostPct", use: "shareOfMoney", map: { part: "foodCost", whole: "revenue" }, name: { en: "Food cost (percent of sales)", bn: "খাবারের খরচ (বিক্রির শতাংশ)" } },
    { id: "staffCostPct", use: "shareOfMoney", map: { part: "staffCost", whole: "revenue" }, name: { en: "Staff cost (percent of sales)", bn: "স্টাফের খরচ (বিক্রির শতাংশ)" } },
    { id: "wastePct", use: "shareOfQty", map: { partQty: "wasteQty", wholeQty: "totalQty" }, name: { en: "Waste (percent of all food)", bn: "অপচয় (মোট খাবারের শতাংশ)" } },
    { id: "monthProfit", name: { en: "Profit for the month (own expression)", bn: "মাসের মুনাফা (নিজের লেখা এক্সপ্রেশন)" }, expr: "revenue - foodCost - staffCost - fixed", needs: ["revenue", "foodCost", "staffCost", "fixed"], result: "money" },
  ],
  questions: [
    { en: "Which dishes earn the most per plate, and which are slow to cook?", bn: "কোন আইটেমে প্লেট-প্রতি আয় বেশি, আর কোনটা বানাতে সময় লাগে?" },
    { en: "When are your busy hours, and are seats empty at other times?", bn: "ব্যস্ত সময় কখন, আর অন্য সময় সিট কি খালি থাকে?" },
    { en: "How do you store food so it stays safe and does not spoil?", bn: "খাবার নিরাপদ ও টাটকা রাখতে কীভাবে সংরক্ষণ করেন?" },
    { en: "Do you use delivery apps, and what share of each order do they take?", bn: "ডেলিভারি অ্যাপ ব্যবহার করেন কি না, আর প্রতি অর্ডারের কতটা অংশ তারা নেয়?" },
  ],
  risks: [
    { en: "Ingredient prices change faster than menu prices.", bn: "উপকরণের দাম মেনুর দামের চেয়ে দ্রুত বদলায়।" },
    { en: "Spoiled or unsold food is thrown away.", bn: "নষ্ট বা অবিক্রিত খাবার ফেলে দিতে হয়।" },
    { en: "Food safety and hygiene checks.", bn: "খাবারের নিরাপত্তা ও পরিচ্ছন্নতার নিয়ম মেনে চলা।" },
    { en: "Depending on a few key cooks or staff.", bn: "অল্প কয়েকজন রাঁধুনি বা স্টাফের ওপর নির্ভর করা।" },
  ],
  seasonal: false,
  related: { paths: ["business-starter"], halalCheck: true },
};
