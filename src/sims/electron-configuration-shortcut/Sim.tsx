// Electron-configuration shortcut: animates orbital filling for Z = 1–118,
// either with the "s s · ps ps · dps dps · fdps fdps" shortcut or the plain Aufbau order.
import { useMemo, useRef, useState } from 'react';
import {
  AUFBAU,
  EXCEPTIONS,
  MAX_Z,
  ORBITAL,
  SHORTCUT_ROWS,
  aufbauFill,
  bn,
  element,
  groundState,
  orbitalList,
  parseNumber,
  type ExceptionInfo,
  type FilledOrbital,
  type Occupancy,
  type Orbital,
} from '@/chem';
import {
  BLOCK,
  Callout,
  ConfigLine,
  Rich,
  Segmented,
  SimShell,
  StepControls,
  ZForm,
  cx,
  useActive,
  useSteps,
  useUrlInit,
  writeParams,
  type SegmentedOption,
} from '@/ui';

type Mode = 'shortcut' | 'normal';
type Step = { kind: 'skeleton'; phase: 0 | 1 | 2 } | { kind: 'order' } | { kind: 'fill'; i: number } | { kind: 'exception' };
interface Ctx {
  z: number;
  filled: FilledOrbital[];
  finalOcc: Occupancy;
  exception: ExceptionInfo | null;
}
interface CellView {
  numbered: boolean;
  e: number;
  state: 'dim' | 'idle' | 'new' | 'current' | 'exception';
  showZero?: boolean;
}

const EXAMPLES = [8, 19, 26, 24, 29, 35, 46, 79, 92];
const STEP_MS = 1100;
const MODES: SegmentedOption<Mode>[] = [
  { value: 'shortcut', label: 'শর্টকাট নিয়ম', icon: 'bolt' },
  { value: 'normal', label: 'আউফবাউ নীতি' },
];
const SKELETON_TEXT = [
  'প্রথমে s, p, d, f-এর ক্রম জোড়ায় জোড়ায় লিখি: s s · ps ps · dps dps · fdps fdps',
  'এবার শুধু s অরবিটালগুলোর আগে ক্রমানুসারে ১ থেকে ৮ বসাই।',
  'বাকিগুলোতে সংখ্যা বসাই: p = s − ১, d = s − ২, f = s − ৩। তৈরি হয়ে গেল শক্তির ক্রম!',
];

function buildSteps(z: number, mode: Mode): Step[] {
  if (!z) return [];
  const steps: Step[] = mode === 'shortcut' ? ([0, 1, 2] as const).map((phase) => ({ kind: 'skeleton', phase })) : [{ kind: 'order' }];
  aufbauFill(z).forEach((_, i) => steps.push({ kind: 'fill', i }));
  if (EXCEPTIONS[z]) steps.push({ kind: 'exception' });
  return steps;
}

/** What one orbital box shows at a given step. */
function cellView(o: Orbital, idx: number, step: Step | undefined, ctx: Ctx): CellView {
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
      return { numbered: true, e: ctx.filled[idx]?.e ?? 0, state: idx === step.i ? 'current' : 'idle' };
    default: {
      // exception step: show the real ground state
      const moved = ctx.exception?.moves.some(([from, to]) => from === o.id || to === o.id) ?? false;
      const e = ctx.finalOcc[o.id] ?? 0;
      return { numbered: true, e, state: moved ? 'exception' : idx < ctx.filled.length ? 'idle' : 'dim', showZero: moved };
    }
  }
}

