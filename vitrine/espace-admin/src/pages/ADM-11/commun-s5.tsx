// Briques communes aux écrans du groupe S5 (Paramétrage, Promotions, Messagerie, Panne, Support, Interrupteurs,
// Modèles) : états de lecture (chargement, erreur, partie réservée), onglets du prototype par « ?s= », étapes
// (C.stepper), cases (C.check), chiffres du héros (admP_mini), dates de Yaoundé. Les décisions passent par la feuille commune
// DecisionMotivee (src/composants : `envoyer` appelle la source du domaine, qui valide, journalise et ouvre le quatre-yeux).
import { useId, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { Banniere, Choix, Note, Pill, type Ton } from '../../composants/prototype'
import { NOM_ROLE } from '../../config/libelles'
import type { Role } from '../../donnees/communs'
import type { Canal, Espaces } from '../../donnees/domaines/communication'
import { usePreferences } from '../../preferences'
import { REGLES_S5 } from './regles-s5'
import './s5.css'

/** Squelette de chargement (aucun écran noir entre les pages). */
export function Chargement({ n = 3 }: { n?: number }) {
  const { t } = usePreferences()
  return (
    <div className="s5-charge" role="status" aria-label={t('Chargement…')}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="s5-sq" />
      ))}
    </div>
  )
}

/** Erreur de lecture : partie réservée à d'autres rôles (403), ou bandeau « Réessayer » (les données gardées restent). */
export function ErreurLecture({ erreur, relire, quoi }: { erreur: Error | null; relire: () => void; quoi?: string }) {
  const { t, tf } = usePreferences()
  if (!erreur) return null
  const roles = (erreur as Error & { roles?: Role[] }).roles
  if (erreur.name === 'AccesRefuse' && roles)
    return (
      <Note ton="ink" icone="lock" className="mt12">
        {tf('{quoi} : réservé à {r}.', { quoi: t(quoi ?? 'Cette partie'), r: roles.map((r) => t(NOM_ROLE[r])).join(', ') })}
      </Note>
    )
  return (
    <Banniere
      ton="red"
      icone="cloud-off"
      role="alert"
      bouton={
        <button type="button" className="btn primary sm" onClick={relire}>
          <Icone nom="rotate-cw" taille={16} />
          {t('Réessayer')}
        </button>
      }
    >
      <b>{t('Impossible de charger les données.')}</b> {t('Vérifiez la connexion puis réessayez ; rien n’est perdu.')}
    </Banniere>
  )
}

/** Onglets du prototype (admP_tabs) : un lien par état « ?s= », l'adresse garde l'onglet. */
export function Onglets<T extends string>({ items, actif, aria }: { items: { id: T; t: string; s: string; n?: number | null; icone: string }[]; actif: T; aria: string }) {
  const { t } = usePreferences()
  const { pathname } = useLocation()
  return <Choix forme="tabs" aria={t(aria)} actif={actif} className="mt16" items={items.map((i) => ({ id: i.id, t: t(i.t), n: i.n, icone: i.icone, to: pathname + (i.s ? '?s=' + i.s : '') }))} />
}

/** C.stepper : étapes d'un parcours (faites, en cours, à venir). */
export function Etapes({ etapes, cur }: { etapes: string[]; cur: number }) {
  const { t } = usePreferences()
  return (
    <ol className="stepper" aria-label={t('Étapes')}>
      {etapes.map((l, i) => (
        <li key={l} className={'st' + (i < cur ? ' done' : i === cur ? ' cur' : '')} aria-current={i === cur ? 'step' : undefined}>
          <b>{i < cur ? <Icone nom="check" taille={14} /> : i + 1}</b>
          <span>{t(l)}</span>
        </li>
      ))}
    </ol>
  )
}

