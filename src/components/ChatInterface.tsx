/**
 * ChatInterface — The main chat UI component (used on the /chat page).
 *
 * DATA FLOW:
 * 1. User types a message → handleSubmit() → sendMessage({ text })
 * 2. useChat (via DefaultChatTransport) POSTs to /api/chat with:
 *    - messages: the conversation history
 *    - previousResponseId: from the last response (passed via transport.body)
 * 3. The API streams back a UIMessageStream response
 * 4. useChat auto-parses the stream into `messages[]` with typed parts:
 *    - "text" parts → rendered as markdown
 *    - "tool-web_search" / "tool-x_search" / "tool-code_execution" → ToolCallDisplay
 *    - "source-url" parts → SourcesDisplay
 * 5. On finish, we extract responseId from message metadata and save it
 *    so the next request uses it for conversation continuity.
 *
 * KEY DEPENDENCIES:
 * - useChat from @ai-sdk/react — manages messages state, streaming, sending
 * - DefaultChatTransport from ai — handles HTTP transport to /api/chat
 * - MessageBubble — renders individual messages (see MessageBubble.tsx)
 * - WelcomeScreen — shown when no messages exist (see WelcomeScreen.tsx)
 *
 * HOW TO MODIFY:
 * - To change the API endpoint: edit the `api` field in DefaultChatTransport
 * - To send extra data to the server: add fields to `body` in DefaultChatTransport
 * - To change the chat header: edit the <header> JSX below
 * - To change the input area: edit the <form> JSX at the bottom
 * - To add a sidebar: wrap the return JSX in a flex container
 */

"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRef, useEffect, useState, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { Send, StopCircle, Plus, ArrowDown, Home } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { WelcomeScreen } from "./WelcomeScreen";
import { GrokLogo } from "./GrokLogo";

/** Shape of the metadata our API route attaches to each assistant message. */
type ChatMetadata = { responseId?: string };

export function ChatInterface() {
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState("");

  // Use a ref for previousResponseId so the transport stays stable across renders.
  // If we put this in useMemo deps, the transport gets recreated on every response,
  // which resets useChat and causes the chat to hang.
  const previousResponseIdRef = useRef<string | null>(null);

  // Create the transport ONCE — body is a function so it always reads the latest ref value.
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ previousResponseId: previousResponseIdRef.current }),
      })
  );

  const {
    messages,
    status,
    sendMessage,
    stop,
    setMessages,
  } = useChat({
    transport,
    onFinish: ({ message }) => {
      // Extract responseId from message metadata sent by the server
      const meta = (message as UIMessage<ChatMetadata>)?.metadata;
      if (meta?.responseId) {
        previousResponseIdRef.current = meta.responseId;
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";
  const hasMessages = messages.length > 0;

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isStreaming) {
      scrollToBottom();
    }
  }, [messages, isStreaming, scrollToBottom]);

  // Track scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [inputValue]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const text = inputValue.trim();
      if (!text || isStreaming) return;
      setInputValue("");
      sendMessage({ text });
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    },
    [inputValue, isStreaming, sendMessage]
  );

  const handleSuggestionClick = useCallback(
    (text: string) => {
      setInputValue("");
      sendMessage({ text });
    },
    [sendMessage]
  );

  const handleNewChat = useCallback(() => {
    setMessages([]);
    previousResponseIdRef.current = null;
    setInputValue("");
    textareaRef.current?.focus();
  }, [setMessages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as FormEvent);
      }
    },
    [handleSubmit]
  );

  return (
    <div className="flex flex-col h-screen bg-[#09090b]">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-zinc-800/50 bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GrokLogo className="w-5 h-5 text-[#e44d26]" />
            <span className="text-sm font-semibold text-zinc-200 tracking-tight">
              Grok
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono">
              4-1-fast
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center justify-center w-8 h-8 text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all"
            >
              <Home className="w-3.5 h-3.5" />
            </Link>
            {hasMessages && (
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                New chat
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative"
      >
        {!hasMessages ? (
          <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {messages.map((message, i) => (
              <MessageBubble key={`${message.id}-${i}`} message={message} />
            ))}

            {/* Streaming indicator (thinking state before first content) */}
            {status === "submitted" && (
              <div className="flex gap-3 animate-message">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-zinc-800 text-zinc-300">
                  <GrokLogo className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-medium text-zinc-400 mb-1">
                    Grok
                  </div>
                  <div className="flex items-center gap-1 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 typing-dot" />
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 typing-dot" />
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 typing-dot" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}

        {/* Scroll to bottom button */}
        {showScrollButton && hasMessages && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-32 right-1/2 translate-x-1/2 z-20 w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-all shadow-lg"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-zinc-800/50 bg-[#09090b]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-[#e44d26]/20 transition-all">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Grok..."
                rows={1}
                disabled={isStreaming}
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none resize-none min-h-[24px] max-h-[200px] leading-relaxed disabled:opacity-50"
              />
              {isStreaming ? (
                <button
                  type="button"
                  onClick={stop}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all"
                >
                  <StopCircle className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[#e44d26] hover:bg-[#ff6b45] disabled:opacity-30 disabled:hover:bg-[#e44d26] text-white transition-all disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-center mt-2.5 gap-3">
            <span className="text-[10px] text-zinc-600">
              Grok can make mistakes. Consider verifying important information.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}