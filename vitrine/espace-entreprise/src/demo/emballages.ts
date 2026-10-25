// DONNÉES DE DÉMONSTRATION — domaine « emballages » (ENT-P21) : stock avancé par BelivaY au début du pilote (bon signé
// lundi 12 octobre), étiquettes consommées = colis des prestations (src/demo/prestations.ts : 13 S, 8 M), une pochette M
// déclarée abîmée ; M est au seuil de réassort (src/calculs/ent08.ts). Plages d'étiquettes par livreur ; une remise en
// attente de la confirmation du livreur. Gestes : propriétaire et répartiteur.
import type { DomaineEmballages, EtatEmballages, PlageEtiquettes, RefusEmballage } from '../donnees/domaines/emballages'
import type { Resultat } from '../donnees/communs'
import { auSeuil, chevauche } from '../calculs/ent08'
import { PARAMETRES } from '../calculs/registre'
import { maintenant } from './horloge'
import { livreurCourt } from './jeu-essai'
import { exiger } from './acces'
import { livreursDemo } from './livreurs'
import { J } from './prestations'
import { magasin, repondre } from './stockage'

const plage = (id: string, du: number, au: number, liees: number, livreur: string | null): PlageEtiquettes => ({ id, du, au, liees, statut: livreur ? 'remise' : 'au_stockage', livreur: livreur ? livreurCourt(livreur) : null })

export const emballagesDemo = magasin('emballages', (): EtatEmballages => ({
  stock: [
    { format: 'S', remis: 40, consommes: 13, declaresAbimes: 0, auStockage: 9, enKits: 18, dernierInventaire: null },
    { format: 'M', remis: 12, consommes: 8, declaresAbimes: 1, auStockage: 1, enKits: 2, dernierInventaire: null },
    { format: 'L', remis: 6, consommes: 0, declaresAbimes: 0, auStockage: 2, enKits: 4, dernierInventaire: null },
    { format: 'C1', remis: 3, consommes: 0, declaresAbimes: 0, auStockage: 3, enKits: 0, dernierInventaire: null },
    { format: 'C2', remis: 1, consommes: 0, declaresAbimes: 0, auStockage: 1, enKits: 0, dernierInventaire: null },
  ],
  remises: [
    { id: 'RM-1', le: J(-1, 13, 20), livreur: livreurCourt('l-junior'), items: [{ format: 'S', n: 8 }, { format: 'M', n: 4 }, { format: 'L', n: 2 }], plage: { du: 8127, au: 8142 }, statut: 'confirmee' },
    { id: 'RM-2', le: J(-1, 13, 22), livreur: livreurCourt('l-brice'), items: [{ format: 'S', n: 4 }, { format: 'M', n: 2 }], plage: { du: 8101, au: 8106 }, statut: 'confirmee' },
    { id: 'RM-3', le: J(-1, 13, 25), livreur: livreurCourt('l-paul'), items: [{ format: 'S', n: 8 }, { format: 'M', n: 4 }, { format: 'L', n: 2 }], plage: { du: 8107, au: 8118 }, statut: 'confirmee' },
    { id: 'RM-4', le: J(-1, 13, 27), livreur: livreurCourt('l-ines'), items: [{ format: 'S', n: 3 }, { format: 'M', n: 1 }], plage: { du: 8123, au: 8126 }, statut: 'confirmee' },
    { id: 'RM-5', le: J(0, 12, 45), livreur: livreurCourt('l-hugo'), items: [{ format: 'S', n: 4 }], plage: { du: 8119, au: 8122 }, statut: 'en_attente' },
  ],
  commandes: [],
  plages: [
    plage('PL-1', 8101, 8106, 2, 'l-brice'),
    plage('PL-2', 8107, 8118, 8, 'l-paul'),
    plage('PL-3', 8119, 8122, 1, 'l-hugo'),
    plage('PL-4', 8123, 8126, 1, 'l-ines'),
    plage('PL-5', 8127, 8142, 9, 'l-junior'),
    plage('PL-6', 8143, 8160, 0, null),
  ],
  ecarts: [{ format: 'M', attendu: 4, compte: 3, justifie: 1, motif: 'Pochette déchirée à l’ouverture du kit' }],
  ecartMoisPct: 0,
  dernierBon: { le: J(-1, 12, 30), par: 'Gaëlle Wankeu', items: [{ format: 'S', n: 40 }, { format: 'M', n: 12 }, { format: 'L', n: 6 }, { format: 'C1', n: 3 }, { format: 'C2', n: 1 }] },
  pointStockage: 'Agence Yafé Express, carrefour Mokolo-Elobi',
}))

