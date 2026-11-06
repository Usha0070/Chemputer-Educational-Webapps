// সমযোজী বন্ধন: share electron pairs between atoms (dot-and-cross) until every atom has an octet (or duet for H).
import { useEffect, useMemo, useState } from 'react';
import { BOND_NAME, MOLECULES, bn, checkMolecule, maxBonds, type Molecule } from '@/chem';
import { ChallengeList, Formula, Icon, SimShell, cx, useUrlInit, writeParams } from '@/ui';

const R_ATOM = 30;
const R_ELECTRON = 47;

const angleOf = (m: Molecule, i: number, j: number) => Math.atan2(m.atoms[j]!.y - m.atoms[i]!.y, m.atoms[j]!.x - m.atoms[i]!.x);

/**
 * Where atom i's non-bonding electrons sit, as [direction, count] pairs. Single (bondable) electrons point at partners
 * they could still bond with; lone pairs fill the free directions. Lewis logic: lone pairs = valence − 4 (0 for C, H).
 */
function electronSpots(m: Molecule, i: number, orders: number[]): [number, number][] {
  const atom = m.atoms[i]!;
  const links = m.links.map((l, k) => ({ l, k })).filter(({ l }) => l.includes(i));
  const dir = (l: [number, number]) => angleOf(m, i, l[0] === i ? l[1] : l[0]);
  const linkDirs = links.map(({ l }) => dir(l));
  const free: number[] = [];
  if (atom.symbol !== 'H') {
    const taken = [...linkDirs].sort((a, b) => a - b);
    const want = 4 - taken.length;
    const gaps = taken.map((a, idx) => ({
      start: a,
      size: (taken[(idx + 1) % taken.length]! - a + 2 * Math.PI) % (2 * Math.PI) || 2 * Math.PI,
      n: 0,
    }));
    for (let k = 0; k < want; k++) gaps.sort((a, b) => b.size / (b.n + 1) - a.size / (a.n + 1))[0]!.n++;
    for (const g of gaps) for (let k = 1; k <= g.n; k++) free.push(g.start + (g.size * k) / (g.n + 1));
  }
  const bonds = links.reduce((sum, { k }) => sum + (orders[k] ?? 0), 0);
  const lonePairs = atom.symbol === 'H' ? 0 : Math.max(0, atom.valence - 4);
  const singles = Math.max(0, atom.valence - bonds - 2 * lonePairs);
  const open = links.filter(({ k }) => (orders[k] ?? 0) === 0).map(({ l }) => dir(l));
  const order = [...open, ...free];
  const out: [number, number][] = [];
  for (let s = 0; s < singles && s < order.length; s++) out.push([order[s]!, 1]);
  const rest = order.slice(singles).filter((a) => free.includes(a));
  for (let p = 0; p < lonePairs && p < rest.length; p++) out.push([rest[p]!, 2]);
  return out;
}

function Mark({ x, y, kind }: { x: number; y: number; kind: 'dot' | 'cross' }) {
  return kind === 'dot' ? (
    <circle cx={x} cy={y} r="4.2" fill="var(--electron)" />
  ) : (
    <path
      d={`M${x - 4} ${y - 4}L${x + 4} ${y + 4}M${x + 4} ${y - 4}L${x - 4} ${y + 4}`}
      stroke="var(--brand-ink)"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  );
}

