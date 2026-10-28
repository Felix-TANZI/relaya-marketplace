// Préparation article par article (VD05-R14, BON-01) : les quatre cases « À vérifier avant l'arrivée du livreur »
// (bon modèle et bonne couleur ; article neuf, allumé et testé ; accessoires mis de côté ; boîte d'origine prête),
// cochées par le propriétaire ou l'employé (chaque coche garde qui l'a faite), communes à la commande et au bon.
// « Scanner la référence » : le code-barres de la boîte (caméra, BarcodeDetector) ou la référence tapée ; la bonne
// référence coche « Bon modèle et bonne couleur » et s'écrit au journal ; une autre référence est refusée, avec la
// référence attendue. Sans caméra (ou refusée), la saisie seule reste.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { jouer } from '@client/composants/Sons'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { Icone } from '../../composants/Icone'
import type { BonPreparation, Verification } from '../../donnees/domaines/preparation'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'

type Traduire = (s: string) => string
type TraduireAvec = (s: string, p: Record<string, string | number>) => string

/** Texte d'une vérification, FR / EN. */
export function libelleVerification(cle: Verification, bon: BonPreparation, t: Traduire, tf: TraduireAvec): string {
  const l = bon.lignes[0]
  const autres = l.aMettreDeCote.filter((x) => !/^bo[iî]te/.test(x)).map((x) => t(x))
  switch (cle) {
    case 'modele':
      return tf(l.quantite > 1 ? 'Bon modèle et bonne couleur : {article} ×{q}' : 'Bon modèle et bonne couleur : {article}', { article: `${l.titre} ${t(l.variante)}`, q: l.quantite })
    case 'etat':
      return l.etat === 'Neuf' ? t('Article neuf, allumé et testé') : tf('Article en état « {etat} », allumé et testé', { etat: t(l.etat) })
    case 'accessoires':
      if (!autres.length) return t('Accessoires de la fiche mis de côté')
      return tf('{liste} mis de côté', { liste: (autres.length > 1 ? autres.slice(0, -1).join(', ') + ' ' + t('et') + ' ' + autres.at(-1) : autres[0]).replace(/^./, (c) => c.toUpperCase()) })
    case 'boite':
      return t('Boîte d’origine prête')
  }
}

declare global {
  interface Window {
    BarcodeDetector?: new (o?: { formats?: string[] }) => { detect(s: CanvasImageSource): Promise<{ rawValue: string }[]> }
  }
}

export function Verifications({ bon, actif = true, sansTitre = false }: { bon: BonPreparation; actif?: boolean; sansTitre?: boolean }) {
  const { t, tf } = usePreferences()
  const scan = useFeuille('scan')
  const faits = bon.aVerifier.filter((x) => x.fait).length
  const cocher = async (i: number) => {
    if (!actif) return
    // La source prévient les écrans (blv:donnees) : la commande et le bon se relisent.
    if (await source.preparation.cocher(bon.ref, i, !bon.aVerifier[i].fait)) jouer('interrupteur')
  }
  return (
    <>
      <div className="row" style={{ alignItems: 'center', display: sansTitre ? 'none' : undefined }}>
        <div className="kick grow">{t('À vérifier avant l’arrivée du livreur')}</div>
        <span className={'pill sm ' + (faits === bon.aVerifier.length ? 'green' : 'ink')} aria-live="polite">
          {tf('{n} sur {total}', { n: faits, total: bon.aVerifier.length })}
        </span>
      </div>
      <div className="mt4">
        {bon.aVerifier.map((v, i) => (
          <div
            key={v.cle}
            className="check"
            role="checkbox"
            aria-checked={v.fait}
            aria-disabled={!actif || undefined}
            tabIndex={actif ? 0 : -1}
            onClick={() => void cocher(i)}
            onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), void cocher(i))}
            style={{ cursor: actif ? 'pointer' : 'default', minHeight: '44px', alignItems: 'center' }}
          >
            <span className={'cb' + (v.fait ? ' on' : '')}>{v.fait && <Icone nom="check" taille={14} trait={3} />}</span>
            <span className="grow">
              {libelleVerification(v.cle, bon, t, tf)}
              {v.fait && v.par && <span className="t12 c3" style={{ display: 'block' }}>{tf('Coché par {nom}', { nom: v.par })}</span>}
            </span>
          </div>
        ))}
      </div>
      {actif && (
        <button type="button" className="btn secondary sm mt8" onClick={scan.ouvrir} style={{ height: '44px' }}>
          <Icone nom="scan-barcode" taille={18} />
          <span>{t('Scanner la référence de la boîte')}</span>
        </button>
      )}
      {/* La feuille se pose sur l'écran entier (#app), jamais coupée par la carte qui contient les cases. */}
      {scan.ouverte && createPortal(<Scan ouverte={scan.ouverte} fermer={scan.fermer} bon={bon} />, document.getElementById('app') ?? document.body)}
    </>
  )
}

