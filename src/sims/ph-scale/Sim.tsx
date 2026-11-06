// pH স্কেল ও নির্দেশক: place everyday substances on the 0–14 scale, test them with four indicators, dilute them,
// or make your own strong acid/base and see [H⁺] and pH change together.
import { useState } from 'react';
import { HOUSEHOLD, INDICATORS, bn, bnFixed, dilute, hFromPh, natureOf, phStrongAcid, phStrongBase, type IndicatorId } from '@/chem';
import { ChallengeList, Sci, Segmented, SimShell, Slider, cx, type SegmentedOption } from '@/ui';

const IND: { id: IndicatorId; nameBn: string }[] = [
  { id: 'litmus', nameBn: 'লিটমাস' },
  { id: 'phenolphthalein', nameBn: 'ফেনলফথ্যালিন' },
  { id: 'methylOrange', nameBn: 'মিথাইল অরেঞ্জ' },
  { id: 'universal', nameBn: 'সার্বজনীন নির্দেশক' },
];
type Mode = 'household' | 'custom';
const MODES: SegmentedOption<Mode>[] = [
  { value: 'household', label: 'ঘরের জিনিস' },
  { value: 'custom', label: 'নিজের দ্রবণ' },
];
const NATURE_BN = { acidic: 'অম্লীয়', neutral: 'নিরপেক্ষ', basic: 'ক্ষারীয়' } as const;

function Tube({ colour, label }: { colour: string; label: string }) {
  return (
    <svg viewBox="0 0 80 190" className="h-48 w-auto" role="img" aria-label={`টেস্ট টিউবে রং: ${label}`}>
      <path d="M20 6 V150 a20 20 0 0 0 40 0 V6" fill="none" stroke="var(--line-strong)" strokeWidth="3" />
      <path
        d="M23 60 V150 a17 17 0 0 0 34 0 V60 Z"
        fill={colour === 'transparent' ? 'color-mix(in oklab, var(--surface) 60%, white)' : colour}
        opacity={colour === 'transparent' ? 0.35 : 0.85}
        style={{ transition: 'fill .5s ease' }}
      />
      <rect x="14" y="2" width="52" height="6" rx="3" fill="var(--line-strong)" />
    </svg>
  );
}

