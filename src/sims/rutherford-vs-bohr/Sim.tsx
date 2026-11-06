// রাদারফোর্ড বনাম বোর মডেল: why a classical (Rutherford) atom would collapse, and Bohr's fixed energy levels
// with photon absorption and emission for hydrogen.
import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  COLLAPSE_TIME_S,
  SERIES,
  bn,
  bnFixed,
  collapseRadius,
  levelEnergy,
  photonEnergy,
  photonWavelength,
  region,
  wavelengthToRgb,
} from '@/chem';
import { ChallengeList, Icon, SimShell, cx, useActive, usePrefersReducedMotion, useSimClock } from '@/ui';

const LEVELS = [1, 2, 3, 4, 5, 6];
const R = (n: number) => 26 + 22 * (n - 1); // display radius (not to scale: real radius ∝ n²)
const COLLAPSE_SECONDS = 8; // animation length at 1× speed

// ── Rutherford: classical collapse ─────────────────────────────────────────

function CollapsePanel({ tickRef, onDone, resetKey }: { tickRef: RefObject<(dt: number) => void>; onDone: () => void; resetKey: number }) {
  const [state, setState] = useState({ p: 0, angle: 0, waves: [] as { x: number; y: number; age: number }[], since: 0 });
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    setState({ p: 0, angle: 0, waves: [], since: 0 });
  }, [resetKey]);

  useEffect(() => {
    tickRef.current = (dt) =>
      setState((s) => {
        if (s.p >= 1) return s;
        const p = Math.min(1, s.p + dt / COLLAPSE_SECONDS);
        const r = Math.max(0.06, collapseRadius(p));
        const angle = s.angle + (2.4 / r ** 1.5) * dt;
        const rr = 120 * collapseRadius(p);
        let since = s.since + dt;
        const waves = s.waves.map((w) => ({ ...w, age: w.age + dt })).filter((w) => w.age < 1.6);
        if (since > 0.22 && p < 1) {
          waves.push({ x: rr * Math.cos(angle), y: rr * Math.sin(angle), age: 0 });
          since = 0;
        }
        if (p >= 1) queueMicrotask(() => doneRef.current());
        return { p, angle, waves, since };
      });
  }, [tickRef]);

  const r = 120 * collapseRadius(state.p);
  const ex = r * Math.cos(state.angle);
  const ey = r * Math.sin(state.angle);
  const collapsed = state.p >= 1;
  const ps = (state.p * COLLAPSE_TIME_S * 1e12).toFixed(1);

  return (
    <section className="panel panel-pad flex flex-col" aria-label="রাদারফোর্ড মডেল">
      <h2 className="text-lg font-bold">রাদারফোর্ড মডেল: ইলেকট্রন কেন পড়ে যেত?</h2>
      <p className="mt-1 text-sm text-muted">ওপরের “চালাও” চাপো। চিরায়ত পদার্থবিজ্ঞান অনুযায়ী ঘূর্ণায়মান আধান শক্তি বিকিরণ করে।</p>
      <svg
        viewBox="-150 -150 300 300"
        className="mx-auto mt-3 block w-full max-w-[320px]"
        role="img"
        aria-label={
          collapsed ? 'ইলেকট্রন নিউক্লিয়াসে পড়ে গেছে' : `ইলেকট্রন কক্ষপথের ব্যাসার্ধ ${bn(Math.round(collapseRadius(state.p) * 100))}%`
        }
      >
        <circle r="120" fill="none" stroke="var(--line-strong)" strokeDasharray="3 6" />
        {state.waves.map((w, i) => (
          <circle
            key={i}
            cx={w.x}
            cy={w.y}
            r={6 + w.age * 40}
            fill="none"
            stroke="var(--gold)"
            strokeOpacity={Math.max(0, 0.7 - w.age / 1.6)}
            strokeWidth="1.5"
          />
        ))}
        {!collapsed && <path d={spiralPath(state.p)} fill="none" stroke="var(--electron)" strokeOpacity=".35" strokeWidth="1" />}
        <circle
          r={collapsed ? 12 : 8}
          fill="var(--proton)"
          style={{ filter: collapsed ? 'drop-shadow(0 0 10px var(--proton))' : undefined }}
        />
        {!collapsed && <circle cx={ex} cy={ey} r="6" fill="var(--electron)" stroke="var(--bg)" strokeWidth="1.5" />}
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl border border-line bg-raised/60 px-2 py-2">
          <p className="text-[11px] font-semibold text-muted">বাস্তব সময়</p>
          <p className="font-mono text-lg font-bold">{bn(ps)} ps</p>
        </div>
        <div className="rounded-xl border border-line bg-raised/60 px-2 py-2">
          <p className="text-[11px] font-semibold text-muted">কক্ষপথের ব্যাসার্ধ</p>
          <p className="font-mono text-lg font-bold">{bn(Math.round(collapseRadius(state.p) * 100))}%</p>
        </div>
      </div>
      <p
        className={cx(
          'mt-3 rounded-xl border px-3 py-2 text-sm leading-relaxed',
          collapsed ? 'border-exc/40 bg-exc/10 text-ink' : 'border-line bg-raised/50 text-ink/85',
        )}
        aria-live="polite"
      >
        {collapsed
          ? 'মাত্র প্রায় ১.৬ × ১০⁻¹¹ সেকেন্ডে ইলেকট্রন নিউক্লিয়াসে পড়ে যেত, অর্থাৎ কোনো পরমাণুই টিকে থাকত না। অথচ বাস্তবে পরমাণু স্থিতিশীল। এই সমস্যাই রাদারফোর্ড মডেলের প্রধান সীমাবদ্ধতা।'
          : 'শক্তি হারাতে হারাতে কক্ষপথ ছোট হয়, ঘোরা দ্রুত হয়, আর বিকিরণ চলতে থাকে।'}
      </p>
    </section>
  );
}

