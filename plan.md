# Canopy — Technical Stack & Build Plan

## Motivation

"Manus AI for Bharat" — a voice-first autonomous agent that completes complex real-life tasks for Indian consumers through natural conversation in any Indian language. The paradigm shift is from "AI answers questions" to "AI completes tasks" (inspired by Manus AI, Moonshot Kimi, ByteDance Doubao).

**Why Gemini specifically:**
- Gemini Live API — natural voice in 24+ Indian languages (Hindi, Tamil, Kannada, Telugu, etc.) with barge-in support. No other LLM offers this natively.
- Google Search grounding — real-time prices, train schedules, government scheme details. Native to Gemini, not available in competing LLMs.
- Google Maps grounding — nearby services, routes, travel times. Unique to Gemini.
- Flash thinking mode with visible reasoning traces — the "show your work" pattern (SurgAgent approach that won the Google Cloud hackathon).

**India-specific pain points this targets:**
- IRCTC train search/booking complexity
- Government document maze (PAN-Aadhaar linking, scheme eligibility)
- E-commerce price comparison across Flipkart/Amazon
- Discovering nearby services in Tier-2/3 cities

**Critical differentiator from a chatbot:** the agent plans and executes multi-step workflows using multiple tools simultaneously, showing reasoning at every step. Split-screen UX: voice conversation on one side, live reasoning trace + structured results on the other.

**Demo strategy:** Scope to 3-4 specific task types. Show 2-3 impressive end-to-end task completions rather than 10 half-working ones. The transparent reasoning trace is the "wow factor."

## Stack Decision

Finalized stack, all TypeScript:

**Runtime & Framework**
- **Bun** — faster than Node, native TS, built-in WebSocket server
- **Hono** — lightweight web framework (works great with Bun)

**Frontend**
- **React + Vite** — fast dev, split-screen UI
- **Tailwind CSS** — rapid styling
- **Socket.io client** — real-time reasoning trace streaming

**Backend**
- **Hono API server** on Bun
- **Socket.io** — bidirectional streaming for reasoning traces + voice status
- **Google Gemini SDK (`@google/genai`)** — all Gemini interactions

**Gemini APIs (the core)**
- **Gemini Live API** — WebSocket-based voice conversation (bidirectional audio)
- **Gemini 3 Flash Preview** with `thinkingConfig` — planning & function calling with visible reasoning
- **Google Search grounding** — real-time prices, schedules, schemes
- **Google Maps grounding** — nearby services, routes
- **Structured output** — JSON schemas for comparison tables, checklists

**External integrations (function calling targets)**
- IRCTC unofficial APIs / search grounding fallback for train data
- Price comparison via search grounding (Flipkart/Amazon)
- UPI deep link generation (`upi://pay?...`) not sure of this.

## Architecture

```
┌─────────────────────────────────────────────┐
│                 FRONTEND (React)             │
│  ┌──────────────┐  ┌─────────────────────┐  │
│  │  Voice Panel  │  │  Reasoning Panel    │  │
│  │  - Mic input  │  │  - Live trace       │  │
│  │  - Transcript │  │  - Search results   │  │
│  │  - Status     │  │  - Structured cards │  │
│  └──────┬───────┘  └──────────┬──────────┘  │
│         │    Socket.io         │             │
└─────────┼─────────────────────┼─────────────┘
          │                     │
┌─────────┴─────────────────────┴─────────────┐
│              BACKEND (Hono + Bun)            │
│                                              │
│  ┌─────────────────────────────────────┐     │
│  │         Agent Orchestrator          │     │
│  │  - Task classifier                  │     │
│  │  - Multi-step planner               │     │
│  │  - Tool dispatcher                  │     │
│  │  - Reasoning trace emitter          │     │
│  └──────────┬──────────────────────────┘     │
│             │                                │
│  ┌──────────┴──────────────────────────┐     │
│  │        Gemini Integration Layer     │     │
│  │  - Live API (voice ↔ text)          │     │
│  │  - Flash + thinking (planning)      │     │
│  │  - Search grounding                 │     │
│  │  - Maps grounding                   │     │
│  │  - Function calling                 │     │
│  └─────────────────────────────────────┘     │
│                                              │
│  ┌─────────────────────────────────────┐     │
│  │         Tool Implementations        │     │
│  │  - searchTrains()                   │     │
│  │  - comparePrices()                  │     │
│  │  - findGovSchemes()                 │     │
│  │  - findNearbyServices()             │     │
│  │  - generateUPILink()               │     │
│  └─────────────────────────────────────┘     │
└──────────────────────────────────────────────┘
```

## Project Structure

