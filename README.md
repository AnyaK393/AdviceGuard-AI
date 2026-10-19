# AdviceGuard (demo)

Triage board for financial advisors: ranks ~220 investors by how far they have drifted from their advice, explains the gap, and uses a **local** LLM (Ollama) and Whisper for meeting capture and client briefs. Runs fully offline.

```
backend/    FastAPI engine + local AI endpoints (Person A, Mac)
frontend/   React UI (Person B)
docs/       notes, demo client IDs
```

## Run the backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
ollama pull llama3.2:3b
curl -L -o models/ggml-small.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin   # audio only
uvicorn main:app --reload --host 0.0.0.0 --port 8000      # http://localhost:8000/docs
python smoke_test.py                                         # acceptance checks, server must be up
```

`backend/investors_list.csv` (bank transactions) gives 50 clients; 170 more are generated deterministically.

## Backend phases

| # | Phase | Status |
|---|---|---|
| 1 | Scaffold: repo, venv, engine, triage/detail/rebalance APIs | done |
| 2 | Local AI: `/api/extract`, `/api/brief` on llama3.2:3b | done (extract ~8s, brief ~18s, 5/5 verified) |
| 3 | Audio: whisper-cpp + ffmpeg, `/api/transcribe` | done (~25s per clip) |
| 4 | CSV (50 real users + 170 generated) + 3 demo clients | done, see [docs/demo_clients.md](docs/demo_clients.md) |
| 5 | Run B's frontend on the Mac, offline run-through, record video | todo |

API contract and engine details: [PERSON_A_MAC_BACKEND.md](PERSON_A_MAC_BACKEND.md).
