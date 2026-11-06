#!/usr/bin/env python3
"""Contact sheets for the screenshot matrix (owner order 3 Nov 2026).
Run after: TM_SHOT_MATRIX=1 TM_SHOT_KEEP=<dir> node tools/screenshots.mjs
Usage: python3 tools/looks_sheets.py <dir with the matrix PNGs> [out dir, default evidence/looks-sheets]
One JPEG per look and screen: 8 tiles, top row 100% text, bottom row 200% text; in each row English light, English dark, Bangla light, Bangla dark."""
import os, sys
from PIL import Image
src = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else "evidence/looks-sheets"
os.makedirs(out, exist_ok=True)
DESIGNS = ["light-futuristic", "ink-paper", "emerald-obsidian", "broadsheet"]
ROUTES = ["today", "journey", "journey/goal/shot-goal", "journey/month", "deen", "settings", "settings/prayer", "settings/privacy", "settings/backup", "diary/plan", "journey/boards", "journey/backward/shot-goal", "more/where",
    "settings/look", "settings/data", "settings/data/start-real", "settings/plan", "settings/connections", "settings/delete", "settings/about", "settings/backup/restore", "journey/risks", "diary/team", "diary/ventures", "diary/money", "habits", "journey/goals", "more/status",
    "diary/intake/4", "journey/week", "journey/review", "journey/universe", "topics", "topic/procrastination", "print/plan", "settings/lock", "capture", "stuck", "focus/shot-t2", "reward", "deen/plans", "more/glossary", "more/safety", "more/fields"]
TW, TH, GAP = 180, 370, 3
for d in DESIGNS:
    for r in ROUTES:
        name = r.replace("/", "_"); sheet = Image.new("RGB", (4 * (TW + GAP) + GAP, 2 * (TH + GAP) + GAP), (136, 136, 136))
        for row, size in enumerate(["100", "200"]):
            for col, (lang, scheme) in enumerate([("en", "light"), ("en", "dark"), ("bn", "light"), ("bn", "dark")]):
                f = os.path.join(src, f"{d}-{lang}-{scheme}-{size}-{name}.png")
                im = Image.open(f).convert("RGB").resize((TW, TH), Image.LANCZOS)
                sheet.paste(im, (GAP + col * (TW + GAP), GAP + row * (TH + GAP)))
        sheet.save(os.path.join(out, f"{d}-{name}.jpg"), quality=50, optimize=True)
print("sheets:", len(os.listdir(out)))
