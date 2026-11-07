// সাবান: how fat and caustic soda make soap (saponification), why a soap molecule has an oil-loving tail and a
// water-loving head, how micelles lift grease, and why hard water gives scum instead of lather.
import { useState } from 'react';
import { SAPONIFICATION, bn, bnFixed, hardnessLabel, latherTest, saponify, type Cleaner } from '@/chem';
import { ChallengeList, Equation, Segmented, SimShell, Slider, cx, useSteps } from '@/ui';

const STEPS = [
  {
    title: '১. চর্বি আর কস্টিক সোডা',
    text: 'চর্বি বা তেলের একটি অণুতে গ্লিসারলের কাঠামোর সাথে তিনটি লম্বা ফ্যাটি এসিড শিকল এস্টার বন্ধনে যুক্ত থাকে। এর সাথে গরম NaOH দ্রবণ মেশানো হলো।',
  },
  {
    title: '২. সাবানীকরণ',
    text: 'OH⁻ আয়ন এস্টার বন্ধন ভেঙে দেয়। তিনটি শিকল আলাদা হয়ে Na⁺-এর সাথে সোডিয়াম স্টিয়ারেট (সাবান) হয়, আর পড়ে থাকে গ্লিসারল।',
  },
  {
    title: '৩. সাবানের অণু',
    text: 'সাবানের অণুর দুই প্রান্ত দুই রকম: লম্বা হাইড্রোকার্বন লেজ পানি এড়ায় কিন্তু তেলে মেশে, আর –COO⁻ মাথা পানিতে মেশে।',
  },
  {
    title: '৪. তেলের ফোঁটা ঘিরে মিসেল',
    text: 'ময়লা কাপড়ে ঘষলে সাবানের লেজগুলো তেলের ফোঁটায় ঢুকে যায়, মাথাগুলো থাকে বাইরে পানির দিকে। এই গোল গঠনকে মিসেল বলে।',
  },
  {
    title: '৫. ময়লা উঠে আসে',
    text: 'মিসেলের বাইরের সব মাথা ঋণাত্মক, তাই মিসেলগুলো একে অপরকে বিকর্ষণ করে পানিতে ভেসে থাকে; ধোয়ার পানির সাথে তেল-ময়লা চলে যায়।',
  },
  {
    title: '৬. খর পানিতে কী হয়',
    text: 'খর পানির Ca²⁺ ও Mg²⁺ আয়ন সাবানের দুটি করে অণুর সাথে যুক্ত হয়ে অদ্রবণীয় ক্যালসিয়াম স্টিয়ারেট তৈরি করে: সাদা গাদ বা স্কাম। সাবান নষ্ট হয়, ফেনা কম হয়।',
  },
];

/** A zig-zag hydrocarbon tail from (x, y) along angle `a` (radians). */
function tail(x: number, y: number, a: number, len = 46) {
  const pts: string[] = [];
  for (let i = 0; i <= 6; i++) {
    const d = (i / 6) * len;
    const off = i % 2 === 0 ? 0 : 3.5;
    pts.push(`${x + Math.cos(a) * d - Math.sin(a) * off},${y + Math.sin(a) * d + Math.cos(a) * off}`);
  }
  return pts.join(' ');
}

function SoapMolecule({ x, y, a, head = 'var(--electron)' }: { x: number; y: number; a: number; head?: string }) {
  return (
    <g>
      <polyline points={tail(x, y, a)} fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={x - Math.cos(a) * 6} cy={y - Math.sin(a) * 6} r="6" fill={head} />
    </g>
  );
}

