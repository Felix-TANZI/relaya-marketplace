// Écran « Document légal » (CL-13), balisage et logique du prototype du 1er octobre (route legal-doc, CL13_LEGAL),
// repris à la main et rendu logique (DP-53) :
// - dix documents (?d=…, sinon les conditions d'utilisation), lus dans les données, dont les comptes diaspora et le
//   paiement par lien depuis l'étranger (DP-54) ;
// - la langue du document : « ?lang=fr|en », sinon celle de l'application ; le texte français reste en français
//   dans l'application anglaise (et l'inverse) ;
// - version et date de publication ; « Acceptée le … » pour les textes acceptés à l'inscription, si un compte est ouvert ;
// - « Télécharger le texte complet (PDF) » : le PDF de l'API ; en démonstration, un PDF fabriqué sur l'appareil.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { couper, enregistrerFichier, pdfTexte } from '../../donnees/pdf'
import { source, type DocumentLegal, type DonneesLegal, type TexteLegal } from '../../donnees/source'
import { dateLongue } from '../../i18n/dates'
import { usePreferences, type Langue } from '../../preferences'
import { EcranCompte, MaitreDetail, useMaitreDetail } from './Larges'
import { CorpsLegal } from './Legal'

export function useLegal(): DonneesLegal | null {
  const [d, setD] = useState<DonneesLegal | null>(null)
  useEffect(() => {
    let vivant = true
    source.legal().then((x) => vivant && setD(x))
    return () => {
      vivant = false
    }
  }, [])
  return d
}

// Textes de l'écran dans la langue du document.
const MOTS = {
  fr: { essentiel: 'L’essentiel', pdf: 'Télécharger le texte complet (PDF)', acceptee: 'Acceptée le ', enregistre: 'PDF enregistré sur le téléphone.' },
  en: { essentiel: 'Key points', pdf: 'Download the full text (PDF)', acceptee: 'Accepted on ', enregistre: 'PDF saved on the phone.' },
}

// Le PDF du document (démonstration) : titre, version, l'essentiel ; l'API servira le texte complet.
function pdf(x: TexteLegal, version: string, acceptee: string | null, l: Langue): Blob {
  return pdfTexte([
    { texte: 'BelivaY', taille: 22, gras: true },
    { texte: x.titre, taille: 15, gras: true, espace: 10 },
    { texte: x.sous, taille: 10 },
    { texte: version + (acceptee ? ' · ' + acceptee : ''), taille: 10 },
    { texte: MOTS[l].essentiel, gras: true, espace: 14 },
    ...(x.grille ?? []).map(([j, p]) => ({ texte: j, droite: p, taille: 10 })),
    ...x.points.flatMap((p, i) => couper(`${i + 1}. ${p}`, 480, 11).map((texte, n) => ({ texte, x: n ? 64 : 50, espace: n ? 0 : 6 }))),
  ])
}

export function LegalDoc() {
  const { langue } = usePreferences()
  const [params] = useSearchParams()
  const d = useLegal()
  const [message, setMessage] = useState<string | null>(null)
  // Dès 1200 px : maître-détail, la liste des documents (Legal.tsx) à gauche, ce document à droite.
  const md = useMaitreDetail()
  const parametre = params.get('lang')
  const l: Langue = parametre === 'en' || parametre === 'fr' ? parametre : langue
  const cle = params.get('d')
  useEffect(() => setMessage(null), [cle, l])
  if (!d) return null
  const doc: DocumentLegal = d.documents.find((x) => x.cle === cle) ?? d.documents[0]
  // L'interface anglaise écrit « email » (comme le dictionnaire du prototype) ; le texte brut garde « e-mail ».
  const brut = doc[l]
  const ecrire = (v: string) => (l === 'en' && langue === 'en' ? v.replace(/\be-mail\b/g, 'email') : v)
  const x: TexteLegal = { ...brut, titre: ecrire(brut.titre), sous: ecrire(brut.sous), points: brut.points.map(ecrire) }
  const version = `Version ${d.version} · ${dateLongue(d.publiee, l)}`
  const acceptee = doc.aAccepter && d.acceptee ? MOTS[l].acceptee + dateLongue(d.acceptee, l) : null
  const telecharger = () => {
    const lien = d.pdf?.[`${doc.cle}-${l}`]
    if (lien) return void window.open(lien, '_blank', 'noopener')
    enregistrerFichier(pdf(x, version, acceptee, l), `BelivaY-${doc.cle}-${d.version}-${l}.pdf`)
    setMessage(MOTS[l].enregistre)
  }
  const corps = <CorpsDoc doc={doc} x={x} l={l} version={version} acceptee={acceptee} telecharger={telecharger} message={message} setMessage={setMessage} />
  return (
    <EcranCompte route="legal-doc" parEtat etat="legal-doc">
      {md ? <MaitreDetail etiquette="Document" liste={<CorpsLegal d={d} md actif={doc.cle} />} detail={<div className="md13-lec">{corps}</div>} /> : corps}
    </EcranCompte>
  )
}

