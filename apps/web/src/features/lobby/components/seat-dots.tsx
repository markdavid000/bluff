import { cn } from "cn";
import { lobbyCopy } from "../copy";

const SEAT_COLOURS = ["bg-seat-red", "bg-seat-green", "bg-seat-yellow", "bg-seat-blue"];

export function SeatDots({ players, seats }: { players: number; seats: number }) {
  return (
    <span className="flex gap-1.5" aria-hidden>
      {Array.from({ length: seats }, (_, seat) => (
        <span
          key={seat}
          title={seat < players ? lobbyCopy.takenSeat : lobbyCopy.emptySeat}
          className={cn(
            "size-4 rounded-full border-2",
            seat < players
              ? cn(SEAT_COLOURS[seat], "border-black/20 shadow-[0_2px_0_0_rgb(0_0_0/0.25)]")
              : "border-dashed border-muted-foreground/60"
          )}
        />
      ))}
    </span>
  );
}