function Stage({ at }: { at: number }) {
  if (at <= 1) {
    const split = at === 1;
    return (
      <svg
        viewBox="0 0 360 200"
        className="block w-full"
        role="img"
        aria-label={split ? 'চর্বির অণু ভেঙে সাবান ও গ্লিসারল' : 'চর্বির অণু ও NaOH'}
      >
        {/* glycerol backbone */}
        <rect x="40" y="40" width="14" height="120" rx="7" fill="var(--block-d)" opacity=".8" />
        <text x="47" y="185" textAnchor="middle" fontSize="12" className="fill-muted">
          গ্লিসারল
        </text>
        {[60, 100, 140].map((y, i) => (
          <g key={y} style={{ transform: split ? `translateX(${70 + i * 8}px)` : 'none', transition: 'transform 1s ease' }}>
            <circle cx="62" cy={y} r="6" fill={split ? 'var(--electron)' : 'var(--danger)'} />
            <polyline points={tail(70, y, 0, 120)} fill="none" stroke="var(--gold)" strokeWidth="2.5" />
            {split && (
              <text x="62" y={y - 10} textAnchor="middle" fontSize="11" className="fill-ink font-mono">
                Na⁺
              </text>
            )}
          </g>
        ))}
        {!split &&
          [0, 1, 2].map((i) => (
            <text key={i} x="300" y={70 + i * 40} fontSize="14" className="fill-ink font-mono font-semibold">
              NaOH
            </text>
          ))}
      </svg>
    );
  }
  if (at === 2) {
    return (
      <svg viewBox="0 0 360 200" className="block w-full" role="img" aria-label="একটি সাবানের অণু: তেলপ্রেমী লেজ ও পানিপ্রেমী মাথা">
        <polyline points={tail(110, 100, 0, 200)} fill="none" stroke="var(--gold)" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="96" cy="100" r="16" fill="var(--electron)" />
        <text x="96" y="105" textAnchor="middle" fontSize="11" className="fill-bg font-mono font-bold">
          COO⁻
        </text>
        <text x="96" y="140" textAnchor="middle" fontSize="12" className="fill-ink">
          পানিপ্রেমী মাথা
        </text>
        <text x="215" y="140" textAnchor="middle" fontSize="12" className="fill-ink">
          তেলপ্রেমী (পানি-বিদ্বেষী) লেজ
        </text>
        <text x="215" y="70" textAnchor="middle" fontSize="12" className="fill-muted font-mono">
          C₁₇H₃₅–
        </text>
      </svg>
    );
  }
  const lifted = at >= 4;
  const hard = at === 5;
  return (
    <svg
      viewBox="0 0 360 200"
      className="block w-full"
      role="img"
      aria-label={hard ? 'খর পানিতে স্কাম' : lifted ? 'মিসেল কাপড় থেকে উঠে আসছে' : 'তেলের ফোঁটা ঘিরে মিসেল'}
    >
      <rect x="0" y="150" width="360" height="50" fill="color-mix(in oklab, var(--muted) 25%, transparent)" />
      <text x="12" y="190" fontSize="12" className="fill-muted">
        কাপড়
      </text>
      {hard ? (
        <g>
          {[60, 140, 220, 300].map((x, i) => (
            <g key={x}>
              <text x={x} y={60 + (i % 2) * 20} textAnchor="middle" fontSize="13" className="fill-ink font-mono font-semibold">
                Ca²⁺
              </text>
              <rect x={x - 16} y={120 + (i % 2) * 8} width="32" height="12" rx="3" fill="#e5e7eb" opacity=".9" />
            </g>
          ))}
          <text x="180" y="105" textAnchor="middle" fontSize="13" className="fill-ink">
            অদ্রবণীয় স্কাম জমছে, ফেনা কম
          </text>
        </g>
      ) : (
        <g style={{ transform: lifted ? 'translateY(-55px)' : 'none', transition: 'transform 1.4s ease' }}>
          <circle cx="180" cy="125" r="34" fill="color-mix(in oklab, var(--data-2) 55%, transparent)" />
          <text x="180" y="129" textAnchor="middle" fontSize="12" className="fill-ink">
            তেল
          </text>
          {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2;
            const r = 52;
            return <SoapMolecule key={i} x={180 + Math.cos(a) * r} y={125 + Math.sin(a) * r} a={a + Math.PI} />;
          })}
        </g>
      )}
    </svg>
  );
}

