// Droits, interdits et limites par rôle (ENT-RG-R25, BRIEF-ENRICHISSEMENT §5) : écrits UNE fois, lus par le Profil
// (« Ce que mon rôle permet ») et la page Sécurité et équipe (tableau des rôles). Chaque interdit dit pourquoi ; les
// limites viennent du registre (aucun nombre écrit ici). Le serveur refuse de toute façon (403 role_forbidden) : cette
// liste explique, elle ne protège pas. Elle suit les rôles des routes (src/pages/<groupe>/routes.ts) et des gestes
// (src/demo : exiger), vérifiés par src/config/droits.test.ts.
import type { Role } from '../donnees/communs'

export interface Droit {
  id: string
  quoi: string // capacité, en français (traduite par t())
  roles: Role[] // rôles qui l'ont
  route?: string // page où elle s'exerce (pour vérifier la cohérence avec les routes)
  pourquoi: string // pourquoi les autres rôles ne l'ont pas
}

export const DROITS: Droit[] = [
  { id: 'paquets', quoi: 'Voir, accepter et rendre les paquets', roles: ['proprietaire', 'gerant', 'repartiteur'], route: 'paquets', pourquoi: 'Prendre un paquet engage l’entreprise sur un délai : réservé à qui dirige les livreurs.' },
  { id: 'affecter', quoi: 'Affecter, réaffecter et relancer les livreurs', roles: ['proprietaire', 'gerant', 'repartiteur'], route: 'affectation', pourquoi: 'Le choix du livreur reste celui de l’entreprise (DP-63), fait par qui dirige la flotte.' },
  { id: 'incidents', quoi: 'Décider des incidents et suivre les missions', roles: ['proprietaire', 'gerant', 'repartiteur'], route: 'incidents', pourquoi: 'Une décision d’incident change la tournée en cours : réservée à l’exploitation.' },
  { id: 'flotte', quoi: 'Inviter et approuver un livreur', roles: ['proprietaire', 'gerant', 'repartiteur'], route: 'ajout', pourquoi: 'La flotte est gérée par l’exploitation ; la comptabilité la consulte sans la changer.' },
  { id: 'departs', quoi: 'Traiter les départs et les absences des livreurs, demander une nouvelle photo', roles: ['proprietaire', 'gerant', 'repartiteur'], pourquoi: 'Le contrat du livreur est suivi par l’exploitation (DP-66) ; la comptabilité verse son dernier relevé sans décider de son départ.' },
  { id: 'emploi', quoi: 'Confirmer, prolonger ou rompre la période d’essai ; avertir, suspendre, réintégrer ; mettre fin au contrat ; accorder un congé', roles: ['proprietaire', 'gerant'], pourquoi: 'L’entreprise est l’employeur du livreur (DP-66) : ces décisions engagent le contrat de travail, prises par le propriétaire ou le gérant, avec un motif écrit.' },
  { id: 'horaires', quoi: 'Fixer les horaires et les zones de travail d’un livreur', roles: ['proprietaire', 'gerant', 'repartiteur'], pourquoi: 'Les horaires et les zones organisent les tournées : l’exploitation les règle ; la comptabilité les lit.' },
  { id: 'attestation', quoi: 'Délivrer une attestation de travail', roles: ['proprietaire', 'gerant', 'comptable'], pourquoi: 'L’attestation engage l’employeur sur des faits du contrat : la direction ou la comptabilité la délivre.' },
  { id: 'zones', quoi: 'Déclarer les zones, la capacité et les véhicules', roles: ['proprietaire', 'gerant', 'repartiteur'], pourquoi: 'La capacité déclarée engage la tenue des délais : réservée à l’exploitation.' },
  { id: 'argent', quoi: 'Voir les montants, règlements et relevés', roles: ['proprietaire', 'comptable'], route: 'reglements', pourquoi: 'Les montants détaillés ne sont montrés qu’à qui en a besoin (séparation des tâches).' },
  { id: 'litige-preparer', quoi: 'Préparer la réponse à un litige', roles: ['proprietaire', 'gerant', 'repartiteur'], pourquoi: 'La réponse s’appuie sur les preuves de la mission, tenues par l’exploitation.' },
  { id: 'litige-envoyer', quoi: 'Envoyer la réponse à un litige', roles: ['proprietaire'], pourquoi: 'Une réponse engage l’entreprise : le propriétaire la signe, après préparation.' },
  { id: 'contrat', quoi: 'Signer le contrat, envoyer les pièces, faire un recours', roles: ['proprietaire'], pourquoi: 'Seul le représentant légal engage l’entreprise.' },
  { id: 'equipe', quoi: 'Inviter ou retirer un utilisateur interne', roles: ['proprietaire'], pourquoi: 'Les accès à l’espace sont donnés par le propriétaire seul, chacun à son nom.' },
  { id: 'reglement', quoi: 'Changer le moyen de règlement', roles: ['proprietaire'], pourquoi: 'Le compte qui reçoit l’argent est changé par le propriétaire seul, avec un code.' },
  { id: 'integrations', quoi: 'Créer et gérer les clés d’API', roles: ['proprietaire'], route: 'integrations', pourquoi: 'Une clé ouvre l’accès aux données de l’entreprise : le propriétaire seul la crée.' },
]

/** Ce que permet un rôle, et ce qu'il ne permet pas (avec la raison). */
export function droitsDe(role: Role) {
  return { oui: DROITS.filter((d) => d.roles.includes(role)), non: DROITS.filter((d) => !d.roles.includes(role)) }
}
