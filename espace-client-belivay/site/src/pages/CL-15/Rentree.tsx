// Écran « Rentrée » (CL-15 ; EX-01), forme d'origine du prototype rendue réelle (DP-54) : la liste en cours et où
// elle en est ; chercher l'école (nom ou quartier) parmi les écoles vérifiées, avec leur nombre de listes publiées ;
// photographier une liste papier (et les listes papier envoyées, en cours de saisie) ; comment ça marche ; l'espace
// des écoles ; une liste mise de côté en cours (payé, prochain versement). Hors saison (listes pas encore publiées) : la date d'arrivée des listes, la liste papier.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { norme } from '../../composants/Catalogue'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { F } from '../../i18n/format'
import { dateLongue, jourSeul, quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { paye, prochain, useCotes, useRentree } from './Commun'
import { Bloc } from '../CL-14/Commun'

// Les quatre étapes de la rentrée (école, classe, liste, panier) : n = l'étape en cours.
export function EtapesRentree({ n }: { n: number }) {
  return (
    <div className="steps">
      {[0, 1, 2, 3].map((i) => (
        <i key={i} className={i < n ? 'on' : i === n ? 'cur' : ''}></i>
      ))}
    </div>
  )
}
export function FfRentree() {
  const { t } = usePreferences()
  if (INTERRUPTEURS_DU_LANCEMENT['FF-EX01']) return null
  return (
    <div className="cl15-ff">
      <span className="cl15-pill">
        <Icone nom="lock" taille={13} />
        {t('Après le lancement · interrupteur fermé')}
      </span>
      <span className="cl15-ex">{t('EX-01')}</span>
    </div>
  )
}
// « Comment ça marche », replié.
export function CommentRentree() {
  const { t } = usePreferences()
  return (
    <details className="more">
      <summary>
        <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
        <span className="grow">{t('Comment ça marche')}</span>
        <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
      </summary>
      <div className="more-b">
        <p>{t('Tu choisis l’école, puis la classe. Tu décoches ce que ton enfant a déjà : le total est recalculé.')}</p>
        <p>{t('Tu paies toute la liste, ou tu la mets de côté avec un acompte. Quand tout est au relais, tu reçois un seul message et un seul code.')}</p>
        <p>{t('L’école publie gratuitement : BelivaY ne lui verse rien et ne lui demande rien.')}</p>
      </div>
    </details>
  )
}

export function Rentree() {
  const { t, tf, langue } = usePreferences()
  const [d] = useRentree()
  const [cotes] = useCotes()
  const [q, setQ] = useState('')
  if (!d) return null
  const deCote = (cotes?.liste ?? []).filter((x) => x.liste && x.etat === 'en_cours')
  const ecoles = d.ecoles.filter((e) => !q.trim() || norme(e.nom + ' ' + e.quartier).includes(norme(q.trim())))
  const c = d.enCours
  const arrives = c ? c.colis.filter((x) => x.arrive).length : 0
  const complete = c ? c.etat === 'retirable' || arrives === c.colis.length : false
  const classe = c?.colis[0]?.produit.split(' · ')[0] ?? ''
  const relais = t(d.relais ?? 'ton relais')
  const papier = (
    <>
      {d.papier.map((p) => (
        <div key={p.le} className="cl15-inf">
          <Icone nom="camera" taille={17} />
          <span>{tf('Liste papier {c} reçue : saisie avant le {d}. Tu reçois un message dès qu’elle est prête.', { c: p.classe, d: dateLongue(p.pretLe, langue) })}</span>
        </div>
      ))}
      <Link to={chemin('rentree-liste-papier')} className="cl15-op">
        <span className="ic-sq ">
          <Icone nom="camera" taille={22} />
        </span>
        <span className="tx">
          <b>{t('Liste papier ? Photographie-la')}</b>
          <small>{t('Un agent BelivaY la saisit sous 24 h.')}</small>
        </span>
        <Icone nom="chevron-right" taille={18} />
      </Link>
    </>
  )
  const recherche = (
    <div className="fld">
      <div className="inp">
        <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
        <input type="search" className="grow" aria-label={t('Nom de l’école ou quartier')} placeholder={t('Nom de l’école ou quartier')} value={q} onChange={(e) => setQ(e.target.value)} disabled={!d.ouverte} />
      </div>
    </div>
  )
  const pied = (
    <>
      <CommentRentree />
      <div className="links cl15-lk">
        <Link to={chemin('ecole')}>{t('Tu représentes une école ? Publie tes listes')}</Link>
      </div>
    </>
  )
  if (!d.ouverte)
    return (
      <Ecran route="rentree" largeur="moyen">
        <Styles id="ddcb0e469a" />
        <EtapesRentree n={0} />
        <FfRentree />
        <div className="pg">
          <div className="pg-k">{tf('Rentrée {s}', { s: d.saison })}</div>
          <h1 className="pg-t">{t('Trouve la liste de ton école')}</h1>
          <p className="pg-s">{tf('Toute la liste arrive au {r}, en un seul retrait.', { r: relais })}</p>
        </div>
        {recherche}
        <div className="card ">
          <div className="empty">
            <div className="ei">
              <Icone nom="calendar-clock" taille={26} />
            </div>
            <h3>{t('Les listes arrivent le 1er juillet')}</h3>
            <p>{t('Les écoles vérifiées publient leurs listes à partir de cette date. En attendant, tu peux photographier ta liste papier.')}</p>
          </div>
        </div>
        <Bloc classe="g5-duo g5-moitie">
          <Bloc classe="g5-g">{papier}</Bloc>
          <Bloc classe="g5-g">{pied}</Bloc>
        </Bloc>
      </Ecran>
    )
  return (
    <Ecran route="rentree" largeur="moyen">
      <Styles id="ddcb0e469a" />
      <EtapesRentree n={0} />
      <FfRentree />
      {c && (
        <Link to={chemin('rentree-suivi', { ref: c.ref })} className="card or" style={{ display: 'block' }}>
          <div className="cl15-oc">
            <span className="ic-sq or">
              <Icone nom="truck" taille={22} />
            </span>
            <div className="grow">
              <div className="cl15-k o">{tf('Ta liste en cours · {ref}', { ref: c.ref })}</div>
              <div className="ot" style={{ marginTop: '4px' }}>
                {tf('{l} · {a} colis sur {n} arrivé(s)', { l: classe, a: arrives, n: c.colis.length })}
              </div>
              <div className="os">
                {complete
                  ? tf('Toute la liste est au {l}', { l: t(c.lieu) })
                  : c.pretLe
                    ? tf('Toute la liste au {l} {d}', { l: t(c.lieu), d: quand(c.pretLe, d.maintenant, langue) })
                    : tf('Préparation chez les vendeurs · {l}', { l: t(c.lieu) })}
              </div>
            </div>
            <Icone nom="chevron-right" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0', alignSelf: 'center' }} />
          </div>
        </Link>
      )}
      {deCote.map((m) => (
        <Link key={m.id} to={chemin('cote-suivre', { id: m.id })} className="cl15-inf" style={{ color: 'inherit' }}>
          <Icone nom="piggy-bank" taille={17} />
          <span className="grow">
            <b>{tf('Liste {c} mise de côté', { c: m.liste!.classe })}</b>
            {' · '}
            {tf('{p} F payés sur {t} F', { p: F(paye(m)), t: F(m.prixLivre) })}
            {prochain(m) && <> · {tf('prochain versement le {d}', { d: jourSeul(prochain(m)!.le, langue) })}</>}
          </span>
          <Icone nom="chevron-right" taille={17} />
        </Link>
      ))}
      <div className="pg">
        <div className="pg-k">{tf('Rentrée {s}', { s: d.saison })}</div>
        <h1 className="pg-t">{t('Trouve la liste de ton école')}</h1>
        <p className="pg-s">{tf('Toute la liste arrive au {r}, en un seul retrait.', { r: relais })}</p>
      </div>
      {recherche}
      <div className="sec">
        <h2>{t('Écoles vérifiées')}</h2>
      </div>
      <Bloc classe="g5-ecoles">
      {ecoles.map((e) => (
        <Link key={e.id} to={chemin('rentree-classe', { ecole: e.id })} className="cl15-op">
          <span className="ic-sq or">
            <Icone nom="school" taille={22} />
          </span>
          <span className="tx">
            <b>{t(e.nom)}</b>
            <small>{tf('{q} · {n} listes {s}', { q: t(e.quartier), n: d.listes.filter((l) => l.ecole === e.id && l.statut === 'publiee').length, s: d.saison })}</small>
          </span>
          <Icone nom="chevron-right" taille={18} />
        </Link>
      ))}
      </Bloc>
      {!ecoles.length && (
        <div className="card ">
          <div className="empty">
            <h3>{t('Aucune école vérifiée pour cette recherche')}</h3>
            <p>{t('Photographie ta liste papier : un agent BelivaY la saisit.')}</p>
          </div>
        </div>
      )}
      <div className="hint-l">
        <Icone nom="badge-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Seules les écoles vérifiées par BelivaY publient une liste officielle.')}</span>
      </div>
      <Bloc classe="g5-duo g5-moitie">
        <Bloc classe="g5-g">{papier}</Bloc>
        <Bloc classe="g5-g">{pied}</Bloc>
      </Bloc>
    </Ecran>
  )
}
