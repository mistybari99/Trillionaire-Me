// Fisheries and aquaculture. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const fisheriesAquaculture: SectorFamily = {
  id: "fisheries-aquaculture",
  name: { en: "Fisheries and aquaculture", bn: "মৎস্য ও অ্যাকুয়াকালচার" },
  summary: {
    en: "Grows fish or shrimp in ponds and hatcheries, or catches fish. Survival, feed use and harvest weight decide the result.",
    bn: "পুকুর বা হ্যাচারিতে মাছ ও চিংড়ি চাষ, বা মাছ ধরা। বেঁচে থাকার হার, ফিডের ব্যবহার আর ফলনের ওজনের ওপর ফলাফল নির্ভর করে।",
  },
  aliases: {
    en: ["fish farm", "pond", "shrimp", "prawn", "hatchery", "fishing", "aquaculture", "fingerling", "fish culture"],
    bn: ["মাছ চাষ", "পুকুর", "চিংড়ি ঘের", "হ্যাচারি", "পোনা", "মাছ ধরা", "ঘের"],
  },
  inputs: [
    { id: "price", label: { en: "Selling price of one kilo of fish or shrimp", bn: "এক কেজি মাছ বা চিংড়ির বিক্রির দাম" }, unit: "money", perPeriod: false, required: true },
    { id: "varCost", label: { en: "Feed and care cost for one kilo harvested", bn: "এক কেজি ফলনের পেছনে ফিড ও পরিচর্যার খরচ" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the cycle (pond lease, labour, pump)", bn: "চক্রের ফিক্সড খরচ (পুকুরের লিজ, লেবার, পাম্প)" }, unit: "money", perPeriod: true, required: true },
    { id: "revenue", label: { en: "Sales for the cycle", bn: "চক্রের মোট বিক্রি" }, unit: "money", perPeriod: true },
    { id: "feedCost", label: { en: "Feed bought for the cycle", bn: "চক্রে কেনা ফিড" }, unit: "money", perPeriod: true },
    { id: "seedCost", label: { en: "Fingerlings or post-larvae bought", bn: "কেনা পোনা বা পিএল" }, unit: "money", perPeriod: true },
    { id: "stocked", label: { en: "Fish or shrimp put in the pond", bn: "পুকুরে ছাড়া মাছ বা চিংড়ির সংখ্যা" }, unit: "qty", perPeriod: true },
    { id: "harvested", label: { en: "Fish or shrimp taken out alive at harvest", bn: "ফলনের সময় তোলা মাছ বা চিংড়ির সংখ্যা" }, unit: "qty", perPeriod: true },
    { id: "harvestQty", label: { en: "Harvest weight", bn: "ফলনের ওজন" }, unit: "qty", perPeriod: true },
    { id: "feedQty", label: { en: "Feed given (weight)", bn: "দেওয়া ফিডের ওজন" }, unit: "qty", perPeriod: true },
    { id: "pondArea", label: { en: "Pond water area in use", bn: "ব্যবহৃত পুকুরের পানির এলাকা" }, unit: "qty", perPeriod: false },
    { id: "cycleDays", label: { en: "Days in the cycle", bn: "চক্রের দিন" }, unit: "days", perPeriod: true },
  ],
  formulas: [
    { id: "kiloMargin", use: "contributionMargin", map: { price: "price", varCost: "varCost" } },
    { id: "breakEvenKilos", use: "breakEvenUnits", map: { fixed: "fixed", price: "price", varCost: "varCost" } },
    { id: "survival", use: "yieldRate", map: { outputQty: "harvested", inputQty: "stocked" }, name: { en: "Survival (percent of stocked)", bn: "বেঁচে থাকা (ছাড়া সংখ্যার শতাংশ)" } },
    { id: "lossShare", use: "lossRate", map: { outputQty: "harvested", inputQty: "stocked" }, name: { en: "Lost before harvest (percent of stocked)", bn: "ফলনের আগে হারানো (ছাড়া সংখ্যার শতাংশ)" } },
    { id: "feedShare", use: "shareOfMoney", map: { part: "feedCost", whole: "revenue" }, name: { en: "Feed cost (percent of sales)", bn: "ফিডের খরচ (বিক্রির শতাংশ)" } },
    { id: "feedConversion", name: { en: "Feed given per kilo harvested", bn: "প্রতি কেজি ফলনে ফিড" }, expr: "feedQty / harvestQty", needs: ["feedQty", "harvestQty"], result: "ratio" },
    { id: "salesPerArea", use: "revenuePerCapacity", map: { revenue: "revenue", capacityUnits: "pondArea" }, name: { en: "Sales per unit of pond area", bn: "পুকুরের প্রতি ইউনিট এলাকায় বিক্রি" } },
    { id: "cycleProfit", name: { en: "Profit for the cycle (own expression)", bn: "চক্রের মুনাফা (নিজের লেখা এক্সপ্রেশন)" }, expr: "revenue - feedCost - seedCost - fixed", needs: ["revenue", "feedCost", "seedCost", "fixed"], result: "money" },
  ],
  questions: [
    { en: "Where do you get seed, and do you know its source is reliable?", bn: "পোনা কোথা থেকে আনেন, আর সোর্স ভরসাযোগ্য কি না জানেন?" },
    { en: "How do you check water quality and oxygen in the pond?", bn: "পুকুরের পানির মান ও অক্সিজেন কীভাবে দেখেন?" },
    { en: "Who buys at harvest, and can the fish wait if the price is low?", bn: "ফলনের সময় কে কেনে, আর দাম কম হলে মাছ কি অপেক্ষা করতে পারে?" },
    { en: "Is the pond lease secure for the whole cycle?", bn: "পুরো চক্র জুড়ে পুকুরের লিজ কি নিরাপদ?" },
  ],
  risks: [
    { en: "Disease or low oxygen can kill a pond overnight.", bn: "রোগ বা অক্সিজেনের অভাবে এক রাতেই পুকুর শেষ হয়ে যেতে পারে।" },
    { en: "Floods and storms can wash fish out of the pond.", bn: "বন্যা ও ঝড়ে মাছ পুকুর থেকে ভেসে যেতে পারে।" },
    { en: "Feed and seed prices change during the cycle.", bn: "চক্রের মাঝে ফিড ও পোনার দাম বদলায়।" },
    { en: "Fresh fish spoils fast if sale or ice is delayed.", bn: "বিক্রি বা বরফ দেরি হলে টাটকা মাছ দ্রুত নষ্ট হয়।" },
  ],
  seasonal: true,
  related: { paths: [], halalCheck: true },
};
