/**
 * WelcomeScreen — The empty-state UI shown when the chat has no messages yet.
 *
 * Displays the Grok logo, a title, and suggestion cards that the user can click
 * to instantly send a pre-written prompt. This is only shown on the /chat page
 * before any messages are sent.
 *
 * HOW TO MODIFY:
 * - To change the suggestions: edit the SUGGESTIONS array below
 * - To remove suggestions: delete the grid section from the JSX
 * - To add a different empty state: replace this component's return JSX entirely
 * - This component is rendered by ChatInterface when messages.length === 0
 */

"use client";

import { Globe, Code, Sparkles } from "lucide-react";
import { GrokLogo } from "./GrokLogo";

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const SUGGESTIONS = [
  {
    icon: <Globe className="w-4 h-4" />,
    label: "Search the web",
    prompt: "What are the latest breakthroughs in AI research this week?",
  },
  {
    icon: <XLogo className="w-4 h-4" />,
    label: "Search 𝕏",
    prompt: "What is trending on X about AI agents right now?",
  },
  {
    icon: <Code className="w-4 h-4" />,
    label: "Run code",
    prompt: "Calculate the first 20 Fibonacci numbers and plot them on a chart",
  },
  {
    icon: <Sparkles className="w-4 h-4" />,
    label: "Creative",
    prompt: "Write a short poem about the beauty of open-source software",
  },
];

export function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32">
      {/* Logo */}
      <div className="mb-6 relative">
        <div className="absolute inset-0 blur-3xl opacity-20 bg-[#e44d26] rounded-full scale-150" />
        <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <GrokLogo className="w-10 h-10 text-[#e44d26]" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold tracking-tight text-zinc-100 mb-2">
        Grok Chat
      </h1>
      <p className="text-zinc-500 text-sm max-w-md text-center mb-10 leading-relaxed">
        Powered by{" "}
        <span className="text-zinc-400 font-medium">grok-4-1-fast</span>
        {" · "}web search, 𝕏 search, and code execution enabled
      </p>

      {/* Suggestion cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestionClick(s.prompt)}
            className="group relative flex items-start gap-3 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all text-left"
          >
            <span className="flex-shrink-0 mt-0.5 text-zinc-500 group-hover:text-[#e44d26] transition-colors">
              {s.icon}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors mb-0.5">
                {s.label}
              </div>
              <div className="text-sm text-zinc-500 group-hover:text-zinc-400 transition-colors line-clamp-2">
                {s.prompt}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}