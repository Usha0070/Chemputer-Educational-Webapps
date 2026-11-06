// Ambient background sound, generated live with the Web Audio API (no audio file, nothing to license).
// A soft four-voice pad glides through a slow chord cycle under a gently breathing low-pass filter,
// with an occasional quiet "glass" chime from a pentatonic scale, all through a short echo.
// Loaded only when the visitor turns sound on (src/scripts/sound.ts).
export interface Ambient {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  readonly state: AudioContextState;
}

const LEVEL = 0.16; // master volume: deliberately quiet
const CHORDS = [
  [110.0, 164.81, 246.94, 261.63], // Am(add9)
  [87.31, 130.81, 164.81, 220.0], // Fmaj7
  [130.81, 196.0, 293.66, 329.63], // C(add9)
  [98.0, 146.83, 246.94, 329.63], // G6
];
const CHIMES = [440, 523.25, 587.33, 659.25, 783.99, 880]; // A minor pentatonic

export function createAmbient(): Ambient {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -18;
  limiter.ratio.value = 6;
  master.connect(limiter).connect(ctx.destination);

  // a short echo for space
  const echo = ctx.createDelay(1.5);
  echo.delayTime.value = 0.42;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.38;
  const echoTone = ctx.createBiquadFilter();
  echoTone.type = 'lowpass';
  echoTone.frequency.value = 1800;
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  echo.connect(echoTone).connect(feedback).connect(echo);
  echoTone.connect(wet).connect(master);

  // pad: four voices, each two slightly detuned oscillators
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 700;
  tone.Q.value = 0.7;
  tone.connect(master);
  tone.connect(echo);
  const breathe = ctx.createOscillator();
  breathe.frequency.value = 0.045;
  const breatheDepth = ctx.createGain();
  breatheDepth.gain.value = 320;
  breathe.connect(breatheDepth).connect(tone.frequency);
  breathe.start();

  const voices = CHORDS[0]!.map((f, i) => {
    const gain = ctx.createGain();
    gain.gain.value = 0.07;
    gain.connect(tone);
    const oscs = [-6, 6].map((cents, k) => {
      const o = ctx.createOscillator();
      o.type = k === 0 ? 'sine' : 'triangle';
      o.frequency.value = f;
      o.detune.value = cents;
      o.connect(gain);
      o.start();
      return o;
    });
    // each voice swells on its own slow cycle
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.03 + i * 0.011;
    const swellDepth = ctx.createGain();
    swellDepth.gain.value = 0.03;
    swell.connect(swellDepth).connect(gain.gain);
    swell.start();
    return oscs;
  });

  let chord = 0;
  let timers: number[] = [];
  const nextChord = () => {
    chord = (chord + 1) % CHORDS.length;
    const t = ctx.currentTime;
    voices.forEach((oscs, i) => {
      for (const o of oscs) o.frequency.setTargetAtTime(CHORDS[chord]![i]!, t, 2.2);
    });
  };
  const chime = () => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = CHIMES[Math.floor(Math.random() * CHIMES.length)]!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.035, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    o.connect(g);
    g.connect(echo);
    g.connect(master);
    o.start(t);
    o.stop(t + 3.3);
  };
  const schedule = () => {
    timers.push(window.setInterval(nextChord, 11000));
    const loop = () => {
      chime();
      timers.push(window.setTimeout(loop, 4000 + Math.random() * 6000));
    };
    timers.push(window.setTimeout(loop, 2500));
  };
  const clear = () => {
    for (const id of timers) {
      window.clearTimeout(id);
      window.clearInterval(id);
    }
    timers = [];
  };

  return {
    get state() {
      return ctx.state;
    },
    async start() {
      await ctx.resume();
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(LEVEL, t + 2.5);
      clear();
      schedule();
    },
    async stop() {
      clear();
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + 0.6);
      await new Promise((r) => window.setTimeout(r, 650));
      if (ctx.state === 'running') await ctx.suspend();
    },
  };
}
