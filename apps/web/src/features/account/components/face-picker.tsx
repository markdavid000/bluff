import { cn } from "cn";
import { Avatar } from "@/components/shared/avatar";
import type { PresetAvatar } from "@/lib/avatar";
import { accountCopy } from "../copy";

export function FacePicker({
  faces,
  chosen,
  onChoose,
  disabled = false,
}: {
  faces: readonly PresetAvatar[];
  chosen: number;
  onChoose: (face: PresetAvatar) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={accountCopy.faceLabel} className="grid grid-cols-6 gap-2">
      {faces.map((face) => {
        const selected = chosen === face;
        return (
          <button
            key={face}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={accountCopy.faceNumber(face)}
            disabled={disabled}
            onClick={() => onChoose(face)}
            className={cn(
              "rounded-full p-1 transition-transform duration-150 outline-none focus-visible:ring-4 focus-visible:ring-ring/60 disabled:opacity-60",
              selected
                ? "-translate-y-1 bg-accent shadow-[0_5px_0_0_var(--color-tile-edge)]"
                : "hover:-translate-y-0.5"
            )}
          >
            <Avatar src={`/avatars/${face}.svg`} size={52} className="size-full" />
          </button>
        );
      })}
    </div>
  );
}
