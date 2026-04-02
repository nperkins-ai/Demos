/**
 * MessageBubble — Renders a single message in the chat (user or assistant).
 *
 * PART TYPES (from Vercel AI SDK's UIMessage.parts[]):
 * Each message contains an array of "parts" that describe its content.
 * The part types this component handles:
 *
 *   "text"          → Markdown text content. Rendered with react-markdown.
 *   "tool-*"        → Tool invocations (e.g., "tool-web_search", "tool-x_search",
 *                      "tool-code_execution"). Each has: toolCallId, state, input, output.
 *                      States: "input-streaming" | "input-available" | "output-available" | "output-error"
 *   "source-url"    → Source citations from web/x search. Has: url, title, sourceId.
 *   "step-start"    → Internal SDK delimiter between multi-step responses. Ignored.
 *
 * HOW TO MODIFY:
 * - To change user message styling: edit the isUser conditional classes
 * - To change assistant avatar: replace the <GrokLogo> in the avatar section
 * - To add support for new part types: add a case to the switch statement
 * - To change markdown rendering: edit the ReactMarkdown props/plugins
 */

"use client";

import { type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User } from "lucide-react";
import { GrokLogo } from "./GrokLogo";
import { ToolCallDisplay } from "./ToolCallDisplay";
import { SourcesDisplay } from "./SourcesDisplay";

interface MessageBubbleProps {
  message: UIMessage;
}

/** Minimal shape for source-url parts we extract from the message. */
interface SourcePart {
  url?: string;
  title?: string;
  sourceId?: string;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isStreaming = message.parts?.some(
    (p) => p.type === "text" && (p as { state?: string }).state === "streaming"
  );

  // Collect source-url parts
  const sources: SourcePart[] = [];
  if (message.parts) {
    for (const part of message.parts) {
      if (part.type === "source-url") {
        sources.push(part as unknown as SourcePart);
      }
    }
  }

  return (
    <div className={`animate-message ${isUser ? "flex justify-end" : ""}`}>
      <div
        className={`flex gap-3 max-w-3xl ${
          isUser ? "flex-row-reverse" : ""
        }`}
      >
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
            isUser
              ? "bg-[#e44d26]/10 text-[#e44d26]"
              : "bg-zinc-800 text-zinc-300"
          }`}
        >
          {isUser ? (
            <User className="w-4 h-4" />
          ) : (
            <GrokLogo className="w-4 h-4" />
          )}
        </div>

        {/* Content */}
        <div className={`flex-1 min-w-0 ${isUser ? "text-right" : ""}`}>
          {/* Role label */}
          <div
            className={`text-xs font-medium mb-1 ${
              isUser ? "text-[#e44d26]" : "text-zinc-400"
            }`}
          >
            {isUser ? "You" : "Grok"}
          </div>

          {/* Message content */}
          <div
            className={`${
              isUser
                ? "inline-block rounded-2xl rounded-tr-sm bg-[#e44d26]/10 border border-[#e44d26]/20 px-4 py-2.5 text-zinc-100"
                : ""
            }`}
          >
            {message.parts?.map((part, i) => {
              switch (part.type) {
                case "text":
                  if (!part.text) return null;
                  return isUser ? (
                    <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap">
                      {part.text}
                    </p>
                  ) : (
                    <div key={i} className="prose text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {part.text}
                      </ReactMarkdown>
                    </div>
                  );

                case "source-url":
                  // Rendered separately below
                  return null;

                case "step-start":
                  return null;

                default: {
                  // Handle tool invocation parts: type is "tool-web_search", "tool-x_search", etc.
                  const partType = part.type as string;
                  if (partType.startsWith("tool-")) {
                    // In the AI SDK, tool parts have fields directly on them:
                    // toolCallId, state, input, output, toolName, providerExecuted
                    const toolPart = part as unknown as {
                      toolCallId: string;
                      state: string;
                      input?: Record<string, unknown>;
                      output?: unknown;
                      toolName?: string;
                      providerExecuted?: boolean;
                    };
                    const toolName = toolPart.toolName || partType.replace("tool-", "");
                    return (
                      <ToolCallDisplay
                        key={toolPart.toolCallId}
                        toolName={toolName}
                        state={toolPart.state}
                        args={toolPart.input}
                        output={toolPart.output}
                        providerExecuted={toolPart.providerExecuted}
                      />
                    );
                  }
                  return null;
                }
              }
            })}

            {/* Typing indicator for streaming with no text yet */}
            {isStreaming &&
              !message.parts?.some(
                (p) => p.type === "text" && (p as { text?: string }).text
              ) && (
                <div className="flex items-center gap-1 py-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 typing-dot" />
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 typing-dot" />
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 typing-dot" />
                </div>
              )}
          </div>

          {/* Sources */}
          {!isUser && sources.length > 0 && (
            <SourcesDisplay sources={sources} />
          )}
        </div>
      </div>
    </div>
  );
}