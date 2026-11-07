// বেকিং সোডা ও বেকিং পাউডার: carbon dioxide from baking soda with vinegar, by heat alone, or as baking powder.
// See how much gas each gives (mole calculation), which reactant runs out, why soda alone leaves a bitter taste,
// how high the dough rises, and test the gas with limewater.
import { useEffect, useRef, useState } from 'react';
import { RAISING_EQUATIONS, bn, bnFixed, raise, type RaisingMode } from '@/chem';
import {
  Beaker,
  Bubbles,
  ChallengeList,
  Equation,
  Segmented,
  SimShell,
  Slider,
  cx,
  useActive,
  usePrefersReducedMotion,
  useSimClock,
  useUrlInit,
  writeParams,
} from '@/ui';

const MODE_BN: Record<RaisingMode, string> = { vinegar: 'সোডা + ভিনেগার', heat: 'শুধু সোডা, তাপ দিয়ে', powder: 'বেকিং পাউডার' };
const MODE_WHY: Record<RaisingMode, string> = {
  vinegar: 'ভিনেগারের ইথানয়িক এসিড বেকিং সোডার সাথে সাথে সাথেই বিক্রিয়া করে CO₂ বুদবুদ তৈরি করে। প্রতি মোল সোডা থেকে এক মোল CO₂।',
  heat: 'এসিড ছাড়া গরম করলে দুই মোল সোডা ভেঙে মাত্র এক মোল CO₂ হয়; বাকিটা সোডিয়াম কার্বনেট হয়ে খাবারে থেকে যায়, যার স্বাদ তেতো-সাবানের মতো।',
  powder:
    'বেকিং পাউডারে সোডার সাথে শুকনো এসিড (ক্রিম অব টার্টার) মাপমতো মেশানো থাকে। পানি ও তাপ পেলে সব সোডা থেকেই CO₂ হয়, তেতো স্বাদও থাকে না।',
};
const MAX_L = 2.6; // tallest rise drawn, L of CO₂

