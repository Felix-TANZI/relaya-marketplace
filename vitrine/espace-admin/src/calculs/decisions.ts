// Règles des décisions encadrées (logique-metier/DECISIONS-ENCADREES.md), en fonctions pures : lues par la source de
// démonstration (qui REFUSE) et par le poste de travail (qui GRISE, avec la même raison). Le serveur refera chaque
// contrôle (logique-metier/CONTROLES-SERVEUR-DECISIONS.md : même ordre, mêmes codes de refus).
// 1. Liste de contrôle d'un litige, calculée d'office par type (non reçu, abîmé, non conforme, manquant, retard) à partir
//    des faits lus dans les pièces (R51, R60, R66, R76, R87) : ✓ / ✕ / ⚠ ;
// 2. Lecture des contrôles (après confirmation ou correction de l'agent) : qui est en tort, qui est disculpé, l'issue
//    suggérée et qui en supporte le coût, en une ligne ; preuves contradictoires : à transmettre ;
// 3. Issues permises par la règle du type ; celles qui imputent une partie disculpée sont bloquées ; montant jamais
//    au-delà de ce qui a été payé ; fourchette du remboursement partiel ; geste sous le plafond du niveau et sous la
//    commission (R25) ;
// 4. Le contrôle d'une demande (verifierDemande) : déjà décidé, trop tôt, auteur, lié, hors règle, disculpé, payé,
//    fourchette, commission, motif, note, puis transmettre (au-delà du plafond, preuves contradictoires) ;
// 5. Lots : même genre, même cause, même issue, aucun doute ; plafonnés en nombre et en montant.
import type { Francs, Instant } from '../donnees/communs'
import type { DemandePoste, EtatControle, EtatIssue, IssuePoste, Partie, RefusPoste, SuggestionPoste, TypeLitige } from '../donnees/domaines/decisions'
import type { Niveau } from '../donnees/domaines/equipe'
import { PARAMETRES } from './registre'

const P = () => PARAMETRES.decisions
const fr = (n: number) => `${Math.round(n).toLocaleString('fr-FR').replace(/[\s  ]/g, ' ')} F`

export const NOM_TYPE: Record<TypeLitige, string> = { non_recu: 'Non reçu', abime: 'Abîmé', non_conforme: 'Non conforme', manquant: 'Article manquant', retard: 'Retard' }
export const NOM_PARTIE: Record<Partie, string> = { client: 'le client', vendeur: 'le vendeur', entreprise: 'l’entreprise de livraison', relais: 'le relais', livreur: 'le livreur', belivay: 'BelivaY' }
export const NOM_PARTIE_COURT: Record<Partie, string> = { client: 'Client', vendeur: 'Vendeur', entreprise: 'Entreprise de livraison', relais: 'Relais', livreur: 'Livreur', belivay: 'BelivaY' }

// ── 1. Faits et liste de contrôle d'un litige ───────────────────────────────────────────────────────────────────────
/** Ce que les pièces disent d'un colis, de son ramassage à sa remise (null : sans objet ou inconnu). */
export interface FaitsLitige {
  mode: 'domicile' | 'relais'
  photoRamassage: boolean
  contenuRamassage: 'conforme' | 'non_conforme' | 'incomplet' | 'illisible' | null // photo C1 comparée à l'offre
  emballage: boolean | null // R87 : carton ou pochette selon le produit
  scelle: 'intact' | 'reserve' | null // réception au relais (C2) ; null : domicile ou inconnu
  photoRemise: boolean
  codeRemise: boolean
  distanceRemiseM: number | null // position de la remise par rapport à l'adresse (domicile) ou au relais
  heuresCoherentes: boolean | null
  appels: number | null // appels du livreur comptés (R51), domicile
  photosClient: number
  clientJoignable: boolean | null
  reponseVendeur: 'accepte' | 'conteste' | 'arrangement' | null
  retardH: number | null // retard sur la promesse (R45)
  causeRetard: 'entreprise' | 'client' | 'vendeur' | null
}

