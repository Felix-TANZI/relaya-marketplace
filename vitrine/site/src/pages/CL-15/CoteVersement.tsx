// Écran « Payer un versement » (CL-15 ; EX-03), forme d'origine du prototype rendue réelle (DP-54) : le prochain
// versement dû de la mise de côté (?id=…) et son échéance (aujourd'hui, à venir, dernier), le montant à valider sur
// le téléphone, sans frais ; déjà payé, après ce versement, le versement suivant (ou le dernier) ; le numéro Mobile
// Money ; au dernier versement, l'article part au relais et la commande est créée.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Icone } from '../../composants/Icone'
import { PayerMomo } from '../../composants/PayerMomo'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { paye, prochain, titreCote, useCotes } from './Commun'

const jour = (ms: number) => Math.floor((ms + 3600e3) / 864e5)

export function CoteVersement() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [d] = useCotes()
  const [relais, setRelais] = useState<string | null>(null)
  useEffect(() => {
    source.relaisListe().then((r) => setRelais(r.habituel))
  }, [])
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
  const n = c && c.etat === 'en_cours' ? prochain(c) : null
  if (!c || !n)
    return (
      <Ecran route="cote-versement">
        <Styles id="ddcb0e469a" />
        {bandeau}
        <div className="card mt12">
          <div className="empty">
            <div className="ei">
              <Icone nom="circle-check" taille={26} />
            </div>
            <h3>{t('Rien à payer')}</h3>
            <div className="btns">
              <Link to={c ? chemin('cote-suivre', { id: c.id }) : chemin('cote')} className="btn primary">
                <span>{t('Voir la mise de côté')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const total = c.versements.length
  const dernier = n.n === total
  const suivant = c.versements.find((v) => v.n === n.n + 1)
  const p = paye(c)
  const lieu = relais ? t(relais) : t('relais')
  return (
    <Ecran gabarit="colonnes" route="cote-versement" sousTitre={c.id}>
      <Colonne>
      <Styles id="ddcb0e469a" />
      {bandeau}
      <div className="pg">
        <h1 className="pg-t">{tf('Versement {a} sur {b}', { a: n.n, b: total })}</h1>
        <p className="pg-s">
          {dernier
            ? tf('{p} · dernier versement, {d}', { p: titreCote(c, t, tf), d: jourSeul(n.le, langue) })
            : jour(n.le) === jour(d.maintenant)
              ? tf('{p} · échéance d’aujourd’hui', { p: titreCote(c, t, tf) })
              : tf('{p} · échéance du {d}', { p: titreCote(c, t, tf), d: jourSeul(n.le, langue) })}
        </p>
      </div>
      <div className="card or">
        <div className="t13 c3 b7 center">{t('À valider sur ton téléphone')}</div>
        <div className="cl15-amt">
          {F(n.du)}
          <small>{t('F')}</small>
        </div>
        <div className="t13 c3 center mt4">{t('Aucun frais · même paiement qu’une commande')}</div>
      </div>
      <div className="card cl15-sum">
        <div className="cl15-r">
          <span className="lb">{t('Déjà payé')}</span>
          <span className="v">{F(p)} F</span>
        </div>
        <div className="cl15-r">
          <span className="lb">{t('Après ce versement')}</span>
          <span className="v">{tf('{a} F sur {b} F', { a: F(p + n.du), b: F(c.prixLivre) })}</span>
        </div>
        {suivant && (
          <div className="cl15-r">
            <span className="lb">{t(suivant.n === total ? 'Dernier versement' : 'Versement suivant')}</span>
            <span className="v">{tf('{m} F · {d}', { m: F(suivant.du), d: jourSeul(suivant.le, langue) })}</span>
          </div>
        )}
      </div>
      </Colonne>
      <Aside titre="Payer avec">
      <div className="sec">
        <h2>{t('Payer avec')}</h2>
      </div>
      <PayerMomo
        montant={n.du}
        texte={tf('Valider {m} F', { m: F(n.du) })}
        payer={async (moyen) => {
          const x = await source.payerVersement(c.id, moyen)
          naviguer(chemin(x.etat === 'payee' ? 'cote-fini' : 'cote-suivre', { id: c.id }), { replace: true })
        }}
      />
      {dernier && <div className="cl15-fine">{tf('C’est le dernier versement : {p} part au {r}.', { p: titreCote(c, t, tf), r: lieu })}</div>}
      </Aside>
    </Ecran>
  )
}
