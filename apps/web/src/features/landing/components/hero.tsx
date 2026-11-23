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
      className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-3 px-4 pt-4 pb-3"
    >
      <div className="grid min-h-0 flex-1 items-center gap-4 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8">
        <div className="flex flex-col items-center gap-3 text-center lg:items-start lg:gap-4 lg:text-left">
          <div className="flex items-center gap-4 sm:gap-6">
            <TumblingDie className="size-14 shrink-0 sm:size-20" />
            <h1
              id="hero-title"
              className="text-5xl drop-shadow-[0_4px_0_var(--color-tile-edge)] sm:text-7xl"
            >
              {siteConfig.name}
            </h1>
          </div>
          <p className="font-game text-xl sm:text-2xl">{landingCopy.tagline}</p>
          <p className="hidden max-w-xl text-muted-foreground sm:block">{landingCopy.explainer}</p>
          <TileLink href="/play" tone="red" size="large" icon="play">
            {landingCopy.play}
          </TileLink>
          <ul
            aria-label={landingCopy.movesLabel}
            className="hidden w-full gap-3 pt-1 sm:grid sm:grid-cols-3"
          >
            {landingCopy.moves.map((move, index) => (
              <li key={move.title}>
                <RaisedCard className="flex h-full flex-col items-start gap-1.5 p-3 text-left">
                  <span className="flex h-8 items-center">{ART[index]}</span>
                  <h2 className="font-game text-lg leading-tight">{move.title}</h2>
                  <p className="text-sm leading-snug text-muted-foreground">{move.body}</p>
                </RaisedCard>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex h-full min-h-0 items-center justify-center">
          <div className="w-full max-w-[min(38rem,calc((100dvh-9rem)*0.8))]">{table}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <p className="flex items-center gap-2 text-center">
          <GameIcon name="lock" size={24} />
          {landingCopy.fair}
        </p>
        <LearnLinks />
      </div>
    </section>
  );
}
