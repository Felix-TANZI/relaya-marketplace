// DONNÉES DE DÉMONSTRATION — domaine « messages » : le « serveur » de la messagerie du relais avec BelivaY.
// - Fils : Support BelivaY ; un fil par dossier de constat, créé à l'ouverture du constat (domaine incidents), fermé à sa
//   clôture définitive puis lisible PR-PREUVES-CONSERV-J jours (MSG-03, ARL-40) ; « Collectes et livraisons » (messages
//   automatiques officiels, réponses rapides seulement : MSG-06). Une demande du formulaire d'aide crée un fil (AID-03).
// - Le serveur masque les numéros de téléphone et les adresses e-mail écrits dans un message (MSG-01, REF-D01.A64) :
//   l'original n'est jamais gardé.
// - Support : SUP-HORAIRES (DP-12), première réponse sous SUP-DELAI ; « Rappelez-moi » : un rappel à la fois, programmé
//   à l'ouverture s'il est demandé hors des heures (MSG-06).
// - Appel masqué (DP-61, PR-RC-25) : livreur seulement pendant sa mission au relais (lot en approche, arrivé ou en
//   réception, jusqu'à la confirmation du dépôt), support pendant ses heures ; journal sans contenu (durée, heure).
import { PARAMETRES, REGISTRE, lire } from '../calculs/registre'
import { HEURE, aHeure, ajouterJours, jourDe, minutesDuJour } from '../calculs/temps'
import type { Instant, Origine } from '../donnees/communs'
import type { Appel, DemandeSupport, DomaineMessages, Fil, Joignable, Message, Support } from '../donnees/domaines/messages'
import type { Dossier } from '../donnees/domaines/incidents'
import type { Texte } from '../donnees/domaines/notifications'
import { heure } from '../i18n/temps'
import { maintenant } from './horloge'
import { demoIncidents, dossiersVus } from './incidents'
import { h, oct } from './jeu-essai'
import { lireFilsDepuis } from './notifications'
import { lots } from './reception'
import { membreActuel } from './session'
import { sansHistorique } from './scenario'
import { magasin, repondre } from './stockage'

const P = PARAMETRES.relais
// SUP-HORAIRES « 7 h – 21 h, 7 j/7 » (DP-12) ; SUP-DELAI « 2 h pendant les heures du support ».
const HORAIRES = lire(REGISTRE, 'SUP-HORAIRES', '(\\d+) h – (\\d+) h, 7 j/7')
const OUVRE = Number(HORAIRES[1])
const FERME = Number(HORAIRES[2])
const hhmm = (n: number) => `${String(n).padStart(2, '0')}:00`
const HORAIRES_EN = `${heure(hhmm(OUVRE), 'en')} – ${heure(hhmm(FERME), 'en')}, 7 days a week`
const DELAI_H = Number(lire(REGISTRE, 'SUP-DELAI', '(\\d+) h pendant les heures du support')[1])

const T = (fr: string, en: string): Texte => ({ fr, en })
export const RAPPEL = T('Rappelez-moi', 'Call me back')
const RAPIDES: Record<Fil['type'], Texte[]> = {
  dossier: [T('Photo ajoutée', 'Photo added'), T('Le colis est rangé à part', 'The parcel is set aside'), RAPPEL],
  support: [T('Merci', 'Thank you'), T('J’ai une autre question', 'I have another question'), RAPPEL],
  logistique: [T('Je serai fermé', 'I will be closed'), T('Relais presque plein', 'Relay almost full'), T('Colis prêts pour la collecte', 'Parcels ready for collection')],
}
const MOTIFS: Record<string, Texte> = {
  non_conforme: T('Non conforme', 'Not as described'),
  abime: T('Abîmé', 'Damaged'),
  contrefacon: T('Contrefaçon', 'Counterfeit'),
  manquant: T('Colis manquant', 'Missing parcel'),
  emballage_ouvert: T('Emballage ouvert', 'Packaging opened'),
}
const CATEGORIES: Record<DemandeSupport['categorie'], Texte> = {
  reception: T('Réception', 'Receiving'),
  retrait: T('Retrait', 'Pickup'),
  stock: T('Stock', 'Stock'),
  argent: T('Argent', 'Money'),
  application: T('Application', 'App'),
  autre: T('Autre', 'Other'),
}

