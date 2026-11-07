"""Writes public/content/pack-009.json (Bangladesh starter pack, DRAFT). Run: python3 -I tools/make_pack009.py
Rules: general, non-invented wording only. No rates, prices, limits or guarantees. Every entry has kind and reviewer pending.
Entries that depend on local rules (which can change) use source "reviewer": a local reviewer must confirm them before they count as checked."""
import json

def tip(i, topic, tags, tb, te, hb, he, dtype, db, de, kind, link=None, source=None):
    d = {"id": i, "topic": topic, "tags": tags, "title": {"bn": tb, "en": te}, "how": {"bn": hb, "en": he},
         "diagram": {"type": dtype, "bn": db, "en": de}}
    if link: d["appLink"] = link
    d["kind"] = kind
    if source: d["source"] = source
    d["reviewer"] = "pending"
    return d

TIPS = [
 tip("p9-bd-1", "money", ["mobile-money", "safety"], "মোবাইল মানি কীভাবে চলে", "How mobile money works",
     "মোবাইল মানি অ্যাকাউন্টে (যেমন bKash বা Nagad) আপনার ফোন নম্বরের সঙ্গে টাকা জমা থাকে। PIN দিয়ে পাঠান, নিন বা পেমেন্ট করুন; PIN শুধু আপনি জানবেন। পাঠানোর আগে অ্যাপে চার্জ দেখে নিন।",
     "A mobile money account (such as bKash or Nagad) holds money linked to your phone number. You send, receive and pay by confirming with a PIN that only you know. Check the charge shown in the app before you send.",
     "steps", "অফিশিয়াল অ্যাপ খুলুন|চার্জ দেখুন|PIN দিয়ে কনফার্ম করুন", "Open the official app|Check the charge|Confirm with your PIN", "explain", "#/diary/money"),
 tip("p9-bd-2", "environment", ["mobile-money", "digital-safety"], "PIN বা OTP কাউকে দেবেন না", "Never share your PIN or OTP",
     "কোনো কোম্পানি, এজেন্ট বা সাপোর্ট থেকে আপনার PIN বা OTP চাওয়ার দরকার হয় না। কেউ চাইলে থামুন। ফোন কেটে দিন এবং অফিশিয়াল অ্যাপে দেওয়া নম্বরে নিজে যোগাযোগ করুন।",
     "No real company, agent or support person needs your PIN or OTP. If a call or message asks for it, stop. Hang up and use the number shown in the official app instead.",
     "steps", "থামুন|কেটে দিন|অ্যাপের নম্বরে ফোন করুন", "Stop|Hang up|Call the number in the app", "watchout"),
 tip("p9-bd-3", "money", ["budget", "taka"], "টাকায় সহজ মাসিক হিসাব", "A simple monthly plan in taka",
     "মাসের শুরুতে লিখুন কত ইনকাম আসবে এবং কী কী খরচ ঠিক করা (ভাড়া, খাবার, স্কুল, যাতায়াত, মোবাইল)। যা থাকে তা জমানো আর বাড়তি খরচের জন্য। অন্য কারও নয়, নিজের সংখ্যা বসান।",
     "At the start of the month, write what comes in and the fixed costs (rent, food, school, transport, mobile). What is left is for saving and extras. Use your own numbers, not someone else's.",
     "steps", "ইনকাম|ঠিক করা খরচ|যা থাকে", "Income|Fixed costs|What is left", "steps", "#/diary/money"),
 tip("p9-bd-4", "money", ["budget", "family"], "পরিবারের টাকার কথা, এক পাতায়", "Family money talk, on one page",
     "মাসে একবার পরিবারের সবাই 15 মিনিট বসুন। এক পাতায় তিন লাইন লিখুন: কী দরকার, কী চাই, কী জমাব। পাতাটি এমন জায়গায় রাখুন যেখানে সবাই দেখতে পায়।",
     "Example: once a month, sit together as a family for 15 minutes. Write three lines on one page: what we need, what we want, what we put aside. Keep the page where everyone can see it.",
     "matrix", "দরকার|চাই|জমাব|পরের মাস", "Need|Want|Put aside|Next month", "example"),
 tip("p9-bd-5", "money", ["savings", "dps"], "DPS সাধারণভাবে কীভাবে চলে", "How a DPS works, in general",
     "DPS (ডিপোজিট পেনশন স্কিম) ব্যাংকের একটি প্রোডাক্ট: নির্দিষ্ট মেয়াদ ধরে প্রতি মাসে একটি ঠিক করা অঙ্ক জমা দেন, মেয়াদ শেষে জমানো টাকা পান। শর্ত ব্যাংকভেদে আলাদা, তাই শুরুর আগে লিখিত শর্ত চান।",
     "A DPS (deposit pension scheme) is a bank product: you put in a fixed amount every month for a fixed number of years and receive the saved total at the end, plus anything the bank's written terms state. Terms differ by bank, so ask for them in writing first.",
     "steps", "মাসে জমা|মেয়াদ চলে|মেয়াদ শেষে পান", "Monthly deposit|Term runs|Paid at the end", "learn", "#/diary/money", "reviewer"),
 tip("p9-bd-6", "money", ["savings", "dps"], "মাসিক সেভিংস স্কিমে যোগ দেওয়ার আগে", "Before you join a monthly saving scheme",
     "জিজ্ঞেস করুন: এক মাস মিস হলে কী হয়? আগে বন্ধ করা যায় কি, তখন কত পাব? কে এই ব্যাংক বা স্কিম তদারক করে? উত্তর লিখে রাখুন। কেউ নিশ্চিত বড় অঙ্কের কথা বললে থামুন, বিশ্বস্ত কাউকে জিজ্ঞেস করুন।",
     "Ask: what if I miss a month? Can I close early, and what would I get? Who regulates this bank or scheme? Write the answers down. If someone promises a sure big payout, pause and ask a person you trust.",
     "steps", "মিস মাস|আগে বন্ধ|কে তদারক করে", "Missed month|Early close|Who regulates", "watchout"),
 tip("p9-bd-7", "money", ["savings", "sanchaypatra"], "সঞ্চয়পত্র কেনার আগে কী দেখবেন", "Sanchaypatra: what to check",
     "সঞ্চয়পত্র সরকারের জাতীয় সঞ্চয় সার্টিফিকেট, ব্যাংক ও পোস্ট অফিসের মাধ্যমে বিক্রি হয়। নিয়ম, সীমা ও শর্ত সরকার ঠিক করে এবং বদলাতে পারে। সিদ্ধান্তের আগে বর্তমান সরকারি শর্ত দেখে নিন।",
     "Sanchaypatra (national savings certificates) are sold by the government through banks and post offices. Rules, limits and terms are set by the government and can change. Check the current official terms before you decide.",
     "steps", "বর্তমান শর্ত দেখুন|নিজের প্ল্যানের সঙ্গে মেলান|তারপর সিদ্ধান্ত", "Check current terms|Match your plan|Then decide", "learn", None, "reviewer"),
 tip("p9-bd-8", "money", ["savings", "samity"], "সঞ্চয় সমিতিতে যোগ দেওয়ার আগে", "Before joining a savings group (samity)",
     "সমিতিতে সদস্যরা নিয়ম মেনে একসঙ্গে টাকা জমা দেন। যোগ দেওয়ার আগে জানুন: টাকা কে রাখে, হিসাব কে লেখে, সমিতি নিবন্ধিত কি না। নিজেও একটি লিখিত হিসাব রাখুন।",
     "In a savings group, members put in money together on a schedule. Before you join, find out who keeps the money, who writes the records, and whether the group is registered. Keep your own written record too.",
     "steps", "কে টাকা রাখে|কে হিসাব লেখে|নিবন্ধিত কি না", "Who holds the money|Who writes records|Is it registered", "explain"),
 tip("p9-bd-9", "money", ["debt", "loan"], "লোন নেওয়ার আগে", "Before taking a loan",
     "লিখিতভাবে জেনে নিন: মোট কত ফেরত দিতে হবে, মাসে কত, শেষ তারিখ কী, কোনো ফি আছে কি না। অন্তত আরেকটি অফারের সঙ্গে মিলিয়ে দেখুন। যে অঙ্ক নিজের আসা-যাওয়ার টাকা থেকে শোধ করতে পারবেন, সেটুকুই নিন।",
     "Get these in writing: the total you will pay back, the monthly amount, the end date and any fees. Compare with at least one other offer. Borrow only an amount you can repay from the money you already expect to come in.",
     "matrix", "মোট শোধ|মাসিক কিস্তি|শেষ তারিখ|ফি", "Total to repay|Monthly amount|End date|Fees", "watchout", "#/diary/money"),
 tip("p9-bd-10", "money", ["income", "business"], "ঘরের টাকা আর দোকানের টাকা আলাদা রাখুন", "Keep home money and shop money apart",
     "ছোট দোকান থাকলে দোকানের জন্য একটি খাতা বা অ্যাকাউন্ট, ঘরের জন্য আরেকটি রাখুন। নিজের জন্য নির্দিষ্ট দিনে নির্দিষ্ট অঙ্ক তুলুন। এতে দোকান আসলে কেমন চলছে তা বোঝা যায়।",
     "If you run a small shop, use one notebook or account for the shop and another for the home. Take a fixed amount for yourself on a fixed day. This shows how the shop is really doing.",
     "cycle", "দোকানের খাতা|নিজের অঙ্ক|ঘরের খাতা", "Shop book|Your fixed amount|Home book", "explain"),
 tip("p9-bd-11", "money", ["business", "bookkeeping"], "ছোট দোকানের দৈনিক ক্যাশ খাতা", "A daily cash book for a small shop",
     "দোকান বন্ধের সময় তিনটি জিনিস লিখুন: আজ কত এল, আজ কত গেল, ড্রয়ারে কত আছে। বাকির হিসাব আলাদা লিস্টে রাখুন, নাম-তারিখ-অঙ্ক সহ। সপ্তাহে একবার ড্রয়ার গুনে মিলিয়ে নিন।",
     "At closing time write three things: money in today, money out today, and cash in the drawer. Keep credit sales (baki) in a separate list with name, date and amount. Count the drawer once a week and compare.",
     "steps", "আজ এল|আজ গেল|ড্রয়ারে আছে", "In today|Out today|In the drawer", "steps", "#/diary/money"),
 tip("p9-bd-12", "execution", ["business", "licence"], "ট্রেড লাইসেন্স: কোথা থেকে শুরু", "Trade licence: where to start",
     "বেশির ভাগ ছোট ব্যবসায় স্থানীয় সিটি করপোরেশন, পৌরসভা বা ইউনিয়ন পরিষদ থেকে ট্রেড লাইসেন্স লাগে। আপনার কাজের জন্য আজ কোন কাগজ ও ফি লাগে তা তাদের কাছে জিজ্ঞেস করুন। নিয়ম জায়গা ও ব্যবসাভেদে আলাদা।",
     "Most small businesses need a trade licence from the local city corporation, municipality or union council. Ask them which papers and fees apply to your kind of work today. Rules differ by place and by business.",
     "steps", "স্থানীয় অফিস খুঁজুন|কাগজ জানুন|আবেদন করুন", "Find the local office|Ask what papers|Apply", "learn", None, "reviewer"),
 tip("p9-bd-13", "skills", ["freelance", "career"], "ফ্রিল্যান্সিং: আগে লিখে ঠিক করুন", "Freelancing basics: agree it first",
     "কাজ শুরুর আগে মেসেজে লিখে নিন: কী দেবেন, কবে দেবেন, কতবার বদল ধরা আছে, আর কীভাবে ও কবে টাকা পাবেন। এই চ্যাটই আপনার রেকর্ড। অগ্রিম কিছু ঠিক হলে সেটাও লিখুন।",
     "Before you start, write in a message: what you will deliver, by when, how many changes are included, and how and when you get paid. The chat is your record. If part is paid in advance, write that too.",
     "steps", "কী দেবেন|কবে|কত বদল|কীভাবে পেমেন্ট", "What|By when|How many changes|How paid", "steps"),
 tip("p9-bd-14", "skills", ["career", "job-search"], "চাকরি খোঁজার একটি ছোট সপ্তাহ", "A small job-search week",
     "পরিচিত 5টি প্রতিষ্ঠান বা মানুষ বেছে নিন। প্রত্যেককে ছোট মেসেজ পাঠান: আপনি কে, একটি স্কিল, একটি প্রশ্ন। কবে পাঠালেন লিখে রাখুন; এক সপ্তাহ পরে একবার ফলো-আপ করুন।",
     "Example: pick 5 employers or people you know. Send each a short message: who you are, one skill, one question. Note the date you sent it, and follow up once after a week.",
     "cycle", "বেছে নিন|মেসেজ|তারিখ লিখুন|ফলো-আপ", "Pick|Message|Note the date|Follow up", "example", "#/journey/goals"),
 tip("p9-bd-15", "environment", ["digital-safety", "shopping"], "অনলাইনে নতুন বিক্রেতাকে দেওয়ার আগে", "Check before paying a new online seller",
     "এমন ফোন নম্বর আছে কি যাতে ফোন করা যায়? পেমেন্টের পর রসিদ চান। প্রথম অর্ডারে সম্ভব হলে ডেলিভারির সময় পেমেন্টের অপশন নিন। পণ্যের ছবি ও কথাবার্তা সেভ করে রাখুন।",
     "Is there a phone number you can call? Ask for a receipt after paying. For a first order, choose pay-on-delivery when it is offered. Save the product photos and the chat.",
     "matrix", "ফোন নম্বর|রসিদ|ডেলিভারিতে পেমেন্ট|চ্যাট সেভ", "Phone number|Receipt|Pay on delivery|Save chat", "watchout"),
 tip("p9-bd-16", "decisions", ["decision", "money"], "'নিশ্চিত দ্বিগুণ' শুনলে ধীর হোন", "Slow down when you hear 'surely double'",
     "যে অফারে বলা হয় টাকা দ্রুত নিশ্চিত দ্বিগুণ হবে, সেখানে তাড়াহুড়ো নয়, থামার কারণ আছে। একদিন অপেক্ষা করুন, বিশ্বস্ত দুইজনকে জিজ্ঞেস করুন, আর কে এটি তদারক করে তা জানুন।",
     "An offer that says your money will quickly and surely double is a reason to slow down, not to hurry. Wait one day, ask two people you trust, and find out who regulates the offer.",
     "steps", "এক দিন অপেক্ষা|দুইজনকে জিজ্ঞেস|কে তদারক করে", "Wait one day|Ask two people|Who regulates", "watchout"),
 tip("p9-bd-17", "money", ["regulation", "safety"], "'তদারকি আছে' মানে কী", "What does 'regulated' mean",
     "তদারকির আওতার ব্যাংক বা মোবাইল মানি সেবা সরকারি কর্তৃপক্ষের নিয়ম মানে এবং অভিযোগ নেয়। প্রোভাইডারকে জিজ্ঞেস করুন কোন কর্তৃপক্ষ তদারক করে ও অভিযোগ কীভাবে করবেন। লিখিত শর্ত ও রসিদ সমস্যায় কাজে লাগে।",
     "A regulated bank or mobile money service answers to a government authority that sets rules and takes complaints. Ask the provider which authority regulates it and how to complain. Written terms and receipts help if there is a problem.",
     "steps", "কে তদারক করে|অভিযোগের পথ|লিখিত শর্ত", "Who regulates|How to complain|Written terms", "learn", None, "general"),
 tip("p9-bd-18", "money", ["budget", "taka"], "দরকার, চাই আর জমানো: ছোট উদাহরণ", "Needs, wants and saving: a small example",
     "উদাহরণ: ভাড়া আর খাবার দরকার। ফোনের নতুন কভার চাই। প্রতি মাসে ছোট হলেও কিছু আলাদা রাখা জমানো। প্রতিটি খরচ কোন দলে পড়ে তা লিখে ফেলুন।",
     "Example: rent and food are needs. A new phone cover is a want. Putting something aside each month, even if small, is saving. Write which group each cost belongs to.",
     "matrix", "দরকার|চাই|জমানো|জানি না", "Need|Want|Saving|Not sure", "example", "#/diary/money"),
]

pack = {
 "schema": "tm-content-pack", "schemaVersion": 1, "packId": "pack-009", "reviewStatus": "pending_reviewer", "license": "original",
 "description": "DRAFT Bangladesh starter pack: original, general entries (Bangla and English) on mobile money safety, saving schemes in general terms, budgeting in taka, small-shop basics, freelancing and job search. No rates, prices, limits or guarantees; entries that depend on local rules are marked source reviewer and must be confirmed by a local reviewer. Reviewer pending on every entry. Shown as যাচাই হয়নি until a reviewer signs off.",
 "tips": TIPS,
}
with open("public/content/pack-009.json", "w", encoding="utf-8") as f:
    json.dump(pack, f, ensure_ascii=False, indent=2); f.write("\n")
print(len(TIPS), "tips written")
