// তাপোৎপাদী ও তাপহারী: virtual thermometer experiments (q = mcΔT → ΔH), an energy-profile diagram,
// and a bond-energy calculator (energy to break bonds − energy released forming bonds).
import { useEffect, useRef, useState } from 'react';
import { BOND_ENERGY, BOND_REACTIONS, C_WATER, EXPERIMENTS, bn, bnFixed, bondEnthalpy, temperatureChange } from '@/chem';
import {
  Beaker,
  ChallengeList,
  Equation,
  LineChart,
  Segmented,
  SimShell,
  Slider,
  Thermometer,
  cx,
  useActive,
  useSimClock,
  type SegmentedOption,
} from '@/ui';

type Tab = 'lab' | 'bonds';
const TABS: SegmentedOption<Tab>[] = [
  { value: 'lab', label: 'থার্মোমিটার পরীক্ষা' },
  { value: 'bonds', label: 'বন্ধন শক্তি থেকে ΔH' },
];
const ROOM = 25;

function EnergyProfile({ dH, label }: { dH: number; label: string }) {
  const exo = dH < 0;
  const W = 300;
  const H = 180;
  const react = exo ? 60 : 120;
  const prod = exo ? 130 : 50;
  const peak = 22;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full"
      role="img"
      aria-label={`শক্তি চিত্র: ${exo ? 'তাপোৎপাদী, উৎপাদের শক্তি কম' : 'তাপহারী, উৎপাদের শক্তি বেশি'}`}
    >
      <line x1="30" y1="10" x2="30" y2={H - 20} stroke="var(--line-strong)" />
      <line x1="30" y1={H - 20} x2={W - 10} y2={H - 20} stroke="var(--line-strong)" />
      <text x="8" y="14" fontSize="10" className="fill-muted">
        শক্তি
      </text>
      <text x={W - 10} y={H - 6} fontSize="10" textAnchor="end" className="fill-muted">
        বিক্রিয়ার অগ্রগতি →
      </text>
      <path
        d={`M40 ${react} H90 C 125 ${react}, 130 ${peak}, 150 ${peak} S 175 ${prod}, 210 ${prod} H280`}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="3"
      />
      <text x="62" y={react - 8} fontSize="11" textAnchor="middle" className="fill-ink">
        বিক্রিয়ক
      </text>
      <text x="245" y={prod - 8} fontSize="11" textAnchor="middle" className="fill-ink">
        উৎপাদ
      </text>
      <line x1="150" y1={react} x2="150" y2={peak + 4} stroke="var(--muted)" strokeDasharray="3 3" markerEnd="url(#arrow-muted)" />
      <text x="156" y={(react + peak) / 2} fontSize="10" className="fill-muted">
        Ea
      </text>
      <line
        x1="262"
        y1={react}
        x2="262"
        y2={prod + (exo ? -4 : 4)}
        stroke={exo ? 'var(--brand-ink)' : 'var(--electron)'}
        strokeWidth="2"
        markerEnd={exo ? 'url(#arrow-red)' : 'url(#arrow-blue)'}
      />
      <line x1="210" y1={react} x2="280" y2={react} stroke="var(--line)" strokeDasharray="3 3" />
      <text x="268" y={(react + prod) / 2 + 4} fontSize="11" fontWeight="700" className={exo ? 'fill-brand-ink' : 'fill-electron'}>
        {label}
      </text>
      <defs>
        <marker id="arrow-red" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="var(--brand-ink)" />
        </marker>
        <marker id="arrow-blue" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="var(--electron)" />
        </marker>
        <marker id="arrow-muted" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="var(--muted)" />
        </marker>
      </defs>
    </svg>
  );
}

