// DONNÉES DE DÉMONSTRATION — le poste de travail des décisions encadrées (logique-metier/DECISIONS-ENCADREES.md) : un
// même modèle pour sept genres de dossiers, chacun lu dans la source qui le tient déjà (aucune donnée en double) :
// - litige : src/demo/litiges.ts (jeu d'essai et dossiers du pont : claim.opened, preuves du livreur et du relais) ;
// - kyc : la Revue KYC (src/demo/acteurs.ts) ; décider passe par deciderKyc (pièces ouvertes, conflit, doublon) ;
// - remboursement : src/demo/argent.ts (exécuter au moyen d'origine, un seul remboursement par commande) ;
// - sanction : src/demo/acteurs.ts (barème, recours, exclusion à quatre yeux) ;
// - kit : les retenues de kit contestées (src/demo/logistique.ts : décision journalisée kit.maintenir / kit.annuler) ;
// - constat : les constats des relais (réserve, colis absent du lot ; jeu d'essai et pont relay.drop.item_result) ;
// - signalement : les signalements des cinq espaces (jeu d'essai et pont report.filed).
// La source REFUSE tout ce que l'écran grise, avec la même raison (calculs/decisions.ts : verifierDemande), et garde le
// journal du poste : instantané des preuves, suggestion, écart, motif (l'Audit lit les écarts). Contrôles à refaire au
// serveur : logique-metier/CONTROLES-SERVEUR-DECISIONS.md.
import { F } from '@client/i18n/format'
import { PARAMETRES } from '../calculs/registre'
import { NOM_PARTIE, NOM_TYPE, issuesPourAgent, libelleIssue, motifValable, niveauPour, plafondGeste, prolongation, verifierDemande, verifierLot, type ContexteDemande } from '../calculs/decisions'
import { AccesRefuse, type Francs, type Instant, type Role } from '../donnees/communs'
import type { AppelPoste, ControlePreuve, DecisionPoste, DemandePoste, DomaineDecisions, DossierCourt, DossierPoste, EtatControle, GenreDossier, IssuePoste, LigneEcart, Partie, PieceDossier, RefusPoste, SuggestionPoste, TransmissionPoste, TypeLitige } from '../donnees/domaines/decisions'
import type { DossierKyc, Sanction } from '../donnees/domaines/acteurs'
import type { Depart } from '../donnees/domaines/logistique'
import type { RemboursementVu } from '../donnees/domaines/argent'
import type { DecisionQuatreYeux } from '../donnees/domaines/quatreyeux'
import { REGLES_S1 } from '../pages/ADM-03/regles'
import { agentCourant, exigerPage, roleCourant, dansPerimetre } from './acces'
import { demoActeurs } from './acteurs'
import { demoArgent } from './argent'
import { etatMembre } from './equipe-etat'
import { maintenant } from './horloge'
import { HEURE, JOUR, T, nomAgent } from './jeu-essai'
import { journaliser } from './journal'
import { DECIDEURS_LITIGE, appliquerPoste, ecrirePoste, lecturePoste, litigeCourt, litigeInterne, litigeVisible, litigesInternes, masqueClient, postNeuf, type EtatPoste, type LitigeInterne } from './litiges'
import { demoLogistique } from './logistique'
import { evenementsPour } from './pont'
import { demanderSecond, effetQuatreYeux } from './quatreyeux'
import { magasin, repondre } from './stockage'

const fr = (n: number) => `${F(n)} F`
const P = () => PARAMETRES.decisions

// ── État propre du poste (genres sans état ailleurs, journal des décisions) ─────────────────────────────────────────
interface Attente {
  genre: GenreDossier
  id: string
  demande: DemandePoste
  montant: Francs | null
  payeur: Partie | null
  libelle: string
  suggestion: string | null
  par: string
  parId: string
  instantane: LigneEcart['instantane']
  suites: string[]
}
interface DecisionStock extends LigneEcart {
  ecart: boolean
  lot: string | null
}
interface EtatDecisions {
  postes: Record<string, EtatPoste> // « genre:id » (le litige garde le sien dans litiges.ts)
  decisions: Record<string, DecisionPoste> // « genre:id » : décisions des genres tenus ici (constat, signalement)
  journal: DecisionStock[]
  attentes: Record<string, Attente> // QY → décision qui s'appliquera à la contresignature
  nLot: number
}
export const decisionsDemo = magasin<EtatDecisions>('decisions', () => ({ postes: {}, decisions: {}, journal: [], attentes: {}, nLot: 0 }))
const cle = (g: GenreDossier, id: string) => `${g}:${id}`
const posteDe = (g: GenreDossier, id: string): EtatPoste => decisionsDemo.lire().postes[cle(g, id)] ?? postNeuf()
function ecrirePosteLocal(g: GenreDossier, id: string, f: (p: EtatPoste) => void) {
  decisionsDemo.ecrire((e) => {
    const k = cle(g, id)
    e.postes[k] ??= postNeuf()
    f(e.postes[k])
  })
}

// ── L'agent connecté : niveau, plafond, geste ───────────────────────────────────────────────────────────────────────
function agentPoste() {
  const a = agentCourant()
  const m = etatMembre(a.id)
  const role = roleCourant()
  const niveau = m?.niveau ?? null
  const plafond = role === 'superviseur' ? null : (m?.perimetre.plafond ?? PARAMETRES.acces.plafond[niveau ?? 'agent'])
  const geste = role === 'superviseur' ? P().geste.responsable : plafondGeste(niveau)
  return { id: a.id, nom: nomAgent(a), role, niveau, plafond, geste, niveauLitige: m?.perimetre.niveauLitige ?? null }
}
type AgentPoste = ReturnType<typeof agentPoste>

// ── Un dossier, quel que soit son genre ─────────────────────────────────────────────────────────────────────────────
interface Brut {
  genre: GenreDossier
  id: string
  ref: string
  titre: string
  aDecider: string
  type: TypeLitige | null
  typeLibelle: string
  montant: Francs
  paye: Francs
  echeance: Instant | null
  pasAvant: Instant | null
  zone: string | null
  parties: DossierPoste['parties']
  pieces: PieceDossier[]
  controles: ControlePreuve[]
  lecture: SuggestionPoste | null
  ambigu: boolean
  issues: IssuePoste[]
  motifs: string[]
  messages: DossierPoste['messages']
  modeles: DossierPoste['modeles']
  decide: boolean
  decision: DecisionPoste | null
  transmission: TransmissionPoste | null
  attente: string | null
  route: DossierPoste['route']
  auteur: string | null
  lies: string[]
  tranche: (a: AgentPoste) => boolean
  lot: string | null
  poste: EtatPoste
  comparer: string[]
  aOuvrir: string[]
  zonePerimetre: boolean
}

/** Applique les corrections et confirmations de l'agent à une liste de contrôle calculée. */
function avecCorrections(l: { id: string; libelle: string; etat: EtatControle; pourquoi: string; pieces?: string[] }[], p: EtatPoste): ControlePreuve[] {
  return l.map((c) => {
    const k = p.corrections[c.id]
    return { id: c.id, libelle: c.libelle, calcule: c.etat, etat: k?.etat ?? c.etat, pourquoi: c.pourquoi, pieces: c.pieces ?? [], confirme: p.confirmes.includes(c.id) || !!k, corrige: k ? { par: k.par, le: k.le, de: k.de } : null }
  })
}
/** Pièce ajoutée par un appel noté (l'appel devient une preuve). */
const pieceAppel = (a: AppelPoste): PieceDossier => ({ id: a.id, nature: 'appel', etape: 'Appel', partie: 'console', titre: `Appel · ${NOM_PARTIE[a.avec]} · ${a.resultat === 'accord' ? 'accord' : a.resultat}`, par: a.par, le: a.le, lieu: null, distanceM: null, colis: null, note: a.resume + (a.accord ? ` · accord : ${libelleIssue(a.accord).toLowerCase()}` : ''), image: null, manquante: false, saisieLe: null, source: 'console' })
const issue = (id: string, libelle: string, effet: string, o: Partial<IssuePoste> = {}): IssuePoste => ({ id, libelle, effet, payeur: null, montant: null, etat: 'permise', raison: null, regle: null, fourchette: null, quatreYeux: false, ...o })
const bloquer = (i: IssuePoste, raison: string | null): IssuePoste => (raison ? { ...i, etat: 'bloquee', raison } : i)
const ctl = (id: string, libelle: string, etat: EtatControle, pourquoi: string, pieces: string[] = []) => ({ id, libelle, etat, pourquoi, pieces })
const MODELES_COMMUNS = [
  { id: 'complement', titre: 'Demande de complément', texte: 'Pour trancher votre dossier, nous avons besoin d’une photo nette de l’article et de son emballage. Merci de l’envoyer depuis l’application sous 48 h.' },
  { id: 'accord', titre: 'Accord confirmé', texte: 'Comme convenu au téléphone, nous appliquons la solution choisie ensemble. Vous recevez la confirmation dans l’application.' },
  { id: 'delai', titre: 'Délai prolongé', texte: 'Votre dossier demande une vérification de plus : notre décision arrive au plus tard sous 24 h. Merci de votre patience.' },
]

// ── 1. Litiges ──────────────────────────────────────────────────────────────────────────────────────────────────────
const MOTIFS_LITIGE = ['Preuves concordantes', 'Preuve absente : charge à qui devait la produire', 'Accord trouvé au téléphone', 'Retard établi', 'Lecture des photos après appel']

