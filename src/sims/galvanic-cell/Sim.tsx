// গ্যালভানিক কোষ: build a cell from two metals in their salt solutions. The more reactive metal is the anode;
// electrons flow through the wire, ions through the salt bridge, and the voltmeter shows E°cell.
import { useEffect, useRef, useState } from 'react';
import { STANDARD_POTENTIALS, bn, bnFixed, formulaToUnicode, galvanicCell } from '@/chem';
import {
  ChallengeList,
  Equation,
  Formula,
  SimShell,
  cx,
  useActive,
  usePrefersReducedMotion,
  useSimClock,
  useUrlInit,
  writeParams,
} from '@/ui';

const METALS = Object.keys(STANDARD_POTENTIALS);
const MOLAR: Record<string, number> = { Mg: 24, Al: 27, Zn: 65, Fe: 56, Ni: 59, Pb: 207, Cu: 63.5, Ag: 108 };
const RATE = 0.004; // mol of electrons per second (teaching scale)
const SALT: Record<string, string> = {
  Mg: 'MgSO4',
  Al: 'Al2(SO4)3',
  Zn: 'ZnSO4',
  Fe: 'FeSO4',
  Ni: 'NiSO4',
  Pb: 'Pb(NO3)2',
  Cu: 'CuSO4',
  Ag: 'AgNO3',
};

function Electrode({ x, metal, mass, polarity }: { x: number; metal: string; mass: number; polarity: '+' | '−' | '' }) {
  const w = Math.max(6, Math.min(26, 14 + mass));
  return (
    <g>
      <rect
        x={x - w / 2}
        y="88"
        width={w}
        height="150"
        rx="2"
        fill={metal === 'Cu' ? '#c2410c' : metal === 'Ag' ? '#d4d4d8' : metal === 'Zn' ? '#a1a1aa' : '#71717a'}
        style={{ transition: 'all .4s ease' }}
      />
      <text x={x} y="80" textAnchor="middle" fontSize="14" fontWeight="700" className="fill-ink font-mono">
        {metal} {polarity}
      </text>
    </g>
  );
}

