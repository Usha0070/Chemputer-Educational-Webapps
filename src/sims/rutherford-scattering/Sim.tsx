// রাদারফোর্ডের আলফা কণা বিক্ষেপণ: α-particles at a gold foil, nuclear model vs Thomson's plum-pudding prediction.
import { useEffect, useRef, useState } from 'react';
import { binAngle, bn, deflectionAngle, thomsonMaxDeflection, type DetectorBin } from '@/chem';
import {
  ChallengeList,
  Icon,
  Segmented,
  SimShell,
  Slider,
  cx,
  makeRandom,
  themeColors,
  useActive,
  usePrefersReducedMotion,
  useResponsiveCanvas,
  useSimClock,
  type SegmentedOption,
} from '@/ui';

type Model = 'nuclear' | 'thomson';
const MODELS: SegmentedOption<Model>[] = [
  { value: 'nuclear', label: 'রাদারফোর্ড (নিউক্লিয়াস)', icon: 'atom' },
  { value: 'thomson', label: 'থমসনের ধারণা' },
];
/** px per simulated second: a particle crosses the screen in about two seconds at 1× */
const speedFor = (w: number) => Math.max(240, w * 0.45);
const SPACING = 46; // px between gold atoms in the foil
const D_OVER_R = 1 / 200; // closest approach ÷ half atom spacing (real gold ≈ 1/3200; enlarged ~16× so rare events show up)
const TURN_TIME = 0.14;
const BINS: { key: DetectorBin; label: string; hint: string }[] = [
  { key: 'straight', label: 'সোজা চলে গেছে', hint: '৫°-এর কম' },
  { key: 'small', label: 'সামান্য বেঁকেছে', hint: '৫°–৩০°' },
  { key: 'large', label: 'অনেক বেঁকেছে', hint: '৩০°–৯০°' },
  { key: 'back', label: 'ফিরে এসেছে', hint: '৯০°-এর বেশি' },
];
type Counts = Record<DetectorBin, number>;
const ZERO: Counts = { straight: 0, small: 0, large: 0, back: 0 };

interface Alpha {
  x: number;
  y: number;
  phi: number; // current direction (rad, canvas coords)
  target: number; // final direction
  turnAt: number; // x where the turn starts
  turning: number; // seconds spent turning (−1 = not yet)
  trail: [number, number][];
  theta: number; // final deflection in degrees
}
interface Flash {
  x: number;
  y: number;
  age: number;
}

