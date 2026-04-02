/**
 * Homepage (/) — Landing page for the app.
 *
 * This is a placeholder landing page. It showcases the app's capabilities and
 * links to the /chat page. Replace this entirely with your own app's UI.
 *
 * ROUTING:
 * - This file is src/app/page.tsx → renders at /
 * - The chat page is src/app/chat/page.tsx → renders at /chat
 * - The API route is src/app/api/chat/route.ts → handles POST /api/chat
 *
 * HOW TO MODIFY:
 * - To replace with a dashboard: rewrite this file's default export
 * - To add new pages: create a new folder in src/app/ with a page.tsx file
 *   Example: src/app/leads/page.tsx → renders at /leads
 * - To add a layout shared by all pages: edit src/app/layout.tsx
 * - This is a Server Component (no "use client") so it renders on the server.
 *   To add interactivity, either add "use client" or extract client components.
 *
 * TECH STACK:
 * - Next.js 16 App Router with Tailwind CSS v4
 * - Lucide React for icons
 * - next/link for client-side navigation
 */

import Link from "next/link";
import { GrokLogo } from "@/components/GrokLogo";
import {
  MessageSquare,
  Globe,
  Code,
  Zap,
  ArrowRight,
  Layers,
  BookOpen,
  Rocket,
} from "lucide-react";

/** The feature cards shown on the homepage. Edit these to match your app. */
const FEATURES = [
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Chat Interface",
    description:
      "A production-ready conversational UI with streaming responses, markdown rendering, and auto-scroll.",
  },
  {
    icon: <Globe className="w-5 h-5" />,
    title: "Web & 𝕏 Search",
    description:
      "Grok can search the live web and 𝕏 (Twitter) in real-time to answer questions with up-to-date information.",
  },
  {
    icon: <Code className="w-5 h-5" />,
    title: "Code Execution",
    description:
      "Grok can write and run code on the fly — great for calculations, data analysis, and generating charts.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Streaming & Tools",
    description:
      "Responses stream in token-by-token. Tool calls are displayed live with spinners and expandable details.",
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: "Responses API",
    description:
      "Built on xAI's Responses API with conversation continuity via response IDs — no manual history management.",
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: "Fully Documented",
    description:
      "Every file is commented for AI coding assistants. Ask Grok to modify, extend, or rebuild any part of this app.",
  },
];

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      {/* ── Navigation bar ── */}
      <nav className="border-b border-zinc-800/50 bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GrokLogo className="w-5 h-5 text-[#e44d26]" />
            <span className="text-sm font-semibold text-zinc-200 tracking-tight">
              xAI Sales Bootcamp
            </span>
          </div>
          <Link
            href="/chat"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#e44d26] hover:bg-[#ff6b45] rounded-lg transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            Open Chat
          </Link>
        </div>
      </nav>

      {/* ── Hero section ── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-16">
        {/* Glow + logo */}
        <div className="relative mb-8">
          <div className="absolute inset-0 blur-[80px] opacity-25 bg-[#e44d26] rounded-full scale-[2]" />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <GrokLogo className="w-14 h-14 text-[#e44d26]" />
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-100 text-center max-w-3xl leading-[1.15]">
          Your AI-Powered
          <br />
          <span className="text-[#e44d26]">Sales Assistant</span> Starter Kit
        </h1>

        <p className="mt-5 text-zinc-400 text-base sm:text-lg text-center max-w-2xl leading-relaxed">
          A ready-to-go Next.js app with a full Grok chat interface, xAI tool
          integrations, and everything you need to build your own AI sales
          tool.{" "}
          <span className="text-zinc-300 font-medium">
            Just ask an AI coding assistant to customize it.
          </span>
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/chat"
            className="group flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-[#e44d26] hover:bg-[#ff6b45] rounded-xl transition-all shadow-lg shadow-[#e44d26]/20 hover:shadow-[#e44d26]/30"
          >
            <Rocket className="w-4 h-4" />
            Try the Chat
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <a
            href="https://docs.x.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all"
          >
            <BookOpen className="w-4 h-4" />
            xAI Docs
          </a>
        </div>

        {/* Tech pills */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {[
            { label: "Next.js 16", icon: null },
            { label: "Grok 4-1 Fast", icon: null },
            { label: "Vercel AI SDK", icon: null },
            { label: "Web Search", icon: <Globe className="w-3 h-3" /> },
            { label: "𝕏 Search", icon: <XLogo className="w-3 h-3" /> },
            { label: "Code Execution", icon: <Code className="w-3 h-3" /> },
          ].map((pill) => (
            <span
              key={pill.label}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-zinc-400"
            >
              {pill.icon}
              {pill.label}
            </span>
          ))}
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 text-center mb-8">
            What&apos;s included
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group relative p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/30 transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[#e44d26] group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </span>
                  <h3 className="text-sm font-semibold text-zinc-200">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800/50 py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <GrokLogo className="w-3.5 h-3.5 text-zinc-600" />
            <span>xAI Sales Bootcamp Starter</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <a
              href="https://docs.x.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-400 transition-colors"
            >
              xAI Docs
            </a>
            <a
              href="https://sdk.vercel.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-400 transition-colors"
            >
              Vercel AI SDK
            </a>
            <a
              href="https://nextjs.org/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-400 transition-colors"
            >
              Next.js Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

