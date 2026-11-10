import { siteConfig } from "@/config/site";
import { landingCopy } from "../copy";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-6 px-6 py-24"
    >
      <h1
        id="hero-title"
        className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl"
      >
        {siteConfig.name}
      </h1>
      <p className="text-xl font-medium">{landingCopy.tagline}</p>
      <p className="max-w-xl text-lg text-muted-foreground">{landingCopy.explainer}</p>
    </section>
  );
}
