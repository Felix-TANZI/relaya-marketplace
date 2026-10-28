// DONNÉES DE DÉMONSTRATION — domaine « tableau » (ENT-P02) : tout est lu dans les autres domaines (aucun compteur
// écrit) ; à faire construit pour le rôle et trié par échéance (ENT-03-R11) : le comptable n'a ni paquet à accepter ni
// affectation (ENT-03-R09) ; les pièces de l'entreprise reviennent au propriétaire, celles des véhicules et des
// livreurs au propriétaire et au répartiteur ; un compte qui ne publie plus (suspendu, en configuration) n'a aucun
// paquet à accepter (ENT-03-R32). « À verser vendredi » absent pour le répartiteur (ENT-P02R-03). Délai tenu sur
// fenetre_delai_tenu jours : null sans paquet clos (jamais « 0 / 0 », ENT-P02R-02). Trust Score : celui du domaine
// « score » (une seule vérité).
import type { DomaineTableau, Tache } from '../donnees/domaines/tableau'
import { PARAMETRES_FLOTTE } from '../calculs/flotte'
import { plafondDe, palierSuivant } from '../calculs/paliers'
import { JOUR } from '../calculs/temps'
import { maintenant } from './horloge'
import { ENTREPRISE } from './jeu-essai'
import { montantsVisibles, roleCourant } from './acces'
import { paquetsDemo, paquetsPublies, remuneration } from './paquets'
import { NOM_GENRE } from '../config/libelles'
import type { GenrePaquet } from '../donnees/domaines/paquets'
import { F } from '@client/i18n/format'
import { incidentsDemo } from './incidents'
import { litigesDemo } from './litiges'
import { missionsDemo } from './missions'
import { zonesVues } from './zones'
import { demoFlotte } from './flotte'
import { demoColis } from './lectures'
import { demoReglements } from './reglements'
import { calculerScore } from './score'
import { lireTrust } from '../calculs/ent07'
import { etatCompte } from './compte'
import { chaineActivation, pieces } from './contrat'
import { prestations } from './prestations'
import { absencesVues, departsVus, livreursDemo } from './livreurs'
import { yaounde } from '../calculs/temps'
import { vehiculesVus } from './vehicules'
import { repondre } from './stockage'

const P = PARAMETRES_FLOTTE

/** « Tournée relais · 6 colis · Z3 · 2 700 F » (rémunération pour qui voit les montants, même texte que le kit). */
const detailPaquet = (genre: GenrePaquet, n: number, zone: string, montant: number | null) =>
  [NOM_GENRE[genre], `${n} colis`, zone, ...(montant !== null ? [`${F(montant)} F`] : [])].join(' · ')

const NOM_PIECE_TACHE: Record<string, string> = { identite: 'pièce d’identité', permis: 'permis de conduire', selfie: 'selfie' }
/** Pièces, assurances et certifications qui expirent dans la fenêtre d'alerte (ENT-03-R12) : une tâche chacune. */
function aRenouveler(t: number, proprio: boolean): Tache[] {
  const taches: Tache[] = []
  if (proprio)
    for (const p of pieces(t).filter((x) => !x.route && x.expireLe !== null && (x.statut === 'expire_bientot' || x.statut === 'expiree')))
      taches.push({ id: 'p-' + p.type, genre: 'piece_expire', titre: p.libelle, detail: p.statut === 'expiree' ? 'expirée' : 'à renouveler', echeance: p.expireLe!, route: 'contrat', params: { t: 'pieces' } })
  for (const v of vehiculesVus().filter((x) => x.assuranceJusqua !== null && x.assuranceJusqua - t <= P.alerteAssuranceJours * JOUR && x.statut !== 'hors_service'))
    taches.push({ id: 'v-' + v.id, genre: 'piece_expire', titre: `Assurance ${v.plaque}`, detail: v.statut === 'expire' ? 'expirée' : 'à renouveler', echeance: v.assuranceJusqua!, route: 'vehicules', params: { id: v.id } })
  for (const l of livreursDemo.lire().livreurs.filter((x) => x.statut !== 'retire' && x.statut !== 'en_activation'))
    for (const p of l.pieces.filter((x) => x.expireLe !== null && x.expireLe - t <= P.alertePieceLivreurJours * JOUR))
      taches.push({ id: `l-${l.id}-${p.type}`, genre: 'piece_expire', titre: `${l.nom} · ${NOM_PIECE_TACHE[p.type]}`, detail: p.expireLe! <= t ? 'expirée' : 'à renouveler', echeance: p.expireLe!, route: 'pieces', params: { id: l.id } })
  // Pièces envoyées par les livreurs, à contrôler par l'entreprise : une tâche par livreur (la plus ancienne d'abord).
  for (const l of livreursDemo.lire().livreurs.filter((x) => x.statut !== 'retire')) {
    const aVoir = l.pieces.filter((p) => p.statut === 'en_revue' && p.envoyeeLe !== null).sort((a, b) => a.envoyeeLe! - b.envoyeeLe!)
    if (aVoir.length) taches.push({ id: `c-${l.id}`, genre: 'piece_a_controler', titre: `${l.nom} · pièces à contrôler`, detail: `${aVoir.length} pièce(s) envoyée(s)`, echeance: aVoir[0].envoyeeLe!, route: 'pieces', params: { id: l.id } })
  }
  return taches
}

