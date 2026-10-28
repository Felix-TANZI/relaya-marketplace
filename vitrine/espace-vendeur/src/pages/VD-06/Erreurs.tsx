// Quand la remise bloque (VD-06, route « erreurs ») — balisage du prototype (titre, six puces, carte d'erreur), rendu
// logique :
// - « En ce moment » : les incidents réels des commandes de la boutique (livreur absent, remise bloquée, annulée par le
//   client, délai dépassé, colis de valeur), plus « Pas de réseau » constaté par le téléphone ; chacun avec sa carte
//   et sa vraie issue (VD06-R25 : chaque bouton mène à l'écran où l'action se fait) ; aucun : l'écran le dit ;
// - les six puces (VD06-R24) servent d'aide : chaque cas, écrit sur la commande concernée quand il arrive, sinon sur
//   une commande de la boutique, marquée « Exemple » (colis de valeur : la commande la plus chère) ;
// - ?ref= : la commande de l'écran de remise ; ?e= : le cas montré. Aucun code technique ni code de règle (ERR-02/03).
import { Link, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { ErreurRemise, Remise } from '../../donnees/domaines/remise'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import { ErreurLecture, Squelette, useReseau } from '../VD-04/commun'
import { CarteErreur, carteDe, type Action } from './commun'

const CAS: [ErreurRemise, string][] = [
  ['absent', 'Livreur absent'],
  ['bloque', 'Remise bloquée'],
  ['annulee', 'Annulée'],
  ['depasse', 'Délai dépassé'],
  ['reseau', 'Pas de réseau'],
  ['plafond', 'Colis de valeur'],
]

export default function Erreurs() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const maintenant = useHorloge()
  const enLigne = useReseau()
  const [params] = useSearchParams()
  const refParam = params.get('ref')
  const lecture = useLecture(() => source.remise.toutes(), [s.membre?.role])
  const toutes = lecture.donnees
  if (lecture.erreur)
    return (
      <Ecran route="erreurs">
        <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />
      </Ecran>
    )
  if (!toutes)
    return (
      <Ecran route="erreurs">
        <Squelette cartes={2} />
      </Ecran>
    )

  const enCours = toutes.filter((r) => r.etape === 'a_preparer' || r.etape === 'prete')
  const actifs: { cas: ErreurRemise; r: Remise }[] = [
    ...toutes.filter((r) => r.erreur).map((r) => ({ cas: r.erreur!, r })),
    ...(!enLigne ? toutes.filter((r) => r.etape === 'prete' && r.erreur !== 'bloque').map((r) => ({ cas: 'reseau' as const, r })) : []),
  ]
  const choisi = (params.get('e') as ErreurRemise | null) ?? actifs.find((a) => !refParam || a.r.ref === refParam)?.cas ?? 'absent'
  const cas = CAS.some(([c]) => c === choisi) ? choisi : 'absent'
  const reference = toutes.find((r) => r.ref === refParam) ?? enCours[0] ?? toutes[0]
  // La commande sur laquelle le cas est écrit : celle où il arrive, sinon un exemple pris dans la boutique.
  const actif = actifs.find((a) => a.cas === cas && (!refParam || a.r.ref === refParam)) ?? actifs.find((a) => a.cas === cas)
  const exemple = cas === 'plafond' ? ([...toutes].sort((a, b) => (b.niveauRequis === 'Or' ? 1 : 0) - (a.niveauRequis === 'Or' ? 1 : 0))[0] ?? reference) : reference
  const cible = actif?.r ?? exemple
  const actions = (r: Remise): Partial<Record<ErreurRemise, Action>> =>
    r.erreur === 'bloque' && !r.nouveauCodeDemande ? { bloque: { libelle: t('Demander un nouveau code'), icone: 'key-round', onClick: () => void source.remise.nouveauCode(r.ref).then((x) => jouer(x.ok ? 'notification' : 'erreur')) } } : {}
  const entete = (r: Remise, vrai: boolean) => ({
    dessin: r.article.dessin,
    titre: `${r.article.titre} · ${t(r.article.variante)}`,
    sous: vrai ? tf('{ref} · colis {c}', { ref: r.ref, c: r.colis }) : tf('Exemple · {ref} · colis {c}', { ref: r.ref, c: r.colis }),
  })

  return (
    <Ecran route="erreurs">
      <div className="pg">
        <h1 className="pg-t">{t('Quand la remise bloque')}</h1>
      </div>

      <div className="sec">
        <h2>{t('En ce moment')}</h2>
      </div>
      {actifs.length === 0 ? (
        <div className="card tight" style={{ marginTop: '0' }}>
          <div className="li">
            <span className="ic green">
              <Icone nom="circle-check" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Aucune remise bloquée')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {enCours.length ? tf('{n} commande(s) en cours, sans incident', { n: enCours.length }) : t('Aucune commande en cours')}
              </span>
            </span>
          </div>
        </div>
      ) : (
        <div className="card tight" style={{ marginTop: '0' }}>
          {actifs.map((a) => (
            <Link key={a.cas + a.r.ref} to={chemin('erreurs', { e: a.cas, ref: a.r.ref })} replace className="li" aria-current={a.cas === cas && a.r.ref === cible.ref ? 'true' : undefined}>
              <span className={'ic ' + (a.cas === 'bloque' || a.cas === 'depasse' ? 'red' : a.cas === 'plafond' ? '' : 'amber')}>
                <Icone nom={carteDe(a.cas, a.r, { maintenant, langue, t, tf }).icone} taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {`${a.r.ref} · ${t(CAS.find(([c]) => c === a.cas)![1])}`}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {`${a.r.article.titre} · ${t(a.r.article.variante)}`}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="chips" role="group" aria-label={t('Les six cas')}>
        {CAS.map(([c, libelle]) => (
          <Link key={c} to={chemin('erreurs', { e: c, ref: refParam })} replace className={'chip' + (c === cas ? ' on' : '')} aria-pressed={c === cas} style={{ padding: '0 11px' }}>
            {t(libelle)}
          </Link>
        ))}
      </div>
      {cible ? (
        <CarteErreur c={carteDe(cas, cible, { maintenant, langue, t, tf, actions: actions(cible) })} entete={entete(cible, !!actif)} />
      ) : (
        <div className="empty">
          <h3>{t('Aucune commande reçue')}</h3>
        </div>
      )}
      <div className="hint-l">
        <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Ces messages s’affichent sur l’écran de remise de la commande concernée, au moment où cela arrive.')}</span>
      </div>
    </Ecran>
  )
}
