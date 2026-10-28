// DONNÉES DE DÉMONSTRATION — domaine « acces » :
// - invitations : « INV-DEMO » (Nadine Ateba, invitée ce matin par Rose M., valable PR-INVITATION-H) et « INV-EXPIREE »
//   (lien de la semaine dernière, expiré : on redemande au gérant). Accepter = créer son PIN : le membre entre dans
//   l'équipe du relais (la même que « Mon équipe », src/demo/relais.ts) avec sa formation à faire (DRO-01) ;
//   l'invitation naît de relais.ajouterEmploye (PR-10, creerInvitation) et l'entrée dans l'équipe passe par
//   relais.accueillirMembre ;
// - candidature « Devenir point relais » : brouillon gardé sur le téléphone (INS-01), numéro de versement vérifié par
//   code (INS-03), relais « candidat » en console, liste d'attente hors zone de lancement (INS-05, DP-09) ;
// - activation : 6 étapes ; situation « configuration » (?demo=configuration, src/demo/scenario.ts) : relais pas encore
//   ouvert, capacité et horaires à déclarer ; situation « candidat » : une candidature envoyée, sans session ;
// - statut : décisions écrites par une personne (suspension de la situation « suspendu »), contestation une fois,
//   fin de convention demandée (relais.demanderFin, PR-10) et annulable tant qu'elle n'est pas prononcée (DP-67).
import { PARAMETRES } from '../calculs/registre'
import { PARAMETRES_MOTEURS } from '../calculs/parametres-moteurs'
import { JOUR } from '../calculs/temps'
import { ZONES_YAOUNDE } from '../calculs/zones'
import { contestation } from '../calculs/trust'
import type { Activation, Brouillon, Candidature, Decision, DomaineAcces, EtapeActivationVue, Invitation, ModuleVu, QuartierCandidat, StatutDetail } from '../donnees/domaines/acces'
import type { Droit, Membre } from '../donnees/domaines/session'
import { numeroValide, pinTropSimple, prefixeValide } from '../calculs/acces'
import { etatCalendrier } from './calendrier'
import { FILTRES, tousLesColis } from './colis'
import { maintenant } from './horloge'
import { CODE_SMS_DEMO, RELAIS, TELEPHONES, h, oct } from './jeu-essai'
import { notifier } from './notifications'
import { inviterPar } from './invitations'
import { accueillirMembre, etatRelais } from './relais'
import { scenario } from './scenario'
import { lierEtCreerPin, membreActuel } from './session'
import { magasin, repondre } from './stockage'
import { demanderActivation } from './pont-console'

scenario()
const P = PARAMETRES.relais
const C = PARAMETRES.connexion
const ACCES = PARAMETRES.acces

// ---------- Situation propre à l'accès ----------

/** ?demo=configuration : le relais de démonstration n'est pas encore ouvert (5 étapes sur 6) ; situation commune
 * (src/demo/scenario.ts). */
export function situationAcces(): 'configuration' | null {
  return scenario() === 'configuration' ? 'configuration' : null
}

// ---------- Jeu d'essai de l'accès ----------

interface InvitationDemo {
  jeton: string
  membreId: string
  prenom: string
  nom: string
  telephone: string
  droits: Droit[]
  creeLe: number
  etat: 'valide' | 'utilisee' | 'retiree'
  redemandeeLe: number | null
}

/** Table quartier → zone (logique-metier/livraison/quartiers-zones.json, carte du 23 oct. 2026, ZONES.md) et relais
 * déjà ouverts par zone : données. Libellé « Z2 Nsam » : code et nom court lus sur la carte (calculs/zones.ts). */
