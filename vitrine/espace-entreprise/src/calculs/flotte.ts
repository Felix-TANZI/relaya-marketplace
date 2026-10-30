// Lecture des paramètres de l'accès, du dossier, des zones, de la flotte et des véhicules (écrans ENT-P01 à P08 et
// P27, groupes ENT-03 et ENT-04). Aucune valeur dans le code (CCH-15) : chaque valeur est lue dans le registre
// (logique-metier/parametres-en-vigueur.json, src/calculs/registre.ts) avec sa forme attendue ; si la forme change, la
// lecture s'arrête (ParametreIllisible) au lieu de deviner. Un moteur, une démonstration ou un écran lit
// PARAMETRES_FLOTTE, jamais le JSON.
import type { ClasseColis } from '../donnees/communs'
import { ParametreIllisible } from './erreurs'
import { REGISTRE, entier, nombre, type Registre } from './registre'

export type TypeVehicule = 'moto' | 'tricycle' | 'voiture' | 'camionnette'
export const TYPES_VEHICULE: TypeVehicule[] = ['moto', 'tricycle', 'voiture', 'camionnette']
/** Classes de colis de la plus petite à la plus grande (ENT-RG-R05). */
export const ORDRE_CLASSES: ClasseColis[] = ['S', 'M', 'L', 'XL', 'HG']

const motif = (r: Registre, code: string, m: RegExp): RegExpExecArray => {
  const p = r[code]
  const x = p ? m.exec(p.valeur.trim()) : null
  if (!x) throw new ParametreIllisible(`${code} : « ${p?.valeur ?? '(absent)'} » ne suit pas la forme attendue`)
  return x
}

// ── Classes transportables par type de véhicule (classes_par_type_vehicule, ENT-P08R-01) ──────────────────────────
// Forme : « vélo jusqu'à S ; moto S–L ; tricycle et voiture jusqu'à XL ; camionnette jusqu'au hors gabarit ».
export function lireClasses(r: Registre): Record<TypeVehicule, ClasseColis[]> {
  const brut = r.classes_par_type_vehicule?.valeur ?? ''
  const res: Partial<Record<TypeVehicule, ClasseColis[]>> = {}
  const classe = (s: string): ClasseColis => {
    const c = s.trim() === 'hors gabarit' ? 'HG' : (s.trim() as ClasseColis)
    if (!ORDRE_CLASSES.includes(c)) throw new ParametreIllisible(`classes_par_type_vehicule : classe « ${s} » inconnue`)
    return c
  }
  for (const morceau of brut.split(';').map((s) => s.trim())) {
    const m = /^(.+?) (?:(\S+)–(\S+)|jusqu['’]à (\S+)|jusqu['’]au (hors gabarit))$/.exec(morceau)
    if (!m) throw new ParametreIllisible(`classes_par_type_vehicule : « ${morceau} » ne suit pas la forme attendue`)
    const de = m[2] ? classe(m[2]) : 'S'
    const a = classe(m[3] ?? m[4] ?? m[5])
    const classes = ORDRE_CLASSES.slice(ORDRE_CLASSES.indexOf(de), ORDRE_CLASSES.indexOf(a) + 1)
    for (const t of m[1].split(' et ').map((s) => s.trim())) {
      // Le vélo est le véhicule propre d'un livreur (LIV-P02R-01) : la flotte de l'entreprise n'en déclare pas.
      if (t === 'vélo') continue
      if (!TYPES_VEHICULE.includes(t as TypeVehicule)) throw new ParametreIllisible(`classes_par_type_vehicule : type « ${t} » inconnu`)
      res[t as TypeVehicule] = classes
    }
  }
  for (const t of TYPES_VEHICULE) if (!res[t]) throw new ParametreIllisible(`classes_par_type_vehicule : type « ${t} » absent`)
  return res as Record<TypeVehicule, ClasseColis[]>
}

