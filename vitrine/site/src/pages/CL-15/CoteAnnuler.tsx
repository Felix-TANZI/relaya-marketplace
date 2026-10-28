// Écran « Annuler la mise de côté » (CL-15 ; EX-03), forme d'origine du prototype rendue réelle (DP-54) : sous la
// progression de la mise de côté (?id=…), la feuille qui dit exactement ce qui revient : le déjà payé, moins le
// forfait (5 % du prix, 5 000 F au plus, au vendeur qui a gardé l'article), remboursé sur le numéro, jamais en
// espèces ; rappel de la grâce de 7 jours ; garder ou annuler. Une fois annulée : ce qui a été remboursé.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { COTE, forfaitCote } from '../../donnees/cote'
import { source, type MiseDeCote } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { paye, prochain, useCotes } from './Commun'

export function CoteAnnuler() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [d] = useCotes()
  const [fait, setFait] = useState<MiseDeCote | null>(null)
  const [envoi, setEnvoi] = useState(false)
  if (!d) return null
  const bandeau = !INTERRUPTEURS_DU_LANCEMENT['FF-EX03'] && (
    <div className="cl15-ff">
      <span className="cl15-pill">
        <Icone nom="lock" taille={13} />
        {t('Après le lancement · interrupteur fermé')}
      </span>
      <span className="cl15-ex">{t('EX-03')}</span>
    </div>
  )
  const c = d.liste.find((x) => x.id === params.get('id')) ?? d.liste.find((x) => x.etat === 'en_cours')
  if (fait?.annulee)
    return (
      <Ecran route="cote-annuler" sousTitre={fait.id}>
        <Styles id="ddcb0e469a" />
        {bandeau}
        <div className="card cl15-dn">
          <div className="cl15-dh">
            <span className="cl15-di amber">
              <Icone nom="undo-2" taille={30} trait={2.2} />
            </span>
            <h2>{t('Mise de côté annulée')}</h2>
            <div className="s">{jourSeul(fait.annulee.le, langue)}</div>
            <p className="cl15-p">{tf('Remboursés sur {m}.', { m: fait.moyen })}</p>
          </div>
          <div className="cl15-db">
            <div className="cl15-kv">
              <span className="k">{t('Remboursé')}</span>
              <span className="v g">
                <span className="price">
                  {F(fait.annulee.rembourse)}
                  <small>{t(' F')}</small>
                </span>
              </span>
            </div>
            <div className="cl15-kv">
              <span className="k">{t('Forfait au vendeur')}</span>
              <span className="v">{F(fait.annulee.forfait)} F</span>
            </div>
          </div>
        </div>
        <div className="btns">
          <Link to={chemin('cote')} className="btn primary">
            <span>{t('Mes mises de côté')}</span>
          </Link>
        </div>
      </Ecran>
    )
  if (!c || c.etat !== 'en_cours')
    return (
      <Ecran route="cote-annuler">
        <Styles id="ddcb0e469a" />
        {bandeau}
        <div className="card mt12">
          <div className="empty">
            <div className="ei">
              <Icone nom="piggy-bank" taille={26} />
            </div>
            <h3>{t('Rien à annuler')}</h3>
            <div className="btns">
              <Link to={chemin('cote')} className="btn primary">
                <span>{t('Mes mises de côté')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const p = paye(c)
  const f = Math.min(forfaitCote(c.prixLivre), p)
  const n = prochain(c)
  const faits = c.versements.filter((v) => v.payeLe).length
  const total = c.versements.length
  const garder = chemin('cote-suivre', { id: c.id })
  return (
    <Ecran
      route="cote-annuler"
      sousTitre={c.id}
      fixes={
        <>
          <div className="veil" onClick={() => naviguer(garder)}></div>
          <div className="sheet" role="dialog" aria-modal="true" aria-label={t('Annuler la mise de côté ?')}>
            <div className="grab"></div>
            <h3 className="cl15-sht">{t('Annuler la mise de côté ?')}</h3>
            <p className="cl15-shs">{t('Voici exactement ce que tu récupères.')}</p>
            <div className="card cl15-sum flat">
              <div className="cl15-r">
                <span className="lb">{t('Déjà payé')}</span>
                <span className="v">{F(p)} F</span>
              </div>
              <div className="cl15-r">
                <span className="lb">{t('Forfait d’annulation · 5 % du prix')}</span>
                <span className="v">−{F(f)} F</span>
              </div>
              <div className="cl15-tot">
                <span className="l">{tf('Remboursé sur {m}', { m: c.moyen.split(' · ')[0] })}</span>
                <span className="rt">
                  <span className="price">
                    {F(p - f)}
                    <small>{t(' F')}</small>
                  </span>
                </span>
              </div>
            </div>
            <div className="hint-l">
              <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{t('Le forfait revient au vendeur, qui t’a gardé l’article. Remboursement sur ton numéro, jamais en espèces.')}</span>
            </div>
            <div className="card green cl15-box">
              <span className="bi">
                <Icone nom="calendar-clock" taille={20} />
              </span>
              <div className="grow">
                <b className="bt">{t('Un imprévu ?')}</b>
                <p>{tf('Tu as {n} jours de grâce après une échéance, sans frais : pas besoin d’annuler.', { n: COTE.grace })}</p>
              </div>
            </div>
            <div className="btns">
              <Link to={garder} className="btn secondary">
                <span>{t('Garder ma réservation')}</span>
              </Link>
            </div>
            <div className="btns">
              <button
                type="button"
                className={'btn danger' + (envoi ? ' off' : '')}
                onClick={async () => {
                  if (envoi) return
                  setEnvoi(true)
                  setFait(await source.annulerMiseDeCote(c.id))
                  setEnvoi(false)
                }}
              >
                <span>{tf('Annuler et récupérer {m} F', { m: F(p - f) })}</span>
              </button>
            </div>
          </div>
        </>
      }
    >
      <Styles id="ddcb0e469a" />
      {bandeau}
      <div className="card cl15-pc">
        <div className="cl15-k">{tf(faits > 1 ? 'Mise de côté · {a} versements sur {b}' : 'Mise de côté · {a} versement sur {b}', { a: faits, b: total })}</div>
        <div className="cl15-pb">
          <b>
            {F(p)}
            <small>{t('F')}</small>
          </b>
          <span>{tf('payés sur {t} F · sans intérêts, sans frais', { t: F(c.prixLivre) })}</span>
        </div>
        <div className="steps">
          {c.versements.map((v) => (
            <i key={v.n} className={v.payeLe ? 'on' : n && v.n === n.n ? 'cur' : ''}></i>
          ))}
        </div>
      </div>
    </Ecran>
  )
}