function Diagram({ m, orders }: { m: Molecule; orders: number[] }) {
  return (
    <svg viewBox="-210 -160 420 320" className="mx-auto block w-full max-w-xl" role="img" aria-label={`${m.nameBn} অণুর ডট-ক্রস চিত্র`}>
      {/* shared pairs on each bond */}
      {m.links.map(([p, q], k) => {
        const a = m.atoms[p]!;
        const b = m.atoms[q]!;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const ux = Math.cos(ang);
        const uy = Math.sin(ang);
        const order = orders[k] ?? 0;
        return (
          <g key={k}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--line)" strokeDasharray="2 6" />
            {Array.from({ length: order }, (_, j) => {
              const off = (j - (order - 1) / 2) * 13;
              const cx = mx - uy * off;
              const cy = my + ux * off;
              return (
                <g key={j}>
                  <Mark x={cx - ux * 6} y={cy - uy * 6} kind={a.mark} />
                  <Mark x={cx + ux * 6} y={cy + uy * 6} kind={b.mark} />
                </g>
              );
            })}
          </g>
        );
      })}
      {m.atoms.map((atom, i) => {
        const status = checkMolecule(m, orders).atoms[i]!;
        const spots = electronSpots(m, i, orders);
        return (
          <g key={i}>
            <circle
              cx={atom.x}
              cy={atom.y}
              r={R_ATOM}
              fill="var(--raised)"
              stroke={status.full ? 'var(--block-p)' : 'var(--line-strong)'}
              strokeWidth={status.full ? 2.5 : 1.5}
            />
            <text x={atom.x} y={atom.y + 7} textAnchor="middle" fontSize="20" fontWeight="700" className="fill-ink">
              {atom.symbol}
            </text>
            {spots.map(([ang, n], s) => {
              const cx = atom.x + Math.cos(ang) * R_ELECTRON;
              const cy = atom.y + Math.sin(ang) * R_ELECTRON;
              const px = -Math.sin(ang) * 6;
              const py = Math.cos(ang) * 6;
              if (n === 0) return null;
              if (n === 1) return <Mark key={s} x={cx} y={cy} kind={atom.mark} />;
              return (
                <g key={s}>
                  <Mark x={cx - px} y={cy - py} kind={atom.mark} />
                  <Mark x={cx + px} y={cy + py} kind={atom.mark} />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

const structural = (m: Molecule, orders: number[]) => {
  const sym = ['', '–', '=', '≡'];
  if (m.id === 'NH3') return `H${sym[orders[0] ?? 0]}N(${sym[orders[1] ?? 0]}H)${sym[orders[2] ?? 0]}H`;
  if (m.id === 'CH4') return `H${sym[orders[0] ?? 0]}C(${sym[orders[1] ?? 0]}H)(${sym[orders[2] ?? 0]}H)${sym[orders[3] ?? 0]}H`;
  if (m.id === 'H2O') return `H${sym[orders[0] ?? 0]}O${sym[orders[1] ?? 0]}H`;
  return m.links.map(([p, q], k) => `${k === 0 ? m.atoms[p]!.symbol : ''}${sym[orders[k] ?? 0]}${m.atoms[q]!.symbol}`).join('');
};

export default function CovalentBond() {
  const [molId, setMolId] = useState('H2O');
  const m = MOLECULES.find((x) => x.id === molId)!;
  const [orders, setOrders] = useState<number[]>(() => m.links.map(() => 0));
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());
  const check = useMemo(() => checkMolecule(m, orders), [m, orders]);

  useUrlInit((p) => {
    const id = p.get('molecule');
    if (id && MOLECULES.some((x) => x.id === id)) choose(id);
  });
  useEffect(() => {
    if (check.complete) setCompleted((c) => (c.has(m.id) ? c : new Set(c).add(m.id)));
  }, [check.complete, m.id]);

  function choose(id: string) {
    const next = MOLECULES.find((x) => x.id === id)!;
    setMolId(id);
    setOrders(next.links.map(() => 0));
    writeParams({ molecule: id === 'H2O' ? null : id });
  }
  const canAdd = (k: number) => {
    const [p, q] = m.links[k]!;
    const st = check.atoms;
    return (orders[k] ?? 0) < 3 && st[p]!.bonds < maxBonds(m.atoms[p]!) && st[q]!.bonds < maxBonds(m.atoms[q]!);
  };
  const setOrder = (k: number, v: number) => setOrders((o) => o.map((x, i) => (i === k ? Math.max(0, v) : x)));

  const challenges = [
    { label: 'নাইট্রোজেন (N₂) অণু সম্পূর্ণ করো: কয়টি ইলেকট্রন যুগল ভাগাভাগি হলো?', done: completed.has('N2') },
    { label: 'কার্বন ডাইঅক্সাইড (CO₂) সম্পূর্ণ করো', done: completed.has('CO2') },
    { label: 'অ্যামোনিয়া (NH₃) সম্পূর্ণ করে N-এর নিঃসঙ্গ যুগল গুনে দেখো', done: completed.has('NH3') },
    { label: 'অন্তত ছয়টি ভিন্ন অণু সম্পূর্ণ করো', done: completed.size >= 6 },
  ];

  return (
    <SimShell label="সমযোজী বন্ধন" onReset={() => choose(molId)}>
      <div className="space-y-5">
        <section className="panel panel-pad" aria-label="অণু বেছে নাও">
          <p className="label mb-2">অণু বেছে নাও</p>
          <div className="flex flex-wrap gap-2">
            {MOLECULES.map((x) => (
              <button key={x.id} type="button" className="chip" aria-pressed={x.id === molId} onClick={() => choose(x.id)}>
                <Formula>{x.formula}</Formula>
                {completed.has(x.id) && <Icon name="check" className="h-3.5 w-3.5 text-block-p" />}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <section className="panel panel-pad" aria-label="ডট-ক্রস চিত্র">
            <Diagram m={m} orders={orders} />
            <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-electron" /> এক পরমাণুর ইলেকট্রন
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="font-bold text-brand-ink">×</span> অন্য পরমাণুর ইলেকট্রন
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border-2 border-block-p" /> অষ্টক/দুই পূর্ণ
              </span>
            </div>
          </section>

          <div className="space-y-5">
            <section className="panel panel-pad space-y-2" aria-label="বন্ধন তৈরি করো">
              <p className="label">ইলেকট্রন যুগল ভাগাভাগি করো</p>
              {m.links.map(([p, q], k) => (
                <div key={k} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-raised/60 px-3 py-2">
                  <span className="font-mono text-base font-semibold">
                    {m.atoms[p]!.symbol} — {m.atoms[q]!.symbol}
                    <span className="ms-2 font-sans text-xs font-normal text-muted">{BOND_NAME[orders[k] ?? 0] || 'বন্ধন নেই'}</span>
                  </span>
                  <span className="flex items-center gap-1.5" role="group" aria-label={`${m.atoms[p]!.symbol}–${m.atoms[q]!.symbol} বন্ধন`}>
                    <button
                      type="button"
                      className="btn-icon min-h-[40px] w-10"
                      disabled={(orders[k] ?? 0) === 0}
                      onClick={() => setOrder(k, (orders[k] ?? 0) - 1)}
                      aria-label="একটি যুগল কমাও"
                    >
                      −
                    </button>
                    <output className="w-6 text-center font-mono text-lg font-bold">{bn(orders[k] ?? 0)}</output>
                    <button
                      type="button"
                      className="btn-icon min-h-[40px] w-10"
                      disabled={!canAdd(k)}
                      onClick={() => setOrder(k, (orders[k] ?? 0) + 1)}
                      aria-label="একটি যুগল ভাগাভাগি করো"
                    >
                      +
                    </button>
                  </span>
                </div>
              ))}
            </section>

            <section className="panel panel-pad" aria-live="polite" aria-label="পরমাণুর অবস্থা">
              <ul className="flex flex-wrap gap-2">
                {m.atoms.map((a, i) => {
                  const st = check.atoms[i]!;
                  return (
                    <li
                      key={i}
                      className={cx(
                        'rounded-lg border px-2.5 py-1 font-mono text-sm',
                        st.full ? 'border-block-p/60 bg-block-p/10 text-block-p' : 'border-line text-muted',
                      )}
                    >
                      {a.symbol}: {bn(st.around)}/{bn(a.symbol === 'H' ? 2 : 8)} {st.full ? '✓' : ''}
                    </li>
                  );
                })}
              </ul>
              {check.complete ? (
                <div className="mt-4 rounded-xl border border-gold/50 bg-gold/10 px-4 py-3">
                  <p className="font-bold text-ink">অণু সম্পূর্ণ! প্রতিটি পরমাণু নিষ্ক্রিয় গ্যাসের মতো বিন্যাস পেয়েছে।</p>
                  <p className="mt-1 font-mono text-2xl text-gold">{structural(m, orders)}</p>
                  <p className="mt-1 text-sm text-muted">
                    ভাগাভাগি করা যুগল: {bn(check.bondCount)} · নিঃসঙ্গ যুগল: {bn(check.lonePairs)}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted">
                  প্রতিটি “+” চাপলে দুই পরমাণু একটি করে ইলেকট্রন দিয়ে একটি যুগল ভাগাভাগি করে। সবার অষ্টক (H-এর জন্য দুই) পূর্ণ করো।
                </p>
              )}
            </section>
          </div>
        </div>
        <ChallengeList items={challenges} />
      </div>
    </SimShell>
  );
}