// ── Trust Score du livreur : critères et poids (trust_poids) ───────────────────────────────────────────────────────
export interface CritereTrust {
  critere: string // « Ponctualité »
  poids: number // %
}
export function lirePoidsTrust(r: Registre): CritereTrust[] {
  const brut = motif(r, 'trust_poids', /^(.+)$/)[1]
  const criteres = brut.split(',').map((s) => {
    const m = /^\s*(\p{L}+) (\d+) %\s*$/u.exec(s)
    if (!m) throw new ParametreIllisible(`trust_poids : « ${s} » ne suit pas la forme attendue`)
    return { critere: m[1], poids: Number(m[2]) }
  })
  if (criteres.reduce((n, c) => n + c.poids, 0) !== 100) throw new ParametreIllisible(`trust_poids : la somme des poids doit faire 100`)
  return criteres
}

// ── Kit confié au livreur (KIT-VALEUR-F, DP-67) ─────────────────────────────────────────────────────────────────
// Forme : « 21 000 F (sac de transport étanche 12 000 F · pochettes du kit journalier 4 500 F · …) » : total, puis
// chaque élément et sa valeur ; la somme des éléments doit faire le total.
export interface KitValeur {
  total: number
  elements: { libelle: string; valeur: number }[]
}
const francs = (s: string) => Number(s.replace(/[\s\u00a0\u202f]/g, ''))
export function lireKit(r: Registre): KitValeur {
  const m = motif(r, 'KIT-VALEUR-F', /^(\d{1,3}(?:[\s\u00a0\u202f]\d{3})*) F \((.+)\)$/)
  const elements = m[2].split(' · ').map((x) => {
    const e = /^(.+?\S) (\d{1,3}(?:[\s\u00a0\u202f]\d{3})*) F$/.exec(x.trim())
    if (!e) throw new ParametreIllisible(`KIT-VALEUR-F : élément « ${x} » ne suit pas la forme attendue`)
    return { libelle: e[1], valeur: francs(e[2]) }
  })
  const total = francs(m[1])
  if (new Set(elements.map((e) => e.libelle)).size !== elements.length) throw new ParametreIllisible('KIT-VALEUR-F : élément en double')
  if (elements.reduce((n, e) => n + e.valeur, 0) !== total) throw new ParametreIllisible('KIT-VALEUR-F : la somme des éléments doit faire le total')
  return { total, elements }
}

// ── Tout le groupe ──────────────────────────────────────────────────────────────────────────────────────────────────
export interface ParametresFlotte {
  // Accès (ENT-P01) : mot de passe (MDP-LONG, DP-04).
  motDePasseMin: number
  // Dossier de l'entreprise (ENT-P03) : alerte d'expiration, vérification.
  alertePieceJours: number
  rappelsPiece: number[]
  verifAutoMin: number
  revueHumaineH: number
  blocageVersementsJours: number
  // État du compte (ENT-P27).
  preavisJours: number
  lectureApresResiliationJours: number
  // Zones (ENT-P04) : délai tenu et sa fenêtre, saison des pluies, heures de service.
  seuilDelaiTenu: number // %
  fenetreSanteJours: number
  fenetreDelaiTenuJours: number // indicateur du tableau de bord
  pluieHeures: number
  service: { debut: number; fin: number; jours: string }
  // Livreurs (ENT-P05 à P07) : invitation, certification, Trust Score, contestations.
  invitationJours: number
  quizMin: number
  quizSur: number
  certificationMois: number
  alerteCertificationJours: number
  alertePieceLivreurJours: number
  revuePiecesLivreurH: number
  poidsTrust: CritereTrust[]
  paliersLivreur: { Confirme: number; Or: number }
  contestationJours: number
  conservationPositionsJours: number
  conservationPreuvesJours: number
  // Départ d'un livreur (DP-66) : préavis d'une demande de départ, en jours (DEPART-PREAVIS-J).
  preavisDepartJours: number
  // DP-67 : délai du constat du kit après la fin du préavis (DEPART-KIT-CONSTAT-H, heures) ; valeur du kit et de ses
  // éléments (KIT-VALEUR-F : plafond de la retenue, libellés = identifiants des éléments manquants) ; départs clôturés
  // visibles dans la file (DEPART-VISIBLE-J) ; absence de ABSENCE-MAX-J jours au plus, prévue PLANNING-PREVENIR-H heures
  // avant ; nouvelle photo à envoyer sous PHOTO-REVERIF-J jours.
  kitConstatH: number
  kit: KitValeur
  departVisibleJours: number
  absenceMaxJours: number
  planningPrevenirH: number
  photoReverifJours: number
  // Tableau de bord : échéance d'un paquet à accepter en rouge sous ce nombre de minutes, ambre au-dessus (ENT-03-R12,
  // ENT-TDB-ECHEANCE-ROUGE : 10 min ; l'anneau de ENT-P10 garde seuil_anneau_rouge, 5 min, ENT-P10R-04).
  echeanceRougeMin: number
  // Véhicules (ENT-P08).
  classes: Record<TypeVehicule, ClasseColis[]>
  alerteAssuranceJours: number
  rappelsAssurance: number[]
}

