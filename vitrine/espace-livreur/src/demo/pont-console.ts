// DONNÉES DE DÉMONSTRATION — les décisions de la console d'administration (« app: 'admin' », src/demo/pont.ts,
// EvenementAdminPont, DESTINATAIRES_ADMIN) vues par une des cinq applications, et ce que l'application publie vers la
// console (demande d'activation d'un compte, signalement). Ce fichier est LE MÊME dans les cinq applications (client,
// vendeur, entreprise, livreur, relais) ; chacune l'appelle depuis son applicateur du pont, une fois par clé, et y ajoute
// ses propres effets d'état (logique-metier/admin/CONNEXIONS.md). Ici :
// - avisConsole : la notification « BelivaY · … » d'une décision (titre, texte), ou null quand elle ne concerne pas
//   l'acteur de démonstration de l'application ; jamais le nom d'un prestataire (moyen de paiement dit en mots simples) ;
// - bandeauxConsole : ce qui reste affiché en tête des écrans tant que la décision vaut (panne non rétablie,
//   maintenance annoncée, suspension, versements retenus, pièce à renvoyer) ;
// - demanderActivation, signaler : « account.requested » et « report.filed » vers la console (charge anonyme).
import { maintenant } from './horloge'
import { ACTEURS_DEMO, APP, LIVREUR_DEMO, RELAIS_DEMO, evenementsPour, publier, type AppPont, type EspacePont, type Evenement } from './pont'

/** Les décisions de la console qui concernent cette application, dans l'ordre du journal. */
export const decisionsConsole = (app: AppPont = APP): Evenement[] => evenementsPour(app).filter((e) => e.app === 'admin')

/**
 * Noms sous lesquels la console peut désigner l'acteur de démonstration de chaque application : l'identifiant du pont
 * (ACTEURS_DEMO), celui du jeu d'essai de la console et le nom affiché (la console les écrit encore différemment,
 * logique-metier/REPRISES-FIN.md). Le client de démonstration est seul sur l'appareil : tout ce qui lui est adressé est à lui.
 */
export const MOI: Record<AppPont, string[]> = {
  client: [],
  vendeur: [ACTEURS_DEMO.vendeur.lieu, 'v-tontonpg', ACTEURS_DEMO.vendeur.boutique, ACTEURS_DEMO.vendeur.vitrine],
  entreprise: [ACTEURS_DEMO.entreprise.id, 'e-yafe', ACTEURS_DEMO.entreprise.nom],
  livreur: [LIVREUR_DEMO, ACTEURS_DEMO.livreur.compte, ACTEURS_DEMO.livreur.vu],
  relais: [RELAIS_DEMO.id, 'r-bastos', RELAIS_DEMO.nom, ACTEURS_DEMO.relais.court],
}
export const estMoi = (id: string | null | undefined, app: AppPont = APP): boolean => app === 'client' || (!!id && MOI[app].includes(id))

const F = (n: number): string => `${Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g, ' ')} F`
const jour = (t: number): string => new Date(t).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Douala' })
const heure = (t: number): string => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Douala' })
const quand = (t: number): string => `${jour(t)} à ${heure(t)}`
/** Moyen de remboursement dit en mots simples (jamais le nom d'un prestataire ni d'un opérateur). */
export function moyenVu(m: string): string {
  if (/wallet|portefeuille/i.test(m)) return 'ton Portefeuille BelivaY'
  if (/comptoir|esp[eè]ce/i.test(m)) return 'au comptoir du relais'
  if (/momo|mobile|orange|mtn/i.test(m)) return 'ton Mobile Money'
  if (/carte/i.test(m)) return 'ta carte'
  return 'ton moyen de paiement d’origine'
}
/** Décision d'un litige (options de la console, espace-admin/src/demo/litiges.ts) en mots du client et du vendeur. */
const LITIGE: Record<string, string> = {
  rembourser: 'remboursement du client',
  remplacer: 'remplacement de l’article',
  partager: 'remboursement partagé',
  debouter: 'demande du client non retenue',
  transporteur: 'transporteur en cause',
}
const PIECE: Record<string, string> = { cni: 'pièce d’identité', identite: 'pièce d’identité', selfie: 'photo (selfie)', permis: 'permis de conduire', recto: 'pièce d’identité (recto)', verso: 'pièce d’identité (verso)' }
const pieceVue = (n: string): string => PIECE[n] ?? n
const motifs = (l: { nature: string; motif: string | null }[]): string =>
  l
    .filter((p) => p.motif)
    .map((p) => `${pieceVue(p.nature)} : ${p.motif}`)
    .join(' · ')

