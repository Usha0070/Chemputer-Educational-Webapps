// ল্যাবরেটরি নিরাপত্তা: the nine hazard symbols (what each means and how to handle it), a matching game with common
// lab and household chemicals, and a quick "safe or not?" sort of lab habits.
import { useState } from 'react';
import { HAZARDS, LAB_CHEMICALS, LAB_RULES, bn, hasHazard, hazardById, type HazardId } from '@/chem';
import { ChallengeList, Formula, Segmented, SimShell, cx, useUrlInit, writeParams } from '@/ui';

type Tab = 'symbols' | 'match' | 'rules';

/** Simplified original drawings of the GHS pictograms: black symbol in a red-bordered diamond. */
function Glyph({ id }: { id: HazardId }) {
  switch (id) {
    case 'explosive':
      return (
        <g>
          <circle cx="50" cy="58" r="10" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <rect key={a} x="48" y="30" width="4" height="12" transform={`rotate(${a} 50 58)`} />
          ))}
          <path d="M30 70 l-6 6 M70 70 l6 6 M40 40 l-5 -5" stroke="#111" strokeWidth="3" />
        </g>
      );
    case 'flammable':
      return (
        <path d="M50 28 C 62 42, 70 50, 64 64 C 60 74, 40 74, 36 64 C 32 54, 42 50, 44 40 C 48 48, 52 50, 54 46 C 56 40, 52 34, 50 28 Z M28 72 h44 v4 h-44 Z" />
      );
    case 'oxidising':
      return (
        <g>
          <circle cx="50" cy="62" r="11" fill="none" stroke="#111" strokeWidth="4" />
          <path d="M50 26 C 58 34, 62 40, 58 48 C 56 52, 44 52, 42 48 C 40 42, 46 40, 47 34 C 49 38, 52 38, 52 35 Z" />
          <path d="M30 77 h40 v4 h-40 Z" />
        </g>
      );
    case 'gas':
      return (
        <g>
          <rect x="30" y="44" width="40" height="18" rx="9" />
          <rect x="68" y="49" width="8" height="8" rx="1" />
          <rect x="26" y="66" width="48" height="3" />
        </g>
      );
    case 'corrosive':
      return (
        <g>
          <path d="M34 30 l6 12 h-4 z M60 30 l6 12 h-4 z" />
          <circle cx="38" cy="50" r="2.5" />
          <circle cx="64" cy="50" r="2.5" />
          <path d="M28 60 h20 v6 h-6 v-3 h-4 v3 h-10 z" />
          <path d="M54 62 c4 -4 8 -2 12 -4 l6 2 v10 h-18 z" />
          <path d="M26 74 h48 v4 h-48 z" />
        </g>
      );
    case 'toxic':
      return (
        <g>
          <circle cx="50" cy="44" r="13" />
          <rect x="43" y="52" width="14" height="8" rx="2" />
          <circle cx="45" cy="43" r="3.5" fill="#fff" />
          <circle cx="55" cy="43" r="3.5" fill="#fff" />
          <path d="M30 62 L70 78 M70 62 L30 78" stroke="#111" strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    case 'harmful':
      return (
        <g>
          <rect x="46" y="28" width="8" height="30" rx="3" />
          <circle cx="50" cy="68" r="5" />
        </g>
      );
    case 'health':
      return (
        <g>
          <circle cx="50" cy="34" r="8" />
          <path d="M34 78 C 34 56, 40 46, 50 46 C 60 46, 66 56, 66 78 Z" />
          <path d="M50 54 l3 6 6 1 -5 4 2 6 -6 -3 -6 3 2 -6 -5 -4 6 -1 z" fill="#fff" />
        </g>
      );
    case 'environment':
      return (
        <g>
          <path d="M34 72 v-26 M34 54 l-8 -8 M34 50 l7 -9 M34 60 l8 -5" stroke="#111" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M48 66 c8 -8 18 -8 22 0 c-4 8 -14 8 -22 0 z M70 66 l6 -5 v10 z" />
          <path d="M26 76 h52 v3 h-52 z" />
        </g>
      );
  }
}

/** `decorative` inside a button that already names the hazard, so screen readers do not hear the name twice. */
function Pictogram({ id, className, decorative = false }: { id: HazardId; className?: string; decorative?: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': `বিপদ সংকেত: ${hazardById(id).nameBn}` })}
    >
      <rect x="18" y="18" width="64" height="64" transform="rotate(45 50 50)" fill="#fff" stroke="#dc2626" strokeWidth="7" rx="3" />
      <g fill="#111">
        <Glyph id={id} />
      </g>
    </svg>
  );
}

