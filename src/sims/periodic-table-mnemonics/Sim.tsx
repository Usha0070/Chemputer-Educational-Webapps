// Mnemonic rhymes for every group of the periodic table, with flip cards.
import { useState } from 'react';
import { bn, element, zOf, type Block, type ElementId } from '@/chem';
import { BLOCK, Icon, SimShell, cx, useUrlInit, writeParams } from '@/ui';

interface Item extends ElementId {
  word: string;
}
interface Group {
  number: number;
  block: Block;
  items: Item[];
}

// [word in the rhyme, element symbol]
const GROUPS: Group[] = [
  [['হায়', 'H'], ['লি', 'Li'], ['না', 'Na'], ['কে', 'K'], ['রুবি', 'Rb'], ['ছেঁচে', 'Cs'], ['ফেলেছে', 'Fr']],
  [['বিরানী', 'Be'], ['মোগলাই', 'Mg'], ['কাবাব', 'Ca'], ['সরিয়ে', 'Sr'], ['বটিতে', 'Ba'], ['রাখো', 'Ra']],
  [['সচিন', 'Sc'], ['ইউনুস', 'Y'], ['লারা', 'La'], ['আক্রমনাত্মক', 'Ac']],
  [['টিনের', 'Ti'], ['জারে', 'Zr'], ['হাত', 'Hf'], ['রক্তাক্ত', 'Rf']],
  [['ভন্ড', 'V'], ['নবাব', 'Nb'], ['টাকা', 'Ta'], ['দেবে', 'Db']],
  [['ছেড়া', 'Cr'], ['মন', 'Mo'], ['তোমার', 'W'], ['সঙ্গী', 'Sg']],
  [['মন', 'Mn'], ['টাকে', 'Tc'], ['রেখেছি', 'Re'], ['বেধে', 'Bh']],
  [['ফের', 'Fe'], ['রুহান', 'Ru'], ['অসুস্থ', 'Os'], ['হয়েছে', 'Hs']],
  [['কোদাল', 'Co'], ['রাম', 'Rh'], ['ইরার', 'Ir'], ['মাথায়', 'Mt']],
  [['নীল', 'Ni'], ['পদ্ম', 'Pd'], ['পাথর', 'Pt'], ['দিছে', 'Ds']],
  [['কথা', 'Cu'], ['ছিল', 'Ag'], ['আসবে', 'Au'], ['রাজা', 'Rg']],
  [['জীবনে', 'Zn'], ['ক্যাডার', 'Cd'], ['হতে', 'Hg'], ['চাই', 'Cn']],
  [['বাংলাদেশের', 'B'], ['অফতাব', 'Al'], ['গেলো', 'Ga'], ['ইন্ডিয়ায়', 'In'], ['টিম', 'Tl'], ['নিতে', 'Nh']],
  [['কাল', 'C'], ['সিলেট', 'Si'], ['গেলে', 'Ge'], ['সোনা', 'Sn'], ['পাবে', 'Pb'], ['ফারিহা', 'Fl']],
  [['নি', 'N'], ['পা', 'P'], ['আছে', 'As'], ['আন্টির', 'Sb'], ['বাসার', 'Bi'], ['মধ্য', 'Mc']],
  [['ও', 'O'], ['এস', 'S'], ['এসসি', 'Se'], ['তে', 'Te'], ['পড়ে', 'Po'], ['লোভে', 'Lv']],
  [['ফ্লোরা', 'F'], ['কাল', 'Cl'], ['বাড়িতে', 'Br'], ['এসেছে', 'I'], ['আটটার', 'At'], ['ট্রেনে', 'Ts']],
  [['হে', 'He'], ['না', 'Ne'], ['আর', 'Ar'], ['কেয়া', 'Kr'], ['জিনিয়াস', 'Xe'], ['রাধুনি', 'Rn'], ['আগেথেকেই', 'Og']],
].map((words, i) => ({
  number: i + 1,
  block: i < 2 ? 's' : i < 12 ? 'd' : 'p',
  items: words.map(([word, symbol]) => ({ word: word!, ...element(zOf(symbol!)) })),
})); // prettier-ignore

