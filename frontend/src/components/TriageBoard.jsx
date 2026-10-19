import { useMemo, useState } from 'react';
import { Search, AlertTriangle, Sparkles } from 'lucide-react';
import { inr, statusStyle, ahsColor } from '../format';

const FILTERS = ['All', 'Critical', 'Moderate', 'Aligned', 'Opportunities'];

export default function TriageBoard({ rows, loading, selected, onSelect }) {
  const [q, setQ] = useState('');
  const [f, setF] = useState('All');
  const count = (k) => k === 'All' ? rows.length : k === 'Opportunities'
    ? rows.filter((r) => r.opportunity).length : rows.filter((r) => r.status === k).length;
  const shown = useMemo(() => rows.filter((r) =>
    (f === 'All' || (f === 'Opportunities' ? r.opportunity : r.status === f)) &&
    (r.name.toLowerCase().includes(q.toLowerCase()) || r.id.toLowerCase().includes(q.toLowerCase()))), [rows, q, f]);

  return (
    <aside className="w-[380px] shrink-0 border-r bg-white flex flex-col">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Today's triage</h2>
          <span className="text-xs text-slate-500">{rows.length} clients monitored</span>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((k) => (
            <button key={k} onClick={() => setF(k)}
              className={`text-xs px-2.5 py-1 rounded-full border ${f === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              {k} <span className="opacity-60">{count(k)}</span>
            </button>
          ))}
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto divide-y">
        {loading && [0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="px-4 py-3 space-y-2 animate-pulse">
            <div className="h-4 w-2/3 rounded bg-slate-100" /><div className="h-3 w-1/2 rounded bg-slate-100" />
          </li>
        ))}
        {!loading && !shown.length && <li className="p-6 text-sm text-slate-400 text-center">No clients match.</li>}
        {shown.map((r, i) => (
          <li key={r.id}>
            <button onClick={() => onSelect(r.id)}
              className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${selected === r.id ? 'bg-indigo-50/70 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-5">{i + 1}</span>
                <span className="font-medium truncate">{r.name}</span>
                <span className={`ml-auto text-lg font-semibold tabular-nums ${ahsColor(r.ahs)}`}>{r.ahs}</span>
              </div>
              <div className="pl-7 mt-1 flex items-center gap-2 text-xs text-slate-500">
                <span className={`px-1.5 py-0.5 rounded ring-1 ${statusStyle(r.status).badge}`}>{r.status}</span>
                <span>{inr(r.aum)}</span><span className="truncate">· {r.goal} {r.goal_year}</span>
              </div>
              {r.breach && (
                <div className="pl-7 mt-1.5 flex items-center gap-1 text-xs font-medium text-red-700">
                  <AlertTriangle size={12} /> Mandate breach
                </div>
              )}
              <ul className="pl-7 mt-1.5 space-y-0.5">
                {r.reasons.slice(0, 2).map((t) => <li key={t} className="text-xs text-slate-600">• {t}</li>)}
              </ul>
              {r.opportunity && (
                <div className="pl-7 mt-1.5 flex items-center gap-1 text-xs text-emerald-700">
                  <Sparkles size={12} /> {r.opportunity}
                </div>
              )}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
