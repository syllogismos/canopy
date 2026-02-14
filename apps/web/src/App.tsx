import { useEffect, useState } from "react";
import { socket } from "./socket";
import { useAgent } from "./hooks/useAgent";
import { ChatPanel } from "./components/ChatPanel";

const LANGUAGES = [
  { code: "auto", label: "Auto-detect" },
  { code: "Telugu", label: "తెలుగు (Telugu)" },
  { code: "Hindi", label: "हिन्दी (Hindi)" },
  { code: "Tamil", label: "தமிழ் (Tamil)" },
  { code: "Kannada", label: "ಕನ್ನಡ (Kannada)" },
  { code: "Malayalam", label: "മലയാളം (Malayalam)" },
  { code: "Bengali", label: "বাংলা (Bengali)" },
  { code: "Marathi", label: "मराठी (Marathi)" },
  { code: "Gujarati", label: "ગુજરાતી (Gujarati)" },
  { code: "Punjabi", label: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "Odia", label: "ଓଡ଼ିଆ (Odia)" },
  { code: "Assamese", label: "অসমীয়া (Assamese)" },
  { code: "Urdu", label: "اردو (Urdu)" },
  { code: "English", label: "English" },
];

export default function App() {
  const [connected, setConnected] = useState(false);
  const { messages, activeTraceEvents, isProcessing, pendingQuestion, sendMessage, answerQuestion, resetSession, language, setLanguage } = useAgent();

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connection:ack", (data) => {
      console.log("Server ack:", data);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connection:ack");
      socket.disconnect();
    };
  }, []);

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col font-sans">
      <header className="border-b border-white/[0.06] px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <span className="text-[10px] font-bold text-gray-950">C</span>
            </div>
            <h1 className="text-sm font-semibold tracking-tight">Canopy</h1>
          </div>
          <span className="text-[10px] text-gray-600 font-mono">v0.1</span>
        </div>
        <div className="flex items-center gap-4">
          {messages.length > 0 && (
            <button
              onClick={resetSession}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-900 border border-white/[0.08] rounded-lg hover:text-white hover:border-red-500/50 hover:bg-red-500/10 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              End Session
            </button>
          )}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-gray-900 border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-gray-300 font-medium outline-none focus:border-amber-500/50 hover:border-white/[0.15] transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_8px_center] bg-no-repeat pr-7"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <div
              className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`}
            />
            <span className="text-[11px] text-gray-500 font-mono">
              {connected ? "connected" : "disconnected"}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <ChatPanel
          messages={messages}
          activeTraceEvents={activeTraceEvents}
          isProcessing={isProcessing}
          pendingQuestion={pendingQuestion}
          onSendMessage={sendMessage}
          onAnswerQuestion={answerQuestion}
        />
      </main>
    </div>
  );
}
