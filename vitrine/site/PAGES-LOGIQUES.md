# Pages logiques (DP-53) — plan et suivi, page par page

Décision du porteur (3 oct. 2026) : chaque page, sauf l'accueil, fonctionne pour de vrai, avec toutes les
fonctions qu'elle est censée avoir. Ajouter, déplacer, modifier ; ne rien supprimer. Les pages du compte
d'abord, puis le numéro et la connexion, puis les autres, une à une, chacune vérifiée avant la suivante.

## Méthode

- **Les données décident, pas l'adresse.** Le « serveur » de la démonstration (`src/demo/magasin.ts`, gardé sur
  l'appareil) tient l'état du compte ; les écrans le lisent par `src/donnees/source.ts` et chaque geste le
  modifie. Un appareil neuf part des valeurs du prototype : il montre exactement le prototype.
- **Les états du prototype restent des scénarios de démonstration.** Une adresse d'état du prototype
  (`?st=vide`, `?st=nouveau`…) montre cet état, pour la comparaison au pixel ; sans elle, l'écran suit les données.
- **Mêmes balises, vrais contrôles.** Un champ reste `.inp` avec un vrai `<input>` dedans ; un code reste
  `.otp` avec `SaisieCode` ; un choix reste une puce ou un bouton radio, qui s'allume sur place.
- **Chaque page** : analyse (ce qui est figé, mort, truqué), réécriture, test de gestes, comparaison au pixel
  inchangée pour les états du prototype (un état qu'un ajout change est écarté avec sa raison), traduction
  anglaise des textes ajoutés, puis commit.

## Causes communes relevées par l'audit (3 oct.)

1. Aucun vrai champ de saisie (41 fichiers dessinent des champs en texte).
2. L'issue d'une action est un lien vers un état du prototype (« Valider » mène toujours à `st=ok`).
3. Les identifiants de l'adresse sont ignorés (`useEtat` retombe sur l'état par défaut) : 2 302 liens
   montrent le mauvais produit, la mauvaise commande, le mauvais document.
4. Rien ne change dans les données (panier, sauvegardés, adresses, moyens de paiement, notifications lues).
5. Les +/− du panier sont des `<span>` sans action ; ceux de la fiche changent d'adresse.
6. Commandes mortes : `<button>` sans action (37 fichiers), `href="#"` (18 fichiers).
7. Session figée : connexion, inscription et déconnexion ne changent rien.

## Suivi

