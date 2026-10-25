// Domaine « pilotage » branché sur le kit : registre versionné (paramètres, propositions à double contrôle, versions)
// et interrupteurs (bascule à quatre yeux), promotions et ventes flash des vendeurs (relecture de la console), prix barrés,
// promotions de la plateforme, photos de la console (backend-kit/apps/console/pilotage_serveur.py).
import type { ClientApi } from '@client/api/client'
import type { Instant } from '../../donnees/communs'
import type { DecisionQuatreYeux } from '../../donnees/domaines/quatreyeux'
import type { ContenuSite, DomainePilotage, InterrupteurVu, ParametreVu, PhotoConsole, PropositionParametre, RaisonBascule, RaisonFlash, RaisonPhoto, RaisonPromotion, RaisonProposition, VersionParametre, VuePromotions, VuePromotionsPlateforme } from '../../donnees/domaines/pilotage'
import { MOMENTS_PAR_DEFAUT, dansLaPeriode, jourDuMois } from '@client/donnees/moments'
import { appels, decision, resultat, seg, type Appels } from '../outils'
import { REGISTRE } from '../../calculs/registre'
import { REGLES_S5, ecrireValeur, formeValeur, simuler, surLePas } from '../../pages/ADM-11/regles-s5'

/** Interrupteur du kit (interrupteurs.liste). */
export interface InterrupteurKit {
  code: string
  libelle: string
  espaces: string[]
  apresLancement: boolean
  branche: boolean
  ouvert: boolean
  parDefaut: boolean
  alerte: string | null
  derniereBascule: { le: Instant; ouvert: boolean; decision: string } | null
  /** Paramètres liés et leur statut au registre (un « À trancher » bloque l'ouverture). */
  parametres?: { code: string; statut: string }[]
  bloque?: boolean
  registreSite?: string | null
  historique?: { le: Instant; ouvert: boolean; par: string; second: string | null; motif: string }[]
}

export async function interrupteursVus(a: Appels): Promise<InterrupteurVu[]> {
  const [liste, attente] = await Promise.all([a.get<InterrupteurKit[]>('/interrupteurs'), a.get<DecisionQuatreYeux[]>('/vues/quatre-yeux', { query: { vue: 'attente' } }).catch(() => [] as DecisionQuatreYeux[])])
  return liste.map((x) => {
    const d = attente.find((q) => q.action === 'interrupteur' && q.objet === `interrupteur:${x.code}`)
    return {
      code: x.code,
      libelle: x.libelle,
      apresLancement: x.apresLancement,
      ouvert: x.ouvert,
      registreSite: x.registreSite ?? null,
      branche: x.branche ? x.espaces : [],
      parametres: x.parametres ?? [],
      bloque: x.bloque ?? false,
      alerte: x.alerte === 'apres_lancement_ouvert' ? 'après lancement ouvert' : x.alerte === 'non_branche_ouvert' ? 'ouvert sans être branché' : null,
      demande: d ? { id: d.id, ouvrir: !x.ouvert, par: d.premier.agent, le: d.premier.le, motif: d.motif } : null,
      historique: x.historique ?? (x.derniereBascule ? [{ le: x.derniereBascule.le, ouvert: x.derniereBascule.ouvert, par: x.derniereBascule.decision, second: null, motif: '' }] : []),
    }
  })
}

const raisonProposition = (c: string): RaisonProposition =>
  c === 'motif_court' ? 'texte' : c === 'parametre_invalide' ? 'bloquee' : c === 'inconnu' || c === 'not_found' ? 'inconnu' : c === 'state_changed' || c === 'deja_soumise' ? 'deja_soumise' : c === 'pas_demandeur' ? 'pas_demandeur' : c === 'proposition_en_cours' ? 'deja_ouverte' : 'bloquee'

/** Simulation d'une proposition (règles de la page Paramétrage, regles-s5.ts : cas types, contrôles) : la valeur est
 * relue par les moteurs du kit à la création (422 parametre_invalide) ; la simulation éclaire la décision. */
function avecSimulation(p: PropositionParametre, l: ParametreVu | undefined): PropositionParametre {
  if (!l) return p
  const forme = formeValeur(p.avant, l.unite)
  if (forme.genre === 'texte') return p
  const simulation = simuler({ code: p.code, forme, apres: p.apresN, dateEffet: p.dateEffet, motif: p.motif, reference: p.reference, statut: l.statut, maintenant: p.par.le }, REGLES_S5, Number(REGISTRE['PLAFOND-RELAIS-S']?.valeur ?? NaN) || null)
  return { ...p, simulation, etat: p.etat === 'simulee' && simulation.bloquee ? 'bloquee' : p.etat }
}

const RAISONS_FLASH: readonly RaisonFlash[] = ['motif_court', 'controle', 'etat', 'ferme', 'inconnu', 'non_simulee']
const RAISONS_PROMO: readonly RaisonPromotion[] = ['motif_court', 'titre', 'dates', 'remise', 'cible', 'etat', 'inconnu']
const RAISONS_PHOTO: readonly RaisonPhoto[] = ['motif_court', 'photo', 'sans_effet', 'inconnu']
const parmi =
  <R extends string>(l: readonly R[], defaut: R) =>
  (c: string): R =>
    (l as readonly string[]).includes(c) ? (c as R) : defaut

