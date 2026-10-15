// DONNÉES DE DÉMONSTRATION — domaine « compte » : profil du membre connecté (propriétaire ou accès Préparation), comme
// le client (DP-52 : photo rognée, nom, e-mail et numéro changés avec des codes), appareils regroupés, mot de passe et
// second facteur, Face ID (S-1), statut du compte et grille calculée par src/calculs (SEC-05), export et clôture avec
// un code SMS (Q-23). Code de démonstration : 123456 (l'API ne le renvoie jamais).
import type { Appareil, DomaineCompte, MotifCode, Profil, Securite, StatutCompte } from '../donnees/domaines/compte'
import { ReserveAuProprietaire } from '../donnees/communs'
import { Dec } from '../calculs/argent'
import { decouverteActive, finDecouverte } from '../calculs/commission'
import { PARAMETRES } from '../calculs/registre'
import { JOUR, jourDe, yaounde } from '../calculs/temps'
import { maintenant } from './horloge'
import { BOUTIQUE, COMMANDES, MEMBRES } from './jeu-essai'
import { commandesComptees, etatCommandes, etatEffectif } from './commandes'
import { demoMessages } from './messages'
import { demoSession, lireBiometrie, roleCourant } from './session'
import { magasin, repondre } from './stockage'

const CODE_DEMO = '123456'
const RENVOI_S = 60 // CIN-34
const PREAVIS_CLOTURE_J = PARAMETRES.console.preavisJours // VD-RESILIATION-PREAVIS (SEC-03)
const EXPORT_H = 48 // VD11-R36

const profilInitial = (m: (typeof MEMBRES)[number], email: string | null): Profil => ({
  prenom: m.prenom,
  nom: m.nom,
  email,
  telephone: m.telephone,
  photo: null,
  couverture: null,
  role: m.role,
  identifiant: m.role === 'proprietaire' ? BOUTIQUE.identifiant : '@' + m.prenom.normalize('NFD').replace(/[̀-ͯ]/g, '') + 'N',
  titulaire: m.role === 'proprietaire',
})

const initial = () => ({
  forme: 2,
  profils: Object.fromEntries(MEMBRES.map((m) => [m.id, profilInitial(m, m.role === 'proprietaire' ? 'franck.penga@exemple.cm' : null)])) as Record<string, Profil>,
  emailEnAttente: null as string | null,
  numeroEnAttente: null as string | null,
  codeEnvoyeA: {} as Record<string, number>,
  appareils: [
    { id: 'a1', nom: 'iPhone · Safari', type: 'telephone', lieu: 'Yaoundé', vuA: yaounde(2026, 9, 21, 9, 48), premiere: yaounde(2026, 5, 7, 10, 2), ouvertures: 138, actuel: true },
    { id: 'a2', nom: 'Android · Chrome', type: 'telephone', lieu: 'Yaoundé', vuA: yaounde(2026, 9, 14, 18, 2), premiere: yaounde(2026, 9, 12, 8, 30), ouvertures: 3, actuel: false },
  ] as Appareil[],
  faceId: true,
  exportDemandeLe: null as number | null,
  clotureDemandeeLe: null as number | null,
})
const etat = magasin('compte', initial)
if ((etat.lire() as { forme?: number }).forme !== 2) etat.reinitialiser()

const membreId = () => (roleCourant() === 'preparation' ? MEMBRES.find((m) => m.role === 'preparation')!.id : MEMBRES.find((m) => m.role === 'proprietaire')!.id)
const moi = () => etat.lire().profils[membreId()]
/** « +237 6 77 12 42 17 » → « 6•• •• •• 17 » (jamais le numéro entier à l'écran). */
export const masquer = (tel: string) => {
  const n = tel.replace(/\D/g, '').replace(/^237/, '')
  return `${n[0]}•• •• •• ${n.slice(-2)}`
}
const telephoneFormate = (n: string) => `+237 ${n[0]} ${n.slice(1, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7)}`

