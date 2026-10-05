// Transcrit UN état du prototype en JSX, pour le lire (outil de l'étape 6) ; les écrans du site s'écrivent
// avec outils/ecran.mjs. Règles de transcription : outils/transcription.mjs.
//   node outils/transcrire.mjs <adresse> [dossier]   ex. node outils/transcrire.mjs '#numero?st=code&from=panier'
// Sortie : <dossier>/<route>/<clé de l'état>.tsx (dossier par défaut : ../transcriptions, hors du site).
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { cleEtat } from './adresses.mjs'
import { releverEtat, Transcripteur } from './transcription.mjs'

const [arg, dossierArg] = process.argv.slice(2)
if (!arg) throw new Error('usage : node outils/transcrire.mjs <adresse> [dossier]')
const adresse = arg.startsWith('#') ? arg : '#' + arg
const cle = cleEtat(adresse)
const DOSSIER = dossierArg ? new URL(dossierArg.replace(/\/?$/, '/'), 'file://' + process.cwd() + '/') : new URL('../../transcriptions/', import.meta.url)

const navigateur = await chromium.launch()
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } })
const erreurs = []
page.on('pageerror', (e) => erreurs.push(e.message))
const releve = await releverEtat(page, adresse)
await navigateur.close()
if (erreurs.length) throw new Error('erreurs du prototype : ' + erreurs.slice(0, 3).join(' | '))

const tr = new Transcripteur()
const { contenu, fixes, dessins } = tr.jsx(releve, 2)
tr.enregistrer()
const sortie = new URL(cle.split('?')[0] + '/', DOSSIER)
mkdirSync(sortie, { recursive: true })
const fichier = new URL(cle.replace(/[?&=]/g, (c) => ({ '?': '__', '&': '_', '=': '-' })[c]) + '.tsx', sortie)
writeFileSync(
  fichier,
  `// Transcription de ${adresse} (outils/transcrire.mjs) : pour lire, pas un écran du site.\n` +
    [...tr.imports].map(([v, nom]) => `import ${v} from '../../site/src/assets/prototype/${nom}'`).join('\n') +
    `\n\nexport const contenu = (\n  <>\n${contenu}\n  </>\n)\n\nexport const fixes = (\n  <>\n${fixes}\n  </>\n)\n`,
)
console.log(`${adresse} → ${fichier.pathname} (${dessins} dessins, ${tr.imports.size} images)`)
