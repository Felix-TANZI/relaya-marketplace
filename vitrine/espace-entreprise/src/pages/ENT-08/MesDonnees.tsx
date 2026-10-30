// Page ajoutée à ENT-P24 (Paramètres) : mes données personnelles (loi n° 2024/017, DED-31) : export après un code SMS,
// effacement demandé au support, qui épargne preuves (180 jours) et comptabilité (10 ans). Liée depuis le bloc
// « Mot de passe et sécurité » (absente du prototype, d'où une page à part).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Hint, Kv, Panel, Px, Tete } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { telecharger, useAnnonce } from '../ENT-07/commun'
import { useRefus } from './Parametres'
import './ent08.css'

export default function MesDonnees() {
  const { t, tf } = usePreferences()
  const refus = useRefus()
  const [defi, setDefi] = useState<{ defi: string; codeDemo: string | null } | null>(null)
  const [code, setCode] = useState('')
  const { annoncer, vue } = useAnnonce()
  return (
    <Ecran route="mes-donnees">
      <Px>
        <Tete route="mes-donnees" titre={t('Mes données')} />
        <Panel titre={t('Exporter mes données')} icone="download" id="donnees">
          <Kv k={t('Preuves')} v={t('gardées 180 jours pour les litiges')} />
          <Kv k={t('Comptabilité')} v={t('gardée 10 ans, comme la loi l’exige')} />
          {!defi ? (
            <div className="btns ec-btns">
              <button type="button" className="btn secondary" onClick={async () => setDefi(await source.parametres.demanderExport())}>
                <Icone nom="download" taille={16} />
                {t('Exporter mes données')}
              </button>
            </div>
          ) : (
            <>
              <label className="champ">
                <span>{t('Code reçu par SMS')}</span>
                <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} maxLength={8} />
              </label>
              {defi.codeDemo && <p className="t12 c3">{tf('Démonstration : le code est {c}.', { c: defi.codeDemo })}</p>}
              <div className="btns ec-btns">
                <button
                  type="button"
                  className="btn primary"
                  disabled={!code}
                  onClick={async () => {
                    const r = await source.parametres.exporter(defi.defi, code)
                    if (!r.ok) return annoncer(false, refus(r.raison))
                    telecharger(r.nom, r.contenu, 'application/json')
                    setDefi(null)
                    setCode('')
                    annoncer(true, t('Export téléchargé.'))
                  }}
                >
                  {t('Télécharger')}
                </button>
              </div>
            </>
          )}
          {vue}
          <Hint icone="mail">
            {t('Effacement : écrivez au support, il vous dit ce qui est effacé et ce qui est gardé.')} <Link to={chemin('messages', { sheet: 'nouveau', sujet: 'compte', ref: 'Données personnelles' })}>{t('Écrire au support')}</Link>
          </Hint>
        </Panel>
      </Px>
    </Ecran>
  )
}
