// যৌগের সংকেত লেখা: pick a cation and an anion (radicals included) and watch the valencies criss-cross into a formula.
import { useEffect, useMemo, useState } from 'react';
import { ANIONS, CATIONS, bn, combine, findIon, type Ion } from '@/chem';
import { ChallengeList, Formula, SimShell, StepControls, cx, useSteps, useUrlInit, writeParams } from '@/ui';

const chargeText = (c: number) => `${Math.abs(c) === 1 ? '' : Math.abs(c)}${c > 0 ? '+' : '-'}`;
const ionLabel = (i: Ion) => `${i.formula}^${chargeText(i.charge)}`;

function IonPicker({ title, ions, value, onPick }: { title: string; ions: readonly Ion[]; value: string; onPick: (id: string) => void }) {
  const groups = [...new Set(ions.map((i) => Math.abs(i.charge)))];
  return (
    <div>
      <p className="label mb-2">{title}</p>
      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g} className="flex flex-wrap items-center gap-1.5">
            <span className="w-14 shrink-0 text-xs text-muted">যোজনী {bn(g)}</span>
            {ions
              .filter((i) => Math.abs(i.charge) === g)
              .map((i) => (
                <button
                  key={i.id}
                  type="button"
                  className="chip min-h-[38px]"
                  aria-pressed={value === i.id}
                  onClick={() => onPick(i.id)}
                  title={i.nameBn}
                >
                  <Formula>{ionLabel(i)}</Formula>
                </button>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FormulaWriting() {
  const [cationId, setCation] = useState('Al');
  const [anionId, setAnion] = useState('SO4');
  const [made, setMade] = useState<Set<string>>(() => new Set());
  const [simplifiedOnce, setSimplifiedOnce] = useState(false);
  const cation = findIon(cationId)!;
  const anion = findIon(anionId)!;
  const k = useMemo(() => combine(cation, anion), [cation, anion]);
  const simplify = k.divisor > 1;
  // 0 ions → 1 criss-cross → (2 simplify) → last: formula + check
  const stepCount = simplify ? 4 : 3;
  const steps = useSteps(stepCount, { intervalMs: 1800 });
  const at = steps.at;
  const showCross = at >= 1;
  const showSimplify = simplify && at >= 2;
  const final = at === stepCount - 1;

  useUrlInit((p) => {
    const c = p.get('cation');
    const a = p.get('anion');
    if (c && CATIONS.some((i) => i.id === c)) setCation(c);
    if (a && ANIONS.some((i) => i.id === a)) setAnion(a);
  });

  const pick = (kind: 'cation' | 'anion', id: string) => {
    if (kind === 'cation') setCation(id);
    else setAnion(id);
    writeParams({ [kind]: id });
    steps.restart(true);
  };

  useEffect(() => {
    if (!final) return;
    setMade((m) => (m.has(k.formula) ? m : new Set(m).add(k.formula)));
    if (simplify) setSimplifiedOnce(true);
  }, [final, k.formula, simplify]);

  const text = [
    `প্রথমে আয়ন দুটি তাদের আধানসহ লিখি: ${cation.nameBn} (${bn(cation.charge)}+) আর ${anion.nameBn} (${bn(Math.abs(anion.charge))}−)।`,
    `আড়াআড়ি গুণ (criss-cross): একটির যোজনী অন্যটির নিচে ছোট সংখ্যা হিসেবে বসে। ${cation.formula} পায় ${bn(k.raw.cation)}, ${anion.formula} পায় ${bn(k.raw.anion)}।`,
    ...(simplify
      ? [
          `দুটি সংখ্যাকেই ${bn(k.divisor)} দিয়ে ভাগ করা যায়, তাই সরলতম অনুপাতে আনি: ${bn(k.raw.cation)}:${bn(k.raw.anion)} → ${bn(k.cationCount)}:${bn(k.anionCount)}।`,
        ]
      : []),
    `যাচাই: ধনাত্মক আধান ${bn(k.cationCount)} × ${bn(cation.charge)} = ${bn(k.cationCount * cation.charge)}, ঋণাত্মক আধান ${bn(k.anionCount)} × ${bn(Math.abs(anion.charge))} = ${bn(k.anionCount * Math.abs(anion.charge))}। সমান, তাই যৌগটি আধান-নিরপেক্ষ।${anion.polyatomic && k.anionCount > 1 ? ' যৌগমূলক একাধিক থাকলে বন্ধনীর মধ্যে লিখতে হয়।' : ''}${cation.polyatomic && k.cationCount > 1 ? ' অ্যামোনিয়াম একাধিক থাকলে বন্ধনী দিতে হয়।' : ''}`,
  ];

  const sub = (n: number) => (n > 1 ? String(n) : ''); // formulas use Latin digits, as in the book
  const challenges = [
    { label: <>ক্যালসিয়াম ফসফেটের সংকেত লেখো</>, done: made.has('Ca3(PO4)2') },
    { label: <>এমন একটি যৌগ বানাও যেখানে সংখ্যা দুটি ভাগ করে সরল করতে হয় (যেমন Mg ও O)</>, done: simplifiedOnce },
    { label: <>বন্ধনী লাগে এমন দুটি যৌগ বানাও</>, done: [...made].filter((f) => f.includes('(')).length >= 2 },
  ];

  return (
    <SimShell
      label="যৌগের সংকেত লেখা"
      onReset={() => {
        setCation('Al');
        setAnion('SO4');
        writeParams({ cation: null, anion: null });
        steps.restart(false);
      }}
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="panel panel-pad space-y-5" aria-label="আয়ন বেছে নাও">
          <IonPicker title="ধনাত্মক আয়ন (ক্যাটায়ন)" ions={CATIONS} value={cationId} onPick={(id) => pick('cation', id)} />
          <IonPicker title="ঋণাত্মক আয়ন / যৌগমূলক (অ্যানায়ন)" ions={ANIONS} value={anionId} onPick={(id) => pick('anion', id)} />
        </section>

        <div className="space-y-5">
          <section className="panel panel-pad" aria-label="আড়াআড়ি গুণ">
            <div className="relative mx-auto flex max-w-md items-end justify-center gap-10 py-6 font-mono sm:gap-16">
              {[
                { ion: cation, n: k.raw.cation, final: k.cationCount },
                { ion: anion, n: k.raw.anion, final: k.anionCount },
              ].map(({ ion, n, final: f }, idx) => (
                <div key={idx} className="relative text-center">
                  <span
                    className={cx(
                      'absolute -top-6 right-0 text-xl font-bold transition-all duration-700',
                      idx === 0 ? 'text-brand-ink' : 'text-electron',
                      showCross && 'opacity-40',
                    )}
                  >
                    {Math.abs(ion.charge)}
                    {ion.charge > 0 ? '+' : '−'}
                  </span>
                  <span className="text-5xl font-bold text-ink sm:text-6xl">
                    {ion.polyatomic && (showSimplify ? f : n) > 1 ? `(${ion.formula})` : ion.formula}
                  </span>
                  <span
                    className={cx(
                      'inline-block min-w-4 align-sub text-2xl font-bold transition-all duration-700',
                      idx === 0 ? 'text-electron' : 'text-brand-ink',
                      showCross ? 'opacity-100' : 'opacity-0',
                    )}
                  >
                    {showSimplify ? sub(f) : sub(n)}
                    {showSimplify && f !== n && <span className="sr-only"> (সরল করা)</span>}
                  </span>
                  <p className="mt-1 font-sans text-xs text-muted">{ion.nameBn}</p>
                </div>
              ))}
              <svg
                className={cx(
                  'pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-500',
                  showCross && !final ? 'opacity-100' : 'opacity-0',
                )}
                viewBox="0 0 100 60"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M32 8 C 50 20, 60 30, 78 44"
                  stroke="var(--brand-ink)"
                  strokeWidth="0.8"
                  fill="none"
                  strokeDasharray="2 1.5"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d="M80 8 C 60 20, 45 30, 30 44"
                  stroke="var(--electron)"
                  strokeWidth="0.8"
                  fill="none"
                  strokeDasharray="2 1.5"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
            <p
              className="min-h-[4.5rem] rounded-xl border border-line bg-raised/60 px-4 py-3 text-[15px] leading-relaxed"
              aria-live="polite"
            >
              {text[at]}
            </p>
            <div className="mt-4">
              <StepControls steps={steps} showSpeed={false} />
            </div>
          </section>

          <section
            className={cx(
              'panel panel-pad flex flex-wrap items-center justify-between gap-4 transition',
              final ? 'border-gold/50' : 'opacity-60',
            )}
            aria-live="polite"
          >
            <div>
              <p className="label">সংকেত</p>
              <p className="mt-1 text-4xl font-bold text-gold">{final ? <Formula>{k.formula}</Formula> : '?'}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{final ? k.nameBn : ' '}</p>
              <p className="text-sm text-muted">{final ? k.nameEn : 'ধাপগুলো শেষ করো'}</p>
            </div>
          </section>

          <ChallengeList items={challenges} />
        </div>
      </div>
    </SimShell>
  );
}
