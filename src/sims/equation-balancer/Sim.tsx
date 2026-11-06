// সমীকরণের সমতা বিধান: set the coefficients yourself and watch the atom counts and the balance; ask for the answer if stuck.
import { useEffect, useMemo, useState } from 'react';
import { balance, bn, isBalanced, parseEquation, sideCounts, writeEquation, type ParsedEquation } from '@/chem';
import { ChallengeList, Equation, Formula, Icon, SimShell, cx, useUrlInit, writeParams } from '@/ui';

const EXAMPLES = [
  'H2 + O2 -> H2O',
  'Fe + O2 -> Fe2O3',
  'N2 + H2 -> NH3',
  'CH4 + O2 -> CO2 + H2O',
  'C3H8 + O2 -> CO2 + H2O',
  'Na + H2O -> NaOH + H2',
  'Al + H2SO4 -> Al2(SO4)3 + H2',
  'CaCO3 + HCl -> CaCl2 + H2O + CO2',
  'KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O',
];
const DEFAULT = 'Fe + O2 -> Fe2O3';
const MAX_COEF = 20;

function Scale({ left, right, balanced }: { left: number; right: number; balanced: boolean }) {
  const diff = left - right;
  const tilt = Math.max(-14, Math.min(14, -diff * 3)); // the side with more atoms sinks
  const ok = balanced;
  return (
    <svg
      viewBox="-160 -20 320 150"
      className="mx-auto block w-full max-w-sm"
      role="img"
      aria-label={
        ok ? 'দুই পাশ সমান' : diff > 0 ? 'বাম পাশে পরমাণু বেশি' : diff < 0 ? 'ডান পাশে পরমাণু বেশি' : 'মোট সমান, কিন্তু মৌলগুলো মেলেনি'
      }
    >
      <path d="M0 120 L-30 120 L0 70 L30 120 Z" fill="var(--raised)" stroke="var(--line-strong)" />
      <g style={{ transform: `rotate(${tilt}deg)`, transformOrigin: '0px 70px', transition: 'transform .6s ease' }}>
        <line x1="-120" y1="70" x2="120" y2="70" stroke={ok ? 'var(--block-p)' : 'var(--gold)'} strokeWidth="5" strokeLinecap="round" />
        {[-120, 120].map((x) => (
          <g key={x}>
            <line x1={x} y1="70" x2={x - 30} y2="30" stroke="var(--muted)" />
            <line x1={x} y1="70" x2={x + 30} y2="30" stroke="var(--muted)" />
            <path
              d={`M${x - 38} 30 h76 a38 14 0 0 1 -76 0`}
              fill="color-mix(in oklab, var(--gold) 25%, var(--surface))"
              stroke="var(--gold)"
            />
          </g>
        ))}
        <text x="-120" y="22" textAnchor="middle" fontSize="15" fontWeight="700" className="fill-ink font-mono">
          {bn(left)}
        </text>
        <text x="120" y="22" textAnchor="middle" fontSize="15" fontWeight="700" className="fill-ink font-mono">
          {bn(right)}
        </text>
      </g>
      <circle cx="0" cy="70" r="6" fill={ok ? 'var(--block-p)' : 'var(--gold)'} />
    </svg>
  );
}

