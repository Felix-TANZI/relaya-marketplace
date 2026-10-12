// Pièces communes aux écrans du groupe VD-08 (Produits et nouveau produit) : bouton du prototype (C.btn), interrupteur, montants, photos réelles, aperçu client (même famille que la
// fiche produit du client, CL-06), écran réservé au propriétaire, états chargement / erreur / hors connexion, toast,
// dictée (Web Speech, français ou anglais, Q-44), délais en mots.
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { jouer } from '@client/composants/Sons'
import { Feuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { PhotoReelle, Produit } from '../../donnees/domaines/produits'
import { heure, jourCourt, type Langue } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'

/** « 17 840 F » (un seul nœud ; en anglais « 17,840 F »). */
export function useMontant() {
  const { t } = usePreferences()
  return useCallback((n: number) => t(`${F(n)} F`), [t])
}

/** Bouton du prototype (C.btn) : un lien quand il mène ailleurs, un bouton quand c'est un geste. */
export function Bouton(p: { classe: string; icone?: string; vers?: string; etat?: unknown; onClick?: (e: MouseEvent) => void; style?: CSSProperties; inactif?: boolean; type?: 'button' | 'submit'; children: ReactNode }) {
  const contenu = (
    <>
      {p.icone && <Icone nom={p.icone} taille={18} />}
      <span>{p.children}</span>
    </>
  )
  if (p.vers && !p.inactif)
    return (
      <Link to={p.vers} state={p.etat} style={p.style} className={'btn ' + p.classe} onClick={p.onClick}>
        {contenu}
      </Link>
    )
  return (
    <button type={p.type ?? 'button'} style={p.style} className={'btn ' + p.classe + (p.inactif ? ' off' : '')} aria-disabled={p.inactif || undefined} onClick={p.inactif ? undefined : p.onClick}>
      {contenu}
    </button>
  )
}

/** Interrupteur du prototype (.tg), vrai rôle switch. */
export function Interrupteur({ on, changer, libelle, verrouille }: { on: boolean; changer: (on: boolean) => void; libelle: string; verrouille?: boolean }) {
  return (
    <button
      type="button"
      className={'tg' + (on ? ' on' : '') + (verrouille ? ' lock' : '')}
      role="switch"
      aria-checked={on}
      aria-label={libelle}
      aria-disabled={verrouille || undefined}
      onClick={() => {
        if (verrouille) return
        jouer('interrupteur')
        changer(!on)
      }}
    ></button>
  )
}

/** Réseau du téléphone : hors connexion, les gestes partent en file (Q-93, REC-02). */
export function useEnLigne(): boolean {
  const [en, setEn] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const maj = () => setEn(navigator.onLine)
    window.addEventListener('online', maj)
    window.addEventListener('offline', maj)
    return () => {
      window.removeEventListener('online', maj)
      window.removeEventListener('offline', maj)
    }
  }, [])
  return en
}

/** Valeur stable après un temps sans frappe (PRX-08 : service de commission appelé 300 ms après la dernière frappe). */
export function useApresFrappe<T>(v: T, ms = 300): T {
  const [d, setD] = useState(v)
  useEffect(() => {
    const id = window.setTimeout(() => setD(v), ms)
    return () => window.clearTimeout(id)
  }, [v, ms])
  return d
}

/** Message bref en bas de l'écran (.vd-toast du prototype), avec une action (« Annuler »). */
export function useToast() {
  const [m, setM] = useState<{ texte: string; action?: { libelle: string; faire: () => void }; n: number } | null>(null)
  const minuteur = useRef<number | undefined>(undefined)
  const dire = useCallback((texte: string, action?: { libelle: string; faire: () => void }) => {
    window.clearTimeout(minuteur.current)
    setM((x) => ({ texte, action, n: (x?.n ?? 0) + 1 }))
    minuteur.current = window.setTimeout(() => setM(null), action ? 6000 : 3200)
  }, [])
  useEffect(() => () => window.clearTimeout(minuteur.current), [])
  const toast = m && (
    <div key={m.n} className="vd-toast" role="status" aria-live="polite" style={m.action ? { animation: 'none', whiteSpace: 'normal', maxWidth: 'calc(100% - 32px)' } : { whiteSpace: 'normal', maxWidth: 'calc(100% - 32px)' }}>
      <Icone nom="circle-check" taille={16} style={{ flexShrink: '0' }} />
      <span>{m.texte}</span>
      {m.action && (
        <button
          type="button"
          onClick={() => {
            m.action!.faire()
            setM(null)
          }}
          style={{ border: 0, background: 'transparent', color: 'var(--gold-l)', font: 'inherit', fontWeight: 800, padding: '0 0 0 6px', minHeight: '32px', cursor: 'pointer' }}
        >
          {m.action.libelle}
        </button>
      )}
    </div>
  )
  return { dire, toast }
}

