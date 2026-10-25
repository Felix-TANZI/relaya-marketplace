// DONNÉES DE DÉMONSTRATION — domaine « activite » : compteurs calculés sur les missions validées de l'historique et sur
// les arrêts faits aujourd'hui (mêmes chiffres que l'historique et la clôture). Yafé Express affiche un compteur
// (réglage par défaut, I-04) ; son tarif par mission, s'il choisit de l'afficher, est une donnée de l'entreprise.
import { ajouterJours, jourDe, jourSemaine } from '../calculs/temps'
import type { Activite, DomaineActivite, LigneMission, Periode, ReleveSemaine, Releves, TypeMission } from '../donnees/domaines/activite'
import { PAQUETS, missionsValidees } from './historique'
import { maintenant } from './horloge'
import { faitsDuJour } from './journee'
import { scenario } from './scenario'
import { magasin, repondre } from './stockage'

export const etatActivite = magasin('activite', () => ({
  // Situations d'un départ (?demo=preavis, depart_clos) : Yafé Express affiche son tarif, le dernier versement se chiffre.
  affichage: (scenario() === 'preavis' || scenario() === 'depart_clos' ? 'tarif' : 'compteur') as Activite['affichage'],
  // Tarif par mission de Yafé Express (information entre l'entreprise et son livreur, ENT-P06R-02).
  tarifs: { ramassage: 500, depot: 300, domicile: 1000, retour: 500 } as Record<TypeMission, number>,
}))

const TYPES: TypeMission[] = ['ramassage', 'depot', 'domicile', 'retour']

function activite(periode: Periode): Activite {
  const t = maintenant()
  const a = jourDe(t)
  const de = periode === 'jour' ? a : periode === 'semaine' ? ajouterJours(a, -6) : a.slice(0, 8) + '01'
  const e = etatActivite.lire()
  const ps = PAQUETS.filter((p) => p.jour >= de && p.jour <= a)
  const auj = faitsDuJour()
  const n: Record<TypeMission, { nombre: number; colis: number }> = { ramassage: { nombre: 0, colis: 0 }, depot: { nombre: 0, colis: 0 }, domicile: { nombre: 0, colis: 0 }, retour: { nombre: 0, colis: 0 } }
  for (const p of ps) {
    const revue = p.dossier?.etat === 'en_cours'
    n.ramassage.nombre += p.ramassages
    n.ramassage.colis += p.nature === 'retour' ? 0 : p.colis
    if (!revue) {
      n.depot.nombre += p.depots
      n.depot.colis += p.nature === 'relais' ? p.colis : 0
    }
    n.domicile.nombre += p.domiciles
    n.domicile.colis += p.domiciles
    n.retour.nombre += p.retours
    n.retour.colis += p.retours ? p.colis : 0
  }
  for (const x of auj.faits) {
    const ty: TypeMission = x.type === 'ramassage' ? 'ramassage' : x.type === 'relais' ? 'depot' : x.type === 'domicile' ? 'domicile' : 'retour'
    n[ty].nombre += 1
    n[ty].colis += x.colis
  }
  const tarif = e.affichage === 'tarif'
  const missions: LigneMission[] = TYPES.map((ty) => ({ type: ty, nombre: n[ty].nombre, colis: n[ty].colis, tarif: tarif ? e.tarifs[ty] : null, gain: tarif ? e.tarifs[ty] * n[ty].nombre : null }))
  const parJour: Activite['parJour'] = []
  if (periode === 'semaine')
    for (let j = de; j <= a; j = ajouterJours(j, 1)) {
      const pj = PAQUETS.filter((p) => p.jour === j)
      parJour.push({
        jour: j,
        missions: pj.reduce((s, p) => s + missionsValidees(p), 0) + (j === a ? auj.faits.length : 0),
        colis: pj.reduce((s, p) => s + (p.nature === 'retour' ? 0 : p.colis), 0) + (j === a ? auj.faits.filter((x) => x.type === 'ramassage').reduce((s, x) => s + x.colis, 0) : 0),
        km: Math.round((pj.reduce((s, p) => s + p.km, 0) + (j === a ? auj.km : 0)) * 10) / 10,
      })
    }
  return {
    periode,
    de,
    a,
    calculeA: t,
    payePar: 'Yafé Express',
    affichage: e.affichage,
    missions,
    totalMissions: missions.reduce((s, m) => s + m.nombre, 0),
    colis: { ramasses: n.ramassage.colis, deposes: n.depot.colis, remis: n.domicile.colis },
    distanceKm: Math.round((ps.reduce((s, p) => s + p.km, 0) + auj.km) * 10) / 10,
    gains: tarif ? missions.reduce((s, m) => s + (m.gain ?? 0), 0) : null,
    parJour,
    enRevue: ps.filter((p) => p.dossier?.etat === 'en_cours').map((p) => ({ mission: p.id, motif: p.dossier!.motif, decisionAttendue: jourDe(p.dossier!.reponseEntrepriseAvant + 24 * 3600_000) })),
    enCours: auj.restants > 0 && auj.paquetId ? { paquetId: auj.paquetId, arretsFaits: auj.faits.length, arretsTotal: auj.total } : null,
  }
}