export default function PhScale() {
  const [mode, setMode] = useState<Mode>('household');
  const [subId, setSubId] = useState('lemon');
  const [dilution, setDilution] = useState(1);
  const [indicator, setIndicator] = useState<IndicatorId>('universal');
  const [kind, setKind] = useState<'acid' | 'base'>('acid');
  const [logC, setLogC] = useState(-2);
  const [tests, setTests] = useState<{ sub: string; ind: IndicatorId; ph: number }[]>([]);
  const [diluted, setDiluted] = useState(false);
  const sub = HOUSEHOLD.find((h) => h.id === subId)!;
  const basePh = mode === 'household' ? sub.ph : kind === 'acid' ? phStrongAcid(10 ** logC) : phStrongBase(10 ** logC);
  const ph = dilute(basePh, dilution);
  const col = INDICATORS[indicator](ph);
  const nature = natureOf(ph);

  const record = (s = subId, ind = indicator) =>
    setTests((t) => [
      ...t.slice(-30),
      { sub: s, ind, ph: dilute(mode === 'household' ? HOUSEHOLD.find((h) => h.id === s)!.ph : basePh, dilution) },
    ]);
  const challenges = [
    { label: 'ফেনলফথ্যালিন দিয়ে এমন একটি জিনিস খোঁজো যা গোলাপি হয়', done: tests.some((t) => t.ind === 'phenolphthalein' && t.ph >= 8.2) },
    { label: 'একটি এসিডকে ১০ গুণ পাতলা করো: pH কতটা বদলাল?', done: diluted },
    {
      label: 'সার্বজনীন নির্দেশকে সবুজ রং দেয় এমন একটি জিনিস খোঁজো',
      done: tests.some((t) => t.ind === 'universal' && Math.round(t.ph) === 7),
    },
    { label: 'নিজের দ্রবণে ০.০০১ mol/L NaOH বানাও: pH কত?', done: mode === 'custom' && kind === 'base' && logC === -3 },
  ];

  return (
    <SimShell
      label="pH স্কেল ও নির্দেশক"
      onReset={() => {
        setMode('household');
        setSubId('lemon');
        setDilution(1);
        setIndicator('universal');
      }}
    >
      <div className="space-y-5">
        <section className="panel panel-pad space-y-3" aria-label="pH স্কেল">
          <div className="relative pt-2">
            <div
              className="h-6 rounded-full"
              style={{
                background:
                  'linear-gradient(90deg,#dc2626,#ea580c,#f59e0b,#eab308,#a3e635,#22c55e,#14b8a6,#06b6d4,#3b82f6,#4f46e5,#6d28d9,#7c3aed,#581c87)',
              }}
              aria-hidden="true"
            />
            <div
              className="absolute top-0 h-10 w-1 -translate-x-1/2 rounded bg-ink shadow"
              style={{ left: `${(ph / 14) * 100}%`, transition: 'left .4s ease' }}
              aria-hidden="true"
            />
            <div className="mt-1 flex justify-between font-mono text-[11px] text-muted">
              {Array.from({ length: 15 }, (_, i) => (
                <span key={i}>{bn(i)}</span>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs">
              <span className="text-brand-ink">← বেশি অম্লীয়</span>
              <span className="text-block-p">নিরপেক্ষ</span>
              <span className="text-electron">বেশি ক্ষারীয় →</span>
            </div>
          </div>
          <Segmented options={MODES} value={mode} onChange={(m) => (setMode(m), setDilution(1))} label="কী পরীক্ষা করবে" />
          {mode === 'household' ? (
            <div className="flex flex-wrap gap-2">
              {HOUSEHOLD.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="chip"
                  aria-pressed={h.id === subId}
                  onClick={() => {
                    setSubId(h.id);
                    setDilution(1);
                    record(h.id);
                  }}
                >
                  {h.nameBn}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Segmented
                options={[
                  { value: 'acid', label: 'HCl (তীব্র এসিড)' },
                  { value: 'base', label: 'NaOH (তীব্র ক্ষার)' },
                ]}
                value={kind}
                onChange={(k) => (setKind(k as 'acid' | 'base'), setDilution(1))}
                label="এসিড না ক্ষার"
              />
              <Slider
                label="ঘনমাত্রা"
                value={logC}
                min={-6}
                max={0}
                step={1}
                onChange={(v) => (setLogC(v), setDilution(1))}
                format={(v) => `${bn(String(10 ** v))} mol/L`}
              />
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <section className="panel panel-pad" aria-label="নির্দেশক পরীক্ষা">
            <div className="flex flex-wrap gap-2">
              {IND.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  className="chip"
                  aria-pressed={i.id === indicator}
                  onClick={() => {
                    setIndicator(i.id);
                    record(subId, i.id);
                  }}
                >
                  {i.nameBn}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-6" aria-live="polite">
              <Tube colour={col.colour} label={col.nameBn} />
              <div className="space-y-2">
                <p className="text-sm text-muted">
                  {mode === 'household' ? sub.nameBn : kind === 'acid' ? 'হাইড্রোক্লোরিক এসিড দ্রবণ' : 'সোডিয়াম হাইড্রক্সাইড দ্রবণ'}
                  {dilution > 1 ? ` (${bn(dilution)} গুণ পাতলা)` : ''}
                </p>
                <p className="font-mono text-4xl font-bold text-gold">pH {bnFixed(ph, 1)}</p>
                <p
                  className={cx(
                    'text-lg font-semibold',
                    nature === 'acidic' ? 'text-brand-ink' : nature === 'basic' ? 'text-electron' : 'text-block-p',
                  )}
                >
                  {NATURE_BN[nature]}
                </p>
                <p className="text-sm">
                  {IND.find((i) => i.id === indicator)!.nameBn}: <strong>{col.nameBn}</strong>
                </p>
                <p className="font-mono text-sm text-muted">
                  [H⁺] = <Sci value={hFromPh(ph)} digits={1} /> mol/L
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setDilution((d) => Math.min(d * 10, 1e6));
                  if (ph < 7) setDiluted(true);
                }}
                disabled={nature === 'neutral'}
              >
                ১০ গুণ পানি মিশিয়ে পাতলা করো
              </button>
              {dilution > 1 && (
                <button type="button" className="btn-secondary" onClick={() => setDilution(1)}>
                  আবার আগের মতো
                </button>
              )}
            </div>
          </section>
          <section className="panel panel-pad" aria-label="নির্দেশকের রং">
            <p className="label mb-2">নির্দেশকের রং পরিবর্তন</p>
            <table className="w-full text-sm">
              <tbody>
                {[
                  ['লিটমাস', 'এসিডে লাল', 'ক্ষারে নীল'],
                  ['ফেনলফথ্যালিন', 'এসিডে ও নিরপেক্ষে বর্ণহীন', 'ক্ষারে গোলাপি (pH > ৮.২)'],
                  ['মিথাইল অরেঞ্জ', 'এসিডে লাল (pH < ৩.১)', 'pH > ৪.৪ হলে হলুদ'],
                  ['সার্বজনীন', 'pH ১-২ লাল, ৭ সবুজ', '১৪ গাঢ় বেগুনি'],
                ].map(([n, a, b]) => (
                  <tr key={n} className="border-t border-line">
                    <td className="py-1.5 pr-2 font-semibold">{n}</td>
                    <td className="py-1.5 pr-2 text-brand-ink">{a}</td>
                    <td className="py-1.5 text-electron">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">pH = −log[H⁺]। pH এক কমলে [H⁺] দশ গুণ বাড়ে।</p>
          </section>
        </div>
        <ChallengeList items={challenges} />
      </div>
    </SimShell>
  );
}
