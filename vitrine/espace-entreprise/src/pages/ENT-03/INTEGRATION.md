# ENT-03 et ENT-04 — changements communs demandés (vague d'intégration)

Fichiers communs touchés par ces groupes (au plus juste) :
- `src/demo/lectures.ts` : `demoContrat` et `demoVehicules` sortis dans `src/demo/contrat.ts` et `src/demo/vehicules.ts`
  (réexportés depuis `lectures.ts` : `source-demo.ts` inchangé).
- `src/calculs/flotte.ts` (+ `flotte.test.ts`) : nouveau fichier, lecteurs typés des paramètres des deux groupes
  (classes par véhicule, invitation, certification, poids du Trust Score, santé de zone, pluie, préavis, MDP-LONG…).

À faire dans la coque commune :
1. **Marque panier sur les pages secondaires (ordinateur, tablette)** : `BarreTitre` devrait poser, à droite du titre
   d'une page qui a un parent, la marque panier BelivaY (`ibtn cart`, lien vers l'accueil), comme l'en-tête enfant du
   téléphone et l'espace vendeur. En attendant, `EcranEnt` (`ENT-03/outils.tsx`) le fait pour nos écrans.
2. **ENT-03-R02** : sur le tableau de bord, la barre du haut ne garde que le rôle (la pastille du pilote y fait doublon).
3. Bandeau d'état de la coque + héros d'état de l'écran ENT-P27 : deux messages sur la même page ; masquer le bandeau
   de la coque sur la route `etat`.

Paramètres à ajouter au registre de l'entreprise (valeurs aujourd'hui lues ailleurs ou techniques) :
- `MDP-LONG` (DP-04) : lu dans `logique-metier/parametres-en-vigueur.json` faute d'être dans l'extraction ENT.
- `ENT-PIECE-RESOLUTION-MIN` (proposé : 600 px sur le petit côté) : seuil de lisibilité d'une photo de pièce
  (`ChoixFichier.tsx`, constante en attendant).
- Échéance rouge d'un paquet au tableau de bord : réglé, `ENT-TDB-ECHEANCE-ROUGE` (10 min, ENT-03-R12) au registre ;
  `seuil_anneau_rouge` (5 min) reste celui de l'anneau de ENT-P10.

Règles qui se contredisent (signalées, DP-60) :
- **Zones non exploitées** : ENT-RG-R53 et ENT-P04R-04 (décidées) les disent déclarables sans paquet ; DED-23 (déduite)
  refuse la déclaration. Appliqué : déclarable, « en attente d'ouverture », aucun paquet (les deux sens tenus).
- **Trust Score de l'entreprise** : le tableau lit le domaine `score` (ENT-07) ; sa démonstration rend 50 fixe alors
  que ENT-TSC-PRIOR (µ = 50, k = 10) et la moyenne pondérée des livreurs donneraient une autre valeur.
- **Point relais de l'agence (deux espaces)** : aucune application relais dans le dépôt ; le choix de l'espace ouvre
  `https://belivay.com/relais/` (domaine unique DP-38) en attendant son adresse réelle.

Événements émis (journal signé `src/demo/journal.ts`, pour la console) : rider.updated | suspended | reinstated |
removed | approved | notified | note, trust.evidence_added, courier_invitation.sent | resent | cancelled | blocked |
resubmit_requested, zone.declared | updated | state_changed, vehicle.created | updated | document_updated |
plate_duplicate, document.submitted, contract.accepted, company.profile_updated, price_grid.revision_requested,
account.appeal_filed, auth.login | failed | password_reset | invitation_used.

## Enrichissement (BRIEF-ENRICHISSEMENT, 12 oct.) — ENT-03 et ENT-04
- Kit unique (`composants/prototype.tsx`, `contenu.css`) ; plus aucune classe `.ea-*` ; formulaires en `Champ` (C.fld).
- Connexion : code SMS rempli seul (WebOTP, code entier collé ou suggéré réparti dans les cases) ; lien « Appareils et
  dernières connexions » (→ Sécurité et équipe).
- Tableau de bord : comptes à rebours en direct (`useRestant` du kit, à la seconde dans la dernière heure) ; recherche ⌘K, raccourcis et cloche à panneau dans la coque.
- Contrat : version en PDF (`exporterPdf` du kit, `donnees/exports.ts`) et impression. État du compte : « Pourquoi ces limites ? »
  (plafond, capacité, vendredi, valeurs du registre) et recours expliqué.
- Zones : export CSV de la capacité ; un quartier trouvé ouvre sa zone sur la carte. Flotte : tri (Trust Score,
  missions du jour, en tournée), export CSV, lien Planning. Fiche du livreur : position en direct (tuile OSM, en
  mission), relevé d'activité en PDF, pièces qui expirent en jours, annuler une suspension (10 s). Ajout : brouillon
  repris (sessionStorage). Véhicules : filtre des documents (assurance expirée ou à renouveler, carte grise).
- Écarté : ligne qu'on glisse (Appeler / Suspendre) — une suspension exige un motif écrit et l'appel n'est ouvert qu'en
  mission ; code d'activation masqué — l'entreprise n'en voit aucun (le livreur le reçoit par SMS) ; recadrage de la
  photo du véhicule — `Rognage` n'a que les formes rond et bandeau, impropres à une plaque.

- Cartes OSM (zones, connexion, position d'un livreur) : fond commun `src/composants/CarteOsm.tsx` (+ `carte-osm.css`),
  lecteur de tuiles maison dans le SVG, sans dépendance ; plan schématique hors ligne, tuile en échec ou sous
  `navigator.webdriver` ; « Données économes » au téléphone : fond sur demande. Test : `tests/carte-osm.spec.ts`.
