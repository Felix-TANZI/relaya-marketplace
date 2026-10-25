// Domaine « véhicules » (ENT-P08) : type, plaque unique dans tout le système (409 PLATE_DUPLICATE, signalée à la
// console : ENT-P08R-05), classes transportables suivant le type (classes_par_type_vehicule, ENT-P08R-01 : jamais de
// XL sur une moto), capacité, livreur habituel, assurance et carte grise suivies avec leur date (rappels 30, 7, 1
// jours ; expiration = retrait de l'affectation le jour même : ENT-P08R-04), photo du véhicule avec la plaque
// obligatoire (ENT-RG-R77), indisponible en cas de panne (ENT-RG-R75). Assurance exigée de tout véhicule motorisé
// (QUESTIONS S-06). Droits : propriétaire et répartiteur (ENT-02-R62).
// API : GET · POST · PATCH /api/company/vehicles (multipart), …/{id}/documents/{kind}.
import type { ClasseColis, Instant, Resultat } from '../communs'

export interface Vehicule {
  id: string
  type: 'moto' | 'tricycle' | 'voiture' | 'camionnette' | 'velo'
  plaque: string
  classes: ClasseColis[]
  livreurId: string | null
  assuranceJusqua: Instant | null
  statut: 'actif' | 'a_verifier' | 'hors_service' | 'expire'
  capacite?: number // colis par tournée
  carteGrise?: { statut: 'valide' | 'en_revue' | 'manquante'; le: Instant | null }
  photos?: { vehicule: Instant | null; plaque: Instant | null }
  motifIndisponible?: string | null
  /** Proposé à l'affectation : actif, assurance valide, photo de plaque, pas en panne. */
  proposable?: boolean
}

export interface DeclarationVehicule {
  type: 'moto' | 'tricycle' | 'voiture' | 'camionnette'
  plaque: string
  capacite: number
  classes: ClasseColis[]
  livreurId: string | null
  assuranceJusqua: Instant | null
  photoPlaque: boolean // photo du véhicule avec la plaque lisible jointe
  carteGrise: boolean
}
export type RefusVehicule = 'plaque' | 'doublon' | 'photo' | 'assurance' | 'classes' | 'capacite'

export interface DomaineVehicules {
  liste(): Promise<Vehicule[]>
  declarer(d: DeclarationVehicule): Promise<Resultat<{ vehicule: Vehicule }, RefusVehicule>>
  rattacher(id: string, livreurId: string | null): Promise<Resultat<object, 'statut'>>
  mettreAJour(id: string, document: 'assurance' | 'carte_grise', jusqua: Instant | null): Promise<Resultat<object, 'date'>>
  indisponible(id: string, panne: boolean, motif?: string): Promise<Resultat<object, 'motif'>>
}
