// Données propres aux pages AJ-B : même forme qu'un domaine de la SourceVendeur (promesses, résultats).
// Démonstration : gardée sur l'appareil par le magasin commun de la démo (blv_v_demo_<domaine> : « Recharger » repart
// du jeu d'essai, l'événement blv:donnees fait relire les écrans). Mode API : connecteurs src/api/pages (pagesApi).
// - « apprendre » : étapes cochées de chaque fiche, PAR MEMBRE (le propriétaire et l'employé ont chacun leur
//   progression ; le serveur connaît le membre par son jeton) : GET /learning/progress, PUT et DELETE
//   /learning/progress/{fiche}.
// - « bio » : courte présentation de la personne (facultative, 160 signes), vue par l'équipe et l'agent BelivaY,
//   jamais par les clients ; numéros, e-mails et liens refusés (même règle que la messagerie, GEN-08) :
//   champ « bio » de GET et PATCH /me.
import { pagesApi } from '../../api/pages/actif'
import { magasin } from '../../demo/stockage'
import { source } from '../../donnees/source'

const etat = magasin('ajb', () => ({
  // Démonstration : progression partielle (photos terminée, prix commencée ; l'employée a commencé les colis).
  faites: { 'm-franck': ['photos:0', 'photos:1', 'photos:2', 'photos:3', 'prix:0', 'prix:1'], 'm-aicha': ['colis:0'] } as Record<string, string[]>, // membre → « fiche:etape »
  bios: {} as Record<string, string>, // membre → présentation
}))

export const BIO_MAX = 160
const INTERDIT = /(\+?\d[\d\s.-]{7,}\d)|([\w.+-]+@[\w-]+\.[\w.]+)|(https?:\/\/|www\.)/i

export const donneesAJB = {
  apprendre: {
    async faites(membre: string): Promise<string[]> {
      if (pagesApi) return pagesApi.apprendre.faites()
      return [...(etat.lire().faites[membre] ?? [])]
    },
    async cocher(membre: string, cle: string, fait: boolean): Promise<string[]> {
      if (pagesApi) {
        const i = cle.lastIndexOf(':')
        return pagesApi.apprendre.cocher(cle.slice(0, i), Number(cle.slice(i + 1)), fait)
      }
      const e = etat.ecrire((x) => {
        const l = new Set(x.faites[membre] ?? [])
        if (fait) l.add(cle)
        else l.delete(cle)
        x.faites[membre] = [...l]
      })
      return e.faites[membre]
    },
    async recommencer(membre: string, fiche: string): Promise<void> {
      if (pagesApi) return void (await pagesApi.apprendre.recommencer(fiche))
      etat.ecrire((x) => {
        x.faites[membre] = (x.faites[membre] ?? []).filter((c) => !c.startsWith(fiche + ':'))
      })
    },
  },
  bio: {
    async lire(membre: string): Promise<string> {
      if (pagesApi) return ((await source.compte.profil()) as { bio?: string | null }).bio ?? ''
      return etat.lire().bios[membre] ?? ''
    },
    async ecrire(membre: string, texte: string): Promise<{ ok: true } | { ok: false; raison: 'long' | 'coordonnees' }> {
      const v = texte.trim()
      if (pagesApi) {
        const r = await pagesApi.profilAJB.changerBio(v)
        return r.ok ? { ok: true } : { ok: false, raison: r.raison }
      }
      if (v.length > BIO_MAX) return { ok: false, raison: 'long' }
      if (INTERDIT.test(v)) return { ok: false, raison: 'coordonnees' }
      etat.ecrire((x) => {
        x.bios[membre] = v
      })
      return { ok: true }
    },
  },
}
