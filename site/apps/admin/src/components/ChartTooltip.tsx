import { colors } from '../theme';

// Customowy, brandowany dymek dla wykresów recharts (zamiast domyślnego).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props { active?: boolean; payload?: any[]; label?: string; money?: boolean; unit?: string }

const fmt = (v: number, money?: boolean, unit?: string) => {
  if (money) return `${Math.round(Number(v)).toLocaleString('pl-PL')} zł`;
  if (unit) return `${v}${unit}`;
  return `${Number(v).toLocaleString('pl-PL')}`;
};

export default function ChartTooltip({ active, payload, label, money, unit }: Props) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="chart-tip">
      {label != null && label !== '' && <div className="chart-tip-label">{label}</div>}
      {payload.map((p, i) => (
        <div className="chart-tip-row" key={i}>
          <span className="dot" style={{ background: p.color || p.payload?.fill || p.fill || colors.accent }} />
          <span className="nm">{p.name}</span>
          <b>{fmt(p.value, money, unit)}</b>
        </div>
      ))}
    </div>
  );
}
