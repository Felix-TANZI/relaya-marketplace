// Génère le contrat OpenAPI 3.1 du back-end BelivaY (backend-kit/openapi.yaml) et la table des routes
// (backend-kit/outils/routes.json), à partir du site, lu sans le modifier :
//   - site/src/api/routes.ts      : les 211 méthodes de la source, leur route (existante ou à créer), leur état ;
//   - site/src/donnees/source.ts  : les types de réponse (ce que l'écran lit) et les paramètres de chaque méthode ;
//   - site/src/api/adaptateurs.ts : les formats de relaya-marketplace pour les routes existantes.
//
// Lancer (depuis backend-kit/outils, Node 20+ ; sans Node installé : uvx --from nodejs-wheel …) :
//   npm install && node node_modules/.bin/tsx generer-openapi.mts
//
// Règles du contrat (voir REPRISE-BACKEND.md, « Conventions ») :
//   - réponses des routes à créer = types de source.ts, champs tels quels (camelCase français), dates en
//     millisecondes depuis 1970 (comme l'écran) ; corps des requêtes = champs écrits dans routes.ts ;
//   - erreurs { error: { code, message, data } } (CAP-04) ; codes tirés de routes.ts (« 409 price_changed ») ;
//   - Idempotency-Key exigée là où routes.ts l'écrit (CAP-03) ; pagination par curseur (CAP-05).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { createGenerator } from 'ts-json-schema-generator'
import YAML from 'yaml'
import { CONNECTEURS } from '../../site/src/api/routes.ts'

const ICI = dirname(fileURLToPath(import.meta.url))
const SITE = resolve(ICI, '../../site')
const SOURCE_TS = join(SITE, 'src/donnees/source.ts')
const ADAPT_TS = join(SITE, 'src/api/adaptateurs.ts')
const GEN_TS = join(ICI, '.types-generes.ts')

type Methode = 'get' | 'post' | 'put' | 'patch' | 'delete'
type Schema = Record<string, any>

// ——— 1. Les méthodes de Source : noms et paramètres (compilateur TypeScript) ———

interface Param {
  nom: string
  optionnel: boolean
}
interface MethodeSource {
  nom: string
  params: (Param & { type: string })[]
  retour: string // T de Promise<T>
  vide: boolean // Promise<void>
}

const EXPORTS_SOURCE: string[] = []

function lireSource(): Map<string, MethodeSource> {
  const prog = ts.createProgram([SOURCE_TS], { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, skipLibCheck: true, noEmit: true })
  const sf = prog.getSourceFile(SOURCE_TS)!
  const res = new Map<string, MethodeSource>()
  ts.forEachChild(sf, (n) => {
    if ((ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) && n.modifiers?.some((x) => x.kind === ts.SyntaxKind.ExportKeyword))
      if (n.name.text !== 'Source') EXPORTS_SOURCE.push(n.name.text)
    if (ts.isInterfaceDeclaration(n) && n.name.text === 'Source') {
      for (const m of n.members) {
        if (!ts.isMethodSignature(m) || !m.name || !ts.isIdentifier(m.name)) continue
        const params = m.parameters.map((p) => ({ nom: p.name.getText(sf), optionnel: !!p.questionToken, type: p.type?.getText(sf) ?? 'unknown' }))
        const ret = m.type?.getText(sf) ?? ''
        const t = ret.replace(/^Promise<([\s\S]*)>$/, '$1')
        res.set(m.name.text, { nom: m.name.text, params, retour: t, vide: /^Promise<void>$/.test(ret.replace(/\s/g, '')) })
      }
    }
  })
  return res
}

const SOURCE = lireSource()

// ——— 2. Schémas JSON des types (ts-json-schema-generator) ———

