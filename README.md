# Canopy

Voice-first autonomous agent that completes complex real-life tasks for Indian consumers through natural conversation in any Indian language. Built on Google Gemini's agentic stack.

## Stack

- **Runtime:** Bun
- **Backend:** Hono + Socket.io
- **Frontend:** React + Vite + Tailwind CSS v4 + Socket.io client
- **AI:** Google Gemini SDK (Live API for voice, Flash for planning/function-calling, Search & Maps grounding)

## Getting Started

```bash
bun install
```

### Run both server and client

```bash
bun run dev
```

### Run individually

**Server** (http://localhost:3001):
```bash
bun run dev:server
```

**Client** (http://localhost:5173):
```bash
bun run dev:web
```
