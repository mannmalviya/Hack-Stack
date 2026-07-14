import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HackStack | Evidence for hackathon judging",
  description:
    "Evidence-backed project briefs and feature verification for hackathon judges.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
