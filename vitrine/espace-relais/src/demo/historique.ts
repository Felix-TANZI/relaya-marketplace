// DONNÉES DE DÉMONSTRATION — domaine « historique » : les opérations lues dans le journal signé des colis (modèle
// central), regroupées comme au comptoir (une réception par lot, un départ par collecte), et les fermetures. Pour un
// employé, aucun montant (DRO-03, HIS-03) ; export réservé au gérant. Recherche sur toute la durée de conservation.
import { PARAMETRES } from '../calculs/registre'
import { JOUR, jourDe } from '../calculs/temps'
import type { ColisRelais } from '../donnees/domaines/colis'
import type { DomaineHistorique, FiltreHistorique, FiltresHistorique, Historique, Operation, TypeOperation } from '../donnees/domaines/historique'
import { REGLES } from '../calculs/regles-incidents'
import { etatColis, tousLesColis } from './colis'
import { demoFermeture } from './fermeture'
import { maintenant } from './horloge'
import { etatIncidents } from './incidents'
import { membreActuel } from './session'
import { repondre } from './stockage'

const P = PARAMETRES.relais
const ACTIONS: Record<string, TypeOperation> = { lot_valide: 'reception', valider_lot: 'reception', remis: 'remise', remettre: 'remise', especes_encaissees: 'encaissement', especes_rendues: 'encaissement', parti: 'sortie', sortie: 'sortie', retour_depose: 'retour', un_probleme: 'constat', refus_motive: 'constat', deplace: 'reglage' }
const FILTRES: Record<FiltreHistorique, TypeOperation[]> = { reception: ['reception'], remise: ['remise', 'encaissement'], sortie: ['sortie'], retour: ['retour'], constat: ['constat'] }
const photosDe = (c: ColisRelais, nature: string) => c.preuves.filter((p) => p.nature === nature).reduce((n, p) => n + p.photos.length, 0)

async function operations(): Promise<Operation[]> {
  const gerant = membreActuel()?.role === 'proprietaire'
  const groupes = etatColis.lire().groupes
  const ops: Operation[] = []
  const lots = new Map<string, Operation>()
  const collectes = new Map<string, Operation>()
  for (const c of tousLesColis()) {
    // Écritures du retrait (PR-05) qui complètent la remise ou l'encaissement du même colis.
    const a = (action: string) => c.journal.some((j) => j.action === action)
    const controle = a('sans_ouverture') ? ('sans_ouverture' as const) : a('tout_en_ordre') ? ('en_ordre' as const) : null
    for (const [k, j] of c.journal.entries()) {
      const type = ACTIONS[j.action]
      if (!type || j.par.type !== 'membre') continue
      const base = { le: j.le, type, par: j.par, colis: [c.id], emplacement: null, especes: null, gainRelais: null, photos: 0, detail: {} }
      if (type === 'reception') {
        const cle = `${j.detail ?? c.arrivee.lot}|${Math.floor(j.le / 60_000)}`
        const o = lots.get(cle)
        if (o) {
          o.colis.push(c.id)
          o.detail.reserve ||= c.arrivee.resultat === 'reserve'
        } else {
          const op: Operation = { ...base, id: 'R-' + cle, reference: j.detail ?? c.arrivee.lot ?? c.id, photos: 1, detail: { lot: j.detail ?? c.arrivee.lot, entreprise: c.arrivee.entreprise, reserve: c.arrivee.resultat === 'reserve' } }
          lots.set(cle, op)
          ops.push(op)
        }
      } else if (type === 'sortie') {
        const cle = `${j.detail ?? c.sortie?.collecte}|${Math.floor(j.le / 60_000)}`
        const o = collectes.get(cle)
        if (o) o.colis.push(c.id)
        else {
          const op: Operation = { ...base, id: 'S-' + cle, reference: j.detail ?? c.sortie?.collecte ?? c.id, photos: 1, detail: { collecte: j.detail ?? c.sortie?.collecte, destination: c.sortie?.destination ?? null, motif: c.sortie?.motif ?? null } }
          collectes.set(cle, op)
          ops.push(op)
        }
      } else if (type === 'remise')
        ops.push({ ...base, id: `${c.id}-${k}`, reference: c.id, photos: photosDe(c, 'remise'), detail: { porteur: c.remise?.porteur ?? null, pieceVerifiee: c.remise?.pieceVerifiee ?? false, paiementMobileMoney: c.paiement.mode === 'au_comptoir' ? c.paiement.reference : null, controle, porteurNomme: a('porteur_nomme') }, gainRelais: gerant ? P.gainColis[c.classe] : null })
      else if (type === 'encaissement' && j.action === 'especes_rendues') {
        const m = /−(\d+) F/.exec(j.detail ?? '')
        ops.push({ ...base, id: `${c.id}-${k}`, reference: c.groupe, especes: gerant && m ? -Number(m[1]) : null, detail: { especesRendues: true } })
      } else if (type === 'encaissement')
        ops.push({ ...base, id: `${c.id}-${k}`, reference: c.groupe, especes: gerant ? (groupes[c.groupe]?.encaissee?.montant ?? null) : null, detail: { especesSignees: a('especes_signees') } })
      else if (type === 'retour')
        ops.push({ ...base, id: `${c.id}-${k}`, reference: c.retour?.reference ?? j.detail ?? c.id, emplacement: c.emplacement, photos: photosDe(c, 'retour'), detail: { motif: c.retour?.motif ?? null, scelle: true, destination: c.retour?.destination ?? null }, gainRelais: gerant ? P.gainColis[c.classe] : null })
      else if (type === 'constat')
        ops.push({ ...base, id: `${c.id}-${k}`, reference: c.id, emplacement: c.emplacement, photos: photosDe(c, 'constat') + photosDe(c, 'deballage'), detail: { motif: j.detail, dossier: c.constat } })
      else ops.push({ ...base, id: `${c.id}-${k}`, reference: c.id, detail: { deplacement: j.detail } })
    }
  }
  // Constats du relais dont le colis ne porte pas l'écriture (jeu d'essai, colis déjà parti) : lus dans les dossiers.
  for (const d of etatIncidents.lire().dossiers)
    if (d.origine === 'relais' && d.par.type === 'membre' && !ops.some((o) => o.type === 'constat' && o.colis.includes(d.colis)))
      ops.push({ id: d.id, le: d.ouvertA, type: 'constat', reference: d.colis, colis: [d.colis], par: d.par, photos: d.photos.length, emplacement: null, detail: { motif: d.motif, dossier: d.id }, especes: null, gainRelais: null })
  for (const f of await demoFermeture.fermetures())
    if (f.statut !== 'annulee')
      ops.push({ id: f.id, le: f.declareeA, type: 'fermeture', reference: f.id, colis: [], par: { type: 'membre', nom: f.declareePar, membreId: null }, photos: f.justificatif ? 1 : 0, emplacement: null, detail: { fermeture: { du: f.du, au: f.au, motif: f.motif } }, especes: null, gainRelais: null })
  return ops.sort((a, b) => b.le - a.le)
}

