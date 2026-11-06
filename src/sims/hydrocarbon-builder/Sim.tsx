// হাইড্রোকার্বন বিল্ডার: build alkanes, alkenes and alkynes (with methyl branches); see the structural formula,
// molecular and general formula, IUPAC and Bangla names, isomers, and a rotatable 3D model (loaded on demand).
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import {
  ALKANE_ISOMERS,
  GENERAL_FORMULA,
  bn,
  buildMolecule,
  hydrocarbonCounts,
  hydrocarbonFormula,
  hydrocarbonName,
  isValid,
  type Family,
  type Hydrocarbon,
} from '@/chem';
import {
  ChallengeList,
  Formula,
  Icon,
  Segmented,
  SimShell,
  Stepper,
  cx,
  themeColors,
  useActive,
  usePrefersReducedMotion,
  type SegmentedOption,
} from '@/ui';
import type { Viewer } from './viewer3d';

const FAMILIES: SegmentedOption<Family>[] = [
  { value: 'alkane', label: 'অ্যালকেন (C–C)' },
  { value: 'alkene', label: 'অ্যালকিন (C=C)' },
  { value: 'alkyne', label: 'অ্যালকাইন (C≡C)' },
];

/** 2D structural formula: main chain left → right, methyls up then down, H filling the rest. */
function Structure({ h }: { h: Hydrocarbon }) {
  const step = 64;
  const p = Math.min(h.position, h.n - h.position);
  const order = (i: number) => (h.family !== 'alkane' && i === p - 1 ? (h.family === 'alkene' ? 2 : 3) : 1);
  const branchCount = (i: number) => h.methyls.filter((m) => m - 1 === i).length;
  const width = Math.max(1, h.n) * step + 80;
  const els: ReactElement[] = [];
  const bond = (x1: number, y1: number, x2: number, y2: number, ord: number, key: string) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l = Math.hypot(dx, dy) || 1;
    const nx = (-dy / l) * 4;
    const ny = (dx / l) * 4;
    for (let k = 0; k < ord; k++) {
      const off = k - (ord - 1) / 2;
      els.push(
        <line
          key={`${key}-${k}`}
          x1={x1 + nx * off * 1.5}
          y1={y1 + ny * off * 1.5}
          x2={x2 + nx * off * 1.5}
          y2={y2 + ny * off * 1.5}
          stroke="var(--muted)"
          strokeWidth="2"
        />,
      );
    }
  };
  const atom = (x: number, y: number, el: 'C' | 'H', key: string) =>
    els.push(
      <text
        key={key}
        x={x}
        y={y + 6}
        textAnchor="middle"
        fontSize={el === 'C' ? 20 : 16}
        fontWeight="700"
        className={el === 'C' ? 'fill-ink font-mono' : 'fill-muted font-mono'}
      >
        {el}
      </text>,
    );
  for (let i = 0; i < h.n; i++) {
    const x = 40 + i * step;
    const y = 0;
    atom(x, y, 'C', `c${i}`);
    if (i + 1 < h.n) bond(x + 12, y, x + step - 12, y, order(i), `b${i}`);
    const used = new Set<string>();
    if (i > 0) used.add('left');
    if (i + 1 < h.n) used.add('right');
    const valence = (i > 0 ? order(i - 1) : 0) + (i + 1 < h.n ? order(i) : 0) + branchCount(i);
    const branches = branchCount(i);
    ['up', 'down'].slice(0, branches).forEach((dir) => {
      used.add(dir);
      const by = dir === 'up' ? -step : step;
      bond(x, y + (dir === 'up' ? -12 : 12), x, by + (dir === 'up' ? 12 : -12), 1, `m${i}${dir}`);
      atom(x, by, 'C', `mc${i}${dir}`);
      [
        [x - 32, by],
        [x + 32, by],
        [x, by + (dir === 'up' ? -32 : 32)],
      ].forEach(([hx, hy], k) => {
        bond(x + (hx! - x) * 0.35, by + (hy! - by) * 0.35, x + (hx! - x) * 0.7, by + (hy! - by) * 0.7, 1, `mh${i}${dir}${k}`);
        atom(hx!, hy!, 'H', `mh-${i}-${dir}-${k}`);
      });
    });
    const free = ['up', 'down', 'left', 'right'].filter((d) => !used.has(d));
    free.slice(0, 4 - valence).forEach((d, k) => {
      const [hx, hy] = d === 'up' ? [x, -34] : d === 'down' ? [x, 34] : d === 'left' ? [x - 34, 0] : [x + 34, 0];
      bond(x + (hx - x) * 0.35, (hy - y) * 0.35, x + (hx - x) * 0.7, (hy - y) * 0.7, 1, `h${i}${k}`);
      atom(hx, hy, 'H', `h-${i}-${k}`);
    });
  }
  return (
    <svg
      viewBox={`-10 -110 ${width} 220`}
      className="mx-auto block h-auto w-full max-w-2xl"
      role="img"
      aria-label={`${hydrocarbonName(h).bn} এর গাঠনিক সংকেত`}
    >
      {els}
    </svg>
  );
}

