# AdviceGuard (demo)

Triage board for financial advisors: ranks ~220 investors by how far they have drifted from their advice, explains the gap, and uses a **local** LLM (Ollama) and Whisper for meeting capture and client briefs. Runs fully offline.

```
backend/    FastAPI engine + local AI endpoints (Person A, Mac)
frontend/   React UI (Person B)
docs/       notes, demo client IDs
```

## Run the demo

```bash
./start_demo.sh      # backend :8000 + frontend :5173, opens the browser
```

Demo clients: [docs/demo_clients.md](docs/demo_clients.md) · Recording: [docs/video_script.md](docs/video_script.md).
The frontend reads `frontend/.env.local` (`VITE_MOCK=0`, created by the script); without it, it uses mock data.

## First-time backend setup

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
ollama pull llama3.2:3b
curl -L -o models/ggml-small.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin   # audio only
uvicorn main:app --reload --host 0.0.0.0 --port 8000      # http://localhost:8000/docs
python smoke_test.py                                         # acceptance checks, server must be up
```

`backend/investors_list.csv` (bank transactions) gives 50 clients; 170 more are generated deterministically.

## Run the frontend

```bash
cd frontend
npm install
npm run dev                                                  # http://localhost:5173
```

`frontend/.env` defaults to mock data (`VITE_MOCK=1`). To use the real backend, create `frontend/.env.local`:

```
VITE_MOCK=0
VITE_API=http://localhost:8000
```

If an endpoint fails, the UI falls back to mock data and the console logs `API failed, using mock for …`.

## Backend phases

| # | Phase | Status |
|---|---|---|
| 1 | Scaffold: repo, venv, engine, triage/detail/rebalance APIs | done |
| 2 | Local AI: `/api/extract`, `/api/brief` on llama3.2:3b | done (extract ~9s, brief ~20s, numbers verified incl. sign) |
| 3 | Audio: whisper-cpp + ffmpeg, `/api/transcribe` | done (~10s per clip) |
| 4 | CSV (50 real users + 170 generated) + 3 demo clients | done, see [docs/demo_clients.md](docs/demo_clients.md) |
| 5 | B's frontend on the Mac, full UI run-through, start script, recording script | done; Wi-Fi-off pass + recording are manual |

API contract and engine details: [PERSON_A_MAC_BACKEND.md](PERSON_A_MAC_BACKEND.md).