function spiralPath(p: number): string {
  let d = '';
  for (let i = 0; i <= 120; i++) {
    const t = p + (1 - p) * (i / 120);
    const r = 120 * collapseRadius(t);
    const a = i * 0.35;
    d += `${i ? 'L' : 'M'}${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`;
  }
  return d;
}

// ── Bohr: energy levels and photons ────────────────────────────────────────

interface Photon {
  id: number;
  from: number;
  to: number;
  nm: number;
}

export default function RutherfordVsBohr() {
  const shellRef = useRef<HTMLDivElement>(null);
  const active = useActive(shellRef);
  const reduced = usePrefersReducedMotion();
  const tickRef = useRef<(dt: number) => void>(() => {});
  const [resetKey, setResetKey] = useState(0);
  const [collapsedOnce, setCollapsedOnce] = useState(false);
  const clock = useSimClock((dt) => tickRef.current(dt), { active, autoplay: false });

  const [n, setN] = useState(1);
  const [photon, setPhoton] = useState<Photon | null>(null);
  const [emitted, setEmitted] = useState<Set<string>>(() => new Set());
  const nextId = useRef(1);

  const jump = (to: number) => {
    if (to === n) return;
    const nm = photonWavelength(n, to);
    setPhoton({ id: nextId.current++, from: n, to, nm });
    if (to < n) setEmitted((s) => new Set(s).add(`${n}-${to}`));
    setN(to);
  };

  const reset = () => {
    clock.pause();
    setResetKey((k) => k + 1);
    setN(1);
    setPhoton(null);
    setEmitted(new Set());
  };

  const visibleLines = [...emitted]
    .map((k) => k.split('-').map(Number) as [number, number])
    .map(([a, b]) => ({ key: `${a}-${b}`, nm: photonWavelength(a, b), a, b }));
  const balmerDone = [3, 4, 5, 6].every((a) => emitted.has(`${a}-2`));
  const challenges = [
    { label: 'রাদারফোর্ড মডেলে ইলেকট্রনকে শেষ পর্যন্ত পড়ে যেতে দেখো', done: collapsedOnce },
    { label: 'বোর মডেলে লাল আলো (৬৫৬ nm) নির্গত করো', done: emitted.has('3-2') },
    { label: 'বামার সিরিজের চারটি দৃশ্যমান রেখাই তৈরি করো (n = ৩, ৪, ৫, ৬ থেকে n = ২-এ)', done: balmerDone },
    { label: 'অতিবেগুনি (UV) আলো নির্গত করো', done: visibleLines.some((l) => l.b === 1) },
  ];

  const p = photon;
  const color = p ? wavelengthToRgb(p.nm) : 'transparent';

  return (
    <SimShell ref={shellRef} label="রাদারফোর্ড বনাম বোর মডেল" clock={clock} onReset={reset}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CollapsePanel
          tickRef={tickRef}
          resetKey={resetKey}
          onDone={() => {
            clock.pause();
            setCollapsedOnce(true);
          }}
        />

        <section className="panel panel-pad" aria-label="বোর মডেল">
          <h2 className="text-lg font-bold">বোর মডেল: নির্দিষ্ট শক্তিস্তর</h2>
          <p className="mt-1 text-sm text-muted">হাইড্রোজেন পরমাণু। একটি শক্তিস্তর বেছে নিয়ে ইলেকট্রনকে ওপরে তোলো বা নিচে নামাও।</p>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_118px] items-center gap-2">
            <svg viewBox="-160 -160 320 320" className="block w-full" role="img" aria-label={`ইলেকট্রন n = ${bn(n)} শক্তিস্তরে`}>
              {LEVELS.map((k) => (
                <g key={k}>
                  <circle r={R(k)} fill="none" stroke={k === n ? 'var(--gold)' : 'var(--line-strong)'} strokeWidth={k === n ? 1.8 : 1} />
                  <text x={R(k) * 0.7 + 3} y={-R(k) * 0.7 - 3} fontSize="10" className="fill-muted font-mono">
                    n={k}
                  </text>
                </g>
              ))}
              <circle r="7" fill="var(--proton)" />
              <g
                style={{
                  animation: 'spin 6s linear infinite',
                  animationPlayState: active && !reduced ? 'running' : 'paused',
                  transformOrigin: '0 0',
                }}
              >
                <circle
                  r="6"
                  fill="var(--electron)"
                  stroke="var(--bg)"
                  strokeWidth="1.5"
                  style={{ transform: `translateX(${R(n)}px)`, transition: 'transform .6s ease-in-out' }}
                />
              </g>
              {p && (
                <g key={p.id} className={p.to < p.from ? 'photon-out' : 'photon-in'}>
                  <path
                    d="M0 0q6 -7 12 0t12 0t12 0t12 0"
                    fill="none"
                    stroke={p.nm < 380 || p.nm > 750 ? 'var(--muted)' : color}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </g>
              )}
            </svg>
            <div className="relative h-[300px] border-l border-line" aria-hidden="true">
              {LEVELS.map((k) => {
                const top = 6 + (270 * 1) / k; // spacing ∝ 1/n so the crowded upper levels stay readable
                return (
                  <div key={k} className="absolute right-0 left-0 flex -translate-y-1/2 items-center gap-1" style={{ top: `${top}px` }}>
                    <span className={cx('h-0.5 w-6', k === n ? 'bg-gold' : 'bg-line-strong')} />
                    <span className={cx('font-mono text-[9.5px] leading-none', k === n ? 'font-bold text-gold' : 'text-muted')}>
                      n={k} {bnFixed(levelEnergy(k), 2)}
                    </span>
                  </div>
                );
              })}
              <span className="absolute top-0 left-2 text-[10px] text-muted">শক্তি (eV) · মাপ অনুযায়ী নয়</span>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <p className="label">ইলেকট্রন যাবে n = </p>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((k) => (
                <button
                  key={k}
                  type="button"
                  className="chip font-mono"
                  aria-pressed={k === n}
                  onClick={() => jump(k)}
                  aria-label={`শক্তিস্তর n = ${k}-এ নাও`}
                >
                  {k < n ? (
                    <Icon name="arrowDown" className="h-3.5 w-3.5" />
                  ) : k > n ? (
                    <Icon name="arrowRight" className="h-3.5 w-3.5 -rotate-90" />
                  ) : null}
                  n = {bn(k)}
                </button>
              ))}
            </div>
          </div>

          <div
            className="mt-4 min-h-[88px] rounded-xl border border-line bg-raised/50 px-3 py-3 text-sm leading-relaxed"
            aria-live="polite"
          >
            {p ? (
              <>
                <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                  <span className="h-3 w-3 rounded-full" style={{ background: p.nm < 380 || p.nm > 750 ? 'var(--muted)' : color }} />n ={' '}
                  {bn(p.from)} → n = {bn(p.to)}: {p.to < p.from ? 'ফোটন নির্গত হলো' : 'ফোটন শোষিত হলো'}
                </p>
                <p className="mt-1 font-mono text-ink/85">
                  ΔE = {bnFixed(photonEnergy(p.from, p.to), 2)} eV · λ = {bn(Math.round(p.nm))} nm ·{' '}
                  {region(p.nm) === 'visible' ? 'দৃশ্যমান আলো' : region(p.nm) === 'uv' ? 'অতিবেগুনি (UV)' : 'অবলোহিত (IR)'}
                </p>
                <p className="text-muted">{SERIES[Math.min(p.from, p.to)]?.bn}</p>
              </>
            ) : (
              <p className="text-muted">ইলেকট্রন ভূমি অবস্থায় (n = ১) আছে। ওপরের কোনো স্তরে নাও: শক্তি শোষণ করতে হবে।</p>
            )}
          </div>

          <div className="mt-4">
            <p className="label mb-1.5">হাইড্রোজেনের দৃশ্যমান বর্ণালি (তুমি যা তৈরি করেছ)</p>
            <div
              className="relative h-10 overflow-hidden rounded-lg border border-line bg-bg"
              role="img"
              aria-label={`দৃশ্যমান রেখা: ${
                visibleLines
                  .filter((l) => region(l.nm) === 'visible')
                  .map((l) => `${Math.round(l.nm)} nm`)
                  .join(', ') || 'এখনও নেই'
              }`}
            >
              {visibleLines
                .filter((l) => region(l.nm) === 'visible')
                .map((l) => (
                  <span
                    key={l.key}
                    className="absolute top-0 bottom-0 w-[3px]"
                    style={{
                      left: `${((l.nm - 380) / 370) * 100}%`,
                      background: wavelengthToRgb(l.nm),
                      boxShadow: `0 0 8px ${wavelengthToRgb(l.nm)}`,
                    }}
                  />
                ))}
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10px] text-muted">
              <span>৩৮০ nm</span>
              <span>৭৫০ nm</span>
            </div>
            {visibleLines.some((l) => region(l.nm) !== 'visible') && (
              <p className="mt-2 text-xs text-muted">
                দৃশ্যমান নয়:{' '}
                {visibleLines
                  .filter((l) => region(l.nm) !== 'visible')
                  .map((l) => `${bn(l.a)}→${bn(l.b)} (${bn(Math.round(l.nm))} nm)`)
                  .join(', ')}
              </p>
            )}
          </div>
        </section>
      </div>
      <div className="mt-5">
        <ChallengeList items={challenges} />
      </div>
    </SimShell>
  );
}
