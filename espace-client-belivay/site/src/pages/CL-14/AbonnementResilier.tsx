// Écran « Résilier » (CL-14), forme d'origine du prototype rendue réelle (DP-54) : la feuille posée sur « Mon
// abonnement » : ce que l'abonnement a fait économiser depuis son début, ce qui s'arrête et à quelle date (fin de
// la période payée, sans remboursement), la cagnotte en attente qui reste acquise ; résilier en un tap (puis
// « Mon abonnement », résilié, où reprendre reste possible jusqu'à la fin) ou garder. Pass, abonnement offert,
// déjà résilié : rien à résilier.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { finGrace } from '../../donnees/prime'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { avantages, nomPalier, usePrime } from './Commun'
import { BandeauPrime, jourDe, VueAbonnement } from './MonAbonnement'

export function AbonnementResilier() {
  const { t, tf, langue } = usePreferences()
  const naviguer = useNavigate()
  const [d, recharger] = usePrime()
  const [envoi, setEnvoi] = useState(false)
  if (!d) return null
  const a = d.abonnement
  if (!a || !d.actif || a.palier === 'pass' || a.offertPar || a.resilie || (!a.prochain && !a.echec))
    return (
      <Ecran route="abonnement-resilier" gabarit="compte">
        <Styles id="02f3dac5cd" />
        <BandeauPrime />
        <div className="card">
          <div className="empty">
            <h3>{t(a?.resilie ? 'Déjà résilié' : 'Rien à résilier')}</h3>
            <p>{t(a?.palier === 'pass' ? 'Le Pass s’arrête tout seul : aucun prélèvement.' : a?.offertPar ? 'Un abonnement offert s’arrête tout seul à sa date de fin.' : 'Aucun prélèvement à venir.')}</p>
            <div className="btns">
              <Link to={chemin('mon-abonnement')} className="btn primary">
                <span>{t('Mon abonnement')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const nom = t(nomPalier(a.palier))
  // Prélèvement refusé en cours : rien n'est dû, l'abonnement s'arrête à la fin de la grâce.
  const fin = jourDe(a.echec ? finGrace(a.echec.le) : a.prochain!, d.maintenant, langue)
  const attente = d.cagnotte.attente.reduce((n, x) => n + x.montant, 0)
  const economie = d.economies.relais + d.economies.domicile + d.cagnotte.versee
  const garder = () => naviguer(chemin('mon-abonnement'), { replace: true })
  return (
    <Ecran
      route="abonnement-resilier"
      gabarit="compte"
      fixes={
        <>
          <div className="veil" onClick={garder}></div>
          <div className="sheet" role="dialog" aria-modal="true" aria-label={tf('Résilier {p} ?', { p: nom })}>
            <div className="grab"></div>
            <div className="cl14-sheet-h">{tf('Résilier {p} ?', { p: nom })}</div>
            <div className="keep">
              <span className="kl">{tf('Depuis le {d}, {p} t’a fait économiser', { d: jourDe(a.debut, d.maintenant, langue), p: nom })}</span>
              <span className="kv2">{F(economie)}&nbsp;F</span>
            </div>
            <div className="t14 b8 mt14">{tf('Ce que tu perds le {d}', { d: fin })}</div>
            <ul className="cl14-bl">
              {avantages(a.palier, tf).map((x) => (
                <li key={x}>
                  <Icone nom="minus" taille={16} trait={2.6} style={{ color: 'var(--ink-3)' }} />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
            <div className="cl14-note">
              {a.echec ? tf('{p} reste actif jusqu’au {d}, fin du délai de grâce. Le prélèvement refusé de {m} F ne sera pas redemandé.', { p: nom, d: fin, m: F(a.echec.montant) }) : tf('{p} reste actif jusqu’au {d}, sans remboursement.', { p: nom, d: fin })}
              {attente > 0 && ' ' + tf('Ta cagnotte en attente ({m} F) te reste acquise.', { m: F(attente) })}
            </div>
            <div className="btns mt16">
              <button
                type="button"
                className={'btn primary' + (envoi ? ' off' : '')}
                onClick={async () => {
                  if (envoi) return
                  setEnvoi(true)
                  await source.resilierAbonnement()
                  recharger()
                  naviguer(chemin('mon-abonnement'), { replace: true })
                }}
              >
                <span>{tf('Résilier {p}', { p: nom })}</span>
              </button>
            </div>
            <div className="btns">
              <Link to={chemin('mon-abonnement')} replace className="btn secondary">
                <span>{tf('Garder {p}', { p: nom })}</span>
              </Link>
            </div>
          </div>
        </>
      }
    >
      <VueAbonnement d={d} recharger={recharger} />
    </Ecran>
  )
}
