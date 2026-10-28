// DONNÉES DE DÉMONSTRATION — la commande du client reliée aux quatre autres interfaces par le pont commun
// (src/demo/pont.ts ; logique-metier/CAHIER-CONNECTIVITE.md). Dans un sens, le paiement confirmé publie la commande
// (« order.paid ») : le vendeur la voit dans « À préparer », sans jamais voir le client (GEN-01). Dans l'autre, ce que
// font le vendeur, l'entreprise de livraison, le livreur et le relais revient ici comme des effets sur la commande (état
// des colis, étapes, fil « En direct ») et des notifications, appliqués une fois chacun (clé de l'événement), comme le
// ferait le serveur. L'heure d'un effet est celle de la démonstration du client à la réception (horloge.ts) : chaque
// application garde son horloge, le serveur donnera l'heure du serveur. Les décisions de la console d'administration
// (« app: 'admin' », src/demo/pont-console.ts) aussi : litige tranché, commande annulée, remboursement exécuté sur la
// commande (R68, R72) ; geste commercial, paiement au retrait, avis modéré, panne, maintenance, message, réponse du
// support, règle ou texte annoncés en notification « BelivaY · … » (avisConsoleClient) et bandeau de la coque.
import type { CommandeClient, CommandePassee, Litige, NotificationClient } from '../donnees/source'
import { CATALOGUE } from './catalogue'
import MODERNES from '../../outils/produits-modernes.json'
import { ACTEURS_DEMO, colisDe, commandeDuColis, evenementsPour, publier, type ColisCommandePont, type Evenement } from './pont'
import { avisConsole, decisionsConsole } from './pont-console'

const CLASSES = ['S', 'M', 'L', 'XL'] as const
const classeDe = (p: string): ColisCommandePont['classe'] => {
  const c = CATALOGUE[p]?.classe
  return (CLASSES as readonly string[]).includes(c ?? '') ? (c as ColisCommandePont['classe']) : 'M'
}
/** Catégorie de commission du produit (D17, v1.4 : outils/produits-modernes.json) ; inconnue : DIV. */
const categorieDe = (p: string): string => (MODERNES as unknown as Record<string, { categorie_commission?: string }>)[p]?.categorie_commission ?? 'DIV'
/** Le relais de la démonstration commune, quel que soit le nom court que le client lui donne. */
const estRelaisDemo = (lieu: string) => lieu === ACTEURS_DEMO.relais.nom || lieu === ACTEURS_DEMO.relais.court

/** Paiement confirmé : la commande part vers les vendeurs (un colis par ligne, comme « Mes commandes »). */
export function publierPaiement(c: CommandePassee, produits: string[], le: number) {
  const relais = c.mode === 'relais' && estRelaisDemo(c.lieu) ? ACTEURS_DEMO.relais.id : null
  const colis: ColisCommandePont[] = c.lignes.map((l, i) => {
    const p = produits[i] ?? Object.keys(CATALOGUE).find((k) => CATALOGUE[k].titre === l.titre) ?? ''
    return { colis: colisDe(c.ref, i + 1), boutique: l.boutique, classe: classeDe(p), lignes: [{ produit: p, titre: l.titre, variante: CATALOGUE[p]?.variante ?? null, prix: l.prix, qte: l.qte, categorie: categorieDe(p), photo: CATALOGUE[p]?.images?.[0]?.url ?? null }] }
  })
  publier({ type: 'order.paid', commande: c.ref, mode: c.mode, lieu: c.lieu, relais, zone: relais ? 'Z1' : null, payableAuRetrait: c.comptoir, delaiH: c.mode === 'domicile' ? 3 : 4, colis, livraisonOfferte: c.offert ?? 0 }, 'order.paid-' + c.ref, le)
}