// ── Règles pures (testées : src/pages/PR-08/regles.test.ts) ─────────────────────────────────────────────────────

/** Un numéro de téléphone camerounais (plan de numérotation, comme les connexions des autres espaces) : 9 chiffres
 * commençant par 6 (mobile) ou 2 (fixe), précédés ou non de 237. */
const estNumero = (chiffres: string) => /^(?:237)?[26]\d{8}$/.test(chiffres)

/** MSG-01 : masque les numéros de téléphone (espaces et points permis entre les chiffres) et les adresses e-mail. Les
 * références BelivaY (« BLV-00043-1 », « PQ-Z1-261013-003 ») ne sont jamais touchées. */
export function masquer(texte: string): { texte: string; masque: boolean } {
  let masque = false
  const sortie = texte
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, () => ((masque = true), '[adresse masquée]'))
    .replace(/(?<![\w-])\+?\d(?:[ .]?\d)+(?![\w-])/g, (m) => (estNumero(m.replace(/\D/g, '')) ? ((masque = true), '[numéro masqué]') : m))
  return { texte: sortie, masque }
}

/** Le support est-il ouvert à cet instant (SUP-HORAIRES, 7 j/7) ; sinon, sa prochaine ouverture. */
export function supportA(t: Instant, ouvre = OUVRE, ferme = FERME): { ouvert: boolean; ouvreA: Instant | null } {
  const m = minutesDuJour(t)
  if (m >= ouvre * 60 && m < ferme * 60) return { ouvert: true, ouvreA: null }
  const j = jourDe(t)
  return { ouvert: false, ouvreA: m < ouvre * 60 ? aHeure(j, ouvre * 60) : aHeure(ajouterJours(j, 1), ouvre * 60) }
}

// ── État ─────────────────────────────────────────────────────────────────────────────────────────────────────────

const msg = (id: string, auteur: Message['auteur'], signe: string | null, texte: string, le: Instant, o: Partial<Message> = {}): Message => ({ id, auteur, signe, texte, modele: null, pieces: [], le, lu: auteur !== 'relais', masque: false, photoDemandee: null, ...o })
const auto = (id: string, m: Texte, le: Instant): Message => msg(id, 'systeme', null, m.fr, le, { modele: m })

/** Fil d'un dossier, PROJETÉ depuis le domaine « incidents » (le fil vit dans le dossier, ARL-95 ; MSG-03, ARL-40) :
 * mêmes messages, demande de photo, fermeture à la clôture définitive, lisible PR-PREUVES-CONSERV-J jours. Les messages
 * de BelivaY après la dernière lecture du fil (ou le dernier message du relais) sont « non lus ». */
function filDossier(d: Dossier, luA: Instant | null): Fil {
  const dernierRelais = Math.max(luA ?? 0, ...d.fil.filter((m) => m.de === 'relais').map((m) => m.le))
  const messages: Message[] = d.fil.map((m) => msg(`MS-${d.id}-${m.id}`, m.de, m.de === 'belivay' ? 'Support BelivaY' : m.par, m.texte, m.le, { pieces: m.photos, lu: true }))
  const enAttente = d.demande && d.demande.photo && !d.demande.faiteA && !d.filFerme
  return {
    id: 'T-' + d.id,
    type: 'dossier',
    titre: T(`Dossier ${d.id}`, `Case ${d.id}`),
    objet: d.colis,
    dossier: { id: d.id, colis: d.colis, motif: MOTIFS[d.motif] ?? T(d.motif, d.motif), etape: d.etape },
    ouvert: !d.filFerme,
    fermeLe: d.closA,
    lisibleJusqua: d.filLisibleJusqua,
    messages,
    nonLus: d.fil.filter((m) => m.de === 'belivay' && m.le > dernierRelais).length,
    reponsesRapides: [],
    saisieLibre: !d.filFerme,
    photoDemandee: enAttente ? T(d.demande!.texte, 'a photo requested in the case') : null,
  }
}

