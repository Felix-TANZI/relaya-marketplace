// Écran « Mes litiges » (CL-11), forme d'origine du prototype rendue réelle (DP-54) : les dossiers viennent des données, en cours
// puis terminés ; pour chacun : état, délai du vendeur qui se décompte, montant bloqué, étapes ; filtres et
// ouverture d'un nouveau signalement depuis une commande ; une décision contre le client dit jusqu'à quand la
// contester (48 h, DP-35) ; un arrangement dit le délai pour répondre (5 jours).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Gabarit, Zone } from '../../composants/Gabarits'
import { auMoins, useEcran } from '../../composants/ecran'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type Litige } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { Groupe } from '../CL-09/Commun'
import { ARRANGEMENT_J, contestable, enCours, etapes, finRecours, libelle } from './Commun'
import { DispositionLitige, useCorpsLitige } from './LitigeSuivi'

// « choisir » (maître-détail, dès 1200) : la carte ouvre le dossier dans le détail, à droite, sans quitter la liste.
function Carte({ l, maintenant, choisir, on }: { l: Litige; maintenant: number; choisir?: string; on?: boolean }) {
  const { t, tf, langue } = usePreferences()
  const lib = libelle(l, maintenant)
  const n = etapes(l)
  return (
    <Link
      to={choisir ?? (l.origine === 'auto' ? chemin('litige-auto', { id: l.id }) : l.etat === 'arrangement' ? chemin('litige-arrangement', { id: l.id }) : chemin('litige-suivi', { id: l.id }))}
      replace={!!choisir}
      aria-current={on ? 'true' : undefined}
      className={'card' + (on ? ' cl11-on' : '')}
      style={{ display: 'block' }}
    >
      <div className="oc">
        <span className="thumb" style={{ width: '64px', height: '64px', borderRadius: '16px' }}>
          <Dessin id={l.dessin} />
        </span>
        <div className="grow">
          <div className={'ost ' + lib.ton}>{lib.v ? tf(lib.texte, lib.v) : t(lib.texte)}</div>
          <div className="od">
            {t(l.produit)} · {tf('Colis {n}', { n: l.colis })}
            <br />
            {enCours(l)
              ? t(l.etat === 'attente' ? 'Le vendeur a 48 h pour répondre' : l.etat === 'arrangement' ? 'Tu acceptes ou tu refuses' : 'Décision avec un motif écrit')
              : tf('{p} · le {d}', { p: t(l.origine === 'auto' ? 'Tout de suite, sans enquête' : l.probleme), d: jourSeul(l.decision?.le ?? l.ouvertLe, langue) })}
          </div>
          {contestable(l, maintenant) && (
            <div className="t12 b7 c3" style={{ marginTop: 4 }}>
              <Icone nom="scale" taille={12} /> {tf('Contestable jusqu’au {d} · ton argent reste bloqué', { d: dateA(finRecours(l), langue) })}
            </div>
          )}
          {l.etat === 'arrangement' && (
            <div className="t12 b7 c3" style={{ marginTop: 4 }}>
              <Icone nom="clock" taille={12} /> {tf('{j} jours pour répondre, sinon BelivaY examine', { j: ARRANGEMENT_J })}
            </div>
          )}
          {(enCours(l) || contestable(l, maintenant)) && l.souhait !== 'signal' && (
            <div className="t12 b7 c3" style={{ marginTop: 4 }}>
              <Icone nom="lock" taille={12} /> {tf('{m} F bloqués', { m: F(l.montant) })}
            </div>
          )}
          <div className="cl11-mini" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <i key={i} className={i < n ? (enCours(l) ? 'on' : 'ok') : i === n && enCours(l) ? 'cur' : ''}></i>
            ))}
          </div>
          <div className="onum">
            {l.id} · {l.ref}
          </div>
        </div>
      </div>
    </Link>
  )
}

