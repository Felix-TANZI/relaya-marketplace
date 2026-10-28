// DONNÉES DE DÉMONSTRATION — domaine « notifications » : le « serveur » des notifications du relais.
// - Les événements viennent des autres domaines (comme le ferait le serveur, CONNEXIONS.md) : lot annoncé et livreur en
//   approche (reception, PR-NTF-APPROCHE-MIN), places qui manquent (PR-RC-16), colis à faire partir à l'ouverture
//   (PR-RC-15), photo demandée et nouveau message dans un fil (messages), constat (incidents), versement (gérant),
//   variation et seuil du Trust Score (PR-TRUST-ALERTE, une fois par seuil et par semaine : PAL-06, ARL-15), sanction
//   proposée avec « Contester » (TRU-07), pièce qui expire (PR-DOC-EXPIRE-J), paramètre modifié par BelivaY, panne
//   générale (mode papier, OFF-06). Chaque événement devient UNE notification (NOT-01), à son heure, une seule fois
//   (identifiant stable) : elle est « matérialisée » à la lecture, comme la tâche du serveur l'aurait envoyée.
// - Rendue par un MODÈLE versionné (clé, français, anglais, variables : PR-RC-20) ; aucune variable n'est un code ni un
//   montant (NOT-03, NTF-06 ; vérifié par sansCodeNiMontant et par les tests).
// - Filtrée selon le rôle (ARL-06, PR-RC-09) ; push calculé à la création avec les réglages du membre : coupé par un
//   interrupteur (sauf critique et score : NTF-04, NTF-08), différé pendant les heures calmes PR-NTF-CALME sauf l'urgent
//   (NTF-07, PR-RC-20).
import { PARAMETRES, REGISTRE, lire } from '../calculs/registre'
import { JOUR, aHeure, ajouterJours, jourDe, jourSemaine, minutesDe, minutesDuJour } from '../calculs/temps'
import type { Instant } from '../donnees/communs'
import type { CategorieNotification, CentreNotifications, DomaineNotifications, Notification, PushNotification, ReglagesNotifications, ResumeMatin, RubriqueNotification, Texte } from '../donnees/domaines/notifications'
import { heure, jourLong } from '../i18n/temps'
import { etatCalendrier } from './calendrier'
import { FILTRES, occupationDuRelais, tousLesColis } from './colis'
import { maintenant } from './horloge'
import { VERSEMENTS_PASSES, oct } from './jeu-essai'
import { lots } from './reception'
import { etatRelais } from './relais'
import { etatQualite } from './qualite'
import { membreActuel } from './session'
import { magasin, repondre } from './stockage'

const P = PARAMETRES.relais
// PR-NTF-RESUME-H : « 7 h, réglable, jamais avant 7 h » (NTF-01) ; seule source de l'heure du résumé (ARL-100).
const hhmm = (h: number, m = 0) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
export const RESUME_PAR_DEFAUT = P.resumeMatin.defaut
export const RESUME_MIN = P.resumeMatin.min
// PR-CONTESTATION-H : « 72 h ouvrées, une contestation par décision » (TRU-07).
const CONTESTATION_H = P.contestationHeures

// ── Règles pures (testées dans src/pages/PR-08/regles.test.ts) ───────────────────────────────────────────────────

export type Calmes = { de: number; a: number } // heures pleines (PR-NTF-CALME)

/** L'instant tombe-t-il dans les heures calmes (« 22 h – 7 h » : à cheval sur minuit) ? */
export function dansHeuresCalmes(t: Instant, c: Calmes = P.heuresCalmes): boolean {
  const m = minutesDuJour(t)
  return c.de > c.a ? m >= c.de * 60 || m < c.a * 60 : m >= c.de * 60 && m < c.a * 60
}
/** Fin des heures calmes qui contiennent l'instant (le push différé part à cette heure). */
export function finHeuresCalmes(t: Instant, c: Calmes = P.heuresCalmes): Instant {
  const j = jourDe(t)
  return minutesDuJour(t) >= c.a * 60 ? aHeure(ajouterJours(j, 1), c.a * 60) : aHeure(j, c.a * 60)
}

