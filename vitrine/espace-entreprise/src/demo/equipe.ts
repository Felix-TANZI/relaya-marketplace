// DONNÉES DE DÉMONSTRATION — domaine « equipe » : Yafé Express employeur de ses livreurs (DP-66, DP-67). Jeu d'essai :
// chaque contrat porte une période d'essai de 30 jours (donnée du contrat, pas une règle) ; Serge A., Estelle K. et
// Kevin D. sont encore en essai (activés il y a moins de 30 jours), les autres confirmés à son terme ; Estelle est en
// CDD de six mois, casier judiciaire encore à demander ; Landry F. a deux avertissements écrits avant sa suspension,
// Brice N. un. Horaires de l'entreprise : du lundi au vendredi 7 h 30 → 18 h, le samedi jusqu'à 13 h (les mêmes que
// dans l'espace livreur). Les décisions écrivent le journal signé (journal.ts : qui, quand, avant, après) et préviennent
// le livreur ; Serge A. (LIVREUR_DEMO) les reçoit par le pont. Suspension et réintégration restent des gestes du domaine
// « livreurs » (un seul chemin) ; la fin de contrat ouvre un départ « initiative entreprise » dans la file des départs,
// qui suit ensuite les règles du départ (constat du kit plafonné à KIT-VALEUR-F, dernier versement, clôture).
import type { Avertissement, CongeEmploi, CreneauTravail, DomaineEquipe, DossierEmploi, EntreeHistorique, EssaiEmploi, GenreHistorique, LigneEquipe, PieceDossier, RefusEquipe, TypeContrat, VueDossier } from '../donnees/domaines/equipe'
import type { FicheLivreur, StatutPiece } from '../donnees/domaines/livreurs'
import type { CodeZone, Instant, Resultat } from '../donnees/communs'
import { PARAMETRES_FLOTTE } from '../calculs/flotte'
import { JOUR, jourDe, yaounde } from '../calculs/temps'
import { pdfBinaire } from '../donnees/exports'
import { exiger, montantsVisibles, roleCourant } from './acces'
import { departsDemo, nouveauDepart } from './departs'
import { maintenant } from './horloge'
import { ENTREPRISE, T } from './jeu-essai'
import { auteur, journalDemo, signer } from './journal'
import { demoLivreurs, jourFr, livreursDemo, notifier } from './livreurs'
import { LIVREUR_DEMO, publier } from './pont'
import { magasin, repondre } from './stockage'
import { vehiculesVus } from './vehicules'
import { zonesDemo } from './zones'

const P = PARAMETRES_FLOTTE
/** Durée d'essai inscrite à chaque contrat du jeu d'essai (donnée du contrat, choisie par l'entreprise à l'embauche). */
const ESSAI_JOURS_DEMO = 30
/** Horaires de l'entreprise (jeu d'essai) : 0 lundi … 5 samedi ; dimanche, repos. */
export const HORAIRES_ENTREPRISE: CreneauTravail[] = [0, 1, 2, 3, 4].map((jour) => ({ jour, de: '07:30', a: '18:00' })).concat({ jour: 5, de: '07:30', a: '13:00' })
const PROPRIO = 'Gaëlle Wankeu · Propriétaire'
/** Embauche des anciens livreurs (partis, départ clôturé) : leur fiche n'a plus de date d'activation. */
const EMBAUCHE_ANCIENS: Record<string, Instant> = { 'l-pauline': yaounde(2026, 5, 4, 8, 0), 'l-arnaud': yaounde(2026, 6, 15, 8, 0), 'l-yannick': yaounde(2026, 3, 2, 8, 0) }
const debutDe = (f: FicheLivreur): Instant | null => f.activeLe ?? EMBAUCHE_ANCIENS[f.id] ?? null

interface DossierDemo {
  contrat: { type: TypeContrat; fin: Instant | null }
  essai: EssaiEmploi | null
  avertissements: Avertissement[]
  horaires: CreneauTravail[] | null // null : ceux de l'entreprise
  conges: CongeEmploi[]
  casier: { etat: 'recu' | 'a_demander' | 'non_exige'; le: Instant | null }
}

