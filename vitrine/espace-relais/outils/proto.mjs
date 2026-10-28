// Emplacement du prototype point relais (référence visuelle : la STRUCTURE de chaque écran est gardée, le contenu
// s'enrichit) : le paquet n'est pas suivi par git ; il se trouve à la racine du dépôt principal (PG BelivaY/Work
// définitif pro — 6 interfaces/…), y compris depuis une copie de travail (.claude/worktrees/…). PROTO_RELAIS (variable
// d'environnement) l'emporte.
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RELATIF = 'Work définitif pro — 6 interfaces/4 — BelivaY Point relais — paquet développeur/02_Prototype_HTML/BelivaY_Point_Relais_mobile.html'

function trouver() {
  if (process.env.PROTO_RELAIS) return resolve(process.env.PROTO_RELAIS)
  let d = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  for (;;) {
    const f = join(d, RELATIF)
    if (existsSync(f)) return f
    const parent = dirname(d)
    if (parent === d) throw new Error('prototype point relais introuvable : poser PROTO_RELAIS=<chemin du fichier HTML>')
    d = parent
  }
}

export const FICHIER_PROTO = trouver()
export const PROTO = pathToFileURL(FICHIER_PROTO)
