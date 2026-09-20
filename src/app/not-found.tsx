import Link from "next/link";

export default function NonTrouve() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold">Page introuvable</h1>
      <p className="text-muted">Cette dépense ou cette page n&apos;existe pas.</p>
      <Link href="/" className="btn-primaire">Retour à l&apos;accueil</Link>
    </main>
  );
}
