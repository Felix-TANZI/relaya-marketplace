// DONNÉES DE DÉMONSTRATION — domaine « qualite » (gérant seul) : le « serveur » du Trust Score, des avis et des paliers.
// - Score = somme pondérée des cinq critères (PR-TRUST-POIDS, TRU-01), arrondie comme calculs/trust.ts (trustRelais) ;
//   Satisfaction calculée sur les avis par le moteur (calculs/trust.ts : satisfaction, borne basse de Wilson, avis
//   pondérés par leur âge, AVI-03) ; les autres critères sont des DONNÉES du calcul de nuit du serveur. Relais neuf :
//   aucune note (VID-03).
// - Palier (PAL-01, PAL-02) : calculs/trust.ts (evolutionPalier) sur la série des scores de nuit ; une descente n'est
//   jamais appliquée seule : proposée, puis validée par une personne (décision « descente_palier »).
// - Alerte « seuil proche » dans les deux sens : calculs/trust.ts (alerteDeSeuil ; ARL-15).
// - Journal : événements (effet sur un critère ; dossier en cours sans effet) et décisions (sanction ou descente,
//   validée par une personne avec un motif écrit) ; contestation UNE fois (calculs/trust.ts : contestation), réponse
//   sous PR-CONTESTATION-H heures ouvrées, dimanche non compté (echeanceOuvree). Fenêtre de contestation :
//   PR-CONTESTATION-FENETRE-J (ARL-115).
// - Situations (« ?trust= », gardé pour l'onglet) : alerte (score 72, à 2 points du seuil de 70), sanction (niveau 2
//   proposé par le calcul, à contester). Le scénario « suspendu » du socle porte une sanction de niveau 3 validée.
import { PARAMETRES_MOTEURS as PM, type NomCritere } from '../calculs/parametres-moteurs'
import { PARAMETRES } from '../calculs/registre'
import { ORDRE_PALIERS, alerteDeSeuil, contestation as contestationCalcul, echeanceOuvree, evolutionPalier, satisfaction, type PalierRelais } from '../calculs/trust'
import { HEURE, JOUR } from '../calculs/temps'
import type { Avis, Contestation, CritereTrust, Decision, DomaineQualite, EvenementTrust, IdCritere, MotifSignalement, NomPalier, Palier, Trust } from '../donnees/domaines/qualite'
import { IDS } from '../calculs/parametres-argent'
import { TRUST, h, oct } from './jeu-essai'
import { maintenant } from './horloge'
import { sansHistorique, scenario } from './scenario'
import { membreActuel } from './session'
import { magasin, repondre } from './stockage'
import { signaler } from './pont-console'

/** PR-CONTESTATION-FENETRE-J (ARL-115, aligné sur LIV-TSC-CONTESTATION-J) : fenêtre de contestation d'un événement
 * ou d'une décision, en jours. */
const FENETRE_J = PARAMETRES.relais.contestationFenetreJours

// ── Situation (?trust=) ────────────────────────────────────────────────────────────────────────────────────────
const SITUATIONS = ['alerte', 'sanction'] as const
type SituationTrust = (typeof SITUATIONS)[number]
const CLE_SITUATION = 'blv_r_demo_trust'
let lue: SituationTrust | null | undefined
function situation(): SituationTrust | null {
  if (lue !== undefined) return lue
  try {
    const q = new URLSearchParams(location.search)
    const v = q.get('trust')
    if (v !== null || q.get('demo') !== null) {
      const s = v && (SITUATIONS as readonly string[]).includes(v) ? (v as SituationTrust) : null
      if ((sessionStorage.getItem(CLE_SITUATION) ?? '') !== (s ?? '')) {
        localStorage.removeItem('blv_r_demo_qualite')
        if (s) sessionStorage.setItem(CLE_SITUATION, s)
        else sessionStorage.removeItem(CLE_SITUATION)
      }
      return (lue = s)
    }
    const g = sessionStorage.getItem(CLE_SITUATION)
    return (lue = g && (SITUATIONS as readonly string[]).includes(g) ? (g as SituationTrust) : null)
  } catch {
    return (lue = null)
  }
}