const NOM_MOTIF_TACHE: Record<string, string> = { autre_emploi: 'Autre emploi', horaires: 'Horaires', remuneration: 'Rémunération', demenagement: 'Déménagement', sante: 'Santé', personnel: 'Raison personnelle', autre: 'Autre' }
const NOM_MOTIF_ABSENCE: Record<string, string> = { maladie: 'Maladie', deuil_famille: 'Deuil ou famille', panne_moto: 'Panne de moto', demarches: 'Démarches', autre: 'Autre' }
const debutJour = (j: string) => yaounde(Number(j.slice(0, 4)), Number(j.slice(5, 7)), Number(j.slice(8, 10)))
/** Demandes des livreurs (DP-66) : un départ ouvert (préavis en cours ou échu), une absence prévenue pas encore vue.
 * DP-67 : préavis échu et kit pas encore constaté (échéance : fin du délai du constat) ; départ clos dont le vendredi
 * du dernier versement est arrivé, versement pas encore marqué fait (propriétaire : montants). */
function demandesLivreurs(t: number, proprio: boolean): Tache[] {
  const departs = departsVus(t)
  return [
    ...departs
      .filter((d) => d.etat === 'demande')
      .map((d): Tache => ({
        id: 'd-' + d.id,
        genre: d.echu ? 'depart_echu' : 'depart',
        titre: `${d.livreur.nom} · ${d.echu ? 'préavis de départ échu' : 'départ demandé'}`,
        detail: d.echu ? 'L’administrateur BelivaY peut clôturer à votre place' : `${NOM_MOTIF_TACHE[d.motif]}${d.manquantes.length ? '' : ' · prêt à clôturer'}`,
        echeance: d.preavisJusqua,
        route: 'livreur',
        params: { id: d.livreur.id },
      })),
    ...absencesVues(t)
      .filter((a) => a.vueLe === null)
      .map((a): Tache => ({ id: 'ab-' + a.id, genre: 'absence', titre: `${a.livreur.nom} · absence prévenue`, detail: NOM_MOTIF_ABSENCE[a.motif] + (a.imprevu ? ' · imprévu' + (a.apresDebut ? ', après le début du créneau' : '') : ''), echeance: debutJour(a.du), route: 'planning', params: { j: 'semaine' } })),
    ...departs
      .filter((d) => d.etat === 'demande' && d.echu && d.kit.constat === null && !d.kit.echu)
      .map((d): Tache => ({
        id: 'k-' + d.id,
        genre: 'kit_a_constater',
        titre: `${d.livreur.nom} · kit à constater`,
        detail: 'Restitué, ou incomplet avec photo et éléments manquants ; passé le délai, « kit non contesté », sans retenue',
        echeance: d.kit.constatJusqua,
        route: 'livreur',
        params: { id: d.livreur.id },
      })),
    ...(proprio ? departs : [])
      .filter((d) => d.etat === 'close' && d.versementLe !== null && d.versementLe <= t && d.versement.faitLe === null)
      .map((d): Tache => ({
        id: 'vf-' + d.id,
        genre: 'versement_a_faire',
        titre: `${d.livreur.nom} · dernier versement`,
        detail: d.versement.verse !== null ? `${F(d.versement.verse)} F en Mobile Money` : 'Mobile Money, missions validées',
        echeance: d.versementLe!,
        route: 'livreur',
        params: { id: d.livreur.id },
      })),
  ]
}

