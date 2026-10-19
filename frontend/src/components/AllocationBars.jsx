import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AllocationBars({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
        <CartesianGrid stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="asset" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit="%" />
        <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v) => `${Number(v).toFixed(1)}%`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="target" name="Agreed" fill="#c7d2fe" radius={[3, 3, 0, 0]} />
        <Bar dataKey="actual" name="Actual" fill="#6366f1" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
