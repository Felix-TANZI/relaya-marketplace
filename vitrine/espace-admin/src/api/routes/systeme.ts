// Connecteurs du domaine « systeme » (backend-kit/apps/console : interrupteurs.py, supervision.py, taches.py,
// systeme_serveur.py).
import { c, type ConnecteursDe } from './types'

const D = 'Système'

export const ROUTES_SYSTEME: ConnecteursDe<'systeme'> = {
  'systeme.interrupteurs': c(D, 'branche', 'GET /api/console/interrupteurs', '→ Interrupteur[]', 'decision : référence de la dernière bascule, sinon l’état par défaut'),
  'systeme.sante': c(D, 'branche', 'GET /api/console/vues/sante', '→ ServiceSante[]', 'un contrôle de supervision par ligne (base, cache, registre, journal, tâches, notifications), durée mesurée'),
  'systeme.taches': c(D, 'branche', 'GET /api/console/vues/taches/courtes', '→ TachePlanifiee[]'),
  'systeme.tableauSante': c(D, 'branche', 'GET /api/console/vues/sante/tableau', '→ TableauSante', 'sante.lire ; supervision du kit, files, maintenances annoncées'),
  'systeme.programmerMaintenance': c(D, 'branche', 'POST /api/console/decisions {action: maintenance, donnees: {service, debut, dureeMin}} (Idempotency-Key)', '→ {ok, id} ; 422 preavis, creneau_interdit ; 409 chevauchement → creneau_interdit', 'préavis ADM-MAINTENANCE-PREAVIS-H ; annoncée aux six espaces'),
  'systeme.annulerMaintenance': c(D, 'branche', 'POST /api/console/decisions {action: maintenance-annuler, donnees: {maintenance}} (Idempotency-Key)', '→ {ok} ; 409 state_changed → inconnu'),
  'systeme.tableauTaches': c(D, 'branche', 'GET /api/console/vues/taches', '→ TacheDetail[]', 'prochaine = dernier succès + période attendue'),
  'systeme.lancerTache': c(D, 'branche', 'POST /api/console/taches/{nom}/lancer {motif}', '→ {ok} ; hors_periode → deja_faite ; 404 → inconnu', 'taches.lancer ; motif journalisé (task.run_by_console)'),
  'systeme.conservation': c(D, 'branche', 'GET /api/console/vues/conservation', '→ TableauConservation', 'politique du registre, dernière application (console.conservation), paquets gardés pour un litige ouvert, demandes de données des livreurs ouvertes, délai CONSOLE-CANDIDATURE-COMPLEMENT-J'),
  'systeme.rapports': c(D, 'branche', 'GET /api/console/vues/rapports?periode=jour|7j|30j&zone=', '→ TableauRapports', 'jour par jour (Yaoundé) sur les tables du kit : commandes payées, commissions figées, paquets, remises au relais, litiges, avis, SMS envoyés, emballages liés ; ratio masqué sous RAPPORT-ECHANTILLON-MIN ; Assistant IA : 0 (aucun appel instrumenté) ; rapport du lundi : tâche console.rapport_lundi'),
  'systeme.legal': c(D, 'branche', 'GET /api/console/vues/legal', '→ TableauLegal', 'legal.lire ; versions en vigueur, annonces, vocabulaire interdit, produits interdits'),
  'systeme.proposerVersion': c(D, 'branche', 'POST /api/console/decisions {action: texte-legal, donnees: {texte, resume, contenu, effet}} (Idempotency-Key)', '→ {ok, version} ; 422 preavis, vocabulaire ; 409 deja_annoncee', 'préavis avant l’effet ; annoncée aux espaces'),
  'systeme.ajouterInterdit': c(D, 'branche', 'POST /api/console/decisions {action: produit-interdit, donnees: {categorie, produit}} (Idempotency-Key)', '→ {ok} ; 422 vide ; 409 existe'),
}