const NOM_ZONE = (code: string) => `${code} ${ZONES_YAOUNDE.find((z) => z.code === code)!.nom}`
const QUARTIERS: [string, string][] = (
  [
    ['Bastos', 'Z1'], ['Nlongkak', 'Z1'], ['Etoa-Meki', 'Z1'], ['Mballa', 'Z1'], ['Elig-Essono', 'Z1'], ['Etoudi', 'Z1'],
    ['Centre administratif', 'Z2'], ['Nsam', 'Z2'], ['Efoulan', 'Z2'], ['Ngoa-Ekellé', 'Z2'], ['Obili', 'Z2'],
    ['Mokolo', 'Z3'], ['Briqueterie', 'Z3'], ['Madagascar', 'Z3'], ['Cité Verte', 'Z3'], ['Tsinga', 'Z3'],
    ['Ngousso', 'Z4'], ['Nsimeyong', 'Z5'], ['Ahala', 'Z5'],
    ['Melen', 'Z6'], ['Biyem-Assi', 'Z6'], ['Etoug-Ebe', 'Z6'],
    ['Simbock', 'Z7'], ['Mendong', 'Z7'], ['Nkolbisson', 'Z8'], ['Etetak', 'Z8'],
    ['Essos', 'Z9'], ['Mvog-Ada', 'Z9'], ['Mimboman', 'Z10'], ['Mvog-Mbi', 'Z10'], ['Odza', 'Z11'], ['Ekounou', 'Z11'], ['Emana', 'Z12'],
  ] as [string, string][]
).map(([q, code]) => [q, NOM_ZONE(code)])
const RELAIS_PAR_ZONE: Record<string, number> = { [NOM_ZONE('Z1')]: 2, [NOM_ZONE('Z2')]: 1, [NOM_ZONE('Z3')]: 1, [NOM_ZONE('Z6')]: 1 }
/** Numéro de partenaire fondateur du relais de démonstration (donnée). */
const NUMERO_FONDATEUR = 12
/** Durée de la suspension de la situation « suspendu » (donnée de démonstration, dite dans le motif écrit). */
const SUSPENSION_JOURS = 7

/** Situation « candidat » : la candidature envoyée hier par Rose (numéro de la gérante du jeu d'essai). */
const CANDIDATURE_DEMO = { reference: 'CR-0412', cle: 'demo-candidat', envoyeeLe: oct(12, 18, 40), commerce: RELAIS.nom, quartier: RELAIS.quartier, zone: NOM_ZONE('Z1'), telephone: TELEPHONES['m-rose'], exploitee: true }

export const etatAcces = magasin('acces', () => ({
  invitations: [
    { jeton: 'INV-DEMO', membreId: 'm-nadine', prenom: 'Nadine', nom: 'Ateba', telephone: '655104287', droits: ['recevoir', 'remettre', 'faire_partir', 'historique'], creeLe: h(9, 30), etat: 'valide', redemandeeLe: null },
    { jeton: 'INV-EXPIREE', membreId: 'm-yves', prenom: 'Yves', nom: 'Ndongo', telephone: '670552418', droits: ['recevoir', 'remettre'], creeLe: oct(8, 10, 0), etat: 'valide', redemandeeLe: null },
  ] as InvitationDemo[],
  brouillon: null as Brouillon | null,
  codeVersement: null as { operateur: 'mtn' | 'orange'; numero: string; envoyeA: number; expireA: number } | null,
  candidatures: (scenario() === 'candidat' ? [CANDIDATURE_DEMO] : []) as { reference: string; cle: string; envoyeeLe: number; commerce: string; quartier: string; zone: string | null; telephone: string; exploitee: boolean }[],
  contestations: {} as Record<string, NonNullable<Decision['contestation']>>,
  cles: [] as string[],
}))

/** Invitation envoyée par SMS à un employé ajouté dans « Mon équipe » (relais.ajouterEmploye) : valable
 * PR-INVITATION-H ; une invitation encore valide du même membre est remplacée. */
export function creerInvitation(x: Pick<InvitationDemo, 'membreId' | 'prenom' | 'nom' | 'telephone' | 'droits'>, le: number): string {
  const jeton = 'INV-' + x.membreId.replace(/^m-/, '').toUpperCase()
  etatAcces.ecrire((e) => {
    e.invitations = e.invitations.filter((i) => i.membreId !== x.membreId || i.etat === 'utilisee')
    e.invitations.push({ jeton, ...x, creeLe: le, etat: 'valide', redemandeeLe: null })
  })
  return jeton
}

