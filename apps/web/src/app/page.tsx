import { ScreenControls } from "@/components/shared/screen-controls";
import { Hero } from "@/features/landing";

export default function HomePage() {
  return (
    <main id="main" className="relative flex flex-1 flex-col">
      <ScreenControls className="absolute top-4 right-4" />
      <Hero />
    </main>
  );
}
