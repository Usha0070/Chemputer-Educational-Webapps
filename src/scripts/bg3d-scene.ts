// The 3D molecular background scene: ball-and-stick molecules (benzene, methane, water, CO₂, ethene, ammonia, a
// graphene fragment) floating and turning in depth, joined by a faint network, leaning with the pointer and scrolling.
// Perspective projection on a 2D canvas, no WebGL library. Runs inside a Web Worker on an OffscreenCanvas when the
// browser allows (so it never touches the page's main thread), else on the page itself. See src/scripts/bg3d.ts.
type V = [number, number, number];
type Kind = 0 | 1 | 2; // 0 carbon-like (brand glow), 1 hetero atom (gold), 2 hydrogen (small, pale)
interface Template {
  atoms: { p: V; k: Kind }[];
  bonds: [number, number][];
}
interface Molecule {
  t: Template;
  pos: V;
  rot: V;
  spin: V;
  size: number;
  rise: number;
}

const ring = (n: number, r: number, k: Kind, phase = 0): { p: V; k: Kind }[] =>
  Array.from({ length: n }, (_, i) => {
    const a = phase + (i / n) * Math.PI * 2;
    return { p: [Math.cos(a) * r, Math.sin(a) * r, 0] as V, k };
  });
const cycle = (n: number, offset = 0) => Array.from({ length: n }, (_, i) => [offset + i, offset + ((i + 1) % n)] as [number, number]);

const TEMPLATES: Template[] = [
  // benzene
  {
    atoms: [...ring(6, 1.4, 0), ...ring(6, 2.45, 2)],
    bonds: [...cycle(6), ...Array.from({ length: 6 }, (_, i) => [i, i + 6] as [number, number])],
  },
  // methane
  {
    atoms: [
      { p: [0, 0, 0], k: 0 },
      { p: [0.9, 0.9, 0.9], k: 2 },
      { p: [0.9, -0.9, -0.9], k: 2 },
      { p: [-0.9, 0.9, -0.9], k: 2 },
      { p: [-0.9, -0.9, 0.9], k: 2 },
    ],
    bonds: [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ],
  },
  // water
  {
    atoms: [
      { p: [0, 0.2, 0], k: 1 },
      { p: [1.1, -0.65, 0], k: 2 },
      { p: [-1.1, -0.65, 0], k: 2 },
    ],
    bonds: [
      [0, 1],
      [0, 2],
    ],
  },
  // carbon dioxide
  {
    atoms: [
      { p: [0, 0, 0], k: 0 },
      { p: [1.6, 0, 0], k: 1 },
      { p: [-1.6, 0, 0], k: 1 },
    ],
    bonds: [
      [0, 1],
      [0, 2],
    ],
  },
  // ethene
  {
    atoms: [
      { p: [0.8, 0, 0], k: 0 },
      { p: [-0.8, 0, 0], k: 0 },
      { p: [1.5, 1.05, 0], k: 2 },
      { p: [1.5, -1.05, 0], k: 2 },
      { p: [-1.5, 1.05, 0], k: 2 },
      { p: [-1.5, -1.05, 0], k: 2 },
    ],
    bonds: [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 4],
      [1, 5],
    ],
  },
  // ammonia
  {
    atoms: [{ p: [0, 0.45, 0], k: 1 }, ...ring(3, 1.1, 2).map((a) => ({ p: [a.p[0], -0.35, a.p[1]] as V, k: a.k }))],
    bonds: [
      [0, 1],
      [0, 2],
      [0, 3],
    ],
  },
  // graphene fragment (two fused hexagons)
  {
    atoms: [...ring(6, 1.4, 0, Math.PI / 6), ...ring(6, 1.4, 0, Math.PI / 6).map((a) => ({ p: [a.p[0] + 2.42, a.p[1], 0] as V, k: a.k }))],
    bonds: [...cycle(6), ...cycle(6, 6)],
  },
];

export interface Colours {
  glow: string;
  gold: string;
  ink: string;
  motif: string;
}
export type SceneMessage =
  | { type: 'size'; width: number; height: number; dpr: number }
  | { type: 'theme'; colours: Colours; light: boolean }
  | { type: 'animated'; value: boolean }
  | { type: 'paused'; value: boolean }
  | { type: 'pointer'; tx: number; tp: number }
  | { type: 'scroll'; y: number };
