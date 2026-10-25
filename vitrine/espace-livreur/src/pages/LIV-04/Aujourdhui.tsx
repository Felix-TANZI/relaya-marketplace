// LIV-P04 · Aujourd'hui (accueil), repris sur le prototype (route « aujourdhui », livA_today) : en-tête racine, corps
// partagé avec les feuilles « Mon statut » et « Mon kit d'emballage » (Journee.tsx), barre du bas.
import { Ecran } from '../../composants/coque'
import { CorpsAujourdhui } from './Journee'

export default function Aujourdhui() {
  return (
    <Ecran route="aujourdhui" proto>
      <CorpsAujourdhui />
    </Ecran>
  )
}
