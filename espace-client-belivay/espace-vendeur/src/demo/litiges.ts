// DONNÉES DE DÉMONSTRATION — domaine « litiges » : BLV-00005 et BLV-00006 (deux iPhone 15 Pro Max) du jeu d'essai,
// dossier de preuves, brouillon, réponse, fil chronologique, décision et recours.
// - Délais et seuils lus dans le registre de paramètres (REGISTRE, comme le serveur les servira par GET /config) :
//   lireReglesLitiges(), forme attendue précise, sinon arrêt (aucune valeur devinée). À déplacer dans
//   src/calculs/registre.ts en vague d'intégration (INTEGRATION.md), comme moteurs/belivay_moteurs/registre.py.
// - Montant gelé = montant gardé figé au paiement (gardeFige, src/calculs/commission.ts) ; libération d'un litige
//   gagné par src/calculs/versements.ts (Q-60) après le gel du recours (moteurs litiges.fin_du_gel, Q-26).
// - AUCUNE décision automatique (DP-35) : à l'échéance sans réponse, le dossier passe « en médiation » (file
//   d'arbitrage de BelivaY) ; la décision vient d'une personne. La démonstration montre une décision par les
//   scénarios du prototype (?issue=gagne|perdu|accepte sur « Décision et suites »), comme ?role=prep.
import type { Arrangement, Brouillon, CompteursLitiges, Decision, DomaineLitiges, EvenementLitige, Litige, PieceDossier, Posture, Reponse, ReglesLitiges } from '../donnees/domaines/litiges'
import type { Instant } from '../donnees/communs'
import { PARAMETRES, REGISTRE } from '../calculs/registre'
import { HEURE, yaounde } from '../calculs/temps'
import { dateDeLiberation, fermetureDuRetour, liberationApresLitige, vendrediDeVersement } from '../calculs/versements'
import { echeanceRemplacement, finDuGel, recoursPossible } from '../calculs/litiges'
import { maintenant } from './horloge'
import { ARTICLES, BOUTIQUE, COMMANDES, MEMBRES, type CommandeEssai } from './jeu-essai'
import { etatCommandes, gardeFige, journaliser } from './commandes'
import { avecDroit, estProprietaire, exigerDroit, roleCourant } from './session'
import { magasin, repondre } from './stockage'

// ── Paramètres (registre) ─────────────────────────────────────────────────────────────────────────────────

function lire(code: string, motif: RegExp): number {
  const v = REGISTRE[code]
  if (v === undefined) throw new Error(`Paramètre absent : ${code}`)
  const m = motif.exec(v.trim())
  if (!m) throw new Error(`${code} : « ${v} » ne suit pas la forme attendue`)
  return Number(m[1].replace(/[\s  ]/g, ''))
}
const re = (s: string) => new RegExp('^' + s + '$')

// Règles des litiges et retours : lues par src/calculs (lireLitiges, PARAMETRES.litiges, comme lire_litiges du moteur
// Python) ; s'y ajoutent deux valeurs propres à l'écran de réponse (LIT-ARRANG-MIN, LIT-BROUILLON-H).
const P = PARAMETRES.litiges
export function lireReglesLitiges(): ReglesLitiges {
  return {
    reponseH: P.vendeurHeures,
    decisionH: P.decisionHeures,
    recoursH: P.recoursHeures,
    arrangementMin: lire('LIT-ARRANG-MIN', re('(\\d+) caractères')),
    arrangementReponseJ: P.arrangementJours,
    brouillonH: lire('LIT-BROUILLON-H', re('(\\d+) h')),
    seuilStandard: P.autoStandard,
    seuilEleve: P.autoEleve,
    trajet: P.trajetRetour,
    remplacementH: P.remplacementHeuresOuvrees,
    viceJ: P.viceCacheJours,
    defautH: P.defautCacheHeures,
    fenetreJ: P.fenetreRetourJours,
    inspectionH: P.inspectionHeures,
  }
}
export const REGLES = lireReglesLitiges()

/** Échéance d'un remplacement : RET-REMPL-DELAI heures ouvrées, le dimanche ne compte pas (src/calculs/litiges.ts,
 * moteurs litiges.echeance_remplacement ; DP-15, Q-53). */
