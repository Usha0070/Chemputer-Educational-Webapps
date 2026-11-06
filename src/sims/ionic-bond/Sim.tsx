// আয়নিক বন্ধন: electrons move one by one from metal atoms to non-metal atoms until every ion has a noble-gas shell.
import { useEffect, useMemo, useState } from 'react';
import { bohrShells, bn, element, ionicPlan, ionShells } from '@/chem';
import { ChallengeList, Formula, SimShell, StepControls, cx, useSteps, useUrlInit, writeParams } from '@/ui';

const PAIRS = [
  { id: 'NaCl', metal: 11, nonmetal: 17 },
  { id: 'MgO', metal: 12, nonmetal: 8 },
  { id: 'CaCl2', metal: 20, nonmetal: 17 },
  { id: 'Na2O', metal: 11, nonmetal: 8 },
  { id: 'MgCl2', metal: 12, nonmetal: 17 },
  { id: 'Al2O3', metal: 13, nonmetal: 8 },
] as const;
type PairId = (typeof PAIRS)[number]['id'];

const shellR = (k: number) => 18 + 13 * k;
const SPACING = 150;

interface AtomSlot {
  kind: 'metal' | 'nonmetal';
  index: number;
  z: number;
  x: number;
}

/** Interleave the atoms so each metal sits next to the non-metals it gives electrons to. */
function layout(metal: number, nonmetal: number, mCount: number, nCount: number): AtomSlot[] {
  const out: AtomSlot[] = [];
  const total = mCount + nCount;
  const startWithNon = nCount > mCount;
  let m = 0;
  let n = 0;
  for (let i = 0; i < total; i++) {
    const wantNon = startWithNon ? i % 2 === 0 : i % 2 === 1;
    if ((wantNon && n < nCount) || m >= mCount) out.push({ kind: 'nonmetal', index: n++, z: nonmetal, x: 0 });
    else out.push({ kind: 'metal', index: m++, z: metal, x: 0 });
  }
  return out.map((a, i) => ({ ...a, x: (i - (total - 1) / 2) * SPACING }));
}

const onShell = (r: number, k: number, n: number, offset = -Math.PI / 2): [number, number] => {
  const a = offset + (2 * Math.PI * k) / Math.max(n, 1);
  return [r * Math.cos(a), r * Math.sin(a)];
};

function Cross({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={color} strokeWidth="2.2" strokeLinecap="round">
      <path d="M-4 -4 L4 4 M4 -4 L-4 4" />
    </g>
  );
}

