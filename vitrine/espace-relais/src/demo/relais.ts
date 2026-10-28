// DONNÉES DE DÉMONSTRATION — domaine « relais » (Mon relais) : statut, capacité déclarée et demandes de changement
// (hausse vérifiée à la visite ou à distance au palier Confirmé, baisse revue par une personne ; jamais sous les places
// occupées), horaires (demande à BelivaY), équipe (PR-EQUIPE-MAX employés, code SMS au téléphone du gérant ; retrait :
// session et appareils déliés), documents (renvoi seulement demandé, refusé ou bientôt expiré), convention, annexes et
// fiche d'ouverture, formation (leçons et quiz corrigé ici, jamais dans l'écran), préférences, PIN, données
// personnelles, fin de convention demandée (PR-FIN-PREAVIS-J, BelivaY la prononce, annulable avant).
// Paramètres proposés par PR-10 et pas encore au registre : lus au registre s'ils y sont, sinon repli provisoire
// (logique-metier/relais/A-VALIDER.md, section « Paramètres »).
import { PARAMETRES } from '../calculs/registre'
import { JOUR } from '../calculs/temps'
import type { Origine } from '../donnees/communs'
import type { ContenuModule, Contrat, DomaineRelais, FicheRelais, ModuleFormation, PlageJour, TexteRegle, TypeDocument } from '../donnees/domaines/relais'
import type { Droit, Membre, StatutRelais } from '../donnees/domaines/session'
import { etatCalendrier } from './calendrier'
import { creerInvitation } from './invitations'
import { empreinte, etatColis, occupationDuRelais, tousLesColis } from './colis'
import { maintenant } from './horloge'
import { CODE_SMS_DEMO, NUMERO_VERSEMENT, PAUL, PLAN, RELAIS, ROSE, TELEPHONES, h, oct } from './jeu-essai'
import { etatQualite, palierDe } from './qualite'
import { sansHistorique, scenario } from './scenario'
import { etatSession, membreActuel } from './session'
import { magasin, repondre } from './stockage'
import { demanderActivation } from './pont-console'
import { RELAIS_DEMO } from './pont'

const P = PARAMETRES.relais
const C = PARAMETRES.connexion

/** Paramètres lus au registre (calculs/registre.ts) ; plus aucun repli local. */
const REGLES = {
  hausseADistancePct: PARAMETRES.argent.capacitePct,
  quizSeuilPct: P.formationQuizPct, // ARL-125
  donneesDelaiJours: P.donneesDelaiJours, // ARL-127
  invitationHeures: PARAMETRES.acces.invitationHeures,
  grillePreavisJours: P.grillePreavisJours,
  fondateurs: PARAMETRES.acces.fondateurs,
  exclusiviteM: PARAMETRES.acces.exclusiviteRayonM,
  exclusiviteMois: PARAMETRES.acces.exclusiviteMois,
}

/** Modules de formation (FOR-05 ; ARL-28 : module 3 garde en espèces et Mobile Money au comptoir, module 6 « Servir en
 * anglais », pidgin retiré). Les nombres des leçons viennent du registre. */
