/*
  main.tsx
  Entry point that mounts the localized React booking application.
*/

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./i18n";
import "./styles.css";
import App from "./App";
import { FeedbackProvider } from "./components/FeedbackProvider";

const root = document.getElementById("root");
if (!root) throw new Error("Application root was not found.");

// Mount one feedback provider above routing so notifications survive public and admin navigation.
createRoot(root).render(<StrictMode><BrowserRouter><FeedbackProvider><App /></FeedbackProvider></BrowserRouter></StrictMode>);
