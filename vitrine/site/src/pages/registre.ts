// Écrans construits à l'étape 6, document par document : chaque dossier src/pages/CL-xx/ exporte ses écrans
// (index.ts : ECRANS) et la liste de ses routes (construits.json). Chaque document est un fichier à part,
// chargé à l'ouverture de son premier écran : le site ne télécharge que ce qu'il affiche. Le document de
// l'adresse ouverte est chargé avant le premier affichage (main.tsx) : l'écran paraît d'un coup, sans
// attente de React entre le fichier reçu et l'écran affiché.
import { createElement, use, type ComponentType } from 'react'
import { PAGES, chemin } from '../config/pages'

type Document = { ECRANS: Record<string, ComponentType> }
// construits.json : écrans repris du prototype (comparés au pixel) ; pages-site.json : écrans propres au site.
const LISTES = import.meta.glob<{ routes: string[] }>(['./*/construits.json', './*/pages-site.json'], { eager: true, import: 'default' })
const MODULES = import.meta.glob<Document>('./*/index.ts')

const charges: Record<string, Document> = {}
const enCours: Record<string, Promise<Document>> = {}
// Un chargement qui échoue (réseau coupé) n'est pas gardé : la prochaine ouverture de l'écran réessaie.
const charger = (index: string) =>
  (enCours[index] ??= MODULES[index]().then(
    (m) => (charges[index] = m),
    (e: unknown) => {
      delete enCours[index]
      throw e
    },
  ))

const DOCUMENT_DE: Record<string, string> = {}
export const ECRANS: Record<string, ComponentType> = {}
for (const [liste, { routes }] of Object.entries(LISTES)) {
  const index = liste.replace(/(construits|pages-site)\.json$/, 'index.ts')
  for (const route of routes) {
    DOCUMENT_DE[route] = index
    ECRANS[route] = function EcranDuDocument() {
      return createElement((charges[index] ?? use(charger(index))).ECRANS[route])
    }
  }
}

// Charge le document de l'adresse donnée (rien si elle n'est pas un écran construit).
export function precharger(adresse: string): Promise<unknown> {
  const page = PAGES.find((p) => chemin(p.route) === adresse)
  const index = page && DOCUMENT_DE[page.route]
  return index && MODULES[index] ? charger(index).catch(() => undefined) : Promise.resolve()
}

// Préchargement des pages probables (passage professionnel) : le document d'un lien est demandé dès que le doigt
// se pose dessus (ou la souris le survole, ou le clavier y arrive), avant même le clic ; puis, au repos, ceux des
// onglets de la barre du bas. En données économes (réglage ou téléphone), seulement au toucher.
const ONGLETS_PROBABLES = ['accueil', 'categories', 'panier', 'sauvegardes', 'compte', 'commandes']
function economes(): boolean {
  try {
    const v = localStorage.getItem('blv_c_eco')
    if (v === 'oui') return true
    if (v === 'non') return false
  } catch {
    // stockage indisponible
  }
  return !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
}
export function installerPrechargement() {
  const viser = (e: Event) => {
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
    if (!a || a.origin !== location.origin || a.target === '_blank') return
    void precharger(a.pathname)
  }
  document.addEventListener('pointerover', viser, { passive: true })
  document.addEventListener('touchstart', viser, { passive: true })
  document.addEventListener('focusin', viser)
  if (economes()) return
  const auRepos = (f: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 4000 }) : setTimeout(f, 2000))
  auRepos(() => ONGLETS_PROBABLES.forEach((r) => void precharger(chemin(r))))
}