export interface Interrupteurs {
  push: boolean
  approche: boolean
  versements: boolean | null
}
/** Ce qu'il advient du push d'une notification créée à `quand` avec ces réglages (critère 2 ; NTF-04, NTF-07, NTF-08). */
export function etatDuPush(categorie: CategorieNotification, urgente: boolean, quand: Instant, r: Interrupteurs, c: Calmes = P.heuresCalmes): PushNotification {
  const coupe = (categorie === 'operations' || categorie === 'compte') ? !r.push : categorie === 'approche' ? !r.approche : categorie === 'versements' ? r.versements === false : false
  if (coupe) return { etat: 'coupe', a: null }
  if (!urgente && dansHeuresCalmes(quand, c)) return { etat: 'differe', a: finHeuresCalmes(quand, c) }
  return { etat: 'envoye', a: quand }
}

/** NOT-03 / NTF-06 : ni montant (« 8 400 F », « 300 FCFA »), ni code (6 chiffres de suite), ni numéro de téléphone. */
export function sansCodeNiMontant(texte: string): boolean {
  return !/\d[\d\s  ]*\s?(F|FCFA|XAF)\b/.test(texte) && !/(?<![\w-])\d{6,}(?![\w-])/.test(texte)
}

// ── Modèles (console : clé, version, FR, EN, rubrique, catégorie, urgence, rôle) ─────────────────────────────────

type Valeur = string | number | Texte
interface Modele {
  version: number
  titre: Texte
  titreUn?: Texte // quand {n} vaut 1
  texte: Texte
  rubrique: RubriqueNotification
  categorie: CategorieNotification
  aTraiter: boolean
  urgente: boolean
  /** Réservée au gérant (argent, score, pièces, paramètres du relais : PR02-R04). */
  gerant: boolean
}
const M = (titre: [string, string], texte: [string, string], o: Omit<Modele, 'titre' | 'texte' | 'version' | 'titreUn'> & { titreUn?: [string, string] }): Modele => ({
  version: 1,
  titre: { fr: titre[0], en: titre[1] },
  texte: { fr: texte[0], en: texte[1] },
  ...o,
  titreUn: o.titreUn && { fr: o.titreUn[0], en: o.titreUn[1] },
})

