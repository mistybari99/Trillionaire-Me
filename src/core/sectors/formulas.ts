// Shared formula library (BUILD-02). Names and parameter labels in EN and BN. No numbers are stored: every figure comes from the user.
// A family formula refers to one of these by id and maps each parameter to one of its own inputs.
// Percent results are written as a fraction times 100. Periods: the user gives the length of the period in days where a formula needs it (no default).
import type { LibFormula, LibParam, UnitKind } from "./types";

const p = (id: string, unit: UnitKind, en: string, bn: string): LibParam => ({ id, unit, label: { en, bn } });
const price = p("price", "money", "Selling price per unit", "প্রতি ইউনিটের বিক্রির দাম");
const varCost = p("varCost", "money", "Variable cost per unit", "প্রতি ইউনিটের ভেরিয়েবল খরচ");
const fixed = p("fixed", "money", "Fixed costs for the period", "পিরিয়ডের ফিক্সড খরচ");
const revenue = p("revenue", "money", "Revenue for the period", "পিরিয়ডের বিক্রি");
const cogs = p("cogs", "money", "Cost of goods sold for the period", "পিরিয়ডে বিক্রি হওয়া মালের খরচ");
const periodDays = p("periodDays", "days", "Days in the period", "পিরিয়ডের দিন সংখ্যা");
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;
const MONTH_BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const monthParams = MONTHS.map((m, i) => p(m, "money", `Revenue in month ${i + 1}`, `${MONTH_BN[i]} মাসের বিক্রি`));
const monthList = MONTHS.join(", ");

