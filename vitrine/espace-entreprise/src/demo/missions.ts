// DONNÉES DE DÉMONSTRATION — domaine « missions » (ENT-P13) : une mission par paquet accepté, lue dans les paquets
// (une seule vérité, DED-01) ; onglet selon la machine à états (ENT-02-R23) ; marge = heure limite − heure estimée
// (ENT-02-R56) ; livreur hors connexion : dernier état connu (ENT-RG-R103) ; mission close : montant (propriétaire,
// comptable) et vendredi de versement (prestations validées au plus tard le jeudi 23 h 59, ENT-02-R18). Appel masqué
// (DP-61, DED-14) : ligne ouverte de l'affectation à la clôture, numéro jamais montré, journal sans contenu.
// missionsDemo garde la forme { missions } que lisent les compteurs de la coque et le tableau de bord.
import type { Appel, DomaineMissions, Mission, MomentMission, OngletMissions } from '../donnees/domaines/missions'
import type { Instant } from '../donnees/communs'
import { HEURE, JOUR, MINUTE } from '../calculs/temps'
import { PARAMETRES } from '../calculs/registre'
import { marge } from '../calculs/livraison/regles-ecrans'
import { maintenant } from './horloge'
import { exiger, montantsVisibles } from './acces'
import { LIEUX, idLivreur, livreurDe, nomUtilisateur, paquetsDemo, remuneration, type PaquetDemo } from './paquets'
import { idMission } from './carte'
import { repondre } from './stockage'

const ONGLET: Partial<Record<PaquetDemo['statut'], OngletMissions>> = { accepte: 'a_affecter', affecte: 'affectees', en_cours: 'en_cours', incident: 'incidents', depose: 'deposees', clos: 'closes' }
const ONGLETS: OngletMissions[] = ['a_affecter', 'affectees', 'en_cours', 'deposees', 'closes', 'incidents']
const LIGNE_OUVERTE = ['affecte', 'en_cours', 'incident', 'depose']

/** Vendredi 12 h (Yaoundé) qui paie une prestation validée à cet instant (arrêté le jeudi 23 h 59). */
export function vendrediDe(t: Instant): Instant {
  const local = new Date(t + HEURE) // heure de Yaoundé lue en UTC
  const jour = local.getUTCDay() // 0 dimanche … 5 vendredi
  const minuit = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - HEURE
  const jusqua = (5 - jour + 7) % 7 || 7 // vendredi suivant ; un vendredi : le suivant (arrêté jeudi)
  return minuit + jusqua * JOUR + 12 * HEURE
}

function moment(p: PaquetDemo): { moment: MomentMission; lieu: string | null } {
  const suivant = p.arrets.find((a) => !a.fait)
  const l = suivant ? LIEUX[suivant.lieu] : null
  const nom = l ? l.nom || l.quartier : null
  switch (p.statut) {
    case 'accepte':
      return { moment: 'a_affecter', lieu: null }
    case 'affecte':
      return { moment: 'non_parti', lieu: nom }
    case 'incident':
      return { moment: 'arret', lieu: nom }
    case 'depose':
      return { moment: 'depose', lieu: LIEUX[p.arrets[p.arrets.length - 1].lieu].nom || LIEUX[p.arrets[p.arrets.length - 1].lieu].quartier }
    case 'clos':
      return { moment: 'clos', lieu: null }
    default:
      return { moment: !l ? 'depose' : l.type === 'boutique' ? 'vers_boutique' : l.type === 'relais' ? 'vers_relais' : 'vers_client', lieu: nom }
  }
}

export function vueMission(p: PaquetDemo, t = maintenant()): Mission | null {
  const onglet = ONGLET[p.statut]
  if (!onglet) return null
  const m = moment(p)
  const actif = p.statut === 'en_cours' || p.statut === 'incident'
  const garde = actif ? p.colis.filter((c) => p.arrets[c.arret].fait).length : 0
  return {
    id: idMission(p.id),
    paquetId: p.id,
    genre: p.genre,
    zone: p.zone,
    onglet,
    livreur: livreurDe(p, t),
    etape: p.arrets.filter((a) => a.fait).length,
    etapes: p.arrets.length,
    colisSousGarde: garde,
    colisTotal: p.colis.length,
    moment: m.moment,
    lieu: m.lieu,
    heureLimite: p.heureLimite,
    eta: actif ? p.eta : null,
    margeMin: actif && p.eta ? marge(p.heureLimite, p.eta) : null,
    creneau: p.creneau,
    horsConnexionDepuis: p.horsConnexionDepuis,
    misAJour: p.horsConnexionDepuis ?? t,
    incidentId: p.statut === 'incident' ? p.incidentId : null,
    montant: (p.statut === 'clos' || p.statut === 'depose') && montantsVisibles() ? remuneration(p) : null,
    versementLe: p.closLe ? vendrediDe(p.closLe) : null,
    closLe: p.closLe,
    itineraire: p.arrets.map((a) => {
      const l = LIEUX[a.lieu]
      return { lat: l.lat, lng: l.lng, type: l.type === 'stockage' ? 'relais' : l.type, nom: l.nom || l.quartier, fait: !!a.fait }
    }),
  }
}

