import { useEffect, useRef, useState, type FormEvent } from "react";
import type { TraceEvent } from "@canopy/shared";
import type { ChatMessage, PendingQuestion } from "../hooks/useAgent";
import { ComparisonTable, Checklist } from "./TraceCards";
import { InlineThinking, MessageTraceToggle } from "./InlineThinking";

interface ChatPanelProps {
  messages: ChatMessage[];
  activeTraceEvents: TraceEvent[];
  isProcessing: boolean;
  pendingQuestion: PendingQuestion | null;
  onSendMessage: (text: string) => void;
  onAnswerQuestion: (eventId: string, answer: string) => void;
}

export function ChatPanel({ messages, activeTraceEvents, isProcessing, pendingQuestion, onSendMessage, onAnswerQuestion }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [multiSelectChoices, setMultiSelectChoices] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isWaitingForAnswer = !!pendingQuestion;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing, activeTraceEvents, pendingQuestion]);

  // Reset multi-select when question changes
  useEffect(() => {
    setMultiSelectChoices(new Set());
  }, [pendingQuestion?.eventId]);

  // Focus input when waiting for text answer
  useEffect(() => {
    if (isWaitingForAnswer && pendingQuestion?.questionType === "text") {
      inputRef.current?.focus();
    }
  }, [isWaitingForAnswer, pendingQuestion?.questionType]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    if (isWaitingForAnswer) {
      onAnswerQuestion(pendingQuestion!.eventId, text);
      setInput("");
      inputRef.current?.focus();
      return;
    }

    if (isProcessing) return;
    onSendMessage(text);
    setInput("");
    inputRef.current?.focus();
  };

  const handleSelectOption = (option: string) => {
    if (!pendingQuestion) return;
    onAnswerQuestion(pendingQuestion.eventId, option);
    setInput("");
  };

  const handleConfirm = (yes: boolean) => {
    if (!pendingQuestion) return;
    onAnswerQuestion(pendingQuestion.eventId, yes ? "Yes" : "No");
  };

  const handleMultiSelectToggle = (option: string) => {
    setMultiSelectChoices((prev) => {
      const next = new Set(prev);
      if (next.has(option)) next.delete(option);
      else next.add(option);
      return next;
    });
  };

  const handleMultiSelectSubmit = () => {
    if (!pendingQuestion || multiSelectChoices.size === 0) return;
    onAnswerQuestion(pendingQuestion.eventId, Array.from(multiSelectChoices).join(", "));
    setMultiSelectChoices(new Set());
  };

  const inputDisabled = isProcessing && !isWaitingForAnswer;
  const placeholder = isWaitingForAnswer
    ? pendingQuestion?.placeholder || "Type your answer..."
    : "Ask anything in any language...";

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
          )}

          {/* Question type-specific UI */}
          {isWaitingForAnswer && pendingQuestion && (
            <QuestionOptions
              question={pendingQuestion}
              multiSelectChoices={multiSelectChoices}
              onSelect={handleSelectOption}
              onConfirm={handleConfirm}
              onMultiSelectToggle={handleMultiSelectToggle}
              onMultiSelectSubmit={handleMultiSelectSubmit}
            />
          )}

          {isProcessing && !isWaitingForAnswer && <InlineThinking events={activeTraceEvents} />}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="shrink-0 border-t border-white/[0.06] px-5 py-4 bg-gray-950">
        <div className={`max-w-3xl mx-auto flex items-center gap-3 rounded-2xl bg-white/[0.04] border px-4 py-2 transition-colors ${
          isWaitingForAnswer
            ? "border-amber-500/40 bg-amber-500/[0.04]"
            : "border-white/[0.08] focus-within:border-amber-500/40 focus-within:bg-white/[0.06]"
        }`}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={inputDisabled}
            className="flex-1 bg-transparent text-sm text-gray-100 placeholder:text-gray-500 outline-none disabled:opacity-50"
            autoFocus
          />
          <button
            type="submit"
            disabled={!input.trim() || inputDisabled}
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/90 text-gray-950 transition-all hover:bg-amber-400 disabled:opacity-20 disabled:hover:bg-amber-500/90 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Question option buttons ─── */

