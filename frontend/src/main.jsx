import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import { AuthProvider } from "./context/AuthContext";
import { NotificationsProvider } from "./context/NotificationsContext";

import "./styles/global.css";
import "./styles/variables.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <NotificationsProvider>
      <App />
    </NotificationsProvider>
  </AuthProvider>,
);
