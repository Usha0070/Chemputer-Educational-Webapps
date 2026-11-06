// Lightweight ball-and-stick 3D viewer on a 2D canvas (perspective projection, depth sorting, shading).
// Loaded only when the student taps “3D”, so it costs nothing on first page load.
import type { Atom3D, Bond3D } from '@/chem/organic';

export interface Viewer {
  update: (atoms: Atom3D[], bonds: Bond3D[]) => void;
  setActive: (active: boolean) => void;
  destroy: () => void;
}

export function mountViewer(
  canvas: HTMLCanvasElement,
  opts: { autoRotate: boolean; colors: { c: string; h: string; bond: string; bg: string } },
): Viewer {
  const ctx = canvas.getContext('2d')!;
  let atoms: Atom3D[] = [];
  let bonds: Bond3D[] = [];
  let yaw = 0.6;
  let pitch = -0.35;
  let raf = 0;
  let active = true;
  let dragging: { x: number; y: number } | null = null;
  let centre = { x: 0, y: 0, z: 0 };
  let scale = 40;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const project = (a: Atom3D) => {
    const x0 = a.x - centre.x;
    const y0 = a.y - centre.y;
    const z0 = a.z - centre.z;
    const x1 = x0 * Math.cos(yaw) + z0 * Math.sin(yaw);
    const z1 = -x0 * Math.sin(yaw) + z0 * Math.cos(yaw);
    const y2 = y0 * Math.cos(pitch) - z1 * Math.sin(pitch);
    const z2 = y0 * Math.sin(pitch) + z1 * Math.cos(pitch);
    const f = 9 / (9 + z2);
    return { x: canvas.clientWidth / 2 + x1 * scale * f, y: canvas.clientHeight / 2 - y2 * scale * f, z: z2, f };
  };

  const draw = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.fillStyle = opts.colors.bg;
    ctx.fillRect(0, 0, w, h);
    const p = atoms.map(project);
    const sortedBonds = [...bonds].sort((a, b) => (p[b.a]!.z + p[b.b]!.z) / 2 - (p[a.a]!.z + p[a.b]!.z) / 2);
    ctx.lineCap = 'round';
    for (const b of sortedBonds) {
      const A = p[b.a]!;
      const B = p[b.b]!;
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l;
      const ny = dx / l;
      ctx.strokeStyle = opts.colors.bond;
      ctx.lineWidth = 3.5 * ((A.f + B.f) / 2);
      for (let k = 0; k < b.order; k++) {
        const off = (k - (b.order - 1) / 2) * 6;
        ctx.beginPath();
        ctx.moveTo(A.x + nx * off, A.y + ny * off);
        ctx.lineTo(B.x + nx * off, B.y + ny * off);
        ctx.stroke();
      }
    }
    const order = atoms.map((_, i) => i).sort((i, j) => p[j]!.z - p[i]!.z);
    for (const i of order) {
      const a = atoms[i]!;
      const q = p[i]!;
      const r = (a.el === 'C' ? 13 : 8) * q.f;
      const g = ctx.createRadialGradient(q.x - r / 3, q.y - r / 3, r / 6, q.x, q.y, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, a.el === 'C' ? opts.colors.c : opts.colors.h);
      g.addColorStop(1, a.el === 'C' ? '#111827' : '#9ca3af');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(q.x, q.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const loop = () => {
    if (opts.autoRotate && !dragging) yaw += 0.008;
    draw();
    raf = active ? requestAnimationFrame(loop) : 0;
  };

  const onDown = (e: PointerEvent) => {
    dragging = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    yaw += (e.clientX - dragging.x) * 0.01;
    pitch = Math.max(-1.4, Math.min(1.4, pitch + (e.clientY - dragging.y) * 0.01));
    dragging = { x: e.clientX, y: e.clientY };
    if (!active) draw();
  };
  const onUp = () => {
    dragging = null;
  };
  const onKey = (e: KeyboardEvent) => {
    const k = { ArrowLeft: [-0.2, 0], ArrowRight: [0.2, 0], ArrowUp: [0, -0.2], ArrowDown: [0, 0.2] }[e.key];
    if (!k) return;
    e.preventDefault();
    yaw += k[0]!;
    pitch = Math.max(-1.4, Math.min(1.4, pitch + k[1]!));
    draw();
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('keydown', onKey);
  const ro = new ResizeObserver(() => {
    resize();
    draw();
  });
  ro.observe(canvas);
  resize();

  return {
    update(nextAtoms, nextBonds) {
      atoms = nextAtoms;
      bonds = nextBonds;
      const n = atoms.length || 1;
      centre = {
        x: atoms.reduce((s, a) => s + a.x, 0) / n,
        y: atoms.reduce((s, a) => s + a.y, 0) / n,
        z: atoms.reduce((s, a) => s + a.z, 0) / n,
      };
      const span = Math.max(4, ...atoms.map((a) => Math.hypot(a.x - centre.x, a.y - centre.y, a.z - centre.z) * 2));
      scale = Math.min(canvas.clientWidth, canvas.clientHeight) / (span + 1.5);
      draw();
    },
    setActive(next) {
      active = next;
      cancelAnimationFrame(raf);
      if (active) raf = requestAnimationFrame(loop);
      else draw();
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('keydown', onKey);
    },
  };
}
