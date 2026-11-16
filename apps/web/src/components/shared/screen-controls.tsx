"use client";

import { cn } from "cn";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useScreenControls } from "@/hooks/use-screen-controls";
import { MUSIC_TRACKS, type MusicTrack } from "@/lib/settings-store";
import { ActionButton } from "./action-button";
import { sharedCopy } from "./copy";
import { GameIcon, type GameIconName } from "./game-icon";

const ITEM =
  "cursor-pointer rounded-lg py-2.5 pr-4 pl-11 font-game text-lg tracking-wide focus:bg-accent focus:text-accent-foreground [&>span:first-child]:left-3";

function ControlTile({
  icon,
  on,
  label,
  onPress,
  ...props
}: {
  icon: GameIconName;
  on: boolean;
  label: string;
  onPress?: () => void;
}) {
  return (
    <ActionButton
      {...props}
      tone="quiet"
      size="small"
      icon={icon}
      aria-pressed={onPress ? on : undefined}
      onClick={onPress}
      className={cn("aspect-square px-2", on ? "" : "opacity-60 grayscale")}
    >
      <span className="sr-only">{label}</span>
    </ActionButton>
  );
}

export function ScreenControls({ className }: { className?: string }) {
  const controls = useScreenControls();
  return (
    <div
      role="group"
      aria-label={sharedCopy.screenControls}
      className={cn("flex gap-2", className)}
    >
      <ControlTile
        icon={controls.night ? "moon" : "sun"}
        on={controls.night}
        label={controls.night ? sharedCopy.switchToDay : sharedCopy.switchToNight}
        onPress={controls.toggleTheme}
      />
      <ControlTile
        icon="headphone"
        on={controls.sounds}
        label={controls.sounds ? sharedCopy.soundsOff : sharedCopy.soundsOn}
        onPress={controls.toggleSounds}
      />
      <ControlTile
        icon="setting"
        on={controls.calm}
        label={controls.calm ? sharedCopy.calmOff : sharedCopy.calmOn}
        onPress={controls.toggleCalm}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ControlTile icon="music" on={controls.music} label={sharedCopy.chooseMusic} />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-52 rounded-xl border-2 border-toast-edge bg-toast p-2 text-toast-foreground shadow-[0_5px_0_0_var(--color-toast-edge),0_16px_24px_-10px_rgb(0_0_0/0.55)]"
        >
          <DropdownMenuLabel className="px-3 pb-1 font-game text-base opacity-85">
            {sharedCopy.chooseMusic}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={controls.musicTrack}
            onValueChange={(value) => controls.chooseMusic(value as MusicTrack)}
          >
            {MUSIC_TRACKS.map((track) => (
              <DropdownMenuRadioItem
                key={track}
                value={track}
                className={ITEM}
                indicator={<GameIcon name="music" size={24} />}
              >
                {sharedCopy.musicChoices[track]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator className="bg-toast-foreground/20" />
          <DropdownMenuCheckboxItem
            checked={controls.music}
            onCheckedChange={controls.toggleMusic}
            className={ITEM}
            indicator={<GameIcon name="tick" size={24} />}
          >
            {sharedCopy.musicPlaying}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
