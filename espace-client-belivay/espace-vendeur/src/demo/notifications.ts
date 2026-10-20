// DONNÉES DE DÉMONSTRATION — domaine « notifications » (VD-02 p9, VD11-R53) : les 8 événements du jeu d'essai (4 non
// lus) et 4 plus anciens, déjà lus ; montants calculés (src/calculs), jamais écrits ; « Urgent » suit l'état réel des
// commandes et des litiges ; réglages push (I-2).
import type { DomaineNotifications, Notification, ReglagesNotifications } from '../donnees/domaines/notifications'
import { calculerCommission, familleDe } from '../calculs/commission'
import { PARAMETRES } from '../calculs/registre'
import { HEURE, yaounde } from '../calculs/temps'
import { alerteDeSeuil } from '../calculs/paliers'
import { Dec } from '../calculs/argent'
import { maintenant } from './horloge'
import { ARTICLES, BOUTIQUE, VERSEMENT_REFUSE } from './jeu-essai'
import { versementsPasses } from './versements'
import { commandesArrivees, essaiDe, etatCommandes, gardeFige } from './commandes'
import { estProprietaire } from './session'
import { REGLES, litigesOuverts } from './litiges'
import { tousLesRetours } from './retours'
import { decisionEnCours } from './trust'
import { magasin, repondre } from './stockage'
import { questionsSansReponse } from '../pages/AJ-A/donnees/demo' // AJ-A : questions des clients (INTEGRATION.md)

const c = (ref: string) => essaiDe(ref)!
const garde = (ref: string) => gardeFige(c(ref))
/** Gain par ITEL au palier suivant (Argent), même offre de découverte : « 324 F de plus par ITEL ». */
function gainArgent(): number {
  const a = ARTICLES['itel-noir']
  const p = PARAMETRES.commission
  const l = [{ famille: familleDe(a.categorie, p), prixUnitaire: a.prix }]
  return calculerCommission(l, 'Argent', true, p).garde - calculerCommission(l, BOUTIQUE.palier, true, p).garde
}
/** n7 : alerte avant un seuil (ACC-25, SAN-02, DP-57 A-5), calculée par alerteDeSeuil (« Plus que 2 points »). */
function alerteN7(): (Omit<Notification, 'lu'> & { lu0: boolean })[] {
  const a = alerteDeSeuil(BOUTIQUE.palier, Dec.de(String(BOUTIQUE.trustScore)), PARAMETRES.paliers)
  if (!a) return []
  const titre =
    a.sens === 'montée'
      ? { modele: `Votre score approche de {seuil} : plus que {n} points pour passer ${a.palierVise}`, valeurs: { seuil: a.seuil, n: a.pointsAffiches } }
      : { modele: `Votre score approche de {seuil} : {n} points au-dessus du seuil ${a.palierVise}`, valeurs: { seuil: a.seuil, n: a.pointsAffiches } }
  const texte = a.sens === 'montée' && a.palierVise === 'Argent' ? { modele: 'Vous garderez {gain} de plus par ITEL.', montants: { gain: gainArgent() } } : { modele: 'Ouvrez Mon palier pour voir ce qui compte.' }
  return [{ id: 'n7', type: 'palier', canal: 'notification', titre, texte, a: yaounde(2026, 9, 19, 18), lu0: true, urgent: false, argent: a.sens === 'montée', lien: 'palier', contester: null }]
}

/** Événements des litiges, des retours et des sanctions (VD11-R44, R46, VD07-R18, R24, R31, VNO-04) : rappels 24 h et
 * 6 h avant l'échéance d'un litige, décision rendue, retour arrivé à inspecter, remboursement automatique, sanction
 * ou descente à contester. */
