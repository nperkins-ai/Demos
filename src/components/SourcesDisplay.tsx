/**
 * SourcesDisplay — Renders clickable source citation links below an assistant message.
 *
 * When Grok uses web_search or x_search, the API returns "source-url" parts
 * containing URLs and titles of the pages it referenced. This component renders
 * them as a horizontal row of pill-shaped links.
 *
 * PROPS:
 *   sources: SourceItem[] — Array of { url, title, sourceId } objects
 *
 * HOW TO MODIFY:
 * - To change the look: edit the <a> tag classes below
 * - To show favicons: add an <img> with `https://www.google.com/s2/favicons?domain=${hostname}`
 * - To limit visible sources: slice the `unique` array (e.g., unique.slice(0, 5))
 */

"use client";

import { ExternalLink } from "lucide-react";

interface SourceItem {
  url?: string;
  title?: string;
  sourceId?: string;
}

export function SourcesDisplay({ sources }: { sources: SourceItem[] }) {
  if (!sources || sources.length === 0) return null;

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = sources.filter((s) => {
    const url = s.url || "";
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });

  if (unique.length === 0) return null;

  return (
    <div className="mt-3 animate-message">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">
        Sources
      </div>
      <div className="flex flex-wrap gap-2">
        {unique.map((source, i) => {
          const hostname = (() => {
            try {
              return new URL(source.url!).hostname.replace("www.", "");
            } catch {
              return source.url || "source";
            }
          })();

          return (
            <a
              key={source.sourceId || i}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1c1c1f] border border-[#27272a] hover:border-[#3f3f46] hover:bg-[#27272a] transition-all text-xs text-zinc-400 hover:text-zinc-200 group"
            >
              <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-[#e44d26] transition-colors" />
              <span className="truncate max-w-[200px]">
                {source.title || hostname}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}