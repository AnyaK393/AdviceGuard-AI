# Recording checklist + script (3 min)

## Before you hit record
- [ ] Record your meeting clip: QuickTime → File → New Audio Recording, read `backend/samples/meeting.txt`, export `.m4a`
- [ ] `./start_demo.sh` (wait for "Backend ready"; the first brief warms the model)
- [ ] **Turn Wi-Fi off**, then click through every step below once; all of it runs on localhost
- [ ] Restart `./start_demo.sh` so the approve step starts from a clean state (approvals are kept in memory only)
- [ ] Browser full screen, zoom 100%, close other tabs; screen record with QuickTime / Cmd+Shift+5

## Script
1. **0:00** Turn Wi-Fi off on camera. "An advisor has 220 clients and knows 20 well. Which of the other 200 is quietly falling behind?"
2. **0:20** Triage board: ranked list with reason codes; click the *Critical* and *Opportunities* filters.
3. **0:40** Search `INV0013` (Tanvi Desai, a real gig-worker profile from the data): headline, then the gap waterfall: market vs allocation vs selection vs behaviour.
4. **1:20** *Propose fix*: staggered over 3 months because she redeems in dips; AHS 20 → 75.
5. **1:45** Clear search: `INV0066` Amit Chopra is #1, because the restricted-sector breach overrides the score.
6. **2:05** Search `INV0119` Neha Gupta → *Capture meeting* → upload the clip → local transcript → *Extract with local AI* → quotes for every field → *Approve*: AHS 21 → 55.
7. **2:35** *Draft brief*: "Numbers verified against engine"; name added only on this device. (Cut the ~20s wait.)
8. **2:50** "Your top 20 have you. Your next 200 have AdviceGuard."

Slide line: *50 clients derived from the provided transactions, 170 simulated; the engine runs unchanged on real data.*
