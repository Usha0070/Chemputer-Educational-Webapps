// লা-শাতেলিয়ার নীতি: disturb an equilibrium (add/remove a substance, change pressure or temperature, add a catalyst)
// and watch it relax to its new position on a concentration–time graph.
import { useMemo, useRef, useState } from 'react';
import { HABER, NO2_DIMER, bn, bnFixed, equilibrate, gasMoles, kAt, makeRandom, quotient, shiftDirection, type Reaction } from '@/chem';
import {
  ChallengeList,
  Equation,
  Formula,
  Icon,
  LineChart,
  Segmented,
  SimShell,
  Slider,
  cx,
  useActive,
  useSimClock,
  type SegmentedOption,
} from '@/ui';

type SysId = 'haber' | 'no2';
const SYSTEMS: Record<SysId, { rx: Reaction; start: number[]; tRange: [number, number]; t0: number; colors: string[]; labels: string[] }> =
  {
    haber: {
      rx: HABER,
      start: [1, 3, 0],
      tRange: [600, 900],
      t0: 700,
      colors: ['var(--electron)', 'var(--neutron)', 'var(--gold)'],
      labels: ['N₂', 'H₂', 'NH₃'],
    },
    no2: {
      rx: NO2_DIMER,
      start: [1, 0],
      tRange: [280, 420],
      t0: 350,
      colors: ['#c2410c', 'var(--muted)'],
      labels: ['NO₂ (বাদামি)', 'N₂O₄ (বর্ণহীন)'],
    },
  };
const OPTIONS: SegmentedOption<SysId>[] = [
  { value: 'haber', label: 'হেবার প্রণালি' },
  { value: 'no2', label: 'NO₂ ⇌ N₂O₄' },
];
const DOTS_PER_MOL = 14;

interface Sim {
  moles: number[];
  target: number[];
  t: number;
  history: number[][]; // [t, c1, c2, …]
}

