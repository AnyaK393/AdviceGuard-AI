import * as mock from './mock';

const BASE = import.meta.env.VITE_API || 'http://localhost:8000';
const USE_MOCK = import.meta.env.VITE_MOCK === '1';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(path, opts, fallback, mockDelay = 300) {
  if (USE_MOCK) { await wait(mockDelay); return structuredClone(fallback); }
  try {
    const r = await fetch(BASE + path, opts);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.warn('API failed, using mock for', path, e);
    return structuredClone(fallback);
  }
}
const post = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });

export const isMock = USE_MOCK;

export const api = {
  triage: () => call('/api/triage', undefined, mock.triage),
  investor: (id) => call(`/api/investors/${id}`, undefined, mock.detail(id)),
  rebalance: (id) => call(`/api/rebalance/${id}`, post(), mock.rebalance, 800),
  extract: (id, text) => call('/api/extract', post({ investor_id: id, text }), mock.extract, 2500),
  approve: (id, extracted) => call(`/api/mandate/${id}/approve`, post({ extracted }),
    { ...mock.detail(id), ahs: 74, status: 'Moderate' }),
  brief: (id) => call(`/api/brief/${id}`, post(), mock.brief, 3000),
  transcribe: (file) => {
    const fd = new FormData(); fd.append('file', file);
    return call('/api/transcribe', { method: 'POST', body: fd }, { text: mock.sampleTranscript }, 3000);
  },
};