function FlipCard({ item, flipped, onToggle, block }: { item: Item; flipped: boolean; onToggle: () => void; block: Block }) {
  const b = BLOCK[block];
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={flipped}
      aria-label={flipped ? `${item.word}: ${item.name} (${item.symbol}), পারমাণবিক সংখ্যা ${bn(item.z)}` : `${item.word}: উল্টে দেখো`}
      className="group h-32 w-full [perspective:900px] sm:h-36"
    >
      <span
        className={cx(
          'relative block h-full w-full transition-transform duration-500 [transform-style:preserve-3d]',
          flipped && '[transform:rotateY(180deg)]',
        )}
      >
        <span className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-line bg-raised px-2 [backface-visibility:hidden] group-hover:border-accent/50">
          <span className="text-lg leading-snug font-bold text-ink sm:text-xl">{item.word}</span>
          <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted">
            <Icon name="rotate" className="h-3 w-3" /> উল্টাও
          </span>
        </span>
        <span
          className={cx(
            'absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 bg-surface px-2 [backface-visibility:hidden] [transform:rotateY(180deg)]',
            b.border,
          )}
        >
          <span className={cx('absolute inset-0 rounded-2xl', b.soft)} aria-hidden="true" />
          <span className="relative font-mono text-[11px] text-muted">{bn(item.z)}</span>
          <span className={cx('relative font-mono text-3xl leading-tight font-bold', b.text)}>{item.symbol}</span>
          <span className="relative mt-1 text-xs font-semibold text-ink">{item.name}</span>
        </span>
      </span>
    </button>
  );
}

export default function PeriodicTableMnemonics() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState<number[]>([]);
  const group = GROUPS[index]!;
  const b = BLOCK[group.block];
  const allShown = flipped.length === group.items.length;

  useUrlInit((params) => {
    const urlGroup = Number(params.get('group'));
    if (urlGroup >= 1 && urlGroup <= 18) setIndex(urlGroup - 1);
  });

  const select = (i: number) => {
    setFlipped([]);
    setIndex(i);
    writeParams({ group: i === 0 ? null : i + 1 });
  };
  const toggle = (i: number) => setFlipped((f) => (f.includes(i) ? f.filter((x) => x !== i) : [...f, i]));
  const go = (delta: number) => select((index + delta + GROUPS.length) % GROUPS.length);

  return (
    <SimShell label="ছন্দে ছন্দে পর্যায় সারণি" onReset={() => select(0)}>
      <div className="space-y-5">
        <section className="panel panel-pad" aria-label="গ্রুপ বেছে নাও">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="label">গ্রুপ বেছে নাও</h2>
            <span className="flex items-center gap-3 text-xs text-muted">
              {(['s', 'd', 'p'] as const).map((k) => (
                <span key={k} className="inline-flex items-center gap-1">
                  <span className={cx('h-2 w-2 rounded-full', BLOCK[k].solid)} /> {BLOCK[k].label}
                </span>
              ))}
            </span>
          </div>
          <div className="grid grid-cols-9 gap-1.5 lg:grid-cols-[repeat(18,minmax(0,1fr))]">
            {GROUPS.map((g, i) => {
              const active = i === index;
              const gb = BLOCK[g.block];
              return (
                <button
                  key={g.number}
                  type="button"
                  onClick={() => select(i)}
                  aria-pressed={active}
                  aria-label={`গ্রুপ ${g.number}`}
                  className={cx(
                    'relative min-h-[44px] rounded-lg border font-semibold transition',
                    active
                      ? 'border-transparent bg-brand text-on-brand shadow-lg shadow-brand/25'
                      : 'border-line bg-raised/70 text-ink/80 hover:border-accent/50',
                  )}
                >
                  {bn(g.number)}
                  <span
                    className={cx('absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full', active ? 'bg-on-brand/80' : gb.solid)}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </section>

        <section key={index} className="panel panel-pad animate-fade-up">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-muted">
              <span className={cx('h-5 w-1.5 rounded-full', b.solid)} />
              গ্রুপ {bn(group.number)} · {b.label} · {bn(group.items.length)}টি মৌল
            </p>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-icon min-h-[40px] w-10" onClick={() => go(-1)} aria-label="আগের গ্রুপ">
                <Icon name="chevronLeft" className="h-4 w-4" />
              </button>
              <button type="button" className="btn-icon min-h-[40px] w-10" onClick={() => go(1)} aria-label="পরের গ্রুপ">
                <Icon name="chevronRight" className="h-4 w-4" />
              </button>
            </div>
          </div>

          <p className="text-2xl leading-relaxed font-bold text-ink sm:text-4xl sm:leading-relaxed">
            {group.items.map((item, i) => (
              <span key={i}>
                <span className={cx('rounded-md transition-colors', flipped.includes(i) && cx(b.soft, b.text))}>{item.word}</span>
                {i < group.items.length - 1 && ' '}
              </span>
            ))}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">প্রতিটি শব্দের কার্ড উল্টে দেখো কোন মৌল লুকিয়ে আছে।</p>
            <button type="button" className="btn-secondary" onClick={() => setFlipped(allShown ? [] : group.items.map((_, i) => i))}>
              <Icon name={allShown ? 'eyeOff' : 'eye'} className="h-4 w-4" />
              {allShown ? 'সব লুকাও' : 'সব দেখাও'}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {group.items.map((item, i) => (
              <FlipCard key={i} item={item} block={group.block} flipped={flipped.includes(i)} onToggle={() => toggle(i)} />
            ))}
          </div>
        </section>
      </div>
    </SimShell>
  );
}