/** C.check : une case faite, à faire ou en échec, avec son texte. */
export function Coche({ ok, mauvais, children }: { ok: boolean; mauvais?: boolean; children: ReactNode }) {
  return (
    <div className="check">
      <span className={'cbx' + (ok ? ' on' : '') + (mauvais && !ok ? ' bad' : '')} aria-hidden="true">
        {ok ? <Icone nom="check" taille={14} /> : mauvais ? <Icone nom="x" taille={14} /> : null}
      </span>
      <span className="grow">{children}</span>
    </div>
  )
}

/** admP_mini : chiffre du héros (libellé, valeur, complément). */
export function Mini({ l, v, s }: { l: ReactNode; v: ReactNode; s?: ReactNode }) {
  return (
    <div className="m4">
      <div className="l">{l}</div>
      <div className="v">{v}</div>
      {s && <div className="s">{s}</div>}
    </div>
  )
}

/** C.fourEyes : l'encadré « quatre yeux ». */
export function QuatreYeux({ children }: { children: ReactNode }) {
  return (
    <div className="fourEyes">
      <Icone nom="users" taille={18} />
      <span>{children}</span>
    </div>
  )
}

const fmt = (o: Intl.DateTimeFormatOptions, langue: string) => new Intl.DateTimeFormat(langue === 'en' ? 'en-GB' : 'fr-FR', { timeZone: 'Africa/Douala', ...o })
/** Dates de Yaoundé : heure (« 14 h 05 »), jour (« mardi 13 octobre »), jour court (« 13 oct. »), complet. */
export function useDates() {
  const { langue } = usePreferences()
  const heure = (t: number) => {
    const p = Object.fromEntries(fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, 'en').formatToParts(new Date(t)).map((x) => [x.type, x.value]))
    return langue === 'en' ? `${p.hour}:${p.minute}` : `${Number(p.hour)} h ${p.minute}`
  }
  const jour = (t: number) => fmt({ weekday: 'long', day: 'numeric', month: 'long' }, langue).format(new Date(t))
  const court = (t: number) => fmt({ day: 'numeric', month: 'short' }, langue).format(new Date(t))
  const annee = (t: number) => fmt({ day: 'numeric', month: 'long', year: 'numeric' }, langue).format(new Date(t))
  return { heure, jour, court, annee, complet: (t: number) => `${jour(t)} · ${heure(t)}` }
}

/** Durée en mots courts : « 31 min », « 2 h 05 », « 3 j ». */
export function useDuree() {
  const { tf } = usePreferences()
  return (ms: number) => {
    const m = Math.round(ms / 60000)
    if (m < 60) return tf('{m} min', { m })
    if (m < 48 * 60) return tf('{h} h {m}', { h: Math.floor(m / 60), m: String(m % 60).padStart(2, '0') })
    return tf('{j} j', { j: Math.round(m / 1440) })
  }
}

/** Champ « Motif » avec son compteur (motif_min_caracteres). */
export function ChampMotif({ valeur, changer, libelle, aide, lignes = 3 }: { valeur: string; changer: (v: string) => void; libelle?: string; aide?: string; lignes?: number }) {
  const { t, tf } = usePreferences()
  const id = useId()
  const min = REGLES_S5.motifMin
  return (
    <label className="fld fld-l" htmlFor={id}>
      <span className="fld-t">{t(libelle ?? 'Motif écrit (obligatoire, journalisé)')}</span>
      <span className="inp">
        <textarea id={id} rows={lignes} value={valeur} onChange={(e) => changer(e.target.value)} aria-describedby={id + '-n'} />
      </span>
      <span className="aide" id={id + '-n'}>
        {tf('{n} caractères sur {min} au moins', { n: valeur.trim().length, min })}
        {aide ? ` · ${t(aide)}` : ''}
      </span>
    </label>
  )
}

