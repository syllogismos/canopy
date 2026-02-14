import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatMessage } from "../hooks/useAgent";

interface ChatPanelProps {
  messages: ChatMessage[];
  isProcessing: boolean;
  onSendMessage: (text: string) => void;
}

export function ChatPanel({ messages, isProcessing, onSendMessage }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isProcessing) return;
    onSendMessage(text);
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-4 scroll-smooth">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}

        {isProcessing && <ThinkingIndicator />}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] px-4 py-2 transition-colors focus-within:border-amber-500/40 focus-within:bg-white/[0.06]">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything in any language..."
            disabled={isProcessing}
            className="flex-1 bg-transparent text-sm text-gray-100 placeholder:text-gray-500 outline-none disabled:opacity-50"
            autoFocus
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
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

      <h2
        className="text-lg font-semibold text-gray-200 mb-3 tracking-tight"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
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
        <div className="whitespace-pre-wrap break-words">{message.text}</div>
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

function ThinkingIndicator() {
  return (
    <div className="flex justify-start animate-[fadeSlideUp_0.3s_ease-out]">
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl rounded-bl-md bg-white/[0.04] border border-white/[0.06]">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70 animate-[bounce_1.2s_ease-in-out_infinite]" />
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70 animate-[bounce_1.2s_ease-in-out_0.2s_infinite]" />
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70 animate-[bounce_1.2s_ease-in-out_0.4s_infinite]" />
        </div>
        <span className="text-xs text-gray-400">Canopy is thinking...</span>
      </div>
    </div>
  );
}