export const CONTROLES_TYPE: Record<TypeLitige, string[]> = {
  non_recu: ['photo_ramassage', 'photo_remise', 'code_remise', 'position_remise', 'heures', 'appels'],
  abime: ['photo_ramassage', 'emballage', 'scelle', 'photo_remise', 'photos_client', 'heures'],
  non_conforme: ['photo_ramassage', 'contenu_ramassage', 'scelle', 'photos_client', 'reponse_vendeur'],
  manquant: ['photo_ramassage', 'contenu_ramassage', 'scelle', 'photo_remise', 'photos_client', 'heures'],
  retard: ['heures', 'retard', 'appels', 'joignable'],
}

export const LIBELLE_CONTROLE: Record<string, string> = {
  photo_ramassage: 'Photo au ramassage présente',
  contenu_ramassage: 'Contenu au ramassage conforme à la commande',
  emballage: 'Emballage adapté au produit',
  scelle: 'Colis scellé intact jusqu’au relais',
  photo_remise: 'Photo à la remise présente',
  code_remise: 'Code de remise validé',
  position_remise: 'Position à la remise proche de l’adresse',
  heures: 'Heures cohérentes',
  appels: 'Client appelé avant de repartir',
  joignable: 'Client joignable',
  photos_client: 'Photos du client jointes',
  reponse_vendeur: 'Réponse du vendeur reçue',
  retard: 'Retard établi par les heures',
}

export interface ControleCalcule {
  id: string
  libelle: string
  etat: EtatControle
  pourquoi: string
}

/** Liste de contrôle calculée d'office pour un type de litige (ce qui reste douteux est marqué ⚠). */
export function controlesLitige(type: TypeLitige, f: FaitsLitige): ControleCalcule[] {
  const rayon = P().rayonRemiseM
  const calc: Record<string, () => [EtatControle, string]> = {
    photo_ramassage: () => (f.photoRamassage ? ['ok', 'Photo prise par le livreur chez le vendeur (R66)'] : ['ko', 'Aucune photo au ramassage : la charge revient à qui devait la prendre']),
    contenu_ramassage: () =>
      f.contenuRamassage === 'conforme' ? ['ok', 'La photo du ramassage montre l’article de l’offre'] : f.contenuRamassage === 'non_conforme' ? ['ko', 'La photo du ramassage montre un autre article que l’offre'] : f.contenuRamassage === 'incomplet' ? ['ko', 'La photo du ramassage montre moins d’articles que la commande'] : ['doute', 'La photo du ramassage ne permet pas de compter ou de reconnaître les articles'],
    emballage: () => (f.emballage === null ? ['doute', 'Emballage non visible sur les photos'] : f.emballage ? ['ok', 'Carton ou pochette conforme au produit (R87)'] : ['ko', 'Emballage inadapté au produit (R87)']),
    scelle: () => (f.scelle === 'intact' ? ['ok', 'Reçu au relais sans réserve, scellé intact'] : f.scelle === 'reserve' ? ['ko', 'Réserve écrite du relais à la réception'] : f.mode === 'domicile' ? ['ok', 'Livraison à domicile : pas de dépôt au relais'] : ['doute', 'Réception au relais sans constat']),
    photo_remise: () => (f.photoRemise ? ['ok', 'Photo prise à la remise'] : ['ko', 'Aucune photo à la remise']),
    code_remise: () => (f.codeRemise ? ['ok', 'Code du client validé à la remise'] : ['ko', 'Remise sans code validé']),
    position_remise: () =>
      f.distanceRemiseM === null ? ['doute', 'Position de la remise absente'] : f.distanceRemiseM <= rayon ? ['ok', `Remise à ${Math.round(f.distanceRemiseM)} m de l’adresse`] : f.distanceRemiseM <= 1500 ? ['doute', `Remise à ${Math.round(f.distanceRemiseM)} m de l’adresse`] : ['ko', `Remise à ${(f.distanceRemiseM / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km de l’adresse (R76)`],
    heures: () => (f.heuresCoherentes === null ? ['doute', 'Heures incomplètes'] : f.heuresCoherentes ? ['ok', 'Ramassage, dépôt et remise dans l’ordre, sans trou'] : ['ko', 'Heures incohérentes entre les pièces']),
    appels: () => (f.mode !== 'domicile' || f.appels === null ? ['ok', 'Retrait au relais : pas d’appel attendu'] : f.appels >= P().appels ? ['ok', `${f.appels} appels comptés et ${P().attenteMin} min d’attente (R51)`] : ['ko', `${f.appels} appel compté sur ${P().appels} exigés (R51)`]),
    joignable: () => (f.clientJoignable === null ? ['doute', 'Aucun appel du client noté'] : f.clientJoignable ? ['ok', 'Client joint au téléphone'] : ['ko', 'Client injoignable']),
    photos_client: () => (f.photosClient > 0 ? ['ok', `${f.photosClient} photo${f.photosClient > 1 ? 's' : ''} du client`] : ['ko', 'Aucune photo du client']),
    reponse_vendeur: () => (f.reponseVendeur ? ['ok', f.reponseVendeur === 'conteste' ? 'Le vendeur conteste' : f.reponseVendeur === 'accepte' ? 'Le vendeur accepte le retour' : 'Le vendeur propose un arrangement'] : ['doute', 'Le vendeur n’a pas encore répondu']),
    retard: () => (f.retardH === null ? ['doute', 'Heure de remise inconnue'] : f.retardH > 0 ? ['ok', `${f.retardH} h de retard sur la promesse (R45)${f.causeRetard ? ' · cause : ' + NOM_PARTIE[f.causeRetard] : ''}`] : ['ko', 'Livré dans le délai promis']),
  }
  return CONTROLES_TYPE[type].map((id) => {
    const [etat, pourquoi] = calc[id]()
    return { id, libelle: LIBELLE_CONTROLE[id], etat, pourquoi }
  })
}

