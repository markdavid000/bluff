import { errorCopy } from "./copy";
import { notify } from "./notify";

export function holdOpenWhile(
  working: boolean,
  workingLabel: string,
  onOpenChange: (open: boolean) => void
) {
  return (next: boolean) => {
    if (!next && working) {
      notify.info(errorCopy.stillGoing(workingLabel), { id: "still-going", icon: "lock" });
      return;
    }
    onOpenChange(next);
  };
}
