// Step-by-step "how do we get the period and group?" explanation.
// Shared by the calculator and the blocks tool so both explain things the same way.
import { BLOCK_RULES, bn } from '../lib/chem.js';
import { BLOCK, Orb, Rich, cx } from './ui.jsx';

function Step({ n, title, block, children }) {
  return (
    <li className="flex gap-3 sm:gap-4">
      <span className={cx('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-raised text-sm font-bold', BLOCK[block].border, BLOCK[block].text)}>
        {bn(n)}
      </span>
      <div className="min-w-0 flex-1 pb-1">
        <h3 className="font-semibold text-ink">{title}</h3>
        <div className="mt-1 text-[15px] leading-relaxed text-muted">{children}</div>
      </div>
    </li>
  );
}

function Calculation({ a }) {
  const { calc } = a;
  if (calc.kind === 'he' || calc.kind === 'f') {
    return <span>{calc.kind === 'f' ? 'f-ব্লক মৌল, তাই হিসাব ছাড়াই' : 'বিশেষ ক্ষেত্র, তাই'} গ্রুপ = {bn(a.group)}</span>;
  }
  const terms = calc.parts.map(([id, e]) => (
    <span key={id} className="inline-flex items-center">
      <Orb id={id} e={e} className={BLOCK[a.block].text} />
    </span>
  ));
  const numbers = calc.parts.map(([, e]) => bn(e));
  const sum = calc.kind === 'p' ? `১০ + (${numbers.join(' + ')})` : numbers.join(' + ');
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {calc.kind === 'p' && <span>১০ +</span>}
      {terms.reduce((acc, t, i) => (i ? [...acc, <span key={`plus-${i}`}>+</span>, t] : [t]), [])}
      <span aria-hidden="true">→</span>
      <span className="font-mono">
        {sum} = <strong className="text-ink">{bn(a.group)}</strong>
      </span>
    </span>
  );
}

export function GroupSteps({ a, showPeriod = true, showException = true }) {
  const b = BLOCK[a.block];
  let n = 0;
  return (
    <ol className="space-y-5">
      <Step n={++n} title="ব্লক চিহ্নিত করো" block={a.block}>
        আউফবাউ নীতি অনুযায়ী শেষ ইলেকট্রনটি <span className={cx('orb-token font-semibold', b.text)}>{a.lastId}</span> অরবিটালে প্রবেশ করে, তাই এটি{' '}
        <strong className={b.text}>{b.label}ের</strong> মৌল।
        {showException && a.exception && (
          <span className="mt-2 block rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-ink/85">
            <strong className="text-warn">ব্যতিক্রম: </strong>
            <Rich text={a.exception.note} />
          </span>
        )}
      </Step>
      {showPeriod && (
        <Step n={++n} title="পর্যায় নির্ণয় করো" block={a.block}>
          সর্বোচ্চ প্রধান শক্তিস্তর n = <strong className="text-ink">{bn(a.period)}</strong>, তাই মৌলটি <strong className="text-ink">{bn(a.period)} নম্বর পর্যায়ে</strong>।
        </Step>
      )}
      <Step n={++n} title={a.calc.kind === 'he' ? 'বিশেষ ক্ষেত্র' : `${b.label}ের নিয়ম`} block={a.block}>
        <span className={cx('mt-1 block rounded-lg border-l-4 bg-raised px-3 py-2 text-ink/90', b.border)}>
          <Rich text={a.calc.kind === 'he' ? BLOCK_RULES.he : BLOCK_RULES[a.block]} />
        </span>
      </Step>
      <Step n={++n} title="গণনা" block={a.block}>
        <Calculation a={a} />
      </Step>
    </ol>
  );
}

/** Big closing line: “তাই আয়রন ৮ নম্বর গ্রুপের মৌল।” */
export function GroupResult({ a }) {
  const b = BLOCK[a.block];
  return (
    <div className={cx('flex items-center justify-between gap-4 rounded-2xl border p-4 sm:p-5', b.border, b.soft)}>
      <p className="text-base text-ink sm:text-lg">
        তাই <strong>{a.name}</strong> হলো <strong className={b.text}>{bn(a.group)} নম্বর গ্রুপের</strong> মৌল।
      </p>
      <div className="text-center">
        <div className={cx('text-4xl font-bold leading-none sm:text-5xl', b.text)}>{bn(a.group)}</div>
        <div className="mt-1 text-xs font-medium text-muted">গ্রুপ</div>
      </div>
    </div>
  );
}
