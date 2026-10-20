// Domaines « Litiges et retours » (CL-11) : dossiers, ouverture (un dossier par colis), preuves, arrangement du
// vendeur, recours, retrait du dossier, dépôt d'un retour au relais ; et « Avis sur une commande » (CL-12).
//
// RÉALITÉ VÉRIFIÉE (14 oct. 2026, contre backend/ réel) : pas de /api/disputes top-level, pas de /api/me/disputes,
// pas de /api/orders/{id}/reviews. Le vrai modèle (apps/orders/models.py::Dispute, Return — matures, avec un vrai
// parcours de règlement derrière, apps.payments) raisonne par ORDER_ITEM (une ligne de commande), pas par « colis
// par boutique » : il n'y a ni arrangement vendeur, ni recours (appel), ni retrait de dossier, ni remboursement
// automatique sous un seuil, ni avis de commande (vendeur + relais) — seul un avis PRODUIT existe
// (POST /api/catalog/products/{id}/add_review/, hors de ce domaine). Rien de tout cela n'est inventé ici.
import type { CommandeLitige, DonneesAvis, EtatLitige, Litige, NouveauLitige, ProblemeLitige, Source } from '../../donnees/source'
import { idCommande, temps, type RArticleCommande, type RCommande } from '../adaptateurs'
import type { ClientApi } from '../client'
import { NonDisponible } from '../erreurs'
import { fichierPhoto } from './refus'

const seg = encodeURIComponent

// Dispute.REASON_CHOICES (apps/orders/models.py) : mapping mécanique du vocabulaire du site, pas une règle métier.
const RAISON: Record<ProblemeLitige, string> = {
  jamais: 'NOT_RECEIVED',
  abime: 'DAMAGED',
  'pas-commande': 'WRONG_ITEM',
  manque: 'OTHER', // pas d'équivalent exact (« article manquant du colis ») côté relaya
  autre: 'OTHER',
}

interface RPreuveLitige {
  id: number
  evidence_type: string
  uploader_role: string
  file_url: string
  description: string
  created_at: string
}
interface RLitige {
  id: number
  order: number
  order_item: number | null
  order_item_title: string | null
  reason: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  resolution: 'REFUND' | 'EXCHANGE' | 'PARTIAL_REFUND' | 'REJECTED' | 'OTHER' | null
  description: string
  refund_amount_xaf: number | null
  created_at: string
  // Vérifié en live le 14 oct. 2026 (POST /api/orders/{id}/disputes/, multipart) : évidences présentes dès la
  // réponse de création (DisputeSerializer), une par photo envoyée.
  evidences?: RPreuveLitige[]
}

const etatDispute = (d: RLitige): EtatLitige => {
  if (d.status === 'OPEN') return 'attente'
  if (d.status === 'IN_PROGRESS') return 'examen'
  if (d.resolution === 'REFUND' || d.resolution === 'PARTIAL_REFUND') return 'rembourse'
  if (d.resolution === 'EXCHANGE') return 'remplace'
  if (d.resolution === 'REJECTED') return 'refuse'
  return 'accepte'
}