function evenements(prop: boolean): (Omit<Notification, 'lu'> & { lu0: boolean })[] {
  const t = maintenant()
  const n: (Omit<Notification, 'lu'> & { lu0: boolean })[] = []
  for (const l of litigesOuverts()) {
    if (l.etat === 'a_repondre' && !l.reponse)
      for (const h of [24, 6])
        if (t >= l.echeance - h * HEURE && t < l.echeance)
          n.push({ id: `r${h}-${l.ref}`, type: 'litige', canal: 'sms', titre: { modele: h === 24 ? '{ref} : plus que 24 h pour répondre' : '{ref} : plus que 6 h pour répondre', valeurs: { ref: l.ref } }, texte: { modele: 'Répondez avant {e}. Sans réponse, BelivaY décide en partant de ce que dit le client.', echeances: { e: l.echeance } }, a: l.echeance - h * HEURE, lu0: false, urgent: true, argent: false, lien: `litige?ref=${l.ref}`, contester: null })
    if (l.decision)
      n.push({ id: `dec-${l.ref}`, type: 'litige', canal: 'sms', titre: { modele: l.decision.issue === 'gagne' ? '{ref} : décision en votre faveur' : '{ref} : décision en faveur du client', valeurs: { ref: l.ref } }, texte: { modele: 'Lisez la décision écrite et ses suites.' }, a: l.decision.a, lu0: t - l.decision.a > 24 * HEURE, urgent: false, argent: false, lien: `litige_envoye?ref=${l.ref}`, contester: null })
  }
  for (const r of tousLesRetours()) {
    if (r.recuA && r.suite.type === 'a_inspecter')
      n.push({ id: `arr-${r.ref}`, type: 'retour', canal: 'notification', titre: { modele: '{ref} est revenu chez vous', valeurs: { ref: r.ref } }, texte: r.inspecterAvant ? { modele: 'Inspectez-le avant {e}.', echeances: { e: r.inspecterAvant } } : { modele: 'Inspectez-le maintenant.' }, a: r.recuA, lu0: t - r.recuA > 24 * HEURE, urgent: true, argent: false, lien: `inspection?ref=${r.ref}`, contester: null })
    if (r.suite.type === 'rembourse' && r.suite.auto)
      n.push({ id: `auto-${r.ref}`, type: 'retour', canal: 'notification', titre: { modele: '{ref} : client remboursé automatiquement', valeurs: { ref: r.ref } }, texte: { modele: 'L’inspection ou le remplacement n’a pas été fait à temps.' }, a: r.suite.le, lu0: false, urgent: false, argent: prop, lien: `retours`, contester: null })
  }
  const d = decisionEnCours()
  if (d)
    n.push({ id: `san-${d.id}`, type: d.type === 'descente' ? 'palier' : 'sanction', canal: 'notification', titre: { modele: d.type === 'descente' ? 'Descente de palier décidée' : 'Une décision vous concerne' }, texte: { modele: d.motif }, a: d.decideeA, lu0: false, urgent: d.type === 'suspension', argent: false, lien: d.type === 'descente' ? 'palier' : 'sanctions', contester: d.contestation ? null : `contester?d=${d.id}&depuis=notifications` })
  return n
}

