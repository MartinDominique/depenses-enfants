"use client";

import { useEffect } from "react";

/** Après un déploiement, une page restée ouverte référence d'anciennes Server Actions :
 *  on recharge simplement pour récupérer la nouvelle version. */
function estVersionPerimee(message: string) {
  return /Server Action .* was not found|failed-to-find-server-action/i.test(message);
}

export default function Erreur({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const perimee = estVersionPerimee(error.message);

  useEffect(() => {
    if (!perimee) return;
    try {
      if (sessionStorage.getItem("rechargement-version") === "1") return;
      sessionStorage.setItem("rechargement-version", "1");
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }, [perimee]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold">{perimee ? "Nouvelle version disponible" : "Une erreur est survenue"}</h1>
      <p className="max-w-md text-sm text-muted">
        {perimee ? "L'application a été mise à jour. Rechargement en cours…" : error.message}
      </p>
      <button
        onClick={() => {
          try {
            sessionStorage.removeItem("rechargement-version");
          } catch {}
          if (perimee) window.location.reload();
          else reset();
        }}
        className="btn-primaire"
      >
        {perimee ? "Recharger" : "Réessayer"}
      </button>
    </main>
  );
}
