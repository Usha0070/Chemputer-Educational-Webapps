// কণার গতিতত্ত্ব: the same particles as a solid (vibrating in a lattice), a liquid (sliding past each other)
// and a gas (flying free). Temperature sets their speed; a piston changes the gas volume and pressure.
import { useEffect, useRef, useState } from 'react';
import { SUBSTANCES, bn, bnFixed, gasPressure, kineticEnergy, makeRandom, meanSpeed, phaseAt, type Phase } from '@/chem';
import {
  ChallengeList,
  SimShell,
  Slider,
  cx,
  themeColors,
  useActive,
  usePrefersReducedMotion,
  useResponsiveCanvas,
  useSimClock,
} from '@/ui';

const N = 48;
const R = 6;
const PHASE_BN: Record<Phase, string> = { solid: 'কঠিন', liquid: 'তরল', gas: 'গ্যাস' };
const PHASE_TEXT: Record<Phase, string> = {
  solid:
    'কণাগুলো খুব কাছাকাছি, নির্দিষ্ট জায়গায় সাজানো। শক্তিশালী আকর্ষণের কারণে শুধু নিজের জায়গায় কাঁপে, তাই কঠিনের নির্দিষ্ট আকার ও আয়তন আছে।',
  liquid: 'কণাগুলো কাছাকাছি কিন্তু সাজানো নয়; একে অপরের পাশ দিয়ে গড়িয়ে চলতে পারে। তাই তরলের আয়তন নির্দিষ্ট, কিন্তু পাত্রের আকার নেয়।',
  gas: 'কণাগুলো অনেক দূরে দূরে, খুব দ্রুত সব দিকে ছোটে, আকর্ষণ প্রায় নেই। তাই গ্যাস পুরো পাত্র ভরে ফেলে, আর দেয়ালে ধাক্কা দিয়ে চাপ সৃষ্টি করে।',
};

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hx: number; // lattice home
  hy: number;
}