function initial() {
  const neuf = sansHistorique()
  const fils: Fil[] = [
    {
      id: 'T-860',
      type: 'support',
      titre: T('Support BelivaY', 'BelivaY Support'),
      objet: null,
      dossier: null,
      ouvert: true,
      fermeLe: null,
      lisibleJusqua: null,
      messages: neuf
        ? [msg('MS-4', 'belivay', 'Support BelivaY', 'Bienvenue Rose. Votre relais est ouvert : écrivez-nous ici à tout moment, ou demandez un rappel.', oct(12, 8, 30))]
        : [
            msg('MS-4', 'belivay', 'Support BelivaY', 'Bonjour Rose, votre relais est ouvert du lundi au samedi. Écrivez-nous ici à tout moment.', oct(5, 9, 0)),
            msg('MS-5', 'relais', 'RM', 'Le lot du matin comptait 4 colis comme annoncé, mais l’un a un angle enfoncé : je l’ai reçu avec réserve.', h(11, 18)),
            msg('MS-6', 'belivay', 'Support BelivaY', 'Bien reçu. La réserve est notée avec sa photo : vous n’avez rien d’autre à faire, le colis reste remettable.', h(11, 31)),
          ],
      nonLus: 0,
      reponsesRapides: RAPIDES.support,
      saisieLibre: true,
      photoDemandee: null,
    },
    {
      id: 'T-874',
      type: 'logistique',
      titre: T('Collectes et livraisons', 'Collections and deliveries'),
      objet: null,
      dossier: null,
      ouvert: true,
      fermeLe: null,
      lisibleJusqua: null,
      messages: [
        auto('MS-7', T('Livraison prévue aujourd’hui avec Yafé Express : lot PQ-Z1-261013-001 vers 11 h, lot PQ-Z1-261013-003 vers 15 h 15, lot PQ-Z1-261013-011 vers 18 h 35.', 'Delivery planned today with Yafé Express: batch PQ-Z1-261013-001 around 11 am, batch PQ-Z1-261013-003 around 3:15 pm, batch PQ-Z1-261013-011 around 6:35 pm.'), h(7, 0)),
        auto('MS-3', T('Collecte de 15 h 25 confirmée : Serge A. (Yafé Express) reprend 2 colis au même passage que le lot de 15 h 15.', 'Collection run at 3:25 pm confirmed: Serge A. (Yafé Express) takes 2 parcels during the same visit as the 3:15 pm batch.'), h(13, 50)),
      ],
      nonLus: 1,
      reponsesRapides: RAPIDES.logistique,
      saisieLibre: false,
      photoDemandee: null,
    },
  ]
  return { fils, rappel: null as Instant | null, appels: [] as Appel[], moyenneMin: neuf ? null : 12, dossiersLus: {} as Record<string, Instant> }
}

export const etatMessages = magasin('messages', initial)

/** Les fils des dossiers (projetés depuis « incidents ») encore lisibles, puis les fils de la messagerie. */
function tousLesFils(t: Instant = maintenant()): Fil[] {
  const lus = etatMessages.lire().dossiersLus ?? {}
  return [...etatMessages.lire().fils, ...dossiersVus(t).map((d) => filDossier(d, lus[d.id] ?? null))]
}

// Les notifications (même groupe) lisent les fils : photo demandée, nouveau message de BelivaY.
lireFilsDepuis(() =>
  tousLesFils().map((f) => {
    const humains = f.messages.filter((m) => m.auteur === 'belivay')
    const nonLus = new Set(f.messages.filter((m) => m.auteur !== 'relais').slice(f.nonLus ? -f.nonLus : f.messages.length).map((m) => m.id))
    return {
      id: f.id,
      titre: f.titre,
      dossier: f.dossier?.id ?? null,
      photo: f.dossier ? photoDuDossier(f) : null,
      nouveaux: humains.map((m) => ({ id: m.id, le: m.le, lu: !nonLus.has(m.id) })),
    }
  }),
)

