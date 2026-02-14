import { useEffect, useState } from "react";
import { socket } from "./socket";
import { useAgent } from "./hooks/useAgent";
import { ChatPanel } from "./components/ChatPanel";

export default function App() {
  const [connected, setConnected] = useState(false);
  const { messages, activeTraceEvents, isProcessing, sendMessage } = useAgent();

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
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`}
          />
          <span className="text-[11px] text-gray-500 font-mono">
            {connected ? "connected" : "disconnected"}
          </span>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <ChatPanel
          messages={messages}
          activeTraceEvents={activeTraceEvents}
          isProcessing={isProcessing}
          onSendMessage={sendMessage}
        />
      </main>
    </div>
  );
}