function messagesLitige(x: LitigeInterne, issues: IssuePoste[], raison: string): DossierPoste['messages'] {
  const { s } = x
  const m: DossierPoste['messages'] = {}
  for (const i of issues) {
    const somme = i.fourchette ? 'le montant décidé' : i.montant ? fr(i.montant) : ''
    const client =
      i.id.startsWith('rembourser') ? `Bonne nouvelle : votre litige ${s.commande} est tranché en votre faveur. ${somme} vous sont rendus sur ${s.paiement}, votre moyen de paiement d’origine.`
      : i.id === 'partiel' ? `Votre litige ${s.commande} est tranché : vous gardez l’article et recevez un remboursement partiel sur ${s.paiement}.`
      : i.id === 'remplacer' ? `Votre litige ${s.commande} est tranché : le vendeur vous envoie le même article sous 72 h ouvrées.`
      : i.id === 'geste' ? `Votre litige ${s.commande} est tranché : nous vous offrons un bon de réduction pour votre prochaine commande.`
      : `Après examen des preuves de votre commande ${s.commande}, nous ne pouvons pas donner suite : ${raison.charAt(0).toLowerCase() + raison.slice(1)}`
    const l: { partie: Partie; texte: string }[] = [{ partie: 'client', texte: client }]
    l.push({ partie: 'vendeur', texte: i.payeur === 'vendeur' ? `Le litige ${s.commande} est tranché à votre charge. Vous pouvez faire recours une fois sous ${REGLES_S1.recoursH} h.` : `Le litige ${s.commande} est tranché sans charge pour vous.` })
    if (s.entreprise && (i.payeur === 'entreprise' || s.faits.mode === 'domicile')) l.push({ partie: 'entreprise', texte: i.payeur === 'entreprise' ? `Litige ${s.commande} : la charge revient à votre entreprise ; retenue sur votre prochain versement, dans la limite de votre plafond.` : `Litige ${s.commande} : votre livreur n’est pas mis en cause.` })
    m[i.id] = l
  }
  return m
}

function brutLitige(x: LitigeInterne): Brut {
  const { s, d } = x
  const c = litigeCourt(x)
  const l = lecturePoste(s, d)
  const poste = d.poste
  const appels = poste.appels.map(pieceAppel)
  const vendeurEcheance = s.ouvertLe + REGLES_S1.vendeurH * HEURE
  const decide = d.etat === 'decide' || d.etat === 'clos'
  const montantMax = Math.max(...l.issues.filter((i) => i.etat !== 'bloquee').map((i) => i.montant ?? 0), 0)
  const niveauRequis = d.niveau === 2 ? 'Médiation' : l.lecture.ambigu ? 'Médiation' : niveauPour(montantMax).libelle
  return {
    genre: 'litige',
    id: s.id,
    ref: s.commande,
    titre: `${s.motif} · ${s.article}`,
    aDecider: d.etat === 'recours' ? `Recours de ${s.vendeur} : qui supporte la charge du remboursement déjà fait ?` : `${masqueClient(s.client)} : « ${s.motif} ». Qui a raison, et qui supporte le coût ?`,
    type: s.type,
    typeLibelle: d.etat === 'recours' ? `${NOM_TYPE[s.type]} · recours` : NOM_TYPE[s.type],
    montant: s.montantEnJeu,
    paye: l.contexte.paye,
    echeance: c.echeance,
    pasAvant: c.etat === 'ouvert' ? vendeurEcheance : null,
    zone: s.zone,
    parties: s.positionsBase.map((p) => ({ partie: p.partie, nom: p.nom, position: p.texte ?? p.etat })),
    pieces: [...s.pieces, ...appels].sort((a, b) => a.le - b.le),
    controles: l.controles.map((k) => ({ ...k, pieces: s.pieces.filter((p) => piecesDuControle(k.id, p)).map((p) => p.id) })),
    lecture: decide && !d.poste.decision ? null : l.lecture.suggestion,
    // Preuves contradictoires : le niveau 1 transmet ; la Médiation (niveau 2) tranche.
    ambigu: l.lecture.ambigu && d.niveau === 1,
    issues: l.issues,
    motifs: MOTIFS_LITIGE,
    messages: messagesLitige(x, l.issues, l.lecture.suggestion.raison),
    modeles: MODELES_COMMUNS,
    decide,
    decision: !decide ? null : d.poste.decision ?? (d.decision ? { issue: d.decision.option, libelle: d.decision.libelle, montant: null, payeur: null, motif: '—', note: d.decision.motif, message: '', par: d.decision.par, le: d.decision.le, etat: d.decision.etat === 'contresignee' ? 'contresignee' : 'appliquee', quatreYeux: d.decision.quatreYeux, suggestion: null, ecart: false, lot: null, suites: d.decision.suites } : null),
    transmission: d.poste.transmission,
    attente: d.attente,
    route: null,
    auteur: s.auteur,
    lies: s.lies,
    tranche: (a) => DECIDEURS_LITIGE[d.niveau].includes(a.role) && (a.role === 'superviseur' || !a.niveauLitige || d.niveau <= a.niveauLitige),
    lot: s.cause && l.lecture.suggestion.issue ? `litige:${s.type}:${l.lecture.suggestion.issue}:${s.cause}` : null,
    poste,
    comparer: s.pieces.filter((p) => p.image && (p.etape === 'Ramassage' || p.etape === 'Remise' || p.etape === 'Client' || p.etape === 'Offre' || p.etape === 'Dépôt au relais')).map((p) => p.id),
    aOuvrir: [],
    zonePerimetre: dansPerimetre(s.zone),
    // niveau requis : porté par le titre court (voir court())
    ...{ niveauRequis },
  } as Brut & { niveauRequis: string }
}
/** Pièces qui fondent une ligne de contrôle (surlignées dans la frise). */
function piecesDuControle(id: string, p: PieceDossier): boolean {
  if (id === 'photo_ramassage' || id === 'contenu_ramassage' || id === 'emballage') return p.etape === 'Ramassage' || p.etape === 'Offre'
  if (id === 'scelle') return p.etape === 'Dépôt au relais'
  if (id === 'photo_remise' || id === 'position_remise') return p.etape === 'Remise' && (p.nature === 'photo' || p.nature === 'constat' || p.nature === 'position') || p.nature === 'position'
  if (id === 'code_remise') return p.nature === 'code'
  if (id === 'appels' || id === 'joignable') return p.nature === 'appel'
  if (id === 'photos_client') return p.partie === 'client'
  if (id === 'reponse_vendeur') return p.etape === 'Vendeur'
  return id === 'heures' || id === 'retard'
}

// ── 2. Vérification d'identité (Revue KYC) ──────────────────────────────────────────────────────────────────────────
const IMAGE_KYC: Record<string, PieceDossier['image']> = {
  cni_recto: { motif: 'piece_recto', teinte: 'bleu' },
  cni_verso: { motif: 'piece_verso', teinte: 'bleu' },
  selfie_video: { motif: 'selfie', teinte: 'or' },
  permis: { motif: 'piece_recto', teinte: 'vert' },
  carte_grise: { motif: 'piece_verso', teinte: 'vert' },
  local: { motif: 'comptoir', teinte: 'sable' },
}
const NATURE_KYC: Record<string, string> = { cni_recto: 'CNI · recto', cni_verso: 'CNI · verso', selfie_video: 'Selfie vidéo (preuve de vie)', permis: 'Permis de conduire', carte_grise: 'Carte grise', rccm: 'Registre du commerce (RCCM)', niu: 'Numéro d’identifiant unique (NIU)', mint: 'Autorisation de transport (MINT)', assurance: 'Attestation d’assurance', local: 'Photos du local' }
function brutKyc(k: DossierKyc): Brut {
  const p = posteDe('kyc', k.id)
  const pieces: PieceDossier[] = k.pieces.map((x) => ({ id: x.id, nature: 'piece', etape: 'Pièce', partie: k.espace === 'client' ? 'client' : k.espace, titre: NATURE_KYC[x.nature] ?? x.nature, par: k.acteur, le: x.recueLe, lieu: null, distanceM: null, colis: null, note: x.doute ?? (x.etat === 'auto_ok' ? 'Vérifiée automatiquement' : x.motif ?? 'À revoir'), image: IMAGE_KYC[x.nature] ?? { motif: 'facture', teinte: 'gris' }, manquante: false, saisieLe: null, source: 'jeu' }))
  const ton = (t: string): EtatControle => (t === 'ok' ? 'ok' : t === 'ko' ? 'ko' : 'doute')
  const lignes = [
    ...k.controles.filter((c) => c.ton !== 'info').map((c, i) => ctl(`c${i}`, c.texte.split(' : ')[0], ton(c.ton), c.texte)),
    ...k.dedup.filter((c) => c.ton !== 'info').map((c, i) => ctl(`d${i}`, c.texte.split(' : ')[0], ton(c.ton), c.texte)),
    ctl('vues', 'Pièces ouvertes par l’agent', k.pieces.every((x) => x.vue) ? 'ok' : 'doute', k.pieces.every((x) => x.vue) ? 'Chaque pièce ouverte par lien court journalisé' : `${k.pieces.filter((x) => !x.vue).length} pièce(s) à ouvrir (comparaison côte à côte)`),
    ...(k.doublon ? [ctl('doublon', 'Aucun doublon d’identité', k.doublon.rolesDeclares ? 'doute' : 'ko', `Même identité qu’un autre compte (${k.doublon.autreCompte}), similarité ${Math.round(k.doublon.similarite * 100)} %`)] : []),
  ]
  const controles = avecCorrections(lignes, p)
  const ko = controles.filter((c) => c.etat === 'ko' && c.id !== 'vues')
  const doutes = k.pieces.filter((x) => x.etat === 'a_revoir' && x.doute)
  const decide = k.etat !== 'a_revoir'
  const sug: SuggestionPoste = k.doublon && !k.doublon.rolesDeclares ? { issue: 'rejeter', payeur: null, raison: 'Doublon d’identité non déclaré : approuver est impossible.', regle: 'ADM-06-R08' } : doutes.length ? { issue: 'complement', payeur: null, raison: `Doute sur ${doutes.length > 1 ? 'des pièces' : NATURE_KYC[doutes[0].nature] ?? 'une pièce'} : demander une nouvelle pièce.`, regle: 'KYC-REVUE-H · DP-62' } : { issue: 'approuver', payeur: null, raison: 'Contrôles concordants : pièces lisibles, visage et preuve de vie.', regle: 'ADM-06-R05' }
  const vues = k.pieces.every((x) => x.vue)
  const issues = [
    bloquer(issue('approuver', 'Approuver les pièces', 'Le compte s’active ; l’acteur et son organisation sont prévenus.'), k.doublon && !k.doublon.rolesDeclares ? 'Les contrôles montrent un doublon d’identité non déclaré.' : ko.length ? `Un contrôle est en échec : ${ko[0].libelle.toLowerCase()}.` : !vues ? 'Ouvrez chaque pièce avant d’approuver (comparaison côte à côte).' : null),
    bloquer(issue('complement', 'Demander une nouvelle pièce', `${doutes.length ? doutes.map((x) => NATURE_KYC[x.nature]).join(', ') : 'La pièce douteuse'} redemandée ; l’échéance est suspendue jusqu’au dépôt.`), doutes.length ? null : 'Aucune pièce en doute : rien à redemander.'),
    issue('rejeter', 'Rejeter une pièce', 'Pièce refusée avec un motif en clair visible de l’acteur ; il peut contester une fois.'),
  ]
  return {
    ...commun('kyc', k.id, k.acteur, `${k.titulaire} · ${k.organisation}`, `Les pièces de ${k.titulaire} sont-elles authentiques et cohérentes ?`, 'Vérification d’identité', k.zone),
    montant: 0,
    paye: 0,
    echeance: k.echeance,
    parties: [{ partie: k.espace === 'client' ? 'client' : k.espace, nom: k.acteur, position: k.organisation }],
    pieces: [...pieces, ...p.appels.map(pieceAppel)],
    controles,
    lecture: decide ? null : sug,
    issues,
    motifs: ['Contrôles concordants', 'Pièce illisible ou expirée', 'Doublon d’identité', 'Accord trouvé au téléphone'],
    messages: { approuver: [{ partie: k.espace === 'client' ? 'client' : k.espace, texte: 'Vos pièces sont vérifiées : votre compte est actif.' }], complement: [{ partie: k.espace === 'client' ? 'client' : k.espace, texte: 'Une de vos pièces doit être reprise : ouvrez votre espace, rubrique Pièces, et envoyez une photo nette, à plat, sans reflet.' }], rejeter: [{ partie: k.espace === 'client' ? 'client' : k.espace, texte: 'Une de vos pièces n’a pas pu être acceptée. Le motif est indiqué dans votre espace ; vous pouvez contester une fois.' }] },
    decide,
    decision: decide && k.decision ? { issue: k.etat === 'approuve' ? 'approuver' : k.etat === 'complement' ? 'complement' : 'rejeter', libelle: k.decision.quoi, montant: null, payeur: null, motif: '—', note: k.decision.motif ?? '', message: '', par: k.decision.par, le: k.decision.le, etat: 'appliquee', quatreYeux: null, suggestion: null, ecart: false, lot: null, suites: [] } : decide && k.complement ? { issue: 'complement', libelle: 'Complément demandé', montant: null, payeur: null, motif: '—', note: k.complement.motif, message: '', par: k.complement.par, le: k.complement.le, etat: 'appliquee', quatreYeux: null, suggestion: null, ecart: false, lot: null, suites: [] } : null,
    route: { route: 'kyc', params: { id: k.id } },
    lies: k.conflit ? [agentPoste().id] : [],
    tranche: (a) => a.role === 'superviseur' || a.role === 'verification',
    poste: p,
    comparer: k.pieces.filter((x) => IMAGE_KYC[x.nature]).map((x) => x.id),
    aOuvrir: k.pieces.filter((x) => !x.vue).map((x) => x.id),
  }
}

