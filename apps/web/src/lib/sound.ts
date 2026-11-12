export type Channel = "effects" | "music";

export interface SoundSource {
  url: string;
  channel: Channel;
  volume: number;
  loop?: boolean;
}

interface Playing {
  stop: () => void;
}

type Fetcher = (url: string) => Promise<ArrayBuffer>;

export interface SoundBoardOptions {
  createContext: () => AudioContext;
  fetchAudio: Fetcher;
}

export function createSoundBoard<Name extends string>(
  sources: Record<Name, SoundSource>,
  { createContext, fetchAudio }: SoundBoardOptions
) {
  let context: AudioContext | null = null;
  const gains = new Map<Channel, GainNode>();
  const muted: Record<Channel, boolean> = { effects: false, music: false };
  const buffers = new Map<Name, Promise<AudioBuffer | null>>();
  const looping = new Map<Name, Playing>();

  function decode(name: Name): Promise<AudioBuffer | null> {
    const cached = buffers.get(name);
    if (cached) return cached;
    const audio = context;
    if (!audio) return Promise.resolve(null);
    const loading = fetchAudio(sources[name].url)
      .then((data) => audio.decodeAudioData(data))
      .catch((error: unknown) => {
        console.warn(`Bluff could not load the "${name}" sound.`, error);
        buffers.delete(name);
        return null;
      });
    buffers.set(name, loading);
    return loading;
  }

  function channelGain(channel: Channel): GainNode | null {
    if (!context) return null;
    let gain = gains.get(channel);
    if (!gain) {
      gain = context.createGain();
      gain.gain.value = muted[channel] ? 0 : 1;
      gain.connect(context.destination);
      gains.set(channel, gain);
    }
    return gain;
  }

  return {
    get unlocked() {
      return context !== null;
    },
    unlock() {
      if (context) return;
      context = createContext();
      (Object.keys(sources) as Name[])
        .filter((name) => sources[name].channel === "effects")
        .forEach((name) => void decode(name));
    },
    setMuted(channel: Channel, value: boolean) {
      muted[channel] = value;
      const gain = gains.get(channel);
      if (gain) gain.gain.value = value ? 0 : 1;
      if (channel === "music" && value) {
        looping.forEach((playing) => playing.stop());
        looping.clear();
      }
    },
    async play(name: Name) {
      const source = sources[name];
      if (!context || muted[source.channel]) return;
      if (source.loop && looping.has(name)) return;
      const buffer = await decode(name);
      const gain = channelGain(source.channel);
      if (!buffer || !gain || !context) return;
      const node = context.createBufferSource();
      node.buffer = buffer;
      node.loop = source.loop ?? false;
      const volume = context.createGain();
      volume.gain.value = source.volume;
      node.connect(volume);
      volume.connect(gain);
      node.start();
      if (source.loop) looping.set(name, { stop: () => node.stop() });
    },
    stop(name: Name) {
      looping.get(name)?.stop();
      looping.delete(name);
    },
  };
}

export type SoundBoard<Name extends string> = ReturnType<typeof createSoundBoard<Name>>;
