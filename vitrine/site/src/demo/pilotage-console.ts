// DONNÉES DE DÉMONSTRATION — ce que la console d'administration pilote sur le site client, lu dans le pont
// (src/demo/pont-console.ts, décisions « app: 'admin' ») et posé PAR-DESSUS le contenu livré :
// - photo_remplacee : photo d'une bannière du carrousel, d'un moment, d'une catégorie (univers « femme »…) ou d'un
//   produit (identifiant du catalogue) ; la dernière décision vaut ; « null » : la photo d'origine revient ;
// - promotion : promotions de la plateforme visibles pendant leur période (début ≤ maintenant < fin), jamais une
//   promotion arrêtée ou finie ;
// - acces_change : compte du client bloqué par BelivaY (bandeau sobre, motif ; « autorise » le lève). Le client de
//   démonstration est seul sur l'appareil : ce qui est adressé à un client est à lui (pont-console.ts, MOI).
import type { PhotoServeur, Produit } from '../donnees/source'
import { maintenant } from './horloge'
import { decisionsConsole } from './pont-console'
import type { Evenement } from './pont'

type Photo = Extract<Evenement, { type: 'photo_remplacee' }>
type Promo = Extract<Evenement, { type: 'promotion' }>
type Acces = Extract<Evenement, { type: 'acces_change' }>

/** Dernière photo posée par la console pour une cible (undefined : jamais touchée ; null : retirée). */
export function photoConsole(cible: Photo['cible'], id: string): PhotoServeur | null | undefined {
  const e = decisionsConsole('client')
    .filter((x): x is Photo => x.type === 'photo_remplacee' && x.cible === cible && x.id === id)
    .at(-1)
  if (!e) return undefined
  return e.photo ? { url: e.photo, alt: '' } : null
}

/** Produit avec la photo posée par la console en premier (la fiche et les listes la montrent). */
export function avecPhotoConsole<P extends Pick<Produit, 'p' | 'images'>>(p: P): P {
  const ph = photoConsole('produit', p.p)
  return ph ? { ...p, images: [ph, ...(p.images ?? []).slice(1)] } : p
}

export interface PromotionVue {
  id: string
  titre: string
  remise: string | null
  cible: string
  fin: number
}
/** Promotions de la plateforme en cours à cet instant (la dernière décision de chacune fait foi). */
export function promotionsEnCours(t: number = maintenant()): PromotionVue[] {
  const derniere = new Map<string, Promo>()
  for (const e of decisionsConsole('client')) if (e.type === 'promotion') derniere.set(e.id, e)
  return [...derniere.values()]
    .filter((p) => (p.etat === 'programmee' || p.etat === 'en_cours') && p.debut <= t && t < p.fin)
    .map((p) => ({ id: p.id, titre: p.titre, remise: p.remise, cible: p.cible, fin: p.fin }))
}

/** Compte du client bloqué par BelivaY (dernière décision), ou null. */
export function accesBloque(): { motif: string; le: number } | null {
  const e = decisionsConsole('client')
    .filter((x): x is Acces => x.type === 'acces_change' && x.espace === 'client')
    .at(-1)
  return e && e.etat === 'bloque' ? { motif: e.motif, le: e.le } : null
}
