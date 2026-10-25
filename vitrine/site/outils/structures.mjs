// Écrit src/i18n/en-structures.json : la traduction des textes que les structures recalculées ajoutent
// (« Remise au relais · colis 2 », cases de la grille de garde…), les mêmes que la comparaison donne au
// prototype en anglais (outils/corriger-page.mjs).
//   node outils/structures.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { textesStructure } from './corriger-page.mjs'
import { cle } from './nombres.mjs'

const STRUCTURES = JSON.parse(readFileSync(new URL('../src/demo/structures.json', import.meta.url), 'utf-8'))
const DICO = JSON.parse(readFileSync(new URL('../src/genere/en.json', import.meta.url), 'utf-8'))
const sortie = {}
for (const s of STRUCTURES) for (const [fr, en] of textesStructure(s)) if (!(cle(fr) in DICO)) sortie[cle(fr)] = en
writeFileSync(new URL('../src/i18n/en-structures.json', import.meta.url), JSON.stringify(sortie, null, 1) + '\n')
console.log(Object.keys(sortie).length + ' textes')
