# Agent Instructions

This is a Next.js 16 App Router project with a Grok (xAI) chat interface built using Vercel AI SDK v6.

## Project Overview

- **Homepage** (`/`): Placeholder landing page at `src/app/page.tsx`. Replace with your app's UI.
- **Chat** (`/chat`): Full chat interface at `src/app/chat/page.tsx`. Renders `ChatInterface.tsx`.
- **API** (`POST /api/chat`): Backend route at `src/app/api/chat/route.ts`. Calls xAI Responses API via `streamText()`.

## Tech Stack

- Next.js 16 (App Router, NOT Pages Router)
- TypeScript (strict)
- Tailwind CSS v4 (utility classes, `@theme` config in globals.css — NOT tailwind.config.js)
- Vercel AI SDK v6 (`ai` and `@ai-sdk/react` packages)
- `@ai-sdk/xai` v3 for the xAI provider
- Lucide React for icons
- react-markdown + remark-gfm for rendering AI responses

## Key Patterns

### API Route Pattern
The backend route uses `streamText()` from the `ai` package with `xai.responses()` model. It first converts incoming `UIMessage[]` to `ModelMessage[]` via `convertToModelMessages()` (from `ai`), then passes the converted messages to `streamText()`. It returns `result.toUIMessageStreamResponse()`. Do NOT use `generateText()` for streaming chat — always use `streamText()`. Do NOT pass raw `UIMessage[]` directly to `streamText()` — always convert first.

### Frontend Chat Pattern
The frontend uses `useChat()` from `@ai-sdk/react` with `DefaultChatTransport` from `ai`. Messages are sent via `sendMessage({ text })`. The hook manages all state. The transport must be created once (via `useState` initializer) — not recreated on state changes — to avoid resetting the chat.

### Tool Calls
Tools are xAI provider-executed (server-side on xAI infrastructure). Available tools: `xai.tools.webSearch()`, `xai.tools.xSearch()`, `xai.tools.codeExecution()`. Tool parts appear in messages as `type: "tool-web_search"`, `type: "tool-x_search"`, etc. Fields are directly on the part: `part.toolCallId`, `part.state`, `part.input`, `part.providerExecuted`.

**Important:** Provider-executed tools never emit `tool-output-available` on the stream. The `output` field is never set. The tool is done when `providerExecuted === true && state === "input-available"`. Results are embedded in the text response that follows.

### Conversation Continuity
Uses `previousResponseId` (not full message history replay). The server sends `responseId` via `messageMetadata`. The client reads it in `onFinish` and stores it in a ref (`previousResponseIdRef`). The `DefaultChatTransport.body` is a function `() => ({ previousResponseId: ref.current })` so the transport object stays stable while always sending the latest value.

## Coding Conventions

- Use `"use client"` only on components that need browser APIs (hooks, event handlers, etc.)
- Pages and layouts are Server Components by default
- All styling is Tailwind utility classes — no CSS modules, no styled-components
- Color scheme uses zinc palette with `#e44d26` accent (xAI orange)
- Icons from `lucide-react` — import only what you need
- Components go in `src/components/`, pages in `src/app/`

## Common Tasks

- **Add system prompt**: Add `system: "..."` to `streamText()` in `src/app/api/chat/route.ts`
- **Change model**: Edit the string in `xai.responses("grok-4-1-fast")` in route.ts
- **Add a page**: Create `src/app/your-route/page.tsx`
- **Add a layout**: Create `layout.tsx` in any route folder
- **Modify chat UI**: Edit components in `src/components/`

## Environment Variables

- `XAI_API_KEY` — Required. Set in `.env` file.
