import { useEffect, useState } from 'react';
import { ShieldCheck, WifiOff, Mic, Database } from 'lucide-react';
import { api, isMock } from './api';
import TriageBoard from './components/TriageBoard';
import Investor360 from './components/Investor360';
import CapturePanel from './components/CapturePanel';

export default function App() {
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState(null);
  const [version, setVersion] = useState(0);
  const [capture, setCapture] = useState(false);

  const refresh = () => api.triage().then((r) => { setRows(r); setSelected((s) => s ?? r[0]?.id); });
  useEffect(() => { refresh(); }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="h-14 shrink-0 border-b bg-white px-5 flex items-center gap-3">
        <ShieldCheck className="text-indigo-600" size={22} />
        <span className="font-semibold">AdviceGuard AI</span>
        <span className="text-slate-400 text-sm">Is each client's advice still working?</span>
        <div className="ml-auto flex items-center gap-2">
          {isMock && (
            <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
              <Database size={13} /> Mock data
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            <WifiOff size={13} /> Local AI · offline
          </span>
          <button onClick={() => setCapture(true)} disabled={!selected}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            <Mic size={15} /> Capture meeting
          </button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <TriageBoard rows={rows ?? []} loading={!rows} selected={selected} onSelect={setSelected} />
        <main className="flex-1 overflow-y-auto p-6">
          {selected && <Investor360 key={`${selected}-${version}`} id={selected} />}
        </main>
      </div>
      {capture && selected && (
        <CapturePanel id={selected} name={rows?.find((r) => r.id === selected)?.name}
          onClose={() => setCapture(false)}
          onApproved={() => { setCapture(false); refresh(); setVersion((v) => v + 1); }} />
      )}
    </div>
  );
}
