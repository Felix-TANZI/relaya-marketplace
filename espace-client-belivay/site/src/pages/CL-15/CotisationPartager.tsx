// Écran « Cotisation créée » (CL-15 ; EX-02), forme d'origine du prototype rendue réelle (DP-54) : étape 2 sur 2 :
// la cotisation (?id=…), son objectif, la date limite, le relais ; le lien (ouvert sans compte) à ouvrir, copier
// ou partager (partage du téléphone, WhatsApp, SMS) ; la règle pour chacun (remboursement le lendemain de la date
// limite) ; suivre la cotisation. BelivaY n'envoie aucune relance.
// Échanges (DP-54) : aussi dans l'application des proches BelivaY (choisis ou trouvés par leur numéro) et par QR code.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useCotisations } from './Commun'
import { EnvoiProches } from '../CL-14/Echanges'

export function CotisationPartager() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const [d] = useCotisations()
  // Dès 1024 px : ce qui est réuni et la règle à gauche ; le lien (copier, partager) et les boutons à droite (§ 5.13).
  const grand = useDes('tab-l')
  const [copie, setCopie] = useState(false)
  if (!d) return null
  const c = d.liste.find((x) => x.id === params.get('id')) ?? d.liste[0]
  if (!c) return <Navigate to={chemin('cotisation')} replace />
  const vers = chemin('cotisation-participer', { c: c.code })
  const lien = `${location.origin}${vers}`
  const texte = tf('Cotisation « {n} » sur BelivaY : participe dès 1 000 F. {l}', { n: c.nom, l: lien })
  const copier = () => {
    navigator.clipboard?.writeText(lien).catch(() => {})
    setCopie(true)
  }
  const partager = async () => {
    try {
      if (navigator.share) await navigator.share({ title: c.nom, text: texte, url: lien })
      else copier()
    } catch {
      // Partage annulé.
    }
  }
  const lienCotisation = (
    <>
    <div className="card ">
      <div className="cl15-k">{t('Lien de la cotisation')}</div>
      <div className="cl15-lnk">
        <Link to={vers} className="u" style={{ wordBreak: 'break-all' }}>
          {location.host + vers}
          <Icone nom="external-link" taille={15} />
        </Link>
        <button type="button" className="btn secondary sm" onClick={copier}>
          <Icone nom={copie ? 'check' : 'copy'} taille={18} />
          <span>{t(copie ? 'Copié' : 'Copier')}</span>
        </button>
      </div>
      <div className="t13 c3 mt4">{t('Tes proches l’ouvrent sans compte BelivaY.')}</div>
      <div className="chips mt8">
        <a className="chip" href={'https://wa.me/?text=' + encodeURIComponent(texte)} target="_blank" rel="noreferrer">
          {t('WhatsApp')}
        </a>
        <a className="chip" href={'sms:?&body=' + encodeURIComponent(texte)}>
          {t('SMS')}
        </a>
      </div>
    </div>
    <div className="card ">
      <EnvoiProches objet={{ type: 'cotisation', id: c.id }} lien={lien} />
    </div>
    </>
  )
  const boutons = (
    <>
    <div className="btns">
      <button type="button" className="btn primary" onClick={partager}>
        <Icone nom="share" taille={18} />
        <span>{t('Partager le lien')}</span>
      </button>
    </div>
    <div className="btns">
      <Link to={chemin('cotisation-suivre', { id: c.id })} className="btn secondary">
        <span>{t('Suivre la cotisation')}</span>
      </Link>
    </div>
    <div className="cl15-fine">{t('BelivaY ne relance jamais de lui-même : c’est toi qui partages le lien ou l’envoies à tes proches.')}</div>
    </>
  )
  return (
    <Ecran gabarit="colonnes" route="cotisation-partager">
      <Colonne>
      <Styles id="ddcb0e469a" />
      <div className="steps">
        <i className="on"></i>
        <i className="cur"></i>
      </div>
      {!INTERRUPTEURS_DU_LANCEMENT['FF-EX02'] && (
        <div className="cl15-ff">
          <span className="cl15-pill">
            <Icone nom="lock" taille={13} />
            {t('Après le lancement · interrupteur fermé')}
          </span>
          <span className="cl15-ex">{t('EX-02')}</span>
        </div>
      )}
      <div className="card cl15-dn">
        <div className="cl15-dh">
          <span className="cl15-di green">
            <Icone nom="check" taille={30} trait={2.2} />
          </span>
          <h2>{t('Cotisation créée')}</h2>
          <div className="s">{t(c.nom)}</div>
        </div>
        <div className="cl15-db">
          <div className="cl15-kv">
            <span className="k">{t('Objectif')}</span>
            <span className="v">
              <span className="price">
                {F(c.objectif)}
                <small>{t(' F')}</small>
              </span>
            </span>
          </div>
          <div className="cl15-kv">
            <span className="k">{t('À réunir avant le')}</span>
            <span className="v">{jourSeul(c.jusqua, langue)}</span>
          </div>
          <div className="cl15-kv">
            <span className="k">{t('Cadeau remis au')}</span>
            <span className="v">{t(c.relais)}</span>
          </div>
        </div>
      </div>
      {!grand && lienCotisation}
      <div className="sec">
        <h2>{t('La règle, pour chacun')}</h2>
      </div>
      <div className="card tight">
        <div className="li">
          <span className="ic or">
            <Icone nom="hand-coins" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Dès 1 000 F, montant libre')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Au plus ce qui manque · Mobile Money, ou carte avec 2 % de frais')}
            </span>
          </span>
        </div>
        <div className="li">
          <span className="ic ">
            <Icone nom="eye-off" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Discret si on veut')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Le nom n’apparaît pas aux autres')}
            </span>
          </span>
        </div>
        <div className="li">
          <span className="ic green">
            <Icone nom="shield-check" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Argent bloqué chez BelivaY')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {tf('Il sert au cadeau, sinon chacun est remboursé le {d}, sans frais', { d: jourSeul(c.jusqua + 864e5, langue) })}
            </span>
          </span>
        </div>
      </div>
      {!grand && boutons}
      </Colonne>
      {grand && (
        <Aside titre="Lien de la cotisation">
          {lienCotisation}
          {boutons}
        </Aside>
      )}
    </Ecran>
  )
}