export default function IonicBond() {
  const [pairId, setPairId] = useState<PairId>('NaCl');
  const [seen, setSeen] = useState<Set<PairId>>(() => new Set());
  const pair = PAIRS.find((p) => p.id === pairId)!;
  const plan = useMemo(() => ionicPlan(pair.metal, pair.nonmetal), [pair]);
  const atoms = useMemo(() => layout(pair.metal, pair.nonmetal, plan.metalCount, plan.nonmetalCount), [pair, plan]);
  const steps = useSteps(plan.transfers.length + 2, { intervalMs: 1200 });
  const moved = Math.min(steps.at, plan.transfers.length);
  const ionsFormed = steps.at === plan.transfers.length + 1;

  useUrlInit((p) => {
    const id = p.get('pair') as PairId | null;
    if (id && PAIRS.some((x) => x.id === id)) setPairId(id);
  });
  const choose = (id: PairId) => {
    setPairId(id);
    writeParams({ pair: id === 'NaCl' ? null : id });
    steps.restart(false);
  };
  useEffect(() => {
    if (ionsFormed) setSeen((s) => (s.has(pairId) ? s : new Set(s).add(pairId)));
  }, [ionsFormed, pairId]);

  const m = element(pair.metal);
  const x = element(pair.nonmetal);
  const mShells = bohrShells(pair.metal);
  const xShells = bohrShells(pair.nonmetal);
  const width = atoms.length * SPACING + 40;

  // Where each transferable electron is: [x, y] on the metal before moving, on the non-metal after.
  const electron = (t: number) => {
    const [mi, ni] = plan.transfers[t]!;
    const ma = atoms.find((a) => a.kind === 'metal' && a.index === mi)!;
    const na = atoms.find((a) => a.kind === 'nonmetal' && a.index === ni)!;
    const k = plan.transfers.slice(0, t).filter(([mm]) => mm === mi).length;
    const from = onShell(shellR(mShells.length - 1), k, plan.give, -Math.PI / 4);
    const slot = plan.transfers.slice(0, t).filter(([, nn]) => nn === ni).length;
    const r = shellR(xShells.length - 1);
    const to = onShell(r, (xShells.at(-1) ?? 0) + slot, 8);
    return t < moved ? { x: na.x + to[0], y: to[1] } : { x: ma.x + from[0], y: from[1] };
  };

  const text =
    steps.at === 0
      ? `${m.name}ের শেষ শক্তিস্তরে ${bn(plan.give)}টি আর ${x.name}ের শেষ শক্তিস্তরে ${bn(8 - plan.take)}টি ইলেকট্রন। কেউই নিষ্ক্রিয় গ্যাসের মতো স্থিতিশীল নয়। ধাতু ইলেকট্রন ছেড়ে দেয়, অধাতু গ্রহণ করে।`
      : !ionsFormed
        ? `${bn(moved)} নম্বর ইলেকট্রনটি ${m.symbol} থেকে ${x.symbol}-এ গেল (×)। মোট ${bn(plan.transfers.length)}টি ইলেকট্রন সরবে।`
        : `${m.symbol}${plan.give > 1 ? plan.give : ''}+ আয়নের বিন্যাস (${ionShells(pair.metal, plan.give).map(bn).join(', ')}) আর ${x.symbol}${plan.take > 1 ? plan.take : ''}− আয়নের বিন্যাস (${ionShells(pair.nonmetal, -plan.take).map(bn).join(', ')}), দুটিই নিষ্ক্রিয় গ্যাসের মতো। বিপরীত আধানের আয়নগুলোর তড়িৎ-আকর্ষণই আয়নিক বন্ধন।`;

  const challenges = [
    { label: 'NaCl তৈরি দেখো: কয়টি ইলেকট্রন সরল?', done: seen.has('NaCl') },
    { label: 'MgO-তে Mg কয়টি ইলেকট্রন দেয়? শেষ পর্যন্ত চালাও', done: seen.has('MgO') },
    { label: 'CaCl₂ বানাও: Ca-এর দুটি ইলেকট্রন দুটি আলাদা Cl পরমাণুতে যায়', done: seen.has('CaCl2') },
    { label: 'Al₂O₃: মোট কয়টি ইলেকট্রন সরে? (৬)', done: seen.has('Al2O3') },
  ];

  return (
    <SimShell label="আয়নিক বন্ধন" onReset={() => choose('NaCl')}>
      <div className="space-y-5">
        <section className="panel panel-pad" aria-label="যৌগ বেছে নাও">
          <p className="label mb-2">যৌগ বেছে নাও</p>
          <div className="flex flex-wrap gap-2">
            {PAIRS.map((p) => (
              <button key={p.id} type="button" className="chip" aria-pressed={p.id === pairId} onClick={() => choose(p.id)}>
                <Formula>{p.id}</Formula>
              </button>
            ))}
          </div>
        </section>

        <section className="panel panel-pad" aria-label="ইলেকট্রন স্থানান্তর">
          <svg viewBox={`${-width / 2} -95 ${width} 205`} className="mx-auto block w-full max-w-4xl" role="img" aria-label={text}>
            {atoms.map((a) => {
              const shells = a.kind === 'metal' ? mShells : xShells;
              const lostAll = a.kind === 'metal' && ionsFormed;
              const color = a.kind === 'metal' ? 'var(--brand-ink)' : 'var(--electron)';
              const own = a.kind === 'nonmetal' ? (xShells.at(-1) ?? 0) : 0;
              return (
                <g key={`${a.kind}${a.index}`} transform={`translate(${a.x} 0)`}>
                  {shells.map((n, k) => {
                    const outer = k === shells.length - 1;
                    const hidden = outer && lostAll;
                    return (
                      <g key={k}>
                        <circle
                          r={shellR(k)}
                          fill="none"
                          stroke="var(--line-strong)"
                          strokeDasharray={hidden ? '3 5' : undefined}
                          opacity={hidden ? 0.35 : 1}
                        />
                        {!outer &&
                          Array.from({ length: n }, (_, j) => {
                            const [ex, ey] = onShell(shellR(k), j, n);
                            return <circle key={j} cx={ex} cy={ey} r="2.6" fill="var(--muted)" />;
                          })}
                      </g>
                    );
                  })}
                  {a.kind === 'nonmetal' &&
                    Array.from({ length: own }, (_, j) => {
                      const [ex, ey] = onShell(shellR(shells.length - 1), j, 8);
                      return <circle key={j} cx={ex} cy={ey} r="4" fill={color} />;
                    })}
                  <circle
                    r="13"
                    fill={
                      a.kind === 'metal'
                        ? 'color-mix(in oklab, var(--brand) 55%, var(--surface))'
                        : 'color-mix(in oklab, var(--electron) 35%, var(--surface))'
                    }
                  />
                  <text textAnchor="middle" y="5" fontSize="13" fontWeight="700" className="fill-ink">
                    {a.kind === 'metal' ? m.symbol : x.symbol}
                  </text>
                  {ionsFormed && (
                    <g>
                      <path
                        d={`M${-shellR(shells.length - 1) - 10} -${shellR(shells.length - 1) + 8} h-6 v${2 * shellR(shells.length - 1) + 16} h6`}
                        fill="none"
                        stroke="var(--ink)"
                        strokeWidth="1.5"
                      />
                      <path
                        d={`M${shellR(shells.length - 1) + 10} -${shellR(shells.length - 1) + 8} h6 v${2 * shellR(shells.length - 1) + 16} h-6`}
                        fill="none"
                        stroke="var(--ink)"
                        strokeWidth="1.5"
                      />
                      <text
                        x={shellR(shells.length - 1) + 20}
                        y={-shellR(shells.length - 1) - 2}
                        fontSize="15"
                        fontWeight="700"
                        className={a.kind === 'metal' ? 'fill-brand-ink' : 'fill-electron'}
                      >
                        {a.kind === 'metal' ? `${plan.give > 1 ? plan.give : ''}+` : `${plan.take > 1 ? plan.take : ''}−`}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
            {plan.transfers.map((_, t) => {
              const p = electron(t);
              return (
                <g key={t} style={{ transform: `translate(${p.x}px, ${p.y}px)`, transition: 'transform .9s cubic-bezier(.4,0,.2,1)' }}>
                  <Cross x={0} y={0} color="var(--brand-ink)" />
                </g>
              );
            })}
          </svg>
          <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="font-bold text-brand-ink">×</span> ধাতুর ইলেকট্রন
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-electron" /> অধাতুর নিজের ইলেকট্রন
            </span>
          </div>
          <p
            className={cx(
              'mt-4 min-h-[4.5rem] rounded-xl border px-4 py-3 text-[15px] leading-relaxed',
              ionsFormed ? 'border-gold/50 bg-gold/10' : 'border-line bg-raised/60',
            )}
            aria-live="polite"
          >
            {text}
          </p>
          <div className="mt-4">
            <StepControls steps={steps} />
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3" aria-live="polite">
          <div className="rounded-xl border border-line bg-raised/60 px-4 py-3">
            <p className="text-xs font-semibold text-muted">ধাতু {m.symbol}</p>
            <p className="font-mono text-lg">
              {mShells.map(bn).join(', ')} → {ionsFormed ? ionShells(pair.metal, plan.give).map(bn).join(', ') : '…'}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-raised/60 px-4 py-3">
            <p className="text-xs font-semibold text-muted">অধাতু {x.symbol}</p>
            <p className="font-mono text-lg">
              {xShells.map(bn).join(', ')} → {ionsFormed ? ionShells(pair.nonmetal, -plan.take).map(bn).join(', ') : '…'}
            </p>
          </div>
          <div className={cx('rounded-xl border px-4 py-3', ionsFormed ? 'border-gold/50' : 'border-line')}>
            <p className="text-xs font-semibold text-muted">সংকেত</p>
            <p className="text-2xl font-bold text-gold">{ionsFormed ? <Formula>{plan.formula}</Formula> : '?'}</p>
          </div>
        </section>

        <ChallengeList items={challenges} />
      </div>
    </SimShell>
  );
}
