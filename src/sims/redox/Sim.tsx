// জারণ-বিজারণ: electron transfer in four reactions with oxidation numbers, half-equations and agents,
// plus an oxidation-number calculator that shows each rule it used.
import { useEffect, useMemo, useState } from 'react';
import { analyzeRedox, bn, oxidationNumbers, parseEquation, parseFormula, writeEquation } from '@/chem';
import {
  ChallengeList,
  Equation,
  Formula,
  Segmented,
  SimShell,
  StepControls,
  cx,
  useSteps,
  useUrlInit,
  writeParams,
  type SegmentedOption,
} from '@/ui';

const REACTIONS = [
  {
    id: 'zn-cu',
    text: 'Zn + CuSO4 -> ZnSO4 + Cu',
    ox: 'Zn -> Zn^2+ + 2e^-',
    red: 'Cu^2+ + 2e^- -> Cu',
    note: 'জিংকের দণ্ড নীল কপার সালফেট দ্রবণে রাখলে দণ্ডে লালচে কপার জমে, নীল রং ফিকে হয়।',
  },
  {
    id: 'mg-o',
    text: 'Mg + O2 -> MgO',
    ox: 'Mg -> Mg^2+ + 2e^-',
    red: 'O2 + 4e^- -> 2O^2-',
    note: 'ম্যাগনেসিয়ামের ফিতা বাতাসে উজ্জ্বল সাদা আলো দিয়ে পোড়ে, সাদা ছাই (MgO) তৈরি হয়।',
  },
  {
    id: 'fe-cu',
    text: 'Fe + CuSO4 -> FeSO4 + Cu',
    ox: 'Fe -> Fe^2+ + 2e^-',
    red: 'Cu^2+ + 2e^- -> Cu',
    note: 'লোহার পেরেক কপার সালফেট দ্রবণে রাখলে পেরেকে কপারের লালচে আস্তর পড়ে।',
  },
  {
    id: 'na-cl',
    text: 'Na + Cl2 -> NaCl',
    ox: 'Na -> Na^+ + e^-',
    red: 'Cl2 + 2e^- -> 2Cl^-',
    note: 'সোডিয়াম ক্লোরিন গ্যাসে জ্বলে সাদা লবণ (NaCl) তৈরি করে।',
  },
] as const;
type RxId = (typeof REACTIONS)[number]['id'];
type Tab = 'transfer' | 'calculator';
const TABS: SegmentedOption<Tab>[] = [
  { value: 'transfer', label: 'ইলেকট্রন স্থানান্তর' },
  { value: 'calculator', label: 'জারণ সংখ্যা নির্ণয়' },
];
const sign = (v: number) => (v > 0 ? `+${bn(Number(v.toFixed(2)))}` : v < 0 ? `−${bn(Number(Math.abs(v).toFixed(2)))}` : '০');

function OxBadges({ formula }: { formula: string }) {
  const r = oxidationNumbers(formula);
  return (
    <span className="inline-flex flex-col items-center gap-1">
      <span className="flex gap-1">
        {Object.keys(parseFormula(formula).atoms)
          .map((el) => [el, r.numbers[el]] as const)
          .filter((x): x is readonly [string, number] => x[1] !== undefined)
          .map(([el, v]) => (
            <span key={el} className="rounded bg-raised px-1 font-mono text-[11px] text-muted">
              {el}: {sign(v)}
            </span>
          ))}
      </span>
      <Formula className="text-2xl">{formula}</Formula>
    </span>
  );
}

