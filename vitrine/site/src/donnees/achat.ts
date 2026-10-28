// Ce que le client paie, du panier (CL-07) au paiement (CL-08), selon les règles BV-DEV v2.0 (DP-69) :
// frais de livraison (R04 à R10), livraison offerte sur le panier entier (R07), panier minimum (R84), total Mobile
// Money frais de paiement compris (R02), comptoir du relais (R42), heure estimée (R45). Le mode de livraison se choisit
// une fois, dans le panier ; l'écran de paiement le reprend. Le serveur recalcule tout au paiement (CAL-11).
import { comptoir, estRefus, fraisLivraison, lieuOuDefaut, paiement, promesseDepuis, couvertureMax, seuilOffert, reglage, type BoutiqueFrais, type Comptoir, type Format, type Frais, type Minimum, type Mode, type Paiement } from '../calculs'
import { F } from '../i18n/format'
import { centre, kmEntre } from './geo'
import type { DonneesPanier } from './source'

// Format du colis d'une boutique, en attendant la fiche maître (R62 à R64) : la plus grande classe de ses articles
// (S → pochette, M → carton C1, L → carton C2) ; une boutique fait un colis.
const FORMAT: Record<string, Format> = { S: 'P', M: 'C1', L: 'C2', XL: 'XL', HG: 'HG' }
const ORDRE: Format[] = ['P', 'C1', 'C2', 'CO', 'XL', 'HG']
export const formatColis = (classes: string[]): Format => classes.map((c) => FORMAT[c] ?? 'P').reduce((a, b) => (ORDRE.indexOf(b) > ORDRE.indexOf(a) ? b : a), 'P')
export const NOM_FORMAT: Record<Format, string> = { P: 'pochette', C1: 'carton C1', C2: 'carton C2', CO: 'carton d’origine', XL: 'colis XL', HG: 'hors gabarit' }

/** Distance boutique → client (R83) : par la route ; à défaut (démonstration), vol d'oiseau × 1,3, au km le plus proche. */
export const kmRoute = (quartierBoutique: string | null, quartierClient: string | null): number => {
  const d = quartierBoutique && quartierClient ? kmEntre(centre(quartierBoutique), centre(quartierClient)) : null
  return d === null ? 0 : Math.round(d * reglage('vol_oiseau'))
}

export interface Achat {
  mode: Mode
  xl: boolean
  boutiques: string[]
  frais: Frais | null
  paiement: Paiement | null
  refus: 'xl-relais' | 'hors-gabarit' | null
  minimum: (Minimum & { texte: string }) | null
  comptoir: Comptoir | null
  promesse: string
  /** R07 : « Livraison offerte », « Livraison offerte jusqu’à 1 500 F », ou ce qu'il manque au panier. */
  offerte: { toute: boolean; jusqua: number; manque: number; seuil: number }
}

export const quartierRelais = (relais: string) => relais.replace(/^Relais\s+/i, '')
export const quartierAdresse = (adresse: string | null) => adresse?.split(' · ').pop() ?? null
const heures = (delai: string | undefined) => parseFloat((delai ?? '').replace(',', '.')) || 0

export function calculerAchat(p: DonneesPanier, modeChoisi: Mode, maintenant: number): Achat {
  const boutiques = [...new Set(p.lignes.map((l) => l.boutique))]
  const lignes = (b: string) => p.lignes.filter((l) => l.boutique === b)
  const formats = boutiques.map((b) => formatColis(lignes(b).map((l) => l.classe)))
  const xl = formats.includes('XL') || formats.includes('HG')
  const mode: Mode = xl ? 'domicile' : modeChoisi
  const qClient = mode === 'relais' ? quartierRelais(p.relais) : quartierAdresse(p.adresse)
  const dest = lieuOuDefaut(qClient)
  const bf: BoutiqueFrais[] = boutiques.map((b, i) => {
    const q = p.boutiques[b]?.zone ?? null
    const l = lieuOuDefaut(q)
    return { zone: l.zone, niveau: l.niveau, colis: [formats[i]], km: mode === 'domicile' ? kmRoute(q, qClient) : 0, detour: 0 }
  })
  const st = boutiques.map((b) => lignes(b).reduce((t, l) => t + l.prix * l.qte, 0))
  const s = st.reduce((a, b) => a + b, 0)
  const r = boutiques.length ? fraisLivraison(mode, { zone: dest.zone, niveau: dest.niveau, quartier: qClient }, bf, st) : null
  const frais = r && !estRefus(r) ? r : null
  const minimum = r && estRefus(r) && r.refus === 'minimum' ? r.minimum : null
  const delai = Math.max(0, ...boutiques.map((b) => heures(p.boutiques[b]?.delai)))
  const seuil = seuilOffert(mode)
  return {
    mode,
    xl,
    boutiques,
    frais,
    paiement: frais ? paiement(frais) : null,
    refus: r && estRefus(r) && r.refus !== 'minimum' ? r.refus : null,
    minimum: minimum && {
      ...minimum,
      // R84 : jamais le nom du vendeur ; le colis se désigne par un de ses produits.
      texte:
        minimum.boutique === null
          ? `Encore ${F(minimum.manque)} F pour commander`
          : `Le colis de ${lignes(boutiques[minimum.boutique])[0]?.titre ?? ''} doit atteindre ${F(reglage('boutique_min'))} F : ajoute ${F(minimum.manque)} F`,
    },
    comptoir: frais ? comptoir(frais, p.plafondComptoir) : null,
    promesse: boutiques.length ? promesseDepuis(maintenant, mode, delai) : '',
    offerte: { toute: !!frais && frais.couverture > 0 && frais.client === 0, jusqua: couvertureMax(mode), manque: Math.max(0, seuil - s), seuil },
  }
}
