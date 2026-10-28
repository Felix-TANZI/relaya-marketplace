// Mode présentation (src/demo/presentation.tsx, identique dans les cinq applications) : ce que joue l'ENTREPRISE.
// Étape 3 : Yafé Express accepte le paquet publié au « C'est prêt » de Boutique B (plafond du palier, capacité de la
// zone, un livreur disponible) puis l'affecte à Serge A. (éligibilité calculée comme le serveur) : le livreur reçoit
// le paquet, le vendeur, le client et le relais voient le livreur affecté. Par les mêmes fonctions que ses écrans.
import type { ActeurPresentation } from './presentation'
import { attendre, paquetTemoin } from './presentation'
import { LIVREUR_DEMO } from './pont'
import { demoAffectation } from './affectation'
import { demoPaquets, paquetsDemo, statutA } from './paquets'
import { maintenant } from './horloge'

const paquet = (id: string) => paquetsDemo.lire().paquets.find((p) => p.id === id) ?? null

export const ACTEUR: ActeurPresentation = {
  async executer(n) {
    if (n !== 3) return
    let id = ''
    await attendre(() => !!(id = paquetTemoin() ?? '') && !!paquet(id), 'le paquet de la commande témoin n’est pas publié')
    if (statutA(paquet(id)!, maintenant()) === 'publie') {
      const r = await demoPaquets.accepter(id)
      if (!r.ok) throw new Error('acceptation refusée : ' + r.raison)
    }
    const p = paquet(id)!
    if (p.statut === 'affecte' && p.livreurId === LIVREUR_DEMO) return
    const r = await demoAffectation.affecter(id, LIVREUR_DEMO)
    if (!r.ok) throw new Error('affectation refusée : ' + r.raison)
  },
  synchroniser() {
    paquetsDemo.lire()
  },
  ecran(n, faite) {
    const id = paquetTemoin()
    if (n <= 2 || !id) return '/paquets'
    if (n === 3) return faite ? '/affectation?id=' + id : '/paquets'
    return '/missions'
  },
}
