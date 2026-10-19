@i need to # Person A — Mac M1: Backend + Local AI (demo build)

**Goal:** a FastAPI server on the Mac that serves realistic, *correctly modelled* numbers for ~220 investors, plus three local-AI endpoints (meeting extraction, client brief, audio transcription). This is a demo build: investor details the CSV lacks are generated deterministically from it, and that is stated on a slide.

**You own:** `backend/`, Ollama, Whisper, the demo data story, and the final recording machine (the Mac runs everything for the video, Wi-Fi off).

**Person B (Fedora)** builds the React UI against mock data with the *exact same JSON shapes* as below. Do not rename fields without telling them.

---

## 0. Timeline (≈5.5 hours)

| Time | Do | Done when |
| --- | --- | --- |
| 0:00–0:20 | Setup (Section 1), create repo, push empty `backend/` + `frontend/` folders | `uvicorn` runs, `ollama run llama3.2:3b` answers |
| 0:20–0:40 | Open `Investors List.csv`, adjust the column picker (Section 3) | `/api/triage` returns 220 rows with sensible names and AUM |
| 0:40–2:00 | Paste `main.py`, run, sanity-check 3 clients by hand | Numbers look plausible; waterfall sums to the gap |
| 2:00–3:00 | Pick 3 demo clients (Section 5), tune seeds/overrides so each tells its story | Critical, Breach, Aligned clients chosen and noted for B |
| 3:00–3:45 | Whisper setup + record 2 sample clips (Section 4) | `/api/transcribe` returns text |
| 3:45–4:30 | Test `/api/extract` and `/api/brief` 5 times each; tighten prompts | Extraction fills the right fields; brief shows `verified: true` |
| 4:30–5:00 | Pull B's frontend onto the Mac, `npm i && npm run dev`, full run-through | Whole flow works with Wi-Fi **off** |
| 5:00–5:30 | Record the video (script at end) | Video file saved |

Push to git after every working step. B pulls nothing from you until 4:30 except this contract.

---

## 1. Setup (Mac)

```bash
# Python deps
mkdir -p adviceguard/backend && cd adviceguard/backend
python3 -m venv .venv && source .venv/bin/activate
pip install fastapi "uvicorn[standard]" pandas numpy requests python-multipart

# Ollama model (already installed)
ollama pull llama3.2:3b
ollama run llama3.2:3b "say ok"     # confirm it answers, then Ctrl+D

# Whisper + ffmpeg (needed only for audio upload; text paste works without)
brew install whisper-cpp ffmpeg
mkdir -p models
curl -L -o models/ggml-small.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin
which whisper-cli || which whisper-cpp    # note which name exists; set WHISPER_BIN in main.py

# Node, for the final run of B's frontend on this Mac
brew install node
```

Copy `Investors List.csv` into `backend/` as `investors_list.csv`.

Run: `uvicorn main:app --reload --host 0.0.0.0 --port 8000`
Check: http://localhost:8000/docs

---

## 2. The model (what the numbers mean — say this in the demo)

All returns are % over the 12 months since the last advice.

- **Advice-expected** = target weights × assumed class returns at the time of advice.
- **Policy benchmark** = target weights × what each class index actually returned.
- **Actual** = actual weights × actual fund returns (time-weighted).
- **Gap = market + allocation + selection** (Brinson). Then **behaviour = investor XIRR − actual TWR** (paused SIPs, panic redemptions).
- **Advice Health Score** = 100 × (1 − Σ weight × min(1, deviation ÷ tolerance)) over Goal (0.35), Advice delivery (0.25), Risk (0.20), Allocation (0.20). Tolerances depend on the risk profile. Market effect is shown but **not** penalised.
- **Priority** = (100 − AHS) × money at stake × urgency (time to goal) × staleness (days since contact). A mandate breach jumps the queue.
- **The LLM never produces numbers.** Every number in a generated brief is checked against the engine's facts.

---

## 3. `backend/main.py` (paste whole)

