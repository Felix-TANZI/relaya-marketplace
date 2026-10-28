// Paramètres des moteurs du point relais : PORTAGE FIDÈLE de lire_relais et lire_trust_relais
// (moteurs/belivay_moteurs/registre.py), mêmes codes, mêmes formes, mêmes contrôles de cohérence. Lus sur le registre
// officiel (registre.ts, jamais de repli local) ; les écrans lisent PARAMETRES_MOTEURS. Ajouter un code : voir l'en-tête
// de registre.ts.
import { ParametreIllisible } from './erreurs'
import { NOMBRE, REGISTRE, entier, lire, lireGarde, type ParametresGarde, type Registre } from './registre'
import type { ClasseColis } from '../donnees/communs'

export type NomCritere = 'Ponctualité' | 'Sécurité du stockage' | 'Satisfaction' | 'Litiges' | 'Ancienneté'
export const CRITERES: readonly NomCritere[] = ['Ponctualité', 'Sécurité du stockage', 'Satisfaction', 'Litiges', 'Ancienneté']

/** Trust Score du relais et paliers (TRU-01 à TRU-07, PAL-01 à PAL-06 ; ARL-15, ARL-132, ARL-134). */
export interface ParametresTrustRelais {
  poids: Record<NomCritere, number> // PR-TRUST-POIDS
  demiVieJours: number // PR-TRUST-MOTEUR
  hysteresisPoints: number // PR-TRUST-MOTEUR (= PR-PAL-MARGE)
  baisseMax: number // PR-TS-VARIATION-NUIT (= PR-TRUST-MOTEUR)
  gelJours: number // PR-TS-GEL-J (= PR-TRUST-MOTEUR)
  neutre: number // PR-TRUST-CALCUL
  k: number
  gravites: { g1: number; g2: number; g3: number }
  avisPositifEtoiles: number
  wilsonZ: number
  anciennetePoints: number
  ancienneteMois: number
  ancienneteRemises: number
  seuils: { Confirmé: number; Premium: number } // PR-PAL-CONFIRME, PR-PAL-PREMIUM
  tenueJours: number // PR-PAL-TENUE-J
  alertePoints: number // PR-TRUST-ALERTE (ARL-15)
  alerteFrequenceJours: number // PR-TRUST-ALERTE-J (ARL-134)
  contestationHeures: number // PR-CONTESTATION-H (heures ouvrées)
}

/** Paramètres des moteurs du relais (réception, remise, renvoi, capacité, caisse et dette, Trust). */
export interface ParametresMoteursRelais {
  garde: ParametresGarde
  gainColis: Record<ClasseColis, number> // RELAIS-GAIN-COLIS
  places: Record<ClasseColis, number> // RELAIS-PLACES
  saturationPct: number // PR-SATURATION
  codeEssais: number // CODE-ESSAIS
  codeBlocageHeures: number // CODE-BLOCAGE-H
  porteurPieceDes: number // CODE-PORTEUR
  lotPhotosMin: number // PR-LOT-PHOTOS-MIN (ARL-11)
  reservePhotosMin: number // PR-RESERVE-PHOTOS-MIN (REC-03)
  refusPhotosMin: number // PR-REFUS-PHOTOS-MIN (REC-04)
  pinEssais: number // PIN-ESSAIS (ARL-12)
  pinRemiseEssais: number // PR-PIN-REMISE-ESSAIS (ARL-42)
  pinBlocageMinutes: number // PR-PIN-BLOCAGE-MIN (ARL-12)
  horsLigneRemises: number // PR-HL-REMISES (ARL-03)
  detteMax: number // PR-DETTE-MAX (ARL-05)
  detteSemaines: number // PR-DETTE-SEMAINES
  detteDelaiHeures: number // PR-DETTE-DELAI-H
  retenueFiscalePourCent: number // PR-RETENUE-FISCALE-PCT (ARL-34)
  trust: ParametresTrustRelais
}

const n = (r: Registre, code: string, motif = '(\\d+)') => entier(lire(r, code, motif)[1])
const taux = (texte: string) => Number(texte.replace(',', '.'))

