// Écran « À payer pour mes proches » (DP-54) : les paniers qu'un proche relié envoie pour qu'on les paie, sans
// lien externe, vus des deux côtés.
// - Compte diaspora : la boîte des paniers reçus (en attente d'abord) ; le détail (?id=) : articles, livraison
//   demandée par le proche (relais de son quartier ou chez lui, jamais l'adresse), son mot, ce que tu paieras
//   (règle donnees/echanges.ts : tu paies tout par défaut) ; « Payer » ouvre le paiement (Commander pour, carte,
//   Apple Pay, Google Pay) ; « Refuser » avec un mot pour lui ; expiré après 7 jours.
// - Compte au Cameroun : ses paniers envoyés à un proche à l'étranger et leur réponse (payé : la commande et son
//   code ; refusé : son mot ; en attente : annuler).
// Écran propre au site (absent du prototype).
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { jouer } from '../../composants/Sons'
import { chemin } from '../../config/pages'
import { totalDiaspora } from '../../donnees/echanges'
import { DEMANDE_JOURS, source, type DemandeProche, type LienFamille } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, dateLongue } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { Pastille, destination } from './Commun'

const ETATS: Record<DemandeProche['etat'], [string, string]> = {
  attente: ['En attente', 'amber'],
  payee: ['Payé', 'green'],
  refusee: ['Refusé', 'red'],
  annulee: ['Annulé', 'amber'],
  expiree: ['Expiré', 'amber'],
}

