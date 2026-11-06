// Virtual lab kit: SVG glassware and instruments shared by the lab simulations.
import type { ReactNode } from 'react';
import { bn, bnFixed } from '@/chem/format';

/** A thermometer drawn at (x, y) top-left inside a parent <svg>. */
export function Thermometer({
  x,
  y,
  height = 180,
  temp,
  min = 0,
  max = 50,
  label = true,
}: {
  x: number;
  y: number;
  height?: number;
  temp: number;
  min?: number;
  max?: number;
  label?: boolean;
}) {
  const tube = height - 30;
  const f = Math.max(0, Math.min(1, (temp - min) / (max - min)));
  const fill = tube * f;
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      <rect x="-7" y="0" width="14" height={tube + 6} rx="7" fill="var(--surface)" stroke="var(--line-strong)" />
      <rect
        x="-3"
        y={tube - fill + 3}
        width="6"
        height={fill + 4}
        fill="var(--proton)"
        style={{ transition: 'y .4s linear, height .4s linear' }}
      />
      <circle cx="0" cy={tube + 14} r="13" fill="var(--proton)" stroke="var(--line-strong)" />
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1="8" x2="14" y1={tube + 3 - tube * t} y2={tube + 3 - tube * t} stroke="var(--muted)" />
          <text x="17" y={tube + 7 - tube * t} fontSize="10" className="fill-muted font-mono">
            {bn(Math.round(min + (max - min) * t))}
          </text>
        </g>
      ))}
      {label && (
        <text x="0" y={tube + 44} textAnchor="middle" fontSize="13" fontWeight="700" className="fill-ink font-mono">
          {bnFixed(temp, 1)} °সে
        </text>
      )}
    </g>
  );
}

/** A beaker outline with liquid; children render inside the liquid area (0,0 is the beaker's top-left). */
export function Beaker({
  x,
  y,
  w,
  h,
  level = 0.7,
  liquid = 'color-mix(in oklab, var(--electron) 22%, transparent)',
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  level?: number;
  liquid?: string;
  children?: ReactNode;
}) {
  const top = h * (1 - level);
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d={`M0 ${top} L0 ${h - 8} Q0 ${h} 8 ${h} L${w - 8} ${h} Q${w} ${h} ${w} ${h - 8} L${w} ${top} Z`}
        fill={liquid}
        style={{ transition: 'fill .8s ease' }}
      />
      {children}
      <path
        d={`M-6 0 L0 6 L0 ${h - 8} Q0 ${h} 8 ${h} L${w - 8} ${h} Q${w} ${h} ${w} ${h - 8} L${w} 6 L${w + 6} 0`}
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** Rising bubbles (CSS animation, respects reduced motion via the global rule). */
export function Bubbles({
  x,
  y,
  height,
  count = 6,
  active,
  color = 'var(--ink)',
}: {
  x: number;
  y: number;
  height: number;
  count?: number;
  active: boolean;
  color?: string;
}) {
  if (!active) return null;
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={i}
          cx={((i * 7) % 11) - 5}
          cy={0}
          r={2 + (i % 3)}
          fill="none"
          stroke={color}
          strokeOpacity=".7"
          style={{ animation: `bubble-up ${1.4 + (i % 4) * 0.3}s linear ${i * 0.25}s infinite`, ['--rise' as string]: `${-height}px` }}
        />
      ))}
    </g>
  );
}