/** Photo demandée par BelivaY dans un dossier (la demande et son heure viennent du dossier). */
function photoDuDossier(f: Fil) {
  const d = dossiersVus().find((x) => x.id === f.dossier!.id)
  if (!d?.demande?.photo) return null
  const m = d.fil.find((x) => x.de === 'belivay' && x.le === d.demande!.le)
  return { message: m ? `MS-${d.id}-${m.id}` : `DEM-${d.id}-${d.demande.le}`, quoi: T(d.demande.texte, 'a photo requested in the case'), dossier: d.id, le: d.demande.le, envoyee: d.demande.faiteA !== null }
}

const ORDRE: Record<Fil['type'], number> = { support: 0, dossier: 1, logistique: 2 }
const derniere = (f: Fil) => f.messages[f.messages.length - 1]?.le ?? 0
const visibles = (): Fil[] => {
  const t = maintenant()
  return tousLesFils(t)
    .filter((f) => f.lisibleJusqua === null || f.lisibleJusqua > t)
    .sort((a, b) => ORDRE[a.type] - ORDRE[b.type] || derniere(b) - derniere(a))
}

function support(): Support {
  const t = maintenant()
  const s = supportA(t)
  const r = etatMessages.lire().rappel
  return { horaires: T(HORAIRES[0], HORAIRES_EN), ouvertMaintenant: s.ouvert, ouvreA: s.ouvreA, delaiH: DELAI_H, moyenneMin: etatMessages.lire().moyenneMin, rappelAvant: r && r > t ? r : null }
}

/** Ajoute un message du relais à un fil (idempotent : la clé d'origine fait l'identifiant). */
function ajouter(filId: string, texte: string, pieces: string[], o: Origine): { id: string; masque: boolean } {
  const id = 'MS-' + o.cle
  const m = masquer(texte)
  const signe = membreActuel()?.initiales ?? null
  if (!etatMessages.lire().fils.some((f) => f.messages.some((x) => x.id === id)))
    etatMessages.ecrire((e) => {
      const f = e.fils.find((x) => x.id === filId)!
      f.messages.push(msg(id, 'relais', signe, m.texte, o.heure, { pieces, lu: false, masque: m.masque }))
      // Une photo envoyée répond à la photo demandée (critère 1).
      if (pieces.length && f.photoDemandee) f.photoDemandee = null
    })
  return { id, masque: m.masque }
}

async function demanderRappel(_motif: string, o: Origine): Promise<{ ok: true; rappelAvant: Instant; programme: boolean } | { ok: false; raison: 'deja_demande' }> {
  const e = etatMessages.lire()
  if (e.rappel && e.rappel > maintenant()) return { ok: false, raison: 'deja_demande' }
  const s = supportA(o.heure)
  const rappelAvant = (s.ouvert ? o.heure : s.ouvreA!) + DELAI_H * HEURE
  const texte = T(`Rappel demandé : le support vous rappelle avant ${heure(rappelAvant, 'fr')}${s.ouvert ? '' : ', dès son ouverture'}.`, `Call-back requested: support will call you before ${heure(rappelAvant, 'en')}${s.ouvert ? '' : ', as soon as it opens'}.`)
  etatMessages.ecrire((x) => {
    x.rappel = rappelAvant
    const f = x.fils.find((y) => y.type === 'support' && y.dossier === null)
    f?.messages.push(auto('MS-R-' + o.cle, texte, o.heure))
  })
  return { ok: true, rappelAvant, programme: !s.ouvert }
}

