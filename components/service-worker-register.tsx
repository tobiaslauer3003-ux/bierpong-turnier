"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installation ist ein Nice-to-have — Fehler hier sollen die App nicht blockieren.
      });
    }
  }, []);

  return null;
}