export const MODELES = {
  'relais.livreur_approche': M(['Livreur dans ~{min} min', 'Courier in ~{min} min'], ['Lot {lot} · {colis} colis · {places} places à prévoir', 'Batch {lot} · {colis} parcels · {places} spaces to plan'], { rubrique: 'reception', categorie: 'approche', aTraiter: true, urgente: false, gerant: false }),
  'relais.lot_annonce': M(['Lot annoncé vers {h}', 'Batch announced for about {h}'], ['{entreprise} · {colis} colis · {places} places à prévoir', '{entreprise} · {colis} parcels · {places} spaces to plan'], { rubrique: 'reception', categorie: 'operations', aTraiter: false, urgente: false, gerant: false }),
  'relais.places_manquent': M(['Il manque {n} places', '{n} spaces missing'], ['Les lots annoncés dépassent vos places libres : faites partir les départs d’abord', 'Announced batches exceed your free spaces: hand over departures first'], { rubrique: 'capacite', categorie: 'operations', aTraiter: true, urgente: false, gerant: false, titreUn: ['Il manque 1 place', '1 space missing'] }),
  'relais.a_faire_partir': M(['{n} colis à faire partir', '{n} parcels to hand over'], ['Garde de 7 jours finie ou retour décidé : à remettre au livreur au prochain passage', '7-day storage over or return decided: hand to the courier at the next visit'], { rubrique: 'departs', categorie: 'critique', aTraiter: true, urgente: false, gerant: false, titreUn: ['Un colis à faire partir', 'One parcel to hand over'] }),
  'relais.photo_demandee': M(['Photo demandée', 'Photo requested'], ['{dossier} · {quoi}', '{dossier} · {quoi}'], { rubrique: 'incidents', categorie: 'critique', aTraiter: true, urgente: false, gerant: false }),
  'relais.message_recu': M(['{fil} : nouveau message', '{fil}: new message'], ['BelivaY vous a écrit · ouvrez le fil pour lire', 'BelivaY wrote to you · open the thread to read'], { rubrique: 'messages', categorie: 'operations', aTraiter: true, urgente: false, gerant: false }),
  'relais.versement_envoye': M(['Versement envoyé', 'Payout sent'], ['Voir le détail · réf. {ref}', 'See details · ref. {ref}'], { rubrique: 'argent', categorie: 'versements', aTraiter: false, urgente: false, gerant: true }),
  'relais.trust_variation': M(['Trust Score {signe}{n}', 'Trust Score {signe}{n}'], ['Calcul de la nuit · voir le détail', 'Overnight calculation · see details'], { rubrique: 'qualite', categorie: 'score', aTraiter: false, urgente: false, gerant: true }),
  'relais.seuil_proche': M(['Seuil proche', 'Threshold close'], ['Trust Score {score} : à {ecart} points du seuil de {seuil} ({palier})', 'Trust Score {score}: {ecart} points from the {seuil} threshold ({palier})'], { rubrique: 'qualite', categorie: 'score', aTraiter: false, urgente: false, gerant: true }),
  'relais.sanction_proposee': M(['Sanction proposée : {niveau}', 'Sanction proposed: {niveau}'], ['Motif écrit par BelivaY · contestable une fois, sous {h} h ouvrées', 'Reason written by BelivaY · can be contested once, within {h} working hours'], { rubrique: 'qualite', categorie: 'score', aTraiter: true, urgente: false, gerant: true }),
  'relais.piece_expire': M(['Une pièce expire bientôt', 'A document expires soon'], ['{piece} · expire le {date} · renvoyez-la depuis Documents', '{piece} · expires on {date} · send it again from Documents'], { rubrique: 'compte', categorie: 'compte', aTraiter: true, urgente: false, gerant: true }),
  'relais.parametre_modifie': M(['BelivaY a modifié une règle', 'BelivaY changed a rule'], ['Support humain : {horaires} · voir l’aide', 'Human support: {horaires} · see help'], { rubrique: 'compte', categorie: 'compte', aTraiter: false, urgente: false, gerant: false }),
  'relais.invitation_acceptee': M(['Invitation acceptée', 'Invitation accepted'], ['{qui} a créé son PIN ; sa formation reste à suivre avant sa première remise', '{qui} created their PIN; training must be completed before their first handover'], { rubrique: 'compte', categorie: 'compte', aTraiter: false, urgente: false, gerant: true }),
  'relais.invitation_redemandee': M(['Nouvelle invitation demandée', 'New invitation requested'], ['Le lien d’invitation de {qui} a expiré : renvoyez-la depuis Mon équipe', '{qui}’s invitation link has expired: send it again from My team'], { rubrique: 'compte', categorie: 'compte', aTraiter: true, urgente: false, gerant: true }),
  'relais.demande_acceptee': M(['Demande acceptée par BelivaY', 'Request accepted by BelivaY'], ['{quoi} : en vigueur dès maintenant, montrés aux clients et aux livreurs', '{quoi}: in force from now on, shown to customers and couriers'], { rubrique: 'capacite', categorie: 'compte', aTraiter: false, urgente: false, gerant: true }),
  'relais.connexion_bloquee': M(['Connexion bloquée', 'Sign-in blocked'], ['{n} PIN faux de suite ({qui}) : connexion bloquée {min} minutes sur ce téléphone', '{n} wrong PINs in a row ({qui}): sign-in blocked for {min} minutes on this phone'], { rubrique: 'compte', categorie: 'critique', aTraiter: true, urgente: false, gerant: true }),
  'relais.remise_annulee_pin': M(['Remise annulée : PIN faux', 'Handover cancelled: wrong PIN'], ['{n} PIN faux pendant une remise : le colis est resté en stock', '{n} wrong PINs during a handover: the parcel stayed in stock'], { rubrique: 'retrait', categorie: 'operations', aTraiter: false, urgente: false, gerant: true }),
  'relais.panne_generale': M(['Panne générale : mode papier', 'General outage: paper mode'], ['Registre papier tenu le {jour} · à saisir avant {limite}', 'Paper register kept on {jour} · to enter before {limite}'], { rubrique: 'panne', categorie: 'critique', aTraiter: true, urgente: true, gerant: false }),
  // Décisions de la console d'administration (pont : src/demo/pont-console.ts), titre « BelivaY · … » et texte écrits
  // par la console (sans montant ni code : avisConsole avec montants: false) ; urgente : panne, suspension, pièce.
  'relais.belivay': M(['{titre}', '{titre}'], ['{texte}', '{texte}'], { rubrique: 'compte', categorie: 'compte', aTraiter: false, urgente: false, gerant: false }),
  'relais.belivay_urgent': M(['{titre}', '{titre}'], ['{texte}', '{texte}'], { rubrique: 'panne', categorie: 'critique', aTraiter: true, urgente: true, gerant: false }),
  'relais.belivay_argent': M(['{titre}', '{titre}'], ['{texte}', '{texte}'], { rubrique: 'argent', categorie: 'versements', aTraiter: false, urgente: false, gerant: true }),
} satisfies Record<string, Modele>
export type CleModele = keyof typeof MODELES

