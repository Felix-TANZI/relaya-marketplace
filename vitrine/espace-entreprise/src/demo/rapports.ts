// DONNÉES DE DÉMONSTRATION — domaine « rapports » (ENT-P25) : indicateurs calculés sur les prestations du pilote
// (src/demo/prestations.ts), mêmes définitions que la console et le score (ENT-P25R-03) ; exports refusés sous
// ENT-RAPPORT-MIN-MISSIONS missions, rapport de pilote refusé avant son dernier jour. Aucune donnée de client.
import type { DomaineRapports, FiltreRapport, Indicateurs, ProgrammeRapport, Rapport } from '../donnees/domaines/rapports'
import type { Prestation } from '../donnees/domaines/reglements'
import { OUTILS, remplissage } from '../calculs/ent08'
import { HEURE, JOUR, jourDe } from '../calculs/temps'
import { csv, pdfBinaire, type LignePdf } from '../donnees/exports'
import { maintenant } from './horloge'
import { ENTREPRISE, LIVREURS, ZONES } from './jeu-essai'
import { exiger, montantsVisibles, roleCourant } from './acces'
import { auteur, journaliser, parametresDemo } from './parametres'
import { litigesDemo } from './litiges'
import { EVENEMENTS_PROPRES, colisDe, graviteDe, prestations } from './prestations'
import { magasin, repondre } from './stockage'

const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : null)
const decaler = (j: string, n: number) => jourDe(Date.parse(j + 'T12:00:00Z') + n * JOUR)

function choisir(f: FiltreRapport): Prestation[] {
  return prestations().filter((p) => {
    const j = jourDe(p.jour)
    return j >= f.du && j <= f.au && (!f.zone || p.zone === f.zone) && (!f.livreur || p.livreur.id === f.livreur) && (!f.type || p.genre === f.type)
  })
}

function indicateurs(ps: Prestation[], f: FiltreRapport): Indicateurs {
  const voir = montantsVisibles()
  const notes = ps.map(graviteDe).filter((g) => g !== null)
  const paquets = new Set(ps.map((p) => p.paquetId))
  return {
    paquets: paquets.size,
    colis: ps.reduce((a, p) => a + colisDe(p), 0),
    missions: ps.length,
    prestations: voir ? ps.filter((p) => p.statut === 'validee').reduce((a, p) => a + p.montant, 0) : null,
    dansLeDelai: pct(notes.filter((g) => g === 'succes').length, notes.length),
    remplissage: remplissage(ps.filter((p) => p.genre === 'relais').map(colisDe)),
    preuvesCompletes: pct(ps.filter((p) => p.statut !== 'non_payee').length, ps.length),
    litiges: litigesDemo.lire().litiges.filter((l) => paquets.has(l.paquetId)).length,
    rendus: EVENEMENTS_PROPRES.filter((e) => jourDe(e.le) >= f.du && jourDe(e.le) <= f.au && (!f.zone || e.zone === f.zone) && !f.livreur).length,
  }
}

export function calculer(f: FiltreRapport): Rapport {
  const voir = montantsVisibles()
  const ps = choisir(f)
  const duree = Math.round((Date.parse(f.au) - Date.parse(f.du)) / JOUR) + 1
  const avant: FiltreRapport = { ...f, du: decaler(f.du, -duree), au: decaler(f.du, -1) }
  const jours: string[] = []
  for (let j = f.du; j <= f.au && jours.length < 93; j = decaler(j, 1)) jours.push(j)
  const fin = ENTREPRISE.debutPilote + OUTILS.piloteJours * JOUR
  return {
    filtre: f,
    indicateurs: indicateurs(ps, f),
    precedent: indicateurs(choisir(avant), avant),
    parJour: jours.map((j) => {
      const d = ps.filter((p) => jourDe(p.jour) === j)
      return { jour: j, colis: d.reduce((a, p) => a + colisDe(p), 0), prestations: voir ? d.filter((p) => p.statut === 'validee').reduce((a, p) => a + p.montant, 0) : null }
    }),
    parZone: ZONES.map((z) => ({ zone: z.code, nom: z.nom, colis: ps.filter((p) => p.zone === z.code).reduce((a, p) => a + colisDe(p), 0) })),
    parType: (['relais', 'domicile'] as const).map((type) => ({ type, colis: ps.filter((p) => p.genre === type).reduce((a, p) => a + colisDe(p), 0) })),
    parLivreur: LIVREURS.map((l) => {
      const d = ps.filter((p) => p.livreur.id === l.id)
      const notes = d.map(graviteDe).filter((g) => g !== null)
      return { id: l.id, nom: l.nom, colis: d.reduce((a, p) => a + colisDe(p), 0), dansLeDelai: pct(notes.filter((g) => g === 'succes').length, notes.length), preuvesCompletes: pct(d.filter((p) => p.statut !== 'non_payee').length, d.length), prestations: voir ? d.filter((p) => p.statut === 'validee').reduce((a, p) => a + p.montant, 0) : null }
    }).filter((l) => l.colis > 0),
    parlant: ps.length >= OUTILS.rapportMin,
    pilote: { debut: ENTREPRISE.debutPilote, fin, disponible: maintenant() >= fin - JOUR },
  }
}

