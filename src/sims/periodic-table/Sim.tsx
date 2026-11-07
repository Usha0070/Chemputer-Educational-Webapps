// পূর্ণ পর্যায় সারণি: all 118 elements, coloured by block, category, state or a property heat-map
// (electronegativity, first ionisation energy, atomic mass). Extends the periodic-trends visualizer.
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  ALL_ELEMENTS,
  CATEGORY_LABEL,
  EXCEPTIONS,
  STATE_LABEL,
  analyze,
  bn,
  bnFixed,
  coreConfig,
  toLatinDigits,
  type Block,
  type Category,
  type ElementInfo,
  type State,
} from '@/chem';
import { BLOCK, ChallengeList, Icon, Orb, Rich, SimShell, cx, useUrlInit, writeParams, type SegmentedOption } from '@/ui';

type Mode = 'block' | 'category' | 'state' | 'en' | 'ie' | 'mass';
const MODES: SegmentedOption<Mode>[] = [
  { value: 'block', label: 'ব্লক' },
  { value: 'category', label: 'শ্রেণি' },
  { value: 'state', label: 'অবস্থা' },
  { value: 'en', label: 'তড়িৎ ঋণাত্মকতা' },
  { value: 'ie', label: 'আয়নীকরণ শক্তি' },
  { value: 'mass', label: 'পারমাণবিক ভর' },
];
const MODE_IDS = MODES.map((m) => m.value);

export const CATEGORY_COLOR: Record<Category, string> = {
  alkali: '#f97316',
  'alkaline-earth': '#eab308',
  transition: '#3b82f6',
  lanthanide: '#ec4899',
  actinide: '#d946ef',
  'post-transition': '#64748b',
  metalloid: '#14b8a6',
  nonmetal: '#22c55e',
  halogen: '#84cc16',
  'noble-gas': '#8b5cf6',
};
const STATE_COLOR: Record<State, string> = { solid: '#94a3b8', liquid: '#3b82f6', gas: '#06b6d4', unknown: 'transparent' };
const BLOCK_VAR: Record<Block, string> = { s: 'var(--block-s)', p: 'var(--block-p)', d: 'var(--block-d)', f: 'var(--block-f)' };

const HEAT: Record<
  'en' | 'ie' | 'mass',
  { label: string; get: (e: ElementInfo) => number | null; show: (v: number) => string; across: string; down: string }
> = {
  en: { label: 'তড়িৎ ঋণাত্মকতা (পলিং)', get: (e) => e.en, show: (v) => bn(v.toFixed(2)), across: 'বৃদ্ধি পায়', down: 'হ্রাস পায়' },
  ie: { label: '১ম আয়নীকরণ শক্তি (kJ/mol)', get: (e) => e.ie1, show: (v) => bn(v), across: 'সাধারণত বৃদ্ধি পায়', down: 'হ্রাস পায়' },
  mass: {
    label: 'আপেক্ষিক পারমাণবিক ভর',
    get: (e) => e.mass,
    show: (v) => bnFixed(v, v < 100 ? 2 : 1),
    across: 'বৃদ্ধি পায়',
    down: 'বৃদ্ধি পায়',
  },
};

/** Block as shown in the table: the lanthanide/actinide rows are the f-block. */
const blockOf = (e: ElementInfo): Block => (e.position.row >= 9 ? 'f' : analyze(e.z).block);

const BY_CELL = new Map(ALL_ELEMENTS.map((e) => [`${e.position.row}-${e.position.col}`, e]));
const RANGES = Object.fromEntries(
  (['en', 'ie', 'mass'] as const).map((k) => {
    const vals = ALL_ELEMENTS.map(HEAT[k].get).filter((v): v is number => v !== null);
    return [k, [Math.min(...vals), Math.max(...vals)]];
  }),
) as Record<'en' | 'ie' | 'mass', [number, number]>;

function fillFor(e: ElementInfo, mode: Mode): { bg: string; border: string; value?: string } {
  const mix = (c: string, pct: number) => `color-mix(in oklab, ${c} ${pct}%, var(--surface))`;
  if (mode === 'block') return { bg: mix(BLOCK_VAR[blockOf(e)], 24), border: mix(BLOCK_VAR[blockOf(e)], 70) };
  if (mode === 'category') return { bg: mix(CATEGORY_COLOR[e.category], 30), border: mix(CATEGORY_COLOR[e.category], 75) };
  if (mode === 'state') {
    if (e.state === 'unknown') return { bg: 'var(--raised)', border: 'var(--line)' };
    return { bg: mix(STATE_COLOR[e.state], e.state === 'solid' ? 18 : 40), border: mix(STATE_COLOR[e.state], 75) };
  }
  const h = HEAT[mode];
  const v = h.get(e);
  if (v === null) return { bg: 'var(--raised)', border: 'var(--line)' };
  const [lo, hi] = RANGES[mode];
  const t = mode === 'mass' ? (v - lo) / (hi - lo) : Math.max(0, (v - lo) / (hi - lo));
  return { bg: mix('var(--data-4)', Math.round(8 + t * 70)), border: mix('var(--data-4)', Math.round(30 + t * 60)), value: h.show(v) };
}