const MODULES: (Omit<ModuleFormation, 'statut' | 'score' | 'termineLe'> & { icone: string; lecons: ContenuModule['lecons']; questions: (ContenuModule['questions'][number] & { bonne: number })[] })[] = [
  {
    id: 'm1',
    titre: 'Réception et scellés',
    resume: 'Code de dépôt du livreur, contrôle des scellés, réserve ou refus avec photo, photo du lot.',
    obligatoire: true,
    minutes: 12,
    icone: 'r-colis',
    lecons: [
      { titre: 'Le code de dépôt', texte: 'Le livreur vous donne un code de dépôt à {n} chiffres. Après {essais} essais faux, le lot est bloqué {h} h : appelez le support.', valeurs: { n: P.code.longueur, essais: P.code.essais, h: P.code.blocageHeures } },
      { titre: 'Colis par colis', texte: 'Scannez chaque colis, regardez le scellé et l’étiquette : conforme, réserve (avec photo) ou refus (avec photo, il repart avec le livreur).' },
      { titre: 'La photo du lot', texte: 'Une photo de tous les colis visibles, puis votre PIN : sans photo, la réception reste bloquée. L’application vous donne l’emplacement de chaque colis.' },
    ],
    questions: [
      { id: 'q1', texte: 'Le livreur arrive avec un lot. Que lui demandez-vous d’abord ?', choix: ['Le nom du client', 'Le code de dépôt', 'Le code de retrait'], bonne: 1 },
      { id: 'q2', texte: 'Un colis a un scellé déchiré.', choix: ['Je pose une réserve avec une photo', 'Je le reçois sans rien dire', 'Je l’ouvre pour vérifier'], bonne: 0 },
      { id: 'q3', texte: 'Sans photo du lot, la réception…', choix: ['est validée par le livreur', 'peut être validée plus tard', 'reste bloquée'], bonne: 2 },
    ],
  },
  {
    id: 'm2',
    titre: 'Retrait, codes et tiers',
    resume: 'Code présenté par le client, porteur désigné et sa pièce, photo de remise, PIN.',
    obligatoire: true,
    minutes: 10,
    icone: 'r-cle',
    lecons: [
      { titre: 'Le code du client', texte: 'Le client vous montre son code à {n} chiffres ou son QR. Vous ne voyez jamais le code dans l’application : vous saisissez ce qu’on vous présente.', valeurs: { n: P.code.longueur } },
      { titre: 'Le porteur désigné', texte: 'Quand le client a désigné un porteur, vérifiez sa pièce : c’est le seul nom que l’application vous montre.' },
      { titre: 'La remise', texte: 'Une photo du colis remis, puis votre PIN : chaque remise porte votre nom au journal.' },
    ],
    questions: [
      { id: 'q1', texte: 'Qui vous donne le code de retrait ?', choix: ['L’application', 'Le livreur', 'Le client'], bonne: 2 },
      { id: 'q2', texte: 'Le porteur désigné par le client se présente.', choix: ['Je vérifie sa pièce', 'Je remets sur un simple appel', 'Je refuse toujours'], bonne: 0 },
      { id: 'q3', texte: 'Avant « Colis remis », il faut…', choix: ['une signature sur papier', 'la photo de remise et mon PIN', 'rien de plus'], bonne: 1 },
    ],
  },
  {
    id: 'm3',
    titre: 'Paiement au comptoir',
    resume: 'Garde payée en espèces et encaissement confirmé avant la remise ; commande à payer en Mobile Money seulement.',
    obligatoire: true,
    minutes: 8,
    icone: 'r-telephone',
    lecons: [
      { titre: 'La garde en espèces', texte: 'La garde se paie en espèces, à vous, au retrait. Vous confirmez l’encaissement dans l’application : sans confirmation, la remise reste bloquée. Vous gardez {part} F par jour facturé ; le reste revient à BelivaY au versement du vendredi.', valeurs: { part: P.garde.gainRelaisJour } },
      { titre: 'La commande à payer au comptoir', texte: 'Le client paie en Mobile Money sur son téléphone, jamais en espèces. Le paiement exige le réseau : hors connexion, la remise attend.' },
      { titre: 'Le code après paiement', texte: 'Le client ne reçoit son code qu’après le paiement : ne remettez jamais un colis sans code valide.' },
    ],
    questions: [
      { id: 'q1', texte: 'Le client doit une garde.', choix: ['Il paie par Mobile Money', 'Il paie en espèces, je confirme l’encaissement, puis je remets', 'Je remets, il paiera plus tard'], bonne: 1 },
      { id: 'q2', texte: 'Une commande est à payer au comptoir.', choix: ['En Mobile Money seulement', 'En espèces', 'Au choix du client'], bonne: 0 },
      { id: 'q3', texte: 'Le réseau est coupé et la commande est à payer au comptoir.', choix: ['J’encaisse en espèces', 'Je remets, le client paiera après', 'La remise attend le réseau'], bonne: 2 },
    ],
  },
  {
    id: 'm4',
    titre: 'Constat de litige',
    resume: 'Motif et photos ; le relais constate, BelivaY décide.',
    obligatoire: true,
    minutes: 10,
    icone: 'r-balance',
    lecons: [
      { titre: 'Constater', texte: 'Un constat porte un motif (non conforme, abîmé, contrefaçon) et au moins {n} photos. Vous ne tranchez jamais : BelivaY décide.', valeurs: { n: P.constatPhotosMin } },
      { titre: 'Le défaut caché', texte: 'Un défaut découvert après le retrait se déclare par le client, depuis son application.' },
    ],
    questions: [
      { id: 'q1', texte: 'Qui décide d’un litige ?', choix: ['Le gérant', 'BelivaY', 'Le livreur'], bonne: 1 },
      { id: 'q2', texte: 'Un constat exige…', choix: ['un motif et des photos', 'un appel au vendeur', 'un remboursement'], bonne: 0 },
      { id: 'q3', texte: 'Le client découvre un défaut caché chez lui.', choix: ['Je fais un constat au comptoir', 'Je le rembourse', 'Il le déclare depuis son application'], bonne: 2 },
    ],
  },
  {
    id: 'm5',
    titre: 'Dépôt des retours',
    resume: 'Retour validé, scellé et photographié ; jamais facturé, hors de vos places.',
    obligatoire: true,
    minutes: 6,
    icone: 'r-annuler',
    lecons: [
      { titre: 'Recevoir un retour', texte: 'Un retour se reçoit seulement validé par BelivaY : scellé du retour et {n} photos.', valeurs: { n: P.retourPhotos } },
      { titre: 'Hors de vos places', texte: 'Un retour ne compte jamais dans vos places et n’est jamais facturé : il part avec la prochaine collecte.' },
    ],
    questions: [
      { id: 'q1', texte: 'Un retour déposé compte-t-il dans vos places ?', choix: ['Oui', 'Non, jamais', 'Seulement s’il est encombrant'], bonne: 1 },
      { id: 'q2', texte: 'Pour enregistrer un retour, il faut…', choix: ['l’accord du vendeur par téléphone', 'rien de plus', 'le scellé du retour et les photos'], bonne: 2 },
      { id: 'q3', texte: 'Le client paie-t-il une garde sur un retour ?', choix: ['Non', 'Oui', 'Après le 7e jour'], bonne: 0 },
    ],
  },
  {
    id: 'm6',
    titre: 'Servir en anglais',
    resume: 'Les phrases du comptoir pour les clients anglophones.',
    obligatoire: false,
    minutes: 15,
    icone: 'r-globe',
    lecons: [
      { titre: 'Accueillir', texte: '« Good morning, are you here to collect a parcel? » · « Please show me your pickup code. »' },
      { titre: 'La garde', texte: '« There is a storage fee to pay in cash. » · « Here is your change. »' },
    ],
    questions: [
      { id: 'q1', texte: '« Your parcel is ready » veut dire…', choix: ['Votre colis est parti', 'Votre colis est prêt', 'Votre colis est perdu'], bonne: 1 },
      { id: 'q2', texte: 'Pour demander le code au client :', choix: ['« Please show me your pickup code. »', '« Please pay the delivery. »', '« Please open the parcel. »'], bonne: 0 },
      { id: 'q3', texte: '« Storage fee » désigne…', choix: ['la livraison', 'le retour', 'la garde'], bonne: 2 },
    ],
  },
]
const formationDe = (faits: number, le: number): ModuleFormation[] =>
  MODULES.map((m, k) => ({ id: m.id, titre: m.titre, resume: m.resume, obligatoire: m.obligatoire, minutes: m.minutes, statut: k < faits ? 'termine' : 'a_faire', score: k < faits ? 100 : null, termineLe: k < faits ? le : null }))

