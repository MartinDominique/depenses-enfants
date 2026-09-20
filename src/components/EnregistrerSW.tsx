"use client";

import { useEffect } from "react";

export function EnregistrerSW() {
  useEffect(() => {
    // Page chargée avec succès : on réarme le rechargement automatique (voir error.tsx).
    try {
      sessionStorage.removeItem("rechargement-version");
    } catch {}
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => console.warn("SW non enregistré", e));
  }, []);
  return null;
}