/** Champs communs d'un dossier hors litige. */
function commun(genre: GenreDossier, id: string, ref: string, titre: string, aDecider: string, typeLibelle: string, zone: string | null) {
  return { genre, id, ref, titre, aDecider, type: null, typeLibelle, pasAvant: null, zone, ambigu: false, modeles: MODELES_COMMUNS, transmission: posteDe(genre, id).transmission, attente: null, auteur: null, lies: [] as string[], lot: null, zonePerimetre: dansPerimetre(zone) }
}

// ── 3. Remboursements ───────────────────────────────────────────────────────────────────────────────────────────────
function brutRemb(r: RemboursementVu): Brut {
  const p = posteDe('remboursement', r.id)
  const seuil = PARAMETRES.console.seuilRemboursementQuatreYeux
  const paye = r.articles + r.livraison + r.fraisRendus
  const sansDecision = r.etat === 'attente'
  const pieces: PieceDossier[] = [
    { id: 'src', nature: 'systeme', etape: 'Décision', partie: 'belivay', titre: r.dossier ? `Décision du litige ${r.dossier}` : 'Décision à l’origine', par: r.auteur, le: r.decideLe, lieu: null, distanceM: null, colis: null, note: r.motif, image: null, manquante: sansDecision, saisieLe: null, source: 'jeu' },
    { id: 'moyen', nature: 'code', etape: 'Paiement', partie: 'client', titre: 'Moyen de paiement d’origine', par: 'Agrégateur de paiement', le: r.decideLe, lieu: null, distanceM: null, colis: null, note: `${r.moyen} · envoi vers ${r.vers}`, image: null, manquante: false, saisieLe: null, source: 'jeu' },
    ...r.tentatives.map((t, i): PieceDossier => ({ id: `t${i}`, nature: 'systeme', etape: 'Envoi', partie: 'belivay', titre: `Tentative ${i + 1}`, par: 'Agrégateur de paiement', le: t.le, lieu: null, distanceM: null, colis: null, note: `${t.vers} · ${t.issue}`, image: null, manquante: false, saisieLe: null, source: 'jeu' })),
    ...p.appels.map(pieceAppel),
  ]
  const lignes = [
    ctl('origine', 'Décision à l’origine', sansDecision ? 'ko' : 'ok', sansDecision ? 'Le litige n’est pas encore décidé : rembourser serait le clore avant la règle' : r.motif, ['src']),
    ctl('paye', 'Montant au plus égal au payé', r.montant <= paye ? 'ok' : 'ko', `${fr(r.montant)} pour ${fr(paye)} payés (articles, livraison, frais)`),
    ctl('moyen', 'Moyen de paiement d’origine', r.vers === r.moyen ? 'ok' : 'doute', r.vers === r.moyen ? `Vers ${r.moyen} (R68)` : `Vers ${r.vers} : autre numéro du même titulaire`, ['moyen']),
    ctl('unique', 'Un seul remboursement par commande', r.etat === 'rembourse' ? 'ko' : 'ok', r.etat === 'rembourse' ? 'Déjà remboursé' : 'Aucun autre remboursement parti'),
    ctl('seuil', 'Sous le seuil des quatre yeux', r.montant <= seuil ? 'ok' : 'doute', `${fr(r.montant)} · seuil ${fr(seuil)}`),
  ]
  const controles = avecCorrections(lignes, p)
  const decide = !['decide', 'echoue', 'attente'].includes(r.etat)
  const ok = r.etat === 'decide' || r.etat === 'echoue'
  const issues = [
    bloquer(issue('executer', 'Exécuter au moyen d’origine', `${fr(r.montant)} envoyés vers ${r.vers} ; le client est prévenu.`, { payeur: 'belivay', montant: r.montant, regle: 'R68 · R72' }), sansDecision ? 'Le litige n’est pas décidé : on ne rembourse pas avant la règle.' : r.montant > seuil ? `Au-delà de ${fr(seuil)} : exécution à quatre yeux depuis la page Remboursements.` : !ok ? 'Déjà parti ou refusé.' : null),
    issue('attendre', 'Attendre l’inspection', `Le colis est inspecté sous ${REGLES_S1.inspectionH} h ; sans inspection, le remboursement part d’office.`, { regle: 'R68' }),
  ]
  return {
    ...commun('remboursement', r.id, r.commande, `${r.article} · ${r.vendeur}`, `Faut-il envoyer ${fr(r.montant)} au client maintenant ?`, 'Remboursement', null),
    montant: r.montant,
    paye,
    echeance: r.decideLe + 2 * JOUR,
    parties: [{ partie: 'client', nom: 'Client', position: r.moyen }, { partie: 'vendeur', nom: r.vendeur, position: r.repriseVendeur ? `Reprise ${fr(r.repriseVendeur)}` : null }],
    pieces,
    controles,
    lecture: decide ? null : sansDecision ? { issue: 'attendre', payeur: null, raison: 'Le litige est encore ouvert : la règle attend sa décision.', regle: 'R68 · R70' } : { issue: 'executer', payeur: 'belivay', raison: 'Décision prise, montant et moyen d’origine conformes.', regle: 'R68' },
    issues,
    motifs: ['Décision à l’origine conforme', 'Inspection du colis attendue', 'Échec d’envoi corrigé'],
    messages: { executer: [{ partie: 'client', texte: `Votre remboursement de ${fr(r.montant)} part sur ${r.vers}, votre moyen de paiement d’origine.` }], attendre: [{ partie: 'client', texte: 'Votre remboursement part dès l’inspection du colis, sous 48 h au plus.' }] },
    decide,
    decision: decide ? { issue: 'executer', libelle: r.etat === 'rembourse' ? 'Remboursé' : r.etat === 'en_cours' ? 'Envoi en cours' : r.etat, montant: r.montant, payeur: 'belivay', motif: '—', note: r.motif, message: '', par: r.auteur, le: r.rembourseLe ?? r.decideLe, etat: 'appliquee', quatreYeux: r.quatreYeux?.id ?? null, suggestion: null, ecart: false, lot: null, suites: [] } : null,
    route: { route: 'remboursements', params: { id: r.id } },
    tranche: (a) => a.role === 'superviseur' || a.role === 'finance',
    poste: p,
    comparer: [],
    aOuvrir: [],
  }
}