export function domaineLitiges(api: ClientApi) {
  const commande = (ref: string) => api.get<RCommande>(`/orders/${idCommande(ref)}/`)

  const versLitige = (ref: string, n: number, pb: ProblemeLitige, souhait: NouveauLitige['souhait'], d: RLitige): Litige => ({
    id: String(d.id),
    ref,
    colis: n,
    produit: d.order_item_title ?? '',
    dessin: '',
    pb,
    probleme: '',
    description: d.description,
    souhait,
    montant: d.refund_amount_xaf ?? 0, // non résolu : le montant bloqué (séquestre) n'est pas sur ce serializer
    ouvertLe: temps(d.created_at),
    echeance: 0, // pas de compte à rebours renvoyé par relaya
    etat: etatDispute(d),
    preuves: (d.evidences ?? []).map((e) => ({ titre: e.description || e.evidence_type, sous: '', photo: e.file_url })),
    relais: '',
  })

  return {
    // ——— Avis sur une commande : aucun modèle « avis de commande » côté relaya (seulement ProductReview) ———
    avis: async (): Promise<DonneesAvis | null> => {
      throw new NonDisponible('avis', 'GET /api/orders/{id}/reviews (inexistant)')
    },
    envoyerAvis: async (): Promise<{ ok: true } | { ok: false; raison: 'non_retiree' | 'ferme' }> => {
      throw new NonDisponible('envoyerAvis', 'POST /api/orders/{id}/reviews (inexistant ; relaya note un produit seul : POST /api/catalog/products/{id}/add_review/)')
    },

    // Pas d'agrégat « tous mes litiges » côté relaya (seulement par commande).
    litiges: async (): Promise<{ litiges: Litige[]; maintenant: number }> => {
      throw new NonDisponible('litiges', 'GET /api/me/disputes (inexistant ; relaya : GET /api/orders/{id}/disputes/ par commande)')
    },
    // Pas de détail de litige par identifiant seul : il faut connaître la commande.
    litige: async (): Promise<{ litige: Litige; maintenant: number } | null> => {
      throw new NonDisponible('litige', 'GET /api/disputes/{id} (inexistant)')
    },

    // GET /api/orders/{id}/ (relaya) → CommandeLitige reconstitué par OrderItem (pas de boutique, pas de fenêtre
    // « défaut caché » distincte côté relaya : une seule fenêtre, litige_window_days de PlatformSettings).
    commandeLitige: async (ref: string): Promise<CommandeLitige | null> => {
      const c = await commande(ref).catch(() => null)
      if (!c) return null
      return {
        ref,
        colis: c.items.map((a: RArticleCommande, i: number) => ({
          n: i + 1,
          produit: a.title_snapshot,
          dessin: '',
          detail: `${a.qty} × ${a.price_xaf_snapshot} F`,
          montant: a.line_total_xaf,
        })),
        fenetre: 'ouverte',
        finCachee: '',
        payePar: '',
      }
    },

    // POST /api/orders/{id}/disputes/ {order_item, reason, description, files} (relaya, multipart — VÉRIFIÉ EN LIVE
    // le 14 oct. 2026) : order_item retrouvé via GET /api/orders/{id}/ (même ordre et même numérotation 1-based que
    // commandeLitige et adaptateurs.ts::versCommande). Addendum Décisions v1.0 §4 (« litige guidé par motif +
    // photos ») EST implémenté côté serveur : la vue exige un nombre minimal de photos selon le motif
    // (DAMAGED/NOT_AS_DESCRIBED/COUNTERFEIT : 2, WRONG_ITEM : 1, sinon aucune) et répond 400 {files: "..."} sinon —
    // confirmé par un essai réel qui a d'abord échoué ainsi avant correction. Les photos doivent donc partir AVEC
    // la création (une tentative initiale sans fichiers, suivie d'un ajout séparé comme le kit le supposait, aurait
    // échoué pour DAMAGED/NOT_AS_DESCRIBED/COUNTERFEIT/WRONG_ITEM). Pas de `souhait` ni de remboursement
    // automatique sous un seuil côté serveur.
    ouvrirLitige: async (n: NouveauLitige): Promise<Litige> => {
      const c = await commande(n.ref)
      const item = c.items[n.colis - 1]
      const f = new FormData()
      if (item) f.append('order_item', String(item.id))
      f.append('reason', RAISON[n.pb])
      f.append('description', n.description)
      for (const photo of n.photos) f.append('files', await fichierPhoto(photo))
      const d = await api.post<RLitige>(`/orders/${idCommande(n.ref)}/disputes/`, f, { idempotence: true })
      return versLitige(n.ref, n.colis, n.pb, n.souhait, d)
    },

    // POST /api/orders/disputes/{id}/messages/ (multipart : message + files) : pas de route « photos seules » côté
    // relaya, la preuve part comme pièce jointe d'un message de litige.
    ajouterPreuve: (id: string, photo: string) => ajouterPreuve(id, photo),

    repondreArrangement: async (): Promise<void> => {
      throw new NonDisponible('repondreArrangement', 'POST /api/disputes/{id}/arrangement (inexistant)')
    },
    contesterDecision: async (): Promise<void> => {
      throw new NonDisponible('contesterDecision', 'POST /api/disputes/{id}/appeal (inexistant)')
    },
    retirerLitige: async (): Promise<void> => {
      throw new NonDisponible('retirerLitige', 'POST /api/disputes/{id}/withdraw (inexistant)')
    },

    // Pas de confirmation de dépôt côté client : POST /api/orders/{id}/returns/ (Return) crée bien un retour côté
    // relaya, mais aucune méthode de Source dans ce domaine ne l'appelle (voir rapport de session) ; le dépôt
    // physique est ensuite scanné par le relais (apps/shipping, RelayPointReturnReceiveView), pas confirmé par le
    // client depuis l'application.
    deposerRetour: async (): Promise<void> => {
      throw new NonDisponible('deposerRetour', 'POST /api/returns/{id}/deposit (inexistant)')
    },
  } satisfies Partial<Source>

  async function ajouterPreuve(id: string, photo: string): Promise<void> {
    const f = new FormData()
    f.append('message', 'Photo jointe au dossier.')
    f.append('files', await fichierPhoto(photo))
    await api.post(`/orders/disputes/${seg(id)}/messages/`, f)
  }
}