export const echeanceOuvree = (debut: Instant) => echeanceRemplacement(debut, P)

// ── Faits du jeu d'essai propres aux litiges (ce que le client a dit et montré ; photos du ramassage) ─────────

const DOSSIERS: Record<string, { attente: Litige['attente']; photosClient: string[]; ramassageA: Instant }> = {
  'BLV-00005': { attente: 'remboursement', photosClient: ['counter', 'box'], ramassageA: yaounde(2026, 9, 15, 14, 20) },
  'BLV-00006': { attente: 'remplacement', photosClient: ['cracked', 'box'], ramassageA: yaounde(2026, 9, 17, 14, 35) },
  'BLV-00017': { attente: 'remplacement', photosClient: ['box'], ramassageA: yaounde(2026, 9, 15, 14, 10) },
  'BLV-00018': { attente: 'remboursement', photosClient: ['counter'], ramassageA: yaounde(2026, 9, 5, 12, 15) },
  'BLV-00019': { attente: 'remboursement', photosClient: ['cracked'], ramassageA: yaounde(2026, 9, 14, 14, 25) },
}

// Démonstration : litiges déjà avancés (réponse envoyée, décision de la médiation, litige accepté).
const REPONSES_DEMO: Record<string, Reponse> = {
  'BLV-00017': { posture: 'arrangement', arrangement: 'remplacement', texte: 'Je propose d’échanger le chargeur contre un neuf, testé devant le livreur au prochain ramassage.', envoyeeA: yaounde(2026, 9, 19, 15, 5), par: 'Franck Penga' },
  'BLV-00018': { posture: 'conteste', arrangement: null, texte: 'La fiche et les photos montrent le bleu ciel livré ; le livreur l’a contrôlé au ramassage.', envoyeeA: yaounde(2026, 9, 9, 14, 0), par: 'Franck Penga' },
  'BLV-00019': { posture: 'accepte', arrangement: null, texte: '', envoyeeA: yaounde(2026, 9, 16, 9, 0), par: 'Franck Penga' },
}
const DECISIONS_DEMO: Record<string, { issue: 'gagne' | 'perdu'; a: Instant; motif: string }> = {
  'BLV-00018': { issue: 'gagne', a: yaounde(2026, 9, 12, 10, 0), motif: 'Les photos du ramassage montrent le pagne bleu ciel de la fiche, scellé devant le livreur : le produit remis est conforme à l’annonce.' },
}

// Motifs écrits des scénarios du prototype (décision d'une personne de la médiation BelivaY).
const MOTIF_GAGNE = 'Les deux photos du contrôle au ramassage montrent l’iPhone 15 Pro Max titane naturel 256 Go commandé, scellé devant le livreur. Le produit remis au client est conforme.'
const MOTIF_PERDU = 'La photo du client au relais montre un modèle 128 Go ; la commande portait sur un 256 Go. Les photos du ramassage ne montrent pas la capacité.'
const CONSTAT_EXEMPLE = 'Le livreur a contrôlé l’iPhone 15 Pro Max titane naturel 256 Go devant moi le 15 sept. à 14 h 20. Ses deux photos au dossier montrent le modèle commandé.'
export const MEDIATION = 'Médiation BelivaY'

// ── État (le « serveur » de la démonstration) ────────────────────────────────────────────────────────────

interface EtatLitiges {
  reponses: Record<string, Reponse>
  ajoutees: Record<string, PieceDossier[]>
  brouillons: Record<string, Brouillon>
  recours: Record<string, { a: Instant; texte: string }>
  evenements: Record<string, EvenementLitige[]>
  compteur: number
}
const etat = magasin<EtatLitiges>('litiges.v2', () => ({ reponses: { ...REPONSES_DEMO }, ajoutees: {}, brouillons: {}, recours: {}, evenements: {}, compteur: 0 }))

const membreCourant = () => {
  const m = MEMBRES.find((x) => x.role === roleCourant())!
  return `${m.prenom} ${m.nom}`
}

