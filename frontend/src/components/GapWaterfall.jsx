import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

// Floating bars: each step is drawn as a [low, high] range from the running total.
export default function GapWaterfall({ returns, waterfall }) {
  let run = returns.expected;
  const rows = [{ name: 'Expected', range: [0, run], raw: run, fill: '#6366f1' }];
  for (const s of waterfall) {
    const next = run + s.value;
    rows.push({ name: s.label, range: [Math.min(run, next), Math.max(run, next)], raw: s.value,
                fill: s.value < 0 ? '#ef4444' : '#22c55e' });
    run = next;
  }
  rows.push({ name: 'Investor', range: [0, returns.xirr], raw: returns.xirr, fill: '#0ea5e9' });
  const market = waterfall.find((w) => w.label === 'Market')?.value ?? 0;
  const ctrl = waterfall.filter((w) => w.label !== 'Market').reduce((s, w) => s + w.value, 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={rows} margin={{ top: 18, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid stroke="#eef2f7" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit="%" />
          <ReferenceLine y={0} stroke="#cbd5e1" />
          <Tooltip cursor={{ fill: '#f1f5f9' }}
            content={({ active, payload }) => active && payload?.length ? (
              <div className="rounded-md border bg-white px-2.5 py-1.5 text-xs shadow-sm">
                <b>{payload[0].payload.name}</b>: {payload[0].payload.raw.toFixed(2)}%
              </div>) : null} />
          <Bar dataKey="range" radius={3}>
            {rows.map((r) => <Cell key={r.name} fill={r.fill} />)}
            <LabelList dataKey="raw" position="top" style={{ fontSize: 11, fill: '#334155' }}
              formatter={(v) => `${v > 0 ? '+' : ''}${Number(v).toFixed(1)}`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-600 mt-1">
        Market: <b>{market.toFixed(1)}%</b> (not held against the advice) · Controllable:{' '}
        <b className={ctrl < 0 ? 'text-red-600' : 'text-emerald-700'}>{ctrl > 0 ? '+' : ''}{ctrl.toFixed(1)}%</b>
      </p>
    </div>
  );
}
