// Connecteurs du domaine « horsligne » (backend-kit/apps/livreur_tournee) : la file vit SUR LE TÉLÉPHONE
// (localStorage) ; elle part au serveur par lot, rejouée dans l'ordre de l'heure d'origine, idempotente par origine.cle.
// Chaque geste y garde la requête exacte qu'il aurait envoyée en ligne (calculée sur le téléphone), rejouée par sa route.
import { c, type ConnecteursDe } from './types'

const D = 'Hors connexion'

export const ROUTES_HORSLIGNE: ConnecteursDe<'horsligne'> = {
  'horsligne.file': c(D, 'telephone', '—', '→ FileHorsLigne', 'file locale du téléphone (localStorage), aucune route'),
  'horsligne.regles': c(D, 'branche', 'GET /api/courier/sync/rules', '→ ReglesEnvoi'),
  'horsligne.mettreEnFile': c(D, 'telephone', '—', '→ ActionEnFile', 'heure et position d’origine gardées ; la charge du geste devient sa requête exacte {chemin, corps}, envoyée par le lot ; jamais d’action « vider la file »'),
  'horsligne.envoyerFile': c(D, 'branche', 'POST /api/courier/sync/batch {actions: [{type, objet, origine, corps?, requete?}]}', '→ {a, envoyees, refusees, resultats, conflits, heureServeur}', 'ordre chronologique ; même service que la route du geste ; détail manquant : refusée avec un motif lisible ; la version du serveur s’impose'),
  'horsligne.relancer': c(D, 'branche', 'POST /api/courier/sync/batch {actions}', '→ Resultat hors_ligne | introuvable', 'reçu « en retard », jamais effacé'),
  'horsligne.conflitVu': c(D, 'telephone', '—', '→ void', 'file locale du téléphone'),
  'horsligne.noterReseau': c(D, 'telephone', '—', '→ void', 'file locale du téléphone'),
}
