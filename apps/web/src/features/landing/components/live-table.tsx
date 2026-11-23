"use client";

import { useDemoRound } from "../hooks/use-demo-round";
import { DemoTable } from "./demo-table";

export function LiveTable() {
  return <DemoTable step={useDemoRound()} />;
}
