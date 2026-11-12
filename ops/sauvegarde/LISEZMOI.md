# Sauvegardes de la base BelivaY (DEV-SRV-01, T06)

Ce dossier répond à la tâche critique **T06** de l'ordre de mission DEV-SRV-01 : dès le premier vendeur inscrit, la base contient des pièces d'identité et des données réelles, et une perte serait irréversible.

Il y a trois protections, indépendantes l'une de l'autre :

| Protection | Où | Qui la met en place |
|---|---|---|
| 1. Sauvegardes automatiques du serveur entier | Hetzner | Console Hetzner (étape A) |
| 2. Export de la base chaque nuit, **chiffré**, envoyé sur un bucket R2 dédié et gardé 30 jours | Cloudflare R2 | `backup.sh` → `copier-vers-r2.sh` (étapes B à E) |
| 3. Test de restauration de l'export de la veille | Le serveur, dans une base temporaire | `tester-restauration.sh` (étape F) |

Les pièces d'identité elles-mêmes vont directement sur R2, sans jamais passer par le disque du serveur (règle R8, `apps/common/storage.py`).

## Ce que font les scripts

- **`backup.sh`** (racine du dépôt), lancé chaque nuit par cron et avant chaque déploiement :
  1. exporte la base (`pg_dump`, compressé) ;
  2. vérifie l'export ;
  3. le garde 14 jours sur le serveur ;
  4. appelle `copier-vers-r2.sh`.
- **`copier-vers-r2.sh`** :
  1. chiffre l'export avec la **clé publique** `age` ;
  2. l'envoie sur R2 ;
  3. vérifie sa taille là-bas ;
  4. efface les copies de plus de 30 jours.

  Il ne garde aucune copie en clair ailleurs que l'export local d'origine. S'il échoue, l'export local reste bon : l'échec est inscrit dans `/var/backups/belivay/backup.log`, et le diagnostic de maintenance (onglet Actions → *Maintenance Production* → *diagnostic*) passe en rouge.
- **`tester-restauration.sh`** :
  1. récupère la copie la plus récente sur R2 ;
  2. la déchiffre avec la **clé privée** ;
  3. la restaure dans une base temporaire ;
  4. compare les comptages des tables principales avec la vraie base ;
  5. supprime la base temporaire.

  **La vraie base n'est jamais modifiée.**
- **`Dockerfile`** : l'image `belivay-sauvegarde:1` (`rclone` pour R2, `age` pour le chiffrement). Les scripts la construisent eux-mêmes au premier passage, rien n'est à installer sur le serveur.

## Mise en place (une seule fois)

### A. Sauvegardes Hetzner du serveur

Console Hetzner Cloud → le serveur → onglet **Backups** → **Enable backups**. Hetzner garde alors 7 sauvegardes quotidiennes du serveur entier. L'option est payante (environ 20 % du prix du serveur).

### B. Le bucket R2 dédié

Dans Cloudflare → **R2** :

1. **Create bucket**. Nom : `belivay-sauvegardes`. Il est distinct du bucket des photos et des pièces.
2. Dans le bucket → **Settings** → **Object lifecycle rules** → **Add rule** : supprimer les objets **30 jours** après leur création. C'est le filet de sécurité : le script efface déjà les vieilles copies lui-même.
3. R2 → **Manage API tokens** → **Create API token** :
   - permission **Object Read & Write** ;
   - limitée au seul bucket `belivay-sauvegardes`.

   Noter :
   - l'**Access Key ID** ;
   - la **Secret Access Key** ;
   - l'adresse **S3 API** (`https://<identifiant>.r2.cloudflarestorage.com`).

### C. La paire de clés de chiffrement

Sur **votre ordinateur**, pas sur le serveur, dans un terminal où Docker tourne, depuis le dossier du dépôt :

```sh
docker build -t belivay-sauvegarde:1 ops/sauvegarde
docker run --rm --entrypoint age-keygen belivay-sauvegarde:1 > cle-privee-sauvegardes.txt
```

Le fichier `cle-privee-sauvegardes.txt` contient deux choses :

