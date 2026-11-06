// Periodic-trend visualiser for the main-group elements of periods 1–4.
import { useState } from 'react';
import { bn, element } from '@/chem';
import { Callout, Icon, Rich, SimShell, cx, useUrlInit, writeParams, type IconName } from '@/ui';

interface Datum {
  z: number;
  /** period */
  p: number;
  /** column 1–8 in the short table */
  col: number;
  r: number;
  m: number;
  nm: number;
  ie: number;
  ea: number;
  en: number;
  symbol: string;
  name: string;
}

// r: atomic radius (pm) · m / nm: relative metallic / non-metallic character (0–100, teaching scale)
// ie: 1st ionisation energy (kJ/mol) · ea: electron affinity (kJ/mol, energy released; 0 ≈ none)
// en: Pauling electronegativity (0 = noble gas, not defined)
const DATA: Datum[] = [
  { z: 1, p: 1, col: 1, r: 53, m: 10, nm: 80, ie: 1312, ea: 73, en: 2.1 },
  { z: 2, p: 1, col: 8, r: 31, m: 0, nm: 0, ie: 2372, ea: 0, en: 0 },
  { z: 3, p: 2, col: 1, r: 152, m: 80, nm: 10, ie: 520, ea: 60, en: 1.0 },
  { z: 4, p: 2, col: 2, r: 112, m: 60, nm: 20, ie: 899, ea: 0, en: 1.5 },
  { z: 5, p: 2, col: 3, r: 85, m: 40, nm: 40, ie: 801, ea: 27, en: 2.0 },
  { z: 6, p: 2, col: 4, r: 77, m: 20, nm: 60, ie: 1086, ea: 122, en: 2.5 },
  { z: 7, p: 2, col: 5, r: 70, m: 10, nm: 70, ie: 1402, ea: 0, en: 3.0 },
  { z: 8, p: 2, col: 6, r: 66, m: 5, nm: 80, ie: 1314, ea: 141, en: 3.5 },
  { z: 9, p: 2, col: 7, r: 64, m: 0, nm: 90, ie: 1681, ea: 328, en: 4.0 },
  { z: 10, p: 2, col: 8, r: 58, m: 0, nm: 0, ie: 2081, ea: 0, en: 0 },
  { z: 11, p: 3, col: 1, r: 186, m: 90, nm: 5, ie: 496, ea: 53, en: 0.9 },
  { z: 12, p: 3, col: 2, r: 160, m: 70, nm: 15, ie: 738, ea: 0, en: 1.2 },
  { z: 13, p: 3, col: 3, r: 143, m: 50, nm: 30, ie: 578, ea: 43, en: 1.5 },
  { z: 14, p: 3, col: 4, r: 118, m: 40, nm: 40, ie: 786, ea: 134, en: 1.8 },
  { z: 15, p: 3, col: 5, r: 110, m: 20, nm: 60, ie: 1012, ea: 72, en: 2.1 },
  { z: 16, p: 3, col: 6, r: 103, m: 10, nm: 70, ie: 1000, ea: 200, en: 2.5 },
  { z: 17, p: 3, col: 7, r: 99, m: 0, nm: 80, ie: 1251, ea: 349, en: 3.0 },
  { z: 18, p: 3, col: 8, r: 94, m: 0, nm: 0, ie: 1521, ea: 0, en: 0 },
  { z: 19, p: 4, col: 1, r: 227, m: 100, nm: 0, ie: 419, ea: 48, en: 0.8 },
  { z: 20, p: 4, col: 2, r: 197, m: 80, nm: 10, ie: 590, ea: 0, en: 1.0 },
  { z: 31, p: 4, col: 3, r: 135, m: 60, nm: 20, ie: 579, ea: 30, en: 1.6 },
  { z: 32, p: 4, col: 4, r: 122, m: 40, nm: 40, ie: 762, ea: 119, en: 1.8 },
  { z: 33, p: 4, col: 5, r: 114, m: 30, nm: 50, ie: 947, ea: 78, en: 2.0 },
  { z: 34, p: 4, col: 6, r: 103, m: 20, nm: 60, ie: 941, ea: 195, en: 2.4 },
  { z: 35, p: 4, col: 7, r: 99, m: 5, nm: 70, ie: 1140, ea: 325, en: 2.8 },
  { z: 36, p: 4, col: 8, r: 88, m: 0, nm: 0, ie: 1351, ea: 0, en: 0 },
].map((d) => ({ ...d, ...element(d.z) }));

