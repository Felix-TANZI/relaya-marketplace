// DONNÉES DE DÉMONSTRATION — domaine « remise » : livreur du créneau (passage du livreur de la boutique), code de
// remise à 6 chiffres demandé au toucher et journalisé, codes faux et blocage (CODE-ESSAIS), nouveau code (DP-56),
// livreur absent (créneau passé sans remise, ou simulé), annulation par le client avant le ramassage, plafond de
// valeur du colis (TRANSP-PLAFOND), reçu vendeur. Les montants viennent de src/calculs (gardé figé au paiement).
// « Application du livreur » et « client » : simulés ici (saisieLivreur, simuler), car leurs interfaces ne sont pas
// dans l'espace vendeur ; en production, ce sont leurs applications qui écrivent (handover.completed, annulation).
import type { DomaineRemise, NiveauLivreur, PhotoRemise, Recu, Remise, RecuResume } from '../donnees/domaines/remise'
import { ReserveAuProprietaire } from '../donnees/communs'
import { PARAMETRES, REGISTRE } from '../calculs/registre'
import { HEURE, ajouterJours, debutDuJour, jourDe, jourSemaine } from '../calculs/temps'
import { vendrediDeVersement } from '../calculs/versements'
import { ParametreIllisible } from '../calculs/erreurs'
import { maintenant } from './horloge'
import { ARTICLES, BOUTIQUE, COMMANDES, LIVREUR, type CommandeEssai } from './jeu-essai'
import { etatCommandes, gardeFige, journaliser, vueCommande } from './commandes'
import { demoProduits } from './produits'
import { estProprietaire, exigerDroit, roleCourant } from './session'
import { magasin, repondre } from './stockage'

// ── Paramètres (registre en vigueur : jamais écrits dans un écran) ──────────────────────────────────────────────
function lireParametres() {
  const essais = /^(\d+) ⇒ blocage (\d+) h$/.exec(REGISTRE['CODE-ESSAIS'] ?? '')
  if (!essais) throw new ParametreIllisible('CODE-ESSAIS : « N ⇒ blocage H h » attendu')
  const plafonds = /^([\d  ]+) F Nouveau · ([\d  ]+) F Confirmé/.exec(REGISTRE['TRANSP-PLAFOND'] ?? '')
  if (!plafonds) throw new ParametreIllisible('TRANSP-PLAFOND : « X F Nouveau · Y F Confirmé » attendu')
  const n = (s: string) => Number(s.replace(/\D/g, ''))
  return { essaisMax: Number(essais[1]), blocageHeures: Number(essais[2]), plafonds: { nouveau: n(plafonds[1]), confirme: n(plafonds[2]) } }
}
const P = lireParametres()
// Âge maximal d'une action en file hors connexion (OFFLINE_ACTION_TTL_H = HORS_LIGNE_FILE_MAX_H, Décidé, VD-04 OFF-04) :
// absent du registre en vigueur ; valeur de parametres-vendeur.json, à lire du serveur en vague 3.
export const FILE_HEURES = PARAMETRES.console.fileHeures // VD-FILE-HORS-LIGNE (OFF-04)

// Photos de démonstration (dessins du prototype, remplaçables par les vraies photos du dossier de la commande).
const PORTRAIT_LIVREUR = 'd0b26c91c6a1'
const PHOTO_DECOUVERT = '31d53847e649'
const PHOTO_SCELLE = '97f264a1205c'
const LIEU = BOUTIQUE.quartier.split(' / ').pop() ?? BOUTIQUE.quartier

// Code de remise de démonstration (le serveur le tire au hasard, à usage unique, et le chiffre : VD06-R01).
const premierCode = (ref: string) => (ref === 'BLV-00008' ? '481729' : String((Number(ref.replace(/\D/g, '')) * 481729 + 97) % 1000000).padStart(6, '0'))
const codeSuivant = (c: string) => String((Number(c) * 7 + 130013) % 1000000).padStart(6, '0')

const etat = magasin('remise', () => ({
  codes: {} as Record<string, string>,
  faux: {} as Record<string, number>,
  bloqueJusqua: {} as Record<string, number>,
  nouveauCode: {} as Record<string, boolean>,
  remises: {} as Record<string, number>,
  photos: {} as Record<string, PhotoRemise[]>,
  absences: {} as Record<string, number>, // créneaux manqués simulés
  annulees: {} as Record<string, number>, // annulées par le client avant le ramassage
}))

