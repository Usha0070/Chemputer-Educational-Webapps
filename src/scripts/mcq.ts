// MCQ practice behaviour (markup: src/components/Mcq.astro). One try per question: the chosen option is marked right
// or wrong, the right answer and the reason appear, and when every question is answered the score is shown and the
// best score is remembered on this device (localStorage, key chemputer:mcq:<simulation id>).
import { bn } from '@/chem/format';

const KEY = 'chemputer:mcq:';

function readBest(id: string): number | null {
  try {
    const v = localStorage.getItem(KEY + id);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}
function writeBest(id: string, score: number) {
  try {
    localStorage.setItem(KEY + id, String(score));
  } catch {
    /* not remembered */
  }
}

export function mountMcqs(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-mcq]:not([data-ready])')) mount(root);
}

function mount(root: HTMLElement) {
  const id = root.dataset.mcq ?? '';
  const items = [...root.querySelectorAll<HTMLElement>('.mcq-q')];
  const bar = root.querySelector<HTMLElement>('.mcq-bar');
  const scoreText = root.querySelector<HTMLElement>('[data-mcq-score]');
  const reset = root.querySelector<HTMLButtonElement>('[data-mcq-reset]');
  if (!bar || !scoreText || !reset) return;
  const total = items.length;
  let answered = 0;
  let correct = 0;

  const showScore = () => {
    const best = readBest(id);
    const parts = [`স্কোর: ${bn(correct)}/${bn(total)}`];
    if (answered < total) parts.push(`(${bn(total - answered)}টি বাকি)`);
    if (best !== null) parts.push(`· তোমার সেরা: ${bn(best)}/${bn(total)}`);
    scoreText.textContent = parts.join(' ');
  };

  const clear = () => {
    answered = 0;
    correct = 0;
    for (const item of items) {
      delete item.dataset.result;
      for (const b of item.querySelectorAll<HTMLButtonElement>('.mcq-option')) {
        b.disabled = false;
        delete b.dataset.state;
        b.removeAttribute('aria-pressed');
      }
      const why = item.querySelector<HTMLDetailsElement>('.mcq-why');
      if (why) {
        why.open = false;
        why.hidden = true;
      }
    }
    showScore();
  };

  for (const item of items) {
    const answer = Number(item.dataset.answer);
    const options = [...item.querySelectorAll<HTMLButtonElement>('.mcq-option')];
    options.forEach((button, k) => {
      button.addEventListener('click', () => {
        if (item.dataset.result) return;
        const right = k === answer;
        item.dataset.result = right ? 'right' : 'wrong';
        button.setAttribute('aria-pressed', 'true');
        button.dataset.state = right ? 'right' : 'wrong';
        options[answer]!.dataset.state = 'right';
        for (const b of options) b.disabled = true;
        const why = item.querySelector<HTMLDetailsElement>('.mcq-why');
        if (why) {
          why.hidden = false;
          why.open = true;
        }
        answered++;
        if (right) correct++;
        if (answered === total) {
          const best = readBest(id);
          if (best === null || correct > best) writeBest(id, correct);
        }
        showScore();
      });
    });
  }
  reset.addEventListener('click', () => {
    clear();
    items[0]?.querySelector<HTMLButtonElement>('.mcq-option')?.focus();
  });

  bar.hidden = false;
  root.dataset.ready = 'true';
  clear();
}