export default function EquationBalancer() {
  const [text, setText] = useState(DEFAULT);
  const [draft, setDraft] = useState(DEFAULT);
  const [coef, setCoef] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [byHand, setByHand] = useState<Set<string>>(() => new Set());
  const [custom, setCustom] = useState(false);

  const parsed = useMemo((): { eq: ParsedEquation | null; error: string | null } => {
    try {
      return { eq: parseEquation(text), error: null };
    } catch (e) {
      return { eq: null, error: (e as Error).message };
    }
  }, [text]);
  const eq = parsed.eq;
  const answer = useMemo(() => balance(text), [text]);
  const coefficients = eq ? eq.species.map((_, i) => coef[i] ?? 1) : [];
  const counts = eq ? sideCounts(eq, coefficients) : [];
  const done = eq ? isBalanced(eq, coefficients) : false;

  useUrlInit((p) => {
    const q = p.get('eq');
    if (q) load(q);
  });
  useEffect(() => {
    if (done && !revealed) setByHand((s) => (s.has(text) ? s : new Set(s).add(text)));
  }, [done, revealed, text]);

  function load(t: string, isCustom = false) {
    setText(t);
    setDraft(t);
    setCoef([]);
    setRevealed(false);
    setCustom(isCustom);
    writeParams({ eq: t === DEFAULT ? null : t });
  }
  const setOne = (i: number, v: number) => setCoef(coefficients.map((c, j) => (j === i ? Math.max(1, Math.min(MAX_COEF, v)) : c)));
  const reveal = () => {
    if (answer.ok) {
      setCoef(answer.coefficients);
      setRevealed(true);
    }
  };

  const totalLeft = counts.filter((c) => c.element !== 'charge').reduce((s, c) => s + c.left, 0);
  const totalRight = counts.filter((c) => c.element !== 'charge').reduce((s, c) => s + c.right, 0);

  const challenges = [
    {
      label: (
        <>
          নিজে (সমাধান না দেখে) <Formula>Fe</Formula>-এর মরিচা পড়ার সমীকরণ সমতা করো
        </>
      ),
      done: byHand.has('Fe + O2 -> Fe2O3'),
    },
    {
      label: (
        <>
          প্রোপেনের দহন <Formula>C3H8</Formula> নিজে সমতা করো
        </>
      ),
      done: byHand.has('C3H8 + O2 -> CO2 + H2O'),
    },
    { label: <>বন্ধনীওয়ালা সমীকরণ (Al + H₂SO₄) নিজে সমতা করো</>, done: byHand.has('Al + H2SO4 -> Al2(SO4)3 + H2') },
    { label: <>নিজে একটি সমীকরণ লিখে সমতা করো</>, done: [...byHand].some((t) => !EXAMPLES.includes(t)) },
  ];

  return (
    <SimShell label="সমীকরণের সমতা বিধান" onReset={() => load(DEFAULT)}>
      <div className="space-y-5">
        <section className="panel panel-pad space-y-4" aria-label="সমীকরণ">
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              load(draft.trim(), true);
            }}
          >
            <label htmlFor="eq-input" className="label">
              সমীকরণ লেখো (যেমন: Fe + O2 -&gt; Fe2O3)
            </label>
            <div className="flex gap-2">
              <input
                id="eq-input"
                className="input text-base"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="btn-primary shrink-0 px-4">
                নাও
              </button>
            </div>
          </form>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="chip font-mono text-xs" aria-pressed={ex === text} onClick={() => load(ex)}>
                <Equation>{ex}</Equation>
              </button>
            ))}
          </div>
          {parsed.error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {parsed.error}
            </p>
          )}
        </section>

        {eq && (
          <section className="panel panel-pad" aria-label="সহগ বসাও">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-4 py-2">
              {eq.species.map((s, i) => {
                const firstRight = eq.species.findIndex((x) => x.side === 'right');
                return (
                  <div key={i} className="flex items-center gap-3">
                    {i > 0 && i !== firstRight && <span className="text-xl text-muted">+</span>}
                    {i === firstRight && <span className="text-2xl text-gold">→</span>}
                    <div className="flex flex-col items-center gap-1 rounded-xl border border-line bg-raised/60 px-2 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="btn-icon min-h-[34px] w-8"
                          onClick={() => setOne(i, coefficients[i]! - 1)}
                          disabled={coefficients[i] === 1}
                          aria-label={`${s.formula}-এর সহগ কমাও`}
                        >
                          −
                        </button>
                        <output className="w-7 text-center font-mono text-xl font-bold text-gold" aria-label={`${s.formula}-এর সহগ`}>
                          {bn(coefficients[i]!)}
                        </output>
                        <button
                          type="button"
                          className="btn-icon min-h-[34px] w-8"
                          onClick={() => setOne(i, coefficients[i]! + 1)}
                          disabled={coefficients[i] === MAX_COEF}
                          aria-label={`${s.formula}-এর সহগ বাড়াও`}
                        >
                          +
                        </button>
                      </div>
                      <Formula className="text-xl">{s.formula}</Formula>
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              className={cx(
                'mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3',
                done ? 'border-block-p/60 bg-block-p/10' : 'border-line bg-bg/60',
              )}
              aria-live="polite"
            >
              <p className="font-mono text-lg">
                <Equation>{writeEquation(eq, coefficients)}</Equation>
              </p>
              <p className={cx('inline-flex items-center gap-1.5 text-sm font-bold', done ? 'text-block-p' : 'text-muted')}>
                <Icon name={done ? 'check' : 'scale'} className="h-4 w-4" />
                {done ? (revealed ? 'সমতা হয়েছে (সমাধান দেখা হয়েছে)' : 'সমতা হয়েছে! তুমি নিজেই করেছ।') : 'এখনও অসম'}
              </p>
            </div>
          </section>
        )}

        {eq && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <section className="panel panel-pad" aria-label="পরমাণুর হিসাব">
              <h2 className="label mb-3">প্রতিটি মৌলের পরমাণু গোনো</h2>
              <table className="w-full text-center font-mono text-base">
                <thead>
                  <tr className="text-xs text-muted">
                    <th className="pb-2 text-left font-sans">মৌল</th>
                    <th className="pb-2 font-sans">বিক্রিয়ক</th>
                    <th className="pb-2 font-sans">উৎপাদ</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {counts.map((c) => {
                    const ok = c.left === c.right;
                    return (
                      <tr key={c.element} className="border-t border-line">
                        <td className="py-2 text-left font-semibold">{c.element === 'charge' ? 'আধান' : c.element}</td>
                        <td className={cx('py-2', !ok && c.left > c.right && 'font-bold text-gold')}>{bn(c.left)}</td>
                        <td className={cx('py-2', !ok && c.right > c.left && 'font-bold text-gold')}>{bn(c.right)}</td>
                        <td className={cx('py-2', ok ? 'text-block-p' : 'text-exc')}>{ok ? '✓' : '✗'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
            <section className="panel panel-pad" aria-label="নিক্তি">
              <h2 className="label mb-1">মোট পরমাণু: দুই পাশ সমান না হওয়া পর্যন্ত নিক্তি হেলে থাকবে</h2>
              <Scale left={totalLeft} right={totalRight} balanced={done} />
              {!done && totalLeft === totalRight && (
                <p className="text-center text-xs text-muted">মোট সংখ্যা সমান হলেও প্রতিটি মৌল আলাদা করে মেলাতে হবে।</p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted">আটকে গেলে: যে মৌলটি দুই পাশে একবার করে আছে, আগে তার সমতা করো; O ও H শেষে।</p>
                <button type="button" className="btn-secondary" onClick={reveal} disabled={!answer.ok || done}>
                  <Icon name="eye" className="h-4 w-4" /> সমাধান দেখো
                </button>
              </div>
              {!answer.ok && <p className="mt-2 text-sm text-danger">{answer.message}</p>}
              {custom && answer.ok && !done && (
                <p className="mt-2 text-xs text-muted">তোমার লেখা সমীকরণটি সমতা করা সম্ভব। চেষ্টা করে দেখো!</p>
              )}
            </section>
          </div>
        )}

        <ChallengeList items={challenges} />
      </div>
    </SimShell>
  );
}