const GROUP_OF_COLUMN = [1, 2, 13, 14, 15, 16, 17, 18];
const MAX_R = 227;

const UP = 'বৃদ্ধি পায়';
const DOWN = 'হ্রাস পায়';

type TrendId = 'size' | 'metallic' | 'nonMetallic' | 'ie' | 'ea' | 'en';
interface Trend {
  id: TrendId;
  icon: IconName;
  title: string;
  en: string;
  across: string;
  down: string;
  swatch: string;
  text: string;
  hBar: string;
  vBar: string;
  show: (d: Datum) => string;
  level: (d: Datum) => number;
  relative?: boolean;
  exceptionZ?: number[];
  why: string;
  exception?: string;
}

// Colours come from the shared data palette (theme-aware). Written out in full so Tailwind generates them.
const TRENDS: Trend[] = [
  {
    id: 'size', icon: 'maximize', title: 'পরমাণুর আকার', en: 'Atomic Radius', across: DOWN, down: UP,
    swatch: 'bg-data-1', text: 'text-data-1', hBar: 'from-data-1 to-transparent', vBar: 'from-transparent to-data-1',
    show: (d) => `${bn(d.r)} pm`, level: (d) => d.r / MAX_R,
    why: 'একই পর্যায়ে বাম থেকে ডানে নতুন কোনো শক্তিস্তর যুক্ত হয় না, কিন্তু নিউক্লিয়াসে প্রোটন বাড়ে। ফলে বাইরের ইলেকট্রনের ওপর আকর্ষণ বাড়ে এবং পরমাণু সংকুচিত হয়ে ছোট হয়। একই গ্রুপে ওপর থেকে নিচে প্রতি ধাপে নতুন শক্তিস্তর যুক্ত হয়, তাই আকার বড় হয়।',
  },
  {
    id: 'metallic', icon: 'bolt', title: 'ধাতব ধর্ম', en: 'Metallic Character', across: DOWN, down: UP,
    swatch: 'bg-data-2', text: 'text-data-2', hBar: 'from-data-2 to-transparent', vBar: 'from-transparent to-data-2',
    show: (d) => `${bn(d.m)} / ১০০`, level: (d) => d.m / 100, relative: true,
    why: 'ধাতব ধর্ম হলো ইলেকট্রন ত্যাগের প্রবণতা। পর্যায়ে বাম থেকে ডানে আকার ছোট হয় ও আকর্ষণ বাড়ে, তাই ইলেকট্রন ত্যাগ করা কঠিন হয়, ধাতব ধর্ম কমে। গ্রুপে ওপর থেকে নিচে আকার বাড়ে, বাইরের ইলেকট্রন নিউক্লিয়াস থেকে দূরে থাকে, তাই সহজে ত্যাগ করা যায়, ধাতব ধর্ম বাড়ে।',
  },
  {
    id: 'nonMetallic', icon: 'wind', title: 'অধাতব ধর্ম', en: 'Non-metallic Character', across: UP, down: DOWN,
    swatch: 'bg-data-3', text: 'text-data-3', hBar: 'from-transparent to-data-3', vBar: 'from-data-3 to-transparent',
    show: (d) => `${bn(d.nm)} / ১০০`, level: (d) => d.nm / 100, relative: true,
    why: 'অধাতব ধর্ম হলো ইলেকট্রন গ্রহণের প্রবণতা। পর্যায়ে বাম থেকে ডানে আকার ছোট হয় ও নিউক্লিয়াসের আকর্ষণ বাড়ে, তাই সহজে ইলেকট্রন গ্রহণ করতে পারে, অধাতব ধর্ম বাড়ে। গ্রুপে নিচে নামলে আকার বড় হয়, আগত ইলেকট্রনের প্রতি আকর্ষণ কমে, অধাতব ধর্ম কমে।',
  },
  {
    id: 'ie', icon: 'target', title: 'আয়নীকরণ শক্তি', en: 'Ionization Energy', across: UP, down: DOWN,
    swatch: 'bg-data-4', text: 'text-data-4', hBar: 'from-transparent to-data-4', vBar: 'from-data-4 to-transparent',
    show: (d) => `${bn(d.ie)} kJ/mol`, level: (d) => d.ie / 2400,
    exceptionZ: [4, 7, 12, 15, 33],
    why: 'গ্যাসীয় অবস্থায় এক মোল পরমাণু থেকে এক মোল ইলেকট্রন সরিয়ে ধনাত্মক আয়ন তৈরি করতে যে শক্তি লাগে, তাই আয়নীকরণ শক্তি। পর্যায়ে বাম থেকে ডানে আকার কমে, ইলেকট্রনের ওপর আকর্ষণ বাড়ে, তাই বেশি শক্তি লাগে। গ্রুপে নিচে নামলে আকার বাড়ে, তাই আয়নীকরণ শক্তি কমে।',
    exception: 'সাধারণত বাম থেকে ডানে আয়নীকরণ শক্তি বাড়ে। কিন্তু বেরিলিয়ামের (Be) 2s অরবিটাল পূর্ণ (2s^2) এবং নাইট্রোজেনের (N) 2p অরবিটাল অর্ধপূর্ণ (2p^3), তাই এরা বেশি স্থিতিশীল। ফলে Be > B এবং N > O। একই কারণে Mg > Al, P > S এবং As > Se।',
  },
  {
    id: 'ea', icon: 'magnet', title: 'ইলেকট্রন আসক্তি', en: 'Electron Affinity', across: UP, down: DOWN,
    swatch: 'bg-data-5', text: 'text-data-5', hBar: 'from-transparent to-data-5', vBar: 'from-data-5 to-transparent',
    show: (d) => (d.ea > 0 ? `${bn(d.ea)} kJ/mol` : '≈ ০'), level: (d) => d.ea / 350,
    exceptionZ: [9, 17],
    why: 'গ্যাসীয় অবস্থায় এক মোল পরমাণুতে এক মোল ইলেকট্রন যোগ করে ঋণাত্মক আয়ন তৈরির সময় যে শক্তি নির্গত হয়, তাই ইলেকট্রন আসক্তি। পর্যায়ে বাম থেকে ডানে আকার ছোট হয়, আগত ইলেকট্রনের প্রতি আকর্ষণ বেশি থাকে। গ্রুপে নিচে নামলে আকার বাড়ে, আকর্ষণ কমে। (নিষ্ক্রিয় গ্যাসের ইলেকট্রন আসক্তি প্রায় শূন্য।)',
    exception: 'সাধারণত গ্রুপে ওপর থেকে নিচে ইলেকট্রন আসক্তি কমে। কিন্তু ফ্লোরিন (F) খুব ছোট হওয়ায় এর দ্বিতীয় শক্তিস্তরে ইলেকট্রন ঘনত্ব অনেক বেশি, যা আগত ইলেকট্রনকে বিকর্ষণ করে। ক্লোরিন (Cl) বড় হওয়ায় বিকর্ষণ কম। তাই ইলেকট্রন আসক্তি Cl > F।',
  },
  {
    id: 'en', icon: 'share', title: 'তড়িৎ ঋণাত্মকতা', en: 'Electronegativity', across: UP, down: DOWN,
    swatch: 'bg-data-6', text: 'text-data-6', hBar: 'from-transparent to-data-6', vBar: 'from-data-6 to-transparent',
    show: (d) => (d.en > 0 ? bn(d.en.toFixed(1)) : 'প্রযোজ্য নয়'), level: (d) => d.en / 4,
    why: 'সমযোজী বন্ধনে শেয়ার করা ইলেকট্রন যুগলকে নিজের দিকে টানার ক্ষমতাই তড়িৎ ঋণাত্মকতা। পর্যায়ে বাম থেকে ডানে আকার ছোট ও নিউক্লিয়াসের চার্জ বেশি হয়, তাই এই ক্ষমতা বাড়ে। গ্রুপে নিচে নামলে আকার বড় হয়, ক্ষমতা কমে। ফ্লোরিন (F = ৪.০) সবচেয়ে বেশি তড়িৎ ঋণাত্মক মৌল।',
  },
]; // prettier-ignore

