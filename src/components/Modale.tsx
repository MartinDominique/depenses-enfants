import Link from "next/link";
import { X } from "lucide-react";

/** Panneau plein écran sur mobile, fenêtre centrée sur grand écran. */
export function Modale({ titre, retour, children }: { titre: string; retour: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="carte flex max-h-[100dvh] w-full flex-col rounded-b-none sm:max-h-[92vh] sm:max-w-lg sm:rounded-b-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h1 className="text-lg font-bold">{titre}</h1>
          <Link href={retour} className="rounded-lg p-2 text-muted hover:bg-background" aria-label="Fermer">
            <X size={20} />
          </Link>
        </div>
        <div className="overflow-y-auto p-4 pb-safe">{children}</div>
      </div>
    </div>
  );
}
