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
wb.save(dst)
print("updated", len(req_of), "requirement rows")
