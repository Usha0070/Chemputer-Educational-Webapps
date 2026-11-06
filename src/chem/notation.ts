// Chemical typography: turns plain text such as "Al2(SO4)3", "SO4^2-" or "2H2 + O2 -> 2H2O"
// into typed segments that the <Formula> and <Equation> components render with real sub/superscripts.

export type Segment =
  { kind: 'text'; value: string } | { kind: 'sub'; value: string } | { kind: 'sup'; value: string } | { kind: 'state'; value: string };

const STATE = /^\((s|l|g|aq)\)/;
const MINUS = '−';

/**
 * Formula rules:
 * - digits right after a letter, ")" or "]" are subscripts: H2SO4 → H₂SO₄
 * - digits at the start, after a space, "·" or "*" are coefficients: 2H2O, CuSO4·5H2O
 * - "^" starts a superscript charge: SO4^2-, Fe^3+, e^-
 * - (s) (l) (g) (aq) are state symbols
 */
export function tokenizeFormula(input: string): Segment[] {
  const out: Segment[] = [];
  const push = (kind: Segment['kind'], value: string) => {
    const prev = out[out.length - 1];
    if (prev && prev.kind === kind && kind === 'text') prev.value += value;
    else out.push({ kind, value } as Segment);
  };
  let i = 0;
  while (i < input.length) {
    const ch = input[i]!;
    const rest = input.slice(i);
    const state = STATE.exec(rest);
    if (state) {
      push('state', `(${state[1]})`);
      i += state[0].length;
      continue;
    }
    if (ch === '^') {
      let j = i + 1;
      let value = '';
      while (j < input.length && /[0-9+\-−]/.test(input[j]!)) value += input[j++];
      push('sup', value.replace(/-/g, MINUS));
      i = j;
      continue;
    }
    if (/\d/.test(ch)) {
      let j = i;
      let digits = '';
      while (j < input.length && /\d/.test(input[j]!)) digits += input[j++];
      const prev = i > 0 ? input[i - 1]! : '';
      push(/[A-Za-z)\]]/.test(prev) ? 'sub' : 'text', digits);
      i = j;
      continue;
    }
    push('text', ch === '*' ? '·' : ch);
    i += 1;
  }
  return out;
}

export type EquationPart =
  { kind: 'species'; formula: string } | { kind: 'plus' } | { kind: 'arrow'; arrow: '→' | '⇌' | '='; over?: string; under?: string };

const ARROW = /\s*(-\[([^\]]*)\](?:\[([^\]]*)\])?->|<=>|<->|->|→|⇌|=)\s*/;

/**
 * Equation rules: species separated by " + " (with spaces); arrows "->", "<=>" (reversible) or "=".
 * Conditions go above the arrow with "-[Δ]->" and below with "-[Δ][MnO2]->".
 */
export function tokenizeEquation(input: string): EquationPart[] {
  const parts: EquationPart[] = [];
  let rest = input.trim();
  const pushSide = (side: string) => {
    side
      .split(/\s+\+\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((formula, idx) => {
        if (idx > 0) parts.push({ kind: 'plus' });
        parts.push({ kind: 'species', formula });
      });
  };
  for (;;) {
    const m = ARROW.exec(rest);
    if (!m) {
      pushSide(rest);
      break;
    }
    pushSide(rest.slice(0, m.index));
    const token = m[1]!;
    const arrow = token === '<=>' || token === '<->' || token === '⇌' ? '⇌' : token === '=' ? '=' : '→';
    parts.push({ kind: 'arrow', arrow, ...(m[2] ? { over: m[2] } : {}), ...(m[3] ? { under: m[3] } : {}) });
    rest = rest.slice(m.index + m[0].length);
  }
  return parts;
}

const SUB_DIGITS = '₀₁₂₃₄₅₆₇₈₉';
const SUP_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '−': '⁻',
}; // prettier-ignore

/** Plain Unicode version for titles, aria-labels and meta tags: "SO4^2-" → "SO₄²⁻". */
export function formulaToUnicode(input: string): string {
  return tokenizeFormula(input)
    .map((s) => {
      if (s.kind === 'sub') return s.value.replace(/\d/g, (d) => SUB_DIGITS[Number(d)]!);
      if (s.kind === 'sup') return [...s.value].map((c) => SUP_MAP[c] ?? c).join('');
      return s.value;
    })
    .join('');
}
