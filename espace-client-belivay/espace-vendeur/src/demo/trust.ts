// DONNÉES DE DÉMONSTRATION — domaine « trust » : le service Scores de relaya (Q-37) tel que le vendeur le lit.
// - Trust Score 62,7 (jeu d'essai) et ses six critères : notes du service, points = note × part (une décimale) ;
// - journal des événements lu dans les commandes du jeu d'essai (prête dans le délai, litige en cours sans effet,
//   retour en attente d'inspection) et les avis ; barème des événements (VD10-R19, SCO-06) ;
// - contrôle au ramassage lu au registre (CTRL-RAMASSAGE, VD-CTRL-RENFORCE, VD-PROBATOIRE), jamais écrit ;
// - historique des décisions : vide dans le jeu d'essai (« Aucune sanction ») ; les décisions de démonstration
//   (avertissement, descente proposée, suspension du scénario « Compte suspendu » de VD-04) se lisent par leur
//   identifiant, et l'historique les montre quand l'adresse les nomme (?cas=avertissement, scénario du prototype) ;
// - contestation : une fois par décision, réponse sous 72 h ouvrées (dimanche non compté), gardée sur l'appareil.
import type { CleCritere, ControleRamassage, Decision, DomaineTrust, EvenementScore, Score, StatutCompte } from '../donnees/domaines/trust'
import { PARAMETRES } from '../calculs/registre'
import { Dec } from '../calculs/argent'
import { controleRenforce, finSuspensionAuPlusTard, finVisibiliteReduite, frequenceDeControle } from '../calculs/sanctions'
import { ajouterJours, debutDuJour, HEURE, jourDe, jourSemaine, yaounde } from '../calculs/temps'
import { maintenant } from './horloge'
import { BOUTIQUE, COMMANDES } from './jeu-essai'
import { etatCommandes } from './commandes'
import { litigesEnCours } from './litiges'
import { magasin, repondre } from './stockage'

// ---------- Registre (valeurs de départ réglables en console) ----------

const PS = PARAMETRES.sanctions
export const CONTROLE = { premieres: PS.controlePremieres, sousSeuil: PS.controleSousSeuil, seuil: PS.controleSeuilScore, auDessus: PS.controleEnsuite, renforceSous: PS.renforceSousScore, renforceBaisse: PS.renforceBaissePoints }

/** Délai de réponse à une contestation : 72 h ouvrées au calendrier BelivaY (toutes les heures sauf le dimanche). */
export const REPONSE_HEURES = PARAMETRES.console.contestationHeures // VD-CONTESTATION-REPONSE
export function apresHeuresOuvrees(depuis: number, heures: number): number {
  let t = depuis
  let reste = heures
  while (reste > 0) {
    const jour = jourDe(t)
    const finJour = debutDuJour(ajouterJours(jour, 1))
    if (jourSemaine(jour) === 6) {
      t = finJour
      continue
    }
    const dispo = (finJour - t) / HEURE
    if (dispo >= reste) return t + reste * HEURE
    reste -= dispo
    t = finJour
  }
  return t
}

// ---------- Score ----------

const CRITERES: { cle: CleCritere; nom: string; poids: number; note: number }[] = [
  { cle: 'ponctualite', nom: 'Ponctualité', poids: 25, note: 69.6 },
  { cle: 'qualite', nom: 'Qualité', poids: 20, note: 63.5 },
  { cle: 'satisfaction', nom: 'Satisfaction', poids: 20, note: 54.5 },
  { cle: 'litiges', nom: 'Litiges', poids: 15, note: 63.3 },
  { cle: 'documents', nom: 'Documents', poids: 10, note: 100 },
  { cle: 'anciennete', nom: 'Ancienneté', poids: 10, note: 22 },
]
const dixieme = (x: number) => Math.round(x * 10) / 10