export function PaniersProches() {
  const { t, tf, langue } = usePreferences()
  const [params, setParams] = useSearchParams()
  const [demandes, setDemandes] = useState<DemandeProche[] | null>(null)
  const [liens, setLiens] = useState<LienFamille[]>([])
  const [diaspora, setDiaspora] = useState(false)
  const [refus, setRefus] = useState<string | null>(null) // mot pour le proche, pendant qu'on refuse
  const [message, setMessage] = useState<string | null>(null)
  const tabL = useDes('tab-l')
  const charger = () => {
    source.demandesProches().then((r) => setDemandes(r.demandes))
    source.liensFamille().then((r) => (setLiens(r.liens), setDiaspora(!!r.compte)))
  }
  useEffect(charger, [])
  if (!demandes) return null
  const id = params.get('id')
  const d = id ? demandes.find((x) => x.id === id) : null
  const liste = demandes.filter((x) => x.sens === (diaspora ? 'recue' : 'envoyee')).sort((a, b) => Number(b.etat === 'attente') - Number(a.etat === 'attente') || b.creeLe - a.creeLe)

  // Détail d'un panier reçu (compte diaspora).
  const vueDetail = (d: DemandeProche) => {
    const l = liens.find((x) => x.id === d.lien)
    const tot = totalDiaspora({ articles: d.sousTotal, fraisRelais: d.fraisRelais, fraisDomicile: d.fraisDomicile, livraison: d.livraison === 'domicile' && l?.domicile ? 'domicile' : 'relais', supplementPar: 'payeur' })
    return (
      <>
        <div className="card vedette mt12 row" style={{ gap: 12 }}>
          <Pastille prenom={d.prenom} />
          <span className="grow">
            <b className="t15" style={{ display: 'block' }}>
              {tf('Panier de {p}', { p: d.prenom })}
            </b>
            <span className="t12 c3">{tf('Envoyé le {d} · {e}', { d: dateLongue(d.creeLe, langue), e: t(ETATS[d.etat][0]) })}</span>
          </span>
        </div>
        {d.mot && (
          <div className="note ink">
            <Icone nom="message-circle" taille={18} />
            <div>« {d.mot} »</div>
          </div>
        )}
        <div className="card">
          {d.lignes.map((x) => (
            <div key={x.titre} className="row" style={{ gap: 10, padding: '6px 0' }}>
              <span className="thumb" style={{ width: 40, height: 40, borderRadius: 10 }}>
                <Dessin id={x.dessin} />
              </span>
              <span className="grow t13">
                {t(x.titre)} × {x.qte}
              </span>
              <b className="t13">{F(x.prix * x.qte)} F</b>
            </div>
          ))}
          <div className="kv mt8">
            <span className="k">{t(d.livraison === 'domicile' ? 'Livraison demandée' : 'Retrait demandé')}</span>
            <span className="v">{l ? destination(l, d.livraison === 'domicile' && l.domicile ? 'domicile' : 'relais', t, tf) : '—'}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Livraison')}</span>
            <span className="v">{tot.livraison ? F(tot.livraison) + ' F' : t('offerte')}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Frais de service carte (2 %)')}</span>
            <span className="v">{F(tot.service)} F</span>
          </div>
          <div className="kv">
            <span className="k">
              <b>{t('Tu paies')}</b>
            </span>
            <span className="v">
              <b>{F(tot.total)} F</b>
            </span>
          </div>
          <p className="t12 c3">{tf('{p} n’a rien à payer : tu règles les articles et la livraison. Son code de retrait lui arrive par SMS ; tu vois les étapes et la preuve, jamais son adresse.', { p: d.prenom })}</p>
        </div>
        {d.etat === 'attente' ? (
          refus === null ? (
            <>
              <div className="btns">
                {l && l.etat === 'actif' ? (
                  <Link to={chemin('commander-pour', { lien: d.lien, demande: d.id })} className="btn primary">
                    <Icone nom="lock" taille={18} />
                    <span>{tf('Payer pour {p} · {m} F', { p: d.prenom, m: F(tot.total) })}</span>
                  </Link>
                ) : (
                  <div className="note amber">
                    <Icone nom="triangle-alert" taille={18} />
                    <div>{t('Le lien avec ce proche n’est plus actif : ce panier ne peut plus être payé.')}</div>
                  </div>
                )}
                <button type="button" className="btn secondary" onClick={() => setRefus('')}>
                  <span>{t('Refuser')}</span>
                </button>
              </div>
              <p className="t12 c3" style={{ textAlign: 'center' }}>{tf('Sans réponse, ce panier expire le {d} ({n} jours).', { d: dateA(d.jusqua, langue), n: DEMANDE_JOURS })}</p>
            </>
          ) : (
            <div className="card">
              <div className="fld">
                <label htmlFor="pp-mot">{tf('Un mot pour {p} (facultatif)', { p: d.prenom })}</label>
                <div className="inp">
                  <input id="pp-mot" value={refus} maxLength={120} placeholder={t('Ex. : je paie la semaine prochaine')} onChange={(e) => setRefus(e.target.value)} />
                </div>
              </div>
              <div className="btns">
                <button
                  type="button"
                  className="btn primary"
                  onClick={async () => {
                    await source.refuserDemande(d.id, refus)
                    jouer('interrupteur')
                    setRefus(null)
                    setMessage(tf('Panier de {p} refusé : il est prévenu, son panier reste dans son application.', { p: d.prenom }))
                    setParams({})
                    charger()
                  }}
                >
                  <span>{t('Confirmer le refus')}</span>
                </button>
                <button type="button" className="btn secondary" onClick={() => setRefus(null)}>
                  <span>{t('Retour')}</span>
                </button>
              </div>
            </div>
          )
        ) : d.ref ? (
          <div className="btns">
            <Link to={chemin('commander-pour', { suivi: d.ref })} className="btn primary">
              <span>{tf('Suivre {ref}', { ref: d.ref })}</span>
            </Link>
          </div>
        ) : (
          d.motRefus && <p className="t13 c3">{tf('Ton mot : « {m} »', { m: d.motRefus })}</p>
        )}
        <div className="links">
          <Link to={chemin('paniers-proches')}>{t('Tous les paniers reçus')}</Link> · <Link to={chemin('espace-diaspora')}>{t('Espace diaspora')}</Link>
        </div>
      </>
    )
  }

  // Dès 1024 px, compte diaspora (§ 5.14) : maître-détail, les paniers reçus (en attente d'abord) à gauche, le panier
  // choisi (?id=, sinon le premier) à droite. Sur téléphone et tablette portrait : deux écrans, comme avant.
  const maitreDetail = tabL && diaspora
  const choisi = maitreDetail ? (d && d.sens === 'recue' ? d : (liste[0] ?? null)) : null
  const vueListe = (
    <>
      <p className="cl13-intro mt12">
        {t(diaspora ? 'Les paniers que tes proches reliés t’envoient à payer. Tu règles tout ; ils retirent avec leur code ou sont livrés chez eux.' : 'Les paniers que tu as envoyés à un proche à l’étranger. Tu es prévenu dès qu’il paie ou refuse.')}
      </p>
      {message && (
        <div className="note green" role="status">
          <Icone nom="circle-check" taille={18} />
          <div>{message}</div>
        </div>
      )}
      {liste.length ? (
        <div className="card tight">
          {liste.map((x) => {
            const [etat, couleur] = ETATS[x.etat]
            const contenu = (
              <>
                <span className="ic">
                  <Icone nom={x.etat === 'payee' ? 'circle-check' : x.etat === 'attente' ? 'clock' : 'circle-x'} taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {tf(diaspora ? 'De {p} · {m} F d’articles' : 'Pour {p} · {m} F d’articles', { p: x.prenom, m: F(x.sousTotal) })}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {x.etat === 'payee' && x.ref ? tf('Payé · commande {ref}', { ref: x.ref }) : x.etat === 'refusee' && x.motRefus ? tf('Refusé · « {m} »', { m: x.motRefus }) : dateLongue(x.creeLe, langue)}
                  </span>
                </span>
                <span className={'pill ' + couleur}>{t(etat)}</span>
              </>
            )
            return diaspora ? (
              <Link key={x.id} to={chemin('paniers-proches', { id: x.id })} replace={maitreDetail} aria-current={x.id === choisi?.id ? 'true' : undefined} className={'li' + (x.id === choisi?.id ? ' on' : '')}>
                {contenu}
              </Link>
            ) : (
              <div key={x.id} className="li">
                {contenu}
                {x.etat === 'attente' && (
                  <button
                    type="button"
                    className="chip"
                    onClick={async () => {
                      await source.annulerDemande(x.id)
                      setMessage(tf('Panier pour {p} annulé.', { p: x.prenom }))
                      charger()
                    }}
                  >
                    {t('Annuler')}
                  </button>
                )}
                {x.etat === 'payee' && x.ref && (
                  <Link className="chip" to={chemin('commande', { ref: x.ref })}>
                    {t('Ma commande')}
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="inbox" taille={26} />
            </div>
            <h3>{t(diaspora ? 'Rien à payer pour l’instant' : 'Aucun panier envoyé')}</h3>
            <p>{t(diaspora ? 'Quand un proche relié t’envoie son panier, il arrive ici et tu reçois une notification.' : 'Remplis ton panier, puis envoie-le à un proche à l’étranger relié à ton compte.')}</p>
            <div className="btns">
              <Link to={chemin(diaspora ? 'proches' : 'diaspora')} className="btn primary">
                <span>{t(diaspora ? 'Mes proches' : 'Envoyer mon panier')}</span>
              </Link>
            </div>
          </div>
        </div>
      )}
      <div className="links">
        <Link to={chemin('espace-diaspora')}>{t('Espace diaspora')}</Link>
      </div>
    </>
  )
  if (maitreDetail)
    return (
      <Ecran route="paniers-proches" gabarit="compte">
        <div className="d13-md">
          <div className="d13-md-liste">{vueListe}</div>
          <div className="d13-md-detail">
            {choisi ? (
              vueDetail(choisi)
            ) : (
              <div className="card mt12">
                <div className="empty">
                  <p>{t('Choisis un panier dans la liste.')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Ecran>
    )
  if (d && d.sens === 'recue') return <Ecran route="paniers-proches" gabarit="compte">{vueDetail(d)}</Ecran>
  return (
    <Ecran route="paniers-proches" gabarit="compte">
      {vueListe}
    </Ecran>
  )
}
