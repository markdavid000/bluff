import type { GameIconName } from "@/config/icons";

export type NoticeKind = "loading" | "success" | "info" | "error";

export interface Notice {
  id: string;
  kind: NoticeKind;
  title: string;
  icon?: GameIconName;
  staysMs?: number;
  action?: { label: string; onPress: () => void };
}

type Listener = (event: { type: "show"; notice: Notice } | { type: "dismiss"; id: string }) => void;

const listeners = new Set<Listener>();
let counter = 0;

export function onNotice(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function show(
  kind: NoticeKind,
  title: string,
  options: Omit<Notice, "id" | "kind" | "title"> & { id?: string } = {}
) {
  counter += 1;
  const notice: Notice = { ...options, id: options.id ?? `notice-${counter}`, kind, title };
  listeners.forEach((listener) => listener({ type: "show", notice }));
  return notice.id;
}

export const notify = {
  loading: (title: string, options?: Parameters<typeof show>[2]) => show("loading", title, options),
  success: (title: string, options?: Parameters<typeof show>[2]) => show("success", title, options),
  info: (title: string, options?: Parameters<typeof show>[2]) => show("info", title, options),
  error: (title: string, options?: Parameters<typeof show>[2]) => show("error", title, options),
  dismiss: (id: string) => listeners.forEach((listener) => listener({ type: "dismiss", id })),
};
