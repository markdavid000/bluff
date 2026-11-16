const SLOW_FPS = 30;
const SLOW_SECONDS = 3;

export function createFrameWatch() {
  let elapsed = 0;
  let frames = 0;
  let slowSeconds = 0;
  let reported = false;
  return {
    tick(deltaSeconds: number): boolean {
      elapsed += deltaSeconds;
      frames += 1;
      if (elapsed < 1) return false;
      const fps = frames / elapsed;
      elapsed = 0;
      frames = 0;
      slowSeconds = fps < SLOW_FPS ? slowSeconds + 1 : 0;
      if (reported || slowSeconds < SLOW_SECONDS) return false;
      reported = true;
      return true;
    },
  };
}
