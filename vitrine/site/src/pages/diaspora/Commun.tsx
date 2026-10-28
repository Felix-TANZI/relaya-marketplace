// Morceaux communs aux écrans diaspora (DP-54) : partage d'un code ou d'un lien d'invitation (QR, WhatsApp, SMS,
// copier, menu de partage du téléphone), étape d'une commande envoyée vue de celui qui paie (jamais le code ni
// l'adresse), pastille d'un proche, devise d'affichage du compte.
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { jouer } from '../../composants/Sons'
import { chemin } from '../../config/pages'
import { source, type CommandePourProche, type LienFamille } from '../../donnees/source'
import { dateLongue } from '../../i18n/dates'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { Qr } from '../CL-09/Commun'

// Grands écrans (DISPOSITION-ECRANS.md § 5.14, lot 13) : enveloppe de mise en page qui n'existe que dès son
// palier (1024 px par défaut). En dessous, ses enfants passent tels quels : le téléphone ne change pas d'un pixel.
export function Rangee({ classe, des = 'tab-l', etiquette, children }: { classe: string; des?: 'tab' | 'tab-l' | 'pc'; etiquette?: string; children: ReactNode }) {
  const { t } = usePreferences()
  const actif = useDes(des)
  if (!actif) return <>{children}</>
  if (etiquette)
    return (
      <aside className={classe} aria-label={t(etiquette)}>
        {children}
      </aside>
    )
  return <div className={classe}>{children}</div>
}

export const quartier = (r: string | null | undefined) => (r ?? '').replace(/^Relais /, '')

// Où va le colis, vu de celui qui paie : le quartier du relais, ou « chez X » (jamais l'adresse).
export function destination(l: Pick<LienFamille, 'prenom' | 'relais' | 'ville'>, livraison: 'relais' | 'domicile' | undefined, t: (x: string) => string, tf: (m: string, v: Record<string, string | number>) => string) {
  return livraison === 'domicile' ? (l.ville ? tf('Chez {p} · {v}', { p: l.prenom, v: t(l.ville) }) : tf('Chez {p}', { p: l.prenom })) : tf('Relais de {q}', { q: t(quartier(l.relais)) })
}

// Étape d'une commande payée pour un proche.
export function etapeCommande(c: CommandePourProche, maintenant: number, t: (x: string) => string, tf: (m: string, v: Record<string, string | number>) => string) {
  if (c.rembourse) return tf('Remboursée sur ta carte · {m} F', { m: F(c.rembourse) })
  if (c.retireLe) return t(c.livraison === 'domicile' ? 'Remise · preuve de remise' : 'Retirée · preuve de retrait')
  if (c.pretLe && c.pretLe <= maintenant) return t(c.livraison === 'domicile' ? 'En livraison · code envoyé par SMS' : 'Au relais · code envoyé par SMS')
  return t('Payée · en préparation')
}

export function Pastille({ prenom }: { prenom: string }) {
  return (
    <span className="ic-sq or" style={{ borderRadius: '50%', width: 44, height: 44, fontWeight: 800, flexShrink: 0 }}>
      {prenom.slice(0, 1)}
    </span>
  )
}

// Partage d'une invitation : le lien ouvre « Mes proches » avec le code déjà rempli, chez celui qui le reçoit.
export function Partage({ code, type, date }: { code: string; type: 'famille' | 'invitation'; date: string }) {
  const { t, tf } = usePreferences()
  const [copie, setCopie] = useState(false)
  const lien = `${location.origin}${chemin('proches', type === 'famille' ? { code } : { invitation: code })}`
  const texte = type === 'famille' ? tf('Relie ton compte BelivaY diaspora au mien pour m’envoyer des commandes : {l} (code {c})', { l: lien, c: code }) : tf('Je peux te faire livrer tes courses sur BelivaY, payées depuis l’étranger. Accepte mon invitation : {l} (code {c})', { l: lien, c: code })
  return (
    <>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '0.1em' }}>{code}</div>
      <p className="t12 c3">{tf(type === 'famille' ? 'À donner à ton proche à l’étranger. Valable jusqu’au {d}, une seule fois.' : 'À envoyer à ton proche au Cameroun. Valable jusqu’au {d}.', { d: date })}</p>
      <div className="cl10-qr" aria-label={t('QR à scanner avec le téléphone de ton proche')}>
        <Qr texte={lien} />
      </div>
      <p className="t12 c3" style={{ textAlign: 'center' }}>
        {t('À scanner avec le téléphone de ton proche : le lien s’ouvre avec le code déjà rempli.')}
      </p>
      <div className="chips">
        <a className="chip" href={'https://wa.me/?text=' + encodeURIComponent(texte)} target="_blank" rel="noreferrer">
          {t('WhatsApp')}
        </a>
        <a className="chip" href={'sms:?&body=' + encodeURIComponent(texte)}>
          {t('SMS')}
        </a>
        <button
          type="button"
          className="chip"
          onClick={() => {
            navigator.clipboard?.writeText(lien).catch(() => {})
            setCopie(true)
            jouer('copie')
          }}
        >
          {t(copie ? 'Lien copié' : 'Copier le lien')}
        </button>
        {typeof navigator.share === 'function' && (
          <button type="button" className="chip" onClick={() => navigator.share({ title: 'BelivaY', text: texte, url: lien }).catch(() => {})}>
            {t('Partager…')}
          </button>
        )}
      </div>
    </>
  )
}

