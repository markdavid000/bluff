import { GameIcon, type GameIconName } from "@/components/shared/game-icon";
import { PatternFrame } from "@/components/shared/pattern-band";
import { RaisedCard } from "@/components/shared/raised-card";
import { TileLink } from "@/components/shared/tile-link";
import { fairnessCopy } from "../copy";
import { type CheckLink, codeLinks, contractLinks } from "../lib/check-links";

function OutsideLinks({ links }: { links: readonly CheckLink[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {links.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded font-game underline decoration-seat-blue decoration-2 underline-offset-4 focus-visible:ring-4 focus-visible:ring-ring/60 focus-visible:outline-none"
          >
            <GameIcon name="link" size={20} />
            {link.label}
            <span className="sr-only">{fairnessCopy.opensInNewTab}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function FairnessPage() {
  return (
    <div className="flex max-h-full min-h-0 w-full max-w-3xl flex-col">
      <PatternFrame
        className="flex min-h-0 w-full flex-col"
        bodyClassName="flex min-h-0 flex-col gap-5 overflow-y-auto"
      >
        <div className="flex flex-col gap-2">
          <h1 className="font-game text-4xl">{fairnessCopy.title}</h1>
          <p className="text-lg">{fairnessCopy.intro}</p>
        </div>
        {fairnessCopy.points.map((point) => (
          <RaisedCard key={point.title} className="p-5">
            <section aria-label={point.title} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-3 font-game text-2xl">
                <GameIcon name={point.icon satisfies GameIconName} size={36} />
                {point.title}
              </h2>
              <details className="group">
                <summary className="w-fit cursor-pointer rounded font-game underline decoration-seat-blue decoration-2 underline-offset-4 select-none focus-visible:ring-4 focus-visible:ring-ring/60 focus-visible:outline-none">
                  {fairnessCopy.how}
                </summary>
                <p className="pt-2 leading-relaxed">{point.detail}</p>
              </details>
            </section>
          </RaisedCard>
        ))}
        <RaisedCard className="p-5">
          <section aria-label={fairnessCopy.checkTitle} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-3 font-game text-2xl">
              <GameIcon name="tick" size={36} />
              {fairnessCopy.checkTitle}
            </h2>
            <p>{fairnessCopy.check}</p>
            <OutsideLinks links={contractLinks()} />
            <OutsideLinks links={codeLinks()} />
          </section>
        </RaisedCard>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <TileLink href="/play" tone="red" icon="play">
            {fairnessCopy.play}
          </TileLink>
          <TileLink href="/how-to-play" tone="quiet" icon="chat-bubble">
            {fairnessCopy.howToPlay}
          </TileLink>
        </div>
      </PatternFrame>
    </div>
  );
}
