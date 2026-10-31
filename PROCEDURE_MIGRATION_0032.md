# Migration shipping 0032 : procédure de mise en production (revue du 29/10, E2)

**À qui s'adresse ce document :** la personne qui déploie dev1 sur main 2.
**Priorité :** P0. Il faut le suivre avant le premier `deploy.sh` qui contient cette migration.

## Pourquoi une procédure

La migration `0032_code_retrait_chiffre` (DP-02) fait trois choses, dans cet ordre :

1. Elle chiffre chaque code de retrait encore en clair.
2. Elle calcule l'empreinte HMAC de chaque code.
3. Elle **supprime la colonne en clair**.

Il n'y a pas de retour arrière : le retour arrière ne fait rien, et la colonne supprimée ne revient pas.

Elle dépend de deux secrets :

| Variable | Rôle | Si elle manque ou change après la migration |
|---|---|---|
| `PAYMENTS_ENCRYPTION_KEY` | chiffre le code (le client le relit dans son application) | le client ne peut plus lire son code |
| `PAYMENTS_FINGERPRINT_SALT` | sel de l'empreinte : c'est elle que compare le comptoir | **aucun code n'est plus accepté au comptoir** |

Sans sel, l'empreinte est calculée avec `SECRET_KEY`. Si l'on pose le sel après la migration, toutes les empreintes déjà calculées deviennent fausses. Les deux secrets se posent donc **avant**, une fois pour toutes.

## Étapes, dans l'ordre

### 1. Poser les deux secrets dans `.env.prod`

1. Générer la clé : `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
2. Générer le sel, d'au moins 32 caractères : `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
3. Écrire dans `.env.prod` : `PAYMENTS_ENCRYPTION_KEY=…` et `PAYMENTS_FINGERPRINT_SALT=…`.
4. Ranger les deux valeurs dans le coffre des secrets du porteur. Les perdre rend les codes et les numéros illisibles.
5. Vérifier : `python manage.py payments_preflight --strict` ne doit afficher aucun **BLOQUANT** sur la clé ni sur le sel (A4).

Si la production a déjà une clé `PAYMENTS_ENCRYPTION_KEY`, on la **garde** : elle chiffre déjà les numéros de paiement. On ne change pas de clé à cette occasion.

**Dans le même fichier, l'opérateur d'appel (DP-61).** Le serveur de production lance `check --deploy` au démarrage. Sans opérateur d'appel masqué, il refuse de démarrer. Tant que le contrat n'est pas signé, poser la dérogation décidée par le porteur le 31/10, avec sa date et son motif :

```
BELIVAY_APPELS_DEROGATION=2026-10-31 contrat operateur en cours
```

Avec la dérogation, les numéros restent masqués et l'appel répond « indisponible ». `check --deploy` et `payments_preflight` la signalent à chaque fois. Le jour du contrat, renseigner `BELIVAY_APPELS` avec l'opérateur, puis **retirer** la dérogation.

### 2. Sauvegarder la base de production

`deploy.sh` fait une sauvegarde, mais on en fait une à part, qu'on garde :

```
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > avant_0032_$(date +%Y%m%d_%H%M).dump
```

Vérifier que le fichier n'est pas vide (`ls -lh`) avant de continuer.

### 3. Essai sur une copie de la production (obligatoire)

Sur une machine qui n'est pas la production, avec **les mêmes** `PAYMENTS_ENCRYPTION_KEY` et `PAYMENTS_FINGERPRINT_SALT` :

1. Restaurer la sauvegarde dans une base vide : `pg_restore -d copie_0032 avant_0032_….dump`.
2. Relever les codes en clair des colis, **juste avant la migration**. Le fichier contient des codes en clair : il ne quitte pas cette machine.
   ```
   psql copie_0032 -c "\copy (SELECT id, pickup_code FROM shipping_relayparcel WHERE pickup_code <> '') TO 'avant_0032.csv' CSV"
   ```
3. Jouer les migrations avec le code de dev1 : `python manage.py migrate`.
4. Vérifier : `python manage.py verifier_codes_retrait --codes avant_0032.csv`.
   - La commande attendue se termine par **« OK : chaque code existant est toujours accepté au comptoir. »**
   - Toute autre fin, avec la sortie 1, signifie **qu'il ne faut pas migrer la production**. Il faut chercher la cause d'abord (souvent une clé ou un sel différents de ceux de la production).
5. Contrôle à la main : ouvrir l'application du relais sur la copie et remettre un colis avec son code d'avant la migration.
6. **Supprimer `avant_0032.csv`**, puis la copie.

### 4. Compte rendu de l'essai (la preuve demandée)

Le compte rendu se joint à la PR du groupe E ou s'envoie au porteur :

```
Essai migration 0032 — date : …   par : …
Sauvegarde : avant_0032_….dump (taille …)
Copie restaurée sur : …
Colis avec un code avant migration : …
verifier_codes_retrait : « … colis vérifiés, … codes rejoués » — OK / ÉCHEC
Remise manuelle au comptoir sur la copie : colis BVY-…-… — acceptée / refusée
Fichier des codes supprimé : oui
```

### 5. Production

Seulement après un compte rendu « OK » :

1. Lancer `./deploy.sh`. Le conteneur exécute `check --deploy`, puis `migrate`, puis `gunicorn` (A1).
2. Juste après : `python manage.py verifier_codes_retrait`, sans `--codes`, puisqu'on ne relève jamais les codes en production. La commande doit répondre OK.
3. Si la réponse n'est pas OK, arrêter les remises au comptoir et restaurer la sauvegarde de l'étape 2.

## Ce qui ne dépend pas de l'équipe de développement

- La copie de la base de production, et la machine où elle est restaurée.
- Les valeurs réelles de la clé et du sel, et leur conservation.
- L'essai lui-même et son compte rendu. Ils se font avec ces accès.