/** Essais (Vitest) : choisir la situation sans adresse. */
export function choisirSituation(x: SituationTrust | null) {
  lue = x
  etatQualite.reinitialiser()
}

// ── Données ────────────────────────────────────────────────────────────────────────────────────────────────────
/** Scores de nuit des 38 jours avant la dernière semaine (TRUST.evolution du jeu d'essai) : passage au-dessus de 70
 * fin août, tenu depuis. */
const AVANT = [66, 66, 67, 67, 68, 68, 69, 69, 69, 70, 70, 71, 71, 71, 72, 72, 72, 72, 73, 73, 73, 73, 73, 74, 74, 74, 74, 73, 73, 74, 74, 74, 74, 74, 74, 74, 74, 74]
const ALERTE = [74, 74, 73, 73, 72, 72, 72] // situation « alerte » : la dernière semaine redescend vers 70
/** Critères hors Satisfaction (données du calcul de nuit). Satisfaction : Wilson sur les avis. */
const CRITERES: Record<Exclude<IdCritere, 'satisfaction'>, number> = { ponctualite: 82, stockage: 80, litiges: 74, anciennete: 70 }
const CRITERES_ALERTE: typeof CRITERES = { ponctualite: 70, stockage: 70, litiges: 74, anciennete: 70 }

/** 58 avis des 30 derniers jours (répartition 41 · 11 · 4 · 1 · 1) : étoiles, étiquettes, quelques textes. Anonymes. */
const TEXTES: Record<number, string> = {
  0: 'Le colis était prêt avant que je finisse de montrer le code.',
  3: 'Accueil rapide, colis prêt en une minute.',
  9: 'Bien, juste un peu d’attente, il y avait du monde.',
  14: 'Fermé à 13 h alors que j’étais venue exprès.',
  21: 'Très propre, on voit que les colis sont rangés avec soin.',
  30: 'Gérante aimable, elle m’a expliqué la garde.',
}
const ETOILES = [5, 5, 4, 5, 5, 5, 4, 5, 5, 4, 5, 5, 5, 3, 2, 5, 5, 4, 5, 5, 5, 5, 4, 5, 5, 3, 5, 5, 4, 5, 5, 5, 5, 4, 5, 5, 1, 5, 5, 4, 5, 3, 5, 5, 5, 4, 5, 5, 5, 4, 5, 3, 5, 5, 4, 5, 5, 5]
const ETIQUETTES: Record<number, string[]> = { 5: ['rapide', 'accueillant'], 4: ['bien rangé'], 3: ['attente'], 2: ['horaires'], 1: ['horaires'] }
function avisInitiaux(): Avis[] {
  return ETOILES.map((e, k) => ({
    id: 'AV-' + (360 - k),
    etoiles: e,
    texte: TEXTES[k] ?? null,
    etiquettes: k % 3 === 2 && e === 5 ? ['rapide', 'bien rangé'] : k % 4 === 1 && e === 5 ? ['accueillant'] : ETIQUETTES[e],
    le: h(9, 20) - Math.round((k * 29.5 * JOUR) / ETOILES.length) - (k % 5) * HEURE,
    reponse: k === 14 ? { texte: 'Pause de 13 h à 13 h 30, affichée sur la porte et dans l’application. Désolée pour le trajet.', le: oct(9, 18, 10) } : null,
    signalement: null,
  }))
}

