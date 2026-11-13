// Hospitality and travel. Data only. No numbers, no benchmarks. See docs/design/sector-model.md.
import type { SectorFamily } from "../types";

export const hospitalityTravel: SectorFamily = {
  id: "hospitality-travel",
  name: { en: "Hospitality and travel (hotel, guest house, tour agency)", bn: "হসপিটালিটি ও ট্রাভেল (হোটেল, গেস্ট হাউস, ট্যুর এজেন্সি)" },
  summary: {
    en: "Rents rooms or sells trips and bookings. How many rooms fill, the price per room and the cost to serve a guest decide the result.",
    bn: "রুম ভাড়া দেয় বা ট্যুর ও বুকিং বিক্রি করে। কতগুলো রুম ভরে, রুমের দাম আর গেস্ট সার্ভ করার খরচের ওপর ফলাফল নির্ভর করে।",
  },
  aliases: {
    en: ["hotel", "guest house", "resort", "tour operator", "travel agency", "ticketing", "motel", "homestay", "tour package"],
    bn: ["হোটেল", "গেস্ট হাউস", "রিসোর্ট", "ট্যুর এজেন্সি", "ট্রাভেল এজেন্সি", "টিকিটিং", "মেস", "ট্যুর প্যাকেজ"],
  },
  inputs: [
    { id: "price", label: { en: "Price of one room-night or one tour booking", bn: "এক রুম-রাত বা একটা ট্যুর বুকিংয়ের দাম" }, unit: "money", perPeriod: false, required: true },
    { id: "varCost", label: { en: "Cost to serve one room-night or booking (cleaning, breakfast, supplier fee)", bn: "এক রুম-রাত বা বুকিং সার্ভ করার খরচ (ক্লিনিং, নাস্তা, সাপ্লায়ারের ফি)" }, unit: "money", perPeriod: false, required: true },
    { id: "fixed", label: { en: "Fixed costs for the month (rent, staff, licence, software)", bn: "মাসের ফিক্সড খরচ (ভাড়া, স্টাফ, লাইসেন্স, সফটওয়্যার)" }, unit: "money", perPeriod: true, required: true },
    { id: "revenue", label: { en: "Sales for the month", bn: "মাসের মোট বিক্রি" }, unit: "money", perPeriod: true },
    { id: "roomsSold", label: { en: "Room-nights sold in the month", bn: "মাসে বিক্রি হওয়া রুম-রাত" }, unit: "count", perPeriod: true },
    { id: "roomsAvailable", label: { en: "Room-nights you could sell in the month", bn: "মাসে মোট যত রুম-রাত বিক্রি করা সম্ভব ছিল" }, unit: "count", perPeriod: true },
    { id: "roomCount", label: { en: "Number of rooms or seats you offer", bn: "আপনার রুম বা সিটের সংখ্যা" }, unit: "qty", perPeriod: false },
    { id: "staffCost", label: { en: "Staff pay for the month", bn: "মাসের স্টাফের বেতন" }, unit: "money", perPeriod: true },
    { id: "commissionCost", label: { en: "Commission paid to booking platforms or agents", bn: "বুকিং প্ল্যাটফর্ম বা এজেন্টকে দেওয়া কমিশন" }, unit: "money", perPeriod: true },
    { id: "advanceReceived", label: { en: "Advance money held for future bookings", bn: "ভবিষ্যৎ বুকিংয়ের জন্য রাখা অ্যাডভান্স" }, unit: "money", perPeriod: false },
    { id: "cancelledBookings", label: { en: "Bookings cancelled in the month", bn: "মাসে বাতিল হওয়া বুকিং" }, unit: "count", perPeriod: true },
    { id: "allBookings", label: { en: "All bookings taken in the month", bn: "মাসে নেওয়া মোট বুকিং" }, unit: "count", perPeriod: true },
  ],
  formulas: [
    { id: "nightMargin", use: "contributionMargin", map: { price: "price", varCost: "varCost" } },
    { id: "breakEvenNights", use: "breakEvenUnits", map: { fixed: "fixed", price: "price", varCost: "varCost" } },
    { id: "roomOccupancy", use: "occupancy", map: { occupiedUnits: "roomsSold", availableUnits: "roomsAvailable" } },
    { id: "salesPerRoom", use: "revenuePerCapacity", map: { revenue: "revenue", capacityUnits: "roomCount" }, name: { en: "Sales per room or seat", bn: "প্রতি রুম বা সিটে বিক্রি" } },
    { id: "staffShare", use: "shareOfMoney", map: { part: "staffCost", whole: "revenue" }, name: { en: "Staff cost (percent of sales)", bn: "স্টাফের খরচ (বিক্রির শতাংশ)" } },
    { id: "commissionShare", use: "shareOfMoney", map: { part: "commissionCost", whole: "revenue" }, name: { en: "Commission paid (percent of sales)", bn: "কমিশন (বিক্রির শতাংশ)" } },
    { id: "cancelShare", use: "occupancy", map: { occupiedUnits: "cancelledBookings", availableUnits: "allBookings" }, name: { en: "Cancelled bookings (percent of all)", bn: "বাতিল বুকিং (মোটের শতাংশ)" } },
    { id: "monthProfit", name: { en: "Profit for the month (own expression)", bn: "মাসের মুনাফা (নিজের লেখা এক্সপ্রেশন)" }, expr: "revenue - staffCost - commissionCost - fixed", needs: ["revenue", "staffCost", "commissionCost", "fixed"], result: "money" },
  ],
  questions: [
    { en: "Which months or days are empty, and what could fill them?", bn: "কোন মাস বা দিনগুলো খালি থাকে, আর কী দিয়ে ভরানো যায়?" },
    { en: "How much of your booking comes from platforms that take a commission?", bn: "আপনার বুকিংয়ের কতটা আসে কমিশন নেওয়া প্ল্যাটফর্ম থেকে?" },
    { en: "What is your rule for advance money when a guest cancels?", bn: "গেস্ট বাতিল করলে অ্যাডভান্সের ব্যাপারে আপনার নিয়ম কী?" },
    { en: "Which licences and safety checks apply to your place?", bn: "আপনার জায়গার জন্য কোন লাইসেন্স ও সেফটি চেক দরকার?" },
  ],
  risks: [
    { en: "Empty rooms still carry rent and staff cost.", bn: "খালি রুমেও ভাড়া আর স্টাফের খরচ থাকে।" },
    { en: "Late cancellations leave rooms unsold.", bn: "শেষ মুহূর্তের বাতিলে রুম অবিক্রিত থাকে।" },
    { en: "Reviews and word of mouth can change demand quickly.", bn: "রিভিউ ও মুখে মুখে কথায় ডিমান্ড দ্রুত বদলায়।" },
    { en: "Advance money from guests must not be spent as ordinary income.", bn: "গেস্টের অ্যাডভান্স সাধারণ আয় ভেবে খরচ করা ঠিক নয়।" },
  ],
  seasonal: true,
  related: { paths: [], halalCheck: true },
};
