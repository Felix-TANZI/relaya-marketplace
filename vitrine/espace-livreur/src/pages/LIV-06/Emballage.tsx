// LIV-P13 · Emballage, scellé et étiquette — devant le vendeur (qui peut aider à caler, jamais fermer ni étiqueter) :
// format conseillé selon la classe et la catégorie (cinq formats BelivaY, carton d'origine filmé pour un volumineux ;
// un autre format demande un motif), stock du kit décompté par le serveur à chaque étiquette liée (aucune saisie) ;
// étiquette pré-imprimée scannée ou saisie, liée DÉFINITIVEMENT à la commande (une étiquette déjà liée est refusée,
// une étiquette d'un autre rouleau aussi) ; zone manuscrite : code de zone et initiale du relais seulement, jamais un
// nom ; scellé en trois gestes ; photo 2 (colis fermé, scellé, étiquette lisible) avant le code. Emballage manquant :
// incident, le colis reste chez le vendeur, jamais d'emballage improvisé, le livreur ne paie rien.
// Structure : route « emballage » du prototype (livRam_prog et pastilles, colis, Emballer devant le vendeur, Format,
// Rappels, Étiquette et zone manuscrite, Scellé, Photo 2, kit, barre du bas).
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { FormatEmballage } from '../../donnees/domaines/ramassage'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { heure } from '../../i18n/temps'
import { useSession } from '../../session'
import type { Photo } from '../../composants/livraison/Camera'
import { AideEtape } from '../../composants/livraison/enrichi'
import { Chargement, Erreur, Message, useAgir } from '../../composants/livraison/outils'
import { BarreAction, Foot, Hint, Li, Lvp, Note, Sec } from '../../composants/proto'
import { Avancement, CaseVerif, FileArret, HorsLigneRamassage, PhotoPreuve, RienIciProto, Suite, Vignette, suite, useBrouillon, useRamassage } from './commun'

const FORMATS: { id: FormatEmballage; nom: string; type: string; taille: string }[] = [
  { id: 'S', nom: 'Pochette S', type: 'pochette', taille: '20 × 30' },
  { id: 'M', nom: 'Pochette M', type: 'pochette', taille: '25 × 35' },
  { id: 'L', nom: 'Pochette L', type: 'pochette', taille: '35 × 45' },
  { id: 'C1', nom: 'Carton C1', type: 'carton', taille: '30 × 20 × 15' },
  { id: 'C2', nom: 'Carton C2', type: 'carton', taille: '40 × 30 × 25' },
  { id: 'origine', nom: 'Carton d’origine', type: 'carton', taille: 'filmé' },
]
const SCELLE: [string, string][] = [
  ['Ruban sur toutes les ouvertures', 'Aucune ouverture sans ruban'],
  ['Signature au marqueur en travers de la fermeture', 'Elle chevauche le ruban et la pochette'],
  ['Étiquette collée à plat, lisible', 'Jamais sur une fermeture, code-barres entier'],
]

