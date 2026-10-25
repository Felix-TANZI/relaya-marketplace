// DONNÉES DE DÉMONSTRATION — domaine « paramètres » (ENT-P24) : trois accès nominatifs sur acces_internes_max, appareils,
// préférences de notification par utilisateur (alertes verrouillées forcées, src/calculs/ent08.ts), point de stockage
// de nuit, journal des modifications (auteur, date). Le propriétaire seul modifie les utilisateurs et le stockage ; un
// autre rôle ne reçoit que son propre accès. Export de mes données après un code SMS (DED-31).
import type { Appareil, DomaineParametres, PreferencesNotifications, RefusParametres, UtilisateurInterne } from '../donnees/domaines/parametres'
import type { Resultat, Role } from '../donnees/communs'
import { PARAMETRES } from '../calculs/registre'
import { OUTILS, motDePasseValide, type Canal, type TypeAlerte } from '../calculs/ent08'
import { maintenant } from './horloge'
import { MOT_DE_PASSE_DEMO, UTILISATEURS, ZONES } from './jeu-essai'
import { exiger, roleCourant, sessionDemo } from './acces'
import { J } from './prestations'
import { magasin, repondre } from './stockage'

const TYPES: TypeAlerte[] = ['paquet', 'non_affecte', 'depart', 'incident', 'litige', 'versement_refuse', 'vente_flash', 'document']
const parDefaut = (role: Role): PreferencesNotifications => ({
  zones: ZONES.map((z) => z.code),
  matrice: Object.fromEntries(TYPES.map((t) => [t, [...OUTILS.canauxParDefaut, ...(OUTILS.typesSms.includes(t) ? (['sms'] as Canal[]) : [])]])) as Record<TypeAlerte, Canal[]>,
  resumeQuotidien: role === 'proprietaire',
  plageCalme: null,
})

interface Interne {
  id: string
  prenom: string
  nom: string
  role: Role
  telephone: string
  email: string
  derniereConnexion: number | null
  statut: UtilisateurInterne['statut']
}

export const parametresDemo = magasin('parametres', () => ({
  utilisateurs: UTILISATEURS.map((u, i): Interne => ({ id: u.id, prenom: u.prenom, nom: u.nom, role: u.role, telephone: u.telephone, email: u.email, derniereConnexion: J(0, 8 + i, 2 + 7 * i), statut: 'actif' })),
  appareils: {
    'u-gaelle': [
      { id: 'AP-1', nom: 'Chrome · macOS', lieu: 'Yaoundé', vuLe: J(0, 13, 0), actuel: true },
      { id: 'AP-2', nom: 'Téléphone Android', lieu: 'Yaoundé', vuLe: J(0, 8, 2), actuel: false },
    ],
  } as Record<string, Appareil[]>,
  preferences: {} as Record<string, PreferencesNotifications>,
  motsDePasse: {} as Record<string, string>,
  stockage: { adresse: 'Agence Yafé Express, carrefour Mokolo-Elobi', consignes: 'Étagères surélevées, local fermé à clé, au sec.', modifieLe: J(-1, 12, 40), par: 'Gaëlle Wankeu' },
  journal: [
    { le: J(-1, 12, 40), par: 'Gaëlle Wankeu', quoi: 'Point de stockage de nuit déclaré' },
    { le: J(-1, 12, 52), par: 'Gaëlle Wankeu', quoi: 'Accès créé : Serge Mbarga (répartiteur)' },
    { le: J(-1, 12, 55), par: 'Gaëlle Wankeu', quoi: 'Accès créé : Aline Fotso (comptable)' },
  ],
  defi: null as { id: string; code: string } | null,
}))

const moiId = () => sessionDemo.lire().utilisateurId
export const auteur = () => {
  const u = parametresDemo.lire().utilisateurs.find((x) => x.id === moiId())!
  return `${u.prenom} ${u.nom}`
}
const masquerTel = (t: string) => `${t.slice(0, 4)} ${t.slice(4, 5)} ${t.slice(5, 7)} ·· ·· ${t.slice(-2)}`
const non = (raison: RefusParametres): Promise<Resultat<never, RefusParametres>> => repondre({ ok: false as const, raison })
const tirer = () => [...Array(PARAMETRES.acces.longueurCode)].map(() => Math.floor(Math.random() * 10)).join('')
export const journaliser = (quoi: string) => parametresDemo.ecrire((s) => void s.journal.unshift({ le: maintenant(), par: auteur(), quoi }))