const remplir = (gabarit: string, vars: Record<string, Valeur>, l: 'fr' | 'en') => gabarit.replace(/\{(\w+)\}/g, (_, k: string) => {
  const v = vars[k]
  return v === undefined ? `{${k}}` : typeof v === 'object' ? v[l] : String(v)
})
/** Rend un modèle dans les deux langues ; refuse une variable qui porterait un code ou un montant (NOT-03). */
export function rendre(cle: CleModele, vars: Record<string, Valeur>): { titre: Texte; texte: Texte } {
  const m: Modele = MODELES[cle]
  const titre = vars.n === 1 && m.titreUn ? m.titreUn : m.titre
  const r = { titre: { fr: remplir(titre.fr, vars, 'fr'), en: remplir(titre.en, vars, 'en') }, texte: { fr: remplir(m.texte.fr, vars, 'fr'), en: remplir(m.texte.en, vars, 'en') } }
  for (const s of [r.titre.fr, r.titre.en, r.texte.fr, r.texte.en]) if (!sansCodeNiMontant(s)) throw new Error(`notification ${cle} : code ou montant interdit (NOT-03)`)
  return r
}
const h2 = (t: Instant): Texte => ({ fr: heure(t, 'fr'), en: heure(t, 'en') })
const jour2 = (t: Instant): Texte => ({ fr: jourLong(t, 'fr'), en: jourLong(t, 'en') })

// ── État (le « serveur ») ─────────────────────────────────────────────────────────────────────────────────────

type Stockee = Notification & { gerant: boolean }
/** Notifications déjà créées (lues ou non) ; complétées à chaque lecture par les événements arrivés depuis. */
export const etatNotifications = magasin('notifications', (): Stockee[] => [])

interface ReglagesMembre {
  push: boolean
  approche: boolean
  versements: boolean
  heureResume: string
}
export const etatReglages = magasin('notifications_reglages', () => ({ membres: {} as Record<string, ReglagesMembre> }))
const reglagesDe = (id: string | undefined): ReglagesMembre => (id && etatReglages.lire().membres[id]) || { push: true, approche: true, versements: true, heureResume: RESUME_PAR_DEFAUT }

/** Panne générale annoncée par la diffusion hors système (lue par le domaine « aide », mode papier). */
export interface PanneAnnoncee {
  reference: string
  du: Instant
  au: Instant
}
let pannes: () => PanneAnnoncee[] = () => []
/** Le domaine « aide » (même groupe) déclare où lire les pannes annoncées. */
export const lirePannesDepuis = (f: () => PanneAnnoncee[]) => void (pannes = f)
let fils: () => { id: string; titre: Texte; dossier: string | null; photo: { message: string; quoi: Texte; dossier: string; le: Instant; envoyee: boolean } | null; nouveaux: { id: string; le: Instant; lu: boolean }[] }[] = () => []
/** Le domaine « messages » (même groupe) déclare ses fils : photo demandée, nouveaux messages de BelivaY. */
export const lireFilsDepuis = (f: typeof fils) => void (fils = f)

