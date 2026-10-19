export const inr = (v) => v >= 1e7 ? `₹${(v / 1e7).toFixed(2)} Cr` : `₹${(v / 1e5).toFixed(1)} L`;
export const pct = (v, sign = false) => `${sign && v > 0 ? '+' : ''}${Number(v).toFixed(1)}%`;
export const STATUS = {
  Critical: { badge: 'bg-red-100 text-red-700 ring-red-200', dot: 'bg-red-500' },
  Moderate: { badge: 'bg-amber-100 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  Aligned:  { badge: 'bg-emerald-100 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
};
export const statusStyle = (s) => STATUS[s] ?? STATUS.Moderate;
export const ahsColor = (a) => (a < 60 ? 'text-red-600' : a < 80 ? 'text-amber-600' : 'text-emerald-600');
