import { useState } from 'react';
import { ArrowRight, Scale, Loader2 } from 'lucide-react';
import { api } from '../api';

const SELL = ['Sell', 'Exit', 'Redeem'];
const num = (v, k) => (k === 'volatility' ? Number(v).toFixed(1) : Math.round(v));

export default function RebalancePanel({ id }) {
  const [r, setR] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async () => { setBusy(true); setR(await api.rebalance(id)); setBusy(false); };

  return (
    <section className="bg-white rounded-xl border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Scale size={16} className="text-indigo-600" /><h3 className="text-sm font-semibold">Counterfactual rebalance</h3>
        <button onClick={run} disabled={busy}
          className="ml-auto flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">
          {busy && <Loader2 size={14} className="animate-spin" />}{busy ? 'Simulating…' : r ? 'Re-run' : 'Propose fix'}
        </button>
      </div>
      {!r ? <p className="text-sm text-slate-500">The fewest trades that bring this client back within tolerance.</p> : (
        <>
          {!r.trades.length ? <p className="text-sm text-emerald-700">Nothing to do: this client is within all tolerances.</p> : (
            <table className="w-full text-sm">
              <tbody>{r.trades.map((t) => (
                <tr key={t.action + t.asset} className="border-b last:border-0">
                  <td className={`py-1.5 font-medium ${SELL.includes(t.action) ? 'text-red-600' : 'text-emerald-700'}`}>{t.action}</td>
                  <td>{t.asset}</td><td className="text-right text-slate-600">{t.detail}</td>
                </tr>))}
              </tbody>
            </table>
          )}
          {r.style && <p className="text-xs text-slate-500 mt-2">{r.style}</p>}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[['Health score', 'ahs', ''], ['Goal probability', 'goal_prob', '%'], ['Volatility', 'volatility', '%']].map(([l, k, u]) => (
              <div key={k} className="rounded-lg bg-slate-50 p-2 text-center">
                <div className="text-xs text-slate-500">{l}</div>
                <div className="flex items-center justify-center gap-1 font-semibold tabular-nums">
                  <span className="text-slate-500">{num(r.before[k], k)}{u}</span><ArrowRight size={14} />
                  <span className="text-emerald-700">{num(r.after[k], k)}{u}</span>
                </div>
              </div>))}
          </div>
        </>
      )}
    </section>
  );
}
