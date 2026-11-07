// বৈজ্ঞানিক অনুসন্ধান: plan and run a fair test of "does hotter water dissolve sugar faster?". Choose a hypothesis,
// change only the temperature, keep everything else the same, record the stopwatch times, read the graph and conclude.
import { useEffect, useRef, useState } from 'react';
import {
  HYPOTHESES,
  STANDARD,
  bn,
  measuredTime,
  supports,
  trend,
  uncontrolled,
  type Hypothesis,
  type SugarForm,
  type Trend,
  type Trial,
  type Variable,
} from '@/chem';
import {
  Beaker,
  ChallengeList,
  LineChart,
  Segmented,
  SimShell,
  Slider,
  Thermometer,
  cx,
  useActive,
  usePrefersReducedMotion,
  useSimClock,
} from '@/ui';

const VAR_BN: Record<Variable, string> = {
  temp: 'তাপমাত্রা',
  stirred: 'নাড়ানো',
  form: 'চিনির ধরন',
  sugar: 'চিনির পরিমাণ',
  water: 'পানির পরিমাণ',
};
const CONCLUSIONS: { id: Trend; textBn: string }[] = [
  { id: 'faster-when-hotter', textBn: 'পানি যত গরম, চিনি তত দ্রুত গলে' },
  { id: 'slower-when-hotter', textBn: 'পানি যত গরম, চিনি তত ধীরে গলে' },
  { id: 'no-clear-trend', textBn: 'তাপমাত্রার সাথে গলার সময়ের কোনো সম্পর্ক নেই' },
];
const STAGES = ['প্রশ্ন', 'অনুমান', 'পরিকল্পনা', 'পরীক্ষা', 'সিদ্ধান্ত'];

interface Result {
  trial: Trial;
  time: number;
}

/** Water colour from cold blue to warm amber. */
const waterColour = (t: number) =>
  `color-mix(in oklab, color-mix(in oklab, #38bdf8 ${Math.round(100 - ((t - 10) / 70) * 100)}%, #f97316) 30%, transparent)`;

