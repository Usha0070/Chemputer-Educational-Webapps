// সক্রিয়তা সিরিজ → নিষ্কাশন পদ্ধতি: pick a metal on the reactivity series to see how it is extracted and why,
// then test displacement reactions (does metal A push metal B out of its salt solution?).
import { useState } from 'react';
import { CARBON_AFTER, HYDROGEN_AFTER, METHOD_TEXT, REACTIVITY, displaces, type Method } from '@/chem';
import { ChallengeList, Equation, Formula, SimShell, cx, useUrlInit, writeParams } from '@/ui';

const METHOD_COLOUR: Record<Method, string> = {
  electrolysis: 'var(--electron)',
  carbon: 'var(--gold)',
  roasting: 'var(--block-f)',
  native: 'var(--block-p)',
};
const SALTS = ['Mg', 'Zn', 'Fe', 'Pb', 'Cu', 'Ag'];
const SALT_FORMULA: Record<string, string> = { Mg: 'MgSO4', Zn: 'ZnSO4', Fe: 'FeSO4', Pb: 'Pb(NO3)2', Cu: 'CuSO4', Ag: 'AgNO3' };
const STRIPS = ['Mg', 'Zn', 'Fe', 'Pb', 'Cu', 'Ag'];

export default function ExtractionMethod() {
  const [symbol, setSymbol] = useState('Fe');
  const [strip, setStrip] = useState('Zn');
  const [salt, setSalt] = useState('Cu');
  const [opened, setOpened] = useState<Set<string>>(() => new Set());
  const [tested, setTested] = useState<Set<string>>(() => new Set());
  const metal = REACTIVITY.find((m) => m.symbol === symbol)!;
  const text = METHOD_TEXT[metal.method];
  const reacts = strip !== salt && displaces(strip, salt);

  useUrlInit((p) => {
    const m = p.get('metal');
    if (m && REACTIVITY.some((x) => x.symbol === m)) setSymbol(m);
  });
  const choose = (s: string) => {
    setSymbol(s);
    setOpened((o) => new Set(o).add(s));
    writeParams({ metal: s === 'Fe' ? null : s });
  };
  const test = (a: string, b: string) => {
    setStrip(a);
    setSalt(b);
    setTested((t) => new Set(t).add(`${a}-${b}`));
  };

  const methodOf = (s: string) => REACTIVITY.find((m) => m.symbol === s)?.method;
  const challenges = [
    { label: 'তড়িৎ বিশ্লেষণে নিষ্কাশিত হয় এমন একটি ধাতু খোলো', done: [...opened].some((s) => methodOf(s) === 'electrolysis') },
    { label: 'মুক্ত অবস্থায় পাওয়া যায় এমন একটি ধাতু খোলো', done: [...opened].some((s) => methodOf(s) === 'native') },
    { label: 'লোহা কি কপার সালফেট থেকে কপার সরাতে পারে? পরীক্ষা করো', done: tested.has('Fe-Cu') },
    {
      label: 'এমন একটি জোড়া খোঁজো যেখানে কোনো বিক্রিয়া হয় না',
      done: [...tested].some((k) => !displaces(k.split('-')[0]!, k.split('-')[1]!) && k.split('-')[0] !== k.split('-')[1]),
    },
  ];

  return (
    <SimShell label="সক্রিয়তা সিরিজ ও ধাতু নিষ্কাশন" onReset={() => (choose('Fe'), test('Zn', 'Cu'))}>
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <section className="panel panel-pad" aria-label="সক্রিয়তা সিরিজ">
            <p className="label mb-2">সক্রিয়তা সিরিজ (ওপরে সবচেয়ে সক্রিয়)</p>
            <ol className="space-y-1">
              {REACTIVITY.map((m) => (
                <li key={m.symbol}>
                  <button
                    type="button"
                    className={cx(
                      'flex min-h-[40px] w-full items-center gap-3 rounded-lg border px-3 text-left transition',
                      m.symbol === symbol ? 'border-gold bg-gold/15' : 'border-line bg-raised/50 hover:border-accent/60',
                    )}
                    aria-pressed={m.symbol === symbol}
                    onClick={() => choose(m.symbol)}
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: METHOD_COLOUR[m.method] }} aria-hidden="true" />
                    <span className="w-8 font-mono font-bold">{m.symbol}</span>
                    <span className="text-sm text-muted">{m.nameBn}</span>
                  </button>
                  {m.symbol === CARBON_AFTER && (
                    <p className="my-1 border-y border-dashed border-gold/60 py-0.5 text-center text-xs font-semibold text-gold">
                      কার্বন (C)
                    </p>
                  )}
                  {m.symbol === HYDROGEN_AFTER && (
                    <p className="my-1 border-y border-dashed border-electron/60 py-0.5 text-center text-xs font-semibold text-electron">
                      হাইড্রোজেন (H)
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
          <div className="space-y-5">
            <section className="panel panel-pad space-y-3" aria-live="polite" aria-label="নিষ্কাশন পদ্ধতি">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="grid h-16 w-16 place-items-center rounded-2xl border-2 font-mono text-3xl font-bold"
                  style={{ borderColor: METHOD_COLOUR[metal.method] }}
                >
                  {metal.symbol}
                </span>
                <div>
                  <p className="text-xl font-bold">{metal.nameBn}</p>
                  <p className="text-sm text-muted">
                    প্রধান আকরিক: {metal.ore} (<Formula>{metal.oreFormula}</Formula>)
                  </p>
                </div>
              </div>
              <p className="text-lg font-semibold" style={{ color: METHOD_COLOUR[metal.method] }}>
                {text.titleBn}
              </p>
              <p className="text-[15px] leading-relaxed">{text.why}</p>
              <p className="rounded-xl border border-line bg-raised/60 px-3 py-2 font-mono text-base">
                {metal.equation.includes('->') ? <Equation>{metal.equation}</Equation> : metal.equation}
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-muted">
                {(Object.keys(METHOD_TEXT) as Method[]).map((k) => (
                  <span key={k} className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: METHOD_COLOUR[k] }} /> {METHOD_TEXT[k].titleBn}
                  </span>
                ))}
              </div>
            </section>
            <section className="panel panel-pad space-y-3" aria-label="প্রতিস্থাপন পরীক্ষা">
              <p className="label">প্রতিস্থাপন পরীক্ষা: ধাতুর পাত লবণের দ্রবণে ডোবাও</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs text-muted">ধাতুর পাত</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STRIPS.map((s) => (
                      <button key={s} type="button" className="chip min-h-[38px]" aria-pressed={strip === s} onClick={() => test(s, salt)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted">লবণের দ্রবণ</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SALTS.map((s) => (
                      <button key={s} type="button" className="chip min-h-[38px]" aria-pressed={salt === s} onClick={() => test(strip, s)}>
                        <Formula>{SALT_FORMULA[s]!}</Formula>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-5" aria-live="polite">
                <svg
                  viewBox="0 0 120 150"
                  className="h-36 w-auto"
                  role="img"
                  aria-label={reacts ? `${strip}-এর গায়ে ${salt} জমছে` : 'কোনো বিক্রিয়া নেই'}
                >
                  <path d="M20 30 V130 Q20 140 30 140 H90 Q100 140 100 130 V30" fill="none" stroke="var(--line-strong)" strokeWidth="2.5" />
                  <rect
                    x="23"
                    y="60"
                    width="74"
                    height="77"
                    rx="6"
                    fill={
                      salt === 'Cu' && !reacts
                        ? '#3b82f6'
                        : salt === 'Cu'
                          ? '#93c5fd'
                          : 'color-mix(in oklab, var(--electron) 15%, transparent)'
                    }
                    opacity=".55"
                  />
                  <rect x="52" y="14" width="16" height="110" rx="2" fill="#a1a1aa" />
                  {reacts && (
                    <rect
                      x="50"
                      y="62"
                      width="20"
                      height="62"
                      rx="3"
                      fill={salt === 'Cu' ? '#c2410c' : salt === 'Ag' ? '#e5e7eb' : '#71717a'}
                      opacity=".9"
                      className="animate-fade-up"
                    />
                  )}
                </svg>
                <div className="max-w-sm space-y-1 text-[15px]">
                  {strip === salt ? (
                    <p className="text-muted">একই ধাতু ও তার নিজের লবণ: কিছুই ঘটে না।</p>
                  ) : reacts ? (
                    <>
                      <p className="font-semibold text-block-p">বিক্রিয়া হয়েছে!</p>
                      <p>
                        {strip} বেশি সক্রিয়, তাই এটি দ্রবণ থেকে {salt}-কে সরিয়ে দেয়। পাতের গায়ে {salt} জমে, আর {strip} আয়ন হয়ে দ্রবণে
                        যায়।
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-exc">কোনো বিক্রিয়া নেই</p>
                      <p>
                        {strip} সিরিজে {salt}-এর নিচে, অর্থাৎ কম সক্রিয়, তাই {salt}-কে সরাতে পারে না।
                      </p>
                    </>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
        <ChallengeList items={challenges} />
      </div>
    </SimShell>
  );
}
