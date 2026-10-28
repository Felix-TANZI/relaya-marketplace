// Apprendre (AJ-B, DP-58) : le centre de formation du vendeur. Cinq fiches courtes (bien photographier, fixer son
// prix, préparer un colis, éviter les litiges, monter de palier), illustrées et pas à pas ; chaque étape se coche,
// la progression est gardée PAR MEMBRE (propriétaire et employé ont chacun la leur) ; une fiche finie est marquée et
// se recommence. Chaque fiche finit sur l'écran où l'on agit (Ajouter un produit, Commandes, Litiges, Palier) ;
// l'accès Préparation ne reçoit pas de lien vers un geste réservé (Ajouter un produit : Q-18).
// Liée à l'Aide (questions fréquentes, support) et au « Premier jour » (fiches recommandées la première semaine).
// ?fiche=<id> ouvre une fiche (lien profond depuis Ramassages, Mon profil, la recherche).
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { PhotoDessinee, Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Bouton } from '../VD-11/communs'
import { donneesAJB } from './donnees-ajb'
import { FICHES, cleEtape, type Fiche } from './fiches'
import './ajb.css'

function Illustration({ f, grande }: { f: Fiche; grande?: boolean }) {
  if (grande && f.illustration?.type === 'photo')
    return (
      <div className="ajb-illu ph">
        <PhotoDessinee nom={f.illustration.nom} />
      </div>
    )
  if (grande && f.illustration?.type === 'art')
    return (
      <div className="ajb-illu art">
        <Vignette nom={f.illustration.nom} taille={120} />
      </div>
    )
  return (
    <span className={'ajb-fiche-ic ' + f.id + (grande ? ' grande' : '')}>
      <Icone nom={f.icone} taille={grande ? 44 : 22} />
    </span>
  )
}

