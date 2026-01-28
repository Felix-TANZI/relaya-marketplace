import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes/router";
import "./i18n";

import "./index.css";

/* =====================================
   RELAYA – THEME INITIALIZATION
   ===================================== */

// Thème par défaut : dark
// (plus tard : stockage user / system preference)
document.documentElement.setAttribute("data-theme", "dark");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