export const LIB_FORMULAS: LibFormula[] = [
  { id: "contributionMargin", name: { en: "Contribution margin per unit", bn: "প্রতি ইউনিটে কন্ট্রিবিউশন মার্জিন" }, params: [price, varCost], expr: "price - varCost", result: "money" },
  { id: "contributionMarginPct", name: { en: "Contribution margin (percent)", bn: "কন্ট্রিবিউশন মার্জিন (শতাংশ)" }, params: [price, varCost], expr: "(price - varCost) / price * 100", result: "percent" },
  { id: "grossMargin", name: { en: "Gross margin (percent)", bn: "গ্রস মার্জিন (শতাংশ)" }, params: [revenue, cogs], expr: "(revenue - cogs) / revenue * 100", result: "percent" },
  { id: "breakEvenUnits", name: { en: "Break-even units", bn: "ব্রেক-ইভেন ইউনিট" }, params: [fixed, price, varCost], expr: "fixed / (price - varCost)", result: "qty" },
  { id: "breakEvenRevenue", name: { en: "Break-even revenue", bn: "ব্রেক-ইভেন বিক্রি" }, params: [fixed, price, varCost], expr: "fixed / ((price - varCost) / price)", result: "money" },
  { id: "receivableDays", name: { en: "Receivable days", bn: "বাকি পাওনার দিন" }, params: [p("receivables", "money", "Money customers still owe you", "কাস্টমারের কাছে বাকি পাওনা"), revenue, periodDays], expr: "receivables / revenue * periodDays", result: "days" },
  { id: "inventoryDays", name: { en: "Inventory days", bn: "স্টকে মাল থাকার দিন" }, params: [p("inventory", "money", "Stock value at cost", "স্টকের খরচ-দামের মোট"), cogs, periodDays], expr: "inventory / cogs * periodDays", result: "days" },
  { id: "payableDays", name: { en: "Payable days", bn: "বাকি দেনার দিন" }, params: [p("payables", "money", "Money you still owe suppliers", "সাপ্লায়ারকে বাকি দেনা"), cogs, periodDays], expr: "payables / cogs * periodDays", result: "days" },
  {
    id: "cashConversion", name: { en: "Cash conversion days", bn: "ক্যাশ ফিরে আসার দিন" },
    params: [p("receivables", "money", "Money customers still owe you", "কাস্টমারের কাছে বাকি পাওনা"), p("inventory", "money", "Stock value at cost", "স্টকের খরচ-দামের মোট"), p("payables", "money", "Money you still owe suppliers", "সাপ্লায়ারকে বাকি দেনা"), revenue, cogs, periodDays],
    expr: "receivables / revenue * periodDays + inventory / cogs * periodDays - payables / cogs * periodDays", result: "days",
  },
  { id: "cac", name: { en: "Customer acquisition cost", bn: "নতুন কাস্টমার পেতে খরচ" }, params: [p("marketingSpend", "money", "Marketing and sales spend", "মার্কেটিং ও সেলসের খরচ"), p("newCustomers", "count", "New customers won", "নতুন কাস্টমার")], expr: "marketingSpend / newCustomers", result: "money" },
  { id: "ltv", name: { en: "Customer lifetime value (needs churn)", bn: "একজন কাস্টমার থেকে মোট আয় (চার্ন লাগবে)" }, params: [p("marginPerPeriod", "money", "Margin per customer per period", "প্রতি কাস্টমারের পিরিয়ড-প্রতি মার্জিন"), p("churnPct", "percent", "Customers lost per period (percent)", "পিরিয়ডে হারানো কাস্টমার (শতাংশ)")], expr: "marginPerPeriod / (churnPct / 100)", result: "money" },
  { id: "payback", name: { en: "Payback (in periods)", bn: "খরচ ফিরতে কত পিরিয়ড" }, params: [p("investment", "money", "Money put in", "যে টাকা লাগানো হয়েছে"), p("profitPerPeriod", "money", "Profit per period", "পিরিয়ড-প্রতি মুনাফা")], expr: "investment / profitPerPeriod", result: "count" },
  { id: "capacityUtilisation", name: { en: "Capacity utilisation (percent)", bn: "ক্যাপাসিটি কতটা কাজে লাগছে (শতাংশ)" }, params: [p("used", "qty", "Capacity used", "যতটা ব্যবহার হয়েছে"), p("capacity", "qty", "Total capacity", "মোট ক্যাপাসিটি")], expr: "used / capacity * 100", result: "percent" },
  { id: "yieldRate", name: { en: "Yield rate (percent)", bn: "ইয়িল্ড রেট (শতাংশ)" }, params: [p("outputQty", "qty", "Good output", "ভালো আউটপুট"), p("inputQty", "qty", "Input used", "যা ঢালা হয়েছে")], expr: "outputQty / inputQty * 100", result: "percent" },
  { id: "lossRate", name: { en: "Loss rate (percent)", bn: "লস রেট (শতাংশ)" }, params: [p("outputQty", "qty", "Good output", "ভালো আউটপুট"), p("inputQty", "qty", "Input used", "যা ঢালা হয়েছে")], expr: "(inputQty - outputQty) / inputQty * 100", result: "percent" },
  { id: "seasonalitySpread", name: { en: "Seasonality spread (best month minus weakest month)", bn: "সিজনের ফারাক (সবচেয়ে ভালো মাস বাদ সবচেয়ে কম মাস)" }, params: monthParams, expr: `max(${monthList}) - min(${monthList})`, result: "money" },
  { id: "seasonalitySpreadPct", name: { en: "Seasonality spread (percent of best month)", bn: "সিজনের ফারাক (সেরা মাসের শতাংশ)" }, params: monthParams, expr: `(max(${monthList}) - min(${monthList})) / max(${monthList}) * 100`, result: "percent" },
  { id: "shareOfMoney", name: { en: "Share of a total (percent), money", bn: "মোটের কত শতাংশ (টাকা)" }, params: [p("part", "money", "The part", "অংশ"), p("whole", "money", "The whole", "মোট")], expr: "part / whole * 100", result: "percent" },
  { id: "shareOfQty", name: { en: "Share of a total (percent), quantity", bn: "মোটের কত শতাংশ (পরিমাণ)" }, params: [p("partQty", "qty", "The part", "অংশ"), p("wholeQty", "qty", "The whole", "মোট")], expr: "partQty / wholeQty * 100", result: "percent" },
  { id: "occupancy", name: { en: "Occupancy (percent)", bn: "অকুপেন্সি (শতাংশ)" }, params: [p("occupiedUnits", "count", "Units occupied or sold", "যতগুলো ভরেছে বা বিক্রি হয়েছে"), p("availableUnits", "count", "Units available", "মোট যতগুলো ছিল")], expr: "occupiedUnits / availableUnits * 100", result: "percent" },
  { id: "revenuePerCapacity", name: { en: "Revenue per unit of capacity", bn: "প্রতি ইউনিট ক্যাপাসিটিতে বিক্রি" }, params: [revenue, p("capacityUnits", "qty", "Units of capacity", "ক্যাপাসিটির ইউনিট")], expr: "revenue / capacityUnits", result: "money" },
  { id: "loadFactor", name: { en: "Load factor (percent)", bn: "লোড ফ্যাক্টর (শতাংশ)" }, params: [p("usedLoad", "qty", "Load carried", "যতটা বহন হয়েছে"), p("availableLoad", "qty", "Load available", "যতটা বহনের জায়গা ছিল")], expr: "usedLoad / availableLoad * 100", result: "percent" },
];

const byId = new Map(LIB_FORMULAS.map((f) => [f.id, f]));
export const getLibFormula = (id: string): LibFormula | undefined => byId.get(id);

/** Replace whole-word parameter ids in the library expression with the family's input ids. Returns null if the map is incomplete. */
export function expandLib(lib: LibFormula, map: Record<string, string>): { expr: string; needs: string[] } | null {
  for (const prm of lib.params) if (typeof map[prm.id] !== "string") return null;
  const expr = lib.expr.replace(/[A-Za-z][A-Za-z0-9]*/g, (w) => (lib.params.some((x) => x.id === w) ? (map[w] as string) : w));
  const needs: string[] = [];
  for (const prm of lib.params) { const id = map[prm.id] as string; if (!needs.includes(id)) needs.push(id); }
  return { expr, needs };
}