export interface AvisConsole {
  titre: string
  texte: string
  /** À traiter ou grave (suspension, refus, panne, pièce à renvoyer). */
  grave: boolean
  /** Concerne l'argent (versement, remboursement, reprise, geste). */
  argent: boolean
  /** Commande concernée, quand la décision porte sur une commande. */
  commande: string | null
}
const avis = (titre: string, texte: string, o: Partial<Omit<AvisConsole, 'titre' | 'texte'>> = {}): AvisConsole => ({ titre: `BelivaY · ${titre}`, texte, grave: false, argent: false, commande: null, ...o })

/**
 * La notification d'une décision de la console pour l'application `app`, ou null (pas pour son acteur, ou sans effet
 * à annoncer). `montants: false` : le texte ne porte aucun montant (notifications du relais, NOT-03).
 */
export function avisConsole(e: Evenement, app: AppPont = APP, o: { montants?: boolean } = {}): AvisConsole | null {
  if (e.app !== 'admin') return null
  const tu = app === 'client'
  const m = (n: number | null | undefined, sinon = ''): string => (o.montants === false || n === null || n === undefined ? sinon : F(n))
  switch (e.type) {
    case 'kyc_decide':
      if (!estMoi(e.acteur, app) && !estMoi(e.dossier, app)) return null
      if (e.decision === 'approuve') return avis('Compte activé', 'Vos pièces sont vérifiées : votre compte est actif.')
      if (e.decision === 'complement') return avis('Pièce à renvoyer', `${motifs(e.pieces) || 'Une pièce est à reprendre.'} Renvoyez-la depuis l’application.`, { grave: true })
      return avis('Dossier refusé', motifs(e.pieces) || 'Votre dossier n’a pas été accepté.', { grave: true })
    case 'sanction_decidee': {
      if (!estMoi(e.acteurId, app)) return null
      if (e.etat === 'vigueur') {
        const recours = e.recoursJusqua ? ` Recours possible une fois, jusqu’au ${quand(e.recoursJusqua)}.` : ''
        const titre = e.niveau >= 4 ? 'Compte exclu' : e.niveau === 3 ? 'Compte suspendu' : `Sanction de niveau ${e.niveau}`
        return avis(titre, `${e.motif}.${recours}`.replace('..', '.'), { grave: true })
      }
      if (e.etat === 'levee' || e.etat === 'classee') return avis(e.etat === 'levee' ? 'Sanction levée' : 'Sanction classée sans suite', e.motif)
      return null
    }
    case 'palier_decide':
      if (!estMoi(e.acteurId, app)) return null
      return avis(e.vers === e.de ? `Palier maintenu : ${e.de}` : `Nouveau palier : ${e.vers}`, e.motif)
    case 'livreur_suspendu':
      if (e.livreurId !== LIVREUR_DEMO && app === 'livreur') return null
      return app === 'livreur'
        ? avis('Compte suspendu', `BelivaY a suspendu votre accès : ${e.motif}${e.jusqua ? ` Jusqu’au ${jour(e.jusqua)}.` : ''}`, { grave: true })
        : avis('Livreur suspendu', `${e.livreurId === LIVREUR_DEMO ? ACTEURS_DEMO.livreur.vu : 'Un de vos livreurs'} : ${e.motif} Aucune mission ne peut lui être affectée${e.jusqua ? ` jusqu’au ${jour(e.jusqua)}` : ''}.`, { grave: true })
    case 'livreur_retabli':
      if (e.livreurId !== LIVREUR_DEMO && app === 'livreur') return null
      return app === 'livreur'
        ? avis('Accès rétabli', `BelivaY a levé la suspension : ${e.motif} Vous recevez de nouveau des paquets.`)
        : avis('Livreur rétabli', `${e.livreurId === LIVREUR_DEMO ? ACTEURS_DEMO.livreur.vu : 'Votre livreur'} : ${e.motif}`)
    case 'kit_decide':
      return e.decision === 'retenue_annulee'
        ? avis('Retenue du kit annulée', `${e.motif}${app === 'livreur' ? ' Le montant mis de côté vous est versé le vendredi suivant.' : ''}`, { argent: true })
        : avis('Retenue du kit maintenue', e.motif, { argent: true })
    case 'depart_clos':
      return app === 'livreur'
        ? avis('Départ clôturé', `Votre départ est clôturé. Dernier versement le ${jour(e.versementLe)}.${e.kitNonConteste ? ' Kit non constaté dans le délai : aucune retenue.' : ''}`)
        : avis('Départ clôturé d’office', `${e.id} : délai échu, clôturé par BelivaY. Dernier versement le ${jour(e.versementLe)}.${e.kitNonConteste ? ' Kit non constaté : aucune retenue.' : ''}`)
    case 'piece_demandee':
      return app === 'livreur'
        ? avis(e.piece === 'selfie' ? 'Nouvelle photo demandée' : 'Pièce demandée', `${e.motif}${e.jusqua ? ` À envoyer avant le ${jour(e.jusqua)} ; vous continuez à travailler d’ici là.` : ''}`, { grave: true })
        : avis('Pièce redemandée à votre livreur', `${ACTEURS_DEMO.livreur.vu} · ${pieceVue(e.piece)} : ${e.motif}`)
    case 'fiche_a_valider':
      if (!estMoi(e.acteur, app)) return null
      return avis('Fiche préparée à valider', 'Un agent de BelivaY a préparé votre fiche : vérifiez-la et validez-la depuis votre téléphone.', { grave: true })
    case 'litige_decide': {
      const d = LITIGE[e.decision] ?? e.decision
      if (app === 'entreprise') return e.transporteurEnCause ? avis('Litige : transporteur en cause', `Commande ${e.commande} · ${e.motif} Retenue sur votre prochain versement, dans la limite de votre plafond.`, { grave: true, argent: true, commande: e.commande }) : null
      const somme = e.montant ? ` ${m(e.montant)}` : ''
      return tu
        ? avis(`Décision sur ton litige · ${e.commande}`, `${d}${somme ? ` :${somme} rendus sur ton moyen de paiement d’origine` : ''}. ${e.motif}`, { argent: !!e.montant, commande: e.commande })
        : avis(`Décision sur le litige · ${e.commande}`, `${d}. ${e.motif}`, { grave: e.decision !== 'debouter', commande: e.commande })
    }
    case 'commande_annulee':
      return tu
        ? avis(`Commande annulée · ${e.commande}`, `${e.motif}. Tu es remboursé${e.montant ? ` de ${m(e.montant)}` : ''} sur ton moyen de paiement d’origine.`, { argent: true, commande: e.commande })
        : avis(`Commande retirée · ${e.commande}`, `BelivaY a annulé la commande : ${e.motif}. Ne la préparez pas.`, { grave: true, commande: e.commande })
    case 'remboursement_execute':
      return avis(`Remboursement envoyé · ${e.commande}`, `${m(e.montant, 'Ton remboursement')} ${o.montants === false ? 'est envoyé' : 'envoyés'} sur ${moyenVu(e.moyen)}.`, { argent: true, commande: e.commande })
    case 'versement_credite':
      if (!estMoi(e.beneficiaire, app)) return null
      return avis('Versement crédité', o.montants === false ? `Versement du vendredi crédité · lot ${e.lot} · voir le détail` : `${F(e.montant)} crédités sur votre Mobile Money · lot ${e.lot}.`, { argent: true })
    case 'versement_gele':
      if (!estMoi(e.acteurId, app)) return null
      return avis('Versements retenus', `${e.motif} Vos versements attendent la décision de BelivaY (alerte ${e.alerte}).`, { grave: true, argent: true })
    case 'versement_degele':
      if (!estMoi(e.acteurId, app)) return null
      return avis('Versements libérés', e.motif, { argent: true })
    case 'reprise_vendeur':
      if (!estMoi(e.vendeurId, app)) return null
      return avis('Reprise sur vos versements', `${m(e.montant)} repris : ${e.motif}`.replace(/^ /, ''), { grave: true, argent: true })
    case 'grille_annoncee':
      return avis('Nouvelle grille tarifaire', `Version ${e.version}, en vigueur le ${jour(e.dateEffet)}.`)
    case 'geste':
      return avis('Geste commercial', `${m(e.montant, 'Un geste')} ${tu ? 'offerts sur ton Portefeuille BelivaY' : 'offert'} (${e.ref}).`, { argent: true })
    case 'ifa_decide':
      return avis('Paiement au retrait', `Ton palier : ${e.palier} · ${e.avantages}.`)
    case 'fiche_decidee':
      if (!estMoi(e.vendeurId, app)) return null
      return avis(`Fiche produit : ${e.decision}`, e.motif ?? `Demande ${e.demande}.`)
    case 'offre_moderee':
      if (!estMoi(e.vendeurId, app)) return null
      return avis(`Offre ${e.offre} : ${e.decision}`, `${e.motif}${e.suggestion ? ` Prix suggéré : ${F(e.suggestion)}.` : ''} Recours possible une fois.`, { grave: true })
    case 'avis_modere':
      return avis(`Avis ${e.decision}`, e.motif)
    case 'flash': {
      if (app === 'vendeur' && !estMoi(e.vendeur, app)) return null
      const etat = e.etat === 'programmee' ? 'programmée' : e.etat === 'annulee' ? 'annulée' : 'arrêtée'
      return avis(`Vente flash ${etat}`, e.motif ?? (tu ? 'Un compte à rebours, un seul prix : à suivre dans l’accueil.' : 'Votre vente flash est acceptée.'))
    }
    case 'rabais_retire':
      if (app !== 'vendeur' || !estMoi(e.vendeur, app)) return null
      return avis('Prix barré retiré', e.motif, { grave: true })
    case 'parametre_annonce':
      return avis('Règle modifiée', `${e.code} : ${e.valeur} à partir du ${jour(e.dateEffet)}.`)
    case 'interrupteur':
      return null
    case 'panne':
      if (e.etat === 'clos') return null
      if (e.etat === 'retabli') return avis('Service rétabli', 'Le service fonctionne de nouveau normalement.')
      if (e.etat === 'papier' && app === 'relais') return e.relais.some((r) => estMoi(r, app)) ? avis('Mode papier', `${e.message} Tenez le registre papier.`, { grave: true }) : null
      return avis(e.etat === 'maj' ? 'Incident : mise à jour' : 'Incident de service', `${e.message}${e.zones.length ? ` (${e.zones.join(', ')})` : ''}`, { grave: true })
    case 'ressaisie_relancee':
      if (!estMoi(e.relais, app)) return null
      return avis('Registre papier à ressaisir', `Remise ${e.remise} (incident ${e.incident}) : saisissez-la dans l’application.`, { grave: true })
    case 'diffusion':
      return avis('Message', e.texte)
    case 'support_reponse':
      return avis('Réponse du support', `${e.texte} (demande ${e.ticket})`)
    case 'maintenance_annoncee':
      return avis('Maintenance prévue', `${e.service} : du ${quand(e.debut)} au ${quand(e.fin)}.`)
    case 'maintenance_annulee':
      return avis('Maintenance annulée', `${e.service} : la maintenance annoncée n’aura pas lieu.`)
    case 'texte_annonce':
      return avis('Nouveau texte', `${e.texte} (version ${e.version}), en vigueur le ${jour(e.effet)}.`)
    case 'inspection_annoncee':
      if (app !== 'relais' || !estMoi(e.relais, app)) return null
      return avis('Inspection prévue', `Un agent de BelivaY passe le ${quand(e.prevueLe)} : espace de garde, étagères, horaires affichés, registre papier.`)
    case 'convention_terminee':
      if (app === 'relais') return estMoi(e.relais, app) ? avis('Fin de convention', `Plus aucun nouveau colis à compter du ${jour(e.effet)}. Les colis en garde partent avec les prochaines collectes. ${e.motif}`, { grave: true }) : null
      return app === 'entreprise' ? avis('Relais fermé au dépôt', `Un relais de vos zones ne reçoit plus de colis à compter du ${jour(e.effet)} : orientez les paquets vers un autre relais.`, { grave: true }) : null
    case 'contenu_publie':
      return null
    case 'donnees_exportees':
      return avis(tu ? 'Tes données sont prêtes' : 'Vos données sont prêtes', `Demande ${e.demande} : l’export est disponible.`)
    default:
      return null
  }
}

