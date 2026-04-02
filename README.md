# xAI Sales Bootcamp — Grok Starter Kit

A ready-to-go Next.js app with a fully working Grok chat interface, xAI tool integrations (web search, 𝕏 search, code execution), and a placeholder homepage. This is your quickstart checkpoint — the chat and xAI integration are already built so you can focus on building your own sales app on top.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set your xAI API key (already in .env if cloned from bootcamp)
#    If not, create a .env file:
echo 'XAI_API_KEY="your-key-here"' > .env

# 3. Start the dev server
npm run dev

# 4. Open http://localhost:3000 in your browser
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              ← Root layout (fonts, metadata, wraps all pages)
│   ├── page.tsx                ← Homepage at / (placeholder landing page)
│   ├── globals.css             ← Global styles (Tailwind + markdown + animations)
│   ├── chat/
│   │   └── page.tsx            ← Chat page at /chat (renders ChatInterface)
│   └── api/
│       └── chat/
│           └── route.ts        ← Backend API: streams Grok responses to the client
└── components/
    ├── ChatInterface.tsx       ← Main chat UI (input, messages, streaming, state)
    ├── MessageBubble.tsx       ← Renders a single message (text, tools, sources)
    ├── ToolCallDisplay.tsx     ← Renders a tool call pill (web search, code, etc.)
    ├── SourcesDisplay.tsx      ← Renders source citation links from search results
    ├── WelcomeScreen.tsx       ← Empty-state UI with suggestion cards
    └── GrokLogo.tsx            ← SVG logo component
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React)                                                │
│                                                                 │
│  ChatInterface.tsx                                              │
│    └─ useChat() hook (from @ai-sdk/react)                       │
│        ├─ Manages messages[] state                              │
│        ├─ Sends POST to /api/chat via DefaultChatTransport      │
│        │   └─ body: () => ({ previousResponseId }) (ref-based)  │
│        ├─ Parses streaming UIMessageStream response             │
│        └─ Updates UI in real-time (text deltas, tool calls)     │
│                                                                 │
│  MessageBubble.tsx                                              │
│    ├─ "text" parts → ReactMarkdown                              │
│    ├─ "tool-*" parts → ToolCallDisplay (uses providerExecuted)  │
│    └─ "source-url" parts → SourcesDisplay                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │ POST /api/chat
                               │ { messages (UIMessage[]), previousResponseId }
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Server (Next.js API Route)                                     │
│                                                                 │
│  src/app/api/chat/route.ts                                      │
│    ├─ convertToModelMessages(messages)  ← UIMessage→ModelMessage│
│    └─ streamText() (from Vercel AI SDK)                         │
│        ├─ model: xai.responses("grok-4-1-fast")                 │
│        ├─ messages: modelMessages (converted)                   │
│        ├─ tools: web_search, x_search, code_execution           │
│        ├─ providerOptions: { xai: { previousResponseId } }     │
│        └─ returns streaming UIMessageStream response            │
└──────────────────────────────┬──────────────────────────────────┘
                               │ xAI Responses API
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  xAI API (api.x.ai)                                            │
│    ├─ Runs the Grok model                                       │
│    ├─ Executes built-in tools server-side (providerExecuted)    │
│    └─ Streams response events back                              │
└─────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Conversation Continuity (previousResponseId)

Instead of sending the full message history on every request, this app uses xAI's `previousResponseId`. After each response, the server sends the response ID as message metadata. The client saves it in a ref and sends it back on the next request. xAI remembers the conversation context server-side.

**Flow:** Server sends `{ responseId }` as metadata → Client saves it in a ref (`previousResponseIdRef`) → `DefaultChatTransport.body` is a function that reads the ref on each request → xAI uses it to continue the conversation.

> **Important:** The transport must be created once (via `useState` initializer) with `body` as a function. If the transport is recreated on every state change (e.g., via `useMemo` with `previousResponseId` as a dep), `useChat` resets and the chat hangs.

### Streaming

