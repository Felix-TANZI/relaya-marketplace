# Liste des pages (DP-54) — état au scan final du 4 oct. 2026

Chaque page doit avoir tout ce dont elle a besoin et être cliquable de bout en bout (front-end), avec de vraies
saisies et de vraies issues. « Reprise » : sortie de la comparaison au pixel parce que refaite pour l'usage réel
(`"repris"` dans son `construits.json`). « Contrôles morts » : compté par `python3 outils/morts.py` (lien vers un état
écrit d'avance du prototype, lien « # » sans action, bouton sans action, `data-act`).

130 routes reprises sur 141. Les autres routes non reprises ont été rendues logiques en DP-53 et restent
comparées au prototype (compte, portefeuille, messagerie, aide…), ou sont hors périmètre (accueil, panier).

| Lot | Route | Reprise | Contrôles morts | Note |
|---|---|---|---|---|
| CL-01 | `kit` | oui | 0 |  |
| CL-03 | `bienvenue` | oui | 0 |  |
| CL-03 | `interets` | oui | 0 |  |
| CL-03 | `connexion` | oui | 0 |  |
| CL-03 | `connexion-email` | oui | 0 |  |
| CL-03 | `mdp-oublie` | oui | 0 |  |
| CL-03 | `numero` | oui | 0 |  |
| CL-03 | `numero-changer` | oui | 0 |  |
| CL-03 | `relais-choix` | oui | 0 |  |
| CL-03 | `premiere-commande` | oui | 0 |  |
| CL-03 | `adresse` | oui | 0 |  |
| CL-03 | `notifs-proposition` | oui | 0 |  |
| CL-03 | `cgu` | oui | 0 |  |
| CL-03 | `ouverture` | oui | 0 |  |
| CL-03 | `lancement` | oui | 0 |  |
| CL-03 | `faceid` | oui | 0 |  |
| CL-04 | `accueil` | — | 17 | hors périmètre (DP-54 : ne plus toucher) |
| CL-04 | `categories` | oui | 0 |  |
| CL-04 | `liste` | oui | 0 |  |
| CL-04 | `selection` | oui | 0 |  |
| CL-04 | `promotions` | oui | 0 |  |
| CL-05 | `recherche` | oui | 0 |  |
| CL-05 | `recherche-saisie` | oui | 0 |  |
| CL-05 | `recherche-resultats` | oui | 0 |  |
| CL-05 | `recherche-zero` | oui | 0 |  |
| CL-05 | `recherche-filtres` | oui | 0 |  |
| CL-05 | `relais-selecteur` | oui | 0 |  |
| CL-06 | `fiche` | oui | 0 |  |
| CL-06 | `galerie` | oui | 0 |  |
| CL-06 | `avis` | oui | 0 |  |
| CL-06 | `question` | oui | 0 |  |
| CL-07 | `panier` | oui | 0 | hors périmètre (DP-54 : ne plus toucher) |
| CL-07 | `panier-retrait` | — | 3 | prototype, plus relié (panier : ne plus toucher) |
| CL-07 | `sauvegardes` | oui | 0 |  |
| CL-08 | `paiement-attente` | oui | 0 |  |
| CL-08 | `prix-change` | oui | 0 |  |
| CL-08 | `paiement-echec` | oui | 0 |  |
| CL-08 | `paiement-moyen` | oui | 0 |  |
| CL-08 | `confirmee` | oui | 0 |  |
| CL-08 | `validee` | oui | 0 |  |
| CL-08 | `xp-pay` | oui | 0 |  |
| CL-09 | `commandes` | oui | 0 |  |
| CL-09 | `commande` | oui | 0 |  |
| CL-09 | `code` | oui | 0 |  |
| CL-09 | `code-partage` | oui | 0 |  |
| CL-09 | `suivi` | oui | 0 |  |
| CL-09 | `comptoir-payer` | oui | 0 |  |
| CL-09 | `comptoir` | oui | 0 |  |
| CL-10 | `notifications` | oui | 0 |  |
| CL-10 | `notifs-reglages` | oui | 0 |  |
| CL-10 | `garde` | oui | 0 |  |
| CL-10 | `push` | oui | 0 |  |
| CL-10 | `sms` | oui | 0 |  |
| CL-10 | `lien-court` | oui | 0 |  |
| CL-11 | `litige` | oui | 0 |  |
| CL-11 | `litige-confirme` | oui | 0 |  |
| CL-11 | `litige-auto` | oui | 0 |  |
| CL-11 | `litige-comptoir` | oui | 0 |  |
| CL-11 | `litige-suivi` | oui | 0 |  |
| CL-11 | `litige-arrangement` | oui | 0 |  |
| CL-11 | `litiges` | oui | 0 |  |
| CL-11 | `retour` | oui | 0 |  |
| CL-11 | `remplacement` | oui | 0 |  |
| CL-12 | `modifier` | oui | 0 |  |
| CL-12 | `annuler` | oui | 0 |  |
| CL-12 | `annuler-confirmer` | oui | 0 |  |
| CL-12 | `changer-relais` | oui | 0 |  |
| CL-12 | `changer-adresse` | oui | 0 |  |
| CL-12 | `payeur` | oui | 0 |  |
| CL-12 | `payeur-preuve` | oui | 0 |  |
| CL-12 | `diaspora` | oui | 0 |  |
| CL-13 | `compte` | — | 0 |  |
| CL-13 | `adresses` | oui | 0 |  |
| CL-13 | `moyens-paiement` | oui | 0 |  |
| CL-13 | `factures` | — | 0 |  |
| CL-13 | `supprimer` | — | 0 |  |
| CL-13 | `avis-donner` | — | 0 |  |
| CL-13 | `avis-bas` | — | 0 |  |
| CL-13 | `aide` | oui | 0 |  |
| CL-13 | `faq` | — | 0 |  |
| CL-13 | `messagerie` | oui | 0 |  |
| CL-13 | `fil` | — | 0 |  |
| CL-13 | `rappel` | oui | 0 |  |
| CL-13 | `legal` | oui | 0 |  |
| CL-13 | `legal-doc` | oui | 0 |  |
| CL-13 | `reseau` | oui | 0 |  |
| CL-13 | `reglages` | oui | 0 |  |
| CL-13 | `wallet` | — | 0 |  |
| CL-13 | `devenir-vendeur` | — | 0 |  |
| CL-14 | `abonnements` | oui | 0 |  |
| CL-14 | `abonnement-souscrire` | oui | 0 |  |
| CL-14 | `mon-abonnement` | oui | 0 |  |
| CL-14 | `abonnement-resilier` | oui | 0 |  |
| CL-14 | `cagnotte` | oui | 0 |  |
| CL-14 | `parrainage` | oui | 0 |  |
| CL-14 | `abonnement-offrir` | oui | 0 |  |
| CL-14 | `listes` | oui | 0 |  |
| CL-14 | `liste-creer` | oui | 0 |  |
| CL-14 | `liste-envies` | oui | 0 |  |
| CL-14 | `liste-envoyer` | oui | 0 |  |
| CL-14 | `liste-publique` | oui | 0 |  |
| CL-14 | `liste-offrir` | oui | 0 |  |
| CL-14 | `liste-offert` | oui | 0 |  |
| CL-14 | `ventes-flash` | oui | 0 |  |
| CL-14 | `assistant` | oui | 0 |  |
| CL-14 | `assistant-confirmer` | oui | 0 |  |
| CL-15 | `rentree` | oui | 0 |  |
| CL-15 | `rentree-liste-papier` | oui | 0 |  |
| CL-15 | `rentree-classe` | oui | 0 |  |
| CL-15 | `rentree-liste` | oui | 0 |  |
| CL-15 | `rentree-panier` | oui | 0 |  |
| CL-15 | `rentree-suivi` | oui | 0 |  |
| CL-15 | `ecole` | oui | 0 |  |
| CL-15 | `cotisation` | oui | 0 |  |
| CL-15 | `cotisation-partager` | oui | 0 |  |
| CL-15 | `cotisation-participer` | oui | 0 |  |
| CL-15 | `cotisation-suivre` | oui | 0 |  |
| CL-15 | `cotisation-atteinte` | oui | 0 |  |
| CL-15 | `cotisation-echue` | oui | 0 |  |
| CL-15 | `cote` | oui | 0 |  |
| CL-15 | `cote-plan` | oui | 0 |  |
| CL-15 | `cote-suivre` | oui | 0 |  |
| CL-15 | `cote-versement` | oui | 0 |  |
| CL-15 | `cote-fini` | oui | 0 |  |
| CL-15 | `cote-annuler` | oui | 0 |  |
| CL-15 | `troc` | oui | 0 |  |
| CL-15 | `troc-offre` | oui | 0 |  |
| CL-15 | `troc-depot` | oui | 0 |  |
| CL-15 | `troc-inspection` | oui | 0 |  |
| CL-15 | `troc-contre-offre` | oui | 0 |  |
| CL-15 | `troc-payer` | oui | 0 |  |
| CL-15 | `famille` | oui | 0 |  |
| CL-15 | `famille-destinataire` | oui | 0 |  |
| CL-15 | `famille-payer` | oui | 0 |  |
| CL-15 | `famille-mensuel` | oui | 0 |  |
| CL-15 | `famille-preuve` | oui | 0 |  |
| CL-15 | `wa` | oui | 0 |  |
| CL-15 | `wa-proposition` | oui | 0 |  |
| CL-15 | `wa-confirmer` | oui | 0 |  |
| CL-15 | `wa-lien` | oui | 0 |  |
| CL-15 | `wa-suite` | oui | 0 |  |
