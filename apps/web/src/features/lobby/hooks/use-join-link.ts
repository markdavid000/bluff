"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { notify } from "@/lib/notify";
import { parseTableLink, tablePath } from "@/lib/table-links";
import { lobbyCopy } from "../copy";

export function useJoinLink() {
  const router = useRouter();
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
      router.push(tablePath(id));
    },
  };
}