/** Dossier tel que le jeu d'essai le pose, tant que personne n'y a touché. */
function base(f: FicheLivreur): DossierDemo {
  const debut = debutDe(f)
  const t0 = T(0)
  let essai: EssaiEmploi | null = null
  if (debut !== null) {
    const jusqua = debut + ESSAI_JOURS_DEMO * JOUR
    const enCours = jusqua > t0
    essai = { debut, jusqua, dureeJours: ESSAI_JOURS_DEMO, prolonge: false, issue: enCours ? 'en_cours' : 'confirme', decideLe: enCours ? null : jusqua - JOUR, decidePar: enCours ? null : PROPRIO }
  }
  const avert = (n: number, ilYaJours: number, motif: string): Avertissement => ({ id: `AV-${f.id}-${n}`, rang: n, le: t0 - ilYaJours * JOUR, motif, par: PROPRIO })
  const avertissements =
    f.id === 'l-landry'
      ? [avert(1, 12, 'Retard de ramassage de 50 minutes sans prévenir la boutique ni le répartiteur.'), avert(2, 4, 'Deuxième retard de ramassage non prévenu en une semaine.')]
      : f.id === 'l-brice'
        ? [avert(1, 9, 'Colis laissé au comptoir du relais sans attendre la validation du gérant.')]
        : []
  return {
    contrat: f.id === 'l-estelle' && debut !== null ? { type: 'cdd', fin: debut + 182 * JOUR } : { type: 'cdi', fin: null },
    essai,
    avertissements,
    horaires: null,
    conges: [],
    casier: f.id === 'l-estelle' || debut === null ? { etat: 'a_demander', le: null } : { etat: 'recu', le: debut - 3 * JOUR },
  }
}

export const equipeDemo = magasin('equipe', () => ({ dossiers: {} as Record<string, DossierDemo> }))

const fiche = (id: string) => livreursDemo.lire().livreurs.find((l) => l.id === id) ?? null
const lireDossier = (f: FicheLivreur): DossierDemo => equipeDemo.lire().dossiers[f.id] ?? base(f)
function ecrireDossier(f: FicheLivreur, change: (d: DossierDemo) => void) {
  equipeDemo.ecrire((s) => {
    const d = s.dossiers[f.id] ?? (s.dossiers[f.id] = structuredClone(base(f)))
    change(d)
  })
}
const non = <T extends object = object>(raison: RefusEquipe): Promise<Resultat<T, RefusEquipe>> => repondre({ ok: false as const, raison })
const ok = { ok: true as const }

/** Fin de contrat ouverte (départ « initiative entreprise » encore en préavis). */
const finOuverte = (id: string) => departsDemo.lire().departs.find((d) => d.livreurId === id && d.etat === 'demande' && d.initiative === 'entreprise') ?? null
const departOuvert = (id: string) => departsDemo.lire().departs.find((d) => d.livreurId === id && d.etat === 'demande') ?? null
const dernierClos = (id: string) => departsDemo.lire().departs.filter((d) => d.livreurId === id && d.etat === 'close').sort((a, b) => (b.closLe ?? 0) - (a.closLe ?? 0))[0] ?? null

const vueDuRole = (): VueDossier => {
  const r = roleCourant()
  return r === 'proprietaire' || r === 'gerant' ? 'complete' : r === 'repartiteur' ? 'exploitation' : 'comptable'
}

/** Pièce du livreur (domaine « livreurs ») vue dans le dossier d'embauche. */
function pieceLivreur(f: FicheLivreur, type: 'identite' | 'permis', id: 'cni' | 'permis', t: Instant): PieceDossier {
  const p = f.pieces.find((x) => x.type === type)
  const st: StatutPiece = p?.statut ?? 'manquante'
  const expiree = st === 'expiree' || (st === 'valide' && p!.expireLe !== null && p!.expireLe < t)
  return { id, etat: expiree ? 'expiree' : st === 'valide' ? 'valide' : st === 'en_revue' ? 'a_controler' : 'manquante', expireLe: p?.expireLe ?? null, le: p?.envoyeeLe ?? null, ou: 'pieces' }
}

