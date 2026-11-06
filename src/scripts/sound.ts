// Header sound toggle. Off by default; the choice is remembered on this device.
// Browsers only allow sound after the visitor interacts with the page, so when sound was left on, the next page
// shows the button as on (gently pulsing) and the music fades in at the first tap, click or key press.
// The sound engine (./ambient) is downloaded only when it is first needed, and it pauses while the tab is hidden.
import type { Ambient } from './ambient';

const KEY = 'chemputer:sound';
const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]')];
let on = false;
try {
  on = localStorage.getItem(KEY) === 'on';
} catch {
  /* storage blocked */
}
let engine: Promise<Ambient> | null = null;
let playing = false;

const getEngine = () => (engine ??= import('./ambient').then((m) => m.createAmbient()));

function render() {
  for (const b of buttons) {
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'পটভূমির শব্দ বন্ধ করো' : 'পটভূমির শব্দ চালু করো');
    b.dataset.waiting = String(on && !playing);
    b.title = on && !playing ? 'শব্দ শুরু হবে পাতার যেকোনো জায়গায় ছুঁলে' : on ? 'পটভূমির শব্দ বন্ধ করো' : 'পটভূমির শব্দ চালু করো';
  }
  document.documentElement.dataset.sound = on ? (playing ? 'playing' : 'waiting') : 'off';
}

async function play() {
  if (!on || document.hidden) return;
  const a = await getEngine();
  await a.start();
  playing = a.state === 'running';
  render();
}
async function silence() {
  playing = false;
  render();
  if (engine) await (await engine).stop();
}

function save() {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* not remembered */
  }
}

for (const b of buttons) {
  b.addEventListener('click', () => {
    on = !on;
    save();
    if (on) void play();
    else void silence();
    render();
  });
}

// Sound was left on: start at the first interaction with this page (not a click on the toggle itself).
if (on) {
  const first = (e: Event) => {
    if ((e.target as Element | null)?.closest?.('[data-sound-toggle]')) return;
    for (const t of ['pointerdown', 'keydown'] as const) window.removeEventListener(t, first, true);
    void play();
  };
  for (const t of ['pointerdown', 'keydown'] as const) window.addEventListener(t, first, true);
}

document.addEventListener('visibilitychange', () => {
  if (!on || !engine) return;
  if (document.hidden) {
    void engine.then((a) => a.stop());
    playing = false;
    render();
  } else {
    void play();
  }
});

render();
