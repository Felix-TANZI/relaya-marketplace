// Emplacement du prototype vendeur (fait foi pour le visuel) : le paquet n'est pas suivi par git ; il se trouve à la
// racine du dépôt principal (PG BelivaY/Work définitif pro — 6 interfaces/…), y compris depuis une copie de travail
// (.claude/worktrees/…). PROTO_VENDEUR (variable d'environnement) l'emporte.
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RELATIF = 'Work définitif pro — 6 interfaces/3 — BelivaY Espace vendeur — paquet développeur/02_Prototype_HTML/BelivaY_Espace_Vendeur_mobile.html'

function trouver() {
  if (process.env.PROTO_VENDEUR) return resolve(process.env.PROTO_VENDEUR)
  let d = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  for (;;) {
    const f = join(d, RELATIF)
    if (existsSync(f)) return f
    const parent = dirname(d)
    if (parent === d) throw new Error('prototype vendeur introuvable : poser PROTO_VENDEUR=<chemin du fichier HTML>')
    d = parent
  }
}

export const FICHIER_PROTO = trouver()
export const PROTO = pathToFileURL(FICHIER_PROTO)