/** Événements du journal (calcul de nuit) : dates du jeu d'essai, références BelivaY seulement. */
function evenementsInitiaux(): EvenementTrust[] {
  const f = FENETRE_J * JOUR
  return [
    { id: 'EV-418', le: oct(12, 16, 20), critere: 'litiges', effet: 0, libelle: 'Constat ouvert au comptoir : dossier en cours, sans effet sur votre score', objet: 'CS-2207', dossierEnCours: true, contestableJusqua: null, contestation: null },
    { id: 'EV-412', le: oct(9, 18, 0), critere: 'stockage', effet: -2, libelle: 'Remise enregistrée sans photo de remise', objet: 'BLV-00031-1', dossierEnCours: false, contestableJusqua: oct(9, 18, 0) + f, contestation: null },
    { id: 'EV-405', le: oct(7, 8, 40), critere: 'ponctualite', effet: -1, libelle: 'Relais ouvert à 8 h 25 : le livreur a attendu le lot', objet: 'PQ-Z1-261007-002', dossierEnCours: false, contestableJusqua: oct(7, 8, 40) + f, contestation: null },
    { id: 'EV-398', le: oct(5, 6, 0), critere: 'satisfaction', effet: 1, libelle: '12 avis à 4 ou 5 étoiles cette semaine', objet: null, dossierEnCours: false, contestableJusqua: null, contestation: null },
    { id: 'EV-371', le: oct(1, 6, 0) - 3 * JOUR, critere: 'ponctualite', effet: 1, libelle: '30 jours d’horaires tenus, sans fermeture imprévue', objet: null, dossierEnCours: false, contestableJusqua: null, contestation: null },
    {
      id: 'EV-352',
      le: oct(1, 11, 0) - 11 * JOUR,
      critere: 'stockage',
      effet: -3,
      libelle: 'Scellé abîmé constaté au départ d’un renvoi',
      objet: 'BLV-00012-1',
      dossierEnCours: false,
      contestableJusqua: oct(1, 11, 0) - 4 * JOUR,
      contestation: { le: oct(1, 9, 0) - 10 * JOUR, texte: 'Le scellé était intact à la réception : photo du lot du 18 septembre.', etat: 'acceptee', reponseAvant: oct(1, 9, 0) - 7 * JOUR, reponse: 'Photo du lot vérifiée : le scellé était déjà abîmé à l’arrivée. Événement retiré, critère recalculé.' } as Contestation,
    },
  ]
}

function decisionsInitiales(): Decision[] {
  const f = FENETRE_J * JOUR
  const avertissement: Decision = { id: 'D-61', type: 'sanction', niveau: 1, etat: 'validee', motif: 'Colis remis sans photo le 2 septembre : avertissement.', le: oct(1, 10, 0) - 29 * JOUR, valideeLe: oct(1, 10, 0) - 29 * JOUR, contestableJusqua: oct(1, 10, 0) - 22 * JOUR, contestation: null }
  if (scenario() === 'suspendu') return [{ id: 'D-77', type: 'sanction', niveau: 3, etat: 'validee', motif: 'Trois remises sans photo la semaine dernière : suspension, validée par une personne de BelivaY.', le: h(9, 0), valideeLe: h(9, 0), contestableJusqua: h(9, 0) + f, contestation: null }, avertissement]
  if (situation() === 'sanction') return [{ id: 'D-80', type: 'sanction', niveau: 2, etat: 'proposee', motif: 'Deux remises sans photo en 7 jours (9 et 12 octobre) : visibilité réduite proposée par le calcul.', le: oct(12, 10, 0), valideeLe: null, contestableJusqua: oct(12, 10, 0) + f, contestation: null }, avertissement]
  if (sansHistorique()) return []
  return [avertissement]
}

export const etatQualite = magasin('qualite', () => {
  const neuf = sansHistorique()
  const alerte = situation() === 'alerte'
  const serie = alerte ? [...AVANT, ...ALERTE] : [...AVANT, ...TRUST.evolution]
  const avis = neuf ? [] : avisInitiaux()
  const criteres = neuf ? null : { ...(alerte ? CRITERES_ALERTE : CRITERES), satisfaction: wilson(avis) }
  return {
    score: neuf ? null : (scoreDe(criteres!) as number | null),
    criteres,
    evolution: neuf ? [] : serie.map((x, k) => ({ le: h(6, 0) - (serie.length - 1 - k) * JOUR, score: x })),
    avis,
    evenements: neuf ? [] : evenementsInitiaux(),
    decisions: decisionsInitiales(),
    cles: [] as string[],
  }
})