// Copie de source.ts pour le générateur : chemins d'import rendus absolus, et le type importé en ligne
// (import('./troc').EtatDeclare), que ts-json-schema-generator ne lit pas, remplacé par un import nommé.
const COPIE_TS = join(ICI, '.source-copie.ts')
function copierSource() {
  let t = readFileSync(SOURCE_TS, 'utf8')
  t = t.replace(/from '\.\.\//g, `from '${SITE}/src/`).replace(/from '\.\//g, `from '${SITE}/src/donnees/`)
  t = t.replace(/import\('\.\/troc'\)\.EtatDeclare/g, 'EtatDeclare')
  writeFileSync(COPIE_TS, `import type { EtatDeclare } from '${SITE}/src/donnees/troc'\n` + t)
}

function genererTypes(): Schema {
  copierSource()
  const lignes = [
    '// Fichier généré par generer-openapi.mts : ne pas modifier.',
    `import type { ${EXPORTS_SOURCE.join(', ')} } from './.source-copie'`,
    "import type { EtatDeclare } from '../../site/src/donnees/troc'",
    "import type { PaieFrais } from '../../site/src/donnees/echanges'",
    "export type { RUtilisateur, RJetons, RDeuxFacteurs, RNotification, RPanier, RProduit, RFavori, RAvis, RRelais, RCommande, RSessionAppareil } from '../../site/src/api/adaptateurs'",
  ]
  // Types que source.ts importe d'un module voisin (./contenus…) sans les réexporter : importés ici depuis ce module.
  for (const [, noms, mod] of readFileSync(SOURCE_TS, 'utf8').matchAll(/^import type \{([^}]+)\} from '\.\/([a-z-]+)'/gm))
    if (mod !== 'troc' && mod !== 'echanges') lignes.push(`import type {${noms}} from '../../site/src/donnees/${mod}'`)
  for (const m of SOURCE.values()) {
    if (!m.vide) lignes.push(`export type Reponse_${m.nom} = ${m.retour.replace(/import\('\.\/troc'\)\./g, '')}`)
    m.params.forEach((p, i) => lignes.push(`export type Param_${m.nom}_${i} = ${p.type}`))
  }
  writeFileSync(GEN_TS, lignes.join('\n') + '\n')
  const g = createGenerator({
    path: GEN_TS,
    tsconfig: join(SITE, 'tsconfig.app.json'),
    type: '*',
    expose: 'export',
    topRef: true,
    jsDoc: 'extended',
    skipTypeCheck: true,
    additionalProperties: true,
    sortProps: false,
  })
  return g.createSchema('*').definitions ?? {}
}

const nomPropre = (n: string) =>
  decodeURIComponent(n)
    .replace(/[^A-Za-z0-9_.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 120)

function versComposants(defs: Schema): Schema {
  const renom = new Map<string, string>()
  for (const k of Object.keys(defs)) renom.set(k, nomPropre(k))
  const fixer = (x: any): any => {
    if (Array.isArray(x)) return x.map(fixer)
    if (x && typeof x === 'object') {
      const o: any = {}
      for (const [k, v] of Object.entries(x)) {
        if (k === '$ref' && typeof v === 'string' && v.startsWith('#/definitions/')) {
          const cle = decodeURIComponent(v.slice('#/definitions/'.length))
          o.$ref = `#/components/schemas/${renom.get(cle) ?? nomPropre(cle)}`
        } else if (k === '$schema' || k === 'definitions') {
          // rien
        } else o[k] = fixer(v)
      }
      return o
    }
    return x
  }
  const out: Schema = {}
  for (const [k, v] of Object.entries(defs)) out[renom.get(k)!] = fixer(v)
  return out
}

// ——— 3. Lecture des routes écrites dans routes.ts ———

interface Champ {
  nom: string
  requis: boolean
  schema: Schema
}
interface RouteLue {
  methodes: Methode[]
  chemin: string // OpenAPI : /api/me/adresses/{id}
  query: { nom: string; valeur?: string }[]
  corps: Champ[] | null
  idempotent: boolean
}

const ENTIERS = new Set(['qte', 'montant', 'mois', 'jour', 'position', 'prix_vu', 'rappel', 'debut', 'fin'])
const BOOLEENS = new Set(['accepte', 'actif', 'suivre', 'principale', 'par_defaut', 'suspendu', 'mensuel', 'flash', 'discret', 'personnalisation', 'alerte_connexion', 'domicile'])
const LISTES: Record<string, Schema> = {
  proches: { type: 'array', items: { type: 'string' } },
  univers: { type: 'array', items: { type: 'string' } },
  lignes: { type: 'array', items: { type: 'string' } },
  photos: { type: 'array', items: { type: 'string', description: 'photo (adresse ou data: URL)' } },
  exclus: { type: 'array', items: { type: 'string' } },
  equivalents: { type: 'array', items: { type: 'string' } },
  notes: { type: 'array', items: { type: 'integer', minimum: 1, maximum: 5 } },
}
const OBJETS: Record<string, Schema> = {
  abonnement: { $ref: '#/components/schemas/AbonnementPush' },
}

/** Découpe « a, b: {c, d}, e » au premier niveau. */
function decouper(s: string): string[] {
  const out: string[] = []
  let prof = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '{') prof++
    if (ch === '}') prof--
    if (ch === ',' && prof === 0) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) out.push(cur)
  return out.map((x) => x.trim()).filter(Boolean)
}