// ── 2. Lecture : qui est en tort, qui est disculpé, issue suggérée ──────────────────────────────────────────────────
export interface Lecture {
  suggestion: SuggestionPoste
  disculpes: Partial<Record<Partie, string>> // partie → raison
  ambigu: boolean
}

/** Lit les contrôles (états après l'agent) : suggestion de la règle, parties disculpées, preuves contradictoires. */
export function lireLitige(type: TypeLitige, etats: Record<string, EtatControle>, f: FaitsLitige): Lecture {
  const e = (id: string): EtatControle => etats[id] ?? 'doute'
  const ok = (id: string) => e(id) === 'ok'
  const ko = (id: string) => e(id) === 'ko'
  const d: Partial<Record<Partie, string>> = {}
  const s = (issue: string | null, payeur: Partie | null, raison: string, regle: string): Lecture => ({ suggestion: { issue, payeur, raison, regle }, disculpes: d, ambigu: issue === null })
  const ambigu = (raison: string) => s(null, null, raison, 'Preuves contradictoires : transmettre au niveau supérieur')
  if (type === 'non_recu') {
    if (ok('photo_ramassage')) d.vendeur = 'photo du ramassage : le colis a été remis au livreur'
    if (ok('photo_remise') && ok('code_remise') && ok('position_remise')) {
      d.entreprise = 'photo, code validé et position de la remise prouvent la livraison'
      d.livreur = d.entreprise
      d.relais = 'remise prouvée par le livreur'
      return s('debouter', null, `Remise prouvée : photo, code validé, position proche de l’adresse${ok('appels') ? ', appels comptés' : ''}.`, 'R66 · R51 · R76')
    }
    if (ko('photo_remise') && ko('code_remise')) {
      d.client = 'ni photo ni code de remise : la livraison n’est pas prouvée'
      if (f.mode === 'relais' && ok('scelle')) {
        d.entreprise = 'scellé intact à la réception du relais'
        return s('rembourser_relais', 'relais', 'Colis reçu intact au relais, remis sans photo ni code : la charge revient au relais.', 'R66 · ADM-PRV-05')
      }
      return s('rembourser_transporteur', 'entreprise', 'Ni photo ni code à la remise, position loin de l’adresse : la livraison n’est pas prouvée ; l’entreprise en répond.', 'R60 · R66 · R76')
    }
    return ambigu('Remise en partie prouvée : une ligne reste douteuse.')
  }
  if (type === 'abime') {
    if (ko('emballage')) return s('rembourser_vendeur', 'vendeur', 'Emballage inadapté au produit : le vendeur en répond.', 'R87')
    if (ok('photo_ramassage') && ok('emballage')) d.vendeur = 'produit intact et bien emballé au ramassage'
    if (ko('scelle')) {
      d.relais = 'réserve écrite à la réception : le dommage est antérieur'
      return s('rembourser_transporteur', 'entreprise', 'Réserve du relais à la réception : le dommage est arrivé pendant le transport.', 'R60 · R66')
    }
    if (ok('scelle') && ko('photo_remise')) {
      d.entreprise = 'scellé intact à la réception du relais'
      return s('rembourser_relais', 'relais', 'Scellé intact jusqu’au relais, photo de remise absente : la charge revient au relais.', 'R66 · ADM-PRV-05')
    }
    if (ko('photo_ramassage')) return s('rembourser_transporteur', 'entreprise', 'Aucune photo au ramassage : le livreur devait la prendre.', 'R66 · ADM-PRV-05')
    return ambigu('Chaîne de preuves intacte et dommage constaté par le client : à trancher au niveau supérieur.')
  }
  if (type === 'non_conforme') {
    if (ok('scelle')) d.entreprise = 'scellé intact de bout en bout'
    if (ko('contenu_ramassage')) {
      d.client = 'la photo du ramassage montre déjà un autre article'
      return s('rembourser_vendeur', 'vendeur', 'La photo du ramassage montre un article différent de l’offre : le vendeur en répond.', 'R66 · R67 · R69')
    }
    if (ok('contenu_ramassage') && ok('scelle')) {
      d.vendeur = 'la photo du ramassage montre l’article de l’offre'
      return s('debouter', null, 'L’article remis au livreur est celui de l’offre et le scellé est intact.', 'R66 · R67')
    }
    return ambigu('La photo du ramassage ne permet pas de conclure.')
  }
  if (type === 'manquant') {
    if (ko('contenu_ramassage')) {
      d.client = 'la photo du ramassage montre déjà un article en moins'
      if (ok('scelle')) d.entreprise = 'scellé intact de bout en bout'
      return s('rembourser_vendeur', 'vendeur', 'Article déjà absent au ramassage : le vendeur en répond.', 'R66')
    }
    if (ko('scelle')) return s('rembourser_transporteur', 'entreprise', 'Scellé abîmé à la réception du relais : l’entreprise en répond.', 'R60')
    return ambigu('Scellé intact et contenu du ramassage incertain : les versions s’opposent.')
  }
  // retard
  if (f.causeRetard === 'client' && ok('appels')) {
    d.entreprise = 'appels comptés : le client était absent'
    return s('debouter', null, 'Le retard vient de l’absence du client.', 'R51')
  }
  if (ok('retard')) return s('geste', 'belivay', 'Retard établi sur la promesse : geste commercial de BelivaY, sous plafond.', 'R45 · R25 · R03')
  return s('debouter', null, 'Livré dans le délai promis.', 'R45')
}

