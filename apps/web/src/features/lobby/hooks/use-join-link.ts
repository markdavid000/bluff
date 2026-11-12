"use client";

import { useState } from "react";
import { notify } from "@/lib/notify";
import { lobbyCopy } from "../copy";
import { parseTableLink } from "../lib/tables";

export function useJoinLink({ onFound }: { onFound: (id: bigint) => void }) {
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);

  return {
    text,
    invalid,
    change: (value: string) => {
      setInvalid(false);
      setText(value);
    },
    submit: () => {
      const id = parseTableLink(text);
      if (id === null) {
        setInvalid(true);
        notify.error(text.trim() === "" ? lobbyCopy.linkEmpty : lobbyCopy.linkInvalid, {
          id: "join-link",
        });
        return;
      }
      setText("");
      onFound(id);
    },
  };
}