/** Ce qui reste à remplir dans un brouillon, en mots : « Il manque : le prix, les photos » ou « Prêt à publier ». */
export function useManques() {
  const { t, tf } = usePreferences()
  const MOTS: Record<string, string> = { produit: 'le produit', photos: 'les photos', prix: 'le prix', stock: 'le stock', etat: 'l’état' }
  return useCallback((p: Pick<Produit, 'manques'>) => (p.manques.length ? tf('Il manque : {l}', { l: p.manques.map((m) => t(MOTS[m])).join(', ') }) : t('Prêt à publier')), [t, tf])
}

/** Délai de préparation en mots : « 4 h ouvrées », « 2 jours (sur commande) ». */
export function useDelai() {
  const { t, tf } = usePreferences()
  return useCallback((h: number) => (h > 24 ? tf('{n} jours (sur commande)', { n: Math.round(h / 24) }) : h === 24 ? t('24 h ouvrées') : tf('{n} h ouvrées', { n: h })), [t, tf])
}

/** « mar. 22 sept. à 16 h 10 » : jour court, date et heure (vérification, demande de fiche). */
export function dateHeure(ms: number, langue: Langue): string {
  const d = new Date(ms + 3600 * 1000)
  const mois = langue === 'en' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'] : ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
  const jours = langue === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
  const a = langue === 'en' ? 'at' : 'à'
  return `${jours[d.getUTCDay()]} ${d.getUTCDate()} ${mois[d.getUTCMonth()]} ${a} ${heure(ms, langue)}`
}
/** « 12 mai » : jour et mois. */
export function jourMois(ms: number, langue: Langue): string {
  const d = new Date(ms + 3600 * 1000)
  const mois = langue === 'en' ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] : ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  return langue === 'en' ? `${d.getUTCDate()} ${mois[d.getUTCMonth()]}` : `${d.getUTCDate()} ${mois[d.getUTCMonth()]}`
}
export { jourCourt }

/** Poids d'un fichier en mots : « 6,3 Mo », « 540 Ko ». */
export function poids(o: number, langue: Langue): string {
  const v = o >= 1024 * 1024 ? (o / 1024 / 1024).toFixed(1) + ' Mo' : Math.max(1, Math.round(o / 1024)) + ' Ko'
  return langue === 'en' ? v.replace(' Mo', ' MB').replace(' Ko', ' KB') : v.replace('.', ',')
}

/** Une photo réelle : la vraie image quand il y en a une, sinon l'illustration de démonstration (remplaçable). */
export function ImagePhoto({ p, style }: { p: Pick<PhotoReelle, 'image'>; style?: CSSProperties }) {
  if (/^(data:|https?:|\/|blob:)/.test(p.image)) return <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }} />
  return (
    <span style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', ...style }}>
      <Vignette nom={p.image} taille={72} />
    </span>
  )
}

/** Vignette d'un produit : sa première photo réelle, sinon la photo de référence de la fiche. */
export function VignetteProduit({ p, taille }: { p: Pick<Produit, 'photos' | 'dessin'>; taille: number }) {
  const ph = p.photos.find((x) => /^(data:|https?:|\/|blob:)/.test(x.image))
  return <Vignette nom={ph?.image ?? p.dessin} taille={taille} />
}

/** Accès Préparation sur un écran de prix ou de publication (REFVD-R247, VD11-CA-EQU-1) : réservé au propriétaire. */
export function Reserve({ route }: { route: string }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  return (
    <Ecran route={route}>
      <div className="card" style={{ marginTop: '18px' }}>
        <div className="empty">
          <div className="ei">
            <Icone nom="lock" taille={24} />
          </div>
          <h3>{t('Réservé au propriétaire')}</h3>
          <p>{s.proprietaire ? tf('Les prix et la publication des offres sont réservés à {nom}, propriétaire. Vous pouvez mettre à jour le stock et les photos.', { nom: `${s.proprietaire.prenom} ${s.proprietaire.nom}` }) : t('Les prix et la publication des offres sont réservés au propriétaire.')}</p>
        </div>
        <Bouton classe="secondary" icone="package" vers={chemin('produits')}>
          {t('Voir mes produits')}
        </Bouton>
      </div>
    </Ecran>
  )
}

