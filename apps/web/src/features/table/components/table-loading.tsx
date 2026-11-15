import { TumblingDie } from "@/components/shared/tumbling-die";
import { tableCopy } from "../copy";

export function TableLoading() {
  return (
    <div role="status" className="flex flex-col items-center gap-6">
      <TumblingDie />
      <p className="font-game text-2xl">{tableCopy.loading}</p>
    </div>
  );
}
