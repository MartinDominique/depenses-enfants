"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, Download, Home, LogOut, Scale, Settings } from "lucide-react";
import { deconnexion } from "@/lib/actions/auth";

const LIENS = [
  { href: "/", libelle: "Accueil", icone: Home },
  { href: "/reglement", libelle: "Règlement", icone: Scale },
  { href: "/archives", libelle: "Archives", icone: Archive },
  { href: "/export", libelle: "Export", icone: Download },
  { href: "/parametres", libelle: "Réglages", icone: Settings },
];

function actif(pathname: string, href: string) {
  return href === "/" ? pathname === "/" || pathname.startsWith("/depenses") : pathname.startsWith(href);
}

export function NavigationHaut({ nom }: { nom: string }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">$</span>
          <span className="hidden sm:inline">Dépenses enfants</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {LIENS.map(({ href, libelle, icone: Icone }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                actif(pathname, href) ? "bg-primary/10 text-primary" : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              <Icone size={16} />
              {libelle}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">{nom}</span>
          <form action={deconnexion}>
            <button type="submit" title="Se déconnecter" className="rounded-lg p-2 text-muted hover:bg-background hover:text-foreground">
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function NavigationBas() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur md:hidden pb-safe">
      <div className="grid grid-cols-5">
        {LIENS.map(({ href, libelle, icone: Icone }) => {
          const a = actif(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${a ? "text-primary" : "text-muted"}`}
            >
              <Icone size={22} strokeWidth={a ? 2.4 : 1.8} />
              {libelle}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
