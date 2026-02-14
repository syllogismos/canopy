# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Canopy — "Manus AI for Bharat." A voice-first autonomous agent that completes complex real-life tasks for Indian consumers through natural conversation in any Indian language (Hindi, Tamil, Kannada, Telugu, 24+ languages via Gemini Live API). Built entirely on Google Gemini's agentic stack.

The agent plans and executes multi-step workflows (not just chat), showing its reasoning transparently at every step. Split-screen UX: voice conversation on one side, live reasoning trace + structured results on the other.

**Target use cases:** train search/comparison (IRCTC), price comparison (Flipkart/Amazon), government scheme eligibility, nearby service discovery via Maps. Demo should show 2-3 impressive end-to-end completions.

**Why Gemini over other LLMs:** native Google Search grounding, Google Maps grounding, Live API voice in Indian languages, and Flash thinking mode with visible reasoning traces — capabilities no competitor offers natively.

## Stack

- **Runtime:** Bun (native TypeScript)
- **Backend:** Hono web framework + Socket.io for real-time streaming
- **Frontend:** React + Vite + Tailwind CSS v4 + Socket.io client
- **AI:** Google Gemini SDK (`@google/genai`) — Live API for voice, Flash with `thinkingConfig` for planning/function-calling, Google Search and Maps grounding

## Development Approach

Test-driven development (TDD) — write tests before implementation. Use Bun's built-in test runner.
Never run the servers yourself, they are already running in a seperate terminal

## Expected Commands

```bash
bun install                    # install dependencies
bun run dev                    # start dev (likely turbo or concurrent server+web)
bun run --cwd apps/server src/index.ts   # run backend
bun run --cwd apps/web dev     # run frontend (vite)
```

## Typecheck & Build

Use `bunx` (not `npx`) to run TypeScript and Vite. `cd` into each app directory first.

```bash
# Typecheck
cd apps/web && bunx tsc --noEmit       # typecheck frontend
cd apps/server && bunx tsc --noEmit    # typecheck server (ignore pre-existing bun-types error)

# Build
cd apps/web && bunx vite build         # production build frontend
```

**Note:** The server has a pre-existing `TS2688: Cannot find type definition file for 'bun-types'` error in its tsconfig — this is not a real failure and can be ignored.

## Architecture

Monorepo with `apps/server`, `apps/web`, and `packages/shared`.

**Data flow:** Browser mic → PCM16 audio over Socket.io → Hono server → Gemini Live API (voice) → Agent Orchestrator (classify intent → plan steps → execute with grounding → structured output) → results + reasoning traces streamed back via Socket.io → React UI.

**Key server modules:**
- `agent/orchestrator.ts` — multi-step planner, drives the classify→plan→execute→format loop
- `agent/classifier.ts` — maps user intent to one of 4 task types
- `agent/trace.ts` — emits reasoning trace events over Socket.io
- `gemini/live.ts` — Gemini Live API WebSocket for bidirectional audio
- `gemini/flash.ts` — Flash model with `thinkingConfig` for visible reasoning
- `gemini/grounding.ts` — Google Search + Maps grounding
- `tools/` — function-calling implementations (trains, prices, gov-schemes, nearby, upi)

**Key frontend modules:**
- `VoicePanel` — mic capture via MediaRecorder, transcript display
- `ReasoningPanel` — live streaming of thinking/planning trace
- Result cards — TrainResults, PriceComparison, SchemeEligibility, MapView

**Shared types** live in `packages/shared/types.ts`.

## Gemini-Specific Patterns

- Voice uses **Gemini Live API** (WebSocket-based, bidirectional audio), not REST
- Planning uses **Flash with `thinkingConfig: { thinkingBudget: 2048 }`** — extract `part.thought` parts and stream them as trace events
- Search/Maps grounding and function calling are configured per-request via the Gemini SDK
- Structured output uses JSON schemas for comparison tables and checklists

## Frontend Development

When designing or developing any frontend components, pages, or UI features, always use the `/frontend-design` skill. This ensures production-grade, visually polished interfaces that avoid generic AI aesthetics. Use it for building new components (VoicePanel, ReasoningPanel, result cards, etc.), redesigning existing UI, or creating any user-facing screens.

## Fallback Strategy

If Live API is unreliable, swap to Flash text + browser Web Speech API (STT/TTS). The voice layer should be abstracted so it's swappable.
