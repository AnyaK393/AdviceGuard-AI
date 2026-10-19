"""Acceptance checks (Section 6). Run with the server up:  python smoke_test.py [runs]"""
import sys, time
from collections import Counter
from pathlib import Path

import requests

B = "http://localhost:8000/api"
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 5
TEXT = (Path(__file__).parent / "samples" / "meeting.txt").read_text()

print("health:", requests.get(f"{B}/health").json())
rows = requests.get(f"{B}/triage").json()
print("triage:", len(rows), dict(Counter(r["status"] for r in rows)), "| top is breach:", bool(rows[0]["breach"]))

bad = 0
for r in rows:
    d = requests.get(f"{B}/investors/{r['id']}").json()
    bad += abs(d["returns"]["expected"] + sum(w["value"] for w in d["waterfall"]) - d["returns"]["xirr"]) > 0.05
print("waterfall mismatches:", bad)

iid = next(r["id"] for r in rows if not r["breach"])
want = {"target_equity_pct": 60, "target_debt_pct": 30, "monthly_sip": 40000, "goal_year": 2040}
for _ in range(RUNS):
    t = time.time()
    e = requests.post(f"{B}/extract", json={"investor_id": iid, "text": TEXT}).json()
    x = e["extracted"]
    miss = [k for k, v in want.items() if x.get(k) != v] + ([] if x.get("restricted_sectors") else ["restricted_sectors"])
    print(f"extract {time.time() - t:4.1f}s {e['source']:<14} missing={miss}")

for _ in range(RUNS):
    t = time.time()
    b = requests.post(f"{B}/brief/{iid}").json()
    print(f"brief   {time.time() - t:4.1f}s {b['source']:<14} verified={b['verified']}")
print("\nlast brief:\n" + b["text"])

before = next(r for r in rows if r["id"] == iid)["ahs"]
after = requests.post(f"{B}/mandate/{iid}/approve", json={"extracted": x}).json()["ahs"]
print(f"\napprove: AHS {before} -> {after}")