inviterPar(creerInvitation)

/** Le numéro est-il celui d'une candidature envoyée (pas encore d'espace : il s'ouvre à l'activation) ? */
export const candidatureDuNumero = (numero: string) => etatAcces.lire().candidatures.some((c) => c.telephone === numero)

const proprietaire = () => membreActuel()?.role === 'proprietaire'
const zoneDe = (quartier: string) => QUARTIERS.find(([q]) => q.toLowerCase() === quartier.trim().toLowerCase())?.[1] ?? null
const exploitee = (zone: string | null) => !!zone && ACCES.zonesExploitees.includes(zone)

function invitationVue(i: InvitationDemo): Invitation {
  const rose = etatRelais.lire().equipe.find((m) => m.role === 'proprietaire')
  const expireLe = i.creeLe + ACCES.invitationHeures * 3600_000
  return {
    relais: RELAIS.nom,
    quartier: RELAIS.quartier,
    invitePar: rose ? `${rose.prenom} ${rose.nom[0]}.` : 'BelivaY',
    prenom: i.prenom,
    role: 'employe',
    droits: i.droits,
    expireLe,
    etat: i.etat === 'utilisee' ? 'utilisee' : i.etat === 'retiree' ? 'retiree' : expireLe <= maintenant() ? 'expiree' : 'valide',
    redemandeeLe: i.redemandeeLe,
  }
}

/** Les modules du programme (« Mon relais », PR-10), remis à faire. */
function programmeDe(): ModuleVu[] {
  const f = etatRelais.lire().formation
  const modele = f['m-rose'] ?? Object.values(f)[0] ?? []
  return modele.map((m) => ({ id: m.id, titre: m.titre, minutes: m.minutes, obligatoire: m.obligatoire, statut: 'a_faire' }))
}

function decisions(): Decision[] {
  const r = etatRelais.lire()
  const c = etatAcces.lire().contestations
  const liste: Omit<Decision, 'contestation' | 'contestable'>[] = []
  if (r.statut === 'suspendu') {
    liste.push({ id: 'DEC-0031', niveau: 3, le: r.statutDepuis, jusquA: r.statutDepuis + SUSPENSION_JOURS * JOUR, motif: r.motif ?? '' })
    liste.push({ id: 'DEC-0027', niveau: 1, le: oct(2, 10, 0), jusquA: null, motif: 'Deux remises sans photo en septembre : avertissement.' })
  }
  return liste.map((d) => ({ ...d, contestation: c[d.id] ?? null, contestable: !c[d.id] && d.niveau >= 1 }))
}

function etapesActivation(): EtapeActivationVue[] {
  const r = etatRelais.lire()
  const membre = membreActuel()
  const f = (membre && r.formation[membre.id]) ?? []
  const faits = f.filter((m) => m.obligatoire && m.statut === 'termine').length
  const progression = { faits: Math.min(faits, P.formationModules), total: P.formationModules }
  if (situationAcces() === 'configuration') {
    const d = r.ouvertLe
    const horaires = etatCalendrier.lire().demandeHoraires
    return [
      { etape: 'dossier', etat: 'validee', le: d - 8 * JOUR, motif: null, progression: null },
      { etape: 'numero_versement', etat: 'validee', le: d - 8 * JOUR, motif: null, progression: null },
      { etape: 'convention', etat: 'validee', le: d - 7 * JOUR, motif: null, progression: null },
      { etape: 'visite', etat: 'validee', le: d - 2 * JOUR, motif: null, progression: null },
      { etape: 'formation', etat: faits >= P.formationModules ? 'validee' : 'a_faire', le: null, motif: null, progression },
      { etape: 'capacite_horaires', etat: horaires ? 'en_verification' : 'a_faire', le: horaires?.le ?? null, motif: null, progression: null },
    ]
  }
  const o = r.ouvertLe
  return [
    { etape: 'dossier', etat: 'validee', le: o - 12 * JOUR, motif: null, progression: null },
    { etape: 'numero_versement', etat: 'validee', le: o - 12 * JOUR, motif: null, progression: null },
    { etape: 'convention', etat: 'validee', le: o - 10 * JOUR, motif: null, progression: null },
    { etape: 'visite', etat: 'validee', le: o - 3 * JOUR, motif: null, progression: null },
    { etape: 'formation', etat: 'validee', le: o - 2 * JOUR, motif: null, progression },
    { etape: 'capacite_horaires', etat: 'validee', le: o - 1 * JOUR, motif: null, progression: null },
  ]
}