function piecesDossier(f: FicheLivreur, d: DossierDemo, t: Instant): PieceDossier[] {
  const v = vehiculesVus().find((x) => x.id === f.vehiculeId)
  const cg = v?.carteGrise?.statut
  return [
    { id: 'contrat', etat: debutDe(f) ? 'valide' : 'manquante', expireLe: d.contrat.fin, le: debutDe(f), ou: 'equipe' },
    pieceLivreur(f, 'identite', 'cni', t),
    pieceLivreur(f, 'permis', 'permis', t),
    { id: 'assurance', etat: !v || !v.assuranceJusqua ? 'manquante' : v.assuranceJusqua < t ? 'expiree' : 'valide', expireLe: v?.assuranceJusqua ?? null, le: null, ou: 'vehicule' },
    { id: 'carte_grise', etat: !v ? 'manquante' : cg === 'en_revue' ? 'a_controler' : cg === 'manquante' ? 'manquante' : 'valide', expireLe: null, le: v?.carteGrise?.le ?? null, ou: 'vehicule' },
    { id: 'casier', etat: d.casier.etat === 'non_exige' ? 'non_exigee' : d.casier.etat === 'recu' ? 'valide' : 'manquante', expireLe: null, le: d.casier.le, ou: 'equipe' },
  ]
}

// Journal signé → historique de l'emploi : chaque événement d'emploi, avec son auteur et son motif.
const GENRES: Record<string, [GenreHistorique, string]> = {
  'rider.suspended': ['suspension', 'Suspension'],
  'rider.reinstated': ['reintegration', 'Réintégration'],
  'rider.removed': ['fin_contrat', 'Retrait de la flotte'],
  'courier.leave_closed': ['depart', 'Départ clôturé'],
  'employment.probation': ['essai', ''],
  'employment.warning': ['avertissement', ''],
  'employment.schedule': ['horaires', 'Horaires de travail'],
  'employment.zones': ['zones', 'Zones de travail'],
  'employment.leave': ['conge', ''],
  'employment.record_check': ['piece', 'Casier judiciaire'],
  'employment.termination': ['fin_contrat', ''],
  'employment.certificate': ['attestation', 'Attestation de travail délivrée'],
}
/** Ce que chaque vue garde de l'historique (moindre privilège : aucun motif disciplinaire hors direction). */
const GARDE: Record<VueDossier, GenreHistorique[] | null> = {
  complete: null,
  exploitation: ['embauche', 'essai', 'suspension', 'reintegration', 'horaires', 'zones', 'conge', 'fin_contrat', 'depart'],
  comptable: ['embauche', 'fin_contrat', 'depart', 'attestation'],
}
const AVEC_MOTIF: Record<VueDossier, GenreHistorique[] | null> = { complete: null, exploitation: ['horaires', 'zones', 'conge'], comptable: [] }

function historique(f: FicheLivreur, d: DossierDemo, vue: VueDossier): EntreeHistorique[] {
  const l: EntreeHistorique[] = []
  const debut = debutDe(f)
  if (debut) l.push({ le: debut, genre: 'embauche', quoi: d.contrat.type === 'cdd' ? 'Embauche · contrat à durée déterminée' : 'Embauche · contrat à durée indéterminée', motif: null, par: PROPRIO })
  // Ce que le jeu d'essai a posé avant la démonstration ; le reste vient du journal signé.
  const b = base(f)
  if (b.essai?.issue === 'confirme' && b.essai.decideLe) l.push({ le: b.essai.decideLe, genre: 'essai', quoi: 'Période d’essai confirmée', motif: null, par: PROPRIO })
  for (const a of b.avertissements) l.push({ le: a.le, genre: 'avertissement', quoi: `Avertissement écrit n° ${a.rang}`, motif: a.motif, par: a.par })
  for (const x of journalDemo.lire().lignes) {
    if (x.objet !== 'livreur:' + f.id || !GENRES[x.evenement]) continue
    const [genre, quoi] = GENRES[x.evenement]
    l.push({ le: x.le, genre, quoi: quoi || x.champ, motif: x.apres || null, par: x.auteur })
  }
  const garde = GARDE[vue]
  const motifs = AVEC_MOTIF[vue]
  return l
    .filter((e) => !garde || garde.includes(e.genre))
    .map((e) => (!motifs || motifs.includes(e.genre) ? e : { ...e, motif: null }))
    .sort((a, b) => b.le - a.le)
}

const actifs = (t: Instant, d: DossierDemo) => d.conges.filter((c) => c.annuleLe === null && c.au >= jourDe(t))
const statutDe = async (f: FicheLivreur) => (f.statut === 'retire' ? 'retire' : ((await demoLivreurs.liste()).find((x) => x.id === f.id)?.statut ?? f.statut))
const court = (f: FicheLivreur) => ({ id: f.id, nom: f.nom, initiales: f.initiales, vehicule: f.vehicule })

