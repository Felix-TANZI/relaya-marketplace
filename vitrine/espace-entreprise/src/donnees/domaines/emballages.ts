// Domaine « emballages » (ENT-P21) : BelivaY achète, stocke et reste propriétaire des emballages jusqu'à leur
// consommation ; un emballage ne sert qu'à une mission BelivaY (ENT-EMB-01, ENT-P21R-03). Stock avancé par format
// contre un bon de remise signé ; reste attendu = remis − étiquettes consommées − abîmés déclarés (ENT-EMB-02) ;
// réassort au seuil ENT-EMB-REAPPRO % du stock avancé, commande seulement au seuil (409 ABOVE_THRESHOLD) ; inventaire
// du jeudi, écart justifié chaque semaine, au-delà de ENT-EMB-ECART % sur un mois facturé au coût d'achat sur le
// versement, jamais au livreur (ENT-EMB-04). Remise à un livreur avec sa plage d'étiquettes, en attente jusqu'à sa
// confirmation dans l'application livreur (ENT-P21R-01) ; plage perdue invalidée à la déclaration (ENT-P21R-04).
// Kit conseillé (ENT-EMB-KIT-MOTO), C2 au point de stockage (ENT-EMB-05) ; stockage surélevé et au sec (ENT-EMB-06).
// Gestes : propriétaire et répartiteur ; le comptable lit.
// API : GET /api/company/packaging ; POST …/handovers, …/orders, …/discrepancies ; POST /label-ranges/{id}/invalidate.
import type { Instant, LivreurCourt, Resultat } from '../communs'
import type { FormatEmballage } from '../../calculs/ent08'

export interface StockEmballage {
  format: FormatEmballage
  remis: number // stock avancé par BelivaY
  consommes: number // étiquettes liées
  declaresAbimes: number
  auStockage: number
  enKits: number
  dernierInventaire: { le: Instant; compte: number } | null
}

export interface RemiseEmballage {
  id: string
  le: Instant
  livreur: LivreurCourt
  items: { format: FormatEmballage; n: number }[]
  plage: { du: number; au: number } | null
  statut: 'en_attente' | 'confirmee'
}

export interface CommandeEmballage {
  id: string
  le: Instant
  format: FormatEmballage
  n: number
  livraison: 'retrait' | 'course_retour'
  statut: 'envoyee' | 'preparee' | 'recue'
}

export interface PlageEtiquettes {
  id: string
  du: number
  au: number
  liees: number
  statut: 'au_stockage' | 'remise' | 'perdue'
  livreur: LivreurCourt | null
}

export interface EcartEmballage {
  format: FormatEmballage
  attendu: number
  compte: number
  justifie: number
  motif: string | null
}

export interface EtatEmballages {
  stock: StockEmballage[]
  remises: RemiseEmballage[]
  commandes: CommandeEmballage[]
  plages: PlageEtiquettes[]
  ecarts: EcartEmballage[]
  ecartMoisPct: number // écart non justifié du mois, en % du stock avancé
  dernierBon: { le: Instant; par: string; items: { format: FormatEmballage; n: number }[] } | null
  pointStockage: string
}

export type RefusEmballage = 'quantite' | 'plage' | 'chevauchement' | 'au_dessus_du_seuil' | 'motif' | 'photo'

export interface DomaineEmballages {
  etat(): Promise<EtatEmballages>
  remettre(p: { livreurId: string; items: { format: FormatEmballage; n: number }[]; plage: { du: number; au: number } | null }): Promise<Resultat<object, RefusEmballage>>
  commander(p: { format: FormatEmballage; n: number; livraison: CommandeEmballage['livraison'] }): Promise<Resultat<object, RefusEmballage>>
  justifier(p: { format: FormatEmballage; n: number; motif: string; photo: string | null }): Promise<Resultat<object, RefusEmballage>>
  declarerPlagePerdue(id: string): Promise<Resultat<object, RefusEmballage>>
}
