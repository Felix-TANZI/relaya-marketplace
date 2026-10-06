// Écran « Arrangement proposé » (CL-11), forme d'origine du prototype rendue réelle (DP-54) : la proposition du
// vendeur pour un dossier (?id=), ouverte d'emblée dans sa feuille : ce qu'il propose, ce que le client reçoit
// s'il accepte (sur le moyen qui a payé ; il garde l'article), ce qui se passe s'il refuse (BelivaY examine et
// décide avec un motif écrit) ; derrière, l'argent bloqué, où en est le litige, le colis, le fonctionnement.
// La réponse s'affiche dans la feuille (accepté : remboursé, litige clos ; refusé : examen, argent bloqué).
// DP-35 : 5 jours pour répondre, sans réponse le dossier revient en examen ; BelivaY décide sous 24 h ; l'argent
// va où le veut la règle (useRemboursement).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type Litige } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { ARRANGEMENT_J, DECISION_H, useRemboursement } from './Commun'

const H = 3600 * 1000

const SOUHAIT: Record<Litige['souhait'], string> = { rembourse: 'Un remboursement', remplace: 'Un remplacement', signal: 'Un simple signal' }

export function LitigeArrangement() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const id = params.get('id')
  const [l, setL] = useState<Litige | null | undefined>(undefined)
  const [payePar, setPayePar] = useState<string | null>(null)
  const [feuille, setFeuille] = useState(true)
  const [reponse, setReponse] = useState<'accepte' | 'refuse' | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [version, setVersion] = useState(0)
  const [maintenant, setMaintenant] = useState(0)
  const remb = useRemboursement(payePar)
  useEffect(() => {
    source.litiges().then((d) => {
      setMaintenant(d.maintenant)
      const x = d.litiges.find((y) => (id ? y.id === id : y.etat === 'arrangement')) ?? null
      setL(x)
      if (x) source.commandeLitige(x.ref).then((c) => setPayePar(c?.payePar ?? null))
    })
  }, [id, version])
  if (l === undefined) return null
  if (!l || (!reponse && (l.etat !== 'arrangement' || !l.arrangement)))
    return (
      <Ecran route="litige-arrangement">
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="handshake" taille={26} />
            </div>
            <h3>{t('Aucun arrangement en attente')}</h3>
            <p>{t('Si le vendeur te propose un arrangement, tu le reçois en notification et tu réponds ici.')}</p>
            <div className="btns">
              <Link to={l ? chemin('litige-suivi', { id: l.id }) : chemin('litiges')} className="btn primary">
                <span>{t(l ? 'Voir le dossier' : 'Mes litiges')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const a = l.arrangement ?? { montant: 0, texte: '' }
  const comptoir = l.origine === 'comptoir'
  const repondre = async (accepte: boolean) => {
    if (envoi) return
    setEnvoi(true)
    await source.repondreArrangement(l.id, accepte)
    setReponse(accepte ? 'accepte' : 'refuse')
    setEnvoi(false)
    setVersion((v) => v + 1)
  }
  const fermer = () => (reponse ? naviguer(chemin('litige-suivi', { id: l.id })) : setFeuille(false))
  const moyen = tf('Versés {ou}, {quand}.', { ou: remb.ou, quand: remb.quand })
  const reste = Math.max(0, l.montant - a.montant)
  // Après un refus, BelivaY décide au plus 24 h après (DP-35).
  const decisionLe = Math.max(l.echeance, maintenant) + DECISION_H * H

  const proposition = (
    <>
      <div className="t12 b8" style={{ letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--or-txt)' }}>
        {t('Proposition du vendeur')}
      </div>
      <h2 style={{ margin: '6px 0 0', fontSize: '19px', fontWeight: '800', lineHeight: '1.25', letterSpacing: '-.01em' }}>{t('Le vendeur te propose un arrangement')}</h2>
      <div className="cl11-q">«&nbsp;{t(a.texte)}&nbsp;»</div>
      <div className="card flat">
        <div className="t12 b8 c3" style={{ letterSpacing: '.06em', textTransform: 'uppercase' }}>
          {t('Si tu acceptes')}
        </div>
        <div className="cl11-sum">
          <span>{t('Tu es remboursée')}</span>
          <span className="v cg">{F(a.montant)}&nbsp;F</span>
        </div>
        <div className="kv">
          <span className="k">{t('Sur ton paiement de')}</span>
          <span className="v">{F(l.montant)}&nbsp;F</span>
        </div>
        <div className="t13 c2" style={{ lineHeight: '1.45' }}>
          {moyen} {t('Tu gardes l’article et le litige est clos ; le reste de ton paiement est versé au vendeur.')}
        </div>
        {reste > 0 && (
          <div className="kv">
            <span className="k">{t('Versé au vendeur')}</span>
            <span className="v">{F(reste)}&nbsp;F</span>
          </div>
        )}
      </div>
      <div className="hint-l">
        <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{tf('Tu as {j} jours pour répondre. Sans réponse, ton dossier revient en examen chez BelivaY : rien n’est accepté à ta place.', { j: ARRANGEMENT_J })}</span>
      </div>
      <div className="hint-l">
        <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Si tu refuses, rien n’est perdu : BelivaY examine ton dossier et décide avec un motif écrit.')}</span>
      </div>
      <div className="btns">
        <button type="button" className={'btn secondary' + (envoi ? ' off' : '')} onClick={() => repondre(false)}>
          <span>{t('Refuser')}</span>
        </button>
        <button type="button" className={'btn primary' + (envoi ? ' off' : '')} onClick={() => repondre(true)}>
          <span>{t('Accepter')}</span>
        </button>
      </div>
    </>
  )
  const accepte = (
    <>
      <div className="center">
        <div className="empty" style={{ padding: '6px 0 0' }}>
          <div className="ei" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
            <Icone nom="circle-check" taille={26} />
          </div>
          <h3>{t('Arrangement accepté')}</h3>
          <p>
            {t('Tu recevras ')}
            <b>{F(a.montant)}&nbsp;F</b>
            {tf(' {ou}, {quand}.', { ou: remb.ou, quand: remb.quand })}{' '}
            {tf('Le litige {id} est clos.', { id: l.id })}
          </p>
        </div>
      </div>
      {comptoir && (
        <div className="card flat">
          <div className="cl11-row">
            <span className="ic-sq or">
              <Icone nom="map-pin" taille={20} />
            </span>
            <span className="grow">
              <span className="t" style={{ display: 'block' }}>
                {tf('Ton article t’attend au {r}.', { r: l.relais })}
              </span>
              <span className="s" style={{ display: 'block' }}>
                {t('Le gérant te le rend au comptoir.')}
              </span>
            </span>
          </div>
        </div>
      )}
      <div className="btns">
        <Link to={chemin('litiges')} className="btn primary">
          <span>{t('Voir mes litiges')}</span>
        </Link>
      </div>
    </>
  )
  const refuse = (
    <>
      <div className="center">
        <div className="empty" style={{ padding: '6px 0 0' }}>
          <div className="ei">
            <Icone nom="scale" taille={26} />
          </div>
          <h3>{t('Proposition refusée')}</h3>
          <p>
            {t('BelivaY examine ton dossier et décide avant le ')}
            <b>{dateA(decisionLe, langue)}</b>
            {t('.')}
          </p>
        </div>
      </div>
      <div className="note ink cl11-money">
        <Icone nom="lock" taille={18} />
        <div>
          <b>{tf('{m} F toujours bloqués', { m: F(l.montant) })}</b>
          {t(' · rien n’est versé au vendeur.')}
        </div>
      </div>
      <div className="btns">
        <Link to={chemin('litige-suivi', { id: l.id })} className="btn primary">
          <span>{t('Suivre mon litige')}</span>
        </Link>
      </div>
    </>
  )

  return (
    <Ecran
      route="litige-arrangement"
      sousTitre={l.id}
      fixes={
        <Feuille ouverte={feuille || !!reponse} fermer={fermer} titre={t(reponse === 'accepte' ? 'Arrangement accepté' : reponse === 'refuse' ? 'Proposition refusée' : 'Proposition du vendeur')} forme="large">
          {reponse === 'accepte' ? accepte : reponse === 'refuse' ? refuse : proposition}
        </Feuille>
      }
    >
      <div className="hero orange">
        <div className="hk">{t('À toi de répondre')}</div>
        <div className="cl11-ht">{t('Le vendeur te propose un arrangement')}</div>
        <div className="hs">{t('Tu acceptes ou tu refuses. Si tu refuses, BelivaY examine ton dossier.')}</div>
      </div>
      <div className="hint-l">
        <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{tf('Tu as {j} jours pour répondre. Sans réponse, ton dossier revient en examen chez BelivaY : rien n’est accepté à ta place.', { j: ARRANGEMENT_J })}</span>
      </div>
      <div className="btns">
        <button type="button" className="btn secondary" onClick={() => setFeuille(true)}>
          <span>{t('Voir la proposition')}</span>
        </button>
      </div>
      <div className="card">
        <div className="cl11-q">«&nbsp;{t(a.texte)}&nbsp;»</div>
      </div>
      <div className="note ink cl11-money">
        <Icone nom="lock" taille={18} />
        <div>
          <b>{tf('{m} F bloqués', { m: F(l.montant) })}</b>
          {t(' · rien n’est versé au vendeur pendant le litige.')}
        </div>
      </div>
      <div className="card">
        <h3 className="cl11-k">{t('Où en est ton litige')}</h3>
        <div className="tl cl11-tl">
          <div className="ti done">
            <div className="tt">{t('Reçu')}</div>
            <div className="td">{dateA(l.ouvertLe, langue)}</div>
          </div>
          <div className="ti cur">
            <div className="tt">{t('Le vendeur a 48 h pour répondre')}</div>
            <div className="td">{t('Il propose un arrangement')}</div>
          </div>
          <div className="ti ">
            <div className="tt">{t('En examen')}</div>
            <div className="td">{t('si tu refuses')}</div>
          </div>
          <div className="ti ">
            <div className="tt">{t('Décision')}</div>
            <div className="td">{t('avec son motif écrit')}</div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="cl11-pc">
          <span className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }}>
            <Dessin id={l.dessin} />
          </span>
          <span className="grow">
            <b className="t15 b8" style={{ display: 'block' }}>
              {t(l.produit)}
            </b>
            <span className="t13 c3" style={{ display: 'block', marginTop: '2px' }}>
              {tf('Colis {n} · {ref}', { n: l.colis, ref: l.ref })}
              {comptoir && t(' · constat au comptoir')}
            </span>
          </span>
        </div>
        <div className="cl11-sep"></div>
        <div className="kv" style={{ paddingTop: '0' }}>
          <span className="k">{t('Problème')}</span>
          <span className="v">{t(l.probleme)}</span>
        </div>
        <div className="kv">
          <span className="k">{t('Ton souhait')}</span>
          <span className="v">{t(SOUHAIT[l.souhait])}</span>
        </div>
        {comptoir && (
          <div className="kv">
            <span className="k">{t('Ton article')}</span>
            <span className="v">{tf('Gardé au {r}, sans frais', { r: l.relais })}</span>
          </div>
        )}
      </div>
      <details className="more">
        <summary>
          <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Comment ça marche')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{t('Le vendeur a 48 h pour répondre : il accepte, il conteste avec des preuves, ou il propose un arrangement.')}</p>
          <p>{t('S’il ne répond pas, BelivaY décide, avec la règle en ta faveur. Une personne vérifie toujours et écrit pourquoi.')}</p>
          <p>{tf('Un arrangement se répond sous {j} jours. Si tu refuses, ou sans réponse, BelivaY décide au plus {h} h après, avec un motif écrit.', { j: ARRANGEMENT_J, h: DECISION_H })}</p>
          <p>{t('Une décision contre toi se conteste une fois, sous 48 h.')}</p>
          <p>{t('Les numéros et adresses écrits dans le dossier sont masqués automatiquement.')}</p>
        </div>
      </details>
      <div className="btns">
        <Link to={chemin('fil', { id: l.id, from: 'litige' })} className="btn secondary">
          <Icone nom="message-square-text" taille={18} />
          <span>{t('Écrire dans le dossier')}</span>
        </Link>
      </div>
      <div className="links">
        <Link to={chemin('litige-suivi', { id: l.id })}>{t('Voir le dossier')}</Link>
        <Link to={chemin('aide')}>{t('Besoin d’aide ?')}</Link>
      </div>
    </Ecran>
  )
}