export function lireFlotte(r: Registre, mdp: string = r['MDP-LONG']?.valeur ?? ''): ParametresFlotte {
  const sante = /^% sur (\d+) jours$/.exec(r.seuil_delai_tenu_zone?.unite ?? '')
  if (!sante) throw new ParametreIllisible(`seuil_delai_tenu_zone : unité « ${r.seuil_delai_tenu_zone?.unite} » inattendue`)
  const rappelsPiece = /\(rappels ([\d, ]+) jours\)$/.exec(r.alerte_expiration_piece?.unite ?? '')
  if (!rappelsPiece) throw new ParametreIllisible(`alerte_expiration_piece : rappels illisibles`)
  const assurance = motif(r, 'alerte_expiration_assurance', /^(\d+) jours avant \(rappels ([\d, et]+) jours\)$/)
  const service = motif(r, 'ENT-HEURES-SERVICE', /^(.+), (\d+) h–(\d+) h$/)
  const quiz = motif(r, 'seuil_quiz_certification', /^(\d+) bonnes réponses sur (\d+)$/)
  const certif = motif(r, 'validite_certification_livreur', /^(\d+) mois, alerte (\d+) jours avant/)
  const paliers = motif(r, 'trust_paliers_livreur', /^Confirmé ≥ (\d+) ; Or ≥ (\d+) ;/)
  const m = /^(\d+) caractères au moins, dont un chiffre$/.exec(mdp)
  if (!m) throw new ParametreIllisible(`MDP-LONG : « ${mdp} » ne suit pas la forme attendue`)
  const p: ParametresFlotte = {
    motDePasseMin: Number(m[1]),
    alertePieceJours: entier(r, 'alerte_expiration_piece', /^jours/),
    rappelsPiece: rappelsPiece[1].split(',').map((s) => Number(s.trim())),
    verifAutoMin: nombre(r, 'ENT-VERIF-AUTO', /^< (\d+)$/),
    revueHumaineH: entier(r, 'delai_verification_humaine', /^heures ouvrées/),
    blocageVersementsJours: entier(r, 'blocage_versements_changement_numero', /^jours/),
    preavisJours: entier(r, 'preavis_resiliation', /^jours/),
    lectureApresResiliationJours: entier(r, 'lecture_apres_resiliation', /^jours/),
    seuilDelaiTenu: entier(r, 'seuil_delai_tenu_zone', /^%/),
    fenetreSanteJours: Number(sante[1]),
    fenetreDelaiTenuJours: entier(r, 'fenetre_delai_tenu', /^jours/),
    pluieHeures: nombre(r, 'delai_saisonnier_pluie', /^\+(\d+)$/),
    service: { jours: service[1], debut: Number(service[2]), fin: Number(service[3]) },
    invitationJours: entier(r, 'expiration_invitation_livreur', /^jours/),
    quizMin: Number(quiz[1]),
    quizSur: Number(quiz[2]),
    certificationMois: Number(certif[1]),
    alerteCertificationJours: Number(certif[2]),
    alertePieceLivreurJours: nombre(r, 'alerte_expiration_piece_livreur', /^(\d+) jours avant$/),
    revuePiecesLivreurH: nombre(r, 'delai_revue_pieces_livreur', /^(\d+) h ouvrées$/),
    poidsTrust: lirePoidsTrust(r),
    paliersLivreur: { Confirme: Number(paliers[1]), Or: Number(paliers[2]) },
    contestationJours: nombre(r, 'contestation_trust_livreur', /sous (\d+) jours$/),
    conservationPositionsJours: entier(r, 'conservation_positions_mission', /^jours/),
    conservationPreuvesJours: entier(r, 'conservation_preuves', /^jours/),
    preavisDepartJours: entier(r, 'DEPART-PREAVIS-J', /^jours/),
    kitConstatH: entier(r, 'DEPART-KIT-CONSTAT-H', /^heures/),
    kit: lireKit(r),
    departVisibleJours: entier(r, 'DEPART-VISIBLE-J', /^jours/),
    absenceMaxJours: entier(r, 'ABSENCE-MAX-J', /^jours/),
    planningPrevenirH: entier(r, 'PLANNING-PREVENIR-H', /^(heures?)?$/),
    photoReverifJours: entier(r, 'PHOTO-REVERIF-J', /^jours/),
    echeanceRougeMin: entier(r, 'ENT-TDB-ECHEANCE-ROUGE', /^minutes$/),
    classes: lireClasses(r),
    alerteAssuranceJours: Number(assurance[1]),
    rappelsAssurance: assurance[2].split(/,| et /).map((s) => Number(s.trim())),
  }
  if (p.quizMin > p.quizSur) throw new ParametreIllisible(`seuil_quiz_certification : le seuil dépasse le total`)
  if (p.service.debut >= p.service.fin) throw new ParametreIllisible(`ENT-HEURES-SERVICE : début après la fin`)
  return p
}