/** Un effet du pont sur une commande : ce qui change, la ligne du fil « En direct », la notification. */
export interface EffetPont {
  cle: string
  ref: string
  changer: (c: CommandeClient, t: number) => Partial<CommandeClient>
  fil: { titre: string; texte: string }
  notification: Pick<NotificationClient, 'type' | 'titre' | 'texte' | 'sms'> | null
  /** Remboursement au moyen d'origine (montant calculé par le client sur ce qu'il a payé). */
  rembourse?: (c: CommandeClient) => number
  /** Étape 7 : ce qui change sur le dossier (litige) du colis de la commande ; son remboursement éventuel. */
  litige?: { colis: number; changer: (l: Litige, t: number) => Partial<Litige>; rembourse?: (l: Litige) => number }
  /** Décision de la console sur les dossiers (litiges) de la commande, quel que soit le colis. */
  litiges?: (l: Litige, t: number) => Partial<Litige>
}

/** Le client ouvre un dossier sur un colis d'une commande passée par le pont : le vendeur le reçoit (GEN-01). */
export function publierLitige(l: Litige, photos: number, le: number) {
  if (!evenementsPour('admin').some((e) => e.type === 'order.paid' && e.commande === l.ref)) return
  publier({ type: 'claim.opened', commande: l.ref, colis: colisDe(l.ref, l.colis), dossier: l.id, motif: l.probleme, souhait: l.souhait, photos }, 'claim.opened-' + l.id, le)
}

const H48 = 48 * 3600_000
/** Étape 7 : réponse du vendeur, dépôt du retour, collecte, remise au vendeur, issue de l'inspection. */
function effetsRetour(e: Evenement): EffetPont[] {
  const sur = (colis: string, fil: EffetPont['fil'], changer: (l: Litige, t: number) => Partial<Litige>, notification: EffetPont['notification'] = null, rembourse?: (l: Litige) => number): EffetPont => ({
    cle: e.cle + '|' + colis,
    ref: commandeDuColis(colis),
    changer: () => ({}),
    fil,
    notification,
    litige: { colis: colisN(colis), changer, rembourse },
  })
  switch (e.type) {
    case 'claim.answered': {
      const texte =
        e.posture === 'accepte'
          ? `Le vendeur accepte : rapporte l’article au ${ACTEURS_DEMO.relais.nom} avec la référence ${e.retour}. Tu es remboursé au contrôle du colis.`
          : e.posture === 'arrangement'
            ? 'Le vendeur propose un arrangement : BelivaY l’examine avec toi, ton argent reste bloqué.'
            : 'Le vendeur conteste : BelivaY tranche à partir des preuves (photos, scellé), ton argent reste bloqué.'
      return [
        sur(
          e.colis,
          { titre: e.posture === 'accepte' ? 'Retour accepté' : 'Dossier en médiation', texte },
          (_, t) => (e.posture === 'accepte' ? { etat: 'accepte', decision: { le: t, motif: texte }, retour: { etape: 'depot', dates: { depot: t }, avant: t + H48 } } : { etat: 'examen', decision: { le: t, motif: texte } }),
          { type: 'Incident', titre: `Dossier ${e.dossier} · ${e.posture === 'accepte' ? 'retour accepté' : 'médiation'}`, texte, sms: false },
        ),
      ]
    }
    case 'return.dropped':
      return [sur(e.colis, { titre: 'Retour déposé au relais', texte: `${ACTEURS_DEMO.relais.gerante} a reçu l’article (référence ${e.reference}), scellé et photographié.` }, (l, t) => ({ retour: { etape: 'depose', dates: { ...l.retour?.dates, depose: t }, avant: t + H48 } }))]
    case 'relay.departure.confirmed':
      return e.par === 'livreur' ? e.colis.map((c) => sur(c, { titre: 'Retour en route vers le vendeur', texte: `${ACTEURS_DEMO.livreur.vu} a pris l’article au relais.` }, (l, t) => (l.retour ? { retour: { ...l.retour, etape: 'collecte', dates: { ...l.retour.dates, collecte: t } } } : {}))) : []
    case 'parcel.returned':
      return e.colis.map((c) => sur(c, { titre: 'Retour chez le vendeur', texte: 'Le vendeur a reçu l’article : il le contrôle sous 48 h, sinon tu es remboursé automatiquement.' }, (l, t) => (l.retour ? { retour: { ...l.retour, etape: 'inspection', dates: { ...l.retour.dates, inspection: t }, avant: t + H48 } } : {})))
    case 'return.closed': {
      const texte = e.issue === 'rembourse' ? 'Article contrôlé : tu es remboursé sur ton moyen de paiement d’origine.' : e.issue === 'remplace' ? 'Article contrôlé : le vendeur t’envoie un article neuf, même parcours qu’une commande.' : 'Le vendeur conteste l’état de l’article : BelivaY tranche à partir des photos.'
      return [
        sur(
          e.colis,
          { titre: e.issue === 'rembourse' ? 'Remboursé' : e.issue === 'remplace' ? 'Remplacement en route' : 'Dossier en médiation', texte },
          (l, t) => ({ etat: e.issue === 'rembourse' ? 'rembourse' : e.issue === 'remplace' ? 'remplace' : 'examen', decision: { le: t, motif: texte }, ...(l.retour && e.issue !== 'mediation' ? { retour: { ...l.retour, etape: 'clos', dates: { ...l.retour.dates, clos: t } } } : {}) }),
          { type: 'Paiement', titre: `Dossier · ${commandeDuColis(e.colis)}`, texte, sms: e.issue === 'rembourse' },
          e.issue === 'rembourse' ? (l) => l.montant : undefined,
        ),
      ]
    }
    default:
      return []
  }
}

