# ENT-08 — changements hors du groupe

Voir `../ENT-07/INTEGRATION.md` (les deux groupes ont été faits ensemble) : fichiers communs touchés, marque panier
des pages secondaires à reprendre par la coque, paramètres à ajouter au registre, liens attendus. Les écrans d'ENT-08
réutilisent les pièces de `ENT-07/commun.tsx` et `ENT-07/ent07.css`, plus `ENT-08/ent08.css`.

## Emballages / messages / notifications (reprise sur le prototype)
- Domaine `emballages` : il manque, pour remplir les blocs du prototype comme prévu, la consommation datée
  (étiquette → paquet → formats → livreur, par jour), le ruban de scellé (rouleaux avancés, remis), la référence du
  bon de remise (BR-…) et les dimensions des formats (aujourd'hui constante `DIM` d'Emballages.tsx, reprise de la règle
  des formats du registre ENT-EMB ; à servir par le registre ou le domaine). En attendant : consommation par plage
  d'étiquettes, contrôle « avancé − consommé − abîmé », titre « Dernier bon de remise » sans numéro.
- `src/demo/prix.ts` (`demanderRevision`) : le fil « Révision de grille » est créé avec `messages: []` ; y écrire le
  message de la demande (de: 'moi') pour que `messages?fil=<id>` l'affiche comme un message (aujourd'hui : ligne système
  reprenant `dernier`).
- Domaine `messages` : pas de fil « Opérateur de zone » au jeu d'essai (le prototype en montre un) ; à ajouter si le
  porteur le confirme.
- Route `notifications` : `etroit` retiré (grille g21 du prototype en pleine largeur).

## Paramètres / rapports / intégrations (reprise sur le prototype)
- Routes ajoutées (routes.ts, `parent: 'parametres'`) : `parametres-journal` (Journal des modifications, lié depuis
  « Utilisateurs internes et rôles ») et `mes-donnees` (export de mes données avec code SMS, lié depuis « Mot de passe
  et sécurité »). `npm run inventaire` à relancer par l'agent principal.
- « Mon profil » n'est plus dans Paramètres (absent du prototype ; la page Profil d'un autre agent le porte). Le Menu
  (coque, `MenuProfil` / carte du profil) mène encore à `parametres#profil` : à repointer vers la page Profil.
- Domaine `parametres` : pas de date du dernier changement de mot de passe (lue faute de mieux dans le journal,
  ligne « Mot de passe … » de l'utilisateur) ; un champ `motDePasseChangeLe` serait plus sûr. Pas de zone du point
  de stockage (déduite du nom de zone écrit dans l'adresse) : un champ `zone` est attendu. Déconnexion d'un appareil
  à l'unité gardée côté domaine ; l'écran fait « Déconnecter les autres appareils » comme le prototype.
- Domaine `reglements` : l'ancien moyen « remplacé » (état s=revue du prototype) n'est pas servi ; seul le moyen
  courant (vérifié ou en revue, avec `bloqueJusqua`) est montré. Durée du blocage (7 jours au prototype) non écrite :
  à lire du registre si l'écran doit la citer.
- Domaine `rapports` : il manque, pour remplir tous les blocs du prototype, les prestations par zone et par type
  (`parZone[].prestations`, `parType[].prestations` : le panneau « Prestations par zone » s'affiche dès qu'elles sont
  servies) et les indicateurs délai d'acceptation, délai de ramassage, taux de réussite, incidents par famille,
  litiges perdus, délai moyen (aujourd'hui : les neuf indicateurs définis du domaine, dans les tuiles du prototype).
  Le tableau par livreur montre des pourcentages (le prototype : « 44 / 44 ») faute des comptes bruts.
- Domaine `integrations` : quand `actives` passera à vrai, l'écran montre l'état « Aucune clé d'API » ; l'API des
  clés, des adresses de rappel et du journal (états s=active et s=echec du prototype) reste à décrire.

## Enrichissements (P21 à P26, lot l/e-ent-2)
- Route ajoutée : `integrations-cles` (ENT-P26, parent `integrations`, propriétaire) : `npm run inventaire` à relancer
  (src/genere/pages.json), puis `node outils/connecteurs.mjs` (CONNECTEURS-ENTREPRISE.md : 2 méthodes `rapports`,
  8 méthodes `integrations`, état « serveur » : routes à écrire côté backend-kit).
- Domaines étendus : `rapports.programme/programmer` (rapport du vendredi), `integrations.espace/creerCle/revelerCle/
  regenererCle/ajouterRappel/retirerRappel/essayerRappel/appelDeTest` ; `RefusParametres` gagne `plage` (plage calme
  validée 0-23 h, deux heures différentes). Démo : 22 notifications ; exports de rapports en vrai PDF (`pdfBinaire`) et
  CSV « ; » ; `demo/parametres.ts` exporte `auteur` et `journaliser` (journal des clés et du rapport programmé).
- Hors du groupe, rien de modifié : enrichi.tsx, fileHorsLigne.ts, exports.ts employés tels quels.

### Pour le kit et la coque
- `Recherche` (enrichi.tsx) n'a de style que dans `.dt-tools` (classe `srch` du prototype) : ENT-08 l'enveloppe dans
  `.e8-q` pour la styler ailleurs. Un style de `.e-srch` hors barre d'outils dans enrichi.css servirait tous les groupes.
- `Interdit` écrit les rôles avec « / » ; un « ou » traduit lirait mieux (« réservé au propriétaire ou au comptable »).
- MenuProfil / coque : la plage calme, le push et l'essai vivent dans Notifications ; un lien depuis la cloche
  (panneau sur ordinateur) vers `notifications` suffirait.
