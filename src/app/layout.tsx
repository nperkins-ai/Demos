/**
 * Root Layout — The top-level layout that wraps every page in the app.
 *
 * WHAT THIS FILE DOES:
 * - Sets the <html> and <body> tags for the entire application
 * - Loads the Geist Sans and Geist Mono fonts from Google Fonts
 * - Imports the global CSS file (globals.css) which includes Tailwind + custom styles
 * - Sets page metadata (title, description) for SEO and browser tabs
 *
 * HOW TO MODIFY:
 * - To change the app title: edit the `title` field in `metadata`
 * - To add a favicon: replace src/app/favicon.ico
 * - To change fonts: swap Geist/Geist_Mono for other next/font/google fonts
 * - To add a global provider (auth, theme, etc.): wrap {children} in your provider
 * - To add analytics: add a <Script> tag inside <body>
 *
 * NEXT.JS CONCEPT:
 * In the App Router, layout.tsx files wrap all pages in their directory and
 * subdirectories. This root layout wraps EVERYTHING (/, /chat, /api, etc.).
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/components/I18nProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SATUSEHAT + Grok AI",
  description:
    "Indonesia Healthcare Demo - Integrated health information system powered by Grok AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