// Avis reçus (domaine des avis : VD-11) tels que le service Scores les compte : 5 ★ succès, 3 ★ neutre.
const AVIS = [
  { a: yaounde(2026, 9, 3, 19, 12), etoiles: 5, ref: 'BLV-00001' },
  { a: yaounde(2026, 9, 10, 8, 40), etoiles: 3, ref: 'BLV-00002' },
]

// Relevés de la nuit (service Scores) : départ au neutre (50) à la signature, puis les commandes réussies.
const RELEVES: [string, number][] = [
  ['2026-08-23', 50],
  ['2026-08-31', 54.2],
  ['2026-09-04', 57.1],
  ['2026-09-08', 59.8],
  ['2026-09-11', 58.9],
  ['2026-09-15', 61.4],
  ['2026-09-17', 63.8],
  ['2026-09-19', 64.1],
  ['2026-09-20', 62.9],
  ['2026-09-21', 62.7],
]
function historique(): Score['historique'] {
  const fin = jourDe(maintenant())
  const debut = ajouterJours(fin, -29)
  const out: Score['historique'] = []
  let v = 50
  for (let j = debut; j <= fin; j = ajouterJours(j, 1)) {
    for (const [d, s] of RELEVES) if (d <= j) v = s
    out.push({ jour: j, score: v })
  }
  return out
}

function evenements(): EvenementScore[] {
  const cmds = etatCommandes.lire()
  const ev: EvenementScore[] = []
  for (const c of COMMANDES) {
    if (c.retraitA) ev.push({ a: c.retraitA, libelle: 'Prête dans le délai', effet: 'succes', critere: 'ponctualite', ref: c.ref })
    if (c.litige && cmds[c.ref]?.etape === 'litige') ev.push({ a: c.litige.ouvertA, libelle: 'Litige ouvert · ne compte pas tant qu’il est en cours', effet: 'aucun', critere: 'litiges', ref: c.ref })
    if (c.retour && cmds[c.ref]?.etape === 'retour') ev.push({ a: c.retraitA! + 30 * HEURE, libelle: 'Retour signalé · compte après l’inspection', effet: 'aucun', critere: 'qualite', ref: c.ref })
  }
  for (const a of AVIS) ev.push({ a: a.a, libelle: `Avis ${a.etoiles} ★`, effet: a.etoiles >= 4 ? 'succes' : a.etoiles === 3 ? 'neutre' : 'leger', critere: 'satisfaction', ref: a.ref })
  return ev.filter((e) => e.a <= maintenant()).sort((x, y) => y.a - x.a)
}

function lireScore(): Score {
  const litiges = litigesEnCours().length
  const livrees = COMMANDES.filter((c) => c.retraitA && c.retraitA <= maintenant()).length
  const detail: Record<CleCritere, string> = {
    ponctualite: `${livrees} commandes prêtes dans le délai`,
    qualite: '4 commandes closes sans retour',
    satisfaction: '1 avis 5 ★ ; l’avis 3 ★ ne compte ni pour ni contre',
    litiges: litiges ? `4 commandes closes sans litige ; ${litiges} en cours non comptés` : '4 commandes closes sans litige',
    documents: 'CNI valide, selfie vérifié',
    anciennete: `4 mois et demi ; ${BOUTIQUE.commandesLivrees} commandes livrées`,
  }
  const sanction = statutCompte().enCours
  return {
    total: BOUTIQUE.trustScore,
    calculeA: debutDuJour(jourDe(maintenant())) + 3 * HEURE,
    criteres: CRITERES.map((c) => ({ ...c, points: dixieme((c.note * c.poids) / 100), detail: detail[c.cle] })),
    evenements: evenements(),
    bareme: [
      { evenement: 'Prête dans le délai', effet: 'succes' },
      { evenement: 'Retard toléré', effet: 'leger' },
      { evenement: 'Retard au-delà du délai', effet: 'moyen' },
      { evenement: 'Non-préparation', effet: 'grave_sanction' },
      { evenement: 'Rupture signalée avant l’échéance', effet: 'leger' },
      { evenement: 'Délai demandé puis tenu', effet: 'leger' },
      { evenement: 'Fermeture non annoncée au passage du livreur', effet: 'moyen' },
      { evenement: 'Annulation par le client', effet: 'aucun' },
      { evenement: 'Retour non conforme mineur', effet: 'leger' },
      { evenement: 'Défectueux, faux ou vice caché confirmé', effet: 'grave' },
      { evenement: 'Avis 4 ou 5 ★', effet: 'succes' },
      { evenement: 'Avis 3 ★', effet: 'neutre' },
      { evenement: 'Avis 1 ou 2 ★', effet: 'leger' },
      { evenement: 'Document expiré', effet: 'documents_zero' },
    ],
    historique: historique(),
    gele: sanction?.type === 'suspension',
    sanction: sanction && sanction.niveau ? { niveau: sanction.niveau, depuis: sanction.effetA, motif: sanction.motif } : null,
    controleAuRamassage: (() => {
      const c = controle()
      return c.sur === 1 ? '100 %' : `1 sur ${c.sur}`
    })(),
  }
}