export const demoParametres: DomaineParametres = {
  async utilisateurs() {
    const proprio = roleCourant() === 'proprietaire'
    const moi = moiId()
    return repondre(
      parametresDemo
        .lire()
        .utilisateurs.filter((u) => proprio || u.id === moi)
        .map((u) => ({ id: u.id, nom: `${u.prenom} ${u.nom}`.trim(), role: u.role, telephone: u.id === moi ? u.telephone : masquerTel(u.telephone), email: u.email, derniereConnexion: u.derniereConnexion, codeSms: u.role !== 'repartiteur', statut: u.statut, moi: u.id === moi })),
    )
  },
  async inviter(p) {
    exiger(['proprietaire'], 'Inviter un utilisateur')
    const nom = p.nom.trim().replace(/\s+/g, ' ')
    const tel = '+237' + p.telephone.replace(/\D/g, '').replace(/^237/, '')
    if (nom.length < 3 || !nom.includes(' ')) return non('nom')
    if (!/^\+2376\d{8}$/.test(tel)) return non('telephone')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim())) return non('email')
    if (p.role === 'proprietaire') return non('role')
    const us = parametresDemo.lire().utilisateurs
    if (us.filter((u) => u.statut !== 'retire').length >= PARAMETRES.acces.accesInternesMax) return non('limite')
    if (us.some((u) => u.statut !== 'retire' && (u.telephone === tel || u.email.toLowerCase() === p.email.trim().toLowerCase()))) return non('doublon')
    const [prenom, ...reste] = nom.split(' ')
    parametresDemo.ecrire((s) => void s.utilisateurs.push({ id: 'u-' + maintenant(), prenom, nom: reste.join(' '), role: p.role, telephone: tel, email: p.email.trim(), derniereConnexion: null, statut: 'invite' }))
    journaliser(`Invitation envoyée : ${nom} (${p.role === 'gerant' ? 'gérant' : p.role === 'repartiteur' ? 'répartiteur' : 'comptable'})`)
    return repondre({ ok: true as const })
  },
  async retirer(id) {
    exiger(['proprietaire'], 'Retirer un utilisateur')
    const u = parametresDemo.lire().utilisateurs.find((x) => x.id === id)
    if (!u || u.id === moiId() || u.role === 'proprietaire') return non('soi')
    parametresDemo.ecrire((s) => void (s.utilisateurs.find((x) => x.id === id)!.statut = 'retire'))
    journaliser(`Accès retiré, sessions révoquées : ${u.prenom} ${u.nom}`)
    return repondre({ ok: true as const })
  },
  async reglages() {
    const s = parametresDemo.lire()
    return repondre({ pointStockage: s.stockage, accesMax: PARAMETRES.acces.accesInternesMax, zonesExploitees: ZONES.map((z) => ({ code: z.code, nom: z.nom })), journal: s.journal })
  },
  async modifierStockage(adresse, consignes) {
    exiger(['proprietaire'], 'Modifier le point de stockage')
    if (adresse.trim().length < 10) return non('adresse')
    parametresDemo.ecrire((s) => void (s.stockage = { adresse: adresse.trim(), consignes: consignes.trim(), modifieLe: maintenant(), par: auteur() }))
    journaliser('Point de stockage de nuit modifié')
    return repondre({ ok: true as const })
  },
  async appareils() {
    const a = parametresDemo.lire().appareils[moiId()]
    return repondre(a ?? [{ id: 'AP-' + moiId(), nom: 'Chrome · Windows', lieu: 'Yaoundé', vuLe: maintenant(), actuel: true }])
  },
  async deconnecterAppareil(id) {
    parametresDemo.ecrire((s) => void (s.appareils[moiId()] = (s.appareils[moiId()] ?? []).filter((a) => a.id !== id || a.actuel)))
  },
  async changerMotDePasse(actuel, nouveau) {
    const s = parametresDemo.lire()
    if (actuel !== (s.motsDePasse[moiId()] ?? MOT_DE_PASSE_DEMO)) return non('mot_de_passe')
    if (!motDePasseValide(nouveau) || nouveau === actuel) return non('faible')
    parametresDemo.ecrire((x) => void (x.motsDePasse[moiId()] = nouveau))
    journaliser('Mot de passe changé (autres appareils déconnectés)')
    parametresDemo.ecrire((x) => void (x.appareils[moiId()] = (x.appareils[moiId()] ?? []).filter((a) => a.actuel)))
    return repondre({ ok: true as const })
  },
  async notifications() {
    return repondre(parametresDemo.lire().preferences[moiId()] ?? parDefaut(roleCourant()))
  },
  async reglerNotifications(p) {
    // Les alertes verrouillées gardent tous leurs canaux, quoi qu'on envoie (le serveur ignore le changement).
    const d = parDefaut(roleCourant())
    const propre: PreferencesNotifications = { ...p, matrice: { ...p.matrice } }
    for (const t of OUTILS.alertesVerrouillees) propre.matrice[t] = d.matrice[t]
    if (!propre.zones.length) return non('adresse')
    const h = (x: number) => Number.isInteger(x) && x >= 0 && x <= 23
    if (propre.plageCalme && (!h(propre.plageCalme.de) || !h(propre.plageCalme.a) || propre.plageCalme.de === propre.plageCalme.a)) return non('plage')
    parametresDemo.ecrire((s) => void (s.preferences[moiId()] = propre))
    return repondre({ ok: true as const })
  },
  async demanderExport() {
    const id = 'EX-' + maintenant()
    const code = tirer()
    parametresDemo.ecrire((s) => void (s.defi = { id, code }))
    return repondre({ defi: id, codeDemo: code })
  },
  async exporter(defi, code) {
    const s = parametresDemo.lire()
    if (!s.defi || s.defi.id !== defi || s.defi.code !== code.trim()) return non('code')
    const u = s.utilisateurs.find((x) => x.id === moiId())!
    const contenu = JSON.stringify({ profil: { prenom: u.prenom, nom: u.nom, role: u.role, telephone: u.telephone, email: u.email }, appareils: s.appareils[u.id] ?? [], notifications: s.preferences[u.id] ?? null, journal: s.journal.filter((j) => j.par === `${u.prenom} ${u.nom}`) }, null, 2)
    parametresDemo.ecrire((x) => void (x.defi = null))
    return repondre({ ok: true as const, nom: `mes-donnees-belivay-${u.id}.json`, contenu })
  },
}