function Cell({ o, view, showNl }: { o: Orbital; view: CellView; showNl: boolean }) {
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

function StepText({ step, ctx }: { step: Step | undefined; ctx: Ctx }) {
  if (!step) return <>পারমাণবিক সংখ্যা লিখে “শুরু করো” চাপো, অথবা ওপরের যেকোনো উদাহরণে ক্লিক করো।</>;
  if (step.kind === 'skeleton') return <>{SKELETON_TEXT[step.phase]}</>;
  if (step.kind === 'order') {
    return <>আউফবাউ নীতি: (n + l)-এর মান যত কম, অরবিটালের শক্তি তত কম। মান সমান হলে যার n কম, সেটি আগে পূর্ণ হয়।</>;
  }
  if (step.kind === 'fill') {
    const o = ctx.filled[step.i]!;
    const used = ctx.filled.slice(0, step.i + 1).reduce((sum, x) => sum + x.e, 0);
    const left = ctx.z - used;
    const id = <span className="orb-token font-semibold text-accent">{o.id}</span>;
    if (left > 0)
      return (
        <>
          {id} অরবিটালে {bn(o.e)}টি ইলেকট্রন প্রবেশ করল। বাকি রইল {bn(left)}টি।
        </>
      );
    return (
      <>
        {id} অরবিটালে শেষ {bn(o.e)}টি ইলেকট্রন প্রবেশ করল।{' '}
        {ctx.exception ? 'তবে এই মৌলে একটি ব্যতিক্রম আছে, পরের ধাপ দেখো!' : 'বিন্যাস সম্পন্ন!'}
      </>
    );
  }
  return (
    <>
      <strong className="text-exc">ব্যতিক্রম! </strong>
      <Rich text={ctx.exception?.note ?? ''} />
    </>
  );
}

export default function ElectronConfigurationShortcut() {
  const shellRef = useRef<HTMLDivElement>(null);
  const active = useActive(shellRef);
  const [mode, setMode] = useState<Mode>('shortcut');
  const [input, setInput] = useState('');
  const [z, setZ] = useState(0);
  const [error, setError] = useState('');

  const steps = useMemo(() => buildSteps(z, mode), [z, mode]);
  const player = useSteps(steps.length, { intervalMs: STEP_MS, active });
  const ctx = useMemo<Ctx>(
    () => ({ z, filled: z ? aufbauFill(z) : [], finalOcc: z ? groundState(z) : {}, exception: EXCEPTIONS[z] ?? null }),
    [z],
  );
  const step = steps[player.at];

  // Shared links: ?z=24 (and ?mode=normal) open that element, ready to play.
  useUrlInit((params) => {
    const urlZ = parseNumber(params.get('z') ?? '');
    if (urlZ >= 1 && urlZ <= MAX_Z) {
      setInput(String(urlZ));
      setZ(urlZ);
    }
    if (params.get('mode') === 'normal') setMode('normal');
  });

  const start = (n: number) => {
    setError('');
    setInput(String(n));
    setZ(n);
    player.restart(true);
    writeParams({ z: n });
  };
  const submit = () => {
    const n = parseNumber(input);
    if (n >= 1 && n <= MAX_Z) start(n);
    else setError(`১ থেকে ${bn(MAX_Z)} এর মধ্যে একটি পারমাণবিক সংখ্যা লেখো।`);
  };
  const changeMode = (m: Mode) => {
    setMode(m);
    player.restart(false);
    writeParams({ mode: m === 'normal' ? 'normal' : null });
  };
  const reset = () => {
    setMode('shortcut');
    setInput('');
    setZ(0);
    setError('');
    player.restart(false);
    writeParams({ z: null, mode: null });
  };

  const el = z ? element(z) : null;
  const fillIndex = step?.kind === 'fill' ? step.i : step?.kind === 'exception' ? ctx.filled.length - 1 : -1;
  const movedIds = new Set(ctx.exception?.moves.flatMap(([from, to]) => [from, to]) ?? []);
  const currentTokens = step?.kind === 'exception' ? orbitalList(ctx.finalOcc, 'aufbau') : ctx.filled.slice(0, fillIndex + 1);

  const renderCell = (id: string) => {
    const o = ORBITAL[id]!;
    const idx = AUFBAU.findIndex((x) => x.id === id);
    return <Cell key={id} o={o} view={cellView(o, idx, step, ctx)} showNl={mode === 'normal'} />;
  };

  return (
    <SimShell ref={shellRef} label="ইলেকট্রন বিন্যাসের শর্টকাট" onReset={reset}>
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
                  {EXCEPTIONS[q] && <span className="h-1.5 w-1.5 rounded-full bg-exc" title="ব্যতিক্রম" />}
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
                {ctx.exception && (
                  <span className="rounded-full border border-exc/40 bg-exc/10 px-2 py-0.5 text-xs font-semibold text-exc">ব্যতিক্রম</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-muted">{mode === 'shortcut' ? 'শর্টকাট নিয়মে শক্তির ক্রম' : 'আউফবাউ নীতিতে শক্তির ক্রম'}</p>
            )}
            {steps.length > 0 && (
              <span className="font-mono text-sm text-muted">
                ধাপ {bn(player.at + 1)} / {bn(steps.length)}
              </span>
            )}
          </div>

          <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-line bg-bg/70 px-2 py-6 sm:min-h-[300px] sm:px-6">
            {mode === 'shortcut' ? (
              <div className="flex flex-col items-center gap-2.5 sm:gap-3.5">
                {SHORTCUT_ROWS.map((pairs, r) => (
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
              step?.kind === 'exception' ? 'border-exc/40 bg-exc/10 text-ink' : 'border-line bg-raised/60 text-ink/90',
            )}
            aria-live="polite"
          >
            <StepText step={step} ctx={ctx} />
          </p>

          <div className="mt-4">
            <StepControls steps={player} />
          </div>
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
                          step?.kind === 'exception' && movedIds.has(o.id) && 'bg-exc/15 px-1.5 font-semibold text-exc',
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
            {player.done && (
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
    </SimShell>
  );
}
