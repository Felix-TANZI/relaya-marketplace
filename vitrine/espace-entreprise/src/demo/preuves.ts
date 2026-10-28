// DONNÉES DE DÉMONSTRATION — domaine « preuves » (ENT-P16), lu dans les paquets (DED-01) : chaîne dans l'ordre
// (ENT-RG-R10) — C1 à chaque ramassage (photo du produit à découvert et photo du colis scellé et étiqueté par colis,
// heure de validation du code de remise, jamais sa valeur), transport (positions, photos d'incident), C2 au relais
// (scan de dépôt et résultat par colis, confirmation du livreur) ou remise à domicile (photo, position, code validé),
// clôture. Chaque changement de main a sa photo (DP-63). File de revue : illisible, manquante (expirée après
// ENT-PREUVE-EXPIRE heures), en attente au-delà d'ENT-PREUVE-REVUE heures. Signaler, joindre un complément (photos
// seulement), exporter (journalisé) ; jamais supprimer ni remplacer (ENT-P16R-01).
import type { DossierPreuves, DomainePreuves, Maillon, Preuve, ResumePreuves, StatutPreuve } from '../donnees/domaines/preuves'
import type { Instant, LivreurCourt } from '../donnees/communs'
import { HEURE, JOUR } from '../calculs/temps'
import { PARAMETRES } from '../calculs/registre'
import { REGLES } from '../calculs/livraison/regles-ecrans'
import { maintenant } from './horloge'
import { T } from './jeu-essai'
import { exiger } from './acces'
import { LIEUX, aNous, livreurDe, nomUtilisateur, paquetsDemo, type PaquetDemo } from './paquets'
import { incidentsStock } from './incidents'
import { magasin, repondre } from './stockage'
import { signaler } from './pont-console'

type Etat = { statut: StatutPreuve; recuLe: Instant | null }
export const preuvesDemo = magasin('preuves', () => ({
  etats: {
    'PQ-Z3-261013-001|C1|1|photo_scelle|BV 24 8105': { statut: 'rejetee', recuLe: T(-48) + 6_000 },
    'PQ-Z2-261013-003|C1|1|photo_produit|BV 24 8195': { statut: 'en_file', recuLe: null },
    'PQ-Z2-261013-003|C1|1|photo_scelle|BV 24 8195': { statut: 'en_file', recuLe: null },
    'PQ-Z2-261013-003|C1|1|photo_produit|BV 24 8196': { statut: 'en_file', recuLe: null },
    'PQ-Z2-261013-003|C1|1|photo_scelle|BV 24 8196': { statut: 'en_file', recuLe: null },
    'PQ-Z2-261013-003|C1|1|photo_produit|BV 24 8197': { statut: 'en_file', recuLe: null },
    'PQ-Z2-261013-003|C1|1|photo_scelle|BV 24 8197': { statut: 'en_file', recuLe: null },
    'PQ-Z6-261013-002|domicile|1|photo_remise|': { statut: 'en_file', recuLe: null },
    'PQ-Z3-261012-009|C1|1|photo_scelle|BV 24 9006': { statut: 'en_file', recuLe: null },
  } as Record<string, Etat>,
  signalements: {} as Record<string, NonNullable<Preuve['signalement']>>,
  complements: {} as Record<string, Preuve['complements']>,
  exports: {} as Record<string, { par: string; le: Instant }[]>,
}))

