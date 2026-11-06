// Electron-configuration shortcut: animates orbital filling for Z = 1–118,
// either with the "s s · ps ps · dps dps · fdps fdps" shortcut or the plain Aufbau order.
import { useEffect, useMemo, useState } from 'react';
import { AUFBAU, EXCEPTIONS, MAX_Z, ORBITAL, aufbauFill, bn, element, groundState, orbitalList, parseNumber } from '../lib/chem.js';
import { BLOCK, Callout, ConfigLine, Icon, Rich, Segmented, ZForm, cx, mount, readParam, writeParams } from '../ui/ui.jsx';

// The shortcut grid: each row is written as two identical "pairs".
const ROWS = [
  [['1s'], ['2s']],
  [['2p', '3s'], ['3p', '4s']],
  [['3d', '4p', '5s'], ['4d', '5p', '6s']],
  [['4f', '5d', '6p', '7s'], ['5f', '6d', '7p', '8s']],
];
const EXAMPLES = [8, 19, 26, 24, 29, 35, 46, 79, 92];
const STEP_MS = 1100;
const MODES = [
  { value: 'shortcut', label: 'শর্টকাট নিয়ম', icon: 'bolt' },
  { value: 'normal', label: 'আউফবাউ নীতি' },
];
const SKELETON_TEXT = [
  'প্রথমে s, p, d, f-এর ক্রম জোড়ায় জোড়ায় লিখি: s s · ps ps · dps dps · fdps fdps',
  'এবার শুধু s অরবিটালগুলোর আগে ক্রমানুসারে ১ থেকে ৮ বসাই।',
  'বাকিগুলোতে সংখ্যা বসাই: p = s − ১, d = s − ২, f = s − ৩। তৈরি হয়ে গেল শক্তির ক্রম!',
];

function buildSteps(z, mode) {
  if (!z) return [];
  const steps = mode === 'shortcut' ? [0, 1, 2].map((phase) => ({ kind: 'skeleton', phase })) : [{ kind: 'order' }];
  aufbauFill(z).forEach((_, i) => steps.push({ kind: 'fill', i }));
  if (EXCEPTIONS[z]) steps.push({ kind: 'exception' });
  return steps;
}

/** What one orbital box shows at a given step. */
function cellView(o, idx, step, ctx) {
  if (!step) return { numbered: true, e: 0, state: 'dim' };
  switch (step.kind) {
    case 'skeleton': {
      const numbered = step.phase === 2 || (step.phase === 1 && o.l === 's');
      const isNew = (step.phase === 1 && o.l === 's') || (step.phase === 2 && o.l !== 's');
      return { numbered, e: 0, state: isNew ? 'new' : 'idle' };
    }
    case 'order':
      return { numbered: true, e: 0, state: 'idle' };
    case 'fill':
      if (idx > step.i) return { numbered: true, e: 0, state: 'dim' };
      return { numbered: true, e: ctx.filled[idx].e, state: idx === step.i ? 'current' : 'idle' };
    default: {
      // exception step: show the real ground state
      const moved = ctx.exception.moves.some(([from, to]) => from === o.id || to === o.id);
      const e = ctx.finalOcc[o.id] ?? 0;
      return { numbered: true, e, state: moved ? 'exception' : idx < ctx.filled.length ? 'idle' : 'dim', showZero: moved };
    }
  }
}

function Cell({ o, view, showNl }) {
  return (
    <div className="orb" data-state={view.state}>
      <span className="leading-none">
        {view.numbered && <span className="text-ink/70">{o.n}</span>}
        <span className={cx('font-bold', BLOCK[o.l].text)}>{o.l}</span>
      </span>
      {showNl && <span className="mt-1 hidden font-sans text-[9px] leading-none text-muted sm:block">n+l={bn(o.nl)}</span>}
      {(view.e > 0 || view.showZero) && (
        <span key={view.e} className="orb-count">
          {bn(view.e)}
        </span>
      )}
    </div>
  );
}

function StepText({ step, ctx }) {
  if (!step) return <>পারমাণবিক সংখ্যা লিখে “শুরু করো” চাপো, অথবা ওপরের যেকোনো উদাহরণে ক্লিক করো।</>;
  if (step.kind === 'skeleton') return <>{SKELETON_TEXT[step.phase]}</>;
  if (step.kind === 'order') {
    return <>আউফবাউ নীতি: (n + l)-এর মান যত কম, অরবিটালের শক্তি তত কম। মান সমান হলে যার n কম, সেটি আগে পূর্ণ হয়।</>;
  }
  if (step.kind === 'fill') {
    const o = ctx.filled[step.i];
    const used = ctx.filled.slice(0, step.i + 1).reduce((sum, x) => sum + x.e, 0);
    const left = ctx.z - used;
    const id = <span className="orb-token font-semibold text-accent">{o.id}</span>;
    if (left > 0) return <>{id} অরবিটালে {bn(o.e)}টি ইলেকট্রন প্রবেশ করল। বাকি রইল {bn(left)}টি।</>;
    return (
      <>
        {id} অরবিটালে শেষ {bn(o.e)}টি ইলেকট্রন প্রবেশ করল।{' '}
        {ctx.exception ? 'তবে এই মৌলে একটি ব্যতিক্রম আছে, পরের ধাপ দেখো!' : 'বিন্যাস সম্পন্ন!'}
      </>
    );
  }
  return (
    <>
      <strong className="text-warn">ব্যতিক্রম! </strong>
      <Rich text={ctx.exception.note} />
    </>
  );
}