```python
"""AdviceGuard demo backend.  Run: uvicorn main:app --reload --host 0.0.0.0 --port 8000"""
import json, math, re, subprocess, tempfile
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

HERE = Path(__file__).parent
CSV_PATH = HERE / "investors_list.csv"
OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL = "llama3.2:3b"
WHISPER_BIN = "whisper-cli"                 # or "whisper-cpp" on older brew installs
WHISPER_MODEL = HERE / "models" / "ggml-small.bin"

# ---------------- Domain assumptions (all editable "firm settings") ----------------
ASSETS = ["Equity", "Debt", "Gold", "Cash"]
TARGETS = {"Conservative": [0.30, 0.60, 0.05, 0.05],
           "Moderate":     [0.55, 0.35, 0.05, 0.05],
           "Aggressive":   [0.75, 0.15, 0.05, 0.05]}
CMA   = np.array([0.12, 0.07, 0.08, 0.06])    # return assumptions used when advice was given
BENCH = np.array([0.04, 0.075, 0.18, 0.065])  # demo scenario: what each class index did in 12 months
VOL   = np.array([0.16, 0.04, 0.14, 0.005])
CORR  = np.array([[1, .1, -.1, 0], [.1, 1, .2, 0], [-.1, .2, 1, 0], [0, 0, 0, 1]])
COV   = np.outer(VOL, VOL) * CORR
VOL_CAP = {"Conservative": 0.07, "Moderate": 0.10, "Aggressive": 0.14}
GOAL_TARGET = {"Conservative": 85, "Moderate": 80, "Aggressive": 70}
TOL = {"Conservative": dict(goal=15, delivery=2, risk=2, alloc=5),
       "Moderate":     dict(goal=20, delivery=3, risk=3, alloc=7.5),
       "Aggressive":   dict(goal=25, delivery=4, risk=4, alloc=10)}
WEIGHTS = dict(goal=0.35, delivery=0.25, risk=0.20, alloc=0.20)
MONTHS = pd.date_range("2025-11-01", periods=12, freq="MS").strftime("%b %y").tolist()

# ---------------- CSV loading (adjust the keywords to your columns) ----------------
def pick(df, *keys):
    for c in df.columns:
        if any(k in c.lower() for k in keys):
            return c
    return None

def to_num(v):
    try:
        return float(str(v).replace(",", "").replace("₹", "").strip())
    except Exception:
        return None

def norm_risk(v):
    s = str(v).lower()
    if any(k in s for k in ("conserv", "low")): return "Conservative"
    if any(k in s for k in ("aggress", "high")): return "Aggressive"
    if any(k in s for k in ("mod", "med", "bal")): return "Moderate"
    return None

def load_rows():
    df = pd.read_csv(CSV_PATH) if CSV_PATH.exists() else \
        pd.DataFrame({"Name": [f"Investor {i:03d}" for i in range(1, 221)]})
    name_c = pick(df, "name", "investor", "client")
    risk_c = pick(df, "risk")
    aum_c = pick(df, "aum", "portfolio value", "corpus", "invest", "amount", "value")
    print(f"[csv] name={name_c} risk={risk_c} aum={aum_c} rows={len(df)}")
    rows = []
    for i, r in df.reset_index(drop=True).iterrows():
        rows.append({"idx": i,
                     "name": str(r[name_c]) if name_c else f"Investor {i + 1:03d}",
                     "risk": norm_risk(r[risk_c]) if risk_c else None,
                     "aum": to_num(r[aum_c]) if aum_c else None})
    return rows

# ---------------- Engine ----------------
def goal_prob(value, sip_m, years, goal, w, seed, n=2000):
    rng = np.random.default_rng(seed)
    mu, sd = float(w @ CMA), float(math.sqrt(w @ COV @ w))
    v = np.full(n, value, dtype=float)
    for _ in range(years):
        v = v * (1 + rng.normal(mu, sd, n)) + sip_m * 12
    return float((v >= goal).mean() * 100)

def analyse(c, wa, sip=None):
    wt, risk = c["wt"], c["risk"]
    exp_r, pol, act = float(wt @ CMA), float(wt @ BENCH), float(wa @ c["ra"])
    market = pol - exp_r
    alloc = float(((wa - wt) * (BENCH - pol)).sum())
    sel = float((wa * (c["ra"] - BENCH)).sum())
    beh = c["behaviour"]
    vol = float(math.sqrt(wa @ COV @ wa))
    gp = goal_prob(c["aum"], c["sip"] if sip is None else sip, c["years"], c["goal_amount"], wa, c["idx"])
    t = TOL[risk]
    d = {"goal": max(0.0, GOAL_TARGET[risk] - gp),
         "delivery": max(0.0, -(alloc + sel + beh) * 100),
         "risk": max(0.0, (vol - VOL_CAP[risk]) * 100),
         "alloc": 50 * float(np.abs(wa - wt).sum())}          # half-sum = share to trade
    z = {k: min(1.0, d[k] / t[k]) for k in d}
    ahs = round(100 * (1 - sum(WEIGHTS[k] * z[k] for k in z)))
    return dict(wa=wa, exp=exp_r, pol=pol, act=act, market=market, alloc=alloc, sel=sel,
                beh=beh, xirr=act + beh, vol=vol, gp=gp, d=d, z=z, ahs=ahs)

def make_client(row):
    i = row["idx"]
    rng = np.random.default_rng(1000 + i)
    risk = row["risk"] or str(rng.choice(list(TARGETS), p=[.3, .45, .25]))
    wt = np.array(TARGETS[risk])
    wa = np.clip(wt + rng.normal(0, 0.05, 4), 0, None); wa = wa / wa.sum()
    ra = BENCH + rng.normal(0, 1, 4) * np.array([0.025, 0.006, 0.004, 0.0])
    sip_paused = bool(rng.random() < 0.25)
    beh = -abs(float(rng.normal(0.012, 0.008))) if (sip_paused or rng.random() < 0.1) else float(rng.normal(0, 0.002))
    aum = row["aum"] or float(np.round(rng.lognormal(np.log(4e6), 0.7), -3))
    years = int(rng.integers(2, 21))
    planned_sip = float(np.round(aum * rng.uniform(0.002, 0.01), -2))
    m = float(wt @ CMA)
    proj = aum * (1 + m) ** years + planned_sip * 12 * ((1 + m) ** years - 1) / m
    return {
        "id": f"INV{i + 1:04d}", "idx": i, "name": row["name"], "risk": risk,
        "wt": wt, "wa": wa, "ra": ra, "behaviour": beh, "aum": aum, "years": years,
        "goal": str(rng.choice(["Retirement", "Child education", "House purchase", "Wealth creation"])),
        "goal_year": 2026 + years, "goal_amount": float(np.round(proj * rng.uniform(0.85, 1.3), -4)),
        "planned_sip": planned_sip, "sip": planned_sip * (0.3 if sip_paused else 1.0), "sip_paused": sip_paused,
        "breach": "Holds a restricted sector (Tobacco)" if rng.random() < 0.07 else None,
        "days_since_contact": int(rng.integers(10, 300)),
    }

CLIENTS = {c["id"]: c for c in (make_client(r) for r in load_rows())}
for c in CLIENTS.values():
    c["a"] = analyse(c, c["wa"])
MEDIAN_AUM = float(np.median([c["aum"] for c in CLIENTS.values()]))

# ---------------- Presentation helpers ----------------
def tags(c, a):
    t = []
    if a["beh"] < -0.012: t.append("Redeems in drawdowns")
    elif not c["sip_paused"]: t.append("SIP-consistent")
    if c["sip_paused"]: t.append("SIP paused")
    if a["wa"][3] > 0.10: t.append("High idle cash")
    return t

def status_of(c, a):
    if c["breach"] or a["ahs"] < 60: return "Critical"
    return "Moderate" if a["ahs"] < 80 else "Aligned"

def reasons(c, a):
    diff = (a["wa"] - c["wt"]) * 100
    k = int(np.argmax(np.abs(diff)))
    deliv = (f"SIP paused, timing cost {a['beh'] * 100:.1f}%" if a["beh"] < -0.01
             else f"Funds lag benchmark by {-a['sel'] * 100:.1f}%")
    cands = [
        (WEIGHTS["alloc"] * a["z"]["alloc"], f"{ASSETS[k]} {diff[k]:+.0f} pp vs target"),
        (WEIGHTS["goal"] * a["z"]["goal"], f"Goal probability {a['gp']:.0f}% (target {GOAL_TARGET[c['risk']]}%)"),
        (WEIGHTS["risk"] * a["z"]["risk"], f"Volatility {a['vol'] * 100:.1f}% vs {VOL_CAP[c['risk']] * 100:.0f}% cap"),
        (WEIGHTS["delivery"] * a["z"]["delivery"], deliv),
    ]
    out = [txt for s, txt in sorted(cands, reverse=True) if s > 0.01][:2]
    return ([c["breach"]] if c["breach"] else []) + out or ["Within all tolerances"]

def opportunity(c, a):
    if a["gp"] >= GOAL_TARGET[c["risk"]] + 10 and c["years"] <= 5:
        return "Goal ahead of plan: consider de-risking"
    if a["wa"][3] > 0.10:
        return f"Idle cash {a['wa'][3] * 100:.0f}%: deploy"
    return None

def triage_row(c):
    a = c["a"]
    A = float(np.clip(c["aum"] / MEDIAN_AUM, 0.5, 2.0))
    U = 1.5 if c["years"] <= 3 else 1.2 if c["years"] <= 7 else 1.0
    S = 1 + min(c["days_since_contact"], 180) / 180
    return {
        "id": c["id"], "name": c["name"], "risk_profile": c["risk"], "aum": round(c["aum"]),
        "goal": c["goal"], "goal_year": c["goal_year"], "ahs": a["ahs"], "status": status_of(c, a),
        "priority": round((100 - a["ahs"]) * A * U * S + (1000 if c["breach"] else 0), 1),
        "reasons": reasons(c, a), "breach": c["breach"], "opportunity": opportunity(c, a),
        "days_since_contact": c["days_since_contact"], "tags": tags(c, a),
    }

def pct(x): return round(x * 100, 2)

def detail(c):
    a = c["a"]
    rng = np.random.default_rng(c["idx"] + 7)
    np_ = np.cumsum(rng.normal(0, 0.012, 12)); na = np_ + np.cumsum(rng.normal(0, 0.006, 12))
    timeline = []
    for m in range(1, 13):
        t = m / 12; bridge = math.sin(math.pi * t)       # noise vanishes at the end so lines land on final values
        timeline.append({"month": MONTHS[m - 1],
                         "expected": pct((1 + a["exp"]) ** t - 1),
                         "policy": pct(a["pol"] * t + np_[m - 1] * bridge),
                         "actual": pct(a["act"] * t + na[m - 1] * bridge)})
    gap = a["xirr"] - a["exp"]
    ctrl = a["alloc"] + a["sel"] + a["beh"]
    row = triage_row(c)
    headline = (f"{row['status']}: {gap * 100:+.1f}% vs what the advice expected. "
                f"Market explains {a['market'] * 100:+.1f}%; {ctrl * 100:+.1f}% is controllable "
                f"({row['reasons'][0].lower()}).")
    return {**row,
        "headline": headline,
        "goal_amount": c["goal_amount"],
        "sip": {"planned": c["planned_sip"], "current": round(c["sip"])},
        "tiles": {"goal_prob": round(a["gp"]), "goal_target": GOAL_TARGET[c["risk"]],
                  "volatility": pct(a["vol"]), "vol_cap": pct(VOL_CAP[c["risk"]]),
                  "allocation_drift": round(a["d"]["alloc"], 1), "advice_gap": pct(gap)},
        "allocation": [{"asset": ASSETS[k], "target": pct(c["wt"][k]), "actual": pct(a["wa"][k])} for k in range(4)],
        "returns": {"expected": pct(a["exp"]), "policy": pct(a["pol"]), "actual": pct(a["act"]), "xirr": pct(a["xirr"])},
        "waterfall": [{"label": "Market", "value": pct(a["market"])},
                      {"label": "Allocation", "value": pct(a["alloc"])},
                      {"label": "Selection", "value": pct(a["sel"])},
                      {"label": "Behaviour", "value": pct(a["beh"])}],
        "timeline": timeline,
        "advice": [
            {"date": "2025-10-15", "action": f"Set allocation to {c['wt'][0] * 100:.0f}/{c['wt'][1] * 100:.0f} equity/debt",
             "expected_outcome": f"About {a['exp'] * 100:.1f}% a year", "status": "Executed"},
            {"date": "2026-03-10", "action": f"Continue SIP of Rs {c['planned_sip']:,.0f}/month",
             "expected_outcome": f"{c['goal']} by {c['goal_year']}",
             "status": "Not followed" if c["sip_paused"] else "Executed"},
        ],
    }

def get(iid):
    if iid not in CLIENTS: raise HTTPException(404, "unknown investor")
    return CLIENTS[iid]

# ---------------- API ----------------
app = FastAPI(title="AdviceGuard demo")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/api/health")
def health():
    try: ok = requests.get("http://localhost:11434/api/tags", timeout=2).ok
    except Exception: ok = False
    return {"investors": len(CLIENTS), "ollama": ok}

@app.get("/api/triage")
def triage():
    return sorted((triage_row(c) for c in CLIENTS.values()), key=lambda r: -r["priority"])

@app.get("/api/investors/{iid}")
def investor(iid: str):
    return detail(get(iid))

@app.post("/api/rebalance/{iid}")
def rebalance(iid: str):
    c = get(iid); a = c["a"]
    diff = (c["wt"] - a["wa"]) * 100
    trades = [{"action": "Buy" if d > 0 else "Sell", "asset": ASSETS[k], "detail": f"{abs(d):.1f}% of portfolio"}
              for k, d in enumerate(diff) if abs(d) >= 1]
    sip = c["sip"]
    if c["sip_paused"]:
        trades.append({"action": "Restart SIP", "asset": "SIP", "detail": f"Rs {c['planned_sip']:,.0f}/month"})
        sip = c["planned_sip"]
    if c["breach"]:
        trades.insert(0, {"action": "Exit", "asset": "Restricted holding", "detail": "Switch to a compliant fund"})
    after = analyse(c, c["wt"], sip=sip)
    staggered = "Redeems in drawdowns" in tags(c, a)
    snap = lambda x: {"ahs": x["ahs"], "goal_prob": round(x["gp"]), "volatility": pct(x["vol"])}
    return {"trades": trades,
            "style": "Staggered over 3 months (STP), as the client tends to redeem in dips" if staggered else "Single rebalance",
            "before": snap(a), "after": snap(after)}

# ---- Local LLM: meeting extraction ----
EXTRACT_SCHEMA = {
    "type": "object",
    "properties": {
        "risk_profile": {"type": "string"},
        "target_return_pct": {"type": "number"},
        "target_equity_pct": {"type": "number"},
        "target_debt_pct": {"type": "number"},
        "goal": {"type": "string"},
        "goal_year": {"type": "integer"},
        "monthly_sip": {"type": "number"},
        "restricted_sectors": {"type": "array", "items": {"type": "string"}},
        "advice_items": {"type": "array", "items": {"type": "object", "properties": {
            "action": {"type": "string"}, "expected_outcome": {"type": "string"}}}},
        "life_events": {"type": "array", "items": {"type": "string"}},
        "evidence": {"type": "array", "items": {"type": "object", "properties": {
            "field": {"type": "string"}, "quote": {"type": "string"}}}},
    },
}
EXTRACT_PROMPT = """You extract structured facts from a financial advisor's meeting notes.
Return JSON only. Use only facts stated in the text; omit a field if it is not stated.
risk_profile must be one of Conservative, Moderate, Aggressive.
For every field you fill, add an evidence item quoting the exact sentence it came from.

Meeting notes:
{text}"""

def ollama_chat(prompt, fmt=None, temperature=0.0):
    body = {"model": MODEL, "stream": False, "options": {"temperature": temperature},
            "messages": [{"role": "user", "content": prompt}]}
    if fmt is not None: body["format"] = fmt
    r = requests.post(OLLAMA_URL, json=body, timeout=120)
    r.raise_for_status()
    return r.json()["message"]["content"]

def regex_extract(text):
    out, t = {}, text.lower()
    if m := re.search(r"(\d{2})\s*%?\s*(?:percent\s*)?(?:in\s+)?equit", t): out["target_equity_pct"] = float(m.group(1))
    if m := re.search(r"(\d{2})\s*%?\s*(?:percent\s*)?(?:in\s+)?(?:debt|bond)", t): out["target_debt_pct"] = float(m.group(1))
    if m := re.search(r"sip[^\d]{0,20}([\d,]{4,})", t): out["monthly_sip"] = float(m.group(1).replace(",", ""))
    if m := re.search(r"(20[3-6]\d)", t): out["goal_year"] = int(m.group(1))
    for p in ("conservative", "moderate", "aggressive"):
        if p in t: out["risk_profile"] = p.title()
    return out

class ExtractIn(BaseModel):
    investor_id: str
    text: str

@app.post("/api/extract")
def extract(body: ExtractIn):
    c = get(body.investor_id)
    current = {"risk_profile": c["risk"], "target_equity_pct": pct(c["wt"][0]), "target_debt_pct": pct(c["wt"][1]),
               "goal": c["goal"], "goal_year": c["goal_year"], "monthly_sip": c["planned_sip"]}
    prompt = EXTRACT_PROMPT.format(text=body.text)
    for fmt in (EXTRACT_SCHEMA, "json"):
        try:
            data = json.loads(ollama_chat(prompt, fmt))
            if isinstance(data, dict) and data:
                return {"extracted": data, "current": current, "source": "local LLM"}
        except Exception as e:
            print("[extract] retry:", e)
    return {"extracted": regex_extract(body.text), "current": current, "source": "regex fallback"}

class ApproveIn(BaseModel):
    extracted: dict

@app.post("/api/mandate/{iid}/approve")
def approve(iid: str, body: ApproveIn):
    c, e = get(iid), body.extracted
    if e.get("risk_profile") in TARGETS: c["risk"] = e["risk_profile"]
    if e.get("target_equity_pct") and e.get("target_debt_pct"):
        eq, de = e["target_equity_pct"] / 100, e["target_debt_pct"] / 100
        rest = max(0.0, 1 - eq - de)
        c["wt"] = np.array([eq, de, rest / 2, rest / 2])
    if e.get("goal_year"):
        c["years"] = max(1, int(e["goal_year"]) - 2026); c["goal_year"] = int(e["goal_year"])
    if e.get("monthly_sip"):
        c["planned_sip"] = c["sip"] = float(e["monthly_sip"]); c["sip_paused"] = False
    c["a"] = analyse(c, c["wa"])
    return detail(c)

# ---- Local LLM: grounded client brief ----
BRIEF_PROMPT = """Write a short note (under 120 words) from a financial advisor to their client.
Start with "Dear {{CLIENT}},". Tone: {tone}. Plain language, no jargon.
Explain what happened, why, and what is proposed.
Use ONLY numbers that appear in FACTS, written exactly as given. Do not compute new numbers.

FACTS:
{facts}"""

def numbers_ok(text, facts):
    allowed = json.dumps(facts)
    return all(n in allowed for n in re.findall(r"\d+(?:\.\d+)?", text))

@app.post("/api/brief/{iid}")
def brief(iid: str):
    c = get(iid); a = c["a"]; rb = rebalance(iid)
    facts = {  # the LLM sees an ID, never the name
        "investor_id": c["id"], "goal": c["goal"], "goal_year": str(c["goal_year"]),
        "expected_return_pct": f"{a['exp'] * 100:.1f}", "actual_return_pct": f"{a['xirr'] * 100:.1f}",
        "market_effect_pct": f"{a['market'] * 100:.1f}",
        "goal_probability_now_pct": str(round(a["gp"])), "goal_probability_after_pct": str(rb["after"]["goal_prob"]),
        "proposed_actions": [f"{t['action']} {t['asset']}: {t['detail']}" for t in rb["trades"]],
        "style": rb["style"],
    }
    tone = "calm and reassuring" if "Redeems in drawdowns" in tags(c, a) else "clear and direct"
    for _ in range(2):
        try:
            text = ollama_chat(BRIEF_PROMPT.format(tone=tone, facts=json.dumps(facts, indent=1)), temperature=0.3)
            if numbers_ok(text, facts):
                return {"text": text.strip(), "verified": True, "source": "local LLM"}
        except Exception as e:
            print("[brief] retry:", e)
    text = (f"Dear {{CLIENT}},\n\nOver the last year your portfolio returned {facts['actual_return_pct']}% against the "
            f"{facts['expected_return_pct']}% we planned for; the market accounted for {facts['market_effect_pct']}%. "
            f"To keep your {c['goal'].lower()} goal for {facts['goal_year']} on track, we propose: "
            + "; ".join(facts["proposed_actions"]) + ". I'd like to walk you through this on a short call.")
    return {"text": text, "verified": True, "source": "template"}

# ---- Local speech to text ----
@app.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...)):
    with tempfile.TemporaryDirectory() as td:
        src = Path(td) / (file.filename or "audio")
        src.write_bytes(await file.read())
        wav = Path(td) / "a.wav"
        subprocess.run(["ffmpeg", "-y", "-i", str(src), "-ar", "16000", "-ac", "1", str(wav)], check=True, capture_output=True)
        subprocess.run([WHISPER_BIN, "-m", str(WHISPER_MODEL), "-f", str(wav), "-otxt", "-of", str(Path(td) / "out")],
                       check=True, capture_output=True)
        return {"text": (Path(td) / "out.txt").read_text().strip()}
```

