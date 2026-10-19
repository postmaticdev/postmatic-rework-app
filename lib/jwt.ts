/**
 * Seconds until a JWT's `exp`, so an auth cookie lives exactly as long as the
 * token it holds (same rule as postmatic-auth and the landing page). Returns
 * undefined when the token has no readable `exp`. Works in the browser, Node
 * and edge runtimes (atob only). The signature is not verified: this is only
 * used to size the cookie, never to trust the token.
 */
export function getJwtMaxAge(token: string): number | undefined {
  const payload = token.split(".")[1];
  if (!payload) return undefined;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { exp } = JSON.parse(json) as { exp?: unknown };
    if (typeof exp !== "number") return undefined;
    return Math.max(exp - Math.floor(Date.now() / 1000), 0);
  } catch {
    return undefined;
  }
}