export default function KineticTheory() {
  const shellRef = useRef<HTMLDivElement>(null);
  const active = useActive(shellRef);
  const reduced = usePrefersReducedMotion();
  const [subId, setSubId] = useState('water');
  const [temp, setTemp] = useState(250);
  const [volumeFrac, setVolumeFrac] = useState(1);
  const sub = SUBSTANCES.find((s) => s.id === subId)!;
  const phase = phaseAt(sub, temp);
  const { wrapRef, canvasRef, size, getContext } = useResponsiveCanvas(0.55, { minH: 230, maxH: 360 });
  const parts = useRef<P[]>([]);
  const rand = useRef(makeRandom(11));
  const hits = useRef<number[]>([]);
  const [pressure, setPressure] = useState(0);
  const [visited, setVisited] = useState<Set<Phase>>(() => new Set(['solid']));
  const [compressed, setCompressed] = useState(false);
  const env = useRef({ phase, temp, volumeFrac });
  env.current = { phase, temp, volumeFrac };

  useEffect(() => {
    const cols = 8;
    const d = R * 2.3;
    const x0 = size.w / 2 - (cols * d) / 2 + R;
    const y0 = size.h - Math.ceil(N / cols) * d - 4 + R;
    parts.current = Array.from({ length: N }, (_, i) => {
      const hx = x0 + (i % cols) * d;
      const hy = y0 + Math.floor(i / cols) * d;
      return { x: hx, y: hy, vx: 0, vy: 0, hx, hy };
    });
  }, [size.w, size.h]);
  useEffect(() => setVisited((v) => (v.has(phase) ? v : new Set(v).add(phase))), [phase]);

  const step = (dt: number) => {
    const { phase: ph, temp: T, volumeFrac: vf } = env.current;
    const speed = 40 * Math.sqrt(T / 300) * (ph === 'gas' ? 3 : ph === 'liquid' ? 1 : 0.3);
    const right = ph === 'gas' ? size.w * vf : size.w;
    const top = ph === 'liquid' ? size.h * 0.42 : 0;
    let wallHits = 0;
    for (const p of parts.current) {
      if (ph === 'solid') {
        const a = 1.2 + T / 120;
        p.x = p.hx + (rand.current() - 0.5) * a;
        p.y = p.hy + (rand.current() - 0.5) * a;
        continue;
      }
      const sp = Math.hypot(p.vx, p.vy);
      if (sp < 1) {
        const ang = rand.current() * Math.PI * 2;
        p.vx = Math.cos(ang) * speed;
        p.vy = Math.sin(ang) * speed;
      } else {
        const k = speed / sp;
        p.vx *= 1 + (k - 1) * Math.min(1, dt * 2);
        p.vy *= 1 + (k - 1) * Math.min(1, dt * 2);
      }
      if (ph === 'liquid') {
        p.vx += (rand.current() - 0.5) * speed * 0.6;
        p.vy += (rand.current() - 0.5) * speed * 0.6 + 20 * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < R) {
        p.x = R;
        p.vx = Math.abs(p.vx);
        wallHits++;
      }
      if (p.x > right - R) {
        p.x = right - R;
        p.vx = -Math.abs(p.vx);
        wallHits++;
      }
      if (p.y < top + R) {
        p.y = top + R;
        p.vy = Math.abs(p.vy);
        wallHits++;
      }
      if (p.y > size.h - R) {
        p.y = size.h - R;
        p.vy = -Math.abs(p.vy);
        wallHits++;
      }
    }
    if (ph === 'liquid') {
      // keep liquid particles from overlapping (they stay close but not on top of each other)
      const ps = parts.current;
      for (let i = 0; i < ps.length; i++)
        for (let j = i + 1; j < ps.length; j++) {
          const a = ps[i]!;
          const b = ps[j]!;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 2 * R) {
            const push = (2 * R - d) / 2;
            a.x -= (dx / d) * push;
            a.y -= (dy / d) * push;
            b.x += (dx / d) * push;
            b.y += (dy / d) * push;
          }
        }
    }
    const now = performance.now();
    if (ph === 'gas') hits.current.push(...Array.from({ length: wallHits }, () => now));
    hits.current = hits.current.filter((t) => now - t < 1000);
  };

  const draw = () => {
    const ctx = getContext();
    if (!ctx) return;
    const c = themeColors(['bg', 'line-strong', 'electron', 'raised', 'gold'] as const);
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, size.w, size.h);
    const right = phase === 'gas' ? size.w * volumeFrac : size.w;
    if (phase === 'gas') {
      ctx.fillStyle = c.raised;
      ctx.fillRect(right, 0, size.w - right, size.h);
      ctx.fillStyle = c.gold;
      ctx.fillRect(right - 3, 0, 6, size.h);
    }
    ctx.strokeStyle = c['line-strong'];
    ctx.strokeRect(0.5, 0.5, size.w - 1, size.h - 1);
    ctx.fillStyle = c.electron;
    for (const p of parts.current) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const lastPush = useRef(0);
  const clock = useSimClock(
    (dt) => {
      step(dt);
      draw();
      const now = performance.now();
      if (now - lastPush.current > 300) {
        lastPush.current = now;
        setPressure(hits.current.length);
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

  const speed = meanSpeed(temp, sub.M);
  const idealP = gasPressure(1, temp, 22.4 * volumeFrac);
  const challenges = [
    { label: 'তাপমাত্রা বাড়িয়ে বরফ গলিয়ে পানি বানাও', done: visited.has('liquid') },
    { label: 'আরও তাপ দিয়ে পানিকে বাষ্পে পরিণত করো', done: visited.has('gas') },
    { label: 'গ্যাস অবস্থায় পিস্টন ঠেলে আয়তন অর্ধেক করো: দেয়ালে ধাক্কা কতটা বাড়ল?', done: compressed },
  ];

  return (
    <SimShell
      ref={shellRef}
      label="কণার গতিতত্ত্ব"
      clock={clock}
      onReset={() => {
        setTemp(250);
        setVolumeFrac(1);
      }}
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section className="panel overflow-hidden p-2 sm:p-3" aria-label="কণার বাক্স">
          <div ref={wrapRef} className="w-full">
            <canvas
              ref={canvasRef}
              className="block rounded-xl"
              role="img"
              aria-label={`${sub.nameBn} ${PHASE_BN[phase]} অবস্থায়, তাপমাত্রা ${bn(temp)} কেলভিন`}
            />
          </div>
          <p
            className={cx(
              'mt-3 rounded-xl border px-4 py-3 text-[15px] leading-relaxed',
              phase === 'gas' ? 'border-exc/40' : phase === 'liquid' ? 'border-electron/40' : 'border-line',
            )}
            aria-live="polite"
          >
            <strong className="text-gold">{PHASE_BN[phase]}:</strong> {PHASE_TEXT[phase]}
          </p>
        </section>
        <div className="space-y-5">
          <section className="panel panel-pad space-y-4" aria-label="নিয়ন্ত্রণ">
            <div className="flex flex-wrap gap-2">
              {SUBSTANCES.map((s) => (
                <button key={s.id} type="button" className="chip" aria-pressed={s.id === subId} onClick={() => setSubId(s.id)}>
                  {s.nameBn}
                </button>
              ))}
            </div>
            <Slider
              label="তাপমাত্রা"
              value={temp}
              min={150}
              max={450}
              step={5}
              onChange={setTemp}
              format={(v) => `${bn(v)} K (${bn(Math.round(v - 273))} °সে)`}
            />
            <p className="text-xs text-muted">
              গলনাঙ্ক {bn(Math.round(sub.mp - 273))} °সে · স্ফুটনাঙ্ক {bn(Math.round(sub.bp - 273))} °সে
            </p>
            <div className={cx(phase !== 'gas' && 'pointer-events-none opacity-40')} aria-disabled={phase !== 'gas'}>
              <Slider
                label="পিস্টন: গ্যাসের আয়তন"
                value={volumeFrac}
                min={0.4}
                max={1}
                step={0.05}
                onChange={(v) => {
                  setVolumeFrac(v);
                  if (v <= 0.5) setCompressed(true);
                }}
                format={(v) => `${bn(Math.round(v * 100))}%`}
              />
            </div>
          </section>
          <section className="panel panel-pad grid grid-cols-2 gap-2 text-center" aria-live="polite" aria-label="পরিমাপ">
            {[
              ['অবস্থা', PHASE_BN[phase]],
              ['গড় বেগ (গ্যাস হলে)', `${bn(Math.round(speed))} m/s`],
              ['গড় গতিশক্তি', `${bnFixed(kineticEnergy(temp) / 1000, 2)} kJ/mol`],
              ['দেয়ালে ধাক্কা / সেকেন্ড', phase === 'gas' ? bn(pressure) : '—'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-line bg-raised/60 px-2 py-2">
                <p className="text-[11px] text-muted">{k}</p>
                <p className="font-mono text-lg font-bold">{v}</p>
              </div>
            ))}
            {phase === 'gas' && (
              <p className="col-span-2 text-xs text-muted">
                আদর্শ গ্যাস হলে ১ মোলের চাপ ≈ {bnFixed(idealP, 1)} kPa: আয়তন অর্ধেক করলে চাপ দ্বিগুণ (বয়েলের সূত্র)।
              </p>
            )}
          </section>
          <ChallengeList items={challenges} />
        </div>
      </div>
    </SimShell>
  );
}
