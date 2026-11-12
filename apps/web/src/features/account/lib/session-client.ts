export const SESSION_RENEW_MS = 45 * 60 * 1000;

export async function openSession(accessToken: string): Promise<boolean> {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "same-origin",
  });
  if (response.status === 401) return false;
  if (!response.ok) throw new Error(`Opening a session failed with ${response.status}`);
  return true;
}

export async function closeSession(): Promise<void> {
  const response = await fetch("/api/session", { method: "DELETE", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Closing the session failed with ${response.status}`);
}
