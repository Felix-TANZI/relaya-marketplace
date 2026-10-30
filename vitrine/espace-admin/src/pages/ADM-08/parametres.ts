// Paramètres de la logistique (S4 : relais, entreprises, livreurs, paquets, zones, carte, emballages), LUS et jamais
// écrits dans le code (CCH-15), au registre officiel seulement (src/calculs/registre.ts ; les codes proposés par S4 et
// le paquet ADMIN y sont entrés : A-VALIDER § 4). Une valeur absente ou d'une forme inattendue arrête la lecture
// (ParametreAbsent, ParametreIllisible) au lieu de deviner.
import { REGISTRE, valeur } from '../../calculs/registre'
import { ParametreIllisible } from '../../calculs/erreurs'

const brut = (code: string): string => valeur(REGISTRE, code)
/** Les nombres écrits dans la valeur, dans l'ordre (« 200 / 250 / 400 », « 21 000 F (…) », « 2,2 »). */
function nombres(code: string, n: number): number[] {
  const v = brut(code).replace(/(\d)[\s  ](?=\d{3}\b)/g, '$1')
  const l = [...v.matchAll(/\d+(?:,\d+)?/g)].map((m) => Number(m[0].replace(',', '.')))
  if (l.length < n) throw new ParametreIllisible(`${code} : « ${brut(code)} » ne porte pas ${n} nombre(s)`)
  return l.slice(0, n)
}
const nombre = (code: string) => nombres(code, 1)[0]
/** Poids nommés « délais tenus 40, remplissage 30… » (un nombre après chaque nom). */
function poids(code: string, noms: [string, RegExp][]): Record<string, number> {
  const v = brut(code)
  const out: Record<string, number> = {}
  for (const [cle, re] of noms) {
    const m = new RegExp(re.source + '[^\\d]{0,24}(\\d+)', 'i').exec(v)
    if (!m) throw new ParametreIllisible(`${code} : poids « ${cle} » introuvable dans « ${v} »`)
    out[cle] = Number(m[1])
  }
  return out
}
/** Plafond « sans plafond » → null. */
const plafondOuNull = (code: string): number | null => (/sans plafond/i.test(brut(code)) ? null : nombre(code))

