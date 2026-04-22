import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";


// List of DOM errors that are cosmetic and should be suppressed
const IGNORABLE_DOM_ERRORS = [
  "removeChild",
  "insertBefore",
  "not a child of this node",
];

function isIgnorableDOMError(message: string | undefined): boolean {
  if (!message) return false;
  return IGNORABLE_DOM_ERRORS.some(msg => message.includes(msg));
}

// Global error handler to catch and suppress cosmetic DOM errors from Radix UI
// These errors are caused by race conditions in portal cleanup but don't affect functionality
window.addEventListener('error', (event) => {
  if (isIgnorableDOMError(event.error?.message) || isIgnorableDOMError(event.message)) {
    console.warn('[Global] Suppressed cosmetic DOM error:', event.error?.message || event.message);
    event.preventDefault();
    event.stopImmediatePropagation();
    return false;
  }
}, true); // Use capture phase to catch errors early

// Also catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (isIgnorableDOMError(event.reason?.message)) {
    console.warn('[Global] Suppressed cosmetic DOM rejection:', event.reason?.message);
    event.preventDefault();
    event.stopImmediatePropagation();
    return false;
  }
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