const PIECES: Record<string, Texte> = {
  identite: { fr: 'Pièce d’identité', en: 'ID document' },
  activite: { fr: 'Justificatif d’activité', en: 'Proof of business' },
  niu: { fr: 'NIU', en: 'Tax number (NIU)' },
}
const NIVEAUX: Record<number, Texte> = {
  1: { fr: 'avertissement', en: 'warning' },
  2: { fr: 'visibilité réduite', en: 'reduced visibility' },
  3: { fr: 'suspension', en: 'suspension' },
  4: { fr: 'exclusion', en: 'exclusion' },
}

interface Evenement {
  id: string
  cle: CleModele
  vars: Record<string, Valeur>
  quand: Instant
  route: string
  params?: Record<string, string>
  action?: Notification['action']
  /** Le geste attendu est déjà fait (lot reçu, photo envoyée, fil lu) : la notification passe « lue ». */
  fait?: boolean
}

/** Heure d'ouverture du relais ce jour-là (ou null s'il est fermé) ; heure du résumé au plus tard. */
const ouvertureDu = (j: string) => {
  const p = etatCalendrier.lire().semaine[jourSemaine(j)]
  return p && !p.ferme && p.ouverture ? p.ouverture : null
}

/** Les événements survenus jusqu'à `t` (le serveur les a émis ; chacun a un identifiant stable). */
function evenements(t: Instant): Evenement[] {
  const ev: Evenement[] = []
  const j = jourDe(t)
  const resumeDuJour = aHeure(j, minutesDe(RESUME_PAR_DEFAUT))
  // Lots du jour (reception) : annoncés ~3 h avant l'arrivée estimée (jamais avant le résumé), en approche à
  // PR-NTF-APPROCHE-MIN minutes ; un lot reçu n'est plus annoncé.
  const duJour = lots().filter((l) => l.arriveeEstimee !== null && jourDe(l.arriveeEstimee) === j)
  for (const l of duJour) {
    const arrivee = l.arriveeEstimee!
    const recu = l.valideA !== null || l.suivi === 'depose'
    ev.push({ id: `N-lot-${l.lot}`, cle: 'relais.lot_annonce', vars: { h: h2(arrivee), entreprise: l.entreprise, colis: l.colis, places: l.placesNecessaires }, quand: Math.max(resumeDuJour, arrivee - 3 * 3600_000), route: 'reception', fait: recu })
    const approcheA = arrivee - P.approcheMin * 60_000
    if (l.suivi === 'en_approche' || l.suivi === 'arrive' || t >= approcheA)
      ev.push({ id: `N-app-${l.lot}`, cle: 'relais.livreur_approche', vars: { min: Math.max(1, Math.ceil((arrivee - Math.min(t, arrivee)) / 60_000)), lot: l.lot, colis: l.colis, places: l.placesNecessaires }, quand: Math.min(t, Math.max(approcheA, resumeDuJour)), route: 'reception', fait: recu })
  }
  // Places (PR-RC-16) : lots encore attendus aujourd'hui contre places libres.
  const colis = tousLesColis()
  const libres = occupationDuRelais(etatRelais.lire().placesDeclarees, colis).libres
  const besoin = duJour.filter((l) => l.valideA === null && l.suivi !== 'depose').reduce((n, l) => n + l.placesNecessaires, 0)
  if (besoin > libres) ev.push({ id: `N-cap-${j}`, cle: 'relais.places_manquent', vars: { n: besoin - libres }, quand: resumeDuJour, route: 'departs' })
  // Départs du jour (PR-RC-15) : à l'ouverture du relais.
  const partir = colis.filter(FILTRES.a_faire_partir).length
  const ouvre = ouvertureDu(j)
  if (partir > 0 && ouvre) ev.push({ id: `N-dep-${j}`, cle: 'relais.a_faire_partir', vars: { n: partir }, quand: aHeure(j, minutesDe(ouvre)), route: 'departs' })
  // Fils de la messagerie : photo demandée (critique, NTF-04) ; sinon un message de BelivaY = une notification.
  for (const f of fils()) {
    // Le fil d'un dossier vit dans le dossier (ARL-95) : la notification ouvre le dossier.
    const [route, params] = f.dossier ? ['dossier-litige', { id: f.dossier }] : ['messagerie', { fil: f.id }]
    if (f.photo) ev.push({ id: `N-photo-${f.photo.message}`, cle: 'relais.photo_demandee', vars: { dossier: f.photo.dossier, quoi: f.photo.quoi }, quand: f.photo.le, route, params, fait: f.photo.envoyee })
    for (const m of f.nouveaux) if (m.id !== f.photo?.message) ev.push({ id: `N-msg-${m.id}`, cle: 'relais.message_recu', vars: { fil: f.titre }, quand: m.le, route, params, fait: m.lu })
  }
  // Versements (gérant) : le dernier envoyé.
  for (const v of VERSEMENTS_PASSES.slice(-2)) ev.push({ id: `N-ver-${v.reference}`, cle: 'relais.versement_envoye', vars: { ref: v.reference }, quand: v.date, route: 'versements' })
  // Trust Score (calcul de la nuit, PR-RC-27) : variation, seuil proche une fois par seuil et par semaine (ARL-15).
  const q = etatQualite.lire()
  const nuit = aHeure(j, 6 * 60)
  if (q.score !== null && q.evolution.length >= 2 && t >= nuit) {
    const d = Math.round(q.evolution[q.evolution.length - 1].score - q.evolution[q.evolution.length - 2].score)
    if (d !== 0) ev.push({ id: `N-ts-${j}`, cle: 'relais.trust_variation', vars: { signe: d > 0 ? '+' : '−', n: Math.abs(d) }, quand: nuit, route: 'trust' })
    for (const [seuil, palier] of [[P.paliers.confirme, { fr: 'Confirmé', en: 'Confirmed' }], [P.paliers.premium, { fr: 'Premium', en: 'Premium' }]] as const) {
      const ecart = Math.abs(q.score - seuil)
      const lundi = ajouterJours(j, -jourSemaine(j))
      if (ecart <= P.alerteSeuilPoints) ev.push({ id: `N-seuil-${seuil}-${lundi}`, cle: 'relais.seuil_proche', vars: { score: q.score, ecart: Math.round(ecart * 10) / 10, seuil, palier }, quand: nuit, route: 'paliers' })
    }
  }
  // Sanction proposée, avec « Contester » tant qu'elle ne l'est pas (TRU-07, NTF-08).
  // Le délai de contestation (PR-CONTESTATION-H, compté ici en heures pleines) passé ou la contestation faite, plus rien
  // n'est attendu du gérant.
  for (const d of q.decisions) {
    if (d.etat === 'annulee') continue
    const close = !!d.contestation || t > (d.contestableJusqua ?? d.le + CONTESTATION_H * 3600_000)
    const niveau = d.niveau === null ? { fr: 'descente de palier', en: 'tier downgrade' } : (NIVEAUX[d.niveau] ?? String(d.niveau))
    ev.push({ id: `N-dec-${d.id}`, cle: 'relais.sanction_proposee', vars: { niveau, h: CONTESTATION_H }, quand: d.le, route: 'trust', action: close ? null : { libelle: { fr: 'Contester', en: 'Contest' }, route: 'trust-journal', params: { sheet: 'contester', cible: d.id } }, fait: close })
  }
  // Pièces qui expirent (PR-DOC-EXPIRE-J) : le jour où elles entrent dans la fenêtre, à l'heure du résumé.
  for (const doc of etatRelais.lire().documents)
    if (doc.expireLe && PIECES[doc.type]) {
      const entre = doc.expireLe - P.documentAlerteJours * JOUR
      if (t >= entre && t < doc.expireLe) ev.push({ id: `N-doc-${doc.type}-${jourDe(doc.expireLe)}`, cle: 'relais.piece_expire', vars: { piece: PIECES[doc.type], date: jour2(doc.expireLe) }, quand: aHeure(jourDe(entre), minutesDe(RESUME_PAR_DEFAUT)), route: 'documents' })
    }
  // Règle changée par BelivaY : horaires du support (DP-12, SUP-HORAIRES), annoncée le 5 octobre.
  const sup = lire(REGISTRE, 'SUP-HORAIRES', '(\\d+) h – (\\d+) h, 7 j/7')
  ev.push({ id: 'N-param-SUP-HORAIRES', cle: 'relais.parametre_modifie', vars: { horaires: { fr: sup[0], en: `${heure(hhmm(Number(sup[1])), 'en')} – ${heure(hhmm(Number(sup[2])), 'en')}, 7 days a week` } }, quand: oct(5, 9, 0), route: 'aide' })
  // Panne générale (diffusion hors système, OFF-06) : connue de l'application au retour du réseau, fin de la panne.
  for (const p of pannes()) ev.push({ id: `N-panne-${p.reference}`, cle: 'relais.panne_generale', vars: { jour: jour2(p.du), limite: { fr: `${jourLong(p.au + P.papierSaisieH * 3600_000, 'fr')} ${heure(p.au + P.papierSaisieH * 3600_000, 'fr')}`, en: `${jourLong(p.au + P.papierSaisieH * 3600_000, 'en')} ${heure(p.au + P.papierSaisieH * 3600_000, 'en')}` } }, quand: p.au, route: 'mode-papier' })
  ev.push(...etatEvenementsDirects.lire())
  return ev.filter((e) => e.quand <= t)
}