export interface BandeauConsole {
  id: string
  ton: 'rouge' | 'ambre'
  titre: string
  texte: string
}
/** Dernier événement de chaque objet (panne, maintenance…), dans l'ordre du journal. */
function derniers<T extends Evenement>(l: T[], cle: (e: T) => string): T[] {
  const m = new Map<string, T>()
  for (const e of l) m.set(cle(e), e)
  return [...m.values()]
}
/** Ce qui reste affiché en tête des écrans de l'application tant que la décision de la console vaut. */
export function bandeauxConsole(app: AppPont = APP, t: number = maintenant()): BandeauConsole[] {
  const l = decisionsConsole(app)
  const b: BandeauConsole[] = []
  for (const p of derniers(l.filter((e): e is Extract<Evenement, { type: 'panne' }> => e.type === 'panne'), (e) => e.id))
    if (p.etat !== 'retabli' && p.etat !== 'clos') {
      const papier = app === 'relais' && p.relais.some((r) => estMoi(r, app))
      b.push({ id: 'panne-' + p.id, ton: 'rouge', titre: papier ? 'Panne : mode papier' : 'Incident de service', texte: `${p.message}${p.zones.length ? ` (${p.zones.join(', ')})` : ''}${papier ? ' Tenez le registre papier.' : ''}` })
    }
  for (const x of derniers(l.filter((e): e is Extract<Evenement, { type: 'maintenance_annoncee' | 'maintenance_annulee' }> => e.type === 'maintenance_annoncee' || e.type === 'maintenance_annulee'), (e) => e.id))
    if (x.type === 'maintenance_annoncee' && x.fin > t) b.push({ id: 'maintenance-' + x.id, ton: 'ambre', titre: x.debut <= t ? 'Maintenance en cours' : 'Maintenance prévue', texte: `${x.service} : du ${quand(x.debut)} au ${quand(x.fin)}.` })
  if (app !== 'client') {
    const s = l.filter((e): e is Extract<Evenement, { type: 'sanction_decidee' }> => e.type === 'sanction_decidee' && estMoi(e.acteurId, app)).at(-1)
    if (s && s.etat === 'vigueur' && s.niveau >= 3) b.push({ id: 'sanction', ton: 'rouge', titre: s.niveau >= 4 ? 'Compte exclu par BelivaY' : 'Compte suspendu par BelivaY', texte: s.motif })
    const k = l.filter((e): e is Extract<Evenement, { type: 'kyc_decide' }> => e.type === 'kyc_decide' && (estMoi(e.acteur, app) || estMoi(e.dossier, app))).at(-1)
    if (k && k.decision === 'complement') b.push({ id: 'kyc', ton: 'ambre', titre: 'Pièce à renvoyer', texte: motifs(k.pieces) || 'Une pièce de votre dossier est à reprendre.' })
    const f = app === 'relais' ? l.filter((e): e is Extract<Evenement, { type: 'convention_terminee' }> => e.type === 'convention_terminee' && estMoi(e.relais, app)).at(-1) : undefined
    if (f) b.push({ id: 'convention', ton: 'rouge', titre: 'Convention terminée', texte: `Aucun nouveau colis à compter du ${jour(f.effet)} ; les colis en garde partent avec les prochaines collectes.` })
    if (k && k.decision === 'rejete') b.push({ id: 'kyc', ton: 'rouge', titre: 'Dossier refusé par BelivaY', texte: motifs(k.pieces) || 'Votre dossier n’a pas été accepté.' })
  }
  if (app === 'vendeur') {
    const g = l.filter((e): e is Extract<Evenement, { type: 'versement_gele' | 'versement_degele' }> => (e.type === 'versement_gele' || e.type === 'versement_degele') && estMoi(e.acteurId, app)).at(-1)
    if (g?.type === 'versement_gele') b.push({ id: 'gel', ton: 'ambre', titre: 'Versements retenus par BelivaY', texte: g.motif })
  }
  return b
}

