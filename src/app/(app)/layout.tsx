import Link from "next/link";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/data";
import { NavigationBas, NavigationHaut } from "@/components/Navigation";

export default async function LayoutApp({ children }: LayoutProps<"/">) {
  const { moi } = await getSession();
  return (
    <>
      <NavigationHaut nom={moi.nom} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-4 md:pb-10">{children}</main>
      <Link
        href="/depenses/nouvelle"
        className="fixed bottom-20 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-primary pl-4 pr-5 font-semibold text-white shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-95 md:bottom-8 md:right-8"
        aria-label="Ajouter une dépense"
      >
        <Plus size={22} />
        Dépense
      </Link>
      <NavigationBas />
    </>
  );
}
