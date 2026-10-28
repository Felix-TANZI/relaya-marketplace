// LIV-P12 · Audit qualité par échantillon (C4) — tiré par le SERVEUR (100 % des premières commandes d'un vendeur, puis
// 1 sur 20 sous Trust 70, puis 1 sur 100 ; contrôle renforcé DP-57), révélé seulement après le contrôle C1 : le livreur
// ne le connaît jamais d'avance et ne prévient pas le vendeur. Bandeau « Contrôle approfondi demandé par BelivaY »
// (le vendeur voit le même dans son application). Quatre vérifications selon la catégorie, photos 2 à 4 dans l'ordre.
// Durée comptée dans la tournée (AUDIT-C4-MIN au plus) : l'heure limite est recalculée. Défavorable : refus motivé
// (motif « abîmé » présélectionné), la console instruit, ce n'est pas une sanction décidée par le livreur. Appareil qui
// ne s'allume pas : photo, la console décide dans l'heure ; colis suivant.
// Structure : route « audit » du prototype (livRam_prog et pastilles, héros orange, fiche C4, contrôle C1 fait, Liste
// de la catégorie, Photos 2 à 4, « Ce que l'audit vérifie », barre du bas).
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { ArticleFiche } from '../../donnees/domaines/ramassage'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import type { Photo } from '../../composants/livraison/Camera'
import { AideEtape } from '../../composants/livraison/enrichi'
import { Chargement, Erreur, Message, chrono, useAgir } from '../../composants/livraison/outils'
import { BarreAction, Foot, Li, Lvp, Note, Sec } from '../../composants/proto'
import { Avancement, CaseVerif, FicheControle, FileArret, HorsLigneRamassage, PhotoPreuve, RienIciProto, Suite, useBrouillon, useRamassage } from './commun'

const VERIFS: Record<ArticleFiche['categorie'] | 'defaut', [string, string][]> = {
  electronique: [
    ['Mise sous tension', 'L’appareil s’allume'],
    ['Numéro de série identique', 'Écran (ou étiquette) et boîte'],
    ['Écran intact une fois allumé', 'Aucune ligne, tache ou fissure'],
    ['Authenticité', 'Boîte, étiquettes et accessoires du fabricant'],
  ],
  defaut: [
    ['Matière et finitions conformes', 'Celles de la fiche'],
    ['Étiquettes et marque d’origine', 'Aucune étiquette arrachée ou recousue'],
    ['Taille ou mesures conformes', 'Celles de la variante commandée'],
    ['Aucun défaut caché', 'Coutures, fermetures, fond, intérieur'],
  ],
  mode: [],
  maison: [],
  beaute: [],
  autre: [],
}
const verifsDe = (c: ArticleFiche['categorie']) => (VERIFS[c].length ? VERIFS[c] : VERIFS.defaut)
const PHOTOS: [string, string, string][] = [
  ['Photo 2 · vérification de la catégorie', 'Ce que la première vérification montre (appareil allumé, étiquette…)', 'Photo 2 · vérification de la catégorie'],
  ['Photo 3 · numéro, étiquette ou détail', 'Les deux numéros, ou le détail demandé, dans le cadre', 'Photo 3 · numéro, étiquette ou détail'],
  ['Photo 4 · vue d’ensemble', 'Article, boîte et accessoires ensemble', 'Photo 4 · vue d’ensemble'],
]

interface Brouillon {
  verifs: (boolean | null)[]
  photos: (Photo | null)[]
  impossible: boolean
}