### Lot 1 — Mon compte
- [x] Modifier mon profil, changer d'e-mail (DP-52)
- [x] Mon compte (compteurs, solde, relais, adresse, moyens, avis, déconnexion ; « Mon profil » ajouté)
- [x] Changer de numéro (deux codes réels, opérateur au préfixe, numéro déjà pris refusé, codes renouvelés)
- [x] Adresses de livraison (liste, ajout, modification, suppression confirmée, adresse par défaut, zone servie)
- [x] Moyens de paiement (ajout par code SMS, opérateur reconnu, par défaut, retrait confirmé ; numéro du compte gardé)
- [x] Portefeuille (recharge et retrait réels, montant libre, règles du moteur : minimums, plafond, 72 h, plafond du jour, frais du 2e retrait ; historique ; œil)
- [x] Factures (liste des données, aperçu de la bonne commande, vrai PDF : partage et enregistrement)
- [x] Avis à donner, avis bas (état selon la commande : pas retirée, fermée, envoyé ; étoiles, commentaire, photo ; note basse → feuille ; modification dans la fenêtre)
- [x] Messagerie et conversations (lues à l'ouverture, envoi réel, photo versée au dossier, numéros/e-mails/liens masqués, demande au support ; ordre du serveur)
- [x] Rappel (créneau, envoi, annulation) — avec la page Aide
- [x] Aide, FAQ (recherche, thèmes, WhatsApp)
- [x] Pages légales (huit documents, langue du document, PDF, acceptation du compte ; DP-06 et DP-23 appliqués aux textes)
- [x] Réglages (thème automatique suivi en direct, mesure d’audience avec accord), notifications (choix enregistrés sur le compte, alertes critiques expliquées, numéro non vérifié)
- [x] Supprimer mon compte (refus motivé : commandes, litiges, solde du portefeuille à retirer ; code SMS ; compte effacé, retour en visiteur)
- [x] Devenir vendeur (nom proposé puis contrôlé, catégorie, statut ; boutique ouverte et gardée ; état de la pièce lu dans les données ; lien copié ; bannière du compte)

### Lot 2 — Numéro et connexion (CL-03)
- [x] Connexion par Google ou Apple : la session s'ouvre, retour à la page demandée ; pages du compte gardées
- [x] Connexion par e-mail (compte retenu, mot de passe vérifié, 5 essais puis 15 min), inscription (prénom, e-mail, mot de passe contrôlés ; une adresse = un compte), mot de passe oublié (lien par e-mail, même réponse pour tous)
- [x] Ton numéro (pays avec recherche, numéro contrôlé, opérateur reconnu, canal SMS ou WhatsApp, code réel, numéro déjà pris, issue selon l'entrée) ; page « Numéro et connexion » ajoutée
- [x] Adresse (GPS réel, OpenStreetMap, quartier trouvé, enregistrement réel) ; Mes adresses enrichie (instructions, qui reçoit, moment, photo de l'entrée, zones, ouvrir et partager)
- [x] Connexion sans états écrits d'avance, centres d'intérêt (rangent les catégories), relais par GPS et carte, notifications demandées au téléphone, première commande en liste, Face ID, conditions acceptées par version

### Lot 3 — Panier et paiement (CL-07, CL-08, fiche, galerie, question, avis)
- [x] Panier (photo du porteur), achat (relais ou domicile à l'achat, moyens, comptoir), attente Mobile Money, confirmation, comptoir validé, échec, paiement express
### Lot 4 — Catalogue et recherche (CL-04 hors accueil, CL-05, Menu)
- [x] Fiche (photo du porteur), galerie, avis, catégories, liste, promotions, sélection, recherche, saisie, résultats, filtres, rien trouvé, choix du relais
### Lot 5 — Commandes et codes (CL-09, CL-10)
- [x] Commandes, commande, code (biométrie, QR), retrait confié, suivi, comptoir et paiement au retrait, notifications, garde, SMS, écran verrouillé, lien court
### Lot 6 — Litiges, retours, annulations, modifications, payeur (CL-11, CL-12)
- [x] Mes litiges, signaler un problème, litige ouvert, suivi du litige (dossiers en données, vraies photos, arrangement, contestation, retrait)
- [x] Retour par le relais, remplacement (autre vendeur ou remboursement), arrangement, constat au comptoir, remboursement immédiat
- [x] Annuler une boutique (frais recalculés), modifier, changer de relais (transfert) ou d'adresse, diaspora, payeur, preuve de retrait ; prix vérifiés avant de payer
### Lot 7 — Modules d'après le lancement (CL-14, CL-15)
- [x] Prime (remise au paiement), cagnotte, parrainage, listes d'envies, ventes flash, assistant
- [x] Mise de côté, cotisation, panier famille, rentrée, reprise, commande par WhatsApp ; kit des composants ; connexion et données

## À valider par le porteur (choix faits en rendant les pages logiques)

- **Supprimer mon compte** : refusé aussi tant qu'il reste de l'argent sur le portefeuille (DP-06 : l'argent est
  au client ; il le retire vers Mobile Money avant de partir). Ligne « Ton portefeuille : 45 000 F » ajoutée à la
  liste du refus.
- **Pages légales** : les textes suivent DP-06 et DP-23 (remboursement sur le Portefeuille BelivaY ou sur la
  carte qui a payé ; carte Visa ou Mastercard pour tous, jamais pour une commande payée au comptoir). Les écrans
  de litige et de retour (lot 6) disent encore « sur le moyen qui a payé » : ils seront alignés avec leur lot.
- **Rappel** : le serveur place l'appel aujourd'hui si le créneau n'est pas passé, sinon demain ; hors des heures
  du support, « Dès que possible » veut dire demain dès 7 h.
- **Notifications** : toucher une alerte critique explique pourquoi elle reste activée (un texte par alerte :
  Commande, Retrait, Incident, Paiement ; seul celui de Retrait vient du prototype).
- **Devenir vendeur** : nom de boutique de 3 à 40 caractères, unique ; la pièce d'identité se donne dans l'espace
  vendeur (« Vérifier ma pièce maintenant » y mène) ; la bannière du compte montre la boutique ouverte.
- **Litige-auto et DP-10** : l'écran « Remboursé tout de suite » rembourse un petit montant sans retour de
  l'article (« Tu n'as rien à rapporter »), alors que DP-10 fait passer tout retour par le relais. Gardé tel que le
  prototype, payé par BelivaY : à confirmer, ou à faire suivre d'un retour au relais.
- **Prime** : la remise s'applique au paiement (livraison de base offerte de 10 000 à 30 000 F en relais ; à domicile
  3 offertes dès 15 000 F puis −50 %) ; les jours de garde en plus ne sont pas encore appliqués au calcul de la
  garde (le moteur garde.py les attend après le lancement). Le compte du jeu d'essai est abonné à Prime depuis le
  24 sept. : la cagnotte en attente se calcule (2 % de BLV-52107) et diffère du chiffre figé du prototype.
- **Mise de côté** : nombre de versements = le plus petit entre le rythme (60 jours au plus) et des versements de
  10 000 F au moins ; il retrouve exactement les plans du prototype.
- **Cotisation** : objectif = prix livré figé + 2 % ; hausse de plus de 5 % au moment de commander : compléter ou
  rembourser (« choisir un autre cadeau » n'est pas proposé).
- **Panier famille** : classe du colis par le poids (S ≤ 5 kg, M ≤ 15 kg, L ≤ 30 kg) ; au-delà, deux paniers.
- **Reprise** : estimation = cote du modèle × état déclaré ; minimum à 78 % du maximum (retrouve 32 000 – 41 000 F).
- **Compte neuf** : il ne voit plus les commandes ni les notifications du jeu d'essai.
- **Écran « Retirer un article » (panier-retrait)** : écran du prototype, plus relié à rien (le panier gère le
  retrait et son annulation) ; laissé tel quel, la consigne étant de ne plus toucher au panier.