// ── Calculs (ceux du serveur : calculs/trust.ts) ───────────────────────────────────────────────────────────────
/** Satisfaction sur 100 (AVI-03) : borne basse de Wilson du moteur, avis pondérés par leur âge, à l'entier. */
export const wilson = (avis: Pick<Avis, 'etoiles' | 'le'>[]) => Math.floor(satisfaction(avis.map((a) => ({ etoiles: a.etoiles, ageJours: Math.max(0, (h(6, 0) - a.le) / JOUR) })), PM.trust) + 0.5)
/** TRU-01 : somme pondérée des critères = score, arrondie comme trustRelais (aucun plafond automatique). */
export const scoreDe = (c: Record<IdCritere, number>) => Math.floor((Object.keys(PM.trust.poids) as NomCritere[]).reduce((s, n) => s + c[IDS[n]] * PM.trust.poids[n], 0) / 100 + 0.5 + 1e-9)

/** PAL-01, PAL-02 : palier suivi nuit après nuit par evolutionPalier ; une descente proposée ne s'applique qu'une fois
 * validée par une personne (décision « descente_palier » validée). */
export function palierActuel(serie: number[], descentes: Decision[] = []): NomPalier {
  let palier: PalierRelais = 'Starter'
  for (let k = 1; k <= serie.length; k++) palier = evolutionPalier(palier, serie.slice(0, k), PM.trust).palier
  if (descentes.some((d) => d.type === 'descente_palier' && d.etat === 'validee')) palier = ORDRE_PALIERS[Math.max(0, ORDRE_PALIERS.indexOf(palier) - 1)]
  return palier
}
/** Palier affiché dans l'en-tête (session) : celui du calcul, sur la série gardée. */
export const palierDe = (score: number | null): NomPalier => (score === null ? 'Starter' : palierActuel(etatQualite.lire().evolution.map((x) => x.score), etatQualite.lire().decisions))

/** Échéance en heures ouvrées, dimanche non compté (PR-CONTESTATION-H) : calculs/trust.ts. */
export const heuresOuvrees = (depuis: number, heures: number) => echeanceOuvree(depuis, heures)

function trust(): Trust {
  const e = etatQualite.lire()
  const t = maintenant()
  const serie = e.evolution.map((x) => x.score)
  const palier = palierDe(e.score)
  const evo = e.score === null ? null : evolutionPalier(palier, serie, PM.trust)
  const a = e.score === null ? null : alerteDeSeuil(e.score, PM.trust)
  const criteres: CritereTrust[] = e.criteres ? (Object.keys(PM.trust.poids) as NomCritere[]).map((n) => ({ id: IDS[n], poids: PM.trust.poids[n], valeur: e.criteres![IDS[n]] })) : []
  const derniere = e.evolution[e.evolution.length - 1]
  const semaine = e.evolution[e.evolution.length - 8]
  const activite = derniere ? derniere.le : t
  const suivant = ORDRE_PALIERS[ORDRE_PALIERS.indexOf(palier) + 1] as NomPalier | undefined
  return {
    score: e.score,
    palier,
    recalculeA: derniere?.le ?? h(6, 0),
    variationSemaine: derniere && semaine ? derniere.score - semaine.score : 0,
    tenue: evo && suivant && evo.seuilSuivant !== null ? { seuil: evo.seuilSuivant, palierVise: suivant, jours: evo.joursTenus, requis: PM.trust.tenueJours } : null,
    criteres,
    alerte: a ? { seuil: a.seuil, sens: a.sens === 'montée' ? 'montee' : 'descente', ecart: a.ecart } : null,
    gele: scenario() === 'suspendu' || t - activite > PM.trust.gelJours * JOUR,
    evolution: e.evolution,
    evenements: e.evenements,
    decisions: e.decisions,
  }
}

