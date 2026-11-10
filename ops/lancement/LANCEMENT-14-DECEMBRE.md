# Lancement public du lundi 14 décembre (DEV-SRV-01, T21 à T25)

> « À partir du 14 décembre, l'argent est réel. Tout doit être prêt et vérifié à l'avance pour que l'ouverture ne prenne que quelques minutes. »
> « Le 14 décembre, on applique ; on ne construit plus. »

Tout ce qui change le jour J est **déjà écrit, versionné et testé sur MAIN 2**. Ce jour-là, on se contente de :

- activer deux configurations nginx préparées : `ops/lancement/activer.sh` ;
- changer quelques réglages dans GitHub ;
- poser les clés de production CamPay avec la direction.

## Avant le 26 novembre : préparer et tester sur MAIN 2 (T21, T22)

### A. Ce qui est déjà prêt dans le dépôt

| Fichier | Rôle | Activation |
|---|---|---|
| `nginx/lancement-pret/belivay-com.conf` | `belivay.com` sert l'espace client réel. `www.` redirige vers `belivay.com`. Les anciens chemins de la vitrine (`/vendeur/`, `/relais/`…) redirigent vers les espaces réels. | `ops/lancement/activer.sh belivay-com` |
| `nginx/lancement-pret/redirections-vitrine.conf` | Les adresses françaises redirigent vers les anglaises, en gardant le reste du lien. `api-demo` répond 410, « démonstration terminée » : il n'est **jamais** redirigé vers l'API réelle (R1). | `ops/lancement/activer.sh redirections-vitrine` |

`activer.sh` fait vérifier la configuration par nginx (`nginx -t`) avant de la recharger. Si nginx la refuse, le fichier est retiré aussitôt et le site continue tel quel. `--retirer` défait l'activation, `--etat` dit ce qui est activé.

### B. Liste de contrôle CamPay (T21-2)

À cocher avec la direction. Les commandes se lancent dans le conteneur du back-end :

```sh
docker compose -f docker-compose.reel.yml --env-file .env.prod exec backend python manage.py <commande>
```

| # | Contrôle | Comment | Fait |
|---|---|---|---|
| 1 | Compte CamPay de production validé, accès au tableau de bord | Direction | ☐ |
| 2 | **Clé de production** générée dans le tableau de bord CamPay | Direction ; la clé n'est jamais envoyée par message | ☐ |
| 3 | **Adresse de notification de paiement** déclarée chez CamPay | `https://api.belivay.com/api/payments/webhooks/campay/` | ☐ |
| 4 | Clé de signature des notifications | Secret GitHub `CAMPAY_WEBHOOK_KEY` | ☐ |
| 5 | Clé de production posée | Secret GitHub `CAMPAY_TOKEN_LIVE`, **le 14/12 seulement** | ☐ |
| 6 | Prestataire CamPay en mode LIVE et activé | Admin → configuration financière : **nouvelle version** du prestataire CamPay (une version ne se modifie jamais), par une demande de changement validée | ☐ |
| 7 | Prestataire factice MOCK clôturé | Fait par `charger_reference` sur le site réel ; vérifié par la commande 8 | ☐ |
| 8 | Contrôle d'avant production **sans aucune ligne BLOQUANT** | `payments_preflight --strict` | ☐ |
| 9 | **Transaction de contrôle d'un petit montant** | `payments_live_test --start --msisdn 237XXXXXXXXX`, puis composer le code sur le téléphone, puis `--check <référence>`, puis `--cleanup <référence>` | ☐ |
| 10 | La transaction apparaît dans le tableau de bord CamPay, avec le même montant et la même référence | Direction | ☐ |

**Test de la bascule sur MAIN 2 avec les clés de test (T21-3).** Dérouler les étapes 3 à 9 en mode bac à sable (`CAMPAY_TOKEN_SANDBOX`). Avant `payments_live_test`, lancer `campay_selftest`, puis `campay_selftest --collect 237XXXXXXXXX --amount 100`. Ne **jamais** lancer `--collect` en mode LIVE.

### C. Les deux configurations, testées sur MAIN 2 (T22)

Sur MAIN 2, devenu serveur de test (T20), avec un certificat couvrant les adresses testées :

