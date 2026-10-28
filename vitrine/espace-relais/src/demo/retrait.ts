// DONNÉES DE DÉMONSTRATION — domaine « retrait » : la remise au comptoir. Le « serveur » vérifie le code présenté contre
// l'empreinte du code de chaque colis (ARL-01 : un code par colis) ; le gérant ne le voit jamais. La garde du groupe est
// calculée par calculs/garde.ts, encaissée en espèces une seule fois, au premier retrait du groupe (ARL-02) ; la remise
// passe par calculs/cycle.ts (encaissement confirmé, paiement Mobile Money confirmé, contrôle, photo, PIN).
// Simulations (l'agrégateur et l'application du client n'existent pas ici) : le webhook du paiement au comptoir arrive
// quelques secondes après la demande ; l'appui du client sur « Tout est en ordre » dans son application, quelques
// secondes après l'invitation. Un minuteur les pose (l'horloge des tests est figée) ; à la relecture, l'heure suffit.
import { PARAMETRES } from '../calculs/registre'
import { monnaieARendre, retenueApresRefus } from '../calculs/comptoir'
import { REMETTABLES as ETATS_REMETTABLES } from '../calculs/cycle'
import { PARAMETRES_MOTEURS } from '../calculs/parametres-moteurs'
import { conditionsDeRemise, gardeAEncaisser } from '../calculs/remise'
import { etat as etatGarde, joursDeGarde } from '../calculs/garde'
import { HEURE, jourDe, type Jour } from '../calculs/temps'
import type { Acteur, Francs, Origine } from '../donnees/communs'
import type { ColisRelais } from '../donnees/domaines/colis'
import type { ControleRemise, DetailCode, DomaineRetrait, LigneGarde, PreuveRemise, RefusRetrait, Remise } from '../donnees/domaines/retrait'
import type { RefusGeste } from './colis'
import { appliquer, empreinte, etatColis, gardeDuGroupe, preuve, qrDemo, tousLesColis, unColis } from './colis'
import { aujourdhui, maintenant } from './horloge'
import { etatFile } from './horsligne'
import { notifier } from './notifications'
import { acteurActuel, membreActuel, verifierPin } from './session'
import { pontRemise } from './pont-relais'
import { magasin, repondre } from './stockage'

const P = PARAMETRES.relais
const M = PARAMETRES_MOTEURS
/** PR-PIN-REMISE-ESSAIS (ARL-42, calculs/parametres-moteurs) et PR-PAY-COMPTOIR-DELAI-MIN (webhook, registre). */
const PIN_REMISE_ESSAIS = M.pinRemiseEssais
const PAIEMENT_DELAI_MIN = PARAMETRES.relais.paiementComptoirDelaiMin
/** DÉMONSTRATION : délais simulés du webhook de l'agrégateur et de l'appui du client dans son application. */
const DELAI_WEBHOOK_MS = 6_000
const DELAI_CLIENT_MS = 4_000
/** DÉMONSTRATION : numéros que le « serveur » connaît pour les commandes payables au retrait (jamais renvoyés). */
const NUMEROS: Record<string, string> = { 'BLV-00032': '650114477', 'BLV-00038': '691220318' }
const enLigne = () => typeof navigator === 'undefined' || navigator.onLine !== false

interface RemiseDemo {
  id: string
  client: string
  verifies: string[] // colis dont le code juste a été présenté
  recherches: string[] // colis retrouvés par la référence (payables au retrait, sans code)
  controle: ControleRemise | null
  inviteA: number | null
  encaisse: { montant: Francs; recu: Francs | null; monnaie: Francs; par: string; le: number; cle: string } | null
  paiement: { demandeA: number; reference: string | null; operateur: 'MTN' | 'Orange'; echoue: boolean } | null
  preuve: PreuveRemise | null
  codeFaux: number
  pinFaux: number
  annulee: Remise['annulee']
  creeeA: number
  remiseA: number | null
  gain: { colis: Francs; garde: Francs } | null
}
export const etatRetrait = magasin('retrait', () => ({ remises: {} as Record<string, RemiseDemo>, cles: [] as string[], fauxSansClient: 0 }))

