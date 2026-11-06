// Reaction rate: the Arrhenius factor, and a small 2D particle box (collision theory) the simulation draws.

/** Gas constant in kJ mol⁻¹ K⁻¹ */
export const R_KJ = 8.314e-3;

/** Fraction of collisions with at least Ea of energy (Boltzmann factor): e^(−Ea/RT). */
export const fractionAbove = (eaKJ: number, tempK: number): number => Math.exp(-eaKJ / (R_KJ * tempK));

/** Arrhenius rate constant k = A·e^(−Ea/RT). */
export const rateConstant = (a: number, eaKJ: number, tempK: number): number => a * fractionAbove(eaKJ, tempK);

/** How many times faster a reaction goes at T2 than at T1. */
export const rateRatio = (eaKJ: number, t1: number, t2: number): number => fractionAbove(eaKJ, t2) / fractionAbove(eaKJ, t1);

// ── Particle box ────────────────────────────────────────────────────────────

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: 'A' | 'B' | 'P';
}

export interface BoxParams {
  width: number;
  height: number;
  /** temperature in K (sets the speed scale) */
  temperature: number;
  /** activation energy in kJ/mol (lowered by a catalyst) */
  ea: number;
  catalyst: boolean;
  /** particle radius in px */
  radius: number;
  /** solid reactant B as a lump (false) or powder (true): changes how much of B is exposed */
  powder: boolean;
}

export interface Box {
  particles: Particle[];
  /** B atoms locked in a solid lump (surface-area demo) */
  solid: { x: number; y: number }[];
  time: number;
  collisions: number;
  reactions: number;
  /** product count over time for the rate graph */
  history: { t: number; products: number }[];
}

/** Catalysts provide a lower-energy route: here Ea falls by 40 %. */
export const effectiveEa = (p: Pick<BoxParams, 'ea' | 'catalyst'>): number => (p.catalyst ? p.ea * 0.6 : p.ea);

/**
 * Teaching scale: the chance that a collision reacts is the Boltzmann factor for a scaled activation energy,
 * so a change of 10–20 K or a catalyst makes a visible difference within seconds.
 */
export function reactProbability(p: Pick<BoxParams, 'ea' | 'catalyst' | 'temperature'>): number {
  return Math.min(1, fractionAbove(effectiveEa(p) / 4, p.temperature) * 60);
}

/** Mean speed in px/s for a temperature (∝ √T). */
export const speedFor = (tempK: number): number => 60 * Math.sqrt(tempK / 300);

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** A new box with `nA` particles of A and `nB` of B (as gas, or partly locked in a solid lump when !powder). */
export function createBox(p: BoxParams, nA: number, nB: number, rand: () => number): Box {
  const particles: Particle[] = [];
  const s = speedFor(p.temperature);
  const add = (kind: 'A' | 'B') =>
    particles.push({
      x: p.radius + rand() * (p.width - 2 * p.radius),
      y: p.radius + rand() * (p.height - 2 * p.radius),
      vx: gaussian(rand) * s * 0.7,
      vy: gaussian(rand) * s * 0.7,
      kind,
    });
  for (let i = 0; i < nA; i++) add('A');
  const solid: { x: number; y: number }[] = [];
  if (p.powder) for (let i = 0; i < nB; i++) add('B');
  else {
    // a compact square lump in the middle of the floor
    const side = Math.ceil(Math.sqrt(nB));
    const d = p.radius * 2.1;
    const x0 = p.width / 2 - (side * d) / 2;
    const y0 = p.height - side * d - 4;
    for (let i = 0; i < nB; i++) solid.push({ x: x0 + (i % side) * d + p.radius, y: y0 + Math.floor(i / side) * d + p.radius });
  }
  return { particles, solid, time: 0, collisions: 0, reactions: 0, history: [{ t: 0, products: 0 }] };
}

/** Advances the box by dt seconds (moves, bounces, collides, reacts). Mutates and returns the box. */
export function stepBox(box: Box, p: BoxParams, dt: number, rand: () => number): Box {
  const r = p.radius;
  const prob = reactProbability(p);
  const target = speedFor(p.temperature);
  for (const q of box.particles) {
    // gentle thermostat: speeds drift toward the temperature's typical speed
    const sp = Math.hypot(q.vx, q.vy) || 1;
    const k = 1 + (target / sp - 1) * Math.min(1, dt * 0.8);
    q.vx *= k;
    q.vy *= k;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    if (q.x < r) {
      q.x = r;
      q.vx = Math.abs(q.vx);
    }
    if (q.x > p.width - r) {
      q.x = p.width - r;
      q.vx = -Math.abs(q.vx);
    }
    if (q.y < r) {
      q.y = r;
      q.vy = Math.abs(q.vy);
    }
    if (q.y > p.height - r) {
      q.y = p.height - r;
      q.vy = -Math.abs(q.vy);
    }
  }
  // A–B collisions (gas phase) and A hitting the exposed surface of the solid lump
  const parts = box.particles;
  for (let i = 0; i < parts.length; i++) {
    const a = parts[i]!;
    if (a.kind !== 'A') continue;
    for (let j = 0; j < parts.length; j++) {
      const b = parts[j]!;
      if (b.kind !== 'B') continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (dx * dx + dy * dy > 4 * r * r) continue;
      box.collisions++;
      if (rand() < prob) {
        a.kind = 'P';
        b.kind = 'P';
        b.vx = a.vx = (a.vx + b.vx) / 2;
        b.vy = a.vy = (a.vy + b.vy) / 2;
        b.x = a.x + (dx > 0 ? 2 * r : -2 * r);
        box.reactions++;
        break; // this A is used up
      } else {
        // elastic bounce
        const dist = Math.hypot(dx, dy) || 1;
        const nx = dx / dist;
        const ny = dy / dist;
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rel > 0) {
          a.vx -= rel * nx;
          a.vy -= rel * ny;
          b.vx += rel * nx;
          b.vy += rel * ny;
        }
      }
    }
    // only the outer atoms of the lump are reachable
    if (a.kind !== 'A') continue;
    for (let s = box.solid.length - 1; s >= 0; s--) {
      const site = box.solid[s]!;
      const dx = site.x - a.x;
      const dy = site.y - a.y;
      if (dx * dx + dy * dy > 4 * r * r) continue;
      box.collisions++;
      if (rand() < prob) {
        a.kind = 'P';
        box.solid.splice(s, 1);
        box.reactions++;
        break;
      }
      a.vx = -a.vx;
      a.vy = -a.vy;
    }
  }
  box.time += dt;
  const last = box.history[box.history.length - 1]!;
  if (box.time - last.t >= 0.25) box.history.push({ t: box.time, products: box.reactions });
  if (box.history.length > 400) box.history.shift();
  return box;
}

/** Products formed per second over the last `window` seconds of the history. */
export function recentRate(box: Box, window = 2): number {
  const h = box.history;
  const end = h[h.length - 1]!;
  const start = [...h].reverse().find((x) => end.t - x.t >= window) ?? h[0]!;
  return end.t > start.t ? (end.products - start.products) / (end.t - start.t) : 0;
}
