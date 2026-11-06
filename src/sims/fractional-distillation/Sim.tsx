// পেট্রোলিয়ামের আংশিক পাতন: crude oil vapour rises through a column that is hot at the bottom and cool at the top;
// each fraction condenses on the tray where the temperature falls below its boiling range.
import { useMemo, useRef, useState } from 'react';
import { FRACTIONS, bn, fractionForCarbons, makeRandom, type Fraction } from '@/chem';
import { ChallengeList, SimShell, Slider, cx, useActive, usePrefersReducedMotion, useSimClock } from '@/ui';

const COL = { x: 120, y: 20, w: 120, h: 340 };
const TRAY_H = COL.h / FRACTIONS.length;
/** Tray index from the top (0 = gas outlet at the very top). */
const trayY = (i: number) => COL.y + i * TRAY_H + TRAY_H / 2;
const FRACTION_COLOURS = ['#a5f3fc', '#fde68a', '#fdba74', '#fca5a5', '#f472b6', '#a78bfa', '#57534e'];

interface Vapour {
  y: number;
  x: number;
  target: number; // tray index
  done: boolean;
}

export default function FractionalDistillation() {
  const shellRef = useRef<HTMLDivElement>(null);
  const active = useActive(shellRef);
  const reduced = usePrefersReducedMotion();
  const [selected, setSelected] = useState<Fraction>(FRACTIONS[1]!);
  const [carbons, setCarbons] = useState(8);
  const [follow, setFollow] = useState<{ y: number; target: number } | null>(null);
  const [opened, setOpened] = useState<Set<string>>(() => new Set());
  const [followed, setFollowed] = useState<Set<number>>(() => new Set());
  const [vapours, setVapours] = useState<Vapour[]>([]);
  const rand = useRef(makeRandom(8));
  const carry = useRef(0);

  const clock = useSimClock(
    (dt) => {
      carry.current += dt * 6;
      setVapours((list) => {
        const next = list
          .map((v) => {
            const stop = trayY(v.target);
            const y = v.done ? v.y : Math.max(stop, v.y - dt * 70);
            return { ...v, y, done: v.done || y <= stop, x: v.x + (rand.current() - 0.5) * 2 };
          })
          .filter((v) => !v.done || rand.current() > 0.02);
        while (carry.current >= 1) {
          carry.current -= 1;
          const r = rand.current();
          const target = Math.min(FRACTIONS.length - 1, Math.floor(r * r * FRACTIONS.length * 1.1));
          next.push({
            y: COL.y + COL.h - 6,
            x: COL.x + 14 + rand.current() * (COL.w - 28),
            target: FRACTIONS.length - 1 - target,
            done: false,
          });
        }
        return next.slice(-80);
      });
      setFollow((f) => (f ? { ...f, y: Math.max(trayY(f.target), f.y - dt * 60) } : f));
    },
    { active, autoplay: !reduced },
  );

  const target = fractionForCarbons(carbons);
  const targetIndex = FRACTIONS.indexOf(target);
  const start = () => {
    setFollow({ y: COL.y + COL.h - 6, target: targetIndex });
    setFollowed((s) => new Set(s).add(carbons));
    clock.play();
  };
  const open = (f: Fraction) => {
    setSelected(f);
    setOpened((o) => new Set(o).add(f.id));
  };
  const tempAt = (i: number) => Math.round(FRACTIONS[i]!.boiling[0]);
  const gradient = useMemo(
    () => (
      <linearGradient id="column-heat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity=".25" />
        <stop offset="100%" stopColor="#ef4444" stopOpacity=".45" />
      </linearGradient>
    ),
    [],
  );
  const challenges = [
    { label: 'বারো কার্বনের (C₁₂) একটি অণু অনুসরণ করো: কোন অংশে জমা হলো?', done: followed.has(12) },
    { label: 'গাড়ির জ্বালানি কোন অংশ থেকে আসে, খুঁজে খোলো', done: opened.has('petrol') },
    { label: 'সবচেয়ে নিচের অবশেষটি খোলো: এটি কেন বাষ্প হয় না?', done: opened.has('bitumen') },
  ];

  return (
    <SimShell
      ref={shellRef}
      label="পেট্রোলিয়ামের আংশিক পাতন"
      clock={clock}
      onReset={() => {
        setVapours([]);
        setFollow(null);
        open(FRACTIONS[1]!);
      }}
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
        <section className="panel panel-pad" aria-label="আংশিক পাতন স্তম্ভ">
          <svg
            viewBox="0 0 380 420"
            className="mx-auto block w-full max-w-md"
            role="img"
            aria-label="আংশিক পাতন স্তম্ভ: ওপরে শীতল, নিচে গরম"
          >
            <defs>{gradient}</defs>
            <rect
              x={COL.x}
              y={COL.y}
              width={COL.w}
              height={COL.h}
              rx="10"
              fill="url(#column-heat)"
              stroke="var(--line-strong)"
              strokeWidth="2.5"
            />
            {FRACTIONS.map((f, i) => (
              <g key={f.id}>
                {i > 0 && (
                  <line
                    x1={COL.x}
                    x2={COL.x + COL.w}
                    y1={COL.y + i * TRAY_H}
                    y2={COL.y + i * TRAY_H}
                    stroke="var(--line-strong)"
                    strokeDasharray="5 4"
                  />
                )}
                <text x={COL.x - 8} y={trayY(i) + 4} textAnchor="end" fontSize="11" className="fill-muted font-mono">
                  {i === 0 ? `${bn(25)}°` : `${bn(tempAt(i))}°`}
                </text>
                <line x1={COL.x + COL.w} x2={COL.x + COL.w + 26} y1={trayY(i)} y2={trayY(i)} stroke={FRACTION_COLOURS[i]} strokeWidth="5" />
                <foreignObject x={COL.x + COL.w + 28} y={trayY(i) - 14} width="112" height="28">
                  <button
                    type="button"
                    onClick={() => open(f)}
                    aria-pressed={selected.id === f.id}
                    className={cx(
                      'w-full truncate rounded-md border px-1.5 py-0.5 text-left text-[11px] font-semibold',
                      selected.id === f.id ? 'border-gold bg-gold/20 text-ink' : 'border-line bg-surface text-muted',
                    )}
                  >
                    {f.nameBn}
                  </button>
                </foreignObject>
              </g>
            ))}
            {vapours.map((v, i) => (
              <circle
                key={i}
                cx={v.x}
                cy={v.y}
                r={2 + (FRACTIONS.length - v.target) * 0.25}
                fill={FRACTION_COLOURS[v.target]}
                opacity={v.done ? 0.5 : 0.85}
              />
            ))}
            {follow && (
              <circle
                cx={COL.x + COL.w / 2}
                cy={follow.y}
                r="7"
                fill="var(--gold)"
                stroke="var(--bg)"
                strokeWidth="2"
                style={{ filter: 'drop-shadow(0 0 6px var(--gold))' }}
              />
            )}
            {/* furnace */}
            <rect x={COL.x - 70} y={COL.y + COL.h - 30} width="60" height="40" rx="6" fill="var(--raised)" stroke="var(--line-strong)" />
            <text x={COL.x - 40} y={COL.y + COL.h - 6} textAnchor="middle" fontSize="10" className="fill-muted">
              চুল্লি
            </text>
            <path d={`M${COL.x - 10} ${COL.y + COL.h - 10} H${COL.x}`} stroke="var(--brand-ink)" strokeWidth="4" />
            <text x={COL.x - 40} y={COL.y + COL.h + 28} textAnchor="middle" fontSize="10" className="fill-muted">
              ক্রুড অয়েল (~৪০০ °সে)
            </text>
          </svg>
        </section>
        <div className="space-y-5">
          <section className="panel panel-pad space-y-2" aria-live="polite" aria-label="অংশের তথ্য">
            <p className="text-xl font-bold" style={{ color: FRACTION_COLOURS[FRACTIONS.indexOf(selected)] }}>
              {selected.nameBn}
            </p>
            <p className="text-sm text-muted">{selected.nameEn}</p>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-line bg-raised/60 px-3 py-2">
                <dt className="text-[11px] text-muted">কার্বন সংখ্যা</dt>
                <dd className="font-mono font-bold">
                  C{bn(selected.carbons[0])}–C{bn(selected.carbons[1])}
                  {selected.id === 'bitumen' ? '+' : ''}
                </dd>
              </div>
              <div className="rounded-lg border border-line bg-raised/60 px-3 py-2">
                <dt className="text-[11px] text-muted">স্ফুটনাঙ্কের পরিসর (প্রায়)</dt>
                <dd className="font-mono font-bold">
                  {selected.id === 'gas'
                    ? `< ${bn(40)}`
                    : selected.id === 'bitumen'
                      ? `> ${bn(400)}`
                      : `${bn(selected.boiling[0])}–${bn(selected.boiling[1])}`}{' '}
                  °সে
                </dd>
              </div>
            </dl>
            <p className="text-[15px]">
              <strong>ব্যবহার:</strong> {selected.usesBn}
            </p>
          </section>
          <section className="panel panel-pad space-y-3" aria-label="একটি অণু অনুসরণ করো">
            <Slider label="অণুতে কার্বন পরমাণু" value={carbons} min={1} max={50} onChange={setCarbons} format={(v) => `C${bn(v)}`} />
            <button type="button" className="btn-primary" onClick={start}>
              অণুটি অনুসরণ করো
            </button>
            <p className="text-sm text-muted" aria-live="polite">
              C{bn(carbons)} অণুটি জমবে <strong className="text-ink">{target.nameBn}</strong> অংশে। অণু যত বড়, স্ফুটনাঙ্ক তত বেশি, তাই তত
              নিচের (গরম) স্তরে তরল হয়।
            </p>
          </section>
          <ChallengeList items={challenges} />
        </div>
      </div>
    </SimShell>
  );
}
