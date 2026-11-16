export function supportsWebGL(): boolean {
  const canvas = document.createElement("canvas");
  return canvas.getContext("webgl2") !== null || canvas.getContext("webgl") !== null;
}