const colisN = (colis: string) => Number(/-(\d+)$/.exec(colis)?.[1] ?? 0)
const surColis = (c: CommandeClient, colis: string, f: (x: CommandeClient['colis'][number]) => Partial<CommandeClient['colis'][number]>) => c.colis.map((x) => (x.n === colisN(colis) ? { ...x, ...f(x) } : x))

/** Issue d'un litige tranché par la console (options de espace-admin/src/demo/litiges.ts) sur le dossier du client. */
const ISSUE: Record<string, Litige['etat']> = { rembourser: 'rembourse', partager: 'rembourse', transporteur: 'rembourse', remplacer: 'remplace', debouter: 'refuse' }
/** Types de décision de la console qui portent sur une commande (les autres : avisConsoleClient). */
const SUR_COMMANDE = new Set(['litige_decide', 'commande_annulee', 'remboursement_execute'])
/**
 * Un seul remboursement par commande (garde d'idempotence) : si la console a déjà publié une annulation ou un
 * remboursement exécuté pour cette commande, l'événement suivant prévient le client mais ne crédite plus rien.
 */
function dejaRembourse(e: Evenement & { commande?: string }): boolean {
  const l = decisionsConsole('client')
  const i = l.findIndex((x) => x.cle === e.cle)
  return l.slice(0, i < 0 ? l.length : i).some((x) => x.cle !== e.cle && (x.type === 'commande_annulee' || x.type === 'remboursement_execute') && x.commande === e.commande)
}
/** Décisions de la console sur une commande du client : fil « En direct », état, remboursement, notification. */
function effetsConsole(e: Evenement): EffetPont[] {
  const a = avisConsole(e, 'client')
  if (!a || !SUR_COMMANDE.has(e.type)) return []
  const notification = { type: (a.argent ? 'Paiement' : 'Incident') as NotificationClient['type'], titre: a.titre, texte: a.texte, sms: true }
  switch (e.type) {
    case 'litige_decide':
      return [{ cle: e.cle, ref: e.commande, changer: () => ({}), fil: { titre: 'Décision de BelivaY', texte: a.texte }, notification, litiges: (_, t) => ({ etat: ISSUE[e.decision] ?? 'examen', decision: { le: t, motif: e.motif } }) }]
    case 'remboursement_execute':
      // R68, R72 : le remboursement exécuté par BelivaY revient au moyen d'origine (Portefeuille seulement s'il a payé ainsi).
      return [{ cle: e.cle, ref: e.commande, ...(dejaRembourse(e) ? {} : { rembourse: () => e.montant }), changer: () => ({}), fil: { titre: 'Remboursement envoyé', texte: a.texte }, notification }]
    case 'commande_annulee': {
      const montant = (c: CommandeClient) => (e.montant > 0 ? e.montant : c.total)
      return [
        {
          cle: e.cle,
          ref: e.commande,
          ...(dejaRembourse(e) ? {} : { rembourse: montant }),
          changer: (c, t) => ({ etat: 'annulee', annulee: { le: t, rembourse: dejaRembourse(e) ? 0 : montant(c) }, colis: c.colis.map((x) => (x.annule ? x : { ...x, annule: { le: t, rembourse: x.prix * x.qte, par: 'belivay' as const, motif: e.motif } })) }),
          fil: { titre: 'Annulée par BelivaY', texte: a.texte },
          notification,
        },
      ]
    }
    default:
      return []
  }
}
const TYPE_AVIS: Partial<Record<Evenement['type'], NotificationClient['type']>> = { geste: 'Paiement', ifa_decide: 'Paiement', flash: 'Promotions', diffusion: 'Messages', support_reponse: 'Messages', avis_modere: 'Messages', panne: 'Incident', maintenance_annoncee: 'Incident' }
/** Les autres décisions de la console pour le client : une notification « BelivaY · … » chacune (une fois, clé). */
export function avisConsoleClient(vus: Set<string>): { cle: string; notification: Pick<NotificationClient, 'type' | 'titre' | 'texte' | 'sms'>; lien: string }[] {
  return decisionsConsole('client')
    .filter((e) => !vus.has(e.cle) && !SUR_COMMANDE.has(e.type))
    .flatMap((e) => {
      const a = avisConsole(e, 'client')
      return a ? [{ cle: e.cle, notification: { type: TYPE_AVIS[e.type] ?? 'Suivi', titre: a.titre, texte: a.texte, sms: a.grave }, lien: e.type === 'geste' ? '/wallet' : '/notifications' }] : []
    })
}