function lireCorps(texte: string): Champ[] {
  const interieur = texte.trim().replace(/^\{/, '').replace(/\}$/, '')
  return decouper(interieur).map((item) => {
    let [gauche, ...reste] = item.split(':')
    let valeur = reste.join(':').trim()
    gauche = gauche.trim()
    let nullable = false
    if (/\|\s*null$/.test(gauche)) {
      nullable = true
      gauche = gauche.replace(/\|\s*null$/, '').trim()
    }
    const optionnel = gauche.endsWith('?')
    let nom = gauche.replace(/\?$/, '').trim()
    let description: string | undefined
    if (/\s/.test(nom)) {
      description = nom
      nom = nom.split(/\s+/)[0]
    }
    let schema: Schema
    if (valeur.startsWith('{')) {
      const enfants = lireCorps(valeur)
      schema = { type: 'object', properties: Object.fromEntries(enfants.map((c) => [c.nom, c.schema])), required: enfants.filter((c) => c.requis).map((c) => c.nom) }
      if (!schema.required.length) delete schema.required
    } else if (valeur === 'true' || valeur === 'false') schema = { type: 'boolean' }
    else if (/^[a-z_]+(\s*\|\s*[a-z_]+)*$/.test(valeur)) schema = { type: 'string', enum: valeur.split('|').map((v) => v.trim()) }
    else if (valeur) schema = { type: 'string', description: valeur }
    else if (ENTIERS.has(nom)) schema = { type: 'integer' }
    else if (BOOLEENS.has(nom)) schema = { type: 'boolean' }
    else if (LISTES[nom]) schema = LISTES[nom]
    else if (OBJETS[nom]) schema = OBJETS[nom]
    else schema = { type: 'string' }
    if (description) schema = { ...schema, description }
    if (nullable) schema = { anyOf: [schema, { type: 'null' }] }
    return { nom, requis: !optionnel, schema }
  })
}

const VERBE = /^(GET|POST|PUT|PATCH|DELETE)$/