const depuis = (f: FiltresHistorique) => {
  const t = maintenant()
  if (f.recherche?.trim()) return jourDe(t - REGLES.rechercheJ * JOUR)
  return f.periode === 'aujourdhui' ? jourDe(t) : jourDe(t - ((f.periode === 'semaine' ? 7 : 30) - 1) * JOUR)
}
const norme = (s: string) => s.trim().toUpperCase().replace(/\s+/g, '')
const trouve = (o: Operation, q: string) =>
  !q || [o.reference, ...o.colis, ...o.colis.map((c) => c.replace(/-\d+$/, '')), o.detail.lot, o.detail.collecte, o.detail.dossier].some((x) => !!x && norme(x).includes(q))

async function filtrer(f: FiltresHistorique): Promise<Historique> {
  const q = norme(f.recherche ?? '')
  const d = depuis(f)
  const periode = (await operations()).filter((o) => jourDe(o.le) >= d && trouve(o, q))
  const n = (t: TypeOperation) => periode.filter((o) => o.type === t)
  const exact = q ? (periode.flatMap((o) => o.colis).find((c) => c === q) ?? null) : null
  return {
    operations: f.type ? periode.filter((o) => FILTRES[f.type!].includes(o.type)) : periode,
    compteurs: { recus: n('reception').reduce((x, o) => x + o.colis.length, 0), remis: n('remise').length, retours: n('retour').length, constats: n('constat').length },
    depuis: d,
    colisExact: exact,
  }
}

const cellule = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v)
  return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

export const demoHistorique: DomaineHistorique = {
  historique: async (f) => repondre(await filtrer(f)),
  async exporter(f) {
    if (membreActuel()?.role !== 'proprietaire') return { ok: false, raison: 'droit_refuse' }
    const h = await filtrer(f)
    if (!h.operations.length) return { ok: false, raison: 'vide' }
    const lignes = h.operations.map((o) => [new Date(o.le).toISOString(), o.type, o.reference, o.colis.join(' '), o.par.nom ?? '', o.photos, o.emplacement ?? '', o.especes ?? '', o.gainRelais ?? ''].map(cellule).join(';'))
    const contenu = ['date;type;reference;colis;membre;photos;emplacement;especes_garde;part_relais', ...lignes].join('\n')
    return { ok: true, nom: `historique-relais-${f.recherche?.trim() ? 'recherche' : f.periode}-${jourDe(maintenant())}.csv`, contenu }
  },
}