function effets(e: Evenement): EffetPont[] {
  if (e.app === 'admin') return effetsConsole(e)
  // Un paquet affecté porte plusieurs colis, peut-être de plusieurs commandes : un effet par commande.
  if (e.type === 'package.assigned') {
    const { livreur: l, entreprise } = ACTEURS_DEMO
    const refs = [...new Set(e.colis.map(commandeDuColis))]
    return refs.map((ref) => ({
      cle: e.cle + '|' + ref,
      ref,
      changer: () => ({ livreur: { nom: l.vu, entreprise: entreprise.nom, vehicule: l.vehicule } }),
      fil: { titre: 'Livreur affecté', texte: `${l.vu} (${entreprise.nom}) va chercher ton colis chez le vendeur${e.creneau ? ` entre ${e.creneau[0]} et ${e.creneau[1]}` : ''}.` },
      notification: { type: 'Suivi', titre: `Livreur affecté · ${ref}`, texte: `${l.vu}, ${entreprise.nom}, va chercher ton colis.`, sms: false },
    }))
  }
  // Ramassé (code du vendeur validé) : chaque colis de la commande passe « Récupéré par le livreur ».
  if (e.type === 'parcel.collected') {
    const refs = [...new Set(e.colis.map(commandeDuColis))]
    return refs.map((ref) => ({
      cle: e.cle + '|' + ref,
      ref,
      changer: (c) => {
        const ns = e.colis.filter((x) => commandeDuColis(x) === ref).map(colisN)
        return { etat: c.mode === 'domicile' ? 'route' : c.etat, colis: c.colis.map((x) => (ns.includes(x.n) ? { ...x, statut: 'recupere' } : x)) }
      },
      fil: { titre: 'Ramassé', texte: `${ACTEURS_DEMO.livreur.vu} a contrôlé, emballé et scellé ton colis chez le vendeur${e.relais ? ' : il part vers ton relais.' : ' : il arrive chez toi.'}` },
      notification: { type: 'Suivi', titre: `Colis ramassé · ${ref}`, texte: `${ACTEURS_DEMO.livreur.vu} a ton colis${e.relais ? ' : prochaine étape, le relais.' : '.'}`, sms: false },
    }))
  }
  // Étape 5, à domicile : le livreur part vers toi (heure estimée), puis te remet le colis contre ton code.
  if (e.type === 'home.departed' || e.type === 'parcel.delivered') {
    const refs = [...new Set(e.colis.map(commandeDuColis))]
    const l = ACTEURS_DEMO.livreur.vu
    const heure = (t: number) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Douala' }).replace(':', ' h ')
    return refs.map((ref) =>
      e.type === 'home.departed'
        ? {
            cle: e.cle + '|' + ref,
            ref,
            // L'heure estimée du livreur devient l'heure de livraison du suivi (carte « vitrine », VAGUE n° 9).
            changer: (c) => ({ etat: c.etat === 'preparation' ? 'route' : c.etat, pretLe: e.arriveeEstimee ?? c.pretLe }),
            fil: { titre: 'En route vers toi', texte: `${l} arrive${e.arriveeEstimee ? ` vers ${heure(e.arriveeEstimee)}` : ''}. Suis-le en direct ; tu peux l’appeler depuis l’application (numéro masqué). Prépare ton code de réception.` },
            notification: { type: 'Suivi', titre: `Livreur en route · ${ref}`, texte: `${l} arrive chez toi. Prépare ton code de réception.`, sms: true },
          }
        : {
            cle: e.cle + '|' + ref,
            ref,
            changer: (c, t) => {
              const ns = e.colis.filter((x) => commandeDuColis(x) === ref).map(colisN)
              const colis = c.colis.map((x) => (ns.includes(x.n) ? { ...x, statut: 'recupere' as const, arrive: true } : x))
              const tous = colis.filter((x) => !x.annule).every((x) => x.arrive)
              return { colis, ...(tous ? { etat: 'retiree' as const, retireeLe: t, retourJusqua: t + 7 * 24 * 3600_000 } : {}) }
            },
            fil: { titre: 'Livré', texte: `${l} t’a remis ton colis contre ton code${e.photo ? ' (photo de la remise au dossier)' : ''}. Tu as 7 jours pour signaler un problème.` },
            notification: { type: 'Suivi', titre: `Livré · ${ref}`, texte: 'Ton colis t’a été remis. Un souci ? Signale-le dans les 7 jours.', sms: false },
          },
    )
  }
  const retour = effetsRetour(e)
  if (retour.length) return retour
  const un = effet(e)
  return un ? [un] : []
}

