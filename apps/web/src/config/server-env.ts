function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not set. See apps/web/.env.example.`);
  return value;
}

export function sessionSecret(): string {
  return required("SESSION_SECRET", process.env.SESSION_SECRET);
}

export function privyAppId(): string {
  return required("NEXT_PUBLIC_PRIVY_APP_ID", process.env.NEXT_PUBLIC_PRIVY_APP_ID);
}

export function isLocalRequest(url: URL): boolean {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1";
}
