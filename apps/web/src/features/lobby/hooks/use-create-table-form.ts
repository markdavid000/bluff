"use client";

import { useState } from "react";
import type { SeatCount } from "../lib/tables";

const DEFAULT_SEATS: SeatCount = 2;

export function useCreateTableForm() {
  const [seatCount, setSeatCount] = useState<SeatCount>(DEFAULT_SEATS);
  const [isPrivate, setIsPrivate] = useState(false);
  return {
    seatCount,
    isPrivate,
    chooseSeats: setSeatCount,
    togglePrivate: () => setIsPrivate((value) => !value),
  };
}
