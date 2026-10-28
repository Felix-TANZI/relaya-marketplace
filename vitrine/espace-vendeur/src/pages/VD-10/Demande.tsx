// La demande (VD-10, fig. 12) : repris du prototype (route('demande')), branché sur GET /demand (domaine plans).
// - Anonymat (CHF-02) : les mots cherchés, jamais le client. Le plus cherché en tête avec le seul bouton plein
//   « Ajouter ce produit » → Nouvelle offre, mots déjà saisis (VD10-R47, CHF-04) ; les autres recherches en lignes de
//   56 px ; Free montre les 3 premières, les suivantes verrouillées « Avec Boost » (non estompées) ; « Voir Boost ».
// - Ce qui freine les ventes : chaque frein mène à sa solution (photos → services ; attribution → vitrine de quartier
//   ou prix ; peu d'avis → avis).
// - Vide : « Les clients trouvent ce qu'ils cherchent près de chez vous. » et « Voir mes produits ».
// - Ajouts : filtre des recherches, nombre de recherches en jauge relative, copie des mots cherchés.
// - Accès Préparation : lecture seule (ajouter une offre et les plans sont réservés au propriétaire, VD-D12.A03).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Demande as DonneesDemande } from '../../donnees/domaines/plans'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useMontantsVisibles, useSession } from '../../session'
import { Attente, Bouton, HorsLigne, Ligne, useEnLigne, useToast } from './commun'

const ICONE_FREIN = { photo: 'camera', attribution: 'map-pin', avis: 'star' } as const

