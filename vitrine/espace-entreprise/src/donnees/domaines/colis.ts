// Domaine « colis » (ENT-P15) : chaque colis sous la responsabilité de l'entreprise est dans UNE file (RG-R117) :
// à ramasser, sous garde, remis (historique_remis jours) ; un seul responsable à chaque instant (RG-R119) ; garde
// longue (alerte_garde_longue), colis introuvable (alerte_colis_introuvable), aucun colis chez un livreur la nuit
// (point de stockage, DED-26). Valeur déclarée visible du propriétaire et du répartiteur (ENT-P15R-03). Aucune identité
// client (RG-R118, DED-13). API : GET /api/company/parcels?queue=to_pickup|in_custody|delivered&period=.
// DP-63 : chaque colis a un code et un QR UNIQUES (étiquette « BV 24 8137 », liée à une seule commande : ENT-PRV-08),
// scannés à chaque changement de main. Les codes de remise, de dépôt, de retrait ou de livraison ne sortent jamais
// de l'API entreprise (ENT-02-R08) : l'entreprise voit seulement l'heure de validation.
import type { ClasseColis, CodeZone, Francs, Instant, LivreurCourt } from '../communs'

export type FileColis = 'a_ramasser' | 'sous_garde' | 'remis'

export interface Colis {
  etiquette: string // étiquette pré-imprimée attribuée au colis (« BV 24 8137 »)
  posee: boolean // posée et scellée au ramassage (C1) ; sinon prévue
  qr: string // contenu du QR unique du colis (identifiant signé par le serveur)
  paquetId: string
  missionId: string | null
  classe: ClasseColis
  file: FileColis
  livreur: LivreurCourt | null
  boutique: string
  quartier: string
  destination: { type: 'relais' | 'domicile' | 'vendeur'; nom: string | null; zone: CodeZone; quartier: string }
  remisVendeurLe: Instant | null // code de remise validé (heure seulement)
  depuis: Instant // entrée dans la file
  remisLe: Instant | null
  valeurDeclaree: Francs | null
  fragile: boolean
  payableAuRetrait: boolean
  alerte: 'garde_longue' | 'introuvable' | null
}

export interface DomaineColis {
  file(file: FileColis): Promise<Colis[]>
  compteurs(): Promise<Record<FileColis, number>>
  relancer(etiquetteOuPaquet: string): Promise<{ envoyeLe: Instant }>
}