function QuestionOptions({
  question,
  multiSelectChoices,
  onSelect,
  onConfirm,
  onMultiSelectToggle,
  onMultiSelectSubmit,
}: {
  question: PendingQuestion;
  multiSelectChoices: Set<string>;
  onSelect: (option: string) => void;
  onConfirm: (yes: boolean) => void;
  onMultiSelectToggle: (option: string) => void;
  onMultiSelectSubmit: () => void;
}) {
  if (question.questionType === "confirm") {
    return (
      <div className="flex justify-start animate-[fadeSlideUp_0.3s_ease-out]">
        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-sm text-emerald-300 hover:bg-emerald-500/25 transition-colors"
          >
            Yes
          </button>
          <button
            onClick={() => onConfirm(false)}
            className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-300 hover:bg-white/[0.08] transition-colors"
          >
            No
          </button>
        </div>
      </div>
    );
  }

  if (question.questionType === "select" && question.options?.length) {
    return (
      <div className="flex justify-start animate-[fadeSlideUp_0.3s_ease-out]">
        <div className="flex flex-wrap gap-2">
          {question.options.map((opt) => (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/15 text-sm text-amber-200 hover:bg-amber-500/20 hover:border-amber-500/30 transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (question.questionType === "multi_select" && question.options?.length) {
    return (
      <div className="flex justify-start animate-[fadeSlideUp_0.3s_ease-out]">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {question.options.map((opt) => {
              const selected = multiSelectChoices.has(opt);
              return (
                <button
                  key={opt}
                  onClick={() => onMultiSelectToggle(opt)}
                  className={`px-3.5 py-2 rounded-xl border text-sm transition-colors ${
                    selected
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-200"
                      : "bg-white/[0.04] border-white/[0.08] text-gray-300 hover:bg-white/[0.08]"
                  }`}
                >
                  {selected && (
                    <svg className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8.5l3.5 3.5 6.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {opt}
                </button>
              );
            })}
          </div>
          {multiSelectChoices.size > 0 && (
            <button
              onClick={onMultiSelectSubmit}
              className="px-4 py-2 rounded-xl bg-amber-500/90 text-gray-950 text-sm font-medium hover:bg-amber-400 transition-colors"
            >
              Submit ({multiSelectChoices.size} selected)
            </button>
          )}
        </div>
      </div>
    );
  }

  // text type — no extra buttons, just the input field
  return null;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 animate-[fadeIn_0.6s_ease-out]">
      {/* Warm glow orb */}
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/10 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400/30 to-amber-600/20 animate-pulse" />
        </div>
        <div className="absolute inset-0 w-20 h-20 rounded-full bg-amber-500/5 blur-xl" />
      </div>

      <h2 className="text-lg font-semibold text-gray-200 mb-3 tracking-tight font-sans">
        What can I help you with?
      </h2>
      <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
        Train schedules, price comparisons, government schemes, nearby services — ask in any language.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {[
          "Compare trains Mumbai → Delhi",
          "Nearby hospitals in Bangalore",
          "PM Kisan eligibility check",
        ].map((hint) => (
          <span
            key={hint}
            className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-gray-400"
          >
            {hint}
          </span>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const hasStructured = !isUser && message.structuredResults && message.structuredResults.length > 0;
  const hasTrace = !isUser && message.traceEvents && message.traceEvents.length > 0;

  return (
    <div
      className={`flex animate-[fadeSlideUp_0.3s_ease-out] ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-amber-500/15 text-amber-50 border border-amber-500/10 rounded-br-md"
            : "bg-white/[0.04] text-gray-200 border border-white/[0.06] rounded-bl-md"
        }`}
      >
        {hasTrace && <MessageTraceToggle events={message.traceEvents!} />}
        {message.text && (
          <div className="whitespace-pre-wrap break-words">{message.text}</div>
        )}
        {hasStructured && (
          <div className={`space-y-3 ${message.text ? "mt-3 pt-3 border-t border-white/[0.06]" : ""}`}>
            {message.structuredResults!.map((sr: any, i) =>
              sr.type === "comparison" ? (
                <ComparisonTable key={i} data={sr} />
              ) : sr.type === "checklist" ? (
                <Checklist key={i} data={sr} />
              ) : null
            )}
          </div>
        )}
        <div
          className={`text-[10px] mt-1.5 ${isUser ? "text-amber-500/40" : "text-gray-600"}`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}