function matches(e: ElementInfo, q: string): boolean {
  const query = toLatinDigits(q.trim()).toLowerCase();
  if (!query) return true;
  if (/^\d+$/.test(query)) return e.z === Number(query);
  return e.symbol.toLowerCase() === query || e.nameEn.toLowerCase().includes(query) || e.name.includes(q.trim());
}

function Legend({ mode }: { mode: Mode }) {
  const items: [string, string][] =
    mode === 'block'
      ? (['s', 'p', 'd', 'f'] as const).map((b) => [BLOCK_VAR[b], BLOCK[b].label])
      : mode === 'category'
        ? (Object.keys(CATEGORY_LABEL) as Category[]).map((c) => [CATEGORY_COLOR[c], CATEGORY_LABEL[c].bn])
        : mode === 'state'
          ? (['solid', 'liquid', 'gas'] as const).map((s) => [STATE_COLOR[s], STATE_LABEL[s]])
          : [];
  if (items.length === 0) {
    const h = HEAT[mode as 'en' | 'ie' | 'mass'];
    const [lo, hi] = RANGES[mode as 'en' | 'ie' | 'mass'];
    return (
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <span>{h.label}:</span>
        <span className="font-mono">{h.show(lo)}</span>
        <span
          className="h-2.5 w-32 rounded-full"
          style={{ background: 'linear-gradient(90deg, color-mix(in oklab, var(--data-4) 8%, var(--surface)), var(--data-4))' }}
        />
        <span className="font-mono">{h.show(hi)}</span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-line bg-raised" /> তথ্য নেই
        </span>
        <span>
          পর্যায়ে ডানে: <strong className="text-ink">{h.across}</strong> · গ্রুপে নিচে: <strong className="text-ink">{h.down}</strong>
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted">
      {items.map(([c, label]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ background: c }} /> {label}
        </span>
      ))}
      {mode === 'state' && <span>(২৫ °সে তাপমাত্রায়; ধূসর-ফাঁকা ঘর = অজানা)</span>}
    </div>
  );
}

