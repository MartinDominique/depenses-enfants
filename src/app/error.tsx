"use client";

export default function Erreur({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
      <p className="max-w-md text-sm text-muted">{error.message}</p>
      <button onClick={reset} className="btn-primaire">Réessayer</button>
    </main>
  );
}