function Scan({ ouverte, fermer, bon }: { ouverte: boolean; fermer: () => void; bon: BonPreparation }) {
  const { t, tf } = usePreferences()
  const [saisie, setSaisie] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)
  const [camera, setCamera] = useState<'arret' | 'marche' | 'indisponible'>('arret')
  const video = useRef<HTMLVideoElement>(null)
  const flux = useRef<MediaStream | null>(null)
  const attendue = bon.lignes[0].reference

  const verifier = async (lu: string) => {
    const v = lu.trim()
    if (!v) {
      setMessage({ ok: false, texte: t('Tapez la référence imprimée sur la boîte.') })
      return
    }
    const r = await source.preparation.verifierReference(bon.ref, v)
    if (r.ok) {
      jouer('code')
      setMessage({ ok: true, texte: tf('Bonne référence : {ref}. La case est cochée.', { ref: attendue }) })
      arreter()
      setTimeout(fermer, 900)
    } else {
      jouer('erreur')
      setMessage({ ok: false, texte: tf('Ce n’est pas la bonne référence. Attendue : {ref}.', { ref: r.detail ?? attendue }) })
    }
  }

  const arreter = () => {
    flux.current?.getTracks().forEach((x) => x.stop())
    flux.current = null
    setCamera((c) => (c === 'marche' ? 'arret' : c))
  }

  const demarrer = async () => {
    if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) return setCamera('indisponible')
    try {
      flux.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (video.current) {
        video.current.srcObject = flux.current
        await video.current.play()
      }
      setCamera('marche')
      const d = new window.BarcodeDetector({ formats: ['code_128', 'ean_13', 'qr_code', 'code_39'] })
      const lire = async () => {
        if (!flux.current || !video.current) return
        const codes = await d.detect(video.current).catch(() => [])
        if (codes[0]) return void verifier(codes[0].rawValue)
        requestAnimationFrame(() => void lire())
      }
      void lire()
    } catch {
      setCamera('indisponible')
    }
  }

  useEffect(() => {
    if (!ouverte) {
      arreter()
      setMessage(null)
      setSaisie('')
    }
    return arreter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouverte])

  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Scanner la référence de la boîte')}>
      <h3 style={{ margin: '0' }}>{t('Scanner la référence de la boîte')}</h3>
      <p className="t13 c3 mt4" style={{ lineHeight: '1.45' }}>{t('Visez le code-barres de la boîte, ou tapez la référence imprimée dessous.')}</p>
      {camera === 'marche' ? (
        <video ref={video} muted playsInline style={{ width: '100%', borderRadius: '14px', marginTop: '10px', background: '#000', aspectRatio: '4 / 3', objectFit: 'cover' }} />
      ) : (
        <>
          <video ref={video} muted playsInline style={{ display: 'none' }} />
          <button type="button" className="btn secondary mt12" onClick={() => void demarrer()} disabled={camera === 'indisponible'} aria-disabled={camera === 'indisponible' || undefined}>
            <Icone nom={camera === 'indisponible' ? 'camera-off' : 'camera'} taille={18} />
            <span>{camera === 'indisponible' ? t('Caméra indisponible : tapez la référence') : t('Ouvrir la caméra')}</span>
          </button>
        </>
      )}
      <form
        className="fld"
        onSubmit={(e) => {
          e.preventDefault()
          void verifier(saisie)
        }}
      >
        <label htmlFor="vd05-ref">{t('Référence sur la boîte')}</label>
        <div className={'inp' + (message ? (message.ok ? ' ok' : ' err') : '')}>
          <Icone nom="scan-line" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
          <input
            id="vd05-ref"
            value={saisie}
            onChange={(e) => (setSaisie(e.target.value), setMessage(null))}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder={attendue.replace(/[A-Z0-9]/g, (c, i) => (i < 3 ? c : '·'))}
            style={{ flex: '1', minWidth: '0', border: '0', outline: 'none', background: 'transparent', color: 'inherit', font: 'inherit', textTransform: 'uppercase' }}
          />
        </div>
        {message && (
          <div className={'t13 mt6 ' + (message.ok ? 'cg' : 'cr')} role="status">
            {message.texte}
          </div>
        )}
        <button type="submit" className="btn primary mt12">
          <Icone nom="check" taille={18} />
          <span>{t('Vérifier la référence')}</span>
        </button>
      </form>
    </Feuille>
  )
}
