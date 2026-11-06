// জৈব রূপান্তর মানচিত্র: tap any arrow to see the reagent, condition, equation and reaction type; or ask for the route
// between two compounds (hydrocarbon → alcohol → aldehyde → carboxylic acid …).
import { useMemo, useState } from 'react';
import { COMPOUNDS, CONVERSIONS, routeBetween, type Conversion } from '@/chem';
import { ChallengeList, Equation, Formula, SimShell, cx } from '@/ui';

const POS: Record<string, [number, number]> = {
  methane: [70, 50],
  chloromethane: [70, 170],
  ethyne: [230, 50],
  ethane: [420, 50],
  ethene: [330, 170],
  dibromoethane: [560, 120],
  polythene: [560, 220],
  ethanol: [330, 300],
  ethanal: [150, 400],
  ethanoic: [330, 480],
  ester: [560, 400],
};
/** [O] is the textbook shorthand for oxygen supplied by an oxidising agent. */
const show = (eq: string) => eq.replace('+ O ->', '+ [O] ->');
const W = 640;
const H = 530;

function Node({ id, selected, onPick, highlight }: { id: string; selected: boolean; onPick: (id: string) => void; highlight: boolean }) {
  const c = COMPOUNDS.find((x) => x.id === id)!;
  const [x, y] = POS[id]!;
  return (
    <foreignObject x={x - 62} y={y - 26} width="124" height="52">
      <button
        type="button"
        onClick={() => onPick(id)}
        aria-pressed={selected}
        className={cx(
          'flex h-full w-full flex-col items-center justify-center rounded-xl border-2 bg-surface text-center leading-tight transition',
          selected ? 'border-gold' : highlight ? 'border-block-p' : 'border-line hover:border-accent/60',
        )}
      >
        <span className="font-mono text-[13px] font-bold text-ink">
          <Formula>{c.formula}</Formula>
        </span>
        <span className="text-[10px] text-muted">{c.nameBn}</span>
      </button>
    </foreignObject>
  );
}