function toutes(): Notification[] {
  const prop = estProprietaire()
  const e = etatCommandes.lire()
  const enCours = (ref: string, etape: string) => e[ref]?.etape === etape
  const r4 = c('BLV-00004').retour!
  const n: (Omit<Notification, 'lu'> & { lu0: boolean })[] = [
    { id: 'n12', type: 'message', canal: 'notification', titre: { modele: 'Nouveau message · Client de {ref}', valeurs: { ref: 'BLV-00008' } }, texte: { modele: 'Ouvrez la conversation pour le lire et répondre.' }, a: yaounde(2026, 9, 21, 9, 31), lu0: true, urgent: false, argent: false, lien: 'messages?fil=f-00008', contester: null },
    { id: 'n1', type: 'preparer', canal: 'sms', titre: { modele: '{ref} à préparer · payable au retrait', valeurs: { ref: 'BLV-00009' } }, texte: { modele: 'Prête avant {h}. Rien n’est encaissé : un refus ne vous coûte rien.', heures: { h: c('BLV-00009').echeance! } }, a: c('BLV-00009').payeeA, lu0: false, urgent: enCours('BLV-00009', 'a_preparer'), argent: false, lien: 'commande?ref=BLV-00009', contester: null },
    {
      id: 'n2', type: 'preparer', canal: 'sms', titre: { modele: '{ref} à préparer', valeurs: { ref: 'BLV-00008' } },
      texte: prop ? { modele: 'Prête avant {h} · vous gardez {montant}.', heures: { h: c('BLV-00008').echeance! }, montants: { montant: garde('BLV-00008') } } : { modele: 'Prête avant {h}.', heures: { h: c('BLV-00008').echeance! } },
      a: c('BLV-00008').payeeA, lu0: false, urgent: enCours('BLV-00008', 'a_preparer'), argent: false, lien: 'commande?ref=BLV-00008', contester: null,
    },
    { id: 'n3', type: 'prix', canal: 'notification', titre: { modele: 'ITEL AC52 : un vendeur est passé à {prix}', montants: { prix: 19000 } }, texte: { modele: 'À {conseil}, les clients vous voient de nouveau en premier.', montants: { conseil: 18900 } }, a: yaounde(2026, 9, 21, 8), lu0: true, urgent: false, argent: true, lien: 'offre3', contester: null },
    { id: 'n4', type: 'litige', canal: 'sms', titre: { modele: '{ref} · « {motif} »', valeurs: { ref: 'BLV-00006', motif: c('BLV-00006').litige!.motif } }, texte: { modele: 'Répondez avant {e}. Sans réponse, BelivaY décide en partant de ce que dit le client.', echeances: { e: c('BLV-00006').litige!.echeance } }, a: c('BLV-00006').litige!.ouvertA, lu0: false, urgent: enCours('BLV-00006', 'litige'), argent: false, lien: 'litige?ref=BLV-00006', contester: null },
    {
      id: 'n5', type: 'retour', canal: 'notification', titre: { modele: '{ref} revient : défaut caché', valeurs: { ref: 'BLV-00004' } },
      texte: prop
        ? { modele: '{montant} gelés jusqu’à l’inspection. Arrivée {jour} {creneau}.', montants: { montant: garde('BLV-00004') }, jours: { jour: yaounde(2026, 9, 22, 12) }, creneaux: { creneau: r4.arrivee.creneau } }
        : { modele: 'Arrivée {jour} {creneau}. Vous aurez {n} h pour l’inspecter.', valeurs: { n: REGLES.inspectionH }, jours: { jour: yaounde(2026, 9, 22, 12) }, creneaux: { creneau: r4.arrivee.creneau } },
      a: yaounde(2026, 9, 20, 16, 10), lu0: true, urgent: false, argent: false, lien: 'retours', contester: null,
    },
    { id: 'n6', type: 'litige', canal: 'sms', titre: { modele: '{ref} · « {motif} »', valeurs: { ref: 'BLV-00005', motif: c('BLV-00005').litige!.motif } }, texte: { modele: 'Répondez avant {e}. Sans réponse, BelivaY décide en partant de ce que dit le client.', echeances: { e: c('BLV-00005').litige!.echeance } }, a: c('BLV-00005').litige!.ouvertA, lu0: false, urgent: enCours('BLV-00005', 'litige'), argent: false, lien: 'litige?ref=BLV-00005', contester: null },
    ...alerteN7(),
    { id: 'n8', type: 'versement', canal: 'notification', titre: { modele: 'Vendredi : {montant} sur MTN ···· 4217, sans frais', montants: { montant: garde('BLV-00002') } }, texte: { modele: 'Référence {ref} · couvre BLV-00002.', valeurs: { ref: c('BLV-00002').versement ?? '' } }, a: yaounde(2026, 9, 18, 11, 40), lu0: true, urgent: false, argent: true, lien: 'versements', contester: null },
    { id: 'n9', type: 'avis', canal: 'notification', titre: { modele: 'Nouvel avis · {note} ★ sur {ref}', valeurs: { note: 3, ref: 'BLV-00002' } }, texte: { modele: 'Vous pouvez répondre en privé, par le support, pendant 30 jours.' }, a: yaounde(2026, 9, 16, 18, 5), lu0: true, urgent: false, argent: false, lien: 'avis', contester: null },
    { id: 'n10', type: 'conseil', canal: 'notification', titre: { modele: 'Conseil de la semaine : des photos à la lumière du jour' }, texte: { modele: '2 minutes de lecture : les photos nettes rassurent et vendent plus.' }, a: yaounde(2026, 9, 14, 9), lu0: true, urgent: false, argent: false, lien: 'aide', contester: null },
    // Démonstration : faits plus anciens, déjà lus (versement refusé puis repassé, offre refusée, rupture).
    { id: 'n13', type: 'offre', canal: 'notification', titre: { modele: 'iPhone 15 Pro Max 128 Go : offre refusée' }, texte: { modele: 'Lisez le motif, corrigez et renvoyez : la vérification reprend sous 48 h.' }, a: yaounde(2026, 9, 16, 10, 20), lu0: true, urgent: false, argent: false, lien: 'offre_detail?p=iphone-128', contester: null },
    { id: 'n14', type: 'stock', canal: 'notification', titre: { modele: 'Écouteurs filaires : rupture de stock' }, texte: { modele: 'L’offre n’est plus proposée aux clients tant que le stock est à 0.' }, a: yaounde(2026, 9, 19, 9, 15), lu0: true, urgent: false, argent: false, lien: 'stock', contester: null },
    { id: 'n15', type: 'versement', canal: 'notification', titre: { modele: 'Versement {ref} refusé par l’opérateur', valeurs: { ref: VERSEMENT_REFUSE } }, texte: { modele: 'Compte Mobile Money plein : nouvel essai demain à la même heure, sans frais.' }, a: versementsPasses().find((v) => v.reference === VERSEMENT_REFUSE)?.essais[0] ?? 0, lu0: true, urgent: false, argent: true, lien: 'versements', contester: null },
    { id: 'n11', type: 'offre', canal: 'notification', titre: { modele: 'ITEL AC52 noir vérifié : en vente' }, texte: { modele: 'Votre offre est visible des clients. Gardez le stock à jour.' }, a: yaounde(2026, 9, 10, 15, 20), lu0: true, urgent: false, argent: false, lien: 'offre_detail?p=itel-noir', contester: null },
  ]
  const ev = evenements(prop)
  // Un rappel avant l'échéance remplace l'annonce du même litige (une seule ligne par dossier, la plus récente).
  const rappels = new Set(ev.filter((x) => /^r(24|6)-/.test(x.id)).map((x) => x.lien))
  const r6 = new Set(ev.filter((x) => x.id.startsWith('r6-')).map((x) => x.lien))
  for (let i = n.length - 1; i >= 0; i--) if (n[i].type === 'litige' && rappels.has(n[i].lien)) n.splice(i, 1)
  n.push(...ev.filter((x) => !(x.id.startsWith('r24-') && r6.has(x.lien))))
  // AJ-A : une notification par question de client sans réponse ; elle ouvre la question (Questions des clients).
  for (const q of questionsSansReponse()) n.push({ id: `q-${q.id}`, type: 'message', canal: 'notification', titre: { modele: 'Question d’un client sur {titre}', valeurs: { titre: q.titre } }, texte: { modele: 'Répondez publiquement : la réponse aide aussi les clients suivants.' }, a: q.poseeA, lu0: true, urgent: false, argent: false, lien: `questions?q=${q.id}`, contester: null })
  // Commandes arrivées pendant la visite : même annonce que BLV-00008 (montant gardé pour le propriétaire seulement).
  for (const x of commandesArrivees())
    n.push({
      id: `cmd-${x.ref}`, type: 'preparer', canal: 'sms', titre: { modele: '{ref} à préparer', valeurs: { ref: x.ref } },
      texte: prop ? { modele: 'Prête avant {h} · vous gardez {montant}.', heures: { h: x.echeance! }, montants: { montant: gardeFige(x) } } : { modele: 'Prête avant {h}.', heures: { h: x.echeance! } },
      a: x.payeeA, lu0: false, urgent: enCours(x.ref, 'a_preparer'), argent: false, lien: `commande?ref=${x.ref}`, contester: null,
    })
  for (const x of etat.lire().ajoutees ?? []) n.push({ ...x, lu0: false })
  const lues = etat.lire().lues
  return n
    .filter((x) => prop || !x.argent)
    .map(({ lu0, ...x }) => ({ ...x, lu: lues[x.id] ?? lu0 }))
    .sort((a, b) => b.a - a.a)
}

