// তড়িৎ বিশ্লেষণ: ions migrate to the electrodes; gases collect, copper plates, sodium forms, depending on the electrolyte
// and the electrodes. Products follow the discharge rules in src/chem/electrochem.ts.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ELECTROLYTES, bn, bnFixed, electrolysis, electrolysisAmounts, formulaToUnicode, makeRandom, type Electrode } from '@/chem';
import {
  Bubbles,
  ChallengeList,
  Equation,
  Formula,
  Icon,
  SimShell,
  Slider,
  cx,
  useActive,
  usePrefersReducedMotion,
  useSimClock,
} from '@/ui';

interface Ion {
  x: number;
  y: number;
  kind: 'cation' | 'anion';
  label: string;
}

const BEAKER = { x: 70, y: 110, w: 280, h: 170 };
const ionText = (ion: string, charge: number) =>
  formulaToUnicode(`${ion}^${Math.abs(charge) === 1 ? '' : Math.abs(charge)}${charge > 0 ? '+' : '-'}`);
const CATHODE_X = 130;
const ANODE_X = 290;
const F_PER_SECOND = 0.02; // faradays per second at current 1 (teaching scale)

export default function Electrolysis() {
  const shellRef = useRef<HTMLDivElement>(null);
  const active = useActive(shellRef);
  const reduced = usePrefersReducedMotion();
  const [id, setId] = useState('acid-water');
  const [electrode, setElectrode] = useState<Electrode>('inert');
  const [on, setOn] = useState(false);
  const [current, setCurrent] = useState(3);
  const [charge, setCharge] = useState(0);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const e = ELECTROLYTES.find((x) => x.id === id)!;
  const realElectrode: Electrode = id === 'cuso4' ? electrode : 'inert';
  const r = useMemo(() => electrolysis(e, realElectrode), [e, realElectrode]);
  const amounts = electrolysisAmounts(r, charge);
  const rand = useRef(makeRandom(5));

  const makeIons = () => {
    const out: Ion[] = [];
    for (const ion of r.ions) {
      const n = ion.ion === 'H' && e.cation !== 'H' ? 4 : ion.ion === 'OH' ? 4 : 9;
      for (let k = 0; k < n; k++)
        out.push({
          x: BEAKER.x + 20 + rand.current() * (BEAKER.w - 40),
          y: BEAKER.y + 30 + rand.current() * (BEAKER.h - 50),
          kind: ion.to === 'cathode' ? 'cation' : 'anion',
          label: ion.ion,
        });
    }
    return out;
  };
  const [ions, setIons] = useState<Ion[]>(makeIons);

  const clock = useSimClock(
    (dt) => {
      if (on) setCharge((c) => c + dt * current * F_PER_SECOND);
      setIons((list) =>
        list.map((ion) => {
          const target = ion.kind === 'cation' ? CATHODE_X : ANODE_X;
          const drift = on ? Math.sign(target - ion.x) * (18 + current * 6) : 0;
          let x = ion.x + (drift + (rand.current() - 0.5) * 40) * dt;
          let y = ion.y + (rand.current() - 0.5) * 40 * dt;
          if (on && Math.abs(x - target) < 8) {
            // discharged at the electrode; a fresh ion appears elsewhere in the solution
            x = BEAKER.x + 20 + rand.current() * (BEAKER.w - 40);
            y = BEAKER.y + 30 + rand.current() * (BEAKER.h - 50);
          }
          x = Math.max(BEAKER.x + 10, Math.min(BEAKER.x + BEAKER.w - 10, x));
          y = Math.max(BEAKER.y + 24, Math.min(BEAKER.y + BEAKER.h - 10, y));
          return { ...ion, x, y };
        }),
      );
    },
    { active },
  );

  const choose = (next: string, el: Electrode = electrode) => {
    setId(next);
    setElectrode(el);
    setCharge(0);
    setOn(false);
    rand.current = makeRandom(5);
    const ee = ELECTROLYTES.find((x) => x.id === next)!;
    const rr = electrolysis(ee, next === 'cuso4' ? el : 'inert');
    const out: Ion[] = [];
    for (const ion of rr.ions) {
      const n = ion.ion === 'H' && ee.cation !== 'H' ? 4 : ion.ion === 'OH' ? 4 : 9;
      for (let k = 0; k < n; k++)
        out.push({
          x: BEAKER.x + 20 + rand.current() * (BEAKER.w - 40),
          y: BEAKER.y + 30 + rand.current() * (BEAKER.h - 50),
          kind: ion.to === 'cathode' ? 'cation' : 'anion',
          label: ion.ion,
        });
    }
    setIons(out);
  };
  const seenKey = `${id}-${realElectrode}`;
  const ranEnough = charge > 0.4;
  useEffect(() => {
    if (ranEnough) setSeen((s) => (s.has(seenKey) ? s : new Set(s).add(seenKey)));
  }, [ranEnough, seenKey]);

  const gasTube = (x: number, moles: number, gas: string) => {
    const level = Math.min(1, moles / 0.6);
    return (
      <g key={gas}>
        <rect x={x - 16} y={BEAKER.y - 70} width="32" height="150" rx="10" fill="none" stroke="var(--line-strong)" strokeWidth="2" />
        <rect
          x={x - 14}
          y={BEAKER.y - 68}
          width="28"
          height={148 * level}
          rx="8"
          fill="color-mix(in oklab, var(--surface) 80%, white)"
          opacity=".75"
        />
        <text x={x} y={BEAKER.y - 78} textAnchor="middle" fontSize="13" fontWeight="700" className="fill-ink font-mono">
          {formulaToUnicode(gas)}
        </text>
      </g>
    );
  };
  const tint = id === 'cuso4' && realElectrode === 'inert' ? Math.max(0.08, 0.55 - amounts.cathode * 0.6) : 0.35;
  const liquid = e.molten
    ? 'color-mix(in oklab, #fb923c 35%, transparent)'
    : `color-mix(in oklab, ${e.colour} ${Math.round(tint * 100)}%, transparent)`;
  const deposit = r.cathode.state === 'metal' ? Math.min(10, amounts.cathode * 14) : 0;
  const anodeLoss = r.anode.state === 'dissolves' ? Math.min(8, amounts.anode * 12) : 0;
  const gasAtCathode = r.cathode.state === 'gas';
  const gasAtAnode = r.anode.state === 'gas';

  const challenges = [
    { label: 'অম্লীয় পানির তড়িৎ বিশ্লেষণ চালাও: দুই নলের গ্যাসের অনুপাত কত?', done: seen.has('acid-water-inert') },
    {
      label: 'গলিত NaCl আর গাঢ় NaCl দ্রবণের ক্যাথোডে কী পাওয়া যায় তুলনা করো',
      done: seen.has('molten-nacl-inert') && seen.has('brine-inert'),
    },
    { label: 'কপার তড়িৎদ্বার দিয়ে কপার প্রলেপন (electroplating) করো', done: seen.has('cuso4-copper') },
    { label: 'নিষ্ক্রিয় তড়িৎদ্বারে CuSO₄ দ্রবণের নীল রং কেন ফিকে হয়, দেখো', done: seen.has('cuso4-inert') },
  ];

  return (
    <SimShell ref={shellRef} label="তড়িৎ বিশ্লেষণ" clock={clock} onReset={() => choose('acid-water', 'inert')}>
      <div className="space-y-5">
        <section className="panel panel-pad space-y-3" aria-label="তড়িৎ বিশ্লেষ্য বেছে নাও">
          <div className="flex flex-wrap gap-2">
            {ELECTROLYTES.map((x) => (
              <button key={x.id} type="button" className="chip" aria-pressed={x.id === id} onClick={() => choose(x.id)}>
                {x.nameBn}
              </button>
            ))}
          </div>
          {id === 'cuso4' && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="তড়িৎদ্বার">
              <button type="button" className="chip" aria-pressed={electrode === 'inert'} onClick={() => choose('cuso4', 'inert')}>
                নিষ্ক্রিয় (গ্রাফাইট) তড়িৎদ্বার
              </button>
              <button type="button" className="chip" aria-pressed={electrode === 'copper'} onClick={() => choose('cuso4', 'copper')}>
                কপার তড়িৎদ্বার (প্রলেপন)
              </button>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <section className="panel panel-pad" aria-label="তড়িৎ বিশ্লেষ্য কোষ">
            <svg
              viewBox="0 0 420 300"
              className="mx-auto block w-full max-w-xl"
              role="img"
              aria-label={`${e.nameBn}: ক্যাথোডে ${r.cathode.product}, অ্যানোডে ${r.anode.product}`}
            >
              {/* battery and wires */}
              <rect x="180" y="6" width="60" height="26" rx="4" fill="var(--raised)" stroke="var(--line-strong)" />
              <text x="188" y="24" fontSize="14" fontWeight="700" className="fill-electron">
                −
              </text>
              <text x="224" y="24" fontSize="14" fontWeight="700" className="fill-brand-ink">
                +
              </text>
              <path
                d={`M180 19 H${CATHODE_X} V${BEAKER.y + 20}`}
                fill="none"
                stroke={on ? 'var(--gold)' : 'var(--line-strong)'}
                strokeWidth="2.5"
              />
              <path
                d={`M240 19 H${ANODE_X} V${BEAKER.y + 20}`}
                fill="none"
                stroke={on ? 'var(--gold)' : 'var(--line-strong)'}
                strokeWidth="2.5"
              />
              {on &&
                active &&
                !reduced &&
                [0, 1, 2].map((k) => (
                  <circle key={k} r="3.5" fill="var(--electron)">
                    <animateMotion
                      dur="1.8s"
                      begin={`${k * 0.6}s`}
                      repeatCount="indefinite"
                      path={`M${ANODE_X} ${BEAKER.y + 20} V19 H${CATHODE_X} V${BEAKER.y + 20}`}
                    />
                  </circle>
                ))}
              {/* beaker + liquid */}
              <path
                d={`M${BEAKER.x} ${BEAKER.y + 20} V${BEAKER.y + BEAKER.h - 8} Q${BEAKER.x} ${BEAKER.y + BEAKER.h} ${BEAKER.x + 8} ${BEAKER.y + BEAKER.h} H${BEAKER.x + BEAKER.w - 8} Q${BEAKER.x + BEAKER.w} ${BEAKER.y + BEAKER.h} ${BEAKER.x + BEAKER.w} ${BEAKER.y + BEAKER.h - 8} V${BEAKER.y + 20} Z`}
                fill={liquid}
                style={{ transition: 'fill 1s ease' }}
              />
              <path
                d={`M${BEAKER.x - 6} ${BEAKER.y} L${BEAKER.x} ${BEAKER.y + 6} V${BEAKER.y + BEAKER.h - 8} Q${BEAKER.x} ${BEAKER.y + BEAKER.h} ${BEAKER.x + 8} ${BEAKER.y + BEAKER.h} H${BEAKER.x + BEAKER.w - 8} Q${BEAKER.x + BEAKER.w} ${BEAKER.y + BEAKER.h} ${BEAKER.x + BEAKER.w} ${BEAKER.y + BEAKER.h - 8} V${BEAKER.y + 6} L${BEAKER.x + BEAKER.w + 6} ${BEAKER.y}`}
                fill="none"
                stroke="var(--line-strong)"
                strokeWidth="2.5"
              />
              {/* electrodes */}
              <rect
                x={CATHODE_X - 6 - deposit / 2}
                y={BEAKER.y + 20}
                width={12 + deposit}
                height="130"
                rx="2"
                fill={deposit > 0.5 ? '#b45309' : realElectrode === 'copper' ? '#c2410c' : '#52525b'}
              />
              <rect
                x={ANODE_X - 6 + anodeLoss / 2}
                y={BEAKER.y + 20}
                width={Math.max(3, 12 - anodeLoss)}
                height="130"
                rx="2"
                fill={realElectrode === 'copper' ? '#c2410c' : '#52525b'}
              />
              {r.cathode.state === 'liquid-metal' && on && (
                <ellipse cx={CATHODE_X} cy={BEAKER.y + 158} rx={6 + Math.min(14, amounts.cathode * 10)} ry="4" fill="#d4d4d8" />
              )}
              <text x={CATHODE_X} y={BEAKER.y + BEAKER.h + 16} textAnchor="middle" fontSize="11" className="fill-electron">
                ক্যাথোড (−)
              </text>
              <text x={ANODE_X} y={BEAKER.y + BEAKER.h + 16} textAnchor="middle" fontSize="11" className="fill-brand-ink">
                অ্যানোড (+)
              </text>
              {gasAtCathode && !e.molten && gasTube(CATHODE_X, amounts.cathode, r.cathode.product)}
              {gasAtAnode && !e.molten && gasTube(ANODE_X, amounts.anode, r.anode.product)}
              <Bubbles x={CATHODE_X} y={BEAKER.y + 140} height={110} active={on && gasAtCathode} />
              <Bubbles
                x={ANODE_X}
                y={BEAKER.y + 140}
                height={110}
                active={on && gasAtAnode}
                color={r.anode.product === 'Cl2' ? '#a3e635' : 'var(--ink)'}
              />
              {/* ions */}
              {ions.map((ion, k) => (
                <g key={k} transform={`translate(${ion.x} ${ion.y})`}>
                  <circle
                    r="8"
                    fill={
                      ion.kind === 'cation'
                        ? 'color-mix(in oklab, var(--proton) 75%, transparent)'
                        : 'color-mix(in oklab, var(--electron) 75%, transparent)'
                    }
                  />
                  <text textAnchor="middle" y="3.5" fontSize="8" fontWeight="700" fill="#fff">
                    {ion.kind === 'cation' ? '+' : '−'}
                  </text>
                </g>
              ))}
            </svg>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={cx('btn-primary px-5', on && 'bg-gold text-on-accent hover:bg-gold')}
                onClick={() => (setOn((o) => !o), clock.play())}
                aria-pressed={on}
              >
                <Icon name="bolt" className="h-4 w-4" /> {on ? 'সুইচ বন্ধ করো' : 'সুইচ চালু করো'}
              </button>
              <div className="min-w-[200px] flex-1">
                <Slider label="বিদ্যুৎ প্রবাহ" value={current} min={1} max={5} onChange={setCurrent} format={(v) => `${bn(v)} একক`} />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-proton" /> ধনাত্মক আয়ন (
                {r.ions
                  .filter((i) => i.to === 'cathode')
                  .map((i) => ionText(i.ion, i.charge))
                  .join(', ')}
                ) → ক্যাথোড
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-electron" /> ঋণাত্মক আয়ন (
                {r.ions
                  .filter((i) => i.to === 'anode')
                  .map((i) => ionText(i.ion, i.charge))
                  .join(', ')}
                ) → অ্যানোড
              </span>
            </div>
          </section>

          <div className="space-y-5">
            <section className="panel panel-pad space-y-3" aria-live="polite" aria-label="ফলাফল">
              <div>
                <p className="text-xs font-semibold text-electron">ক্যাথোডে (বিজারণ)</p>
                <p className="font-mono text-lg">
                  <Equation>{r.cathode.equation}</Equation>
                </p>
                <p className="text-sm text-muted">{r.cathode.observation}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-brand-ink">অ্যানোডে (জারণ)</p>
                <p className="font-mono text-lg">
                  <Equation>{r.anode.equation}</Equation>
                </p>
                <p className="text-sm text-muted">{r.anode.observation}</p>
              </div>
              {r.remains && <p className="rounded-lg border border-line bg-raised/60 px-3 py-2 text-sm">{r.remains}</p>}
            </section>
            <section className="panel panel-pad" aria-live="polite" aria-label="উৎপাদের পরিমাণ">
              <p className="label mb-2">প্রবাহিত ইলেকট্রন: {bnFixed(charge, 3)} মোল</p>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg border border-line bg-raised/60 px-2 py-2">
                  <p className="text-[11px] text-muted">ক্যাথোডে</p>
                  <p className="font-mono text-lg font-bold">
                    {bnFixed(amounts.cathode, 3)} mol <Formula>{r.cathode.product}</Formula>
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-raised/60 px-2 py-2">
                  <p className="text-[11px] text-muted">অ্যানোডে</p>
                  <p className="font-mono text-lg font-bold">
                    {bnFixed(amounts.anode, 3)} mol <Formula>{r.anode.product}</Formula>
                  </p>
                </div>
              </div>
              {gasAtCathode && gasAtAnode && amounts.anode > 0 && (
                <p className="mt-2 text-sm text-muted">
                  আয়তনের অনুপাত {r.cathode.product} : {r.anode.product} = {bnFixed(amounts.cathode / amounts.anode, 1)} : ১
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
