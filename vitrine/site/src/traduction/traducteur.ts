// TRADUCTEUR DU CONTENU SAISI PAR LES GENS — module commun des six applications (les cinq autres le lisent par
// l'alias « @client/traduction/… »).
//
// Ce qu'il traduit : ce que les gens écrivent (titre et description d'un produit du vendeur, avis, messages,
// contenus publiés par l'administration). Les textes de l'interface, eux, restent traduits par les dictionnaires
// statiques FR/EN de chaque application (i18n/*.en.json) : ce module ne les touche pas.
//
// Pièces :
// - `Traducteur` : l'interface, une seule méthode `traduire(texte, de, vers)` ;
// - `avecCache()` : met n'importe quel traducteur derrière un cache (même texte, même sens : une seule demande, y
//   compris quand deux écrans la font en même temps ; 500 traductions gardées le temps de la visite) ;
// - `detecterLangue()` : détection simple FR / EN (mots courants, accents) pour savoir s'il faut proposer « Traduire » ;
// - `traducteurServeur()` : le VRAI fournisseur, appelé PAR LE SERVEUR de BelivaY ;
// - `traducteur` (index.ts) : celui que les écrans emploient, choisi par l'interrupteur unique VITE_SOURCE.
//
// BRANCHER LE VRAI FOURNISSEUR (équipe serveur et front) :
// 1. Serveur : créer la route `POST {VITE_API_URL}/translate` — corps `{ "text": "…", "source": "fr", "target": "en" }`,
//    réponse `{ "text": "…", "provider": "…" }` (200), 429 si le quota est atteint. Le serveur appelle le prestataire
//    choisi (DeepL, Google Cloud Translation, Azure…) avec SA clé, gardée dans ses variables d'environnement : la clé
//    ne va JAMAIS dans le front (aucune variable VITE_ pour elle). Il garde lui aussi les traductions (par empreinte
//    du texte et paire de langues) pour ne pas repayer un même avis lu par mille personnes.
// 2. Front : rien à écrire. Avec VITE_SOURCE=api, index.ts emploie déjà `traducteurServeur(VITE_API_URL)`.
// 3. Retirer la démonstration : supprimer src/demo (dont src/demo/traducteur-demo.ts) et, dans
//    src/traduction/index.ts, la ligne d'import de la démo et sa branche (voir logique-metier/RETIRER-LA-DEMO.md).
// Une traduction qui échoue (réseau, quota) n'empêche jamais la lecture : l'original reste affiché.

export type LangueTexte = 'fr' | 'en'

export interface Traduction {
  texte: string
  automatique: true // toujours signalé à l'écran (« Traduit automatiquement »)
  fournisseur: string // qui a traduit (« démonstration », ou le nom rendu par le serveur) : jamais affiché au public
}

export interface Traducteur {
  nom: string
  traduire(texte: string, de: LangueTexte, vers: LangueTexte, signal?: AbortSignal): Promise<Traduction>
}

/** Cache des traductions (le temps de la visite) et demandes en cours partagées. Une erreur n'est pas gardée. */
export function avecCache(t: Traducteur, max = 500): Traducteur & { vider(): void } {
  const gardees = new Map<string, Promise<Traduction>>()
  return {
    nom: t.nom,
    vider: () => gardees.clear(),
    traduire(texte, de, vers, signal) {
      const cle = de + '>' + vers + '|' + texte
      const deja = gardees.get(cle)
      if (deja) {
        // Récemment servie : remise en fin de file (la plus ancienne part la première).
        gardees.delete(cle)
        gardees.set(cle, deja)
        return deja
      }
      const p = t.traduire(texte, de, vers, signal).catch((e: unknown) => {
        gardees.delete(cle)
        throw e
      })
      gardees.set(cle, p)
      while (gardees.size > max) gardees.delete(gardees.keys().next().value!)
      return p
    },
  }
}

// Mots très courants de chaque langue (détection simple, sans bibliothèque).
const MOTS: Record<LangueTexte, Set<string>> = {
  fr: new Set('le la les un une des du de et est sont pas très bien bon bonne avec pour sur dans ce cette mais je tu il elle nous vous ils mon ma mes ton ta votre notre qui que quoi au aux en ne plus moins comme tout tous rien merci bonjour livraison produit reçu arrivé'.split(' ')),
  en: new Set('the a an and is are not very good well with for on in this that but i you he she we they my your our who what to of at as all no more less thanks hello delivery product received arrived it was were be'.split(' ')),
}

/** Langue d'un texte (fr ou en), ou null si rien ne permet de trancher (texte trop court, chiffres, noms propres). */
export function detecterLangue(texte: string): LangueTexte | null {
  const mots = texte.toLowerCase().normalize('NFC').match(/[a-zàâäçéèêëîïôöùûüÿœæ’']+/g) ?? []
  if (!mots.length) return null
  let fr = /[àâçéèêëîïôùûüœ]/.test(texte.toLowerCase()) ? 1.5 : 0
  let en = 0
  for (const m of mots) {
    const x = m.replace(/[’']/g, '')
    if (MOTS.fr.has(x) || /^(l|d|j|qu|n|s|c)[’']/.test(m)) fr++
    if (MOTS.en.has(x) || /[’']s$|n[’']t$/.test(m)) en++
  }
  if (fr === en) return null
  return fr > en ? 'fr' : 'en'
}

/** Le vrai fournisseur, par le serveur de BelivaY (la clé du prestataire reste sur le serveur). */
export function traducteurServeur(apiUrl: string): Traducteur {
  return {
    nom: 'serveur',
    async traduire(texte, de, vers, signal) {
      const r = await fetch(apiUrl.replace(/\/$/, '') + '/translate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ text: texte, source: de, target: vers }),
        signal,
      })
      if (!r.ok) throw new Error('Traduction indisponible (' + r.status + ')')
      const v = (await r.json()) as { text?: unknown; provider?: unknown }
      if (typeof v.text !== 'string') throw new Error('Traduction : réponse inattendue')
      return { texte: v.text, automatique: true, fournisseur: typeof v.provider === 'string' ? v.provider : 'serveur' }
    },
  }
}
