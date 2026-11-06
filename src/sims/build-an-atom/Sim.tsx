// পরমাণু তৈরি করো: add protons, neutrons and electrons; see the element, mass number, charge, ion/isotope and Bohr shells.
import { useMemo, useRef, useState } from 'react';
import { MAX_BUILD_Z, analyzeAtom, bn, element, typicalAtom, type AtomState } from '@/chem';
import { ChallengeList, Icon, SimShell, Stepper, cx, useActive, usePrefersReducedMotion, useUrlInit, writeParams } from '@/ui';

const DEFAULT: AtomState = { protons: 6, neutrons: 6, electrons: 6 };
const MAX_N = 26;
const MAX_E = 20;
const PRESETS: { label: string; atom: AtomState }[] = [
  { label: '¹H', atom: { protons: 1, neutrons: 0, electrons: 1 } },
  { label: '⁴He', atom: { protons: 2, neutrons: 2, electrons: 2 } },
  { label: '¹²C', atom: { protons: 6, neutrons: 6, electrons: 6 } },
  { label: '²³Na', atom: { protons: 11, neutrons: 12, electrons: 11 } },
  { label: 'Na⁺', atom: { protons: 11, neutrons: 12, electrons: 10 } },
  { label: '³⁵Cl⁻', atom: { protons: 17, neutrons: 18, electrons: 18 } },
  { label: '⁴⁰Ca²⁺', atom: { protons: 20, neutrons: 20, electrons: 18 } },
];
const KIND_TEXT = {
  empty: 'কিছুই নেই',
  'nucleus-only': 'শুধু নিউক্লিয়াস',
  neutral: 'নিরপেক্ষ পরমাণু',
  cation: 'ধনাত্মক আয়ন (ক্যাটায়ন)',
  anion: 'ঋণাত্মক আয়ন (অ্যানায়ন)',
} as const;
const SHELL_NAMES = ['K', 'L', 'M', 'N'];

/** Sunflower packing for the nucleus; protons and neutrons interleaved evenly. */
function nucleons(p: number, n: number) {
  const total = p + n;
  const out: { x: number; y: number; kind: 'p' | 'n' }[] = [];
  let placedP = 0;
  for (let i = 0; i < total; i++) {
    const wantP = Math.round(((i + 1) * p) / total);
    const kind = wantP > placedP ? 'p' : 'n';
    if (kind === 'p') placedP++;
    const r = 6.2 * Math.sqrt(i + 0.5);
    const a = i * 2.39996;
    out.push({ x: r * Math.cos(a), y: r * Math.sin(a), kind });
  }
  return out.reverse(); // outer ones first, so the centre draws on top
}

function AtomDiagram({ atom, shells, spinning, label }: { atom: AtomState; shells: number[]; spinning: boolean; label: string }) {
  const parts = nucleons(atom.protons, atom.neutrons);
  const radii = [64, 92, 120, 148];
  return (
    <svg viewBox="-170 -170 340 340" className="mx-auto block h-auto w-full max-w-[420px]" role="img" aria-label={label}>
      {radii.map((r, i) => (
        <circle
          key={r}
          r={r}
          fill="none"
          stroke="var(--line-strong)"
          strokeDasharray={i < shells.length ? undefined : '3 6'}
          strokeWidth="1.2"
        />
      ))}
      {shells.map((count, i) => (
        <g
          key={i}
          style={{
            animation: `spin ${14 + i * 6}s linear infinite`,
            animationPlayState: spinning ? 'running' : 'paused',
            transformOrigin: '0 0',
          }}
        >
          {Array.from({ length: count }, (_, j) => {
            const a = (2 * Math.PI * j) / count + i * 0.4;
            return (
              <circle
                key={j}
                cx={radii[i]! * Math.cos(a)}
                cy={radii[i]! * Math.sin(a)}
                r="6"
                fill="var(--electron)"
                stroke="var(--bg)"
                strokeWidth="1.5"
              />
            );
          })}
        </g>
      ))}
      {SHELL_NAMES.slice(0, shells.length).map((name, i) => (
        <text key={name} x={radii[i]! * 0.71 + 6} y={-radii[i]! * 0.71 - 6} className="fill-muted font-mono" fontSize="11">
          {name}
        </text>
      ))}
      <g>
        {parts.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r="6.4"
            fill={pt.kind === 'p' ? 'var(--proton)' : 'var(--neutron)'}
            stroke="var(--bg)"
            strokeWidth="1"
          />
        ))}
      </g>
      {parts.length === 0 && (
        <text textAnchor="middle" y="5" className="fill-muted" fontSize="13">
          কণা যোগ করো
        </text>
      )}
    </svg>
  );
}