function effet(e: Evenement): EffetPont | null {
  if (!('commande' in e) || typeof e.commande !== 'string') return effetColis(e)
  const ref = e.commande
  const base = { cle: e.cle, ref }
  switch (e.type) {
    case 'suborder.ready':
      return {
        ...base,
        changer: (c) => ({ colis: surColis(c, e.colis, () => ({ statut: 'pret' })) }),
        fil: { titre: 'Prêt, livreur bientôt affecté', texte: `${vitrine(e.colis)} a emballé et photographié ton colis. Une entreprise de livraison va y affecter un livreur.` },
        notification: { type: 'Suivi', titre: `Prêt chez le vendeur · ${ref}`, texte: `${vitrine(e.colis)} a préparé ton colis. Un livreur est bientôt affecté.`, sms: false },
      }
    case 'suborder.accepted':
      return {
        ...base,
        changer: (c) => ({ colis: surColis(c, e.colis, (x) => ({ statut: x.statut === 'attente' ? 'preparation' : x.statut })) }),
        fil: { titre: 'Le vendeur prépare ton colis', texte: `${vitrine(e.colis)} a ouvert le bon de préparation.` },
        notification: { type: 'Suivi', titre: `Colis ${colisN(e.colis)} de ${ref} en préparation`, texte: `${vitrine(e.colis)} prépare ta commande.`, sms: false },
      }
    case 'suborder.delayed':
      return {
        ...base,
        changer: (c) => ({ pretLe: c.pretLe ? c.pretLe + e.heures * 3600_000 : c.pretLe }),
        fil: { titre: 'Le vendeur demande plus de temps', texte: `${vitrine(e.colis)} a besoin de ${e.heures} h de plus : la nouvelle heure est affichée.` },
        notification: { type: 'Suivi', titre: `Nouvelle heure · ${ref}`, texte: `${vitrine(e.colis)} a besoin de ${e.heures} h de plus pour préparer ton colis.`, sms: false },
      }
    case 'suborder.out_of_stock': {
      const montant = (c: CommandeClient) => {
        const x = c.colis.find((y) => y.n === colisN(e.colis))
        const reste = c.colis.filter((y) => !y.annule && y.n !== colisN(e.colis))
        // Plus aucun colis : tout ce qui a été payé revient (articles, livraison, frais) ; sinon l'article seul.
        return reste.length ? (x ? x.prix * x.qte : 0) : c.total
      }
      return {
        ...base,
        rembourse: montant,
        changer: (c, t) => {
          const r = montant(c)
          const colis = surColis(c, e.colis, () => ({ annule: { le: t, rembourse: r, par: 'vendeur', motif: 'Rupture de stock' } }))
          const tous = colis.every((y) => y.annule)
          return { colis, ...(tous ? { etat: 'annulee' as const, annulee: { le: t, rembourse: c.total } } : {}) }
        },
        fil: { titre: 'Article en rupture : remboursé', texte: `${vitrine(e.colis)} n’a plus l’article. Tu es remboursé sur ton moyen de paiement d’origine, sans frais.` },
        notification: { type: 'Paiement', titre: `Remboursement · ${ref}`, texte: `${vitrine(e.colis)} n’a plus l’article : tu es remboursé sur ton moyen de paiement d’origine.`, sms: true },
      }
    }
    default:
      return null
  }
}