export default function Soap() {
  const steps = useSteps(STEPS.length, { intervalMs: 3200 });
  const [fat, setFat] = useState(89);
  const [hardness, setHardness] = useState(0);
  const [cleaner, setCleaner] = useState<Cleaner>('soap');
  const [drops, setDrops] = useState(0);
  const [seen, setSeen] = useState({ hardLather: false, detergentHard: false });

  const s = saponify(fat);
  const test = latherTest(hardness, drops, cleaner);
  const addDrop = () => {
    const d = drops + 1;
    setDrops(d);
    const r = latherTest(hardness, d, cleaner);
    if (r.lather && hardness >= 180 && cleaner === 'soap') setSeen((x) => ({ ...x, hardLather: true }));
    if (r.lather && hardness >= 180 && cleaner === 'detergent' && d === 1) setSeen((x) => ({ ...x, detergentHard: true }));
  };
  const reset = () => {
    steps.restart();
    setFat(89);
    setHardness(0);
    setCleaner('soap');
    setDrops(0);
    setSeen({ hardLather: false, detergentHard: false });
  };

  const challenges = [
    { label: 'ছয়টি ধাপই দেখো', done: steps.done },
    { label: '৮৯০ g চর্বি থেকে কত গ্রাম সাবান হয়, ক্যালকুলেটরে বের করো', done: fat === 890 },
    { label: 'অত্যন্ত খর পানিতে (১৮০+) সাবানে ফেনা তুলতে কত ফোঁটা লাগে, দেখো', done: seen.hardLather },
    { label: 'একই খর পানিতে ডিটারজেন্ট এক ফোঁটাতেই ফেনা দেয় কি না, দেখো', done: seen.detergentHard },
  ];

  return (
    <SimShell label="সাবান কীভাবে তৈরি হয় ও ময়লা তোলে" steps={steps} onReset={reset}>
      <div className="space-y-5">
        <section className="panel panel-pad space-y-3" aria-label="ধাপে ধাপে">
          <Stage at={steps.at} />
          <div aria-live="polite">
            <p className="text-lg font-bold">{STEPS[steps.at]!.title}</p>
            <p className="mt-1 text-[15px] leading-relaxed">{STEPS[steps.at]!.text}</p>
          </div>
          {steps.at <= 1 && (
            <p className="rounded-xl border border-line bg-raised/60 px-3 py-2 text-[15px]">
              <Equation>{SAPONIFICATION}</Equation>
            </p>
          )}
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="panel panel-pad space-y-3" aria-label="সাবানীকরণের হিসাব">
            <p className="label">সাবানীকরণের হিসাব (চর্বি = গ্লিসারাইল ট্রাইস্টিয়ারেট, M = ৮৯০)</p>
            <Slider label="চর্বি" value={fat} min={89} max={890} step={89} onChange={setFat} format={(v) => `${bn(v)} g`} />
            <ul className="grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-4">
              <li className="rounded-xl border border-line bg-raised/60 p-2">
                <span className="block font-sans text-xs text-muted">চর্বি (মোল)</span>
                {bnFixed(s.fatMol, 2)}
              </li>
              <li className="rounded-xl border border-line bg-raised/60 p-2">
                <span className="block font-sans text-xs text-muted">NaOH লাগবে</span>
                {bnFixed(s.naohG, 1)} g
              </li>
              <li className="rounded-xl border border-line bg-raised/60 p-2">
                <span className="block font-sans text-xs text-muted">সাবান হবে</span>
                {bnFixed(s.soapG, 1)} g
              </li>
              <li className="rounded-xl border border-line bg-raised/60 p-2">
                <span className="block font-sans text-xs text-muted">গ্লিসারল</span>
                {bnFixed(s.glycerolG, 1)} g
              </li>
            </ul>
            <p className="text-xs text-muted">
              ভরের সংরক্ষণ: চর্বি + NaOH = {bnFixed(fat + s.naohG, 1)} g = সাবান + গ্লিসারল = {bnFixed(s.soapG + s.glycerolG, 1)} g
            </p>
          </section>

          <section className="panel panel-pad space-y-3" aria-label="ফেনা পরীক্ষা">
            <p className="label">ফেনা পরীক্ষা: ১০ mL পানিতে ফোঁটা ফোঁটা সাবান দ্রবণ দিয়ে ঝাঁকাও</p>
            <Slider
              label="পানির খরতা (mg/L CaCO₃)"
              value={hardness}
              min={0}
              max={300}
              step={30}
              onChange={(v) => {
                setHardness(v);
                setDrops(0);
              }}
              format={(v) => `${bn(v)} · ${hardnessLabel(v)}`}
            />
            <Segmented<Cleaner>
              label="কোনটি দিয়ে ধোবে"
              value={cleaner}
              onChange={(v) => {
                setCleaner(v);
                setDrops(0);
              }}
              options={[
                { value: 'soap', label: 'সাবান' },
                { value: 'detergent', label: 'ডিটারজেন্ট' },
              ]}
            />
            <div className="flex items-end gap-4">
              <svg
                viewBox="0 0 80 160"
                className="h-36 w-auto shrink-0"
                role="img"
                aria-label={test.lather ? 'ফেনা হয়েছে' : test.scum > 0 ? 'স্কাম জমছে' : 'এখনো ফেনা নেই'}
              >
                <path d="M15 10 V140 Q15 152 40 152 Q65 152 65 140 V10" fill="none" stroke="var(--line-strong)" strokeWidth="2.5" />
                <rect x="17" y="70" width="46" height="78" rx="6" fill="color-mix(in oklab, var(--electron) 18%, transparent)" />
                {test.lather &&
                  Array.from({ length: 9 }, (_, i) => (
                    <circle key={i} cx={22 + (i % 5) * 9} cy={64 - Math.floor(i / 5) * 9} r="6" fill="#f8fafc" stroke="#cbd5e1" />
                  ))}
                {Array.from({ length: Math.round(test.scum * 6) }, (_, i) => (
                  <rect key={i} x={20 + (i % 3) * 14} y={136 - Math.floor(i / 3) * 6} width="11" height="4" rx="1" fill="#e5e7eb" />
                ))}
              </svg>
              <div className="flex-1 space-y-2">
                <p className="font-mono text-sm">ফোঁটা: {bn(drops)}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-primary px-4" onClick={addDrop} disabled={test.lather}>
                    এক ফোঁটা দাও
                  </button>
                  <button type="button" className="btn-secondary px-4" onClick={() => setDrops(0)}>
                    নতুন পানি
                  </button>
                </div>
              </div>
            </div>
            <p className={cx('text-[15px]', test.lather ? 'text-block-p' : 'text-ink')} aria-live="polite">
              {test.lather
                ? `ফেনা হয়েছে! লেগেছে ${bn(drops)} ফোঁটা।`
                : test.scum > 0
                  ? 'সাবান Ca²⁺-এর সাথে বিক্রিয়া করে স্কাম তৈরি করছে; এখনো ফেনা নেই।'
                  : 'এখনো সাবান দেওয়া হয়নি।'}
              {test.lather && cleaner === 'soap' && hardness > 0 && ` প্রথম ${bn(test.dropsNeeded - 1)} ফোঁটা স্কাম তৈরিতে নষ্ট হলো।`}
            </p>
          </section>
        </div>
        <ChallengeList items={challenges} />
      </div>
    </SimShell>
  );
}