/** Un membre entre dans l'équipe avec sa formation à faire (DRO-01) : appelé par « Mon équipe » (ajouterEmploye) et par
 * l'invitation acceptée (domaine « acces ») ; ne fait rien s'il y est déjà. */
export function accueillirMembre(m: Membre, telephone: string) {
  etatRelais.ecrire((e) => {
    if (!e.equipe.some((x) => x.id === m.id)) e.equipe.push(m)
    e.telephones[m.id] = telephone
    e.formation[m.id] ??= formationDe(0, 0)
  })
}

const DROITS_EMPLOYE: Droit[] = ['recevoir', 'remettre', 'faire_partir', 'fermeture_jour', 'historique']
const permis = (d: Droit[]) => d.filter((x) => DROITS_EMPLOYE.includes(x))

export const etatRelais = magasin('relais', () => ({
  statut: (scenario() === 'suspendu' ? 'suspendu' : scenario() === 'ferme' ? 'ferme_temporaire' : scenario() === 'configuration' ? 'en_configuration' : scenario() === 'candidat' ? 'candidat' : 'ouvert') as StatutRelais,
  statutDepuis: scenario() === 'suspendu' ? h(9, 0) : scenario() === 'neuf' ? oct(12, 8, 0) : RELAIS.ouvertLe,
  motif: scenario() === 'suspendu' ? 'Trois remises sans photo la semaine dernière : suspension de 7 jours, validée par une personne de BelivaY.' : null,
  ouvertLe: scenario() === 'neuf' ? oct(12, 8, 0) : RELAIS.ouvertLe,
  placesDeclarees: RELAIS.placesDeclarees,
  demandeCapacite: null as FicheRelais['capacite']['demandeEnCours'],
  equipe: [ROSE, ...(sansHistorique() ? [] : [PAUL])] as Membre[],
  telephones: { ...TELEPHONES } as Record<string, string>,
  formation: { 'm-rose': formationDe(6, RELAIS.ouvertLe - 3 * JOUR), 'm-paul': formationDe(5, RELAIS.ouvertLe + 20 * JOUR) } as Record<string, ModuleFormation[]>,
  pinReinitialise: [] as string[],
  codeEquipe: null as { expireA: number } | null,
  parametres: { langue: 'fr' } as FicheRelais['parametres'],
  appareils: [
    { id: 'ap-1', nom: 'Tecno Camon 20', membre: 'RM', membreId: 'm-rose', dernierAcces: h(14, 1), ceAppareil: true },
    { id: 'ap-2', nom: 'Itel A70', membre: 'PE', membreId: 'm-paul', dernierAcces: h(13, 40), ceAppareil: false },
  ] as FicheRelais['appareils'],
  documents: [
    { type: 'identite', statut: 'valide', facultatif: false, detail: 'CNI recto verso + selfie vidéo', verifieLe: yaoundeJuillet(), expireLe: oct(1, 0, 0) + 4 * 365 * JOUR + 150 * JOUR, demande: null, motifRefus: null },
    { type: 'activite', statut: 'valide', facultatif: false, detail: 'Attestation de commerce', verifieLe: yaoundeJuillet(), expireLe: null, demande: null, motifRefus: null },
    { type: 'numero_versement', statut: 'valide', facultatif: false, detail: `${NUMERO_VERSEMENT.operateur} ···· ${NUMERO_VERSEMENT.fin}`, verifieLe: yaoundeJuillet(), expireLe: null, demande: null, motifRefus: null },
    { type: 'photos_relais', statut: 'valide', facultatif: false, detail: 'Façade, comptoir, rangement', verifieLe: yaoundeJuillet(), expireLe: null, demande: null, motifRefus: null },
    { type: 'visite', statut: 'valide', facultatif: false, detail: 'Contrôle sur place et séance pratique', verifieLe: yaoundeJuillet(), expireLe: null, demande: null, motifRefus: null },
    { type: 'niu', statut: 'a_fournir', facultatif: true, detail: 'NIU ou patente', verifieLe: null, expireLe: null, demande: null, motifRefus: null },
  ] as FicheRelais['documents'],
  ficheDemandee: null as FicheRelais['ficheDemandee'],
  donneesDemandees: null as FicheRelais['donneesDemandees'],
  finDemandee: null as number | null,
  finMotif: '',
  cles: [] as string[],
}))
/** Vérification du dossier : 14 juillet 2026, la veille de l'ouverture du relais (jeu d'essai). */
function yaoundeJuillet() {
  return RELAIS.ouvertLe - JOUR + 2 * 3600_000
}