// ── 4. Sanctions ────────────────────────────────────────────────────────────────────────────────────────────────────
function brutSanction(s: Sanction): Brut {
  const p = posteDe('sanction', s.id)
  const recours = s.etat === 'recours'
  const pieces: PieceDossier[] = [
    ...s.declencheurs.map((e): PieceDossier => ({ id: e.id, nature: 'systeme', etape: 'Déclencheur', partie: s.espace === 'client' ? 'client' : s.espace, titre: e.titre, par: 'Système', le: s.decision?.le ?? maintenant() - JOUR, lieu: null, distanceM: null, colis: null, note: e.detail, image: null, manquante: false, saisieLe: null, source: 'jeu' })),
    ...s.historique.map((h, i): PieceDossier => ({ id: `h${i}`, nature: 'systeme', etape: 'Historique', partie: 'belivay', titre: h.titre, par: h.par ?? 'Système', le: h.le, lieu: null, distanceM: null, colis: null, note: '', image: null, manquante: false, saisieLe: null, source: 'jeu' })),
    ...(s.recours ? [{ id: 'rec', nature: 'message' as const, etape: 'Recours', partie: (s.espace === 'client' ? 'client' : s.espace) as Partie, titre: 'Recours de l’acteur', par: s.acteur, le: s.recours.le, lieu: null, distanceM: null, colis: null, note: `« ${s.recours.texte} »`, image: null, manquante: false, saisieLe: null, source: 'jeu' as const }] : []),
    ...p.appels.map(pieceAppel),
  ]
  const veto = s.declencheurs.some((e) => e.gravite === 'veto')
  const lignes = [
    ctl('declencheurs', 'Déclencheurs datés et prouvés', s.declencheurs.length ? 'ok' : 'ko', `${s.declencheurs.length} déclencheur(s) au barème`),
    ctl('bareme', 'Niveau conforme au barème', s.proposition ? 'ok' : 'doute', s.proposition?.texte ?? 'Aucune proposition du barème'),
    ctl('conflit', 'Aucun lien avec l’agent', s.conflit ? 'ko' : 'ok', s.conflit ? 'Vous tenez ce compte d’acteur' : 'Aucun lien déclaré'),
    ...(recours ? [ctl('faits', 'Faits toujours actuels', 'doute', 'L’acteur dit avoir corrigé : vérifiez la date des corrections')] : []),
  ]
  const controles = avecCorrections(lignes, p)
  const decide = !recours && s.etat !== 'proposee'
  const auteur = recours ? (s.decision?.parId ?? null) : null
  const issues = recours
    ? [issue('recours_maintenir', 'Maintenir la sanction', 'La sanction court jusqu’à son terme ; recours épuisé.'), issue('recours_reduire', 'Réduire d’un niveau', `Niveau ${Math.max(1, s.niveau - 1)} appliqué à la place.`), issue('recours_lever', 'Lever la sanction', 'La sanction est levée ; elle reste au dossier, sans effet.')]
    : [issue('valider', `Valider le niveau ${s.niveau}`, s.effet, { quatreYeux: s.niveau >= 4 }), bloquer(issue('niveau_inferieur', 'Niveau inférieur', `Niveau ${Math.max(1, s.niveau - 1)} : ${s.niveau > 1 ? 'effet réduit' : 'avertissement'}.`), veto ? 'Veto (fraude, faux document) : pas de niveau inférieur.' : s.niveau <= 1 ? 'Déjà au niveau le plus bas.' : null), bloquer(issue('classer', 'Classer sans suite', 'Aucun effet ; la proposition reste au dossier.'), veto ? 'Veto : un faux document ou une fraude aux preuves ne se classe pas.' : null)]
  return {
    ...commun('sanction', s.id, s.acteur, `${s.acteur} · niveau ${s.niveau}`, recours ? `Recours de ${s.acteur} contre une sanction de niveau ${s.niveau}.` : `Faut-il appliquer la sanction de niveau ${s.niveau} proposée ?`, recours ? 'Sanction · recours' : 'Sanction', s.zone),
    montant: 0,
    paye: 0,
    echeance: recours && s.recours ? s.recours.le + REGLES_S1.mediateurJ * JOUR : null,
    parties: [{ partie: s.espace === 'client' ? 'client' : s.espace, nom: s.acteur, position: s.recours?.texte ?? s.origine }],
    pieces,
    controles,
    lecture: decide ? null : recours ? { issue: 'recours_reduire', payeur: null, raison: 'Faits corrigés depuis la décision : le niveau inférieur suffit.', regle: 'ADM-06 · sanctions' } : { issue: 'valider', payeur: null, raison: s.proposition?.texte ?? 'Barème appliqué.', regle: 'ADM-06 · barème' },
    issues,
    motifs: ['Barème appliqué', 'Faits corrigés', 'Veto : fraude ou faux document', 'Accord trouvé au téléphone'],
    messages: Object.fromEntries(issues.map((i) => [i.id, [{ partie: (s.espace === 'client' ? 'client' : s.espace) as Partie, texte: `Décision de BelivaY sur votre dossier ${s.id} : ${i.libelle.toLowerCase()}. ${i.effet}` }]])),
    decide,
    decision: decide && s.decision ? { issue: 'valider', libelle: s.decision.quoi, montant: null, payeur: null, motif: '—', note: s.decision.motif ?? '', message: '', par: s.decision.par, le: s.decision.le, etat: 'appliquee', quatreYeux: null, suggestion: null, ecart: false, lot: null, suites: [] } : null,
    route: { route: 'sanctions', params: { id: s.id } },
    auteur,
    lies: s.conflit ? [agentPoste().id] : [],
    tranche: (a) => a.role === 'superviseur' || a.role === 'mediation',
    poste: p,
    comparer: [],
    aOuvrir: [],
  }
}

// ── 5. Retenues de kit contestées ───────────────────────────────────────────────────────────────────────────────────
function brutKit(d: Depart): Brut {
  const p = posteDe('kit', d.id)
  const c = d.contestation!
  const dansDelai = d.kit.constateLe !== null && d.kit.constateLe <= d.constatJusqua
  const valeur = REGLES_S1.kitValeur
  const pieces: PieceDossier[] = [
    { id: 'kit', nature: 'photo', etape: 'Constat', partie: 'entreprise', titre: 'Kit rendu · constat de l’entreprise', par: d.entreprise, le: d.kit.constateLe ?? d.demandeLe, lieu: 'Agence', distanceM: null, colis: null, note: `Manquant : ${d.kit.manquants.join(', ') || '—'} · retenue ${fr(d.kit.retenue)}`, image: { motif: 'kit_incomplet', teinte: 'or' }, manquante: false, saisieLe: null, source: 'jeu' },
    { id: 'cont', nature: 'message', etape: 'Contestation', partie: 'livreur', titre: 'Contestation du livreur', par: d.livreur, le: c.le, lieu: null, distanceM: null, colis: null, note: `« ${c.motif} »`, image: null, manquante: false, saisieLe: null, source: 'jeu' },
    { id: 'cahier', nature: 'photo', etape: 'Contestation', partie: 'livreur', titre: 'Cahier de l’agence', par: d.livreur, le: c.le, lieu: 'Agence', distanceM: null, colis: null, note: 'Signature invoquée par le livreur : aucune photo du cahier jointe', image: null, manquante: true, saisieLe: null, source: 'jeu' },
    ...p.appels.map(pieceAppel),
  ]
  const lignes = [
    ctl('delai', 'Constat dans le délai', dansDelai ? 'ok' : 'ko', dansDelai ? `Constaté dans les ${REGLES_S1.kitConstatH} h après le préavis` : 'Constat hors délai : aucune retenue possible', ['kit']),
    ctl('liste', 'Éléments manquants listés et photographiés', d.kit.manquants.length ? 'ok' : 'ko', d.kit.manquants.join(', ') || 'Aucune liste', ['kit']),
    ctl('valeur', 'Retenue sous la valeur du kit', d.kit.retenue <= valeur ? 'ok' : 'ko', `${fr(d.kit.retenue)} retenus · valeur du kit ${fr(valeur)}`),
    ctl('restitution', 'Preuve de restitution du livreur', 'doute', 'Le livreur invoque le cahier de l’agence, sans photo : à vérifier par appel', ['cont', 'cahier']),
  ]
  const controles = avecCorrections(lignes, p)
  const restit = controles.find((x) => x.id === 'restitution')!.etat
  const decide = !!c.decision
  const disculpe = !dansDelai || restit === 'ok'
  const issues = [
    bloquer(issue('kit.maintenir', 'Maintenir la retenue', `${fr(d.kit.retenue)} retenus sur le dernier versement de ${d.livreur}.`, { payeur: 'livreur', montant: d.kit.retenue, regle: 'DEPART-KIT-CONSTAT-H · KIT-VALEUR-F' }), disculpe ? `Les preuves disculpent ${NOM_PARTIE.livreur} : ${!dansDelai ? 'constat hors délai' : 'restitution prouvée'}.` : null),
    issue('kit.annuler', 'Annuler la retenue', `Le montant mis de côté (${fr(d.versement.kitDeCote || d.kit.retenue)}) part au vendredi suivant.`, { payeur: 'entreprise', montant: d.versement.kitDeCote || d.kit.retenue, regle: 'ADM-CACHEE-03' }),
  ]
  return {
    ...commun('kit', d.id, d.livreur, `Kit de ${d.livreur} · ${d.entreprise}`, `${d.livreur} conteste la retenue de ${fr(d.kit.retenue)} sur son kit.`, 'Retenue de kit contestée', d.zones[0] ?? null),
    montant: d.kit.retenue,
    paye: d.kit.retenue,
    echeance: c.le + REGLES_S1.mediateurJ * JOUR,
    parties: [{ partie: 'livreur', nom: d.livreur, position: c.motif }, { partie: 'entreprise', nom: d.entreprise, position: `Constat : ${d.kit.manquants.join(', ')}` }],
    pieces,
    controles,
    lecture: decide ? null : restit === 'ko' ? { issue: 'kit.maintenir', payeur: 'livreur', raison: 'Constat dans le délai, aucune preuve de restitution.', regle: 'ADM-CACHEE-03' } : restit === 'ok' ? { issue: 'kit.annuler', payeur: 'entreprise', raison: 'Restitution prouvée par l’agence.', regle: 'ADM-CACHEE-02' } : { issue: null, payeur: null, raison: 'Restitution invoquée sans preuve : appelez l’agence, puis corrigez la ligne.', regle: 'ADM-CACHEE-02 · ADM-CACHEE-03' },
    issues,
    motifs: ['Constat conforme', 'Restitution prouvée', 'Accord trouvé au téléphone'],
    messages: { 'kit.maintenir': [{ partie: 'livreur', texte: `La retenue de ${fr(d.kit.retenue)} sur votre kit est maintenue.` }, { partie: 'entreprise', texte: `La retenue sur le kit de ${d.livreur} est maintenue.` }], 'kit.annuler': [{ partie: 'livreur', texte: 'La retenue sur votre kit est annulée : le montant part au prochain vendredi.' }, { partie: 'entreprise', texte: `La retenue sur le kit de ${d.livreur} est annulée.` }] },
    decide,
    decision: decide ? { issue: c.decision === 'retenue_maintenue' ? 'kit.maintenir' : 'kit.annuler', libelle: c.decision === 'retenue_maintenue' ? 'Retenue maintenue' : 'Retenue annulée', montant: d.kit.retenue, payeur: null, motif: '—', note: '', message: '', par: c.par ?? '—', le: c.decideLe ?? maintenant(), etat: 'appliquee', quatreYeux: null, suggestion: null, ecart: false, lot: null, suites: [] } : null,
    route: { route: 'livreurs', params: { onglet: 'departs', depart: d.id } },
    tranche: (a) => a.role === 'superviseur' || a.role === 'mediation',
    poste: p,
    comparer: [],
    aOuvrir: [],
  }
}

