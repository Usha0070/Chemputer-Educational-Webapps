// Group from electron configuration, block by block (s, p, d, f).
import { useEffect, useMemo, useRef, useState } from 'react';
import { analyze, bn, orbitalList, zOf, type Analysis, type Block } from '@/chem';
import { BLOCK, BlockTag, ConfigLine, ElementTile, GroupResult, GroupSteps, SimShell, cx, useUrlInit, writeParams } from '@/ui';

// Example elements shown in the picker, grouped by block.
const PICKS: Analysis[] = [
  'H',
  'Na',
  'Mg',
  'C',
  'N',
  'O',
  'Ne',
  'Al',
  'Cl',
  'Sc',
  'Ti',
  'V',
  'Cr',
  'Mn',
  'Fe',
  'Co',
  'Ni',
  'Cu',
  'Zn',
  'Ce',
  'U',
].map((s) => analyze(zOf(s)));
const DEFAULT = PICKS.find((p) => p.symbol === 'Fe')!;
type Filter = 'all' | Block;
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'সব' },
  { value: 's', label: 's-ব্লক' },
  { value: 'p', label: 'p-ব্লক' },
  { value: 'd', label: 'd-ব্লক' },
  { value: 'f', label: 'f-ব্লক' },
];

export default function GroupByBlock() {
  const [selected, setSelected] = useState<Analysis>(DEFAULT);
  const [filter, setFilter] = useState<Filter>('all');
  const detailRef = useRef<HTMLElement>(null);
  const userChose = useRef(false);
  const shown = useMemo(() => (filter === 'all' ? PICKS : PICKS.filter((p) => p.block === filter)), [filter]);
  const b = BLOCK[selected.block];

  useUrlInit((params) => {
    const urlZ = Number(params.get('z'));
    const fromUrl = PICKS.find((p) => p.z === urlZ);
    if (fromUrl) setSelected(fromUrl);
  });

  // On phones the detail panel sits below the picker: bring it into view after a choice.
  useEffect(() => {
    if (!userChose.current) return;
    if (window.innerWidth < 1024) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selected]);

  const choose = (el: Analysis) => {
    userChose.current = true;
    setSelected(el);
    writeParams({ z: el.z });
  };
  const reset = () => {
    userChose.current = false;
    setSelected(DEFAULT);
    setFilter('all');
    writeParams({ z: null });
  };

  return (
    <SimShell label="ব্লক অনুযায়ী গ্রুপ নির্ণয়" onReset={reset}>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="panel panel-pad lg:sticky lg:top-24" aria-label="মৌল নির্বাচন">
          <h2 className="mb-4 text-lg font-bold">মৌল নির্বাচন করো</h2>
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="ব্লক অনুযায়ী ছাঁকো">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={cx(
                  'chip',
                  f.value !== 'all' && filter === f.value && cx(BLOCK[f.value].border, BLOCK[f.value].soft, BLOCK[f.value].text),
                )}
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
              >
                {f.value !== 'all' && <span className={cx('h-2 w-2 rounded-full', BLOCK[f.value].solid)} />}
                {f.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((el) => {
              const active = el.z === selected.z;
              const eb = BLOCK[el.block];
              return (
                <button
                  key={el.z}
                  type="button"
                  onClick={() => choose(el)}
                  aria-pressed={active}
                  className={cx(
                    'relative flex flex-col items-center rounded-xl border px-1 pt-3 pb-2 text-center transition duration-200',
                    active ? cx(eb.border, eb.soft, 'ring-1', eb.ring) : 'border-line bg-raised/70 hover:border-accent/50 hover:bg-raised',
                  )}
                >
                  <span className="absolute top-1.5 left-2 font-mono text-[10px] text-muted">{bn(el.z)}</span>
                  <span className={cx('absolute top-2 right-2 h-1.5 w-1.5 rounded-full', eb.solid)} aria-hidden="true" />
                  <span className={cx('text-xl font-bold', active ? eb.text : 'text-ink')}>{el.symbol}</span>
                  <span className="mt-0.5 w-full truncate text-[11px] text-muted">{el.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section ref={detailRef} key={selected.z} className="panel panel-pad animate-fade-up scroll-mt-24 space-y-6" aria-live="polite">
          <div className="flex items-center gap-4">
            <ElementTile el={selected} block={selected.block} />
            <div className="min-w-0">
              <h2 className="text-2xl font-bold sm:text-3xl">{selected.name}</h2>
              <p className="mt-1 text-sm text-muted">পারমাণবিক সংখ্যা {bn(selected.z)}</p>
              <p className={cx('mt-2 inline-flex items-center gap-2 text-sm font-semibold', b.text)}>
                <BlockTag block={selected.block} /> {b.label}ের মৌল
              </p>
            </div>
          </div>

          <div>
            <h3 className="label mb-2">ইলেকট্রন বিন্যাস</h3>
            <div className="rounded-xl border border-line bg-bg px-4 py-4">
              <ConfigLine
                list={orbitalList(selected.occ, 'shell')}
                highlight={selected.valence}
                block={selected.block}
                className="text-base sm:text-xl"
              />
            </div>
          </div>

          <div>
            <h3 className="label mb-4">ধাপে ধাপে নির্ণয়</h3>
            <GroupSteps a={selected} showPeriod={false} />
          </div>

          <GroupResult a={selected} />
        </section>
      </div>
    </SimShell>
  );
}
