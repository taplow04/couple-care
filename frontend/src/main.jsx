import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { ChatUnreadProvider } from "./context/ChatUnreadContext";

import { registerServiceWorker } from "./services/push.service";

import "./styles/variables.css";
import "./styles/global.css";
import "./styles/animations.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <ThemeProvider>
      <NotificationsProvider>
        <ChatUnreadProvider>
          <App />
        </ChatUnreadProvider>
      </NotificationsProvider>
    </ThemeProvider>
  </AuthProvider>,
);

// Register the service worker (enables web push + PWA). No-op if unsupported.
if (import.meta.env.PROD) {
  window.addEventListener("load", () => {
    registerServiceWorker();
  });
}
