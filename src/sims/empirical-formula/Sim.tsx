// শতকরা সংযুতি → স্থূল ও আণবিক সংকেত: a step-by-step solver, plus the reverse view (% composition of a formula).
import { useMemo, useState } from 'react';
import {
  ALL_SYMBOLS,
  bn,
  bnFixed,
  empiricalFormula,
  molecularFormula,
  parseDecimal,
  parseFormula,
  percentComposition,
  type MassMode,
} from '@/chem';
import { ChallengeList, Formula, Icon, Segmented, SimShell, cx, useUrlInit, writeParams, type SegmentedOption } from '@/ui';

interface Row {
  symbol: string;
  percent: string;
}
const PRESETS: { label: string; rows: Row[]; molar?: string }[] = [
  {
    label: 'গ্লুকোজ',
    rows: [
      { symbol: 'C', percent: '40' },
      { symbol: 'H', percent: '6.67' },
      { symbol: 'O', percent: '53.33' },
    ],
    molar: '180',
  },
  {
    label: 'আয়রন অক্সাইড',
    rows: [
      { symbol: 'Fe', percent: '70' },
      { symbol: 'O', percent: '30' },
    ],
  },
  {
    label: 'বেনজিন',
    rows: [
      { symbol: 'C', percent: '92.3' },
      { symbol: 'H', percent: '7.7' },
    ],
    molar: '78',
  },
  {
    label: 'ইথিন',
    rows: [
      { symbol: 'C', percent: '85.7' },
      { symbol: 'H', percent: '14.3' },
    ],
    molar: '28',
  },
  {
    label: 'নাইট্রোজেন ডাইঅক্সাইড',
    rows: [
      { symbol: 'N', percent: '30.43' },
      { symbol: 'O', percent: '69.57' },
    ],
    molar: '46',
  },
];
type View = 'solve' | 'composition';
const VIEWS: SegmentedOption<View>[] = [
  { value: 'solve', label: 'শতকরা → সংকেত' },
  { value: 'composition', label: 'সংকেত → শতকরা' },
];
const COMMON = ['C', 'H', 'O', 'N', 'S', 'Cl', 'Na', 'K', 'Ca', 'Mg', 'Al', 'Fe', 'Cu', 'P', 'Zn', 'Br'];
const SYMBOLS = [...COMMON, ...ALL_SYMBOLS.filter((s) => !COMMON.includes(s))];

