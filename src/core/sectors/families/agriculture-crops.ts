// Crop farming (rice, vegetables, fruits, jute, tea, nursery). Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const agricultureCrops: SectorFamily = {
  id: "agriculture-crops",
  name: { en: "Crop farming (rice, vegetables, fruits, jute, tea, nursery)", bn: "ফসল চাষ (ধান, সবজি, ফল, পাট, চা, নার্সারি)" },
  summary: {
    en: "Grows crops over a season. Seed, fertiliser, water and labour are spent first, and the money comes at harvest, so yield and the selling price at harvest decide the result.",
    bn: "মৌসুম ধরে ফসল ফলায়। বীজ, সার, পানি ও শ্রমে আগে খরচ হয়, টাকা আসে ফসল তোলার পর। তাই ফলন আর ফসল তোলার সময়ের দামের ওপর ফলাফল নির্ভর করে।",
  },
  aliases: {
    en: ["farming", "crop farming", "rice farming", "vegetable farm", "orchard", "jute", "tea garden", "nursery", "agriculture", "cultivation"],
    bn: ["চাষ", "কৃষি", "ধান চাষ", "সবজি চাষ", "বাগান", "পাট", "চা বাগান", "নার্সারি", "খামার"],
  },
  inputs: [
    { id: "seedCost", label: { en: "Seed or seedling cost for the season", bn: "মৌসুমের বীজ বা চারার খরচ" }, unit: "money", perPeriod: true, required: true },
    { id: "fertiliserCost", label: { en: "Fertiliser and pesticide cost for the season", bn: "মৌসুমের সার ও কীটনাশকের খরচ" }, unit: "money", perPeriod: true },
    { id: "irrigationCost", label: { en: "Water, pump fuel and power cost for the season", bn: "মৌসুমের পানি, পাম্পের তেল ও বিদ্যুতের খরচ" }, unit: "money", perPeriod: true },
    { id: "labourCost", label: { en: "Labour cost for the season (planting, weeding, harvest)", bn: "মৌসুমের শ্রমিক খরচ (রোপণ, নিড়ানি, ফসল তোলা)" }, unit: "money", perPeriod: true },
    { id: "landCost", label: { en: "Land lease or share paid for the season", bn: "মৌসুমের জমির ইজারা বা ভাগ" }, unit: "money", perPeriod: true },
    { id: "revenue", label: { en: "Money from selling the crop this season", bn: "এই মৌসুমে ফসল বিক্রির টাকা" }, unit: "money", perPeriod: true },
    { id: "area", label: { en: "Land area planted (decimal or bigha, one unit throughout)", bn: "চাষ করা জমির পরিমাণ (শতাংশ বা বিঘা, সব জায়গায় একই ইউনিট)" }, unit: "qty", perPeriod: true, required: true },
    { id: "harvestQty", label: { en: "Crop harvested (kg or maund, one unit throughout)", bn: "ফসল তোলা হয়েছে (কেজি বা মণ, সব জায়গায় একই ইউনিট)" }, unit: "qty", perPeriod: true },
    { id: "lostQty", label: { en: "Crop lost to flood, pests, drying or storage", bn: "বন্যা, পোকা, শুকানো বা মজুতে নষ্ট ফসল" }, unit: "qty", perPeriod: true },
    { id: "soldQty", label: { en: "Crop sold (same unit as harvested)", bn: "বিক্রি করা ফসল (তোলা ফসলের একই ইউনিটে)" }, unit: "qty", perPeriod: true },
    { id: "loan", label: { en: "Loan or input credit to repay after harvest", bn: "ফসল তোলার পর শোধ করার ঋণ বা বাকিতে নেওয়া উপকরণ" }, unit: "money", perPeriod: false },
  ],
  formulas: [
    { id: "seasonCost", name: { en: "Total cost for the season", bn: "মৌসুমের মোট খরচ" }, expr: "seedCost + fertiliserCost + irrigationCost + labourCost + landCost", needs: ["seedCost", "fertiliserCost", "irrigationCost", "labourCost", "landCost"], result: "money" },
    { id: "seasonProfit", name: { en: "Profit for the season", bn: "মৌসুমের মুনাফা" }, expr: "revenue - seedCost - fertiliserCost - irrigationCost - labourCost - landCost", needs: ["revenue", "seedCost", "fertiliserCost", "irrigationCost", "labourCost", "landCost"], result: "money" },
    { id: "yieldPerArea", name: { en: "Harvest per unit of land", bn: "প্রতি ইউনিট জমিতে ফলন" }, expr: "harvestQty / area", needs: ["harvestQty", "area"], result: "ratio" },
    { id: "costPerUnitHarvested", name: { en: "Cost of one unit of crop harvested", bn: "এক ইউনিট ফসল ফলাতে খরচ" }, expr: "(seedCost + fertiliserCost + irrigationCost + labourCost + landCost) / harvestQty", needs: ["seedCost", "fertiliserCost", "irrigationCost", "labourCost", "landCost", "harvestQty"], result: "money" },
    { id: "priceReceived", name: { en: "Average price you got per unit sold", bn: "প্রতি ইউনিট বিক্রিতে গড়ে যে দাম পেয়েছেন" }, expr: "revenue / soldQty", needs: ["revenue", "soldQty"], result: "money" },
    { id: "lossPct", use: "shareOfQty", map: { partQty: "lostQty", wholeQty: "harvestQty" }, name: { en: "Crop lost (percent of harvest)", bn: "নষ্ট ফসল (তোলা ফসলের শতাংশ)" } },
    { id: "soldPct", use: "shareOfQty", map: { partQty: "soldQty", wholeQty: "harvestQty" }, name: { en: "Share of harvest sold (percent)", bn: "তোলা ফসলের কত অংশ বিক্রি হয়েছে (শতাংশ)" } },
    { id: "afterLoan", name: { en: "Sales money left after repaying the loan", bn: "ঋণ শোধের পর বিক্রির টাকার যা থাকে" }, expr: "revenue - loan", needs: ["revenue", "loan"], result: "money" },
  ],
  questions: [
    { en: "Where and when do you sell, and do you sell at harvest or wait for a better price?", bn: "কোথায় ও কখন বিক্রি করেন, ফসল তুলেই বেচেন নাকি দামের জন্য অপেক্ষা করেন?" },
    { en: "Do you have storage or drying space, or must you sell right away?", bn: "মজুত বা শুকানোর জায়গা আছে, নাকি সাথে সাথে বেচতে হয়?" },
    { en: "Is your land owned, leased or shared, and for how long?", bn: "জমি নিজের, ইজারা না ভাগে, আর কতদিনের জন্য?" },
    { en: "Do you have crop insurance or a government input support card?", bn: "ফসল বিমা বা সরকারি উপকরণ সহায়তার কার্ড আছে কি না?" },
    { en: "When is the loan due, before or after harvest?", bn: "ঋণ শোধের সময় ফসল তোলার আগে না পরে?" },
  ],
  risks: [
    { en: "Flood, drought, storm or cold harms the crop.", bn: "বন্যা, খরা, ঝড় বা ঠান্ডায় ফসলের ক্ষতি হয়।" },
    { en: "Pests and disease spread fast.", bn: "পোকা ও রোগ দ্রুত ছড়ায়।" },
    { en: "The price at harvest falls when many farmers sell together.", bn: "সবাই একসাথে বেচলে ফসল তোলার সময় দাম পড়ে যায়।" },
    { en: "Seed, fertiliser and fuel prices rise before you can sell.", bn: "বিক্রির আগেই বীজ, সার ও তেলের দাম বাড়ে।" },
    { en: "Relying on middlemen or loans that must be repaid at harvest.", bn: "মধ্যস্বত্বভোগী বা ফসল তোলার সময় শোধ করার ঋণের ওপর নির্ভর করা।" },
  ],
  seasonal: true,
  related: { paths: ["business-starter"] },
};