// ── 6. Constats des relais (jeu d'essai et pont) ────────────────────────────────────────────────────────────────────
interface ConstatJeu {
  id: string
  relais: string
  zone: string
  colis: string
  genre: 'reserve' | 'absent'
  recuLe: Instant
  entreprise: string
  valeur: Francs
  photoLot: boolean
  accepte: boolean // le livreur a accepté le constat en miroir (PR-RC-08)
  note: string
  source: 'jeu' | 'pont'
}
const CONSTATS: ConstatJeu[] = [
  { id: 'CR-0007', relais: 'Relais Mokolo Marché', zone: 'Z3', colis: 'BLV-52230-1', genre: 'reserve', recuLe: T(-3 * 60 - 40), entreprise: 'Yafé Express', valeur: 28900, photoLot: true, accepte: true, note: 'Pochette M froissée et mouillée, scellé intact', source: 'jeu' },
  { id: 'CR-0008', relais: 'Relais Bastos Carrefour', zone: 'Z1', colis: 'BLV-00009-1', genre: 'absent', recuLe: T(-26 * 60), entreprise: 'Yafé Express', valeur: 14900, photoLot: true, accepte: false, note: 'Colis annoncé dans le lot PQ-Z1-261013-001, absent au déballage', source: 'jeu' },
]
function constatsDuPont(): ConstatJeu[] {
  const ev = evenementsPour('admin')
  const out: ConstatJeu[] = []
  for (const e of ev) {
    if (e.type !== 'relay.drop.item_result' || !['reserve', 'refuse', 'absent'].includes(e.resultat)) continue
    const accepte = ev.some((x) => x.type === 'relay.drop.report_accepted' && x.colis === e.colis)
    out.push({ id: `CR-P-${e.colis}`, relais: 'Relais Bastos Carrefour', zone: 'Z1', colis: e.colis, genre: e.resultat === 'absent' ? 'absent' : 'reserve', recuLe: e.le, entreprise: 'Yafé Express', valeur: 0, photoLot: e.photos > 0, accepte, note: e.motif ?? e.resultat, source: 'pont' })
  }
  return out
}
function brutConstat(c: ConstatJeu): Brut {
  const p = posteDe('constat', c.id)
  const dec = decisionsDemo.lire().decisions[cle('constat', c.id)] ?? null
  const pieces: PieceDossier[] = [
    { id: 'lot', nature: 'photo', etape: 'Dépôt au relais', partie: 'relais', titre: 'Photo du lot à la réception', par: c.relais, le: c.recuLe, lieu: c.relais, distanceM: null, colis: c.colis, note: c.photoLot ? 'Tous les colis visibles' : 'Aucune photo du lot', image: c.photoLot ? { motif: c.genre === 'absent' ? 'contenu_incomplet' : 'colis_mouille', teinte: c.genre === 'absent' ? 'sable' : 'bleu' } : null, manquante: !c.photoLot, saisieLe: null, source: c.source },
    { id: 'constat', nature: 'constat', etape: 'Dépôt au relais', partie: 'relais', titre: c.genre === 'absent' ? 'Colis absent du lot' : 'Reçu avec réserve', par: c.relais, le: c.recuLe, lieu: c.relais, distanceM: null, colis: c.colis, note: c.note, image: null, manquante: false, saisieLe: null, source: c.source },
    { id: 'miroir', nature: 'systeme', etape: 'Dépôt au relais', partie: 'livreur', titre: c.accepte ? 'Constat accepté par le livreur' : 'Constat non accepté par le livreur', par: c.entreprise, le: c.recuLe + 60_000, lieu: c.relais, distanceM: null, colis: c.colis, note: c.accepte ? 'Accepté en miroir sur son téléphone (PR-RC-08)' : 'Le livreur n’a pas confirmé', image: null, manquante: false, saisieLe: null, source: c.source },
    ...p.appels.map(pieceAppel),
  ]
  const lignes = [
    ctl('photo_lot', 'Photo du lot à la réception', c.photoLot ? 'ok' : 'ko', c.photoLot ? 'Photo prise avant l’ouverture du lot' : 'Aucune photo du lot (PR-LOT-PHOTOS-MIN)', ['lot']),
    ctl('miroir', 'Constat accepté par le livreur', c.accepte ? 'ok' : 'doute', c.accepte ? 'Le livreur a confirmé le constat' : 'Sans confirmation du livreur', ['miroir']),
    ctl('scan', 'Colis annoncé dans le lot', 'ok', `Le colis ${c.colis} figure dans le lot annoncé`),
  ]
  const controles = avecCorrections(lignes, p)
  const disculpe = controles.find((x) => x.id === 'photo_lot')!.etat === 'ok' && controles.find((x) => x.id === 'miroir')!.etat === 'ok'
  const issues = [
    issue('imputer_entreprise', 'Imputer à l’entreprise de livraison', `${c.valeur ? fr(c.valeur) : 'La valeur du colis'} retenus sur son versement, dans la limite de son plafond (R60).`, { payeur: 'entreprise', montant: c.valeur, regle: 'R60' }),
    bloquer(issue('imputer_relais', 'Imputer au relais', 'Le relais répond du colis pendant sa garde.', { payeur: 'relais', montant: c.valeur, regle: 'R38' }), disculpe ? 'Les preuves disculpent le relais : photo du lot à la réception et constat accepté par le livreur.' : null),
    issue('classer', 'Classer sans suite', 'Colis retrouvé ou réserve sans dommage : aucun effet.'),
  ]
  const decide = !!dec
  return {
    ...commun('constat', c.id, c.colis, `${c.relais} · ${c.genre === 'absent' ? 'colis absent du lot' : 'reçu avec réserve'}`, `Constat du relais sur le colis ${c.colis} : qui en répond ?`, c.genre === 'absent' ? 'Constat · colis absent' : 'Constat · réserve', c.zone),
    montant: c.valeur,
    paye: c.valeur,
    echeance: c.recuLe + P().constatH * HEURE,
    parties: [{ partie: 'relais', nom: c.relais, position: c.note }, { partie: 'entreprise', nom: c.entreprise, position: c.accepte ? 'Constat accepté' : 'Pas encore confirmé' }],
    pieces,
    controles,
    lecture: decide ? null : disculpe ? { issue: 'imputer_entreprise', payeur: 'entreprise', raison: 'Réserve photographiée à la réception et acceptée par le livreur : le dommage précède le relais.', regle: 'R60 · PR-RC-08' } : { issue: null, payeur: null, raison: 'Constat sans confirmation du livreur : appelez l’entreprise.', regle: 'PR-RC-08' },
    issues,
    motifs: ['Constat photographié et accepté', 'Colis retrouvé', 'Accord trouvé au téléphone'],
    messages: Object.fromEntries(issues.map((i) => [i.id, [{ partie: 'relais', texte: `Votre constat ${c.id} est traité : ${i.libelle.toLowerCase()}.` }, ...(i.payeur === 'entreprise' ? [{ partie: 'entreprise' as Partie, texte: `Constat ${c.id} : ${i.effet}` }] : [])]])),
    decide,
    decision: dec,
    route: { route: 'relais', params: {} },
    tranche: (a) => a.role === 'superviseur' || a.role === 'operations',
    poste: p,
    comparer: [],
    aOuvrir: [],
  }
}