const gerant = () => membreActuel()?.role === 'proprietaire'
const refuse = () => Promise.reject(new Error('acces_reserve_au_proprietaire'))
const deja = (cle: string) => etatQualite.lire().cles.includes(cle)

export const demoQualite: DomaineQualite = {
  trust: () => (gerant() ? repondre(trust()) : refuse()),
  avis: () => (gerant() ? repondre(etatQualite.lire().avis) : refuse()),
  async repondreAvis(id, texte, o) {
    if (!gerant()) return refuse()
    const a = etatQualite.lire().avis.find((x) => x.id === id)
    if (!a) return { ok: false, raison: 'introuvable' }
    if (!texte.trim()) return { ok: false, raison: 'texte_vide' }
    if (a.reponse !== null) return deja(o.cle) ? { ok: true } : { ok: false, raison: 'deja_repondu' }
    etatQualite.ecrire((e) => void ((e.avis.find((x) => x.id === id)!.reponse = { texte: texte.trim(), le: o.heure }), e.cles.push(o.cle)))
    return { ok: true }
  },
  async signalerAvis(id, motif: MotifSignalement, o) {
    if (!gerant()) return refuse()
    const a = etatQualite.lire().avis.find((x) => x.id === id)
    if (!a) return { ok: false, raison: 'introuvable' }
    if (a.signalement) return deja(o.cle) ? { ok: true } : { ok: false, raison: 'deja_signale' }
    etatQualite.ecrire((e) => void ((e.avis.find((x) => x.id === id)!.signalement = { motif, le: o.heure, etat: 'en_examen' }), e.cles.push(o.cle)))
    // Vers la console : l'avis signalé arrive dans la File d'action (modération des avis, ADM-P15).
    signaler('relais', id, { insulte: 'Avis insultant', donnee_personnelle: 'Donnée personnelle dans un avis', hors_sujet: 'Avis hors sujet' }[motif], 'normale', o.heure)
    return { ok: true }
  },
  paliers() {
    if (!gerant()) return refuse()
    const p = palierDe(etatQualite.lire().score)
    const rang = ORDRE_PALIERS.indexOf(p)
    return repondre<Palier[]>(ORDRE_PALIERS.map((nom, k) => ({ nom, seuil: nom === 'Starter' ? 0 : PM.trust.seuils[nom], atteint: k <= rang, actuel: k === rang })))
  },
  async contester(id, texte, o) {
    if (!gerant()) return refuse()
    const e = etatQualite.lire()
    const x = e.evenements.find((v) => v.id === id) ?? e.decisions.find((v) => v.id === id)
    if (!x) return { ok: false, raison: 'introuvable' }
    if (x.contestation && deja(o.cle)) return { ok: true, reponseAvant: x.contestation.reponseAvant }
    const rienAContester = !x.contestableJusqua || ('dossierEnCours' in x && (x.dossierEnCours || x.effet >= 0))
    const c0 = contestationCalcul(!!x.contestation, o.heure, PM.trust, { alerte: rienAContester, decisionClose: !!x.contestableJusqua && o.heure > x.contestableJusqua })
    if (!c0.possible) return { ok: false, raison: c0.motif === 'deja_contestee' ? 'deja_contestee' : c0.motif === 'decision_close' ? 'hors_delai' : 'non_contestable' }
    if (!texte.trim()) return { ok: false, raison: 'texte_vide' }
    const reponseAvant = c0.reponseAvant!
    const c: Contestation = { le: o.heure, texte: texte.trim(), etat: 'en_examen', reponseAvant, reponse: null }
    etatQualite.ecrire((s) => {
      const y = s.evenements.find((v) => v.id === id) ?? s.decisions.find((v) => v.id === id)!
      y.contestation = c
      s.cles.push(o.cle)
    })
    return { ok: true, reponseAvant }
  },
}
