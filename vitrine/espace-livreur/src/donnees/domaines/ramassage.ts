// Domaine « ramassage » (LIV-06 : P10 à P15), maillon C1 de la chaîne de preuves, chaque étape bloquant la suivante :
// arrivée (notification « Votre livreur est là » avec la photo ; « vendeur pas prêt » après l'attente maximale ;
// boutique fermée avec photo de la devanture), contrôle C1 colis par colis (six cases cochées par le livreur, photo 1),
// audit par échantillon C4 (tiré par le serveur, révélé après le contrôle), emballage (format conseillé, étiquette liée
// définitivement, scellé, photo 2), code de remise du vendeur (essais limités, blocage), refus motivé (photo + note).
// remise_valide ⇔ photo1 ∧ photo2 ∧ étiquette liée ∧ code correct : la garde passe à l'entreprise, à la seconde.
// L'article est décrit tel que la fiche le décrit (nom, variante, état, quantité) : jamais sa valeur.
import type { ClasseColis, Instant, Origine, Resultat } from '../communs'

export type FormatEmballage = 'S' | 'M' | 'L' | 'C1' | 'C2' | 'origine'
export type MotifRefus = 'non_conforme' | 'abime' | 'contrefacon' | 'interdit' | 'controle_refuse' | 'valeur_plafond' | 'emballage_impossible'
export type EtatColisRamassage = 'attendu' | 'controle' | 'audit' | 'emballe' | 'refuse' | 'retire' | 'remis'

export interface ArticleFiche {
  nom: string
  variante: string
  etat: string // « Neuf »
  quantite: number
  accessoires: string | null
  serie: boolean // un numéro de série (ou IMEI) est attendu sur la photo 1
  categorie: 'electronique' | 'mode' | 'maison' | 'beaute' | 'autre'
}

export interface AuditColis {
  verifs: (boolean | null)[]
  photos: string[]
  resultat: 'favorable' | 'defavorable' | 'attente_console' | null
  debut: Instant
}

export interface ControleColis {
  colisId: string
  classe: ClasseColis
  fragile: boolean
  article: ArticleFiche
  etat: EtatColisRamassage
  formatConseille: FormatEmballage
  zoneManuscrite: string // « Z1 · B » : code de zone et initiale du relais, jamais un nom
  // Contrôle C1
  cases: boolean[] // six cases, aucune cochée d'avance
  boiteScellee: boolean | null
  photo1: string | null // identifiant de preuve
  classeDepassee: string | null // photo avec repère de taille
  serieIllisible: boolean
  // Audit C4 (révélé après le contrôle)
  audit: AuditColis | null
  // Emballage
  format: FormatEmballage | null
  motifFormat: string | null
  etiquette: string | null
  scelle: boolean[] // ruban, signature, photo lisible
  photo2: string | null
  // Récupération groupée (R66 : une photo par colis à chaque changement de main, gardée avec la preuve)
  recupere?: { photo: string; par: 'photo' | 'scan'; quand: Instant } | null
  /** Colis pas prêt : le livreur attend jusqu'à `jusqua` (ATTENTE-VENDEUR-MIN), ou part avec les autres (retiré). */
  manquant?: { depuis: Instant; jusqua: Instant } | null
  // Refus
  refuse: { motif: MotifRefus; photo: string; note: string; quand: Instant } | null
}

export interface Ramassage {
  arretId: string
  vendeur: string
  quartier: string
  repere: string | null
  creneau: [Instant, Instant]
  arriveeA: Instant | null
  notification: 'envoyee' | 'vue' | null // « Votre livreur est là »
  relanceA: Instant | null
  colis: ControleColis[]
  code: { essaisRestants: number; bloqueJusqua: Instant | null; valideA: Instant | null }
  plageEtiquettes: { prefixe: string; de: number; a: number } // rouleau rattaché au livreur
  stock: Partial<Record<FormatEmballage, number>> // kit du jour, décompté à chaque étiquette liée
  fermee: { photo: string; note: string; quand: Instant } | null
  /** DÉMONSTRATION seulement : ce que le vendeur lit dans « Mes commandes à remettre » (l'API ne le renvoie jamais). */
  codeDemo?: string
}

export interface DomaineRamassage {
  ramassage(arretId: string): Promise<Ramassage | null>
  relancer(arretId: string, origine: Origine): Promise<Resultat<object, 'deja_relance'>>
  pasPret(arretId: string, origine: Origine): Promise<Resultat<object, 'trop_tot'> & { possibleA?: Instant }>
  boutiqueFermee(arretId: string, photo: string, note: string, origine: Origine): Promise<Resultat<object, 'note_trop_courte'>>
  controler(colisId: string, c: { cases: boolean[]; boiteScellee: boolean; photo1: string; classeDepassee: string | null; serieIllisible: boolean }, origine: Origine): Promise<Resultat<{ suite: 'audit' | 'emballage' }, 'cases_incompletes' | 'photo_manquante'>>
  auditer(colisId: string, a: { verifs: (boolean | null)[]; photos: string[] }, origine: Origine): Promise<Resultat<{ suite: 'emballage' | 'refus' | 'attente_console' }, 'incomplet'>>
  lierEtiquette(colisId: string, numero: string, origine: Origine): Promise<Resultat<{ numero: string }, 'deja_liee' | 'hors_plage' | 'illisible'>>
  emballer(colisId: string, e: { format: FormatEmballage; motifFormat: string | null; scelle: boolean[]; photo2: string }, origine: Origine): Promise<Resultat<object, 'etiquette_manquante' | 'scelle_incomplet' | 'motif_manquant'>>
  emballageManquant(colisId: string, origine: Origine): Promise<Resultat>
  validerCode(arretId: string, code: string, origine: Origine): Promise<Resultat<{ garde: number }, 'code_faux' | 'bloque' | 'controle_incomplet'> & { essaisRestants?: number }>
  refuser(colisId: string, motif: MotifRefus, photo: string, note: string, origine: Origine): Promise<Resultat<{ dossier: boolean }, 'note_trop_courte' | 'photo_manquante'>>
  corrigerSurPlace(colisId: string, origine: Origine): Promise<Resultat>
  /** Colis coché dans la liste groupée du vendeur, par photo ou par scan de son étiquette (la photo est gardée, R66). */
  recuperer(colisId: string, par: 'photo' | 'scan', photo: string, origine: Origine): Promise<Resultat<object, 'photo_manquante' | 'inconnu'>>
  /** Colis manquant ou pas prêt : attendre (minuteur) ou partir avec les autres (retiré, signalé à l'entreprise). */
  colisManquant(colisId: string, choix: 'attendre' | 'partir', origine: Origine): Promise<Resultat<{ jusqua?: Instant }, 'inconnu'>>
}
