// গলন, স্ফুটন ও তাপমাত্রা: heat ice from −20 °C to steam. The temperature stays flat at 0 °C and 100 °C while the
// heat goes into changing the state; the graph shows the two plateaus.
import { useEffect, useRef, useState } from 'react';
import { HEAT, bn, bnFixed, heatingState, stageEnergies, type HeatingStage } from '@/chem';
import { Beaker, Bubbles, ChallengeList, LineChart, SimShell, Slider, Thermometer, cx, useActive, useSimClock } from '@/ui';

const MASS = 50; // g
const START = -20;
const STAGE_BN: Record<HeatingStage, string> = {
  ice: 'বরফ গরম হচ্ছে',
  melting: 'গলন চলছে (০ °সে)',
  water: 'পানি গরম হচ্ছে',
  boiling: 'স্ফুটন চলছে (১০০ °সে)',
  steam: 'বাষ্প গরম হচ্ছে',
};
const STAGE_WHY: Record<HeatingStage, string> = {
  ice: 'দেওয়া তাপে বরফের কণাগুলোর কম্পন বাড়ছে, তাই তাপমাত্রা বাড়ছে।',
  melting: 'তাপ এখন কণাগুলোর মধ্যের আকর্ষণ ভাঙতে খরচ হচ্ছে (গলনের সুপ্ততাপ), গতিশক্তি বাড়াতে নয়। তাই তাপমাত্রা স্থির।',
  water: 'সব বরফ গলে গেছে। এবার তাপ পানির কণাগুলোর গতি বাড়াচ্ছে, তাপমাত্রা বাড়ছে।',
  boiling:
    'তাপ এখন পানির কণাগুলোকে পুরোপুরি আলাদা করে বাষ্প বানাতে খরচ হচ্ছে (বাষ্পীভবনের সুপ্ততাপ)। তাপমাত্রা স্থির, আর এই ধাপ অনেক লম্বা।',
  steam: 'সব পানি বাষ্প হয়ে গেছে। এবার বাষ্পের কণাগুলো আরও দ্রুত ছুটছে।',
};

