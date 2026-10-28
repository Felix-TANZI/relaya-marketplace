# VD-11 — suivi (Boutique, compte et communication)

Sous-tâches (TACHES-VENDEUR.md, C) : 1 balisage et t() · 2 source démo · 3 règles et états · 4 saisies et issues ·
5 enrichissement · 6 rôle Préparation et anonymat · 7 liens · 8 animations et sons · 9 photos · 10 thèmes, langues,
360–430 px · 11 test de gestes et boutons · 12 vérification.

| Écran | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| menu | x | x | x | x | x | x | x | x | x | x | x | x |
| boutique | x | x | x | x | x | x | x | x | x | x | x | x |
| horaires | x | x | x | x | x | x | x | x | – | x | x | x |
| emplacement | x | x | x | x | x | x | x | x | x | x | x | x |
| equipe | x | x | x | x | x | x | x | x | – | x | x | x |
| parametres | x | x | x | x | x | x | x | x | x | x | x | x |
| securite | x | x | x | x | x | x | x | x | – | x | x | x |
| notifications | x | x | x | x | x | x | x | x | – | x | x | x |
| avis | x | x | x | x | x | x | x | x | – | x | x | x |
| messages | x | x | x | x | x | x | x | x | x | x | x | x |
| aide | x | x | x | x | x | x | x | x | – | x | x | x |

« – » en 9 : écran sans photo à montrer (icônes Lucide du prototype) ; les photos remplaçables du groupe sont le
logo, la devanture, la photo de profil (rognée) et les vignettes d'article de la Messagerie.

## Domaines (src/donnees/domaines, src/demo)

- `boutique` : vitrine interne, pause, fermer aujourd'hui jusqu'à la prochaine ouverture, fermetures écourtables,
  point en attente (> 200 m), repère, avis et réponse privée par le support.
- `compte` : profil par membre (photo, nom, e-mail et numéro avec codes), codes SMS par motif, appareils
  (première connexion, ouvertures), Face ID (S-1), statut et grille calculée (src/calculs), export et clôture avec
  code SMS (Q-23), demande au support.
- `equipe` : invitation puis code SMS du propriétaire, retrait avec code, historique signé, réservé au propriétaire.
- `messages` : conversations commande / litige / support, fermeture au délai de litige, filtre des coordonnées,
  réponses rapides, écrire au support (accusé de réception).
- `notifications` : textes à valeurs typées (montants calculés), canal, « Urgent » vivant, réglages push (I-2).
- `aide` : dix questions (montants calculés), produits interdits, coordonnées et réseaux officiels, conseil.

## Ajouts (enrichissement)

- Menu : recherche d'un écran, compteurs vivants, langue et thème, déconnexion réelle, version.
- Ma boutique : vitrine interne (logo rogné, photo de la devanture, description), état du jour, lien Trust Score,
  demande de modification au support (feuille, motif, détail).
- Horaires : édition par jours (feuille), brouillon annulable, pause 7/14/30 jours, fermetures écourtables
  (« Rouvrir dès demain »), nombre de jours fermés, rappel de la faute « fermeture non annoncée ».
- Emplacement : carte OpenStreetMap, plan dessiné hors ligne / économie de données, ouvrir dans les cartes, copier
  les coordonnées, point « À vérifier » (Q-91), GPS refusé ou imprécis dit en mots.
- Mon équipe : invitation « Invitée » et « Renvoyer le SMS d'invitation », historique signé des ajouts et retraits,
  code SMS pour ajouter ET pour retirer, texte « Peut faire » corrigé (Q-17 : preuves, pas la réponse au litige).
- Paramètres : photo de profil rognée (code SMS), nom (employé) avec code, e-mail (deux codes), téléphone personnel
  (ancien et nouveau numéro), animations réduites, sons, son distinct (I-2), silence la nuit, « Écouter le son »,
  pause de la boutique, pidgin retiré (Q-44).
- Sécurité : « Déconnecter tous les autres », changement de mot de passe dans une feuille avec code SMS, « Mot de
  passe oublié ? », Face ID réglable (texte corrigé selon S-1), grille calculée, export avec code SMS (Q-23),
  clôture avec la liste de ce qui reste à solder et liens, code SMS, annulation.
- Notifications : « Urgent » vivant, « Tout marquer comme lu », « Marquer non lue », groupes par jour, tirer pour
  actualiser, bouton « Contester » prévu pour les sanctions, rétention 12 mois écrite.
- Avis : filtres par note et « À répondre », feuille de réponse (coordonnées refusées), suivi de la réponse dans la
  conversation du support, lien vers le journal complet ; texte de retrait corrigé (Q-71).
- Messagerie : recherche, conversation fermée, avertissement avant l'envoi d'un numéro, signature du membre,
  conversation « Support BelivaY » (Q-49) avec accusé de réception, séparateurs de jour.
- Aide : recherche, écrire dans l'application, « Signaler un message suspect », conseil de la semaine, coordonnées et
  réseaux officiels, délai du support corrigé (Q-47 : 2 h pour tous).

## Écrans retirés

- Aucun écran retiré. Dans le Menu, le bloc « Écrans d'état et d'accès » est retiré de la production (Q-79).

## Questions

- La consigne du groupe parle d'une « vitrine : photo, logo, description » ; VD11-R11 interdit toute vitrine
  PUBLIQUE. Choix fait : vitrine INTERNE (vous, l'agent de zone, le livreur), jamais montrée au client ; l'aperçu
  client reste palier + Trust Score seulement. À confirmer par le porteur.

## Vague 4 · retrait de l'inutile

- Menu : le bloc « Nouveautés » (« L’île BelivaY ») est retiré ; il menait à l'île, démonstration retirée de
  l'application (`outils/inventaire-commun.mjs`, RETIRES : « Écran retiré » à l'ouverture), donc à un écran vide.
- Menu : la taille du texte (Normale, Grande, Très grande) rejoint la langue et le thème dans le bloc des
  préférences (`PreferencesDuMenu`), comme le Menu du client ; gardée sur l'appareil.
- Feuilles à code SMS (`CodeSms`) : la ligne « Démonstration : le code est 123456 » n'est plus montrée avec le
  serveur (`VITE_SOURCE=api`) ; elle reste dans la démonstration.