export function lireTrustRelais(r: Registre): ParametresTrustRelais {
  const mp = lire(r, 'PR-TRUST-POIDS', CRITERES.map((c) => `${c} (\\d+)`).join(' · '))
  const poids = Object.fromEntries(CRITERES.map((c, i) => [c, Number(mp[i + 1])])) as Record<NomCritere, number>
  if (Object.values(poids).reduce((a, b) => a + b, 0) !== 100) throw new ParametreIllisible('PR-TRUST-POIDS : les poids font 100')
  const mm = lire(r, 'PR-TRUST-MOTEUR', 'bayésien au démarrage, Wilson, demi-vie (\\d+) jours, hystérésis ±(\\d+) points sur (\\d+) jours, recalcul chaque nuit, baisse ≤ (\\d+) points par recalcul, gel après (\\d+) jours sans activité, pas de veto')
  const mc = lire(
    r,
    'PR-TRUST-CALCUL',
    'neutre (\\d+) \\(k = (\\d+)\\) ; gravité g1 = (\\d+), g2 = (\\d+), g3 = (\\d+) échecs ; satisfaction : avis de (\\d) étoiles ou plus, borne basse de Wilson, z = (\\d+,\\d+) ; ancienneté (\\d+) × min\\(1 ; mois ÷ (\\d+)\\) \\+ (\\d+) × min\\(1 ; remises ÷ (\\d+)\\)',
  )
  const marge = lire(r, 'PR-PAL-MARGE', '(\\d+) points sous le seuil pendant (\\d+) jours, descente validée par une personne')
  const tenue = n(r, 'PR-PAL-TENUE-J', '(\\d+) jours')
  if (mm[2] !== marge[1] || mm[3] !== marge[2] || tenue !== Number(mm[3])) throw new ParametreIllisible('PR-TRUST-MOTEUR, PR-PAL-MARGE et PR-PAL-TENUE-J : une seule hystérésis')
  if (n(r, 'PR-TS-VARIATION-NUIT') !== Number(mm[4])) throw new ParametreIllisible('PR-TS-VARIATION-NUIT et PR-TRUST-MOTEUR : une seule baisse maximale')
  if (n(r, 'PR-TS-GEL-J', 'après (\\d+) jours') !== Number(mm[5])) throw new ParametreIllisible('PR-TS-GEL-J et PR-TRUST-MOTEUR : un seul délai de gel')
  const g = [mc[3], mc[4], mc[5]].map(Number)
  if (!(g[0] >= 1 && g[0] <= g[1] && g[1] <= g[2])) throw new ParametreIllisible('PR-TRUST-CALCUL : gravités croissantes')
  if (mc[8] !== mc[10] || 2 * Number(mc[8]) !== 100) throw new ParametreIllisible('PR-TRUST-CALCUL : ancienneté en deux moitiés de 50 points')
  const seuils = { Confirmé: n(r, 'PR-PAL-CONFIRME'), Premium: n(r, 'PR-PAL-PREMIUM') }
  if (!(0 < seuils.Confirmé && seuils.Confirmé < seuils.Premium && seuils.Premium <= 100)) throw new ParametreIllisible('PR-PAL-CONFIRME < PR-PAL-PREMIUM, sur 100')
  return {
    poids,
    demiVieJours: Number(mm[1]),
    hysteresisPoints: Number(mm[2]),
    baisseMax: Number(mm[4]),
    gelJours: Number(mm[5]),
    neutre: Number(mc[1]),
    k: Number(mc[2]),
    gravites: { g1: g[0], g2: g[1], g3: g[2] },
    avisPositifEtoiles: Number(mc[6]),
    wilsonZ: taux(mc[7]),
    anciennetePoints: Number(mc[8]),
    ancienneteMois: Number(mc[9]),
    ancienneteRemises: Number(mc[11]),
    seuils,
    tenueJours: tenue,
    alertePoints: n(r, 'PR-TRUST-ALERTE'),
    alerteFrequenceJours: n(r, 'PR-TRUST-ALERTE-J'),
    contestationHeures: n(r, 'PR-CONTESTATION-H', '(\\d+) h ouvrées, une contestation par décision'),
  }
}

export function lireMoteursRelais(r: Registre): ParametresMoteursRelais {
  const gain = lire(r, 'RELAIS-GAIN-COLIS', `${NOMBRE} F / ${NOMBRE} F / ${NOMBRE} F`)
  const places = lire(r, 'RELAIS-PLACES', 'S (\\d+) · M (\\d+) · L (\\d+)')
  const code = lire(r, 'CODE-ESSAIS', '(\\d+) ⇒ blocage (\\d+) h')
  const blocage = n(r, 'CODE-BLOCAGE-H')
  if (Number(code[2]) !== blocage) throw new ParametreIllisible('CODE-ESSAIS et CODE-BLOCAGE-H ne disent pas le même blocage')
  const saturation = n(r, 'PR-SATURATION')
  if (!(0 < saturation && saturation <= 100)) throw new ParametreIllisible('PR-SATURATION : un pourcentage de 1 à 100')
  const pinEssais = n(r, 'PIN-ESSAIS')
  const pinRemise = n(r, 'PR-PIN-REMISE-ESSAIS')
  if (!(0 < pinRemise && pinRemise <= pinEssais)) throw new ParametreIllisible("PR-PIN-REMISE-ESSAIS : la remise s'annule avant le blocage du PIN (ARL-42)")
  return {
    garde: lireGarde(r),
    gainColis: { S: entier(gain[1]), M: entier(gain[2]), L: entier(gain[3]) },
    places: { S: Number(places[1]), M: Number(places[2]), L: Number(places[3]) },
    saturationPct: saturation,
    codeEssais: Number(code[1]),
    codeBlocageHeures: blocage,
    porteurPieceDes: n(r, 'CODE-PORTEUR', `${NOMBRE} F \\(valeur du relais\\)`),
    lotPhotosMin: n(r, 'PR-LOT-PHOTOS-MIN'),
    reservePhotosMin: n(r, 'PR-RESERVE-PHOTOS-MIN'),
    refusPhotosMin: n(r, 'PR-REFUS-PHOTOS-MIN'),
    pinEssais,
    pinRemiseEssais: pinRemise,
    pinBlocageMinutes: n(r, 'PR-PIN-BLOCAGE-MIN'),
    horsLigneRemises: n(r, 'PR-HL-REMISES'),
    detteMax: n(r, 'PR-DETTE-MAX', `${NOMBRE} F`),
    detteSemaines: n(r, 'PR-DETTE-SEMAINES'),
    detteDelaiHeures: n(r, 'PR-DETTE-DELAI-H'),
    retenueFiscalePourCent: taux(lire(r, 'PR-RETENUE-FISCALE-PCT', '(\\d+(?:,\\d+)?)')[1]),
    trust: lireTrustRelais(r),
  }
}

export const PARAMETRES_MOTEURS: ParametresMoteursRelais = lireMoteursRelais(REGISTRE)