function Contenu({ d }: { d: DonneesDemande }) {
  const { t, tf } = usePreferences()
  const proprio = useMontantsVisibles()
  const s = useSession()
  const enLigne = useEnLigne()
  const [filtre, setFiltre] = useState('')
  const [toast, dire] = useToast()
  const [top, ...autres] = d.recherches
  const max = top?.fois ?? 1
  const cherche = filtre.trim().toLowerCase()
  const visibles = autres.filter((r) => !cherche || (!r.verrouillee && r.mots.includes(cherche)))
  const verrouillees = autres.some((r) => r.verrouillee)
  const copier = async (mots: string) => {
    try {
      await navigator.clipboard.writeText(mots)
      dire(tf('« {mots} » copié.', { mots }))
    } catch {
      dire(t('Copie impossible sur cet appareil.'))
    }
  }
  return (
    <Ecran route="demande">
      <div className="pg">
        <h1 className="pg-t">{t('La demande')}</h1>
        <p className="pg-s">{t('Ce que les clients cherchent près de chez vous, sans le trouver.')}</p>
      </div>
      {!enLigne && <HorsLigne />}
      <div className="hint-l">
        <Icone nom="eye-off" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Vous voyez les mots cherchés, jamais le nom du client.')}</span>
      </div>
      {!top ? (
        <div className="card">
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <Icone nom="search-x" taille={24} style={{ color: 'var(--green)', flexShrink: '0' }} />
            <div className="grow b8 t15">{t('Les clients trouvent ce qu’ils cherchent près de chez vous.')}</div>
          </div>
          <div className="mt12">
            <Bouton classe="secondary" icone="package" vers={chemin('produits')} style={{ height: '44px' }}>
              {t('Voir mes produits')}
            </Bouton>
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{ border: '1.5px solid var(--or-line)' }}>
            <div className="kick" style={{ fontSize: '12px' }}>
              {tf('Le plus cherché · zone {z}', { z: d.zone })}
            </div>
            <div className="row mt8">
              <div className="grow b8" style={{ fontSize: '22px', letterSpacing: '-.01em' }}>
                {t(`« ${top.mots} »`)}
              </div>
              <button type="button" className="ibtn" aria-label={t('Copier les mots cherchés')} onClick={() => void copier(top.mots)}>
                <Icone nom="copy" taille={20} />
              </button>
            </div>
            <div className="t13 c3 mt4">{tf('Cherché {n} fois près de votre boutique, sans résultat.', { n: top.fois })}</div>
            <div className="mt14">
              {proprio ? (
                <Bouton classe="primary" icone="plus" vers={chemin('offre1', { q: top.mots })}>
                  {t('Ajouter ce produit')}
                </Bouton>
              ) : (
                <p className="t13 c3">{tf('{nom}, propriétaire, peut ajouter ce produit.', { nom: s.proprietaire ? `${s.proprietaire.prenom} ${s.proprietaire.nom}` : '' })}</p>
              )}
            </div>
          </div>
          {autres.length > 0 && (
            <>
              <div className="sec">
                <h2>{t('Autres recherches sans résultat')}</h2>
              </div>
              {autres.length > 3 && (
                <div className="inp" style={{ marginBottom: '10px' }}>
                  <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)' }} />
                  <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder={t('Filtrer les recherches')} aria-label={t('Filtrer les recherches')} />
                </div>
              )}
              <div className="card tight" style={{ marginTop: '0' }}>
                {visibles.length === 0 && <p className="t13 c3" style={{ padding: '12px 0' }}>{t('Aucune recherche ne contient ces mots.')}</p>}
                {visibles.map((r) => {
                  const corps = (
                    <>
                      <span className={'ic' + (r.verrouillee ? '' : ' or')}>
                        <Icone nom={r.verrouillee ? 'lock' : 'search'} taille={18} />
                      </span>
                      <span className="grow">
                        <span className={'lt' + (r.verrouillee ? ' c2' : '')} style={{ display: 'block' }}>
                          {t(`« ${r.mots} »`)}
                        </span>
                        <span className="ls" style={{ display: 'block' }}>
                          {tf('{n} recherches', { n: r.fois })}
                        </span>
                        <span className="bar" style={{ display: 'block', height: '4px', marginTop: '6px' }} aria-hidden="true">
                          <i style={{ width: `${Math.round((r.fois / max) * 100)}%` }}></i>
                        </span>
                      </span>
                    </>
                  )
                  return r.verrouillee ? (
                    <div key={r.mots} className="li">
                      {corps}
                      <span className="t12 b8 c3 nw">{t('Avec Boost')}</span>
                    </div>
                  ) : proprio ? (
                    <Link key={r.mots} to={chemin('offre1', { q: r.mots })} className="li">
                      {corps}
                      <span className="t13 b8 cor nw" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Icone nom="plus" taille={16} />
                        {t('Ajouter')}
                      </span>
                    </Link>
                  ) : (
                    <div key={r.mots} className="li">
                      {corps}
                    </div>
                  )
                })}
                {verrouillees && proprio && (
                  <Link to={chemin('plans_liste')} className="row" style={{ minHeight: '48px', borderTop: '1px solid var(--line)', gap: '8px' }}>
                    <span className="grow t13 c3">{tf('Free montre les {n} premières recherches. Boost les montre toutes.', { n: d.visiblesSansBoost })}</span>
                    <span className="t13 b8 cor nw">{t('Voir Boost')}</span>
                    <Icone nom="chevron-right" taille={16} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
                  </Link>
                )}
              </div>
            </>
          )}
        </>
      )}
      {d.freins.length > 0 && (
        <>
          <div className="sec">
            <h2>{t('Ce qui freine vos ventes')}</h2>
          </div>
          <div className="card tight" style={{ marginTop: '0' }}>
            {d.freins.map((f) => (
              <Ligne key={f.type} vers={chemin(f.route)} icone={ICONE_FREIN[f.type]} ton="amber" titre={t(f.titre)} sous={t(f.texte)}>
                <span className="b8 cor" style={{ display: 'block', marginTop: '4px', fontSize: '13px' }}>
                  {t(f.solution)}
                </span>
              </Ligne>
            ))}
          </div>
        </>
      )}
      {toast}
    </Ecran>
  )
}

export default function Demande() {
  const s = useSession()
  const lecture = useLecture(() => source.plans.demande(), [s.membre?.role])
  return <Attente route="demande" lecture={lecture}>{(d) => <Contenu d={d} />}</Attente>
}
