# ops/sauvegarde/Dockerfile
# DEV-SRV-01, T06 : les outils des sauvegardes hors du serveur, sans rien installer sur l'hôte.
#   rclone : parle à Cloudflare R2 (protocole S3) ;
#   age    : chiffre l'export avec la clé PUBLIQUE ; seule la clé privée, gardée hors du serveur, le déchiffre.
# Construite par copier-vers-r2.sh et tester-restauration.sh à leur premier passage (image belivay-sauvegarde:1).

FROM rclone/rclone:1.68.2

RUN apk add --no-cache age
