import type { Depense, Profil } from "@/lib/types";
import { DepenseCarte } from "./DepenseCarte";
import { Vide } from "./ui";

export function ListeDepenses({ depenses, moi, profils, vide }: { depenses: Depense[]; moi: Profil; profils: Profil[]; vide: string }) {
  if (depenses.length === 0) return <Vide titre={vide} />;
  return (
    <div className="space-y-2">
      {depenses.map((d) => (
        <DepenseCarte key={d.id} d={d} moi={moi} profils={profils} />
      ))}
    </div>
  );
}