/** Lot dont le livreur est en mission vers le relais (DP-61 : appel ouvert pendant la mission, jusqu'au dépôt confirmé). */
function missionOuverte(t: Instant) {
  return lots().find((l) => l.valideA === null && l.suivi !== 'depose' && l.suivi !== 'non_depose' && (l.suivi === 'en_approche' || l.suivi === 'arrive' || l.ouvertA !== null || (l.suivi === 'en_route' && l.arriveeEstimee !== null && l.arriveeEstimee - t <= P.approcheMin * 60_000))) ?? null
}

function joignables(): Joignable[] {
  const t = maintenant()
  const l = missionOuverte(t)
  const prochain = lots().find((x) => x.valideA === null && x.suivi !== 'depose' && x.arriveeEstimee !== null && x.arriveeEstimee > t)
  const s = supportA(t)
  return [
    l
      ? { cible: 'livreur', nom: `${l.livreur} · ${l.entreprise}`, motif: T(`Lot ${l.lot} en approche · arrivée vers ${heure(l.arriveeEstimee ?? t, 'fr')}`, `Batch ${l.lot} approaching · arriving around ${heure(l.arriveeEstimee ?? t, 'en')}`), ouvert: true, ferme: null, mission: l.lot }
      : {
          cible: 'livreur',
          nom: prochain ? `${prochain.livreur} · ${prochain.entreprise}` : '—',
          motif: prochain ? T(`Prochain lot ${prochain.lot} vers ${heure(prochain.arriveeEstimee!, 'fr')}`, `Next batch ${prochain.lot} around ${heure(prochain.arriveeEstimee!, 'en')}`) : T('Aucun lot attendu', 'No batch expected'),
          ouvert: false,
          ferme: T(`L’appel s’ouvre ${P.approcheMin} min avant l’arrivée du livreur et se ferme au dépôt confirmé.`, `The call opens ${P.approcheMin} min before the courier arrives and closes when the drop is confirmed.`),
          mission: prochain?.lot ?? null,
        },
    {
      cible: 'support',
      nom: 'Support BelivaY',
      motif: T(`Rappel ou appel · ${HORAIRES[0]}`, `Call-back or call · ${HORAIRES_EN}`),
      ouvert: s.ouvert,
      ferme: s.ouvert ? null : T(`Le support répond de ${OUVRE} h à ${FERME} h : écrivez-lui, il vous répondra à l’ouverture.`, `Support answers ${HORAIRES_EN}: write to them, they will answer when they open.`),
      mission: null,
    },
  ]
}