// ── 3. Issues d'un litige ───────────────────────────────────────────────────────────────────────────────────────────
export const ISSUES_TYPE: Record<TypeLitige, string[]> = {
  non_recu: ['rembourser_transporteur', 'rembourser_relais', 'debouter', 'geste'],
  abime: ['rembourser_vendeur', 'rembourser_transporteur', 'rembourser_relais', 'partiel', 'remplacer', 'debouter'],
  non_conforme: ['rembourser_vendeur', 'remplacer', 'partiel', 'debouter'],
  manquant: ['rembourser_vendeur', 'rembourser_transporteur', 'partiel', 'debouter'],
  retard: ['geste', 'debouter'],
}
export const TOUTES_ISSUES = ['rembourser_vendeur', 'rembourser_transporteur', 'rembourser_relais', 'partiel', 'remplacer', 'debouter', 'geste'] as const
export const PAYEUR_ISSUE: Record<string, Partie | null> = { rembourser_vendeur: 'vendeur', rembourser_transporteur: 'entreprise', rembourser_relais: 'relais', partiel: 'vendeur', remplacer: 'vendeur', debouter: 'client', geste: 'belivay' }
export function libelleIssue(id: string, recours = false): string {
  if (recours) return { rembourser_vendeur: 'Charge au vendeur (recours rejeté)', rembourser_transporteur: 'Charge à l’entreprise de livraison', rembourser_relais: 'Charge au relais', debouter: 'Accueillir le recours du vendeur' }[id] ?? libelleIssue(id)
  return { rembourser_vendeur: 'Rembourser · charge au vendeur', rembourser_transporteur: 'Rembourser · charge à l’entreprise', rembourser_relais: 'Rembourser · charge au relais', partiel: 'Remboursement partiel', remplacer: 'Remplacer l’article', debouter: 'Débouter le client', geste: 'Geste commercial' }[id] ?? id
}

