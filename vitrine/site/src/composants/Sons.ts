// Sons de l'espace client : la marque sonore BelivaY (marque-sonore.ts, la même dans les cinq applications), branchée
// sur les gestes du client. Tableau des actions et de leurs sons : logique-metier/SONS.md.
// Où ils sonnent, quel que soit l'écran qui appelle :
// - ajout au panier et favori : événements blv:panier et blv:favori émis par la source (src/donnees/source.ts) ;
// - paiements, retrait au comptoir, messages, litiges, codes faux, délai de paiement expiré : on se branche sur
//   les réponses de `source` (installerSons enveloppe ses méthodes, sans rien changer à ce qu'elles rendent) ;
// - notification non lue qui arrive (colis arrivé au relais, livreur en approche, message reçu ou autre), interrupteur
//   touché, lien ou code copié : ici aussi ;
// - code de retrait affiché (CL-09/Code) et fin d'un compte à rebours (CompteARebours) : par les écrans.
// Dans les autres espaces, ce fichier réutilisé par l'alias joue avec leur copie de la marque sonore (leur couleur,
// leurs réglages) ; jouer() accepte leurs actions communes (valide, erreur, notification…).
import { source, type NotificationClient, type Source } from '../donnees/source'
import { installerMarqueSonore, reglerSons, reglerVibrations, sonner, type Action } from './marque-sonore'

export type Son = Action
export { reglerSons, reglerVibrations }

/** Joue le son d'une action (et sa vibration). forcer : l'aperçu des réglages. */
export const jouer = (son: Son, forcer = false) => void sonner(son, forcer)

// Notification qui arrive : le son dit ce qu'elle annonce.
function sonDeNotification(n: NotificationClient): Son {
  if (n.type === 'Retrait' && /^Colis arrivé/i.test(n.titre)) return 'colisAuRelais'
  if (n.type === 'Suivi' && /en route|en approche/i.test(n.titre)) return 'livreurEnApproche'
  if (n.type === 'Messages') return 'messageRecu'
  return 'notification'
}
const ORDRE: Son[] = ['colisAuRelais', 'livreurEnApproche', 'notification', 'messageRecu']

// Branche les sons sur la source : chaque réponse est rendue telle quelle, le son suit.
type Methode = { [K in keyof Source]: Source[K] extends (...a: never[]) => Promise<unknown> ? K : never }[keyof Source]
type Rendu<K extends Methode> = Source[K] extends (...a: never[]) => Promise<infer R> ? R : never
type Args<K extends Methode> = Source[K] extends (...a: infer A) => unknown ? A : never
function apres<K extends Methode>(k: K, f: (r: Rendu<K>, a: Args<K>) => void) {
  const s = source as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>
  const orig = s[k]
  s[k] = async (...a: unknown[]) => {
    const r = await orig.apply(source, a)
    try {
      f(r as Rendu<K>, a as Args<K>)
    } catch {
      /* un son ne casse jamais un geste */
    }
    return r
  }
}

const paie = () => jouer('paiement')
const selon = (r: { ok: boolean }, oui: Son) => jouer(r.ok ? oui : 'erreur')

