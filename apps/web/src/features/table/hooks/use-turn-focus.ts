"use client";

import { useEffect, useRef } from "react";

function focusIsFree(heading: HTMLElement | null): boolean {
  const active = document.activeElement;
  return active === null || active === document.body || active === heading;
}

export function useTurnFocus(controlsShown: boolean) {
  const actionRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (controlsShown && focusIsFree(headingRef.current)) actionRef.current?.focus();
  }, [controlsShown]);

  return {
    actionRef,
    headingRef,
    focusAfterReveal: (event: Event) => {
      event.preventDefault();
      if (controlsShown) actionRef.current?.focus();
      if (focusIsFree(null)) headingRef.current?.focus();
    },
  };
}
