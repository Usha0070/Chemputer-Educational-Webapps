// মোল: counting particles by weighing. Convert mass ↔ moles ↔ particles ↔ gas volume (STP) for any formula.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AVOGADRO,
  MOLAR_VOLUME_STP,
  atomicMass,
  bn,
  bnFixed,
  moleConvert,
  parseDecimal,
  parseFormula,
  type MassMode,
  type MoleInput,
} from '@/chem';
import { ChallengeList, Formula, Icon, Sci, Segmented, SimShell, cx, useUrlInit, writeParams, type SegmentedOption } from '@/ui';

const SUBSTANCES = ['H2O', 'CO2', 'O2', 'H2', 'N2', 'NaCl', 'CaCO3', 'C6H12O6', 'Fe', 'NH3', 'CH4'];
const GASES = new Set(['CO2', 'O2', 'H2', 'N2', 'NH3', 'CH4', 'Cl2', 'He', 'Ne', 'Ar', 'CO', 'SO2', 'NO2', 'HCl']);
type Kind = MoleInput['kind'];
const KINDS: SegmentedOption<Kind>[] = [
  { value: 'mass', label: 'ভর (g)' },
  { value: 'moles', label: 'মোল' },
  { value: 'particles', label: 'কণা' },
  { value: 'volume', label: 'আয়তন (L)' },
];
const MODES: SegmentedOption<MassMode>[] = [
  { value: 'ssc', label: 'বইয়ের মান' },
  { value: 'precise', label: 'নিখুঁত মান' },
];

const near = (a: number, b: number, rel = 0.02) => Math.abs(a - b) <= Math.abs(b) * rel;