const fr = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const pc = (v: number | null) => (v === null ? '—' : `${v} %`)

/** Le rapport d'une période en lignes de PDF : en-tête, indicateurs, détail par jour, zone, type et livreur. */
export function lignesPdf(r: Rapport, titre: string): LignePdf[] {
  const i = r.indicateurs
  const l: LignePdf[] = [
    { texte: `BelivaY · ${ENTREPRISE.nom}`, taille: 9 },
    { texte: titre, taille: 16, espace: 6 },
    { texte: `Période du ${r.filtre.du} au ${r.filtre.au}${r.filtre.zone ? ` · zone ${r.filtre.zone}` : ''}${r.filtre.type ? ` · ${r.filtre.type === 'relais' ? 'tournées relais' : 'courses domicile'}` : ''}`, taille: 10 },
    { texte: 'Indicateurs (mêmes définitions que la console et le Trust Score)', taille: 12, espace: 10 },
    { texte: `Paquets : ${i.paquets} · Colis : ${i.colis} · Missions : ${i.missions} · Paquets rendus : ${i.rendus} · Litiges : ${i.litiges}` },
    { texte: `Livraisons dans le délai : ${pc(i.dansLeDelai)} · Preuves complètes : ${pc(i.preuvesCompletes)} · Remplissage moyen : ${i.remplissage ?? '—'} colis par tournée (objectif ${OUTILS.objectifTournee})` },
  ]
  if (i.prestations !== null) l.push({ texte: `Prestations validées : ${fr(i.prestations)} F (le relevé fait foi pour l’argent)` })
  l.push({ texte: 'Par jour', taille: 12, espace: 10 })
  for (const j of r.parJour) l.push({ texte: `${j.jour} · ${j.colis} colis${j.prestations !== null ? ` · ${fr(j.prestations)} F` : ''}` })
  l.push({ texte: 'Par zone', taille: 12, espace: 10 })
  for (const z of r.parZone) l.push({ texte: `${z.zone} ${z.nom} · ${z.colis} colis` })
  l.push({ texte: 'Par type de paquet', taille: 12, espace: 10 })
  for (const t of r.parType) l.push({ texte: `${t.type === 'relais' ? 'Tournées relais' : 'Courses domicile'} · ${t.colis} colis` })
  l.push({ texte: 'Par livreur', taille: 12, espace: 10 })
  for (const x of r.parLivreur) l.push({ texte: `${x.nom} · ${x.colis} colis · dans le délai ${pc(x.dansLeDelai)} · preuves ${pc(x.preuvesCompletes)}${x.prestations !== null ? ` · ${fr(x.prestations)} F` : ''}` })
  l.push({ texte: 'Aucune donnée personnelle de client. Document généré par le portail entreprise BelivaY.', taille: 8, espace: 14 })
  return l
}

