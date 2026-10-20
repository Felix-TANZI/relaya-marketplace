// Hors connexion (VD-04, route « horsligne ») — balisage du prototype, branché sur la source et sur le réseau réel du
// téléphone (événements online / offline) :
// - bandeau « Pas de connexion. Données de 09 h 14. Ce que vous faites partira au retour du réseau. » (VD04-R14) ;
// - les commandes à préparer d'abord, avec « C'est prêt » (plein) et « Code de remise » (secondaire), côte à côte,
//   48 px (OFF-05) ; hors connexion, « C'est prêt » entre dans la file avec son heure d'origine (Q-93) ; les colis
//   prêts gardent leur code lisible (OFF-01, REM-05) ;
// - la file : nombre d'actions, résumé par type, « Réessayer », chaque action avec son type, son objet, son heure, son
//   lieu et son auteur ; expirée après 72 h (« refaites-la » : OFF-04) ; refusée par le serveur avec son motif ;
//   ajouts : retirer une action de la file, temps avant expiration, bilan du dernier envoi ;
// - « Comment ça marche » replié : ce qui marche sans réseau, ce qui est mis en file, ce qui attend le réseau (OFF-02,
//   OFF-03), lisible sans réseau (dans la page).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { ActionEnFile, ElementAFaire, TypeAction } from '../../donnees/domaines/accueil'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { duree, entre, heure } from '../../i18n/temps'
import { heuresOuvertes } from '../../calculs/ouverture'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import { ErreurLecture, Squelette, envoyerLaFile, geste, useReseau } from './commun'

const ICONES: Record<TypeAction, string> = { pret: 'package-check', photo: 'camera', stock: 'boxes', masquer: 'eye-off', fermer: 'calendar-x', rouvrir: 'store' }
const NOMS: Record<TypeAction, [string, string]> = {
  pret: ['« C’est prêt »', '« C’est prêt »'],
  photo: ['photo', 'photos'],
  stock: ['stock mis à jour', 'stocks mis à jour'],
  masquer: ['alerte masquée', 'alertes masquées'],
  fermer: ['fermeture du jour', 'fermetures du jour'],
  rouvrir: ['réouverture', 'réouvertures'],
}

function libelle(a: ActionEnFile, tf: (m: string, v: Record<string, string | number>) => string, t: (s: string) => string) {
  switch (a.type) {
    case 'pret':
      return tf('« C’est prêt » · {ref}', { ref: a.objet })
    case 'photo':
      return tf('Photo · {objet}', { objet: a.objet })
    case 'stock':
      return tf('Stock · {objet} : {n}', { objet: a.objet, n: a.detail?.stock ?? '' })
    case 'masquer':
      return t('Alerte de palier masquée')
    case 'fermer':
      return t('Fermer aujourd’hui')
    case 'rouvrir':
      return t('Rouvrir maintenant')
  }
}