export default function LeChatelier() {
  const shellRef = useRef<HTMLDivElement>(null);
  const active = useActive(shellRef);
  const [sysId, setSysId] = useState<SysId>('haber');
  const sys = SYSTEMS[sysId];
  const [volume, setVolume] = useState(2);
  const [temp, setTemp] = useState(sys.t0);
  const [catalyst, setCatalyst] = useState(false);
  const [message, setMessage] = useState('সিস্টেমটি সাম্যাবস্থায় আছে। ডানের বোতামগুলো দিয়ে একটি পরিবর্তন ঘটাও।');
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const init = (id: SysId, V = 2, T = SYSTEMS[id].t0): Sim => {
    const eq = equilibrate(SYSTEMS[id].rx, SYSTEMS[id].start, V, T);
    return { moles: eq, target: eq, t: 0, history: [[0, ...eq.map((n) => n / V)]] };
  };
  const [sim, setSim] = useState<Sim>(() => init('haber'));

  const clock = useSimClock(
    (dt) =>
      setSim((s) => {
        const tau = catalyst ? 0.35 : 1.1;
        const k = 1 - Math.exp(-dt / tau);
        const moles = s.moles.map((n, i) => n + (s.target[i]! - n) * k);
        const t = s.t + dt;
        const last = s.history[s.history.length - 1]!;
        const history = t - last[0]! >= 0.2 ? [...s.history, [t, ...moles.map((n) => n / volume)]].slice(-200) : s.history;
        return { moles, target: s.target, t, history };
      }),
    { active },
  );

  /** Apply a disturbance to the current amounts and re-target the equilibrium. */
  const disturb = (kind: string, next: { moles?: number[]; V?: number; T?: number }) => {
    const V = next.V ?? volume;
    const T = next.T ?? temp;
    const now = next.moles ?? sim.moles;
    const target = equilibrate(sys.rx, now, V, T);
    const dir = shiftDirection(sys.rx, now, target);
    const product = sys.labels[sys.rx.nu.findIndex((v) => v > 0)]!;
    const reason: Record<string, string> = {
      addR: 'যোগ করা বিক্রিয়কের প্রভাব কমাতে',
      removeP: 'সরিয়ে নেওয়া উৎপাদ পূরণ করতে',
      pressureUp: `চাপ কমাতে কম গ্যাস-অণুর দিকে (বাম ${bn(gasMoles(sys.rx).left)} : ডান ${bn(gasMoles(sys.rx).right)})`,
      pressureDown: 'চাপ বাড়াতে বেশি গ্যাস-অণুর দিকে',
      heat: 'বাড়তি তাপ শোষণ করতে তাপহারী (পশ্চাৎমুখী) দিকে',
      cool: 'হারানো তাপ পূরণ করতে তাপোৎপাদী (সম্মুখমুখী) দিকে',
    };
    setMessage(
      dir === 'none'
        ? 'সাম্যাবস্থার অবস্থান বদলায়নি।'
        : `সাম্যাবস্থা ${dir === 'right' ? 'ডানে' : 'বামে'} সরছে: ${dir === 'right' ? `বেশি ${product} তৈরি হচ্ছে` : `${product} ভেঙে বিক্রিয়ক হচ্ছে`}, ${reason[kind] ?? ''}।`,
    );
    setDone((d) => new Set(d).add(kind));
    setSim((s) => ({ ...s, moles: now, target }));
    if (!clock.playing) clock.play();
  };

  const switchSystem = (id: SysId) => {
    setSysId(id);
    setVolume(2);
    setTemp(SYSTEMS[id].t0);
    setCatalyst(false);
    setSim(init(id));
    setMessage('সিস্টেমটি সাম্যাবস্থায় আছে। একটি পরিবর্তন ঘটাও।');
  };

  const K = kAt(sys.rx, temp);
  const Q = quotient(sys.rx, sim.moles, volume);
  const settling = sim.moles.some((n, i) => Math.abs(n - sim.target[i]!) > 1e-3);
  const conc = sim.moles.map((n) => n / volume);
  const yMax = Math.max(2, ...sim.history.flatMap((h) => h.slice(1))) * 1.1;
  const xMax = Math.max(20, Math.ceil(sim.t / 10) * 10);
  const xMin = Math.max(0, xMax - 60);

  // stable dot positions inside the box
  const dots = useMemo(() => {
    const rand = makeRandom(9);
    return Array.from({ length: 160 }, () => [rand(), rand()] as const);
  }, []);
  const boxW = 60 + volume * 55;
  let di = 0;
  const no2Tint = sysId === 'no2' ? Math.min(0.65, conc[0]! * 0.9) : 0;

  const challenges = [
    { label: 'বিক্রিয়ক যোগ করে দেখো সাম্যাবস্থা কোন দিকে সরে', done: done.has('addR') },
    { label: 'আয়তন কমিয়ে (চাপ বাড়িয়ে) দেখো', done: done.has('pressureUp') },
    { label: 'তাপমাত্রা বাড়িয়ে দেখো: তাপোৎপাদী বিক্রিয়ার উৎপাদ কমে কেন?', done: done.has('heat') },
    { label: 'প্রভাবক দিয়ে দেখো: উৎপাদের পরিমাণ বদলায় কি?', done: done.has('catalyst') },
  ];

  return (
    <SimShell ref={shellRef} label="লা-শাতেলিয়ার নীতি" clock={clock} onReset={() => switchSystem(sysId)}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented options={OPTIONS} value={sysId} onChange={switchSystem} label="বিক্রিয়া" />
          <span className="font-mono text-lg">
            <Equation>{sys.rx.equation}</Equation>
          </span>
          <span className="text-sm text-muted">ΔH = {bn(sys.rx.dH)} kJ/mol (তাপোৎপাদী)</span>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="space-y-5">
            <section className="panel panel-pad" aria-label="পাত্র">
              <svg
                viewBox="0 0 320 200"
                className="mx-auto block w-full max-w-lg"
                role="img"
                aria-label={`ঘনমাত্রা: ${sys.labels.map((l, i) => `${l} ${bnFixed(conc[i]!, 2)}`).join(', ')}`}
              >
                <rect
                  x={(320 - boxW) / 2}
                  y="20"
                  width={boxW}
                  height="160"
                  rx="6"
                  fill={`rgba(194, 65, 12, ${no2Tint})`}
                  stroke="var(--line-strong)"
                  strokeWidth="2"
                  style={{ transition: 'all .6s ease' }}
                />
                <rect
                  x={(320 - boxW) / 2 + boxW - 6}
                  y="14"
                  width="12"
                  height="172"
                  rx="3"
                  fill="var(--raised)"
                  stroke="var(--line-strong)"
                />
                {sim.moles.map((n, s) =>
                  Array.from({ length: Math.round(n * DOTS_PER_MOL) }, (_, j) => {
                    const p = dots[di++ % dots.length]!;
                    return (
                      <circle
                        key={`${s}-${j}`}
                        cx={(320 - boxW) / 2 + 8 + p[0] * (boxW - 22)}
                        cy={28 + p[1] * 144}
                        r={s === sys.rx.nu.length - 1 && sysId === 'haber' ? 4.5 : 3.5}
                        fill={sys.colors[s]}
                      />
                    );
                  }),
                )}
              </svg>
              <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-muted">
                {sys.labels.map((l, i) => (
                  <span key={l} className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: sys.colors[i] }} /> {l}: {bnFixed(conc[i]!, 2)} mol/L
                  </span>
                ))}
              </div>
            </section>
            <section className="panel panel-pad" aria-label="ঘনমাত্রা বনাম সময়">
              <LineChart
                series={sys.labels.map((l, i) => ({
                  label: l,
                  color: sys.colors[i]!,
                  points: sim.history.filter((h) => h[0]! >= xMin).map((h) => [h[0]! - xMin, h[i + 1]!] as [number, number]),
                }))}
                xMax={xMax - xMin}
                yMax={yMax}
                xLabel="সময় (সেকেন্ড)"
                yLabel="ঘনমাত্রা (mol/L)"
                ariaLabel="ঘনমাত্রা বনাম সময়ের লেখচিত্র"
              />
            </section>
          </div>

          <div className="space-y-5">
            <section className="panel panel-pad space-y-3" aria-label="পরিবর্তন ঘটাও">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => disturb('addR', { moles: sim.moles.map((n, i) => (i === 0 ? n + 0.6 : n)) })}
                >
                  + <Formula>{sysId === 'haber' ? 'N2' : 'NO2'}</Formula> যোগ করো
                </button>
                {sysId === 'haber' && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => disturb('addR', { moles: sim.moles.map((n, i) => (i === 1 ? n + 1 : n)) })}
                  >
                    + <Formula>H2</Formula> যোগ করো
                  </button>
                )}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => disturb('removeP', { moles: sim.moles.map((n, i) => (sys.rx.nu[i]! > 0 ? n / 2 : n)) })}
                >
                  − উৎপাদ অর্ধেক সরাও
                </button>
              </div>
              <Slider
                label="আয়তন (ছোট আয়তন = বেশি চাপ)"
                value={volume}
                min={0.5}
                max={4}
                step={0.5}
                onChange={(v) => {
                  disturb(v < volume ? 'pressureUp' : 'pressureDown', { V: v });
                  setVolume(v);
                }}
                format={(v) => `${bn(v)} L`}
              />
              <Slider
                label="তাপমাত্রা"
                value={temp}
                min={sys.tRange[0]}
                max={sys.tRange[1]}
                step={20}
                onChange={(v) => {
                  disturb(v > temp ? 'heat' : 'cool', { T: v });
                  setTemp(v);
                }}
                format={(v) => `${bn(v)} K`}
              />
              <button
                type="button"
                className="chip"
                aria-pressed={catalyst}
                onClick={() => {
                  setCatalyst((c) => !c);
                  setDone((d) => new Set(d).add('catalyst'));
                  setMessage(
                    catalyst
                      ? 'প্রভাবক সরানো হলো।'
                      : 'প্রভাবক সম্মুখ ও পশ্চাৎ দুই বিক্রিয়ার হারই সমান হারে বাড়ায়। তাই সাম্যাবস্থায় দ্রুত পৌঁছায়, কিন্তু উৎপাদের পরিমাণ বদলায় না।',
                  );
                }}
              >
                প্রভাবক {sysId === 'haber' ? '(Fe)' : ''}
              </button>
            </section>

            <section className={cx('panel panel-pad', settling && 'border-gold/50')} aria-live="polite" aria-label="ব্যাখ্যা">
              <p className="flex gap-2 text-[15px] leading-relaxed">
                <Icon name="info" className="mt-1 h-4 w-4 shrink-0 text-gold" />
                {message}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center font-mono">
                <div className="rounded-lg border border-line bg-raised/60 px-2 py-2">
                  <p className="font-sans text-[11px] text-muted">Q (এখন)</p>
                  <p className="text-lg font-bold">{bnFixed(Q, 3)}</p>
                </div>
                <div className="rounded-lg border border-line bg-raised/60 px-2 py-2">
                  <p className="font-sans text-[11px] text-muted">K ({bn(temp)} K)</p>
                  <p className="text-lg font-bold">{bnFixed(K, 3)}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted">
                {settling ? (Q < K ? 'Q < K: সম্মুখ বিক্রিয়া বেশি চলছে' : 'Q > K: পশ্চাৎ বিক্রিয়া বেশি চলছে') : 'Q = K: সাম্যাবস্থা'}
              </p>
            </section>
            <ChallengeList items={challenges} />
          </div>
        </div>
      </div>
    </SimShell>
  );
}
