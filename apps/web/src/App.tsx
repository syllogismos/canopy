import { useEffect, useState } from "react";
import { socket } from "./socket";

export default function App() {
  const [connected, setConnected] = useState(false);

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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Canopy</h1>
        <span
          className={`text-sm px-2 py-1 rounded ${connected ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}
        >
          {connected ? "Connected" : "Disconnected"}
        </span>
      </header>

      <main className="flex-1 grid grid-cols-2 divide-x divide-gray-800">
        <section className="p-6 flex flex-col items-center justify-center">
          <p className="text-gray-400">Voice Panel</p>
        </section>

        <section className="p-6 flex flex-col items-center justify-center">
          <p className="text-gray-400">Reasoning Panel</p>
        </section>
      </main>
    </div>
  );
}
