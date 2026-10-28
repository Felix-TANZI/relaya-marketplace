// Écran « Contre-offre » (CL-15 ; EX-04), forme d'origine du prototype rendue réelle (DP-54) : l'inspection terminée
// de la reprise (?id=…) et, en feuille, la contre-offre du reconditionneur : l'estimation et la nouvelle valeur,
// les écarts trouvés, le montant à payer si on accepte ; accepter (puis payer) ou refuser (le téléphone est rendu
// gratuitement au relais, avec un code). Le motif (état constaté, pièce manquante, prix du marché) et les photos du
// constat ; contester le constat (réponse sous 48 h, rien n'est payé en attendant).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { F } from '../../i18n/format'
import { quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { pageTroc, useTrocs } from './Commun'
import { ContesterTroc, EtapesTroc, FfTroc, MotifTroc } from './Troc'

// L'icône d'un écart : la batterie, sinon le téléphone.
const iconeEcart = (titre: string) => (/batterie/i.test(titre) ? 'battery-full' : 'smartphone')

export function TrocContreOffre() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [d, recharger] = useTrocs()
  const grand = useDes('tab-l')
  if (!d) return null
  const tr = d.liste.find((x) => x.id === params.get('id')) ?? d.liste.find((x) => x.etat === 'contre')
  if (!tr) return <Navigate to={chemin('troc')} replace />
  if (tr.etat !== 'contre' || !tr.contreOffre) return <Navigate to={chemin(pageTroc(tr), { id: tr.id })} replace />
  const co = tr.contreOffre
  // Blocs de la feuille : dès 1024 (modale large, § 5.13), les écarts et le motif à gauche ; l'argent et les
  // décisions à droite. Sur téléphone, l'ordre d'origine.
  const titre = <h3 className="cl15-sht">{t('Contre-offre du reconditionneur')}</h3>
  const somme = (
    <>
      <div className="card cl15-sum flat">
        <div className="cl15-r">
          <span className="lb">{t('Estimation')}</span>
          <span className="v">{tf('{a} à {b} F', { a: F(tr.estimation.min), b: F(tr.estimation.max) })}</span>
        </div>
        <div className="cl15-tot">
          <span className="l">{t('Nouvelle valeur')}</span>
          <span className="rt">
            <span className="price">
              {F(co.valeur)}
              <small>{t(' F')}</small>
            </span>
          </span>
        </div>
      </div>
    </>
  )
  const ecartsEtMotif = (
    <>
      <div className="card tight">
        {co.ecarts.map((e) => (
          <div key={e.titre} className="li">
            <span className="ic amber">
              <Icone nom={iconeEcart(e.titre)} taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(e.titre)}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t(e.sous)}
              </span>
            </span>
          </div>
        ))}
      </div>
      <MotifTroc tr={tr} />
    </>
  )
  const montant = (
    <>
      <div className="kv">
        <span className="k">{t('Montant à payer si tu acceptes')}</span>
        <span className="v ">
          <b>{F(tr.prixLivre - co.valeur)}&nbsp;F</b>
        </span>
      </div>
    </>
  )
  const decisions = (
    <>
      <div className="btns">
        <button type="button" className="btn primary" onClick={async () => (await source.repondreTroc(tr.id, true), naviguer(chemin('troc-payer', { id: tr.id })))}>
          <span>{tf('Accepter {m} F', { m: F(co.valeur) })}</span>
        </button>
      </div>
      <div className="btns">
        <button type="button" className="btn secondary" onClick={async () => (await source.repondreTroc(tr.id, false), naviguer(chemin('troc-inspection', { id: tr.id })))}>
          <span>{t('Refuser et récupérer mon téléphone')}</span>
        </button>
      </div>
      <div className="hint-l">
        <Icone nom="undo-2" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{tf('Refus : ton téléphone t’est rendu gratuitement au {r}, avec un code pour le retirer.', { r: t(tr.relais) })}</span>
      </div>
      <ContesterTroc tr={tr} fait={recharger} />
    </>
  )
  const feuille = (
    <>
      {/* Toucher dehors (ou × et Échap sur grand écran) : retour à l'inspection, la décision attend. */}
      <div className="veil" onClick={() => naviguer(chemin('troc-inspection', { id: tr.id }))}></div>
      <div className="sheet" role="dialog" aria-label={t('Contre-offre du reconditionneur')} data-forme="large">
        <div className="grab"></div>
        {grand ? (
          <div className="g5-sh">
            <div className="g5-sh-g">
              {titre}
              {ecartsEtMotif}
            </div>
            <div className="g5-sh-d">
              {somme}
              {montant}
              {decisions}
            </div>
          </div>
        ) : (
          <>
            {titre}
            {somme}
            {ecartsEtMotif}
            {montant}
            {decisions}
          </>
        )}
      </div>
    </>
  )
  return (
    <Ecran route="troc-contre-offre" sousTitre={tr.id} fixes={feuille}>
      <Styles id="ddcb0e469a" />
      <EtapesTroc n={3} />
      <FfTroc />
      <div className="card cl15-dn">
        <div className="cl15-dh">
          <span className="cl15-di amber">
            <Icone nom="scan-line" taille={30} trait={2.2} />
          </span>
          <h2>{t('Inspection terminée')}</h2>
          <div className="s">{tr.dates.inspecte ? quand(tr.dates.inspecte, d.maintenant, langue).replace(/^./, (c) => c.toUpperCase()) : ''}</div>
          <p className="cl15-p">{t('Le reconditionneur a trouvé un écart avec l’état déclaré.')}</p>
        </div>
      </div>
    </Ecran>
  )
}