export function csvRapport(r: Rapport): string {
  const voir = r.indicateurs.prestations !== null
  const entetes = ['section', 'libelle', 'colis', ...(voir ? ['prestations_f'] : []), 'dans_le_delai_pct', 'preuves_completes_pct']
  const v = (x: number | null | undefined) => (x === null || x === undefined ? '' : x)
  const lignes: (string | number)[][] = [
    ['total', `${r.filtre.du} → ${r.filtre.au}`, r.indicateurs.colis, ...(voir ? [v(r.indicateurs.prestations)] : []), v(r.indicateurs.dansLeDelai), v(r.indicateurs.preuvesCompletes)],
    ...r.parJour.map((j) => ['jour', j.jour, j.colis, ...(voir ? [v(j.prestations)] : []), '', '']),
    ...r.parZone.map((z) => ['zone', `${z.zone} ${z.nom}`, z.colis, ...(voir ? [''] : []), '', '']),
    ...r.parType.map((t) => ['type', t.type, t.colis, ...(voir ? [''] : []), '', '']),
    ...r.parLivreur.map((x) => ['livreur', x.nom, x.colis, ...(voir ? [v(x.prestations)] : []), v(x.dansLeDelai), v(x.preuvesCompletes)]),
  ]
  return csv(entetes, lignes)
}

// Rapport programmé : chaque vendredi (jour de paiement), à l'heure choisie, la semaine écoulée.
const VENDREDI = 5
export const programmeDemo = magasin('rapports-programme', () => ({ actif: false, heure: 18, format: 'pdf' as 'pdf' | 'csv', destinataire: '', dernierEnvoi: null as number | null, modifieLe: null as number | null, par: null as string | null }))

/** Prochain vendredi à `heure` (heure de Yaoundé), strictement après `t`. */
export function prochainVendredi(t: number, heure: number): number {
  const local = new Date(t + HEURE) // heure de Yaoundé lue en UTC
  const base = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), heure) - HEURE
  const ecart = (VENDREDI - local.getUTCDay() + 7) % 7
  const x = base + ecart * JOUR
  return x > t ? x : x + 7 * JOUR
}

export const demoRapports: DomaineRapports = {
  async rapport(f) {
    return repondre(calculer(f))
  },
  async exporter(f, format) {
    const r = calculer(f)
    if (!r.parlant) return repondre({ ok: false as const, raison: 'peu_de_donnees' as const })
    const nom = `rapport-${f.du}-${f.au}.${format}`
    if (format === 'pdf') return repondre({ ok: true as const, nom, contenu: pdfBinaire(lignesPdf(r, 'Rapport d’activité')), type: 'application/pdf' })
    return repondre({ ok: true as const, nom, contenu: csvRapport(r), type: 'text/csv;charset=utf-8' })
  },
  async rapportPilote() {
    const r = calculer({ du: jourDe(ENTREPRISE.debutPilote), au: jourDe(maintenant()) })
    if (!r.pilote.disponible) return repondre({ ok: false as const, raison: 'pilote_en_cours' as const })
    return repondre({ ok: true as const, nom: 'rapport-fin-de-pilote.pdf', contenu: pdfBinaire(lignesPdf(r, 'Rapport de fin de pilote')), type: 'application/pdf' })
  },
  async programme() {
    const p = programmeDemo.lire()
    const x: ProgrammeRapport = { ...p, jour: VENDREDI, prochain: p.actif ? prochainVendredi(maintenant(), p.heure) : null }
    return repondre(x)
  },
  async programmer(p) {
    if (roleCourant() === 'repartiteur') return repondre({ ok: false as const, raison: 'role' as const })
    exiger(['proprietaire', 'comptable'], 'Programmer le rapport')
    if (!Number.isInteger(p.heure) || p.heure < 6 || p.heure > 22) return repondre({ ok: false as const, raison: 'heure' as const })
    const mail = p.destinataire.trim().toLowerCase()
    const interne = parametresDemo.lire().utilisateurs.some((u) => u.statut !== 'retire' && u.email.toLowerCase() === mail)
    if (p.actif && !interne) return repondre({ ok: false as const, raison: 'destinataire' as const })
    const avant = programmeDemo.lire()
    programmeDemo.ecrire((s) => Object.assign(s, { actif: p.actif, heure: p.heure, format: p.format, destinataire: mail, modifieLe: maintenant(), par: auteur() }))
    if (avant.actif !== p.actif || avant.heure !== p.heure || avant.format !== p.format || avant.destinataire !== mail) journaliser(p.actif ? `Rapport du vendredi programmé à ${p.heure} h (${p.format.toUpperCase()})` : 'Rapport du vendredi arrêté')
    return repondre({ ok: true as const, prochain: p.actif ? prochainVendredi(maintenant(), p.heure) : null })
  },
}
