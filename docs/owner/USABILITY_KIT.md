# 5-user usability kit

Goal: find out whether a new person can use the app "like a diary" without help. Five people: you and four people you trust. Each uses **their own phone** and **Demo data only**. About 15 minutes each.

বাংলা সারসংক্ষেপ: ৫ জন (আপনি + ৪ জন বিশ্বস্ত মানুষ)। প্রত্যেকের নিজের ফোনে, শুধু Demo ডেটা। আপনি শুধু দেখবেন ও লিখবেন, সাহায্য করবেন না। সফল মানে: নতুন কেউ 3 মিনিটের মধ্যে সাহায্য ছাড়া প্রথম ধাপ শেষ করে।

## 1. Before you start
- Ask for consent (read the note in section 2). If the person says no, stop. Nothing is wrong.
- Ask them to open the link (the builder gives the link when the site is online) and install it if they wish.
- Do **not** ask them to type real names, numbers, money, passwords or private notes. Tell them to invent a goal.
- Sit next to them. Say nothing about how to use it. Only say: "Please say out loud what you are thinking."

## 2. Consent note (read aloud, plain words)
English: "This is a test of the app, not a test of you. If something is confusing, that is the app's fault. We will write down what you tap and where you get stuck. We will not record your voice or screen unless you agree. We will not write your name. You can stop at any time. Please use made-up information only."

বাংলা: "এটা অ্যাপের পরীক্ষা, আপনার পরীক্ষা নয়। কিছু বুঝতে অসুবিধা হলে সেটা অ্যাপের দোষ। আপনি কোথায় চাপ দিলেন আর কোথায় আটকালেন তা আমরা লিখে রাখব। আপনি রাজি না হলে ভয়েস বা স্ক্রিন রেকর্ড হবে না। আপনার নাম লেখা হবে না। যেকোনো সময় থামতে পারেন। দয়া করে শুধু বানানো তথ্য ব্যবহার করুন।"

Person says yes: [ ]  Recording allowed (optional): [ ] yes [ ] no

## 3. Tasks (give one at a time, read exactly)
| # | Task (say this) | বাংলায় বলুন | Success means | Time limit |
|---|---|---|---|---|
| T1 | "Open the app and start with demo data." | "অ্যাপ খুলে Demo ডেটা দিয়ে শুরু করুন।" | Reaches the 3-screen start or Today | 1 min |
| T2 | "Write one thing you want to move forward, and one small step for it." | "এগিয়ে নিতে চান এমন একটি বিষয় এবং তার একটি ছোট ধাপ লিখুন।" | Goal and step saved | 3 min |
| T3 | "Finish that step and tell me what you see." | "ধাপটি শেষ করুন, কী দেখলেন বলুন।" | Step marked done; person can say what happened | 1 min |
| T4 | "Find where you would write what you spent today." | "আজ কী খরচ করেছেন তা কোথায় লিখবেন খুঁজে বের করুন।" | Reaches the Money / Diary entry without help | 2 min |
| T5 | "Change the language to English (or Bangla) and back." | "ভাষা ইংরেজিতে (বা বাংলায়) বদলান, তারপর আবার ফেরান।" | Language changes both ways | 1 min |
| T6 | "Find how to save a backup file." | "ব্যাকআপ ফাইল সেভ করার জায়গা খুঁজুন।" | Reaches More > Data | 2 min |

## 4. What to record (one form per person)
```
Person code (P1..P5, no names): ____   Age band: ____   Phone: ____   Date: ____
Language they chose: EN / BN / Mix        Used their own phone: yes / no
For each task T1..T6:
  Done without help: yes / no      Time (seconds): ____ (leave blank if unknown, do not guess)
  Where they hesitated or tapped the wrong thing: ____
  Words they did not understand: ____
  Exact quote (if any): ____
Moments of calm or delight (one line): ____
Anything that felt like pressure, a grade or a warning: ____
Would you open this again tomorrow? yes / no / not sure — why: ____
One thing to remove, one thing to add: ____
```
Rules for the observer: write facts, not opinions. Do not help for 2 minutes of being stuck, then note "helped at __:__". Never judge the person.

## 5. How to read the results
- Count, per task, how many of the 5 finished without help. A task that fewer than 4 of 5 finished is a fix for the builder.
- Time to first step (T2 + T3 together) should be under 3 minutes for a new person. Report the numbers you measured, even if bad.
- List every unknown word. These go to the Bangla review sheet (docs/owner/BANGLA_REVIEW_SHEET.md).
- Report any "pressure" or "grade" feeling: it breaks the product rules and gets fixed first.

## 6. What the builder will do afterwards
Put the five forms into `docs/audit/` (codes only, no names), fix the top 5 problems, and update the Register rows TM-TST-010, 066, 067 and 171 **only to what the people actually showed**. Until five sessions are done these rows stay Partial.