/** Preuves d'un paquet, dans l'ordre de la chaîne. */
function preuvesDe(p: PaquetDemo, t: Instant): Preuve[] {
  const s = preuvesDemo.lire()
  const r: Preuve[] = []
  const ajouter = (maillon: Preuve['maillon'], arret: number, genre: Preuve['genre'], lieu: string, le: Instant | null, o: Partial<Preuve> = {}) => {
    const id = `${p.id}|${maillon}|${arret}|${genre}|${o.etiquette ?? ''}`
    const e = s.etats[id]
    let statut: StatutPreuve = le === null ? 'attendue' : (e?.statut ?? 'synchronisee')
    // Une preuve restée en file au-delà du délai du registre est expirée : preuve absente (ENT-P16R-02).
    if (statut === 'en_file' && le !== null && t - le > REGLES.preuveExpireH * HEURE) statut = 'expiree'
    r.push({
      id, paquetId: p.id, maillon, genre, changementDeMain: null, lieu, etiquette: null, le, recuLe: le === null ? null : e ? e.recuLe : le + 5_000, statut, resultat: null,
      signalement: s.signalements[id] ?? null, complements: s.complements[id] ?? [], ...o,
    })
  }
  p.arrets.forEach((a, i) => {
    const l = LIEUX[a.lieu]
    const nom = l.nom || l.quartier
    const colis = p.colis.filter((c) => c.arret === i)
    if (a.sens === 'ramassage') {
      const main = l.type === 'relais' ? ('relais_livreur' as const) : ('vendeur_livreur' as const)
      colis.forEach((c, k) => {
        const le = a.fait ? a.fait - (colis.length - k) * 50_000 : null
        ajouter('C1', i, 'photo_produit', nom, le, { etiquette: c.etiquette, changementDeMain: main })
        ajouter('C1', i, 'photo_scelle', nom, le && le + 20_000, { etiquette: c.etiquette, changementDeMain: main })
      })
      ajouter('C1', i, 'code', nom, a.fait, { changementDeMain: main })
    } else if (a.sens === 'depot') {
      p.colis.forEach((c, k) => ajouter('C2', i, 'scan_depot', nom, a.fait && a.fait - (p.colis.length - k) * 30_000, { etiquette: c.etiquette, changementDeMain: 'livreur_relais', resultat: a.fait ? 'controle' : null }))
      ajouter('C2', i, 'confirmation', nom, a.fait, { changementDeMain: 'livreur_relais' })
    } else {
      ajouter('domicile', i, 'photo_remise', nom, a.fait && a.fait - 40_000, { changementDeMain: l.type === 'domicile' ? 'livreur_client' : null })
      ajouter('domicile', i, 'position', nom, a.fait && a.fait - 35_000)
      ajouter('domicile', i, 'code', nom, a.fait, { changementDeMain: l.type === 'domicile' ? 'livreur_client' : null })
    }
    if (i === 0 && p.depart && p.depart <= t) {
      ajouter('transport', i, 'position', p.zone, p.depart)
      for (const inc of incidentsStock.lire().incidents.filter((x) => x.paquetId === p.id))
        for (const ph of inc.photos) ajouter('transport', i, 'photo_incident', inc.lieu, ph.le, { etiquette: ph.id })
    }
  })
  if (p.statut === 'clos' || p.statut === 'depose') ajouter('cloture', p.arrets.length, 'confirmation', p.id, p.closLe)
  return r
}

const ORDRE: Preuve['maillon'][] = ['C1', 'transport', 'C2', 'domicile', 'cloture']
function maillons(ps: Preuve[]): Maillon[] {
  const groupes = new Map<string, Preuve[]>()
  for (const x of ps) {
    const k = x.maillon + '|' + x.lieu
    groupes.set(k, [...(groupes.get(k) ?? []), x])
  }
  return [...groupes]
    .sort(([a], [b]) => ORDRE.indexOf(a.split('|')[0] as Preuve['maillon']) - ORDRE.indexOf(b.split('|')[0] as Preuve['maillon']))
    .map(([k, preuves]) => ({
      code: k.split('|')[0] as Preuve['maillon'],
      lieu: k.split('|')[1],
      preuves,
      etat: preuves.some((x) => x.statut === 'rejetee' || x.statut === 'expiree') ? 'probleme' : preuves.some((x) => x.statut === 'en_file') ? 'attente' : preuves.some((x) => x.statut === 'attendue') ? 'a_venir' : 'complet',
    }))
}

const ORDRE_ETAT: DossierPreuves['etat'][] = ['illisible', 'attente', 'en_cours', 'complet']
const SUIVIS = ['affecte', 'en_cours', 'incident', 'depose', 'clos']
const suivis = (t: Instant) => paquetsDemo.lire().paquets.filter((p) => aNous(p.statut) && SUIVIS.includes(p.statut) && (p.deposeLe ?? t) > t - REGLES.conservationPreuvesJ * JOUR)

function dossier(p: PaquetDemo, t: Instant): DossierPreuves {
  const ps = preuvesDe(p, t)
  const etat: DossierPreuves['etat'] = ps.some((x) => x.statut === 'rejetee' || x.statut === 'expiree') ? 'illisible' : ps.some((x) => x.statut === 'en_file') ? 'attente' : p.statut === 'clos' ? 'complet' : 'en_cours'
  return { paquetId: p.id, genre: p.genre, zone: p.zone, livreur: livreurDe(p, t), etat, maillons: maillons(ps), exports: preuvesDemo.lire().exports[p.id] ?? [] }
}