export default function ExoEndothermic() {
  const shellRef = useRef<HTMLDivElement>(null);
  const active = useActive(shellRef);
  const [tab, setTab] = useState<Tab>('lab');
  const [expId, setExpId] = useState('naoh');
  const [grams, setGrams] = useState(4);
  const [water, setWater] = useState(100);
  const [mixed, setMixed] = useState(false);
  const [run, setRun] = useState<{ t: number; temp: number; curve: [number, number][] }>({ t: 0, temp: ROOM, curve: [[0, ROOM]] });
  const { t, temp, curve } = run;
  const [rxId, setRxId] = useState('hcl');
  const [ran, setRan] = useState<Set<string>>(() => new Set());
  const exp = EXPERIMENTS.find((e) => e.id === expId)!;
  const result = temperatureChange(exp, grams, water);
  const final = ROOM + result.deltaT;

  const clock = useSimClock(
    (dt) =>
      setRun((r) => {
        const nt = r.t + dt;
        const next = mixed ? r.temp + (final - r.temp) * (1 - Math.exp(-dt / 1.4)) : r.temp;
        const lastT = r.curve[r.curve.length - 1]?.[0] ?? 0;
        return { t: nt, temp: next, curve: nt - lastT >= 0.25 ? [...r.curve, [nt, next] as [number, number]].slice(-200) : r.curve };
      }),
    { active, autoplay: true },
  );

  const reset = (id = expId) => {
    setExpId(id);
    setMixed(false);
    setRun({ t: 0, temp: ROOM, curve: [[0, ROOM]] });
  };
  useEffect(() => {
    if (mixed && Math.abs(temp - final) < 0.1) setRan((r) => (r.has(expId) ? r : new Set(r).add(expId)));
  }, [mixed, temp, final, expId]);

  const bond = BOND_REACTIONS.find((r) => r.id === rxId)!;
  const be = bondEnthalpy(bond);
  const measuredDT = temp - ROOM;
  const q = water * C_WATER * measuredDT;
  const challenges = [
    { label: 'NaOH দ্রবীভূত করে দেখো: পানি গরম না ঠান্ডা হলো?', done: ran.has('naoh') },
    { label: 'এমন একটি পদার্থ খুঁজে বের করো যা দ্রবীভূত হলে পানি ঠান্ডা করে', done: ran.has('nh4cl') || ran.has('nh4no3') },
    { label: 'প্রশমন বিক্রিয়ার তাপমাত্রা পরিবর্তন মেপে ΔH বের করো', done: ran.has('neutral') },
    { label: 'বন্ধন শক্তি দিয়ে মিথেনের দহনের ΔH বের করো', done: tab === 'bonds' && rxId === 'ch4' },
  ];

  return (
    <SimShell
      ref={shellRef}
      label="তাপোৎপাদী ও তাপহারী বিক্রিয়া"
      clock={clock}
      onReset={() => {
        reset('naoh');
        setGrams(4);
        setWater(100);
      }}
    >
      <div className="space-y-5">
        <Segmented options={TABS} value={tab} onChange={setTab} label="অংশ" />
        {tab === 'lab' ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
            <section className="panel panel-pad space-y-4" aria-label="পরীক্ষা">
              <div className="flex flex-wrap gap-2">
                {EXPERIMENTS.map((e) => (
                  <button key={e.id} type="button" className="chip" aria-pressed={e.id === expId} onClick={() => reset(e.id)}>
                    {e.nameBn}
                  </button>
                ))}
              </div>
              <p className="font-mono text-base">
                <Equation>{exp.equation}</Equation>
              </p>
              <svg
                viewBox="0 0 320 230"
                className="mx-auto block w-full max-w-sm"
                role="img"
                aria-label={`থার্মোমিটারে তাপমাত্রা ${bnFixed(temp, 1)} ডিগ্রি সেলসিয়াস`}
              >
                <Beaker
                  x={60}
                  y={50}
                  w={150}
                  h={160}
                  level={0.7}
                  liquid={`color-mix(in oklab, ${temp >= ROOM ? 'var(--proton)' : 'var(--electron)'} ${Math.min(45, 10 + Math.abs(temp - ROOM) * 3)}%, var(--surface))`}
                >
                  {mixed &&
                    Array.from({ length: 14 }, (_, i) => (
                      <circle
                        key={i}
                        cx={20 + ((i * 37) % 110)}
                        cy={90 + ((i * 23) % 60)}
                        r="3"
                        fill={temp >= ROOM ? 'var(--proton)' : 'var(--electron)'}
                        opacity=".55"
                      />
                    ))}
                </Beaker>
                <Thermometer x={250} y={18} height={200} temp={temp} min={10} max={50} />
              </svg>
              <Slider
                label={exp.kind === 'neutralise' ? 'NaOH-এর ভর (দ্রবণে)' : 'পদার্থের ভর'}
                value={grams}
                min={1}
                max={10}
                step={0.5}
                onChange={(v) => (setGrams(v), reset())}
                format={(v) => `${bn(v)} g`}
              />
              <Slider
                label="পানির ভর"
                value={water}
                min={50}
                max={200}
                step={10}
                onChange={(v) => (setWater(v), reset())}
                format={(v) => `${bn(v)} g`}
              />
              <button type="button" className="btn-primary w-full" disabled={mixed} onClick={() => (setMixed(true), clock.play())}>
                {mixed ? 'নাড়ানো হচ্ছে…' : 'যোগ করো ও নাড়ো'}
              </button>
            </section>
            <div className="space-y-5">
              <section className="panel panel-pad" aria-label="তাপমাত্রা বনাম সময়">
                <LineChart
                  series={[{ label: 'তাপমাত্রা', color: temp >= ROOM ? 'var(--proton)' : 'var(--electron)', points: curve }]}
                  xMax={Math.max(10, Math.ceil(t / 5) * 5)}
                  yMin={10}
                  yMax={50}
                  xLabel="সময় (সেকেন্ড)"
                  yLabel="তাপমাত্রা (°সে)"
                  ariaLabel="তাপমাত্রা বনাম সময়ের লেখচিত্র"
                />
              </section>
              <section className="panel panel-pad space-y-2 font-mono text-sm" aria-live="polite" aria-label="হিসাব">
                <p>
                  ΔT = {bnFixed(temp, 1)} − {bn(ROOM)} ={' '}
                  <strong className={cx(measuredDT >= 0 ? 'text-brand-ink' : 'text-electron')}>{bnFixed(measuredDT, 1)} °সে</strong>
                </p>
                <p>
                  q = m × c × ΔT = {bn(water)} × {bn(C_WATER)} × {bnFixed(measuredDT, 1)} = <strong>{bnFixed(q, 0)} J</strong>
                </p>
                <p>
                  n = {bn(grams)} ÷ {bn(exp.molarMass)} = {bnFixed(result.moles, 3)} mol
                </p>
                <p>
                  ΔH = −q ÷ n ={' '}
                  <strong className="text-gold">{mixed && result.moles > 0 ? bnFixed(-q / 1000 / result.moles, 1) : '…'} kJ/mol</strong>
                  <span className="font-sans text-xs text-muted"> (তথ্যসূত্রের মান {bn(exp.dH)} kJ/mol)</span>
                </p>
                <p
                  className={cx(
                    'rounded-lg px-3 py-2 font-sans text-[15px]',
                    !mixed ? 'bg-raised/60 text-muted' : exp.dH < 0 ? 'bg-brand/10 text-ink' : 'bg-electron/10 text-ink',
                  )}
                >
                  {!mixed
                    ? '“যোগ করো ও নাড়ো” চাপো।'
                    : exp.dH < 0
                      ? 'তাপোৎপাদী: বিক্রিয়া তাপ ছেড়ে দেয়, তাই পানি গরম হয়। ΔH ঋণাত্মক।'
                      : 'তাপহারী: বিক্রিয়া পানি থেকে তাপ টেনে নেয়, তাই পানি ঠান্ডা হয়। ΔH ধনাত্মক।'}
                </p>
              </section>
              <section className="panel panel-pad" aria-label="শক্তি চিত্র">
                <EnergyProfile dH={exp.dH} label={`ΔH ${exp.dH < 0 ? '< ০' : '> ০'}`} />
              </section>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <section className="panel panel-pad space-y-4" aria-label="বন্ধন শক্তি">
              <div className="flex flex-wrap gap-2">
                {BOND_REACTIONS.map((r) => (
                  <button key={r.id} type="button" className="chip" aria-pressed={r.id === rxId} onClick={() => setRxId(r.id)}>
                    <Equation>{r.equation}</Equation>
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { title: 'ভাঙতে হয় (শক্তি লাগে, +)', list: bond.broken, total: be.broken, tone: 'text-electron' },
                  { title: 'তৈরি হয় (শক্তি বের হয়, −)', list: bond.formed, total: be.formed, tone: 'text-brand-ink' },
                ].map((col) => (
                  <div key={col.title} className="rounded-xl border border-line bg-raised/60 p-3">
                    <p className={cx('text-xs font-semibold', col.tone)}>{col.title}</p>
                    <ul className="mt-2 space-y-1 font-mono text-sm">
                      {col.list.map(([b, n]) => (
                        <li key={b} className="flex justify-between">
                          <span>
                            {bn(n)} × {b}
                          </span>
                          <span>
                            {bn(n)} × {bn(BOND_ENERGY[b]!)} = {bn(n * BOND_ENERGY[b]!)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 border-t border-line pt-1 text-right font-mono font-bold">{bn(col.total)} kJ</p>
                  </div>
                ))}
              </div>
              <p className="rounded-xl border border-gold/50 bg-gold/10 px-4 py-3 font-mono text-lg" aria-live="polite">
                ΔH = {bn(be.broken)} − {bn(be.formed)} = <strong className="text-gold">{bn(be.dH)} kJ</strong>
              </p>
              <p className="text-sm text-muted">
                ভাঙার শক্তি গঠনের শক্তির চেয়ে কম হলে বাড়তি শক্তি তাপ হিসেবে বের হয়: বিক্রিয়াটি তাপোৎপাদী।
              </p>
            </section>
            <section className="panel panel-pad" aria-label="শক্তি চিত্র">
              <EnergyProfile dH={be.dH} label={`ΔH = ${bn(be.dH)}`} />
            </section>
          </div>
        )}
        <ChallengeList items={challenges} />
      </div>
    </SimShell>
  );
}