export default function RutherfordScattering() {
  const shellRef = useRef<HTMLDivElement>(null);
  const active = useActive(shellRef);
  const reduced = usePrefersReducedMotion();
  const [model, setModel] = useState<Model>('nuclear');
  const [rate, setRate] = useState(25);
  const [counts, setCounts] = useState<Counts>(ZERO);
  const [thomsonFired, setThomsonFired] = useState(0);
  const { wrapRef, canvasRef, size, getContext } = useResponsiveCanvas(0.58, { minH: 260, maxH: 480 });

  const fresh = () => ({
    alphas: [] as Alpha[],
    flashes: [] as Flash[],
    carry: 0,
    counts: { ...ZERO },
    thomson: 0,
    rand: makeRandom(7),
    dirty: false,
  });
  const sim = useRef(fresh());
  const modelRef = useRef(model);
  modelRef.current = model;
  const rateRef = useRef(rate);
  rateRef.current = rate;

  const foilX = () => Math.round(size.w * 0.56);

  function emit() {
    const s = sim.current;
    const y = s.rand() * size.h;
    const nucleusY = Math.round((y - SPACING / 2) / SPACING) * SPACING + SPACING / 2;
    const b = y - nucleusY;
    let theta: number;
    if (modelRef.current === 'nuclear') {
      const d = (SPACING / 2) * D_OVER_R;
      theta = deflectionAngle(Math.abs(b), d);
    } else {
      theta = s.rand() * thomsonMaxDeflection(79, 5); // a few hundredths of a degree at most
    }
    const sign = b === 0 ? (s.rand() < 0.5 ? -1 : 1) : Math.sign(b);
    const turnLead = Math.min(10, 4 + theta / 20);
    s.alphas.push({ x: -4, y, phi: 0, target: (sign * theta * Math.PI) / 180, turnAt: foilX() - turnLead, turning: -1, trail: [], theta });
  }

  function step(dt: number) {
    const s = sim.current;
    s.carry += rateRef.current * dt;
    while (s.carry >= 1 && s.alphas.length < 260) {
      emit();
      s.carry -= 1;
    }
    const survivors: Alpha[] = [];
    const v = speedFor(size.w);
    for (const a of s.alphas) {
      if (a.turning < 0 && a.x >= a.turnAt && Math.abs(a.target) > 0.002) a.turning = 0;
      if (a.turning >= 0 && a.turning < TURN_TIME) {
        a.turning = Math.min(TURN_TIME, a.turning + dt);
        const k = a.turning / TURN_TIME;
        a.phi = a.target * (k * k * (3 - 2 * k));
      }
      a.x += Math.cos(a.phi) * v * dt;
      a.y += Math.sin(a.phi) * v * dt;
      a.trail.push([a.x, a.y]);
      if (a.trail.length > 7) a.trail.shift();
      const out = a.x < -6 || a.x > size.w + 6 || a.y < -6 || a.y > size.h + 6;
      if (out) {
        s.counts[binAngle(a.theta)]++;
        s.flashes.push({ x: Math.max(2, Math.min(size.w - 2, a.x)), y: Math.max(2, Math.min(size.h - 2, a.y)), age: 0 });
        if (modelRef.current === 'thomson') s.thomson++;
        s.dirty = true;
      } else survivors.push(a);
    }
    s.alphas = survivors;
    for (const f of s.flashes) f.age += dt;
    s.flashes = s.flashes.filter((f) => f.age < 1.4);
    draw();
  }

  const lastPush = useRef(0);
  const clock = useSimClock(
    (dt) => {
      step(dt);
      const now = performance.now();
      if (sim.current.dirty && now - lastPush.current > 150) {
        lastPush.current = now;
        sim.current.dirty = false;
        setCounts({ ...sim.current.counts });
        setThomsonFired(sim.current.thomson);
      }
    },
    { active, autoplay: !reduced },
  );

  function draw() {
    const ctx = getContext();
    if (!ctx) return;
    const c = themeColors(['bg', 'surface', 'line', 'muted', 'gold', 'nucleus', 'proton', 'glow', 'electron', 'ink'] as const);
    const { w, h } = size;
    const fx = foilX();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, w, h);

    // beam label
    ctx.fillStyle = c.muted;
    ctx.font = '12px "Hind Siliguri", sans-serif';
    ctx.fillText('α কণার রশ্মি →', 10, 18);
    ctx.fillText('সোনার পাত', fx - 26, h - 8);

    // foil
    ctx.fillStyle = c.gold;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(fx - SPACING / 2, 0, SPACING, h);
    ctx.globalAlpha = 1;
    for (let y = SPACING / 2; y < h + SPACING; y += SPACING) {
      if (modelRef.current === 'nuclear') {
        ctx.strokeStyle = c.line;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.arc(fx, y, SPACING / 2 - 1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = c.nucleus;
        ctx.shadowColor = c.nucleus;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(fx, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = c.glow;
        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        ctx.arc(fx, y, SPACING / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = c.electron;
        for (let k = 0; k < 5; k++) {
          const a = k * 1.3 + y;
          ctx.beginPath();
          ctx.arc(fx + Math.cos(a) * 11, y + Math.sin(a) * 11, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // particles with short trails
    for (const a of sim.current.alphas) {
      ctx.strokeStyle = c.proton;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      a.trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.proton;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // detector flashes (zinc sulfide screen)
    for (const f of sim.current.flashes) {
      ctx.globalAlpha = 1 - f.age / 1.4;
      ctx.fillStyle = c.gold;
      ctx.shadowColor = c.gold;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // Redraw when the size, theme or model changes while paused.
  useEffect(() => {
    draw();
    const mo = new MutationObserver(() => draw());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  });

  const reset = () => {
    sim.current = fresh();
    setCounts({ ...ZERO });
    setThomsonFired(0);
    draw();
  };
  const changeModel = (m: Model) => {
    setModel(m);
    sim.current.alphas = [];
    sim.current.counts = { ...ZERO };
    setCounts({ ...ZERO });
  };

  const total = counts.straight + counts.small + counts.large + counts.back;
  const pct = (n: number) => (total ? `${bn(((n / total) * 100).toFixed(n / total < 0.01 && n > 0 ? 2 : 1))}%` : '—');
  const challenges = [
    { label: 'রাদারফোর্ড মডেলে অন্তত ৫০০টি কণা ছোড়ো: কয়টি ফিরে এলো?', done: model === 'nuclear' && total >= 500 },
    { label: 'একটি কণাকে ৯০°-এর বেশি বেঁকে ফিরে আসতে দেখো', done: model === 'nuclear' && counts.back > 0 },
    { label: 'থমসনের মডেলে ২০০টি কণা ছুড়ে দেখো: কোনোটি কি বাঁকে?', done: thomsonFired >= 200 },
  ];

  return (
    <SimShell
      ref={shellRef}
      label="রাদারফোর্ডের আলফা কণা বিক্ষেপণ"
      clock={clock}
      onReset={reset}
      toolbar={<Segmented options={MODELS} value={model} onChange={changeModel} label="পরমাণুর মডেল" />}
    >
      <div className="space-y-5">
        <section className="panel overflow-hidden p-2 sm:p-3" aria-label="পরীক্ষা">
          <div ref={wrapRef} className="w-full">
            <canvas
              ref={canvasRef}
              className="block rounded-xl"
              role="img"
              aria-label={`সোনার পাতে আলফা কণা। মোট ${bn(total)}টির মধ্যে ${bn(counts.straight)}টি সোজা, ${bn(counts.small)}টি সামান্য বাঁকা, ${bn(counts.large)}টি অনেক বাঁকা, ${bn(counts.back)}টি ফিরে এসেছে।`}
            />
          </div>
          <div className="grid gap-3 px-1 pt-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <Slider label="প্রতি সেকেন্ডে কণা" value={rate} min={5} max={80} onChange={setRate} />
            <p className="text-xs text-muted sm:max-w-[16rem]">
              বোঝার সুবিধায় নিউক্লিয়াসের প্রভাব বাস্তবের চেয়ে প্রায় ১৬ গুণ বড় ধরা হয়েছে। আসল পরমাণুর তুলনায় নিউক্লিয়াস আরও অনেক ছোট।
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-live="polite" aria-label="ডিটেক্টরের গণনা">
          {BINS.map((bin) => (
            <div
              key={bin.key}
              className={cx(
                'rounded-xl border px-3 py-3 text-center',
                bin.key === 'back' && counts.back > 0 ? 'border-gold/60 bg-gold/10' : 'border-line bg-raised/60',
              )}
            >
              <p className="text-xs font-semibold text-muted">{bin.label}</p>
              <p className="font-mono text-2xl font-bold text-ink">{bn(counts[bin.key])}</p>
              <p className="font-mono text-xs text-muted">
                {pct(counts[bin.key])} · {bin.hint}
              </p>
            </div>
          ))}
        </section>

        <section className="panel panel-pad flex gap-3" aria-live="polite">
          <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          <p className="text-[15px] leading-relaxed text-ink/90">
            {model === 'nuclear'
              ? 'পরমাণুর প্রায় পুরোটাই ফাঁকা, তাই বেশিরভাগ কণা সোজা চলে যায়। ধনাত্মক আধান ও প্রায় সব ভর একটি খুব ছোট নিউক্লিয়াসে জমা, তাই যে অল্প কয়টি কণা নিউক্লিয়াসের খুব কাছ দিয়ে যায়, তারা প্রবল বিকর্ষণে বেঁকে যায়, আর প্রায় মুখোমুখি হলে ফিরে আসে।'
              : 'থমসনের মডেলে ধনাত্মক আধান পুরো পরমাণুতে ছড়ানো, তাই কোথাও এত শক্তিশালী বিকর্ষণ নেই যা একটি দ্রুতগামী আলফা কণাকে ফিরিয়ে দিতে পারে। এই মডেল অনুযায়ী সব কণাই প্রায় সোজা যাওয়ার কথা। কিন্তু রাদারফোর্ডের পরীক্ষায় কিছু কণা ফিরে এসেছিল, তাই এই মডেল বাতিল হয়।'}
          </p>
        </section>

        <ChallengeList items={challenges} />
      </div>
    </SimShell>
  );
}