/** Relevés de la semaine en cours et des 7 précédentes, du samedi au vendredi (mêmes règles que les compteurs). */
function releves(): Releves {
  const t = maintenant()
  const aujourdhui = jourDe(t)
  const e = etatActivite.lire()
  const tarif = e.affichage === 'tarif'
  const auj = faitsDuJour()
  // Vendredi de la semaine en cours (jourSemaine : lundi 0 … vendredi 4, samedi 5).
  const vendredi = ajouterJours(aujourdhui, (4 - jourSemaine(aujourdhui) + 7) % 7)
  const semaines: ReleveSemaine[] = []
  for (let k = 0; k < 8; k++) {
    const a = ajouterJours(vendredi, -7 * k)
    const de = ajouterJours(a, -6)
    const ps = PAQUETS.filter((p) => p.jour >= de && p.jour <= a)
    const n: Record<TypeMission, { nombre: number; colis: number }> = { ramassage: { nombre: 0, colis: 0 }, depot: { nombre: 0, colis: 0 }, domicile: { nombre: 0, colis: 0 }, retour: { nombre: 0, colis: 0 } }
    for (const p of ps) {
      const revue = p.dossier?.etat === 'en_cours'
      n.ramassage.nombre += p.ramassages
      n.ramassage.colis += p.nature === 'retour' ? 0 : p.colis
      if (!revue) {
        n.depot.nombre += p.depots
        n.depot.colis += p.nature === 'relais' ? p.colis : 0
      }
      n.domicile.nombre += p.domiciles
      n.domicile.colis += p.domiciles
      n.retour.nombre += p.retours
      n.retour.colis += p.retours ? p.colis : 0
    }
    if (aujourdhui >= de && aujourdhui <= a)
      for (const x of auj.faits) {
        const ty: TypeMission = x.type === 'ramassage' ? 'ramassage' : x.type === 'relais' ? 'depot' : x.type === 'domicile' ? 'domicile' : 'retour'
        n[ty].nombre += 1
        n[ty].colis += x.colis
      }
    const missions: LigneMission[] = TYPES.map((ty) => ({ type: ty, nombre: n[ty].nombre, colis: n[ty].colis, tarif: tarif ? e.tarifs[ty] : null, gain: tarif ? e.tarifs[ty] * n[ty].nombre : null }))
    semaines.push({
      de,
      a,
      enCours: k === 0,
      missions,
      totalMissions: missions.reduce((x, m) => x + m.nombre, 0),
      colis: n.ramassage.colis,
      distanceKm: Math.round((ps.reduce((x, p) => x + p.km, 0) + (k === 0 ? auj.km : 0)) * 10) / 10,
      gains: tarif ? missions.reduce((x, m) => x + (m.gain ?? 0), 0) : null,
      enRevue: ps.filter((p) => p.dossier?.etat === 'en_cours').length,
    })
  }
  return { payePar: 'Yafé Express', affichage: e.affichage, calculeA: t, semaines }
}

/** Relevé de la semaine en cours (missions validées pas encore versées) : base du dernier versement estimé (DP-67). */
export const releveEnCours = () => releves().semaines[0]

export const demoActivite: DomaineActivite = { activite: (p) => repondre(activite(p)), releves: () => repondre(releves()) }
