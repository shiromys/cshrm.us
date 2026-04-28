import HomePage from "./(public)/home/page";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

// Root serves the public homepage with nav/footer
export default function RootPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNav />
      <main className="flex-1">
        <HomePage />
      </main>
      <PublicFooter />
    </div>
  );
}
