"use client";

import { useEffect, useState } from "react";

export function useOnScreen(): {
  ref: (node: Element | null) => void;
  seen: boolean;
  onScreen: boolean;
} {
  const [node, setNode] = useState<Element | null>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [seen, setSeen] = useState(false);
  if (onScreen && !seen) setSeen(true);

  useEffect(() => {
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      const latest = entries.at(-1);
      if (latest) setOnScreen(latest.isIntersecting);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return { ref: setNode, seen, onScreen };
}