const etat = magasin('notifications', () => ({
  forme: 2,
  lues: {} as Record<string, boolean>,
  ajoutees: [] as Omit<Notification, 'lu'>[], // écrites par les autres domaines (blocage de connexion, rejeu refusé…)
  reglages: { commandesEtLitiges: true, versements: true, avis: true, conseils: true, sonDistinct: true, silence: ['21:00', '07:00'] } as ReglagesNotifications,
}))
if ((etat.lire() as { forme?: number }).forme !== 2) etat.reinitialiser()

/** Ajoute une notification écrite par un autre domaine de la démonstration (CNX-03 : connexion bloquée ; VD04-R14 :
 * action refusée au rejeu, avec son motif). Le serveur les produit lui-même (vague 3). */
export function ajouterNotification(x: Omit<Notification, 'id' | 'lu'>) {
  etat.ecrire((e) => {
    e.ajoutees = [...(e.ajoutees ?? []), { ...x, id: 'x' + ((e.ajoutees ?? []).length + 1) + '-' + x.a.toString(36) }]
  })
}

export const nonLuesNotifications = () => toutes().filter((n) => !n.lu).length

const reglages = (): ReglagesNotifications => {
  const r = etat.lire().reglages
  return estProprietaire() ? r : { ...r, versements: false }
}

export const demoNotifications: DomaineNotifications = {
  liste: (filtre) => repondre(toutes().filter((n) => filtre === 'tout' || (filtre === 'urgent' ? n.urgent : n.argent))),
  compteurs: () => {
    const t = toutes()
    return repondre({ tout: t.length, urgent: t.filter((n) => n.urgent).length, argent: t.filter((n) => n.argent).length, nonLues: t.filter((n) => !n.lu).length })
  },
  nonLues: () => repondre(nonLuesNotifications()),
  async marquerLue(id, lue = true) {
    etat.ecrire((e) => {
      e.lues[id] = lue
    })
  },
  async toutMarquerLu() {
    const ids = toutes().map((n) => n.id)
    etat.ecrire((e) => {
      for (const id of ids) e.lues[id] = true
    })
  },
  reglages: () => repondre(reglages()),
  async regler(champs) {
    etat.ecrire((e) => {
      const permis = estProprietaire() ? champs : { ...champs, versements: undefined }
      for (const [k, v] of Object.entries(permis)) if (typeof v === 'boolean') (e.reglages as unknown as Record<string, boolean>)[k] = v
    })
    return reglages()
  },
}