// ── Créneaux de passage du livreur (horaires de la boutique : lun–ven 14 h – 16 h, sam 11 h – 13 h) ──────────
function creneauDuJour(j: string): [string, string] | null {
  const s = jourSemaine(j)
  if (s === 6) return null
  const p = BOUTIQUE.passageLivreur[s === 5 ? 1 : 0]
  return [p.de, p.a]
}
const instant = (j: string, hm: string) => debutDuJour(j) + Number(hm.slice(0, 2)) * HEURE + Number(hm.slice(3, 5)) * 60000
/** Créneaux à partir de l'instant t (le premier dont la fin n'est pas passée). */
function* creneaux(t: number) {
  let j = jourDe(t)
  for (let i = 0; i < 30; i++, j = ajouterJours(j, 1)) {
    const c = creneauDuJour(j)
    if (!c) continue
    const fin = instant(j, c[1])
    if (fin <= t) continue
    yield { debut: instant(j, c[0]), fin, heures: c }
  }
}

const niveauPour = (valeur: number): NiveauLivreur => (valeur > P.plafonds.confirme ? 'Or' : valeur > P.plafonds.nouveau ? 'Confirme' : 'Nouveau')
const blocageEnCours = (ref: string, t = maintenant()) => (etat.lire().bloqueJusqua[ref] ?? 0) > t

function remise(c: CommandeEssai): Remise {
  const e = etat.lire()
  const cmd = etatCommandes.lire()[c.ref]
  const a = ARTICLES[c.article]
  const proprio = estProprietaire()
  const t = maintenant()
  const remiseA = e.remises[c.ref] ?? c.remiseA ?? null
  const annulee = cmd.etape === 'annulee'
  const etape = annulee ? 'annulee' : cmd.etape === 'a_preparer' ? 'a_preparer' : cmd.etape === 'chez_le_livreur' && !remiseA ? 'prete' : 'remise'
  const bloque = etape === 'prete' && blocageEnCours(c.ref, t)
  const valeur = a.prix * c.quantite
  const niveau = niveauPour(valeur)
  // Livreur du créneau : le premier passage qui suit « C'est prêt » ; créneau passé sans remise = livreur absent (E9),
  // le délai est suspendu jusqu'au suivant. Un blocage reporte au premier passage après le déblocage (DP-57, P-7).
  let creneauManque: Remise['creneauManque'] = null
  let livreur: Remise['livreur'] = null
  if (etape === 'a_preparer' || etape === 'prete') {
    const depart = etape === 'prete' ? (cmd.preteA ?? t) : t
    const it = creneaux(bloque ? e.bloqueJusqua[c.ref] : depart)
    let cr = it.next().value!
    let saut = e.absences[c.ref] ?? 0
    while (cr && (saut > 0 || (etape === 'prete' && cr.fin <= t))) {
      creneauManque = { debut: cr.debut, fin: cr.fin }
      cr = it.next().value!
      saut--
    }
    if (cr) livreur = { ...LIVREUR, creneau: cr.heures, photo: PORTRAIT_LIVREUR, debut: cr.debut, fin: cr.fin, niveau }
  } else if (etape === 'remise' && remiseA) livreur = { ...LIVREUR, photo: PORTRAIT_LIVREUR, debut: remiseA, fin: remiseA, niveau }
  const depasse = etape === 'a_preparer' && cmd.echeance !== null && t > cmd.echeance
  const erreur: Remise['erreur'] = annulee && e.annulees[c.ref] ? 'annulee' : bloque ? 'bloque' : creneauManque && etape === 'prete' ? 'absent' : depasse ? 'depasse' : niveau === 'Or' && etape === 'a_preparer' ? 'plafond' : null
  const lib = PARAMETRES.litiges
  const palierRapide = BOUTIQUE.palier === 'Or' || BOUTIQUE.palier === 'Platine'
  return {
    ref: c.ref,
    article: { offreId: a.offreId, titre: a.titre, variante: a.variante, etat: a.etat, dessin: a.dessin, categorie: a.categorie },
    quantite: c.quantite,
    colis: c.colis,
    payableAuRetrait: c.payableAuRetrait,
    etape,
    echeance: etape === 'a_preparer' ? cmd.echeance : null,
    preteA: cmd.preteA,
    livreur,
    // Un blocage passé remet les essais à zéro (le nouveau passage repart d'un code neuf).
    essaisFaux: !bloque && e.bloqueJusqua[c.ref] ? 0 : (e.faux[c.ref] ?? 0),
    essaisMax: P.essaisMax,
    blocageHeures: P.blocageHeures,
    bloqueJusqua: bloque ? e.bloqueJusqua[c.ref] : null,
    nouveauCodeDemande: bloque && !!e.nouveauCode[c.ref],
    remiseA,
    photos: e.photos[c.ref] ?? [],
    erreur,
    creneauManque: etape === 'prete' ? creneauManque : null,
    valeurColis: proprio ? valeur : null,
    niveauRequis: niveau,
    plafonds: P.plafonds,
    fileHeures: FILE_HEURES,
    garde: proprio ? gardeFige(c) : null,
    suite: proprio
      ? { palier: BOUTIQUE.palier, liberationJours: palierRapide ? lib.libOrJours : lib.libStandardJours, confirmationJours: lib.fenetreRetourJours, numero: `${BOUTIQUE.numeroVersement.operateur} ${BOUTIQUE.numeroVersement.masque}` }
      : null,
    autresPourCeLivreur: COMMANDES.filter((x) => x.ref !== c.ref && etatCommandes.lire()[x.ref].etape === 'chez_le_livreur' && !e.remises[x.ref]).map((x) => x.ref),
  }
}