/** Vers la console : une inscription ou une activation complète attend la vérification de BelivaY (KYC, R59, R81). */
export function demanderActivation(espace: EspacePont, acteur: string, dossier: string, pieces: number, le: number = maintenant(), candidature?: { denomination: string; zones: string[]; livreurs: number }) {
  publier({ type: 'account.requested', espace, acteur, dossier, pieces, ...(candidature ?? {}) }, `account.requested-${espace}-${dossier}-${le}`, le)
}
/** Décision de la console sur une candidature (pont : kyc_decide sur son dossier) : la dernière, ou null. */
export function decisionCandidature(dossier: string, app: AppPont = APP): { decision: 'approuve' | 'rejete' | 'complement'; motif: string | null; le: number } | null {
  const k = decisionsConsole(app)
    .filter((e): e is Extract<Evenement, { type: 'kyc_decide' }> => e.type === 'kyc_decide' && e.dossier === dossier)
    .at(-1)
  return k ? { decision: k.decision, motif: k.pieces.find((p) => p.motif)?.motif ?? null, le: k.le } : null
}
/** Vers la console : un signalement (avis, produit, colis, comportement) arrive dans la File d'action. */
export function signaler(espace: EspacePont, objet: string, motif: string, gravite: 'normale' | 'grave', le: number = maintenant()) {
  publier({ type: 'report.filed', espace, objet, motif, gravite }, `report.filed-${espace}-${objet}-${le}`, le)
}
