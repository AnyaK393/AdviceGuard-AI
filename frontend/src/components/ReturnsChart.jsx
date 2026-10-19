import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function ReturnsChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
        <CartesianGrid stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} interval={2} />
        <YAxis tick={{ fontSize: 11 }} unit="%" />
        <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line dataKey="expected" name="Advice expected" stroke="#6366f1" strokeDasharray="5 4" dot={false} strokeWidth={2} />
        <Line dataKey="policy" name="Market (agreed mix)" stroke="#94a3b8" dot={false} strokeWidth={2} />
        <Line dataKey="actual" name="Actual portfolio" stroke="#0ea5e9" dot={false} strokeWidth={2.5} />
      </LineChart>
    </ResponsiveContainer>
  );
}