// ── 7. Signalements (jeu d'essai et pont report.filed) ──────────────────────────────────────────────────────────────
interface SignalementJeu {
  id: string
  espace: Partie
  par: string
  objet: string
  vise: string
  vu: Partie
  motif: string
  grave: boolean
  recuLe: Instant
  photo: boolean
  anterieurs: number
  zone: string
}
const SIGNALEMENTS: SignalementJeu[] = [
  { id: 'SG-0011', espace: 'livreur', par: 'Inès K. · Yafé Express', objet: 'BLV-52245', vise: 'Client ••• 6120', vu: 'client', motif: 'Le client demande à payer en espèces à la porte (R01).', grave: true, recuLe: T(-140), photo: false, anterieurs: 1, zone: 'Z6' },
  { id: 'SG-0012', espace: 'vendeur', par: 'Beauté Melen', objet: 'PQ-Z6-261012-005', vise: 'Armel B. · Mboa Logistique', vu: 'livreur', motif: 'Le livreur a refusé de photographier le colis au ramassage.', grave: false, recuLe: T(-300), photo: true, anterieurs: 0, zone: 'Z6' },
]
function signalementsDuPont(): SignalementJeu[] {
  return evenementsPour('admin')
    .filter((e): e is Extract<typeof e, { type: 'report.filed' }> => e.type === 'report.filed')
    .filter((e) => !/^(OF|FM)-/.test(e.objet))
    .map((e) => ({ id: `SG-P-${e.cle}`, espace: e.espace === 'client' ? 'client' : (e.espace as Partie), par: `Espace ${e.espace}`, objet: e.objet, vise: e.objet, vu: 'vendeur', motif: e.motif, grave: e.gravite === 'grave', recuLe: e.le, photo: false, anterieurs: 0, zone: 'Z1' }))
}
function brutSignalement(g: SignalementJeu): Brut {
  const p = posteDe('signalement', g.id)
  const dec = decisionsDemo.lire().decisions[cle('signalement', g.id)] ?? null
  const pieces: PieceDossier[] = [
    { id: 'sig', nature: 'message', etape: 'Signalement', partie: g.espace, titre: g.grave ? 'Signalement grave' : 'Signalement', par: g.par, le: g.recuLe, lieu: null, distanceM: null, colis: null, note: `« ${g.motif} » · ${g.objet}`, image: null, manquante: false, saisieLe: null, source: 'jeu' },
    { id: 'pj', nature: 'photo', etape: 'Signalement', partie: g.espace, titre: 'Pièce jointe', par: g.par, le: g.recuLe, lieu: null, distanceM: null, colis: null, note: g.photo ? 'Photo jointe au signalement' : 'Aucune pièce jointe', image: g.photo ? { motif: 'colis', teinte: 'gris' } : null, manquante: !g.photo, saisieLe: null, source: 'jeu' },
    ...p.appels.map(pieceAppel),
  ]
  const lignes = [
    ctl('piece', 'Pièce jointe au signalement', g.photo ? 'ok' : 'doute', g.photo ? 'Photo jointe' : 'Aucune pièce : la parole du signaleur seule', ['pj']),
    ctl('vise', 'Acteur visé identifié', 'ok', `${g.vise} · ${g.objet}`),
    ctl('anterieurs', 'Signalements antérieurs sur cet acteur', g.anterieurs ? 'ko' : 'ok', g.anterieurs ? `${g.anterieurs} signalement(s) en 90 jours` : 'Aucun en 90 jours'),
  ]
  const controles = avecCorrections(lignes, p)
  const recidive = controles.find((x) => x.id === 'anterieurs')!.etat === 'ko'
  const prouve = controles.find((x) => x.id === 'piece')!.etat === 'ok'
  const issues = [
    issue('avertir', 'Avertir l’acteur visé', 'Message d’avertissement motivé, gardé au dossier ; aucune restriction.'),
    bloquer(issue('proposer_sanction', 'Ouvrir un dossier de sanction', 'Le dossier part à la Médiation (barème) ; rien ne s’applique avant sa décision.'), !prouve && !recidive ? 'Sans pièce ni antécédent, une sanction ne s’ouvre pas sur la seule parole du signaleur.' : null),
    issue('classer', 'Classer sans suite', 'Le signaleur est remercié ; aucun effet.'),
  ]
  const decide = !!dec
  return {
    ...commun('signalement', g.id, g.objet, `${g.vise} · ${g.motif}`, `Signalement de ${g.par} : quelle suite donner ?`, g.grave ? 'Signalement grave' : 'Signalement', g.zone),
    montant: 0,
    paye: 0,
    echeance: g.recuLe + REGLES_S1.supportH * HEURE,
    parties: [{ partie: g.espace, nom: g.par, position: g.motif }, { partie: g.vu, nom: g.vise, position: null }],
    pieces,
    controles,
    lecture: decide ? null : recidive ? { issue: 'proposer_sanction', payeur: null, raison: 'Récidive en 90 jours : le barème s’applique.', regle: 'ADM-06 · barème' } : prouve ? { issue: 'avertir', payeur: null, raison: 'Premier signalement, pièce jointe : un avertissement suffit.', regle: 'ADM-06 · barème' } : { issue: 'avertir', payeur: null, raison: 'Premier signalement, sans pièce : avertir, sans sanction.', regle: 'ADM-06 · barème' },
    issues,
    motifs: ['Premier signalement', 'Récidive', 'Signalement non fondé', 'Accord trouvé au téléphone'],
    messages: Object.fromEntries(issues.map((i) => [i.id, [{ partie: g.espace, texte: `Merci pour votre signalement ${g.id} : ${i.libelle.toLowerCase()}.` }, ...(i.id !== 'classer' ? [{ partie: g.vu, texte: `BelivaY a reçu un signalement à votre sujet (${g.objet}) : ${i.effet}` }] : [])]])),
    decide,
    decision: dec,
    route: { route: 'fraude', params: {} },
    tranche: (a) => ['superviseur', 'support', 'mediation'].includes(a.role),
    poste: p,
    comparer: [],
    aOuvrir: [],
  }
}

// ── Lecture de tous les genres, selon le rôle ───────────────────────────────────────────────────────────────────────
const VOIT: Record<Exclude<GenreDossier, 'litige'>, Role[]> = {
  kyc: ['superviseur', 'verification', 'audit'],
  remboursement: ['superviseur', 'finance', 'audit'],
  sanction: ['superviseur', 'mediation', 'audit'],
  constat: ['superviseur', 'operations', 'audit'],
  kit: ['superviseur', 'mediation', 'audit'],
  signalement: ['superviseur', 'support', 'mediation', 'audit'],
}
export const GENRES: GenreDossier[] = ['litige', 'kyc', 'remboursement', 'sanction', 'constat', 'kit', 'signalement']

async function lister(genre: GenreDossier): Promise<Brut[]> {
  const r = roleCourant()
  if (genre === 'litige') return litigesInternes().filter((x) => litigeVisible(x, r)).map(brutLitige)
  if (!VOIT[genre].includes(r)) return []
  try {
    if (genre === 'kyc') return (await demoActeurs.kyc()).filter((k) => k.etat === 'a_revoir' || !!posteDe('kyc', k.id).decision).map(brutKyc)
    if (genre === 'remboursement') return (await demoArgent.remboursements()).liste.filter((x) => ['decide', 'echoue', 'attente'].includes(x.etat) || !!posteDe('remboursement', x.id).decision).map(brutRemb)
    if (genre === 'sanction') return (await demoActeurs.sanctions()).filter((s) => s.etat === 'proposee' || s.etat === 'recours' || !!posteDe('sanction', s.id).decision).map(brutSanction)
    if (genre === 'kit') return (await demoLogistique.departs()).filter((d) => d.contestation).map(brutKit)
    if (genre === 'constat') return [...CONSTATS, ...constatsDuPont()].map(brutConstat).filter((b) => b.zonePerimetre)
    return [...SIGNALEMENTS, ...signalementsDuPont()].map(brutSignalement)
  } catch (e) {
    if (e instanceof AccesRefuse) return []
    throw e
  }
}

function exigerGenre(genre: GenreDossier) {
  if (genre === 'litige') exigerPage('litige', 'Litiges')
  else exigerPage('postes', 'Postes de décision')
}

/** Contexte du contrôle d'une demande (calculs/decisions.ts : verifierDemande). */
function contexte(b: Brut, a: AgentPoste): ContexteDemande {
  return { decide: b.decide, enAttente: !!b.attente, pasAvant: b.pasAvant, maintenant: maintenant(), auteur: b.auteur, lies: b.lies, transmisPar: b.transmission?.parId ?? null, agent: { id: a.id, plafond: a.plafond, geste: a.geste, tranche: b.tranche(a) }, issues: b.issues, ambigu: b.ambigu, paye: b.paye, motifs: b.motifs }
}

/** Raison pour laquelle l'agent ne décide pas ce dossier (lecture seule), ou null. */
function raisonLecture(b: Brut, a: AgentPoste): string | null {
  if (b.decide) return 'Dossier décidé : seul un recours, dans son délai, le rouvre.'
  if (b.attente) return 'Décision envoyée au second validateur : rien ne s’applique avant.'
  if (b.pasAvant !== null && maintenant() < b.pasAvant) return 'Le vendeur peut encore répondre : aucune décision avant la fin de son délai.'
  if (b.auteur === a.id) return 'Vous avez ouvert ce dossier : un autre compte le tranche.'
  if (b.transmission?.parId === a.id) return 'Vous avez transmis ce dossier : un autre compte le tranche.'
  if (b.lies.includes(a.id)) return 'Vous êtes lié à une partie de ce dossier : un autre compte le tranche.'
  if (!b.tranche(a)) return a.role === 'audit' ? 'Audit : lecture seule.' : 'Votre rôle ou votre niveau ne tranche pas ce dossier.'
  return null
}

function courtDe(b: Brut): DossierCourt {
  const sug = b.lecture?.issue ? (b.issues.find((i) => i.id === b.lecture!.issue)?.libelle ?? null) : null
  const niveauRequis = (b as Brut & { niveauRequis?: string }).niveauRequis ?? (b.montant ? niveauPour(b.montant).libelle : 'Agent')
  return {
    genre: b.genre,
    id: b.id,
    ref: b.ref,
    titre: b.titre,
    type: b.type,
    typeLibelle: b.typeLibelle,
    montant: b.montant,
    echeance: b.echeance,
    niveauRequis,
    etat: b.decide ? 'decide' : b.attente ? 'attente' : b.pasAvant !== null && maintenant() < b.pasAvant ? 'trop_tot' : b.transmission ? 'transmis' : 'a_decider',
    doutes: b.controles.filter((c) => c.etat === 'doute').length,
    suggestion: sug,
    lot: b.decide ? null : b.lot,
    zone: b.zone,
  }
}

function dossierDe(b: Brut, a: AgentPoste): DossierPoste {
  const raison = raisonLecture(b, a)
  const prol = prolongation(!!b.poste.prolongeJusqua, b.decide)
  return {
    ...courtDe(b),
    aDecider: b.aDecider,
    parties: b.parties,
    paye: b.paye,
    pieces: b.pieces,
    // Ce qui reste douteux s'affiche en tête.
    controles: [...b.controles].sort((x, y) => (x.etat === 'doute' ? 0 : 1) - (y.etat === 'doute' ? 0 : 1)),
    lecture: b.lecture,
    issues: raison ? b.issues.map((i) => (i.etat === 'bloquee' ? i : { ...i, etat: b.decide || b.attente || (b.pasAvant !== null && maintenant() < b.pasAvant) ? ('bloquee' as const) : ('transmettre' as const), raison: null })) : issuesPourAgent(b.issues, { id: a.id, plafond: a.plafond, geste: a.geste, tranche: b.tranche(a) }, b.ambigu),
    prolongation: { heures: prol.heures, faite: !!b.poste.prolongeJusqua, possible: prol.possible && !raison && b.echeance !== null, raison: prol.raison ?? (b.echeance === null ? 'Sans échéance.' : raison) },
    droits: { niveau: a.niveau, plafond: a.plafond, geste: a.geste, decider: !raison, raison },
    appels: b.poste.appels,
    motifs: b.motifs,
    messages: b.messages,
    modeles: b.modeles,
    decision: b.decision,
    transmission: b.transmission,
    attente: b.attente,
    route: b.route,
    ouvertPar: b.auteur,
    comparer: b.comparer,
    ambigu: b.ambigu,
    aOuvrir: b.aOuvrir,
  }
}