export default function Redox() {
  const [tab, setTab] = useState<Tab>('transfer');
  const [rxId, setRxId] = useState<RxId>('zn-cu');
  const [watched, setWatched] = useState<Set<RxId>>(() => new Set());
  const [query, setQuery] = useState('KMnO4');
  const [solved, setSolved] = useState<Set<string>>(() => new Set());
  const rx = REACTIONS.find((r) => r.id === rxId)!;
  const a = useMemo(() => analyzeRedox(rx.text), [rx]);
  const eq = useMemo(() => parseEquation(rx.text), [rx]);
  const steps = useSteps(4, { intervalMs: 2200 });
  const calc = useMemo(() => {
    try {
      return oxidationNumbers(query.trim());
    } catch (e) {
      return { ok: false, numbers: {}, steps: [], charge: 0, message: (e as Error).message };
    }
  }, [query]);

  useUrlInit((p) => {
    const r = p.get('rx') as RxId | null;
    if (r && REACTIONS.some((x) => x.id === r)) setRxId(r);
    if (p.get('tab') === 'calculator') setTab('calculator');
    const f = p.get('f');
    if (f) setQuery(f);
  });

  const choose = (id: RxId) => {
    setRxId(id);
    steps.restart(true);
    writeParams({ rx: id === 'zn-cu' ? null : id });
  };
  useEffect(() => {
    if (steps.done) setWatched((w) => (w.has(rxId) ? w : new Set(w).add(rxId)));
  }, [steps.done, rxId]);

  const ox = a.oxidised[0];
  const red = a.reduced[0];
  const at = steps.at;
  const reactants = eq.species.map((s, i) => ({ ...s, c: a.coefficients[i] ?? 1 })).filter((s) => s.side === 'left');
  const products = eq.species.map((s, i) => ({ ...s, c: a.coefficients[i] ?? 1 })).filter((s) => s.side === 'right');

  const challenges = [
    { label: 'চারটি বিক্রিয়ার প্রতিটিতে ইলেকট্রন স্থানান্তর শেষ পর্যন্ত দেখো', done: watched.size >= 4 },
    {
      label: (
        <>
          পটাসিয়াম পারম্যাঙ্গানেট (<Formula>KMnO4</Formula>)-এ Mn-এর জারণ সংখ্যা বের করো
        </>
      ),
      done: solved.has('KMnO4'),
    },
    {
      label: (
        <>
          পটাসিয়াম ডাইক্রোমেট (<Formula>K2Cr2O7</Formula>)-এ Cr-এর জারণ সংখ্যা বের করো
        </>
      ),
      done: solved.has('K2Cr2O7'),
    },
    {
      label: (
        <>
          একটি আয়নের জারণ সংখ্যা বের করো, যেমন <Formula>SO4^2-</Formula>
        </>
      ),
      done: [...solved].some((f) => f.includes('^')),
    },
  ];

  return (
    <SimShell
      label="জারণ-বিজারণ"
      onReset={() => {
        setTab('transfer');
        choose('zn-cu');
        setQuery('KMnO4');
      }}
    >
      <div className="space-y-5">
        <Segmented
          options={TABS}
          value={tab}
          onChange={(t) => {
            setTab(t);
            writeParams({ tab: t === 'transfer' ? null : t });
          }}
          label="অংশ বেছে নাও"
        />

        {tab === 'transfer' ? (
          <>
            <section className="panel panel-pad" aria-label="বিক্রিয়া বেছে নাও">
              <div className="flex flex-wrap gap-2">
                {REACTIONS.map((r) => (
                  <button key={r.id} type="button" className="chip" aria-pressed={r.id === rxId} onClick={() => choose(r.id)}>
                    <Equation>{r.text}</Equation>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted">{rx.note}</p>
            </section>

            <section className="panel panel-pad" aria-label="ইলেকট্রন স্থানান্তর">
              <div className="relative flex flex-wrap items-end justify-center gap-x-4 gap-y-6 py-4">
                {reactants.map((s, i) => (
                  <span key={s.formula} className="flex items-end gap-2">
                    {i > 0 && <span className="pb-2 text-xl text-muted">+</span>}
                    <span
                      className={cx(
                        'rounded-xl border-2 px-2 pt-1 pb-2 transition',
                        at >= 1 && ox?.species.from === s.formula
                          ? 'border-brand-ink'
                          : at >= 1 && red?.species.from === s.formula
                            ? 'border-electron'
                            : 'border-transparent',
                      )}
                    >
                      {s.c > 1 && <span className="me-1 font-mono text-2xl text-gold">{s.c}</span>}
                      <OxBadges formula={s.formula} />
                    </span>
                  </span>
                ))}
                <span className="pb-3 text-2xl text-gold">→</span>
                {products.map((s, i) => (
                  <span key={s.formula} className="flex items-end gap-2">
                    {i > 0 && <span className="pb-2 text-xl text-muted">+</span>}
                    <span className={cx('rounded-xl px-2 pt-1 pb-2 transition', at >= 1 ? 'opacity-100' : 'opacity-50')}>
                      {s.c > 1 && <span className="me-1 font-mono text-2xl text-gold">{s.c}</span>}
                      <OxBadges formula={s.formula} />
                    </span>
                  </span>
                ))}
                {at >= 1 && (
                  <span className="pointer-events-none absolute inset-x-0 -top-1 flex justify-center gap-2" aria-hidden="true">
                    {Array.from({ length: Math.min(a.electrons, 6) }, (_, k) => (
                      <span key={k} className="electron-hop h-3 w-3 rounded-full bg-electron" style={{ animationDelay: `${k * 0.18}s` }} />
                    ))}
                  </span>
                )}
              </div>

              <div
                className="mt-2 min-h-[6rem] rounded-xl border border-line bg-raised/60 px-4 py-3 text-[15px] leading-relaxed"
                aria-live="polite"
              >
                {at === 0 && <p>প্রতিটি মৌলের ওপরে তার জারণ সংখ্যা। বিক্রিয়ার আগে ও পরে কোন মৌলের জারণ সংখ্যা বদলায়, লক্ষ করো।</p>}
                {at === 1 && ox && red && (
                  <p>
                    {ox.element}-এর জারণ সংখ্যা {sign(ox.from)} থেকে বেড়ে {sign(ox.to)} হলো: এটি ইলেকট্রন{' '}
                    <strong className="text-brand-ink">ত্যাগ</strong> করেছে। {red.element}-এর জারণ সংখ্যা {sign(red.from)} থেকে কমে{' '}
                    {sign(red.to)} হলো: এটি ইলেকট্রন <strong className="text-electron">গ্রহণ</strong> করেছে। সমতাকৃত সমীকরণে মোট{' '}
                    {bn(a.electrons)}টি ইলেকট্রন স্থানান্তরিত হয়।
                  </p>
                )}
                {at === 2 && (
                  <div className="space-y-1.5">
                    <p>
                      <span className="font-semibold text-brand-ink">জারণ (ইলেকট্রন ত্যাগ):</span> <Equation>{rx.ox}</Equation>
                    </p>
                    <p>
                      <span className="font-semibold text-electron">বিজারণ (ইলেকট্রন গ্রহণ):</span> <Equation>{rx.red}</Equation>
                    </p>
                  </div>
                )}
                {at === 3 && (
                  <p>
                    <strong>বিজারক:</strong> <Formula>{a.reducingAgent ?? ''}</Formula> (নিজে জারিত হয়, অন্যকে বিজারিত করে) ·{' '}
                    <strong>জারক:</strong> <Formula>{a.oxidisingAgent ?? ''}</Formula> (নিজে বিজারিত হয়)। জারণ ও বিজারণ সবসময় একসাথে ঘটে,
                    তাই একে বলে রেডক্স বিক্রিয়া: <Equation>{writeEquation(eq, a.coefficients)}</Equation>
                  </p>
                )}
              </div>
              <div className="mt-4">
                <StepControls steps={steps} />
              </div>
            </section>
          </>
        ) : (
          <section className="panel panel-pad space-y-4" aria-label="জারণ সংখ্যা নির্ণয়">
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (calc.ok) setSolved((s) => new Set(s).add(query.trim()));
                writeParams({ f: query.trim() });
              }}
            >
              <label className="flex flex-col gap-1.5">
                <span className="label">সংকেত বা আয়ন (আধান ^ দিয়ে, যেমন SO4^2-)</span>
                <input
                  className="input min-h-[44px] w-56 text-base"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <button type="submit" className="btn-primary px-4">
                নির্ণয় করো
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              {['KMnO4', 'K2Cr2O7', 'H2SO4', 'SO4^2-', 'NO3^-', 'NH4^+', 'H2O2', 'Fe3O4', 'NaH', 'CO2'].map((f) => (
                <button
                  key={f}
                  type="button"
                  className="chip"
                  onClick={() => {
                    setQuery(f);
                    setSolved((s) => new Set(s).add(f));
                  }}
                >
                  <Formula>{f}</Formula>
                </button>
              ))}
            </div>
            {calc.steps.length > 0 && (
              <ol className="space-y-2" aria-live="polite">
                {calc.steps.map((st, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-3 rounded-xl border border-line bg-raised/60 px-3 py-2">
                    <span className="font-mono text-lg font-bold text-gold">
                      {st.element} = {sign(st.value)}
                    </span>
                    <span className="text-sm text-muted">{st.rule}</span>
                  </li>
                ))}
              </ol>
            )}
            {!calc.ok && <p className="text-sm text-danger">{calc.message}</p>}
            {calc.ok && calc.steps.length > 0 && (
              <p className="text-sm text-muted">
                যাচাই: সব পরমাণুর জারণ সংখ্যার যোগফল = {calc.charge === 0 ? 'শূন্য' : `আধান (${sign(calc.charge)})`}।
              </p>
            )}
          </section>
        )}
        <ChallengeList items={challenges} />
      </div>
    </SimShell>
  );
}
