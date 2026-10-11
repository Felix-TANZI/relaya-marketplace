// Domaine « compte » branché sur le kit (backend-kit/apps/vendeur_boutique) : profil du membre connecté, codes SMS par
// motif (apps.otp), e-mail et téléphone avec deux codes, appareils (ville, jamais l'adresse IP), mot de passe, sécurité,
// statut et grille (propriétaire), export, clôture (préavis de 30 jours, annulable), demande au support.
import type { ClientApi } from '@client/api/client'
import type { Appareil, DomaineCompte, Profil, Securite, StatutCompte } from '../../donnees/domaines/compte'
import type { Resultat } from '../../donnees/communs'
import type { SourceVendeur } from '../../donnees/source'
import { appels, seg } from '../outils'

// L'appareil actuel est reconnu par X-Device-Id, envoyé par le client de l'API (site/src/api/client.ts) : il n'est
// jamais déconnecté par erreur.
export function domaineCompte(api: ClientApi): SourceVendeur['compte'] {
  const a = appels(api, 'compte')
  const d: DomaineCompte = {
    profil: () => a.get<Profil>('/me'),
    demanderCode: (motif) => a.post<Resultat<{ masque: string; renvoiSecondes: number }, 'trop_tot'>>('/me/codes', { motif }),
    modifierProfil: (champs, code) => a.patch<Resultat<{ profil: Profil }, 'nom' | 'code' | 'titulaire'>>('/me', { ...champs, code }),
    demanderCodeEmail: (email) => a.post<Resultat<object, 'email' | 'pris' | 'meme'>>('/me/email/code', { email }),
    confirmerEmail: (codeSms, codeEmail) => a.post<Resultat<{ profil: Profil }, 'code'>>('/me/email/confirm', { codeSms, codeEmail }),
    demanderCodesNumero: (numero) => a.post<Resultat<object, 'prefixe' | 'pris' | 'meme'>>('/me/phone/codes', { numero }),
    confirmerNumero: (codeAncien, codeNouveau) => a.put<Resultat<{ profil: Profil }, 'code'>>('/me/phone', { codeAncien, codeNouveau }),
    appareils: () => a.get<Appareil[]>('/devices'),
    deconnecterAppareil: (id) => a.supprimer<Appareil[]>(`/devices/${seg(id)}`),
    deconnecterAutres: () => a.post<Appareil[]>('/devices/revoke-others', {}),
    changerMotDePasse: (ancien, nouveau, code) => a.put<Resultat<object, 'ancien' | 'faible' | 'code' | 'identique'>>('/me/password', { ancien, nouveau, code }),
    securite: () => a.get<Securite>('/me/security'),
    reglerFaceId: (actif) => a.put<Securite>('/me/security/face-id', { actif }),
    statut: () => a.get<StatutCompte>('/account/summary'),
    exporterDonnees: (code) => a.post<Resultat<{ pret: number }, 'code' | 'deja'>>('/me/export', { code }, { idempotence: true }),
    cloturer: (code) => a.post<Resultat<{ le: number; aSolder: Securite['aSolder'] }, 'code' | 'deja'>>('/account/closure', { code }, { idempotence: true }),
    annulerCloture: () => a.supprimer<Securite>('/account/closure'),
    demanderModification: (quoi, ref) => a.post<{ fil: string }>('/me/corrections', { quoi, ref: ref ?? null }, { idempotence: true }),
  }
  return d
}