export default function ScientificInvestigation() {
  const shellRef = useRef<HTMLDivElement>(null);
  const active = useActive(shellRef);
  const reduced = usePrefersReducedMotion();
  const [trial, setTrial] = useState<Trial>({ temp: 20, ...STANDARD });
  const [hypothesis, setHypothesis] = useState<Hypothesis | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [conclusion, setConclusion] = useState<Trend | null>(null);
  const [sawUnfair, setSawUnfair] = useState(false);

  const current = progress === null ? null : measuredTime(trial, results.length + 1);
  const clock = useSimClock(
    (dt) =>
      setProgress((p) => {
        if (p === null) return p;
        const next = p + dt / 2.2;
        return next >= 1 ? 1 : next;
      }),
    { active, autoplay: false },
  );

  const record = (t: Trial) => {
    setResults((rs) => [...rs, { trial: t, time: measuredTime(t, rs.length + 1) }]);
    setProgress(null);
  };
  useEffect(() => {
    if (trend(results) === 'unfair') setSawUnfair(true);
  }, [results]);
  // the stopwatch reached the dissolving time: write the result in the table
  const { pause } = clock;
  useEffect(() => {
    if (progress !== 1) return;
    pause();
    record(trial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const run = () => {
    if (progress !== null) return;
    if (reduced) record(trial);
    else {
      setProgress(0);
      clock.play();
    }
  };
  const reset = () => {
    clock.pause();
    setProgress(null);
    setResults([]);
    setTrial({ temp: 20, ...STANDARD });
    setHypothesis(null);
    setConclusion(null);
  };

  const t = trend(results);
  const changed = uncontrolled(results.map((r) => r.trial));
  const verdict = hypothesis ? supports(hypothesis, t) : null;
  // 0 question → 1 hypothesis → 2 plan → 3 experiment → 4 conclusion (all done once a conclusion is chosen)
  const stage = conclusion ? 5 : results.length > 0 ? 3 : hypothesis ? 2 : 1;
  const set = <K extends keyof Trial>(k: K, v: Trial[K]) => setTrial((x) => ({ ...x, [k]: v }));
  // how much sugar is left: shrinks while the trial runs, back to a fresh spoonful for the next one
  const left = progress === null ? 1 : Math.max(0.12, 1 - progress);
  const stopwatch = progress === null ? 0 : Math.round((current ?? 0) * progress);
  const points: [number, number][] =
    changed.length > 0 ? [] : [...results].sort((a, b) => a.trial.temp - b.trial.temp).map((r) => [r.trial.temp, r.time]);
  const yMax = Math.max(100, ...results.map((r) => r.time));

  const challenges = [
    { label: 'একটি অনুমান বেছে নাও', done: hypothesis !== null },
    {
      label: 'অন্তত তিনটি ভিন্ন তাপমাত্রায় ন্যায্য পরীক্ষা চালাও',
      done: ['faster-when-hotter', 'slower-when-hotter', 'no-clear-trend'].includes(t),
    },
    { label: 'তাপমাত্রার সাথে আরেকটি চলকও বদলে দেখো, পরীক্ষা কেন অন্যায্য হয়', done: sawUnfair },
    { label: 'ফলাফল থেকে সঠিক সিদ্ধান্ত বেছে নাও', done: conclusion !== null && conclusion === t },
  ];

  return (
    <SimShell ref={shellRef} label="বৈজ্ঞানিক অনুসন্ধান: চিনি গলা ও তাপমাত্রা" onReset={reset}>
      <div className="space-y-5">
        <ol className="flex flex-wrap gap-2" aria-label="অনুসন্ধানের ধাপ">
          {STAGES.map((s, i) => (
            <li
              key={s}
              className={cx(
                'rounded-full border px-3 py-1 text-sm font-semibold',
                i < stage ? 'border-block-p/60 text-block-p' : i === stage ? 'border-gold bg-gold/15 text-ink' : 'border-line text-muted',
              )}
              aria-current={i === stage ? 'step' : undefined}
            >
              {bn(i + 1)}. {s}
            </li>
          ))}
        </ol>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section className="panel panel-pad space-y-4" aria-label="পরীক্ষাগার">
            <p className="rounded-xl border border-line bg-raised/60 px-3 py-2 text-[15px]">
              <strong className="text-gold">প্রশ্ন:</strong> পানির তাপমাত্রা বাড়লে কি চিনি দ্রুত গলে?
            </p>
            <svg
              viewBox="0 0 300 230"
              className="mx-auto block w-full max-w-xs"
              role="img"
              aria-label={`${bn(trial.temp)} ডিগ্রি সেলসিয়াস পানিতে চিনি`}
            >
              <Beaker x={40} y={30} w={150} h={170} level={trial.water === 200 ? 0.8 : 0.55} liquid={waterColour(trial.temp)}>
                {trial.form === 'cube' ? (
                  <rect
                    x={75 - 18 * left * (trial.sugar / 5)}
                    y={166 - 36 * left * (trial.sugar / 5)}
                    width={36 * left * (trial.sugar / 5)}
                    height={36 * left * (trial.sugar / 5)}
                    rx="3"
                    fill="#f8fafc"
                    stroke="#cbd5e1"
                    opacity={0.3 + 0.65 * left}
                  />
                ) : (
                  Array.from({ length: trial.sugar === 10 ? 18 : 10 }, (_, i) => (
                    <rect
                      key={i}
                      x={22 + ((i * 37) % 108)}
                      y={152 - (i % 3) * 7}
                      width={7 * left}
                      height={7 * left}
                      fill="#f8fafc"
                      stroke="#cbd5e1"
                      opacity={0.2 + 0.75 * left}
                    />
                  ))
                )}
              </Beaker>
              {trial.stirred && <line x1="100" y1="10" x2="130" y2="185" stroke="#a1a1aa" strokeWidth="4" strokeLinecap="round" />}
              {trial.stirred && progress !== null && (
                <g fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M70 120 q 45 -22 90 0" />
                  <path d="M160 140 q -45 22 -90 0" />
                </g>
              )}
              <Thermometer x={250} y={20} height={190} temp={trial.temp} min={0} max={100} />
              <text x="115" y="222" textAnchor="middle" fontSize="15" className="fill-ink font-mono font-semibold">
                ⏱ {bn(stopwatch)} সে
              </text>
            </svg>
            <Slider
              label="পানির তাপমাত্রা (যে চলকটি বদলাবে)"
              value={trial.temp}
              min={10}
              max={80}
              step={5}
              onChange={(v) => set('temp', v)}
              format={(v) => `${bn(v)} °সে`}
            />
            <div className="space-y-3 rounded-xl border border-dashed border-line p-3">
              <p className="label">যে চলকগুলো একই রাখতে হবে</p>
              <Segmented
                label="নাড়ানো"
                value={trial.stirred ? 'yes' : 'no'}
                onChange={(v) => set('stirred', v === 'yes')}
                options={[
                  { value: 'yes', label: 'নাড়া হবে' },
                  { value: 'no', label: 'নাড়া হবে না' },
                ]}
              />
              <Segmented<SugarForm>
                label="চিনির ধরন"
                value={trial.form}
                onChange={(v) => set('form', v)}
                options={[
                  { value: 'granules', label: 'দানা চিনি' },
                  { value: 'cube', label: 'চিনির কিউব' },
                ]}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Segmented
                  label="চিনির পরিমাণ"
                  value={String(trial.sugar)}
                  onChange={(v) => set('sugar', Number(v))}
                  options={[
                    { value: '5', label: '৫ g চিনি' },
                    { value: '10', label: '১০ g চিনি' },
                  ]}
                />
                <Segmented
                  label="পানির পরিমাণ"
                  value={String(trial.water)}
                  onChange={(v) => set('water', Number(v))}
                  options={[
                    { value: '100', label: '১০০ mL' },
                    { value: '200', label: '২০০ mL' },
                  ]}
                />
              </div>
            </div>
            <button type="button" className="btn-primary w-full" onClick={run} disabled={progress !== null}>
              {progress !== null ? 'চিনি গলছে…' : 'পরীক্ষা চালাও ও সময় লেখো'}
            </button>
          </section>

          <div className="space-y-5">
            <section className="panel panel-pad space-y-2" aria-label="অনুমান">
              <p className="label">তোমার অনুমান (পরীক্ষার আগে)</p>
              <div className="flex flex-col gap-2">
                {HYPOTHESES.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    className="chip justify-start text-left"
                    aria-pressed={hypothesis === h.id}
                    onClick={() => setHypothesis(h.id)}
                  >
                    {h.textBn}
                  </button>
                ))}
              </div>
            </section>

            <section className="panel panel-pad" aria-label="ফলাফলের সারণি">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="label">ফলাফলের সারণি</p>
                {results.length > 0 && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-gold hover:underline"
                    onClick={() => {
                      setResults([]);
                      setConclusion(null);
                    }}
                  >
                    সারণি মুছে আবার শুরু করো
                  </button>
                )}
              </div>
              {results.length === 0 ? (
                <p className="text-sm text-muted">এখনো কোনো পরীক্ষা হয়নি। তাপমাত্রা ঠিক করে “পরীক্ষা চালাও” চাপো।</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted">
                        <th className="py-1 pr-2">#</th>
                        <th className="py-1 pr-2">তাপমাত্রা</th>
                        <th className="py-1 pr-2">নাড়ানো</th>
                        <th className="py-1 pr-2">ধরন</th>
                        <th className="py-1 pr-2">চিনি/পানি</th>
                        <th className="py-1">সময়</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {results.map((r, i) => {
                        const differs = (k: Variable) => r.trial[k] !== results[0]!.trial[k] && k !== 'temp';
                        return (
                          <tr key={i} className="border-t border-line">
                            <td className="py-1 pr-2">{bn(i + 1)}</td>
                            <td className="py-1 pr-2">{bn(r.trial.temp)} °সে</td>
                            <td className={cx('py-1 pr-2', differs('stirred') && 'font-bold text-danger')}>
                              {r.trial.stirred ? 'হ্যাঁ' : 'না'}
                            </td>
                            <td className={cx('py-1 pr-2 font-sans', differs('form') && 'font-bold text-danger')}>
                              {r.trial.form === 'cube' ? 'কিউব' : 'দানা'}
                            </td>
                            <td className={cx('py-1 pr-2', (differs('sugar') || differs('water')) && 'font-bold text-danger')}>
                              {bn(r.trial.sugar)} g / {bn(r.trial.water)} mL
                            </td>
                            <td className="py-1 font-semibold">{bn(r.time)} সে</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p
                className={cx(
                  'mt-3 rounded-xl border px-3 py-2 text-sm',
                  changed.length > 0 ? 'border-danger/60 bg-danger/10' : 'border-line bg-raised/60',
                )}
                aria-live="polite"
              >
                {changed.length > 0 ? (
                  <>
                    <strong>ন্যায্য পরীক্ষা নয়!</strong> তাপমাত্রার সাথে {changed.map((k) => VAR_BN[k]).join(', ')}ও বদলেছে। তাহলে সময়ের
                    পার্থক্য কোন চলকের জন্য, বলা যাবে না। একবারে শুধু একটি চলক বদলাও।
                  </>
                ) : results.length < 3 || t === 'not-enough-data' ? (
                  <>অন্তত তিনটি ভিন্ন তাপমাত্রায় পরীক্ষা করো, বাকি সব একই রেখে।</>
                ) : (
                  <>
                    <strong className="text-block-p">ন্যায্য পরীক্ষা।</strong> শুধু তাপমাত্রা বদলেছে, তাই সময়ের পার্থক্য তাপমাত্রার কারণেই।
                  </>
                )}
              </p>
            </section>

            <section className="panel panel-pad" aria-label="লেখচিত্র: সময় বনাম তাপমাত্রা">
              <LineChart
                series={[{ label: 'গলার সময়', color: 'var(--gold)', points }]}
                xMax={80}
                yMax={yMax}
                xLabel="তাপমাত্রা (°সে)"
                yLabel="সময় (সে)"
                ariaLabel="চিনি গলার সময় বনাম পানির তাপমাত্রার লেখচিত্র"
              />
            </section>

            <section className="panel panel-pad space-y-2" aria-label="সিদ্ধান্ত">
              <p className="label">সিদ্ধান্ত: ফলাফল কী বলছে?</p>
              <div className="flex flex-col gap-2">
                {CONCLUSIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="chip justify-start text-left"
                    aria-pressed={conclusion === c.id}
                    disabled={['not-enough-data', 'unfair'].includes(t)}
                    onClick={() => setConclusion(c.id)}
                  >
                    {c.textBn}
                  </button>
                ))}
              </div>
              {conclusion && (
                <p className="text-[15px]" aria-live="polite">
                  {conclusion === t ? (
                    <strong className="text-block-p">ঠিক! তথ্যই এই সিদ্ধান্ত সমর্থন করে।</strong>
                  ) : (
                    <strong className="text-danger">লেখচিত্রটি আবার দেখো: তাপমাত্রা বাড়ার সাথে সময় কোন দিকে বদলেছে?</strong>
                  )}{' '}
                  {verdict === true && 'তোমার অনুমানও সঠিক প্রমাণিত হলো।'}
                  {verdict === false && 'তোমার অনুমান মেলেনি, আর সেটাও বিজ্ঞান: তথ্য দেখে অনুমান বদলাতে হয়।'}
                </p>
              )}
            </section>
            <ChallengeList items={challenges} />
          </div>
        </div>
      </div>
    </SimShell>
  );
}