// ---------- Contrôle au ramassage ----------

function controle(): ControleRamassage {
  const ramassees = COMMANDES.filter((c) => c.retraitA && c.retraitA <= maintenant()).length
  const h = historique()
  const score = Dec.de(String(BOUTIQUE.trustScore))
  const renforce = controleRenforce(score, Dec.de(String(h[Math.max(0, h.length - 8)].score)), PS)
  const part = frequenceDeControle(ramassees, score, PS, { renforce })
  const sur = Dec.de(1).sur(part).francs()
  const base = { premieres: CONTROLE.premieres, ramassees, renforceSous: CONTROLE.renforceSous, renforceBaisse: CONTROLE.renforceBaisse, probatoire: null }
  if (ramassees < CONTROLE.premieres) return { ...base, sur, raison: 'premieres', seuilReduction: null, surApres: CONTROLE.sousSeuil }
  if (renforce) return { ...base, sur, raison: 'renforce', seuilReduction: CONTROLE.renforceSous, surApres: CONTROLE.sousSeuil }
  if (sur === CONTROLE.sousSeuil) return { ...base, sur, raison: 'sous_seuil', seuilReduction: CONTROLE.seuil, surApres: CONTROLE.auDessus }
  return { ...base, sur, raison: 'au_dessus', seuilReduction: null, surApres: null }
}

// ---------- Décisions ----------

// Décisions de démonstration (scénarios du prototype) : jamais dans l'historique du jeu d'essai, qui n'en a aucune.
const SCENARIOS: Omit<Decision, 'contestation'>[] = [
  {
    id: 'DEC-2026-0918-S3',
    type: 'suspension',
    niveau: 3,
    palierVise: null,
    decideeA: yaounde(2026, 9, 18, 10, 12),
    effetA: yaounde(2026, 9, 18, 10, 12),
    motif: 'Trois commandes non préparées en 30 jours',
    valideePar: 'une personne de l’équipe Qualité',
  },
  {
    id: 'DEC-2026-0916-A1',
    type: 'avertissement',
    niveau: 1,
    palierVise: null,
    decideeA: yaounde(2026, 9, 16, 7, 0),
    effetA: yaounde(2026, 9, 16, 7, 0),
    motif: 'Commande BLV-00004 prête 40 minutes après l’échéance',
    valideePar: null,
  },
  {
    id: 'DEC-2026-0917-V2',
    type: 'visibilite_reduite',
    niveau: 2,
    palierVise: null,
    decideeA: yaounde(2026, 9, 17, 16, 5),
    effetA: yaounde(2026, 9, 17, 16, 5),
    motif: 'Commande BLV-00004 non préparée',
    valideePar: 'une personne de l’équipe Qualité',
  },
  {
    id: 'DEC-2026-0919-P',
    type: 'descente',
    niveau: null,
    palierVise: 'Bronze',
    decideeA: yaounde(2026, 9, 19, 11, 30),
    effetA: yaounde(2026, 9, 26, 0, 0),
    motif: 'Trust Score sous 65 pendant 14 jours de suite',
    valideePar: 'une personne de l’équipe Qualité',
  },
]
const CAS: Record<string, string> = { suspension: 'DEC-2026-0918-S3', avertissement: 'DEC-2026-0916-A1', descente: 'DEC-2026-0919-P', visibilite: 'DEC-2026-0917-V2' }