export default function MoleCalculator() {
  const [formula, setFormula] = useState('H2O');
  const [customDraft, setCustomDraft] = useState('');
  const [kind, setKind] = useState<Kind>('mass');
  const [raw, setRaw] = useState('18');
  const [mode, setMode] = useState<MassMode>('ssc');
  const [log, setLog] = useState<{ formula: string; kind: Kind; value: number }[]>([]);

  const value = parseDecimal(raw.replace(/×\s*10\^?/, 'e'));
  const atoms = useMemo(() => {
    try {
      return parseFormula(formula).atoms;
    } catch {
      return null;
    }
  }, [formula]);
  const input: MoleInput | null =
    !atoms || !Number.isFinite(value) || value < 0
      ? null
      : kind === 'mass'
        ? { kind, grams: value }
        : kind === 'moles'
          ? { kind, moles: value }
          : kind === 'particles'
            ? { kind, count: value }
            : { kind, litres: value };
  const r = input ? moleConvert(formula, input, mode) : null;
  const isGas = GASES.has(formula);

  useUrlInit((p) => {
    const f = p.get('f');
    if (f) {
      try {
        parseFormula(f);
        setFormula(f);
      } catch {
        /* ignore a broken link */
      }
    }
    const k = p.get('k') as Kind | null;
    if (k && KINDS.some((x) => x.value === k)) setKind(k);
    const v = p.get('v');
    if (v) setRaw(v);
  });
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false; // the starting example doesn't count as the student's own try
      return;
    }
    writeParams({ f: formula === 'H2O' ? null : formula, k: kind === 'mass' ? null : kind, v: raw === '18' ? null : raw });
    if (input && Number.isFinite(value)) setLog((l) => [...l.slice(-30), { formula, kind, value }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formula, kind, raw]);

  const changeKind = (k: Kind) => {
    if (r) {
      const next = k === 'mass' ? r.grams : k === 'moles' ? r.moles : k === 'particles' ? r.particles : r.litres;
      setRaw(k === 'particles' ? next.toExponential(3) : String(Number(next.toPrecision(4))));
    }
    setKind(k);
  };

  const breakdown = atoms ? Object.entries(atoms).map(([el, n]) => ({ el, n, A: atomicMass(el, mode) })) : [];
  const dots = r ? Math.min(100, Math.round(r.moles * 10)) : 0;

  const has = (f: string, k: Kind, v: number) => log.some((x) => x.formula === f && x.kind === k && near(x.value, v));
  const challenges = [
    { label: <>১৮ গ্রাম পানিতে কয়টি অণু আছে বের করো</>, done: has('H2O', 'mass', 18) },
    {
      label: (
        <>
          ১ মোল <Formula>CO2</Formula>-এর ভর কত? মোল দিয়ে হিসাব করো
        </>
      ),
      done: has('CO2', 'moles', 1),
    },
    {
      label: (
        <>
          STP-তে ২ মোল <Formula>O2</Formula>-এর আয়তন বের করো
        </>
      ),
      done: has('O2', 'moles', 2) || has('O2', 'volume', 44.8),
    },
    {
      label: (
        <>
          ৬.০২২ × ১০²³টি <Formula>NaCl</Formula> এককের ভর বের করো
        </>
      ),
      done: has('NaCl', 'particles', AVOGADRO),
    },
  ];

  return (
    <SimShell
      label="মোল ক্যালকুলেটর"
      onReset={() => {
        setFormula('H2O');
        setKind('mass');
        setRaw('18');
        setMode('ssc');
      }}
    >
      <div className="space-y-5">
        <section className="panel panel-pad space-y-4" aria-label="পদার্থ বেছে নাও">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="label mb-2">পদার্থ</p>
              <div className="flex flex-wrap gap-2">
                {SUBSTANCES.map((f) => (
                  <button key={f} type="button" className="chip" aria-pressed={f === formula} onClick={() => setFormula(f)}>
                    <Formula>{f}</Formula>
                  </button>
                ))}
              </div>
            </div>
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  parseFormula(customDraft);
                  setFormula(customDraft.trim());
                } catch {
                  /* error shown below */
                }
              }}
            >
              <label className="flex flex-col gap-1.5">
                <span className="label">নিজের সংকেত</span>
                <input
                  className="input min-h-[44px] w-40 text-base"
                  placeholder="যেমন: H2SO4"
                  value={customDraft}
                  onChange={(e) => setCustomDraft(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <button type="submit" className="btn-primary px-4">
                নাও
              </button>
            </form>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented options={MODES} value={mode} onChange={setMode} label="পারমাণবিক ভরের মান" />
            <span className="text-xs text-muted">বইয়ের মান: H = ১, C = ১২, O = ১৬, Na = ২৩, Cl = ৩৫.৫ …</span>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section className="panel panel-pad space-y-4" aria-label="যা জানা আছে">
            <p className="label">যা জানা আছে</p>
            <Segmented options={KINDS} value={kind} onChange={changeKind} label="কোন রাশি জানা" />
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-muted">
                মান (
                {kind === 'mass'
                  ? 'গ্রাম'
                  : kind === 'moles'
                    ? 'মোল'
                    : kind === 'particles'
                      ? 'অণু বা এককের সংখ্যা, যেমন 6.022e23'
                      : 'লিটার, STP'}
                )
              </span>
              <input className="input" inputMode="decimal" value={raw} onChange={(e) => setRaw(e.target.value)} aria-invalid={!input} />
            </label>
            {kind === 'mass' && (
              <input
                type="range"
                min={0}
                max={200}
                step={0.5}
                value={Number.isFinite(value) ? Math.min(200, value) : 0}
                onChange={(e) => setRaw(e.target.value)}
                className="h-11 w-full accent-[var(--brand)]"
                aria-label="ভর বদলাও"
              />
            )}
            {!atoms && <p className="text-sm text-danger">সংকেতটি পড়া যায়নি।</p>}
            {atoms && !input && <p className="text-sm text-danger">একটি ধনাত্মক সংখ্যা লেখো।</p>}
            {kind === 'volume' && !isGas && <p className="text-sm text-exc">সতর্কতা: STP-তে ২২.৪ L/mol শুধু গ্যাসের জন্য খাটে।</p>}

            <div className="rounded-xl border border-line bg-bg/60 p-3">
              <p className="text-xs font-semibold text-muted">মোলার ভর, M</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 font-mono text-sm">
                {breakdown.map((b, i) => (
                  <span key={b.el}>
                    {i > 0 && '+ '}
                    {b.n > 1 ? `${bn(b.n)} × ` : ''}
                    {bn(b.A)}
                    <span className="text-muted"> ({b.el})</span>
                  </span>
                ))}
                <span>= </span>
                <strong className="text-lg text-gold">{r ? bnFixed(r.molarMass, 3) : '—'}</strong>
                <span className="text-muted">g/mol</span>
              </p>
            </div>
          </section>

          <section className="panel panel-pad space-y-4" aria-live="polite" aria-label="ফলাফল">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['ভর', r ? <>{bnFixed(r.grams, 3)} g</> : '—', kind === 'mass'],
                ['মোল সংখ্যা', r ? <>{bnFixed(r.moles, 4)} mol</> : '—', kind === 'moles'],
                ['অণু / একক', r ? <Sci value={r.particles} /> : '—', kind === 'particles'],
                ['মোট পরমাণু', r ? <Sci value={r.atoms} /> : '—', false],
              ].map(([label, v, given]) => (
                <div
                  key={String(label)}
                  className={cx('rounded-xl border px-3 py-3', given ? 'border-gold/50 bg-gold/10' : 'border-line bg-raised/60')}
                >
                  <p className="text-xs font-semibold text-muted">{label}</p>
                  <p className="mt-1 text-xl font-bold text-ink">{v}</p>
                </div>
              ))}
              <div
                className={cx(
                  'col-span-2 rounded-xl border px-3 py-3',
                  kind === 'volume' ? 'border-gold/50 bg-gold/10' : 'border-line bg-raised/60',
                )}
              >
                <p className="text-xs font-semibold text-muted">গ্যাসের আয়তন (STP)</p>
                <p className="mt-1 text-xl font-bold text-ink">
                  {r ? (isGas || kind === 'volume' ? `${bnFixed(r.litres, 3)} L` : 'এটি সাধারণ অবস্থায় গ্যাস নয়') : '—'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-bg/60 p-3 text-sm leading-relaxed">
              <p className="flex flex-wrap items-center gap-2 font-mono">
                <span className={cx(kind === 'mass' && 'text-gold')}>ভর</span>
                <span className="text-muted">÷ M →</span>
                <span className={cx('font-bold', kind === 'moles' && 'text-gold')}>মোল</span>
                <span className="text-muted">× Nₐ →</span>
                <span className={cx(kind === 'particles' && 'text-gold')}>কণা</span>
              </p>
              <p className="mt-1 font-mono">
                <span className="font-bold">মোল</span> <span className="text-muted">× {bn(MOLAR_VOLUME_STP)} L →</span>{' '}
                <span className={cx(kind === 'volume' && 'text-gold')}>আয়তন</span>
              </p>
              <p className="mt-2 text-xs text-muted">
                Nₐ = অ্যাভোগেড্রো সংখ্যা = <Sci value={AVOGADRO} />
              </p>
            </div>

            <div>
              <p className="label mb-2 flex items-center gap-2">
                <Icon name="scale" className="h-4 w-4 text-gold" /> ওজন করে গোনা: প্রতিটি বিন্দু = ০.১ মোল = <Sci value={AVOGADRO / 10} />{' '}
                টি কণা
              </p>
              <div
                className="flex min-h-14 flex-wrap gap-1 rounded-xl border border-line bg-bg/60 p-2"
                role="img"
                aria-label={`${bn(dots)}টি বিন্দু`}
              >
                {Array.from({ length: dots }, (_, i) => (
                  <span key={i} className="h-2.5 w-2.5 rounded-full bg-electron" />
                ))}
                {r && r.moles * 10 > 100 && <span className="text-xs text-muted">… (১০ মোলের বেশি)</span>}
              </div>
            </div>
          </section>
        </div>
        <ChallengeList items={challenges} />
      </div>
    </SimShell>
  );
}