**If the CSV has more useful columns** (goal, SIP, holdings by asset class, returns): use them in `load_rows()` and `make_client()` instead of the random draws. Every real column you wire in makes the "uses the provided data" claim stronger. The startup log line `[csv] name=… risk=… aum=…` shows what was picked up.

---

## 4. Demo inputs

**Sample meeting text** (paste into the Capture screen, or record yourself reading it for the audio demo; QuickTime → File → New Audio Recording, export .m4a):

> Met with the client today. She has just been promoted and wants to retire earlier, in 2040 instead of 2045. She's comfortable staying moderate on risk. We agreed to move to 60 percent equity and 30 percent debt, and to restart her SIP at 40,000 rupees a month from November. She asked us to avoid tobacco and alcohol companies. I expect this to get her back to around 11 percent a year.

Record two clips: this one and one shorter variant. Test `/api/transcribe` with both before recording the video.

---

## 5. Pick the three demo clients (2:00–3:00)

Run in a Python shell inside `backend/`:

```python
from main import CLIENTS, triage_row
rows = sorted((triage_row(c) for c in CLIENTS.values()), key=lambda r: -r["priority"])
crit = [r for r in rows if r["status"] == "Critical" and not r["breach"] and "SIP paused" in r["tags"]][:3]
breach = [r for r in rows if r["breach"]][:3]
aligned = [r for r in rows if r["status"] == "Aligned"][:3]
for r in crit + breach + aligned: print(r["id"], r["name"], r["ahs"], r["status"], r["reasons"])
```