1. `ops/lancement/activer.sh belivay-com`, puis vérifier :
   - `curl -sI https://belivay.com/` répond 200 ;
   - `curl -sI https://belivay.com/vendeur/` répond 301 vers seller.
2. `ops/lancement/activer.sh redirections-vitrine`, puis vérifier :
   - `curl -sI https://vendeur.belivay.com/x` répond 301 vers `https://seller.belivay.com/x` ;
   - `curl -s https://api-demo.belivay.com/` répond 410.
3. `--retirer` les deux, puis vérifier que le site revient à l'état d'avant.

Transmettre la capture : T22 est terminée quand les redirections ont été testées sur MAIN 2.

## Jeudi 10 décembre : gel du code (T23)

Annonce dans le groupe : « À partir d'aujourd'hui, seules les corrections critiques sont déployées, toujours après passage sur MAIN 2. »

## Lundi 14 décembre : on applique

| # | Qui | Geste | Vérification |
|---|---|---|---|
| 1 | OWEN | **Certificat** étendu à `belivay.com`, `www.belivay.com` et aux adresses françaises (commande dans `ops/SITE-REEL.md`, en ajoutant ces `-d`) | `ls certbot/conf/live/belivay.com/` |
| 2 | OWEN | **Réglages GitHub** du site réel :<br>• `VITE_SITE_URL=https://belivay.com` ;<br>• `FRONTEND_URL=https://belivay.com` ;<br>• `https://belivay.com` ajouté à `CORS_ALLOWED_ORIGINS`.<br>Puis déploiement : les écrans sont reconstruits avec les liens publics vers `belivay.com`. | `deploy.sh` vert |
| 3 | OWEN | **DNS** : `belivay.com`, `www` et les adresses françaises pointent vers MAIN 1 (TTL déjà à 300 s) | `dig +short belivay.com` |
| 4 | OWEN | `ops/lancement/activer.sh vitrine --retirer`, puis `ops/lancement/activer.sh belivay-com` (T24) | `https://belivay.com` ouvre l'espace client réel |
| 5 | OWEN + direction | **CamPay en production** : contrôles 5, 6, 8, 9 et 10 de la liste B | transaction de contrôle visible chez CamPay |
| 6 | JUNIOR | `ops/lancement/activer.sh vitrine --retirer` **avant le geste 4**, puis `ops/lancement/activer.sh redirections-vitrine`, puis arrêt de la vitrine : variable GitHub `VITRINE_SUR_REEL` vidée, et `docker compose -f docker-compose.reel.yml --env-file .env.prod --profile vitrine stop vitrine` (T25) | chaque ancienne adresse française ouvre la bonne page du site réel |
| 7 | NZIKO | **Premier achat réel de bout en bout** : commande, paiement Mobile Money, suivi | capture dans le groupe |

**Retour arrière, le jour J :**

- `ops/lancement/activer.sh belivay-com --retirer` : belivay.com cesse d'être servi par le site réel. Remettre le DNS de belivay.com sur la vitrine si elle tourne encore.
- CamPay : clôturer la version LIVE et reprendre la version SANDBOX, par une demande de changement.

Les données et les comptes ne sont pas touchés par ces gestes.

## MAIN 1 porte le site réel et la vitrine jusqu'au 14/12 (décision du porteur du 11/11)

Comme le prévoit le document, la vitrine vit sur MAIN 1 avec le site réel, sous **un seul nginx**, et sur ses propres adresses : belivay.com, www, boutique, vendeur, relais, livreur et livraison. Elle tourne comme un service à part du site réel (`vitrine`, profil `vitrine` de `docker-compose.reel.yml`). Elle ne parle jamais au back-end réel : tous ses `/api/` répondent 410. La vitrine étant en démonstration complète, elle n'a pas besoin d'`api-demo` (R1, R2, R3).

La mise en route est décrite dans `ops/MAIN1-REEL-ET-VITRINE.md`. Le 14/12, le geste 6 ci-dessus commence par retirer la vitrine : `activer.sh vitrine --retirer`. `activer.sh` refuse d'ailleurs `belivay-com` et `redirections-vitrine` tant que la vitrine est active, car elles servent les mêmes adresses.
