# Demo clients

Search the ID in the triage box to jump to a client.

| Story | ID | Name | Data | What to show |
|---|---|---|---|---|
| Breach | INV0066 | Amit Chopra | generated, Aggressive | **#1 on the board.** Restricted sector (Tobacco) overrides the score; rebalance starts with "Exit restricted holding"; AHS 45 → 78 |
| Critical | INV0013 | Tanvi Desai | CSV `GIG13`, gig worker, Noida, Conservative | AHS 20; SIP paused + redeems in drawdowns, so the rebalance is **staggered (STP)**; AHS 20 → 75 |
| Capture | INV0119 | Neha Gupta | generated, Moderate, Retirement 2045 (override in `DEMO_OVERRIDES`) | Upload audio / load sample notes → extract shows 8 changed fields with quotes → Approve → **AHS 21 → 55**, goal probability → ~90% |
| Aligned | INV0017 | Vikram Patel | CSV `REM04`, remittance, Chennai, Aggressive | AHS 80, SIP-consistent: little to do |

Timings on the M1: extract ~9s, brief ~20s (up to ~40s if the first draft fails the number check), transcription ~10s per clip.
Cut those waits in the edit.

## Contract additions (triage rows and investor detail)

New fields, nothing renamed: `source` (`"csv:GIG13"` or `"generated"`), `segment` (`"Gig worker" | "Student" | "Salaried" | "Remittance" | null`), `city` (string or `null`).

## How the CSV is used

`backend/investors_list.csv` is a bank-transaction log (3,494 rows, 50 users, Apr–Jul 2026). Per user:
monthly income and spend → planned SIP (half of savings), savings rate + segment → risk profile,
spending > income → SIP paused, savings → AUM size, and most frequent city. Names are generated
(the CSV has none). Slide line: *"50 clients derived from the provided transactions, 170 simulated; the engine is unchanged on real data."*

## Brief verification

Every number in a drafted brief (sign included) must appear in the engine's facts, or it is redrafted (3 tries), then falls back to a template.
The model never sees the client's name or ID; the UI fills `{CLIENT}` locally.