const DEFAULT_TREND: TrendId = 'size';
const DEFAULT_Z = 11;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function Cell({ d, trend, active, onSelect }: { d: Datum; trend: Trend; active: boolean; onSelect: (d: Datum) => void }) {
  const level = clamp01(trend.level(d));
  const isException = trend.exceptionZ?.includes(d.z);
  return (
    <button
      type="button"
      onClick={() => onSelect(d)}
      onMouseEnter={() => onSelect(d)}
      onFocus={() => onSelect(d)}
      aria-pressed={active}
      aria-label={`${d.name} (${d.symbol}), ${trend.title}: ${trend.show(d)}`}
      style={{ gridColumn: d.col + 1, gridRow: d.p + 1 }}
      className={cx(
        'relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-lg border bg-raised transition sm:rounded-xl',
        active ? 'z-10 border-ink/80 ring-2 ring-ink/60' : 'border-line hover:border-ink/40',
      )}
    >
      {trend.id === 'size' ? (
        <span
          className={cx('absolute rounded-full transition-all duration-700 ease-out', trend.swatch)}
          style={{ width: `${level * 92}%`, height: `${level * 92}%`, opacity: 'var(--fill-max)' }}
        />
      ) : (
        <span
          className={cx('absolute inset-0 transition-opacity duration-700', trend.swatch)}
          style={{ opacity: `calc(0.06 + ${level} * var(--fill-max))` }}
        />
      )}
      <span className="relative text-[13px] font-bold text-ink [text-shadow:0_1px_3px_var(--surface),0_0_2px_var(--surface)] sm:text-xl">
        {d.symbol}
      </span>
      <span className="relative hidden font-mono text-[10px] text-ink/80 [text-shadow:0_1px_2px_var(--surface)] sm:block">{bn(d.z)}</span>
      {isException && (
        <span
          className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-exc sm:top-1 sm:right-1 sm:h-2 sm:w-2 sm:ring-2 sm:ring-bg"
          title="ব্যতিক্রম"
        />
      )}
    </button>
  );
}

