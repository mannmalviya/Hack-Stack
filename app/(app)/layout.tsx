import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
