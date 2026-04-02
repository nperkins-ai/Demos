/**
 * ToolCallDisplay — Renders a single tool invocation (web search, 𝕏 search, code execution).
 *
 * This component is used inside MessageBubble when a message part has type "tool-*".
 * It shows a compact pill with the tool name and a spinner while running, then
 * a checkmark when complete. Users can expand it to see input/output details.
 *
 * PROPS:
 *   toolName: string          — "web_search" | "x_search" | "code_execution" (or any custom tool)
 *   state: string             — The tool invocation state from the AI SDK:
 *                                "input-streaming"     → still receiving input params
 *                                "input-available"     → input ready (done if providerExecuted)
 *                                "output-available"    → done, output ready ✓
 *                                "output-error"        → execution failed ✗
 *                                "output-denied"       → approval denied ✗
 *   args: object              — The input parameters sent to the tool
 *   output: unknown           — The result returned by the tool (not set for provider-executed tools)
 *   providerExecuted: boolean — If true, the tool ran on xAI's servers. The stream will NOT
 *                                send a "tool-output-available" chunk; "input-available" is the
 *                                final state. Results are embedded in the text response instead.
 *
 * HOW TO MODIFY:
 * - To add a new tool: add an entry to the TOOL_META object below
 * - To change the look: edit the button/container classes
 * - To always show details: remove the expanded state and always render the content
 */

"use client";

import { Globe, Code, CheckCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface ToolCallDisplayProps {
  toolName: string;
  state: string;
  args?: Record<string, unknown>;
  output?: unknown;
  providerExecuted?: boolean;
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const TOOL_META: Record<string, { label: string; activeLabel: string; icon: React.ReactNode; color: string }> = {
  web_search: {
    label: "Searched the web",
    activeLabel: "Searching the web",
    icon: <Globe className="w-3.5 h-3.5" />,
    color: "text-blue-400",
  },
  x_search: {
    label: "Searched 𝕏",
    activeLabel: "Searching 𝕏",
    icon: <XLogo className="w-3.5 h-3.5" />,
    color: "text-zinc-300",
  },
  code_execution: {
    label: "Executed code",
    activeLabel: "Running code",
    icon: <Code className="w-3.5 h-3.5" />,
    color: "text-emerald-400",
  },
};

export function ToolCallDisplay({ toolName, state, args, output, providerExecuted }: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = TOOL_META[toolName] || {
    label: toolName,
    activeLabel: toolName,
    icon: <Code className="w-3.5 h-3.5" />,
    color: "text-zinc-400",
  };

  // For xAI provider-executed tools (web_search, x_search, code_execution),
  // the stream never sends a "tool-output-available" chunk — the tool runs on
  // xAI's infrastructure and results are baked into the text response.
  // The stream goes: tool-input-start → tool-input-delta → tool-input-available
  // (with providerExecuted: true), then straight to text-start.
  //
  // So the completion signals are:
  //   1. providerExecuted && state === "input-available" → xAI ran it, input is done
  //   2. output !== undefined → explicit output received (non-provider tools)
  //   3. state === "output-available" / "output-error" / "output-denied" → standard SDK states
  const isDone =
    (providerExecuted && state === "input-available") ||
    output !== undefined ||
    state === "output-available" ||
    state === "output-error" ||
    state === "output-denied";
  const isRunning = !isDone;
  const hasError = state === "output-error";
  const hasDetails = (args && Object.keys(args).length > 0) || output !== undefined;

  return (
    <div className="my-2 animate-message">
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1c1c1f] border border-[#27272a] transition-all w-full text-left group ${
          hasDetails ? "hover:border-[#3f3f46] cursor-pointer" : "cursor-default"
        }`}
      >
        {/* Status icon */}
        <span className={`flex-shrink-0 ${meta.color}`}>
          {isRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : hasError ? (
            <span className="text-red-400">
              <Code className="w-3.5 h-3.5" />
            </span>
          ) : (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          )}
        </span>

        {/* Tool icon + name */}
        <span className={`flex-shrink-0 ${meta.color}`}>{meta.icon}</span>
        <span className="text-sm text-zinc-300 font-medium">
          {isRunning ? meta.activeLabel : meta.label}
        </span>

        {/* Shimmer bar when running */}
        {isRunning && (
          <div className="flex-1 h-1 rounded-full shimmer ml-2 max-w-[100px]" />
        )}

        {/* Expand toggle */}
        {!isRunning && hasDetails && (
          <span className="ml-auto text-zinc-500 group-hover:text-zinc-400 transition-colors">
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && !isRunning && (
        <div className="mt-1 mx-1 p-3 rounded-lg bg-[#1c1c1f] border border-[#27272a] text-xs font-mono overflow-x-auto">
          {args && Object.keys(args).length > 0 && (
            <div className="mb-2">
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Input</span>
              <pre className="mt-1 text-zinc-400 whitespace-pre-wrap break-all">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          {output !== undefined && (
            <div>
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Output</span>
              <pre className="mt-1 text-zinc-400 whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                {typeof output === "string" ? output : JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}