export interface SceneInit {
  width: number;
  height: number;
  dpr: number;
  colours: Colours;
  light: boolean;
  dim: boolean;
  animated: boolean;
  /** 0 = full (30 fps), 1 = lighter (fewer molecules, 20 fps, 1× pixels); 2 = still, reached only by measuring */
  tier: number;
}
type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const FRAME_MS = [32, 50];
const BUDGET_MS = 8; // a frame that costs more than this on average steps the quality down

export function createScene(
  canvas: AnyCanvas,
  makeCanvas: (size: number) => AnyCanvas,
  onMode: (mode: 'animated' | 'static') => void,
  init: SceneInit,
): (msg: SceneMessage) => void {
  const ctx = canvas.getContext('2d') as Ctx;
  let { width: w, height: h, tier } = init;
  let dprWanted = init.dpr;
  let wantAnimated = init.animated;
  let paused = false;
  let light = init.light;
  let colours = init.colours;
  let sprites: AnyCanvas[] = [];
  let molecules: Molecule[] = [];
  let scrollY = 0;
  const view = { yaw: 0, pitch: 0, ty: 0, tp: 0 };
  let timer = 0;
  let last = 0;
  let time = 0;
  let cost = 0;
  let frames = 0;
  let mode = '';
  const animated = () => wantAnimated && tier < 2;
  const now = () => performance.now();
  const hasRaf = typeof requestAnimationFrame === 'function';
  const schedule = (cb: (t: number) => void): number =>
    hasRaf ? requestAnimationFrame(cb) : (setTimeout(() => cb(now()), 16) as unknown as number);
  const unschedule = (id: number) => (hasRaf ? cancelAnimationFrame(id) : clearTimeout(id));

  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const sprite = (colour: string, core: string) => {
    const s = makeCanvas(64);
    const g = s.getContext('2d') as Ctx;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, core);
    grad.addColorStop(0.22, colour);
    grad.addColorStop(0.5, colour + '55');
    grad.addColorStop(1, colour + '00');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return s;
  };
  function theme() {
    sprites = [
      sprite(colours.glow, light ? colours.glow : '#fff4ef'),
      sprite(colours.gold, light ? colours.gold : '#fffbe6'),
      sprite(colours.ink, colours.ink),
    ];
  }

  function populate() {
    const n = Math.round(Math.min(16, Math.max(6, (w * h) / 90000)) * (init.dim ? 0.6 : 1) * (tier >= 1 ? 0.6 : 1));
    const aspect = w / Math.max(1, h);
    seed = 7;
    molecules = Array.from({ length: n }, (_, i) => {
      const z = rand() * 7;
      const spread = 1 + z / 9;
      return {
        t: TEMPLATES[i % TEMPLATES.length]!,
        pos: [(rand() * 2 - 1) * 5.2 * aspect * spread, (rand() * 2 - 1) * 6 * spread, z],
        rot: [rand() * 6.28, rand() * 6.28, rand() * 6.28],
        spin: [(rand() - 0.5) * 0.3, (rand() - 0.5) * 0.4, (rand() - 0.5) * 0.2],
        size: 0.32 + rand() * 0.3,
        rise: 0.05 + rand() * 0.12,
      };
    });
  }

  function resize() {
    const dpr = tier >= 1 ? 1 : Math.min(dprWanted || 1, w < 700 ? 1.25 : 1.5);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    populate();
  }

  function rotate(p: V, r: V): V {
    const [x0, y0, z0] = p;
    const [a, b, c] = r;
    // X, then Y, then Z
    const y1 = y0 * Math.cos(a) - z0 * Math.sin(a);
    const z1 = y0 * Math.sin(a) + z0 * Math.cos(a);
    const x2 = x0 * Math.cos(b) + z1 * Math.sin(b);
    const z2 = -x0 * Math.sin(b) + z1 * Math.cos(b);
    const x3 = x2 * Math.cos(c) - y1 * Math.sin(c);
    const y3 = x2 * Math.sin(c) + y1 * Math.cos(c);
    return [x3, y3, z2];
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const D = 9;
    const F = 0.9 * h;
    const cx = w / 2;
    const cy = h / 2;
    const sy = animated() ? scrollY : 0; // no scroll parallax in the still (reduced-motion) frame
    const yaw = view.yaw + Math.sin(time * 0.05) * 0.12;
    const pitch = view.pitch + Math.min(1, sy / 4000) * 0.25;
    const lift = sy * 0.0016;
    const world: V = [0, 0, 3.5];
    const project = (p: V) => {
      const q = rotate([p[0] - world[0], p[1] - world[1] + lift, p[2] - world[2]], [pitch, yaw, 0]);
      const z = q[2] + world[2];
      const f = F / (z + D);
      return { x: cx + q[0] * f, y: cy - q[1] * f, z, f };
    };
    const placed = molecules
      .map((m) => {
        const centre = project(m.pos);
        const atoms = m.t.atoms.map((a) => {
          const r = rotate([a.p[0] * m.size, a.p[1] * m.size, a.p[2] * m.size], m.rot);
          return project([m.pos[0] + r[0], m.pos[1] + r[1], m.pos[2] + r[2]]);
        });
        return { m, centre, atoms };
      })
      .sort((a, b) => b.centre.z - a.centre.z);
    const fade = (z: number) => Math.max(0.1, Math.min(0.75, 0.85 - z / 11)) * (light ? 0.5 : 1);

    // the network between nearby molecules
    ctx.lineWidth = 1;
    ctx.strokeStyle = colours.glow;
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const A = placed[i]!.m.pos;
        const B = placed[j]!.m.pos;
        const d = Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
        if (d > 5.5) continue;
        ctx.globalAlpha = (1 - d / 5.5) * 0.22 * fade((A[2] + B[2]) / 2);
        ctx.beginPath();
        ctx.moveTo(placed[i]!.centre.x, placed[i]!.centre.y);
        ctx.lineTo(placed[j]!.centre.x, placed[j]!.centre.y);
        ctx.stroke();
      }
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = colours.motif;
    for (const { m, centre, atoms } of placed) {
      const alpha = fade(centre.z);
      ctx.globalAlpha = alpha * 0.55;
      ctx.lineWidth = Math.max(0.6, centre.f * 0.03);
      ctx.beginPath();
      for (const [a, b] of m.t.bonds) {
        ctx.moveTo(atoms[a]!.x, atoms[a]!.y);
        ctx.lineTo(atoms[b]!.x, atoms[b]!.y);
      }
      ctx.stroke();
      m.t.atoms.forEach((atom, i) => {
        const q = atoms[i]!;
        const r = (atom.k === 2 ? 0.16 : 0.3) * q.f * m.size * 2.2;
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprites[atom.k]!, q.x - r, q.y - r, r * 2, r * 2);
      });
    }
    ctx.globalAlpha = 1;
  }

  function step(t: number) {
    timer = schedule(step);
    if (t - last < FRAME_MS[tier]!) return; // 20–30 fps is plenty for a slow background
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    time += dt;
    view.yaw += (view.ty - view.yaw) * 0.04;
    view.pitch += (view.tp - view.pitch) * 0.04;
    const top = 6 * 1.8;
    for (const m of molecules) {
      m.rot[0] += m.spin[0] * dt;
      m.rot[1] += m.spin[1] * dt;
      m.rot[2] += m.spin[2] * dt;
      m.pos[1] += m.rise * dt;
      if (m.pos[1] > top) m.pos[1] = -top;
    }
    const t0 = now();
    draw();
    cost = cost * 0.9 + (now() - t0) * 0.1;
    if (++frames > 45 && cost > BUDGET_MS) {
      // too heavy for this device: step down a tier (and stop animating after the last one)
      tier++;
      frames = 0;
      cost = 0;
      resize();
      run();
    }
  }

  function run() {
    unschedule(timer);
    const next = animated() ? 'animated' : 'static';
    if (next !== mode) onMode((mode = next));
    if (animated() && !paused) {
      last = now();
      timer = schedule(step);
    } else {
      draw();
    }
  }

  theme();
  resize();
  run();

  return (msg) => {
    switch (msg.type) {
      case 'size':
        w = msg.width;
        h = msg.height;
        dprWanted = msg.dpr;
        resize();
        draw();
        break;
      case 'theme':
        colours = msg.colours;
        light = msg.light;
        theme();
        draw();
        break;
      case 'animated':
        wantAnimated = msg.value;
        run();
        break;
      case 'paused':
        paused = msg.value;
        run();
        break;
      case 'pointer':
        view.ty = msg.tx;
        view.tp = msg.tp;
        break;
      case 'scroll':
        scrollY = msg.y;
        break;
    }
  };
}