export function Litiges() {
  const { t, tf } = usePreferences()
  const [d, setD] = useState<{ litiges: Litige[]; maintenant: number } | null>(null)
  const [filtre, setFiltre] = useState<'tout' | 'encours' | 'termines'>('tout')
  const [params] = useSearchParams()
  // Grands écrans (§ 5.10) : dès 1024, cartes de dossier en grille de 2 ; dès 1200, maître-détail (la liste à gauche,
  // le suivi du dossier choisi, ?id=, à droite).
  const ecran = useEcran()
  const tabL = auMoins(ecran, 'tab-l')
  const md = auMoins(ecran, 'pc')
  useEffect(() => {
    source.litiges().then(setD)
  }, [])
  if (!d) return null
  const actifs = d.litiges.filter(enCours)
  const finis = d.litiges.filter((l) => !enCours(l))
  // Bloqué : les dossiers en cours, et une décision contre le client tant qu'elle peut être contestée (DP-35).
  const bloque = d.litiges.filter((l) => (enCours(l) || contestable(l, d.maintenant)) && l.souhait !== 'signal').reduce((s, l) => s + l.montant, 0)
  const choisi = md ? (params.get('id') ?? (actifs[0] ?? finis[0])?.id ?? null) : null
  const carte = (l: Litige) => <Carte key={l.id} l={l} maintenant={d.maintenant} choisir={md ? chemin('litiges', { id: l.id }) : undefined} on={md && l.id === choisi} />

  if (!d.litiges.length)
    return (
      <Ecran route="litiges">
        <div className="card" style={{ marginTop: '18px' }}>
          <div className="empty">
            <div className="ei">
              <Icone nom="scale" taille={26} />
            </div>
            <h3>{t('Aucun litige')}</h3>
            <p>{t('Un problème avec un colis\u00A0? Ouvre ta commande et touche «\u00A0Signaler un problème\u00A0». Au relais, dis-le au gérant\u00A0: il ouvre le litige pour toi.')}</p>
            <div className="btns" style={{ marginTop: '14px' }}>
              <Link to={chemin('commandes')} className="btn primary">
                <span>{t('Voir mes commandes')}</span>
              </Link>
            </div>
          </div>
        </div>
        <div className="links">
          <Link to={chemin('legal-doc', { d: 'retours' })}>{t('Règles des retours et des litiges')}</Link>
        </div>
      </Ecran>
    )

  const bIntro = (
    <>
      <p className="pg-s" style={{ marginTop: '16px' }}>
        {t('Chaque dossier, son état et le délai du vendeur.')}
      </p>
    </>
  )
  const bBloque = (
    <>
      {bloque > 0 && (
        <div className="note ink cl11-money">
          <Icone nom="lock" taille={18} />
          <div>
            <b>{tf('{m} F bloqués', { m: F(bloque) })}</b>
            {t(' · rien n’est versé aux vendeurs tant que tes dossiers sont ouverts.')}
          </div>
        </div>
      )}
    </>
  )
  const bFiltres = (
    <>
      <div className="chips">
        {(
          [
            ['tout', t('Tous')],
            ['encours', tf('En cours · {n}', { n: actifs.length })],
            ['termines', tf('Terminés · {n}', { n: finis.length })],
          ] as const
        ).map(([k, x]) => (
          <a key={k} href="#" className={'chip' + (filtre === k ? ' on' : '')} aria-pressed={filtre === k} onClick={(e) => (e.preventDefault(), setFiltre(k))}>
            {x}
          </a>
        ))}
      </div>
    </>
  )
  const bEnCours = (
    <>
      {filtre !== 'termines' && actifs.length > 0 && (
        <>
          <div className="sec">
            <h2>{tf('En cours · {n}', { n: actifs.length })}</h2>
          </div>
          <Groupe si={tabL && !md} classe="cl11-grille">
            {actifs.map(carte)}
          </Groupe>
        </>
      )}
    </>
  )
  const bTermines = (
    <>
      {filtre !== 'encours' && finis.length > 0 && (
        <>
          <div className="sec">
            <h2>{tf('Terminés · {n}', { n: finis.length })}</h2>
          </div>
          <Groupe si={tabL && !md} classe="cl11-grille">
            {finis.map(carte)}
          </Groupe>
        </>
      )}
    </>
  )
  const bNote = (
    <>
      <div className="hint-l">
        <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Un problème avec un autre colis\u00A0? Ouvre la commande et touche «\u00A0Signaler un problème\u00A0».')}</span>
      </div>
    </>
  )
  const bDelais = (
    <>
      <details className="more">
        <summary>
          <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Les délais d’un litige')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{t('Signaler : 7 jours après le retrait ; un défaut caché, 100 jours.')}</p>
          <p>{t('Le vendeur : 48 h pour répondre. BelivaY : au plus 24 h après, avec un motif écrit.')}</p>
          <p>{t('Un arrangement proposé : 5 jours pour répondre. Une décision contre toi : un recours, sous 48 h.')}</p>
          <p>{t('Pendant tout ce temps, ton argent reste bloqué : rien n’est versé au vendeur.')}</p>
        </div>
      </details>
    </>
  )
  const bCommandes = (
    <>
      <div className="btns">
        <Link to={chemin('commandes')} className="btn secondary">
          <span>{t('Voir mes commandes')}</span>
        </Link>
      </div>
    </>
  )
  const bLiens = (
    <>
      <div className="links">
        <Link to={chemin('legal-doc', { d: 'retours' })}>{t('Règles des retours et des litiges')}</Link>
        <Link to={chemin('faq', { t: 'litige' })}>{t('Questions sur les litiges')}</Link>
        <Link to={chemin('aide')}>{t('Besoin d’aide ?')}</Link>
      </div>
    </>
  )
  return (
    <Ecran route="litiges" largeur={tabL ? 'moyen' : undefined}>
      {md ? (
        <Gabarit forme="maitre-detail" classe="cl11-md">
          <Zone nom="liste">
            {bIntro}
            {bBloque}
            {bFiltres}
            {bEnCours}
            {bTermines}
            {bNote}
            {bDelais}
            {bCommandes}
            {bLiens}
          </Zone>
          <Zone nom="detail">{choisi && <DetailLitige key={choisi} id={choisi} />}</Zone>
        </Gabarit>
      ) : (
        <>
          {bIntro}
          {bBloque}
          {bFiltres}
          {bEnCours}
          {bTermines}
          {bNote}
          {bDelais}
          {bCommandes}
          {bLiens}
        </>
      )}
    </Ecran>
  )
}

// Détail du dossier choisi (maître-détail, dès 1200) : le corps du suivi du litige, en 2 colonnes internes. Les
// feuilles (contester, retirer) se posent sur l'écran, hors de la zone qui défile.
function DetailLitige({ id }: { id: string }) {
  const { t } = usePreferences()
  const corps = useCorpsLitige(id)
  if (corps === undefined) return null
  if (!corps)
    return (
      <div className="card">
        <div className="empty">
          <h3>{t('Dossier introuvable')}</h3>
        </div>
      </div>
    )
  const hote = document.getElementById('app')
  return (
    <>
      <DispositionLitige m={corps.morceaux} />
      {hote && corps.fixes ? createPortal(corps.fixes, hote) : null}
    </>
  )
}