function Notation({ mass, z, symbol, charge }: { mass: number; z: number; symbol: string; charge: string }) {
  return (
    <span
      className="inline-flex items-center font-mono leading-none"
      aria-label={`ভরসংখ্যা ${mass}, পারমাণবিক সংখ্যা ${z}, ${symbol}${charge ? ', আধান ' + charge : ''}`}
    >
      <span className="flex flex-col items-end text-base sm:text-lg" aria-hidden="true">
        <span className="text-gold">{mass}</span>
        <span className="text-brand-ink">{z}</span>
      </span>
      <span className="ms-1 text-5xl font-bold text-ink sm:text-6xl" aria-hidden="true">
        {symbol}
      </span>
      <span className="ms-1 self-start text-xl font-bold text-exc sm:text-2xl" aria-hidden="true">
        {charge}
      </span>
    </span>
  );
}

// Mini table of Z = 1–20 (rows of 2, 8, 8, 2) to show which element the protons make.
const MINI_ROWS = [
  [1, null, null, null, null, null, null, 2],
  [3, 4, 5, 6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15, 16, 17, 18],
  [19, 20, null, null, null, null, null, null],
];

export default function BuildAnAtom() {
  const shellRef = useRef<HTMLDivElement>(null);
  const active = useActive(shellRef);
  const reduced = usePrefersReducedMotion();
  const [atom, setAtom] = useState<AtomState>(DEFAULT);
  const [made, setMade] = useState<Set<string>>(() => new Set());
  const r = useMemo(() => analyzeAtom(atom), [atom]);

  useUrlInit((params) => {
    const get = (k: string, max: number) => {
      const raw = params.get(k);
      if (raw === null || raw.trim() === '') return null;
      const v = Number(raw);
      return Number.isInteger(v) && v >= 0 && v <= max ? v : null;
    };
    const p = get('p', MAX_BUILD_Z);
    const n = get('n', MAX_N);
    const e = get('e', MAX_E);
    if (p !== null && n !== null && e !== null) set({ protons: p, neutrons: n, electrons: e });
  });

  function set(next: AtomState) {
    setAtom(next);
    setMade((m) => new Set(m).add(`${next.protons}-${next.neutrons}-${next.electrons}`));
    writeParams({ p: next.protons, n: next.neutrons, e: next.electrons });
  }
  const update = (k: keyof AtomState) => (v: number) => set({ ...atom, [k]: v });

  const has = (p: number, n: number, e: number) => made.has(`${p}-${n}-${e}`);
  const history = [...made].map((k) => k.split('-').map(Number) as [number, number, number]);
  const madeCl35 = history.some(([p, n]) => p === 17 && n === 18);
  const madeCl37 = history.some(([p, n]) => p === 17 && n === 20);
  const challenges = [
    { label: 'কার্বন-১৪ বানাও (৬টি প্রোটন, কয়টি নিউট্রন লাগবে?)', done: has(6, 8, 6) },
    { label: 'ম্যাগনেসিয়াম আয়ন Mg²⁺ বানাও', done: has(12, 12, 10) || has(12, 13, 10) || has(12, 14, 10) },
    { label: 'ক্লোরিনের দুটি আইসোটোপ ³⁵Cl ও ³⁷Cl দুটোই বানাও', done: madeCl35 && madeCl37 },
    {
      label: 'এমন একটি আয়ন বানাও যার ইলেকট্রন বিন্যাস আর্গনের মতো (২, ৮, ৮)',
      done: history.some(([p, , e]) => p > 0 && p !== 18 && e === 18),
    },
  ];

  const el = r.element;
  const desc = el
    ? `${bn(atom.protons)}টি প্রোটন, ${bn(atom.neutrons)}টি নিউট্রন ও ${bn(atom.electrons)}টি ইলেকট্রন: ${el.name}, ভরসংখ্যা ${bn(r.massNumber)}, ${KIND_TEXT[r.kind]}`
    : 'কোনো প্রোটন নেই';

  return (
    <SimShell ref={shellRef} label="পরমাণু তৈরি করো" onReset={() => set(DEFAULT)}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <section className="panel panel-pad" aria-label="পরমাণুর চিত্র">
          <AtomDiagram atom={atom} shells={r.shells} spinning={active && !reduced} label={desc} />
          <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-proton" /> প্রোটন (+)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-neutron" /> নিউট্রন (০)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-electron" /> ইলেকট্রন (−)
            </span>
          </div>
          <div className="mt-4 space-y-2">
            <Stepper
              label="প্রোটন"
              value={atom.protons}
              max={MAX_BUILD_Z}
              onChange={update('protons')}
              swatch="var(--proton)"
              hint="মৌল কোনটি, তা ঠিক করে"
            />
            <Stepper
              label="নিউট্রন"
              value={atom.neutrons}
              max={MAX_N}
              onChange={update('neutrons')}
              swatch="var(--neutron)"
              hint="ভর বাড়ায়, আধান বদলায় না"
            />
            <Stepper
              label="ইলেকট্রন"
              value={atom.electrons}
              max={MAX_E}
              onChange={update('electrons')}
              swatch="var(--electron)"
              hint="আধান ঠিক করে"
            />
          </div>
          <div className="mt-4">
            <p className="label mb-2">দ্রুত বানাও</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((pr) => (
                <button
                  key={pr.label}
                  type="button"
                  className="chip font-mono"
                  aria-pressed={
                    pr.atom.protons === atom.protons && pr.atom.neutrons === atom.neutrons && pr.atom.electrons === atom.electrons
                  }
                  onClick={() => set(pr.atom)}
                >
                  {pr.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="space-y-5">
          <section className="panel panel-pad" aria-live="polite" aria-label="ফলাফল">
            {el && r.notation ? (
              <div className="flex flex-wrap items-center gap-5">
                <div className="grid h-28 min-w-28 place-items-center rounded-2xl border border-line bg-bg px-4">
                  <Notation {...r.notation} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold">{el.name}</p>
                  <p className="text-sm text-muted">
                    {el.name}-{bn(r.massNumber)} · {KIND_TEXT[r.kind]}
                  </p>
                  <p
                    className={cx(
                      'mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      r.stability === 'stable' ? 'bg-block-p/15 text-block-p' : 'bg-exc/15 text-exc',
                    )}
                  >
                    <Icon name={r.stability === 'stable' ? 'check' : 'alert'} className="h-3.5 w-3.5" />
                    {r.stability === 'stable' ? 'স্থিতিশীল আইসোটোপ' : 'অস্থিতিশীল (তেজস্ক্রিয়) নিউক্লিয়াস'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted">{r.note ?? 'প্রোটন যোগ করো: প্রোটনের সংখ্যা দেখেই মৌল চেনা যায়।'}</p>
            )}
            {r.note && el && <p className="mt-3 rounded-lg border border-line bg-raised/60 px-3 py-2 text-sm text-ink/85">{r.note}</p>}

            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['পারমাণবিক সংখ্যা (Z)', bn(atom.protons), 'প্রোটন সংখ্যা'],
                ['ভরসংখ্যা (A)', bn(r.massNumber), `${bn(atom.protons)} + ${bn(atom.neutrons)}`],
                [
                  'আধান',
                  r.charge === 0 ? '০' : `${r.charge > 0 ? '+' : '−'}${bn(Math.abs(r.charge))}`,
                  `${bn(atom.protons)} − ${bn(atom.electrons)}`,
                ],
                [
                  'শক্তিস্তর',
                  r.shells.length ? r.shells.map((s) => bn(s)).join(', ') : '—',
                  r.shells.length ? SHELL_NAMES.slice(0, r.shells.length).join(', ') : '',
                ],
              ].map(([k, v, sub]) => (
                <div key={k} className="rounded-xl border border-line bg-raised/60 px-3 py-2 text-center">
                  <dt className="text-[11px] font-semibold text-muted">{k}</dt>
                  <dd className="font-mono text-xl font-bold text-ink">{v}</dd>
                  <dd className="font-mono text-[11px] text-muted">{sub}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="panel panel-pad" aria-label="পর্যায় সারণিতে অবস্থান">
            <h2 className="label mb-3">প্রোটনের সংখ্যা ঠিক করে কোন মৌল</h2>
            <div className="mx-auto grid max-w-sm grid-cols-8 gap-1">
              {MINI_ROWS.flatMap((row, ri) =>
                row.map((z, ci) =>
                  z ? (
                    <button
                      key={`${ri}-${ci}`}
                      type="button"
                      onClick={() => set(typicalAtom(z))}
                      aria-pressed={z === atom.protons}
                      aria-label={`${element(z).name} বানাও`}
                      className={cx(
                        'aspect-square rounded-md border text-center font-mono text-[11px] font-bold transition sm:text-sm',
                        z === atom.protons
                          ? 'border-gold bg-gold/20 text-ink'
                          : 'border-line bg-raised/60 text-muted hover:border-accent/60',
                      )}
                    >
                      {element(z).symbol}
                    </button>
                  ) : (
                    <span key={`${ri}-${ci}`} />
                  ),
                ),
              )}
            </div>
          </section>

          <ChallengeList items={challenges} />
        </div>
      </div>
    </SimShell>
  );
}