const REMETTABLE = (c: ColisRelais) => ETATS_REMETTABLES.includes(c.etat)
const clientDe = (id: string) => etatColis.lire().colis[id]?.client ?? '—'
const nouvelle = (id: string, client: string, heure: number): RemiseDemo => ({ id, client, verifies: [], recherches: [], controle: null, inviteA: null, encaisse: null, paiement: null, preuve: null, codeFaux: 0, pinFaux: 0, annulee: null, creeeA: heure, remiseA: null, gain: null })
const ecrireRemise = (id: string, f: (r: RemiseDemo) => void) => etatRetrait.ecrire((x) => void (x.remises[id] && f(x.remises[id])))
const refus = (raison: RefusRetrait, d?: DetailCode) => ({ ok: false as const, raison, ...(d ? { detail: JSON.stringify(d) } : {}) })
const journal = (colisId: string, action: string, par: Acteur, detail: string | null, cle: string, le = maintenant(), signe = false) =>
  etatColis.ecrire((e) => void e.colis[colisId]?.journal.push({ le, action, par, signe, detail, cle }))

/** Détail de la garde d'un groupe jour par jour (ticket), jusqu'au jour du retrait. */
/** Détail jour par jour (calculs/garde.ts : joursDeGarde) : un constat gèle la garde et repousse le calendrier
 * (ARL-43) : jour sans rang → « constat, sans frais » ; jour fermé → « relais fermé », ni compté ni facturé (R37). */
function detailGarde(groupeId: string, jour: Jour): LigneGarde[] {
  const g = gardeDuGroupe(etatColis.lire(), groupeId)
  if (!g?.j0) return []
  return joursDeGarde(g, jour, P.garde).map((j) => {
    const nature: LigneGarde['nature'] = j.suspendu ? 'suspendu' : j.ferme ? 'ferme' : j.rang === null ? 'suspendu' : j.tarif === 0 ? 'offert' : 'payant'
    return { jour: j.jour, rang: j.rang, nature, aujourdhui: j.jour === jour, montant: nature === 'payant' || nature === 'offert' ? j.tarif : 0 }
  })
}

// ── Simulations (webhook, application du client) ────────────────────────────────────────────────────────────────
function confirmerPaiement(id: string) {
  const r = etatRetrait.lire().remises[id]
  if (!r?.paiement || r.paiement.reference || r.paiement.echoue || r.annulee) return
  const reference = 'CP-' + (5_522_000 + Math.floor((r.paiement.demandeA / 1000) % 1000))
  ecrireRemise(id, (x) => void (x.paiement!.reference = reference))
  etatColis.ecrire((e) => {
    for (const cid of [...r.recherches, ...r.verifies]) {
      const c = e.colis[cid]
      if (c?.paiement.mode !== 'au_comptoir') continue
      // v6 D14 : le paiement crée le séquestre et débloque le code (envoyé au client par SMS et dans son application).
      Object.assign(c.paiement, { etat: 'confirme', reference })
      c.journal.push({ le: maintenant(), action: 'paiement_confirme', par: { type: 'client', nom: null, membreId: null }, signe: false, detail: reference, cle: null })
    }
  })
}
function confirmerParLeClient(id: string) {
  const r = etatRetrait.lire().remises[id]
  if (!r || r.controle !== 'attente_client' || r.annulee) return
  ecrireRemise(id, (x) => void (x.controle = 'en_ordre'))
  for (const c of r.verifies) journal(c, 'tout_en_ordre', { type: 'client', nom: null, membreId: null }, 'confirmé dans l’application du client', 'client-' + id)
}
const programmer = (f: () => void, ms: number) => typeof window !== 'undefined' && window.setTimeout(f, ms)

/** Rattrapage à la relecture (minuteur perdu par un rechargement) : l'heure suffit. */
function rattraper(r: RemiseDemo) {
  const t = maintenant()
  if (r.paiement && !r.paiement.reference && !r.paiement.echoue && t >= r.paiement.demandeA + DELAI_WEBHOOK_MS) confirmerPaiement(r.id)
  if (r.controle === 'attente_client' && r.inviteA !== null && t >= r.inviteA + DELAI_CLIENT_MS) confirmerParLeClient(r.id)
}

