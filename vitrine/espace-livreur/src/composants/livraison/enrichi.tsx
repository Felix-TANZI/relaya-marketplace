// Enrichissements partagés des écrans de la tournée (LIV-05 à LIV-08, ENRICHISSEMENTS.md partie 3), posés DANS les blocs
// du prototype, sans en changer la structure :
// - Rebours (M17) : compte à rebours en direct, une seconde de moins chaque seconde, ambre puis rouge ;
// - useDiffere + AvisAnnuler (M16) : un geste réversible part après ANNULER_S secondes ; « Annuler » le retire, rien
//   n'est envoyé. Quitter l'écran ou la page l'envoie aussitôt (le geste n'est jamais perdu) ;
// - AideEtape (M14) : aide en une ligne par étape, dépliée sur place, puis vers l'Aide ;
// - Recherche (M5) : champ de recherche d'une liste, effaçable, Échap le vide ;
// - Visionneuse (M18) : la photo de preuve en grand, avec son heure ; une preuve n'est jamais retouchée ni recadrée
//   (elle porte son heure, sa position et son empreinte) : on la reprend, on ne la modifie pas ;
// - exporterPdf (M6) : un PDF d'une page sans bibliothèque (site/src/donnees/pdf.ts), partagé ou enregistré.
import './enrichi.css'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { partagerFichier, pdfTexte, type LignePdf } from '@client/donnees/pdf'
import { Icone } from '../Icone'
import { signal } from '../signaux'
import { chemin } from '../../config/pages'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'

// ---------- Comptes à rebours (M17) ----------