const non = (raison: RefusEmballage): Promise<Resultat<object, RefusEmballage>> => repondre({ ok: false as const, raison })
const oui = (): Promise<Resultat<object, RefusEmballage>> => repondre({ ok: true as const })
const GESTE = ['proprietaire', 'repartiteur'] as const

export const demoEmballages: DomaineEmballages = {
  async etat() {
    return repondre(emballagesDemo.lire())
  },
  async remettre(p) {
    exiger([...GESTE], 'Remettre des emballages')
    const e = emballagesDemo.lire()
    const l = livreursDemo.lire().livreurs.find((x) => x.id === p.livreurId)
    const items = p.items.filter((i) => i.n > 0)
    if (!l || l.statut === 'en_activation' || l.statut === 'suspendu' || l.statut === 'retire' || !items.length) return non('quantite')
    if (items.some((i) => i.n > (e.stock.find((s) => s.format === i.format)?.auStockage ?? 0))) return non('quantite')
    if (p.plage) {
      if (p.plage.du > p.plage.au) return non('plage')
      const source = e.plages.find((x) => x.statut === 'au_stockage' && x.du <= p.plage!.du && p.plage!.au <= x.au)
      if (!source) return non(e.plages.some((x) => x.statut !== 'au_stockage' && chevauche(x, p.plage!)) ? 'chevauchement' : 'plage')
    }
    const t = maintenant()
    emballagesDemo.ecrire((s) => {
      for (const i of items) {
        const st = s.stock.find((x) => x.format === i.format)!
        st.auStockage -= i.n
        st.enKits += i.n
      }
      if (p.plage) {
        const { du, au } = p.plage
        const src = s.plages.find((x) => x.statut === 'au_stockage' && x.du <= du && au <= x.au)!
        const reste = [src.du < du ? plage(src.id + 'a', src.du, du - 1, 0, null) : null, au < src.au ? plage(src.id + 'b', au + 1, src.au, 0, null) : null].filter((x): x is PlageEtiquettes => !!x)
        s.plages = [...s.plages.filter((x) => x !== src), ...reste, plage('PL-' + t, du, au, 0, l.id)].sort((a, b) => a.du - b.du)
      }
      s.remises.unshift({ id: 'RM-' + t, le: t, livreur: livreurCourt(l.id), items, plage: p.plage, statut: 'en_attente' })
    })
    return oui()
  },
  async commander(p) {
    exiger([...GESTE], 'Commander des emballages')
    const st = emballagesDemo.lire().stock.find((x) => x.format === p.format)
    if (!st || !auSeuil(st)) return non('au_dessus_du_seuil')
    if (!Number.isInteger(p.n) || p.n < 1 || p.n > st.remis * PARAMETRES.saisies.emballageCommandeMax) return non('quantite')
    const t = maintenant()
    emballagesDemo.ecrire((s) => void s.commandes.unshift({ id: 'CM-' + t, le: t, format: p.format, n: p.n, livraison: p.livraison, statut: 'envoyee' }))
    return oui()
  },
  async justifier(p) {
    exiger([...GESTE], 'Justifier un écart d’emballages')
    if (!Number.isInteger(p.n) || p.n < 1) return non('quantite')
    if (!p.motif.trim()) return non('motif')
    if (!p.photo) return non('photo')
    const st = emballagesDemo.lire().stock.find((x) => x.format === p.format)
    if (!st || p.n > st.auStockage + st.enKits) return non('quantite')
    emballagesDemo.ecrire((s) => {
      const x = s.stock.find((y) => y.format === p.format)!
      x.declaresAbimes += p.n
      if (x.auStockage >= p.n) x.auStockage -= p.n
      else x.enKits -= p.n - x.auStockage, (x.auStockage = 0)
      s.ecarts.push({ format: p.format, attendu: p.n, compte: 0, justifie: p.n, motif: p.motif.trim() })
    })
    return oui()
  },
  async declarerPlagePerdue(id) {
    exiger([...GESTE], 'Déclarer une plage d’étiquettes perdue')
    const pl = emballagesDemo.lire().plages.find((x) => x.id === id)
    if (!pl || pl.statut === 'perdue') return non('plage')
    emballagesDemo.ecrire((s) => void (s.plages.find((x) => x.id === id)!.statut = 'perdue'))
    return oui()
  },
}
