// 3D molecular background: ball-and-stick molecules (benzene, methane, water, CO₂, ethene, ammonia, a graphene
// fragment) floating and turning in depth, joined by a faint network. It leans with the pointer and with scrolling.
// Drawn on one fixed 2D canvas with perspective projection (no WebGL library), at ~30 fps.
// Cheap by design: pre-rendered glow sprites, fewer molecules on small screens, paused while the tab is hidden or
// a simulation is fullscreen, a single still frame with prefers-reduced-motion or Data Saver.
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

const TEMPLATES: Template[] = [
  // benzene
  {
    atoms: [...ring(6, 1.4, 0), ...ring(6, 2.45, 2)],
    bonds: [
      ...Array.from({ length: 6 }, (_, i) => [i, (i + 1) % 6] as [number, number]),
      ...Array.from({ length: 6 }, (_, i) => [i, i + 6] as [number, number]),
    ],
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
    bonds: [
      ...Array.from({ length: 6 }, (_, i) => [i, (i + 1) % 6] as [number, number]),
      ...Array.from({ length: 6 }, (_, i) => [6 + i, 6 + ((i + 1) % 6)] as [number, number]),
    ],
  },
];

const canvas = document.querySelector<HTMLCanvasElement>('[data-bg3d]');
const ctx = canvas?.getContext('2d');

if (canvas && ctx) {
  const root = document.documentElement;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const animated = () => !still.matches && !saveData;
  let w = 0;
  let h = 0;
  let molecules: Molecule[] = [];
  let sprites: HTMLCanvasElement[] = [];
  let colours = { bond: '', net: '', alpha: 1 };
  const view = { yaw: 0, pitch: 0, ty: 0, tp: 0 };
  let raf = 0;
  let last = 0;
  let time = 0;

  const sprite = (colour: string, core: string) => {
    const s = document.createElement('canvas');
    s.width = s.height = 64;
    const g = s.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, core);
    grad.addColorStop(0.22, colour);
    grad.addColorStop(0.5, colour + '55');
    grad.addColorStop(1, colour + '00');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return s;
  };
  const hex = (v: string, fallback: string) => {
    const t = v.trim();
    return /^#[0-9a-f]{6}$/i.test(t) ? t : fallback;
  };

  function readTheme() {
    const css = getComputedStyle(root);
    const light = root.dataset.theme === 'light';
    const glow = hex(css.getPropertyValue('--glow'), '#de7e72');
    const gold = hex(css.getPropertyValue('--gold'), '#fcde56');
    // hydrogens: white on dark, a soft rose on light (dark ink dots would look like smudges there)
    const ink = hex(css.getPropertyValue(light ? '--line-strong' : '--ink'), '#f6f6f6');
    const motif = hex(css.getPropertyValue('--motif'), '#de7e72');
    sprites = [sprite(glow, light ? glow : '#fff4ef'), sprite(gold, light ? gold : '#fffbe6'), sprite(ink, ink)];
    colours = { bond: motif, net: glow, alpha: light ? 0.5 : 1 };
  }

  function populate() {
    const area = w * h;
    const dim = root.dataset.bg === 'dim' ? 0.6 : 1;
    const n = Math.round(Math.min(16, Math.max(6, area / 90000)) * dim);
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
    const dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.25 : 1.5);
    w = canvas!.clientWidth;
    h = canvas!.clientHeight;
    canvas!.width = Math.round(w * dpr);
    canvas!.height = Math.round(h * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    ctx!.clearRect(0, 0, w, h);
    const D = 9;
    const F = 0.9 * h;
    const cx = w / 2;
    const cy = h / 2;
    const sy = animated() ? window.scrollY : 0; // no scroll parallax in the still (reduced-motion) frame
    const scrollTilt = Math.min(1, sy / 4000);
    const yaw = view.yaw + Math.sin(time * 0.05) * 0.12;
    const pitch = view.pitch + scrollTilt * 0.25;
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

    const fade = (z: number) => Math.max(0.1, Math.min(0.75, 0.85 - z / 11)) * colours.alpha;

    // the network between nearby molecules
    ctx!.lineWidth = 1;
    ctx!.strokeStyle = colours.net;
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const A = placed[i]!.m.pos;
        const B = placed[j]!.m.pos;
        const d = Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
        if (d > 5.5) continue;
        ctx!.globalAlpha = (1 - d / 5.5) * 0.22 * fade((A[2] + B[2]) / 2);
        ctx!.beginPath();
        ctx!.moveTo(placed[i]!.centre.x, placed[i]!.centre.y);
        ctx!.lineTo(placed[j]!.centre.x, placed[j]!.centre.y);
        ctx!.stroke();
      }
    }

    ctx!.lineCap = 'round';
    ctx!.strokeStyle = colours.bond;
    for (const { m, centre, atoms } of placed) {
      const alpha = fade(centre.z);
      ctx!.globalAlpha = alpha * 0.55;
      ctx!.lineWidth = Math.max(0.6, centre.f * 0.03);
      ctx!.beginPath();
      for (const [a, b] of m.t.bonds) {
        ctx!.moveTo(atoms[a]!.x, atoms[a]!.y);
        ctx!.lineTo(atoms[b]!.x, atoms[b]!.y);
      }
      ctx!.stroke();
      m.t.atoms.forEach((atom, i) => {
        const q = atoms[i]!;
        const r = (atom.k === 2 ? 0.16 : 0.3) * q.f * m.size * 2.2;
        ctx!.globalAlpha = alpha;
        ctx!.drawImage(sprites[atom.k]!, q.x - r, q.y - r, r * 2, r * 2);
      });
    }
    ctx!.globalAlpha = 1;
  }

  function step(now: number) {
    raf = requestAnimationFrame(step);
    if (now - last < 32) return; // ~30 fps is plenty for a slow background
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (document.fullscreenElement) return;
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
    draw();
  }

  function start() {
    cancelAnimationFrame(raf);
    canvas!.dataset.mode = animated() ? 'animated' : 'static';
    if (animated() && !document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(step);
    } else {
      draw();
    }
  }

  const boot = () => {
    readTheme();
    resize();
    draw();
    canvas.dataset.live = 'true';
    start();
    new ResizeObserver(() => {
      resize();
      draw();
    }).observe(canvas);
    new MutationObserver(() => {
      readTheme();
      draw();
    }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    document.addEventListener('visibilitychange', start);
    still.addEventListener('change', start);
    window.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse') return;
        view.ty = (e.clientX / Math.max(1, w) - 0.5) * 0.35;
        view.tp = (e.clientY / Math.max(1, h) - 0.5) * 0.22;
      },
      { passive: true },
    );
  };

  // Start once the page is idle so the background never competes with the content or a simulation loading.
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (idle) idle(boot, { timeout: 1500 });
  else window.setTimeout(boot, 300);
}
