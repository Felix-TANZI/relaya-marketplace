// DONNÉES DE DÉMONSTRATION — domaine « véhicules » (ENT-P08) : un véhicule par livreur du jeu d'essai, plus une
// camionnette d'agence sans livreur habituel. Classes suivant le type (PARAMETRES_FLOTTE.classes), assurance suivie
// (alerte à alerteAssuranceJours) : la moto d'Inès a une assurance expirée (retirée de l'affectation), la voiture de
// Hugo expire bientôt. Plaque unique dans le système : CE 900 ZZ est déjà déclarée par une autre entreprise (409,
// signalée à la console). Rôles : propriétaire et répartiteur (exiger).
import type { DomaineVehicules, Vehicule } from '../donnees/domaines/vehicules'
import type { ClasseColis } from '../donnees/communs'
import { PARAMETRES_FLOTTE, ORDRE_CLASSES } from '../calculs/flotte'
import { JOUR, jourDe } from '../calculs/temps'
import { maintenant } from './horloge'
import { LIVREURS, T } from './jeu-essai'
import { exiger } from './acces'
import { signer } from './journal'
import { magasin, repondre } from './stockage'

const P = PARAMETRES_FLOTTE
/** Plaques déjà déclarées ailleurs dans le système (autre entreprise) : la console les voit, l'entreprise non. */
const PLAQUES_AILLEURS = ['CE900ZZ']
export const normerPlaque = (p: string) => p.toUpperCase().replace(/[\s-]/g, '')
const FORME_PLAQUE = /^[A-Z]{2}\d{3,4}[A-Z]{1,2}$/

const PLAQUES = ['CE 412 AB', 'CE 413 AC', 'LT 214 BD', 'CE 415 AF', 'CE 416 CK', 'CE 917 LT', 'CE 482 KM', 'CE 433 DA', 'CE 441 DB', 'LT 452 DC', 'CE 467 DD', 'CE 471 DE', 'CE 488 DF', 'CE 492 DG', 'CE 503 DH', 'CE 511 DJ', 'CE 518 DK', 'LT 526 DL', 'CE 534 DM', 'CE 547 DN', 'CE 552 DP']
// Jours restants (Inès : expirée avant-hier ; Hugo et Kevin : bientôt).
const ASSURANCE = [180, 95, 60, -2, 12, 220, 152, 140, 210, 88, 175, 64, 230, 120, 9, 199, 260, 115, 300, 310, 290]
const CAPACITE: Record<string, number> = { moto: 8, tricycle: 14, voiture: 12, camionnette: 30 }

export const vehiculesDemo = magasin('vehicules', () => ({
  vehicules: [
    ...LIVREURS.map(
      (l, i): Vehicule => ({
        id: 'v-' + l.id.slice(2),
        type: l.vehicule,
        plaque: PLAQUES[i],
        classes: P.classes[l.vehicule as keyof typeof P.classes] ?? ['S'],
        livreurId: l.id,
        assuranceJusqua: T(0) + ASSURANCE[i] * JOUR,
        statut: 'actif',
        capacite: CAPACITE[l.vehicule],
        carteGrise: { statut: 'valide', le: T(0) - (200 + i * 30) * JOUR },
        photos: { vehicule: T(0) - (20 + i) * JOUR, plaque: T(0) - (20 + i) * JOUR },
        motifIndisponible: null,
      }),
    ),
    { id: 'v-eric', type: 'moto', plaque: 'CE 418 BN', classes: P.classes.moto, livreurId: 'l-eric', assuranceJusqua: T(0) + 75 * JOUR, statut: 'actif', capacite: CAPACITE.moto, carteGrise: { statut: 'valide', le: T(0) - 300 * JOUR }, photos: { vehicule: T(0) - 40 * JOUR, plaque: T(0) - 40 * JOUR }, motifIndisponible: null } as Vehicule,
    { id: 'v-camion', type: 'camionnette', plaque: 'CE 521 WX', classes: P.classes.camionnette, livreurId: null, assuranceJusqua: T(0) + 140 * JOUR, statut: 'actif', capacite: CAPACITE.camionnette, carteGrise: { statut: 'valide', le: T(0) - 400 * JOUR }, photos: { vehicule: T(0) - 18 * JOUR, plaque: T(0) - 18 * JOUR }, motifIndisponible: null } as Vehicule,
  ],
}))

/** Vu par le serveur à la lecture : assurance expirée (tâche de 0 h 00), proposé à l'affectation ou non. */
export function vehiculeVu(v: Vehicule, t = maintenant()): Vehicule {
  const expire = v.statut !== 'hors_service' && v.statut !== 'a_verifier' && v.assuranceJusqua !== null && v.assuranceJusqua < t
  const statut = expire ? 'expire' : v.statut === 'expire' ? 'actif' : v.statut
  return { ...v, statut, proposable: statut === 'actif' && !!v.photos?.plaque && v.carteGrise?.statut === 'valide' }
}
export const vehiculesVus = (): Vehicule[] => vehiculesDemo.lire().vehicules.map((v) => vehiculeVu(v))

