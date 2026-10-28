// Domaine « offres » branché sur le kit (backend-kit/apps/vendeur_catalogue) : nouvelle offre en 4 étapes (catalogue,
// code-barres, reconnaissance, brouillon, photos réelles allégées avec variantes WebP, aperçu « Vous gardez » du moteur
// de commission, prix conseillé, publication vérifiée), produit nouveau (POST /offers/new), rattachement à une fiche,
// changement de prix, description proposée.
// Réponses au format de src/donnees/domaines/offres.ts, rendues telles quelles ; un refus attendu par l'écran est un
// 200 { ok: false, raison } ; introuvable : 404 → null ; accès Préparation : 403 owner_only → ReserveAuProprietaire
// (aperçu, conseil, publication, prix, demande de fiche, description), comme la démonstration.
import type { ClientApi } from '@client/api/client'
import type { Apercu, ChampsBrouillon, Conseil, DomaineOffres, FicheCatalogue, Publication, Recherche, RefusModification, RefusPublication, Reglages, Suggestion } from '../../donnees/domaines/offres'
import type { PhotoReelle, Produit } from '../../donnees/domaines/produits'
import type { Instant, Resultat } from '../../donnees/communs'
import type { SourceVendeur } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineOffres(api: ClientApi): SourceVendeur['offres'] {
  const a = appels(api, 'offres')
  const d: DomaineOffres = {
    reglages: () => a.get<Reglages>('/config'),
    rechercher: (q, code) => a.get<Recherche>('/catalog/search', { query: { q, code: code ?? undefined } }),
    suggerer: (nom) => a.get<Suggestion>('/catalog/suggest', { query: { q: nom } }),
    parCodeBarres: (code) => ouNull(a.get<FicheCatalogue>(`/catalog/barcode/${seg(code)}`)),
    reconnaitre: (photo) => a.post<FicheCatalogue[]>('/catalog/recognize', photo),
    commencer: (ficheId, variante) => a.post<Resultat<{ brouillonId: string }, 'fiche' | 'reserve'>>('/offers', { ficheId, variante }, { idempotence: true }),
    creer: (d) => a.post<Resultat<{ brouillonId: string }, 'recherche' | 'reserve'>>('/offers/new', d, { idempotence: true }),
    rattacher: (id, ficheId) => a.post<Resultat<{ brouillonId: string }, 'fiche' | 'etat'>>(`/offers/${seg(id)}/attach`, { ficheId }),
    brouillon: (id) => ouNull(a.get<Produit>('/offers/draft', { query: { id } })),
    modifier: (id, champs: ChampsBrouillon) =>
      a.patch<Resultat<{ produit: Produit }, RefusModification>>(`/offers/${seg(id)}`, champs),
    photos: (cible) => a.get<PhotoReelle[]>(`/offers/${seg(cible)}/photos`),
    ajouterPhoto: (cible, photo) => a.post<Resultat<{ photo: PhotoReelle; nombre: number }, 'max' | 'petite'>>(`/offers/${seg(cible)}/photos`, photo, { idempotence: true }),
    retirerPhoto: async (cible, photoId) => {
      await a.supprimer(`/offers/${seg(cible)}/photos/${seg(photoId)}`)
    },
    ordonnerPhotos: async (cible, ids) => {
      await a.put(`/offers/${seg(cible)}/photos`, { ids })
    },
    apercu: (offreId, prix, madeInCameroon) => a.get<Apercu>('/offers/quote', { query: { offre: offreId, prix, mic: madeInCameroon } }),
    conseil: (offreId, prix) => ouNull(a.get<Conseil>(`/offers/${seg(offreId)}/price-advice`, { query: { prix } })),
    publier: (id, choix) =>
      a.post<Resultat<Publication, RefusPublication>>(`/offers/${seg(id)}/publish`, choix, { idempotence: true }),
    changerPrix: (id, prix, rester) => a.put<Resultat<{ produit: Produit }, 'prix_minimum' | 'plafond' | 'prix'>>(`/offers/${seg(id)}/price`, { prix, rester }),
    publication: (id) => ouNull(a.get<Publication>(id ? `/offers/${seg(id)}/publication` : '/offers/publication')),
    proposerDescription: (offreId, texte) => a.post<Resultat<{ reponseAvant: Instant }, 'court' | 'coordonnees' | 'long'>>(`/offers/${seg(offreId)}/description-proposal`, { texte }),
  }
  return d
}