/** Événements ponctuels signalés par les autres domaines au moment du geste (invitation acceptée ou redemandée,
 * connexion bloquée, remise annulée) : le serveur les émet, ils passent par un modèle comme les autres (NOT-03). */
export const etatEvenementsDirects = magasin('notifications_directes', (): Evenement[] => [])
export function notifier(e: { id: string; cle: CleModele; vars: Record<string, Valeur>; quand: Instant; route: string; params?: Record<string, string> }) {
  rendre(e.cle, e.vars) // refuse tout de suite un code ou un montant
  etatEvenementsDirects.ecrire((l) => void (l.some((x) => x.id === e.id) || l.push(e)))
}

let enCours = false
/** Crée les notifications des événements survenus depuis la dernière lecture (une fois chacune, NOT-01). Un événement
 * de plus de 24 h à sa première lecture est créé « lu » (il a été vu ailleurs : résumé, écran concerné). */
function materialiser() {
  if (enCours) return
  enCours = true
  try {
    const t = maintenant()
    const stock = new Map(etatNotifications.lire().map((n) => [n.id, n]))
    const tous = evenements(t)
    const nouveaux = tous.filter((e) => !stock.has(e.id))
    // Geste fait depuis (lot reçu, photo envoyée, fil lu) : la notification passe « lue », sans toucher.
    const faits = new Set(tous.filter((e) => e.fait && stock.get(e.id)?.lue === false).map((e) => e.id))
    if (!nouveaux.length && !faits.size) return
    const m = membreActuel()
    const r = reglagesDe(m?.id)
    const interr: Interrupteurs = { push: r.push, approche: r.approche, versements: m?.role === 'proprietaire' ? r.versements : null }
    etatNotifications.ecrire((l) => {
      for (const n of l) if (faits.has(n.id)) Object.assign(n, { lue: true, lueLe: t })
      for (const e of nouveaux) {
        const mod: Modele = MODELES[e.cle]
        // Une information de plus de 24 h à sa première lecture a été vue ailleurs ; une action attendue reste non lue.
        const vieux = (e.quand < t - JOUR && !mod.aTraiter) || !!e.fait
        l.push({ id: e.id, modele: e.cle, version: mod.version, ...rendre(e.cle, e.vars), rubrique: mod.rubrique, categorie: mod.categorie, aTraiter: mod.aTraiter, urgente: mod.urgente, route: e.route, ...(e.params ? { params: e.params } : {}), action: e.action ?? null, quand: e.quand, lue: vieux, lueLe: vieux ? e.quand : null, push: etatDuPush(mod.categorie, mod.urgente, e.quand, interr), gerant: mod.gerant })
      }
    })
  } finally {
    enCours = false
  }
}

