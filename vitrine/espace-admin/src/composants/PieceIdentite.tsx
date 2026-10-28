// Pièce d'identité (KYC) : jamais affichée d'office. Un rôle qui a « piece.consulter » l'ouvre sur motif ; la source
// rend un LIEN COURT à durée limitée (PIECE-LIEN-MIN), journalisé, et la pièce s'affiche sous un FILIGRANE (qui,
// quand, quel dossier) qui suit toute capture d'écran. À l'échéance, l'aperçu se ferme.
import { useId, useState } from 'react'
import { PARAMETRES } from '../calculs/registre'
import type { LienPiece } from '../donnees/domaines/acteurs'
import { source } from '../donnees/source'
import { usePreferences } from '../preferences'
import { useHorloge, usePeut } from '../session'
import { Icone } from './Icone'
import { Rebours } from './prototype'

/** Natures de pièce (codes du kit et de la KYC des six espaces) → libellé (traduit par t()). */
export const NATURE: Record<string, string> = {
  cni: 'Carte nationale d’identité',
  cni_recto: 'CNI · recto',
  cni_verso: 'CNI · verso',
  selfie: 'Photo de la personne',
  selfie_video: 'Selfie vidéo (preuve de vie)',
  permis: 'Permis de conduire',
  carte_grise: 'Carte grise',
  rccm: 'Registre du commerce (RCCM)',
  niu: 'Numéro d’identifiant unique (NIU)',
  mint: 'Autorisation de transport (MINT)',
  assurance: 'Attestation d’assurance',
  local: 'Photos du local',
}

export function PieceIdentite({ dossier, piece, nature }: { dossier: string; piece: string; nature: string }) {
  const { t, tf } = usePreferences()
  const peut = usePeut('piece.consulter')
  const maintenant = useHorloge(1000)
  const id = useId()
  const [demande, setDemande] = useState(false)
  const [motif, setMotif] = useState('')
  const [lien, setLien] = useState<LienPiece | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const ouvert = lien && lien.expireLe > maintenant
  const ouvrir = async () => {
    const r = await source.acteurs.ouvrirPiece(dossier, piece, motif).catch(() => null)
    if (!r) return setErreur(t('La pièce n’a pas pu être ouverte. Réessayez.'))
    if (!r.ok) return setErreur(tf('Le motif doit compter au moins {n} caractères.', { n: PARAMETRES.console.motifMin }))
    setLien(r.lien)
    setDemande(false)
    setErreur(null)
  }
  return (
    <div className="e-piece card">
      <div className="e-piece-h">
        <Icone nom="id-card" taille={20} />
        <b className="grow">{t(NATURE[nature] ?? nature)}</b>
        {ouvert && <Rebours fin={lien!.expireLe} echu={t('Lien expiré')} />}
      </div>
      {ouvert ? (
        <div className="e-piece-v" role="img" aria-label={tf('{piece}, consultée sous filigrane', { piece: t(NATURE[nature] ?? nature) })}>
          <span className="e-piece-ph">{t('Aperçu de démonstration')}</span>
          <span className="e-filigrane" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i}>{lien!.filigrane}</span>
            ))}
          </span>
        </div>
      ) : (
        <p className="card-s">{peut ? t('Masquée : ouverture sur motif, par lien court à durée limitée, journalisée.') : t('Votre rôle ne consulte pas les pièces d’identité.')}</p>
      )}
      {peut && !ouvert && !demande && (
        <button type="button" className="btn sm secondary mt10" onClick={() => setDemande(true)}>
          <Icone nom="eye" taille={16} />
          <span>{t('Voir la pièce')}</span>
        </button>
      )}
      {demande && (
        <div className="mt10">
          <label className="fld fld-l" htmlFor={id}>
            <span className="fld-t">{t('Motif de la consultation (journalisé)')}</span>
            <span className="inp">
              <input id={id} value={motif} onChange={(e) => setMotif(e.target.value)} />
            </span>
          </label>
          {erreur && (
            <p className="e-erreur mt10" role="alert">
              {erreur}
            </p>
          )}
          <div className="btns mt10">
            <button type="button" className="btn sm ghost" onClick={() => setDemande(false)}>
              {t('Annuler')}
            </button>
            <button type="button" className="btn sm primary" onClick={() => void ouvrir()}>
              {t('Ouvrir le lien court')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