/** Le livreur et son dossier, ou un refus (inconnu, retiré, en activation selon le geste). */
function cible(id: string, actifSeul = true): FicheLivreur | null {
  const f = fiche(id)
  if (!f) return null
  if (actifSeul && (f.statut === 'retire' || f.statut === 'en_activation')) return null
  return f
}
const HEURE_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const JOUR_RE = /^\d{4}-\d{2}-\d{2}$/
const NOMS_JOURS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']
const resume = (c: CreneauTravail[]) => c.map((x) => `${NOMS_JOURS[x.jour]} ${x.de}–${x.a}`).join(', ') || 'aucun créneau'
/** Texte du PDF : l'écriture du PDF est en Latin-1 (apostrophes droites). */
/** « 24 septembre 2026 » (heure de Yaoundé) : dates de l'attestation. */
const jourAn = (t: Instant) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Douala' })
const latin = (s: string) => s.replace(/[’‘]/g, "'").replace(/[–—]/g, '-').replace(/[«»]/g, '"').replace(/[  ]/g, ' ')

export const demoEquipe: DomaineEquipe = {
  async registre() {
    const t = maintenant()
    const vus = await demoLivreurs.liste()
    const lignes: LigneEquipe[] = livreursDemo.lire().livreurs.map((f) => {
      const d = lireDossier(f)
      const fin = finOuverte(f.id)
      const vu = vus.find((x) => x.id === f.id)
      return {
        livreur: { ...court(f), statut: f.statut === 'retire' ? 'retire' : (vu?.statut ?? f.statut) },
        contrat: d.contrat.type,
        debut: debutDe(f),
        essai: d.essai && d.essai.issue === 'en_cours' ? { jusqua: d.essai.jusqua, prolonge: d.essai.prolonge } : null,
        avertissements: vueDuRole() === 'complete' ? d.avertissements.length : 0,
        suspension: f.suspension ? { par: f.suspension.par, jusqua: f.suspension.jusqua } : null,
        finContrat: fin ? fin.preavisJusqua : null,
        departDemande: !!departOuvert(f.id) && !fin,
        conges: actifs(t, d).length,
        piecesManquantes: f.statut === 'retire' ? 0 : piecesDossier(f, d, t).filter((p) => p.etat === 'manquante' || p.etat === 'expiree').length,
      }
    })
    return repondre(lignes)
  },
  async dossier(id) {
    const f = fiche(id)
    if (!f) return repondre(null)
    const t = maintenant()
    const d = lireDossier(f)
    const vue = vueDuRole()
    const fin = finOuverte(id)
    const clos = f.statut === 'retire' ? dernierClos(id) : null
    const v: DossierEmploi = {
      livreur: { ...court(f), statut: await statutDe(f) },
      vue,
      poste: 'Livreur',
      contrat: { type: d.contrat.type, debut: debutDe(f), fin: clos?.closLe ?? d.contrat.fin, signeLe: debutDe(f) },
      essai: d.essai,
      pieces: piecesDossier(f, d, t),
      casierExige: d.casier.etat !== 'non_exige',
      avertissements: vue === 'complete' ? d.avertissements : [],
      suspension: f.suspension ?? null,
      horaires: d.horaires ?? HORAIRES_ENTREPRISE,
      zones: f.zones,
      conges: actifs(t, d),
      finContrat: fin ? { id: fin.id, motif: vue === 'complete' ? (fin.texte ?? '') : '', decideLe: fin.demandeLe, par: PROPRIO, preavisJusqua: fin.preavisJusqua, etat: 'preavis' } : null,
      departDemande: !!departOuvert(id) && !fin,
      retenueKitMax: montantsVisibles() ? P.kit.total : null,
      historique: historique(f, d, vue),
    }
    if (fin) {
      const l = journalDemo.lire().lignes.filter((x) => x.objet === 'livreur:' + id && x.evenement === 'employment.termination').at(-1)
      if (l) v.finContrat!.par = l.auteur
    }
    return repondre(v)
  },
  async conclureEssai(id, decision, motif) {
    exiger(['proprietaire', 'gerant'], 'Période d’essai')
    const f = cible(id)
    if (!f) return non('statut')
    const d = lireDossier(f)
    if (!d.essai || d.essai.issue !== 'en_cours') return non('statut')
    if (decision !== 'confirme' && !motif.trim()) return non('motif')
    if (decision === 'prolonge' && d.essai.prolonge) return non('deja_prolonge')
    const t = maintenant()
    const par = auteur()
    let jusqua: Instant | null = null
    ecrireDossier(f, (x) => {
      const e = x.essai!
      if (decision === 'prolonge') {
        e.prolonge = true
        e.jusqua += e.dureeJours * JOUR
        jusqua = e.jusqua
      } else {
        e.issue = decision
        e.decideLe = t
        e.decidePar = par
      }
    })
    const texte = motif.trim()
    const quoi = decision === 'confirme' ? 'Période d’essai confirmée' : decision === 'prolonge' ? `Période d’essai prolongée jusqu’au ${jourFr(jusqua!)}` : 'Période d’essai rompue'
    signer('employment.probation', 'livreur:' + id, quoi, 'en cours', texte)
    notifier(id, decision === 'confirme' ? 'Votre entreprise a confirmé votre période d’essai : votre contrat continue.' : decision === 'prolonge' ? `Votre entreprise prolonge votre période d’essai jusqu’au ${jourFr(jusqua!)} : ${texte}` : `Votre entreprise met fin à votre contrat pendant la période d’essai : ${texte}`)
    if (id === LIVREUR_DEMO) publier({ type: 'essai_conclu', livreurId: id, issue: decision, jusqua }, `essai_conclu-${t}`, t)
    // Rupture : le rattachement se ferme (après les missions en cours), comme un retrait.
    if (decision === 'rompu') await demoLivreurs.retirer(id, 'Rupture de la période d’essai : ' + texte)
    return repondre({ ...ok, jusqua })
  },
  async avertir(id, motif) {
    exiger(['proprietaire', 'gerant'], 'Avertissement écrit')
    const f = cible(id)
    if (!f) return non('statut')
    if (!motif.trim()) return non('motif')
    const t = maintenant()
    const rang = lireDossier(f).avertissements.length + 1
    const a: Avertissement = { id: `AV-${id}-${t}`, rang, le: t, motif: motif.trim(), par: auteur() }
    ecrireDossier(f, (x) => void x.avertissements.push(a))
    signer('employment.warning', 'livreur:' + id, `Avertissement écrit n° ${rang}`, '', a.motif)
    notifier(id, `Avertissement écrit n° ${rang} de votre entreprise : ${a.motif}`)
    if (id === LIVREUR_DEMO) publier({ type: 'avertissement_ecrit', id: a.id, livreurId: id, motif: a.motif, rang }, `avertissement_ecrit-${a.id}`, t)
    return repondre({ ...ok, rang })
  },
  async fixerHoraires(id, creneaux) {
    exiger(['proprietaire', 'gerant', 'repartiteur'], 'Horaires de travail')
    const f = cible(id)
    if (!f) return non('statut')
    const jours = new Set<number>()
    for (const c of creneaux) {
      if (!Number.isInteger(c.jour) || c.jour < 0 || c.jour > 6 || jours.has(c.jour) || !HEURE_RE.test(c.de) || !HEURE_RE.test(c.a) || c.de >= c.a) return non('creneaux')
      jours.add(c.jour)
    }
    if (!creneaux.length) return non('creneaux')
    const tries = [...creneaux].sort((a, b) => a.jour - b.jour)
    const avant = resume(lireDossier(f).horaires ?? HORAIRES_ENTREPRISE)
    const apres = resume(tries)
    if (avant === apres) return repondre(ok)
    const t = maintenant()
    ecrireDossier(f, (x) => void (x.horaires = tries))
    signer('employment.schedule', 'livreur:' + id, 'Horaires de travail', avant, apres)
    notifier(id, `Votre entreprise a changé vos horaires de travail : ${apres}.`)
    if (id === LIVREUR_DEMO) publier({ type: 'horaires_changes', livreurId: id, creneaux: tries }, `horaires_changes-${t}`, t)
    return repondre(ok)
  },
  async fixerZones(id, zones, motif) {
    exiger(['proprietaire', 'gerant', 'repartiteur'], 'Zones de travail')
    const f = cible(id)
    if (!f) return non('statut')
    const declarees = zonesDemo.lire().zones.filter((z) => z.declaree).map((z) => z.code)
    const zs = [...new Set(zones)]
    if (!zs.length || zs.some((z: CodeZone) => !declarees.includes(z))) return non('zones')
    if (zs.join(',') === f.zones.join(',')) return repondre(ok)
    const t = maintenant()
    const avant = f.zones.join(', ')
    livreursDemo.ecrire((s) => void (s.livreurs.find((l) => l.id === id)!.zones = zs))
    signer('employment.zones', 'livreur:' + id, 'Zones de travail', avant, zs.join(', ') + (motif?.trim() ? ` (${motif.trim()})` : ''))
    notifier(id, `Votre entreprise a changé vos zones de travail : ${zs.join(', ')}` + (f.statut === 'en_mission' ? ', à partir de vos prochains paquets.' : '.'))
    if (id === LIVREUR_DEMO) publier({ type: 'zones_changees', livreurId: id, zones: zs, motif: motif?.trim() || null }, `zones_changees-${t}`, t)
    return repondre(ok)
  },
  async accorderConge(id, c) {
    exiger(['proprietaire', 'gerant'], 'Accorder un congé')
    const f = cible(id)
    if (!f) return non('statut')
    if (!c.motif.trim()) return non('motif')
    const t = maintenant()
    if (!JOUR_RE.test(c.du) || !JOUR_RE.test(c.au) || c.du > c.au || c.au < jourDe(t)) return non('dates')
    if (actifs(t, lireDossier(f)).some((x) => x.du <= c.au && c.du <= x.au)) return non('chevauchement')
    const conge: CongeEmploi = { id: `CG-${t}`, du: c.du, au: c.au, motif: c.motif.trim(), le: t, par: auteur(), annuleLe: null }
    ecrireDossier(f, (x) => void x.conges.push(conge))
    const dates = c.du === c.au ? `le ${c.du}` : `du ${c.du} au ${c.au}`
    signer('employment.leave', 'livreur:' + id, `Congé accordé ${dates}`, '', conge.motif)
    notifier(id, `Votre entreprise vous accorde un congé ${dates} : aucun paquet ne vous sera affecté ces jours-là.`)
    return repondre({ ...ok, congeId: conge.id })
  },
  async annulerConge(id, congeId) {
    exiger(['proprietaire', 'gerant'], 'Annuler un congé')
    const f = cible(id)
    const c = f && lireDossier(f).conges.find((x) => x.id === congeId && x.annuleLe === null)
    if (!f || !c) return non('inconnu')
    ecrireDossier(f, (x) => void (x.conges.find((y) => y.id === congeId)!.annuleLe = maintenant()))
    signer('employment.leave', 'livreur:' + id, `Congé annulé (${c.du} → ${c.au})`, c.motif, 'annulé')
    notifier(id, `Votre entreprise a annulé votre congé (${c.du} → ${c.au}).`)
    return repondre(ok)
  },
  async casier(id, etat) {
    exiger(['proprietaire', 'gerant'], 'Casier judiciaire')
    const f = cible(id, false)
    if (!f || f.statut === 'retire') return non('statut')
    const avant = lireDossier(f).casier.etat
    if (avant === etat) return repondre(ok)
    const NOM = { recu: 'reçu', a_demander: 'à demander', non_exige: 'non exigé' }
    ecrireDossier(f, (x) => void (x.casier = { etat, le: etat === 'recu' ? maintenant() : null }))
    signer('employment.record_check', 'livreur:' + id, 'Casier judiciaire', NOM[avant], NOM[etat])
    if (etat === 'a_demander') notifier(id, 'Votre entreprise vous demande un extrait de casier judiciaire de moins de trois mois.')
    return repondre(ok)
  },
  async finContrat(id, motif) {
    exiger(['proprietaire', 'gerant'], 'Fin de contrat')
    const f = cible(id)
    if (!f) return non('statut')
    if (!motif.trim()) return non('motif')
    if (departOuvert(id)) return non('deja')
    const t = maintenant()
    const d = { ...nouveauDepart(`FC-${String(t).slice(-6)}`, id, t, 'autre', motif.trim()), initiative: 'entreprise' as const }
    departsDemo.ecrire((s) => void s.departs.push(d))
    signer('employment.termination', 'livreur:' + id, `Fin de contrat · préavis jusqu’au ${jourFr(d.preavisJusqua)}`, 'en poste', d.texte!)
    notifier(id, `Votre entreprise met fin à votre contrat : ${d.texte} Préavis jusqu’au ${jourFr(d.preavisJusqua)} ; vous travaillez normalement jusqu’à la veille du dernier jour.`)
    if (id === LIVREUR_DEMO) publier({ type: 'fin_contrat', id: d.id, livreurId: id, motif: d.texte!, preavisJusqua: d.preavisJusqua }, `fin_contrat-${d.id}`, t)
    return repondre({ ...ok, preavisJusqua: d.preavisJusqua })
  },
  async annulerFinContrat(id, motif) {
    exiger(['proprietaire', 'gerant'], 'Annuler une fin de contrat')
    const d = finOuverte(id)
    if (!d) return non('inconnu')
    if (!motif.trim()) return non('motif')
    const t = maintenant()
    departsDemo.ecrire((s) => void (s.departs = s.departs.filter((x) => x.id !== d.id)))
    signer('employment.termination', 'livreur:' + id, 'Fin de contrat annulée', 'préavis en cours', motif.trim())
    notifier(id, `Votre entreprise annule la fin de votre contrat : ${motif.trim()} Vous restez dans l’équipe.`)
    if (id === LIVREUR_DEMO) publier({ type: 'fin_contrat_annulee', id: d.id, livreurId: id }, `fin_contrat_annulee-${d.id}`, t)
    return repondre(ok)
  },
  async attestation(id) {
    exiger(['proprietaire', 'gerant', 'comptable'], 'Attestation de travail')
    const f = fiche(id)
    const debut = f && debutDe(f)
    if (!f || !debut) return non<{ nom: string; contenu: string; type: string }>('statut')
    const t = maintenant()
    const d = lireDossier(f)
    const clos = f.statut === 'retire' ? dernierClos(id) : null
    const fin = clos?.closLe ?? null
    const ref = `ATT-${f.id.slice(2).toUpperCase()}-${jourDe(t).replace(/-/g, '')}`
    const par = auteur()
    const contrat = d.contrat.type === 'cdd' ? 'contrat à durée déterminée' : 'contrat à durée indéterminée'
    const contenu = pdfBinaire(
      [
        { texte: `${ENTREPRISE.nom} · entreprise de livraison partenaire de BelivaY · ${ENTREPRISE.quartier}, Yaoundé`, taille: 9, espace: 4 },
        { texte: 'ATTESTATION DE TRAVAIL', taille: 18, espace: 18 },
        { texte: `Référence ${ref}`, taille: 9, espace: 14 },
        { texte: `Je soussigné(e), ${par}, agissant pour ${ENTREPRISE.nom}, atteste que :`, taille: 11, espace: 10 },
        { texte: `${f.nom}`, taille: 14, espace: 8 },
        {
          texte: fin
            ? `a été employé(e) par ${ENTREPRISE.nom} en qualité de livreur, sous ${contrat}, du ${jourAn(debut)} au ${jourAn(fin)}.`
            : `est employé(e) par ${ENTREPRISE.nom} en qualité de livreur, sous ${contrat}, depuis le ${jourAn(debut)}, et fait toujours partie de l'équipe à la date de la présente attestation.`,
          taille: 11,
          espace: 8,
        },
        { texte: 'Cette attestation est délivrée à la demande de l’intéressé(e), pour servir et valoir ce que de droit.', taille: 11, espace: 14 },
        { texte: `Fait à Yaoundé, le ${jourAn(t)}.`, taille: 11, espace: 18 },
        { texte: par, taille: 11, espace: 30 },
        { texte: 'Document délivré depuis l’espace entreprise BelivaY ; la délivrance est inscrite au journal de l’entreprise. Il ne mentionne ni rémunération, ni motif disciplinaire, ni donnée de client.', taille: 8 },
      ].map((l) => ({ ...l, texte: latin(l.texte) })),
    )
    signer('employment.certificate', 'livreur:' + id, 'Attestation de travail', '', `délivrée (${ref})`)
    return repondre({ ...ok, nom: `attestation-travail-${f.id.slice(2)}.pdf`, contenu, type: 'application/pdf' })
  },
}