Responses stream token-by-token using Vercel AI SDK's `UIMessageStream` protocol. The `useChat` hook on the client automatically parses the stream and updates the `messages[]` array in real-time. Tool calls appear with spinners while running and collapse when done.

### Tool Calls

The three built-in xAI tools are:
- **web_search** — Searches the live internet and returns source URLs
- **x_search** — Searches posts on 𝕏 (Twitter) and returns source URLs
- **code_execution** — Runs Python code on xAI's servers and returns output

These are provider-executed tools (they run on xAI's infrastructure, not your server). The AI decides when to use them based on the user's message.

**Stream lifecycle for provider-executed tools:**
```
tool-input-start      → state: "input-streaming"  (spinner shown)
tool-input-delta      → (input text streams in)
tool-input-available  → state: "input-available", providerExecuted: true  (✓ done)
text-start            → (text response begins, tool results baked in)
```

> **Note:** Provider-executed tools never emit a `tool-output-available` chunk. The `output` field is never set. Completion is detected via `providerExecuted === true && state === "input-available"` in `ToolCallDisplay.tsx`.

### Message Format Conversion

The frontend (`useChat` / `DefaultChatTransport`) sends messages in `UIMessage[]` format (with `parts`), but `streamText()` expects `ModelMessage[]` format (with `role` + `content`). The API route bridges these with `convertToModelMessages()` from the `ai` package.

## Common Modifications

### Add a System Prompt

In `src/app/api/chat/route.ts`, add a `system` field to the `streamText()` call:

```ts
const result = streamText({
  model: xai.responses("grok-4-1-fast"),
  system: "You are a helpful sales assistant for Acme Corp. Be concise, friendly, and always suggest relevant products.",
  messages: modelMessages,
  // ... rest stays the same
});
```

### Change the Model

In `src/app/api/chat/route.ts`, change the model string:

```ts
model: xai.responses("grok-4-1"),  // Use grok-4-1 instead of grok-4-1-fast
```

### Remove a Tool

In `src/app/api/chat/route.ts`, delete the tool from the `tools` object:

```ts
tools: {
  web_search: xai.tools.webSearch(),
  // removed x_search and code_execution
},
```

### Add a New Page

Create a new file at `src/app/your-page/page.tsx`:

```tsx
export default function YourPage() {
  return <div>Your new page content</div>;
}
```

It will be available at `/your-page`.

### Add a Sidebar or Dashboard Layout

Create `src/app/chat/layout.tsx` to wrap just the chat page:

```tsx
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 p-4">
        {/* Sidebar content */}
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| [Next.js](https://nextjs.org) | 16 | React framework with App Router |
| [Vercel AI SDK](https://sdk.vercel.ai) | 6 | `streamText`, `useChat`, UI streaming protocol |
| [@ai-sdk/xai](https://sdk.vercel.ai/providers/ai-sdk-providers/xai) | 3 | xAI provider (model + tools) |
| [Tailwind CSS](https://tailwindcss.com) | 4 | Utility-first CSS framework |
| [Lucide React](https://lucide.dev) | latest | Icon library |
| [react-markdown](https://github.com/remarkjs/react-markdown) | 10 | Markdown rendering for AI responses |
| [remark-gfm](https://github.com/remarkjs/remark-gfm) | 4 | GitHub-flavored markdown (tables, strikethrough) |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `XAI_API_KEY` | Yes | Your xAI API key from [console.x.ai](https://console.x.ai) |

## Scripts

```bash
npm run dev      # Start development server (with hot reload)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Useful Links

- [xAI API Docs](https://docs.x.ai) — API reference, models, tools
- [xAI Console](https://console.x.ai) — Get API keys, view usage
- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs) — useChat, streamText, providers
- [xAI Provider Docs](https://sdk.vercel.ai/providers/ai-sdk-providers/xai) — xAI-specific SDK docs
- [Next.js Docs](https://nextjs.org/docs) — App Router, API routes, deployment
- [Tailwind CSS Docs](https://tailwindcss.com/docs) — Utility classes reference