Choose one of each. Check the critical client's rebalance raises AHS by a visible margin (`POST /api/rebalance/<id>` in /docs). Send B the three IDs and names.

---

## 6. Acceptance checks before recording

- [ ] `/api/triage` returns ~220 rows, sorted, breach clients near the top
- [ ] For a critical client: `returns.expected + sum(waterfall values) ≈ returns.xirr` (within 0.05)
- [ ] `/api/extract` with the sample text fills equity 60, debt 30, SIP 40000, goal year 2040, restricted sectors
- [ ] `/api/mandate/{id}/approve` changes that client's AHS and the triage order
- [ ] `/api/brief/{id}` returns `verified: true` with source `local LLM` at least 4 out of 5 times
- [ ] All of the above with **Wi-Fi off** (Ollama and Whisper are local)

---

## 7. Video script (3 minutes, recorded on the Mac)

1. **0:00** Turn Wi-Fi off on camera. "An advisor has 220 clients and knows 20 well. Which of the other 200 is quietly falling behind?"
2. **0:20** Triage board: ranked, with reason codes; opportunities filter.
3. **0:40** Critical client: headline, then the gap waterfall — market vs allocation vs selection vs behaviour.
4. **1:20** Propose rebalance: staggered because of the behaviour tag; AHS and goal probability before → after.
5. **1:45** Breach client: restricted sector forces Priority 1.
6. **2:05** Capture meeting: upload clip → local transcript → extracted diff with quotes → Approve → AHS changes.
7. **2:35** Client brief: "numbers verified" tick; name added only in the UI.
8. **2:50** "Your top 20 have you. Your next 200 have AdviceGuard."

Mention once on a slide: investor fields missing from the CSV are generated deterministically for the demo; the engine runs unchanged on real data.
