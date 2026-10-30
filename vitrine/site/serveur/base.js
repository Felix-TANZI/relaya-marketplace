// La base des comptes : une seule interface, `requete(texte, parametres) → lignes`, derrière laquelle on branche
// - Neon Postgres (production, Vercel Storage : DATABASE_URL ou POSTGRES_URL), client HTTP @neondatabase/serverless ;
// - PGlite (Postgres en WebAssembly, en mémoire) pour les tests et le serveur local : base-memoire.js, à part pour
//   que la fonction Vercel ne l'embarque pas.
// Migrations versionnées (MIGRATIONS ci-dessous) : au premier appel de la fonction, ou par `npm run db:migrer`.

/**
 * @typedef {{ texte: string, parametres?: unknown[] }} Instruction
 * @typedef {{ requete: (texte: string, parametres?: unknown[]) => Promise<Record<string, any>[]>, transaction: (l: Instruction[]) => Promise<void> }} Base
 */

/** Adresse de la base donnée par Vercel (Storage → Neon), ou null. */
export function adresseBase(envir = process.env) {
  return envir.DATABASE_URL || envir.POSTGRES_URL || null
}

/** @param {string} url @returns {Promise<Base>} */
export async function baseNeon(url) {
  const { neon } = await import('@neondatabase/serverless')
  const sql = neon(url)
  return {
    requete: (t, p = []) => /** @type {Promise<Record<string, any>[]>} */ (sql.query(t, p)),
    // Tout ou rien (transaction HTTP de Neon).
    transaction: async (l) => void (await sql.transaction(l.map((i) => sql.query(i.texte, i.parametres ?? [])))),
  }
}


/**
 * Migrations versionnées, sûres et réversibles. Chaque version passe dans UNE transaction, sous un verrou consultatif
 * (deux fonctions qui démarrent ensemble ne migrent pas en même temps) ; elle est notée dans schema_comptes et ne repasse
 * plus. Les instructions restent idempotentes (IF NOT EXISTS). « bas » défait la version (npm run db:comptes -- retour
 * <version> --oui, après une sauvegarde : COMPTES-REELS.md, Exploitation). Une version publiée ne change plus : on en
 * ajoute une.
 * @type {{ version: number, titre: string, haut: string[], bas: string[] }[]}
 */
