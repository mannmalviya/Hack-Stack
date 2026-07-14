export default function LandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen bg-[#05060a] text-white">{children}</div>;
}