export default function GalvanicCell() {
  const shellRef = useRef<HTMLDivElement>(null);
  const active = useActive(shellRef);
  const reduced = usePrefersReducedMotion();
  const [left, setLeft] = useState('Zn');
  const [right, setRight] = useState('Cu');
  const [bridge, setBridge] = useState(true);
  const [flow, setFlow] = useState(0); // mol of electrons passed
  const [built, setBuilt] = useState<Set<string>>(() => new Set());
  const [bridgeRemoved, setBridgeRemoved] = useState(false);
  const cell = galvanicCell(left, right);
  const same = left === right;
  const running = bridge && !same;
  const voltage = running ? cell.voltage : 0;
  const anodeLeft = cell.anode === left;

  const clock = useSimClock(
    (dt) => {
      if (running) setFlow((f) => f + dt * RATE);
    },
    { active },
  );

  useUrlInit((p) => {
    const l = p.get('left');
    const r = p.get('right');
    if (l && METALS.includes(l)) setLeft(l);
    if (r && METALS.includes(r)) setRight(r);
  });
  const firstRun = useRef(true);
  useEffect(() => {
    setFlow(0);
    if (firstRun.current) {
      firstRun.current = false; // the starting cell doesn't count as one the student built
      return;
    }
    writeParams({ left: left === 'Zn' ? null : left, right: right === 'Cu' ? null : right });
    if (left !== right) setBuilt((b) => new Set(b).add(`${cell.anode}-${cell.cathode}`));
  }, [left, right, cell.anode, cell.cathode]);

  const anodeMetal = STANDARD_POTENTIALS[cell.anode]!;
  const cathodeMetal = STANDARD_POTENTIALS[cell.cathode]!;
  const anodeLoss = (flow / anodeMetal.charge) * MOLAR[cell.anode]!;
  const cathodeGain = (flow / cathodeMetal.charge) * MOLAR[cell.cathode]!;
  const massOf = (isLeft: boolean) => (same ? 0 : (isLeft === anodeLeft ? -anodeLoss : cathodeGain) * 6);
  const wire = anodeLeft ? 'M110 88 V40 H330 V88' : 'M330 88 V40 H110 V88';
  const best = Math.max(...[...built].map((k) => galvanicCell(k.split('-')[0]!, k.split('-')[1]!).voltage), 0);

  const challenges = [
    { label: 'জিংক-কপার (ড্যানিয়েল) কোষ তৈরি করো: ভোল্টমিটার কত দেখায়?', done: built.has('Zn-Cu') },
    { label: 'সবচেয়ে বেশি ভোল্টেজের কোষটি খুঁজে বের করো', done: best >= 3.17 - 1e-9 },
    { label: 'এমন একটি কোষ বানাও যেখানে কপার অ্যানোড হয়', done: [...built].some((k) => k.startsWith('Cu-')) },
    { label: 'লবণ সেতু সরিয়ে দেখো কী হয়', done: bridgeRemoved },
  ];

  return (
    <SimShell
      ref={shellRef}
      label="গ্যালভানিক কোষ"
      clock={clock}
      onReset={() => {
        setLeft('Zn');
        setRight('Cu');
        setBridge(true);
        setFlow(0);
      }}
    >
      <div className="space-y-5">
        <section className="panel panel-pad grid gap-4 sm:grid-cols-2" aria-label="ধাতু বেছে নাও">
          {[
            { label: 'বাম পাত্রের ধাতু ও তার লবণ', value: left, set: setLeft },
            { label: 'ডান পাত্রের ধাতু ও তার লবণ', value: right, set: setRight },
          ].map((g) => (
            <div key={g.label}>
              <p className="label mb-2">{g.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {METALS.map((m) => (
                  <button key={m} type="button" className="chip min-h-[38px]" aria-pressed={g.value === m} onClick={() => g.set(m)}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <section className="panel panel-pad" aria-label="কোষ">
            <svg
              viewBox="0 0 440 300"
              className="mx-auto block w-full max-w-xl"
              role="img"
              aria-label={`${left} ও ${right} দিয়ে কোষ, ভোল্টেজ ${bnFixed(voltage, 2)} ভোল্ট`}
            >
              {/* wire + voltmeter */}
              <path d="M110 88 V40 H330 V88" fill="none" stroke={running ? 'var(--gold)' : 'var(--line-strong)'} strokeWidth="2.5" />
              <circle cx="220" cy="40" r="26" fill="var(--surface)" stroke="var(--line-strong)" strokeWidth="2" />
              <text x="220" y="38" textAnchor="middle" fontSize="15" fontWeight="700" className="fill-ink font-mono">
                {voltage.toFixed(2)}
              </text>
              <text x="220" y="54" textAnchor="middle" fontSize="11" className="fill-muted">
                V
              </text>
              {running &&
                active &&
                !reduced &&
                [0, 1, 2, 3].map((k) => (
                  <circle key={k} r="4" fill="var(--electron)">
                    <animateMotion dur="2.4s" begin={`${k * 0.6}s`} repeatCount="indefinite" path={wire} />
                  </circle>
                ))}
              {/* beakers */}
              {[
                { x: 40, metal: left, isLeft: true },
                { x: 260, metal: right, isLeft: false },
              ].map((b) => (
                <g key={b.x}>
                  <rect
                    x={b.x}
                    y="120"
                    width="140"
                    height="140"
                    rx="8"
                    fill={`color-mix(in oklab, ${STANDARD_POTENTIALS[b.metal]!.colour} 30%, transparent)`}
                  />
                  <path
                    d={`M${b.x - 4} 104 L${b.x} 110 V252 Q${b.x} 260 ${b.x + 8} 260 H${b.x + 132} Q${b.x + 140} 260 ${b.x + 140} 252 V110 L${b.x + 144} 104`}
                    fill="none"
                    stroke="var(--line-strong)"
                    strokeWidth="2.5"
                  />
                  <text x={b.x + 70} y="282" textAnchor="middle" fontSize="11" className="fill-muted">
                    {formulaToUnicode(SALT[b.metal]!)} দ্রবণ
                  </text>
                  <Electrode
                    x={b.x + 70}
                    metal={b.metal}
                    mass={massOf(b.isLeft)}
                    polarity={same ? '' : b.isLeft === anodeLeft ? '−' : '+'}
                  />
                  {!same && (
                    <text
                      x={b.x + 70}
                      y="300"
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="700"
                      className={b.isLeft === anodeLeft ? 'fill-brand-ink' : 'fill-electron'}
                    >
                      {b.isLeft === anodeLeft ? 'অ্যানোড (জারণ)' : 'ক্যাথোড (বিজারণ)'}
                    </text>
                  )}
                </g>
              ))}
              {/* salt bridge */}
              {bridge && (
                <g>
                  <path
                    d="M150 230 V150 Q150 128 172 128 H268 Q290 128 290 150 V230"
                    fill="none"
                    stroke="color-mix(in oklab, var(--gold) 50%, var(--surface))"
                    strokeWidth="18"
                    strokeLinecap="round"
                  />
                  <text x="220" y="122" textAnchor="middle" fontSize="11" className="fill-muted">
                    লবণ সেতু (KNO₃)
                  </text>
                  {running &&
                    active &&
                    !reduced &&
                    [0, 1].map((k) => (
                      <g key={k}>
                        <circle r="4" fill="var(--proton)">
                          <animateMotion
                            dur="3s"
                            begin={`${k * 1.5}s`}
                            repeatCount="indefinite"
                            path={
                              anodeLeft
                                ? 'M150 220 V150 Q150 128 172 128 H268 Q290 128 290 150 V220'
                                : 'M290 220 V150 Q290 128 268 128 H172 Q150 128 150 150 V220'
                            }
                          />
                        </circle>
                        <circle r="4" fill="var(--electron)" stroke="var(--bg)">
                          <animateMotion
                            dur="3s"
                            begin={`${k * 1.5 + 0.7}s`}
                            repeatCount="indefinite"
                            path={
                              anodeLeft
                                ? 'M290 220 V150 Q290 128 268 128 H172 Q150 128 150 150 V220'
                                : 'M150 220 V150 Q150 128 172 128 H268 Q290 128 290 150 V220'
                            }
                          />
                        </circle>
                      </g>
                    ))}
                </g>
              )}
            </svg>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="chip"
                aria-pressed={bridge}
                onClick={() => {
                  if (bridge) setBridgeRemoved(true);
                  setBridge((b) => !b);
                }}
              >
                লবণ সেতু {bridge ? 'আছে' : 'নেই'}
              </button>
              <span className="text-xs text-muted">
                ইলেকট্রন (নীল) তার দিয়ে অ্যানোড থেকে ক্যাথোডে যায়। লবণ সেতুর K⁺ (লাল) ক্যাথোডের দিকে, NO₃⁻ (নীল) অ্যানোডের দিকে।
              </span>
            </div>
          </section>

          <div className="space-y-5">
            <section className={cx('panel panel-pad space-y-2', running && 'border-gold/50')} aria-live="polite" aria-label="অর্ধবিক্রিয়া">
              {same ? (
                <p className="text-muted">দুই পাত্রে একই ধাতু হলে বিভব পার্থক্য শূন্য, কোনো প্রবাহ নেই।</p>
              ) : (
                <>
                  <p className="text-xs font-semibold text-brand-ink">অ্যানোডে জারণ ({anodeMetal.nameBn})</p>
                  <p className="font-mono text-lg">
                    <Equation>{cell.anodeHalf}</Equation>
                  </p>
                  <p className="text-xs font-semibold text-electron">ক্যাথোডে বিজারণ ({cathodeMetal.nameBn})</p>
                  <p className="font-mono text-lg">
                    <Equation>{cell.cathodeHalf}</Equation>
                  </p>
                  <p className="text-sm">
                    E°কোষ = E°ক্যাথোড − E°অ্যানোড = {bn(cathodeMetal.e0.toFixed(2))} − ({bn(anodeMetal.e0.toFixed(2))}) ={' '}
                    <strong className="text-gold">{bn(cell.voltage.toFixed(2))} V</strong>
                  </p>
                  {!bridge && (
                    <p className="rounded-lg border border-exc/40 bg-exc/10 px-3 py-2 text-sm">
                      লবণ সেতু নেই: বর্তনী অসম্পূর্ণ, তাই আয়ন চলাচল বন্ধ ও ভোল্টেজ শূন্য।
                    </p>
                  )}
                  <p className="text-xs text-muted">
                    অ্যানোড ক্ষয়: {bnFixed(anodeLoss, 3)} g · ক্যাথোডে জমা: {bnFixed(cathodeGain, 3)} g
                  </p>
                </>
              )}
            </section>
            <section className="panel panel-pad" aria-label="প্রমিত বিজারণ বিভব">
              <p className="label mb-2">প্রমিত বিজারণ বিভব, E° (ভোল্ট)</p>
              <ul className="space-y-1 font-mono text-sm">
                {METALS.map((m) => (
                  <li
                    key={m}
                    className={cx('flex justify-between rounded px-2 py-0.5', (m === left || m === right) && 'bg-gold/15 text-ink')}
                  >
                    <span>
                      <Formula>{STANDARD_POTENTIALS[m]!.ion}</Formula> / {m}
                    </span>
                    <span>
                      {STANDARD_POTENTIALS[m]!.e0 > 0 ? '+' : ''}
                      {bn(STANDARD_POTENTIALS[m]!.e0.toFixed(2))}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">তালিকায় যত নিচে, ধাতু তত কম সক্রিয় এবং তত সহজে বিজারিত হয়।</p>
            </section>
            <ChallengeList items={challenges} />
          </div>
        </div>
      </div>
    </SimShell>
  );
}
