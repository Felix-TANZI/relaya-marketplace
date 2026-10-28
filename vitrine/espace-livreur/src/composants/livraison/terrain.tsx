// Gestes du terrain (une main sur le guidon, plein soleil, réseau qui coupe) communs aux écrans de la tournée :
// - Enchainement : après la validation d'un arrêt, bandeau « Arrêt suivant » ENCHAINEMENT_S secondes avec « Annuler »,
//   puis l'écran passe tout seul à l'arrêt suivant (fin de tournée : le résumé). « Annuler » garde l'écran de l'arrêt
//   validé (un mauvais toucher n'emporte pas le livreur ailleurs) ; la validation elle-même, signée (code, photo,
//   heure, position), ne s'annule pas ;
// - BoutonProbleme : UN bouton « Un problème ? » qui ouvre une feuille d'options SELON L'ÉTAPE (en route, ramassage,
//   livraison) ; chaque option : 1 à 2 touchers, sa suite expliquée en une ligne ;
// - ContactArret : « Appeler » masqué en un toucher et messages prêts (jamais de discussion libre, jamais un numéro).
// Cibles de 48 px au moins, un seul bouton principal par écran (en bas), textes courts.
import './terrain.css'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { Icone } from '../Icone'
import { signal } from '../signaux'
import { chemin } from '../../config/pages'
import type { Arret, Correspondant, Tournee } from '../../donnees/domaines/tournee'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useAgir, useTournee } from './outils'

/** Durée du bandeau « Arrêt suivant » (geste d'écran, pas une règle métier). */
export const ENCHAINEMENT_S = 3

/** Nom d'un arrêt tel que la liste l'affiche (domicile : quartier seulement tant que la remise n'est pas en cours). */
export function nomCourt(a: Arret, t: (k: string) => string): string {
  return a.type === 'domicile' ? t('Remise à domicile') + ' · ' + a.quartier : a.nom
}

/**
 * Bandeau « Arrêt suivant » (zone du pouce, au-dessus du bouton principal) : compte ENCHAINEMENT_S secondes puis ouvre
 * `vers` (par défaut la tournée, qui montre l'arrêt suivant ou le résumé de fin). Rien pendant un incident bloquant.
 */
export function Enchainement({ actif = true, vers }: { actif?: boolean; vers?: string }) {
  const { t, tf } = usePreferences()
  const aller = useNavigate()
  const { tournee } = useTournee()
  const [reste, setReste] = useState(ENCHAINEMENT_S)
  const [annule, setAnnule] = useState(false)
  const pret = actif && !annule && !!tournee && tournee.etat !== 'bloquee'
  // Minuteur compté en secondes écoulées (jamais l'heure du téléphone, qui peut être figée ou fausse).
  useEffect(() => {
    if (!pret) return
    const id = window.setInterval(() => setReste((r) => r - 1), 1000)
    return () => window.clearInterval(id)
  }, [pret])
  useEffect(() => {
    if (pret && reste <= 0) aller(vers ?? chemin('tournee'))
  }, [pret, reste, vers, aller])
  if (!pret || !tournee) return null
  const suivant = tournee.arrets.find((a) => a.id === tournee.enCours) ?? null
  const fin = tournee.etat === 'terminee' || !suivant
  return (
    <div className="lvt-suivant" role="status" data-fin={fin ? '1' : undefined}>
      <span className="lvt-n" aria-hidden="true">
        {Math.max(1, reste)}
      </span>
      <span className="lvt-grow">
        <b>{fin ? t('Tournée terminée') : tf('Arrêt suivant · {i}/{n}', { i: suivant!.ordre, n: tournee.arrets.length })}</b>
        <span>{fin ? t('Le résumé s’ouvre.') : nomCourt(suivant!, t)}</span>
      </span>
      <button type="button" className="btn secondary lvt-annuler" onClick={() => (setAnnule(true), signal('toucher'))}>
        <Icone nom="undo-2" taille={18} />
        <span>{t('Annuler')}</span>
      </button>
      <i className="lvt-barre" aria-hidden="true" style={{ animationDuration: ENCHAINEMENT_S + 's' }} />
    </div>
  )
}

// ---------- « Un problème ? » ----------

export type EtapeTerrain = 'route' | 'ramassage' | 'livraison'