function CorpsDoc({ doc, x, l, version, acceptee, telecharger, message, setMessage }: { doc: DocumentLegal; x: TexteLegal; l: Langue; version: string; acceptee: string | null; telecharger: () => void; message: string | null; setMessage: (m: string) => void }) {
  const { langue } = usePreferences()
  return (
    <>
      <div className="seg">
        <Link to={chemin('legal-doc', langue === 'en' ? { d: doc.cle, lang: 'fr' } : { d: doc.cle })} className={l === 'fr' ? 'on' : ''} replace>
          Français
        </Link>
        <Link to={chemin('legal-doc', { d: doc.cle, lang: 'en' })} className={l === 'en' ? 'on' : ''} replace>
          English
        </Link>
      </div>
      <div className="pg" lang={l}>
        <h1 className="pg-t">{x.titre}</h1>
        <p className="pg-s">{x.sous}</p>
      </div>
      <div className="meta" lang={l}>
        <span className="pill ink">
          <Icone nom="file-text" taille={13} />
          {version}
        </span>
        {acceptee && (
          <span className="pill green">
            <Icone nom="check" taille={13} />
            {acceptee}
          </span>
        )}
      </div>
      <div className="card cl13-doc" lang={l}>
        <div className="kick">{MOTS[l].essentiel}</div>
        {x.grille && (
          <div className="cl13-grid3">
            {x.grille.map(([j, p]) => (
              <div key={j}>
                {j}
                <b>{p}</b>
              </div>
            ))}
          </div>
        )}
        <ol>
          {x.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      </div>
      {/* DP-54 : pour les deux textes de la diaspora, la page qui explique tout, en pratique. */}
      {(doc.cle === 'diaspora' || doc.cle === 'paiement-lien') && (
        <div className="card tight mt12" lang={l}>
          <Link to={chemin('diaspora-infos')} className="li">
            <span className="ic">
              <Icone nom="globe" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {l === 'en' ? 'Diaspora accounts: all you need to know' : 'Comptes diaspora : tout savoir'}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {l === 'en' ? 'Who can sign up, linking a relative, paying, refunds' : 'Qui peut s’inscrire, relier un proche, payer, être remboursé'}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        </div>
      )}
      <div className="btns mt16" lang={l}>
        <button type="button" className="btn secondary" onClick={telecharger}>
          <Icone nom="download" taille={18} />
          <span>{MOTS[l].pdf}</span>
        </button>
      </div>
      {/* DP-54 : partager, imprimer, recevoir par e-mail ; historique des versions. */}
      <div className="links" style={{ justifyContent: 'center', gap: 18 }}>
        <a
          href={chemin('legal-doc', { d: doc.cle, lang: l })}
          onClick={async (e) => {
            e.preventDefault()
            try {
              if (navigator.share) await navigator.share({ title: x.titre, url: location.href })
              else (await navigator.clipboard.writeText(location.href), setMessage(l === 'en' ? 'Link copied.' : 'Lien copié.'))
            } catch {
              // Partage annulé.
            }
          }}
        >
          <Icone nom="share" taille={15} /> {l === 'en' ? 'Share' : 'Partager'}
        </a>
        <a href={chemin('legal-doc', { d: doc.cle, lang: l })} onClick={(e) => (e.preventDefault(), window.print())}>
          <Icone nom="printer" taille={15} /> {l === 'en' ? 'Print' : 'Imprimer'}
        </a>
        <a href={chemin('legal-doc', { d: doc.cle, lang: l })} onClick={(e) => (e.preventDefault(), setMessage(l === 'en' ? 'Sent to your email address.' : 'Envoyé à ton adresse e-mail.'))}>
          <Icone nom="mail" taille={15} /> {l === 'en' ? 'By email' : 'Par e-mail'}
        </a>
      </div>
      <details className="more">
        <summary>
          <Icone nom="history" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{l === 'en' ? 'Version history' : 'Historique des versions'}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b" lang={l}>
          <p>
            <b>{version}</b> — {l === 'en' ? 'first version, at launch. A major change will be shown to you when you open the app.' : 'première version, au lancement. Un changement important te sera montré à l’ouverture de l’application.'}
          </p>
        </div>
      </details>
      {message && (
        <div className="hint-l" role="status" lang={l}>
          <Icone nom="check" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{message}</span>
        </div>
      )}
    </>
  )
}
