// Pièces communes aux écrans PR-10 (Mon relais) : interrupteur du prototype (p-tm3tpi / p-bgyo12) en vrai
// « switch », états de lecture (chargement, erreur), annonce d'un résultat, raison d'un refus en mots, geste du gérant
// (origine, file hors connexion, signal), code SMS au téléphone du gérant.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import type { Resultat } from '../../donnees/communs'
import type { TypeAction } from '../../donnees/domaines/horsligne'
import type { RefusRelais, TexteRegle } from '../../donnees/domaines/relais'
import type { RefusReglage } from '../../donnees/domaines/notifications'
import { geste, origine, useEnLigne } from '../../donnees/fileHorsLigne'
import type { SourceRelais } from '../../donnees/source'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import './pr10.css'

/** Interrupteur du prototype : rôle « switch », nom, état ; verrouillé (aria-disabled) avec sa raison écrite. */
export function Interrupteur(p: { on: boolean; label: string; changer?: (v: boolean) => void; raison?: string }) {
  const verrou = !p.changer
  return (
    <button
      type="button"
      role="switch"
      aria-checked={p.on}
      aria-label={p.label}
      aria-disabled={verrou || undefined}
      title={verrou ? p.raison : undefined}
      data-raison={verrou ? p.raison : undefined}
      className={(p.on ? 'p-tm3tpi' : 'p-bgyo12') + ' p10-tg' + (verrou ? ' p10-verrou' : '')}
      onClick={() => p.changer?.(!p.on)}
    >
      <span className={p.on ? 'p-u2ffel' : 'p-p91l1v'} />
    </button>
  )
}

/** Lecture en cours : un squelette annoncé (jamais un écran vide). */
export function Chargement() {
  const { t } = usePreferences()
  return (
    <div className="p-0hxmj8 r-pile p10-charge r-charge" role="status" aria-live="polite">
      <span className="p10-sr">{t('Chargement…')}</span>
      <div className="p10-os p10-os-titre" aria-hidden="true" />
      <div className="p10-os" aria-hidden="true" />
      <div className="p10-os" aria-hidden="true" />
    </div>
  )
}

/** Lecture impossible (réseau, serveur) : dit pourquoi et propose de relire. */
export function ErreurLecture({ relire }: { relire: () => void }) {
  const { t } = usePreferences()
  const en = useEnLigne()
  return (
    <div className="p-0hxmj8">
      <div className="r-vide" role="alert">
        <div className="r-vide-i r-rouge">
          <Icone nom={en ? 'r-alerte' : 'r-reseau'} taille={28} />
        </div>
        <h2>{t(en ? 'Impossible de lire ces informations' : 'Pas de réseau')}</h2>
        <p>{t(en ? 'Le serveur n’a pas répondu. Vos données ne sont pas perdues : réessayez dans un instant.' : 'Ces informations s’afficheront au retour du réseau. Le comptoir continue de fonctionner.')}</p>
      </div>
      <button type="button" className="r-btn r-second" onClick={relire}>
        <Icone nom="refresh-cw" taille={18} />
        <span>{t('Réessayer')}</span>
      </button>
    </div>
  )
}

/** Résultat d'un geste annoncé aux lecteurs d'écran (succès en vert, refus en orange). */
export function Annonce({ message }: { message: { ton: 'ok' | 'ko' | 'file'; texte: string } | null }) {
  if (!message) return <div role="status" aria-live="polite" className="p10-sr" />
  return (
    <div role={message.ton === 'ko' ? 'alert' : 'status'} aria-live="polite" className={'p10-annonce p10-' + message.ton}>
      <Icone nom={message.ton === 'ok' ? 'circle-check' : message.ton === 'file' ? 'r-reseau' : 'circle-alert'} taille={18} />
      <span>{message.texte}</span>
    </div>
  )
}