export default function PeriodicTrends() {
  const [trendId, setTrendId] = useState<TrendId>(DEFAULT_TREND);
  const [selected, setSelected] = useState<Datum>(DATA.find((d) => d.z === DEFAULT_Z)!);
  const trend = TRENDS.find((t) => t.id === trendId)!;
  const level = clamp01(trend.level(selected));

  useUrlInit((params) => {
    const t = TRENDS.find((x) => x.id === params.get('trend'));
    if (t) setTrendId(t.id);
  });

  const chooseTrend = (id: TrendId) => {
    setTrendId(id);
    writeParams({ trend: id === DEFAULT_TREND ? null : id });
  };
  const reset = () => {
    chooseTrend(DEFAULT_TREND);
    setSelected(DATA.find((d) => d.z === DEFAULT_Z)!);
  };

  return (
    <SimShell label="পর্যায়বৃত্ত ধর্ম ভিজ্যুয়ালাইজার" onReset={reset}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3" role="group" aria-label="ধর্ম বেছে নাও">
          {TRENDS.map((t) => {
            const active = t.id === trendId;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() => chooseTrend(t.id)}
                className={cx(
                  'flex items-center gap-3 rounded-xl border p-3 text-left transition duration-200 sm:p-4',
                  active ? 'border-brand/80 bg-brand/10 shadow-lg shadow-brand/10' : 'border-line bg-surface hover:border-accent/40',
                )}
              >
                <span
                  className={cx(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
                    active ? 'bg-brand text-on-brand' : 'bg-raised text-muted',
                  )}
                >
                  <Icon name={t.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className={cx('block text-sm leading-tight font-bold sm:text-[15px]', active ? 'text-ink' : 'text-ink/80')}>
                    {t.title}
                  </span>
                  <span className="block truncate text-[11px] text-muted">{t.en}</span>
                </span>
              </button>
            );
          })}
        </div>

        <section className="panel panel-pad" aria-label="পর্যায় সারণি">
          <div className="mb-5 flex flex-wrap gap-2">
            <span className="chip cursor-default! hover:border-line! hover:text-muted!">
              <Icon name="arrowRight" className={cx('h-4 w-4', trend.text)} /> পর্যায়ে বাম থেকে ডানে:{' '}
              <strong className={trend.text}>{trend.across}</strong>
            </span>
            <span className="chip cursor-default! hover:border-line! hover:text-muted!">
              <Icon name="arrowDown" className={cx('h-4 w-4', trend.text)} /> গ্রুপে ওপর থেকে নিচে:{' '}
              <strong className={trend.text}>{trend.down}</strong>
            </span>
          </div>

          <div className="mx-auto max-w-3xl">
            <div className="grid grid-cols-[14px_minmax(0,1fr)] gap-x-2 sm:grid-cols-[20px_minmax(0,1fr)] sm:gap-x-3">
              <span />
              <div className={cx('mb-3 h-2.5 rounded-full bg-linear-to-r', trend.hBar)} aria-hidden="true" />

              <div className={cx('mt-7 w-2.5 justify-self-center rounded-full bg-linear-to-b', trend.vBar)} aria-hidden="true" />

              <div className="grid grid-cols-[16px_repeat(8,minmax(0,1fr))] gap-1 sm:grid-cols-[22px_repeat(8,minmax(0,1fr))] sm:gap-2">
                {GROUP_OF_COLUMN.map((g, i) => (
                  <span
                    key={g}
                    className="pb-1 text-center font-mono text-[10px] text-muted sm:text-xs"
                    style={{ gridColumn: i + 2, gridRow: 1 }}
                  >
                    {bn(g)}
                  </span>
                ))}
                {[1, 2, 3, 4].map((p) => (
                  <span
                    key={p}
                    className="flex items-center justify-center font-mono text-[10px] text-muted sm:text-xs"
                    style={{ gridColumn: 1, gridRow: p + 1 }}
                  >
                    {bn(p)}
                  </span>
                ))}
                {DATA.map((d) => (
                  <Cell key={d.z} d={d} trend={trend} active={d.z === selected.z} onSelect={setSelected} />
                ))}
              </div>
            </div>
            <p className="mt-3 text-right text-[11px] text-muted">
              ওপরে গ্রুপ নম্বর, বামে পর্যায় নম্বর। সরলতার জন্য d-ব্লকের মৌলগুলো বাদ রাখা হয়েছে।
            </p>
          </div>

          <div
            className="mt-5 flex flex-col gap-3 rounded-xl border border-line bg-bg/70 p-4 sm:flex-row sm:items-center"
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-raised font-mono text-xl font-bold text-ink">
                {selected.symbol}
              </span>
              <div>
                <p className="font-semibold text-ink">{selected.name}</p>
                <p className="text-xs text-muted">
                  পারমাণবিক সংখ্যা {bn(selected.z)} · পর্যায় {bn(selected.p)} · গ্রুপ {bn(GROUP_OF_COLUMN[selected.col - 1]!)}
                </p>
              </div>
            </div>
            <div className="flex-1 sm:pl-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-muted">
                  {trend.title}
                  {trend.relative ? ' (আপেক্ষিক মান)' : ''}
                </span>
                <span className={cx('font-mono text-lg font-bold', trend.text)}>{trend.show(selected)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                <div className={cx('h-full rounded-full transition-all duration-500', trend.swatch)} style={{ width: `${level * 100}%` }} />
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">যেকোনো মৌলে ট্যাপ করো বা মাউস রাখো, তার মান এখানে দেখাবে।</p>
        </section>

        <section className="panel panel-pad space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Icon name="book" className="h-5 w-5 text-gold" /> কেন এমন হয়?
          </h2>
          <p className="text-[15px] leading-relaxed text-ink/85">{trend.why}</p>
          {trend.exception && (
            <Callout title="ব্যতিক্রম">
              <span className="mb-1 flex items-center gap-1.5 text-xs text-muted">
                <span className="h-2 w-2 rounded-full bg-exc" /> রঙিন বিন্দু দেওয়া মৌলগুলো ব্যতিক্রম দেখায়
              </span>
              <Rich text={trend.exception} />
            </Callout>
          )}
        </section>
      </div>
    </SimShell>
  );
}
