// Coque des pages AJ-A : la coque commune (Ecran, src/composants/coque.tsx), dont l'état — en-tête enfant de verre
// INTOUCHABLE (retour, titre, marque BelivaY), barre du bas — est écrit par npm run inventaire à partir de routes.ts
// (titre, retour, onglet). La classe « aja » porte les styles propres au groupe (aja.css).
import type { ReactNode } from 'react'
import { Ecran } from '../../composants/coque'
import './aja.css'

export function EcranAJ(p: { route: string; titre?: string; retour?: string; onglet?: string | null; fixes?: ReactNode; children?: ReactNode }) {
  return (
    <Ecran route={p.route} retour={p.retour} fixes={p.fixes ? <div className="aja">{p.fixes}</div> : undefined}>
      <div className="aja">{p.children}</div>
    </Ecran>
  )
}
