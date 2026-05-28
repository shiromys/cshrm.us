import { AppSidebar } from "@/components/app-sidebar";
import { OnboardingGuard } from "@/components/onboarding-guard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingGuard>
      <div className="flex min-h-screen">
        <AppSidebar />
        <main className="flex-1 bg-gray-50 overflow-auto">
          {children}
        </main>
      </div>
    </OnboardingGuard>
  );
}
