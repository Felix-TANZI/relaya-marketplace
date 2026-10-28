// DONNÉES DE DÉMONSTRATION — domaine « intégrations » (ENT-P26) : fermées au lancement (integrations_actives), débit et
// durée des rappels lus dans le registre. Environnement de test ouvert : une clé de test par entreprise (valeur tirée
// au hasard, masquée dans les listes), rappels de test (https seulement), journal des appels de test, débit par minute
// appliqué (429 au-delà, journalisé). Propriétaire seulement ; chaque geste sur une clé est journalisé (Paramètres).
import type { AppelApi, DomaineIntegrations, EnvApi, EvenementRappel, RefusIntegrations, RappelApi } from '../donnees/domaines/integrations'
import type { Resultat } from '../donnees/communs'
import { OUTILS } from '../calculs/ent08'
import { MINUTE } from '../calculs/temps'
import { exiger } from './acces'
import { maintenant } from './horloge'
import { T } from './jeu-essai'
import { journaliser } from './parametres'
import { magasin, repondre } from './stockage'

const tirer = (env: EnvApi) => `blv_${env}_` + [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('')
const apercu = (v: string) => v.replace(/^(blv_\w+?_).*(.{4})$/, '$1••••••••$2')
const appel = (le: number, chemin: string, statut: number, dureeMs: number, genre: AppelApi['genre'] = 'appel', methode: AppelApi['methode'] = 'GET'): AppelApi => ({ id: `AP-${le}-${chemin.length}-${statut}`, le, env: 'test', genre, methode, chemin, statut, dureeMs })

interface Cle {
  id: string
  env: EnvApi
  valeur: string
  creeLe: number
  derniereUtilisation: number | null
}

export const integrationsDemo = magasin('integrations', () => ({
  cles: [{ id: 'CLE-T1', env: 'test' as EnvApi, valeur: 'blv_test_8c41d0e95a7b2f6c13e4a9d07b5f3f9a', creeLe: T(-3 * 24 * 60), derniereUtilisation: T(-35) }] as Cle[],
  rappels: [{ id: 'RP-1', url: 'https://gestion.yafeexpress.cm/belivay/rappels', evenements: ['paquet_publie', 'statut'], actif: true, echecs: 0, derniereTentative: T(-36), dernierStatut: 200 }] as RappelApi[],
  journal: [
    appel(T(-35), '/v1/packages?zone=Z3', 200, 182),
    appel(T(-36), 'paquet_publie → https://gestion.yafeexpress.cm/belivay/rappels', 200, 240, 'rappel', 'POST'),
    appel(T(-50), '/v1/packages/PQ-TEST-0007/accept', 409, 96, 'appel', 'POST'),
    appel(T(-52), '/v1/packages/PQ-TEST-0007', 200, 74),
    appel(T(-24 * 60), '/v1/missions?status=open', 200, 133),
    appel(T(-24 * 60 - 3), '/v1/packages', 401, 18),
  ] as AppelApi[],
}))

const non = <T extends object = object>(raison: RefusIntegrations): Promise<Resultat<T, RefusIntegrations>> => repondre({ ok: false as const, raison })
const cetteMinute = () => integrationsDemo.lire().journal.filter((a) => a.genre === 'appel' && a.le > maintenant() - MINUTE).length

export const demoIntegrations: DomaineIntegrations = {
  async etat() {
    exiger(['proprietaire'], 'Intégrations')
    return repondre({ actives: OUTILS.integrationsActives, debitParMinute: OUTILS.debitParMinute, reessaisH: OUTILS.webhookH })
  },
  async espace() {
    exiger(['proprietaire'], 'Intégrations')
    const s = integrationsDemo.lire()
    return repondre({
      cles: s.cles.map((c) => ({ id: c.id, env: c.env, apercu: apercu(c.valeur), creeLe: c.creeLe, derniereUtilisation: c.derniereUtilisation })),
      rappels: s.rappels,
      journal: [...s.journal].sort((a, b) => b.le - a.le),
      quota: { parMinute: OUTILS.debitParMinute, cetteMinute: cetteMinute() },
    })
  },
  async creerCle(env) {
    exiger(['proprietaire'], 'Créer une clé d’API')
    if (env === 'production' && !OUTILS.integrationsActives) return non('fermee')
    if (integrationsDemo.lire().cles.some((c) => c.env === env)) return non('existe')
    const valeur = tirer(env)
    integrationsDemo.ecrire((s) => void s.cles.push({ id: 'CLE-' + maintenant(), env, valeur, creeLe: maintenant(), derniereUtilisation: null }))
    journaliser(`Clé d’API ${env === 'test' ? 'de test' : 'de production'} créée`)
    return repondre({ ok: true as const, valeur })
  },
  async revelerCle(id) {
    exiger(['proprietaire'], 'Voir une clé d’API')
    const c = integrationsDemo.lire().cles.find((x) => x.id === id)
    if (!c) return non('introuvable')
    journaliser(`Clé d’API ${c.env === 'test' ? 'de test' : 'de production'} affichée`)
    return repondre({ ok: true as const, valeur: c.valeur })
  },
  async regenererCle(id) {
    exiger(['proprietaire'], 'Régénérer une clé d’API')
    const c = integrationsDemo.lire().cles.find((x) => x.id === id)
    if (!c) return non('introuvable')
    const valeur = tirer(c.env)
    integrationsDemo.ecrire((s) => {
      const x = s.cles.find((y) => y.id === id)!
      x.valeur = valeur
      x.creeLe = maintenant()
      x.derniereUtilisation = null
    })
    journaliser(`Clé d’API ${c.env === 'test' ? 'de test' : 'de production'} régénérée : l’ancienne ne marche plus`)
    return repondre({ ok: true as const, valeur })
  },
  async ajouterRappel(url, evenements) {
    exiger(['proprietaire'], 'Ajouter un rappel')
    const u = url.trim()
    if (!/^https:\/\/[^\s/]+\.[^\s/]+(\/\S*)?$/.test(u)) return non('url')
    if (!evenements.length) return non('evenements')
    if (integrationsDemo.lire().rappels.some((r) => r.url === u)) return non('existe')
    integrationsDemo.ecrire((s) => void s.rappels.push({ id: 'RP-' + maintenant(), url: u, evenements: [...new Set(evenements)] as EvenementRappel[], actif: true, echecs: 0, derniereTentative: null, dernierStatut: null }))
    journaliser('Adresse de rappel ajoutée')
    return repondre({ ok: true as const })
  },
  async retirerRappel(id) {
    exiger(['proprietaire'], 'Retirer un rappel')
    if (!integrationsDemo.lire().rappels.some((r) => r.id === id)) return non('introuvable')
    integrationsDemo.ecrire((s) => void (s.rappels = s.rappels.filter((r) => r.id !== id)))
    journaliser('Adresse de rappel retirée')
    return repondre({ ok: true as const })
  },
  async essayerRappel(id) {
    exiger(['proprietaire'], 'Essayer un rappel')
    const r = integrationsDemo.lire().rappels.find((x) => x.id === id)
    if (!r) return non('introuvable')
    // L'adresse de démonstration de l'entreprise répond ; toute autre adresse est injoignable depuis la démonstration.
    const statut = /yafeexpress\.cm/.test(r.url) ? 200 : 503
    const le = maintenant()
    integrationsDemo.ecrire((s) => {
      const x = s.rappels.find((y) => y.id === id)!
      x.derniereTentative = le
      x.dernierStatut = statut
      x.echecs = statut < 300 ? 0 : x.echecs + 1
      s.journal.push({ ...appel(le, `essai → ${r.url}`, statut, statut < 300 ? 210 : 5000, 'rappel', 'POST'), id: `AP-${le}-${s.journal.length}` })
    })
    return repondre({ ok: true as const, statut })
  },
  async appelDeTest(chemin) {
    exiger(['proprietaire'], 'Appel de test')
    const c = integrationsDemo.lire().cles.find((x) => x.env === 'test')
    if (!c) return non('sans_cle')
    const le = maintenant()
    const statut = cetteMinute() >= OUTILS.debitParMinute ? 429 : 200
    integrationsDemo.ecrire((s) => {
      s.journal.push({ ...appel(le, chemin, statut, statut === 429 ? 4 : 120 + (le % 90)), id: `AP-${le}-${s.journal.length}` })
      if (statut === 200) s.cles.find((x) => x.id === c.id)!.derniereUtilisation = le
    })
    return statut === 429 ? non('quota') : repondre({ ok: true as const, statut })
  },
}
