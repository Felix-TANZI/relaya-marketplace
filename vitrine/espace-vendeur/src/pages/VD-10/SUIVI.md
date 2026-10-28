# VD-10 — Trust Score, palier et croissance : suivi

Onze écrans repris (statut « repris » dans `routes.ts`), aucun retiré. Sous-tâches (METHODE.md §3) : 1 balisage et
t() · 2 source démo, montants par `src/calculs` · 3 règles du registre, états vide / chargement / erreur / hors ligne ·
4 vraies saisies, aucun bouton mort · 5 enrichissement · 6 Préparation et anonymat · 7 liens · 8 animations ·
9 illustrations · 10 clair / sombre, FR / EN, 360–430 px · 11 test de gestes et test boutons · 12 vérification.

| Écran | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Mon palier (`palier`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Mon score (`score`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Les paliers (`paliers`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Sanctions et contrôle (`sanctions`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Contester une décision (`contester`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Les plans (`plans_liste`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Le simulateur (`plans`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Se faire voir (`visibilite`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Services (`services`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Mes chiffres (`chiffres`) | x | x | x | x | x | x | x | x | x | x | x | x |
| La demande (`demande`) | x | x | x | x | x | x | x | x | x | x | x | x |

Tests (PORT_VENDEUR=4187) : `tests/VD-10.gestes.spec.ts` 24/24 ; `tests/boutons.spec.ts` sur les 11 routes et leurs
4 états de feuille 15/15 (aucun élément sans effet) ; `tests/squelette.spec.ts` sur les 11 routes (360, 390, 430 px,
clair / sombre, FR / EN) 22/22 + dictionnaires, anonymat, routes ; en-têtes identiques au prototype 33/33 ; calculs
221/221 ; `tsc -b` et `npm run build` propres. Écran entier au pixel : différent par décision (voir INTEGRATION.md).

## Communs au groupe

- `commun.tsx` : Bouton, Plus (C.more), Segments, Ligne, Attente (squelette scintillant, erreur réseau avec
  « Réessayer », 403 « Réservé au propriétaire »), HorsLigne (dernières données et leur heure, VD10-R09), Feuille
  (voile, Échap, tirée vers le bas par les Animations du client), useToast, useCompteur (score et montants qui montent),
  useApparu (jauges qui partent de zéro), Anneau (arc qui se dessine), Courbe (score sur 30 jours), dates courtes.
- `conseils.tsx` : conseils concrets pour progresser, un geste par critère, tiré du travail du jour (commandes à
  préparer, litiges, retours) ; le critère qui peut rapporter le plus d'abord ; chacun mène à son écran.
- `vd10.css` : squelette, bandeau hors ligne, anneau, courbe, curseur réel, barres qui montent, toast, puces de filtre ;
  tout mouvement sous `html[data-mouv]` (coupé en mouvement réduit et sous navigateur piloté).
- Domaines : `trust` (score, statut du compte, décisions, contestation), `paliers` (GET /tiers complet), `plans`
  (plans, état, simulateur, essai, souscription et paiement Mobile Money, arrêt, récompenses au mérite, vente flash,
  services, chiffres, demande). Démonstration : `src/demo/{trust,paliers,plans}.ts`, montants par `src/calculs`
  (commission, plans, paliers, sanctions) ; paramètres lus au registre (aucune valeur dans le code, sauf les valeurs de
  console sans code au registre, regroupées dans `CONSOLE` et `SERVICES` de `demo/plans.ts`).

## Ajouts (enrichissement), écran par écran

- **Mon palier** : « Vos prochains gestes » (3 conseils concrets) ; alerte avant un seuil (montée ou descente, calcul
  `alerteDeSeuil`) ; descente proposée avec « Contester » et « Contestation envoyée · réponse avant … » ; palier de
  lancement ; ligne Sanctions avec la fréquence de contrôle ; lien « Voir mon score » ; bandeau hors ligne ; score qui
  monte et jauge qui glisse.
- **Mon score** : anneau qui se dessine, heure du dernier calcul ; courbe du score sur 30 jours avec le seuil suivant
  et la variation ; « Ce qui fera monter votre score » (4 conseils classés) ; journal des événements filtrable par
  critère, chaque événement ouvre sa commande ; score gelé ; barème lu dans la même table que le moteur.
- **Les paliers** : choix de l'article (ITEL ou iPhone : gains selon le prix, plancher DP-55 visible sur le Platine) ;
  jauge de position vers le palier suivant ; « Visite et audit » expliqués.
- **Sanctions** : quatre états de la carte (aucune, avertissement, visibilité réduite avec sa fin, suspension → Compte
  suspendu, descente) ; durées lues aux paramètres (14 jours, 30 jours au plus, 20 commandes probatoires) ; contrôle
  expliqué selon la raison (premières commandes, sous 70, renforcé, probatoire, au-dessus) ; historique avec
  contestation et réponse ; « Contester » seulement sur une décision non contestée ; historique indisponible.
- **Contester** : choix de la décision quand l'adresse n'en nomme pas ; vraie zone de texte avec compteur (40 à 1 000) ;
  vraies photos choisies sur l'appareil, datées, retirables (6 au plus) ; contestation d'un litige par `?ref=` (domaine
  litiges) ; déjà contestée : contestation, réponse ou heure limite (72 h ouvrées, dimanche non compté) ; retour à
  l'écran d'origine (`?depuis=`, liste fermée d'origines).
- **Les plans** : plan en cours (essai jusqu'au …, rappel le …, prochain paiement) ; « Arrêter » / « Garder » sans
  frais ; « Choisir Boost » au mois ou à l'année quand l'essai est utilisé ; demande de paiement Mobile Money et
  « J'ai confirmé sur mon téléphone », « Annuler la demande », refus « Paiement non confirmé. Rien n'a été activé. » ;
  message bref après chaque geste.
- **Le simulateur** : vrai curseur (clavier compris), une vente de l'article de référence par cran ; « Revenir à mes
  ventes du mois » ; payé au mois ou à l'année (remise plafonnée au prix annuel ÷ 12) ; nombre de ventes représenté ;
  son au changement de meilleur plan ; bouton qui suit le meilleur plan (Rester en Free, Essayer, Choisir, Garder,
  Revenir à Free).
- **Se faire voir** : refait au mérite (DP-14, Q-32, P-3) ; vitrine de quartier activée sans paiement (feuille
  `?achat=1`) avec minuteur de fin ; vente flash programmée avec saisie vérifiée de la remise (≥ 10 %, > 50 % relue) ;
  série en cours vers la prochaine récompense (jauge) et le geste pour la reprendre ; blocages (score < 50, rupture)
  avec le geste qui y remédie.
- **Services** : suivi de la demande (paiement en attente, visite prévue avant …, remboursement si l'agent ne vient
  pas) ; saisie assistée offerte à la boutique ; le frein « une seule photo » quitte La demande une fois l'agent payé.
- **Mes chiffres** : tout est lu dans les commandes (aucun chiffre écrit) ; base écrite sous le total (Q-83) ; barres
  par jour qui montent, touchables (montant du jour) ; export CSV ; jour fort mis en valeur.
- **La demande** : filtre des recherches, jauge relative par recherche, copie des mots cherchés, verrou Boost qui
  disparaît avec Boost, accès Préparation en lecture seule.

## Défauts et écarts corrigés (décisions du porteur)

- Descente « sous le seuil moins 5 » → sous le seuil du palier 14 jours (DP-21, DP-57 A-5) : Mon palier, Les paliers.
- « Platine tenu 6 mois » → 14 jours (DP-21) ; un palier demande aussi les conditions d'en dessous (A-6).
- Support « 24 h ouvrées / prioritaire 4 h / 2 h » → 2 h pour tous, 7 h–21 h, responsable de compte au Platine
  (DP-12, DP-56 Q-47).
- Offre de découverte : « 3 points de plus (3 % du prix) » → gain en francs (« 540 F de plus sur chaque ITEL »,
  DP-55 Q-03).
- Gain sur l'iPhone : 2 201 F (M01/M06) → calculé au barème seul, 1 554 F (M06 en attente, VD-D03.A01).
- Se faire voir : mise en avant 24 h payante, boost de catégorie, boost au résultat, campagne « favoris » et toute
  mention « Sponsorisé » retirés (DP-14, Q-32) ; le contenu de Boost et Pro ne promet plus de « mises en avant » ; la
  ligne de lecture « Vaut pour ses 2 mises en avant » du simulateur est retirée.
- Seuils de remboursement du simulateur : 463 000 / 694 000 F (prototype, continu) → 480 000 / 700 000 F (calculés sur
  des ventes réelles de l'article de référence ; même règle VD10-R27).
- Contrôle au ramassage, durées des sanctions, alerte de seuil : lus dans `src/calculs` (sanctions.ts, paliers.ts).
- Pastille de l'en-tête qui débordait (défaut 1 du prototype) : déjà corrigée par la coque.

## Écrans retirés

Aucun : les onze écrans servent le vendeur.

## Questions

- Données du service Scores (projection « environ 66 », issues des litiges 64 / 55, relevés de la nuit) : données de
  démonstration en attendant GET /tiers et GET /score.
- Prix des services et durées de console (3 000 F, 1 000 F, 5 000 F, 72 h, 1 000 000 F du curseur, Sur-mesure) : pas
  de code au registre vendeur ; regroupés dans `CONSOLE` et `SERVICES` (`demo/plans.ts`) en attendant les paramètres.