/** Un geste du gérant déjà appliqué (même clé) n'a jamais deux effets. */
const deja = (o: Origine) => etatRelais.lire().cles.includes(o.cle)
const proprietaire = () => membreActuel()?.role === 'proprietaire'
const codeOk = (code: string) => {
  const c = etatRelais.lire().codeEquipe
  return !!c && c.expireA > maintenant() && code === CODE_SMS_DEMO
}
/** Photo de profil encodée (data URL) : au plus 200 Ko (une image de 320 × 320 en JPEG en fait 20 à 40). */
const PHOTO_PROFIL_MAX = 200_000
const hm = /^([01]\d|2[0-3]):[0-5]\d$/
const plageValide = (p: PlageJour) =>
  p.ferme ? true : !!p.ouverture && !!p.fermeture && hm.test(p.ouverture) && hm.test(p.fermeture) && p.ouverture < p.fermeture && (!p.pause || (hm.test(p.pause.de) && hm.test(p.pause.a) && p.ouverture < p.pause.de && p.pause.de < p.pause.a && p.pause.a < p.fermeture))
/** PIN trop simple (INV-02) : mauvaise longueur, répétition, suite. */
const pinSimple = (pin: string) => !new RegExp(`^\\d{${C.pinLongueur}}$`).test(pin) || /^(\d)\1+$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin)

/** Document du relais nommé par la console (« CNI », « attestation de commerce », « photos »…), sinon null. */
function documentNomme(nature: string): TypeDocument | null {
  const n = nature.toLowerCase()
  if (/identit|cni|selfie/.test(n)) return 'identite'
  if (/activit|commerce|registre/.test(n)) return 'activite'
  if (/photo/.test(n)) return 'photos_relais'
  if (/niu|patente/.test(n)) return 'niu'
  return null
}
/**
 * Décision KYC de la console sur le relais (pont : kyc_decide) : approuvé, ses documents en vérification sont validés
 * et un candidat passe en configuration ; complément ou refus, les documents visés sont refusés avec leur motif.
 */
export function decisionKycRelais(decision: 'approuve' | 'rejete' | 'complement', pieces: { nature: string; motif: string | null }[], le: number) {
  etatRelais.ecrire((e) => {
    if (decision === 'approuve') {
      for (const d of e.documents) if (d.statut === 'en_verification') Object.assign(d, { statut: 'valide', verifieLe: le, demande: null, motifRefus: null })
      if (e.statut === 'candidat') e.statut = 'en_configuration'
      return
    }
    for (const p of pieces.filter((x) => x.motif)) {
      const d = e.documents.find((x) => x.type === documentNomme(p.nature)) ?? e.documents.find((x) => x.statut === 'en_verification')
      if (d) Object.assign(d, { statut: 'refuse', motifRefus: p.motif })
    }
  })
}
/** Sanction de la console sur le relais (pont : sanction_decidee) : niveau 3 et plus en vigueur, relais suspendu ; levée, il rouvre. */
export function sanctionRelais(niveau: number, etat: string) {
  etatRelais.ecrire((e) => {
    if (etat === 'vigueur' && niveau >= 3 && e.statut === 'ouvert') e.statut = 'suspendu'
    else if ((etat === 'levee' || etat === 'classee') && e.statut === 'suspendu') e.statut = 'ouvert'
  })
}

/**
 * Fin de convention décidée par la console (pont : convention_terminee) : à compter de `effet`, plus aucun nouveau colis
 * (relais clos au dépôt) ; les colis encore en garde partent avec les prochaines collectes (motif « fermeture »).
 */
export function finConvention(effet: number, le: number) {
  etatRelais.ecrire((e) => {
    if (effet <= le && e.statut !== 'clos') e.statut = 'clos'
  })
  etatColis.ecrire((e) => {
    for (const c of Object.values(e.colis))
      if (['en_stock', 'dernier_jour', 'en_groupage', 'a_renvoyer'].includes(c.etat)) {
        c.etat = 'a_faire_partir'
        c.sortie = { motif: 'fermeture', destination: c.sortie?.destination ?? null, collecte: null, le }
      }
  })
}

