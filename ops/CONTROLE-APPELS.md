# Contrôle des appels entre sites et serveurs (DEV-SRV-01, T10)

> « La vitrine n'appelle que `api-demo.belivay.com`, le site réel que `api.belivay.com`. Un seul appel croisé suffit à créer une fausse donnée en production. Terminé quand la liste des pages contrôlées est transmise, sans aucun écart. »

Le contrôle se fait en deux temps :

1. **automatique, avant chaque mise en ligne**, sur les écrans construits ;
2. **dans le navigateur**, sur le site en ligne, comme le demande le document.

## 1. Contrôle automatique des écrans construits

Une fois les écrans construits (par exemple `frontend/dist-seller`, `frontend/dist-admin`…) :

```sh
# Site réel
node ops/verifier-appels.mjs --api api.belivay.com frontend/dist-seller frontend/dist-admin

# Vitrine
node ops/verifier-appels.mjs --api api-demo.belivay.com <dossiers construits de la vitrine>
```

Le script liste toutes les adresses présentes dans les écrans. Il **échoue (code 1)** dans deux cas :

- l'API attendue manque ;
- une adresse interdite apparaît :
  - l'API de « l'autre monde » (`api-demo` pour le site réel, `api` pour la vitrine) ;
  - le serveur de développement (`localhost:8000`) ;
  - un déploiement Vercel ;
  - un tunnel ngrok.

Il affiche aussi, pour information :

- les autres adresses BelivaY (des liens, pas des appels d'API) ;
- les services externes : cartes, polices, connexion Google et Apple, bibliothèques.

Essai du 2026-11-09 sur l'espace vendeur construit vers `api.belivay.com` : **conforme**.

## 2. Contrôle dans le navigateur (site en ligne)

Pour **chaque page** de chaque espace :

1. Ouvrir la page, puis l'outil de développement (F12) → onglet **Réseau** (Network). Cocher « Conserver le journal » (Preserve log).
2. Recharger, puis parcourir la page : boutons, onglets, formulaires.
3. Filtrer sur **Fetch/XHR** et regarder la colonne **Domaine** (clic droit sur l'en-tête des colonnes → Domain).
4. **Site réel** : tous les appels vont vers `api.belivay.com`. **Vitrine** : tous vers `api-demo.belivay.com`.

Les images, polices et tuiles de carte (OpenStreetMap, Google) peuvent venir d'ailleurs : ce ne sont pas des appels d'API.

Noter chaque page contrôlée dans un tableau à transmettre dans le groupe :

| Espace | Page | Domaine des appels | Écart |
|---|---|---|---|
| seller | Accueil | api.belivay.com | aucun |
| … | … | … | … |
