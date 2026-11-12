import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSoundBoard } from "./sound";

function fakeContext() {
  const started: number[] = [];
  const context = {
    destination: {},
    decodeAudioData: vi.fn(async () => ({ duration: 1 })),
    createGain: vi.fn(() => ({ gain: { value: 1 }, connect: vi.fn() })),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      loop: false,
      connect: vi.fn(),
      start: vi.fn(() => started.push(1)),
      stop: vi.fn(),
    })),
  };
  return { context: context as unknown as AudioContext, raw: context, started };
}

const sources = {
  tap: { url: "/audio/tap.ogg", channel: "effects", volume: 0.6 },
  roll: { url: "/audio/roll.ogg", channel: "effects", volume: 0.8 },
  table: { url: "/audio/table.ogg", channel: "music", volume: 0.3, loop: true },
} as const;

describe("sound board", () => {
  let fake: ReturnType<typeof fakeContext>;
  let fetchAudio: ReturnType<typeof vi.fn<(url: string) => Promise<ArrayBuffer>>>;

  beforeEach(() => {
    fake = fakeContext();
    fetchAudio = vi.fn<(url: string) => Promise<ArrayBuffer>>(async () => new ArrayBuffer(8));
  });

  it("plays nothing before the first tap", async () => {
    const board = createSoundBoard(sources, { createContext: () => fake.context, fetchAudio });
    await board.play("tap");
    expect(board.unlocked).toBe(false);
    expect(fetchAudio).not.toHaveBeenCalled();
  });

  it("decodes each effect once, after the first tap", async () => {
    const board = createSoundBoard(sources, { createContext: () => fake.context, fetchAudio });
    board.unlock();
    await board.play("tap");
    await board.play("tap");
    expect(fetchAudio).toHaveBeenCalledTimes(2);
    expect(fake.raw.decodeAudioData).toHaveBeenCalledTimes(2);
    expect(fake.started).toHaveLength(2);
  });

  it("keeps effects quiet when Sounds is off, without touching music", async () => {
    const board = createSoundBoard(sources, { createContext: () => fake.context, fetchAudio });
    board.unlock();
    board.setMuted("effects", true);
    await board.play("roll");
    expect(fake.started).toHaveLength(0);
    await board.play("table");
    expect(fake.started).toHaveLength(1);
  });

  it("starts a music loop once, and stops it when Music is turned off", async () => {
    const board = createSoundBoard(sources, { createContext: () => fake.context, fetchAudio });
    board.unlock();
    await board.play("table");
    await board.play("table");
    expect(fake.started).toHaveLength(1);
    const node = fake.raw.createBufferSource.mock.results[0].value;
    board.setMuted("music", true);
    expect(node.stop).toHaveBeenCalled();
  });

  it("warns and stays silent when a sound cannot load", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const board = createSoundBoard(sources, {
      createContext: () => fake.context,
      fetchAudio: async () => {
        throw new Error("offline");
      },
    });
    board.unlock();
    await board.play("tap");
    expect(fake.started).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
