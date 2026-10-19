#!/usr/bin/env bash
# Start everything for the demo: Ollama check, backend on :8000, frontend on :5173. Ctrl+C stops both.
set -e
cd "$(dirname "$0")"

curl -sf localhost:11434/api/tags >/dev/null || { echo "Ollama is not running: open the Ollama app first"; exit 1; }
ollama list | grep -q "llama3.2:3b" || ollama pull llama3.2:3b
[ -f frontend/.env.local ] || printf 'VITE_MOCK=0\nVITE_API=http://localhost:8000\n' > frontend/.env.local
[ -d frontend/node_modules ] || (cd frontend && npm i)

(cd backend && .venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000) &
BACK=$!
trap 'kill $BACK 2>/dev/null' EXIT
until curl -sf localhost:8000/api/health >/dev/null; do sleep 1; done
curl -s -X POST localhost:8000/api/brief/INV0013 >/dev/null &   # warm the model so the first brief on camera is fast
echo "Backend ready. Opening http://localhost:5173"
(sleep 3 && open http://localhost:5173) &
cd frontend && npm run dev -- --port 5173 --strictPort