function aSolder(): Securite['aSolder'] {
  const e = etatCommandes.lire()
  // État effectif : un litige ou un retour clos ne compte plus (CMD-07), comme le Menu et les commandes.
  const n = (f: (etape: string) => boolean) => COMMANDES.filter((c) => f(etatEffectif(c.ref, e[c.ref]).etape)).length
  return [
    { type: 'commandes' as const, nombre: n((x) => x === 'a_preparer' || x === 'chez_le_livreur' || x === 'retour'), route: 'commandes' },
    { type: 'litiges' as const, nombre: n((x) => x === 'litige'), route: 'litiges' },
    { type: 'versements' as const, nombre: n((x) => x === 'a_verser' || x === 'se_libere'), route: 'versements' },
  ].filter((x) => x.nombre > 0)
}

function securite(): Securite {
  const e = etat.lire()
  const now = maintenant()
  return {
    // Face ID / empreinte : même état que l'écran faceid (domaine session) dès qu'il a été réglé (DP-57 S-1).
    faceId: lireBiometrie().proposee ? lireBiometrie().active : e.faceId,
    telephoneMasque: masquer(moi().telephone),
    exportDemandeLe: e.exportDemandeLe,
    exportPretLe: e.exportDemandeLe && e.exportDemandeLe + EXPORT_H * 3600 * 1000 > now ? e.exportDemandeLe + EXPORT_H * 3600 * 1000 : null,
    clotureDemandeeLe: e.clotureDemandeeLe,
    clotureLe: e.clotureDemandeeLe ? e.clotureDemandeeLe + PREAVIS_CLOTURE_J * JOUR : null,
    aSolder: aSolder(),
  }
}

// Libellés courts des familles du barème (affichage) ; les catégories viennent du registre.
const FAMILLES: Record<string, string> = { A: 'Électronique, électroménager', B: 'Mode, beauté', C: 'Supermarché, frais', D: 'Maison, sport, bébé, animaux', E: 'Livres, médias' }

function statut(): StatutCompte {
  const p = PARAMETRES.commission
  const mult = p.multiplicateurs[BOUTIQUE.palier]
  const grille = (Object.keys(p.bareme) as (keyof typeof p.bareme)[]).map((f) => {
    const gardes = p.bareme[f].map((t) => Number(Dec.de(100).moins(t.tauxPourCent.fois(mult)).texte()))
    return { famille: f, categories: FAMILLES[f] ?? Object.entries(p.familles).filter(([, x]) => x === f).map(([c]) => c).join(', '), de: Math.min(...gardes), a: Math.max(...gardes) }
  })
  const jour = jourDe(maintenant())
  const decouverte = decouverteActive(BOUTIQUE.premiereCommandePayee, jour, commandesComptees(), p)
  return {
    creeLe: '2026-05-07',
    approuveLe: '2026-05-09',
    contratSigneLe: '2026-05-07',
    palier: BOUTIQUE.palier,
    trustScore: BOUTIQUE.trustScore,
    plan: BOUTIQUE.plan,
    decouverteJusqua: decouverte ? finDecouverte(BOUTIQUE.premiereCommandePayee, p) : null,
    grille,
    plancherCommande: p.plancherCommande,
  }
}

const codeBon = (code: string) => code === CODE_DEMO
const proprietaire = (quoi: string) => {
  if (roleCourant() !== 'proprietaire') throw new ReserveAuProprietaire(quoi)
}