/** Niveau qui suffit pour un montant (plafonds du registre, ADM-PLAFOND-*). */
export function niveauPour(montant: Francs): { niveau: Niveau | 'direction'; libelle: string } {
  const p = PARAMETRES.acces.plafond
  if (montant <= p.agent) return { niveau: 'agent', libelle: 'Agent' }
  if (montant <= p.senior) return { niveau: 'senior', libelle: 'Senior' }
  if (montant <= p.responsable) return { niveau: 'responsable', libelle: 'Responsable d’équipe' }
  return { niveau: 'direction', libelle: 'Direction' }
}

export interface ContexteLitige {
  type: TypeLitige
  montant: Francs // prix des articles en cause
  paye: Francs // ce que le client a payé (articles, livraison, frais)
  fraisMomo: Francs // frais Mobile Money rendus au client qui n'est pas en faute (R72)
  commission: Francs // commission de la commande : plafond d'un geste (R25)
  entreprise: string | null
  relais: string | null
  paiement: string
  recours: boolean
}

/** Issues d'un litige : les sept, avec leur état (permise, bloquée et pourquoi) ; montants calculés, jamais saisis. */
export function issuesLitige(c: ContexteLitige, l: Lecture, geste: Francs): IssuePoste[] {
  const p = P()
  const permises = c.recours ? ['rembourser_vendeur', 'rembourser_transporteur', 'rembourser_relais', 'debouter'] : ISSUES_TYPE[c.type]
  const seuil = PARAMETRES.console.seuilRemboursementQuatreYeux
  const pmin = Math.ceil((c.montant * p.partielMinPct) / 100 / 100) * 100
  const pmax = Math.min(c.paye, Math.floor((c.montant * p.partielMaxPct) / 100 / 100) * 100)
  const gmax = Math.min(geste, c.commission)
  return TOUTES_ISSUES.map((id): IssuePoste => {
    const payeur = PAYEUR_ISSUE[id]
    const rembourse = id.startsWith('rembourser')
    const montant = rembourse ? Math.min(c.paye, c.montant + c.fraisMomo) : id === 'partiel' ? pmax : id === 'geste' ? gmax : null
    const qui = id === 'rembourser_transporteur' ? (c.entreprise ?? 'l’entreprise') : id === 'rembourser_relais' ? (c.relais ?? 'le relais') : 'le vendeur'
    const effet = rembourse
      ? c.recours
        ? `Le remboursement déjà fait reste acquis au client ; la charge de ${fr(c.montant)} passe à ${qui}${id === 'rembourser_vendeur' ? ' (repris sur ses versements, R25)' : ', dans la limite de son plafond'}.`
        : `${fr(c.montant)}${c.fraisMomo ? ` + ${fr(c.fraisMomo)} de frais Mobile Money` : ''} rendus au client vers ${c.paiement}, le moyen d’origine (R68, R72) ; charge à ${qui}${id === 'rembourser_vendeur' ? ', course de retour comprise (R69)' : ''}.`
      : id === 'partiel'
        ? `Le client garde l’article ; entre ${fr(pmin)} et ${fr(pmax)} rendus vers ${c.paiement} ; charge au vendeur.`
        : id === 'remplacer'
          ? 'Même article envoyé à nouveau aux frais du vendeur sous 72 h ouvrées, sinon remboursement (R70).'
          : id === 'geste'
            ? `Bon de réduction de ${fr(gmax)} au plus, pris sur la commission de la commande (R25 ; Wallet fermé : R03).`
            : c.recours
              ? 'Le vendeur est rétabli dans sa vente ; la charge du remboursement déjà fait reste à BelivaY.'
              : 'Le client garde l’article ; rien n’est remboursé ; le vendeur est payé à la libération.'
    let etat: EtatIssue = 'permise'
    let raison: string | null = null
    if (!permises.includes(id)) {
      etat = 'bloquee'
      raison = c.recours ? 'Hors du recours : il porte sur la charge, plus sur le produit.' : `Hors des issues de la règle pour un litige « ${NOM_TYPE[c.type]} ».`
    } else if (payeur && l.disculpes[payeur] && (rembourse || id === 'partiel' || id === 'remplacer' || id === 'debouter')) {
      etat = 'bloquee'
      raison = payeur === 'client' ? `Les preuves donnent raison au client : ${l.disculpes.client}.` : `Les preuves disculpent ${NOM_PARTIE[payeur]} : ${l.disculpes[payeur]}.`
    } else if (id === 'rembourser_relais' && !c.relais) {
      etat = 'bloquee'
      raison = 'Aucun relais sur ce dossier : livraison à domicile.'
    } else if (id === 'rembourser_transporteur' && !c.entreprise) {
      etat = 'bloquee'
      raison = 'Aucune entreprise de livraison sur ce dossier.'
    } else if (id === 'geste' && gmax <= 0) {
      etat = 'bloquee'
      raison = 'Aucun geste possible : la commission de la commande est nulle (R25).'
    }
    return {
      id,
      libelle: libelleIssue(id, c.recours),
      effet,
      payeur: id === 'debouter' && !c.recours ? 'client' : id === 'debouter' ? 'belivay' : payeur,
      montant,
      etat,
      raison,
      regle: rembourse ? (id === 'rembourser_transporteur' ? 'R60' : id === 'rembourser_relais' ? 'ADM-PRV-05' : 'R67 · R69') : id === 'partiel' ? 'LIT-PARTIEL-MIN · LIT-PARTIEL-MAX' : id === 'geste' ? 'R25 · R03' : id === 'remplacer' ? 'R70' : 'R70',
      fourchette: id === 'partiel' ? { min: pmin, max: pmax, pas: 100 } : id === 'geste' ? { min: 100, max: gmax, pas: 100 } : null,
      quatreYeux: (montant ?? 0) > seuil,
    }
  })
}