/** Scénario du prototype sur « Décision et suites » : ?issue=gagne|perdu|accepte (démonstration seulement). */
function scenario(ref: string): 'gagne' | 'perdu' | 'accepte' | null {
  try {
    const p = new URLSearchParams(location.search)
    const issue = p.get('issue')
    if (!/\/litige_envoye\/?$/.test(location.pathname) || (p.get('ref') ?? 'BLV-00005') !== ref) return null
    return issue === 'gagne' || issue === 'perdu' || issue === 'accepte' ? issue : null
  } catch {
    return null
  }
}

function decisionDe(c: CommandeEssai, issue: 'gagne' | 'perdu', a: Instant, proprio: boolean): Decision {
  const pv = PARAMETRES.versements
  let liberation: Instant | null = null
  let versement: string | null = null
  if (issue === 'gagne' && proprio) {
    // Libération : max(date prévue avant le litige ; fin du gel du recours du client) (Q-60, Q-26).
    const prevue = dateDeLiberation(fermetureDuRetour(c.retraitA!, null, pv), BOUTIQUE.palier, c.moyen === 'carte', pv)
    liberation = liberationApresLitige(prevue, finDuGel(a, null, null, P)!)
    versement = vendrediDeVersement(liberation, pv)
  }
  return {
    a,
    issue,
    motif: issue === 'gagne' ? MOTIF_GAGNE : MOTIF_PERDU,
    par: MEDIATION,
    effetScore: issue === 'gagne' ? 'aucun' : 'g1',
    liberation,
    versement,
    versementVers: proprio && issue === 'gagne' ? `${BOUTIQUE.numeroVersement.operateur} ${BOUTIQUE.numeroVersement.masque}` : null,
  }
}

function vue(c: CommandeEssai): Litige {
  const e = etat.lire()
  const l = c.litige!
  const d = DOSSIERS[c.ref] ?? { attente: 'remboursement' as const, photosClient: ['box'], ramassageA: c.payeeA }
  const proprio = estProprietaire()
  const now = maintenant()
  const sc = scenario(c.ref)
  let reponse: Reponse | null = e.reponses[c.ref] ?? null
  if (sc === 'accepte' && !reponse) reponse = { posture: 'accepte', arrangement: null, texte: '', envoyeeA: now, par: membreCourant() }
  if ((sc === 'gagne' || sc === 'perdu') && !reponse) reponse = { posture: 'conteste', arrangement: null, texte: CONSTAT_EXEMPLE, envoyeeA: l.ouvertA + 4 * HEURE, par: membreCourant() }
  const demo = DECISIONS_DEMO[c.ref]
  const decision = sc === 'gagne' || sc === 'perdu' ? decisionDe(c, sc, now, proprio) : demo ? { ...decisionDe(c, demo.issue, demo.a, proprio), motif: demo.motif } : null
  const recoursDepose = e.recours[c.ref] ?? null
  // Gel pendant le délai de recours (Q-26) : fin du délai, ou réponse au recours déposé (finDuGel).
  const jusqua = decision ? decision.a + P.recoursHeures * HEURE : null
  const issue: Litige['issue'] = reponse?.posture === 'accepte' ? 'accepte' : decision ? decision.issue : 'attente'
  const etatL: Litige['etat'] = issue === 'accepte' || (decision && !recoursDepose && now > jusqua!) ? 'clos' : reponse || now > l.echeance || decision ? 'en_mediation' : 'a_repondre'
  const versees: PieceDossier[] = [
    { id: c.ref + '-ram', photo: 'counter', quoi: 'ramassage', a: d.ramassageA, ajouteePar: null, retirable: false },
    { id: c.ref + '-sce', photo: 'box', quoi: 'scelle', a: d.ramassageA + 60 * 1000, ajouteePar: null, retirable: false },
  ]
  const ajoutees = (e.ajoutees[c.ref] ?? []).map((p) => ({ ...p, retirable: !reponse }))
  const photosClient: PieceDossier[] = d.photosClient.map((photo, i) => ({ id: `${c.ref}-cl${i}`, photo, quoi: 'client', a: l.ouvertA, ajouteePar: null, retirable: false }))
  // Fil chronologique : ce qui est arrivé, du plus ancien au plus récent.
  const journal: EvenementLitige[] = [
    { a: l.ouvertA, code: 'ouvert', auteur: null, detail: l.motif },
    { a: l.ouvertA, code: 'photos_client', auteur: null, detail: String(photosClient.length) },
    { a: l.ouvertA, code: 'preuves_versees', auteur: null, detail: String(versees.length) },
    ...(e.evenements[c.ref] ?? []),
  ]
  if (reponse && !(e.evenements[c.ref] ?? []).some((x) => x.code === 'reponse')) journal.push({ a: reponse.envoyeeA, code: 'reponse', auteur: reponse.par, detail: reponse.posture })
  if (!reponse && now > l.echeance) journal.push({ a: l.echeance, code: 'echeance', auteur: null, detail: null })
  if (decision) journal.push({ a: decision.a, code: 'decision', auteur: decision.par, detail: decision.issue })
  if (issue === 'accepte' && !(e.evenements[c.ref] ?? []).some((x) => x.code === 'clos')) journal.push({ a: reponse!.envoyeeA, code: 'clos', auteur: null, detail: 'accepte' })
  journal.sort((a, b) => a.a - b.a)
  const b = e.brouillons[c.ref]
  const a = ARTICLES[c.article]
  return {
    ref: c.ref,
    etat: etatL,
    issue,
    origine: 'application',
    ouvertA: l.ouvertA,
    echeance: l.echeance,
    decisionAvant: l.echeance + P.decisionHeures * HEURE, // = echeances(ouverture).decisionAuPlusTard
    motif: l.motif,
    ceQueDitLeClient: l.ceQueDitLeClient,
    attente: d.attente,
    article: { offreId: a.offreId, titre: a.titre, variante: a.variante, etat: a.etat, dessin: a.dessin, categorie: a.categorie },
    photosClient,
    preuves: [...versees, ...ajoutees],
    gele: proprio && issue !== 'accepte' ? gardeFige(c) : null,
    trajetRetour: proprio ? REGLES.trajet : null,
    livraisonRetour: null, // part de livraison du colis : calculée par le serveur (moteur des frais, GEN-01)
    reponse,
    decision,
    recours: { jusqua, possible: !!decision && decision.issue === 'perdu' && proprio && recoursPossible(decision.a, now, !!recoursDepose, P), deposeA: recoursDepose?.a ?? null, texte: recoursDepose?.texte ?? null },
    brouillon: b && !reponse && now - b.gardeA < REGLES.brouillonH * HEURE ? b : null,
    journal,
  }
}