// Le compteur de la session (src/demo/session.ts) lit l'état directement : les événements arrivés sont créés d'abord.
const brut = etatNotifications.lire
etatNotifications.lire = () => (materialiser(), brut())

/** Notifications que le membre connecté peut voir (l'employé ne reçoit rien de réservé au gérant). */
function visibles(): Stockee[] {
  materialiser()
  const gerant = membreActuel()?.role === 'proprietaire'
  return etatNotifications
    .lire()
    .filter((n) => gerant || !n.gerant)
    .sort((a, b) => b.quand - a.quand)
}
/** Compteur de la cloche (critère 1) : « À traiter » non lues du membre connecté. */
export const nonLuesATraiter = () => visibles().filter((n) => n.aTraiter && !n.lue).length

const sansMarque = ({ gerant: _g, ...n }: Stockee): Notification => n

function reglagesVus(): ReglagesNotifications {
  const m = membreActuel()
  const r = reglagesDe(m?.id)
  const ouvertures = etatCalendrier.lire().semaine.filter((p) => !p.ferme && p.ouverture).map((p) => p.ouverture!)
  const max = ouvertures.length ? ouvertures.sort()[0] : RESUME_MIN
  return {
    push: r.push,
    approche: r.approche,
    versements: m?.role === 'proprietaire' ? r.versements : null,
    heureResume: r.heureResume,
    heureResumeMin: RESUME_MIN,
    heureResumeMax: max < RESUME_MIN ? RESUME_MIN : max,
    heuresCalmes: { de: hhmm(P.heuresCalmes.de), a: hhmm(P.heuresCalmes.a) },
    approcheMin: P.approcheMin,
  }
}