function vueRemise(id: string): Remise | null {
  const r0 = etatRetrait.lire().remises[id]
  if (!r0) return null
  rattraper(r0)
  const r = etatRetrait.lire().remises[id]
  const e = etatColis.lire()
  const jour = r.remiseA ? jourDe(r.remiseA) : aujourdhui()
  const colis = [...r.verifies, ...r.recherches].map((x) => unColis(x)).filter((x): x is ColisRelais => !!x)
  const groupes = [...new Set(colis.map((c) => c.groupe))]
  // Garde du groupe, encaissée une fois au premier retrait (calculs/remise.ts : gardeAEncaisser, ARL-02).
  const dus = groupes.map((g) => {
    const enc = e.groupes[g]?.encaissee ?? null
    const gg = gardeDuGroupe(e, g)
    return { g, enc, du: gg ? gardeAEncaisser(gg, jour, !!enc, M) : 0 }
  })
  const du = r.encaisse?.montant ?? dus.reduce((n, x) => n + (x.enc ? 0 : x.du), 0)
  const aPayer = colis.filter((c) => c.paiement.mode === 'au_comptoir')
  const t = maintenant()
  const porteur = colis.find((c) => c.porteurDesigne)?.porteurDesigne ?? null
  const bloques = tousLesColis().filter((c) => clientDe(c.id) === r.client && c.code.bloqueJusqua)
  const expireA = r.paiement ? r.paiement.demandeA + PAIEMENT_DELAI_MIN * 60_000 : null
  const membre = membreActuel()
  return {
    id,
    client: { prenomInitiale: r.client },
    colis: colis.map((c) => {
      const g = e.groupes[c.groupe]
      return { id: c.id, groupe: c.groupe, rangDansGroupe: c.rangDansGroupe, totalGroupe: g?.total ?? 1, classe: c.classe, emplacement: c.emplacement, arriveLe: c.arrivee.le, rang: c.garde?.rang ?? null, renvoiLe: c.garde?.renvoiLe ?? null, codeVerifie: r.verifies.includes(c.id), auComptoir: c.paiement.mode === 'au_comptoir', fragile: c.fragile }
    }),
    autresColis: r.remiseA || r.annulee
      ? []
      : tousLesColis()
          .filter((c) => REMETTABLE(c) && c.code.envoye && clientDe(c.id) === r.client && !r.verifies.includes(c.id) && !r.recherches.includes(c.id))
          .map((c) => ({ id: c.id, classe: c.classe, emplacement: c.emplacement })),
    garde: {
      du,
      detail: groupes.filter((g) => !dus.find((x) => x.g === g)?.enc || r.remiseA).flatMap((g) => detailGarde(g, jour)),
      dejaReglee: groupes.length > 0 && !r.encaisse && dus.every((x) => x.enc),
      encaissement: r.encaisse ? { montant: r.encaisse.montant, recu: r.encaisse.recu, monnaie: r.encaisse.monnaie, par: r.encaisse.par, le: r.encaisse.le } : null,
    },
    paiement: aPayer.length
      ? {
          montant: aPayer.reduce((n, c) => n + c.paiement.montant, 0),
          etat: aPayer.every((c) => c.paiement.etat === 'confirme') ? 'confirme' : r.paiement?.echoue ? 'echoue' : r.paiement && expireA !== null && t >= expireA ? 'expire' : r.paiement ? 'demande_envoyee' : 'a_payer',
          operateur: r.paiement?.operateur ?? null,
          reference: aPayer.find((c) => c.paiement.reference)?.paiement.reference ?? null,
          demandeA: r.paiement?.demandeA ?? null,
          expireA,
        }
      : null,
    porteurDesigne: porteur,
    // R89 : aucune pièce, aucun plafond de valeur pour la personne qui retire à la place du client.
    pieceExigee: false,
    colisDeValeur: false,
    controle: r.controle,
    inviteA: r.inviteA,
    preuve: r.preuve,
    essaisRestants: Math.max(P.code.essais - r.codeFaux, 0),
    bloqueJusqua: bloques.length ? Math.max(...bloques.map((c) => c.code.bloqueJusqua!)) : null,
    pinEssaisRestants: Math.max(PIN_REMISE_ESSAIS - r.pinFaux, 0),
    annulee: r.annulee,
    creeeA: r.creeeA,
    remiseA: r.remiseA,
    // La rémunération ne part qu'au membre qui a le droit « argent » (le serveur filtre, PR-RC-09).
    gain: membre && (membre.role === 'proprietaire' || membre.droits.includes('argent')) ? r.gain : null,
  }
}

