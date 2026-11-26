import type { BoardSetting, Settings } from "./settings-store";

export type GraphicsSupport = "none" | "weak" | "full";

function canDraw3d(attributes?: WebGLContextAttributes): boolean {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", attributes) ?? canvas.getContext("webgl", attributes);
  if (!context) return false;
  context.getExtension("WEBGL_lose_context")?.loseContext();
  return true;
}

export function graphicsSupport(): GraphicsSupport {
  if (canDraw3d({ failIfMajorPerformanceCaveat: true })) return "full";
  return canDraw3d() ? "weak" : "none";
}

export function boardToShow(
  choice: Pick<Settings, "board" | "boardPicked">,
  support: GraphicsSupport
): BoardSetting {
  if (support === "none") return "flat";
  if (choice.board === "flat" || choice.boardPicked) return choice.board;
  return support === "full" ? "3d" : "flat";
}
