// Small, dependency-free SVG charts for live graphs (rate, concentration, temperature, pH).
import { bn } from '@/chem/format';

export interface Series {
  label: string;
  color: string;
  points: [number, number][];
  dashed?: boolean;
}

export function LineChart({
  series,
  xMax,
  yMax,
  yMin = 0,
  xLabel,
  yLabel,
  height = 200,
  ariaLabel,
  marker,
}: {
  series: Series[];
  xMax: number;
  yMax: number;
  yMin?: number;
  xLabel: string;
  yLabel: string;
  height?: number;
  ariaLabel: string;
  /** vertical marker line (e.g. "now") */
  marker?: number;
}) {
  const W = 520;
  const H = height;
  const L = 58;
  const B = 32;
  const T = 10;
  const Rr = 10;
  const x = (v: number) => L + (v / Math.max(xMax, 1e-9)) * (W - L - Rr);
  const y = (v: number) => H - B - ((v - yMin) / Math.max(yMax - yMin, 1e-9)) * (H - B - T);
  const ticks = (max: number, min = 0) => [0, 0.25, 0.5, 0.75, 1].map((f) => min + f * (max - min));
  const fmt = (v: number) => (Math.abs(v) >= 100 ? bn(Math.round(v)) : bn(Number(v.toFixed(Math.abs(v) < 1 ? 2 : 1))));
  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={ariaLabel}>
        {ticks(yMax, yMin).map((v) => (
          <g key={`y${v}`}>
            <line x1={L} x2={W - Rr} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" className="fill-muted font-mono">
              {fmt(v)}
            </text>
          </g>
        ))}
        {ticks(xMax).map((v) => (
          <text key={`x${v}`} x={x(v)} y={H - B + 16} textAnchor="middle" fontSize="11" className="fill-muted font-mono">
            {fmt(v)}
          </text>
        ))}
        <line x1={L} x2={L} y1={T} y2={H - B} stroke="var(--line-strong)" />
        <line x1={L} x2={W - Rr} y1={H - B} y2={H - B} stroke="var(--line-strong)" />
        {marker !== undefined && <line x1={x(marker)} x2={x(marker)} y1={T} y2={H - B} stroke="var(--muted)" strokeDasharray="3 4" />}
        {series.map((s) => (
          <polyline
            key={s.label}
            fill="none"
            stroke={s.color}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeDasharray={s.dashed ? '6 5' : undefined}
            points={s.points
              .map(([px, py]) => `${x(Math.min(px, xMax)).toFixed(1)},${y(Math.max(yMin, Math.min(py, yMax))).toFixed(1)}`)
              .join(' ')}
          />
        ))}
        <text x={(L + W) / 2} y={H - 2} textAnchor="middle" fontSize="12" className="fill-muted">
          {xLabel}
        </text>
        <text x={12} y={H / 2 - 10} textAnchor="middle" fontSize="12" className="fill-muted" transform={`rotate(-90 12 ${H / 2 - 10})`}>
          {yLabel}
        </text>
      </svg>
      {series.length > 1 && (
        <figcaption className="mt-1 flex flex-wrap gap-3 text-xs text-muted">
          {series.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