/** Lecture de l'étiquette par l'appareil photo (BarcodeDetector) ; sans lecteur, la saisie du numéro reste ouverte. */
function Scanner({ ouvert, fermer, lu }: { ouvert: boolean; fermer: () => void; lu: (texte: string) => void }) {
  const { t } = usePreferences()
  const video = useRef<HTMLVideoElement>(null)
  const [etat, setEtat] = useState<'ouverture' | 'video' | 'indisponible'>('ouverture')
  useEffect(() => {
    if (!ouvert) return
    let vivant = true
    let flux: MediaStream | null = null
    let minuteur = 0
    const Detecteur = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect(v: HTMLVideoElement): Promise<{ rawValue: string }[]> } }).BarcodeDetector
    if (!Detecteur || !navigator.mediaDevices?.getUserMedia) {
      setEtat('indisponible')
      return
    }
    const d = new Detecteur({ formats: ['code_128', 'code_39', 'qr_code', 'ean_13'] })
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(
      (s) => {
        if (!vivant) return s.getTracks().forEach((x) => x.stop())
        flux = s
        if (video.current) {
          video.current.srcObject = s
          void video.current.play().catch(() => undefined)
        }
        setEtat('video')
        const boucle = async () => {
          if (!vivant || !video.current) return
          try {
            const r = await d.detect(video.current)
            if (r[0]?.rawValue) return lu(r[0].rawValue)
          } catch {
            /* image suivante */
          }
          minuteur = window.setTimeout(boucle, 300)
        }
        void boucle()
      },
      () => vivant && setEtat('indisponible'),
    )
    return () => {
      vivant = false
      clearTimeout(minuteur)
      flux?.getTracks().forEach((x) => x.stop())
    }
  }, [ouvert, lu])
  if (!ouvert) return null
  return createPortal(
    <div className="lv-cam" role="dialog" aria-modal="true" aria-label={t('Scanner l’étiquette')}>
      <div className="lv-cam-haut">
        <button type="button" className="lv-cam-btn" aria-label={t('Fermer le scanner')} onClick={fermer}>
          <Icone nom="x" taille={26} />
        </button>
        <div className="lv-cam-consigne">{t('Scanner l’étiquette : code-barres dans le cadre')}</div>
        <span className="lv-cam-btn lv-cam-muet" aria-hidden="true">
          <Icone nom="scan-line" taille={24} />
        </span>
      </div>
      <div className="lv-cam-vue">
        <video ref={video} playsInline muted className={etat === 'video' ? '' : 'lv-cache'} />
        {etat === 'video' && <div className="lv-cam-cadre" style={{ inset: '34% 10%' }} aria-hidden="true" />}
        {etat === 'ouverture' && <p className="lv-cam-info">{t('Ouverture de l’appareil photo…')}</p>}
        {etat === 'indisponible' && (
          <div className="lv-cam-info">
            <Icone nom="scan-barcode" taille={36} />
            <p>{t('Lecture du code-barres indisponible sur ce téléphone. Saisissez le numéro imprimé sous le code-barres.')}</p>
            <button type="button" className="l-btn l-principal" onClick={fermer}>
              {t('Saisir le numéro à la main')}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

interface Brouillon {
  format: FormatEmballage | null
  motif: string
  scelle: boolean[]
  photo2: Photo | null
}

export default function Emballage() {
  const { t, tf, langue } = usePreferences()
  const session = useSession()
  const naviguer = useNavigate()
  const x = useRamassage(['controle'])
  const { agir, occupe, enLigne, maintenant } = useAgir()
  const { tournee, regles, arret, paquet, ramassage: r, colis: c } = x
  const [b, maj, oublier] = useBrouillon<Brouillon>('emballage_' + (c?.colisId ?? ''), { format: null, motif: '', scelle: [false, false, false], photo2: null })
  const [numero, setNumero] = useState('')
  const [scan, setScan] = useState(false)
  const [refusEtiquette, setRefusEtiquette] = useState<string | null>(null)
  const [manquant, setManquant] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const format = b.format ?? c?.formatConseille ?? null

  const lu = useCallback((v: string) => void lierRef.current(v), [])
  const lierRef = useRef<(v: string) => Promise<void>>(async () => undefined)
  const lier = async (texte: string) => {
    if (!c) return
    setScan(false)
    setRefusEtiquette(null)
    const res = await agir('etiquette', c.colisId, (o, s) => s.ramassage.lierEtiquette(c.colisId, texte, o))
    if (res?.r.ok) {
      signal('succes')
      setNumero('')
    } else {
      signal('erreur')
      const raison = res && !res.r.ok ? res.r.raison : null
      setRefusEtiquette(
        raison === 'deja_liee'
          ? t('Étiquette déjà liée à une autre commande : elle est refusée. Prenez l’étiquette suivante du rouleau.')
          : raison === 'hors_plage'
            ? t('Étiquette d’un autre rouleau : vous ne pouvez lier que les étiquettes de votre rouleau.')
            : tf('Numéro illisible : il s’écrit « {p} » suivi de 4 chiffres.', { p: (r?.plageEtiquettes.prefixe ?? '').trim() }),
      )
    }
  }
  lierRef.current = lier
  const valider = async () => {
    if (!c || !format || !b.photo2) return
    setErreur(null)
    const res = await agir('emballage', c.colisId, (o, s) => s.ramassage.emballer(c.colisId, { format, motifFormat: format === c.formatConseille ? null : b.motif.trim(), scelle: b.scelle, photo2: b.photo2!.id }, o))
    if (res?.r.ok) {
      oublier()
      signal('succes')
      const nouveau = await source.ramassage.ramassage(arret!.id)
      const s = nouveau ? suite(nouveau) : { route: 'tournee' }
      naviguer(chemin(s.route, s.route === 'tournee' ? undefined : { a: arret!.id, c: s.c }), { replace: true })
    } else {
      signal('erreur')
      setErreur(t('Il manque une preuve : étiquette liée, scellé complet, photo 2, et le motif si le format n’est pas celui conseillé.'))
    }
  }
  const declarerManquant = async () => {
    if (!c) return
    const res = await agir('incident', c.colisId, (o, s) => s.ramassage.emballageManquant(c.colisId, o))
    setManquant(false)
    if (res?.r.ok) {
      oublier()
      signal('alerte')
      naviguer(chemin('arrivee', { a: arret!.id }), { replace: true })
    }
  }

  const contenu = (): { corps: ReactNode; barre?: ReactNode } => {
    if (x.lecture.erreur || x.lectureR.erreur) return { corps: <Erreur relire={() => (x.lecture.relire(), x.lectureR.relire())} /> }
    if (!x.charge || !regles) return { corps: <Chargement /> }
    if (!tournee || !arret || !r) return { corps: <RienIciProto titre="Aucun emballage en cours" texte="L’emballage se fait chez le vendeur de l’arrêt en cours, après le contrôle." icone="package" /> }
    if (!c || c.etat !== 'controle')
      return {
        corps: (
          <>
            <Avancement tournee={tournee} arret={arret} paquet={paquet} r={r} regles={regles} maintenant={maintenant} etape={Math.max(1, arret.etape)} courant={null} pastilles />
            <div className="card">
              <div className="empty">
                <div className="ei">
                  <Icone nom="package-check" taille={26} />
                </div>
                <h3>{t('Rien à emballer maintenant')}</h3>
                <p>{t('Un colis s’emballe après son contrôle (et son audit s’il est demandé).')}</p>
              </div>
            </div>
          </>
        ),
        barre: (
          <BarreAction>
            <Suite r={r} />
          </BarreAction>
        ),
      }
    const conseil = FORMATS.find((f) => f.id === c.formatConseille)
    const stockConseil = c.formatConseille === 'origine' ? null : (r.stock[c.formatConseille] ?? 0)
    const autre = format !== null && format !== c.formatConseille
    const scelleOk = b.scelle.every(Boolean)
    const pret = !!format && !!c.etiquette && scelleOk && !!b.photo2 && (!autre || b.motif.trim().length > 0)
    const etape = !c.etiquette ? 1 : !scelleOk ? 2 : !b.photo2 ? 3 : 4
    const stockFormat = format && format !== 'origine' ? (r.stock[format] ?? 0) : null
    const aide = pret
      ? undefined
      : autre && !b.motif.trim()
        ? t('Un autre format demande un motif.')
        : !c.etiquette
          ? t('Liez l’étiquette : scannez-la ou saisissez son numéro.')
          : !scelleOk
            ? t('Scellez le colis : les trois gestes, devant le vendeur.')
            : t('Prenez la photo 2 : colis fermé, scellé, étiquette lisible.')
    const SOUS_ETAPES: [string, string][] = [
      ['Format', 'Pochette ou carton BelivaY'],
      ['Étiquette', c.etiquette ? tf('Liée : {n}', { n: c.etiquette }) : t('Scan ou saisie de l’étiquette pré-imprimée')],
      ['Scellé', 'Ruban sur toutes les ouvertures, signature en travers'],
      ['Photo 2', 'Colis fermé, scellé, étiquette lisible'],
    ]
    return {
      corps: (
        <>
          {!enLigne && <HorsLigneRamassage quoi="L’étiquette est liée sur le téléphone, puis confirmée par le serveur : une étiquette ne se lie jamais deux fois." />}
          <Avancement tournee={tournee} arret={arret} paquet={paquet} r={r} regles={regles} maintenant={maintenant} etape={2} courant={c.colisId} pastilles />
          <AideEtape etape="emballage" />
          <div className="card tight">
            <Li gauche={<Vignette a={c.article} />} t={tf('Colis {i} sur {n} · {nom}', { i: x.rang, n: r.colis.length, nom: c.article.nom })} s={tf('Contrôlé, photo 1 prise · classe {classe}', { classe: c.classe }) + (c.fragile ? ' · ' + t('Fragile') : '')} />
          </div>

          <Sec titre={t('Emballer devant le vendeur')} />
          <div className="card tight">
            {SOUS_ETAPES.map(([titre, sous], i) => (
              <div key={titre} className={'lr-ss ' + (i < etape ? 'done' : i === etape ? 'cur' : '')} aria-current={i === etape ? 'step' : undefined}>
                <span className="n">{i < etape ? <Icone nom="check" taille={15} trait={3} /> : i + 1}</span>
                <span className="grow">
                  <span className="t" style={{ display: 'block' }}>
                    {t(titre)}
                  </span>
                  <span className="s" style={{ display: 'block' }}>
                    {t(sous)}
                  </span>
                </span>
              </div>
            ))}
          </div>

          {!c.etiquette && (
            <>
          <Sec titre={t('Format')} />
          <div className="card">
            {conseil && <div className="t13 c3">{tf('Classe {classe} · {format} {taille} conseillé', { classe: c.classe, format: t(conseil.nom), taille: t(conseil.taille) }) + (c.fragile ? ' · ' + t('fragile') : '')}</div>}
            <div className="lr-fmt" role="radiogroup" aria-label={t('Format d’emballage')}>
              {FORMATS.filter((f) => f.id !== 'origine' || c.classe === 'XL' || c.classe === 'XXL').map((f) => {
                const stock = f.id === 'origine' ? null : (r.stock[f.id] ?? 0)
                const on = format === f.id
                const ko = on && stock === 0
                return (
                  <button key={f.id} type="button" role="radio" aria-checked={on} className={'f' + (ko ? ' ko' : on ? ' on' : stock === 0 ? ' dim' : '')} disabled={stock === 0 || !!c.etiquette} onClick={() => maj((v) => ({ ...v, format: f.id }))}>
                    {f.id === c.formatConseille && <i>{t('Conseillé')}</i>}
                    <b>{f.id === 'origine' ? t('Origine') : f.id}</b>
                    <small>
                      {t(f.type)}
                      <br />
                      {t(f.taille)}
                    </small>
                    <em>{stock === null ? t('filmé') : stock === 0 ? t('au dépôt') : tf('{n} en stock', { n: stock })}</em>
                  </button>
                )
              })}
            </div>
            {autre && (
              <div className="fld">
                <label htmlFor="lr-motif-format">{t('Pourquoi un autre format ? (obligatoire)')}</label>
                <input id="lr-motif-format" className="inp" style={{ width: '100%', font: 'inherit' }} value={b.motif} maxLength={120} onChange={(e) => maj((v) => ({ ...v, motif: e.target.value }))} />
              </div>
            )}
            <Hint icone="info">{t('Un autre format demande un motif ; un format épuisé reste au dépôt. Le stock baisse à chaque étiquette liée.')}</Hint>
            <div className="btns">
              <button type="button" className="btn danger" onClick={() => setManquant(true)} disabled={!!c.etiquette}>
                <Icone nom="package-x" taille={18} />
                <span>{t('Déclarer « emballage manquant »')}</span>
              </button>
            </div>
          </div>
          {stockConseil === 0 && !c.etiquette && conseil && (
            <div className="card" style={{ boxShadow: 'var(--shadow-card),inset 3px 0 0 var(--red)' }}>
              <div className="kick" style={{ color: 'var(--red)' }}>
                {t('Format adapté manquant')}
              </div>
              <div className="b8 t17 mt4">{tf('Pas de {format} dans votre kit', { format: t(conseil.nom) })}</div>
              <div className="t13 c3 mt4">{t('N’emballez jamais dans un emballage improvisé, un sac plastique ou le carton de marque du vendeur.')}</div>
            </div>
          )}

            </>
          )}
          {!c.etiquette && (
            <>
              <Sec titre={t('Rappels')} />
              <div className="card tight">
                <Li icone="layers" ton="acc" t={t('Calage')} s={t('L’article ne bouge pas dans la pochette.')} />
                <Li icone="shield-check" ton="or" t={t('Papier bulle')} s={t(c.fragile ? 'Obligatoire ici : article fragile.' : 'Pour le fragile seulement. Sans objet pour ce colis.')} />
                <Li icone="droplets" ton="ink" t={t('Liquide')} s={t('Fermé et isolé dans un sachet.')} />
              </div>
              <Note ton="ink" icone="hand">
                {t('Le vendeur peut vous aider à caler. Il ne ferme jamais le colis et ne l’étiquette jamais.')}
              </Note>
            </>
          )}

          <Sec titre={t('Étiquette')} />
          {c.etiquette ? (
            <>
              <div className="lr-lab ok">
                <span className="tk">
                  <b>{c.etiquette}</b>
                  <i />
                  <small>{c.zoneManuscrite}</small>
                </span>
                <span className="grow">
                  <span className="t" style={{ display: 'block' }}>
                    {enLigne ? tf('Liée à la commande · {nom}', { nom: c.article.nom }) : t('Liée sur le téléphone')}
                  </span>
                  <span className="s" style={{ display: 'block' }}>
                    {enLigne ? tf('Liée à {colis}, définitivement. Talon détaché : gardez-le avec vous jusqu’au dépôt.', { colis: c.colisId }) : t('L’unicité du numéro est contrôlée à la synchronisation : un numéro déjà lié ailleurs sera refusé.')}
                  </span>
                </span>
              </div>
              <div className="card">
                <div className="row">
                  <div className="grow">
                    <div className="kick">{t('Zone manuscrite de l’étiquette')}</div>
                    <div className="b8 mt4" style={{ fontSize: '1.625rem', letterSpacing: '.02em' }}>
                      {c.zoneManuscrite}
                    </div>
                  </div>
                  <span className="li" style={{ border: 0, padding: 0, minHeight: 0 }}>
                    <span className="ic acc">
                      <Icone nom="pen-line" taille={20} />
                    </span>
                  </span>
                </div>
                <div className="t13 c3 mt8">{t('Code de zone et initiale du relais. Jamais le nom, l’adresse ni le numéro du client ; jamais le nom du vendeur.')}</div>
              </div>
            </>
          ) : (
            <div className="card">
              {refusEtiquette && (
                <div className="lr-lab ko" style={{ marginTop: 0, marginBottom: 12 }}>
                  <span className="grow">
                    <span className="t" style={{ display: 'block' }}>
                      {t('Étiquette refusée')}
                    </span>
                    <span className="s" style={{ display: 'block' }} role="alert">
                      {refusEtiquette}
                    </span>
                  </span>
                </div>
              )}
              <div className="t13 c3">{tf('Étiquettes de votre rouleau : {p}{de} à {p}{a}.', { p: r.plageEtiquettes.prefixe, de: r.plageEtiquettes.de, a: r.plageEtiquettes.a })}</div>
              <div className="btns">
                <button type="button" className="btn secondary" disabled={occupe} onClick={() => setScan(true)}>
                  <Icone nom="scan-line" taille={18} />
                  <span>{t('Scanner l’étiquette')}</span>
                </button>
              </div>
              <div className="fld">
                <label htmlFor="lr-etiquette">{t('Ou saisissez le numéro à la main')}</label>
                <input id="lr-etiquette" className="inp" style={{ width: '100%', font: 'inherit' }} value={numero} inputMode="numeric" placeholder={r.plageEtiquettes.prefixe + r.plageEtiquettes.de} onChange={(e) => setNumero(e.target.value)} />
              </div>
              <div className="btns">
                <button type="button" className="btn acc-soft" disabled={occupe || numero.replace(/\D/g, '').length < 4} onClick={() => void lier(numero)}>
                  <Icone nom="tag" taille={18} />
                  <span>{t('Lier l’étiquette')}</span>
                </button>
              </div>
              <Hint icone="scissors">{t('Étiquette déchirée ? Prenez-en une nouvelle ; l’ancienne est déclarée annulée dans le kit.')}</Hint>
            </div>
          )}

          <Sec titre={t('Scellé')} />
          <div className="card tight">
            {SCELLE.map(([titre, sous], i) => (
              <CaseVerif key={titre} etat={b.scelle[i] ? 'on' : ''} titre={t(titre)} sous={t(sous)} desactive={!c.etiquette} basculer={() => (signal('toucher'), maj((v) => ({ ...v, scelle: v.scelle.map((y, j) => (j === i ? !y : y)) })))} />
            ))}
          </div>
          <Hint icone="hand">{t('Fermé par vous, devant le vendeur : jamais hors de sa vue, jamais par lui.')}</Hint>

          <Sec titre={t('Photo 2 · colis scellé')} />
          <PhotoPreuve
            titre={b.photo2 ? 'Photo 2 prise · étiquette lisible' : 'Prendre la photo 2'}
            sous="Colis fermé, scellé, étiquette lisible dans le cadre."
            consigne="Photo 2 · colis fermé, scellé, étiquette lisible"
            nature="photo2"
            objet={c.colisId}
            id={b.photo2?.id ?? null}
            heure={b.photo2?.heure}
            enFile={b.photo2?.enFile}
            verrou={!c.etiquette ? 'Après l’étiquette et le scellé.' : !scelleOk ? 'Après les trois gestes du scellé.' : null}
            prise={(p) => maj((v) => ({ ...v, photo2: p }))}
            carte
            extra={
              <div className="lr-proofs">
                <span className="lr-pf ok">
                  <Icone nom="focus" taille={14} />
                  {t('Nette')}
                </span>
                {c.etiquette && (
                  <span className="lr-pf ok">
                    <Icone nom="tag" taille={14} />
                    {c.etiquette}
                  </span>
                )}
              </div>
            }
          />
          <Note ton="acc" icone="package-open">
            {format && stockFormat !== null && stockFormat > 0
              ? tf('Kit : {format} {a} → {b} à la liaison de l’étiquette.', { format: t(FORMATS.find((f) => f.id === format)!.nom), a: stockFormat, b: stockFormat - 1 }) + ' '
              : ''}
            {tf('Kit du jour : {s} S · {m} M · {l} L · {c1} C1 · {c2} C2, décompté à chaque étiquette liée.', { s: r.stock.S ?? 0, m: r.stock.M ?? 0, l: r.stock.L ?? 0, c1: r.stock.C1 ?? 0, c2: r.stock.C2 ?? 0 })}
          </Note>
          {erreur && (
            <div className="mt12">
              <Message ton="erreur">{erreur}</Message>
            </div>
          )}
          <FileArret r={r} />
          {!enLigne && <Foot icone="wifi-off">{tf('Hors connexion · tournée téléchargée à {h}', { h: heure(tournee.telechargeeA, langue) })}</Foot>}
        </>
      ),
      barre: (
        <BarreAction aide={aide}>
          <button type="button" className="btn primary xl" disabled={!pret || occupe} onClick={() => void valider()}>
            <Icone nom="package-check" taille={18} />
            <span>{t('Valider l’emballage')}</span>
          </button>
        </BarreAction>
      ),
    }
  }

  const k = contenu()
  const restants = r ? r.colis.filter((y) => y.etat !== 'refuse' && y.etat !== 'retire').length : 0
  return (
    <Ecran proto
      route="emballage"
      titre={c && r && c.etat === 'controle' ? tf('Emballage · colis {i} sur {n}', { i: x.rang, n: r.colis.length }) : undefined}
      fixes={
        <>
          <Scanner ouvert={scan} fermer={() => setScan(false)} lu={lu} />
          <Feuille ouverte={manquant} fermer={() => setManquant(false)} titre={t('Emballage manquant')}>
            <Lvp>
              <div className="lr-sheet-h">{t('Déclarer « emballage manquant »')}</div>
              <div className="t13 c3">{t('Ce qui va se passer :')}</div>
              <div className="mt8">
                <Li icone="package-x" ton="red" t={t('Ce colis n’est pas ramassé')} s={tf('Incident « emballage manquant » ; {vendeur} garde le colis, le ramassage est reporté.', { vendeur: r?.vendeur ?? '' })} />
                {paquet && <Li icone="route" ton="acc" t={t('La tournée est ajustée')} s={tf('Colis attendus : {a} → {b}, après validation de l’incident.', { a: paquet.colisTotal, b: Math.max(0, paquet.colisTotal - 1) })} />}
                <Li icone="wallet" ton="ink" t={t('Vous ne payez rien')} s={tf('L’écart d’emballage est traité entre BelivaY et {entreprise}.', { entreprise: session.livreur?.entreprise ?? '' })} />
              </div>
              <div className="btns lr-col" style={{ marginTop: 14 }}>
                <button type="button" className="btn red xl" disabled={occupe} onClick={() => void declarerManquant()}>
                  <Icone nom="triangle-alert" taille={18} />
                  <span>{t('Déclarer et laisser le colis')}</span>
                </button>
                <button type="button" className="btn secondary" onClick={() => setManquant(false)}>
                  <span>{t('Revenir à l’emballage')}</span>
                </button>
              </div>
              {restants > 1 && <Hint icone="info">{t('Les autres colis de l’arrêt se ramassent normalement.')}</Hint>}
            </Lvp>
          </Feuille>
        </>
      }
    >
      <Lvp>
        {k.corps}
        {k.barre}
      </Lvp>
    </Ecran>
  )
}
