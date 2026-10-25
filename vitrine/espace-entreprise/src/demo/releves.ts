// DONNÉES DE DÉMONSTRATION — domaine « relevés » (ENT-P19) : un relevé par semaine de versement depuis le début du
// pilote (arrêtée le jeudi à 23 h 59 : définitif ensuite, PDF et CSV ouverts) et un récapitulatif par mois (septembre
// définitif, octobre provisoire) ; tant qu'une période n'est pas arrêtée, PDF et CSV sont refusés (409
// STATEMENT_NOT_FINAL). Mêmes lignes que les règlements
// (src/demo/reglements.ts) ; aucune donnée de client. Mode de facturation et retenue à la source lus dans le registre.
import type { DomaineReleves, LigneReleve, MentionsReleve, Releve } from '../donnees/domaines/releves'
import { pdfBinaire } from '../donnees/exports'
import { PARAMETRES, REGISTRE } from '../calculs/registre'
import { JOUR, jourDe, yaounde } from '../calculs/temps'
import { maintenant } from './horloge'
import { exiger } from './acces'
import { ENTREPRISE } from './jeu-essai'
import { litigesDemo } from './litiges'
import { prestations } from './prestations'
import { retenues, semainesPassees, versementPrevu } from './reglements'
import { magasin, repondre } from './stockage'

const MODE: 'televersee' | 'autofacturation' = /^autofacturation/i.test(REGISTRE.mode_facturation?.valeur ?? '') ? 'autofacturation' : 'televersee'

export const relevesDemo = magasin('releves', () => ({ factures: {} as Record<string, { fichier: string; le: number }> }))

/** Lignes d'une période (du, au] : prestations validées de la période et retenues devenues définitives pendant elle. */
function lignes(du: number, au: number, t: number): LigneReleve[] {
  const ls = litigesDemo.lire().litiges
  const ouverts = new Set(ls.filter((l) => !l.decision || l.recours?.statut === 'en_cours' || l.decision.definitiveLe > Math.min(au, t)).map((l) => l.id))
  const v = { prestations: prestations(ouverts).filter((p) => p.jour > du && p.jour <= au), retenues: retenues(ls, Math.min(au, t), au, du) }
  return [
    ...v.prestations
      .filter((p) => p.statut === 'validee')
      .map((p): LigneReleve => ({ jour: jourDe(p.jour), genre: 'prestation', reference: `${p.paquetId} · ${p.missionId}`, detail: `${p.genre === 'relais' ? 'Relais' : 'Domicile'} ${p.zone} · ${p.classes.join(' ')}${p.minoree ? ' · minorée (retard)' : ''}`, montant: p.montant })),
    ...v.retenues.filter((r) => r.imputee === 'ce_vendredi').map((r): LigneReleve => ({ jour: jourDe(r.definitiveLe), genre: 'retenue', reference: r.litigeId, detail: r.libelle, montant: -r.montant })),
  ].sort((a, b) => a.jour.localeCompare(b.jour))
}

function construire(id: string, periode: Releve['periode'], depuis: number, arreteLe: number, t: number): Releve {
  const ls = lignes(depuis, arreteLe, t)
  const du = jourDe(depuis + 60_000)
  const au = jourDe(arreteLe)
  const prest = ls.filter((l) => l.genre === 'prestation').reduce((a, l) => a + l.montant, 0)
  const ret = -ls.filter((l) => l.genre === 'retenue').reduce((a, l) => a + l.montant, 0)
  const f = relevesDemo.lire().factures[id]
  const definitif = t > arreteLe
  return {
    id,
    periode,
    du,
    au,
    statut: definitif ? 'definitif' : 'provisoire',
    arreteLe,
    lignes: ls,
    totalPrestations: prest,
    totalRetenues: ret,
    net: prest - ret,
    facture: { mode: MODE, statut: MODE === 'autofacturation' || !definitif ? 'sans_objet' : f ? 'recue' : 'attendue', fichier: f?.fichier ?? null, recueLe: f?.le ?? null },
  }
}

const DESTINATAIRE = { denomination: 'Yafé Express SARL', niu: 'M012400123456P', quartier: 'Mokolo, Yaoundé' }
const mentionsDemo = (): MentionsReleve => ({
  emetteur: PARAMETRES.saisies.mentions,
  destinataire: DESTINATAIRE,
  modeFacturation: MODE,
  retenueSource: REGISTRE.retenue_fiscale_source?.valeur ?? '',
})

const montant = (n: number) => `${n < 0 ? '−' : ''}${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} F`

/** Fichier d'un relevé définitif : CSV (« ; », BOM UTF-8, une ligne par prestation et par retenue) ou VRAI PDF
 *  (chaîne d'octets : en-tête, parties et mentions, lignes, totaux, mentions légales). Aucune donnée de client. */