const toutes = (t = maintenant()) =>
  paquetsDemo
    .lire()
    .paquets.map((p) => vueMission(p, t))
    .filter((m): m is Mission => !!m)

/** Forme lue par les compteurs de la coque et le tableau de bord (compteurs.ts, tableau.ts). */
export const missionsDemo = {
  lire: () => ({ missions: toutes() }),
}

const paquetDe = (missionId: string) => paquetsDemo.lire().paquets.find((p) => idMission(p.id) === missionId)
const ordre = (o: OngletMissions) => (a: Mission, b: Mission) =>
  o === 'closes' ? (b.closLe ?? 0) - (a.closLe ?? 0) : o === 'en_cours' ? (a.margeMin ?? 1e9) - (b.margeMin ?? 1e9) : a.heureLimite - b.heureLimite

export const demoMissions: DomaineMissions = {
  async liste(onglet) {
    exiger(['proprietaire', 'repartiteur'], 'Missions')
    return repondre(toutes().filter((m) => m.onglet === onglet).sort(ordre(onglet)))
  },
  async mission(id) {
    exiger(['proprietaire', 'repartiteur'], 'Missions')
    const p = paquetDe(id) ?? paquetsDemo.lire().paquets.find((x) => x.id === id)
    return repondre(p ? vueMission(p) : null)
  },
  async compteurs() {
    exiger(['proprietaire', 'repartiteur'], 'Missions')
    const ms = toutes()
    return repondre(Object.fromEntries(ONGLETS.map((o) => [o, ms.filter((m) => m.onglet === o).length])) as Record<OngletMissions, number>)
  },
  async appeler(missionId, canal) {
    exiger(['proprietaire', 'repartiteur'], 'Appeler un livreur')
    const p = paquetDe(missionId)
    if (!p || !idLivreur(p) || !LIGNE_OUVERTE.includes(p.statut)) return repondre({ ok: false as const, raison: 'ligne_fermee' as const })
    const appel: Appel = { id: 'AP-' + Math.random().toString(36).slice(2, 8), missionId, livreur: livreurDe(p)!.nom, debut: maintenant(), dureeS: canal === 'sms_masque' ? 0 : null, canal, ligne: canal === 'numero_masque' ? '+237 222 20 41 ' + String(10 + Math.floor(Math.random() * 89)) : null }
    paquetsDemo.ecrire((s) => void s.paquets.find((x) => x.id === p.id)!.appels.unshift(appel))
    return repondre({ ok: true as const, appel })
  },
  async raccrocher(appelId) {
    const t = maintenant()
    paquetsDemo.ecrire((s) => {
      for (const p of s.paquets) for (const a of p.appels) if (a.id === appelId && a.dureeS === null) a.dureeS = Math.max(1, Math.round((t - a.debut) / 1000))
    })
  },
  async noterAppel(appelId, note) {
    paquetsDemo.ecrire((s) => {
      for (const p of s.paquets) for (const a of p.appels) if (a.id === appelId) a.note = note.trim().slice(0, 500)
    })
  },
  async appels(missionId) {
    return repondre(paquetDe(missionId)?.appels ?? [])
  },
  async relancer(missionId, sujet) {
    exiger(['proprietaire', 'repartiteur'], 'Relancer un livreur')
    const t = maintenant()
    const par = nomUtilisateur()
    // Une relance par sujet et par intervalle (ENT-RELANCE-MIN) : sinon l'heure de la précédente.
    const avant = paquetDe(missionId)?.relances.find((r) => r.sujet === sujet && r.le > t - PARAMETRES.saisies.relanceMin * MINUTE)
    if (avant) return repondre({ ok: false as const, raison: 'trop_tot' as const, envoyeLe: avant.le })
    paquetsDemo.ecrire((s) => {
      const p = s.paquets.find((x) => idMission(x.id) === missionId)
      if (!p) return
      p.relances.push({ le: t, sujet })
      p.journal.push({ le: t, quoi: 'relance_' + sujet, par })
    })
    return repondre({ ok: true as const, envoyeLe: t })
  },
}