/** Ajoute des mois civils à un instant (exclusivité « 6 mois »). */
function plusMois(t: number, mois: number): number {
  const d = new Date(t)
  d.setUTCMonth(d.getUTCMonth() + mois)
  return d.getTime()
}

export const demoAcces: DomaineAcces = {
  // ---------- Invitation ----------
  invitation: async (jeton) => {
    const i = etatAcces.lire().invitations.find((x) => x.jeton === jeton)
    return repondre(i ? invitationVue(i) : null)
  },

  async accepterInvitation(jeton, pin, o) {
    const i = etatAcces.lire().invitations.find((x) => x.jeton === jeton)
    if (!i) return { ok: false, raison: 'expiree' }
    const v = invitationVue(i)
    if (v.etat === 'utilisee') return etatAcces.lire().cles.includes(o.cle) ? { ok: true } : { ok: false, raison: 'deja_utilisee' }
    if (v.etat === 'retiree') return { ok: false, raison: 'retiree' }
    if (v.etat === 'expiree' || o.heure > v.expireLe) return { ok: false, raison: 'expiree' }
    if (pin.length !== C.pinLongueur || !/^\d+$/.test(pin) || pinTropSimple(pin)) return { ok: false, raison: 'pin_trop_simple' }
    const r = etatRelais.lire()
    if (!r.equipe.some((m) => m.id === i.membreId) && r.equipe.filter((m) => m.role === 'employe').length >= P.equipeMax) return { ok: false, raison: 'equipe_complete' }
    // Le membre entre dans l'équipe (« Mon équipe ») avec sa formation à faire : pas de remise avant (DRO-01).
    const membre: Membre = { id: i.membreId, prenom: i.prenom, nom: i.nom, initiales: (i.prenom[0] + i.nom[0]).toUpperCase(), role: 'employe', droits: i.droits, photo: null, formationOk: false }
    accueillirMembre(membre, i.telephone)
    etatAcces.ecrire((e) => {
      e.invitations.find((x) => x.jeton === jeton)!.etat = 'utilisee'
      e.cles.push(o.cle)
    })
    lierEtCreerPin(membre.id, pin)
    notifier({ id: 'N-INV-' + membre.id, cle: 'relais.invitation_acceptee', vars: { qui: `${membre.prenom} ${membre.nom[0]}.` }, route: 'equipe', quand: o.heure })
    return { ok: true }
  },

  async redemanderInvitation(jeton, o) {
    const i = etatAcces.lire().invitations.find((x) => x.jeton === jeton)
    if (!i) return { ok: false, raison: 'introuvable' }
    etatAcces.ecrire((e) => void (e.invitations.find((x) => x.jeton === jeton)!.redemandeeLe = o.heure))
    notifier({ id: 'N-REINV-' + i.membreId, cle: 'relais.invitation_redemandee', vars: { qui: `${i.prenom} ${i.nom[0]}.` }, route: 'equipe', quand: o.heure })
    return { ok: true }
  },

  formation() {
    const m = membreActuel()
    const f = (m && etatRelais.lire().formation[m.id]) ?? []
    const modules: ModuleVu[] = f.map((x) => ({ id: x.id, titre: x.titre, minutes: x.minutes, obligatoire: x.obligatoire, statut: x.statut === 'a_revoir' ? 'a_faire' : x.statut }))
    const faits = modules.filter((x) => x.obligatoire && x.statut === 'termine').length
    return repondre({ modules, obligatoires: P.formationModules, faits, terminee: !!m?.formationOk || faits >= P.formationModules })
  },

  // ---------- Candidature ----------
  quartiers: () =>
    repondre<QuartierCandidat[]>(
      QUARTIERS.map(([quartier, zone]) => ({ quartier, zone, exploitee: exploitee(zone), placeLibre: (RELAIS_PAR_ZONE[zone] ?? 0) < ACCES.relaisParZone })),
    ),

  brouillon: () => repondre(etatAcces.lire().brouillon),
  async enregistrerBrouillon(b) {
    etatAcces.ecrire((e) => void (e.brouillon = b))
  },

  async envoyerCodeVersement(operateur, numero, o) {
    const n = numero.replace(/\D/g, '').replace(/^237/, '')
    if (!numeroValide(n)) return { ok: false, raison: 'numero_invalide' }
    if (!prefixeValide(operateur, n)) return { ok: false, raison: 'prefixe' }
    const c = etatAcces.lire().codeVersement
    if (c && c.numero === n && c.envoyeA + C.renvoiSecondes * 1000 > o.heure) return { ok: false, raison: 'trop_tot' }
    const expireA = o.heure + C.codeSmsDureeMin * 60_000
    etatAcces.ecrire((e) => {
      e.codeVersement = { operateur, numero: n, envoyeA: o.heure, expireA }
      if (e.brouillon) e.brouillon.versement.verifie = false
    })
    return { ok: true, expireA }
  },

  async verifierCodeVersement(code, o) {
    const c = etatAcces.lire().codeVersement
    if (!c || c.expireA <= o.heure) return { ok: false, raison: 'expire' }
    if (code !== CODE_SMS_DEMO) return { ok: false, raison: 'code_faux' }
    etatAcces.ecrire((e) => {
      if (e.brouillon) e.brouillon.versement = { operateur: c.operateur, numero: c.numero, verifie: true }
      e.codeVersement = null
    })
    return { ok: true }
  },

  async candidater(b, o) {
    const e = etatAcces.lire()
    const deja = e.candidatures.find((x) => x.cle === o.cle)
    if (deja) return { ok: true, reference: deja.reference }
    const tel = b.gerant.telephone.replace(/\D/g, '').replace(/^237/, '')
    if (e.candidatures.some((x) => x.telephone === tel)) return { ok: false, raison: 'deja_candidat' }
    const pieces = ['cni_recto', 'cni_verso', 'selfie_video', 'facade', 'rangement', 'comptoir'] as const
    const places = Number(b.local.placesEstimees)
    if (!b.commerce.nom.trim() || !b.commerce.type || !b.commerce.quartier.trim() || !b.gerant.nom.trim() || !numeroValide(tel) || pieces.some((p) => !b.pieces[p]) || !(places > 0)) return { ok: false, raison: 'incomplet' }
    if (!b.versement.verifie) return { ok: false, raison: 'versement_non_verifie' }
    if (!b.convention.acceptee || !b.convention.signature) return { ok: false, raison: 'convention_non_signee' }
    const zone = zoneDe(b.commerce.quartier)
    const reference = 'CR-' + o.cle.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase()
    etatAcces.ecrire((x) => {
      x.candidatures.push({ reference, cle: o.cle, envoyeeLe: o.heure, commerce: b.commerce.nom.trim(), quartier: b.commerce.quartier.trim(), zone, telephone: tel, exploitee: exploitee(zone) })
      x.brouillon = null
    })
    // Vers la console : la candidature complète (six pièces) attend la vérification de BelivaY (relais « candidat »).
    demanderActivation('relais', reference, reference, pieces.length, o.heure)
    return { ok: true, reference }
  },

  candidature() {
    const c = etatAcces.lire().candidatures.at(-1)
    if (!c) return repondre(null)
    const t = maintenant()
    const appelAvant = c.envoyeeLe + ACCES.appelCandidatHeures * 3600_000
    const v: Candidature = {
      reference: c.reference,
      envoyeeLe: c.envoyeeLe,
      commerce: c.commerce,
      quartier: c.quartier,
      zone: c.zone,
      etat: c.exploitee ? 'en_etude' : 'liste_attente',
      appelAvant,
      identite: t >= c.envoyeeLe + ACCES.kyc.autoMinutes * 60_000 ? 'verifiee' : 'en_verification',
      suivi: [
        { etape: 'envoyee', etat: 'faite', le: c.envoyeeLe },
        { etape: 'appel', etat: c.exploitee ? 'en_cours' : 'a_venir', le: c.exploitee ? appelAvant : null },
        { etape: 'visite', etat: 'a_venir', le: null },
        { etape: 'formation', etat: 'a_venir', le: null },
        { etape: 'ouverture', etat: 'a_venir', le: null },
      ],
    }
    return repondre(v)
  },

  programme: () => repondre(programmeDe()),

  // ---------- Activation et statut ----------
  activation() {
    const r = etatRelais.lire()
    const config = situationAcces() === 'configuration'
    const a: Activation = {
      statut: config ? 'en_configuration' : r.statut,
      relais: RELAIS.nom,
      quartier: RELAIS.quartier,
      ouvertLe: config ? null : r.ouvertLe,
      etapes: etapesActivation(),
      visiteLe: config ? r.ouvertLe - 2 * JOUR : r.ouvertLe - 3 * JOUR,
      fondateur: RELAIS.fondateur && !config ? { numero: NUMERO_FONDATEUR, exclusiviteJusqua: plusMois(r.ouvertLe, ACCES.exclusiviteMois) } : null,
      convention: { version: '1.0', signeeLe: (config ? r.ouvertLe - 7 * JOUR : r.ouvertLe - 10 * JOUR) },
    }
    return repondre(a)
  },

  statut() {
    const r = etatRelais.lire()
    const t = maintenant()
    const config = situationAcces() === 'configuration'
    const ds = decisions()
    const s: StatutDetail = {
      statut: config ? 'en_configuration' : r.statut,
      depuis: r.statutDepuis,
      motif: r.motif,
      decision: r.statut === 'suspendu' ? (ds.find((d) => d.niveau >= 3) ?? null) : null,
      decisions: ds,
      colisEnStock: config ? 0 : tousLesColis().filter(FILTRES.tous).length,
      finDemandee: r.finDemandee
        ? { le: r.finDemandee, effetLe: r.finDemandee + P.finPreavisJours * JOUR, sansNouveauxColisDes: r.finDemandee + (P.finPreavisJours - P.finSansColisJours) * JOUR, motif: null, annulable: t < r.finDemandee + P.finPreavisJours * JOUR }
        : null,
    }
    return repondre(s)
  },

  async contester(id, texte, o) {
    if (!proprietaire()) return { ok: false, raison: 'droit_refuse' }
    const d = decisions().find((x) => x.id === id)
    if (!d) return { ok: false, raison: 'introuvable' }
    if (d.contestation && etatAcces.lire().cles.includes(o.cle)) return { ok: true, reponseAvant: d.contestation.reponseAvant }
    // Une seule contestation par décision, réponse sous PR-CONTESTATION-H heures ouvrées (calculs/trust.ts, TRU-07).
    const c = contestation(!!d.contestation, o.heure, PARAMETRES_MOTEURS.trust)
    if (!c.possible) return { ok: false, raison: c.motif === 'deja_contestee' ? 'deja_contestee' : 'non_contestable' }
    const reponseAvant = c.reponseAvant!
    etatAcces.ecrire((e) => {
      e.contestations[id] = { le: o.heure, texte: texte.trim(), reponseAvant, etat: 'en_cours', reponse: null }
      e.cles.push(o.cle)
    })
    return { ok: true, reponseAvant }
  },

  async annulerFin(o) {
    if (!proprietaire()) return { ok: false, raison: 'droit_refuse' }
    const r = etatRelais.lire()
    if (!r.finDemandee) return { ok: false, raison: 'aucune' }
    if (o.heure >= r.finDemandee + P.finPreavisJours * JOUR) return { ok: false, raison: 'deja_prononcee' }
    // À LA FUSION : relais.annulerFin (PR-10) ; même écriture.
    etatRelais.ecrire((e) => void (e.finDemandee = null))
    return { ok: true }
  },
}
