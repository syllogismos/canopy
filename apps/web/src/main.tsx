import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import { DebugTracePage } from "./pages/DebugTracePage";
import "./app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/debug-trace" element={<DebugTracePage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