async function trouver(genre: GenreDossier, id: string): Promise<Brut | null> {
  return (await lister(genre)).find((b) => b.id === id) ?? null
}

// ── Écrire : contrôles, appels, transmission, prolongation, décision ────────────────────────────────────────────────
function ecrireEtatPoste(b: Brut, f: (p: EtatPoste) => void) {
  if (b.genre === 'litige') ecrirePoste(b.id, (d) => f(d.poste))
  else ecrirePosteLocal(b.genre, b.id, f)
}
const instantane = (b: Brut): LigneEcart['instantane'] => ({ controles: b.controles.map((c) => ({ libelle: c.libelle, etat: c.etat, corrige: !!c.corrige })), pieces: b.pieces.length, appels: b.poste.appels.length })

/** Niveau vers lequel un dossier est transmis. */
function versQui(b: Brut, a: AgentPoste): string {
  if (b.genre === 'litige') {
    const x = litigeInterne(b.id)
    if (x.d.niveau === 2) return 'Direction'
    if (b.ambigu || a.niveau !== 'agent') return 'Médiation (niveau 2)'
    return 'Senior'
  }
  return a.niveau === 'agent' ? 'Senior' : a.niveau === 'senior' ? 'Responsable d’équipe' : 'Direction'
}

/** Applique une décision validée (tout de suite, ou à la contresignature). */
async function appliquer(b: Brut, d: DemandePoste, i: IssuePoste, montant: Francs | null, par: { nom: string; id: string }, qy: string | null, lot: string | null): Promise<{ suites: string[] }> {
  const le = maintenant()
  const note = d.note.trim()
  const suites: string[] = []
  if (b.genre === 'litige') {
    suites.push(`Client et vendeur prévenus (${i.libelle.toLowerCase()}), motif joint`)
    if (montant) suites.push(i.id === 'geste' ? `Client : bon de réduction de ${fr(montant)} (Wallet fermé : R03)` : `Client : ${fr(montant)} vers le moyen d’origine${i.id.startsWith('rembourser') ? ', après retour et inspection' : ''}`)
    if (i.payeur === 'entreprise') suites.push('Entreprise : retenue sur son prochain versement, dans la limite de son plafond')
    if (i.payeur === 'vendeur') suites.push('Vendeur : litige perdu, compté au Trust Score ; repris sur ses versements (R25)')
    suites.push(`Recours possible une fois, sous ${REGLES_S1.recoursH} h`)
  } else if (b.genre === 'kyc') {
    const k = (await demoActeurs.kyc()).find((x) => x.id === b.id)!
    const douteuses = k.pieces.filter((x) => x.etat === 'a_revoir' && x.doute).map((x) => x.id)
    const r = await demoActeurs.deciderKyc(b.id, i.id === 'approuver' ? { action: 'approuver' } : i.id === 'complement' ? { action: 'complement', pieces: douteuses.length ? douteuses : [k.pieces[0].id], motif: note } : { action: 'rejeter', piece: douteuses[0] ?? k.pieces[0].id, raison: 'non_conforme', motif: note })
    if (!r.ok) throw new RefusDelegue(r.raison)
    suites.push(`${k.acteur} et son organisation prévenus`)
  } else if (b.genre === 'remboursement') {
    if (i.id === 'executer') {
      const r = await demoArgent.executer(b.id)
      if (!r.ok) throw new RefusDelegue(r.raison)
      suites.push(`Client : ${fr(montant ?? 0)} vers le moyen d’origine`)
    } else suites.push('Remboursement en attente de l’inspection du colis')
  } else if (b.genre === 'sanction') {
    const r = await demoActeurs.deciderSanction(b.id, { action: i.id as 'valider', motif: note })
    if (!r.ok) throw new RefusDelegue(r.raison)
    suites.push(r.quatreYeux ? `Exclusion à quatre yeux (${r.quatreYeux}) : rien ne s’applique avant` : 'Acteur prévenu, recours possible une fois')
  } else if (b.genre === 'kit') {
    await journaliser({ action: i.id, objet: b.id, motif: note })
    suites.push('Livreur et entreprise prévenus')
  } else if (b.genre === 'signalement' && i.id === 'proposer_sanction') {
    const g = [...SIGNALEMENTS, ...signalementsDuPont()].find((x) => x.id === b.id)!
    const r = await demoActeurs.proposerSanction({ acteurId: g.objet, acteur: g.vise, espace: g.vu === 'belivay' || g.vu === 'livreur' ? 'livreur' : g.vu === 'client' ? 'client' : g.vu === 'relais' ? 'relais' : g.vu === 'entreprise' ? 'entreprise' : 'vendeur', zone: g.zone, niveau: 1, motif: note, origine: `Signalement ${g.id}` })
    suites.push(r.ok ? `Dossier de sanction ${r.id} ouvert` : 'Dossier de sanction à ouvrir')
  } else suites.push(`${i.libelle} : parties prévenues`)
  const dec: DecisionPoste = { issue: i.id, libelle: i.libelle, montant, payeur: i.payeur, motif: d.motif, note, message: d.message.trim(), par: par.nom, le, etat: qy ? 'contresignee' : 'appliquee', quatreYeux: qy, suggestion: b.lecture?.issue ?? null, ecart: !!b.lecture?.issue && b.lecture.issue !== i.id, lot, suites }
  if (b.genre === 'litige') appliquerPoste(b.id, dec, i.payeur === 'entreprise')
  else
    decisionsDemo.ecrire((e) => {
      e.decisions[cle(b.genre, b.id)] = dec
      e.postes[cle(b.genre, b.id)] ??= postNeuf()
      e.postes[cle(b.genre, b.id)].decision = dec
    })
  decisionsDemo.ecrire((e) => void e.journal.push({ genre: b.genre, id: b.id, ref: b.ref, suggestion: b.lecture?.issue ? (b.issues.find((x) => x.id === b.lecture!.issue)?.libelle ?? b.lecture.issue) : null, decision: i.libelle, motif: d.motif, note, par: par.nom, le, montant, instantane: instantane(b), ecart: dec.ecart, lot }))
  await journaliser({ action: `poste.${b.genre}.${i.id}`, objet: `${b.id} · ${b.ref}`, motif: `${d.motif} · ${note}`, zone: b.zone, avant: b.lecture?.issue ? `Suggestion : ${b.issues.find((x) => x.id === b.lecture!.issue)?.libelle ?? b.lecture.issue}` : 'Sans suggestion', apres: `${i.libelle}${montant ? ` · ${fr(montant)}` : ''}${dec.ecart ? ' · écart' : ''}` })
  return { suites }
}
class RefusDelegue extends Error {}

// À la contresignature d'une décision du poste (au-delà du seuil), elle s'applique ; au refus, le dossier revient.
effetQuatreYeux('poste.', async (objet, q: DecisionQuatreYeux) => {
  const att = decisionsDemo.lire().attentes[q.id]
  if (!att) return
  decisionsDemo.ecrire((e) => void delete e.attentes[q.id])
  if (q.etat === 'contresignee') {
    const b = await trouverSansDroit(att.genre, att.id)
    const i = b?.issues.find((x) => x.id === att.demande.issue)
    if (b && i) await appliquer({ ...b, attente: null }, att.demande, i, att.montant, { nom: `${att.par} · ${q.second?.agent ?? ''}`, id: att.parId }, q.id, null)
  } else if (att.genre === 'litige') {
    const { litigesDemo } = await import('./litiges')
    litigesDemo.ecrire((e) => void (e.dossiers[objet].attente = null))
  }
})
/** Le dossier tel que le serveur le relit à la contresignature (sans filtre de rôle : le second validateur est Finance). */
async function trouverSansDroit(genre: GenreDossier, id: string): Promise<Brut | null> {
  if (genre === 'litige') return brutLitige(litigeInterne(id))
  return trouver(genre, id)
}

const ok = <T extends object>(v: T) => ({ ok: true as const, ...v })
const non = <R extends RefusPoste>(raison: R, detail?: string) => ({ ok: false as const, raison, ...(detail ? { detail } : {}) })