export default function Horsligne() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const maintenant = useHorloge()
  const enLigne = useReseau()
  const lecture = useLecture(() => Promise.all([source.accueil.file(), source.accueil.aujourdhui(), source.remise.aRemettre()]), [s.membre?.role])
  const [avis, setAvis] = useState<string | null>(null)
  const d = lecture.donnees
  if (lecture.erreur)
    return (
      <Ecran route="horsligne">
        <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />
      </Ecran>
    )
  if (!d)
    return (
      <Ecran route="horsligne">
        <Squelette cartes={2} />
      </Ecran>
    )
  const [file, jour, aRemettre] = d
  const preparer = jour.aFaire.filter((x): x is Extract<ElementAFaire, { type: 'preparer' }> => x.type === 'preparer')
  const enAttente = file.actions.filter((a) => a.etat === 'en_attente')
  const pretsEnFile = new Map(enAttente.filter((a) => a.type === 'pret').map((a) => [a.objet, a.origine]))
  const parType = new Map<TypeAction, number>()
  for (const a of enAttente) parType.set(a.type, (parType.get(a.type) ?? 0) + 1)
  const resume = [...parType].map(([type, n]) => `${n} ${t(NOMS[type][n > 1 ? 1 : 0])}`).join(' · ')

  const cestPret = async (ref: string) => {
    const fait = await geste(enLigne, 'pret', ref, () => source.preparation.cestPret(ref))
    jouer(fait === 'fait' ? 'retrait' : 'interrupteur')
  }
  const reessayer = async () => {
    if (!navigator.onLine) {
      jouer('erreur')
      return setAvis(t('Toujours pas de réseau : la file partira toute seule à son retour.'))
    }
    const b = await envoyerLaFile()
    setAvis(b ? tf('Envoyé : {n} action(s).', { n: b.envoyees }) : t('Rien à envoyer.'))
  }

  return (
    <Ecran route="horsligne">
      <div className="pg" style={{ paddingTop: '16px' }}>
        <h1 className="pg-t">{enLigne ? t('Connecté') : t('Hors connexion')}</h1>
        <p className="pg-s">{enLigne ? t('Vos gestes partent tout de suite. Sans réseau, la préparation et le code de remise marchent quand même.') : t('La préparation et le code de remise marchent sans réseau.')}</p>
      </div>

      {preparer.map((x) => {
        const enFile = pretsEnFile.get(x.ref)
        return (
          <div key={x.ref} className="card ord">
            <div className="otop">
              <span className="oref">{tf('À PRÉPARER · {ref}', { ref: x.ref })}</span>
              <span className="cd">
                <Icone nom="timer" taille={14} />
                {tf('il reste {d}', { d: duree(heuresOuvertes(maintenant, x.echeance, x.calendrier), langue) })}
              </span>
            </div>
            <div className="art">
              <Vignette nom={x.article.dessin} taille={52} />
              <div className="grow">
                <div className="an" style={{ fontSize: '16px' }}>
                  {`${x.article.titre} · ${t(x.article.variante)}`}
                </div>
                <div className="av">{tf('Prête avant {h}', { h: heure(x.echeance, langue) })}</div>
                <div className="av" style={{ marginTop: '1px' }}>
                  {tf('Livreur {nom} {creneau}', { nom: x.livreur.nom, creneau: entre(x.livreur.creneau, langue) })}
                </div>
              </div>
            </div>
            {enFile ? (
              <div className="row t13 b7" role="status" style={{ gap: '8px', marginTop: '12px', color: 'var(--amber)' }}>
                <Icone nom="clock" taille={16} />
                <span>{tf('« C’est prêt » en attente d’envoi · fait à {h}', { h: heure(enFile, langue) })}</span>
              </div>
            ) : (
              <div className="btns" style={{ marginTop: '12px' }}>
                <button type="button" className="btn primary" onClick={() => void cestPret(x.ref)}>
                  <Icone nom="package-check" taille={18} />
                  <span>{t('C’est prêt')}</span>
                </button>
                <Link to={chemin('commande_prete', { ref: x.ref })} style={{ height: '48px' }} className="btn secondary">
                  <Icone nom="key-round" taille={18} />
                  <span>{t('Code de remise')}</span>
                </Link>
              </div>
            )}
          </div>
        )
      })}

      {aRemettre.map((r) => (
        <div key={r.ref} className="card ord">
          <div className="otop">
            <span className="oref">{tf('À REMETTRE · {ref}', { ref: r.ref })}</span>
            {r.preteA && (
              <span className="cd" style={{ color: 'var(--green)' }}>
                <Icone nom="circle-check" taille={14} />
                {tf('prête à {h}', { h: heure(r.preteA, langue) })}
              </span>
            )}
          </div>
          <div className="art">
            <Vignette nom={r.article.dessin} taille={52} />
            <div className="grow">
              <div className="an" style={{ fontSize: '16px' }}>
                {`${r.article.titre} · ${t(r.article.variante)}`}
              </div>
              {r.livreur && <div className="av">{tf('Livreur {nom} {creneau}', { nom: r.livreur.nom, creneau: entre(r.livreur.creneau, langue) })}</div>}
            </div>
          </div>
          <div className="mt12">
            <Link to={chemin('commande_prete', { ref: r.ref })} style={{ height: '48px' }} className="btn secondary">
              <Icone nom="key-round" taille={18} />
              <span>{t('Code de remise')}</span>
            </Link>
          </div>
        </div>
      ))}

      <div className="card">
        <div className="row">
          <div className="grow">
            <h3>{enAttente.length === 0 ? t('Aucune action en attente') : enAttente.length === 1 ? t('1 action en attente') : tf('{n} actions en attente', { n: enAttente.length })}</h3>
            <div className="t13 c3 mt4">{resume || t('Tout est parti.')}</div>
          </div>
          <button style={{ height: '44px' }} type="button" className="btn secondary sm" onClick={() => void reessayer()}>
            <Icone nom="refresh-cw" taille={16} />
            <span>{t('Réessayer')}</span>
          </button>
        </div>
        {avis && (
          <div className="t13 b7 mt8" role="status">
            {avis}
          </div>
        )}
        {file.dernierEnvoi && file.actions.length === 0 && (
          <div className="t13 c2 mt8" role="status">
            {tf('Dernier envoi à {h} : {n} action(s) envoyée(s).', { h: heure(file.dernierEnvoi.a, langue), n: file.dernierEnvoi.envoyees })}
          </div>
        )}
        {file.actions.length > 0 && (
          <div className="mt8" style={{ borderTop: '1px solid var(--line)' }}>
            {file.actions.map((a) => {
              const reste = a.origine + file.heures * 3600 * 1000 - maintenant
              return (
                <div key={a.id} className="li" data-etat={a.etat}>
                  <span className={'ic ' + (a.etat === 'en_attente' ? '' : 'red')}>
                    <Icone nom={ICONES[a.type]} taille={20} />
                  </span>
                  <span className="grow">
                    <span className="lt" style={{ display: 'block' }}>
                      {libelle(a, tf, t)}
                    </span>
                    <span className="ls" style={{ display: 'block' }}>
                      {tf(a.lieu ? 'Fait à {h} · {lieu} · par {auteur}' : 'Fait à {h} · par {auteur}', { h: heure(a.origine, langue), lieu: a.lieu ?? '', auteur: a.auteur })}
                    </span>
                    {a.etat === 'expiree' && (
                      <span className="ls cr b7" style={{ display: 'block' }}>
                        {t('Cette action n’a pas pu partir à temps : refaites-la.')}
                      </span>
                    )}
                    {a.etat === 'refusee' && a.motif && (
                      <span className="ls cr b7" style={{ display: 'block' }}>
                        {tf('Refusée : {motif}', { motif: t(a.motif) })}
                      </span>
                    )}
                    {a.etat === 'en_attente' && (
                      <span className="ls" style={{ display: 'block' }}>
                        {tf('expire dans {d}', { d: duree(reste, langue) })}
                      </span>
                    )}
                  </span>
                  <button type="button" className="vd4-x" aria-label={t('Retirer de la file')} onClick={() => void source.accueil.retirer(a.id).then(() => jouer('favoriRetire'))}>
                    <Icone nom={a.etat === 'en_attente' ? 'x' : 'trash-2'} taille={18} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <div className="hint-l">
          <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Chaque action garde l’heure et le lieu où vous l’avez faite.')}</span>
        </div>
        <div className="hint-l">
          <Icone nom="triangle-alert" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('Une action en attente depuis plus de {h} h expire : il faudra la refaire.', { h: file.heures })}</span>
        </div>
      </div>

      <details className="more">
        <summary>
          <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Comment ça marche')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          {(
            [
              ['green', 'circle-check', 'Marche sans réseau', 'Voir les commandes à préparer · voir le code de remise, à donner au livreur même sans réseau'],
              ['amber', 'clock', 'Mis en file, envoyé au retour du réseau', 'Marquer prêt · photographier un produit · mettre à jour un stock · masquer une alerte · fermer aujourd’hui. Les montants s’affichent datés.'],
              ['red', 'wifi-off', 'Attend le réseau', 'Changer de numéro de versement · modifier le profil · répondre à un litige · publier une offre'],
            ] as const
          ).map(([ton, icone, a, b]) => (
            <div key={a} className="li">
              <span className={'ic ' + ton}>
                <Icone nom={icone} taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t(a)}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t(b)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </details>
    </Ecran>
  )
}