/** Étape de l'arrêt : en route tant que « Je suis arrivé » n'est pas fait ; sur place, ramassage ou livraison. */
export function etapeDe(a: Arret): EtapeTerrain {
  if (a.phase !== 'sur_place') return 'route'
  return a.type === 'ramassage' || a.type === 'collecte' ? 'ramassage' : 'livraison'
}

interface Option {
  id: string
  titre: string
  suite: string // la suite, en une ligne
  icone: string
  ton: 'red' | 'or' | 'amber' | 'acc' | 'blue'
  vers?: string
  sous?: 'retard'
}

function options(a: Arret, e: EtapeTerrain): Option[] {
  const id = a.id
  if (e === 'route')
    return [
      { id: 'panne', titre: 'Panne ou crevaison', suite: 'Votre entreprise est prévenue ; un collègue peut reprendre vos colis.', icone: 'bike', ton: 'red', vers: chemin('incident', { famille: 'route', type: 'panne', arret: id }) },
      { id: 'pluie', titre: 'Pluie forte · retard prévu', suite: 'Choisissez le retard : la nouvelle heure part tout de suite.', icone: 'timer', ton: 'blue', sous: 'retard' },
      a.type === 'domicile'
        ? { id: 'introuvable', titre: 'Adresse introuvable', suite: 'Appel masqué, photo du lieu : le colis va au relais de la zone.', icone: 'search', ton: 'or', vers: chemin('echec-domicile', { a: id, motif: 'introuvable' }) }
        : { id: 'introuvable', titre: 'Adresse introuvable', suite: 'Votre entreprise est prévenue et vous guide ; la tournée attend.', icone: 'search', ton: 'or', vers: chemin('incident', { famille: 'vendeur', type: 'adresse_introuvable', arret: id }) },
      { id: 'route_coupee', titre: 'Route coupée', suite: 'Les livreurs de la zone sont prévenus ; un autre trajet est calculé.', icone: 'construction', ton: 'amber', vers: chemin('navigation', { a: id, signaler: '1' }) },
    ]
  if (e === 'ramassage') {
    if (a.type === 'collecte')
      return [
        { id: 'relais_ferme', titre: 'Relais fermé', suite: 'Photo de la devanture ; votre entreprise décide de la suite.', icone: 'store', ton: 'red', vers: chemin('incident', { famille: 'relais', type: 'relais_ferme', arret: id }) },
        { id: 'gerant_absent', titre: 'Gérant absent', suite: 'Votre entreprise est prévenue ; attendez sa réponse sur place.', icone: 'user-x', ton: 'or', vers: chemin('incident', { famille: 'relais', type: 'gerant_absent', arret: id }) },
      ]
    return [
      { id: 'ferme', titre: 'Vendeur fermé', suite: 'Photo de la devanture : l’arrêt est retiré, sans effet pour vous.', icone: 'store', ton: 'red', vers: chemin('arrivee', { a: id, s: 'ferme' }) },
      { id: 'pas_pret', titre: 'Colis pas prêt', suite: 'Attendez avec le minuteur, ou partez avec les colis prêts.', icone: 'hourglass', ton: 'amber', vers: chemin('arrivee', { a: id, s: 'attente' }) },
      { id: 'abime', titre: 'Colis abîmé', suite: 'Photo et motif : le colis reste chez le vendeur.', icone: 'package-x', ton: 'or', vers: chemin('refus', { a: id, motif: 'abime' }) },
      { id: 'introuvable', titre: 'Adresse introuvable', suite: 'Votre entreprise est prévenue et vous guide ; la tournée attend.', icone: 'search', ton: 'or', vers: chemin('incident', { famille: 'vendeur', type: 'adresse_introuvable', arret: id }) },
    ]
  }
  if (a.type === 'domicile')
    return [
      { id: 'absent', titre: 'Client absent', suite: 'Minuteur et appels comptés : le retour au relais s’ouvre ensuite.', icone: 'user-x', ton: 'red', vers: chemin('echec-domicile', { a: id, motif: 'absent' }) },
      { id: 'refus', titre: 'Le client refuse le colis', suite: 'Choisissez son motif : le colis repart au vendeur.', icone: 'package-x', ton: 'or', vers: chemin('echec-domicile', { a: id, motif: 'refus_colis' }) },
      { id: 'tiers', titre: 'Quelqu’un d’autre reçoit', suite: 'Il donne le code du client ; notez son prénom. Le client est averti.', icone: 'users', ton: 'acc', vers: chemin('domicile', { a: id, tiers: '1' }) },
      { id: 'introuvable', titre: 'Adresse introuvable', suite: 'Appel masqué, photo du lieu : le colis va au relais de la zone.', icone: 'search', ton: 'or', vers: chemin('echec-domicile', { a: id, motif: 'introuvable' }) },
      { id: 'danger', titre: 'Lieu dangereux', suite: 'N’y allez pas : une note suffit, sans pénalité.', icone: 'siren', ton: 'red', vers: chemin('echec-domicile', { a: id, motif: 'danger' }) },
    ]
  return [
    { id: 'relais_ferme', titre: 'Relais fermé', suite: 'Photo de la devanture ; vous gardez les colis, le dépôt est reprogrammé.', icone: 'store', ton: 'red', vers: chemin('depot-relais', { a: id, s: 'ferme' }) },
    { id: 'gerant_absent', titre: 'Gérant absent', suite: 'Votre entreprise est prévenue ; attendez sa réponse sur place.', icone: 'user-x', ton: 'or', vers: chemin('incident', { famille: 'relais', type: 'gerant_absent', arret: id }) },
    { id: 'sature', titre: 'Relais plein', suite: 'Votre entreprise décide : autre relais ou dépôt reporté.', icone: 'package', ton: 'amber', vers: chemin('incident', { famille: 'relais', type: 'relais_sature', arret: id }) },
  ]
}

