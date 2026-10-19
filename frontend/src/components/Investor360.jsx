import { useEffect, useState } from 'react';
import { Target, Activity, PieChart, TrendingDown } from 'lucide-react';
import { api } from '../api';
import { inr, pct, statusStyle, ahsColor } from '../format';
import ReturnsChart from './ReturnsChart';
import GapWaterfall from './GapWaterfall';
import AllocationBars from './AllocationBars';
import RebalancePanel from './RebalancePanel';
import BriefPanel from './BriefPanel';

const Tile = ({ icon: Icon, label, value, sub, bad }) => (
  <div className="bg-white rounded-xl border p-4">
    <div className="flex items-center gap-1.5 text-xs text-slate-500"><Icon size={14} />{label}</div>
    <div className={`mt-1 text-2xl font-semibold tabular-nums ${bad ? 'text-red-600' : 'text-slate-900'}`}>{value}</div>
    <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
  </div>
);
const Card = ({ title, children, className = '' }) => (
  <section className={`bg-white rounded-xl border p-4 ${className}`}>
    <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>{children}
  </section>
);

const Skeleton = () => (
  <div className="max-w-6xl mx-auto space-y-4 animate-pulse">
    <div className="h-16 w-1/2 rounded-xl bg-slate-200/60" />
    <div className="h-12 rounded-xl bg-slate-200/60" />
    <div className="grid grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-slate-200/60" />)}</div>
    <div className="grid grid-cols-2 gap-4"><div className="h-72 rounded-xl bg-slate-200/60" /><div className="h-72 rounded-xl bg-slate-200/60" /></div>
  </div>
);

export default function Investor360({ id }) {
  const [d, setD] = useState(null);
  useEffect(() => { api.investor(id).then(setD); }, [id]);
  if (!d) return <Skeleton />;
  const t = d.tiles;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-start gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{d.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded ring-1 ${statusStyle(d.status).badge}`}>{d.status}</span>
            {d.breach && <span className="text-xs px-2 py-0.5 rounded bg-red-600 text-white">Mandate breach</span>}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {d.id} · {d.risk_profile} · {inr(d.aum)} · {d.goal} by {d.goal_year}
            {d.city && ` · ${d.city}`} · last contact {d.days_since_contact} days ago
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {d.segment && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{d.segment}</span>}
            {(d.tags ?? []).map((x) => <span key={x} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{x}</span>)}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-slate-500">Advice Health Score</div>
          <div className={`text-4xl font-bold tabular-nums ${ahsColor(d.ahs)}`}>{d.ahs}</div>
        </div>
      </div>

      {d.breach && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-800">
          <b>Breach:</b> {d.breach}. This overrides the health score and puts the client at the top of today's list.
        </div>
      )}
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-[15px] text-indigo-950">{d.headline}</div>

      <div className="grid grid-cols-4 gap-3">
        <Tile icon={Target} label="Goal probability" value={`${t.goal_prob}%`} sub={`target ${t.goal_target}%`} bad={t.goal_prob < t.goal_target} />
        <Tile icon={Activity} label="Volatility" value={pct(t.volatility)} sub={`cap ${pct(t.vol_cap)}`} bad={t.volatility > t.vol_cap} />
        <Tile icon={PieChart} label="Allocation drift" value={`${Number(t.allocation_drift).toFixed(1)} pp`} sub="share to trade back" bad={t.allocation_drift > 7.5} />
        <Tile icon={TrendingDown} label="Vs advice" value={pct(t.advice_gap, true)} sub="investor return vs expected" bad={t.advice_gap < -2} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Expected vs market vs actual (since advice)"><ReturnsChart data={d.timeline} /></Card>
        <Card title="Why the gap? Attribution of the shortfall"><GapWaterfall returns={d.returns} waterfall={d.waterfall} /></Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Allocation: target vs actual"><AllocationBars data={d.allocation} /></Card>
        <Card title="Advice history">
          {!d.advice?.length ? <p className="text-sm text-slate-400">No advice recorded yet.</p> : (
            <ul className="space-y-3">
              {d.advice.map((a) => (
                <li key={a.date + a.action} className="flex gap-3">
                  <span className="text-xs text-slate-400 w-20 shrink-0 pt-0.5">{a.date}</span>
                  <div className="flex-1">
                    <div className="text-sm">{a.action}</div>
                    <div className="text-xs text-slate-500">Expected: {a.expected_outcome}</div>
                  </div>
                  <span className={`text-xs h-fit whitespace-nowrap px-2 py-0.5 rounded ${a.status === 'Not followed' ? 'bg-red-50 text-red-700' : a.status === 'Executed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{a.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 items-start">
        <RebalancePanel id={id} />
        <BriefPanel id={id} name={d.name} />
      </div>
    </div>
  );
}
