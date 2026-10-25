# Publicité (DP-59) : de la campagne du vendeur à l'écran du client, et retour

Chaque produit payant acheté dans l'espace vendeur (AJ-P) a son exécution côté client. Trois temps :
**entrée** (campagne créée, payée ou acceptée), **sortie** (affichage au bon endroit, aux bonnes dates, au bon prix ou
au bon rang), **retour** (impressions, clics, ventes, dépense, solde, remboursement, fin).

Serveur : `backend-kit/apps/publicite` (services.py, views.py). Site : `src/composants/Annonces.tsx`,
`src/donnees/annonces.ts`, `src/pages/CL-04/AccueilContenus.tsx`, `src/pages/CL-04/PourVous.tsx`.
Démonstration : `src/demo/annonces.ts` lit et écrit l'état de l'espace vendeur (`blv_v_demo_publicite`,
`blv_v_demo_aja_promotions`, même appareil, même origine) ; sans lui, une copie de son jeu d'essai.

## Chaînes

| Produit | Entrée (vendeur) | Sortie (client) | Retour (vendeur) |
|---|---|---|---|
| **Sponsorisé au clic** | AJ-P « Sponsorisé » → `POST /api/vendors/ads/campaigns/new` (enchère, budget du jour, lieu recherche / catégories) ; refus : sous le plancher, budget minimum, produit non éligible (stock, Trust Score, litige) → 422 `annonce_refusee` | `GET /api/sponsored/placements` : annonces éligibles rangées par l'enchère, dans le budget du jour et le solde ; mêlées aux résultats de la recherche (`CL-05/Commun.tsx`), des listes de catégorie (`CL-04/VueListe.tsx`), des rangées de l'accueil et du flux « Pour vous » (`RangeeSponsorisee`, `FluxPourVous`) : 20 % au plus, 2 sur 10, **1 sur 6 au téléphone**, jamais au-dessus d'une offre moins chère et mieux notée ; étiquette « Sponsorisé » | Impression `POST /api/sponsored/impressions` (à moitié visible ; une par client, campagne, emplacement et visite) → `Campagne.impressions` ; clic `POST /api/sponsored/clicks` facturé une fois par client et par jour au second prix + 1 F → `Clic`, débit du solde (`Mouvement` clic) ; vente attribuée au dernier clic sous 7 jours (`a_l_entree`) ; stats AJ-P (`stats()`), facture du mois |
| **Pause / budget épuisé / solde vide** | AJ-P « Mettre en pause », budget du jour atteint, solde à 0 | Plus renvoyée par `placements` à la lecture suivante ; le site relit les annonces à chaque ouverture d'écran (aucun cache entre deux écrans) ; un clic sur une annonce en pause n'est jamais facturé | Rien n'est débité ; l'écran AJ-P montre « en pause » / budget atteint |
| **À la une / carrousel (semaine)** | AJ-P → `POST /api/vendors/ads/slots/book` (tarif fixe au prorata, débité aussitôt) ou enchère de la semaine (`attribuer_semaine` : gagnant débité au second prix, perdant rien) ; refus : complet, semaine passée, solde insuffisant, non éligible | `GET /api/sponsored/home` : places actives de la semaine (`debut ≤ t < fin`), en **rotation pondérée par le montant payé** (`rotation`) ; téléphone : carrousel en tête, « À la une » juste sous les Ventes flash ; dès 1200 px : encart « À la une · Promos » sous les Ventes flash, colonne droite (`EncartDroite`) ; étiquette « Sponsorisé » | Impressions (`une`, `carrousel`) et clics comptés, jamais facturés (forfait) ; ventes attribuées au clic ; arrêt par le vendeur : heures non diffusées rendues au solde (`arreter` → `rembourser_heures`, `Mouvement` remboursement) ; fin de semaine : plus montrée |
| **Vente flash sur sélection** | AJ-P → `POST /api/vendors/ads/flash` (remise ≥ 10 %, 48 h au plus, stock ≤ 5) ; réponse BelivaY (`selectionner_flash`) : acceptée → `OffreFlash` + vente flash dans Promotions (prix payé) ; refusée → visible dans AJ-P ; arrêtée dans Promotions → offre finie chez le client et campagne terminée (`flash_arretee_en_promotions`) | `GET /api/sponsored/home` (`flash`, avec le jeton `annonce`) : en tête de la bande Ventes flash, au **prix flash** ; même prix au panier (`ajouterFlash`) ; compte à rebours jusqu'à la vraie fin | Impression (`flash`) et clic comptés ; commission majorée figée à l'entrée de la commande (`a_l_entree`) ; arrêt dans AJ-P ou dans Promotions : l'offre s'arrête aussitôt chez le client |
| **Boost (24 h / 7 j)** | AJ-P → `POST /api/vendors/ads/boost` (forfait débité) ; refus : solde insuffisant, Boost déjà en cours, non éligible | `placements.boosts` + `jetonsBoost` : rang × 1,5 au plus au tri « pertinence » (`classerAvecBoost`), sans étiquette (le mérite reste) | Impression (`boost`) et clic comptés, jamais facturés ; ventes attribuées au clic ; arrêt : heures rendues au solde ; fin : plus de Boost |
| **Signaler une annonce** | — | Feuille « Pourquoi je vois ceci ? » → « Signaler cette annonce » (5 motifs) → `POST /api/sponsored/reports` ; l'annonce est aussitôt masquée pour ce client | `Signalement` (un par client et par campagne), relu par la console (admin) |

