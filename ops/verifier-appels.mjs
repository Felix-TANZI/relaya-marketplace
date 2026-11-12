#!/usr/bin/env node
// Contrôle des adresses embarquées dans les écrans construits — DEV-SRV-01, T10 :
// « Ouvrir chaque page dans le navigateur avec l'outil de développement, onglet Réseau, et vérifier le domaine de
// chaque appel : la vitrine n'appelle que api-demo.belivay.com, le site réel que api.belivay.com. Un seul appel
// croisé suffit à créer une fausse donnée en production. »
//
// Ce script ne remplace pas ce contrôle dans le navigateur : il l'outille. Il lit les fichiers construits (dist-*),
// liste toutes les adresses qu'ils contiennent, et échoue si l'API attendue manque ou si une adresse interdite
// apparaît (l'API de l'autre monde, le serveur de développement, Vercel, ngrok).
//
//   node ops/verifier-appels.mjs --api api.belivay.com frontend/dist-seller frontend/dist-admin …
//   node ops/verifier-appels.mjs --api api-demo.belivay.com <dossiers de la vitrine>
//
// Code 0 : conforme. Code 1 : écart (le détail est affiché). Aucune dépendance : Node seul.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const args = process.argv.slice(2);
const iApi = args.indexOf('--api');
if (iApi < 0 || !args[iApi + 1] || args.length < 3) {
  console.error('Usage : node ops/verifier-appels.mjs --api <hôte attendu> <dossier construit> [autres dossiers…]');
  process.exit(2);
}
const attendu = args[iApi + 1].toLowerCase();
const dossiers = args.filter((_, i) => i !== iApi && i !== iApi + 1);

// L'API de « l'autre monde » est toujours interdite : le réel n'appelle jamais api-demo, la vitrine jamais api.
const autreApi = attendu === 'api.belivay.com' ? 'api-demo.belivay.com' : 'api.belivay.com';
const INTERDITS = [
  { motif: (h) => h === autreApi, raison: 'API de l’autre monde (règle R1)' },
  { motif: (h, brut) => /^(localhost|127\.0\.0\.1):8000$/.test(brut), raison: 'serveur de développement' },
  { motif: (h) => h.endsWith('.vercel.app'), raison: 'déploiement Vercel' },
  { motif: (h) => h.includes('ngrok'), raison: 'tunnel ngrok' },
];

const EXTENSIONS = new Set(['.js', '.mjs', '.html', '.css', '.json', '.webmanifest']);
const URL = /\b(?:https?|wss?):\/\/([a-z0-9.-]+(?::\d+)?)/gi;

function* fichiers(dossier) {
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) yield* fichiers(chemin);
    else if (EXTENSIONS.has(extname(nom))) yield chemin;
  }
}

let ecart = false;
for (const dossier of dossiers) {
  const hotes = new Map(); // hôte → fichiers
  for (const fichier of fichiers(dossier)) {
    for (const m of readFileSync(fichier, 'utf8').matchAll(URL)) {
      const brut = m[1].toLowerCase();
      if (!hotes.has(brut)) hotes.set(brut, new Set());
      hotes.get(brut).add(fichier);
    }
  }

  console.log(`\n== ${dossier}`);
  const sansPort = (brut) => brut.replace(/:\d+$/, '');
  const trouve = [...hotes.keys()].some((brut) => sansPort(brut) === attendu);
  console.log(`  API attendue (${attendu}) : ${trouve ? 'présente' : 'ABSENTE'}`);
  if (!trouve) ecart = true;

  const interdits = [];
  const belivay = [];
  const externes = [];
  for (const [brut, ou] of [...hotes.entries()].sort()) {
    const hote = sansPort(brut);
    const interdit = INTERDITS.find(({ motif }) => motif(hote, brut));
    if (interdit) interdits.push(`${brut} — ${interdit.raison} (${[...ou].join(', ')})`);
    else if (hote === attendu) continue;
    else if (hote === 'belivay.com' || hote.endsWith('.belivay.com')) belivay.push(brut);
    else externes.push(brut);
  }
  if (interdits.length) {
    ecart = true;
    console.log('  INTERDIT :');
    interdits.forEach((ligne) => console.log(`    ${ligne}`));
  }
  if (belivay.length) console.log(`  Autres adresses BelivaY (liens à vérifier, pas des appels d'API) : ${belivay.join(', ')}`);
  if (externes.length) console.log(`  Services externes (cartes, polices, connexion Google/Apple, bibliothèques) : ${externes.length} — ${externes.join(', ')}`);
}

console.log(ecart ? '\nRÉSULTAT : ÉCART — voir ci-dessus.' : '\nRÉSULTAT : conforme.');
process.exit(ecart ? 1 : 0);
