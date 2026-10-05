// Bloc d'un module derrière un interrupteur (CCH-18, CFS-02, CTV-34) : affiché seulement si le module est
// ouvert ; aucune balise ajoutée, le balisage du prototype reste identique quand il l'est. Avec plusieurs
// modules (un encadré qui en regroupe plusieurs), affiché si l'un d'eux au moins est ouvert.
import type { ReactNode } from 'react'
import type { Interrupteur } from '../config/interrupteurs'
import { useSession } from '../session'

export function Module({ ff, children }: { ff: Interrupteur | Interrupteur[]; children: ReactNode }) {
  const { interrupteurs } = useSession()
  const tous = Array.isArray(ff) ? ff : [ff]
  return tous.some((f) => interrupteurs[f]) ? <>{children}</> : null
}
