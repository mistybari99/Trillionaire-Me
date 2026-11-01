"""Write evidence-backed status into a COPY of the Register. Rows without passing evidence stay untouched."""
import json, sys, openpyxl
src, dst = sys.argv[1], sys.argv[2]
res = json.load(open("evidence/traceability-result.json"))["results"]
wb = openpyxl.load_workbook(src)
tests = wb["Tests v2"]; reqs = wb["Requirements v2"]
req_of = {}
for r in tests.iter_rows(min_row=4):
    tid = r[0].value
    if tid in res and res[tid]["evidenceOk"]:
        x = res[tid]
        r[8].value = f"{x['outcome']} (G1) — {x['scope']}" if x["outcome"] == "Pass" else f"Partial (G1) — {x['scope']}"
        r[9].value = "; ".join(x["artifacts"])
        req_of[r[1].value] = x
for r in reqs.iter_rows(min_row=4):
    x = req_of.get(r[0].value)
    if x:
        r[14].value = ("Verified for G1 scope (automated evidence)" if x["outcome"] == "Pass" else "Partial — automated part passes; manual/human gate pending") + " — see Tests v2"
new = json.load(open("docs/register/new-requirements.json", encoding="utf-8"))
have = {r[0].value for r in reqs.iter_rows(min_row=4)}
for n in new:
    if n["id"] not in have:
        reqs.append([n["id"], "Life Success system", n["requirement"], "U", "", "R1", n["gate"], n["gate"], "FIRST-BUILD (G1-G3)", "", "", "", "", "", "Not verified — no build"])
# Change Log line (the copy is always rebuilt from the untouched original, so this never duplicates)
npass = sum(1 for x in req_of.values() if x["outcome"] == "Pass")
npart = sum(1 for x in req_of.values() if x["outcome"] != "Pass")
data = json.load(open("evidence/traceability-result.json"))
wb["Change Log"].append(["Evidence", f"{data['generated'][:10]}: statuses written from real runs only ({data['totalTests']} vitest tests, {data['failed']} failed; browser e2e). {len(req_of)} requirement rows linked to tests: Verified (Pass) {npass}, Partial {npart}. Verified means every linked automated check passed in that run; Partial rows keep their device, human or usability gate open. Original v2_0 file untouched. Details: docs/register/EVIDENCE_REFRESH.md"])
# Stale-text fixes in the COPY only (original v2_0 is never touched). Each fix is matched by id/anchor, so it is safe to re-run.
dec = wb["Decisions"]
for r in dec.iter_rows(min_row=1):
    if r[0].value == "D-B":
        r[6].value = "APPROVED by owner, 25 Oct 2026 (real data stays on the device only, per-device consent tick; nothing leaves the device). See DECISIONS_LOG.md"
    if r[0].value == "D-E":
        r[6].value = "APPROVED 22 Oct 2026 (Ink & Paper); UPDATED by owner 25 Oct 2026: default look is Light / Colorful / Futuristic, Ink & Paper stays as a Design version option"
sh = wb["Start Here"]
if sh["B4"].value and str(sh["B4"].value).startswith("Specification stage"):
    sh["B4"].value = "Original v2.0 text: specification stage, nothing implemented. Since then the app has been built gate by gate (G1 to G4 work, offline PWA). Status cells in this COPY come only from real test runs; see Tests v2 and Change Log."
sm = wb["Summary"]
if sm["A46"].value and "by design at specification stage" in str(sm["A46"].value):
    sm["A46"].value = "Note: origin counts overlap (a row can carry two tags). 'Implemented (verified)' counts only rows whose linked automated checks passed in a real run (see Change Log); it was 0 in the v2.0 original."
wb["Change Log"].append(["Docs", "1 Nov 2026: copy only. Decisions sheet D-B now APPROVED (25 Oct) and D-E updated (Light/Colorful/Futuristic default); Start Here and Summary note no longer say nothing is implemented. Original v2_0 file untouched."])
wb.save(dst)
print("updated", len(req_of), "requirement rows")