function resume(): ResumeMatin | null {
  const t = maintenant()
  const r = reglagesDe(membreActuel()?.id)
  const j = jourDe(t)
  const aujourdhui = aHeure(j, minutesDe(r.heureResume))
  const envoyeLe = t >= aujourdhui ? aujourdhui : aHeure(ajouterJours(j, -1), minutesDe(r.heureResume))
  const colis = tousLesColis()
  const duJour = lots().filter((l) => l.arriveeEstimee !== null && jourDe(l.arriveeEstimee) === jourDe(envoyeLe))
  return {
    envoyeLe,
    aRecevoir: duJour.reduce((n, l) => n + l.colis, 0),
    approximatif: duJour.length > 0,
    retraitsAttendus: colis.filter(FILTRES.prets).length,
    renvois: colis.filter((c) => FILTRES.a_faire_partir(c) && c.sortie?.motif === 'renvoi').length,
    placesLibres: occupationDuRelais(etatRelais.lire().placesDeclarees, colis).libres,
  }
}

export const demoNotifications: DomaineNotifications = {
  notifications: () => repondre(visibles().map(sansMarque)),
  centre: () => repondre<CentreNotifications>({ notifications: visibles().map(sansMarque), resume: resume(), reglages: reglagesVus() }),
  async lire(id) {
    const t = maintenant()
    if (etatNotifications.lire().some((n) => n.id === id && !n.lue)) etatNotifications.ecrire((l) => l.forEach((n) => n.id === id && Object.assign(n, { lue: true, lueLe: t })))
  },
  async toutLire() {
    const t = maintenant()
    const ids = new Set(visibles().filter((n) => !n.lue).map((n) => n.id))
    if (ids.size) etatNotifications.ecrire((l) => l.forEach((n) => ids.has(n.id) && Object.assign(n, { lue: true, lueLe: t })))
  },
  async regler(x) {
    const m = membreActuel()
    if (!m) return { ok: false, raison: 'reserve_au_gerant' }
    if (x.versements !== undefined && m.role !== 'proprietaire') return { ok: false, raison: 'reserve_au_gerant' }
    if (x.heureResume !== undefined) {
      if (!/^\d{2}:\d{2}$/.test(x.heureResume)) return { ok: false, raison: 'heure_invalide' }
      const v = reglagesVus()
      if (x.heureResume < v.heureResumeMin) return { ok: false, raison: 'trop_tot' } // NTF-01 : jamais avant 7 h
      if (x.heureResume > v.heureResumeMax) return { ok: false, raison: 'trop_tard' }
    }
    const actuels = reglagesDe(m.id)
    const nouveaux = { ...actuels, ...Object.fromEntries(Object.entries(x).filter(([, v]) => v !== undefined && v !== null)) } as ReglagesMembre
    if (JSON.stringify(nouveaux) !== JSON.stringify(actuels)) etatReglages.ecrire((e) => void (e.membres[m.id] = nouveaux))
    return { ok: true, reglages: reglagesVus() }
  },
}
