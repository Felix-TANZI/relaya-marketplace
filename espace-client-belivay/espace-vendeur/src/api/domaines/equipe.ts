// Domaine « equipe » branché sur le kit (backend-kit/apps/vendeur_boutique), propriétaire seulement (403 owner_only →
// ReserveAuProprietaire) : invitation puis code SMS du propriétaire, compte du membre créé au besoin, SMS
// d'installation, retrait avec code (sessions coupées), historique signé.
import type { ClientApi } from '@client/api/client'
import type { ActionMembre, DomaineEquipe, Equipe, MembreEquipe } from '../../donnees/domaines/equipe'
import type { Resultat } from '../../donnees/communs'
import type { SourceVendeur } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineEquipe(api: ClientApi): SourceVendeur['equipe'] {
  const a = appels(api, 'équipe')
  const d: DomaineEquipe = {
    membres: () => a.get<Equipe>('/shop/members'),
    inviter: (prenomNom, telephone, droits) =>
      a.post<Resultat<{ invitation: string; masque: string }, 'plein' | 'nom' | 'telephone' | 'deja' | 'droits'>>('/shop/members', { prenomNom, telephone, droits }, { idempotence: true }),
    confirmerInvitation: (invitation, code) =>
      a.post<Resultat<{ membre: MembreEquipe }, 'code' | 'expire'>>(`/shop/members/invitations/${seg(invitation)}/confirm`, { code }, { idempotence: true }),
    renvoyerInvitation: (id) => a.post<Resultat<{ jusqua: number }, 'trop_tot'>>(`/shop/members/${seg(id)}/resend`, {}),
    annulerInvitation: (id) => a.supprimer<Resultat<{ equipe: Equipe }, 'introuvable'>>(`/shop/members/invitations/${seg(id)}`),
    demanderCodeMembre: (id, motif) => a.post<{ masque: string }>(`/shop/members/${seg(id)}/code`, { motif }),
    changerDroits: (id, droits, code) => a.put<Resultat<{ membre: MembreEquipe }, 'code' | 'proprietaire' | 'droits'>>(`/shop/members/${seg(id)}/rights`, { droits, code }),
    suspendre: (id) => a.post<Resultat<{ membre: MembreEquipe }, 'proprietaire' | 'etat'>>(`/shop/members/${seg(id)}/suspend`, {}),
    reactiver: (id, code) => a.post<Resultat<{ membre: MembreEquipe }, 'code' | 'proprietaire' | 'etat'>>(`/shop/members/${seg(id)}/reactivate`, { code }),
    journal: (id) => a.get<ActionMembre[]>(`/shop/members/${seg(id)}/journal`),
    demanderCodeRetrait: (id) => a.post<{ masque: string }>(`/shop/members/${seg(id)}/removal-code`, {}),
    retirer: (id, code) => a.supprimer<Resultat<{ equipe: Equipe }, 'code' | 'proprietaire'>>(`/shop/members/${seg(id)}`, { corps: { code } }),
  }
  return d
}
