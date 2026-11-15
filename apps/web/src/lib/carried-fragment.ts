const KEY = "bluff.kept-fragment";

interface Kept {
  path: string;
  fragment: string;
}

function isKept(value: unknown): value is Kept {
  return (
    typeof value === "object" &&
    value !== null &&
    "path" in value &&
    "fragment" in value &&
    typeof value.path === "string" &&
    typeof value.fragment === "string" &&
    value.fragment.startsWith("#")
  );
}

export function keepFragmentFor(path: string, fragment: string) {
  if (fragment.length < 2) return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ path, fragment }));
  } catch (error) {
    console.error("Bluff could not keep the end of the link for after sign in.", error);
  }
}

export function withKeptFragment(path: string): string {
  if (path.includes("#")) return path;
  let kept: unknown = null;
  try {
    kept = JSON.parse(window.sessionStorage.getItem(KEY) ?? "null");
    window.sessionStorage.removeItem(KEY);
  } catch (error) {
    console.error("Bluff could not read the end of the link it kept.", error);
  }
  return isKept(kept) && kept.path === path ? `${path}${kept.fragment}` : path;
}
