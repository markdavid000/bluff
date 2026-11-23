import type { ReactNode } from "react";
import { DieFace } from "@/components/shared/die";
import { GameIcon } from "@/components/shared/game-icon";
import { LearnLinks } from "@/components/shared/learn-links";
import { RaisedCard } from "@/components/shared/raised-card";
import { TileLink } from "@/components/shared/tile-link";
import { TumblingDie } from "@/components/shared/tumbling-die";
import { siteConfig } from "@/config/site";
import { landingCopy } from "../copy";

function RollArt() {
  return (
    <span aria-hidden className="flex gap-1.5">
      <DieFace face={2} className="size-8" />
      <DieFace face={5} className="size-8" />
      <DieFace face={3} className="size-8" />
    </span>
  );
}

function BidArt() {
  return (
    <span
      role="img"
      aria-label={landingCopy.bidExample}
      className="flex w-fit items-center gap-1.5 rounded-full border-2 border-seat-yellow-edge bg-seat-yellow py-1 pr-1.5 pl-3 font-game text-lg leading-none text-seat-yellow-foreground shadow-[0_3px_0_0_var(--color-seat-yellow-edge)]"
    >
      <span aria-hidden>{landingCopy.bidQuantity}</span>
      <DieFace face={5} className="size-7" />
    </span>
  );
}

function CallArt() {
  return <GameIcon name="megaphone" size={40} />;
}

const ART: readonly ReactNode[] = [
  <RollArt key="roll" />,
  <BidArt key="bid" />,
  <CallArt key="call" />,
];

export function Hero({ table }: { table: ReactNode }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="mx-auto my-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6"
    >
      <div className="grid items-center gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
          <div className="flex items-center gap-5 sm:gap-7">
            <TumblingDie className="size-20 shrink-0 sm:size-24" />
            <h1
              id="hero-title"
              className="text-6xl drop-shadow-[0_4px_0_var(--color-tile-edge)] sm:text-8xl"
            >
              {siteConfig.name}
            </h1>
          </div>
          <p className="font-game text-2xl sm:text-3xl">{landingCopy.tagline}</p>
          <p className="max-w-xl text-lg text-muted-foreground">{landingCopy.explainer}</p>
          <TileLink href="/play" tone="red" size="large" icon="play">
            {landingCopy.play}
          </TileLink>
        </div>
        <div className="flex justify-center">{table}</div>
      </div>
      <ul aria-label={landingCopy.movesLabel} className="grid w-full gap-5 sm:grid-cols-3">
        {landingCopy.moves.map((move, index) => (
          <li key={move.title}>
            <RaisedCard className="flex h-full flex-col items-start gap-3 p-5 text-left">
              <span className="flex h-10 items-center">{ART[index]}</span>
              <h2 className="font-game text-2xl">{move.title}</h2>
              <p className="text-muted-foreground">{move.body}</p>
            </RaisedCard>
          </li>
        ))}
      </ul>
      <div className="sticky bottom-3 z-20 mx-auto flex w-fit max-w-full flex-col items-center gap-3 rounded-2xl border-2 border-tile-edge/30 bg-background/85 px-5 py-3 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.5)] backdrop-blur-sm">
        <p className="flex items-center justify-center gap-2 text-center text-lg">
          <GameIcon name="lock" size={28} />
          {landingCopy.fair}
        </p>
        <LearnLinks />
      </div>
    </section>
  );
}
