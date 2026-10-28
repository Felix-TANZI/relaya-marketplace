// Zones, quartiers, distance et cas particuliers des frais v2.0 (BV-DEV-04 ; R06, R10, R12, R74, R83, R90), même
// calcul que moteurs/belivay_moteurs/v20/zones.py.
import { D, reglage, type Niveau } from './reglages'
import { couvertureMax, fraisLivraison, seuilOffert, type Format, estRefus } from './livraison'

export interface Lieu { quartier: string; zone: string; niveau: Niveau }

/** « Ngoa-Ekellé » → « ngoa ekelle » : sans accents, tirets ni majuscules (BV-DEV-04 § 6). */
export const normaliser = (nom: string) => nom.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[-’']/g, ' ').toLocaleLowerCase('fr').split(/\s+/).filter(Boolean).join(' ')

/** Niveau d'un lieu (§ 3) : périurbain (liste de R90), sinon périphérie (Z4, Z5, Z7, Z8, Z11, Z12), sinon centre. */
export function niveauLieu(zone: string, quartier: string): Niveau {
  if (D.livraison.quartiers_periurbains.some((q) => normaliser(q) === normaliser(quartier))) return 'periurbain'
  return D.livraison.zones_peripherie.includes(zone) ? 'peripherie' : 'centre'
}

/** Le quartier de la liste (nom ou appellation courante) ; null : hors des 12 zones. */
export function chercher(quartier: string | null | undefined): Lieu | null {
  if (!quartier) return null
  const n = normaliser(quartier)
  const q = D.quartiers.find((x) => normaliser(x.quartier) === n || x.alias.some((a) => normaliser(a) === n))
  return q ? { quartier: q.quartier, zone: q.zone, niveau: niveauLieu(q.zone, q.quartier) } : null
}
/** Hors de la liste (démonstration) : le quartier est sa propre zone, au niveau centre. */
export const lieuOuDefaut = (quartier: string | null | undefined): Lieu => chercher(quartier) ?? { quartier: quartier ?? '', zone: quartier ?? '', niveau: 'centre' }

/** R83 : la route, au km le plus proche ; à défaut, le vol d'oiseau × 1,3. */
export function distanceKm(routeKm: number | null, volOiseauKm: number | null): number {
  const d = routeKm ?? (volOiseauKm === null ? null : volOiseauKm * reglage('vol_oiseau'))
  if (d === null) throw new Error('aucune distance connue')
  return Math.round(d)
}

/** R10 : devis d'un hors gabarit : [prix, couverture, payé par le client]. */
export function horsGabarit(prixAchat: number, sousTotal: number): [number, number, number] {
  // En entiers (R02) : marge lue en dix-millièmes ; ⌈prix × (10 000 + marge) ÷ 10 000⌉ exact jusqu'à ~8 × 10¹¹ F.
  const n = prixAchat * (10000 + Math.round(reglage('marge') * 10000))
  const prix = Math.max((n - (n % 10000)) / 10000 + (n % 10000 > 0 ? 1 : 0), reglage('hg_min'))
  const c = sousTotal >= seuilOffert('domicile') ? Math.min(couvertureMax('domicile'), prix) : 0
  return [prix, c, prix - c]
}

/** R12 : « Livraison dès X F » : la course seule jusqu'au quartier du client ; sans adresse, le prix du relais. */
export function livraisonDes(boutique: Lieu, format: Format, client: Lieu | null, km = 0): number {
  const b = { zone: boutique.zone, niveau: boutique.niveau, colis: [format], km, detour: 0 }
  const f = client ? fraisLivraison('domicile', client, [b], [0], { apresPaiement: true }) : fraisLivraison('relais', boutique, [b], [0], { apresPaiement: true })
  // Comme le serveur (livraison_des lève LivraisonRefusee) : un refus (XL sans adresse : jamais au relais, R10) n'est
  // jamais « Livraison dès 0 F ». Ce qu'affiche alors la fiche (masquer, ou prix XL du centre) reste au porteur.
  if (estRefus(f)) throw new RangeError(`livraison refusée : ${f.refus}`)
  return f.brut
}
