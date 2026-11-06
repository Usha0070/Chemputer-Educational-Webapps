// ব্যাপন ও নিঃসরণ: ammonia and hydrogen chloride diffuse from opposite ends of a tube; the white ring of NH4Cl
// forms where they meet, closer to the end of the heavier gas (Graham's law).
import { useEffect, useMemo, useRef, useState } from 'react';
import { bn, bnFixed, grahamRatio, makeRandom, meetingPoint } from '@/chem';
import { ChallengeList, Equation, Formula, SimShell, Slider, cx, useActive, useSimClock } from '@/ui';

const PAIRS = [
  { id: 'hcl', right: 'HCl', M: 36.5, product: 'NH4Cl', nameBn: 'হাইড্রোজেন ক্লোরাইড' },
  { id: 'hbr', right: 'HBr', M: 81, product: 'NH4Br', nameBn: 'হাইড্রোজেন ব্রোমাইড' },
] as const;
const M_NH3 = 17;
const L = 100; // cm
const TUBE = { x: 30, y: 70, w: 420, h: 40 };

export default function Diffusion() {
  const shellRef = useRef<HTMLDivElement>(null);
  const active = useActive(shellRef);
  const [pairId, setPairId] = useState<(typeof PAIRS)[number]['id']>('hcl');
  const pair = PAIRS.find((p) => p.id === pairId)!;
  const [temp, setTemp] = useState(300);
  const [t, setT] = useState(0);
  const [runs, setRuns] = useState<{ pair: string; temp: number; at: number }[]>([]);
  const predicted = meetingPoint(M_NH3, pair.M);
  // front speeds in cm per (simulated) second: ∝ √(T/M), scaled so the ring forms in ~10 s
  const vL = 6.2 * Math.sqrt(temp / 300) * Math.sqrt(17 / M_NH3) * 1.0;
  const vR = vL / grahamRatio(M_NH3, pair.M);
  const meetT = L / (vL + vR);
  const met = t >= meetT;
  const frontL = Math.min(L * predicted, vL * t);
  const frontR = Math.min(L * (1 - predicted), vR * t);

  const clock = useSimClock((dt) => setT((x) => Math.min(x + dt, meetT + 6)), { active, autoplay: false });

  useEffect(() => {
    if (met) setRuns((r) => [...r, { pair: pairId, temp, at: meetT }]);
    // record once each time the ring forms
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [met]);

  const restart = () => {
    setT(0);
    clock.play();
  };
  const dots = useMemo(() => {
    const rand = makeRandom(4);
    return Array.from({ length: 70 }, () => [rand(), rand()] as const);
  }, []);
  const xOf = (cm: number) => TUBE.x + (cm / L) * TUBE.w;

  const challenges = [
    { label: 'NH₃ ও HCl দিয়ে চালাও: সাদা বলয়টি কোন প্রান্তের কাছে তৈরি হলো?', done: runs.some((r) => r.pair === 'hcl') },
    {
      label: 'তাপমাত্রা বদলে আবার চালাও: বলয়ের অবস্থান কি বদলায়, নাকি শুধু সময়?',
      done: new Set(runs.filter((r) => r.pair === 'hcl').map((r) => r.temp)).size >= 2,
    },
    { label: 'HCl-এর বদলে ভারী HBr নাও: বলয় কোন দিকে সরল?', done: runs.some((r) => r.pair === 'hbr') },
  ];

  return (
    <SimShell
      ref={shellRef}
      label="ব্যাপন ও নিঃসরণ"
      clock={clock}
      onReset={() => {
        clock.pause();
        setT(0);
      }}
    >
      <div className="space-y-5">
        <section className="panel panel-pad space-y-3" aria-label="পরীক্ষা">
          <div className="flex flex-wrap items-center gap-2">
            {PAIRS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip"
                aria-pressed={p.id === pairId}
                onClick={() => {
                  setPairId(p.id);
                  clock.pause();
                  setT(0);
                }}
              >
                <Formula>NH3</Formula> ও <Formula>{p.right}</Formula>
              </button>
            ))}
            <button type="button" className="btn-primary ms-auto px-5" onClick={restart}>
              তুলা বসাও ও শুরু করো
            </button>
          </div>
          <svg
            viewBox="0 0 480 170"
            className="block w-full"
            role="img"
            aria-label={
              met
                ? `সাদা বলয় তৈরি হয়েছে, NH3 প্রান্ত থেকে ${Math.round(predicted * 100)} সেন্টিমিটার দূরে`
                : 'গ্যাস দুটি নলের ভেতর ছড়িয়ে পড়ছে'
            }
          >
            <rect
              x={TUBE.x}
              y={TUBE.y}
              width={TUBE.w}
              height={TUBE.h}
              rx="20"
              fill="color-mix(in oklab, var(--surface) 70%, transparent)"
              stroke="var(--line-strong)"
              strokeWidth="2"
            />
            {/* cotton plugs */}
            <rect
              x={TUBE.x - 14}
              y={TUBE.y + 4}
              width="22"
              height={TUBE.h - 8}
              rx="8"
              fill="#f5f5f4"
              stroke="var(--electron)"
              strokeWidth="2"
            />
            <rect
              x={TUBE.x + TUBE.w - 8}
              y={TUBE.y + 4}
              width="22"
              height={TUBE.h - 8}
              rx="8"
              fill="#f5f5f4"
              stroke="var(--proton)"
              strokeWidth="2"
            />
            {dots.map(([u, v], i) => {
              const left = i % 2 === 0;
              const reach = left ? frontL : frontR;
              const cm = left ? u * u * reach : L - u * u * reach;
              if (reach <= 0.5) return null;
              return (
                <circle
                  key={i}
                  cx={xOf(cm)}
                  cy={TUBE.y + 8 + v * (TUBE.h - 16)}
                  r="3"
                  fill={left ? 'var(--electron)' : 'var(--proton)'}
                  opacity={0.35 + 0.5 * (1 - u)}
                />
              );
            })}
            {met && (
              <rect
                x={xOf(L * predicted) - 6}
                y={TUBE.y + 2}
                width="12"
                height={TUBE.h - 4}
                rx="4"
                fill="#ffffff"
                className="animate-fade-up"
                style={{ filter: 'drop-shadow(0 0 6px #fff)' }}
              />
            )}
            {/* ruler */}
            {[0, 20, 40, 60, 80, 100].map((cm) => (
              <g key={cm}>
                <line x1={xOf(cm)} x2={xOf(cm)} y1={TUBE.y + TUBE.h + 8} y2={TUBE.y + TUBE.h + 14} stroke="var(--muted)" />
                <text x={xOf(cm)} y={TUBE.y + TUBE.h + 30} textAnchor="middle" fontSize="15" className="fill-muted font-mono">
                  {bn(cm)}
                </text>
              </g>
            ))}
            <text x={TUBE.x - 10} y={TUBE.y - 16} fontSize="17" fontWeight="700" className="fill-electron">
              NH₃ (M = ১৭)
            </text>
            <text x={TUBE.x + TUBE.w + 10} y={TUBE.y - 16} textAnchor="end" fontSize="17" fontWeight="700" className="fill-brand-ink">
              {pair.right === 'HCl' ? 'HCl (M = ৩৬.৫)' : 'HBr (M = ৮১)'}
            </text>
            <text x="240" y="166" textAnchor="middle" fontSize="14" className="fill-muted">
              সেন্টিমিটার
            </text>
          </svg>
          <Slider
            label="তাপমাত্রা"
            value={temp}
            min={280}
            max={340}
            step={10}
            onChange={(v) => (setTemp(v), clock.pause(), setT(0))}
            format={(v) => `${bn(v)} K`}
          />
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className={cx('panel panel-pad space-y-2', met && 'border-gold/50')} aria-live="polite" aria-label="ফলাফল">
            <p className="font-mono text-lg">
              <Equation>{`NH3(g) + ${pair.right}(g) -> ${pair.product}(s)`}</Equation>
            </p>
            <p className="text-[15px]">
              {met
                ? `সাদা ধোঁয়ার বলয় (${pair.product}) তৈরি হলো NH₃ প্রান্ত থেকে ${bn(Math.round(predicted * L))} সেমি দূরে, ${bnFixed(meetT, 1)} সেকেন্ডে।`
                : `সময়: ${bnFixed(t, 1)} সেকেন্ড। দুই গ্যাসই নলের ভেতর এগোচ্ছে, NH₃ দ্রুত।`}
            </p>
            <p className="text-sm text-muted">
              গ্রাহামের সূত্র: r(NH₃) ÷ r({pair.right}) = √({bn(pair.M)} ÷ ১৭) = {bnFixed(grahamRatio(M_NH3, pair.M), 3)}
            </p>
          </section>
          <section className="panel panel-pad" aria-label="আগের পরীক্ষা">
            <p className="label mb-2">তোমার পরীক্ষাগুলো</p>
            {runs.length === 0 ? (
              <p className="text-sm text-muted">এখনও কোনো পরীক্ষা শেষ হয়নি।</p>
            ) : (
              <table className="w-full text-center font-mono text-sm">
                <thead>
                  <tr className="text-xs text-muted">
                    <th className="pb-1 font-sans">গ্যাস</th>
                    <th className="pb-1 font-sans">তাপমাত্রা</th>
                    <th className="pb-1 font-sans">সময়</th>
                    <th className="pb-1 font-sans">বলয় (NH₃ থেকে)</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.slice(-6).map((r, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="py-1">{r.pair === 'hcl' ? 'HCl' : 'HBr'}</td>
                      <td className="py-1">{bn(r.temp)} K</td>
                      <td className="py-1">{bnFixed(r.at, 1)} s</td>
                      <td className="py-1">{bn(Math.round(meetingPoint(M_NH3, r.pair === 'hcl' ? 36.5 : 81) * L))} cm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
        <ChallengeList items={challenges} />
      </div>
    </SimShell>
  );
}