export default function LabSafety() {
  const [tab, setTab] = useState<Tab>('symbols');
  const [symbol, setSymbol] = useState<HazardId>('flammable');
  const [opened, setOpened] = useState<Set<HazardId>>(() => new Set(['flammable']));
  const [round, setRound] = useState(0);
  const [pick, setPick] = useState<HazardId | null>(null);
  const [matched, setMatched] = useState<Set<string>>(() => new Set());
  const [tries, setTries] = useState(0);
  const [ruleAnswers, setRuleAnswers] = useState<Record<number, boolean>>({});

  useUrlInit((p) => {
    const t = p.get('tab');
    if (t === 'match' || t === 'rules' || t === 'symbols') setTab(t);
  });
  const chooseTab = (t: Tab) => {
    setTab(t);
    writeParams({ tab: t === 'symbols' ? null : t });
  };
  const open = (id: HazardId) => {
    setSymbol(id);
    setOpened((s) => new Set(s).add(id));
  };

  const chemical = LAB_CHEMICALS[round % LAB_CHEMICALS.length]!;
  const right = pick !== null && hasHazard(chemical, pick);
  const answer = (id: HazardId) => {
    if (pick !== null) return;
    setPick(id);
    setTries((n) => n + 1);
    if (hasHazard(chemical, id)) setMatched((m) => new Set(m).add(chemical.id));
  };
  const nextChemical = () => {
    setPick(null);
    setRound((r) => r + 1);
  };
  const reset = () => {
    setTab('symbols');
    open('flammable');
    setOpened(new Set(['flammable']));
    setRound(0);
    setPick(null);
    setMatched(new Set());
    setTries(0);
    setRuleAnswers({});
  };

  const h = hazardById(symbol);
  const examples = LAB_CHEMICALS.filter((c) => hasHazard(c, symbol));
  const rulesRight = Object.entries(ruleAnswers).filter(([i, v]) => LAB_RULES[Number(i)]!.safe === v).length;
  const challenges = [
    { label: 'অন্তত ৫টি বিপদ সংকেত খুলে তার অর্থ পড়ো', done: opened.size >= 5 },
    { label: `“মিলিয়ে দেখো”-তে ${bn(6)}টি রাসায়নিকের সঠিক সংকেত চেনো`, done: matched.size >= 6 },
    { label: 'ল্যাবের সব অভ্যাস নিরাপদ না অনিরাপদ, ঠিকভাবে বাছাই করো', done: rulesRight === LAB_RULES.length },
  ];

  return (
    <SimShell
      label="ল্যাবরেটরি নিরাপত্তা ও বিপদ সংকেত"
      onReset={reset}
      toolbar={
        <Segmented<Tab>
          label="অংশ বেছে নাও"
          value={tab}
          onChange={chooseTab}
          options={[
            { value: 'symbols', label: 'বিপদ সংকেত' },
            { value: 'match', label: 'মিলিয়ে দেখো' },
            { value: 'rules', label: 'নিরাপদ না অনিরাপদ?' },
          ]}
        />
      }
    >
      <div className="space-y-5">
        {tab === 'symbols' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
            <section className="panel panel-pad" aria-label="নয়টি বিপদ সংকেত">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {HAZARDS.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    className={cx(
                      'flex flex-col items-center gap-1 rounded-xl border p-2 text-center text-xs font-semibold transition sm:text-sm',
                      symbol === z.id ? 'border-gold bg-gold/15 text-ink' : 'border-line bg-raised/50 text-muted hover:border-accent/60',
                    )}
                    aria-pressed={symbol === z.id}
                    onClick={() => open(z.id)}
                  >
                    <Pictogram id={z.id} className="h-16 w-16 sm:h-20 sm:w-20" decorative />
                    {z.nameBn}
                  </button>
                ))}
              </div>
            </section>
            <section className="panel panel-pad space-y-3" aria-live="polite" aria-label="সংকেতের অর্থ">
              <div className="flex items-center gap-3">
                <Pictogram id={h.id} className="h-20 w-20 shrink-0" />
                <div>
                  <p className="text-xl font-bold">{h.nameBn}</p>
                  <p className="text-sm text-muted" lang="en">
                    {h.nameEn}
                  </p>
                </div>
              </div>
              <p className="text-[15px] leading-relaxed">
                <strong className="text-gold">অর্থ: </strong>
                {h.meaning}
              </p>
              <p className="text-[15px] leading-relaxed">
                <strong className="text-gold">কীভাবে সাবধান থাকবে: </strong>
                {h.handling}
              </p>
              {examples.length > 0 && (
                <div>
                  <p className="label mb-1">যেসব রাসায়নিকের গায়ে এই সংকেত থাকে</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {examples.map((c) => (
                      <li key={c.id} className="rounded-full border border-line bg-raised/70 px-2.5 py-0.5 text-sm">
                        {c.nameBn}
                        {c.formula && (
                          <>
                            {' '}
                            (<Formula>{c.formula}</Formula>)
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'match' && (
          <section className="panel panel-pad space-y-4" aria-label="মিলিয়ে দেখো">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                এই বোতলের গায়ে কোন বিপদ সংকেত থাকা উচিত? · সঠিক: {bn(matched.size)}/{bn(LAB_CHEMICALS.length)} · চেষ্টা: {bn(tries)}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-raised/60 p-4 text-center" aria-live="polite">
              <p className="text-2xl font-bold">{chemical.nameBn}</p>
              {chemical.formula && (
                <p className="mt-1 font-mono text-lg text-gold">
                  <Formula>{chemical.formula}</Formula>
                </p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-9">
              {HAZARDS.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  className={cx(
                    'flex flex-col items-center gap-1 rounded-xl border p-1.5 text-[11px] font-semibold transition',
                    pick === z.id && right && 'border-block-p bg-block-p/15',
                    pick === z.id && !right && 'border-danger bg-danger/15',
                    pick !== null && pick !== z.id && hasHazard(chemical, z.id) && 'border-block-p',
                    pick === null && 'border-line hover:border-accent/60',
                    pick !== null && pick !== z.id && !hasHazard(chemical, z.id) && 'border-line opacity-50',
                  )}
                  aria-label={z.nameBn}
                  aria-pressed={pick === z.id}
                  disabled={pick !== null}
                  onClick={() => answer(z.id)}
                >
                  <Pictogram id={z.id} className="h-12 w-12" decorative />
                  <span className="text-muted">{z.nameBn}</span>
                </button>
              ))}
            </div>
            {pick !== null && (
              <div className="space-y-2" aria-live="polite">
                <p className={cx('text-[15px] font-semibold', right ? 'text-block-p' : 'text-danger')}>
                  {right ? 'ঠিক!' : 'হয়নি।'} {chemical.nameBn}-এর সংকেত: {chemical.hazards.map((x) => hazardById(x).nameBn).join(', ')}।
                </p>
                <p className="text-[15px] leading-relaxed">{chemical.note}</p>
                <button type="button" className="btn-primary px-5" onClick={nextChemical}>
                  পরের রাসায়নিক
                </button>
              </div>
            )}
          </section>
        )}

        {tab === 'rules' && (
          <section className="panel panel-pad space-y-3" aria-label="নিরাপদ না অনিরাপদ">
            <p className="text-sm text-muted">
              প্রতিটি কাজ ল্যাবে নিরাপদ, না অনিরাপদ? · সঠিক: {bn(rulesRight)}/{bn(LAB_RULES.length)}
            </p>
            <ol className="space-y-2">
              {LAB_RULES.map((r, i) => {
                const given = ruleAnswers[i];
                const done = given !== undefined;
                const ok = done && given === r.safe;
                return (
                  <li
                    key={i}
                    className={cx('rounded-xl border p-3', !done ? 'border-line' : ok ? 'border-block-p/60' : 'border-danger/60')}
                  >
                    <p className="text-[15px] font-semibold">{r.text}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[true, false].map((v) => (
                        <button
                          key={String(v)}
                          type="button"
                          className="chip"
                          aria-pressed={given === v}
                          disabled={done}
                          onClick={() => setRuleAnswers((a) => ({ ...a, [i]: v }))}
                        >
                          {v ? 'নিরাপদ' : 'অনিরাপদ'}
                        </button>
                      ))}
                    </div>
                    {done && (
                      <p className="mt-2 text-sm" aria-live="polite">
                        <strong className={ok ? 'text-block-p' : 'text-danger'}>
                          {ok ? 'ঠিক।' : `ভুল: এটি ${r.safe ? 'নিরাপদ' : 'অনিরাপদ'}।`}
                        </strong>{' '}
                        {r.why}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        <ChallengeList items={challenges} />
      </div>
    </SimShell>
  );
}
