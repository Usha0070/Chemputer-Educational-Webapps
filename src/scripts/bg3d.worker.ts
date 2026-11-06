// Draws the 3D background off the page's main thread (OffscreenCanvas handed over by src/scripts/bg3d.ts).
import { createScene, type SceneInit, type SceneMessage } from './bg3d-scene';

type InitMessage = { type: 'init'; canvas: OffscreenCanvas } & SceneInit;
const scope = self as unknown as {
  postMessage: (msg: unknown) => void;
  onmessage: ((e: MessageEvent<InitMessage | SceneMessage>) => void) | null;
};

let send: ((msg: SceneMessage) => void) | null = null;
scope.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'init') {
    send = createScene(
      msg.canvas,
      (size) => new OffscreenCanvas(size, size),
      (mode) => scope.postMessage({ type: 'mode', mode }),
      msg,
    );
  } else {
    send?.(msg);
  }
};
