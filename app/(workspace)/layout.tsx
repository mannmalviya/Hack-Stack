import { AppHeader } from "@/components/app-header";

/**
 * Full-bleed shell for judge workspace pages: no centered container and no
 * footer, so a page can split the entire viewport below the header.
 */
export default function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex h-screen flex-col">
      <AppHeader />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