/** Raisons de refus de la source, en mots (communes aux écrans du groupe). */
export const RAISONS: Record<string, string> = {
  motif_court: 'Le motif est trop court.',
  contenu: 'Le texte contient un numéro de téléphone ou un code : jamais dans un message (CONTENU_INTERDIT).',
  numero: 'Le texte contient un numéro de téléphone : jamais dans un message.',
  code: 'Le texte contient un code : jamais dans un message.',
  variable_inconnue: 'Une variable du texte n’existe pas.',
  code_hors_modele: 'La variable {code} n’existe que dans le modèle du code de retrait.',
  sms_promo: 'Aucune promotion par SMS, jamais.',
  heures_promo: 'Une promotion part entre 9 h et 20 h seulement.',
  passe: 'L’heure d’envoi est déjà passée.',
  vide: 'Complétez les champs obligatoires.',
  objet: 'Donnez un objet à la diffusion.',
  inchange: 'Le texte n’a pas changé : aucune nouvelle version.',
  etat: 'Ce n’est plus possible dans l’état actuel.',
  zones: 'Choisissez au moins une zone.',
  perimetre: 'Hors de vos zones : réservé à la Direction.',
  registre: 'Le registre papier n’est pas entièrement ressaisi (REGISTRE_NON_RESSAISI).',
  rapport: 'Le rapport de clôture n’est pas écrit.',
  non_retabli: 'Le service n’est pas encore rétabli.',
  service: 'Indiquez le service touché.',
  geste_depasse: 'Le geste dépasserait la commission perçue sur cette commande.',
  deja_geste: 'Un geste a déjà été accordé pour cette demande.',
  non_rattache: 'Rattachez d’abord la demande à une commande, un dossier ou un motif.',
  inconnu: 'Introuvable.',
  deja_delivre: 'Ce message est déjà délivré.',
  quota: 'Le client a déjà demandé tous ses renvois du jour.',
  module_bloque: 'Un paramètre de la fonction est « à trancher » : elle ne peut pas s’ouvrir (MODULE_BLOQUE).',
  deja_demande: 'Une demande attend déjà son second validateur.',
  sans_effet: 'L’interrupteur est déjà dans cet état.',
  controle: 'Un contrôle est en échec : la vente ne peut pas être programmée.',
  ferme: 'Les ventes flash sont fermées (FF-FLASH).',
  non_simulee: 'Simulez d’abord la vente.',
  texte: 'Valeur écrite en mots : elle change par décision écrite, pas ici.',
  pas: 'Valeur hors du pas imposé, ou identique à la valeur en vigueur.',
  deja_ouverte: 'Une proposition est déjà ouverte sur ce paramètre (409).',
  critique_reserve: 'Paramètre critique : proposé par la Direction ou la Finance.',
  bloquee: 'La simulation bloque la validation.',
  deja_soumise: 'Cette proposition est déjà soumise ou close.',
  pas_demandeur: 'Seul le demandeur peut faire ce geste.',
}

// ── Canaux et espaces (messagerie, modèles, panne) ──────────────────────────────────────────────────────────────────
export const CANAL: Record<Canal, [string, string, Ton]> = { push: ['bell', 'Push', 'acc'], sms: ['message-square', 'SMS', 'or'], email: ['mail', 'Courriel', 'blue'], app: ['smartphone', 'Dans l’application', 'acc'], portail: ['monitor', 'Portail', 'ink'] }
export function PillCanal({ c }: { c: Canal }) {
  const { t } = usePreferences()
  return (
    <Pill ton={CANAL[c][2]} sm icone={CANAL[c][0]}>
      {t(CANAL[c][1])}
    </Pill>
  )
}
export const ESPACES: { id: Espaces; t: string; icone: string }[] = [
  { id: 'client', t: 'Clients', icone: 'users' },
  { id: 'vendeur', t: 'Vendeurs', icone: 'store' },
  { id: 'relais', t: 'Points relais', icone: 'package-check' },
  { id: 'entreprise', t: 'Entreprises', icone: 'truck' },
  { id: 'livreur', t: 'Livreurs', icone: 'bike' },
]