export const demoTableau: DomaineTableau = {
  async tableau() {
    const t = maintenant()
    const role = roleCourant()
    const compte = etatCompte()
    const comptable = role === 'comptable'
    const aFaire: Tache[] = comptable
      ? []
      : [
          ...(compte.effets.publication ? paquetsPublies() : []).map((p): Tache => ({ id: 't-' + p.id, genre: 'paquet_a_accepter', titre: `Paquet ${p.id}`, detail: detailPaquet(p.genre, p.colis.nombre, p.zone, p.remuneration), echeance: p.accepterAvant, route: 'paquet', params: { id: p.id } })),
          ...paquetsDemo.lire().paquets.filter((p) => compte.effets.publication && p.statut === 'accepte').map((p): Tache => ({ id: 'a-' + p.id, genre: 'paquet_non_affecte', titre: `Paquet ${p.id} à affecter`, detail: detailPaquet(p.genre, p.colis.length, p.zone, montantsVisibles() ? remuneration(p) : null), echeance: p.ramassageAvant ?? p.accepterAvant, route: 'affectation', params: { id: p.id } })),
          ...incidentsDemo.lire().incidents.filter((i) => i.statut === 'a_valider').map((i): Tache => ({ id: 'i-' + i.id, genre: 'incident', titre: `Incident ${i.id}`, detail: i.livreur.nom, echeance: i.decideAvant ?? i.declareLe, route: 'incidents', params: { id: i.id } })),
          ...litigesDemo.lire().litiges.filter((l) => l.etape === 'ouvert').map((l): Tache => ({ id: 'l-' + l.id, genre: 'litige', titre: `Litige ${l.id}`, detail: l.motif, echeance: l.repondreAvant ?? l.ouvertLe, route: 'litiges', params: { id: l.id } })),
          ...aRenouveler(t, role === 'proprietaire'),
          ...demandesLivreurs(t, role === 'proprietaire'),
        ]
    aFaire.sort((a, b) => a.echeance - b.echeance)
    const flotte = await demoFlotte.resume()
    const missions = missionsDemo.lire().missions
    const score = calculerScore(t)
    // Délai tenu sur la fenêtre : paquets clos des livreurs dans la fenêtre glissante.
    const debut = t - P.fenetreDelaiTenuJours * JOUR
    // Une seule vérité (ENT-P25R-03) : les prestations closes de la fenêtre, celles des règlements et du score.
    const clos = prestations()
      .filter((p) => p.statut !== 'non_payee' && p.jour >= debut && p.jour <= t)
      .map((p) => ({ dansLeDelai: !p.minoree }))
    const dansLeDelai = clos.filter((p) => p.dansLeDelai).length
    const guide = compte.etat === 'configuration' ? chaineActivation() : null
    return repondre({
      aFaire,
      indicateurs: {
        missionsEnCours: missions.filter((m) => m.onglet === 'en_cours').length,
        // Compteur des files (lisible par tous les rôles ; la valeur déclarée n'y figure pas, ENT-P15R-03).
        colisSousGarde: (await demoColis.compteurs()).sous_garde,
        delaiTenu7j: clos.length ? Math.round((dansLeDelai / clos.length) * 100) : null,
        litigesOuverts: litigesDemo.lire().litiges.filter((l) => l.etape !== 'decide').length,
        aVerserVendredi: montantsVisibles() ? (await demoReglements.prochain()).aVerser : null,
      },
      palier: { palier: ENTREPRISE.palier, plafond: plafondDe(ENTREPRISE.palier), trustScore: score.score ?? lireTrust().mu, tendance: score.score !== null && score.precedent !== null ? Math.round((score.score - score.precedent) * 10) / 10 : 0, prochain: palierSuivant(ENTREPRISE.palier) },
      zones: zonesVues().map((z) => ({ code: z.code, nom: z.nom, acceptes: z.acceptes, capacite: z.capacite })),
      flotte: { actifs: flotte.actifs, enLigne: flotte.enLigne, enActivation: flotte.enActivation },
      demarrage: guide ? { etape: guide.filter((e) => e.fait).length, total: guide.length } : null,
      guide,
      delaiTenu: clos.length ? { dansLeDelai, clos: clos.length } : null,
      pilote: compte.pilote ? { ...compte.pilote, bilanLe: compte.bilanLe ?? compte.jusqua ?? t } : null,
      lu: t,
    })
  },
}
