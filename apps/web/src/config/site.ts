type SiteEnv = Partial<
  Record<
    "VERCEL_ENV" | "VERCEL_PROJECT_PRODUCTION_URL" | "VERCEL_BRANCH_URL" | "VERCEL_URL",
    string
  >
>;

export function isProductionSite(env: SiteEnv): boolean {
  return env.VERCEL_ENV === "production";
}

export function siteUrl(env: SiteEnv): string {
  const host = isProductionSite(env)
    ? env.VERCEL_PROJECT_PRODUCTION_URL
    : (env.VERCEL_BRANCH_URL ?? env.VERCEL_URL ?? env.VERCEL_PROJECT_PRODUCTION_URL);
  return host ? `https://${host}` : "http://localhost:3000";
}

const vercel: SiteEnv = {
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
  VERCEL_URL: process.env.VERCEL_URL,
};

export const siteConfig = {
  name: "Bluff",
  description: "A dice game of nerve. Roll in secret, bid boldly, and call out the liars.",
  url: siteUrl(vercel),
  isProduction: isProductionSite(vercel),
  repository: "https://github.com/markdavid000/bluff",
} as const;
