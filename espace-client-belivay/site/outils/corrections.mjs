// Applique au prototype affiché les corrections décidées par le porteur (DP-44, 3 oct.), pour comparer le
// site au « prototype corrigé » (tests/identique.spec.ts, outils/comparer.mjs) :
// (2) braise et (4) zones de toucher : la feuille src/styles/ecarts.css du site, telle quelle ;
// (3) aucun texte sous 12 px : chaque taille de police plus petite passe à 12 px, dans toutes les feuilles
//     et dans les styles en ligne, comme outils/styles.mjs le fait pour le site ;
// (5) anglicismes : mêmes remplacements que src/i18n/texte.ts en français ; étiquettes « CURATED » et
//     « SPONSO » retirées ; (6) pidgin retiré du sous-titre des réglages.
// Les points (1), retour de la planche, et (7), chiffre des données, ne changent rien à l'image.
// DP-13 : aucun pidgin sur le site ; le choix « Pidgin » du premier lancement est retiré.
// DP-47 : les écrans montrent les montants recalculés selon les décisions du porteur ; chaque montant du
// prototype qui change est remplacé par sa valeur recalculée (src/demo/recalculs.json, avec sa raison) :
// un montant (« 272 579 », aussi écrit « 272,579 » en anglais) ou, avec « texte », un passage exact ;
// « routes » limite le remplacement aux écrans cités (petits montants, qui reviennent ailleurs).
import { readFileSync } from 'node:fs'
import { corrigerDom, correctionsDe } from './corriger-page.mjs'

const ECARTS_CSS = readFileSync(new URL('../src/styles/ecarts.css', import.meta.url), 'utf-8')
const TARDIVES = JSON.parse(readFileSync(new URL('../src/genere/feuilles-tardives.json', import.meta.url), 'utf-8'))

// DP-53 : éléments que le porteur a fait ajouter à une page ; ils sont posés aussi sur le prototype comparé,
// dessinés par ses propres fonctions (ic()), pour que la comparaison au pixel couvre tout l'écran, ajouts compris.
// Chaque ajout : route, puis fonction exécutée dans la page avec la langue du rendu.
const AJOUTS = {
  // Mon compte : « Mon profil » en tête de « Mon compte et sécurité » (DP-52, DP-53).
  compte: (lang) => {
    /* global ic */
    const numero = document.querySelector('#app a.li[href="#numero-changer"]')
    if (!numero || document.querySelector('#app a.li[href="#profil"]')) return
    const [titre, sous] = lang === 'en' ? ['My profile', 'Photo, name and email'] : ['Mon profil', 'Photo, nom et e-mail']
    numero.insertAdjacentHTML(
      'beforebegin',
      '<a class="li" href="#profil"><span class="ic ">' + ic('user-round', 20) + '</span><span class="grow"><span class="lt" style="display:block">' +
        titre + '</span><span class="ls" style="display:block">' + sous + '</span></span><span class="chev">' + ic('chevron-right', 18) + '</span></a>',
    )
  },
  // Supprimer mon compte, refusé : le solde du portefeuille s'ajoute aux commandes en cours (DP-06 : l'argent
  // est au client, il le retire avant de partir ; DP-53). Solde du jeu d'essai : 45 000 F.
  supprimer: (lang) => {
    /* global ic */
    const commandes = document.querySelectorAll('#app a.li[href^="#commande?ref="]')
    const derniere = commandes[commandes.length - 1]
    if (!derniere || document.querySelector('#app a.li[href="#wallet?st=retirer"]')) return
    const [titre, sous] = lang === 'en' ? ['Your wallet: 45,000 F', 'Withdraw it to Mobile Money before you leave.'] : ['Ton portefeuille : 45 000 F', 'Retire-le vers Mobile Money avant de partir.']
    derniere.insertAdjacentHTML(
      'afterend',
      '<a class="li" href="#wallet?st=retirer"><span class="ic or">' + ic('wallet', 20) + '</span><span class="grow"><span class="lt" style="display:block">' +
        titre + '</span><span class="ls" style="display:block">' + sous + '</span></span><span class="chev">' + ic('chevron-right', 18) + '</span></a>',
    )
  },
}

export async function corrigerPrototype(page, lang, adresse) {
  // Feuilles qu'un écran n'ajoute qu'à son premier affichage : ouvert directement sur un état, le prototype
  // ne les a pas encore ; une navigation normale les aurait chargées, et le site les a toujours.
  await page.evaluate((tardives) => {
    const presentes = new Set([...document.querySelectorAll('head style')].map((s) => s.textContent))
    for (const texte of tardives) if (!presentes.has(texte)) document.head.insertAdjacentHTML('beforeend', '<style>' + texte + '</style>')
  }, TARDIVES)
  await page.addStyleTag({ content: ECARTS_CSS })
  // DP-44 (3) : aucun texte sous 12 px, dans toutes les feuilles et les styles en ligne.
  await page.evaluate(() => {
    const douze = (style) => {
      const v = style.getPropertyValue('font-size')
      if (/^\d+(\.\d+)?px$/.test(v) && parseFloat(v) < 12) style.setProperty('font-size', '12px', style.getPropertyPriority('font-size'))
      if (style.getPropertyValue('--fs-11').trim() === '11px') style.setProperty('--fs-11', '12px')
    }
    const parcourir = (regles) => {
      for (const r of regles) {
        if (r.style) douze(r.style)
        if (r.cssRules) parcourir(r.cssRules)
      }
    }
    for (const f of document.styleSheets) parcourir(f.cssRules)
    document.querySelectorAll('[style]').forEach((e) => douze(e.style))
  })
  // Textes et structures (outils/corriger-page.mjs, les mêmes que pour la génération des écrans).
  await page.evaluate(corrigerDom, correctionsDe(adresse || '#accueil', lang, { anglicismes: true }))
  const ajout = AJOUTS[(adresse || '#accueil').replace(/^#/, '').split('?')[0]]
  if (ajout) await page.evaluate(ajout, lang)
}
