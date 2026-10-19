import { useState } from 'react';
import { MessageSquareText, BadgeCheck, Copy, Check, Loader2 } from 'lucide-react';
import { api } from '../api';

export default function BriefPanel({ id, name = '' }) {
  const [b, setB] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const run = async () => { setBusy(true); setB(await api.brief(id)); setBusy(false); };
  // the model only ever sees {CLIENT}; the real name is filled in here
  const text = b?.text.replace('{CLIENT}', name.split(' ')[0]);
  const copy = () => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <section className="bg-white rounded-xl border p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquareText size={16} className="text-indigo-600" /><h3 className="text-sm font-semibold">Client brief</h3>
        <button onClick={run} disabled={busy}
          className="ml-auto flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">
          {busy && <Loader2 size={14} className="animate-spin" />}{busy ? 'Writing locally…' : b ? 'Redraft' : 'Draft brief'}
        </button>
      </div>
      {!b ? <p className="text-sm text-slate-500">A plain-language note written by the local model from computed facts only.</p> : (
        <>
          <p className="text-sm whitespace-pre-line leading-relaxed">{text}</p>
          <div className="flex items-center gap-3 mt-3 text-xs">
            {b.verified && <span className="flex items-center gap-1 text-emerald-700"><BadgeCheck size={14} /> Numbers verified against engine</span>}
            <span className="text-slate-400">{b.source} · client name added on this device only</span>
            <button onClick={copy} className="ml-auto flex items-center gap-1 text-slate-600 hover:text-slate-900">
              {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