// Coche de succès (animée par composants/Animations.tsx : .cl08-sq) et son de paiement.
export function Succes({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="cl08-sq">
        <Icone nom="check" taille={30} trait={3} />
      </div>
      <h3 className="t15 b8 mt12" style={{ margin: '12px 0 4px' }}>
        {titre}
      </h3>
      <p className="t13 c2" style={{ margin: 0 }}>
        {texte}
      </p>
    </div>
  )
}

// « Mes commandes » d'un compte diaspora : les commandes payées pour ses proches, leur étape et où elles vont
// (quartier du relais ou « chez X ») ; jamais le code ni l'adresse. Le détail : « Commander pour » (?suivi=…).
export function CommandesEnvoyees() {
  const { t, tf, langue } = usePreferences()
  const [d, setD] = useState<{ liens: LienFamille[]; maintenant: number } | null>(null)
  useEffect(() => {
    source.liensFamille().then(setD)
  }, [])
  if (!d) return null
  const toutes = d.liens.flatMap((l) => l.commandes.map((c) => ({ l, c }))).sort((a, b) => b.c.le - a.c.le)
  return (
    <Ecran route="commandes">
      <div className="cl09">
        <div className="c9-h">
          <h1>{t('Mes commandes')}</h1>
          <span>{tf('{n} commandes', { n: toutes.length })}</span>
        </div>
        <p className="t13 c3">{t('Compte diaspora : les commandes que tu as payées pour tes proches. Ils les retirent avec leur code ou les reçoivent chez eux ; tu vois les étapes et la preuve.')}</p>
        {toutes.length ? (
          <div className="card tight">
            {toutes.map(({ l, c }) => (
              <Link key={c.ref} to={chemin('commander-pour', { suivi: c.ref })} className="li">
                <span className="ic">
                  <Icone nom={c.retireLe ? 'badge-check' : 'package'} taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {tf('{ref} · pour {p} · {m} F', { ref: c.ref, p: l.prenom, m: F(c.montant) })}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {etapeCommande(c, d.maintenant, t, tf)} · {destination(l, c.livraison, t, tf)} · {dateLongue(c.le, langue)}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card mt16">
            <div className="empty">
              <div className="ei">
                <Icone nom="package" taille={26} />
              </div>
              <h3>{t('Aucune commande envoyée')}</h3>
              <p>{t('Choisis un proche relié, remplis le panier pour lui, et paie par carte, Apple Pay ou Google Pay.')}</p>
              <div className="btns">
                <Link to={chemin('espace-diaspora')} className="btn primary">
                  <span>{t('Espace diaspora')}</span>
                </Link>
              </div>
            </div>
          </div>
        )}
        <div className="links">
          <Link to={chemin('paniers-proches')}>{t('À payer pour mes proches')}</Link> · <Link to={chemin('proches')}>{t('Mes proches')}</Link>
        </div>
      </div>
    </Ecran>
  )
}

// État vide d'un parcours pour un proche (Commander pour un proche, Panier famille : Pour qui ?, Payer par carte),
// pour un visiteur, un compte qui n'est pas diaspora ou un panier pas encore composé : ce que fait le parcours, en
// trois points, puis la suite utile (s'inscrire en diaspora ou se connecter, composer le panier, mes proches) et
// « Tout savoir » sur les comptes diaspora. Jamais un écran à une seule ligne.
export function VideProches({ icone, titre, texte, points, actions, liens }: { icone: string; titre: string; texte: string; points: [string, string][]; actions: { vers: string; texte: string; icone?: string }[]; liens?: { vers: string; texte: string }[] }) {
  const { t } = usePreferences()
  return (
    <div className="card mt12 dx-vide">
      <div className="empty">
        <div className="ei">
          <Icone nom={icone} taille={26} />
        </div>
        <h3>{t(titre)}</h3>
        <p>{t(texte)}</p>
        <ul className="dx-vide-l">
          {points.map(([ic, x]) => (
            <li key={x}>
              <Icone nom={ic} taille={18} />
              <span>{t(x)}</span>
            </li>
          ))}
        </ul>
        <div className="btns">
          {actions.map((a, i) => (
            <Link key={a.vers} to={a.vers} className={'btn ' + (i === 0 ? 'primary' : 'secondary')}>
              {a.icone && <Icone nom={a.icone} taille={18} />}
              <span>{t(a.texte)}</span>
            </Link>
          ))}
        </div>
        <div className="links">
          {(liens ?? []).map((l) => (
            <Link key={l.vers} to={l.vers}>
              {t(l.texte)}
            </Link>
          ))}
          <Link to={chemin('diaspora-infos')}>{t('Tout savoir sur les comptes diaspora')}</Link>
        </div>
      </div>
    </div>
  )
}
