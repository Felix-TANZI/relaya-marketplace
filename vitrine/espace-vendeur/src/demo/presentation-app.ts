// Mode présentation (src/demo/presentation.tsx, identique dans les cinq applications) : ce que joue le VENDEUR.
// Étape 2 : Boutique B ouvre le bon de préparation de la commande témoin (prise en charge, « suborder.accepted »)
// puis marque « C'est prêt » (« suborder.ready » vers les entreprises de la zone et le client), par les mêmes
// fonctions que ses écrans (droits, journal signé, échéances).
import type { ActeurPresentation } from './presentation'
import { attendre, refTemoin } from './presentation'
import { appliquerCommandesClient, etatCommandes } from './commandes'
import { demoPreparation } from './preparation'

export const ACTEUR: ActeurPresentation = {
  async executer(n) {
    if (n !== 2) return
    const ref = refTemoin()
    if (!ref) throw new Error('la commande de Carine n’est pas arrivée')
    const etape = () => etatCommandes.lire()[ref]?.etape ?? null
    await attendre(() => (appliquerCommandesClient(), !!etape()), 'la commande de Carine n’est pas dans « À préparer »')
    if (etape() !== 'a_preparer') return
    await demoPreparation.ouvrirBon(ref)
    const r = await demoPreparation.cestPret(ref)
    if (!r.ok && r.raison !== 'deja_prete') throw new Error('« C’est prêt » refusé : ' + r.raison)
  },
  synchroniser() {
    appliquerCommandesClient()
  },
  ecran(n, faite) {
    const ref = refTemoin()
    if (n <= 1 || !ref) return '/commandes'
    if (n === 2) return faite ? '/commande_prete?ref=' + ref : '/commandes'
    return '/journal?ref=' + ref
  },
}
