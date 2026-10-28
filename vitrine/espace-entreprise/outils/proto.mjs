// Emplacement du prototype entreprise (référence visuelle, squelette seulement : DP-60) : le paquet n'est pas suivi par
// git ; il se trouve à la racine du dépôt principal (PG BelivaY/Work définitif pro — 6 interfaces/…), y compris depuis
// une copie de travail (.claude/worktrees/…). PROTO_ENTREPRISE (variable d'environnement) l'emporte.
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RELATIF = 'Work définitif pro — 6 interfaces/5 — BelivaY Entreprise de livraison — paquet développeur/02_Prototype_HTML/BelivaY_Entreprise_Livraison.html'

export function trouverPrototype() {
  if (process.env.PROTO_ENTREPRISE) return resolve(process.env.PROTO_ENTREPRISE)
  let d = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  for (;;) {
    const f = join(d, RELATIF)
    if (existsSync(f)) return f
    const parent = dirname(d)
    if (parent === d) return null
    d = parent
  }
}