export default function HeatingCurve() {
  const shellRef = useRef<HTMLDivElement>(null);
  const active = useActive(shellRef);
  const [power, setPower] = useState(400); // W = J/s
  const [run, setRun] = useState({ t: 0, q: 0, curve: [[0, START]] as [number, number][] });
  const [stages, setStages] = useState<Set<HeatingStage>>(() => new Set(['ice']));
  const e = stageEnergies(MASS, START);
  const total = e.cumulative[3] + MASS * HEAT.cSteam * 20;
  const state = heatingState(MASS, run.q, START);
  const finished = run.q >= total;

  const clock = useSimClock(
    (dt) =>
      setRun((r) => {
        if (r.q >= total) return r;
        const t = r.t + dt * 10; // 1 s of animation = 10 s of heating
        const q = Math.min(total, r.q + power * dt * 10);
        const T = heatingState(MASS, q, START).tempC;
        const last = r.curve[r.curve.length - 1]![0];
        return { t, q, curve: t - last >= 5 ? [...r.curve, [t, T] as [number, number]] : r.curve };
      }),
    { active, autoplay: false },
  );
  useEffect(() => setStages((s) => (s.has(state.stage) ? s : new Set(s).add(state.stage))), [state.stage]);

  const reset = () => {
    clock.pause();
    setRun({ t: 0, q: 0, curve: [[0, START]] });
  };
  const xMax = Math.max(100, Math.ceil(total / power / 50) * 50);
  const iceLeft = state.stage === 'ice' ? 1 : state.stage === 'melting' ? 1 - state.fraction : 0;
  // only melted ice counts as liquid: none while it is still all ice, rising as it melts, falling as it boils away
  const waterLevel =
    state.stage === 'ice'
      ? 0
      : state.stage === 'melting'
        ? 0.5 * state.fraction
        : state.stage === 'water'
          ? 0.5
          : state.stage === 'boiling'
            ? 0.5 * (1 - state.fraction)
            : 0;
  const plateauTimes = { melt: e.melt / power, boil: e.boil / power };

  const challenges = [
    { label: 'বরফ গলা শুরু হওয়া পর্যন্ত চালাও: থার্মোমিটার কত দেখায়?', done: stages.has('melting') },
    { label: 'পানি ফুটতে দেখো', done: stages.has('boiling') },
    { label: 'পুরোটা চালিয়ে দুই সমতল অংশের দৈর্ঘ্য তুলনা করো', done: stages.has('steam') },
  ];

  return (
    <SimShell ref={shellRef} label="গলন, স্ফুটন ও তাপমাত্রা" clock={clock} onReset={reset}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="panel panel-pad space-y-3" aria-label="পরীক্ষা">
          <svg
            viewBox="0 0 300 270"
            className="mx-auto block w-full max-w-xs"
            role="img"
            aria-label={`${STAGE_BN[state.stage]}, তাপমাত্রা ${bnFixed(state.tempC, 1)} ডিগ্রি সেলসিয়াস`}
          >
            <Beaker x={40} y={40} w={150} h={150} level={waterLevel} liquid="color-mix(in oklab, var(--electron) 30%, transparent)">
              {Array.from({ length: Math.ceil(iceLeft * 6) }, (_, i) => (
                <rect
                  key={i}
                  x={15 + (i % 3) * 42}
                  y={95 - Math.floor(i / 3) * 34}
                  width={34 * Math.max(0.4, iceLeft)}
                  height={30 * Math.max(0.4, iceLeft)}
                  rx="5"
                  fill="#e0f2fe"
                  stroke="#7dd3fc"
                  opacity=".9"
                />
              ))}
            </Beaker>
            <Bubbles x={115} y={180} height={110} active={state.stage === 'boiling'} />
            {state.stage === 'steam' && (
              <g opacity=".6">
                {[0, 1, 2].map((k) => (
                  <path
                    key={k}
                    d={`M${85 + k * 30} 36 q -10 -14 0 -26 q 10 -12 0 -24`}
                    fill="none"
                    stroke="var(--muted)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                ))}
              </g>
            )}
            {/* burner */}
            <rect x="70" y="200" width="90" height="10" rx="3" fill="var(--line-strong)" />
            {clock.playing && !finished && (
              <g>
                {[0, 1, 2, 3].map((k) => (
                  <path key={k} d={`M${85 + k * 20} 198 q -6 -10 0 -18 q 6 8 0 18`} fill="#fb923c" opacity=".85" />
                ))}
              </g>
            )}
            <Thermometer x={250} y={20} height={220} temp={state.tempC} min={-20} max={120} />
          </svg>
          <p className="rounded-xl border border-line bg-raised/60 px-3 py-2 text-[15px] leading-relaxed" aria-live="polite">
            <strong className="text-gold">{STAGE_BN[state.stage]}।</strong> {STAGE_WHY[state.stage]}
          </p>
          <Slider label="বার্নারের তাপ" value={power} min={200} max={800} step={100} onChange={setPower} format={(v) => `${bn(v)} J/s`} />
        </section>
        <div className="space-y-5">
          <section className="panel panel-pad" aria-label="তাপমাত্রা বনাম সময়">
            <LineChart
              series={[{ label: 'তাপমাত্রা', color: 'var(--gold)', points: [...run.curve, [run.t, state.tempC]] }]}
              xMax={xMax}
              yMin={-20}
              yMax={120}
              xLabel="সময় (সেকেন্ড)"
              yLabel="তাপমাত্রা (°সে)"
              ariaLabel="উত্তাপন লেখচিত্র: তাপমাত্রা বনাম সময়"
            />
          </section>
          <section className="panel panel-pad" aria-label="শক্তির হিসাব">
            <p className="label mb-2">{bn(MASS)} গ্রাম বরফের জন্য শক্তির হিসাব</p>
            <ul className="space-y-1.5 font-mono text-sm">
              {[
                ['বরফ −২০ → ০ °সে', `m·c·ΔT = ${bn(MASS)} × ${bn(HEAT.cIce)} × ২০`, e.toZero, 'ice'],
                ['গলন (০ °সে)', `m·L = ${bn(MASS)} × ${bn(HEAT.fusion)}`, e.melt, 'melting'],
                ['পানি ০ → ১০০ °সে', `${bn(MASS)} × ${bn(HEAT.cWater)} × ১০০`, e.toHundred, 'water'],
                ['স্ফুটন (১০০ °সে)', `${bn(MASS)} × ${bn(HEAT.vaporisation)}`, e.boil, 'boiling'],
              ].map(([label, f, q, st]) => (
                <li
                  key={String(label)}
                  className={cx('flex flex-wrap justify-between gap-x-3 rounded px-2 py-1', state.stage === st && 'bg-gold/15 text-ink')}
                >
                  <span className="font-sans">{label}</span>
                  <span className="text-muted">{f}</span>
                  <strong>{bnFixed(Number(q) / 1000, 1)} kJ</strong>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">
              এই বার্নারে গলতে লাগে প্রায় {bn(Math.round(plateauTimes.melt))} সেকেন্ড, কিন্তু ফুটে বাষ্প হতে প্রায়{' '}
              {bn(Math.round(plateauTimes.boil))} সেকেন্ড: বাষ্পীভবনের সুপ্ততাপ গলনের প্রায় ৭ গুণ।
            </p>
          </section>
          <ChallengeList items={challenges} />
        </div>
      </div>
    </SimShell>
  );
}
