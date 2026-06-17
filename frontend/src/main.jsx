import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import { AuthProvider } from "./context/AuthContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { ChatUnreadProvider } from "./context/ChatUnreadContext";

import { registerServiceWorker } from "./services/push.service";

import "./styles/global.css";
import "./styles/variables.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <NotificationsProvider>
      <ChatUnreadProvider>
        <App />
      </ChatUnreadProvider>
    </NotificationsProvider>
  </AuthProvider>,
);

// Register the service worker (enables web push + PWA). No-op if unsupported.
if (import.meta.env.PROD) {
  window.addEventListener("load", () => {
    registerServiceWorker();
  });
}
