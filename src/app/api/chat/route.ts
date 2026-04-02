/**
 * POST /api/chat — Backend API route that streams Grok responses to the client.
 *
 * ARCHITECTURE OVERVIEW:
 * This is a Next.js App Router API route. The frontend (ChatInterface.tsx) sends
 * a POST request here with the conversation messages. This route calls the xAI
 * Responses API via Vercel's AI SDK and streams the result back to the client.
 *
 * REQUEST BODY (sent by the frontend):
 * {
 *   messages: UIMessage[]       — The conversation history (managed by useChat)
 *   previousResponseId: string  — The xAI response ID from the last turn (enables
 *                                  conversation continuity without re-sending history)
 * }
 *
 * RESPONSE:
 * A streaming response in Vercel AI SDK's UIMessageStream format. The client
 * consumes this via the useChat hook which auto-parses text deltas, tool calls,
 * sources, and message metadata.
 *
 * ───────────────────────────────────────────────────────
 * HOW TO MODIFY (common changes):
 * ───────────────────────────────────────────────────────
 *
 * Change the model:
 *   Replace "grok-4-1-fast" with another model like "grok-3" or "grok-4-1"
 *
 * Add a system prompt:
 *   Add `system: "You are a helpful sales assistant for Acme Corp..."` to the
 *   streamText() call, right after `model`.
 *
 * Remove a tool:
 *   Delete the corresponding line from the `tools` object (e.g., remove code_execution).
 *
 * Add custom tools:
 *   xAI also supports `xai.tools.fileSearch()`, `xai.tools.viewImage()`, and
 *   `xai.tools.mcpServer()`. See: https://docs.x.ai/docs/tools
 *
 * Authentication / access control:
 *   Add auth checks at the top of the POST function before calling streamText().
 *   Example: verify a session token, check user roles, etc.
 *
 * ENVIRONMENT VARIABLES REQUIRED:
 *   XAI_API_KEY — Your xAI API key (set in .env file)
 */

import { xai } from "@ai-sdk/xai";
import { streamText, convertToModelMessages } from "ai";

/** Allow up to 2 minutes for long-running tool calls (web search, code execution). */
export const maxDuration = 120;

export async function POST(req: Request) {
  const { messages, previousResponseId } = await req.json();

  // Convert UIMessage[] (from the frontend's useChat hook) to ModelMessage[]
  // (what streamText expects). UIMessages have `parts`, while ModelMessages
  // have `role` + `content`.
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    // ── Model ──────────────────────────────────────────
    // xai.responses() uses the xAI Responses API (not the Chat Completions API).
    // The Responses API supports built-in tools and conversation continuity.
    model: xai.responses("grok-4-1-fast"),

    // ── System prompt ──────────────────────────────────
    // Uncomment and edit to give Grok a persona or instructions:
    // system: "You are a helpful sales assistant. Be concise and friendly.",

    // ── Conversation messages ──────────────────────────
    messages: modelMessages,

    // ── Tools ──────────────────────────────────────────
    // These are xAI's built-in server-side tools. They run on xAI's
    // infrastructure (not in the browser or on your server).
    // The AI decides when to use them based on the user's message.
    tools: {
      web_search: xai.tools.webSearch(),    // Search the live web
      x_search: xai.tools.xSearch(),        // Search posts on 𝕏 (Twitter)
      code_execution: xai.tools.codeExecution(), // Run Python code
    },

    // ── Provider options ───────────────────────────────
    // previousResponseId enables conversation continuity: xAI remembers
    // the prior context server-side, so we don't need to resend the full
    // message history on every request.
    providerOptions: {
      xai: {
        ...(previousResponseId ? { previousResponseId } : {}),
      },
    },
  });

  // ── Stream the response to the client ───────────────
  return result.toUIMessageStreamResponse({
    // Send source URLs (from web_search / x_search) so the frontend
    // can render clickable source links below the message.
    sendSources: true,

    // Attach the xAI response ID as message metadata. The frontend
    // reads this in onFinish and passes it back as previousResponseId
    // on the next request to maintain conversation continuity.
    messageMetadata: ({ part }) => {
      if (part.type === "finish-step" && part.response?.id) {
        return { responseId: part.response.id };
      }
      return undefined;
    },
  });
}