/** Paramètres en vigueur, lus une fois. */
export const PARAMETRES_FLOTTE: ParametresFlotte = lireFlotte(REGISTRE)

/** Un véhicule de ce type peut-il porter cette classe ? (ENT-P08R-03, ENT-RG-R76 : jamais de XL sur une moto) */
export const porte = (type: TypeVehicule, classe: ClasseColis, p: ParametresFlotte = PARAMETRES_FLOTTE) => p.classes[type].includes(classe)

/** Mot de passe permis (MDP-LONG : longueur et au moins un chiffre). */
export const motDePasseValide = (mdp: string, p: ParametresFlotte = PARAMETRES_FLOTTE) => mdp.length >= p.motDePasseMin && /\d/.test(mdp)

/** Note du Trust Score d'un livreur : Σ poids × note du critère ÷ 100, arrondie (ENT-RG-R67 : les critères totalisent la note). */
export function noteTrust(notes: Record<string, number>, p: ParametresFlotte = PARAMETRES_FLOTTE): number {
  return Math.round(p.poidsTrust.reduce((n, c) => n + (c.poids * (notes[c.critere] ?? 0)) / 100, 0))
}

/** Palier personnel d'un livreur selon sa note (sans l'hystérésis, appliquée par le serveur). */
export function palierLivreur(score: number | null, p: ParametresFlotte = PARAMETRES_FLOTTE): 'Nouveau' | 'Confirme' | 'Or' {
  if (score === null) return 'Nouveau'
  return score >= p.paliersLivreur.Or ? 'Or' : score >= p.paliersLivreur.Confirme ? 'Confirme' : 'Nouveau'
}

/** Délai tenu (%) et son état : null sans base (jamais « 0 / 0 », ENT-P02R-02) ; alerte sous le seuil. */
export function delaiTenu(dansLeDelai: number, remis: number, p: ParametresFlotte = PARAMETRES_FLOTTE): { pct: number; alerte: boolean } | null {
  if (remis <= 0) return null
  const pct = Math.round((dansLeDelai / remis) * 100)
  return { pct, alerte: pct < p.seuilDelaiTenu }
}
