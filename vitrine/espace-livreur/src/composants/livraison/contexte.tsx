// Contexte d'un écran d'arrêt : la tournée, les paramètres, l'arrêt visé (« ?a=A2 », sinon l'arrêt en cours s'il est
// du bon type) et son paquet ; carte d'avancement de l'arrêt ; démonstration (l'autre téléphone) ; bandeau d'un
// changement venu du serveur ; boutons d'incident et d'appel de même taille que la validation (LIV-UIX-03).
import { type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { env } from '@client/config/env'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { TypeArret } from '../../donnees/communs'
import type { Arret, PaquetTournee, ReglesLivreur, Tournee } from '../../donnees/domaines/tournee'
import { usePreferences } from '../../preferences'
import { Avancement, NATURES } from './Avancement'
import { useRegles, useTournee } from './outils'

export const TYPES_ARRET: Record<TypeArret, string> = { ramassage: 'ramassage', relais: 'dépôt au relais', collecte: 'départs du relais', domicile: 'remise à domicile', retour: 'retour au vendeur' }

/** Icône et teinte de l'arrêt (prototype : boutique orange, relais bleu, domicile vert). */
export const ICONE_ARRET: Record<TypeArret, [string, 'or' | 'blue' | 'acc' | 'violet']> = {
  ramassage: ['store', 'or'],
  relais: ['package-check', 'blue'],
  collecte: ['package-plus', 'blue'],
  domicile: ['house', 'acc'],
  retour: ['undo-2', 'violet'],
}
export function useArret(types: TypeArret[]) {
  const [params] = useSearchParams()
  const lecture = useTournee()
  const regles = useRegles()
  const tournee = lecture.tournee
  const id = params.get('a') ?? tournee?.enCours ?? null
  const trouve = tournee?.arrets.find((a) => a.id === id) ?? null
  const arret = trouve && types.includes(trouve.type) ? trouve : null
  const paquet = arret ? (tournee!.paquets.find((p) => p.id === arret.paquetId) ?? null) : null
  return { lecture, tournee, regles, arret, paquet }
}

/** Avancement d'un paquet : arrêts terminés (faits, en échec ou retirés) ÷ arrêts du paquet. */
export function partPaquet(t: Tournee, paquetId: string): number {
  const a = t.arrets.filter((x) => x.paquetId === paquetId)
  return a.length ? a.filter((x) => x.etat !== 'a_faire' && x.etat !== 'en_cours').length / a.length : 0
}

export function AvancementArret(p: { tournee: Tournee; arret: Arret; paquet: PaquetTournee | null; regles: ReglesLivreur; maintenant: number; etapes?: string[]; etape?: number; enfant?: ReactNode }) {
  const { t, tf } = usePreferences()
  const n = p.tournee.arrets.length
  return (
    <Avancement
      kicker={(p.paquet?.id ?? '') + (p.paquet ? ' · ' + t(NATURES[p.paquet.nature]) : '')}
      titre={tf('Arrêt {i} sur {n} · {type}', { i: p.arret.ordre, n, type: t(TYPES_ARRET[p.arret.type]) })}
      surVous={p.tournee.colisSousGarde}
      part={partPaquet(p.tournee, p.arret.paquetId)}
      limite={p.paquet?.heureLimite ?? null}
      maintenant={p.maintenant}
      regles={p.regles}
      etapes={p.etapes}
      etape={p.etape}
      enfant={p.enfant}
    />
  )
}

/** Démonstration seulement : ce que fait l'autre téléphone (vendeur, gérante, cliente, entreprise). */
export function AideDemo({ titre, children }: { titre: string; children: ReactNode }) {
  const { t } = usePreferences()
  if (env.source !== 'demo') return null
  return (
    <aside className="lv-demo" aria-label={t('Démonstration')}>
      <div className="lv-demo-t">
        <Icone nom="smartphone" taille={16} />
        {t('Démonstration')} · {t(titre)}
      </div>
      <div className="lv-demo-b">{children}</div>
    </aside>
  )
}

/** Changement venu du serveur (arrêt dissocié, colis retiré, dépôt ajouté) : annoncé, jamais silencieux. */
export function BandeauModification({ tournee }: { tournee: Tournee }) {
  const { t, tf } = usePreferences()
  if (!tournee.modification) return null
  return (
    <div className="lv-msg lv-info" role="status">
      <Icone nom="refresh-cw" taille={20} />
      <div>
        <b>{t('Tournée ajustée par le système')}</b>
        <br />
        {tf(tournee.modification.texte, tournee.modification.valeurs)}
      </div>
    </div>
  )
}

/** « Un problème ici ? » et appel masqué : aussi visibles que la validation. */
export function ActionsArret({ arretId, avec }: { arretId: string; avec?: 'vendeur' | 'relais' | 'client' }) {
  const { t } = usePreferences()
  return (
    <div className="lv-duo">
      <Link className="l-btn l-second" to={chemin('incident', { arret: arretId })}>
        <Icone nom="triangle-alert" taille={20} />
        {t('Un problème ici ?')}
      </Link>
      {avec && (
        <Link className="l-btn l-second" to={chemin('appel', { avec, a: arretId })}>
          <Icone nom="phone" taille={20} />
          {t('Appeler · numéro masqué')}
        </Link>
      )}
    </div>
  )
}