const etat = magasin('trust', () => ({ contestations: {} as Record<string, NonNullable<Decision['contestation']>> }))

function avecContestation(d: Omit<Decision, 'contestation'>): Decision {
  return { ...d, contestation: etat.lire().contestations[d.id] ?? null }
}
/** Scénario nommé par l'adresse (?cas=avertissement), comme ?role=prep : démonstration seulement. */
function casCourant(): string | null {
  try {
    return new URLSearchParams(location.search).get('cas')
  } catch {
    return null
  }
}
function decisions(): Decision[] {
  const cas = casCourant()
  const id = cas ? CAS[cas] : null
  return SCENARIOS.filter((d) => d.id === id || etat.lire().contestations[d.id]).map(avecContestation).sort((a, b) => b.decideeA - a.decideeA)
}
/** La décision en cours (sanction ou descente) de l'adresse ouverte : aucune dans le jeu d'essai. */
export function decisionEnCours(): Decision | null {
  const cas = casCourant()
  const d = cas ? SCENARIOS.find((x) => x.id === CAS[cas]) : null
  return d ? avecContestation(d) : null
}

function statutCompte(): StatutCompte {
  const d = decisionEnCours()
  const etatCompte: StatutCompte['etat'] = !d || d.type === 'descente' ? 'aucune' : d.type === 'suspension' ? 'suspendu' : d.type === 'exclusion' ? 'exclu' : d.type
  const finEffet = d?.type === 'visibilite_reduite' ? finVisibiliteReduite(d.effetA, PS) : d?.type === 'suspension' ? finSuspensionAuPlusTard(d.effetA, PS) : null
  return {
    etat: etatCompte,
    enCours: d,
    controle: controle(),
    alerteAvantSeuil: true,
    regles: { visibiliteJours: PS.visibiliteJours, suspensionSous: PS.suspensionSousScore, nonPreparations: PS.nonPreparations, nonPreparationsJours: PS.nonPreparationsJours, suspensionMaxJours: PS.suspensionMaxJours, probatoireCommandes: PS.probatoireCommandes },
    finEffet,
  }
}

export const demoTrust: DomaineTrust = {
  score: () => repondre(lireScore()),
  statut: () => repondre(statutCompte()),
  decisions: () => repondre(decisions()),
  decision: (id) => {
    const d = SCENARIOS.find((x) => x.id === id)
    return repondre(d ? avecContestation(d) : null)
  },
  async contester(id, texte, preuves) {
    const d = SCENARIOS.find((x) => x.id === id)
    if (!d) return { ok: false, raison: 'introuvable' }
    if (etat.lire().contestations[id]) return { ok: false, raison: 'deja_contestee' }
    const n = texte.trim().length
    if (n < 40) return { ok: false, raison: 'trop_court' }
    if (n > 1000) return { ok: false, raison: 'trop_long' }
    const envoyeeA = maintenant()
    const reponseAvant = apresHeuresOuvrees(envoyeeA, REPONSE_HEURES)
    etat.ecrire((e) => {
      e.contestations[id] = { envoyeeA, texte: texte.trim(), preuves, reponseAvant, reponse: null }
    })
    return { ok: true, reponseAvant }
  },
}

/** Décision d'un identifiant, avec sa contestation éventuelle (lue par l'accueil : « Compte suspendu »). */
export function decisionDe(id: string): Decision | null {
  const d = SCENARIOS.find((x) => x.id === id)
  return d ? avecContestation(d) : null
}

/** Identifiant de la décision d'un scénario du prototype (« Compte suspendu » de VD-04 : CAS.suspension). */
export const DECISION_DU_CAS = CAS