function Details({ e }: { e: ElementInfo }) {
  const block = blockOf(e);
  const b = BLOCK[block];
  const { core, rest } = coreConfig(e.z);
  const exception = EXCEPTIONS[e.z];
  const facts: [string, string][] = [
    ['পারমাণবিক সংখ্যা', bn(e.z)],
    ['পারমাণবিক ভর', e.massIsApprox ? `[${bn(e.mass)}]` : bnFixed(e.mass, 3)],
    ['পর্যায় · গ্রুপ', `${bn(e.position.period)} · ${bn(e.position.group)}`],
    ['ব্লক', b.label],
    ['শ্রেণি', CATEGORY_LABEL[e.category].bn],
    ['অবস্থা (২৫ °সে)', STATE_LABEL[e.state]],
    ['তড়িৎ ঋণাত্মকতা', e.en === null ? 'সংজ্ঞায়িত নয়' : bn(e.en.toFixed(2))],
    ['১ম আয়নীকরণ শক্তি', e.ie1 === null ? 'অজানা' : `${bn(e.ie1)} kJ/mol`],
  ];
  return (
    <section className="panel panel-pad space-y-4" aria-live="polite" aria-label={`${e.name} এর তথ্য`}>
      <div className="flex items-center gap-4">
        <div
          className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl border-2 text-center"
          style={{
            background: `color-mix(in oklab, ${CATEGORY_COLOR[e.category]} 28%, var(--surface))`,
            borderColor: CATEGORY_COLOR[e.category],
          }}
        >
          <span className="font-mono text-xs text-muted">{bn(e.z)}</span>
          <span className="text-4xl leading-none font-bold text-ink">{e.symbol}</span>
          <span className="mt-1 font-mono text-[10px] text-muted">{e.massIsApprox ? `[${e.mass}]` : e.mass}</span>
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold">{e.name}</h2>
          <p className="text-sm text-muted">{e.nameEn}</p>
          <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-full border border-line px-2 py-0.5">{CATEGORY_LABEL[e.category].en}</span>
            {e.synthetic && <span className="rounded-full border border-exc/50 px-2 py-0.5 text-exc">কৃত্রিমভাবে তৈরি</span>}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        {facts.map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line bg-raised/50 px-3 py-2">
            <dt className="text-[11px] font-semibold text-muted">{k}</dt>
            <dd className="font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <div>
        <p className="label mb-1.5">ইলেকট্রন বিন্যাস</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-line bg-bg px-3 py-2 font-mono text-lg">
          {core && <span className="text-muted">[{core}]</span>}
          {rest.map((o) => (
            <Orb key={o.id} id={o.id} e={o.e} className={o.l === block ? cx('font-semibold', b.text) : 'text-ink/90'} />
          ))}
        </p>
        {exception && (
          <p className="mt-2 text-sm text-ink/85">
            <strong className="text-exc">ব্যতিক্রম: </strong>
            <Rich text={exception.note} />
          </p>
        )}
        <a
          href={`/ssc/03-structure-of-matter/electron-configuration-shortcut/?z=${e.z}`}
          className="mt-3 inline-flex min-h-[24px] items-center gap-1.5 text-sm font-semibold text-gold hover:underline"
        >
          বিন্যাসটি ধাপে ধাপে দেখো <Icon name="arrowRight" className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

export default function PeriodicTable() {
  const [mode, setMode] = useState<Mode>('category');
  const [selected, setSelected] = useState(26);
  const [query, setQuery] = useState('');
  const [visited, setVisited] = useState<Set<number>>(() => new Set([26]));
  const [modesSeen, setModesSeen] = useState<Set<Mode>>(() => new Set(['category']));
  const cellRefs = useRef(new Map<number, HTMLButtonElement>());
  const el = ALL_ELEMENTS[selected - 1]!;

  useUrlInit((params) => {
    const z = Number(toLatinDigits(params.get('z') ?? ''));
    if (z >= 1 && z <= 118) choose(z, false);
    const m = params.get('color') as Mode | null;
    if (m && MODE_IDS.includes(m)) changeMode(m);
  });

  function choose(z: number, focus = false) {
    setSelected(z);
    setVisited((v) => new Set(v).add(z));
    writeParams({ z });
    if (focus) cellRefs.current.get(z)?.focus();
  }
  function changeMode(m: Mode) {
    setMode(m);
    setModesSeen((s) => new Set(s).add(m));
    writeParams({ color: m === 'category' ? null : m });
  }

  const hits = useMemo(() => new Set(ALL_ELEMENTS.filter((e) => matches(e, query)).map((e) => e.z)), [query]);

  function onKey(ev: KeyboardEvent<HTMLButtonElement>, e: ElementInfo) {
    const { row, col } = e.position;
    const rows = [1, 2, 3, 4, 5, 6, 7, 9, 10];
    let target: ElementInfo | undefined;
    if (ev.key === 'ArrowRight') for (let c = col + 1; c <= 18 && !target; c++) target = BY_CELL.get(`${row}-${c}`);
    else if (ev.key === 'ArrowLeft') for (let c = col - 1; c >= 1 && !target; c--) target = BY_CELL.get(`${row}-${c}`);
    else if (ev.key === 'ArrowDown') for (const r of rows.filter((r) => r > row)) target ??= BY_CELL.get(`${r}-${col}`);
    else if (ev.key === 'ArrowUp') for (const r of rows.filter((r) => r < row).reverse()) target ??= BY_CELL.get(`${r}-${col}`);
    else if (ev.key === 'Home') target = ALL_ELEMENTS[0];
    else if (ev.key === 'End') target = ALL_ELEMENTS[117];
    else return;
    ev.preventDefault();
    if (target) choose(target.z, true);
  }

  const challenges = [
    { label: '“অবস্থা” রঙে সারণি দেখে ঘরের তাপমাত্রায় তরল দুটি মৌল খুঁজে বের করো', done: visited.has(35) && visited.has(80) },
    { label: 'সবচেয়ে বেশি তড়িৎ ঋণাত্মক মৌলটি খুঁজে খুলে দেখো', done: modesSeen.has('en') && visited.has(9) },
    { label: 'একটি অর্ধধাতু খুঁজে বের করো', done: [...visited].some((z) => ALL_ELEMENTS[z - 1]?.category === 'metalloid') },
    { label: 'একটি কৃত্রিমভাবে তৈরি মৌল খুঁজে বের করো', done: [...visited].some((z) => ALL_ELEMENTS[z - 1]?.synthetic) },
  ];

  return (
    <SimShell
      label="পূর্ণ পর্যায় সারণি"
      onReset={() => {
        changeMode('category');
        choose(26);
        setQuery('');
      }}
    >
      <div className="space-y-5">
        <section className="panel panel-pad space-y-4" aria-label="সারণির নিয়ন্ত্রণ">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="label mb-2">রং দেখাবে</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="রং দেখাবে">
                {MODES.map((m) => (
                  <button key={m.value} type="button" className="chip" aria-pressed={mode === m.value} onClick={() => changeMode(m.value)}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <form
              className="flex w-full max-w-sm flex-col gap-1.5"
              role="search"
              onSubmit={(ev) => {
                ev.preventDefault();
                const first = ALL_ELEMENTS.find((e) => hits.has(e.z));
                if (first) choose(first.z, true);
              }}
            >
              <label htmlFor="pt-search" className="label">
                খোঁজো (প্রতীক, নাম বা সংখ্যা)
              </label>
              <div className="flex gap-2">
                <input
                  id="pt-search"
                  className="input min-h-[44px] text-base"
                  placeholder="যেমন: Fe, সোডিয়াম, ২৯"
                  value={query}
                  onChange={(ev) => setQuery(ev.target.value)}
                  autoComplete="off"
                />
                <button type="submit" className="btn-primary px-4" aria-label="খোঁজো">
                  <Icon name="search" className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
          <Legend mode={mode} />
        </section>

        <section className="panel p-2 sm:p-4" aria-label="পর্যায় সারণি">
          <p className="mb-2 px-1 text-xs text-muted sm:hidden">← সারণিটি ডানে-বামে সরিয়ে দেখো →</p>
          <div className="overflow-x-auto pb-2">
            <div
              className="grid min-w-[700px] grid-cols-[18px_repeat(18,minmax(0,1fr))] gap-[3px] sm:gap-1"
              role="group"
              aria-label="১১৮টি মৌল"
            >
              <span />
              {Array.from({ length: 18 }, (_, i) => (
                <span key={i} className="pb-1 text-center font-mono text-[10px] text-muted">
                  {bn(i + 1)}
                </span>
              ))}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
                <div key={row} className="contents">
                  <span className="flex items-center justify-center font-mono text-[10px] text-muted">{row <= 7 ? bn(row) : ''}</span>
                  {Array.from({ length: 18 }, (_, ci) => {
                    const col = ci + 1;
                    if (row === 8) return <span key={col} className="h-2" />;
                    const e = BY_CELL.get(`${row}-${col}`);
                    if (!e) {
                      if (col === 3 && (row === 6 || row === 7))
                        return (
                          <span
                            key={col}
                            className="grid aspect-square place-items-center rounded-md border border-dashed border-line-strong text-center font-mono text-[9px] leading-tight text-muted"
                          >
                            {row === 6 ? '৫৭–৭১' : '৮৯–১০৩'}
                          </span>
                        );
                      return <span key={col} />;
                    }
                    const fill = fillFor(e, mode);
                    const isSel = e.z === selected;
                    const dim = !hits.has(e.z);
                    return (
                      <button
                        key={col}
                        ref={(node) => {
                          if (node) cellRefs.current.set(e.z, node);
                        }}
                        type="button"
                        tabIndex={isSel ? 0 : -1}
                        aria-pressed={isSel}
                        aria-label={`${e.name} (${e.symbol}), পারমাণবিক সংখ্যা ${bn(e.z)}${fill.value ? `, ${fill.value}` : ''}`}
                        onClick={() => choose(e.z)}
                        onKeyDown={(ev) => onKey(ev, e)}
                        className={cx(
                          'relative flex aspect-square min-w-0 flex-col items-center justify-center rounded-md border leading-none transition',
                          isSel ? 'z-10 scale-110 ring-2 ring-gold' : 'hover:scale-105',
                          dim && 'opacity-25',
                          mode === 'state' && e.state === 'unknown' && 'border-dashed',
                        )}
                        style={{ background: fill.bg, borderColor: fill.border }}
                      >
                        <span className="absolute top-0.5 left-1 font-mono text-[8px] text-muted sm:text-[9px]">{e.z}</span>
                        <span className="text-[13px] font-bold text-ink sm:text-base">{e.symbol}</span>
                        {fill.value && <span className="mt-0.5 hidden font-mono text-[8px] text-ink/80 md:block">{fill.value}</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-1 px-1 text-[11px] text-muted">
            ওপরে গ্রুপ, বামে পর্যায়। ঘর বেছে নিয়ে কিবোর্ডের তীর চিহ্ন দিয়েও সারণিতে ঘোরা যায়। বন্ধনীর ভর = সবচেয়ে দীর্ঘস্থায়ী
            আইসোটোপের ভরসংখ্যা।
          </p>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Details e={el} />
          <ChallengeList items={challenges} />
        </div>
      </div>
    </SimShell>
  );
}
