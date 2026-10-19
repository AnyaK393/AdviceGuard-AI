import { useEffect, useState } from 'react';
import { X, Upload, Wand2, Check, Quote, Loader2 } from 'lucide-react';
import { api } from '../api';
import { sampleTranscript } from '../mock';

const LABELS = { risk_profile: 'Risk profile', target_equity_pct: 'Equity target %', target_debt_pct: 'Debt target %',
  goal: 'Goal', goal_year: 'Goal year', monthly_sip: 'Monthly SIP', target_return_pct: 'Return target %',
  restricted_sectors: 'Restricted sectors' };
const show = (v, k) => Array.isArray(v) ? (v.length ? v.join(', ') : '—')
  : v == null ? '—' : k === 'monthly_sip' ? `₹${Number(v).toLocaleString('en-IN')}` : v;

export default function CapturePanel({ id, name, onClose, onApproved }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState('');
  const [res, setRes] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const upload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy('Transcribing on this device…'); setRes(null); setText((await api.transcribe(f)).text); setBusy('');
    e.target.value = '';
  };
  const extract = async () => { setBusy('Local model reading the notes…'); setRes(await api.extract(id, text)); setBusy(''); };
  const approve = async () => { setBusy('Saving new mandate…'); await api.approve(id, res.extracted); onApproved(); };
  const quote = (f) => res?.extracted.evidence?.find((e) => e.field === f)?.quote;
  const fields = res ? Object.keys(LABELS).filter((k) => res.extracted[k] != null) : [];

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50" onClick={() => !busy && onClose()}>
      <div className="bg-white rounded-2xl w-[860px] max-h-[88vh] overflow-y-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center mb-4">
          <h2 className="text-lg font-semibold">Capture meeting · {name}</h2>
          <button onClick={onClose} disabled={!!busy} className="ml-auto text-slate-500 hover:text-slate-900"><X /></button>
        </div>
        <div className="flex gap-2 mb-2">
          <label className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border cursor-pointer hover:bg-slate-50 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
            <Upload size={14} /> Upload audio<input type="file" accept="audio/*" className="hidden" onChange={upload} />
          </label>
          <button onClick={() => { setText(sampleTranscript); setRes(null); }} disabled={!!busy}
            className="text-sm px-3 py-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-50">Load sample notes</button>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Paste or type meeting notes…"
          className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        <div className="flex items-center gap-3 mt-2">
          <button onClick={extract} disabled={!text.trim() || !!busy}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            <Wand2 size={14} /> Extract with local AI
          </button>
          {busy && <span className="flex items-center gap-1.5 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" />{busy}</span>}
        </div>

        {res && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold mb-2">Proposed mandate changes <span className="font-normal text-slate-400">({res.source})</span></h3>
            {!fields.length ? <p className="text-sm text-slate-500">No mandate changes found in these notes.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-500 border-b">
                  <th className="py-1.5">Field</th><th>Current</th><th>From meeting</th><th>Evidence</th></tr></thead>
                <tbody>
                  {fields.map((k) => {
                    const changed = String(show(res.extracted[k], k)) !== String(show(res.current?.[k], k));
                    return (
                      <tr key={k} className="border-b align-top">
                        <td className="py-2 text-slate-600">{LABELS[k]}</td>
                        <td className="py-2 text-slate-500">{show(res.current?.[k], k)}</td>
                        <td className={`py-2 px-1.5 font-medium ${changed ? 'text-indigo-700 bg-indigo-50' : ''}`}>{show(res.extracted[k], k)}</td>
                        <td className="py-2 pl-2 text-xs text-slate-500 italic">
                          {quote(k) ? <span className="flex gap-1"><Quote size={11} className="shrink-0 mt-0.5" />{quote(k)}</span>
                                    : changed ? <span className="text-amber-600 not-italic">needs confirmation</span>
                                    : <span className="text-slate-400 not-italic">unchanged</span>}
                        </td>
                      </tr>);
                  })}
                </tbody>
              </table>
            )}
            {!!res.extracted.life_events?.length && (
              <p className="text-sm mt-3">Life events: <b>{res.extracted.life_events.join(', ')}</b></p>)}
            {!!res.extracted.advice_items?.length && (
              <div className="text-sm mt-2">New advice:
                <ul className="mt-1 space-y-0.5">{res.extracted.advice_items.map((a) => (
                  <li key={a.action} className="text-slate-600">• {a.action} <span className="text-slate-400">→ {a.expected_outcome}</span></li>))}
                </ul>
              </div>)}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={onClose} disabled={!!busy} className="text-sm px-3 py-1.5 rounded-lg border hover:bg-slate-50">Discard</button>
              <button onClick={approve} disabled={!!busy}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                <Check size={14} /> Approve and update mandate</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