// ── 4. Contrôle d'une demande ───────────────────────────────────────────────────────────────────────────────────────
export interface ContexteDemande {
  decide: boolean
  enAttente: boolean // quatre yeux en cours
  pasAvant: Instant | null // échéance prévue par la règle avant laquelle on ne tranche pas
  maintenant: Instant
  auteur: string | null // agent qui a ouvert le dossier
  lies: string[] // agents liés à une partie
  transmisPar: string | null // la transmission attend un AUTRE compte
  agent: { id: string; plafond: Francs | null; geste: Francs; tranche: boolean } // tranche : son niveau tranche ce dossier
  issues: IssuePoste[]
  ambigu: boolean
  paye: Francs
  motifs: string[]
}
export const motifValable = (m: string) => m.trim().length >= PARAMETRES.console.motifMin

export type Verdict = { ok: true } | { ok: false; raison: RefusPoste; detail: string }
/** Contrôle d'une demande, dans l'ordre que le serveur suivra (CONTROLES-SERVEUR-DECISIONS.md § 2). */
export function verifierDemande(c: ContexteDemande, d: DemandePoste): Verdict {
  const non = (raison: RefusPoste, detail: string): Verdict => ({ ok: false, raison, detail })
  if (c.decide) return non('deja_decide', 'Décision rendue : seul un recours, dans son délai, la rouvre.')
  if (c.enAttente) return non('en_attente', 'Une décision attend déjà un second validateur.')
  if (c.pasAvant !== null && c.maintenant < c.pasAvant) return non('trop_tot', 'La règle laisse encore du temps à une partie : aucune décision avant l’échéance.')
  if (c.auteur === c.agent.id) return non('auteur', 'Vous avez ouvert ce dossier : un autre compte le tranche.')
  if (c.transmisPar === c.agent.id) return non('auteur', 'Vous avez transmis ce dossier : un autre compte le tranche (quatre yeux).')
  if (c.lies.includes(c.agent.id)) return non('lie', 'Vous êtes lié à une partie de ce dossier : un autre compte le tranche.')
  const i = c.issues.find((x) => x.id === d.issue)
  if (!i) return non('hors_regle', 'Cette issue n’est pas dans la liste de la règle.')
  if (i.etat === 'bloquee') return non(i.raison?.startsWith('Les preuves') ? 'disculpe' : 'hors_regle', i.raison ?? 'Issue bloquée par la règle.')
  const montant = i.fourchette ? (d.montant ?? null) : i.montant
  if (i.fourchette) {
    if (montant === null || !Number.isFinite(montant)) return non('hors_fourchette', 'Choisissez un montant dans la fourchette.')
    if (montant > c.paye) return non('au_dela_paye', `On ne rend jamais plus que ce qui a été payé (${fr(c.paye)}).`)
    if (montant < i.fourchette.min || montant > i.fourchette.max) return non(d.issue === 'geste' ? 'geste_commission' : 'hors_fourchette', d.issue === 'geste' ? `Un geste reste sous ${fr(i.fourchette.max)} (plafond du niveau et commission de la commande, R25).` : `Le remboursement partiel reste entre ${fr(i.fourchette.min)} et ${fr(i.fourchette.max)}.`)
  } else if ((montant ?? 0) > c.paye) return non('au_dela_paye', `On ne rend jamais plus que ce qui a été payé (${fr(c.paye)}).`)
  if (!c.motifs.includes(d.motif)) return non('motif', 'Choisissez un motif dans la liste.')
  if (!motifValable(d.note)) return non('note_courte', `La note compte au moins ${PARAMETRES.console.motifMin} caractères.`)
  if (!c.agent.tranche) return non('lecture_seule', 'Votre niveau ne tranche pas ce dossier : transmettez-le.')
  if (c.ambigu) return non('transmettre', 'Preuves contradictoires : le niveau supérieur tranche.')
  if (d.issue === 'geste' && (montant ?? 0) > c.agent.geste) return non('transmettre', `Au-delà de votre plafond de geste (${fr(c.agent.geste)}) : transmettez.`)
  if (c.agent.plafond !== null && (montant ?? 0) > c.agent.plafond) return non('transmettre', `Au-delà de votre plafond (${fr(c.agent.plafond)}) : transmettez au niveau supérieur.`)
  return { ok: true }
}

