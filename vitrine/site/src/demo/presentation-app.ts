// Mode présentation (src/demo/presentation.tsx, identique dans les cinq applications) : ce que joue le CLIENT.
// Étape 1 : Carine choisit le Relais Bastos, met le défroisseur de Boutique B au panier (seul article), passe commande
// et valide le paiement MTN MoMo, par les mêmes fonctions que ses écrans (panier, paiement, frais D10 et CamPay) : le
// paiement confirmé publie « order.paid » vers le vendeur. Ensuite, son suivi montre ce que font les autres.
import type { ActeurPresentation } from './presentation'
import { refTemoin } from './presentation'
import { source } from '../donnees/source'
import { calculer, fraisPaiement } from '../donnees/frais'
import { ACTEURS_DEMO } from './pont'

export const ACTEUR: ActeurPresentation = {
  async executer(n) {
    if (n !== 1 || refTemoin()) return
    await source.choisirRelais(ACTEURS_DEMO.relais.court)
    for (const l of (await source.panier()).lignes) await source.retirerLigne(l.id)
    await source.ajouterProduit(ACTEURS_DEMO.produit.id, {}, 1)
    const p = await source.panier()
    if (p.lignes.length !== 1) throw new Error('le défroisseur n’est pas au panier')
    const l = p.lignes[0]
    const f = calculer('relais', [{ boutique: l.boutique, zone: p.boutiques[l.boutique]?.zone ?? '', articles: [{ prix: l.prix, quantite: l.qte, classe: l.classe }] }])
    const livraison = f.total - f.sousTotal
    const moyen = (await source.moyensPaiement()).find((m) => m.parDefaut && m.operateur === 'MTN') ?? null
    const c = await source.passerCommande({ mode: 'relais', moyen: 'mtn', comptoir: false, numero: moyen?.numeroMasque ?? null, livraison, frais: fraisPaiement('mobile', f.total), prime: 0 })
    if (c.etat !== 'payee') await source.confirmerPaiement(c.ref)
  },
  synchroniser() {
    void source.commandes()
  },
  ecran(n) {
    const ref = refTemoin()
    if (n === 0) return '/'
    return ref ? '/suivi?ref=' + ref : null
  },
}
