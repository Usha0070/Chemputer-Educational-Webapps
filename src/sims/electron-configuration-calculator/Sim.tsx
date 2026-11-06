// Electron configuration calculator (Z = 1–36): configuration, orbital diagram, period and group.
import { useMemo, useState } from 'react';
import { analyze, bn, element, orbitalList, parseNumber, type Analysis } from '@/chem';
import {
  BLOCK,
  BlockTag,
  Callout,
  ConfigLine,
  ElementTile,
  GroupResult,
  GroupSteps,
  Rich,
  SimShell,
  Stat,
  ZForm,
  cx,
  useUrlInit,
  writeParams,
} from '@/ui';

const MAX = 36;
const DEFAULT_Z = 26;
const QUICK = [6, 7, 11, 17, 19, 20, 23, 24, 25, 26, 28, 29, 33];

function OrbitalBoxes({ a }: { a: Analysis }) {
  const list = orbitalList(a.occ, 'shell');
  const b = BLOCK[a.block];
  return (
    <ul className="flex flex-wrap gap-2">
      {list.map((o) => {
        const key = a.valence.includes(o.id);
        return (
          <li
            key={o.id}
            className={cx('w-[58px] rounded-xl border px-2 pt-1.5 pb-2 text-center', key ? cx(b.border, b.soft) : 'border-line bg-raised')}
          >
            <div className={cx('font-mono text-xs', key ? b.text : 'text-muted')}>{o.id}</div>
            <div className={cx('font-mono text-base font-semibold', key ? b.text : 'text-ink')}>
              {o.e}
              <span className="text-[10px] font-normal text-muted">/{o.cap}</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
              <div className={cx('h-full rounded-full', key ? b.solid : 'bg-muted/60')} style={{ width: `${(o.e / o.cap) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function ElectronConfigurationCalculator() {
  const [input, setInput] = useState(String(DEFAULT_Z));
  const [z, setZ] = useState(DEFAULT_Z);
  const [error, setError] = useState('');
  const a = useMemo(() => analyze(z), [z]);
  const b = BLOCK[a.block];

  useUrlInit((params) => {
    const fromUrl = parseNumber(params.get('z') ?? '');
    if (fromUrl >= 1 && fromUrl <= MAX) {
      setInput(String(fromUrl));
      setZ(fromUrl);
    }
  });

  const show = (n: number) => {
    setError('');
    setZ(n);
    writeParams({ z: n });
  };
  const submit = () => {
    const n = parseNumber(input);
    if (n >= 1 && n <= MAX) show(n);
    else setError(`১ থেকে ${bn(MAX)} এর মধ্যে একটি পারমাণবিক সংখ্যা লেখো।`);
  };
  const reset = () => {
    setInput(String(DEFAULT_Z));
    setZ(DEFAULT_Z);
    setError('');
    writeParams({ z: null });
  };

  return (
    <SimShell label="ইলেকট্রন বিন্যাস ক্যালকুলেটর" onReset={reset}>
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section className="panel panel-pad space-y-5" aria-label="ইনপুট">
            <ZForm value={input} onChange={setInput} onSubmit={submit} max={MAX} buttonLabel="হিসাব করো" error={error} />
            <div>
              <p className="label mb-2">দ্রুত চেষ্টা করো</p>
              <div className="flex flex-wrap gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="chip"
                    aria-pressed={q === z}
                    onClick={() => {
                      setInput(String(q));
                      show(q);
                    }}
                  >
                    <span className="font-semibold text-ink">{element(q).symbol}</span>
                    <span>{bn(q)}</span>
                    {(q === 24 || q === 29) && <span className="h-1.5 w-1.5 rounded-full bg-exc" title="ব্যতিক্রম" />}
                  </button>
                ))}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-exc" /> রঙিন বিন্দু = ব্যতিক্রমী বিন্যাস
              </p>
            </div>
          </section>

          <section
            key={`sum-${z}`}
            className="panel panel-pad flex animate-fade-up flex-col gap-5 sm:flex-row sm:items-center"
            aria-live="polite"
          >
            <ElementTile el={a} block={a.block} />
            <div className="grid flex-1 grid-cols-3 gap-3">
              <Stat label="পর্যায়" value={bn(a.period)} />
              <Stat label="গ্রুপ" value={bn(a.group)} className={b.text} />
              <Stat label="ব্লক" value={a.block} className={cx('font-mono', b.text)} />
            </div>
          </section>
        </div>

        <section key={`cfg-${z}`} className="panel panel-pad animate-fade-up space-y-6">
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="label">ইলেকট্রন বিন্যাস</h2>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <span className={cx('h-2.5 w-2.5 rounded-sm', b.solid)} /> গ্রুপ নির্ণয়ে ব্যবহৃত অরবিটাল
              </span>
            </div>
            <div className="rounded-xl border border-line bg-bg px-4 py-4">
              <ConfigLine list={orbitalList(a.occ, 'shell')} highlight={a.valence} block={a.block} className="text-lg sm:text-xl" />
            </div>
            {a.exception && (
              <div className="mt-3">
                <Callout title="ব্যতিক্রমী বিন্যাস">
                  <Rich text={a.exception.note} />
                </Callout>
              </div>
            )}
          </div>
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="label">অরবিটাল চিত্র</h2>
              <span className="text-xs text-muted">(ইলেকট্রন / ধারণক্ষমতা)</span>
            </div>
            <OrbitalBoxes a={a} />
          </div>
        </section>

        <section key={`steps-${z}`} className="panel panel-pad animate-fade-up">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">ধাপে ধাপে সমাধান</h2>
            <BlockTag block={a.block} />
          </div>
          <GroupSteps a={a} showException={false} />
          <div className="mt-6">
            <GroupResult a={a} />
          </div>
        </section>
      </div>
    </SimShell>
  );
}
