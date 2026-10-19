# Demo clients (send to Person B)

| Story | ID | Name | Data | What to show |
|---|---|---|---|---|
| Critical | INV0013 | Aditya Mehta | CSV `GIG13`, gig worker, Noida, Conservative | AHS 20; SIP paused + redeems in drawdowns; rebalance is **staggered (STP)**, AHS 20 → 75 |
| Breach | INV0066 | Tanvi Verma | generated, Aggressive | Restricted sector (Tobacco) puts it at Priority 1; AHS 45 → 78 |
| Aligned | INV0017 | Varun Chopra | CSV `REM04`, remittance, Chennai, Aggressive | AHS 80, SIP-consistent: "nothing to do" |

## Contract additions (triage rows and investor detail)

Three new fields; nothing was renamed:

- `source`: `"csv:GIG13"` for the 50 users built from the transaction CSV, `"generated"` for the other 170
- `segment`: `"Gig worker" | "Student" | "Salaried" | "Remittance" | null`
- `city`: string or `null`

## How the CSV is used

`backend/investors_list.csv` is a bank-transaction log (3,494 rows, 50 users, Apr–Jul 2026). Per user:
monthly income and spend → planned SIP (half of savings), savings rate + segment → risk profile,
spending > income → SIP paused, savings → AUM size, and most frequent city. Names are generated
(the CSV has none). Slide line: *"50 clients derived from the provided transactions, 170 simulated; the engine is unchanged on real data."*
