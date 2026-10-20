// Écran « Litige ouvert » (CL-11), forme d'origine du prototype rendue réelle (DP-54) : le dossier qui vient
// d'être ouvert (?id=…) : numéro, colis, argent bloqué (ou, pour un défaut caché, vendeur déjà payé et somme
// reprise sur ses versements), délai du vendeur, la suite en quatre étapes ; un simple signal le dit, sans
// dossier ni argent bloqué. Écrire dans le dossier reste possible. Aussi : où ira l'argent si la demande est
// retenue (useRemboursement), quand BelivaY décide (24 h après le vendeur) et le recours (48 h ; DP-35).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type CommandeLitige, type Litige } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { decisionAvant, useRemboursement } from './Commun'

export function LitigeConfirme() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const id = params.get('id') ?? 'LIT-3042'
  const [d, setD] = useState<{ litige: Litige; maintenant: number } | null | undefined>(undefined)
  const [cmd, setCmd] = useState<CommandeLitige | null>(null)
  const remb = useRemboursement(cmd?.payePar ?? null)
  useEffect(() => {
    source.litige(id).then((x) => {
      setD(x)
      if (x) source.commandeLitige(x.litige.ref).then(setCmd)
    })
  }, [id])
  if (d === undefined) return null
  if (!d)
    return (
      <Ecran route="litige-confirme">
        <div className="card">
          <div className="empty">
            <h3>{t('Dossier introuvable')}</h3>
            <div className="btns">
              <Link to={chemin('litiges')} className="btn primary">
                <span>{t('Mes litiges')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const l = d.litige
  const colis = cmd?.colis.find((x) => x.n === l.colis)
  const cachee = cmd?.fenetre === 'cachee'
  const ecrire = (
    <div className="btns">
      <Link to={chemin('fil', { id: l.id, from: 'litige' })} className="btn secondary">
        <Icone nom="message-square-text" taille={18} />
        <span>{t('Écrire dans le dossier')}</span>
      </Link>
    </div>
  )
  if (l.souhait === 'signal')
    return (
      <Ecran route="litige-confirme" sousTitre={l.id}>
        <div className="hero night">
          <span className="ico-b">
            <Icone nom="flag" taille={22} />
          </span>
          <div className="cl11-ht">{t('Merci, c’est noté.')}</div>
          <div className="hs">{tf('Ton signal sur le colis {n} part à l’équipe qualité de BelivaY.', { n: l.colis })}</div>
        </div>
        <div className="card">
          <div className="cl11-row">
            <span className="ic-sq green">
              <Icone nom="package-check" taille={20} />
            </span>
            <span className="grow">
              <span className="t" style={{ display: 'block' }}>
                {t('Ta commande ne change pas')}
              </span>
              <span className="s" style={{ display: 'block' }}>
                {t('Tu n’as rien demandé : pas de dossier, pas d’argent bloqué.')}
              </span>
            </span>
          </div>
          <div className="cl11-sep"></div>
          <div className="cl11-row">
            <span className="ic-sq ">
              <Icone nom="shield-check" taille={20} />
            </span>
            <span className="grow">
              <span className="t" style={{ display: 'block' }}>
                {t('À quoi ça sert')}
              </span>
              <span className="s" style={{ display: 'block' }}>
                {t('Plusieurs signaux sur un même produit déclenchent une vérification du vendeur.')}
              </span>
            </span>
          </div>
        </div>
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Tu changes d’avis ? Tu peux encore demander un remboursement ou un remplacement tant que la fenêtre de retour est ouverte.')}</span>
        </div>
        <div className="btns">
          <Link to={chemin('commandes')} className="btn primary">
            <span>{t('Retour à mes commandes')}</span>
          </Link>
        </div>
        <div className="btns">
          <Link to={chemin('litige-suivi', { id: l.id })} className="btn secondary">
            <Icone nom="scale" taille={18} />
            <span>{t('Suivre mon litige')}</span>
          </Link>
        </div>
        {ecrire}
      </Ecran>
    )
  return (
    <Ecran route="litige-confirme" sousTitre={l.id}>
      <div className="hero night">
        <div className="hk">{t('Ton numéro de dossier')}</div>
        <div className="cl11-num">{l.id}</div>
        <div className="hs">
          {tf('Reçu {q}. Une personne de BelivaY suit ton dossier jusqu’à la décision.', { q: quand(l.ouvertLe, d.maintenant, langue) })}
        </div>
      </div>
      <div className="cl11-ctx">
        <span className="thumb" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
          <Dessin id={l.dessin} />
        </span>
        <span className="grow">
          <span className="t" style={{ display: 'block' }}>
            {tf('Colis {n} · {p}', { n: l.colis, p: t(l.produit) })}
          </span>
          <span className="s" style={{ display: 'block' }}>
            {colis ? t(colis.detail) : l.ref}
            {' · '}
            {t(l.probleme)}
            {l.preuves.length > 0 && ' · ' + tf('{n} photo(s)', { n: l.preuves.length })}
          </span>
        </span>
      </div>
      {cachee ? (
        <div className="note amber">
          <Icone nom="banknote" taille={18} />
          <div>
            <b>{t('Le vendeur a déjà été payé.')}</b>
            {t(' Si le défaut est confirmé, BelivaY te rembourse et reprend la somme sur ses prochains versements.')}
          </div>
        </div>
      ) : (
        <div className="note ink cl11-money">
          <Icone nom="lock" taille={18} />
          <div>
            <b>{t('Ton paiement reste bloqué, rien n’est versé au vendeur.')}</b>
            {tf(' {m} F en attente de la décision.', { m: F(l.montant) })}
          </div>
        </div>
      )}
      <div className="card">
        <div className="cl11-row">
          <span className="ic-sq or">
            <Icone nom="clock" taille={20} />
          </span>
          <span className="grow">
            <span className="t" style={{ display: 'block' }}>
              {tf('Le vendeur a jusqu’au {d} pour répondre.', { d: dateA(l.echeance, langue) })}
            </span>
            <span className="s" style={{ display: 'block' }}>
              {t('Sans réponse, BelivaY décide, avec la règle en ta faveur.')}
            </span>
          </span>
        </div>
        <div className="cl11-sep"></div>
        <div className="cl11-row">
          <span className="ic-sq ">
            <Icone nom="scale" taille={20} />
          </span>
          <span className="grow">
            <span className="t" style={{ display: 'block' }}>
              {tf('Si besoin, BelivaY décide avant le {d}.', { d: dateA(decisionAvant(l), langue) })}
            </span>
            <span className="s" style={{ display: 'block' }}>
              {t('Toujours avec un motif écrit. Une décision contre toi se conteste une fois, sous 48 h.')}
            </span>
          </span>
        </div>
        {l.souhait === 'rembourse' && (
          <>
            <div className="cl11-sep"></div>
            <div className="cl11-row">
              <span className="ic-sq green">
                <Icone nom="banknote" taille={20} />
              </span>
              <span className="grow">
                <span className="t" style={{ display: 'block' }}>
                  {tf('Si ta demande est retenue : {m} F {ou}.', { m: F(l.montant), ou: remb.ou })}
                </span>
                <span className="s" style={{ display: 'block' }}>
                  {tf('{q}. Si le vendeur ou le transporteur est en tort, la livraison du colis aussi.', { q: remb.quand.charAt(0).toUpperCase() + remb.quand.slice(1) })}
                </span>
              </span>
            </div>
          </>
        )}
        {l.pb !== 'jamais' && l.origine !== 'comptoir' && (
          <>
            <div className="cl11-sep"></div>
            <div className="cl11-row">
              <span className="ic-sq ">
                <Icone nom="package" taille={20} />
              </span>
              <span className="grow">
                <span className="t" style={{ display: 'block' }}>
                  {t('Garde l’article et son emballage')}
                </span>
                <span className="s" style={{ display: 'block' }}>
                  {t('S’il doit repartir, tu le rapportes à ton relais : on te dira quand.')}
                </span>
              </span>
            </div>
          </>
        )}
      </div>
      <div className="btns">
        <Link to={chemin('litige-suivi', { id: l.id })} className="btn primary">
          <span>{t('Suivre mon litige')}</span>
        </Link>
      </div>
      {ecrire}
      <details className="more">
        <summary>
          <Icone nom="list" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('La suite, en quatre étapes')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <div className="tl cl11-tl">
            {[
              ['Reçu', l.preuves.length ? 'avec tes photos' : 'avec ta description'],
              ['Le vendeur a 48 h pour répondre', 'il accepte, conteste ou propose un arrangement'],
              ['En examen', 'si besoin, BelivaY compare les preuves'],
              ['Décision', 'au plus 24 h après, toujours avec son motif écrit'],
            ].map(([a, b], i) => (
              <div key={a} className={'ti ' + (i === 0 ? 'done' : i === 1 ? 'cur' : '')}>
                <div className="tt">{t(a)}</div>
                <div className="td">{t(b)}</div>
              </div>
            ))}
          </div>
        </div>
      </details>
      <div className="hint-l">
        <Icone nom="bell" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Tu es prévenue à chaque étape par notification.')}</span>
      </div>
      <div className="links">
        <Link to={chemin('litiges')}>{t('Mes litiges')}</Link>
        <Link to={chemin('aide')}>{t('Besoin d’aide ?')}</Link>
      </div>
    </Ecran>
  )
}