export const demoPreuves: DomainePreuves = {
  async resume() {
    exiger(['proprietaire', 'repartiteur'], 'Preuves')
    const t = maintenant()
    const ps = suivis(t)
    const revue: ResumePreuves['revue'] = []
    const taux = new Map<string, { livreur: LivreurCourt; completes: number; attendues: number }>()
    for (const p of ps) {
      const l = livreurDe(p, t)
      for (const x of preuvesDe(p, t)) {
        if (x.statut === 'rejetee') revue.push({ preuve: x, raison: 'illisible', expireLe: null })
        else if (x.statut === 'expiree') revue.push({ preuve: x, raison: 'manquante', expireLe: null })
        else if (x.statut === 'en_file' && x.le && t - x.le > REGLES.preuveRevueH * HEURE) revue.push({ preuve: x, raison: 'attente_longue', expireLe: x.le + REGLES.preuveExpireH * HEURE })
        if (l && x.statut !== 'attendue') {
          const e = taux.get(l.id) ?? { livreur: l, completes: 0, attendues: 0 }
          e.attendues++
          if (x.statut === 'synchronisee') e.completes++
          taux.set(l.id, e)
        }
      }
    }
    return repondre({
      // Les dossiers à revoir d'abord (illisible, en attente), puis en cours, puis complets.
      missions: ps
        .filter((p) => p.statut !== 'clos' || (p.closLe ?? 0) > t - JOUR)
        .map((p) => ({ paquetId: p.id, livreur: livreurDe(p, t)?.nom ?? null, etat: dossier(p, t).etat }))
        .sort((a, b) => ORDRE_ETAT.indexOf(a.etat) - ORDRE_ETAT.indexOf(b.etat)),
      revue,
      taux: [...taux.values()].sort((a, b) => a.completes / a.attendues - b.completes / b.attendues),
    })
  },
  async dossier(paquetId) {
    exiger(['proprietaire', 'repartiteur'], 'Preuves')
    const t = maintenant()
    const p = suivis(t).find((x) => x.id === paquetId)
    return repondre(p ? dossier(p, t) : null)
  },
  async signaler(id, commentaire) {
    exiger(['proprietaire', 'repartiteur'], 'Signaler une preuve')
    if (commentaire.trim().length < PARAMETRES.saisies.preuveCommentaireMin) return repondre({ ok: false as const, raison: 'commentaire' as const })
    const par = nomUtilisateur()
    preuvesDemo.ecrire((s) => void (s.signalements[id] = { par, le: maintenant(), commentaire: commentaire.trim() }))
    // Vers la console : la preuve signalée arrive dans la File d'action (le commentaire libre reste ici : charge anonyme).
    signaler('entreprise', id, 'Preuve de remise signalée par l’entreprise', 'normale')
    return repondre({ ok: true as const })
  },
  async completer(id, commentaire, photos) {
    exiger(['proprietaire', 'repartiteur'], 'Joindre un complément')
    if (commentaire.trim().length < PARAMETRES.saisies.preuveCommentaireMin) return repondre({ ok: false as const, raison: 'commentaire' as const })
    const par = nomUtilisateur()
    preuvesDemo.ecrire((s) => void (s.complements[id] = [...(s.complements[id] ?? []), { par, le: maintenant(), commentaire: commentaire.trim(), photos }]))
    return repondre({ ok: true as const })
  },
  async exporter(paquetId) {
    exiger(['proprietaire', 'repartiteur'], 'Exporter un dossier')
    const e = { par: nomUtilisateur(), le: maintenant() }
    preuvesDemo.ecrire((s) => void (s.exports[paquetId] = [e, ...(s.exports[paquetId] ?? [])]))
    return repondre(e)
  },
  async relancer(paquetId) {
    exiger(['proprietaire', 'repartiteur'], 'Relancer un livreur')
    const t = maintenant()
    const par = nomUtilisateur()
    paquetsDemo.ecrire((s) => {
      const p = s.paquets.find((x) => x.id === paquetId)
      if (!p) return
      p.relances.push({ le: t, sujet: 'preuves' })
      p.journal.push({ le: t, quoi: 'relance_preuves', par })
    })
    return repondre({ envoyeLe: t })
  },
}

