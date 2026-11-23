const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const siteConfig = {
  name: "Bluff",
  description: "A dice game of nerve. Roll in secret, bid boldly, and call out the liars.",
  url: productionHost ? `https://${productionHost}` : "http://localhost:3000",
  repository: "https://github.com/markdavid000/bluff",
} as const;