function lireRoute(route: string): RouteLue[] {
  if (!route.includes('/api/')) return []
  const idem = /Idempotency-Key/.test(route)
  const segments = route
    .replace(/\(Idempotency-Key\)/g, '')
    .replace(/ puis | ou /g, ' · ')
    .split(' · ')
    .map((s) => s.trim())
    .filter(Boolean)
  const out: RouteLue[] = []
  let attente: Methode[] = []
  let precedent: RouteLue | null = null
  for (const seg of segments) {
    if (VERBE.test(seg)) {
      attente.push(seg.toLowerCase() as Methode)
      continue
    }
    const m = seg.match(/^(?:(GET|POST|PUT|PATCH|DELETE)\s+)?(\/[^\s{(]*(?:\{[^}\s]*\}[^\s{(]*)*)\s*(\{.*\})?\s*(\(.*\))?\s*$/)
    if (!m) continue
    let [, verbe, chemin, corps] = m
    let methodes: Methode[]
    if (verbe) methodes = [...attente, verbe.toLowerCase() as Methode]
    else if (precedent && !chemin.startsWith('/api/')) {
      methodes = precedent.methodes
      chemin = precedent.chemin.replace(/\/[^/]+$/, '') + chemin
    } else continue
    attente = []
    const [base, qs] = chemin.split('?')
    const query = (qs ?? '')
      .split('&')
      .filter(Boolean)
      .map((kv) => {
        const [nom, valeur] = kv.split('=')
        return { nom, valeur: valeur || undefined }
      })
    const propre = base.replace(/\{([a-z_]+)\|[a-z_]+\}/g, '{$1}')
    const r: RouteLue = { methodes, chemin: propre, query, corps: corps ? lireCorps(corps) : null, idempotent: idem }
    out.push(r)
    precedent = r
  }
  return out
}

/** « → 409 price_changed ; 422 over_cap, domicile » → { '409': ['price_changed'], '422': [...] } */
function lireCodes(texte: string): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const m of texte.matchAll(/\b([2-5]\d\d)\s+([A-Za-z_]+(?:\s*,\s*[A-Za-z_]+)*)/g)) {
    const codes = m[2].split(',').map((c) => c.trim())
    if (m[1].startsWith('2')) continue
    out[m[1]] = [...new Set([...(out[m[1]] ?? []), ...codes])]
  }
  return out
}

// ——— 4. Réponses des routes existantes de relaya-marketplace (formats DRF) ———

const ref = (n: string) => ({ $ref: `#/components/schemas/${n}` })
const listeOuPage = (n: string) => ({ oneOf: [{ type: 'array', items: ref(n) }, { type: 'object', properties: { count: { type: 'integer' }, next: { type: ['string', 'null'] }, results: { type: 'array', items: ref(n) } }, required: ['results'] }] })
const RELAYA: Record<string, Schema> = {
  'get /api/auth/me/': ref('RUtilisateur'),
  'post /api/auth/login/': { oneOf: [ref('RJetons'), ref('RDeuxFacteurs')] },
  'post /api/auth/refresh/': ref('RJetons'),
  'post /api/auth/google/': { oneOf: [ref('RJetons'), ref('RDeuxFacteurs')] },
  'post /api/auth/apple/': { oneOf: [ref('RJetons'), ref('RDeuxFacteurs')] },
  'get /api/auth/notifications/': listeOuPage('RNotification'),
  'get /api/auth/cart/': ref('RPanier'),
  'get /api/orders/my-orders/': listeOuPage('RCommande'),
  'get /api/orders/{id}/': ref('RCommande'),
  'get /api/catalog/products/': listeOuPage('RProduit'),
  'get /api/catalog/products/{id}/': ref('RProduit'),
  'get /api/catalog/products/{id}/reviews/': { type: 'array', items: ref('RAvis') },
  'get /api/auth/favorites/': listeOuPage('RFavori'),
  'post /api/auth/favorites/': ref('RFavori'),
  'get /api/shipping/relay-points/nearby/': listeOuPage('RRelais'),
  'get /api/auth/sessions/': { type: 'array', items: ref('RSessionAppareil') },
}

// Réponses composées à la main : une route sert plusieurs méthodes du site avec une seule réponse.
const REPONSES_SPECIALES: Record<string, Schema> = {
  // panier() et verifierPanier() : le panier recalculé, ses changements de prix (CAL-11), ses frais (moteur
  // frais.py) et l'éligibilité au comptoir (comptoir.py) : le site n'a plus à recalculer.
  'get /api/cart': {
    allOf: [
      ref('Reponse_panier'),
      {
        type: 'object',
        required: ['changements', 'frais', 'comptoir'],
        properties: {
          changements: { type: 'array', items: ref('ChangementPanier'), description: 'verifierPanier() : baisses déjà appliquées, hausses et retraits à accepter' },
          frais: { anyOf: [ref('FraisPanierServeur'), { type: 'null' }], description: 'null : panier vide' },
          comptoir: { anyOf: [ref('EligibiliteComptoir'), { type: 'null' }] },
          version_parametres: { type: 'string' },
        },
      },
    ],
  },
}
const SCHEMAS_SERVEUR: Record<string, Schema> = {
  FraisPanierServeur: {
    type: 'object',
    description: 'belivay_moteurs.frais.FraisPanier (CAL-06 à CAL-11), francs entiers',
    required: ['sous_total', 'ramassages', 'remises', 'supplements', 'offert', 'total', 'seuil', 'colis', 'manque_pour_seuil', 'progression_pour_cent'],
    properties: Object.fromEntries(
      ['sous_total', 'ramassages', 'remises', 'supplements', 'offert', 'total', 'seuil', 'colis', 'economie', 'reste_ramassages', 'manque_pour_seuil', 'progression_pour_cent'].map((k) => [k, { type: 'integer' }]),
    ),
  },
  EligibiliteComptoir: {
    type: 'object',
    description: 'belivay_moteurs.comptoir.eligibilite (CAL-13, CPN-36)',
    required: ['propose', 'plafond', 'palier'],
    properties: {
      propose: { type: 'boolean' },
      ligne: { type: ['string', 'null'], description: '« Paiement au comptoir non proposé : … », null : pas de ligne' },
      plafond: { type: 'integer' },
      palier: { type: 'string', enum: ['nouveau compte', 'standard', 'fidèle'] },
      maintenant: { type: 'integer', description: 'livraison payée d’avance' },
      au_retrait: { type: 'integer' },
    },
  },
}

// ——— 5. Conventions transverses ———

const PUBLIQUES = [
  /^\/api\/auth\/(login|register|refresh|google|apple|password\/forgot|password\/reset|otp\/send|diaspora\/register)/,
  /^\/api\/gift-links\/\{token\}$/,
  /^\/api\/gift-payments$/,
  /^\/api\/wishlists\/\{code\}/,
  /^\/api\/pools\/\{code\}/,
  /^\/api\/help\/faq/,
  /^\/api\/legal\/\{doc\}/,
  /^\/api\/config\/flags$/,
  /^\/api\/catalog\//,
  /^\/api\/contact\/$/,
  /^\/api\/flash-deals$/,
  /^\/api\/school-lists$/,
  /^\/api\/content\//,
]
// Listes paginées par curseur (CAP-05) : taille d'une page.
const PAGINEES: Record<string, number> = {
  notificationsClient: 30,
  litiges: 20,
  conversations: 20,
  factures: 20,
  demandesProches: 20,
  echanges: 20,
  cotisations: 20,
  misesDeCote: 20,
  trocs: 20,
}

const STATUT_MESSAGE: Record<string, string> = {
  '400': 'Requête invalide (champs)',
  '401': 'Non authentifié',
  '402': 'Paiement refusé',
  '403': 'Interdit',
  '404': 'Introuvable (ou module fermé par un interrupteur, CAP-13)',
  '409': 'Conflit : la situation a changé',
  '410': 'Plus disponible',
  '422': 'Refusé par une règle métier',
  '429': 'Trop de requêtes',
}

// ——— 6. Construction ———

interface Operation {
  methode: Methode
  chemin: string
  sources: string[]
  domaines: Set<string>
  etats: Set<string>
  idempotent: boolean
  corps: Champ[][]
  corpsSource: Schema[]
  reponses: Schema[]
  vide: boolean
  codes: Record<string, string[]>
  query: Map<string, string | undefined>
  notes: string[]
}

function construire() {
  const composants = versComposants(genererTypes())
  const ops = new Map<string, Operation>()
  const table: any[] = []

  for (const [nom, c] of Object.entries(CONNECTEURS) as [string, any][]) {
    const routes = lireRoute(c.route)
    const m = SOURCE.get(nom)
    const codes = lireCodes(`${c.route} ${c.echange ?? ''}`)
    for (const r of routes) {
      for (const methode of r.methodes) {
        const cle = `${methode} ${r.chemin}`
        let op = ops.get(cle)
        if (!op) {
          op = { methode, chemin: r.chemin, sources: [], domaines: new Set(), etats: new Set(), idempotent: false, corps: [], corpsSource: [], reponses: [], vide: true, codes: {}, query: new Map(), notes: [] }
          ops.set(cle, op)
        }
        op.sources.push(nom)
        op.domaines.add(c.domaine)
        op.etats.add(c.etat)
        op.idempotent ||= r.idempotent
        for (const q of r.query) op.query.set(q.nom, q.valeur)
        for (const [s, l] of Object.entries(codes)) op.codes[s] = [...new Set([...(op.codes[s] ?? []), ...l])]
        if (c.note) op.notes.push(`${nom} : ${c.note}`)
        if (r.corps) op.corps.push(r.corps)
        else if (m && methode !== 'get' && methode !== 'delete') {
          // Sans corps écrit dans routes.ts : les paramètres de la méthode qui ne sont pas dans le chemin.
          const dansChemin = (p: string) => r.chemin.includes('{') && ['id', 'ref', 'code', 'liste', 'p', 'lien'].includes(p)
          const restants = m.params.map((p, i) => ({ ...p, i })).filter((p) => !dansChemin(p.nom))
          if (restants.length === 1 && composants[`Param_${nom}_${restants[0].i}`]?.type === 'object') op.corpsSource.push(ref(`Param_${nom}_${restants[0].i}`))
          else if (restants.length)
            op.corpsSource.push({
              type: 'object',
              properties: Object.fromEntries(restants.map((p) => [p.nom, ref(`Param_${nom}_${p.i}`)])),
              required: restants.filter((p) => !p.optionnel).map((p) => p.nom),
            })
        }
        const relaya = RELAYA[cle]
        if (relaya) op.reponses.push(relaya)
        // Route du kit (sans barre finale) : réponse au format du site, branchée ou non ; route relaya branchée : son format (RELAYA).
        else if (m && !m.vide && (!r.chemin.endsWith('/') || (c.etat !== 'branche' && c.etat !== 'partiel' && c.etat !== 'front'))) op.reponses.push(ref(`Reponse_${nom}`))
        if (m && !m.vide) op.vide = false
        if (relaya) op.vide = false
      }
    }
  }

  // Routes du socle, absentes de routes.ts (le site les attend : CAP-13, refresh).
  const socle: [string, Operation][] = [
    [
      'get /api/config/flags',
      {
        methode: 'get', chemin: '/api/config/flags', sources: ['session (interrupteurs)'], domaines: new Set(['Socle']), etats: new Set(['serveur']), idempotent: false, corps: [], corpsSource: [],
        reponses: [ref('EtatInterrupteurs')], vide: false, codes: {}, query: new Map(), notes: ['Interrupteurs FF-* (CAP-13) : lus au démarrage ; un module fermé répond 404 sur ses routes.'],
      },
    ],
    // Contenus (apps/contenus) : page éditoriale libre, et téléversement des photos par l'équipe (is_staff).
    [
      'get /api/content/pages/{slug}',
      {
        methode: 'get', chemin: '/api/content/pages/{slug}', sources: ['(page éditoriale)'], domaines: new Set(['Contenus et photos']), etats: new Set(['serveur']), idempotent: false, corps: [], corpsSource: [],
        reponses: [{ type: 'object', required: ['slug', 'titre', 'corps', 'majLe'], properties: { slug: { type: 'string' }, titre: { type: 'string' }, corps: { type: 'string', description: 'Markdown' }, image: { oneOf: [ref('PhotoServeur'), { type: 'null' }] }, majLe: { type: 'integer', description: 'ms depuis 1970' } } }],
        vide: false, codes: {}, query: new Map<string, string | undefined>([['lang', undefined]]), notes: ['Public, Cache-Control public max-age=300. FAQ et textes légaux : /api/help/faq et /api/legal/{doc}.'],
      },
    ],
    [
      'post /api/admin/media',
      {
        methode: 'post', chemin: '/api/admin/media', sources: ['(admin : téléversement)'], domaines: new Set(['Contenus et photos']), etats: new Set(['serveur']), idempotent: false, corps: [],
        corpsSource: [{ type: 'object', required: ['fichier'], properties: { fichier: { type: 'string', format: 'binary', description: 'JPEG, PNG, WebP ou AVIF, 8 Mo au plus' }, alt: { type: 'string' } } }],
        reponses: [{ allOf: [ref('PhotoServeur'), { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } }] }],
        vide: false, codes: { '422': ['photo_type', 'photo_taille'] }, query: new Map(), notes: ['Équipe seulement (is_staff) : 403 sinon. Multipart. Variantes WebP 320/640/960/1600 px (srcset) si Pillow est installé.'],
      },
    ],
  ]
  for (const [k, o] of socle) if (!ops.has(k)) ops.set(k, o)

  const paths: Schema = {}
  const triees = [...ops.values()].sort((a, b) => a.chemin.localeCompare(b.chemin) || a.methode.localeCompare(b.methode))
  for (const op of triees) {
    // Chemins de relaya : barre finale ; routes du kit (spécification) : sans. L'état du connecteur côté site
    // (branché ou non) ne dit pas qui sert la route : une route du kit branchée reste « à créer » chez relaya (et
    // test_contrat.py vérifie qu'elle est dans les URL du kit). Une route relaya que le site ne lit pas encore
    // (état « serveur ») existe, mais doit être enrichie.
    const existe = op.chemin.endsWith('/')
    const aEnrichir = op.chemin.endsWith('/') && [...op.etats].every((e) => e === 'serveur')
    const params: Schema[] = []
    for (const p of op.chemin.matchAll(/\{([^}]+)\}/g)) params.push({ name: p[1], in: 'path', required: true, schema: { type: 'string' } })
    for (const [n, v] of op.query) params.push({ name: n, in: 'query', required: false, schema: v ? { type: 'string', enum: [v] } : { type: 'string' } })
    const pagine = op.methode === 'get' && op.sources.find((s) => PAGINEES[s])
    if (pagine) {
      params.push({ $ref: '#/components/parameters/Curseur' })
      params.push({ name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 50, default: PAGINEES[pagine] } })
    }
    if (op.idempotent) params.push({ $ref: '#/components/parameters/IdempotencyKey' })
    const publique = PUBLIQUES.some((r) => r.test(op.chemin))

    const corpsSchemas: Schema[] = []
    if (op.corps.length) {
      const fusion = new Map<string, Champ>()
      for (const liste of op.corps) for (const ch of liste) fusion.set(ch.nom, fusion.has(ch.nom) ? { ...ch, requis: false, schema: fusionner(fusion.get(ch.nom)!.schema, ch.schema) } : ch)
      const requis = op.corps.length === 1 ? [...fusion.values()].filter((c) => c.requis).map((c) => c.nom) : []
      corpsSchemas.push({ type: 'object', properties: Object.fromEntries([...fusion.values()].map((c) => [c.nom, c.schema])), ...(requis.length ? { required: requis } : {}) })
    }
    corpsSchemas.push(...op.corpsSource)
    const corps = corpsSchemas.length === 0 ? undefined : corpsSchemas.length === 1 ? corpsSchemas[0] : { oneOf: dedoublonner(corpsSchemas) }
    const multipart = /photos$|photo$|\/admin\/media$/.test(op.chemin)

    const reponses: Schema = {}
    const speciale = REPONSES_SPECIALES[`${op.methode} ${op.chemin}`]
    const uniques = speciale ? [speciale] : dedoublonner(op.reponses)
    let schemaOk = uniques.length === 0 ? undefined : uniques.length === 1 ? uniques[0] : { oneOf: uniques }
    if (schemaOk && pagine && !existe) schemaOk = { allOf: [schemaOk, { type: 'object', properties: { next_cursor: { type: ['string', 'null'], description: 'Curseur de la page suivante (CAP-05) ; null : dernière page' } } }] }
    const statutOk = op.methode === 'post' && /\/(otp\/send|password\/forgot)$/.test(op.chemin) ? '202' : op.vide && !schemaOk ? '204' : '200'
    reponses[statutOk] = schemaOk ? { description: 'Succès', content: { 'application/json': { schema: schemaOk } } } : { description: 'Succès, sans contenu' }
    if (!publique) reponses['401'] = { $ref: '#/components/responses/NonAuthentifie' }
    if (op.corps.length || op.corpsSource.length) reponses['400'] = { $ref: '#/components/responses/Invalide' }
    for (const [s, codes] of Object.entries(op.codes).sort()) {
      reponses[s] = {
        description: `${STATUT_MESSAGE[s] ?? 'Erreur'} : ${codes.join(', ')}`,
        content: { 'application/json': { schema: { allOf: [ref('Erreur'), { type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string', enum: codes } } } } }] } } },
      }
    }
    if (op.methode === 'get' && op.chemin.includes('{')) reponses['404'] ??= { $ref: '#/components/responses/Introuvable' }
    if (op.methode !== 'get') reponses['429'] ??= { $ref: '#/components/responses/TropDeRequetes' }

    const etat = aEnrichir ? 'existe (relaya-marketplace), à enrichir' : existe ? 'existe (relaya-marketplace)' : 'à créer'
    const operation: Schema = {
      // relaya termine ses chemins par « / » ; les routes à créer n'en ont pas (noms de la spécification).
      operationId: `${op.methode}_${op.chemin.replace(/^\/api\//, '').replace(/[{}]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/_$/, '')}${op.chemin.endsWith('/') ? '_relaya' : ''}`,
      tags: [...op.domaines],
      summary: `${op.sources.join(', ')} — ${etat}`,
      description: [`Méthode(s) de la source du site : ${op.sources.map((s) => `\`${s}\``).join(', ')}.`, ...op.notes.map((n) => `- ${n}`)].join('\n'),
      'x-belivay-etat': [...op.etats].join(','),
      'x-belivay-sources': op.sources,
      ...(params.length ? { parameters: params } : {}),
      ...(corps && op.methode !== 'get' ? { requestBody: { required: true, content: multipart ? { 'multipart/form-data': { schema: corps } } : { 'application/json': { schema: corps } } } } : {}),
      responses: reponses,
      ...(publique ? { security: [{}, { jwt: [] }] } : {}),
    }
    paths[op.chemin] ??= {}
    paths[op.chemin][op.methode] = operation
    table.push({
      methode: op.methode.toUpperCase(),
      chemin: op.chemin,
      sources: op.sources,
      domaines: [...op.domaines],
      etat: aEnrichir ? 'a_enrichir' : existe ? 'existe' : 'a_creer',
      idempotent: op.idempotent,
      publique,
      pagine: !!pagine,
    })
  }

  const doc = {
    openapi: '3.1.0',
    info: {
      title: 'BelivaY — API de l’espace client',
      version: '0.1.0',
      description: [
        'Contrat des routes que le site client (site/, VITE_SOURCE=api) appelle : les routes existantes de relaya-marketplace',
        '(commit 9546ffe) et toutes les routes à créer. Généré par backend-kit/outils/generer-openapi.mts depuis',
        'site/src/api/routes.ts et site/src/donnees/source.ts ; ne pas modifier à la main.',
        '',
        '- Réponses des routes à créer : les types de source.ts tels quels (champs camelCase, dates en ms).',
        '- Montants : francs CFA entiers (CAP-06). Erreurs : `{ "error": { "code", "message", "data" } }` (CAP-04).',
        '- `Idempotency-Key` : même clé, même réponse, pendant 24 h (CAP-03).',
        '- Pagination par curseur (`cursor`, `next_cursor`, CAP-05). Langue : `Accept-Language` (CAP-08).',
        '- Un module fermé par son interrupteur (FF-*) répond 404 sur ses routes (CAP-13).',
      ].join('\n'),
    },
    servers: [{ url: 'https://belivay.com', description: 'Production (nginx route /api/ vers Django)' }, { url: 'http://localhost:8000', description: 'Développement' }],
    security: [{ jwt: [] }],
    tags: [...new Set(table.flatMap((t) => t.domaines))].map((n) => ({ name: n })),
    paths,
    components: {
      securitySchemes: { jwt: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'simplejwt (POST /api/auth/login/, /api/auth/refresh/)' } },
      parameters: {
        IdempotencyKey: { name: 'Idempotency-Key', in: 'header', required: true, description: 'Clé d’idempotence (CAP-03) : la même clé rejoue la même réponse ; une clé réutilisée avec un autre corps répond 422 idempotency_mismatch.', schema: { type: 'string', minLength: 8, maxLength: 120 } },
        Curseur: { name: 'cursor', in: 'query', required: false, description: 'Curseur opaque rendu dans next_cursor (CAP-05).', schema: { type: 'string' } },
        DeviceId: { name: 'X-Device-Id', in: 'header', required: false, description: 'Identifiant de l’appareil (CAP-02) : panier d’un visiteur.', schema: { type: 'string' } },
      },
      responses: {
        NonAuthentifie: { description: 'Jeton absent, expiré ou révoqué', content: { 'application/json': { schema: ref('Erreur') } } },
        Invalide: { description: 'Champs invalides : error.code = invalid, error.data.fields = { champ: [messages] }', content: { 'application/json': { schema: ref('Erreur') } } },
        Introuvable: { description: 'Introuvable, ou module fermé (CAP-13)', content: { 'application/json': { schema: ref('Erreur') } } },
        TropDeRequetes: { description: 'Limitation de débit (CAP-20) ; en-tête Retry-After', content: { 'application/json': { schema: ref('Erreur') } } },
      },
      schemas: {
        Erreur: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: { type: 'string', description: 'Code stable en snake_case (CAP-04)' },
                message: { type: 'string', description: 'Message déjà traduit (Accept-Language)' },
                data: { description: 'Détails (fields pour une erreur de champs, montants pour price_changed…)' },
              },
            },
          },
        },
        ...SCHEMAS_SERVEUR,
        ...composants,
      },
    },
  }
  return { doc, table }
}

function fusionner(a: Schema, b: Schema): Schema {
  if (a.enum && b.enum) return { ...a, enum: [...new Set([...a.enum, ...b.enum])] }
  if (JSON.stringify(a) === JSON.stringify(b)) return a
  return { anyOf: dedoublonner([a, b]) }
}
function dedoublonner(l: Schema[]): Schema[] {
  const vus = new Set<string>()
  return l.filter((x) => {
    const k = JSON.stringify(x)
    if (vus.has(k)) return false
    vus.add(k)
    return true
  })
}

// Montants, dates, compteurs : entiers (CAP-06) ; seules les distances, positions, poids, taux et montants en
// devise restent décimaux.
const DECIMAUX = new Set(['km', 'lat', 'lon', 'precision', 'poids', 'enDevise', 'pourCent', 'rating', 'rating_average'])
function entiers(x: any, nom: string | null = null): any {
  if (Array.isArray(x)) return x.map((v) => entiers(v, nom))
  if (!x || typeof x !== 'object') return x
  const o: any = {}
  for (const [k, v] of Object.entries(x)) {
    if (k === 'properties') o[k] = Object.fromEntries(Object.entries(v as any).map(([pk, pv]) => [pk, entiers(pv, pk)]))
    else if (['anyOf', 'oneOf', 'allOf', 'items', 'additionalProperties'].includes(k)) o[k] = entiers(v, nom)
    else o[k] = entiers(v, null)
  }
  if (o.type === 'number' && nom !== null && !DECIMAUX.has(nom)) o.type = 'integer'
  if (Array.isArray(o.type) && nom !== null && !DECIMAUX.has(nom)) o.type = o.type.map((t: string) => (t === 'number' ? 'integer' : t))
  return o
}

// Ne garde que les schémas atteints depuis les chemins.
function elaguer(doc: any) {
  const schemas = doc.components.schemas
  const garde = new Set<string>()
  const visiter = (x: any) => {
    if (Array.isArray(x)) return x.forEach(visiter)
    if (!x || typeof x !== 'object') return
    for (const [k, v] of Object.entries(x)) {
      if (k === '$ref' && typeof v === 'string' && v.startsWith('#/components/schemas/')) {
        const n = v.slice('#/components/schemas/'.length)
        if (!garde.has(n)) {
          garde.add(n)
          visiter(schemas[n])
        }
      } else visiter(v)
    }
  }
  visiter(doc.paths)
  visiter(doc.components.responses)
  visiter(doc.components.parameters)
  for (const n of Object.keys(schemas)) if (!garde.has(n)) delete schemas[n]
}

const construit = construire()
const table = construit.table
const doc = entiers(construit.doc)
elaguer(doc)
mkdirSync(resolve(ICI, '..'), { recursive: true })
writeFileSync(resolve(ICI, '../openapi.yaml'), '# Généré par backend-kit/outils/generer-openapi.mts : ne pas modifier à la main.\n' + YAML.stringify(doc, { lineWidth: 0, aliasDuplicateObjects: false }))
writeFileSync(join(ICI, 'routes.json'), JSON.stringify(table, null, 1) + '\n')
// Copie lue par le test du contrat (apps/client_core/tests/test_contrat.py), qui voyage avec les applications.
writeFileSync(resolve(ICI, '../apps/client_core/donnees/routes-contrat.json'), JSON.stringify(table, null, 1) + '\n')
const n = table.length
const aCreer = table.filter((t) => t.etat === 'a_creer').length
console.log(`openapi.yaml : ${Object.keys(doc.paths).length} chemins, ${n} opérations (${aCreer} à créer, ${n - aCreer} existantes) ; ${Object.keys(doc.components.schemas).length} schémas`)