export default function BakingSoda() {
  const shellRef = useRef<HTMLDivElement>(null);
  const active = useActive(shellRef);
  const reduced = usePrefersReducedMotion();
  const [mode, setMode] = useState<RaisingMode>('vinegar');
  const [soda, setSoda] = useState(8.4);
  const [vinegar, setVinegar] = useState(60);
  const [progress, setProgress] = useState(0);
  const [limewater, setLimewater] = useState(false);
  const [done, setDone] = useState<Set<string>>(() => new Set());

  const r = raise(soda, mode, vinegar);
  const clock = useSimClock((dt) => setProgress((p) => Math.min(1, p + dt / 2)), { active, autoplay: false });
  const finished = progress >= 1;
  const { pause } = clock;
  useEffect(() => {
    if (!finished) return;
    pause();
    setDone((d) => {
      const n = new Set(d).add(mode);
      if (mode === 'vinegar' && Math.abs(soda - 8.4) < 1e-6 && r.limiting === 'soda') n.add('enough-acid');
      return n;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  useUrlInit((p) => {
    const m = p.get('mode');
    if (m === 'vinegar' || m === 'heat' || m === 'powder') setMode(m);
  });
  const clear = () => {
    pause();
    setProgress(0);
    setLimewater(false);
  };
  const choose = (m: RaisingMode) => {
    setMode(m);
    clear();
    writeParams({ mode: m === 'vinegar' ? null : m });
  };
  const start = () => {
    setLimewater(false);
    if (reduced) setProgress(1);
    else {
      setProgress(0);
      clock.play();
    }
  };
  const reset = () => {
    choose('vinegar');
    setSoda(8.4);
    setVinegar(60);
    setDone(new Set());
  };

  const gas = r.co2L * progress;
  const rise = Math.min(1, gas / MAX_L);
  const oven = mode !== 'vinegar';
  const running = clock.playing && !finished;

  const challenges = [
    { label: 'তিনটি পদ্ধতিই একবার করে চালাও', done: ['vinegar', 'heat', 'powder'].every((m) => done.has(m)) },
    { label: '৮.৪ g সোডার সবটুকু বিক্রিয়া করাতে কমপক্ষে কত mL ভিনেগার লাগে, খুঁজে বের করো', done: done.has('enough-acid') },
    { label: 'চুনের পানি দিয়ে দেখাও গ্যাসটি CO₂', done: done.has('limewater') },
  ];

  return (
    <SimShell
      ref={shellRef}
      label="বেকিং সোডা ও বেকিং পাউডার"
      onReset={reset}
      toolbar={
        <Segmented<RaisingMode>
          label="পদ্ধতি"
          value={mode}
          onChange={choose}
          options={[
            { value: 'vinegar', label: 'ভিনেগার' },
            { value: 'heat', label: 'শুধু তাপ' },
            { value: 'powder', label: 'বেকিং পাউডার' },
          ]}
        />
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="panel panel-pad space-y-3" aria-label="পরীক্ষা">
          <svg
            viewBox="0 0 300 250"
            className="mx-auto block w-full max-w-xs"
            role="img"
            aria-label={`${MODE_BN[mode]}: ${bnFixed(gas, 2)} লিটার CO₂`}
          >
            {oven ? (
              <g>
                <rect x="20" y="20" width="200" height="200" rx="14" fill="none" stroke="var(--line-strong)" strokeWidth="3" />
                <text x="120" y="40" textAnchor="middle" fontSize="12" className="fill-muted">
                  চুলা ১৮০ °সে
                </text>
                {running &&
                  [0, 1, 2, 3].map((k) => <path key={k} d={`M${60 + k * 40} 212 q -6 -10 0 -18 q 6 8 0 18`} fill="#fb923c" opacity=".8" />)}
                <rect x="50" y="160" width="140" height="36" rx="4" fill="none" stroke="var(--line-strong)" strokeWidth="2.5" />
                <path
                  d={`M54 194 L54 ${170 - rise * 95} Q120 ${150 - rise * 115} 186 ${170 - rise * 95} L186 194 Z`}
                  fill="#e7c08a"
                  stroke="#b4884f"
                  strokeWidth="2"
                  style={{ transition: 'd .3s linear' }}
                />
                {Array.from({ length: Math.round(rise * 14) }, (_, i) => (
                  <circle
                    key={i}
                    cx={66 + ((i * 29) % 110)}
                    cy={185 - ((i * 17) % Math.max(10, rise * 90))}
                    r="2.5"
                    fill="#fff7ed"
                    opacity=".8"
                  />
                ))}
              </g>
            ) : (
              <g>
                <Beaker x={40} y={70} w={130} h={150} level={0.45}>
                  <rect x="20" y="118" width="90" height="12" rx="3" fill="#f8fafc" opacity={1 - progress * 0.9 * (r.co2Mol / r.sodaMol)} />
                </Beaker>
                <Bubbles x={105} y={210} height={110} count={10} active={running} />
                <path
                  d={`M40 ${70 + 150 * 0.55} Q105 ${70 + 150 * 0.55 - rise * 90} 170 ${70 + 150 * 0.55}`}
                  fill="color-mix(in oklab, #f8fafc 70%, transparent)"
                  opacity={rise > 0.05 ? 0.9 : 0}
                />
                <text x="105" y="60" textAnchor="middle" fontSize="12" className="fill-muted">
                  বিকারে সোডা + ভিনেগার
                </text>
              </g>
            )}
            {/* limewater test tube */}
            <g transform="translate(240 90)">
              <path d="M0 0 V110 Q0 122 14 122 Q28 122 28 110 V0" fill="none" stroke="var(--line-strong)" strokeWidth="2" />
              <rect
                x="2"
                y="50"
                width="24"
                height="70"
                rx="6"
                fill={limewater && r.co2Mol > 0 ? '#f1f5f9' : 'color-mix(in oklab, var(--electron) 12%, transparent)'}
                style={{ transition: 'fill 1s ease' }}
              />
              <text x="14" y="-6" textAnchor="middle" fontSize="11" className="fill-muted">
                চুনের পানি
              </text>
            </g>
          </svg>
          <Slider
            label="বেকিং সোডা (NaHCO₃)"
            value={soda}
            min={2.1}
            max={16.8}
            step={2.1}
            onChange={(v) => {
              setSoda(v);
              clear();
            }}
            format={(v) => `${bnFixed(v, 1)} g`}
          />
          {mode === 'vinegar' && (
            <Slider
              label="ভিনেগার (৫% ইথানয়িক এসিড)"
              value={vinegar}
              min={0}
              max={240}
              step={20}
              onChange={(v) => {
                setVinegar(v);
                clear();
              }}
              format={(v) => `${bn(v)} mL`}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary flex-1 px-4" onClick={start} disabled={running}>
              {mode === 'vinegar' ? 'ভিনেগার ঢালো' : 'চুলায় দাও'}
            </button>
            <button
              type="button"
              className="btn-secondary px-4"
              disabled={!finished}
              onClick={() => {
                setLimewater(true);
                if (r.co2Mol > 0) setDone((d) => new Set(d).add('limewater'));
              }}
            >
              গ্যাস চুনের পানিতে চালাও
            </button>
          </div>
          {limewater && (
            <p className="text-[15px]" aria-live="polite">
              {r.co2Mol > 0 ? (
                <>
                  চুনের পানি ঘোলা হয়ে গেল: <Equation>{'Ca(OH)2 + CO2 -> CaCO3 + H2O'}</Equation>। অদ্রবণীয় CaCO₃-এর সূক্ষ্ম কণাই ঘোলা ভাব।
                </>
              ) : (
                'কোনো গ্যাস তৈরি হয়নি, তাই চুনের পানি স্বচ্ছই রইল।'
              )}
            </p>
          )}
        </section>

        <div className="space-y-5">
          <section className="panel panel-pad space-y-3" aria-live="polite" aria-label="কী ঘটছে">
            <p className="text-lg font-bold text-gold">{MODE_BN[mode]}</p>
            <p className="rounded-xl border border-line bg-raised/60 px-3 py-2 text-[15px]">
              <Equation>{RAISING_EQUATIONS[mode]}</Equation>
            </p>
            <p className="text-[15px] leading-relaxed">{MODE_WHY[mode]}</p>
          </section>
          <section className="panel panel-pad" aria-label="মোলের হিসাব">
            <p className="label mb-2">মোলের হিসাব (NaHCO₃ = ৮৪ g/mol, প্রমাণ অবস্থায় ১ মোল গ্যাস = ২২.৪ L)</p>
            <ul className="grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-3">
              <li className="rounded-xl border border-line bg-raised/60 p-2">
                <span className="block font-sans text-xs text-muted">সোডা</span>
                {bnFixed(r.sodaMol, 3)} mol
              </li>
              {mode === 'vinegar' && (
                <li className="rounded-xl border border-line bg-raised/60 p-2">
                  <span className="block font-sans text-xs text-muted">এসিড</span>
                  {bnFixed(r.acidMol, 3)} mol
                </li>
              )}
              <li className="rounded-xl border border-line bg-raised/60 p-2">
                <span className="block font-sans text-xs text-muted">CO₂</span>
                {bnFixed(r.co2Mol, 3)} mol
              </li>
              <li className="rounded-xl border border-gold/50 bg-gold/10 p-2">
                <span className="block font-sans text-xs text-muted">CO₂-এর আয়তন</span>
                {bnFixed(r.co2L, 2)} L
              </li>
              {r.sodaLeftG > 0.005 && (
                <li className="rounded-xl border border-line bg-raised/60 p-2">
                  <span className="block font-sans text-xs text-muted">বাড়তি সোডা</span>
                  {bnFixed(r.sodaLeftG, 2)} g
                </li>
              )}
              {r.carbonateG > 0 && (
                <li className="rounded-xl border border-danger/50 bg-danger/10 p-2">
                  <span className="block font-sans text-xs text-muted">Na₂CO₃ (তেতো)</span>
                  {bnFixed(r.carbonateG, 2)} g
                </li>
              )}
            </ul>
            {mode === 'vinegar' && (
              <p className={cx('mt-2 text-sm', r.limiting === 'acid' ? 'text-danger' : 'text-block-p')}>
                {r.limiting === 'acid'
                  ? 'এসিড আগে ফুরিয়ে যাবে: সব সোডা বিক্রিয়া করবে না। ভিনেগার বাড়াও।'
                  : 'এসিড যথেষ্ট: সব সোডা বিক্রিয়া করবে।'}
              </p>
            )}
          </section>
          <ChallengeList items={challenges} />
        </div>
      </div>
    </SimShell>
  );
}
