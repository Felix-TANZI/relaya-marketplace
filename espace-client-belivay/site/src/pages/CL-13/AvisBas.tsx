// Écran « Tes notes sont envoyées » après une note basse (CL-13, DP-35) : la feuille posée sur l'avis, qui
// propose de signaler un problème ; balisage du prototype, rendu logique (DP-53, AvisDonner.tsx).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { PageAvis } from './AvisDonner'

export function AvisBas() {
  return <PageAvis bas />
}