export const PARAM = {
  relais: {
    saturePct: nombre('RELAIS-SEUIL-SATURE'),
    refusPct: nombre('RELAIS-SEUIL-REFUS'),
    tenduPct: nombre('RELAIS-CAPACITE-ALERTE'),
    parZone: nombre('RELAIS-PAR-ZONE'),
    places: ((p: number[]) => ({ S: p[0], M: p[1], L: p[2] }))(nombres('RELAIS-PLACES-CLASSE', 3)),
    gains: ((g: number[]) => ({ S: g[0], M: g[1], L: g[2] }))(nombres('RELAIS-GAIN-COLIS', 3)),
    garde: nombre('RELAIS-GAIN-GARDE'),
    reportVendredis: nombre('ENT-REPORT-VENDREDIS'),
    transfertPlafond: ((p: number[]) => ({ SM: p[0], L: p[1] }))(nombres('PLAFOND-TRANSFERT', 2)),
    transfertAutoH: nombre('RELAIS-FERME-TRANSFERT-H'),
    fermeAppelJ: nombre('RELAIS-FERME-APPEL-J'),
    constatH: nombre('LIT-CONSTAT-H'),
    conventionPreavisJ: nombre('RELAIS-CONVENTION-PREAVIS-J'),
  },
  entreprises: {
    plafonds: { Nouveau: nombre('ENT-PLAFOND-NOUVEAU'), Confirme: nombre('ENT-PLAFOND-CONFIRME'), Or: plafondOuNull('ENT-PLAFOND-OR') },
    seuils: { Confirme: nombre('ENT-SEUIL-CONFIRME'), Or: nombre('ENT-SEUIL-OR') },
    tenuJ: nombre('ENT-HYST-JOURS'),
    minParZone: nombre('ENTREPRISES-MIN-ZONE'),
    piloteJ: nombre('ENT-PILOTE-DUREE'),
    preavisGrilleJ: nombre('ENT-PREAVIS-GRILLE'),
    accesMax: nombre('ACCES-ENTREPRISE-MAX'),
    pieceAlerteJ: nombre('PIECE-ALERTE-J'),
    rendus: ((r: number[]) => ({ max: r[0], surJours: r[1], restrictionJ: r[2] }))(nombres('ENT-RENDUS-SEUIL', 3)),
    achat: { S: nombre('PLAFOND-RELAIS-S'), M: nombre('PLAFOND-RELAIS-M'), L: nombre('PLAFOND-RELAIS-L'), domicile: nombre('PLAFOND-DOMICILE-S') },
    // Offre de référence de Yafé Express (25 sept.) : la grille démontrée, lue au registre.
    yafe: { tournee: nombres('ENT-YAFE-TOURNEE', 3), domicile: nombres('ENT-YAFE-DOMICILE', 2), horsZone: nombre('ENT-YAFE-HORS-ZONE'), c2: nombre('ENT-YAFE-C2') },
    margePct: nombre('ADM-MARGE-SECURITE'),
  },
  livreurs: {
    preavisJ: nombre('DEPART-PREAVIS-J'),
    kitConstatH: nombre('DEPART-KIT-CONSTAT-H'),
    kitValeur: nombre('KIT-VALEUR-F'),
    photoReverifJ: nombre('PHOTO-REVERIF-J'),
    suspensionScore: nombre('SUSPENSION-N3-SCORE'),
    probationJ: nombre('PROBATION-RETOUR'),
    recoursJ: nombre('LIV-RECOURS-J'),
    departVisibleJ: nombre('DEPART-VISIBLE-J'),
    horsConnexionH: nombre('ENT-HORS-CONNEXION'),
    // R80 : modules et quiz réussi (bonnes réponses sur le nombre de questions) avant toute mission.
    quizSeuil: nombre('seuil_quiz_certification'),
    quizQuestions: nombre('CERT-QUIZ-N'),
  },
  paquets: {
    acceptationMin: nombre('ENT-T-ACCEPT'),
    prioriteMin: nombre('ENT-FENETRE-PRIORITE'),
    ramassageMin: nombre('ENT-T-RAMASSAGE'),
    slaH: nombre('ENT-SLA-LIVRAISON'),
    retardMin: nombre('PQ-SEUIL-RETARD'),
    cible: nombre('ENT-OBJECTIF-TOURNEE'),
    seuilDepart: nombre('ENT-SEUIL-DEPART'),
    tourneesJour: nombre('ENT-TOURNEES-JOUR'),
    heures: brut('ENT-HEURES-SERVICE'),
  },
  zones: {
    alerteTauxPct: nombre('ADM-ZONE-ALERTE-TAUX'),
    // Registre officiel (ZONE-SCORE) : il l'emporte sur les pondérations proposées du paquet (ZONE-SANTE-POIDS).
    poids: poids('ZONE-SCORE', [
      ['delai', /d[ée]lais?/],
      ['remplissage', /remplissage/],
      ['litiges', /litiges/],
      ['couverture', /couverture/],
    ]),
    etats: ((e: number[]) => ({ saine: e[0], surveiller: e[2] }))(nombres('ZONE-SANTE-ETATS', 4)),
    remplissage: ((r: number[]) => ({ objectif: r[0], alerte: r[1] }))(nombres('ZONE-REMPLISSAGE', 3)),
    alerteScore: nombre('ZONE-ALERTE'),
  },
  emballages: {
    seuilJ: nombre('EMB-SEUIL-JOURS'),
    couvertureJ: nombre('EMB-COUVERTURE-CIBLE'),
    ecartPct: nombre('ENT-EMB-ECART'),
    reapproPct: nombre('ENT-EMB-REAPPRO'),
    repartition: ((r: number[]) => ({ S: r[0], M: r[1], L: r[2], C1: r[4], C2: r[6] }))(nombres('EMB-REPARTITION', 7)),
    formats: brut('LIV-EMB-FORMATS'),
  },
}

/** Valeur brute d'un paramètre (une règle affichée telle qu'écrite au registre). */
export const valeurParametre = brut