export default function HydrocarbonBuilder() {
  const shellRef = useRef<HTMLDivElement>(null);
  const active = useActive(shellRef);
  const reduced = usePrefersReducedMotion();
  const [h, setH] = useState<Hydrocarbon>({ n: 2, family: 'alkene', position: 1, methyls: [] });
  const [built, setBuilt] = useState<Set<string>>(() => new Set(['C2H4|ethene']));
  const [show3d, setShow3d] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const name = hydrocarbonName(h);
  const formula = hydrocarbonFormula(h);
  const { C } = hydrocarbonCounts(h);
  const mol = useMemo(() => buildMolecule(h), [h]);

  const set = (patch: Partial<Hydrocarbon>) => {
    let next = { ...h, ...patch };
    if (next.family !== 'alkane') next = { ...next, methyls: [], position: Math.max(1, Math.min(next.position, next.n - 1)) };
    if (next.family !== 'alkane' && next.n < 2) next = { ...next, n: 2 };
    next = { ...next, methyls: next.methyls.filter((m) => m >= 2 && m <= next.n - 1) };
    if (isValid(next)) {
      setH(next);
      setBuilt((b) => new Set(b).add(`${hydrocarbonFormula(next)}|${hydrocarbonName(next).en}`));
    }
  };
  const toggleMethyl = (pos: number) => {
    const count = h.methyls.filter((m) => m === pos).length;
    set({ methyls: count >= 2 ? h.methyls.filter((m) => m !== pos) : [...h.methyls, pos] });
  };

  useEffect(() => {
    if (!show3d || !canvas.current) return undefined;
    let cancelled = false;
    void import('./viewer3d').then(({ mountViewer }) => {
      if (cancelled || !canvas.current) return;
      const c = themeColors(['raised', 'muted', 'bg'] as const);
      viewer.current = mountViewer(canvas.current, {
        autoRotate: !reduced,
        colors: { c: '#4b5563', h: '#f3f4f6', bond: c.muted, bg: c.raised },
      });
      viewer.current.update(mol.atoms, mol.bonds);
      viewer.current.setActive(active);
    });
    return () => {
      cancelled = true;
      viewer.current?.destroy();
      viewer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show3d, reduced]);
  useEffect(() => viewer.current?.update(mol.atoms, mol.bonds), [mol]);
  useEffect(() => viewer.current?.setActive(active && !reduced), [active, reduced]);

  const isomerSet = (f: string) => new Set([...built].filter((k) => k.startsWith(`${f}|`)).map((k) => k.split('|')[1]));
  const challenges = [
    {
      label: (
        <>
          ইথিন (<Formula>C2H4</Formula>) আর ইথাইন (<Formula>C2H2</Formula>) দুটোই বানাও
        </>
      ),
      done: built.has('C2H4|ethene') && built.has('C2H2|ethyne'),
    },
    {
      label: (
        <>
          <Formula>C4H10</Formula>-এর দুটি সমাণু (বিউটেন ও ২-মিথাইলপ্রোপেন) বানাও
        </>
      ),
      done: isomerSet('C4H10').size >= 2,
    },
    {
      label: <>বিউট-১-ইন আর বিউট-২-ইন: দ্বিবন্ধনের অবস্থান বদলে দুটোই বানাও</>,
      done: built.has('C4H8|but-1-ene') && built.has('C4H8|but-2-ene'),
    },
    {
      label: (
        <>
          <Formula>C5H12</Formula>-এর তিনটি সমাণুই বানাও
        </>
      ),
      done: isomerSet('C5H12').size >= 3,
    },
  ];

  return (
    <SimShell ref={shellRef} label="হাইড্রোকার্বন বিল্ডার" onReset={() => setH({ n: 2, family: 'alkene', position: 1, methyls: [] })}>
      <div className="space-y-5">
        <section className="panel panel-pad space-y-4" aria-label="গঠন করো">
          <Segmented options={FAMILIES} value={h.family} onChange={(f) => set({ family: f })} label="হাইড্রোকার্বনের ধরন" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Stepper label="প্রধান শিকলে কার্বন" value={h.n} min={h.family === 'alkane' ? 1 : 2} max={8} onChange={(n) => set({ n })} />
            {h.family !== 'alkane' && (
              <Stepper
                label={`${h.family === 'alkene' ? 'দ্বিবন্ধনের' : 'ত্রিবন্ধনের'} অবস্থান`}
                value={Math.min(h.position, h.n - 1)}
                min={1}
                max={Math.max(1, h.n - 1)}
                onChange={(position) => set({ position })}
                hint="কোন দুই কার্বনের মাঝে"
              />
            )}
          </div>
          {h.family === 'alkane' && h.n >= 3 && (
            <div>
              <p className="label mb-2">মিথাইল (–CH₃) শাখা যোগ করো (প্রতিটি কার্বনে সর্বোচ্চ ২টি)</p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: h.n - 2 }, (_, k) => k + 2).map((pos) => {
                  const count = h.methyls.filter((m) => m === pos).length;
                  return (
                    <button key={pos} type="button" className="chip" aria-pressed={count > 0} onClick={() => toggleMethyl(pos)}>
                      কার্বন {bn(pos)}
                      {count > 0 && <span className="font-mono text-gold">×{bn(count)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="panel panel-pad" aria-label="গাঠনিক সংকেত">
          <Structure h={h} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4" aria-live="polite">
            <div>
              <p className="text-2xl font-bold text-gold">{name.bn}</p>
              <p className="font-mono text-sm text-muted">{name.en}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-3xl font-bold">
                <Formula>{formula}</Formula>
              </p>
              <p className="text-xs text-muted">
                সাধারণ সংকেত{' '}
                <span className="font-mono">
                  C<sub>n</sub>H<sub>{GENERAL_FORMULA[h.family].slice(3)}</sub>
                </span>
              </p>
            </div>
          </div>
          {h.family === 'alkane' && ALKANE_ISOMERS[C] && ALKANE_ISOMERS[C]! > 1 && (
            <p className="mt-2 text-sm text-muted">
              <Formula>{formula}</Formula> সংকেতের মোট {bn(ALKANE_ISOMERS[C]!)}টি গঠনগত সমাণু আছে। শাখা বদলে আরেকটি বানাতে পারো?
            </p>
          )}
          <p className="mt-1 text-sm text-muted">
            {h.family === 'alkane' ? 'সম্পৃক্ত: সব কার্বন-কার্বন বন্ধন একক।' : 'অসম্পৃক্ত: ব্রোমিন পানির লালচে-বাদামি রং মুছে দেয়।'}
          </p>
        </section>

        <section className="panel panel-pad" aria-label="ত্রিমাত্রিক মডেল">
          {!show3d ? (
            <button type="button" className="btn-secondary" onClick={() => setShow3d(true)}>
              <Icon name="atom" className="h-4 w-4" /> ৩D মডেলে দেখো
            </button>
          ) : (
            <>
              <canvas
                ref={canvas}
                tabIndex={0}
                className={cx('block h-72 w-full cursor-grab rounded-xl border border-line touch-none')}
                aria-label={`${name.bn} অণুর ঘোরানো যায় এমন ত্রিমাত্রিক মডেল। টেনে বা তীর চিহ্ন দিয়ে ঘোরাও।`}
                role="img"
              />
              <p className="mt-2 text-xs text-muted">
                টেনে ঘোরাও (কিবোর্ডে তীর চিহ্ন)। ধূসর বল কার্বন, সাদা বল হাইড্রোজেন। একক বন্ধনের চারপাশে পরমাণু চতুস্তলকীয়ভাবে ছড়িয়ে
                থাকে।
              </p>
            </>
          )}
        </section>
        <ChallengeList items={challenges} />
      </div>
    </SimShell>
  );
}