- la **clé privée**, la ligne `AGE-SECRET-KEY-…`. Gardez-la **hors du serveur et hors de R2**, à deux endroits sûrs, par exemple un gestionnaire de mots de passe et une clé USB rangée. **Sans elle, aucune sauvegarde n'est récupérable.** Ne l'envoyez jamais par WhatsApp ni par e-mail.
- la **clé publique**, la ligne `# public key: age1…`. Elle ne sert qu'à chiffrer : elle peut aller sur le serveur.

### D. Les réglages dans GitHub

GitHub → **Settings → Environments → Belivay Prod** :

| Nom | Type | Valeur |
|---|---|---|
| `BACKUP_R2_BUCKET` | variable | `belivay-sauvegardes` |
| `BACKUP_R2_ENDPOINT` | variable | l'adresse S3 API de l'étape B |
| `BACKUP_R2_ACCESS_KEY_ID` | **secret** | l'Access Key ID de l'étape B |
| `BACKUP_R2_SECRET_ACCESS_KEY` | **secret** | la Secret Access Key de l'étape B |
| `BACKUP_AGE_RECIPIENT` | variable | la clé publique `age1…` de l'étape C, **jamais la clé privée** |
| `BACKUP_R2_RETENTION_JOURS` | variable, facultative | `30` (valeur par défaut) |

Ces valeurs arrivent sur le serveur au déploiement suivant (`.env.prod` est regénéré par `deploy.yml`).

### E. La sauvegarde de chaque nuit (cron)

Sur le serveur, vérifier qu'elle existe :

```sh
crontab -l | grep backup.sh
```

Sinon, l'ajouter (`crontab -e`) pour l'utilisateur qui fait tourner Docker. Par exemple, chaque nuit à 2 h :

```
0 2 * * * /var/www/belivay/backup.sh >/dev/null 2>&1
```

Pour un premier essai tout de suite : `cd /var/www/belivay && ./backup.sh`, puis `tail -3 /var/backups/belivay/backup.log`. La dernière ligne doit être `Copie R2 terminee`.

### F. Le test de restauration

C'est la « capture » demandée par T06. Il se refait après chaque changement important, et au moins une fois par mois.

1. Copier la clé privée sur le serveur, le temps du test :
   `scp cle-privee-sauvegardes.txt <utilisateur>@<serveur>:/tmp/`
2. Sur le serveur :

   ```sh
   cd /var/www/belivay
   ./ops/sauvegarde/tester-restauration.sh /tmp/cle-privee-sauvegardes.txt
   ```

3. Faire une capture du tableau affiché. `RÉSULTAT : restauration réussie` signifie que T06 est terminée.
4. **Retirer la clé du serveur** : `rm /tmp/cle-privee-sauvegardes.txt`.

Comment lire le tableau :

- **« identique »** ou **« N ligne(s) créée(s) depuis la sauvegarde »** : normal. La vraie base a continué à vivre depuis la nuit.
- **« ANOMALIE »** : une table restaurée a *plus* de lignes que la vraie base, ce qui veut dire que des données ont disparu depuis la sauvegarde. À examiner tout de suite.

## Restaurer pour de vrai (en cas de perte)

Ne pas improviser : suivre la procédure de transfert de la mission (T14). Le principe :

1. récupérer la copie avec `rclone`, comme le fait `tester-restauration.sh` ;
2. la déchiffrer avec la clé privée ;
3. la restaurer dans une base **neuve** ;
4. ne faire pointer le site vers cette base qu'après avoir comparé les comptages.

## Essai sur un poste de développement

Les scripts tournent aussi en local, sans toucher à R2. Un faux R2 se lance avec la même image : `rclone serve s3`. Il suffit de faire pointer `PROJECT_DIR` vers un dossier qui contient un `.env.prod` de test, avec `BACKUP_R2_PROVIDER=Rclone` et `BACKUP_R2_ENDPOINT=http://host.docker.internal:<port>`. `COMPOSE` désigne la commande `docker compose` du poste. Le test du 2026-11-08 est passé ainsi : envoi chiffré, puis restauration avec 10 tables sur 10 identiques. Avec une mauvaise clé, le script refuse et ne laisse aucune base temporaire.
