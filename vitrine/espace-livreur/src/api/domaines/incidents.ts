// Domaine « incidents » branché sur le kit (backend-kit/apps/livreur_tournee) : catalogue, incidents du livreur,
// déclaration. Hors connexion, l'incident est mis en file AVEC son détail (rejoué tel quel par POST /sync/batch) et
// montré « en file » jusqu'à son envoi. Photos : identifiants des preuves déposées d'abord par l'écran (POST /media,
// nature « incident ») ; hors connexion, identifiants provisoires « file-<clé> », remplacés par le serveur dans le lot.
import type { ClientApi } from '@client/api/client'
import type { CatalogueIncidents, DomaineIncidents, Incident } from '../../donnees/domaines/incidents'
import type { SourceLivreur } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'
import { actionsEnFile, enFile } from './horsligne'

const PREFIXE = 'file-'

function enFileVu(): Incident[] {
  return actionsEnFile('incident')
    .filter((a) => a.corps)
    .map((a) => {
      const c = a.corps as { famille: Incident['famille']; type: string; note: string; photos: number | string[] }
      return {
        id: a.objet,
        famille: c.famille,
        type: c.type,
        note: c.note,
        photos: Array.isArray(c.photos) ? c.photos.length : c.photos,
        cree: a.origine.heure,
        recu: null,
        arret: null,
        position: a.origine.position,
        bloquant: false,
        etat: 'en_file',
        echeance: null,
        decision: null,
        ajustement: null,
        transfert: null,
        chronologie: [
          { a: a.origine.heure, texte: 'Déclaré sur le téléphone' },
          { a: null, texte: 'En file : envoyé au retour du réseau' },
        ],
      }
    })
}

export function domaineIncidents(api: ClientApi): SourceLivreur['incidents'] {
  const a = appels(api)
  const d: DomaineIncidents = {
    catalogue: () => a.get<CatalogueIncidents>('/incidents/catalogue'),
    liste: async () => [...enFileVu(), ...(await a.get<Incident[]>('/incidents'))],
    incident: async (id) => (id.startsWith(PREFIXE) ? (enFileVu().find((i) => i.id === id) ?? null) : ouNull(a.get<Incident>(`/incidents/${seg(id)}`))),
    declarer: async (decl, origine, enLigne) => {
      const corps = { famille: decl.famille, type: decl.type, note: decl.note, photos: decl.photos, arretId: decl.arretId }
      if (enLigne) return a.geste('/incidents', origine, corps)
      const id = PREFIXE + origine.cle
      enFile('incident', id, origine, corps, { photos: decl.photos.length })
      return { ok: true as const, id }
    },
  }
  return d
}
