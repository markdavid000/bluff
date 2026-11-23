import type { Face } from "@bluff/game";
import { cn } from "cn";
import type { ReactNode } from "react";
import { DieFace } from "@/components/shared/die";
import { PatternFrame } from "@/components/shared/pattern-band";
import { RaisedCard } from "@/components/shared/raised-card";
import { TileLink } from "@/components/shared/tile-link";
import { rulesCopy } from "../copy";

const DICE_PER_PLAYER: readonly { players: number; faces: readonly Face[] }[] = [
  { players: 2, faces: [3, 5, 2, 6] },
  { players: 3, faces: [4, 1, 6] },
  { players: 4, faces: [2, 5] },
];

const WILD_EXAMPLE: readonly { face: Face; counts: boolean }[] = [
  { face: 4, counts: true },
  { face: 1, counts: true },
  { face: 6, counts: false },
  { face: 4, counts: true },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <RaisedCard className="p-5">
      <section aria-label={title} className="flex flex-col gap-3">
        <h2 className="font-game text-2xl">{title}</h2>
        {children}
      </section>
    </RaisedCard>
  );
}

function Points({ items, ordered = false }: { items: readonly string[]; ordered?: boolean }) {
  const List = ordered ? "ol" : "ul";
  return (
    <List className={cn("flex flex-col gap-2 pl-5", ordered ? "list-decimal" : "list-disc")}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </List>
  );
}

export function HowToPlay() {
  return (
    <div className="flex max-h-full min-h-0 w-full max-w-3xl flex-col">
      <PatternFrame
        className="flex min-h-0 w-full flex-col"
        bodyClassName="flex min-h-0 flex-col gap-5 overflow-y-auto"
      >
        <div className="flex flex-col gap-2">
          <h1 className="font-game text-4xl">{rulesCopy.title}</h1>
          <p className="text-lg">{rulesCopy.intro}</p>
        </div>
        <Section title={rulesCopy.ideaTitle}>
          <p>{rulesCopy.idea}</p>
        </Section>
        <Section title={rulesCopy.startTitle}>
          <Points items={rulesCopy.start} ordered />
          <p className="text-muted-foreground">{rulesCopy.moreChips}</p>
        </Section>
        <Section title={rulesCopy.diceTitle}>
          <ul className="flex flex-col gap-3">
            {DICE_PER_PLAYER.map(({ players, faces }) => (
              <li key={players} className="flex flex-wrap items-center gap-3">
                <span className="min-w-40 font-game">
                  {rulesCopy.dicePerPlayer(players, faces.length)}
                </span>
                <span role="img" aria-label={rulesCopy.dice(faces.length)} className="flex gap-1.5">
                  {faces.map((face, index) => (
                    <DieFace key={index} face={face} className="size-8" />
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <p>{rulesCopy.diceHidden}</p>
        </Section>
        <Section title={rulesCopy.wildTitle}>
          <p>{rulesCopy.wild}</p>
          <figure className="flex flex-col gap-2">
            <span role="img" aria-label={rulesCopy.wildExample} className="flex gap-2">
              {WILD_EXAMPLE.map(({ face, counts }, index) => (
                <DieFace
                  key={index}
                  face={face}
                  className={cn("size-10", counts ? "ring-4 ring-seat-green" : "opacity-50")}
                />
              ))}
            </span>
            <figcaption aria-hidden className="text-sm text-muted-foreground">
              {rulesCopy.wildExample}
            </figcaption>
          </figure>
        </Section>
        <Section title={rulesCopy.turnTitle}>
          <p>{rulesCopy.turnTime}</p>
          <p className="font-game">{rulesCopy.raise}</p>
          <Points items={rulesCopy.raiseWays} />
          <p>{rulesCopy.raiseFaces}</p>
          <p>{rulesCopy.atLeast}</p>
          <p className="text-muted-foreground">{rulesCopy.atLeastExample}</p>
          <p className="font-game">{rulesCopy.call}</p>
        </Section>
        <Section title={rulesCopy.calledTitle}>
          <p>{rulesCopy.called}</p>
          <Points items={rulesCopy.calledOutcomes} />
          <p>{rulesCopy.nextRound}</p>
        </Section>
        <Section title={rulesCopy.winTitle}>
          <Points items={rulesCopy.win} />
        </Section>
        <Section title={rulesCopy.leaveTitle}>
          <Points items={rulesCopy.leave} />
        </Section>
        <Section title={rulesCopy.fairTitle}>
          <Points items={rulesCopy.fair} />
        </Section>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <TileLink href="/play" tone="red" icon="play">
            {rulesCopy.play}
          </TileLink>
          <TileLink href="/fairness" tone="blue" icon="lock">
            {rulesCopy.whyFair}
          </TileLink>
        </div>
      </PatternFrame>
    </div>
  );
}
