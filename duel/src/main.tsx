import React from "react";
import { createRoot } from "react-dom/client";
import DuelBoard from "./DuelBoard.tsx";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DuelBoard />
  </React.StrictMode>
);