export default function OrganicConversions() {
  const [edge, setEdge] = useState<Conversion>(CONVERSIONS.find((c) => c.from === 'ethene' && c.to === 'ethanol')!);
  const [node, setNode] = useState('ethene');
  const [from, setFrom] = useState('ethene');
  const [to, setTo] = useState('ethanoic');
  const [seenEdges, setSeenEdges] = useState<Set<string>>(() => new Set());
  const [routes, setRoutes] = useState<Set<string>>(() => new Set());
  const route = useMemo(() => routeBetween(from, to), [from, to]);
  const onRoute = (c: Conversion) => route?.some((r) => r.from === c.from && r.to === c.to) ?? false;
  const compound = COMPOUNDS.find((c) => c.id === node)!;

  const pickEdge = (c: Conversion) => {
    setEdge(c);
    setSeenEdges((s) => new Set(s).add(`${c.from}-${c.to}`));
  };
  const findRoute = () => setRoutes((r) => new Set(r).add(`${from}-${to}`));

  const challenges = [
    { label: 'ইথিন থেকে ইথানয়িক এসিডে যাওয়ার পথ খুঁজে বের করো', done: routes.has('ethene-ethanoic') },
    { label: 'অসম্পৃক্ততার (C=C) পরীক্ষাটি খুলে দেখো', done: seenEdges.has('ethene-dibromoethane') },
    {
      label: 'দুটি জারণ ধাপ (অ্যালকোহল → অ্যালডিহাইড → এসিড) খোলো',
      done: seenEdges.has('ethanol-ethanal') && seenEdges.has('ethanal-ethanoic'),
    },
    { label: 'পলিথিন কীভাবে তৈরি হয়, দেখো', done: seenEdges.has('ethene-polythene') },
  ];

  return (
    <SimShell
      label="জৈব রূপান্তর মানচিত্র"
      onReset={() => {
        pickEdge(CONVERSIONS[4]!);
        setNode('ethene');
      }}
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section className="panel overflow-x-auto p-2 sm:p-4" aria-label="রূপান্তর মানচিত্র">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="mx-auto block w-full min-w-[520px] max-w-2xl"
            role="group"
            aria-label="জৈব যৌগের রূপান্তরের মানচিত্র"
          >
            <defs>
              {['muted', 'gold', 'green'].map((k) => (
                <marker key={k} id={`arr-${k}`} markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                  <path d="M0 0 L9 4.5 L0 9 Z" fill={k === 'gold' ? 'var(--gold)' : k === 'green' ? 'var(--block-p)' : 'var(--muted)'} />
                </marker>
              ))}
            </defs>
            {CONVERSIONS.map((c, i) => {
              const [x1, y1] = POS[c.from]!;
              const [x2, y2] = POS[c.to]!;
              const reverse = CONVERSIONS.some((d) => d.from === c.to && d.to === c.from);
              const dx = x2 - x1;
              const dy = y2 - y1;
              const l = Math.hypot(dx, dy);
              const nx = (-dy / l) * (reverse ? 18 : 0);
              const ny = (dx / l) * (reverse ? 18 : 0);
              const sx = x1 + (dx / l) * 62 * 0.9 + nx;
              const sy = y1 + (dy / l) * 30 + ny;
              const ex = x2 - (dx / l) * 62 * 0.9 + nx;
              const ey = y2 - (dy / l) * 32 + ny;
              const isSel = edge.from === c.from && edge.to === c.to;
              const green = onRoute(c);
              const col = isSel ? 'var(--gold)' : green ? 'var(--block-p)' : 'var(--muted)';
              return (
                <g key={i}>
                  <line
                    x1={sx}
                    y1={sy}
                    x2={ex}
                    y2={ey}
                    stroke={col}
                    strokeWidth={isSel || green ? 3 : 1.8}
                    markerEnd={`url(#arr-${isSel ? 'gold' : green ? 'green' : 'muted'})`}
                  />
                  <foreignObject x={(sx + ex) / 2 - 15} y={(sy + ey) / 2 - 15} width="30" height="30">
                    <button
                      type="button"
                      onClick={() => pickEdge(c)}
                      aria-label={`${COMPOUNDS.find((x) => x.id === c.from)!.nameBn} থেকে ${COMPOUNDS.find((x) => x.id === c.to)!.nameBn}: ${c.typeBn}`}
                      aria-pressed={isSel}
                      className={cx(
                        'grid h-full w-full place-items-center rounded-full border text-[11px] font-bold',
                        isSel ? 'border-gold bg-gold text-on-accent' : 'border-line bg-raised text-muted hover:border-accent',
                      )}
                    >
                      {i + 1}
                    </button>
                  </foreignObject>
                </g>
              );
            })}
            {COMPOUNDS.map((c) => (
              <Node
                key={c.id}
                id={c.id}
                selected={node === c.id}
                onPick={setNode}
                highlight={!!route && route.some((r) => r.from === c.id || r.to === c.id)}
              />
            ))}
          </svg>
        </section>
        <div className="space-y-5">
          <section className="panel panel-pad space-y-2 border-gold/50" aria-live="polite" aria-label="বিক্রিয়ার বিবরণ">
            <p className="label">তীর নির্বাচন করো: বিক্রিয়ার বিবরণ</p>
            <p className="font-mono text-lg">
              <Equation>{show(edge.equation)}</Equation>
            </p>
            <dl className="grid gap-1.5 text-sm">
              <div>
                <dt className="inline font-semibold">বিকারক: </dt>
                <dd className="inline">{edge.reagentBn}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">শর্ত: </dt>
                <dd className="inline">{edge.conditionBn}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">বিক্রিয়ার ধরন: </dt>
                <dd className="inline text-gold">{edge.typeBn}</dd>
              </div>
            </dl>
          </section>
          <section className="panel panel-pad space-y-2" aria-label="যৌগের পরিচয়">
            <p className="text-lg font-bold">
              <Formula>{compound.formula}</Formula> · {compound.nameBn}
            </p>
            <p className="text-sm text-muted">শ্রেণি: {compound.family}</p>
            <ul className="text-sm">
              {CONVERSIONS.filter((c) => c.from === node).map((c) => (
                <li key={c.to}>
                  <button type="button" className="text-gold hover:underline" onClick={() => pickEdge(c)}>
                    → {COMPOUNDS.find((x) => x.id === c.to)!.nameBn} ({c.typeBn})
                  </button>
                </li>
              ))}
              {CONVERSIONS.every((c) => c.from !== node) && <li className="text-muted">এই মানচিত্রে এখান থেকে আর কোনো তীর নেই।</li>}
            </ul>
          </section>
          <section className="panel panel-pad space-y-3" aria-label="পথ খোঁজো">
            <p className="label">এক যৌগ থেকে আরেক যৌগে যাওয়ার পথ</p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="input min-h-[44px] w-auto px-2 text-base"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label="শুরুর যৌগ"
              >
                {COMPOUNDS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameBn}
                  </option>
                ))}
              </select>
              <span>→</span>
              <select
                className="input min-h-[44px] w-auto px-2 text-base"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label="শেষের যৌগ"
              >
                {COMPOUNDS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameBn}
                  </option>
                ))}
              </select>
              <button type="button" className="btn-primary px-4" onClick={findRoute}>
                পথ দেখাও
              </button>
            </div>
            <div aria-live="polite">
              {routes.has(`${from}-${to}`) &&
                (route && route.length ? (
                  <ol className="list-decimal space-y-1 ps-5 text-sm">
                    {route.map((c) => (
                      <li key={`${c.from}-${c.to}`}>
                        <Equation>{show(c.equation)}</Equation>{' '}
                        <span className="text-muted">
                          ({c.reagentBn}; {c.typeBn})
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted">{from === to ? 'একই যৌগ বেছে নিয়েছ।' : 'এই মানচিত্রে এই দিকে কোনো পথ নেই।'}</p>
                ))}
            </div>
          </section>
          <ChallengeList items={challenges} />
        </div>
      </div>
    </SimShell>
  );
}
