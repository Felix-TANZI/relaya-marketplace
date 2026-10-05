// Écran « Payé en entier » (CL-15 ; EX-03), forme d'origine du prototype rendue réelle (DP-54) : la mise de côté
// soldée (?id=…) : date du dernier versement, total payé en n versements, la commande créée ; « Ta commande » lue
// dans les commandes (état, relais, étapes, numéro) ; l'argent bloqué jusqu'au retrait ; le code de retrait qui
// arrive avec le colis ; suivre dans Mes commandes. Liste de rentrée entière : la commande groupée (un colis par
// boutique, un seul code quand tout est au relais), suivie dans le suivi de la liste.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { source, type CommandeClient } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { etapeDe, etatDe } from '../CL-09/Commun'
import { titreCote, useCotes, VignetteCote } from './Commun'

export function CoteFini() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const [d] = useCotes()
  const [cmd, setCmd] = useState<CommandeClient | null>(null)
  const c = d ? (d.liste.find((x) => x.id === params.get('id')) ?? d.liste.find((x) => x.etat === 'payee')) : undefined
  useEffect(() => {
    if (c?.ref) source.commandeClient(c.ref).then((x) => setCmd(x?.commande ?? null))
  }, [c?.ref])
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
  if (!c || c.etat !== 'payee')
    return (
      <Ecran route="cote-fini" gabarit="centre">
        <Styles id="ddcb0e469a" />
        {bandeau}
        <div className="card mt12">
          <div className="empty">
            <div className="ei">
              <Icone nom="piggy-bank" taille={26} />
            </div>
            <h3>{t('Pas encore payée en entier')}</h3>
            <div className="btns">
              <Link to={c ? chemin('cote-suivre', { id: c.id }) : chemin('cote')} className="btn primary">
                <span>{t('Voir la mise de côté')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const finLe = Math.max(...c.versements.map((v) => v.payeLe ?? 0))
  const lieu = cmd ? t(cmd.lieu) : t('relais')
  const e = cmd ? etatDe(cmd) : null
  const etape = cmd ? etapeDe(cmd) : 0
  return (
    <Ecran route="cote-fini" gabarit="centre" sousTitre={c.id}>
      <Styles id="ddcb0e469a" />
      {bandeau}
      <div className="card cl15-dn">
        <div className="cl15-dh">
          <span className="cl15-di green">
            <Icone nom="check" taille={30} trait={2.2} />
          </span>
          <h2>{t('Payé en entier')}</h2>
          <div className="s">{jourSeul(finLe, langue)}</div>
          <p className="cl15-p">{tf('En {n} versements, sans intérêts ni frais. {p} part au {r}.', { n: c.versements.length, p: titreCote(c, t, tf), r: lieu })}</p>
        </div>
        <div className="cl15-db">
          <div className="cl15-kv">
            <span className="k">{t('Total payé')}</span>
            <span className="v g">
              <span className="price">
                {F(c.versements.reduce((n, v) => n + v.du, 0))}
                <small>{t(' F')}</small>
              </span>
            </span>
          </div>
          {c.ref && (
            <div className="cl15-kv">
              <span className="k">{t('Commande')}</span>
              <span className="v">{c.ref}</span>
            </div>
          )}
        </div>
      </div>
      {c.ref && (
        <>
          <div className="sec">
            <h2>{t('Ta commande')}</h2>
          </div>
          <Link to={c.liste ? chemin('rentree-suivi', { ref: c.ref }) : chemin('commande', { ref: c.ref })} className="card " style={{ display: 'block', color: 'inherit' }}>
            <div className="oc">
              <span className="thumb" style={{ width: '64px', height: '64px', borderRadius: '16px' }}>
                <VignetteCote c={c} taille={64} />
              </span>
              <div className="grow">
                {e && <div className={'ost ' + (e.ton === 'ok' ? 'acc' : e.ton)}>{e.v ? tf(e.texte, e.v) : t(e.texte)}</div>}
                <div className="od">{c.liste ? tf('Liste {c} · {n} articles · un seul code au {r}', { c: c.liste.classe, n: c.liste.articles, r: lieu }) : tf('1 colis au {r} · {d}', { r: lieu, d: jourSeul(cmd?.pretLe ?? finLe, langue) })}</div>
                {cmd && (
                  <div className="gauge">
                    {cmd.etapes.slice(0, 4).map((_, i) => (
                      <i key={i} className={(i <= etape ? 'on' : '') + (i === etape ? ' cur' : '')}></i>
                    ))}
                  </div>
                )}
                <div className="onum">{c.ref}</div>
              </div>
            </div>
          </Link>
        </>
      )}
      <div className="card green cl15-box">
        <span className="bi">
          <Icone nom="shield-check" taille={20} />
        </span>
        <div className="grow">
          <b className="bt">{t('Ton argent reste bloqué jusqu’à ton retrait')}</b>
          <p>{t('Le vendeur n’est payé qu’après.')}</p>
        </div>
      </div>
      <div className="hint-l">
        <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Ton code de retrait arrive quand le colis est au relais.')}</span>
      </div>
      {c.liste && c.ref && (
        <div className="btns">
          <Link to={chemin('rentree-suivi', { ref: c.ref })} className="btn primary">
            <Icone nom="backpack" taille={18} />
            <span>{t('Suivre la liste de rentrée')}</span>
          </Link>
        </div>
      )}
      <div className="btns">
        <Link to={chemin('commandes')} className="btn secondary">
          <Icone nom="package" taille={18} />
          <span>{t('Suivre dans Mes commandes')}</span>
        </Link>
      </div>
    </Ecran>
  )
}