/** « 1:02:05 » au-delà d'une heure, sinon « 02:05 ». */
export function rebours(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Compte à rebours en direct (libellé et `fini` déjà traduits) (l'horloge de l'écran avance chaque seconde) : ambre sous `ambreMs`, rouge sous
 * `rougeMs` ; à zéro, `fini` remplace les chiffres. Le texte dit toujours ce qui est compté (jamais la couleur seule). */
export function Rebours({ fin, maintenant, libelle, fini, ambreMs, rougeMs, icone = 'timer' }: { fin: number; maintenant: number; libelle: ReactNode; fini?: string; ambreMs?: number; rougeMs?: number; icone?: string }) {
  const { t } = usePreferences()
  const reste = fin - maintenant
  const ton = reste <= 0 ? ' r' : rougeMs !== undefined && reste <= rougeMs ? ' r' : ambreMs !== undefined && reste <= ambreMs ? ' a' : ''
  return (
    <span className={'liva-cd lv-reste lve-rebours' + ton} role="timer" aria-live="off">
      <Icone nom={icone} taille={13} />
      {libelle} {reste > 0 ? <b className="lve-chiffres">{rebours(reste)}</b> : <b>{fini ?? t('terminé')}</b>}
      {ton && reste > 0 && <span className="lv-sr">{t(ton === ' r' ? 'urgent' : 'bientôt')}</span>}
    </span>
  )
}

// ---------- Gestes réversibles : « Annuler » pendant quelques secondes (M16) ----------

export const ANNULER_S = 5

export interface Differe {
  attente: { texte: string; fin: number } | null
  lancer: (texte: string, faire: () => unknown) => void
  annuler: () => void
  envoyerTout: () => void
}

/** Un geste réversible attend ANNULER_S secondes avant de partir. Démonté (on quitte l'écran) ou page cachée : il part
 * aussitôt. Un seul geste en attente à la fois : en lancer un autre envoie le précédent. */
export function useDiffere(ms = ANNULER_S * 1000): Differe {
  const [attente, setAttente] = useState<Differe['attente']>(null)
  const ref = useRef<{ faire: () => unknown; minuteur: number } | null>(null)
  const envoyerTout = useCallback(() => {
    const r = ref.current
    if (!r) return
    window.clearTimeout(r.minuteur)
    ref.current = null
    setAttente(null)
    void r.faire()
  }, [])
  const lancer = useCallback(
    (texte: string, faire: () => unknown) => {
      envoyerTout()
      ref.current = { faire, minuteur: window.setTimeout(envoyerTout, ms) }
      setAttente({ texte, fin: Date.now() + ms })
    },
    [envoyerTout, ms],
  )
  const annuler = useCallback(() => {
    const r = ref.current
    if (!r) return
    window.clearTimeout(r.minuteur)
    ref.current = null
    setAttente(null)
    signal('toucher')
  }, [])
  useEffect(() => {
    window.addEventListener('pagehide', envoyerTout)
    return () => {
      window.removeEventListener('pagehide', envoyerTout)
      envoyerTout()
    }
  }, [envoyerTout])
  return { attente, lancer, annuler, envoyerTout }
}

/** Avis « Annuler » d'un geste en attente : posé dans la barre d'action du bas (zone du pouce), au-dessus du bouton. */
export function AvisAnnuler({ d }: { d: Differe }) {
  const { t, tf } = usePreferences()
  const [, battre] = useState(0)
  useEffect(() => {
    if (!d.attente) return
    const id = window.setInterval(() => battre((x) => x + 1), 250)
    return () => window.clearInterval(id)
  }, [d.attente])
  if (!d.attente) return null
  const s = Math.max(1, Math.ceil((d.attente.fin - Date.now()) / 1000))
  return (
    <div className="lve-annuler" role="status">
      <span className="lve-annuler-n" aria-hidden="true">
        {s}
      </span>
      <span className="grow">
        <b>{t(d.attente.texte)}</b>
        <span>{tf('Envoi dans {n} s : vous pouvez encore annuler.', { n: s })}</span>
      </span>
      <button type="button" className="btn secondary sm" onClick={d.annuler}>
        <Icone nom="undo-2" taille={16} />
        <span>{t('Annuler')}</span>
      </button>
    </div>
  )
}

// ---------- Aide contextuelle par étape (M14) ----------

const AIDES = {
  arrivee: {
    q: 'Que faire à l’arrivée ?',
    points: ['Montrez votre écran : le vendeur a reçu votre photo et votre prénom.', 'Vendeur pas prêt : attendez le délai affiché, puis déclarez-le sans pénalité.', 'Boutique fermée : photo de la devanture et une note, rien d’autre.'],
  },
  controle: {
    q: 'Que contrôler ?',
    points: ['L’article correspond à sa fiche : nom, quantité, couleur, taille.', 'Boîte d’origine scellée, aucun dommage visible ; au moindre doute, refusez avec un motif.', 'Photo 1 : le produit à découvert, net et entier dans le cadre.'],
  },
  audit: {
    q: 'Pourquoi cet audit ?',
    points: ['Le système tire des colis au hasard : ce n’est jamais un soupçon.', 'Ouvrez devant le vendeur, vérifiez les quatre points, photographiez.', 'La durée maximale est affichée : la tournée est déjà recalculée.'],
  },
  emballage: {
    q: 'Comment bien emballer ?',
    points: ['Prenez le format conseillé ; un autre format demande un motif.', 'Posez le scellé, puis liez l’étiquette en la scannant.', 'Photo 2 : le colis scellé, étiquette lisible.'],
  },
  code: {
    q: 'Comment se passe le code ?',
    points: ['Le vendeur tape lui-même son code sur votre téléphone, ou vous le dicte.', 'Vous ne le demandez jamais à l’avance ni par message.', 'Au dernier code faux, le code est bloqué et un incident s’ouvre : vous ne partez pas avec les colis.'],
  },
  refus: {
    q: 'Quand refuser un colis ?',
    points: ['Article non conforme, abîmé, interdit, ou classe dépassée.', 'Motif, photo et note sont exigés : le vendeur les reçoit.', 'Après l’envoi, vous avez quelques secondes pour annuler.'],
  },
  depot: {
    q: 'Comment déposer au relais ?',
    points: ['La gérante scanne le QR de dépôt, puis chaque colis.', 'Colis refusé par la gérante : acceptez le constat en miroir.', 'Lot confirmé : vous n’en avez plus la garde. Gardez le reçu.'],
  },
  domicile: {
    q: 'Comment remettre à domicile ?',
    points: ['La cliente tape son code de livraison sur votre téléphone.', 'Photo de remise : le colis remis, jamais l’intérieur de la maison.', 'Une autre personne reçoit : notez son prénom.'],
  },
  echec: {
    q: 'Personne ne répond : que faire ?',
    points: ['Attendez sur place le temps exigé, et appelez en numéro masqué, à intervalles.', 'Photo de la porte seulement, jamais l’intérieur.', 'Le colis va au relais de la zone : jamais chez un voisin ni chez vous.'],
  },
  collecte: {
    q: 'Comment collecter les départs ?',
    points: ['La gérante vous tend chaque colis : confirmez-le, ou signalez-le manquant.', 'Cherchez un colis par le code de son étiquette.', 'Photographiez le scellé quand il est demandé.'],
  },
  retour: {
    q: 'Comment rendre un retour ?',
    points: ['Le vendeur tape son code de réception sur votre téléphone.', 'La photo de remise est exigée.', 'Retour impossible : une photo et la raison ; vous rapportez les colis.'],
  },
} satisfies Record<string, { q: string; points: string[] }>

/** « Que contrôler ? » : aide de l'étape, dépliée sur place (bouton de 44 px), puis « Toute l'aide ». */
export function AideEtape({ etape }: { etape: keyof typeof AIDES }) {
  const { t } = usePreferences()
  const [ouverte, setOuverte] = useState(false)
  const id = useId()
  const a = AIDES[etape]
  return (
    <div className={'lve-aide' + (ouverte ? ' on' : '')}>
      <button type="button" className="lve-aide-q" aria-expanded={ouverte} aria-controls={ouverte ? id : undefined} onClick={() => setOuverte(!ouverte)}>
        <Icone nom="circle-help" taille={18} />
        <span className="grow">{t(a.q)}</span>
        <Icone nom={ouverte ? 'x' : 'chevron-right'} taille={16} />
      </button>
      {ouverte && (
        <div id={id} className="lve-aide-r">
          <ul>
            {a.points.map((p) => (
              <li key={p}>{t(p)}</li>
            ))}
          </ul>
          <Link to={chemin('aide')} className="a">
            <Icone nom="book-open" taille={15} />
            {t('Toute l’aide et le SOS')}
          </Link>
        </div>
      )}
    </div>
  )
}

// ---------- Recherche dans une liste (M5) ----------

export const normer = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

export function Recherche({ valeur, changer, libelle, exemple }: { valeur: string; changer: (v: string) => void; libelle: string; exemple?: string }) {
  const { t } = usePreferences()
  return (
    <label className="inp lve-cherche">
      <Icone nom="search" taille={18} />
      <input type="search" value={valeur} onChange={(e) => changer(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && changer('')} placeholder={exemple ? t(exemple) : undefined} aria-label={t(libelle)} enterKeyHint="search" autoComplete="off" />
      {valeur && (
        <button type="button" className="lve-efface" onClick={() => changer('')} aria-label={t('Effacer la recherche')}>
          <Icone nom="x" taille={16} />
        </button>
      )}
    </label>
  )
}

// ---------- Photo de preuve en grand (M18) ----------

export function Visionneuse({ url, titre, quand, fermer }: { url: string; titre: string; quand?: number | null; fermer: () => void }) {
  const { t, langue } = usePreferences()
  const bouton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    bouton.current?.focus()
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && fermer()
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
  }, [fermer])
  return createPortal(
    <div className="lve-vue" role="dialog" aria-modal="true" aria-label={t(titre)} onClick={fermer}>
      <img src={url} alt={t(titre)} />
      <div className="lve-vue-b" onClick={(e) => e.stopPropagation()}>
        <span className="grow">
          <b>{t(titre)}</b>
          <span>
            {quand ? heure(quand, langue) + ' · ' : ''}
            {t('Une preuve ne se retouche pas : reprenez-la si elle ne convient pas.')}
          </span>
        </span>
        <button ref={bouton} type="button" className="btn secondary sm" onClick={fermer}>
          <Icone nom="x" taille={16} />
          <span>{t('Fermer')}</span>
        </button>
      </div>
    </div>,
    document.body,
  )
}

/** Vignette de preuve qu'on touche pour la voir en grand. */
export function VignettePreuve({ url, titre, quand, children }: { url: string | null; titre: string; quand?: number | null; children: ReactNode }) {
  const { t } = usePreferences()
  const [grand, setGrand] = useState(false)
  if (!url) return <>{children}</>
  return (
    <>
      <button type="button" className="lve-vignette" onClick={() => setGrand(true)} aria-label={t('Voir en grand') + ' · ' + t(titre)}>
        {children}
      </button>
      {grand && <Visionneuse url={url} titre={titre} quand={quand} fermer={() => setGrand(false)} />}
    </>
  )
}

// ---------- PDF (M6) ----------

/** Fabrique un PDF d'une page et le propose au partage (téléphone) ou l'enregistre. */
export async function exporterPdf(lignes: LignePdf[], nom: string, titre: string): Promise<'partage' | 'enregistre'> {
  const issue = await partagerFichier(pdfTexte(lignes), nom, titre)
  signal('succes')
  return issue
}
