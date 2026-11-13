import { PatternFrame } from "@/components/shared/pattern-band";
import { tableCopy } from "../copy";
import { BackToLobby } from "./back-to-lobby";

export function TableNotFound() {
  return (
    <PatternFrame className="w-full max-w-xl">
      <div className="flex flex-col items-center gap-5 py-2 text-center">
        <h1 className="text-3xl">{tableCopy.notFound}</h1>
        <p className="text-base text-muted-foreground">{tableCopy.notFoundHelp}</p>
        <BackToLobby />
      </div>
    </PatternFrame>
  );
}