const RETARDS = [15, 30, 45]

/** Feuille « Un problème ? » de l'arrêt : options de l'étape, puis le retard prévu en un toucher. */
function FeuilleProbleme({ a, fermer }: { a: Arret; fermer: () => void }) {
  const { t, tf, langue } = usePreferences()
  const { agir, occupe } = useAgir()
  const [retard, setRetard] = useState(false)
  const [annonce, setAnnonce] = useState<string | null>(null)
  const e = etapeDe(a)
  const annoncer = async (minutes: number) => {
    const res = await agir('route', a.id, (o, s) => s.tournee.annoncerRetard(a.id, minutes, o))
    if (res?.r.ok) {
      signal('succes')
      const qui = a.type === 'domicile' ? t('Le client') : a.type === 'ramassage' || a.type === 'retour' ? t('Le vendeur') : t('Le relais')
      setAnnonce(tf('{qui} et votre entreprise sont prévenus : arrivée vers {h}.', { qui, h: heure(res.r.arriveeEstimee, langue) }) + (res.enFile ? ' ' + t('Envoi au retour du réseau.') : ''))
    } else signal('erreur')
  }
  const titre = { route: 'En route', ramassage: 'Sur place · ramassage', livraison: 'Sur place · livraison' }[e]
  return (
    <Feuille ouverte fermer={fermer} titre={t('Un problème ?')}>
      <div className="lvp lvt-feuille">
        <div className="lvt-feuille-h">{t('Un problème ?')}</div>
        <div className="lvt-feuille-s">{t(titre)}</div>
        {annonce ? (
          <div className="lvt-ok" role="status">
            <Icone nom="circle-check" taille={22} />
            <span>{annonce}</span>
          </div>
        ) : retard ? (
          <>
            <div className="lvt-feuille-s">{t('Retard prévu : combien ?')}</div>
            <div className="lvt-retards" role="group" aria-label={t('Retard prévu')}>
              {RETARDS.map((m) => (
                <button key={m} type="button" className="btn secondary lvt-retard" disabled={occupe} onClick={() => void annoncer(m)}>
                  {tf('+{n} min', { n: m })}
                </button>
              ))}
            </div>
          </>
        ) : (
          <ul className="lvt-options">
            {options(a, e).map((o) => (
              <li key={o.id}>
                {o.vers ? (
                  <Link className="lvt-option" to={o.vers} onClick={fermer}>
                    <OptionContenu o={o} />
                  </Link>
                ) : (
                  <button type="button" className="lvt-option" onClick={() => setRetard(true)}>
                    <OptionContenu o={o} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="lvt-feuille-b">
          {!annonce && (
            <Link className="btn secondary" to={chemin('incident', { arret: a.id })} onClick={fermer}>
              <Icone nom="list" taille={18} />
              <span>{t('Autre problème')}</span>
            </Link>
          )}
          <button type="button" className="btn secondary" onClick={fermer}>
            <span>{t('Fermer')}</span>
          </button>
        </div>
      </div>
    </Feuille>
  )
}

function OptionContenu({ o }: { o: Option }) {
  const { t } = usePreferences()
  return (
    <>
      <span className={'ic ' + o.ton}>
        <Icone nom={o.icone} taille={22} />
      </span>
      <span className="lvt-grow">
        <b>{t(o.titre)}</b>
        <span>{t(o.suite)}</span>
      </span>
      <Icone nom="chevron-right" taille={20} />
    </>
  )
}

/** Le seul bouton « Un problème ? » d'un arrêt : il ouvre la feuille de l'étape (posée sur l'écran, au-dessus du dock). */
export function BoutonProbleme({ arret, className = 'btn danger' }: { arret: Arret; className?: string }) {
  const { t } = usePreferences()
  const [ouvert, setOuvert] = useState(false)
  const app = typeof document !== 'undefined' ? document.querySelector('#app') : null
  return (
    <>
      <button type="button" className={className + ' lvt-probleme'} onClick={() => setOuvert(true)} aria-haspopup="dialog">
        <Icone nom="triangle-alert" taille={18} />
        <span>{t('Un problème ?')}</span>
      </button>
      {ouvert && app && createPortal(<FeuilleProbleme a={arret} fermer={() => setOuvert(false)} />, app)}
    </>
  )
}

// ---------- Contact ----------

const AVEC: Record<Arret['type'], Correspondant> = { ramassage: 'vendeur', retour: 'vendeur', relais: 'relais', collecte: 'relais', domicile: 'client' }
/** Messages prêts au client (texte fixe, jamais de champ libre) ; mêmes textes que la page Appel. */
export const MESSAGES_CLIENT = ['J’arrive dans 5 minutes.', 'Je suis devant le repère indiqué.', 'Je ne trouve pas l’adresse.']

/** « Appeler » masqué en un toucher (l'appel part, la page Appel montre l'appel en cours) et, à domicile, messages prêts. */
export function ContactArret({ a, tournee, enfant }: { a: Arret; tournee: Tournee; enfant?: ReactNode }) {
  const { t, tf } = usePreferences()
  const aller = useNavigate()
  const { agir, occupe } = useAgir()
  const [envoye, setEnvoye] = useState<string | null>(null)
  if (tournee.etat !== 'en_cours' || a.id !== tournee.enCours) return null
  const avec = AVEC[a.type]
  const appeler = async () => {
    const res = await agir('appel', 'appel:' + avec, (o, s) => s.tournee.appeler(avec, 'application', o))
    if (res?.r.ok) aller(chemin('appel', { avec, a: a.id, en: res.r.appel.id }))
    else signal('erreur')
  }
  const ecrire = async (m: string) => {
    const res = await agir('appel', 'appel:' + avec, (o, s) => s.tournee.appeler(avec, 'sms', o, m))
    if (res?.r.ok) {
      signal('succes')
      setEnvoye(tf('Envoyé : « {texte} »', { texte: t(m) }))
    } else signal('erreur')
  }
  return (
    <div className="lvt-contact">
      <div className="lvt-contact-r">
        <button type="button" className="btn acc-soft lvt-appeler" disabled={occupe} onClick={() => void appeler()}>
          <Icone nom="phone" taille={18} />
          <span>{t('Appeler')}</span>
        </button>
        {enfant}
      </div>
      {avec === 'client' && (
        <div className="lvt-messages" role="group" aria-label={t('Messages prêts au client')}>
          {MESSAGES_CLIENT.map((m) => (
            <button key={m} type="button" className="chip lvt-message" disabled={occupe} onClick={() => void ecrire(m)}>
              <Icone nom="message-square-text" taille={15} />
              {t(m)}
            </button>
          ))}
        </div>
      )}
      {envoye && (
        <div className="lvt-envoye" role="status">
          <Icone nom="check" taille={16} />
          {envoye}
        </div>
      )}
      <div className="lvt-masque">{t('Numéro masqué des deux côtés.')}</div>
    </div>
  )
}