export default function Apprendre() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const prep = s.membre?.role === 'preparation'
  const membre = s.membre?.id ?? ''
  const [params] = useSearchParams()
  const faites = useLecture(() => donneesAJB.apprendre.faites(membre), [membre])
  const fait = useMemo(() => new Set(faites.donnees ?? []), [faites.donnees])
  const fiche = FICHES.find((f) => f.id === params.get('fiche')) ?? null
  const etapesFaites = (f: Fiche) => f.etapes.filter((_, i) => fait.has(cleEtape(f.id, i))).length
  const finie = (f: Fiche) => etapesFaites(f) === f.etapes.length
  const finies = FICHES.filter(finie).length
  const pour = Math.round((finies / FICHES.length) * 100)

  if (fiche) {
    const n = etapesFaites(fiche)
    const toutFini = n === fiche.etapes.length
    const suivante = FICHES.find((f) => f.id !== fiche.id && !finie(f))
    const cocher = async (i: number, v: boolean) => {
      const apres = await donneesAJB.apprendre.cocher(membre, cleEtape(fiche.id, i), v)
      jouer(v && fiche.etapes.every((_, k) => apres.includes(cleEtape(fiche.id, k))) ? 'valide' : 'interrupteur')
    }
    const agir = fiche.agir.proprio && prep ? null : fiche.agir
    return (
      <Ecran route="apprendre" titre={t(fiche.titre)} retour={chemin('apprendre')}>
        <div className="card ajb-fiche-tete">
          <Illustration f={fiche} grande />
          <div className="kick mt10">{tf('{n} min de lecture · {e} étapes', { n: fiche.minutes, e: fiche.etapes.length })}</div>
          <h2 className="ajb-fiche-titre">{t(fiche.titre)}</h2>
          <p className="t14 c2" style={{ margin: '4px 0 0', lineHeight: 1.5 }}>
            {t(fiche.resume)}
          </p>
          <div className="ajb-jauge mt12" role="progressbar" aria-valuemin={0} aria-valuemax={fiche.etapes.length} aria-valuenow={n} aria-label={t('Étapes cochées')}>
            <i style={{ width: `${(n / fiche.etapes.length) * 100}%` }}></i>
          </div>
          <div className="t12 c3 mt4">{tf('{n} sur {total} étapes cochées', { n, total: fiche.etapes.length })}</div>
        </div>
        <ol className="ajb-etapes">
          {fiche.etapes.map((e, i) => {
            const coche = fait.has(cleEtape(fiche.id, i))
            return (
              <li key={i} className={'card' + (coche ? ' fait' : '')}>
                <span className="ajb-num" aria-hidden="true">
                  {coche ? <Icone nom="check" taille={16} trait={2.6} /> : i + 1}
                </span>
                <div className="grow">
                  <div className="b8 t15">{t(e.titre)}</div>
                  <p className="t14 c2" style={{ margin: '4px 0 0', lineHeight: 1.5 }}>
                    {t(e.texte)}
                  </p>
                </div>
                <button type="button" role="checkbox" aria-checked={coche} aria-label={tf('Étape {n} comprise', { n: i + 1 })} className={'ajb-coche' + (coche ? ' on' : '')} onClick={() => void cocher(i, !coche)}>
                  <Icone nom="check" taille={18} trait={2.6} />
                </button>
              </li>
            )
          })}
        </ol>
        <div className="note">
          <Icone nom="lightbulb" taille={18} />
          <div>
            <b>{t('À retenir')}</b>
            <div className="mt4">{t(fiche.retenir)}</div>
          </div>
        </div>
        {toutFini && (
          <div className="card ajb-bravo blv-succes" role="status">
            <Icone nom="circle-check" taille={26} style={{ color: 'var(--green)' }} />
            <div className="grow">
              <div className="b8 t15">{t('Fiche terminée')}</div>
              <div className="t13 c3">{suivante ? tf('Suivante : {titre}', { titre: t(suivante.titre) }) : t('Toutes les fiches sont terminées. Bravo !')}</div>
            </div>
          </div>
        )}
        <div className="mt14">
          {agir && (
            <Bouton icone="arrow-right" vers={chemin(agir.route, agir.params)}>
              {t(agir.libelle)}
            </Bouton>
          )}
        </div>
        {suivante && (
          <div className="mt8">
            <Bouton classe="secondary" icone="book-open" vers={chemin('apprendre', { fiche: suivante.id })}>
              {tf('Fiche suivante : {titre}', { titre: t(suivante.titre) })}
            </Bouton>
          </div>
        )}
        {n > 0 && (
          <div className="center mt8">
            <button type="button" className="ajb-lien" onClick={() => void donneesAJB.apprendre.recommencer(membre, fiche.id)}>
              {t('Recommencer la fiche')}
            </button>
          </div>
        )}
      </Ecran>
    )
  }

  return (
    <Ecran route="apprendre">
      <div className="hero night ajb-apprendre-tete">
        <div className="row" style={{ gap: '12px' }}>
          <span className="ajb-anneau" style={{ ['--p' as string]: `${pour}` }} role="img" aria-label={tf('{n} fiches terminées sur {total}', { n: finies, total: FICHES.length })}>
            <b>{`${finies}/${FICHES.length}`}</b>
          </span>
          <div className="grow">
            <div className="b8 t17">{t('Apprendre à mieux vendre')}</div>
            <div className="t13" style={{ color: 'rgba(255,255,255,.78)' }}>
              {finies === FICHES.length ? t('Toutes les fiches sont terminées. Bravo !') : t('Cinq fiches de 2 à 3 minutes. Cochez chaque étape comprise.')}
            </div>
          </div>
        </div>
      </div>
      <div className="divider-t">{t('Les fiches')}</div>
      <div className="ajb-fiches">
        {FICHES.map((f) => {
          const n = etapesFaites(f)
          return (
            <Link key={f.id} to={chemin('apprendre', { fiche: f.id })} className="card ajb-fiche">
              <Illustration f={f} />
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="b8 t15" style={{ display: 'block' }}>
                  {t(f.titre)}
                </span>
                <span className="t13 c3" style={{ display: 'block' }}>
                  {t(f.resume)}
                </span>
                <span className="row mt6" style={{ gap: '6px', flexWrap: 'wrap' }}>
                  {finie(f) ? (
                    <span className="pill green sm">
                      <Icone nom="check" taille={13} />
                      {t('Terminée')}
                    </span>
                  ) : n > 0 ? (
                    <span className="pill or sm">{tf('{n} sur {total}', { n, total: f.etapes.length })}</span>
                  ) : (
                    <span className="pill ink sm">{tf('{n} min', { n: f.minutes })}</span>
                  )}
                  {f.premierJour && !finie(f) && <span className="pill bronze sm">{t('Première semaine')}</span>}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          )
        })}
      </div>
      <div className="card tight">
        <Link to={chemin('aide')} className="li" style={{ minHeight: '56px' }}>
          <span className="ic">
            <Icone nom="circle-help" taille={19} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Aide')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Questions fréquentes · support WhatsApp')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
        {!prep && (
          <Link to={chemin('premier_jour')} className="li" style={{ minHeight: '56px' }}>
            <span className="ic">
              <Icone nom="rocket" taille={19} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Premier jour')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Les trois gestes pour commencer')}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        )}
        {!prep && (
          <Link to={chemin('saisie_assistee')} className="li" style={{ minHeight: '56px' }}>
            <span className="ic">
              <Icone nom="users" taille={19} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Saisie assistée')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Un agent BelivaY saisit vos fiches')}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        )}
      </div>
    </Ecran>
  )
}