export default function Audit() {
  const { t, tf, langue } = usePreferences()
  const naviguer = useNavigate()
  const x = useRamassage(['audit'])
  const { agir, occupe, maintenant, enLigne } = useAgir()
  const { tournee, regles, arret, paquet, ramassage: r, colis: c } = x
  const [b, maj, oublier] = useBrouillon<Brouillon>('audit_' + (c?.colisId ?? ''), { verifs: [null, null, null, null], photos: [null, null, null], impossible: false })
  const [attente, setAttente] = useState(false)
  const [erreur, setErreur] = useState(false)

  const terminer = async () => {
    if (!c) return
    const verifs = b.impossible ? b.verifs.map((v, i) => (i === 0 ? null : v)) : b.verifs
    const res = await agir('audit', c.colisId, (o, s) => s.ramassage.auditer(c.colisId, { verifs, photos: b.photos.filter((p) => p).map((p) => p!.id) }, o))
    if (!res?.r.ok) {
      signal('erreur')
      return setErreur(true)
    }
    oublier()
    if (res.r.suite === 'emballage') {
      signal('succes')
      naviguer(chemin('emballage', { a: arret!.id, c: c.colisId }), { replace: true })
    } else if (res.r.suite === 'refus') {
      signal('alerte')
      naviguer(chemin('refus', { a: arret!.id, c: c.colisId, motif: 'abime' }), { replace: true })
    } else {
      signal('alerte')
      setAttente(true)
    }
  }

  const contenu = (): { corps: ReactNode; barre?: ReactNode } => {
    if (x.lecture.erreur || x.lectureR.erreur) return { corps: <Erreur relire={() => (x.lecture.relire(), x.lectureR.relire())} /> }
    if (!x.charge || !regles) return { corps: <Chargement /> }
    if (!tournee || !arret || !r) return { corps: <RienIciProto titre="Aucun audit en cours" texte="L’audit C4 n’existe que pour un colis tiré par BelivaY, après son contrôle." icone="shield-half" /> }
    const tete = (
      <>
        {!enLigne && <HorsLigneRamassage quoi="La liste de l’audit a été téléchargée avec la tournée." />}
        <Avancement tournee={tournee} arret={arret} paquet={paquet} r={r} regles={regles} maintenant={maintenant} etape={1} courant={c?.colisId ?? null} pastilles />
        <AideEtape etape="audit" />
      </>
    )
    // Appareil impossible à vérifier : la console décide dans l'heure ; le colis ne peut pas être emballé d'ici là.
    if (c && (attente || c.audit?.resultat === 'attente_console'))
      return {
        corps: (
          <>
            {tete}
            <FicheControle c={c} audit />
            <div className="card" style={{ boxShadow: 'var(--shadow-card),inset 3px 0 0 var(--amber)' }}>
              <div className="kick" style={{ color: 'var(--amber)' }}>
                {t('En attente de la console')}
              </div>
              <div className="b8 t17 mt4">{t('Décision dans l’heure')}</div>
              <div className="t13 c3 mt4">{t('L’appareil ne peut pas être vérifié. La console décide dans l’heure ; sans moyen de vérifier, le colis sera refusé. Il reste chez le vendeur en attendant.')}</div>
            </div>
            <FileArret r={r} />
          </>
        ),
        barre: (
          <BarreAction>
            <div className="btns" style={{ marginTop: 0 }}>
              <Suite r={r} xl={false} />
              <Link className="btn danger" to={chemin('refus', { a: arret.id, c: c.colisId, motif: 'abime' })}>
                <Icone nom="package-x" taille={18} />
                <span>{t('Refuser')}</span>
              </Link>
            </div>
          </BarreAction>
        ),
      }
    if (!c || c.etat !== 'audit' || !c.audit)
      return {
        corps: (
          <>
            {tete}
            <div className="card">
              <div className="empty">
                <div className="ei">
                  <Icone nom="shield-check" taille={26} />
                </div>
                <h3>{t('Aucun audit demandé ici')}</h3>
                <p>{t('BelivaY tire les audits ; vous ne les connaissez jamais à l’avance.')}</p>
              </div>
            </div>
          </>
        ),
        barre: (
          <BarreAction>
            <Suite r={r} />
          </BarreAction>
        ),
      }
    const liste = verifsDe(c.article.categorie)
    const faites = b.verifs.filter((v, i) => v !== null || (b.impossible && i === 0)).length
    const conformes = b.verifs.filter((v) => v === true).length
    const nPhotos = b.photos.filter(Boolean).length
    const pret = b.impossible ? nPhotos >= 1 : faites === 4 && nPhotos === 3
    const limite = c.audit.debut + regles.auditMaxMin * 60000
    const choisir = (i: number, v: boolean) => (signal('toucher'), maj((y) => ({ ...y, verifs: y.verifs.map((z, j) => (j === i ? v : z)) })))
    return {
      corps: (
        <>
          {tete}
          <div className="hero amber">
            <div className="hk" style={{ color: '#FFD98A' }}>{tf('Audit C4 · colis {i} sur {n}', { i: x.rang, n: r.colis.length })}</div>
            <div className="ht">{t('Contrôle approfondi demandé par BelivaY')}</div>
            <div className="hs">{tf('{vendeur} voit le même bandeau dans son application. Le système tire ce contrôle au sort : ni vous ni le vendeur ne le savez à l’avance.', { vendeur: r.vendeur })}</div>
            <div className="row mt10 t12" style={{ gap: 8, color: 'rgba(255,255,255,.92)', alignItems: 'flex-start' }}>
              <Icone nom="timer" taille={15} style={{ flexShrink: 0 }} />
              <span>
                {tf('Jusqu’à {n} minutes, comptées dans la tournée · heure limite recalculée', { n: regles.auditMaxMin })} · {chrono(maintenant - c.audit.debut)} ·{' '}
                {maintenant < limite ? tf('à terminer vers {h}', { h: heure(limite, langue) }) : t('Durée maximale atteinte : terminez, la tournée est déjà recalculée.')}
              </span>
            </div>
          </div>
          <FicheControle c={c} audit />
          {c.photo1 && (
            <div className="card tight">
              <Li icone="circle-check" ton="green" t={t('Contrôle ordinaire C1 fait')} s={t('6 vérifications cochées · photo 1 prise')} />
            </div>
          )}

          <Sec titre={t('Liste de la catégorie')} droite={tf('{n} sur 4', { n: conformes })} />
          <div className="card tight">
            {liste.map(([titre, aide], i) => {
              const v = b.verifs[i]
              const neutre = b.impossible && i === 0
              return (
                <div key={titre} className={'lr-chk ' + (neutre ? 'ko' : v === true ? 'on' : v === false ? 'ko' : b.impossible ? 'wait' : '')} role="group" aria-label={t(titre)}>
                  <span className="bx">{v === true && !neutre ? <Icone nom="check" taille={17} trait={3} /> : v === false || neutre ? <Icone nom="x" taille={17} trait={3} /> : null}</span>
                  <span className="grow">
                    <span className="t" style={{ display: 'block' }}>
                      {t(titre)}
                    </span>
                    <span className="s" style={{ display: 'block' }}>
                      {neutre ? t('Ne s’allume pas : la console décide') : t(aide)}
                    </span>
                    {!neutre && (
                      <span className="seg" role="radiogroup" aria-label={t(titre)} style={{ marginTop: 8 }}>
                        <button type="button" role="radio" aria-checked={v === true} onClick={() => choisir(i, true)}>
                          {t('Conforme')}
                        </button>
                        <button type="button" role="radio" aria-checked={v === false} onClick={() => choisir(i, false)}>
                          {t('Écart')}
                        </button>
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
            {c.article.categorie === 'electronique' && (
              <CaseVerif etat={b.impossible ? 'on' : ''} titre={t('L’appareil ne s’allume pas (batterie vide)')} sous={t('Une photo et une note suffisent : la console décide dans l’heure.')} basculer={() => maj((y) => ({ ...y, impossible: !y.impossible }))} />
            )}
          </div>
          {b.verifs.some((v) => v === false) && (
            <div className="card" style={{ boxShadow: 'var(--shadow-card),inset 3px 0 0 var(--red)' }}>
              <div className="kick" style={{ color: 'var(--red)' }}>
                {t('Audit défavorable')}
              </div>
              <div className="b8 t17 mt4">{t('Refusez le colis selon la procédure de refus')}</div>
              <div className="t13 c3 mt4">{t('Ce n’est pas une sanction que vous décidez : vous refusez avec la photo et une note, puis la console instruit le dossier.')}</div>
            </div>
          )}

          <Sec titre={t('Photos 2 à 4 · détails demandés')} />
          {PHOTOS.map(([titre, sous, consigne], i) => (
            <PhotoPreuve
              key={i}
              titre={titre}
              sous={b.impossible && i > 0 ? sous + ' · ' + t('Facultative') : sous}
              consigne={consigne}
              nature={'audit' + (i + 2)}
              objet={c.colisId}
              id={b.photos[i]?.id ?? null}
              heure={b.photos[i]?.heure}
              enFile={b.photos[i]?.enFile}
              verrou={i > 0 && !b.photos[i - 1] ? tf('Après la photo {n}, dans l’ordre.', { n: i + 1 }) : null}
              prise={(p) => maj((y) => ({ ...y, photos: y.photos.map((z, j) => (j === i ? p : z)) }))}
              carte
            />
          ))}

          <details className="more">
            <summary>
              <Icone nom="list-checks" taille={18} style={{ color: 'var(--acc-txt)', flexShrink: 0 }} />
              <span className="grow">{t('Ce que l’audit vérifie selon la catégorie')}</span>
              <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
            </summary>
            <div className="more-b">
              <div className="lr-kv" style={{ marginTop: 0 }}>
                <span className="k">{t('Électronique')}</span>
                <span className="v">{t('Mise sous tension')}</span>
                <span className="k">{t('Mode')}</span>
                <span className="v">{t('Étiquette de composition')}</span>
                <span className="k">{t('Beauté, alimentation')}</span>
                <span className="v">{t('Date de péremption')}</span>
                <span className="k">{t('Marques')}</span>
                <span className="v">{t('Authenticité')}</span>
              </div>
            </div>
          </details>
          {erreur && (
            <div className="mt12">
              <Message ton="erreur">{t('Cochez les 4 vérifications et prenez les photos 2 à 4.')}</Message>
            </div>
          )}
          <Note ton="red" icone="ban">
            {t('Ne prévenez jamais le vendeur qu’un audit sera demandé, et ne sautez aucune vérification de la liste.')}
          </Note>
          <div className="btns">
            <Link className="btn danger" to={chemin('refus', { a: arret.id, c: c.colisId, motif: 'abime' })}>
              <Icone nom="package-x" taille={18} />
              <span>{t('Refuser ce colis')}</span>
            </Link>
          </div>
          <FileArret r={r} />
          {!enLigne && <Foot icone="wifi-off">{tf('Hors connexion · tournée téléchargée à {h}', { h: heure(tournee.telechargeeA, langue) })}</Foot>}
        </>
      ),
      barre: (
        <BarreAction aide={pret ? undefined : t('Cochez les 4 vérifications et prenez les photos 2 à 4.')}>
          <button type="button" className="btn primary xl" disabled={!pret || occupe} onClick={() => void terminer()}>
            <Icone nom="badge-check" taille={18} />
            <span>{t('Terminer l’audit')}</span>
          </button>
        </BarreAction>
      ),
    }
  }
  const k = contenu()
  return (
    <Ecran proto route="audit" titre={c && r ? tf('Audit C4 · colis {i} sur {n}', { i: x.rang, n: r.colis.length }) : undefined}>
      <Lvp>
        {k.corps}
        {k.barre}
      </Lvp>
    </Ecran>
  )
}
