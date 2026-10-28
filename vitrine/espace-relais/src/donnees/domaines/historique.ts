// Domaine « historique » (possédé par PR-07 Incidents) : retrouver n'importe quelle opération du relais et ses preuves
// (HIS-01 à HIS-03, CAM-06, PR-RC-02, PR-RC-29). Lu dans le journal signé du modèle central (colis.ts), les dossiers et
// les fermetures : réceptions (par lot), remises, encaissements de garde, départs (par collecte), retours déposés,
// constats, fermetures. Chaque opération garde heure, photo, emplacement et membre du guichet ; une remise garde le
// porteur et le paiement. Preuves conservées PR-PREUVES-CONSERV-J jours, jamais modifiées.
// - EMPLOYÉ (DRO-03, HIS-03) : AUCUN montant (espèces encaissées, part du relais) ; le serveur les met à null.
// - Export CSV de la période : gérant seulement (403 sinon) ; jamais d'identité de client ni de vendeur.
// - Recherche (n° de commande, de colis, de retour, de dossier ou de lot) sur toute la durée de conservation : la
//   référence exacte d'un colis ouvre sa fiche.
import type { Acteur, Francs, Instant, Resultat } from '../communs'

export type TypeOperation = 'reception' | 'remise' | 'encaissement' | 'sortie' | 'retour' | 'constat' | 'fermeture' | 'reglage'
/** Filtres de l'écran (Tous, Réceptions, Remises, Départs, Retours, Constats) ; une remise montre aussi l'encaissement. */
export type FiltreHistorique = 'reception' | 'remise' | 'sortie' | 'retour' | 'constat'
export type Periode = 'aujourdhui' | 'semaine' | 'mois'

export interface Operation {
  id: string
  le: Instant
  type: TypeOperation
  /** Référence principale : colis, lot, collecte, retour, dossier ou fermeture. */
  reference: string
  colis: string[]
  par: Acteur
  /** Preuves photo de l'opération (nombre ; consultables 180 jours). */
  photos: number
  emplacement: string | null
  /** Détails structurés (l'écran les met en mots, FR/EN). */
  detail: {
    lot?: string | null
    entreprise?: string | null
    collecte?: string | null
    destination?: string | null
    porteur?: 'client' | 'tiers' | null
    pieceVerifiee?: boolean
    paiementMobileMoney?: string | null // référence de l'agrégateur, jamais le montant pour un employé
    motif?: string | null
    scelle?: boolean
    reserve?: boolean
    dossier?: string | null
    fermeture?: { du: string; au: string; motif: string } | null
    deplacement?: string | null
    /** Remise : contrôle devant le client (« tout est en ordre » dans son application, ou remis sans ouverture à sa
     * demande) et porteur nommé (son nom envoyé au client) — journal du retrait (PR-05). */
    controle?: 'en_ordre' | 'sans_ouverture' | null
    porteurNomme?: boolean
    /** Encaissement : journal signé du PIN à la remise ; espèces rendues (contre-écriture d'une remise annulée). */
    especesSignees?: boolean
    especesRendues?: boolean
  }
  /** Espèces de garde encaissées ; null pour un employé. */
  especes: Francs | null
  /** Part du relais sur l'opération (remise, retour déposé) ; null pour un employé. */
  gainRelais: Francs | null
}

export interface Historique {
  operations: Operation[]
  /** Bandeau de 4 compteurs de la période (colis reçus, remis, retours déposés, constats ouverts). */
  compteurs: { recus: number; remis: number; retours: number; constats: number }
  /** Première journée couverte (période) ou conservation entière (recherche). */
  depuis: string
  /** Recherche d'une référence exacte de colis : sa fiche s'ouvre directement. */
  colisExact: string | null
}

export interface FiltresHistorique {
  periode: Periode
  type?: FiltreHistorique
  recherche?: string
}

export interface DomaineHistorique {
  historique(f: FiltresHistorique): Promise<Historique>
  /** Export CSV (gérant seulement) des opérations filtrées ; jamais d'identité client. */
  exporter(f: FiltresHistorique): Promise<Resultat<{ nom: string; contenu: string }, 'droit_refuse' | 'vide'>>
}
