export function getSiteOrigin(): string {
  const fromEnv =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return new URL(fromEnv).origin;
}