const ok = { ok: true as const }
const non = <R extends string>(raison: R) => repondre({ ok: false as const, raison })

export const demoVehicules: DomaineVehicules = {
  async liste() {
    return repondre(vehiculesVus())
  },
  async declarer(d) {
    exiger(['proprietaire', 'repartiteur'], 'Déclarer un véhicule')
    const plaque = normerPlaque(d.plaque)
    if (!FORME_PLAQUE.test(plaque)) return non('plaque')
    if (PLAQUES_AILLEURS.includes(plaque) || vehiculesDemo.lire().vehicules.some((v) => normerPlaque(v.plaque) === plaque)) {
      signer('vehicle.plate_duplicate', 'vehicule:' + plaque, 'plaque', '', plaque)
      return non('doublon')
    }
    if (!d.photoPlaque) return non('photo')
    if (d.assuranceJusqua === null || d.assuranceJusqua <= maintenant()) return non('assurance')
    const permises = P.classes[d.type]
    if (!d.classes.length || d.classes.some((c) => !permises.includes(c))) return non('classes')
    if (!Number.isInteger(d.capacite) || d.capacite < 1) return non('capacite')
    const lisible = plaque.replace(/^([A-Z]{2})(\d+)([A-Z]+)$/, '$1 $2 $3')
    const t = maintenant()
    const vehicule: Vehicule = {
      id: 'v-' + Math.random().toString(36).slice(2, 8),
      type: d.type,
      plaque: lisible,
      classes: ORDRE_CLASSES.filter((c: ClasseColis) => d.classes.includes(c)),
      livreurId: d.livreurId,
      assuranceJusqua: d.assuranceJusqua,
      statut: 'a_verifier',
      capacite: d.capacite,
      carteGrise: { statut: d.carteGrise ? 'en_revue' : 'manquante', le: null },
      photos: { vehicule: t, plaque: t },
      motifIndisponible: null,
    }
    vehiculesDemo.ecrire((s) => void s.vehicules.push(vehicule))
    signer('vehicle.created', 'vehicule:' + vehicule.id, 'déclaration', '', `${d.type} ${lisible}`)
    return repondre({ ...ok, vehicule: vehiculeVu(vehicule) })
  },
  async rattacher(id, livreurId) {
    exiger(['proprietaire', 'repartiteur'], 'Rattacher un véhicule')
    const v = vehiculesDemo.lire().vehicules.find((x) => x.id === id)
    if (!v) return non('statut')
    vehiculesDemo.ecrire((s) => void (s.vehicules.find((x) => x.id === id)!.livreurId = livreurId))
    signer('vehicle.updated', 'vehicule:' + id, 'livreur habituel', v.livreurId ?? '—', livreurId ?? '—')
    return repondre(ok)
  },
  async mettreAJour(id, document, jusqua) {
    exiger(['proprietaire', 'repartiteur'], 'Mettre à jour un document')
    const t = maintenant()
    if (document === 'assurance' && (jusqua === null || jusqua <= t)) return non('date')
    const v = vehiculesDemo.lire().vehicules.find((x) => x.id === id)!
    vehiculesDemo.ecrire((s) => {
      const x = s.vehicules.find((y) => y.id === id)!
      if (document === 'assurance') {
        x.assuranceJusqua = jusqua
        if (x.statut === 'expire') x.statut = 'actif'
      } else x.carteGrise = { statut: 'valide', le: t }
    })
    signer('vehicle.document_updated', 'vehicule:' + id, document === 'assurance' ? 'assurance' : 'carte grise', document === 'assurance' ? (v.assuranceJusqua ? jourDe(v.assuranceJusqua) : '—') : (v.carteGrise?.statut ?? '—'), document === 'assurance' ? jourDe(jusqua!) : 'valide')
    return repondre(ok)
  },
  async indisponible(id, panne, motif) {
    exiger(['proprietaire', 'repartiteur'], 'Déclarer un véhicule indisponible')
    if (panne && !motif?.trim()) return non('motif')
    vehiculesDemo.ecrire((s) => {
      const x = s.vehicules.find((y) => y.id === id)!
      x.statut = panne ? 'hors_service' : 'actif'
      x.motifIndisponible = panne ? motif!.trim() : null
    })
    signer('vehicle.updated', 'vehicule:' + id, 'disponibilité', panne ? 'disponible' : 'indisponible', panne ? 'indisponible : ' + motif!.trim() : 'disponible')
    return repondre(ok)
  },
}