export const MIGRATIONS = [
  {
    version: 1,
    titre: 'comptes, sessions, jetons, limites',
    haut: [
      `CREATE TABLE IF NOT EXISTS comptes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        espace text NOT NULL CHECK (espace IN ('client','vendeur','entreprise','livreur','relais','console')),
        email text NOT NULL,
        telephone text,
        mdp_hash text,
        prenom text NOT NULL DEFAULT '',
        nom text NOT NULL DEFAULT '',
        photo text,
        role text NOT NULL,
        statut text NOT NULL CHECK (statut IN ('actif','en_attente','refuse','suspendu')),
        type_compte text NOT NULL DEFAULT 'standard' CHECK (type_compte IN ('standard','diaspora')),
        pays text,
        organisation_id uuid REFERENCES comptes(id) ON DELETE SET NULL,
        candidature jsonb NOT NULL DEFAULT '{}'::jsonb,
        conditions_version text,
        conditions_acceptees_le timestamptz,
        cree_le timestamptz NOT NULL,
        maj_le timestamptz NOT NULL,
        UNIQUE (espace, email)
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS comptes_telephone ON comptes (espace, telephone) WHERE telephone IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS comptes_organisation ON comptes (organisation_id)`,
      `CREATE TABLE IF NOT EXISTS sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        jeton_hash text NOT NULL UNIQUE,
        compte_id uuid NOT NULL REFERENCES comptes(id) ON DELETE CASCADE,
        espace text NOT NULL,
        appareil text NOT NULL DEFAULT '',
        se_souvenir boolean NOT NULL DEFAULT false,
        cree_le timestamptz NOT NULL,
        vu_le timestamptz NOT NULL,
        expire_le timestamptz NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS sessions_compte ON sessions (compte_id)`,
      `CREATE TABLE IF NOT EXISTS jetons (
        jeton_hash text PRIMARY KEY,
        type text NOT NULL CHECK (type IN ('reinitialisation','invitation')),
        espace text NOT NULL,
        compte_id uuid REFERENCES comptes(id) ON DELETE CASCADE,
        invite_par uuid REFERENCES comptes(id) ON DELETE CASCADE,
        email text,
        donnees jsonb NOT NULL DEFAULT '{}'::jsonb,
        cree_le timestamptz NOT NULL,
        expire_le timestamptz NOT NULL,
        utilise_le timestamptz
      )`,
      `CREATE INDEX IF NOT EXISTS jetons_compte ON jetons (compte_id)`,
      `CREATE TABLE IF NOT EXISTS limites (
        cle text PRIMARY KEY,
        nombre integer NOT NULL,
        fin timestamptz NOT NULL
      )`,
    ],
    bas: ['DROP TABLE IF EXISTS limites', 'DROP TABLE IF EXISTS jetons', 'DROP TABLE IF EXISTS sessions', 'DROP TABLE IF EXISTS comptes'],
  },
  {
    version: 2,
    titre: 'second facteur de la console (TOTP chiffré, codes de secours), défis de connexion',
    haut: [
      `ALTER TABLE comptes ADD COLUMN IF NOT EXISTS totp_chiffre text`,
      `ALTER TABLE comptes ADD COLUMN IF NOT EXISTS totp_actif boolean NOT NULL DEFAULT false`,
      `ALTER TABLE comptes ADD COLUMN IF NOT EXISTS totp_dernier_pas bigint`,
      `ALTER TABLE comptes ADD COLUMN IF NOT EXISTS codes_secours jsonb NOT NULL DEFAULT '[]'::jsonb`,
      `CREATE TABLE IF NOT EXISTS defis (
        jeton_hash text PRIMARY KEY,
        compte_id uuid NOT NULL REFERENCES comptes(id) ON DELETE CASCADE,
        espace text NOT NULL,
        se_souvenir boolean NOT NULL DEFAULT false,
        essais integer NOT NULL DEFAULT 0,
        cree_le timestamptz NOT NULL,
        expire_le timestamptz NOT NULL,
        utilise_le timestamptz
      )`,
      `CREATE INDEX IF NOT EXISTS defis_compte ON defis (compte_id)`,
    ],
    bas: [
      'DROP TABLE IF EXISTS defis',
      'ALTER TABLE comptes DROP COLUMN IF EXISTS codes_secours',
      'ALTER TABLE comptes DROP COLUMN IF EXISTS totp_dernier_pas',
      'ALTER TABLE comptes DROP COLUMN IF EXISTS totp_actif',
      'ALTER TABLE comptes DROP COLUMN IF EXISTS totp_chiffre',
    ],
  },
  {
    version: 3,
    titre: 'journal des erreurs du serveur (sans donnée personnelle)',
    haut: [
      `CREATE TABLE IF NOT EXISTS journal_serveur (
        id bigserial PRIMARY KEY,
        le timestamptz NOT NULL,
        niveau text NOT NULL,
        route text NOT NULL,
        code text NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS journal_serveur_le ON journal_serveur (le)`,
    ],
    bas: ['DROP TABLE IF EXISTS journal_serveur'],
  },
]

const VERROU = 7_204_011 // verrou consultatif des migrations des comptes

/** @param {Base} db */
export async function migrer(db) {
  await db.requete('CREATE TABLE IF NOT EXISTS schema_comptes (version integer PRIMARY KEY, le timestamptz NOT NULL DEFAULT now())')
  const faites = new Set((await db.requete('SELECT version FROM schema_comptes')).map((l) => Number(l.version)))
  for (const m of MIGRATIONS) {
    if (faites.has(m.version)) continue
    await db.transaction([
      { texte: 'SELECT pg_advisory_xact_lock($1)', parametres: [VERROU] },
      ...m.haut.map((texte) => ({ texte })),
      { texte: 'INSERT INTO schema_comptes (version) VALUES ($1) ON CONFLICT DO NOTHING', parametres: [m.version] },
    ])
  }
}

/** Défait les versions au-dessus de `cible` (de la plus récente à la plus ancienne). @param {Base} db @param {number} cible */
export async function revenir(db, cible) {
  for (const m of [...MIGRATIONS].reverse()) {
    if (m.version <= cible) break
    await db.transaction([
      { texte: 'SELECT pg_advisory_xact_lock($1)', parametres: [VERROU] },
      ...m.bas.map((texte) => ({ texte })),
      { texte: 'DELETE FROM schema_comptes WHERE version = $1', parametres: [m.version] },
    ])
  }
}

/** @param {Base} db @param {Date} maintenant Ménage : sessions, jetons et défis expirés, limites passées, journal de plus de 30 jours. */
export async function nettoyer(db, maintenant) {
  await db.requete('DELETE FROM sessions WHERE expire_le < $1', [maintenant])
  await db.requete("DELETE FROM jetons WHERE expire_le < $1 - interval '1 day'", [maintenant])
  await db.requete('DELETE FROM limites WHERE fin < $1', [maintenant])
  await db.requete('DELETE FROM defis WHERE expire_le < $1', [maintenant])
  await db.requete("DELETE FROM journal_serveur WHERE le < $1 - interval '30 days'", [maintenant])
}
