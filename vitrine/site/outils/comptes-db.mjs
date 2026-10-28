// Commandes de la base des comptes réels (DATABASE_URL ou POSTGRES_URL : « vercel env pull .env.local » les récupère).
//   npm run db:migrer                         crée ou met à jour les tables (idempotent ; la fonction le fait aussi seule)
//   npm run db:comptes                        liste les comptes (espace, statut, e-mail masqué, date)
//   npm run db:comptes -- valider <id>        passe un compte « en attente » à « actif »
//   npm run db:comptes -- supprimer <id>      supprime un compte, ses sessions et ses jetons
//   npm run db:comptes -- lien <e-mail>       lien « nouveau mot de passe » du propriétaire de la console (30 min),
//                                             quand aucun e-mail ne part (sans RESEND_API_KEY)
//   npm run db:comptes -- versions            versions de schéma appliquées
//   npm run db:comptes -- retour <v> --oui    défait les migrations au-dessus de la version v (APRÈS une sauvegarde)
//   npm run db:comptes -- tourner-totp        rechiffre les secrets du second facteur : TOTP_CLE_ANCIENNE → TOTP_CLE
//   npm run db:comptes -- exporter <id>       export des données d'un compte (demande d'accès reçue par le support)
import { readFileSync, existsSync } from 'node:fs'
import { MIGRATIONS, adresseBase, baseNeon, migrer, revenir } from '../serveur/base.js'
import { assurerProprietaire, exporter, masquerEmail } from '../serveur/comptes.js'
import { chiffrer, cleTotp, dechiffrer } from '../serveur/totp.js'
import { DUREES, LIENS } from '../serveur/regles.js'
import { empreinte, nouveauJeton } from '../serveur/secrets.js'

// .env.local (vercel env pull) : lu sans dépendance.
for (const f of ['.env.local', '.env']) {
  if (!existsSync(f)) continue
  for (const l of readFileSync(f, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.*?)"?\s*$/.exec(l)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2]
  }
}

const url = adresseBase()
if (!url) {
  console.error('DATABASE_URL absent : lancez « vercel env pull .env.local » dans site/, ou exportez DATABASE_URL.')
  process.exit(1)
}
const db = await baseNeon(url)
await migrer(db)
const [commande, arg] = process.argv.slice(2)
const ID = /^[0-9a-f-]{36}$/i

if (!commande || commande === 'migrer') {
  if (commande === 'migrer') console.log('Tables des comptes à jour.')
  else {
    const l = await db.requete('SELECT id, espace, email, role, statut, cree_le FROM comptes ORDER BY cree_le DESC LIMIT 500')
    for (const c of l) console.log([c.id, c.espace.padEnd(10), c.statut.padEnd(10), c.role.padEnd(12), masquerEmail(c.email), new Date(c.cree_le).toISOString().slice(0, 16)].join('  '))
    console.log(`${l.length} compte(s).`)
  }
} else if (commande === 'valider' && ID.test(arg ?? '')) {
  const r = await db.requete("UPDATE comptes SET statut = 'actif', maj_le = now() WHERE id = $1 RETURNING espace", [arg])
  console.log(r.length ? 'Compte validé.' : 'Compte introuvable.')
} else if (commande === 'supprimer' && ID.test(arg ?? '')) {
  const r = await db.requete('DELETE FROM comptes WHERE id = $1 RETURNING id', [arg])
  console.log(r.length ? 'Compte supprimé (sessions et jetons compris).' : 'Compte introuvable.')
} else if (commande === 'lien' && arg) {
  const ctx = { db, maintenant: () => new Date(), envir: process.env }
  await assurerProprietaire(/** @type {any} */ (ctx))
  const [c] = await db.requete("SELECT id, email FROM comptes WHERE espace = 'console' AND role = 'proprietaire' AND email = lower($1)", [arg])
  if (!c) {
    console.error('Aucun propriétaire de la console avec cette adresse (vérifiez ADMIN_BOOTSTRAP_EMAIL).')
    process.exit(1)
  }
  const jeton = nouveauJeton()
  const t = new Date()
  await db.requete("INSERT INTO jetons (jeton_hash, type, espace, compte_id, email, cree_le, expire_le) VALUES ($1, 'reinitialisation', 'console', $2, $3, $4, $5)", [empreinte(jeton), c.id, c.email, t, new Date(t.getTime() + DUREES.reinitialisationMin * 60_000)])
  const site = process.env.SITE_URL || 'https://pg-beliva-y.vercel.app'
  console.log(site + LIENS.reinitialisation.console.replace('{j}', jeton))
} else if (commande === 'versions') {
  const l = await db.requete('SELECT version, le FROM schema_comptes ORDER BY version')
  for (const v of l) console.log(`v${v.version}  ${new Date(v.le).toISOString().slice(0, 16)}  ${MIGRATIONS.find((m) => m.version === Number(v.version))?.titre ?? ''}`)
} else if (commande === 'retour' && /^\d+$/.test(arg ?? '') && process.argv.includes('--oui')) {
  await revenir(db, Number(arg))
  console.log(`Schéma ramené à la version ${arg}.`)
} else if (commande === 'retour') {
  console.error('Retour de schéma : DESTRUCTIF (colonnes et tables supprimées). Faites une sauvegarde Neon, puis : npm run db:comptes -- retour <version> --oui')
  process.exit(1)
} else if (commande === 'tourner-totp') {
  const ancienne = cleTotp(process.env.TOTP_CLE_ANCIENNE)
  const nouvelle = cleTotp(process.env.TOTP_CLE)
  if (!ancienne || !nouvelle) {
    console.error('TOTP_CLE_ANCIENNE et TOTP_CLE (32 caractères au moins chacune) sont demandées.')
    process.exit(1)
  }
  const l = await db.requete('SELECT id, totp_chiffre FROM comptes WHERE totp_chiffre IS NOT NULL')
  let n = 0
  for (const c of l) {
    let clair
    try {
      clair = dechiffrer(ancienne, c.totp_chiffre)
    } catch {
      continue // déjà rechiffré avec la nouvelle clé (commande relancée)
    }
    await db.requete('UPDATE comptes SET totp_chiffre = $2 WHERE id = $1', [c.id, chiffrer(nouvelle, clair)])
    n++
  }
  console.log(`${n} secret(s) rechiffré(s). Mettez maintenant TOTP_CLE à la nouvelle valeur sur Vercel et redéployez.`)
} else if (commande === 'exporter' && ID.test(arg ?? '')) {
  const [c] = await db.requete('SELECT * FROM comptes WHERE id = $1', [arg])
  if (!c) {
    console.error('Compte introuvable.')
    process.exit(1)
  }
  console.log(JSON.stringify(await exporter(/** @type {any} */ ({ db, maintenant: () => new Date() }), /** @type {any} */ ({ compte: c })), null, 2))
} else {
  console.error('Commande inconnue. Voir l’en-tête de outils/comptes-db.mjs.')
  process.exit(1)
}