/** Raison d'un refus du serveur, en mots. */
export function useRaison() {
  const { t } = usePreferences()
  return useCallback(
    (r: RefusRelais | string): string =>
      t(
        ({
          droit_refuse: 'Ce geste est réservé au gérant.',
          equipe_complete: 'Votre équipe est complète.',
          code_faux: 'Code SMS faux ou expiré : demandez-en un nouveau.',
          introuvable: 'Introuvable : la liste a changé, elle vient d’être relue.',
          invalide: 'Vérifiez ce que vous avez saisi.',
          deja_demandee: 'Une demande est déjà en cours : attendez la réponse de BelivaY ou annulez-la.',
          sous_occupees: 'Impossible de descendre sous les places occupées.',
          identique: 'Rien n’a changé.',
          pin_faux: 'PIN actuel faux.',
          pin_trop_simple: 'PIN trop simple : évitez les suites et les répétitions.',
          bloque: 'Trop d’essais : PIN bloqué quelques minutes.',
          aucune_demande: 'Aucune demande en cours.',
          non_demandee: 'Cette pièce n’est pas demandée : rien à renvoyer.',
          trop_tot: 'Trop tôt : le résumé ne part jamais avant l’heure permise.',
          trop_tard: 'Trop tard : le résumé arrive avant l’ouverture du relais.',
          heure_invalide: 'Heure invalide.',
          reserve_au_gerant: 'Réservé au gérant.',
          reseau: 'Pas de réseau : réessayez au retour du réseau.',
        } as Record<string, string>)[r] ?? 'Le serveur a refusé ce geste.',
      ),
    [t],
  )
}

export type Message = { ton: 'ok' | 'ko' | 'file'; texte: string } | null

/**
 * Geste du membre : origine (clé d'idempotence, heure), file hors connexion, signal. `succes` reçoit le résultat ;
 * l'annonce dit ce qui s'est passé. Un seul geste à la fois (`enCours`).
 */
export function useGesteRelais() {
  const { t } = usePreferences()
  const en = useEnLigne()
  const maintenant = useHorloge()
  const raison = useRaison()
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState<Message>(null)
  const faire = useCallback(
    async <T extends object>(type: TypeAction, objet: string, appel: (s: SourceRelais, o: ReturnType<typeof origine>) => Promise<Resultat<T, RefusRelais | RefusReglage>>, textes: { ok: string; file?: string }, apres?: (r: { ok: true } & T) => void): Promise<boolean> => {
      setEnCours(true)
      try {
        const o = origine(maintenant)
        const { etat, r } = await geste(en, type, objet, o, (s) => appel(s, o))
        if (etat === 'en_file') {
          setMessage({ ton: 'file', texte: t(textes.file ?? 'Hors connexion : envoyé au retour du réseau.') })
          signal('toucher')
          return true
        }
        if (!r.ok) {
          setMessage({ ton: 'ko', texte: raison(r.raison) })
          signal('erreur')
          return false
        }
        setMessage({ ton: 'ok', texte: t(textes.ok) })
        signal('succes')
        apres?.(r)
        return true
      } catch {
        setMessage({ ton: 'ko', texte: raison('reseau') })
        signal('erreur')
        return false
      } finally {
        setEnCours(false)
      }
    },
    [en, maintenant, raison, t],
  )
  return { faire, enCours, message, setMessage, enLigne: en, maintenant }
}

/** Texte du serveur avec ses valeurs (modèle traduit, valeurs insérées). */
export function useTexteRegle() {
  const { tf } = usePreferences()
  return (x: TexteRegle) => tf(x.texte, x.valeurs ?? {})
}

/**
 * Code SMS envoyé au téléphone PERSONNEL du gérant (second facteur, DRO-04, EQU-03, EQU-05). Six chiffres ; durée du
 * code écrite ; renvoyer.
 */
export function CodeSms(p: { expireA: number | null; valider: (code: string) => void; renvoyer: () => void; enCours: boolean; action: string; erreur: ReactNode }) {
  const { t, tf, langue } = usePreferences()
  const [code, setCode] = useState('')
  const champ = useRef<HTMLInputElement>(null)
  useEffect(() => champ.current?.focus(), [p.expireA])
  return (
    <form
      className="p10-col"
      onSubmit={(e) => {
        e.preventDefault()
        if (code.length === 6) p.valider(code)
      }}
    >
      <p className="p-81u2s6 p10-txt">{p.expireA ? tf('Code envoyé par SMS sur votre téléphone personnel, valable jusqu’à {h}.', { h: heure(p.expireA, langue) }) : t('Envoi du code…')}</p>
      <label className="p-ky12xr">
        {t('CODE REÇU PAR SMS')}
        <input
          ref={champ}
          className="p-afs6hh p10-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          aria-describedby="p10-code-aide"
        />
      </label>
      <span id="p10-code-aide" className="p-81u2s6">
        {t('6 chiffres, reçus sur le téléphone du gérant (jamais celui de l’employé).')}
      </span>
      {p.erreur}
      <button type="submit" className="p-ncx7qc" disabled={code.length !== 6 || p.enCours}>
        <Icone nom="check" taille={18} />
        {p.action}
      </button>
      <button type="button" className="p-rbzobc" onClick={p.renvoyer} disabled={p.enCours}>
        {t('Recevoir un nouveau code')}
      </button>
    </form>
  )
}