## Garde-fous côté client

- Étiquette « Sponsorisé » toujours visible, qui ouvre « Pourquoi je vois ceci ? ».
- Partie haute de l'accueil inchangée (consigne 2) : le carrousel reste dans la colonne centrale sur ordinateur.
- Densité : 20 % des positions au plus hors zones dédiées (carrousel, À la une, Ventes flash) ; 1 carte sur 6 au
  téléphone (`reglesEcran`) ; une campagne n'est placée qu'une fois par écran (`prises`), jamais sur un produit déjà
  montré dans un emplacement acheté.
- Plafond de répétition : une annonce au clic, 5 affichages par visite au plus (`REPETITION_MAX`).
- Aucune publicité sur panier, paiement, commandes, code de retrait, comptoir, garde, litiges, retours (`pubPermise`).

## Sécurité

- Aucune donnée client vers le vendeur : il ne voit que des totaux (impressions, clics, ventes, dépense) ; le client
  est une empreinte anonyme (`v:` + SHA-256 de l'adresse et du navigateur) ou son identifiant interne, jamais montré.
- Jetons d'annonce signés par le serveur (`signing`, 24 h) : le site ne fabrique ni ne modifie un coût ; aucune clé ni
  secret côté site.
- Anti-fraude : un clic facturé par client, annonce et jour ; une impression par client, campagne, emplacement et
  visite ; une campagne arrêtée n'est plus comptée ; limites de débit des routes publiques (`LIMITES` : 60 clics,
  300 impressions par minute, 10 signalements par heure ; au-delà 429 `trop_de_requetes`, rien n'est compté).

## Reste à brancher

- Produit d'un emplacement devenu non éligible en cours de semaine : le serveur ne le montre plus ; le remboursement
  des heures non diffusées est fait par la console (`rembourser_heures`), pas encore par une tâche automatique (la
  démonstration de l'espace vendeur, elle, le calcule).
- `VENTE_JOURS` (7 jours d'attribution) et `VISITE_S` (12 h de visite) : paramètres à ajouter au registre.
- Démonstration : l'iPhone 15 Pro Max de la boutique de l'espace vendeur n'a pas de fiche dans le catalogue du site ;
  ses campagnes n'y sont pas montrées. Le catalogue de démonstration a 30 produits, presque tous déjà sur l'accueil :
  le flux « Pour vous » y est court (il se remplit avec le vrai catalogue).