export const demoMessages: DomaineMessages = {
  fils: () => repondre(visibles()),
  fil: async (id) => {
    const f = visibles().find((x) => x.id === id) ?? null
    if (f?.nonLus && f.dossier) etatMessages.ecrire((e) => void ((e.dossiersLus ??= {})[f.dossier!.id] = maintenant()))
    else if (f?.nonLus) etatMessages.ecrire((e) => void (e.fils.find((x) => x.id === id)!.nonLus = 0))
    return repondre(f ? { ...f, nonLus: 0 } : null)
  },
  async envoyer(filId, texte, pieces, o) {
    if (!texte.trim() && !pieces.length) return { ok: false, raison: 'vide' }
    const dossier = tousLesFils().find((x) => x.id === filId)?.dossier
    if (dossier) {
      // Le fil d'un dossier vit dans le dossier (ARL-95) : le message y est écrit.
      const r = await demoIncidents.ecrire(dossier.id, masquer(texte.trim()).texte, pieces, o)
      return r.ok ? r : { ok: false, raison: r.raison === 'fil_ferme' ? 'ferme' : r.raison }
    }
    const f = etatMessages.lire().fils.find((x) => x.id === filId)
    if (!f) return { ok: false, raison: 'introuvable' }
    if (!f.ouvert) return { ok: false, raison: 'ferme' }
    if (!f.saisieLibre) return { ok: false, raison: 'reponses_rapides_seulement' }
    return { ok: true, id: ajouter(filId, texte.trim(), pieces, o).id }
  },
  async repondreVite(filId, reponse, o) {
    const f = etatMessages.lire().fils.find((x) => x.id === filId)
    if (!f) return { ok: false, raison: 'introuvable' }
    if (!f.ouvert) return { ok: false, raison: 'ferme' }
    const r = f.reponsesRapides[reponse]
    if (!r) return { ok: false, raison: 'vide' }
    if (r.fr === RAPPEL.fr) {
      const x = await demanderRappel(f.titre.fr, o)
      if (!x.ok) return x
      return { ok: true, id: 'MS-R-' + o.cle, rappelAvant: x.rappelAvant }
    }
    return { ok: true, id: ajouter(filId, r.fr, [], o).id }
  },
  async ecrireAuSupport(d, o) {
    if (!d.texte.trim() && !d.pieces.length) return { ok: false, raison: 'vide' }
    if (d.categorie === 'argent' && membreActuel()?.role !== 'proprietaire') return { ok: false, raison: 'reserve_au_gerant' }
    const ref = d.reference?.trim().toUpperCase() || null
    if (ref && !/^BLV-\d{5}(-\d{1,2})?$/.test(ref)) return { ok: false, raison: 'reference_invalide' }
    const filId = 'T-S' + o.cle.replace(/-/g, '').slice(0, 8).toUpperCase()
    if (!etatMessages.lire().fils.some((f) => f.id === filId)) {
      const c = CATEGORIES[d.categorie]
      etatMessages.ecrire((e) =>
        void e.fils.push({
          id: filId,
          type: 'support',
          titre: T(`Demande · ${c.fr}${ref ? ' · ' + ref : ''}`, `Request · ${c.en}${ref ? ' · ' + ref : ''}`),
          objet: ref,
          dossier: null,
          ouvert: true,
          fermeLe: null,
          lisibleJusqua: null,
          messages: [],
          nonLus: 0,
          reponsesRapides: RAPIDES.support,
          saisieLibre: true,
          photoDemandee: null,
        }),
      )
      ajouter(filId, d.texte.trim(), d.pieces, o)
      const s = support()
      etatMessages.ecrire((e) =>
        void e.fils
          .find((f) => f.id === filId)!
          .messages.push(auto('MS-A-' + o.cle, s.ouvertMaintenant ? T(`Demande reçue : première réponse sous ${s.delaiH} h.`, `Request received: first answer within ${s.delaiH} h.`) : T(`Demande reçue : le support répond dès ${heure(s.ouvreA!, 'fr')}.`, `Request received: support will answer from ${heure(s.ouvreA!, 'en')}.`), o.heure)),
      )
    }
    return { ok: true, filId }
  },
  support: () => repondre(support()),
  demanderRappel,
  joignables: () => repondre(joignables()),
  appels: () => repondre([...etatMessages.lire().appels].sort((a, b) => b.debut - a.debut)),
  async appeler(cible, o) {
    const j = joignables().find((x) => x.cible === cible)!
    if (!j.ouvert) return { ok: false, raison: 'ferme' }
    if (etatMessages.lire().appels.some((a) => a.dureeS === null)) return { ok: false, raison: 'deja_en_cours' }
    const appel: Appel = { id: 'AP-' + o.cle.slice(0, 8).toUpperCase(), cible, nom: j.nom, mission: j.mission, debut: o.heure, dureeS: null, par: membreActuel()?.initiales ?? '' }
    etatMessages.ecrire((e) => void e.appels.push(appel))
    return { ok: true, appel }
  },
  async raccrocher(id, o) {
    const a = etatMessages.lire().appels.find((x) => x.id === id)
    if (!a) return { ok: false, raison: 'introuvable' }
    if (a.dureeS !== null) return { ok: true, appel: a }
    const dureeS = Math.max(0, Math.round((o.heure - a.debut) / 1000))
    etatMessages.ecrire((e) => void (e.appels.find((x) => x.id === id)!.dureeS = dureeS))
    return { ok: true, appel: { ...a, dureeS } }
  },
}