const RAISONS: Partial<Record<RefusGeste, RefusRetrait>> = { paiement_non_confirme: 'paiement_requis', pin_requis: 'pin_faux', code_bloque: 'bloque', introuvable: 'introuvable', scelle_requis: 'transition_interdite' }
const raison = (r: RefusGeste): RefusRetrait => RAISONS[r] ?? (r as RefusRetrait)
/** Blocages du moteur (conditionsDeRemise) → refus du domaine. */
const BLOCAGES: Record<string, RefusRetrait> = {
  constat_en_cours: 'probleme_signale',
  code_bloque: 'bloque',
  code_requis: 'code_faux',
  remise_annulee: 'remise_annulee',
  paiement_hors_ligne: 'reseau_requis',
  paiement_comptoir: 'paiement_requis',
  plafond_hors_ligne: 'plafond_hors_ligne',
  encaissement_garde: 'encaissement_non_confirme',
  montant_recu_insuffisant: 'montant_insuffisant',
  piece_a_verifier: 'piece_non_verifiee',
  photo_de_remise: 'photo_manquante',
}

/** Contre-écriture des espèces (PR-RC-31) : la remise n'a pas lieu, les espèces sont rendues devant le gérant. */
function rendreEspeces(r: RemiseDemo, motif: string, o: Origine): Francs {
  if (!r.encaisse || r.encaisse.montant === 0) return 0
  journal(r.verifies[0] ?? r.recherches[0], 'especes_rendues', acteurActuel(), `contre-écriture −${r.encaisse.montant} F · ${motif}`, o.cle, o.heure)
  return r.encaisse.montant
}

function annuler(id: string, motif: NonNullable<Remise['annulee']>['motif'], constat: string | null, o: Origine): Francs {
  const r = etatRetrait.lire().remises[id]
  if (!r || r.annulee || r.remiseA) return r?.annulee?.especesRendues ?? 0
  const rendues = rendreEspeces(r, motif === 'pin' ? 'remise annulée (PIN faux)' : motif === 'probleme' ? 'constat au comptoir' : 'remise abandonnée', o)
  ecrireRemise(id, (x) => void (x.annulee = { motif, le: o.heure, especesRendues: rendues, constat }))
  return rendues
}