let installe = false
export function installerSons() {
  if (installe || typeof window === 'undefined') return
  installe = true
  installerMarqueSonore()

  window.addEventListener('blv:panier', () => jouer('panier'))
  window.addEventListener('blv:favori', (e) => jouer((e as CustomEvent<{ on?: boolean }>).detail?.on ? 'favori' : 'favoriRetire'))

  // Interrupteurs (réglages, notifications, alertes…) : un tic discret.
  document.addEventListener(
    'click',
    (e) => {
      const el = e.target instanceof Element ? e.target.closest('[role="switch"], .tg, .tg2, .tg3') : null
      if (el && !el.classList.contains('lock')) jouer('interrupteur')
    },
    true,
  )

  // Lien, code ou numéro copié, où que ce soit.
  const cb = navigator.clipboard
  if (cb?.writeText)
    try {
      const ecrire = cb.writeText.bind(cb)
      cb.writeText = (texte: string) => ecrire(texte).then(() => jouer('copie'))
    } catch {
      /* presse-papiers figé : pas de son */
    }

  // Paiements.
  apres('passerCommande', (r) => r.etat === 'payee' && paie())
  apres('confirmerPaiement', (r) => r.etat === 'payee' && paie())
  apres('echouerPaiement', (_r, a) => jouer(a[1] === 'expire' ? 'fin' : 'erreur'))
  for (const k of ['payerTroc', 'payerPanierFamille', 'payerVersement', 'creerMiseDeCote', 'creerMiseDeCoteListe', 'payerAbonnement', 'souscrire', 'payerAuComptoir', 'commanderRentree', 'payerPanierPartage', 'verserCagnotte'] as const) apres(k, paie)
  apres('deciderHausse', (_r, a) => a[1] === 'completer' && paie())
  apres('participer', (r) => selon(r, 'paiement'))
  // Cadeau offert depuis une liste : paiement ; une vérification renforcée (code e-mail) n'est pas un refus.
  apres('offrirArticleListe', (r) => (r.ok ? paie() : r.raison !== 'verification' && jouer('erreur')))
  // Liste mise en statut (WhatsApp, Facebook, Instagram, TikTok…) : le son du message envoyé.
  apres('partagerStatutListe', () => jouer('message'))
  // Échanges entre clients (DP-54) : panier payé pour un proche ; partage, rappel et remerciement envoyés ; liste
  // d'un proche suivie ; colis accepté ou refusé.
  apres('envoyerPanierA', (r) => selon(r, 'paiement'))
  apres('envoyerAuxProches', (r) => r.envoyes > 0 && jouer('message'))
  apres('rappelerInvites', (r) => selon(r, 'message'))
  apres('remercier', () => jouer('message'))
  apres('suivreListe', (_r, a) => jouer(a[1] ? 'favori' : 'favoriRetire'))
  apres('repondreColis', (r) => jouer(r.etat === 'accepte' ? 'notification' : 'interrupteur'))
  apres('offrirAbonnement', (r) => selon(r, 'paiement'))
  apres('commanderPour', (r) => selon(r, 'paiement'))
  apres('ajouterFlash', (r) => !r.ok && jouer('erreur'))

  // Retrait au comptoir : « Tout est en ordre ».
  apres('confirmerRetrait', () => jouer('retrait'))

  // Messages envoyés, litiges ouverts ou complétés.
  for (const k of ['envoyerMessage', 'ecrireSupport', 'poserQuestion', 'repondreWhatsapp', 'ouvrirLitige', 'ajouterPreuve', 'contesterDecision'] as const) apres(k, () => jouer('message'))
  apres('envoyerAvis', (r) => selon(r, 'message'))

  // Codes de vérification refusés.
  for (const k of ['confirmerMoyen', 'confirmerProfil', 'verifierCodeEmail', 'confirmerEmail', 'verifierCodeNumeroAncien', 'confirmerNumero'] as const)
    apres(k, (r) => !r.ok && jouer('codeFaux'))
  apres('lierParCode', (r) => !r.ok && jouer('codeFaux'))

  // Notifications : une non lue pas encore annoncée (à l'arrivée sur les notifications), ou le compteur qui monte.
  const annoncees = new Set<string>()
  apres('notificationsClient', (r) => {
    const nouvelles = r.notifications.filter((n) => !n.lu && !annoncees.has(n.id))
    if (!nouvelles.length || !navigator.userActivation?.hasBeenActive) return // pas encore de geste : annoncées plus tard
    nouvelles.forEach((n) => annoncees.add(n.id))
    // La plus parlante d'abord (colis arrivé, livreur en approche…) : un seul son pour toutes.
    jouer(ORDRE.find((s) => nouvelles.some((n) => sonDeNotification(n) === s)) ?? 'notification')
  })
  let nonLus: number | null = null
  apres('session', (r) => {
    const n = r.badges.nonLus
    if (nonLus !== null && n > nonLus) jouer('notification')
    nonLus = n
  })
}