function liste(): Litige[] {
  const cmds = etatCommandes.lire()
  return COMMANDES.filter((c) => c.litige && cmds[c.ref]?.etape === 'litige')
    .map(vue)
    .sort((a, b) => a.echeance - b.echeance)
}
/** Litiges ouverts (accueil, onglet Problèmes) : l'accueil garde ceux « à répondre ». */
export const litigesOuverts = () => liste()
/** Litiges en cours : ouverts et pas encore tranchés (un litige clos, gagné ou accepté, ne compte plus). */
export const litigesEnCours = () => liste().filter((l) => l.etat !== 'clos')

function noter(ref: string, ev: Omit<EvenementLitige, 'a'>) {
  etat.ecrire((e) => {
    ;(e.evenements[ref] ??= []).push({ a: maintenant(), ...ev })
  })
}

export const demoLitiges: DomaineLitiges = {
  regles: () => repondre(REGLES),
  liste: (e) => avecDroit('litiges.voir', 'litiges', () => repondre(liste().filter((l) => !e || l.etat === e))),
  compteurs() {
    const l = liste()
    const c: CompteursLitiges = {
      a_repondre: l.filter((x) => x.etat === 'a_repondre').length,
      en_mediation: l.filter((x) => x.etat === 'en_mediation').length,
      clos: l.filter((x) => x.etat === 'clos').length,
      gele: estProprietaire() ? l.filter((x) => x.etat !== 'clos').reduce((s, x) => s + (x.gele ?? 0), 0) : null,
    }
    return repondre(c)
  },
  detail: (ref) => avecDroit('litiges.voir', 'litige', () => {
    const c = COMMANDES.find((x) => x.ref === ref && x.litige)
    return repondre(c ? vue(c) : null)
  }),
  async ajouterPreuve(ref, photo) {
    exigerDroit('litiges.preuves', 'preuves du litige')
    const l = liste().find((x) => x.ref === ref)
    if (!l) return { ok: false, raison: 'introuvable' }
    if (l.etat === 'clos') return { ok: false, raison: 'clos' }
    const par = membreCourant()
    let piece: PieceDossier | null = null
    etat.ecrire((e) => {
      e.compteur++
      piece = { id: `${ref}-v${e.compteur}`, photo, quoi: 'vendeur', a: maintenant(), ajouteePar: par, retirable: true }
      ;(e.ajoutees[ref] ??= []).push(piece)
      ;(e.evenements[ref] ??= []).push({ a: maintenant(), code: 'preuve_ajoutee', auteur: par, detail: null })
    })
    journaliser(ref, roleCourant(), 'Preuve ajoutée au litige')
    return { ok: true, piece: piece! }
  },
  async retirerPreuve(ref, id) {
    exigerDroit('litiges.preuves', 'preuves du litige')
    const l = liste().find((x) => x.ref === ref)
    if (!l) return { ok: false, raison: 'introuvable' }
    if (l.reponse) return { ok: false, raison: 'deja_repondu' }
    if (!(etat.lire().ajoutees[ref] ?? []).some((p) => p.id === id)) return { ok: false, raison: 'introuvable' }
    etat.ecrire((e) => {
      e.ajoutees[ref] = (e.ajoutees[ref] ?? []).filter((p) => p.id !== id)
      ;(e.evenements[ref] ??= []).push({ a: maintenant(), code: 'preuve_retiree', auteur: membreCourant(), detail: null })
    })
    return { ok: true }
  },
  async garderBrouillon(ref, b) {
    etat.ecrire((e) => {
      if (b) e.brouillons[ref] = { ...b, gardeA: maintenant() }
      else delete e.brouillons[ref]
    })
  },
  async repondre(ref, posture: Posture, texte, arrangement: Arrangement | null) {
    const l = liste().find((x) => x.ref === ref)
    if (!l) return { ok: false, raison: 'introuvable' }
    if (!estProprietaire()) return { ok: false, raison: 'reserve_proprietaire' }
    if (l.reponse) return { ok: false, raison: 'deja_repondu' }
    if (maintenant() > l.echeance) return { ok: false, raison: 'delai_depasse' }
    if (posture === 'conteste' && !texte.trim()) return { ok: false, raison: 'constat_vide' }
    if (posture === 'arrangement' && texte.trim().length < REGLES.arrangementMin) return { ok: false, raison: 'trop_court' }
    const par = membreCourant()
    etat.ecrire((e) => {
      e.reponses[ref] = { posture, arrangement: posture === 'arrangement' ? (arrangement ?? 'remplacement') : null, texte: posture === 'accepte' ? '' : texte.trim(), envoyeeA: maintenant(), par }
      delete e.brouillons[ref]
      ;(e.evenements[ref] ??= []).push({ a: maintenant(), code: 'reponse', auteur: par, detail: posture })
      if (posture === 'accepte') e.evenements[ref].push({ a: maintenant(), code: 'clos', auteur: null, detail: 'accepte' })
    })
    journaliser(ref, roleCourant(), posture === 'accepte' ? 'Litige accepté : le client est remboursé' : 'Réponse au litige envoyée')
    return { ok: true, issue: posture === 'accepte' ? 'accepte' : 'attente' }
  },
  async contester(ref, texte) {
    const c = COMMANDES.find((x) => x.ref === ref && x.litige)
    if (!c) return { ok: false, raison: 'non_contestable' }
    const l = vue(c)
    if (!estProprietaire()) return { ok: false, raison: 'reserve_proprietaire' }
    if (l.recours.deposeA) return { ok: false, raison: 'deja_contestee' }
    if (!l.decision || l.decision.issue !== 'perdu') return { ok: false, raison: 'non_contestable' }
    if (maintenant() > l.recours.jusqua!) return { ok: false, raison: 'delai_depasse' }
    if (texte.trim().length < REGLES.arrangementMin) return { ok: false, raison: 'trop_court' }
    etat.ecrire((e) => {
      e.recours[ref] = { a: maintenant(), texte: texte.trim() }
    })
    noter(ref, { code: 'recours', auteur: membreCourant(), detail: null })
    journaliser(ref, roleCourant(), 'Décision du litige contestée (recours)')
    return { ok: true }
  },
}
