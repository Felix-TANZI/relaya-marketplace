// Libellés des canaux et des types d'alerte (Notifications, Paramètres) : textes français traduits par t().
import type { Canal, TypeAlerte } from '../../calculs/ent08'

export const NOM_CANAL: Record<Canal, string> = { portail: 'Portail', push: 'Push', email: 'E-mail', sms: 'SMS' }
export const NOM_ALERTE: Record<TypeAlerte, string> = { paquet: 'Paquet publié', non_affecte: 'Paquet non affecté', depart: 'Départ absent', incident: 'Incident', litige: 'Litige ouvert', versement_refuse: 'Versement refusé', vente_flash: 'Vente flash annoncée', document: 'Pièce à renouveler' }
