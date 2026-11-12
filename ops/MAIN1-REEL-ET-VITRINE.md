# MAIN 1 : site réel et vitrine, du transfert au lancement (DEV-SRV-01, T08 / T13 / T18 / T25)

> Cadre technique du document : « MAIN 1 — jusqu'au 18 nov. : vitrine ; ensuite : site réel, et vitrine jusqu'au 14/12. »
> Décision du porteur du 11/11 : la vitrine reste sur MAIN 1, avec le site réel.

## Ce qui tourne sur MAIN 1 après le transfert

| Adresses | Servi par | Règles |
|---|---|---|
| `api.`, `shop.`, `seller.`, `driver.`, `relay.`, `delivery.`, `admin.belivay.com` | le site réel (`docker-compose.reel.yml`, `nginx/reel.conf.template`) | données réelles |
| `belivay.com`, `www.`, `boutique.belivay.com` | la vitrine : espace client de démonstration | `/api/` répond 410, fermée aux moteurs |
| `vendeur.`, `relais.`, `livreur.`, `livraison.belivay.com` | la vitrine : espaces vendeur, point relais, livreur, entreprise | `/api/` répond 410, fermée aux moteurs |

- **Un seul nginx** : `nginx/reel.conf.template` pour le site réel, plus `nginx/lancement-pret/vitrine.conf`, activé par `ops/lancement/activer.sh vitrine`.
- **La vitrine est son propre service** (`vitrine`, profil `vitrine` de `docker-compose.reel.yml`). Elle n'est construite et démarrée que si `.env.prod` contient `VITRINE_SUR_REEL=1`.
- **Elle est construite en démonstration complète** (`VITE_SOURCE=demo`) : comptes, SMS, identité et paiement sont simulés dans le navigateur, et elle n'appelle aucun serveur. Elle n'a donc ni back-end `api-demo` ni base à elle. R1, R2 et R3 sont tenues par construction, et nginx les tient une seconde fois : 410 sur `/api/`.

## Le soir du transfert (T18), après la réouverture du site réel sur MAIN 1

1. **Certificat** : étendre le certificat « belivay.com » de MAIN 1 aux sept adresses de la vitrine (commande certbot de `ops/SITE-REEL.md`, avec en plus `-d belivay.com -d www.belivay.com -d boutique.belivay.com -d vendeur.belivay.com -d relais.belivay.com -d livreur.belivay.com -d livraison.belivay.com`).
2. **GitHub**, environnement « Belivay Prod » : variable `VITRINE_SUR_REEL` = `1`, puis déploiement. `deploy.sh` construit et démarre alors aussi le service `vitrine`.
3. **Activer** : `ops/lancement/activer.sh vitrine`. nginx vérifie la configuration avant de la charger ; s'il refuse, rien ne change.
4. **DNS** : faire pointer les sept adresses de la vitrine vers MAIN 1 (TTL déjà à 5 minutes, T17).
5. **Contrôles** :
   - `curl -sI https://vendeur.belivay.com/` répond 302 vers `/vendeur/` ;
   - `curl -s -o /dev/null -w '%{http_code}' https://belivay.com/api/auth/health/` répond **410** : la vitrine n'atteint pas le back-end réel ;
   - `curl -sI https://belivay.com/ | grep -i x-robots-tag` affiche `noindex, nofollow`.

## Le 14 décembre (T24, T25)

Dans cet ordre, comme dans `ops/lancement/LANCEMENT-14-DECEMBRE.md` :

1. `ops/lancement/activer.sh vitrine --retirer`. Les configurations du 14/12 servent les mêmes adresses, et `activer.sh` les refuse tant que la vitrine est active.
2. `ops/lancement/activer.sh belivay-com` (T24), puis `ops/lancement/activer.sh redirections-vitrine` (T25).
3. Arrêter la vitrine : vider la variable `VITRINE_SUR_REEL`, puis
   `docker compose -f docker-compose.reel.yml --env-file .env.prod --profile vitrine stop vitrine`.

**Retour arrière, le jour J** : `activer.sh redirections-vitrine --retirer`, puis `activer.sh belivay-com --retirer`, puis `activer.sh vitrine` (la vitrine n'a pas encore été arrêtée).