export const demoCompte: DomaineCompte = {
  profil: () => repondre(moi()),
  async demanderCode(motif: MotifCode) {
    const avant = etat.lire().codeEnvoyeA[motif]
    if (avant && maintenant() - avant < RENVOI_S * 1000) return { ok: false, raison: 'trop_tot' }
    etat.ecrire((x) => {
      x.codeEnvoyeA[motif] = maintenant()
    })
    return { ok: true, masque: masquer(moi().telephone), renvoiSecondes: RENVOI_S }
  },
  async modifierProfil(champs, code) {
    const m = moi()
    if ((champs.prenom !== undefined && !champs.prenom.trim()) || (champs.nom !== undefined && !champs.nom.trim())) return { ok: false, raison: 'nom' }
    // Le nom du titulaire suit la pièce d'identité (PAR-01) : il change par une demande au support.
    if (m.titulaire && ((champs.prenom && champs.prenom.trim() !== m.prenom) || (champs.nom && champs.nom.trim() !== m.nom))) return { ok: false, raison: 'titulaire' }
    if (!codeBon(code)) return { ok: false, raison: 'code' }
    const e = etat.ecrire((x) => {
      const id = membreId()
      x.profils[id] = { ...x.profils[id], ...champs, prenom: (champs.prenom ?? x.profils[id].prenom).trim(), nom: (champs.nom ?? x.profils[id].nom).trim() }
    })
    return { ok: true, profil: e.profils[membreId()] }
  },
  async demanderCodeEmail(email) {
    const v = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return { ok: false, raison: 'email' }
    if (v === moi().email) return { ok: false, raison: 'meme' }
    if (v === 'deja@belivay.com') return { ok: false, raison: 'pris' }
    etat.ecrire((x) => {
      x.emailEnAttente = v
    })
    return { ok: true }
  },
  async confirmerEmail(codeSms, codeEmail) {
    if (!codeBon(codeSms) || !codeBon(codeEmail) || !etat.lire().emailEnAttente) return { ok: false, raison: 'code' }
    const e = etat.ecrire((x) => {
      x.profils[membreId()].email = x.emailEnAttente
      x.emailEnAttente = null
    })
    return { ok: true, profil: e.profils[membreId()] }
  },
  async demanderCodesNumero(numero) {
    const n = numero.replace(/\D/g, '').replace(/^237/, '')
    if (!/^6\d{8}$/.test(n)) return { ok: false, raison: 'prefixe' }
    if (moi().telephone.replace(/\D/g, '').endsWith(n)) return { ok: false, raison: 'meme' }
    if (MEMBRES.some((m) => m.telephone.replace(/\D/g, '').endsWith(n))) return { ok: false, raison: 'pris' }
    etat.ecrire((x) => {
      x.numeroEnAttente = n
    })
    return { ok: true }
  },
  async confirmerNumero(codeAncien, codeNouveau) {
    const n = etat.lire().numeroEnAttente
    if (!n || !codeBon(codeAncien) || !codeBon(codeNouveau)) return { ok: false, raison: 'code' }
    const e = etat.ecrire((x) => {
      x.profils[membreId()].telephone = telephoneFormate(n)
      x.numeroEnAttente = null
    })
    return { ok: true, profil: e.profils[membreId()] }
  },
  appareils: () => repondre([...etat.lire().appareils].sort((a, b) => Number(b.actuel) - Number(a.actuel) || b.vuA - a.vuA)),
  async deconnecterAppareil(id) {
    return etat.ecrire((x) => {
      x.appareils = x.appareils.filter((a) => a.id !== id || a.actuel)
    }).appareils
  },
  async deconnecterAutres() {
    return etat.ecrire((x) => {
      x.appareils = x.appareils.filter((a) => a.actuel)
    }).appareils
  },
  async changerMotDePasse(ancien, nouveau, code) {
    if (ancien.length < 6) return { ok: false, raison: 'ancien' }
    if (nouveau.length < 8 || !/\d/.test(nouveau)) return { ok: false, raison: 'faible' }
    if (nouveau === ancien) return { ok: false, raison: 'identique' }
    if (!codeBon(code)) return { ok: false, raison: 'code' }
    return { ok: true }
  },
  securite: () => repondre(securite()),
  async reglerFaceId(actif) {
    etat.ecrire((x) => {
      x.faceId = actif
    })
    await demoSession.reglerBiometrie(actif)
    return securite()
  },
  async statut() {
    proprietaire('statut du compte')
    return statut()
  },
  async exporterDonnees(code) {
    if (!codeBon(code)) return { ok: false, raison: 'code' }
    if (securite().exportPretLe) return { ok: false, raison: 'deja' }
    const e = etat.ecrire((x) => {
      x.exportDemandeLe = maintenant()
    })
    return { ok: true, pret: e.exportDemandeLe! + EXPORT_H * 3600 * 1000 }
  },
  async cloturer(code) {
    proprietaire('clôture du compte')
    if (!codeBon(code)) return { ok: false, raison: 'code' }
    if (etat.lire().clotureDemandeeLe) return { ok: false, raison: 'deja' }
    etat.ecrire((x) => {
      x.clotureDemandeeLe = maintenant()
    })
    const s = securite()
    return { ok: true, le: s.clotureLe!, aSolder: s.aSolder }
  },
  async annulerCloture() {
    proprietaire('clôture du compte')
    etat.ecrire((x) => {
      x.clotureDemandeeLe = null
    })
    return securite()
  },
  async demanderModification(quoi, ref) {
    return demoMessages.ecrireAuSupport(quoi, ref ?? null)
  },
}
