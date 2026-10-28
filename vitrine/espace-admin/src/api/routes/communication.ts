// Connecteurs du domaine « communication » (backend-kit/apps/console/communication_serveur.py : messagerie, diffusions,
// modèles, pannes et mode papier, support et centre d'aide).
import { c, type ConnecteursDe } from './types'

const D = 'Communication'
const PANNE = 'panne.agir (Direction, Opérations dans ses zones) ; publié aux six espaces (journal signé)'
const SUPPORT = 'support.agir (Service client) ; journalisé'

export const ROUTES_COMMUNICATION: ConnecteursDe<'communication'> = {
  'communication.envois': c(D, 'branche', 'GET /api/console/vues/envois', '→ Envoi[]', 'console.EnvoiNotification : destinataire masqué, criticité et événement du catalogue (donnees/modeles-console-meta.json), coût d’un SMS délivré (sms_prix_unitaire), essais, renvois en 24 h, carte d’un critique non délivré (ADM-MSG-C1-MIN), texte rendu, code masqué ; la Finance n’en voit que les coûts'),
  'communication.renvoyer': c(D, 'branche', 'POST /api/console/vues/envois/{id}/renvoyer (Idempotency-Key)', '→ {ok} ; 409 deja_delivre, quota ; 404 inconnu', 'même clé : jamais deux messages pour un événement'),
  'communication.budgetSms': c(D, 'branche', 'GET /api/console/vues/budget-sms', '→ BudgetSms', 'SMS délivrés du mois par jour et par modèle × sms_prix_unitaire ; commandes payées (pickup) ; envois gratuits'),
  'communication.diffusions': c(D, 'branche', 'GET /api/console/vues/diffusions', '→ Diffusion[]', 'une diffusion programmée part à son heure ; une décision refusée ou échue la refuse'),
  'communication.audience': c(D, 'branche', 'GET /api/console/vues/audience?espaces=&zones=&promotion=', '→ number', 'comptes réels : clients du relais habituel de la zone (sans ceux qui refusent les promotions), boutiques, relais ouverts, entreprises, livreurs actifs'),
  'communication.diffuser': c(D, 'branche', 'POST /api/console/vues/diffusions {objet, texte, espaces, zones, canaux, promotion, programmeeLe, motif} (Idempotency-Key)', '→ {ok, id, etat} ; 422 objet, vide, contenu, sms_promo, heures_promo, passe', 'au-delà de diffusion_quatre_yeux_seuil destinataires : décision « diffusion » à quatre yeux (Direction ou Finance)'),
  'communication.modeles': c(D, 'branche', 'GET /api/console/vues/modeles', '→ ModeleMessage[]', 'modèles de la console (textes livrés, versions publiées FR et EN avec leur motif), envois en échec du jour'),
  'communication.publierModele': c(D, 'branche', 'POST /api/console/vues/modeles/{id}/publier {fr, en, motif} (Idempotency-Key)', '→ {ok, version} ; 422 vide, numero, code, variable_inconnue, code_hors_modele, sms_promo, inchange', 'une version sur chaque canal du modèle ; journalisé (notification.template_published)'),
  'communication.services': c(D, 'branche', 'GET /api/console/vues/services', '→ ServiceEtat[]', 'supervision du kit (base, registre, journal, tâches), SMS en échec, relais en ligne, états de l’aide'),
  'communication.incidents': c(D, 'branche', 'GET /api/console/vues/pannes', '→ Incident[]', 'zones de l’agent ; remises : registre papier des relais (relais_core.LigneRegistre) ; un relais en papier sans ligne : « registre à ressaisir »'),
  'communication.declarer': c(D, 'branche', 'POST /api/console/vues/pannes {service, zones, effets, consignes, detecteLe} (Idempotency-Key)', '→ {ok, id} ; 422 service, zones, perimetre, contenu ; 400 motif_court', PANNE),
  'communication.passerPapier': c(D, 'branche', 'POST /api/console/vues/pannes/{id}/papier {relais} (Idempotency-Key)', '→ {ok} ; 409 etat ; 422 zones', 'relais_core : panne générale ouverte, relais en registre papier'),
  'communication.mettreAJour': c(D, 'branche', 'POST /api/console/vues/pannes/{id}/consignes {consignes} (Idempotency-Key)', '→ {ok} ; 409 etat', PANNE),
  'communication.retablir': c(D, 'branche', 'POST /api/console/vues/pannes/{id}/retablir (Idempotency-Key)', '→ {ok} ; 409 etat', 'panne générale fermée, registre à ressaisir (PR-PAPIER-SAISIE-H)'),
  'communication.relancerRessaisie': c(D, 'branche', 'POST /api/console/vues/pannes/{id}/ressaisie {remise} (Idempotency-Key)', '→ {ok} ; 409 etat', 'le relais est relancé (journal vers le relais)'),
  'communication.ecrireRapport': c(D, 'branche', 'POST /api/console/vues/pannes/{id}/rapport {cause, effets, change} (Idempotency-Key)', '→ {ok} ; 409 etat ; 400 motif_court', PANNE),
  'communication.clore': c(D, 'branche', 'POST /api/console/vues/pannes/{id}/clore (Idempotency-Key)', '→ {ok} ; 409 non_retabli, registre, rapport, etat', 'service rétabli, registre ressaisi, rapport écrit'),
  'communication.tickets': c(D, 'branche', 'GET /api/console/vues/tickets', '→ TicketSupport[]', 'demandes nées des conversations : client (messaging), vendeur (vendeur_boutique), entreprise (fil vers BelivaY) ; échéance SUP-DELAI aux heures SUP-HORAIRES ; rattachement proposé (dernière commande du client)'),
  'communication.rattacher': c(D, 'branche', 'POST /api/console/vues/tickets/{id}/rattacher {ref} (Idempotency-Key)', '→ {ok} ; 422 non_rattache', SUPPORT),
  'communication.preparerReponse': c(D, 'branche', 'POST /api/console/vues/tickets/{id}/brouillon {reponseType, texte} (Idempotency-Key)', '→ {ok} ; 422 vide, contenu ; 409 etat', SUPPORT),
  'communication.envoyerReponse': c(D, 'branche', 'POST /api/console/vues/tickets/{id}/reponse (Idempotency-Key)', '→ {ok} ; 422 non_rattache, contenu ; 409 etat', 'versée dans la conversation de l’acteur (il est prévenu)'),
  'communication.resoudre': c(D, 'branche', 'POST /api/console/vues/tickets/{id}/resoudre (Idempotency-Key)', '→ {ok} ; 422 non_rattache ; 409 etat', 'un nouveau message de l’acteur ouvre une nouvelle demande'),
  'communication.accorderGeste': c(D, 'branche', 'POST /api/console/vues/tickets/{id}/geste {motif} (Idempotency-Key)', '→ {ok} ; 422 non_rattache, geste_depasse ; 409 deja_geste', 'SUP-GESTE, jamais au-delà de la commission perçue ni du plafond de l’agent ; enregistré pour la Finance (aucun argent ne bouge ici)'),
  'communication.reponsesTypes': c(D, 'branche', 'GET /api/console/vues/reponses-types', '→ ReponseType[]', 'donnees/support-console.json ; usage sur 30 jours compté sur les demandes'),
  'communication.articles': c(D, 'branche', 'GET /api/console/vues/articles', '→ ArticleAide[]', 'signalé quand une règle citée a une nouvelle version appliquée au registre'),
  'communication.mettreAJourArticle': c(D, 'branche', 'POST /api/console/vues/articles/{id} (Idempotency-Key)', '→ {ok} ; 404 inconnu', 'aide.mettre_a_jour'),
}