function effetColis(e: Evenement): EffetPont | null {
  switch (e.type) {
    // Étape 5 : le relais a reçu le colis (lot confirmé par le livreur) ; puis, le paiement fait, le code de retrait.
    case 'parcel.arrival_notice': {
      const ref = commandeDuColis(e.colis)
      return {
        cle: e.cle,
        ref,
        changer: (c, t) => ({ arriveeLe: t, colis: surColis(c, e.colis, () => ({ arrive: true, statut: 'recupere' })) }),
        fil: { titre: 'Arrivé au relais', texte: `${ACTEURS_DEMO.relais.gerante} a reçu ton colis au ${ACTEURS_DEMO.relais.nom}.` },
        notification: { type: 'Retrait', titre: `Colis arrivé · ${ref}`, texte: `Ton colis t’attend au ${ACTEURS_DEMO.relais.nom}. Garde gratuite aujourd’hui.`, sms: false },
      }
    }
    case 'parcel.pickup_code': {
      const ref = commandeDuColis(e.colis)
      return {
        cle: e.cle,
        ref,
        changer: (c, t) => {
          const tous = c.colis.filter((x) => !x.annule).every((x) => x.arrive || x.n === colisN(e.colis))
          return tous && e.paye ? { etat: 'retirable', pretLe: t, arriveeLe: t, garde: { du: 0, demain: 100 * c.colis.filter((x) => !x.annule).length, jour: 1 } } : {}
        },
        fil: { titre: 'Prêt au retrait', texte: e.paye ? 'Ton code de retrait est dans l’application (et par SMS) : présente-le au comptoir avec ton PIN.' : 'Le reste se paie au comptoir ; ton code arrive après le paiement.' },
        notification: { type: 'Retrait', titre: `Prêt au retrait · ${ref}`, texte: 'Ton code de retrait est dans l’application. Présente-le au comptoir.', sms: true },
      }
    }
    // Étape 6 : retiré au comptoir (code, PIN du gérant, photo) ; au dernier colis, la commande est « Retirée » et la
    // fenêtre de retour (7 jours) s'ouvre.
    case 'handover.completed': {
      const ref = commandeDuColis(e.colis)
      return {
        cle: e.cle,
        ref,
        changer: (c, t) => {
          const colis = surColis(c, e.colis, () => ({ arrive: true, statut: 'recupere' }))
          const tous = colis.filter((x) => !x.annule).every((x) => x.arrive)
          return { colis, ...(tous ? { etat: 'retiree' as const, retireeLe: t, retourJusqua: t + 7 * 24 * 3600_000, garde: null } : {}) }
        },
        fil: { titre: 'Retirée', texte: `Tu as retiré ton colis au ${ACTEURS_DEMO.relais.nom}. Un souci ? Tu as 7 jours pour demander un retour.` },
        notification: { type: 'Retrait', titre: `Retirée · ${ref}`, texte: 'Merci ! Ton reçu est dans « Mes commandes ».', sms: false },
      }
    }
    // Non retiré au jour du renvoi : le colis repart chez le vendeur ; le remboursement est ce qui a été payé moins la
    // garde due (J1 offert, puis le tarif du jour), jamais plus que le payé (DP-24, CGA-23).
    case 'parcel.unclaimed': {
      const ref = commandeDuColis(e.colis)
      const retenue = (c: CommandeClient) => Math.min(c.total, Math.max(0, e.jours - 2) * (c.garde?.demain ?? 100))
      const montant = (c: CommandeClient) => c.total - retenue(c)
      return {
        cle: e.cle,
        ref,
        rembourse: montant,
        changer: (c, t) => {
          const colis = surColis(c, e.colis, () => ({ annule: { le: t, rembourse: montant(c), par: 'belivay', motif: 'Non retiré en 7 jours' } }))
          return { colis, garde: null, ...(colis.every((y) => y.annule) ? { etat: 'annulee' as const, annulee: { le: t, rembourse: montant(c) } } : {}) }
        },
        fil: { titre: 'Non retiré : renvoyé au vendeur', texte: 'Ton colis n’a pas été retiré en 7 jours : il repart chez le vendeur, ton code ne marche plus. Tu es remboursé de ce que tu as payé, moins la garde due.' },
        notification: { type: 'Retrait', titre: `Renvoyé au vendeur · ${ref}`, texte: 'Non retiré en 7 jours : remboursé moins la garde due, sur ton moyen de paiement d’origine.', sms: true },
      }
    }
    // Refusé au ramassage (non conforme, abîmé…) : le colis ne part pas ; remboursé au moyen d'origine.
    case 'parcel.refused_at_pickup': {
      const ref = commandeDuColis(e.colis)
      const montant = (c: CommandeClient) => {
        const x = c.colis.find((y) => y.n === colisN(e.colis))
        return c.colis.filter((y) => !y.annule && y.n !== colisN(e.colis)).length ? (x ? x.prix * x.qte : 0) : c.total
      }
      return {
        cle: e.cle,
        ref,
        rembourse: montant,
        changer: (c, t) => {
          const colis = surColis(c, e.colis, () => ({ annule: { le: t, rembourse: montant(c), par: 'belivay', motif: 'Refusé au ramassage' } }))
          return { colis, ...(colis.every((y) => y.annule) ? { etat: 'annulee' as const, annulee: { le: t, rembourse: c.total } } : {}) }
        },
        fil: { titre: 'Refusé au ramassage : remboursé', texte: 'Le livreur a refusé l’article au contrôle (photo au dossier). Tu es remboursé sur ton moyen de paiement d’origine.' },
        notification: { type: 'Paiement', titre: `Remboursement · ${ref}`, texte: 'L’article n’a pas passé le contrôle du livreur : tu es remboursé sur ton moyen de paiement d’origine.', sms: true },
      }
    }
    default:
      return null
  }
}

// Le vendeur d'un colis tel que le client le nomme hors du panier : « Le vendeur », jamais la lettre de boutique (la
// lettre ne sert qu'à distinguer les colis dans le panier, consigne du porteur du 17 oct.).
const vitrine = (_colis: string): string => 'Le vendeur'

/** Les effets que le client n'a pas encore appliqués, dans l'ordre du journal. */
export function effetsNouveaux(vus: Set<string>): EffetPont[] {
  return evenementsPour('client')
    .filter((e) => !vus.has(e.cle))
    .flatMap(effets)
}
/** Toutes les clés lues (les événements sans effet sur une commande de ce compte sont aussi marqués). */
export const clesClient = (): string[] => evenementsPour('client').map((e) => e.cle)
