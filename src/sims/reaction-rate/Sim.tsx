// বিক্রিয়ার হার: collision-theory particles. Temperature, concentration, surface area and a catalyst change how often
// collisions have enough energy to react; the product–time graph shows the rate live.
import { useEffect, useRef, useState } from 'react';
import {
  R_KJ,
  bn,
  bnFixed,
  createBox,
  effectiveEa,
  fractionAbove,
  makeRandom,
  recentRate,
  stepBox,
  type Box,
  type BoxParams,
} from '@/chem';
import {
  ChallengeList,
  LineChart,
  SimShell,
  Slider,
  cx,
  themeColors,
  useActive,
  usePrefersReducedMotion,
  useResponsiveCanvas,
  useSimClock,
} from '@/ui';

const EA = 50;
const RADIUS = 5;

interface Settings {
  temperature: number;
  pairs: number;
  powder: boolean;
  catalyst: boolean;
}
const DEFAULT: Settings = { temperature: 300, pairs: 30, powder: true, catalyst: false };

/** Maxwell–Boltzmann energy distribution with the activation-energy cut-off shaded. */
function EnergyCurve({ temperature, ea }: { temperature: number; ea: number }) {
  const W = 320;
  const H = 140;
  const kT = R_KJ * temperature; // kJ/mol
  const eMax = 30;
  const scale = 4; // same teaching scale as the reaction probability
  const f = (E: number) => 2 * Math.sqrt(E / Math.PI) * (1 / kT) ** 1.5 * Math.exp(-E / kT);
  const pts: [number, number][] = Array.from({ length: 121 }, (_, i) => {
    const E = (i / 120) * eMax;
    return [E, f(E)];
  });
  const fMax = Math.max(...pts.map((p) => p[1])) * 1.1;
  const x = (E: number) => 30 + (E / eMax) * (W - 40);
  const y = (v: number) => H - 22 - (v / fMax) * (H - 34);
  const cut = ea / scale;
  const shaded = pts.filter(([E]) => E >= cut);
  const share = fractionAbove(ea / scale, temperature);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full"
      role="img"
      aria-label={`সক্রিয়ন শক্তির বেশি শক্তির সংঘর্ষ প্রায় ${bnFixed(share * 100, 1)}%`}
    >
      {shaded.length > 1 && (
        <path
          d={
            `M${x(shaded[0]![0])} ${y(0)} ` +
            shaded.map(([E, v]) => `L${x(E).toFixed(1)} ${y(v).toFixed(1)}`).join(' ') +
            ` L${x(eMax)} ${y(0)} Z`
          }
          fill="color-mix(in oklab, var(--gold) 45%, transparent)"
        />
      )}
      <polyline
        fill="none"
        stroke="var(--electron)"
        strokeWidth="2.5"
        points={pts.map(([E, v]) => `${x(E).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}
      />
      <line x1={x(cut)} x2={x(cut)} y1="10" y2={y(0)} stroke="var(--brand-ink)" strokeDasharray="4 3" strokeWidth="1.5" />
      <text x={x(cut) + 4} y="20" fontSize="11" className="fill-brand-ink">
        Ea
      </text>
      <line x1="30" x2={W - 10} y1={y(0)} y2={y(0)} stroke="var(--line-strong)" />
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="11" className="fill-muted">
        কণার শক্তি →
      </text>
      <text x="8" y="16" fontSize="11" className="fill-muted">
        কণার সংখ্যা
      </text>
    </svg>
  );
}

export default function ReactionRate() {
  const shellRef = useRef<HTMLDivElement>(null);
  const active = useActive(shellRef);
  const reduced = usePrefersReducedMotion();
  const [s, setS] = useState<Settings>(DEFAULT);
  const { wrapRef, canvasRef, size, getContext } = useResponsiveCanvas(0.55, { minH: 230, maxH: 380 });
  const params: BoxParams = {
    width: size.w,
    height: size.h,
    temperature: s.temperature,
    ea: EA,
    catalyst: s.catalyst,
    radius: RADIUS,
    powder: s.powder,
  };
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const rand = useRef(makeRandom(3));
  const box = useRef<Box | null>(null);
  const [view, setView] = useState({ t: 0, products: 0, rate: 0, history: [] as [number, number][], left: 0 });
  const [tried, setTried] = useState<Set<string>>(() => new Set());
  const lastPush = useRef(0);

  const restart = (next: Settings = s) => {
    rand.current = makeRandom(3);
    box.current = createBox(
      { ...paramsRef.current, temperature: next.temperature, catalyst: next.catalyst, powder: next.powder },
      next.pairs,
      next.pairs,
      rand.current,
    );
    setView({ t: 0, products: 0, rate: 0, history: [[0, 0]], left: next.pairs });
  };
  useEffect(() => {
    restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h]);

  const change = (patch: Partial<Settings>) => {
    const next = { ...s, ...patch };
    setS(next);
    restart(next);
  };

  const draw = () => {
    const ctx = getContext();
    const b = box.current;
    if (!ctx || !b) return;
    const c = themeColors(['bg', 'line', 'electron', 'proton', 'gold', 'muted'] as const);
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, size.w, size.h);
    ctx.strokeStyle = c.line;
    ctx.strokeRect(0.5, 0.5, size.w - 1, size.h - 1);
    for (const site of b.solid) {
      ctx.fillStyle = c.proton;
      ctx.fillRect(site.x - RADIUS, site.y - RADIUS, RADIUS * 2, RADIUS * 2);
    }
    for (const q of b.particles) {
      ctx.beginPath();
      ctx.fillStyle = q.kind === 'A' ? c.electron : q.kind === 'B' ? c.proton : c.gold;
      ctx.arc(q.x, q.y, q.kind === 'P' ? RADIUS + 1 : RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const clock = useSimClock(
    (dt) => {
      const b = box.current;
      if (!b) return;
      const sub = Math.max(1, Math.ceil(dt / (1 / 60)));
      for (let i = 0; i < sub; i++) stepBox(b, paramsRef.current, dt / sub, rand.current);
      draw();
      const now = performance.now();
      if (now - lastPush.current > 200) {
        lastPush.current = now;
        const left = b.particles.filter((q) => q.kind === 'A').length;
        setView({ t: b.time, products: b.reactions, rate: recentRate(b), history: b.history.map((h) => [h.t, h.products]), left });
        if (b.time > 5) setTried((t) => new Set(t).add(`${s.temperature}-${s.pairs}-${s.powder}-${s.catalyst}`));
      }
    },
    { active, autoplay: !reduced },
  );

  useEffect(() => {
    draw();
    const mo = new MutationObserver(() => draw());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  });

  const triedAny = (pred: (k: Settings) => boolean) =>
    [...tried].some((k) => {
      const [t, p, pw, cat] = k.split('-');
      return pred({ temperature: Number(t), pairs: Number(p), powder: pw === 'true', catalyst: cat === 'true' });
    });
  const challenges = [
    { label: 'তাপমাত্রা ৩৫০ K-এর বেশি করে ৫ সেকেন্ড চালাও: হার কতটা বাড়ল?', done: triedAny((k) => k.temperature >= 350) },
    { label: 'প্রভাবক দিয়ে চালাও: তাপমাত্রা না বাড়িয়েই হার বাড়ে কি?', done: triedAny((k) => k.catalyst && k.temperature <= 310) },
    { label: 'একই তাপমাত্রায় চূর্ণ (powder) আর পিণ্ড (lump) তুলনা করো', done: triedAny((k) => k.powder) && triedAny((k) => !k.powder) },
    { label: 'ঘনমাত্রা দ্বিগুণ (৫০ জোড়ার বেশি) করে দেখো', done: triedAny((k) => k.pairs >= 50) },
  ];

  const eaNow = effectiveEa({ ea: EA, catalyst: s.catalyst });
  const xMax = Math.max(10, Math.ceil(view.t / 10) * 10);
  return (
    <SimShell ref={shellRef} label="বিক্রিয়ার হার" clock={clock} onReset={() => change(DEFAULT)}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-5">
          <section className="panel overflow-hidden p-2 sm:p-3" aria-label="বিক্রিয়া পাত্র">
            <div ref={wrapRef} className="w-full">
              <canvas
                ref={canvasRef}
                className="block rounded-xl"
                role="img"
                aria-label={`${bn(view.products)}টি উৎপাদ অণু তৈরি হয়েছে, ${bn(Math.round(view.t))} সেকেন্ডে`}
              />
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-4 px-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-electron" /> বিক্রিয়ক A
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-proton" /> বিক্রিয়ক B {s.powder ? '' : '(কঠিন পিণ্ড)'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-gold" /> উৎপাদ
              </span>
            </div>
          </section>
          <section className="panel panel-pad" aria-label="উৎপাদ বনাম সময়">
            <LineChart
              series={[{ label: 'উৎপাদ', color: 'var(--gold)', points: view.history }]}
              xMax={xMax}
              yMax={Math.max(s.pairs, 10)}
              xLabel="সময় (সেকেন্ড)"
              yLabel="উৎপাদ অণু"
              ariaLabel={`উৎপাদ বনাম সময়ের লেখচিত্র: ${bn(view.products)}টি`}
            />
            <div className="mt-2 grid grid-cols-3 gap-2 text-center" aria-live="polite">
              {[
                ['উৎপাদ', bn(view.products)],
                ['বাকি A', bn(view.left)],
                ['হার (প্রতি সে.)', bnFixed(view.rate, 1)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-line bg-raised/60 px-2 py-2">
                  <p className="text-[11px] text-muted">{k}</p>
                  <p className="font-mono text-lg font-bold">{v}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className="space-y-5">
          <section className="panel panel-pad space-y-4" aria-label="শর্ত বদলাও">
            <Slider
              label="তাপমাত্রা"
              value={s.temperature}
              min={280}
              max={400}
              step={10}
              onChange={(v) => change({ temperature: v })}
              format={(v) => `${bn(v)} K (${bn(v - 273)} °সে)`}
            />
            <Slider label="ঘনমাত্রা (A ও B-এর জোড়া)" value={s.pairs} min={10} max={60} step={5} onChange={(v) => change({ pairs: v })} />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="chip" aria-pressed={s.powder} onClick={() => change({ powder: !s.powder })}>
                B চূর্ণ (বেশি পৃষ্ঠতল)
              </button>
              <button type="button" className="chip" aria-pressed={s.catalyst} onClick={() => change({ catalyst: !s.catalyst })}>
                প্রভাবক
              </button>
            </div>
          </section>
          <section className="panel panel-pad" aria-label="শক্তির বণ্টন">
            <p className="label mb-2">কত ভাগ সংঘর্ষে যথেষ্ট শক্তি আছে (সোনালি অংশ)</p>
            <EnergyCurve temperature={s.temperature} ea={eaNow} />
            <p className={cx('mt-2 text-sm', s.catalyst ? 'text-gold' : 'text-muted')}>
              {s.catalyst
                ? 'প্রভাবক সক্রিয়ন শক্তি (Ea) কমিয়ে দিয়েছে, তাই বেশি সংঘর্ষ কার্যকর।'
                : 'তাপমাত্রা বাড়লে বক্ররেখা ডানে ছড়িয়ে যায়, Ea-এর ডানের অংশ বাড়ে।'}
            </p>
          </section>
          <ChallengeList items={challenges} />
        </div>
      </div>
    </SimShell>
  );
}