function App() {
  const urlZ = parseNumber(readParam('z') ?? '');
  const validUrlZ = urlZ >= 1 && urlZ <= MAX_Z ? urlZ : 0;
  const [mode, setMode] = useState(readParam('mode') === 'normal' ? 'normal' : 'shortcut');
  const [input, setInput] = useState(validUrlZ ? String(validUrlZ) : '');
  const [z, setZ] = useState(validUrlZ);
  const [error, setError] = useState('');
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);

  const steps = useMemo(() => buildSteps(z, mode), [z, mode]);
  const ctx = useMemo(
    () => ({ z, filled: z ? aufbauFill(z) : [], finalOcc: z ? groundState(z) : {}, exception: EXCEPTIONS[z] ?? null }),
    [z],
  );
  const step = steps[at];
  const last = steps.length - 1;
  const done = steps.length > 0 && at === last;

  // Autoplay
  useEffect(() => {
    if (!playing) return undefined;
    if (at >= last) {
      setPlaying(false);
      return undefined;
    }
    const t = setTimeout(() => setAt((i) => i + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, at, last]);

  // ← / → keys step through the animation
  useEffect(() => {
    const onKey = (e) => {
      if (!steps.length || e.target.closest?.('input, textarea')) return;
      if (e.key === 'ArrowRight') {
        setPlaying(false);
        setAt((i) => Math.min(i + 1, steps.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setPlaying(false);
        setAt((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [steps.length]);

  const start = (n) => {
    setError('');
    setInput(String(n));
    setZ(n);
    setAt(0);
    setPlaying(true);
    writeParams({ z: n });
  };
  const submit = () => {
    const n = parseNumber(input);
    if (n >= 1 && n <= MAX_Z) start(n);
    else setError(`১ থেকে ${bn(MAX_Z)} এর মধ্যে একটি পারমাণবিক সংখ্যা লেখো।`);
  };
  const changeMode = (m) => {
    setMode(m);
    setAt(0);
    setPlaying(false);
    writeParams({ mode: m === 'normal' ? 'normal' : null });
  };
  const togglePlay = () => {
    if (playing) setPlaying(false);
    else {
      if (done) setAt(0);
      setPlaying(true);
    }
  };

  const el = z ? element(z) : null;
  const fillIndex = step?.kind === 'fill' ? step.i : step?.kind === 'exception' ? ctx.filled.length - 1 : -1;
  const movedIds = new Set(ctx.exception?.moves.flatMap(([from, to]) => [from, to]) ?? []);
  const currentTokens =
    step?.kind === 'exception'
      ? orbitalList(ctx.finalOcc, 'aufbau')
      : ctx.filled.slice(0, fillIndex + 1);

  const renderCell = (id) => {
    const o = ORBITAL[id];
    const idx = AUFBAU.findIndex((x) => x.id === id);
    return <Cell key={id} o={o} view={cellView(o, idx, step, ctx)} showNl={mode === 'normal'} />;
  };

  return (
    <div className="space-y-5">
      <section className="panel panel-pad space-y-5" aria-label="ইনপুট">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <ZForm value={input} onChange={setInput} onSubmit={submit} max={MAX_Z} buttonLabel="শুরু করো" error={error} />
          <div className="flex flex-col gap-2">
            <span className="label">পদ্ধতি</span>
            <Segmented options={MODES} value={mode} onChange={changeMode} label="পদ্ধতি বেছে নাও" />
          </div>
        </div>
        <div>
          <p className="label mb-2">উদাহরণ</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((q) => (
              <button key={q} type="button" className="chip" aria-pressed={q === z} onClick={() => start(q)}>
                <span className="font-semibold text-ink">{element(q).symbol}</span>
                <span>{bn(q)}</span>
                {EXCEPTIONS[q] && <span className="h-1.5 w-1.5 rounded-full bg-warn" title="ব্যতিক্রম" />}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel panel-pad" aria-label="অ্যানিমেশন">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {el ? (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-lg bg-accent/15 px-2.5 py-1 font-mono text-base font-bold text-ink">{el.symbol}</span>
              <span className="font-semibold text-ink">{el.name}</span>
              <span className="text-muted">· পারমাণবিক সংখ্যা {bn(z)}</span>
              {ctx.exception && <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-xs font-semibold text-warn">ব্যতিক্রম</span>}
            </p>
          ) : (
            <p className="text-sm text-muted">{mode === 'shortcut' ? 'শর্টকাট নিয়মে শক্তির ক্রম' : 'আউফবাউ নীতিতে শক্তির ক্রম'}</p>
          )}
          {steps.length > 0 && (
            <span className="font-mono text-sm text-muted">
              ধাপ {bn(at + 1)} / {bn(steps.length)}
            </span>
          )}
        </div>

        <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-line bg-bg/70 px-2 py-6 sm:min-h-[300px] sm:px-6">
          {mode === 'shortcut' ? (
            <div className="flex flex-col items-center gap-2.5 sm:gap-3.5">
              {ROWS.map((pairs, r) => (
                <div key={r} className="flex justify-center gap-2.5 sm:gap-6">
                  {pairs.map((pair, p) => (
                    <div key={p} className="flex gap-1 sm:gap-2">
                      {pair.map(renderCell)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex max-w-3xl flex-wrap justify-center gap-2 sm:gap-3">{AUFBAU.map((o) => renderCell(o.id))}</div>
          )}
        </div>

        <p
          className={cx(
            'mt-5 min-h-[3.5rem] rounded-xl border px-4 py-3 text-center text-[15px] leading-relaxed sm:text-base',
            step?.kind === 'exception' ? 'border-warn/30 bg-warn/10 text-ink' : 'border-line bg-raised/60 text-ink/90',
          )}
          aria-live="polite"
        >
          <StepText step={step} ctx={ctx} />
        </p>

        <div className="mt-4 flex items-center gap-2">
          <button type="button" className="btn-icon" onClick={() => { setPlaying(false); setAt((i) => Math.max(i - 1, 0)); }} disabled={!steps.length || at === 0} aria-label="আগের ধাপ">
            <Icon name="chevronLeft" />
          </button>
          <button type="button" className="btn-primary flex-1 sm:w-44 sm:flex-none" onClick={togglePlay} disabled={!steps.length}>
            <Icon name={playing ? 'pause' : done ? 'rotate' : 'play'} className="h-4 w-4" />
            {playing ? 'থামাও' : done ? 'আবার দেখো' : 'চালাও'}
          </button>
          <button type="button" className="btn-icon" onClick={() => { setPlaying(false); setAt((i) => Math.min(i + 1, last)); }} disabled={!steps.length || done} aria-label="পরের ধাপ">
            <Icon name="chevronRight" />
          </button>
          <div className="ml-2 hidden h-1.5 flex-1 overflow-hidden rounded-full bg-line sm:block" aria-hidden="true">
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all duration-500" style={{ width: steps.length ? `${((at + 1) / steps.length) * 100}%` : '0%' }} />
          </div>
        </div>
        <p className="mt-2 hidden text-xs text-muted sm:block">টিপস: কিবোর্ডের ← → দিয়েও ধাপ বদলানো যায়।</p>
      </section>

      {z > 0 && (
        <section className="panel panel-pad space-y-4" aria-live="polite">
          <div>
            <h2 className="label mb-2">বর্তমান ইলেকট্রন বিন্যাস (শক্তির ক্রমে)</h2>
            <div className="rounded-xl border border-line bg-bg px-4 py-3">
              {currentTokens.length ? (
                <p className="flex flex-wrap gap-x-2 gap-y-2 font-mono text-lg leading-relaxed">
                  {currentTokens.map((o, i) => (
                    <span
                      key={o.id}
                      className={cx(
                        'orb-token rounded-md',
                        step?.kind === 'exception' && movedIds.has(o.id) && 'bg-warn/15 px-1.5 font-semibold text-warn',
                        step?.kind === 'fill' && i === fillIndex && 'bg-accent/15 px-1.5 font-semibold text-accent',
                      )}
                    >
                      {o.id}
                      <sup>{o.e}</sup>
                    </span>
                  ))}
                </p>
              ) : (
                <p className="text-muted">ইলেকট্রন প্রবেশ শুরু হলে এখানে বিন্যাস দেখা যাবে…</p>
              )}
            </div>
          </div>
          {done && (
            <div className="animate-fade-up space-y-4">
              <div>
                <h2 className="label mb-2">শক্তিস্তর অনুযায়ী সাজালে</h2>
                <div className="rounded-xl border border-line bg-bg px-4 py-3">
                  <ConfigLine list={orbitalList(ctx.finalOcc, 'shell')} className="text-lg" />
                </div>
              </div>
              {ctx.exception && (
                <Callout title="কেন ব্যতিক্রম?">
                  <Rich text={ctx.exception.note} />
                </Callout>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

mount(App);
