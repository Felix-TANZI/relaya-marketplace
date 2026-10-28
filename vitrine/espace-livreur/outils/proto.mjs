// Emplacement du prototype livreur (référence visuelle, squelette seulement : DP-60) : le paquet n'est pas suivi par
// git ; il se trouve à la racine du dépôt principal (PG BelivaY/Work définitif pro — 6 interfaces/…), y compris depuis
// une copie de travail (.claude/worktrees/…). PROTO_LIVREUR (variable d'environnement) l'emporte.
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RELATIF = 'Work définitif pro — 6 interfaces/6 — BelivaY Livreur — paquet développeur/02_Prototype_HTML/BelivaY_Livreur_mobile.html'

function trouver() {
  if (process.env.PROTO_LIVREUR) return resolve(process.env.PROTO_LIVREUR)
  let d = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  for (;;) {
    const f = join(d, RELATIF)
    if (existsSync(f)) return f
    const parent = dirname(d)
    if (parent === d) throw new Error('prototype livreur introuvable : poser PROTO_LIVREUR=<chemin du fichier HTML>')
    d = parent
  }
}

export const FICHIER_PROTO = trouver()
export const PROTO = pathToFileURL(FICHIER_PROTO)
