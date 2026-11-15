export interface CupMotion {
  shaking: boolean;
  lifted: boolean;
}

export function cupMotion({
  index,
  ownSeat,
  throwKind,
  revealed,
  othersShaking,
}: {
  index: number;
  ownSeat: number | null;
  throwKind: "idle" | "shaking" | "rolling";
  revealed: boolean;
  othersShaking: boolean;
}): CupMotion {
  const mine = index === ownSeat;
  if (revealed) return { shaking: false, lifted: true };
  if (mine) return { shaking: throwKind === "shaking", lifted: throwKind === "rolling" };
  return { shaking: othersShaking, lifted: false };
}