export const demoDecisions: DomaineDecisions = {
  async file(genre) {
    const r = roleCourant()
    const genres = genre ? [genre] : GENRES.filter((g) => (g === 'litige' ? true : VOIT[g].includes(r)))
    const l: DossierCourt[] = []
    for (const g of genres) {
      if (g === 'litige') {
        try {
          exigerPage('litige', 'Litiges')
        } catch (e) {
          if (genre) throw e
          continue
        }
      } else if (genre) exigerPage('postes', 'Postes de décision')
      l.push(...(await lister(g)).map(courtDe))
    }
    // File triée par échéance : les dossiers à décider d'abord, les décidés à la fin.
    const rang = (d: DossierCourt) => (d.etat === 'decide' ? 2 : d.etat === 'trop_tot' || d.etat === 'attente' ? 1 : 0)
    return repondre(l.sort((a, b) => rang(a) - rang(b) || (a.echeance ?? Infinity) - (b.echeance ?? Infinity)))
  },
  async dossier(genre, id) {
    exigerGenre(genre)
    const b = await trouver(genre, id)
    return repondre(b ? dossierDe(b, agentPoste()) : null)
  },
  async controler(genre, id, controle, etat) {
    exigerGenre(genre)
    const b = await trouver(genre, id)
    if (!b) return non('lecture_seule')
    const a = agentPoste()
    if (b.decide) return non('deja_decide')
    if (raisonLecture(b, a)) return non('lecture_seule')
    const c = b.controles.find((x) => x.id === controle)
    if (!c) return non('lecture_seule')
    ecrireEtatPoste(b, (p) => {
      if (etat === c.calcule) {
        delete p.corrections[controle]
        if (!p.confirmes.includes(controle)) p.confirmes.push(controle)
      } else p.corrections[controle] = { etat, par: a.nom, le: maintenant(), de: c.calcule }
    })
    await journaliser({ action: etat === c.calcule ? 'poste.controle.confirmer' : 'poste.controle.corriger', objet: `${id} · ${c.libelle}`, zone: b.zone, avant: c.calcule, apres: etat })
    return { ok: true }
  },
  async noterAppel(genre, id, x) {
    exigerGenre(genre)
    const b = await trouver(genre, id)
    if (!b) return non('lecture_seule')
    const a = agentPoste()
    if (b.decide) return non('deja_decide')
    if (!b.tranche(a) && a.role !== 'superviseur') return non('lecture_seule')
    if (x.resume.trim().length < 10) return non('note_courte', 'Résumé de 10 caractères au moins.')
    // Un accord au téléphone ne porte que sur une issue permise par la règle.
    if (x.resultat === 'accord' && (!x.accord || b.issues.find((i) => i.id === x.accord)?.etat !== 'permise')) return non('accord_hors_issues', 'Un accord ne porte que sur une issue permise par la règle.')
    const appel: AppelPoste = { id: `AP-${String(b.poste.appels.length + 1).padStart(2, '0')}`, avec: x.avec, nom: x.nom, resultat: x.resultat, resume: x.resume.trim(), accord: x.resultat === 'accord' ? x.accord : null, par: a.nom, le: maintenant() }
    ecrireEtatPoste(b, (p) => void p.appels.push(appel))
    await journaliser({ action: 'poste.appel', objet: `${id} · ${NOM_PARTIE[x.avec]}`, motif: appel.resume, zone: b.zone, apres: x.resultat + (appel.accord ? ` · ${appel.accord}` : '') })
    return ok({ id: appel.id })
  },
  async transmettre(genre, id, raison, issueProposee) {
    exigerGenre(genre)
    const b = await trouver(genre, id)
    if (!b) return non('lecture_seule')
    const a = agentPoste()
    if (b.decide) return non('deja_decide')
    if (b.attente) return non('en_attente')
    if (b.transmission?.parId === a.id) return non('auteur', 'Vous avez déjà transmis ce dossier.')
    if (a.role === 'audit') return non('lecture_seule')
    if (!motifValable(raison)) return non('note_courte', `La raison compte au moins ${PARAMETRES.console.motifMin} caractères.`)
    if (issueProposee && b.issues.find((i) => i.id === issueProposee)?.etat === 'bloquee') return non('hors_regle', 'Une issue bloquée ne se propose pas.')
    const vers = versQui(b, a)
    const t: TransmissionPoste = { vers, par: a.nom, parId: a.id, le: maintenant(), raison: raison.trim(), issueProposee, quatreYeux: null }
    ecrireEtatPoste(b, (p) => void (p.transmission = t))
    if (b.genre === 'litige' && vers.startsWith('Médiation')) {
      const { litigesDemo } = await import('./litiges')
      litigesDemo.ecrire((e) => void (e.dossiers[id].niveau = 2))
    }
    await journaliser({ action: 'poste.transmettre', objet: `${id} · ${b.ref}`, motif: raison.trim(), zone: b.zone, apres: vers + (issueProposee ? ` · propose : ${libelleIssue(issueProposee)}` : '') })
    return ok({ vers })
  },
  async prolonger(genre, id, note) {
    exigerGenre(genre)
    const b = await trouver(genre, id)
    if (!b) return non('lecture_seule')
    const a = agentPoste()
    if (b.decide) return non('deja_decide')
    if (raisonLecture(b, a)) return non('lecture_seule')
    if (b.poste.prolongeJusqua) return non('prolongation_unique', 'Une seule prolongation par dossier.')
    if (b.echeance === null) return non('lecture_seule', 'Sans échéance.')
    if (!motifValable(note)) return non('note_courte', `La note compte au moins ${PARAMETRES.console.motifMin} caractères.`)
    const echeance = b.echeance + P().prolongationH * HEURE
    ecrireEtatPoste(b, (p) => void (p.prolongeJusqua = echeance))
    await journaliser({ action: 'poste.prolonger', objet: `${id} · ${b.ref}`, motif: note.trim(), zone: b.zone, apres: `+${P().prolongationH} h` })
    return ok({ echeance })
  },
  async decider(genre, id, d) {
    exigerGenre(genre)
    const b = await trouver(genre, id)
    if (!b) return non('lecture_seule')
    const a = agentPoste()
    const v = verifierDemande(contexte(b, a), d)
    if (!v.ok) return non(v.raison, v.detail)
    const i = b.issues.find((x) => x.id === d.issue)!
    const montant = i.fourchette ? (d.montant ?? null) : i.montant
    if (d.appel) {
      const ap = b.poste.appels.find((x) => x.id === d.appel)
      if (!ap || ap.resultat !== 'accord' || ap.accord !== d.issue) return non('accord_hors_issues', 'La décision ne suit pas l’accord noté.')
    }
    // Au-delà du seuil des quatre yeux (REMB-CONTROLE-SEUIL) : un second validateur d'un autre compte (Finance, Direction).
    if (genre === 'litige' && (montant ?? 0) > PARAMETRES.console.seuilRemboursementQuatreYeux) {
      const q = await demanderSecond({ action: `poste.litige.${i.id}`, objet: id, resume: `${id} · ${i.libelle} : ${i.effet}`, motif: d.note.trim(), preuves: [{ id: 'dos', libelle: `Dossier ${id}`, route: 'litige', params: { id } }, { id: 'cmd', libelle: `Commande ${b.ref}`, route: 'commandes', params: { ref: b.ref } }], montant, quatreYeux: true, rolesSecond: ['finance', 'superviseur'] })
      const { litigesDemo } = await import('./litiges')
      litigesDemo.ecrire((e) => void (e.dossiers[id].attente = q))
      decisionsDemo.ecrire((e) => void (e.attentes[q] = { genre, id, demande: d, montant, payeur: i.payeur, libelle: i.libelle, suggestion: b.lecture?.issue ?? null, par: a.nom, parId: a.id, instantane: instantane(b), suites: [] }))
      await journaliser({ action: `poste.litige.${i.id}`, objet: `${id} · ${b.ref}`, motif: `${d.motif} · ${d.note.trim()}`, zone: b.zone, avant: b.lecture?.issue ?? null, apres: `${i.libelle} · à contresigner (${q})` })
      return ok({ etat: 'a_contresigner' as const, id: q })
    }
    try {
      await appliquer(b, d, i, montant, { nom: a.nom, id: a.id }, null, null)
    } catch (e) {
      if (e instanceof RefusDelegue) return non('hors_regle', e.message)
      throw e
    }
    return ok({ etat: 'appliquee' as const, id })
  },
  async deciderLot(genre, ids, d) {
    exigerGenre(genre)
    const a = agentPoste()
    const l = await lister(genre)
    const membres = ids.map((id) => l.find((b) => b.id === id)).filter((b): b is Brut => !!b)
    if (membres.length !== ids.length) return non('lot_heterogene', 'Un dossier du lot est introuvable.')
    const v = verifierLot(
      membres.map((b) => {
        const i = b.issues.find((x) => x.id === d.issue)
        return { id: b.id, lot: b.lot, doutes: b.controles.filter((c) => c.etat === 'doute').length, montant: i?.fourchette ? (d.montant ?? 0) : (i?.montant ?? 0), verdict: verifierDemande(contexte(b, a), d) }
      }),
      a.plafond,
    )
    if (!v.ok) return non(v.raison, v.detail)
    const lot = `LOT-${String(decisionsDemo.lire().nLot + 1).padStart(3, '0')}`
    decisionsDemo.ecrire((e) => void e.nLot++)
    for (const b of membres) {
      const i = b.issues.find((x) => x.id === d.issue)!
      await appliquer(b, d, i, i.fourchette ? (d.montant ?? null) : i.montant, { nom: a.nom, id: a.id }, null, lot)
    }
    return ok({ n: membres.length })
  },
  async ecarts() {
    exigerPage('journal', 'Journal d’audit')
    const r = roleCourant()
    if (r !== 'superviseur' && r !== 'audit') return repondre([])
    // Trois écarts de la semaine passée (jeu d'essai), puis ceux du poste.
    return repondre([...ECARTS_JEU, ...decisionsDemo.lire().journal.filter((x) => x.ecart)].sort((a, b) => b.le - a.le))
  },
}

const snap = (n: number, corrige = 0): LigneEcart['instantane'] => ({ controles: Array.from({ length: n }, (_, i) => ({ libelle: ['Photo au ramassage présente', 'Photo à la remise présente', 'Code de remise validé', 'Heures cohérentes', 'Photos du client jointes'][i % 5], etat: i === 0 && corrige ? 'ok' : i === 1 ? 'doute' : 'ok', corrige: i < corrige })), pieces: 6, appels: corrige })
const ECARTS_JEU: LigneEcart[] = [
  { genre: 'litige', id: 'LT-0388', ref: 'BLV-51702', suggestion: 'Débouter le client', decision: 'Geste commercial', motif: 'Accord trouvé au téléphone', note: 'Client de longue date, colis livré mais emballage déchiré : bon de 1 000 F convenu au téléphone, sans remboursement.', par: 'Clarisse Mvondo', le: T(-3 * 24 * 60), montant: 1000, instantane: snap(5, 1) },
  { genre: 'litige', id: 'LT-0391', ref: 'BLV-51766', suggestion: 'Rembourser · charge à l’entreprise', decision: 'Remboursement partiel', motif: 'Lecture des photos après appel', note: 'Un seul des deux articles abîmé selon la photo du relais ; remboursement partiel de la moitié, accepté par la cliente.', par: 'Thierry Mbida', le: T(-5 * 24 * 60), montant: 6400, instantane: snap(6, 2) },
  { genre: 'kyc', id: 'KYC-0082', ref: 'KYC-0082', suggestion: 'Demander une nouvelle pièce', decision: 'Approuver les pièces', motif: 'Contrôles concordants', note: 'Visage à 0,83 sous le seuil, mais preuve de vie nette et pièce de 2024 : approuvé après rappel du livreur.', par: 'Estelle Fotso', le: T(-6 * 24 * 60), montant: null, instantane: snap(4, 1) },
]
