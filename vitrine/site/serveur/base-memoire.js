// Postgres en mémoire (PGlite, WebAssembly) : tests (comptes.test.mjs) et serveur local (outils/serveur-local.mjs).
// Jamais importé par la fonction Vercel (api/comptes.js), qui parle à Neon.

/** @returns {Promise<import('./base.js').Base & { fermer: () => Promise<void> }>} */
export async function baseMemoire() {
  const { PGlite } = await import('@electric-sql/pglite')
  const db = new PGlite()
  return {
    requete: async (t, p = []) => (await db.query(t, p)).rows,
    transaction: (l) => db.transaction(async (tx) => {
      for (const i of l) await tx.query(i.texte, i.parametres ?? [])
    }),
    fermer: () => db.close(),
  }
}
