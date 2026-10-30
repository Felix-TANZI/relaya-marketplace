// Emplacement du prototype de la console d'administration (référence visuelle, squelette seulement : DP-60) : le paquet n'est pas suivi par
// git ; il se trouve à la racine du dépôt principal (PG BelivaY/Work définitif pro — 6 interfaces/…), y compris depuis
// une copie de travail (.claude/worktrees/…). PROTO_ADMIN (variable d'environnement) l'emporte.
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RELATIF = 'Work définitif pro — 6 interfaces/1 — BelivaY Administrateur — paquet développeur/02_Prototype_HTML/BelivaY_Administrateur_console.html'

export function trouverPrototype() {
  if (process.env.PROTO_ADMIN) return resolve(process.env.PROTO_ADMIN)
  let d = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  for (;;) {
    const f = join(d, RELATIF)
    if (existsSync(f)) return f
    const parent = dirname(d)
    if (parent === d) return null
    d = parent
  }
}