export function domainePilotage(api: ClientApi): DomainePilotage {
  const a = appels(api, 'pilotage')
  const ok = () => ({})
  const flash = (id: string, geste: string, motif?: string) =>
    resultat(a.post<{ ok: true }>(`/vues/promotions/flash/${seg(id)}/${geste}`, motif === undefined ? {} : { motif }, { idempotence: true }).then(ok), parmi(RAISONS_FLASH, 'etat'))
  const promo = (id: string, geste: string, motif: string) =>
    resultat(a.post<{ ok: true }>(`/vues/promotions-plateforme/${seg(id)}/${geste}`, { motif }, { idempotence: true }).then(ok), parmi(RAISONS_PROMO, 'etat'))
  async function propositions(): Promise<PropositionParametre[]> {
    const [ps, params] = await Promise.all([a.get<PropositionParametre[]>('/vues/propositions'), a.get<ParametreVu[]>('/vues/parametres')])
    const par = new Map(params.map((x) => [x.code, x]))
    return ps.map((p) => avecSimulation(p, par.get(p.code)))
  }
  return {
    parametres: () => a.get<ParametreVu[]>('/vues/parametres'),
    propositions,
    versions: (code) => a.get<VersionParametre[]>('/vues/versions', { query: { code } }),
    async preparer(d) {
      const p = (await a.get<ParametreVu[]>('/vues/parametres')).find((x) => x.code === d.code)
      if (!p) return { ok: false, raison: 'inconnu' }
      const forme = formeValeur(p.valeur, p.unite)
      if (forme.genre === 'texte') return { ok: false, raison: 'texte' }
      if (!surLePas(forme, d.apres) || d.apres === forme.n) return { ok: false, raison: 'pas' }
      return resultat(
        a
          .post<{ id: number }>(`/parametres/${seg(d.code)}/propositions`, { valeur: ecrireValeur(forme, d.apres), motif: d.motif, effetLe: d.dateEffet, brouillon: true, reference: d.reference }, { idempotence: true })
          .then((x) => ({ id: String(x.id) })),
        raisonProposition,
      )
    },
    async soumettre(id) {
      const p = (await propositions()).find((x) => x.id === id)
      if (!p) return { ok: false, raison: 'inconnu' }
      if (p.etat === 'bloquee') return { ok: false, raison: 'bloquee' }
      return resultat(a.post<object>(`/propositions/${seg(id)}/soumettre`, {}, { idempotence: true }).then(() => ({ etat: 'a_contresigner' as const })), raisonProposition)
    },
    retirer: (id) => resultat(a.post<object>(`/propositions/${seg(id)}/retirer`, {}, { idempotence: true }).then(() => ({})), raisonProposition),
    promotions: () => a.get<VuePromotions>('/vues/promotions'),
    simulerFlash: (id) => flash(id, 'simuler'),
    programmerFlash: (id) => flash(id, 'programmer'),
    annulerFlash: (id, motif) => flash(id, 'annuler', motif),
    arreterFlash: (id, motif) => flash(id, 'arreter', motif),
    retirerRabais: (id, motif) => resultat(a.post<{ ok: true }>(`/vues/promotions/rabais/${seg(id)}/retirer`, { motif }, { idempotence: true }).then(ok), parmi(RAISONS_FLASH, 'etat')),
    promotionsPlateforme: () => a.get<VuePromotionsPlateforme>('/vues/promotions-plateforme'),
    creerPromotion: (d, motif) => resultat(a.post<{ ok: true; id: string }>('/vues/promotions-plateforme', { ...d, motif }, { idempotence: true }).then((x) => ({ id: x.id })), parmi(RAISONS_PROMO, 'inconnu')),
    lancerPromotion: (id, motif) => promo(id, 'lancer', motif),
    arreterPromotion: (id, motif) => promo(id, 'arreter', motif),
    photos: () => a.get<PhotoConsole[]>('/photos'),
    remplacerPhoto: (d, motif) => resultat(a.post<{ ok: true }>('/photos', { ...d, motif }, { idempotence: true }).then(ok), parmi(RAISONS_PHOTO, 'inconnu')),
    retirerPhoto: (cible, id, motif) => resultat(a.post<{ ok: true }>(`/photos/${seg(cible)}/${seg(id)}/retirer`, { motif }, { idempotence: true }).then(ok), parmi(RAISONS_PHOTO, 'inconnu')),
    // Contenu du site : le kit garde les réglages publiés ; titres et accroches des moments viennent du site (moments.ts).
    async contenuSite() {
      const v = await a.get<Omit<ContenuSite, 'moments'> & { moments: { id: string; actif: boolean; du: string; au: string }[] }>('/contenu-site')
      const jour = jourDuMois(Date.now())
      return {
        ...v,
        moments: MOMENTS_PAR_DEFAUT.map((m) => {
          const x = (v.moments ?? []).find((y) => y.id === m.id) ?? { actif: m.actif, du: m.du, au: m.au }
          return { id: m.id, titre: m.titre, accroche: m.accroche, du: x.du, au: x.au, actif: x.actif, enCours: x.actif && dansLaPeriode(x, jour) }
        }),
      }
    },
    publierContenu: (c, motif) => resultat(a.post<{ version: number }>('/contenu-site', { ...c, motif }, { idempotence: true }), (x) => x as 'motif_court' | 'dates' | 'moments_reserves'),
    modules: () => interrupteursVus(a),
    interrupteurs: () => interrupteursVus(a),
    async demanderBascule(code, ouvrir, motif) {
      const r = await decision<RaisonBascule>(a, 'interrupteur', { code, ouvert: ouvrir }, motif, [], (c) => (c === 'motif_court' ? 'motif_court' : c === 'interrupteur_inconnu' ? 'inconnu' : c === 'module_bloque' ? 'module_bloque' : 'sans_effet'))
      return r.ok ? { ok: true, id: r.id } : r
    },
  }
}