/** État d'une issue pour l'agent connecté : les bloquées restent bloquées, les montants au-delà du plafond passent en « transmettre ». */
export function issuesPourAgent(issues: IssuePoste[], agent: ContexteDemande['agent'], ambigu: boolean): IssuePoste[] {
  return issues.map((i) => {
    if (i.etat === 'bloquee') return i
    const m = i.id === 'geste' ? (i.fourchette?.min ?? 0) : i.fourchette ? i.fourchette.min : (i.montant ?? 0)
    if (!agent.tranche) return { ...i, etat: 'transmettre', raison: 'Votre niveau ne tranche pas ce dossier.' }
    if (ambigu) return { ...i, etat: 'transmettre', raison: 'Preuves contradictoires : le niveau supérieur tranche.' }
    if (i.id === 'geste' && m > agent.geste) return { ...i, etat: 'transmettre', raison: `Au-delà de votre plafond de geste (${fr(agent.geste)}).` }
    if (agent.plafond !== null && m > agent.plafond) return { ...i, etat: 'transmettre', raison: `Au-delà de votre plafond (${fr(agent.plafond)}).` }
    return i
  })
}

/** Plafond de geste d'un niveau (SUP-GESTE pour un Agent). */
export const plafondGeste = (n: Niveau | null): Francs => (n === null ? P().geste.responsable : P().geste[n])