export default function EmpiricalFormula() {
  const [view, setView] = useState<View>('solve');
  const [rows, setRows] = useState<Row[]>(PRESETS[0]!.rows);
  const [molar, setMolar] = useState('180');
  const [mode, setMode] = useState<MassMode>('ssc');
  const [shown, setShown] = useState(1); // how many solution steps are visible
  const [edited, setEdited] = useState(false);
  const [solvedOwn, setSolvedOwn] = useState(false);
  const [solved, setSolved] = useState<Set<string>>(() => new Set());
  const [compFormula, setCompFormula] = useState('H2O');
  const [compDraft, setCompDraft] = useState('H2O');
  const [comps, setComps] = useState<Set<string>>(() => new Set());

  const parts = rows
    .map((r) => ({ symbol: r.symbol, percent: parseDecimal(r.percent) }))
    .filter((p) => Number.isFinite(p.percent) && p.percent > 0);
  const result = useMemo(() => {
    try {
      return parts.length ? empiricalFormula(parts, mode) : null;
    } catch {
      return null;
    }
  }, [JSON.stringify(parts), mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const M = parseDecimal(molar);
  const molecular = result && Number.isFinite(M) && M > 0 ? molecularFormula(result, M) : null;
  const composition = useMemo(() => {
    try {
      return percentComposition(compFormula, mode);
    } catch {
      return null;
    }
  }, [compFormula, mode]);

  useUrlInit((p) => {
    if (p.get('view') === 'composition') setView('composition');
    const f = p.get('f');
    if (f) {
      setCompFormula(f);
      setCompDraft(f);
    }
  });

  const reveal = () => {
    let next = Math.min(6, shown + 1);
    if (next === 4 && result?.multiplier === 1) next = 5; // nothing to multiply: go straight to whole numbers
    setShown(next);
    if (next >= 5 && result) {
      setSolved((s) => new Set(s).add(result.formula));
      if (edited) setSolvedOwn(true);
    }
    if (next >= 6 && molecular) setSolved((s) => new Set(s).add(molecular.formula));
  };
  const update = (i: number, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    setShown(1);
    setEdited(true);
  };
  const preset = (p: (typeof PRESETS)[number]) => {
    setRows(p.rows);
    setMolar(p.molar ?? '');
    setShown(1);
    setEdited(false);
  };

  const STEP_TITLES = [
    'শতকরা পরিমাণ',
    '÷ পারমাণবিক ভর (মোল অনুপাত)',
    '÷ সবচেয়ে ছোট মান',
    `× ${bn(result?.multiplier ?? 1)} (পূর্ণসংখ্যা করতে)`,
    'পূর্ণসংখ্যা',
  ];

  const challenges = [
    {
      label: (
        <>
          গ্লুকোজের আণবিক সংকেত <Formula>C6H12O6</Formula> ধাপে ধাপে বের করো
        </>
      ),
      done: solved.has('C6H12O6'),
    },
    { label: <>এমন একটি সমস্যা সমাধান করো যেখানে অনুপাতকে ২ দিয়ে গুণ করতে হয় (আয়রন অক্সাইড)</>, done: solved.has('Fe2O3') },
    { label: <>পানিতে অক্সিজেনের শতকরা পরিমাণ বের করো</>, done: comps.has('H2O') && view === 'composition' },
    { label: <>নিজের দেওয়া উপাত্ত থেকে একটি সংকেত বের করো</>, done: solvedOwn },
  ];

  return (
    <SimShell
      label="স্থূল ও আণবিক সংকেত নির্ণয়"
      onReset={() => {
        preset(PRESETS[0]!);
        setView('solve');
      }}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            options={VIEWS}
            value={view}
            onChange={(v) => {
              setView(v);
              writeParams({ view: v === 'solve' ? null : v });
            }}
            label="কী করবে"
          />
          <Segmented
            options={
              [
                { value: 'ssc', label: 'বইয়ের মান' },
                { value: 'precise', label: 'নিখুঁত মান' },
              ] as SegmentedOption<MassMode>[]
            }
            value={mode}
            onChange={setMode}
            label="পারমাণবিক ভরের মান"
          />
        </div>

        {view === 'solve' ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <section className="panel panel-pad space-y-4" aria-label="উপাত্ত">
              <div>
                <p className="label mb-2">উদাহরণ</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button key={p.label} type="button" className="chip" onClick={() => preset(p)}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="label">মৌল ও শতকরা পরিমাণ</p>
                {rows.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      className="input min-h-[44px] w-24 px-2 text-base"
                      value={r.symbol}
                      onChange={(e) => update(i, { symbol: e.target.value })}
                      aria-label={`${bn(i + 1)} নম্বর মৌল`}
                    >
                      {SYMBOLS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input min-h-[44px] text-base"
                      inputMode="decimal"
                      value={r.percent}
                      onChange={(e) => update(i, { percent: e.target.value })}
                      aria-label={`${r.symbol}-এর শতকরা পরিমাণ`}
                    />
                    <span className="text-muted">%</span>
                    <button
                      type="button"
                      className="btn-icon min-h-[40px] w-10 shrink-0"
                      onClick={() => (setRows((rs) => rs.filter((_, j) => j !== i)), setEdited(true), setShown(1))}
                      disabled={rows.length <= 1}
                      aria-label="মৌলটি বাদ দাও"
                    >
                      <Icon name="x" className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => (setRows((rs) => [...rs, { symbol: 'O', percent: '' }]), setEdited(true))}
                  disabled={rows.length >= 5}
                >
                  + মৌল যোগ করো
                </button>
                {result && Math.abs(result.total - 100) > 1.5 && (
                  <p className="text-xs text-exc">মোট {bnFixed(result.total, 2)}%: সাধারণত মোট ১০০% হওয়ার কথা। বাকি অংশ কি অক্সিজেন?</p>
                )}
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="label">আণবিক ভর (জানা থাকলে), g/mol</span>
                <input
                  className="input min-h-[44px] text-base"
                  inputMode="decimal"
                  value={molar}
                  onChange={(e) => setMolar(e.target.value)}
                  placeholder="যেমন: ১৮০"
                />
              </label>
            </section>

            <section className="panel panel-pad space-y-4" aria-label="ধাপে ধাপে সমাধান" aria-live="polite">
              {result ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] text-center font-mono text-sm">
                      <thead>
                        <tr className="text-xs text-muted">
                          <th className="pb-2 text-left font-sans">ধাপ</th>
                          {result.steps.map((s) => (
                            <th key={s.symbol} className="pb-2 text-base text-ink">
                              {s.symbol}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          (s: (typeof result.steps)[number]) => `${bn(s.percent)}`,
                          (s: (typeof result.steps)[number]) => `${bn(s.percent)} ÷ ${bn(s.atomicMass)} = ${bnFixed(s.moles, 3)}`,
                          (s: (typeof result.steps)[number]) => bnFixed(s.ratio, 2),
                          (s: (typeof result.steps)[number]) => bnFixed(s.scaled, 2),
                          (s: (typeof result.steps)[number]) => bn(s.whole),
                        ].map((fn, i) =>
                          i < shown && !(i === 3 && result.multiplier === 1) ? (
                            <tr key={i} className="animate-fade-up border-t border-line">
                              <td className="py-2 text-left font-sans text-xs text-muted">{STEP_TITLES[i]}</td>
                              {result.steps.map((s) => (
                                <td key={s.symbol} className={cx('py-2', i === 4 && 'text-lg font-bold text-gold')}>
                                  {fn(s)}
                                </td>
                              ))}
                            </tr>
                          ) : null,
                        )}
                      </tbody>
                    </table>
                  </div>
                  {shown < 6 ? (
                    <button type="button" className="btn-primary" onClick={reveal}>
                      পরের ধাপ <Icon name="arrowRight" className="h-4 w-4" />
                    </button>
                  ) : null}
                  {shown >= 5 && (
                    <div className="animate-fade-up rounded-xl border border-gold/50 bg-gold/10 px-4 py-3">
                      <p className="text-sm text-muted">স্থূল সংকেত</p>
                      <p className="text-3xl font-bold text-gold">
                        <Formula>{result.formula}</Formula>
                      </p>
                      <p className="text-sm text-muted">স্থূল সংকেত ভর = {bnFixed(result.empiricalMass, 2)}</p>
                    </div>
                  )}
                  {shown >= 6 && molecular && (
                    <div className="animate-fade-up rounded-xl border border-line bg-raised/60 px-4 py-3">
                      <p className="font-mono text-sm">
                        n = আণবিক ভর ÷ স্থূল সংকেত ভর = {bn(M)} ÷ {bnFixed(result.empiricalMass, 2)} = {bnFixed(molecular.exact, 2)} ≈{' '}
                        {bn(molecular.n)}
                      </p>
                      <p className="mt-1 text-sm text-muted">আণবিক সংকেত = (স্থূল সংকেত)ₙ</p>
                      <p className="text-3xl font-bold text-ink">
                        <Formula>{molecular.formula}</Formula>
                      </p>
                    </div>
                  )}
                  {shown >= 6 && !molecular && <p className="text-sm text-muted">আণবিক সংকেত বের করতে আণবিক ভর দাও।</p>}
                </>
              ) : (
                <p className="text-muted">বাঁ পাশে মৌল ও তার শতকরা পরিমাণ লেখো।</p>
              )}
            </section>
          </div>
        ) : (
          <section className="panel panel-pad space-y-4" aria-label="শতকরা সংযুতি">
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  parseFormula(compDraft);
                  setCompFormula(compDraft.trim());
                  setComps((c) => new Set(c).add(compDraft.trim()));
                  writeParams({ f: compDraft.trim() });
                } catch {
                  /* shown below */
                }
              }}
            >
              <label className="flex flex-col gap-1.5">
                <span className="label">সংকেত</span>
                <input
                  className="input min-h-[44px] w-48 text-base"
                  value={compDraft}
                  onChange={(e) => setCompDraft(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <button type="submit" className="btn-primary px-4">
                হিসাব করো
              </button>
              {['H2O', 'CO2', 'NaCl', 'H2SO4', 'CaCO3', 'C6H12O6', 'CuSO4·5H2O'].map((f) => (
                <button
                  key={f}
                  type="button"
                  className="chip"
                  onClick={() => {
                    setCompDraft(f);
                    setCompFormula(f);
                    setComps((c) => new Set(c).add(f));
                  }}
                >
                  <Formula>{f}</Formula>
                </button>
              ))}
            </form>
            {composition ? (
              <div className="space-y-3" aria-live="polite">
                {composition.map((c) => (
                  <div key={c.symbol}>
                    <div className="flex items-baseline justify-between font-mono text-sm">
                      <span>
                        <strong className="text-base text-ink">{c.symbol}</strong> {c.count > 1 ? `${bn(c.count)} × ` : ''}
                        {bn(c.mass / c.count)} = {bnFixed(c.mass, 2)}
                      </span>
                      <strong className="text-lg text-gold">{bnFixed(c.percent, 2)}%</strong>
                    </div>
                    <div className="mt-1 h-3 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-data-4 transition-all duration-500" style={{ width: `${c.percent}%` }} />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted">মৌলের শতকরা পরিমাণ = (সংকেতে মৌলটির মোট ভর ÷ মোলার ভর) × ১০০</p>
              </div>
            ) : (
              <p className="text-sm text-danger">সংকেতটি পড়া যায়নি।</p>
            )}
          </section>
        )}
        <ChallengeList items={challenges} />
      </div>
    </SimShell>
  );
}
