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
wb.save(dst)
print("updated", len(req_of), "requirement rows")
