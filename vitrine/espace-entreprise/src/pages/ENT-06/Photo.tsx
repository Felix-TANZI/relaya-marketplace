// Photo de preuve telle que reçue (aucune retouche ni recadrage : RG-R121), au balisage du prototype (entB_photo :
// « photo », horodatage incrusté « ts », pastille verte, drapeau « Illisible », photo en file « entb-pend ») : heure
// d'origine du téléphone et lieu incrustés, heure du serveur dans la description. Démonstration : une illustration
// tient lieu d'image ; en production, l'URL signée de la photo (url_signee_photo_incident minutes de validité).
import { Icone } from '../../composants/Icone'
import { usePreferences } from '../../preferences'
import { useHeure } from '../ENT-05/commun'

export type SujetPhoto = 'produit' | 'scelle' | 'lieu' | 'colis' | 'vehicule' | 'devanture' | 'remise'
const NOM: Record<SujetPhoto, string> = { produit: 'Article à découvert', scelle: 'Colis scellé et étiqueté', lieu: 'Lieu', colis: 'Colis', vehicule: 'Véhicule', devanture: 'Devanture', remise: 'Remise' }

export function Photo({ sujet, le, recuLe, lieu, etiquette, etat = 'ok', court, ouvrir }: { sujet: SujetPhoto; le: number | null; recuLe: number | null; lieu: string; etiquette?: string | null; etat?: 'ok' | 'attente' | 'probleme' | 'avenir'; court?: string; ouvrir?: () => void }) {
  const { t, tf } = usePreferences()
  const h = useHeure()
  const decrit = tf('Photo : {s}, {l}', { s: t(NOM[sujet]), l: lieu }) + (etiquette ? ` · ${etiquette}` : '') + (le ? ' · ' + tf('prise à {h}', { h: h(le) }) : '') + (recuLe ? ' · ' + tf('reçue à {h}', { h: h(recuLe) }) : le ? ' · ' + t('pas encore reçue') : '')
  if (etat === 'attente' || etat === 'avenir')
    return (
      <div className={'photo entb-pend' + (etat === 'avenir' ? ' avenir' : '')} role="img" aria-label={decrit}>
        <div>
          <Icone nom={etat === 'attente' ? 'cloud-upload' : 'camera'} taille={26} />
          <b>{etat === 'attente' ? tf('{s} · {h}', { s: t(NOM[sujet]), h: le ? h(le) : '—' }) : t('À prendre au changement de main')}</b>
        </div>
      </div>
    )
  return (
    <div
      className={'photo' + (etat === 'probleme' ? ' entb-blur entb-bad' : '') + (ouvrir ? ' lv-ouvrable' : '')}
      role={ouvrir ? 'button' : 'img'}
      tabIndex={ouvrir ? 0 : undefined}
      onClick={ouvrir}
      onKeyDown={ouvrir ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), ouvrir()) : undefined}
      aria-label={ouvrir ? `${decrit} · ${t('Agrandir')}` : decrit}
      title={recuLe ? tf('Reçue par le serveur à {h}', { h: h(recuLe) }) : undefined}
    >
      <svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true">
        <rect width="120" height="120" className="ph-ciel" />
        <rect y="78" width="120" height="42" className="ph-sol" />
        {sujet === 'devanture' || sujet === 'lieu' ? (
          <g className="ph-bat">
            <rect x="18" y="26" width="84" height="56" rx="3" />
            <path d="M18 38h84M32 50v32M88 50v32" />
          </g>
        ) : sujet === 'vehicule' ? (
          <g className="ph-colis">
            <circle cx="36" cy="82" r="14" />
            <circle cx="86" cy="82" r="14" />
            <path d="M36 82l18-26h20l12 26M54 56l-6-10h-8" />
          </g>
        ) : (
          <g className="ph-colis">
            <path d="M32 44l28-12 28 12v38l-28 12-28-12z" />
            <path d="M32 44l28 12 28-12M60 56v38" />
            {sujet === 'scelle' && <rect x="46" y="64" width="28" height="12" rx="2" className="ph-etq" />}
          </g>
        )}
      </svg>
      {etat === 'ok' && (
        <span className="ok">
          <Icone nom="check" taille={14} />
        </span>
      )}
      {etat === 'probleme' && <span className="entb-flag">{t('Illisible')}</span>}
      <span className="ts">{le ? `${h(le)} · ${court ?? lieu}` : court ?? lieu}</span>
    </div>
  )
}
