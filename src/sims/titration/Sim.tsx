// প্রশমন / টাইট্রেশন: add NaOH from a burette to an acid with an indicator. The pH curve is drawn as you go;
// stop at the colour change and work out the acid's concentration.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  INDICATORS,
  acidConcentration,
  bn,
  bnFixed,
  equivalenceVolume,
  makeRandom,
  parseDecimal,
  titrationPh,
  type IndicatorId,
  type TitrationSetup,
} from '@/chem';
import {
  ChallengeList,
  Equation,
  Formula,
  Icon,
  LineChart,
  Segmented,
  SimShell,
  cx,
  useActive,
  useSimClock,
  type SegmentedOption,
} from '@/ui';

const ACID_ML = 25;
const BASE_M = 0.1;
type AcidId = 'hcl' | 'h2so4';
const ACIDS: SegmentedOption<AcidId>[] = [
  { value: 'hcl', label: 'HCl' },
  { value: 'h2so4', label: 'H₂SO₄' },
];
const INDS: SegmentedOption<'phenolphthalein' | 'methylOrange'>[] = [
  { value: 'phenolphthalein', label: 'ফেনলফথ্যালিন' },
  { value: 'methylOrange', label: 'মিথাইল অরেঞ্জ' },
];

export default function Titration() {
  const shellRef = useRef<HTMLDivElement>(null);
  const active = useActive(shellRef);
  const [acid, setAcid] = useState<AcidId>('hcl');
  const [ind, setInd] = useState<'phenolphthalein' | 'methylOrange'>('phenolphthalein');
  const [unknown, setUnknown] = useState(false);
  const [seed, setSeed] = useState(1);
  const [added, setAdded] = useState(0);
  const [stream, setStream] = useState(false);
  const [answer, setAnswer] = useState('');
  const [results, setResults] = useState<{ ok: boolean; acid: AcidId }[]>([]);
  const [nailed, setNailed] = useState(false);
  const [didSulfuric, setDidSulfuric] = useState(false);
  const acidM = useMemo(() => (unknown ? Math.round((0.05 + makeRandom(seed)() * 0.1) * 1000) / 1000 : 0.1), [unknown, seed]);
  const setup: TitrationSetup = { acidM, acidMl: ACID_ML, acidProtons: acid === 'h2so4' ? 2 : 1, baseM: BASE_M };
  const eqV = equivalenceVolume(setup);
  const ph = titrationPh(setup, added);
  const colour = INDICATORS[ind as IndicatorId](ph);
  const endpointSeen = ind === 'phenolphthalein' ? ph >= 8.2 : ph > 4.4;
  const curve = useMemo(() => {
    const pts: [number, number][] = [];
    for (let v = 0; v <= added + 1e-9; v += Math.max(0.05, added / 300)) pts.push([v, titrationPh(setup, v)]);
    pts.push([added, titrationPh(setup, added)]);
    return pts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [added, acidM, acid]);

  // the first moment the colour changes counts: was it within 0.1 mL of the equivalence point?
  useEffect(() => {
    if (!endpointSeen) return;
    if (Math.abs(added - eqV) <= 0.15) setNailed(true);
    if (acid === 'h2so4') setDidSulfuric(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpointSeen]);

  const clock = useSimClock(
    (dt) => {
      if (stream) setAdded((a) => Math.min(50, a + dt * 1.2));
    },
    { active },
  );

  const add = (ml: number) => setAdded((a) => Math.min(50, Math.round((a + ml) * 100) / 100));
  const reset = (nextUnknown = unknown) => {
    setAdded(0);
    setStream(false);
    setAnswer('');
    setUnknown(nextUnknown);
    setSeed((s) => s + 1);
  };
  const flaskColour = colour.colour === 'transparent' ? 'color-mix(in oklab, var(--surface) 55%, white)' : colour.colour;
  const buretteLevel = 1 - added / 50;
  const guess = parseDecimal(answer);
  const correct = Math.abs(guess - acidM) <= acidM * 0.03;

  const challenges = [
    { label: 'ফেনলফথ্যালিন গোলাপি হওয়ার ঠিক আগে-পরে (±০.১ mL) থামো', done: nailed },
    { label: 'অজানা ঘনমাত্রার HCl-এর মোলারিটি টাইট্রেশন করে বের করো', done: results.some((r) => r.ok && r.acid === 'hcl') },
    { label: 'H₂SO₄ দিয়ে টাইট্রেশন করো: একই ঘনমাত্রায় দ্বিগুণ NaOH লাগে কেন?', done: didSulfuric },
  ];

  return (
    <SimShell ref={shellRef} label="প্রশমন ও টাইট্রেশন" clock={clock} onReset={() => reset(false)}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented options={ACIDS} value={acid} onChange={(a) => (setAcid(a), reset())} label="এসিড" />
          <Segmented options={INDS} value={ind} onChange={setInd} label="নির্দেশক" />
          <button type="button" className="chip" aria-pressed={unknown} onClick={() => reset(!unknown)}>
            অজানা ঘনমাত্রা
          </button>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section className="panel panel-pad space-y-3" aria-label="টাইট্রেশন">
            <svg
              viewBox="0 0 240 330"
              className="mx-auto block w-full max-w-[260px]"
              role="img"
              aria-label={`বিউরেট থেকে ${bnFixed(added, 2)} মিলিলিটার যোগ হয়েছে, ফ্লাস্কের রং ${colour.nameBn}`}
            >
              {/* burette */}
              <rect x="108" y="10" width="24" height="190" rx="4" fill="none" stroke="var(--line-strong)" strokeWidth="2" />
              <rect
                x="111"
                y={14 + (1 - buretteLevel) * 182}
                width="18"
                height={buretteLevel * 182}
                fill="color-mix(in oklab, var(--electron) 25%, transparent)"
              />
              {[0, 10, 20, 30, 40, 50].map((v) => (
                <g key={v}>
                  <line x1="132" x2="140" y1={14 + (v / 50) * 182} y2={14 + (v / 50) * 182} stroke="var(--muted)" />
                  <text x="144" y={18 + (v / 50) * 182} fontSize="10" className="fill-muted font-mono">
                    {bn(v)}
                  </text>
                </g>
              ))}
              <path d="M116 200 h8 v18 l-4 8 l-4 -8 Z" fill="var(--line-strong)" />
              <rect x="100" y="206" width="40" height="5" rx="2" fill={stream ? 'var(--gold)' : 'var(--muted)'} />
              {stream && (
                <circle cx="120" cy="236" r="3" fill="color-mix(in oklab, var(--electron) 50%, transparent)" className="photon-in" />
              )}
              {/* conical flask */}
              <path
                d="M98 240 V258 L58 318 Q55 324 62 324 H178 Q185 324 182 318 L142 258 V240"
                fill="none"
                stroke="var(--line-strong)"
                strokeWidth="2.5"
              />
              <path
                d="M75 292 L64 316 Q62 320 67 320 H173 Q178 320 176 316 L165 292 Z"
                fill={flaskColour}
                opacity={colour.colour === 'transparent' ? 0.3 : 0.8}
                style={{ transition: 'fill .3s ease' }}
              />
            </svg>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={() => add(0.05)} disabled={added >= 50}>
                এক ফোঁটা
              </button>
              <button type="button" className="btn-secondary" onClick={() => add(0.5)} disabled={added >= 50}>
                +০.৫ mL
              </button>
              <button type="button" className="btn-secondary" onClick={() => add(1)} disabled={added >= 50}>
                +১ mL
              </button>
              <button
                type="button"
                className={cx('btn-primary', stream && 'bg-gold text-on-accent hover:bg-gold')}
                aria-pressed={stream}
                onClick={() => (setStream((x) => !x), clock.play())}
              >
                <Icon name={stream ? 'pause' : 'droplet'} className="h-4 w-4" />
                {stream ? 'কল বন্ধ করো' : 'কল খোলো'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center" aria-live="polite">
              {[
                ['যোগ করা NaOH', `${bnFixed(added, 2)} mL`],
                ['pH', bnFixed(ph, 2)],
                ['রং', colour.nameBn],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-line bg-raised/60 px-2 py-2">
                  <p className="text-[11px] text-muted">{k}</p>
                  <p className="font-mono text-base font-bold">{v}</p>
                </div>
              ))}
            </div>
          </section>
          <div className="space-y-5">
            <section className="panel panel-pad" aria-label="pH বনাম আয়তন">
              <LineChart
                series={[{ label: 'pH', color: 'var(--gold)', points: curve }]}
                xMax={Math.max(eqV * 2, 10)}
                yMax={14}
                xLabel="যোগ করা NaOH (mL)"
                yLabel="pH"
                ariaLabel="টাইট্রেশন লেখচিত্র: pH বনাম যোগ করা NaOH"
                marker={endpointSeen ? added : undefined}
              />
              <p className="mt-1 text-xs text-muted">
                সমতুল্য বিন্দুর কাছে এক ফোঁটাতেই pH কয়েক একক লাফিয়ে যায়। তাই শেষ দিকে ফোঁটা ফোঁটা করে যোগ করতে হয়।
              </p>
            </section>
            <section className={cx('panel panel-pad space-y-2', endpointSeen && 'border-gold/50')} aria-live="polite" aria-label="হিসাব">
              <p className="font-mono text-base">
                <Equation>{acid === 'hcl' ? 'HCl + NaOH -> NaCl + H2O' : 'H2SO4 + 2NaOH -> Na2SO4 + 2H2O'}</Equation>
              </p>
              <p className="text-sm">
                ফ্লাস্কে {bn(ACID_ML)} mL <Formula>{acid === 'hcl' ? 'HCl' : 'H2SO4'}</Formula>
                {unknown ? ' (ঘনমাত্রা অজানা)' : `, ${bnFixed(acidM, 3)} mol/L`}; বিউরেটে {bnFixed(BASE_M, 1)} mol/L <Formula>NaOH</Formula>
              </p>
              {endpointSeen ? (
                <>
                  <p className="text-sm">
                    প্রান্ত বিন্দু (রং বদল): <strong>{bnFixed(added, 2)} mL</strong>
                  </p>
                  <p className="font-mono text-sm">
                    {acid === 'hcl' ? 'M₁V₁ = M₂V₂' : '২ × M(এসিড) × V(এসিড) = M(ক্ষার) × V(ক্ষার)'} → M(এসিড) = {bnFixed(BASE_M, 1)} ×{' '}
                    {bnFixed(added, 2)} ÷ ({acid === 'hcl' ? '' : '২ × '}
                    {bn(ACID_ML)})
                  </p>
                  {unknown ? (
                    <form
                      className="flex flex-wrap items-end gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        setResults((r) => [...r, { ok: correct, acid }]);
                      }}
                    >
                      <label className="flex flex-col gap-1">
                        <span className="label">তোমার হিসাবে এসিডের ঘনমাত্রা (mol/L)</span>
                        <input
                          className="input min-h-[44px] w-40 text-base"
                          inputMode="decimal"
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                        />
                      </label>
                      <button type="submit" className="btn-primary px-4">
                        মিলিয়ে দেখো
                      </button>
                      {results.length > 0 && (
                        <span className={cx('text-sm font-semibold', results.at(-1)!.ok ? 'text-block-p' : 'text-exc')}>
                          {results.at(-1)!.ok
                            ? `ঠিক! আসল মান ${bnFixed(acidM, 3)} mol/L`
                            : 'আবার হিসাব করো: প্রান্ত বিন্দুর আয়তন ব্যবহার করেছ তো?'}
                        </span>
                      )}
                    </form>
                  ) : (
                    <p className="font-mono text-sm text-gold">
                      = {bnFixed(acidConcentration(BASE_M, added, ACID_ML, setup.acidProtons), 3)} mol/L
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted">নির্দেশকের রং বদলানো পর্যন্ত NaOH যোগ করো।</p>
              )}
            </section>
          </div>
        </div>
        <ChallengeList items={challenges} />
      </div>
    </SimShell>
  );
}
