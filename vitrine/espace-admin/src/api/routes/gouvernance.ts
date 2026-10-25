// Connecteurs du domaine « gouvernance » (backend-kit/apps/console : journal signé, agents, fraude, décision agent ;
// gouvernance_serveur.py : exports à quatre yeux, demandes de données, gel, comptes, espaces pays, terrain).
import { c, type ConnecteursDe } from './types'

const D = 'Gouvernance'
const AGENT = 'POST /api/console/decisions {action: agent, donnees: {user, roles, zones, actif}} (Idempotency-Key)'

export const ROUTES_GOUVERNANCE: ConnecteursDe<'gouvernance'> = {
  'gouvernance.journal': c(D, 'branche', 'GET /api/console/vues/journal?action=&objet=&limite=', '→ LigneJournal[]', 'sa part (journal.tout : audit, superviseur) ; zone de la ligne (livreur, entreprise ou objet) ; avant → après quand la ligne les porte'),
  'gouvernance.verifierChaine': c(D, 'branche', 'GET /api/console/journal/verification', '→ {ok, casseeA, lignes}'),
  'gouvernance.ecrire': c(D, 'branche', 'POST /api/console/vues/journal/ecrire {action, objet, motif?, avant?, apres?}', '→ LigneJournal ; 422 action_inconnue', 'liste fermée : export.csv (fichier signé dans le navigateur), appel.masque, appel.note ; tout autre geste est journalisé par le serveur lui-même'),
  'gouvernance.agents': c(D, 'branche', 'GET /api/console/vues/agents', '→ Agent[]', 'téléphone masqué, second facteur et appareils connus (connexion des agents)'),
  'gouvernance.tableauJournal': c(D, 'branche', 'GET /api/console/vues/journal/tableau?q=&agentId=&role=&action=&periode=', '→ TableauJournal', 'détail avant → après ; adresse et appareil : jamais gardés au journal signé (données minimales) ; 300 lignes'),
  'gouvernance.consulterJournal': c(D, 'branche', 'POST /api/console/vues/journal/consulter', '→ {ok}', 'une ligne journal.consulted par minute et par agent'),
  'gouvernance.reconstituer': c(D, 'branche', 'GET /api/console/vues/journal?objet=&limite=1000', '→ Reconstitution', 'lignes de l’objet jusqu’à l’instant ; état : « après » de la dernière ligne qui en porte un'),
  'gouvernance.lierExport': c(D, 'branche', 'GET /api/console/decisions/{ref}', '→ void', 'la demande d’export est la décision « journal-export » (geste journal.exporter : portée {periode, du, au} ou {demande}) ; lier la relit'),
  'gouvernance.exportsJournal': c(D, 'branche', 'GET /api/console/vues/journal/exports?tout=1', '→ ExportJournal[]', 'audit.exporter'),
  'gouvernance.telechargerExport': c(D, 'branche', 'GET /api/console/vues/journal/exports/{id}', '→ {entetes, lignes, nom} ; 409 pas_valide ; 404 inconnu', 'après la contre-signature seulement ; borné au journal du moment de la contre-signature ; journalisé (audit.export_downloaded)'),
  'gouvernance.demandesDonnees': c(D, 'branche', 'GET /api/console/vues/demandes-donnees?tout=1', '→ DemandeDonnees[]', 'donnees.lire ; cinq espaces ; échéance ADM-ACCES-DONNEES-J'),
  'gouvernance.enregistrerDemande': c(D, 'branche', 'POST /api/console/vues/demandes-donnees {acteur, espace, type, motif} (Idempotency-Key)', '→ {ok, id} ; 400 motif_court ; 409 deja_ouverte', 'donnees.traiter ; acteur : identifiant du compte (les chiffres saisis, « user:12 » ou « Client ••• 0012 »)'),
  'gouvernance.repondreDemande': c(D, 'branche', 'POST /api/console/vues/demandes-donnees/{id}/reponse {motif} (Idempotency-Key)', '→ {entetes, lignes, nom} ; 409 deja_repondue ; 404 inconnu', 'donnees.repondre ; seules les lignes qui visent l’acteur, sans données de tiers ; une fois'),
  'gouvernance.fraude': c(D, 'branche', 'GET /api/console/vues/fraude', '→ TableauFraude', 'comptes (inscription, commandes, zone), identifiant partagé masqué, graphe comptes ↔ identifiant, gel conservatoire (fraude-gel)'),
  'gouvernance.alerte': c(D, 'branche', 'GET /api/console/vues/fraude', '→ AlerteFraude | null', 'même lecture, une alerte'),
  'gouvernance.ouvrirRevue': c(D, 'branche', 'POST /api/console/decisions {action: fraude-decision, donnees: {alerte, decision: en_revue}}', '→ {ok}', 'motif écrit par le connecteur (« Revue ouverte »)'),
  'gouvernance.classerAlerte': c(D, 'branche', 'POST /api/console/decisions {action: fraude-decision, donnees: {alerte, decision: ecartee}}', '→ {ok} ; state_changed → deja_tranchee'),
  'gouvernance.proposerSanction': c(D, 'branche', 'POST /api/console/decisions {action: fraude-decision, donnees: {alerte, decision: confirmee}}', '→ {ok} ; state_changed → deja_tranchee'),
  'gouvernance.lierGel': c(D, 'branche', 'GET /api/console/decisions/{ref}', '→ void', 'la demande de gel est la décision « fraude-gel » à quatre yeux (geste fraude.geler) ; lier la relit'),
  'gouvernance.leverGel': c(D, 'branche', 'POST /api/console/decisions {action: fraude-gel-lever, donnees: {alerte}} (Idempotency-Key)', '→ {ok} ; 422 pas_de_gel', 'les versements retenus partent au vendredi suivant'),
  'gouvernance.demasquerIdentifiant': c(D, 'branche', 'POST /api/console/vues/fraude/{id}/identifiant {motif}', '→ {ok, valeur} | {ok: false, raison: motif_court} ; 404 inconnu', 'identifiant partagé par les comptes de l’alerte : numéro relu chiffré (wallet, numéro de versement), appareil par son empreinte ; donnees.demasquer et fraude.lire ; journalisé (donnee.demasquer)'),
  'gouvernance.comptes': c(D, 'branche', 'GET /api/console/vues/comptes', '→ TableauComptes', 'agents.lire ; revue trimestrielle, bris de glace, durées de session : valeurs de la décision « Proposé » (A-VALIDER) tant que le registre ne les porte pas'),
  'gouvernance.creerCompte': c(D, 'branche', 'POST /api/console/comptes', '→ {ok, id, expireLe}', 'invitation d’un employé (lien d’activation, ADM-INVITATION-H) ; rôle Direction : action agent-inviter à quatre yeux'),
  'gouvernance.lierCreationDirection': c(D, 'branche', 'GET /api/console/decisions/{ref}', '→ void', 'création d’un compte Direction : décision « agent-inviter » à quatre yeux (l’invitation part à la contre-signature) ; lier la relit'),
  'gouvernance.modifierCompte': c(D, 'branche', AGENT, '→ {ok} (à contre-signer) ; dernier_superviseur → direction_min'),
  'gouvernance.fermerAcces': c(D, 'branche', `${AGENT} (actif: false)`, '→ {ok, reattribues: 0} (à contre-signer)', 'les cartes ne sont pas attribuées au kit : rien à réattribuer'),
  'gouvernance.confirmerCompte': c(D, 'branche', 'POST /api/console/comptes/{id}/confirmer', '→ {ok}', 'revue trimestrielle des accès'),
  'gouvernance.suspendreCompte': c(D, 'branche', 'POST /api/console/vues/comptes/{id}/suspendre {motif} (Idempotency-Key)', '→ {ok} ; 409 soi_meme, direction_quatre_yeux, direction_min, etat', 'sessions fermées tout de suite ; réactivable à quatre yeux'),
  'gouvernance.renvoyerInvitation': c(D, 'branche', 'POST /api/console/vues/comptes/{id}/inviter (Idempotency-Key)', '→ {ok} ; 409 etat', 'nouveau lien d’activation par e-mail ; l’ancien est annulé'),
  'gouvernance.reactiverCompte': c(D, 'branche', `${AGENT} (actif: true)`, '→ {ok} (à contre-signer)'),
  'gouvernance.pays': c(D, 'branche', 'GET /api/console/vues/pays', '→ EspacePaysDetail[]', 'pays.gerer ; Cameroun ouvert (registre), copies en préparation (liste CEMAC), conditions constatées'),
  'gouvernance.copierPays': c(D, 'branche', 'POST /api/console/vues/pays {code, nom, motif} (Idempotency-Key)', '→ {ok} ; 409 existe ; 404 inconnu'),
  'gouvernance.revoirParametre': c(D, 'branche', 'POST /api/console/vues/pays/{code}/parametres {code, valeur} (Idempotency-Key)', '→ {ok} ; 422 vide, condition'),
  'gouvernance.ouvrirPays': c(D, 'branche', 'POST /api/console/decisions {action: pays-ouvrir, donnees: {pays}} (Idempotency-Key)', '→ {ok} ; 422 conditions'),
  'gouvernance.terrain': c(D, 'branche', 'GET /api/console/vues/terrain?tout=1', '→ TableauTerrain', 'terrain.lire ; agents terrain, descentes du jour, fiches (numéro masqué), rendement par zone'),
  'gouvernance.nouvelleFiche': c(D, 'branche', 'POST /api/console/vues/terrain {genre, nom, zone, quartier, titulaire, numero} (Idempotency-Key)', '→ {ok, id} ; 422 incomplet, hors_zone', 'terrain.saisir ; numéro chiffré + empreinte'),
  'gouvernance.envoyerLien': c(D, 'branche', 'POST /api/console/vues/terrain/{id}/lien (Idempotency-Key)', '→ {ok} ; 409 etat'),
  'gouvernance.relancer': c(D, 'branche', 'POST /api/console/vues/terrain/{id}/relancer (Idempotency-Key)', '→ {ok} ; 409 etat'),
  'gouvernance.controlerFiche': c(D, 'branche', 'POST /api/console/decisions {action: terrain-controle, donnees: {fiche, conforme}} (Idempotency-Key)', '→ {ok} ; 422 meme_personne ; 409 etat', 'terrain.controler (Vérification) ; jamais l’auteur de la fiche'),
}