export const demoRetrait: DomaineRetrait = {
  async verifierCode(saisie, remiseId, o) {
    const brut = saisie.valeur.trim()
    const e = etatColis.lire()
    let code = ''
    if (saisie.methode === 'qr') {
      const m = /^BLV1\.(\d+)$/.exec(brut)
      if (m) code = m[1]
      else {
        // Étiquette d'un colis (« BLV-00008-1 ») au lieu du code du client : ici, ou pour un autre relais (REC-11).
        const etiquette = /^BLV-\d{5}-\d+$/i.exec(brut)?.[0].toUpperCase()
        if (etiquette && e.colis[etiquette]) return refus('etiquette', { colis: etiquette })
        return refus('pas_au_relais', etiquette ? { colis: etiquette } : undefined)
      }
    } else code = brut.replace(/\D/g, '')
    const trouve = code.length === P.code.longueur ? tousLesColis().find((c) => e.colis[c.id].code.empreinte === empreinte(code) && (c.code.envoye || !REMETTABLE(c))) : undefined
    const r = remiseId ? etatRetrait.lire().remises[remiseId] : null
    if (!trouve) {
      // Code faux. Client identifié : compté sur ses colis (DP-26 : CODE-ESSAIS de suite, colis bloqués CODE-BLOCAGE-H
      // heures, le client redemande un code). Sinon, compté au guichet : au-delà, BelivaY est alerté (ARL-72).
      if (r && !r.remiseA && !r.annulee) {
        const faux = r.codeFaux + 1
        ecrireRemise(r.id, (x) => void (x.codeFaux = faux))
        if (faux >= P.code.essais) {
          const jusqua = o.heure + P.code.blocageHeures * HEURE
          etatColis.ecrire((x) => {
            for (const c of Object.values(x.colis)) if (c.client === r.client && !r.verifies.includes(c.id) && (c.etat === 'en_stock' || c.etat === 'dernier_jour')) Object.assign(c.code, { faux: 0, bloqueJusqua: jusqua })
          })
          ecrireRemise(r.id, (x) => void (x.codeFaux = 0))
          return refus('bloque', { bloqueJusqua: jusqua })
        }
        return refus('code_faux', { essaisRestants: P.code.essais - faux })
      }
      const faux = etatRetrait.lire().fauxSansClient + 1
      etatRetrait.ecrire((x) => void (x.fauxSansClient = faux))
      if (faux >= P.code.essais) return refus('trop_de_codes', { essaisRestants: 0 })
      return refus('code_faux', { essaisRestants: P.code.essais - faux })
    }
    if (!REMETTABLE(trouve)) {
      if (trouve.etat === 'remis' || trouve.etat === 'parti') return refus('deja_remis', { colis: trouve.id })
      return refus('non_remettable', { colis: trouve.id, etat: trouve.etat, constat: trouve.constat })
    }
    if (trouve.code.bloqueJusqua) return refus('bloque', { bloqueJusqua: trouve.code.bloqueJusqua, colis: trouve.id })
    const client = clientDe(trouve.id)
    const id = r && r.client === client && !r.remiseA && !r.annulee ? r.id : 'R-' + o.cle.slice(0, 8)
    etatRetrait.ecrire((x) => {
      x.fauxSansClient = 0
      const y = (x.remises[id] ??= nouvelle(id, client, o.heure))
      if (!y.verifies.includes(trouve.id)) y.verifies.push(trouve.id)
      y.recherches = y.recherches.filter((c) => c !== trouve.id)
      y.codeFaux = 0
      // Un colis ajouté après « Tout est en ordre » : le contrôle et la preuve se refont pour tous les colis.
      if (y.controle) Object.assign(y, { controle: null, inviteA: null, preuve: null })
    })
    etatColis.ecrire((x) => void (x.colis[trouve.id].code.faux = 0))
    return { ok: true, remise: vueRemise(id)! }
  },
  async rechercher(q) {
    // Référence (commande « BLV-00038 » ou colis « BLV-00038-1 »), ou numéro dicté par le client : jamais renvoyé.
    const refs = 'reference' in q ? [q.reference.trim().toUpperCase()] : Object.entries(NUMEROS).filter(([, n]) => n === q.telephone.replace(/\D/g, '').replace(/^237/, '')).map(([g]) => g)
    const l = tousLesColis().filter((c) => REMETTABLE(c) && c.paiement.mode === 'au_comptoir' && refs.some((ref) => c.id === ref || c.groupe === ref))
    if (!l.length) return null
    const client = clientDe(l[0].id)
    const existante = Object.values(etatRetrait.lire().remises).find((x) => !x.remiseA && !x.annulee && x.client === client)
    const id = existante?.id ?? 'R-ref-' + l[0].groupe + '-' + maintenant().toString(36)
    etatRetrait.ecrire((x) => {
      const y = (x.remises[id] ??= nouvelle(id, client, maintenant()))
      for (const c of l) if (!y.verifies.includes(c.id) && !y.recherches.includes(c.id)) y.recherches.push(c.id)
    })
    return vueRemise(id)
  },
  remise: async (id) => repondre(vueRemise(id)),
  async demanderPaiement(id, o) {
    const r = etatRetrait.lire().remises[id]
    if (!r || r.annulee || r.remiseA) return refus('introuvable')
    if (!enLigne()) return refus('reseau_requis') // OFF-02 : jamais hors ligne
    if (etatRetrait.lire().cles.includes(o.cle)) return { ok: true }
    etatRetrait.ecrire((x) => void ((x.remises[id].paiement = { demandeA: o.heure, reference: null, operateur: 'MTN', echoue: false }), x.cles.push(o.cle)))
    programmer(() => confirmerPaiement(id), DELAI_WEBHOOK_MS)
    return { ok: true }
  },
  async annulerPaiement(id) {
    const r = etatRetrait.lire().remises[id]
    if (!r) return refus('introuvable')
    if (r.paiement?.reference) return refus('transition_interdite')
    ecrireRemise(id, (x) => void (x.paiement = null))
    return { ok: true }
  },
  async confirmerEncaissement(id, recu, o) {
    const v = vueRemise(id)
    const r = etatRetrait.lire().remises[id]
    if (!v || !r || r.annulee || r.remiseA) return refus('introuvable')
    if (r.encaisse) return { ok: true, monnaie: r.encaisse.monnaie }
    const m = monnaieARendre(v.garde.du, recu)
    if (!m.suffisant) return refus('montant_insuffisant')
    const par = acteurActuel()
    ecrireRemise(id, (x) => void (x.encaisse = { montant: v.garde.du, recu, monnaie: m.monnaie, par: par.nom ?? '', le: o.heure, cle: o.cle }))
    // Journal (ARL-32) : colis et groupe, dû, reçu, monnaie, membre, heure ; signé par le PIN de la remise (ARL-74).
    if (v.garde.du > 0) {
      const premier = v.colis.find((c) => c.codeVerifie) ?? v.colis[0]
      journal(premier.id, 'especes_encaissees', par, `garde du groupe ${premier.groupe} · dû ${v.garde.du} F${recu !== null ? ` · reçu ${recu} F · monnaie ${m.monnaie} F` : ''}`, o.cle, o.heure)
    }
    return { ok: true, monnaie: m.monnaie }
  },
  async inviterControle(id, o) {
    const r = etatRetrait.lire().remises[id]
    if (!r || r.annulee || r.remiseA) return refus('introuvable')
    if (!enLigne()) return refus('reseau_requis') // la demande part dans l'application du client
    if (r.controle === 'en_ordre') return { ok: true }
    ecrireRemise(id, (x) => void Object.assign(x, { controle: 'attente_client', inviteA: o.heure }))
    programmer(() => confirmerParLeClient(id), DELAI_CLIENT_MS)
    return { ok: true }
  },
  async nePasOuvrir(id, o) {
    const r = etatRetrait.lire().remises[id]
    if (!r || r.annulee || r.remiseA) return refus('introuvable')
    if (r.controle === 'en_ordre') return { ok: true }
    ecrireRemise(id, (x) => void (x.controle = 'sans_ouverture'))
    for (const c of r.verifies) journal(c, 'sans_ouverture', acteurActuel(), 'Remis sans ouverture, à la demande du client', o.cle, o.heure)
    return { ok: true }
  },
  async poserPreuve(id, p) {
    const r = etatRetrait.lire().remises[id]
    if (!r || r.annulee || r.remiseA) return refus('introuvable')
    if (!p.photo) return refus('photo_manquante')
    const v = vueRemise(id)!
    // R89 (BV-DEV v2.0), tel qu'écrit : une autre personne retire avec le code partagé ; le gérant saisit son nom et son
    // numéro, le client est averti dans son application. Ni pièce d'identité, ni plafond de valeur, ni code nominatif.
    if (p.porteur !== 'client' && (!p.nomPorteur?.trim() || !p.telephonePorteur?.trim())) return refus('porteur_requis')
    void v
    ecrireRemise(id, (x) => void (x.preuve = { ...p, porteur: p.porteur === 'client' ? 'client' : 'tiers', nomPorteur: p.porteur === 'client' ? null : p.nomPorteur!.trim(), telephonePorteur: p.porteur === 'client' ? null : p.telephonePorteur!.trim(), pieceVerifiee: false }))
    return { ok: true }
  },
  async remettre(id, pin, o) {
    const v = vueRemise(id)
    const r = etatRetrait.lire().remises[id]
    if (!v || !r) return refus('introuvable')
    if (r.remiseA) return { ok: true, remise: v } // rejeu : jamais deux effets (PR-RC-30)
    if (r.annulee) return refus('remise_annulee')
    if (!v.colis.length || v.colis.some((c) => !c.codeVerifie)) return refus(v.paiement && v.paiement.etat !== 'confirme' ? 'paiement_requis' : 'code_faux')
    if (!r.preuve) return refus('photo_manquante')
    // Blocages ordonnés du moteur (calculs/remise.ts, relais.py) : vérifiés avant la signature par le PIN.
    for (const c of v.colis) {
      const g = gardeDuGroupe(etatColis.lire(), c.groupe)
      if (!g) continue
      const k = conditionsDeRemise(
        {
          colis: c.id,
          groupe: g,
          jour: jourDe(o.heure),
          codeJuste: c.codeVerifie,
          codeBloque: v.bloqueJusqua !== null && !c.codeVerifie,
          gardeDejaEncaissee: !!etatColis.lire().groupes[c.groupe]?.encaissee,
          encaissementConfirme: !!r.encaisse,
          montantRecu: r.encaisse?.recu ?? null,
          resteAPayer: c.auComptoir && v.paiement?.etat !== 'confirme' ? (v.paiement?.montant ?? 0) : 0,
          paiementConfirme: v.paiement?.etat === 'confirme',
          porteurDesigne: r.preuve.porteur === 'designe',
          pieceVerifiee: r.preuve.pieceVerifiee,
          photo: !!r.preuve.photo,
          pinFaux: r.pinFaux,
          pinOk: true,
          horsLigne: !enLigne(),
          remisesHorsLigneDuJour: etatFile.lire().remisesHorsLigneDuJour,
        },
        M,
      )
      const premier = k.blocages[0]?.code
      if (premier && BLOCAGES[premier]) return refus(BLOCAGES[premier])
    }
    const verdict = verifierPin(pin)
    if (verdict === 'bloque') {
      annuler(id, 'pin', null, o)
      return refus('pin_bloque')
    }
    if (verdict !== 'ok') {
      const faux = r.pinFaux + 1
      ecrireRemise(id, (x) => void (x.pinFaux = faux))
      if (faux >= PIN_REMISE_ESSAIS) {
        // ARL-42 : la remise est annulée, le colis reste en stock, les espèces sont rendues, le gérant est prévenu.
        annuler(id, 'pin', null, o)
        notifier({ id: 'N-pin-' + id, cle: 'relais.remise_annulee_pin', vars: { n: PIN_REMISE_ESSAIS }, route: 'historique', quand: o.heure })
        return refus('remise_annulee')
      }
      return refus('pin_faux', { essaisRestants: PIN_REMISE_ESSAIS - faux })
    }
    const par = acteurActuel()
    const p = r.preuve
    const ctx = {
      photos: 1,
      pinOk: true,
      // Remise en deux touchers : l'invitation « Tout est en ordre » part d'elle-même, sans bloquer ; sans réponse du
      // client (ou hors ligne), la remise se fait et sa fenêtre de retour reste ouverte (journal « sans_confirmation »).
      controle: r.controle === 'probleme' ? 'probleme' as const : 'en_ordre' as const,
      gardeDue: v.garde.du,
      encaissementConfirme: !!r.encaisse,
      payableAuRetrait: !!v.paiement,
      paiementConfirme: v.paiement?.etat === 'confirme',
      codeBloque: false,
      formationOk: membreActuel()?.formationOk ?? false,
      enLigne: enLigne(),
      // ARL-137 : seules les remises hors ligne avec garde due comptent dans PR-HL-REMISES.
      remisesHorsLigneDuJour: v.garde.du > 0 ? etatFile.lire().remisesHorsLigneDuJour : 0,
    }
    let gainColis = 0
    let gainGarde = 0
    for (const c of v.colis) {
      const t = appliquer(c.id, 'remettre', ctx, o, par, (x, e) => {
        x.remise = { le: o.heure, par, porteur: p.porteur === 'client' ? 'client' : 'tiers', pieceVerifiee: p.pieceVerifiee, photo: p.photo }
        preuve(x, 'remise', [p.photo], par, o.heure)
        if (p.porteur === 'tiers') x.journal.push({ le: o.heure, action: 'porteur_nomme', par, signe: true, detail: `retiré par ${p.nomPorteur} (${p.telephonePorteur ?? '—'}) · client averti dans son application (R89)`, cle: o.cle })
        if (!r.controle || r.controle === 'attente_client') x.journal.push({ le: o.heure, action: 'sans_confirmation', par, signe: false, detail: 'Remis sans « Tout est en ordre » du client : fenêtre de retour ouverte', cle: o.cle })
        gainColis += P.gainColis[x.classe]
        const g = e.groupes[x.groupe]
        // Garde du groupe encaissée une seule fois, au premier retrait (ARL-02) ; part BelivaY due dès la remise (v6 D12).
        if (g && !g.encaissee) {
          const gg = gardeDuGroupe(e, x.groupe)
          gainGarde += gg ? etatGarde(gg, jourDe(o.heure), P.garde, o.heure).gainRelais : 0
          g.encaissee = { montant: r.encaisse?.montant ?? 0, le: o.heure, par: par.nom ?? '' }
          x.journal.push({ le: o.heure, action: 'especes_signees', par, signe: true, detail: `garde du groupe ${x.groupe} · ${r.encaisse?.montant ?? 0} F`, cle: o.cle })
        }
      }, r.controle === 'sans_ouverture' ? 'Remis sans ouverture, à la demande du client' : null)
      if (!t.ok) return refus(raison(t.raison))
    }
    ecrireRemise(id, (x) => void Object.assign(x, { remiseA: o.heure, gain: { colis: gainColis, garde: gainGarde } }))
    // pont : handover.completed (client : reçu et remerciement ; vendeur : livré ; console)
    for (const c of v.colis) pontRemise(c.id, o)
    if (!ctx.enLigne && v.garde.du > 0) etatFile.ecrire((f) => void (f.remisesHorsLigneDuJour += 1))
    return { ok: true, remise: vueRemise(id)! }
  },
  async refusSansMotif(id, pin, o) {
    const v = vueRemise(id)
    const r = etatRetrait.lire().remises[id]
    if (!v?.paiement || !r) return refus('introuvable')
    if (r.remiseA) return { ok: true }
    if (v.paiement.etat === 'confirme') return refus('transition_interdite') // payée : un refus passe par un constat
    if (verifierPin(pin) !== 'ok') return refus('pin_faux')
    for (const c of v.colis.filter((x) => x.auComptoir)) {
      const t = appliquer(c.id, 'refus_sans_motif', { pinOk: true }, o, acteurActuel(), (x, e) => {
        x.sortie = { motif: 'refus', destination: null, collecte: null, le: null }
        // DP-24 : la garde due est retenue sur la livraison payée d'avance, jamais au-delà.
        const g = gardeDuGroupe(e, x.groupe)
        const du = g ? etatGarde(g, jourDe(o.heure), P.garde, o.heure).du : 0
        const ret = retenueApresRefus(x.paye, du)
        x.journal.push({ le: o.heure, action: 'retenue_refus', par: { type: 'systeme', nom: null, membreId: null }, signe: false, detail: `garde retenue ${ret.retenue} F, non réclamé ${ret.nonReclame} F`, cle: o.cle })
      })
      if (!t.ok) return refus(raison(t.raison))
    }
    rendreEspeces(r, 'refus sans motif', o)
    ecrireRemise(id, (x) => void (x.annulee = { motif: 'refus', le: o.heure, especesRendues: r.encaisse?.montant ?? 0, constat: null }))
    return { ok: true }
  },
  async abandonner(id, motif, constat, o) {
    const r = etatRetrait.lire().remises[id]
    if (!r) return refus('introuvable')
    if (r.remiseA) return refus('deja_remis')
    if (motif === 'probleme') ecrireRemise(id, (x) => void (x.controle = 'probleme'))
    return { ok: true, especesRendues: annuler(id, motif, constat, o) }
  },
  async presentables() {
    return repondre(
      tousLesColis()
        .filter((c) => REMETTABLE(c) && c.code.envoye && !c.code.bloqueJusqua)
        .map((c) => ({ colis: c.id, client: clientDe(c.id), classe: c.classe })),
    )
  },
  async simulerPresentation(colisId) {
    const c = unColis(colisId)
    return c?.code.envoye && REMETTABLE(c) ? { methode: 'qr', valeur: qrDemo(colisId) } : null
  },
  async simulerRefusPaiement(id) {
    ecrireRemise(id, (x) => void (x.paiement && !x.paiement.reference && (x.paiement.echoue = true)))
  },
}

/** Remises faites aujourd'hui (caisse, historique) : lues dans le modèle central. */
export const remisDuJour = (jour = aujourdhui()) => tousLesColis().filter((c) => c.remise && jourDe(c.remise.le) === jour)