```
canopy/
├── package.json
├── turbo.json              # monorepo (optional, or just workspaces)
├── apps/
│   ├── server/
│   │   ├── src/
│   │   │   ├── index.ts              # Hono + Socket.io entry
│   │   │   ├── agent/
│   │   │   │   ├── orchestrator.ts   # Multi-step planner
│   │   │   │   ├── classifier.ts     # Intent → task type
│   │   │   │   └── trace.ts          # Reasoning trace emitter
│   │   │   ├── gemini/
│   │   │   │   ├── live.ts           # Live API voice handler
│   │   │   │   ├── flash.ts          # Flash + thinking config
│   │   │   │   ├── grounding.ts      # Search + Maps grounding
│   │   │   │   └── schema.ts         # Structured output schemas
│   │   │   ├── tools/
│   │   │   │   ├── trains.ts
│   │   │   │   ├── prices.ts
│   │   │   │   ├── gov-schemes.ts
│   │   │   │   ├── nearby.ts
│   │   │   │   └── upi.ts
│   │   │   └── types.ts
│   │   └── tsconfig.json
│   └── web/
│       ├── src/
│       │   ├── App.tsx
│       │   ├── components/
│       │   │   ├── VoicePanel.tsx       # Mic, transcript, language
│       │   │   ├── ReasoningPanel.tsx   # Live trace stream
│       │   │   ├── ResultCard.tsx       # Comparison tables, maps
│       │   │   ├── TrainResults.tsx
│       │   │   ├── PriceComparison.tsx
│       │   │   ├── SchemeEligibility.tsx
│       │   │   └── MapView.tsx
│       │   ├── hooks/
│       │   │   ├── useVoice.ts          # MediaRecorder + streaming
│       │   │   └── useSocket.ts         # Socket.io connection
│       │   └── lib/
│       │       └── socket.ts
│       ├── index.html
│       └── tsconfig.json
└── packages/
    └── shared/
        └── types.ts                     # Shared types between server/web
```

## Key Implementation Details

**1. Voice Flow**
- Browser captures audio via `MediaRecorder` → streams PCM16 chunks over Socket.io
- Server pipes audio to Gemini Live API WebSocket
- Live API returns transcription + response audio
- Server intercepts when Live API triggers function calls → routes to orchestrator
- Audio response streamed back to browser for playback

**2. Agent Orchestrator**
```typescript
// Simplified flow
async function handleTask(userIntent: string, socket: Socket) {
  // Step 1: Classify
  const taskType = await classifyIntent(userIntent); // uses Flash
  socket.emit('trace', { step: 'classified', type: taskType });

  // Step 2: Plan
  const plan = await createPlan(taskType, userIntent); // Flash + thinking
  socket.emit('trace', { step: 'planned', plan });

  // Step 3: Execute steps with grounding
  for (const step of plan.steps) {
    socket.emit('trace', { step: 'executing', action: step });
    const result = await executeStep(step); // search/maps grounding + function calling
    socket.emit('trace', { step: 'result', data: result });
  }

  // Step 4: Structure output
  const structured = await formatResults(plan, results); // structured output schema
  socket.emit('result', structured);
}
```

**3. The 4 Demo Task Types**

| Task | Primary Grounding | Output |
|------|------------------|--------|
| Train search | Google Search | Comparison table (price, duration, availability) |
| Price comparison | Google Search | Side-by-side product cards |
| Gov scheme finder | Google Search + function calling | Eligibility checklist + step-by-step |
| Nearby services | Google Maps | Map + rated list |

**4. Thinking Trace Display**
```typescript
// Flash with thinking enabled
const response = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  generationConfig: {
    thinkingConfig: { thinkingBudget: 2048 }
  }
});

// Extract and stream thinking parts
for (const part of response.candidates[0].content.parts) {
  if (part.thought) {
    socket.emit('trace', { type: 'thinking', text: part.text });
  }
}
```

## 8-Hour Timeline (Solo + Claude Code)

| Hour | Focus |
|------|-------|
| 0-1 | Project scaffold: Bun + Hono server, Vite + React frontend, monorepo setup, env config |
| 1-3 | Gemini SDK integration: Flash + thinking, search grounding, task classifier, agent orchestrator |
| 3-5 | Voice pipeline: Live API WebSocket, audio streaming, voice ↔ agent integration |
| 5-7 | Frontend: split-screen layout, VoicePanel, ReasoningPanel (live trace), result cards, Socket.io hookup |
| 7-8 | End-to-end testing, polish, bug fixes, demo rehearsal |

## Dependencies (package.json highlights)

```json
{
  "dependencies": {
    "@google/genai": "latest",
    "hono": "^4",
    "socket.io": "^4",
    "socket.io-client": "^4"
  },
  "devDependencies": {
    "bun-types": "latest",
    "vite": "^6",
    "@vitejs/plugin-react": "^4",
    "tailwindcss": "^4",
    "typescript": "^5.5"
  }
}
```

## Development Approach

Test-driven development (TDD) — write tests before implementation for all modules. Use Bun's built-in test runner (`bun test`).

## Risk Mitigations

- **Live API flaky?** Fall back to Gemini Flash text + browser Web Speech API for STT/TTS. Build the voice layer as swappable.
- **Grounding rate limits?** Cache search/maps results aggressively. Pre-cache the 2-3 demo scenarios.
- **Time crunch?** The reasoning trace panel is the "wow factor" — prioritize that over voice polish. A text-input demo with live reasoning beats a buggy voice demo.