/** Erreur de chargement : dit ce qui ne s'affiche pas, propose de réessayer (VD08-R03). */
export function Erreur({ route, texte, relire }: { route: string; texte: string; relire: () => void }) {
  const { t } = usePreferences()
  return (
    <Ecran route={route}>
      <div className="card" style={{ marginTop: '18px' }}>
        <div className="empty">
          <div className="ei" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>
            <Icone nom="cloud-off" taille={24} />
          </div>
          <h3>{t(texte)}</h3>
          <p>{t('Vérifiez votre connexion, puis réessayez. Rien de ce que vous avez saisi n’est perdu.')}</p>
        </div>
        <Bouton classe="secondary" icone="refresh-cw" onClick={relire}>
          {t('Réessayer')}
        </Bouton>
      </div>
    </Ecran>
  )
}

/** Chargement : la coque de l'écran et une carte d'attente sobre (rien d'inventé). */
export function Chargement({ route }: { route: string }) {
  const { t } = usePreferences()
  return (
    <Ecran route={route}>
      <div className="card" style={{ marginTop: '18px', minHeight: '96px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-busy="true">
        <span className="t13 c3">{t('Chargement…')}</span>
      </div>
    </Ecran>
  )
}

/** Bande « Hors connexion » : ce qui reste possible et ce qui part au retour du réseau. */
export function HorsConnexion({ texte }: { texte: string }) {
  const { t } = usePreferences()
  return (
    <div className="note amber" role="status" data-hors-ligne="">
      <Icone nom="wifi-off" taille={18} />
      <div>{t(texte)}</div>
    </div>
  )
}

/** Aperçu client : la fiche telle que le client la verra (même famille que CL-06 : galerie, badges, prix, stock,
 *  « Payer au comptoir »), sans rien du vendeur qui ne lui est pas montré (aucun nom de boutique, GEN-01). */
export function ApercuClient({ ouverte, fermer, p }: { ouverte: boolean; fermer: () => void; p: Pick<Produit, 'titre' | 'variante' | 'rayon' | 'dessin' | 'photos' | 'prix' | 'stock' | 'paiementAuRetrait' | 'etatArticle' | 'etat'> & Partial<Pick<Produit, 'prixBarre' | 'finPromo' | 'noteVendeur'>> }) {
  const { t, tf, langue } = usePreferences()
  const montant = useMontant()
  const [i, setI] = useState(0)
  const images: Pick<PhotoReelle, 'image'>[] = [{ image: p.dessin }, ...p.photos]
  const ph = images[Math.min(i, images.length - 1)]
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Ce que verra le client')}>
      <h2 className="pg-t" style={{ fontSize: '19px' }}>
        {t('Ce que verra le client')}
      </h2>
      <p className="pg-s">{t('La fiche BelivaY, avec votre prix, votre stock et vos photos réelles.')}</p>
      <div className="card" style={{ marginTop: '12px', padding: '10px' }}>
        <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '14px', overflow: 'hidden', background: 'var(--sand-2)' }}>
          <ImagePhoto p={ph} />
          <span className="pill green sm" style={{ position: 'absolute', left: '8px', top: '8px' }}>
            <Icone nom="badge-check" taille={13} />
            {t('Certifié BelivaY')}
          </span>
        </div>
        <div className="row" role="tablist" aria-label={t('Photos')} style={{ gap: '6px', marginTop: '8px', overflowX: 'auto' }}>
          {images.map((x, k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={k === i}
              aria-label={k === 0 ? t('Photo de référence') : tf('Photo réelle {n}', { n: k })}
              onClick={() => setI(k)}
              style={{ width: '44px', height: '44px', flexShrink: '0', borderRadius: '10px', overflow: 'hidden', padding: 0, border: k === i ? '2px solid var(--or)' : '1px solid var(--line-2)', background: 'var(--sand-2)', cursor: 'pointer' }}
            >
              <ImagePhoto p={x} />
            </button>
          ))}
        </div>
        <div className="meta" style={{ marginTop: '10px' }}>
          <span className="pill ink sm">{t('Escrow')}</span>
          <span className="pill ink sm">{t('Retour 7j')}</span>
          <span className="pill ink sm">{t(p.etatArticle)}</span>
        </div>
        <div className="an" style={{ fontSize: '18px', marginTop: '8px' }}>{`${p.titre}${p.variante ? ' · ' + t(p.variante) : ''}`}</div>
        <div className="av">{t(p.rayon)}</div>
        {p.prix !== null && (
          <div className="row mt8" style={{ gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span className="b8" style={{ fontSize: '24px', letterSpacing: '-.02em' }}>
              {montant(p.prix)}
            </span>
            {p.prixBarre != null && p.prixBarre > p.prix && (
              <>
                <s className="t14 c3">{montant(p.prixBarre)}</s>
                <span className="pill red sm">{`−${Math.floor((100 * (p.prixBarre - p.prix)) / p.prixBarre)} %`}</span>
              </>
            )}
          </div>
        )}
        {p.prixBarre != null && p.finPromo != null && <div className="t12 cr b7 mt4">{tf('Promotion jusqu’au {d}', { d: jourMois(p.finPromo, langue) })}</div>}
        <div className="t13 c2 mt4">{p.stock > 0 ? tf('En stock · {n} disponibles', { n: p.stock }) : t('En rupture : le client peut demander une alerte de retour')}</div>
        {p.paiementAuRetrait && (
          <div className="row t13 c2 mt8" style={{ gap: '8px' }}>
            <Icone nom="hand-coins" taille={16} style={{ color: 'var(--green)', flexShrink: '0' }} />
            <span>{t('Payer au comptoir : possible pour ce produit')}</span>
          </div>
        )}
        {p.noteVendeur && (
          <div className="row t13 c2 mt8" style={{ gap: '8px', alignItems: 'flex-start' }}>
            <Icone nom="message-square-text" taille={16} style={{ color: 'var(--or-txt)', flexShrink: '0', marginTop: '2px' }} />
            <span>{`« ${p.noteVendeur} »`}</span>
          </div>
        )}
        <div className="row t13 c2 mt8" style={{ gap: '8px' }}>
          <Icone nom="shield-check" taille={16} style={{ color: 'var(--green)', flexShrink: '0' }} />
          <span>{t('Vendeur certifié : votre nom et votre boutique ne sont jamais montrés.')}</span>
        </div>
      </div>
      {p.etat !== 'en_vente' && <p className="scrim-note">{t('Pas encore visible des clients : la fiche paraîtra ainsi une fois l’offre vérifiée.')}</p>}
      <div className="mt14">
        <Bouton classe="secondary" onClick={fermer}>
          {t('Fermer')}
        </Bouton>
      </div>
    </Feuille>
  )
}

type Reco = { start(): void; stop(): void; lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void; onerror: () => void; onend: () => void }

/** Dictée du nom du produit (VD08-R09) : reconnaissance vocale du téléphone, en français ou en anglais (Q-44). */
export function useDictee(dicter: (texte: string) => void) {
  const { t, langue } = usePreferences()
  const [voix, setVoix] = useState<'non' | 'ecoute' | 'indispo'>('non')
  const [dit, setDit] = useState('')
  const reco = useRef<Reco | null>(null)
  const ecouter = () => {
    setDit('')
    const W = window as unknown as { SpeechRecognition?: new () => Reco; webkitSpeechRecognition?: new () => Reco }
    const C = W.SpeechRecognition ?? W.webkitSpeechRecognition
    if (!C) return setVoix('indispo')
    const r = new C()
    r.lang = langue === 'en' ? 'en-GB' : 'fr-FR'
    r.interimResults = true
    r.onresult = (e) => {
      const x = Array.from(e.results)
        .map((a) => a[0].transcript)
        .join(' ')
      setDit(x)
      if (e.results[e.results.length - 1].isFinal) {
        setVoix('non')
        dicter(x)
      }
    }
    r.onerror = () => setVoix('indispo')
    r.onend = () => setVoix((v) => (v === 'ecoute' ? 'non' : v))
    reco.current = r
    setVoix('ecoute')
    try {
      r.start()
    } catch {
      setVoix('indispo')
    }
  }
  const annuler = () => {
    reco.current?.stop()
    reco.current = null
    setVoix('non')
  }
  const feuille = (
    <Feuille ouverte={voix !== 'non'} fermer={annuler} titre={t('Dicter le nom du produit')}>
      <div className="center" style={{ padding: '6px 4px 0' }}>
        <div style={{ width: '88px', height: '88px', margin: '12px auto 0', borderRadius: '50%', background: 'linear-gradient(180deg,var(--braise-1),var(--braise-2))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icone nom="mic" taille={38} trait={2} />
        </div>
        {voix === 'ecoute' ? (
          <>
            <h3 className="t15 b8" style={{ margin: '14px 0 0' }}>
              {t('Je vous écoute…')}
            </h3>
            {dit && (
              <button type="button" className="btn soft auto" style={{ margin: '12px auto 0' }} onClick={() => (annuler(), dicter(dit))}>
                <span>{`« ${dit} »`}</span>
              </button>
            )}
            <p className="t13 c3">{t('Dites le nom du produit, en français ou en anglais. La recherche part dès que vous avez fini.')}</p>
          </>
        ) : (
          <p className="t13 c2" style={{ marginTop: '14px' }}>
            {t('La dictée n’est pas disponible sur ce téléphone : tapez le nom du produit.')}
          </p>
        )}
        <div className="btns" style={{ marginTop: '16px' }}>
          <Bouton classe="secondary" onClick={annuler}>
            {t(voix === 'ecoute' ? 'Annuler' : 'Fermer')}
          </Bouton>
        </div>
      </div>
    </Feuille>
  )
  return { ecouter, feuille }
}

/** Stock rapide (feuille) : − / + / saisie, raccourcis +5 +10 +20 ; accès Préparation compris (VD11-CA-EQU-1). */
export function FeuilleStock({ p, fermer, enregistrer }: { p: Produit | null; fermer: () => void; enregistrer: (p: Produit, n: number) => Promise<boolean> }) {
  const { t, tf } = usePreferences()
  const enLigne = useEnLigne()
  const [v, setV] = useState('')
  const [err, setErr] = useState(false)
  const [pour, setPour] = useState<string | null>(null)
  if (p && pour !== p.id) {
    setPour(p.id)
    setV(String(p.stock))
    setErr(false)
  }
  const n = Number(v)
  const valide = /^\d{1,5}$/.test(v)
  const pas = (d: number) => {
    const x = Math.max(0, (valide ? n : p?.stock ?? 0) + d)
    setV(String(x))
    setErr(false)
  }
  return (
    <Feuille ouverte={!!p} fermer={fermer} titre={t('Stock rapide')}>
      {p && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!valide) return setErr(true)
            void enregistrer(p, n).then((ok) => !ok && setErr(true))
          }}
        >
          <h2 className="pg-t" style={{ fontSize: '19px' }}>
            {t('Stock rapide')}
          </h2>
          <p className="pg-s">{p.variante ? `${p.titre} · ${t(p.variante)}` : p.titre}</p>
          <div className="row" style={{ gap: '10px', marginTop: '16px', justifyContent: 'center' }}>
            <button type="button" className="ibtn" aria-label={t('Un de moins')} onClick={() => pas(-1)} style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'var(--sand-2)' }}>
              <Icone nom="minus" taille={22} />
            </button>
            <div className={'inp' + (err ? ' err' : '')} style={{ width: '120px', height: '52px' }}>
              <input size={1} inputMode="numeric" pattern="[0-9]*" aria-label={t('Stock')} value={v} onChange={(e) => (setV(e.target.value.replace(/\D/g, '').slice(0, 5)), setErr(false))} style={{ textAlign: 'center', fontSize: '22px', fontWeight: 800 }} />
            </div>
            <button type="button" className="ibtn" aria-label={t('Un de plus')} onClick={() => pas(1)} style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'var(--sand-2)' }}>
              <Icone nom="plus" taille={22} />
            </button>
          </div>
          {err ? <div className="hint center cr">{t('Indiquez un stock entre 0 et 99 999.')}</div> : <div className="hint center">{tf('On vous prévient quand le stock descend à {n}.', { n: p.seuilAlerte })}</div>}
          <div className="split3 mt12">
            {[5, 10, 20].map((x) => (
              <button key={x} type="button" className="chip" style={{ justifyContent: 'center' }} onClick={() => pas(x)}>
                {`+${x}`}
              </button>
            ))}
          </div>
          {!enLigne && <HorsConnexion texte="Hors connexion : le stock part au retour du réseau, avec l’heure de la saisie." />}
          <div className="mt14">
            <Bouton classe={'primary' + (valide ? '' : ' off')} icone="check" type="submit" inactif={!valide}>
              {t('Enregistrer le stock')}
            </Bouton>
          </div>
        </form>
      )}
    </Feuille>
  )
}

