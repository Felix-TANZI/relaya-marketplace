// Taille du texte, comme le client (CL-13 Réglages), le vendeur et le livreur : une barre à 8 tailles de 85 à 140 % (ECHELLES),
// le nom et le pourcentage de la taille, un aperçu en direct, « Revenir à la taille normale ». Gardée sur l'appareil.
import { ECHELLES, usePreferences } from '../preferences'
import { Icone } from './Icone'

const NOMS = ['Très petite', 'Petite', 'Normale', 'Un peu grande', 'Grande', 'Plus grande', 'Très grande', 'Maximale']

export function TailleDuTexte({ apercu = 'Aperçu : colis BLV-00008-1, emplacement A-04, 3e jour de garde.' }: { apercu?: string }) {
  const { t, tf, echelle, setEchelle } = usePreferences()
  const i = Math.max(0, ECHELLES.findIndex((e) => e >= echelle))
  const nom = tf('{nom} · {p} %', { nom: t(NOMS[i]), p: ECHELLES[i] })
  return (
    <div className="taille" data-taille-texte>
      <div className="taille-t">
        <Icone nom="text" taille={20} />
        <span className="taille-n">
          <b>{t('Taille du texte')}</b>
          <span>{nom}</span>
        </span>
      </div>
      <div className="taille-l">
        <span aria-hidden="true" className="taille-a">A</span>
        <input type="range" className="taille-barre" min={0} max={ECHELLES.length - 1} step={1} value={i} aria-label={t('Taille du texte')} aria-valuetext={nom} onChange={(e) => setEchelle(ECHELLES[Number(e.target.value)])} />
        <span aria-hidden="true" className="taille-a taille-a-g">A</span>
      </div>
      <div className="taille-graduation" aria-hidden="true">
        {ECHELLES.map((e, n) => (
          <i key={e} className={n === i ? 'on' : e === 100 ? 'ref' : ''} />
        ))}
      </div>
      <p className="taille-apercu" style={{ zoom: ECHELLES[i] / 100 }}>
        {t(apercu)}
      </p>
      {ECHELLES[i] !== 100 && (
        <button type="button" className="taille-normale" onClick={() => setEchelle(100)}>
          {t('Revenir à la taille normale')}
        </button>
      )}
    </div>
  )
}