export function fichierReleve(r: Releve, m: MentionsReleve, format: 'pdf' | 'csv'): { nom: string; contenu: string; type: string } {
  if (format === 'csv') {
    const csv = ['jour;genre;reference;detail;montant', ...r.lignes.map((l) => [l.jour, l.genre, l.reference, l.detail, l.montant].join(';'))].join('\r\n')
    return { nom: `${r.id}.csv`, contenu: '\ufeff' + csv + '\r\n', type: 'text/csv;charset=utf-8' }
  }
  const e = m.emetteur
  const contenu = pdfBinaire([
    { texte: `BelivaY · ${r.periode === 'semaine' ? 'Relevé de prestations' : 'Récapitulatif mensuel'} ${r.id}`, taille: 16, espace: 6 },
    { texte: `Du ${r.du} au ${r.au} · ${r.statut === 'definitif' ? 'définitif' : 'provisoire'}`, taille: 10, espace: 10 },
    { texte: `Émis par ${e.denomination} · ${e.forme} · capital ${e.capital} · ${e.siege} · RCCM ${e.rccm} · NIU ${e.niu}`, taille: 9 },
    { texte: `Pour ${m.destinataire.denomination} · ${m.destinataire.quartier} · NIU ${m.destinataire.niu}`, taille: 9, espace: 10 },
    { texte: 'Jour · Référence · Prestation ou retenue · Montant', taille: 9 },
    ...r.lignes.map((l) => ({ texte: `${l.jour} · ${l.reference} · ${l.genre === 'retenue' ? 'Retenue motivée' : 'Prestation validée'} (${l.detail}) · ${montant(l.montant)}`, taille: 9 })),
    ...(r.lignes.length ? [] : [{ texte: 'Aucune prestation validée ni retenue sur cette période.' }]),
    { texte: `Prestations validées : ${montant(r.totalPrestations)}`, taille: 10, espace: 10 },
    { texte: `Retenues motivées : ${montant(-r.totalRetenues)}`, taille: 10 },
    { texte: `Net de la période : ${montant(r.net)}`, taille: 12, espace: 4 },
    { texte: `Facturation : ${m.modeFacturation === 'autofacturation' ? 'autofacturation par BelivaY' : 'facture téléversée par l’entreprise'} · retenue fiscale à la source ${m.retenueSource}.`, taille: 8, espace: 10 },
    { texte: `Relevé établi par ${e.denomination} à partir des prestations validées par le serveur ; il vaut pièce justificative pour la facture de ${m.destinataire.denomination}, seule responsable de ses obligations fiscales et sociales, y compris vis-à-vis de ses livreurs. Aucune donnée de client final.`, taille: 8 },
  ])
  return { nom: `${r.id}.pdf`, contenu, type: 'application/pdf' }
}

/** Semaine ISO d'un jour (« 2026-10-15 » → 42). */
function semaineIso(t: number): number {
  const d = new Date(jourDe(t) + 'T00:00:00Z')
  const jeudi = new Date(d.getTime() + (3 - ((d.getUTCDay() + 6) % 7)) * JOUR)
  const debutAnnee = Date.UTC(jeudi.getUTCFullYear(), 0, 1)
  return 1 + Math.floor((jeudi.getTime() - debutAnnee) / (7 * JOUR))
}

/** Relevés de la démonstration à l'instant `t` : semaine en cours puis semaines passées ; mois en cours puis passés. */
export const relevesA = (t: number) => {
  const v = versementPrevu(t)
  const semaines = [{ arrete: v.arrete }, ...semainesPassees(t)].map(({ arrete }) => {
    const depuis = Math.max(arrete - 7 * JOUR, ENTREPRISE.debutPilote - 60_000)
    return construire(`RL-2026-S${semaineIso(arrete)}`, 'semaine', depuis, arrete, t)
  })
  const mois = [10, 9].map((m) => construire(`RL-2026-${String(m).padStart(2, '0')}`, 'mois', Math.max(yaounde(2026, m, 1) - 60_000, ENTREPRISE.debutPilote - 60_000), yaounde(2026, m + 1, 1) - 60_000, t))
  return { semaine: semaines, mois }
}

export const demoReleves: DomaineReleves = {
  async liste(periode) {
    exiger(['proprietaire', 'comptable'], 'Relevés')
    return repondre(relevesA(maintenant())[periode])
  },
  async mentions() {
    exiger(['proprietaire', 'comptable'], 'Relevés')
    return repondre(mentionsDemo())
  },
  async fichier(id, format) {
    exiger(['proprietaire', 'comptable'], 'Relevés')
    const t = maintenant()
    const r = [...relevesA(t).semaine, ...relevesA(t).mois].find((x) => x.id === id)
    if (!r || r.statut === 'provisoire') return repondre({ ok: false as const, raison: 'provisoire' as const })
    return repondre({ ok: true as const, ...fichierReleve(r, mentionsDemo(), format) })
  },
  async televerserFacture(id, fichier) {
    exiger(['proprietaire', 'comptable'], 'Relevés')
    const t = maintenant()
    const r = [...relevesA(t).semaine, ...relevesA(t).mois].find((x) => x.id === id)
    if (!r || r.statut === 'provisoire') return repondre({ ok: false as const, raison: 'provisoire' as const })
    if (MODE === 'autofacturation') return repondre({ ok: false as const, raison: 'autofacturation' as const })
    if (fichier.type !== 'application/pdf') return repondre({ ok: false as const, raison: 'format' as const })
    if (fichier.taille > PARAMETRES.acces.tailleMaxPieceMo * 1024 * 1024) return repondre({ ok: false as const, raison: 'taille' as const })
    relevesDemo.ecrire((s) => void (s.factures[id] = { fichier: fichier.nom, le: t }))
    return repondre({ ok: true as const })
  },
}