const trouver = (ref: string) => COMMANDES.find((c) => c.ref === ref) ?? null
const codeDe = (ref: string) => etat.lire().codes[ref] ?? premierCode(ref)

function recu(c: CommandeEssai): Recu {
  const a = ARTICLES[c.article]
  const v = vueCommande(c, 'proprietaire')
  const encaisse = !c.payableAuRetrait || ['versee', 'a_verser', 'se_libere'].includes(etatCommandes.lire()[c.ref].etape)
  const lib = v.argent?.liberation ?? null
  return {
    ref: c.ref,
    encaisseA: encaisse ? c.payeeA : null,
    article: { offreId: a.offreId, titre: a.titre, variante: a.variante, etat: a.etat, dessin: a.dessin, categorie: a.categorie },
    quantite: c.quantite,
    colis: c.colis,
    prix: a.prix * c.quantite,
    garde: gardeFige(c),
    moyen: c.moyen,
    fraisPayesParLeClient: ['carte', 'usd', 'eur'].includes(c.moyen),
    argent: { etat: v.argent?.etat ?? 'en_cours', liberation: lib, vendredi: lib ? vendrediDeVersement(lib, PARAMETRES.versements) : null },
  }
}
export const demoRemise: DomaineRemise = {
  remise: (ref) => {
    const c = trouver(ref)
    return repondre(c ? remise(c) : null)
  },
  aRemettre: () => repondre(COMMANDES.map(remise).filter((r) => r.etape === 'prete')),
  toutes: () => repondre([...COMMANDES].sort((a, b) => b.payeeA - a.payeeA).map(remise)),
  async afficherCode(ref) {
    exigerDroit('commandes.remettre', 'remise')
    const c = trouver(ref)
    if (!c) return { ok: false, raison: 'introuvable' }
    const r = remise(c)
    if (r.etape === 'a_preparer') return { ok: false, raison: 'pas_prete' }
    if (r.etape === 'annulee') return { ok: false, raison: 'annulee' }
    if (r.etape === 'remise') return { ok: false, raison: 'remise' }
    if (r.bloqueJusqua) return { ok: false, raison: 'bloquee' }
    journaliser(ref, roleCourant(), 'Code de remise affiché')
    return { ok: true, code: codeDe(ref) }
  },
  async nouveauCode(ref) {
    exigerDroit('commandes.remettre', 'remise')
    const c = trouver(ref)
    if (!c) return { ok: false, raison: 'introuvable' }
    const r = remise(c)
    if (!r.bloqueJusqua) return { ok: false, raison: 'pas_bloquee' }
    etat.ecrire((x) => {
      x.codes[ref] = codeSuivant(codeDe(ref))
      x.nouveauCode[ref] = true
    })
    journaliser(ref, roleCourant(), 'Nouveau code de remise demandé (l’ancien est annulé)')
    return { ok: true, marcheA: r.bloqueJusqua }
  },
  async saisieLivreur(ref, code) {
    const c = trouver(ref)
    const r = c && remise(c)
    if (!r || r.etape !== 'prete') return { ok: false, essaisRestants: 0, bloqueJusqua: null }
    if (r.bloqueJusqua) return { ok: false, essaisRestants: 0, bloqueJusqua: r.bloqueJusqua }
    const t = maintenant()
    // Déblocage passé : les essais repartent de zéro.
    if (etat.lire().bloqueJusqua[ref])
      etat.ecrire((x) => {
        delete x.bloqueJusqua[ref]
        delete x.nouveauCode[ref]
        x.faux[ref] = 0
      })
    if (code !== codeDe(ref)) {
      const e = etat.ecrire((x) => {
        x.faux[ref] = (x.faux[ref] ?? 0) + 1
        if (x.faux[ref] >= P.essaisMax) x.bloqueJusqua[ref] = t + P.blocageHeures * HEURE
      })
      journaliser(ref, 'proprietaire', 'Code faux saisi par le livreur ({p})', { detail: `${e.faux[ref]}/${P.essaisMax}` })
      return { ok: false, essaisRestants: Math.max(0, P.essaisMax - e.faux[ref]), bloqueJusqua: e.bloqueJusqua[ref] ?? null }
    }
    etat.ecrire((x) => {
      x.remises[ref] = t
      x.photos[ref] = [
        { type: 'decouvert', image: PHOTO_DECOUVERT, a: t - 60000, lieu: LIEU },
        { type: 'scelle', image: PHOTO_SCELLE, a: t, lieu: LIEU },
      ]
    })
    // Le domaine commandes lit l'heure de la remise (« Remise au livreur à 14 h 20 », tri des terminées).
    etatCommandes.ecrire((x) => {
      if (x[ref]) x[ref].remiseA = t
    })
    journaliser(ref, 'proprietaire', 'Remis au livreur {p} (code saisi par le livreur)', { detail: `${LIVREUR.nom} · ${LIVREUR.societe}` })
    return { ok: true, essaisRestants: P.essaisMax, bloqueJusqua: null }
  },
  async simuler(ref, quoi) {
    const c = trouver(ref)
    if (!c) return
    if (quoi === 'livreur_absent') {
      etat.ecrire((x) => {
        x.absences[ref] = (x.absences[ref] ?? 0) + 1
      })
      journaliser(ref, 'proprietaire', 'Le livreur {p} n’est pas passé : délai suspendu jusqu’au créneau suivant', { detail: LIVREUR.nom })
      return
    }
    const r = remise(c)
    if (r.etape !== 'a_preparer' && r.etape !== 'prete') return
    etat.ecrire((x) => {
      x.annulees[ref] = maintenant()
    })
    etatCommandes.ecrire((x) => {
      x[ref].etape = 'annulee'
    })
    // Le stock réservé est rendu (VD06-R20).
    const p = await demoProduits.detail(c.article)
    if (p) await demoProduits.changerStock(p.id, p.stock + c.quantite)
    journaliser(ref, 'proprietaire', 'Annulée par le client avant le ramassage · stock rendu')
  },
  async recu(ref) {
    if (!estProprietaire()) throw new ReserveAuProprietaire('reçu vendeur')
    const c = trouver(ref)
    if (!c || etatCommandes.lire()[ref].etape === 'annulee') return null
    return recu(c)
  },
  async recus() {
    if (!estProprietaire()) throw new ReserveAuProprietaire('reçus')
    return COMMANDES.filter((c) => etatCommandes.lire()[c.ref].etape !== 'annulee')
      .map(recu)
      .filter((r) => r.encaisseA !== null)
      .sort((a, b) => b.encaisseA! - a.encaisseA!)
      .map((r): RecuResume => ({ ref: r.ref, encaisseA: r.encaisseA, titre: `${r.article.titre} · ${r.article.variante}`, dessin: r.article.dessin, prix: r.prix, garde: r.garde }))
  },
}