/** Prolongation : une seule, de LIT-PROLONGATION-H. */
export function prolongation(faite: boolean, decide: boolean): { heures: number; possible: boolean; raison: string | null } {
  const heures = P().prolongationH
  if (decide) return { heures, possible: false, raison: 'Dossier décidé.' }
  if (faite) return { heures, possible: false, raison: 'Une seule prolongation par dossier : elle est faite.' }
  return { heures, possible: true, raison: null }
}

// ── 5. Lots ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface MembreLot {
  id: string
  lot: string | null
  doutes: number
  montant: Francs
  verdict: Verdict
}
/** Un lot passe si tous ses dossiers sont identiques (même clé), sans doute, chacun permis, et sous les plafonds. */
export function verifierLot(m: MembreLot[], plafond: Francs | null): Verdict {
  const non = (raison: RefusPoste, detail: string): Verdict => ({ ok: false, raison, detail })
  if (m.length < 2) return non('lot_heterogene', 'Un lot réunit au moins deux dossiers identiques.')
  if (m.length > P().lotMax) return non('lot_taille', `Au plus ${P().lotMax} dossiers par décision en lot.`)
  if (!m[0].lot || m.some((x) => x.lot !== m[0].lot)) return non('lot_heterogene', 'Ces dossiers ne sont pas identiques (même cause, même issue).')
  if (m.some((x) => x.doutes > 0)) return non('lot_heterogene', 'Un dossier a encore une ligne douteuse : décidez-le seul.')
  const refus = m.find((x) => !x.verdict.ok)
  if (refus && !refus.verdict.ok) return non(refus.verdict.raison, `${refus.id} : ${refus.verdict.detail}`)
  const total = m.reduce((n, x) => n + x.montant, 0)
  if (plafond !== null && total > plafond) return non('lot_plafond', `Le lot dépasse votre plafond (${fr(total)} pour ${fr(plafond)}).`)
  return { ok: true }
}

/** Tire un échantillon déterministe (graine : le jour) de n lignes : l'Audit le relit. */
export function echantillon<T>(l: T[], n: number, graine: number): T[] {
  const x = [...l]
  let h = graine >>> 0
  for (let i = x.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0
    const j = h % (i + 1)
    ;[x[i], x[j]] = [x[j], x[i]]
  }
  return x.slice(0, n)
}
