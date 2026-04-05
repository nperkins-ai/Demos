import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MahaHealth Referral Grid",
  description:
    "Maharashtra Health Department intelligent referral platform with AI-assisted triage, real-time capacity, ABHA integration, voice support, and offline resilience.",
  manifest: "/manifest.json",
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
