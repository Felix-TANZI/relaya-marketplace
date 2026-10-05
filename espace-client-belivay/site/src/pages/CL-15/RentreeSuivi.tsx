// Écran « Suivi de la liste » (CL-15 ; EX-01), forme d'origine du prototype rendue réelle (DP-54) : la commande de
// rentrée (?ref=…) : où en est toute la liste (colis arrivés sur le total, heure prévue), chaque colis et son étape
// (préparation, récupéré, arrivé au relais, retiré) ; les colis arrivés attendent les autres sans frais de garde ;
// complète : retirable maintenant, un seul message et un seul code (affiché sur place, ou après vérification pour
// une grosse commande), la garde ; la commande, le paiement, le total, le relais ; l'argent bloqué jusqu'au retrait.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source, type CommandeClient } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, heureSeule, quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { useRentree } from './Commun'
import { FfRentree } from './Rentree'

const ETAPES = ['Préparation', 'Récupéré', 'Arrivé au relais', 'Retiré']

export function RentreeSuivi() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const session = useSession()
  const [d] = useRentree()
  const [c, setC] = useState<CommandeClient | null | undefined>(undefined)
  const [voirCode, setVoirCode] = useState(false)
  const ref = params.get('ref')
  useEffect(() => {
    if (ref) source.commandeClient(ref).then((x) => setC(x?.commande ?? null))
  }, [ref])
  if (!d || (ref && c === undefined)) return null
  const cmd = ref ? c : d.enCours
  if (!cmd)
    return (
      <Ecran route="rentree-suivi">
        <Styles id="ddcb0e469a" />
        <div className="card mt12">
          <div className="empty">
            <h3>{t('Aucune liste en cours')}</h3>
            <div className="btns">
              <Link to={chemin('rentree')} className="btn primary">
                <span>{t('Trouver la liste de mon école')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const arrives = cmd.colis.filter((x) => x.arrive)
  const attendus = cmd.colis.filter((x) => !x.arrive)
  const complete = cmd.etat === 'retirable' || cmd.etat === 'retiree' || !attendus.length
  const classe = cmd.colis[0]?.produit.split(' · ')[0] ?? ''
  const habituel = session.relais && session.relais.nom === cmd.lieu ? session.relais : null
  const etapeColis = (x: CommandeClient['colis'][number]) => (cmd.etat === 'retiree' ? 3 : x.arrive ? 2 : x.statut === 'recupere' ? 1 : 0)
  const premierAttendu = cmd.colis.findIndex((x) => !x.arrive)
  const numeros = (l: CommandeClient['colis']) => l.map((x) => x.n).join(', ')
  return (
    <Ecran gabarit="colonnes" route="rentree-suivi" sousTitre={cmd.ref}>
      <Colonne>
      <Styles id="ddcb0e469a" />
      <FfRentree />
      {voirCode && cmd.code && (
        <div className="hero night">
          <div className="hk">{tf('Code de retrait · {ref}', { ref: cmd.ref })}</div>
          <div className="code6" aria-label={cmd.code}>
            {cmd.code.split('').map((x, i) => (
              <span key={i}>{x}</span>
            ))}
          </div>
          <div className="hs center mt8">
            {habituel
              ? tf('À montrer à {g} au {r} · {n} colis, un seul code', { g: habituel.gerant, r: t(cmd.lieu), n: cmd.colis.length })
              : tf('À montrer au gérant du {r} · {n} colis, un seul code', { r: t(cmd.lieu), n: cmd.colis.length })}
          </div>
        </div>
      )}
      {complete ? (
        <div className="card or">
          <div className="cl15-oc">
            <span className="ic-sq green">
              <Icone nom="package-check" taille={22} />
            </span>
            <div className="grow">
              <div className="cl15-k">{tf('{l} · {n} colis sur {n} arrivé(s)', { l: classe, n: cmd.colis.length })}</div>
              <div className="ot o" style={{ marginTop: '4px' }}>
                {t(cmd.etat === 'retiree' ? 'Retirée' : 'Retirable maintenant')}
              </div>
              <div className="os">
                <b>{tf('Toute ta liste est au {l}', { l: t(cmd.lieu) })}</b>{' '}
                {cmd.arriveeLe
                  ? tf('{n} colis, un seul code. Arrivée complète {d}.', { n: cmd.colis.length, d: quand(cmd.arriveeLe, d.maintenant, langue) })
                  : tf('{n} colis, un seul code.', { n: cmd.colis.length })}
              </div>
            </div>
          </div>
          <div className="steps">
            {cmd.colis.map((x) => (
              <i key={x.n} className="on"></i>
            ))}
          </div>
          {cmd.etat !== 'retiree' && !voirCode && (
            <div className="btns">
              {cmd.codeBio || !cmd.code ? (
                <Link to={chemin('code', { ref: cmd.ref })} className="btn primary">
                  <Icone nom="qr-code" taille={18} />
                  <span>{t('Afficher mon code')}</span>
                </Link>
              ) : (
                <button type="button" className="btn primary" onClick={() => setVoirCode(true)}>
                  <Icone nom="qr-code" taille={18} />
                  <span>{t('Afficher mon code')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="cl15-oc">
            <span className="ic-sq or">
              <Icone nom="truck" taille={22} />
            </span>
            <div className="grow">
              <div className="cl15-k">{tf('{l} · {a} colis sur {n} arrivé(s)', { l: classe, a: arrives.length, n: cmd.colis.length })}</div>
              <div className="ot" style={{ marginTop: '4px' }}>
                {cmd.pretLe ? tf('Toute la liste au relais {d}', { d: quand(cmd.pretLe, d.maintenant, langue) }) : t('Préparation chez les vendeurs')}
              </div>
              <div className="os">{t('Un seul message et un seul code quand le dernier colis est arrivé.')}</div>
            </div>
          </div>
          <div className="steps">
            {cmd.colis.map((x, i) => (
              <i key={x.n} className={x.arrive ? 'on' : i === premierAttendu ? 'cur' : ''}></i>
            ))}
          </div>
        </div>
      )}
      <div className="sec">
        <h2>{tf('Colis · {n}', { n: cmd.colis.length })}</h2>
      </div>
      <div className="card tight">
        {cmd.colis.map((x) => {
          const e = etapeColis(x)
          return (
            <div key={x.n} className="li" style={{ alignItems: 'flex-start' }}>
              <span className={'ic ' + (e >= 2 ? 'green' : 'or')}>
                <Icone nom={e >= 2 ? 'package-check' : e === 1 ? 'truck' : 'package'} taille={20} />
              </span>
              <div className="grow">
                <div className="lt">{tf('Colis {n} · {p}', { n: x.n, p: t(x.produit.split(' · ').slice(1).join(' · ') || x.produit) })}</div>
                <div className="ls">{t(e === 3 ? 'Retiré' : e === 2 ? 'Arrivé au relais' : e === 1 ? 'Récupéré par le livreur' : 'En préparation chez le vendeur')}</div>
                <div className="cl15-g">
                  <div className="gauge">
                    {ETAPES.map((_, i) => (
                      <i key={i} className={(i <= e ? 'on' : '') + (i === e ? ' cur' : '')}></i>
                    ))}
                  </div>
                  <div className="gauge-l">
                    {ETAPES.map((s, i) => (
                      <span key={s} className={i === e ? 'on' : ''}>
                        {t(s)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      </Colonne>
      <Aside titre="Résumé">
      {complete ? (
        <>
          {cmd.arriveeLe && (
            <div className="card ">
              <div className="cl15-k">{tf('Un seul message, envoyé à {h}', { h: heureSeule(cmd.arriveeLe, langue) })}</div>
              <div className="t14 mt6" style={{ lineHeight: '1.45' }}>
                {habituel
                  ? tf('« Ta liste de rentrée est au {l} : {n} colis, un seul code. {h}. »', { l: t(cmd.lieu), n: cmd.colis.length, h: t(habituel.horaireDuJour) })
                  : tf('« Ta liste de rentrée est au {l} : {n} colis, un seul code. »', { l: t(cmd.lieu), n: cmd.colis.length })}
              </div>
            </div>
          )}
          {cmd.garde && cmd.etat !== 'retiree' && (
            <div className="card amber cl15-box">
              <span className="bi">
                <Icone nom="clock" taille={20} />
              </span>
              <div className="grow">
                <p>
                  {cmd.garde.du > 0 ? (
                    tf('Frais de garde : {m} F à payer au retrait, puis {j} F par jour.', { m: F(cmd.garde.du), j: F(cmd.garde.jour) })
                  ) : (
                    <>
                      {t('Gratuit aujourd’hui, ')}
                      <b>{tf('{j} F par jour dès demain', { j: F(cmd.garde.jour) })}</b>
                      {t('.')}
                    </>
                  )}
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {arrives.length > 0 && (
            <div className="card green cl15-box">
              <span className="bi">
                <Icone nom="package" taille={20} />
              </span>
              <div className="grow">
                <p>
                  {tf(arrives.length > 1 ? 'Les colis {a} attendent ' : 'Le colis {a} attend ', { a: numeros(arrives) })}
                  {tf(attendus.length > 1 ? 'les colis {b} au relais, ' : 'le colis {b} au relais, ', { b: numeros(attendus) })}
                  <b>{t('sans frais de garde')}</b>
                  {t('.')}
                </p>
              </div>
            </div>
          )}
          <div className="cl15-inf">
            <Icone nom="lock" taille={17} />
            <span>{t('Ton code de retrait arrive quand toute la liste est au relais.')}</span>
          </div>
        </>
      )}
      <div className="card ">
        <div className="kv">
          <span className="k">{t('Commande')}</span>
          <span className="v ">
            <Link to={chemin('commande', { ref: cmd.ref })}>{cmd.ref}</Link>
          </span>
        </div>
        <div className="kv">
          <span className="k">{t('Payée')}</span>
          <span className="v ">{dateA(cmd.payeeLe, langue)}</span>
        </div>
        <div className="kv">
          <span className="k">{t('Total')}</span>
          <span className="v ">{F(cmd.total)}&nbsp;F</span>
        </div>
        <div className="kv">
          <span className="k">{t('Relais')}</span>
          <span className="v ">{habituel ? `${t(cmd.lieu)} · ${habituel.gerant}` : t(cmd.lieu)}</span>
        </div>
      </div>
      <div className="foot">
        <Icone nom="shield-check" taille={16} />
        <span>{t('Ton argent reste bloqué jusqu’à ton retrait')}</span>
      </div>
      </Aside>
    </Ecran>
  )
}