export const demoRelais: DomaineRelais = {
  relais() {
    const e = etatRelais.lire()
    const c = etatCalendrier.lire()
    const colis = tousLesColis()
    const o = occupationDuRelais(e.placesDeclarees, colis)
    const palier = palierDe(etatQualite.lire().score)
    const fiche: FicheRelais = {
      id: RELAIS.id,
      nom: RELAIS.nom,
      quartier: RELAIS.quartier,
      zone: RELAIS.zone,
      zoneCode: RELAIS.zoneCode,
      position: { ...RELAIS.position },
      ville: 'Yaoundé',
      repere: RELAIS.repere,
      statut: e.statut,
      ouvertLe: e.ouvertLe,
      fondateur: RELAIS.fondateur,
      verifie: e.documents.every((d) => d.facultatif || d.statut === 'valide'),
      capacite: {
        placesDeclarees: e.placesDeclarees,
        occupees: o.occupees,
        retoursDeposes: colis.filter((x) => x.etat === 'retour_depose').length,
        placesParClasse: { ...P.places },
        seuilPct: P.capaciteSeuilPct,
        hausseADistancePct: palier === 'Starter' ? null : REGLES.hausseADistancePct,
        demandeEnCours: e.demandeCapacite,
        etageres: (['A', 'B', 'C'] as const).map((x) => ({ etagere: x, cases: PLAN.filter((k) => k.etagere === x).length, places: PLAN.filter((k) => k.etagere === x).reduce((n, k) => n + k.capacite, 0) })),
      },
      horaires: { semaine: c.semaine, demandeEnCours: c.demandeHoraires },
      equipe: e.equipe,
      equipeMax: P.equipeMax,
      documents: e.documents,
      formation: e.formation,
      formationModules: P.formationModules,
      parametres: e.parametres,
      appareils: e.appareils,
      ficheDemandee: e.ficheDemandee,
      donneesDemandees: e.donneesDemandees,
      fin: e.finDemandee ? { demandeeLe: e.finDemandee, effetLe: e.finDemandee + P.finPreavisJours * JOUR, sansColisDes: e.finDemandee + (P.finPreavisJours - P.finSansColisJours) * JOUR, motif: e.finMotif } : null,
      regles: {
        finPreavisJours: P.finPreavisJours,
        finSansColisJours: P.finSansColisJours,
        documentAlerteJours: P.documentAlerteJours,
        preuvesJours: P.preuvesConservationJours,
        donneesDelaiJours: REGLES.donneesDelaiJours,
        invitationHeures: REGLES.invitationHeures,
        codeSmsMinutes: C.codeSmsDureeMin,
        heuresCalmes: P.heuresCalmes,
        grillePreavisJours: REGLES.grillePreavisJours,
        pinLongueur: C.pinLongueur,
      },
    }
    return repondre(fiche)
  },
  async demanderCapacite(places, o) {
    if (!proprietaire()) return { ok: false, raison: 'droit_refuse' }
    if (!Number.isInteger(places) || places <= 0) return { ok: false, raison: 'invalide' }
    const e = etatRelais.lire()
    if (deja(o)) return { ok: true, verification: e.demandeCapacite?.verification ?? 'visite' }
    if (e.demandeCapacite) return { ok: false, raison: 'deja_demandee' }
    if (places === e.placesDeclarees) return { ok: false, raison: 'identique' }
    // CAP-01 : jamais sous les places occupées (les retours déposés n'y sont pas).
    if (places < occupationDuRelais(e.placesDeclarees).occupees) return { ok: false, raison: 'sous_occupees' }
    const sens = places > e.placesDeclarees ? 'hausse' : 'baisse'
    const palier = palierDe(etatQualite.lire().score)
    const verification = sens === 'baisse' || (palier !== 'Starter' && places <= Math.floor(e.placesDeclarees * (1 + REGLES.hausseADistancePct / 100))) ? 'distance' : 'visite'
    etatRelais.ecrire((x) => void ((x.demandeCapacite = { places, le: o.heure, sens, verification }), x.cles.push(o.cle)))
    return { ok: true, verification }
  },
  async annulerDemandeCapacite(o) {
    if (!proprietaire()) return { ok: false, raison: 'droit_refuse' }
    if (deja(o)) return { ok: true }
    if (!etatRelais.lire().demandeCapacite) return { ok: false, raison: 'aucune_demande' }
    etatRelais.ecrire((x) => void ((x.demandeCapacite = null), x.cles.push(o.cle)))
    return { ok: true }
  },
  async demanderHoraires(semaine, o) {
    if (!proprietaire()) return { ok: false, raison: 'droit_refuse' }
    if (deja(o)) return { ok: true }
    if (semaine.length !== 7 || !semaine.every(plageValide) || semaine.every((p) => p.ferme)) return { ok: false, raison: 'invalide' }
    if (JSON.stringify(semaine) === JSON.stringify(etatCalendrier.lire().semaine)) return { ok: false, raison: 'identique' }
    if (etatCalendrier.lire().demandeHoraires) return { ok: false, raison: 'deja_demandee' }
    etatCalendrier.ecrire((c) => void (c.demandeHoraires = { semaine, le: o.heure }))
    etatRelais.ecrire((x) => void x.cles.push(o.cle))
    return { ok: true }
  },
  async annulerDemandeHoraires(o) {
    if (!proprietaire()) return { ok: false, raison: 'droit_refuse' }
    if (deja(o)) return { ok: true }
    if (!etatCalendrier.lire().demandeHoraires) return { ok: false, raison: 'aucune_demande' }
    etatCalendrier.ecrire((c) => void (c.demandeHoraires = null))
    etatRelais.ecrire((x) => void x.cles.push(o.cle))
    return { ok: true }
  },
  async demanderCodeEquipe(o) {
    if (!proprietaire()) return { ok: false, raison: 'droit_refuse' }
    const expireA = o.heure + C.codeSmsDureeMin * 60_000
    etatRelais.ecrire((e) => void (e.codeEquipe = { expireA }))
    return { ok: true, expireA }
  },
  async ajouterEmploye(x, code, o) {
    if (!proprietaire()) return { ok: false, raison: 'droit_refuse' }
    const id = 'm-' + o.cle.slice(0, 8)
    if (deja(o)) return { ok: true, id }
    if (etatRelais.lire().equipe.filter((m) => m.role === 'employe').length >= P.equipeMax) return { ok: false, raison: 'equipe_complete' }
    const tel = x.telephone.replace(/\D/g, '').replace(/^237/, '')
    if (!x.prenom.trim() || !x.nom.trim() || !/^6\d{8}$/.test(tel) || !permis(x.droits).length) return { ok: false, raison: 'invalide' }
    if (!codeOk(code)) return { ok: false, raison: 'code_faux' }
    const m: Membre = { id, prenom: x.prenom.trim(), nom: x.nom.trim(), initiales: (x.prenom.trim()[0] + x.nom.trim()[0]).toUpperCase(), role: 'employe', droits: permis(x.droits), photo: null, formationOk: false }
    accueillirMembre(m, tel)
    etatRelais.ecrire((e) => {
      e.codeEquipe = null
      e.cles.push(o.cle)
    })
    // Le SMS d'invitation part au téléphone de l'employé : il crée son PIN par ce lien (domaine « acces », ARL-56).
    creerInvitation({ membreId: id, prenom: m.prenom, nom: m.nom, telephone: tel, droits: m.droits }, o.heure)
    return { ok: true, id }
  },
  async retirerEmploye(id, code, o) {
    if (!proprietaire()) return { ok: false, raison: 'droit_refuse' }
    if (deja(o)) return { ok: true }
    if (!etatRelais.lire().equipe.some((m) => m.id === id && m.role === 'employe')) return { ok: false, raison: 'introuvable' }
    if (!codeOk(code)) return { ok: false, raison: 'code_faux' }
    // EQU-03 : retrait immédiat ; ses appareils sont déliés, sa session tombe (le serveur ferme ses jetons).
    etatRelais.ecrire((e) => {
      e.equipe = e.equipe.filter((m) => m.id !== id)
      e.appareils = e.appareils.filter((a) => a.membreId !== id)
      delete e.telephones[id]
      e.codeEquipe = null
      e.cles.push(o.cle)
    })
    if (etatSession.lire().membreId === id) etatSession.ecrire((s) => void (s.membreId = null))
    return { ok: true }
  },
  async reglerDroits(id, droits, o) {
    if (!proprietaire()) return { ok: false, raison: 'droit_refuse' }
    if (!etatRelais.lire().equipe.some((m) => m.id === id && m.role === 'employe')) return { ok: false, raison: 'introuvable' }
    // Jamais l'argent ni la gestion pour un employé (DRO-03, ARL-06) ; au moins un droit (sinon : retirer l'accès).
    if (!permis(droits).length) return { ok: false, raison: 'invalide' }
    if (!deja(o)) etatRelais.ecrire((e) => void ((e.equipe.find((m) => m.id === id)!.droits = permis(droits)), e.cles.push(o.cle)))
    return { ok: true }
  },
  async reinitialiserPin(id, o) {
    if (!proprietaire()) return { ok: false, raison: 'droit_refuse' }
    if (!etatRelais.lire().equipe.some((m) => m.id === id && m.role === 'employe')) return { ok: false, raison: 'introuvable' }
    if (!deja(o)) etatRelais.ecrire((e) => void (e.pinReinitialise.includes(id) || e.pinReinitialise.push(id), e.cles.push(o.cle)))
    return { ok: true }
  },
  module(id) {
    const m = MODULES.find((x) => x.id === id)
    return repondre(m ? { id, lecons: m.lecons, questions: m.questions.map(({ id: q, texte, choix }) => ({ id: q, texte, choix })), seuilPct: REGLES.quizSeuilPct } : null)
  },
  async repondreQuiz(membreId, module, reponses, o) {
    const m = MODULES.find((x) => x.id === module)
    const moi = membreActuel()
    if (!m || !etatRelais.lire().formation[membreId]) return { ok: false, raison: 'introuvable' }
    // Chacun suit sa formation : jamais un quiz pour un autre (FOR-02).
    if (!moi || moi.id !== membreId) return { ok: false, raison: 'droit_refuse' }
    if (reponses.length !== m.questions.length) return { ok: false, raison: 'invalide' }
    const fausses = m.questions.filter((q, k) => reponses[k] !== q.bonne).map((q) => q.id)
    const score = Math.round(((m.questions.length - fausses.length) / m.questions.length) * 100)
    const reussi = score >= REGLES.quizSeuilPct
    if (reussi && !deja(o))
      etatRelais.ecrire((e) => {
        Object.assign(e.formation[membreId].find((x) => x.id === module)!, { statut: 'termine', score, termineLe: o.heure })
        const faits = e.formation[membreId].filter((x) => x.obligatoire && x.statut === 'termine').length
        const membre = e.equipe.find((x) => x.id === membreId)
        if (membre) membre.formationOk = faits >= P.formationModules
        e.cles.push(o.cle)
      })
    return { ok: true, score, reussi, fausses }
  },
  async reglerParametres(p, o) {
    if (p.langue !== undefined && p.langue !== 'fr' && p.langue !== 'en') return { ok: false, raison: 'invalide' }
    if (!deja(o)) etatRelais.ecrire((e) => void (Object.assign(e.parametres, p), e.cles.push(o.cle)))
    return { ok: true }
  },
  async deconnecterAppareil(id, o) {
    if (!proprietaire()) return { ok: false, raison: 'droit_refuse' }
    if (deja(o)) return { ok: true }
    if (!etatRelais.lire().appareils.some((a) => a.id === id && !a.ceAppareil)) return { ok: false, raison: 'introuvable' }
    etatRelais.ecrire((e) => void ((e.appareils = e.appareils.filter((a) => a.id !== id)), e.cles.push(o.cle)))
    return { ok: true }
  },
  async envoyerDocument(type: TypeDocument, photo, o) {
    if (!proprietaire()) return { ok: false, raison: 'droit_refuse' }
    if (deja(o)) return { ok: true }
    const d = etatRelais.lire().documents.find((x) => x.type === type)
    if (!d || !photo) return { ok: false, raison: 'introuvable' }
    const bientot = d.expireLe !== null && d.expireLe - o.heure <= P.documentAlerteJours * JOUR
    // Le numéro de versement se change par son propre parcours (PR-09) ; la visite est faite par BelivaY.
    if (type === 'numero_versement' || type === 'visite') return { ok: false, raison: 'non_demandee' }
    if (!(d.demande || bientot || d.statut === 'refuse' || d.statut === 'expire' || d.statut === 'a_fournir')) return { ok: false, raison: 'non_demandee' }
    etatRelais.ecrire((e) => {
      Object.assign(e.documents.find((x) => x.type === type)!, { statut: 'en_verification', demande: null, motifRefus: null })
      e.cles.push(o.cle)
    })
    // Vers la console : les pièces en vérification du relais attendent la revue KYC de BelivaY (ADM-P09).
    demanderActivation('relais', RELAIS_DEMO.id, `DOCS-${RELAIS_DEMO.id}-${type}`, etatRelais.lire().documents.filter((x) => x.statut === 'en_verification').length, o.heure)
    return { ok: true }
  },
  contrat() {
    const e = etatRelais.lire()
    const x = (texte: string, valeurs?: TexteRegle['valeurs']): TexteRegle => ({ texte, valeurs })
    const contrat: Contrat = {
      convention: {
        version: '1.0',
        du: oct(1, 0, 0) - 10 * JOUR,
        signeeLe: oct(1, 0, 0) - 7 * JOUR + 10 * 3600_000, // v1.0 acceptée dans l'application (PR-CT01-R20)
        signataire: `${ROSE.prenom} ${ROSE.nom[0]}.`,
        articles: [
          { numero: 2, titre: 'Objet', points: [x('Recevoir les lots, garder les colis, les remettre aux clients, recevoir les retours validés, faire partir les colis et déclarer les constats.')] },
          { numero: 3, titre: 'Indépendance', points: [x('Aucun lien de subordination : vous gardez votre commerce et vos obligations fiscales et sociales.')] },
          { numero: 5, titre: 'Le local et les places', points: [x('Colis à l’abri, hors de la vue du public, sur les emplacements attribués.'), x('Places déclarées jamais sous les places occupées ; un changement est une demande validée par BelivaY.'), x('Au-delà de {p} % d’occupation, plus de nouveaux colis : les clients sont orientés ailleurs.', { p: P.capaciteSeuilPct })] },
          { numero: 7, titre: 'L’équipe', points: [x('{n} employés au plus, chacun avec son PIN et formé avant sa première remise.', { n: P.equipeMax }), x('Ajouter ou retirer un accès demande un code SMS sur votre téléphone personnel.')] },
          { numero: 9, titre: 'La garde et les espèces', points: [x('La garde se paie en espèces au gérant au retrait ; vous gardez votre part, le reste revient à BelivaY au versement du vendredi.')] },
          { numero: 14, titre: 'Responsabilité', points: [x('Perte fautive : valeur nette du colis, au plus la moitié d’un versement, après arbitrage sur preuves ; contestable.')] },
          { numero: 17, titre: 'Données personnelles', points: [x('Preuves gardées {j} jours ; vous pouvez demander vos données (loi n° 2024/017).', { j: P.preuvesConservationJours })] },
          { numero: 20, titre: 'Durée et fin', points: [x('Durée indéterminée ; fin demandée avec un préavis de {j} jours, prononcée par BelivaY.', { j: P.finPreavisJours }), x('Les {j} derniers jours, plus de nouveaux colis ; dernier versement le vendredi suivant la clôture.', { j: P.finSansColisJours })] },
        ],
      },
      annexes: [
        {
          id: 'annexe1',
          titre: 'Annexe 1 · Rémunération et grille de garde',
          points: [
            x('Par colis remis ou retour déposé : {s} F (petit), {m} F (moyen), {l} F (encombrant).', { s: P.gainColis.S, m: P.gainColis.M, l: P.gainColis.L }),
            x('Garde du 1er au 7e jour : {grille} F, payée en espèces au retrait.', { grille: P.garde.grille.join(' · ') }),
            x(P.garde.j1PayeParBelivay ? 'Votre part : {p} F par jour facturé, 1er jour payé par BelivaY.' : 'Votre part : {p} F par jour facturé.', { p: P.garde.gainRelaisJour }),
            x('Versement chaque vendredi, sans frais, sur votre numéro de versement vérifié.'),
          ],
        },
        { id: 'annexe2', titre: 'Annexe 2 · Interdits et charte de preuve', points: [x('Photo à chaque changement de main : sans photo, l’étape reste bloquée.'), x('Jamais de remise sans code valide ; jamais de colis ouvert hors d’un constat.'), x('Jamais un accès prêté : chacun son PIN.'), x('Jamais de photo ni de copie de données hors de l’application.'), x('Le relais constate, BelivaY décide.')] },
        { id: 'annexe3', titre: 'Annexe 3 · Fiche d’ouverture du relais', points: [x('Remplie avec vous pendant la visite BelivaY : ce que vous avez déclaré et ce que BelivaY a vérifié.')] },
      ],
      fiche: {
        remplieLe: e.ouvertLe - JOUR,
        agent: 'Hugues T.',
        emplacements: [
          ...(['A', 'B', 'C'] as const).map((x) => ({ code: x, places: PLAN.filter((k) => k.etagere === x).reduce((n, k) => n + k.capacite, 0), verifie: true })),
          { code: 'R' as const, places: null, verifie: true },
        ],
        local: { abri: true, horsDeVue: true, photos: true },
        etapes: [
          { id: 'dossier', titre: 'Dossier du gérant', le: e.ouvertLe - 9 * JOUR },
          { id: 'numero', titre: 'Numéro de versement vérifié', le: e.ouvertLe - 8 * JOUR },
          { id: 'convention', titre: 'Convention signée', le: e.ouvertLe - 6 * JOUR },
          { id: 'visite', titre: 'Visite BelivaY et séance pratique', le: e.ouvertLe - JOUR },
          { id: 'formation', titre: 'Formation : modules obligatoires', le: e.ouvertLe - 3 * JOUR },
          { id: 'capacite', titre: 'Capacité et horaires déclarés', le: e.ouvertLe - JOUR },
        ],
        ouvertLe: e.ouvertLe,
        fondateur: RELAIS.fondateur ? { numero: 7, sur: REGLES.fondateurs, exclusiviteM: REGLES.exclusiviteM, exclusiviteJusquau: (() => { const d = new Date(e.ouvertLe); d.setUTCMonth(d.getUTCMonth() + REGLES.exclusiviteMois); return d.getTime() })() } : null,
        grille: 'standard',
      },
    }
    return repondre(contrat)
  },
  async demanderModificationFiche(f, o) {
    if (!proprietaire()) return { ok: false, raison: 'droit_refuse' }
    if (deja(o)) return { ok: true }
    if (!f.nom.trim() || !f.repere.trim() || !f.motif.trim()) return { ok: false, raison: 'invalide' }
    if (f.nom.trim() === RELAIS.nom && f.repere.trim() === RELAIS.repere) return { ok: false, raison: 'identique' }
    if (etatRelais.lire().ficheDemandee) return { ok: false, raison: 'deja_demandee' }
    etatRelais.ecrire((e) => void ((e.ficheDemandee = { nom: f.nom.trim(), repere: f.repere.trim(), motif: f.motif.trim(), le: o.heure }), e.cles.push(o.cle)))
    return { ok: true }
  },
  async changerPin(ancien, nouveau, o) {
    const s = etatSession.lire()
    if (!s.membreId) return { ok: false, raison: 'droit_refuse' }
    if (deja(o)) return { ok: true }
    if (s.bloqueJusqua && s.bloqueJusqua > o.heure) return { ok: false, raison: 'bloque' }
    const cle = (pin: string) => empreinte(s.membreId + ':' + pin)
    if (s.empreintes[s.membreId] !== cle(ancien)) {
      etatSession.ecrire((x) => {
        x.pinFaux += 1
        if (x.pinFaux >= C.pinEssais) Object.assign(x, { pinFaux: 0, bloqueJusqua: o.heure + C.pinBlocageMin * 60_000 })
      })
      return { ok: false, raison: etatSession.lire().bloqueJusqua ? 'bloque' : 'pin_faux' }
    }
    if (ancien === nouveau) return { ok: false, raison: 'identique' }
    if (pinSimple(nouveau)) return { ok: false, raison: 'pin_trop_simple' }
    etatSession.ecrire((x) => void ((x.empreintes[s.membreId!] = cle(nouveau)), (x.pinFaux = 0)))
    etatRelais.ecrire((e) => void e.cles.push(o.cle))
    return { ok: true }
  },
  async demanderDonnees(o) {
    const e = etatRelais.lire()
    if (e.donneesDemandees) return deja(o) ? { ok: true, pretLe: e.donneesDemandees.pretLe } : { ok: false, raison: 'deja_demandee' }
    const pretLe = o.heure + REGLES.donneesDelaiJours * JOUR
    etatRelais.ecrire((x) => void ((x.donneesDemandees = { le: o.heure, pretLe }), x.cles.push(o.cle)))
    return { ok: true, pretLe }
  },
  async demanderFin(motif, o) {
    if (!proprietaire()) return { ok: false, raison: 'droit_refuse' }
    const e = etatRelais.lire()
    if (e.finDemandee) return deja(o) ? { ok: true, effetLe: e.finDemandee + P.finPreavisJours * JOUR } : { ok: false, raison: 'deja_demandee' }
    if (!motif.trim()) return { ok: false, raison: 'invalide' }
    etatRelais.ecrire((x) => void ((x.finDemandee = o.heure), (x.finMotif = motif.trim()), x.cles.push(o.cle)))
    return { ok: true, effetLe: o.heure + P.finPreavisJours * JOUR }
  },
  async annulerFin(o) {
    if (!proprietaire()) return { ok: false, raison: 'droit_refuse' }
    if (deja(o)) return { ok: true }
    if (!etatRelais.lire().finDemandee) return { ok: false, raison: 'aucune_demande' }
    etatRelais.ecrire((x) => void ((x.finDemandee = null), (x.finMotif = ''), x.cles.push(o.cle)))
    return { ok: true }
  },
  async changerPhoto(photo, o) {
    const moi = membreActuel()
    if (!moi) return { ok: false, raison: 'droit_refuse' }
    if (deja(o)) return { ok: true }
    // Une image JPEG ou PNG déjà recadrée sur le téléphone (carré), jamais plus de PHOTO_PROFIL_MAX octets encodés.
    if (photo !== null && (!/^data:image\/(jpeg|png|webp);base64,/.test(photo) || photo.length > PHOTO_PROFIL_MAX)) return { ok: false, raison: 'invalide' }
    etatRelais.ecrire((e) => {
      const m = e.equipe.find((x) => x.id === moi.id)
      if (m) m.photo = photo
      e.cles.push(o.cle)
    })
    return { ok: true }
  },
  async simulerAccord(objet) {
    // Import différé : notifications lit déjà ce domaine (pas de cycle au chargement).
    const { notifier } = await import('./notifications')
    const t = maintenant()
    if (objet === 'horaires') {
      const d = etatCalendrier.lire().demandeHoraires
      if (!d) return
      etatCalendrier.ecrire((c) => void ((c.semaine = d.semaine), (c.demandeHoraires = null)))
      notifier({ id: 'N-ACCORD-H-' + t, cle: 'relais.demande_acceptee', vars: { quoi: { fr: 'Nouveaux horaires', en: 'New opening hours' } }, route: 'capacite', quand: t })
    } else {
      const d = etatRelais.lire().demandeCapacite
      if (!d) return
      etatRelais.ecrire((e) => void ((e.placesDeclarees = d.places), (e.demandeCapacite = null)))
      notifier({ id: 'N-ACCORD-C-' + t, cle: 'relais.demande_acceptee', vars: { quoi: { fr: `${d.places} places déclarées`, en: `${d.places} declared spaces` } }, route: 'capacite', quand: t })
    }
  },
}
