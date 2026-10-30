// LIV-P11 · Contrôle au ramassage et photo 1 (C1) — devant le vendeur, colis par colis : fiche de l'article telle que
// le vendeur l'a décrite (jamais un prix), SIX cases cochées par le livreur (aucune d'avance, LIV-P11R-05), question
// « Boîte scellée par le fabricant ? » (non : produit sorti ; oui : photographiée sur toutes ses faces, LIV-P11R-01),
// photo 1 prise par l'appareil de l'application (nette, horodatée, géolocalisée), classe dépassée (photo avec repère :
// le système reclasse et facture l'écart au vendeur, jamais au client ; le livreur ne saisit aucun montant), série
// illisible (photo quand même, jamais un refus pour ce seul motif). Un écart mène au refus motivé (LIV-P15). Le serveur
// tire l'audit C4 et le révèle seulement après le contrôle (next = audit). Durée : CONTROLE-C1-S, payée dans la
// prestation. Les preuves sont versées au dossier de la commande du vendeur sans geste de plus (DED-05).
// Structure : route « controle » du prototype (livRam_prog et pastilles, fiche, Vérifications, Photo 1, Classe du colis,
// refus, barre du bas « Emballer et sceller »).
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import type { Photo } from '../../composants/livraison/Camera'
import { AideEtape } from '../../composants/livraison/enrichi'
import { Chargement, Erreur, Message, useAgir } from '../../composants/livraison/outils'
import { BarreAction, Foot, Hint, Lvp, Sec } from '../../composants/proto'
import { Avancement, CaseVerif, DOMMAGES, FicheControle, FileArret, HorsLigneRamassage, PhotoPreuve, RienIciProto, Suite, quantiteTexte, useBrouillon, useRamassage } from './commun'

interface Brouillon {
  cases: boolean[]
  boite: boolean | null
  photo1: Photo | null
  depasse: boolean
  photoClasse: Photo | null
  serieIllisible: boolean
}

export default function Controle() {
  const { t, tf, langue } = usePreferences()
  const naviguer = useNavigate()
  const x = useRamassage(['attendu'])
  const { agir, occupe, enLigne, maintenant } = useAgir()
  const { tournee, regles, arret, paquet, ramassage: r, colis: c } = x
  const [b, maj, oublier] = useBrouillon<Brouillon>('controle_' + (c?.colisId ?? ''), { cases: [false, false, false, false, false, false], boite: null, photo1: null, depasse: false, photoClasse: null, serieIllisible: false })
  const [erreur, setErreur] = useState<string | null>(null)

  const valider = async () => {
    if (!c || !b.photo1 || b.boite === null) return
    setErreur(null)
    const res = await agir('controle', c.colisId, (o, s) => s.ramassage.controler(c.colisId, { cases: b.cases, boiteScellee: b.boite!, photo1: b.photo1!.id, classeDepassee: b.depasse ? (b.photoClasse?.id ?? null) : null, serieIllisible: b.serieIllisible }, o))
    if (res?.r.ok) {
      oublier()
      signal('succes')
      naviguer(chemin(res.r.suite === 'audit' ? 'audit' : 'emballage', { a: arret!.id, c: c.colisId }), { replace: true })
    } else {
      signal('erreur')
      setErreur(res && !res.r.ok && res.r.raison === 'photo_manquante' ? t('La photo 1 manque : l’étape reste bloquée.') : t('Cochez les 6 vérifications et prenez la photo 1.'))
    }
  }

  const contenu = (): { corps: ReactNode; barre?: ReactNode } => {
    if (x.lecture.erreur || x.lectureR.erreur) return { corps: <Erreur relire={() => (x.lecture.relire(), x.lectureR.relire())} /> }
    if (!x.charge || !regles) return { corps: <Chargement /> }
    if (!tournee || !arret || !r) return { corps: <RienIciProto titre="Aucun contrôle en cours" texte="Le contrôle se fait sur place, chez le vendeur de l’arrêt en cours." icone="clipboard-check" /> }
    if (arret.phase !== 'sur_place') return { corps: <RienIciProto titre="Pas encore sur place" texte="Appuyez d’abord sur « Je suis arrivé » : le vendeur est prévenu et voit votre photo." icone="map-pin" /> }
    if (!c || c.etat !== 'attendu')
      return {
        corps: (
          <>
            <Avancement tournee={tournee} arret={arret} paquet={paquet} r={r} regles={regles} maintenant={maintenant} etape={Math.max(1, arret.etape)} courant={null} pastilles />
            <div className="card">
              <div className="empty">
                <div className="ei">
                  <Icone nom="clipboard-check" taille={26} />
                </div>
                <h3>{t('Contrôle fait')}</h3>
                <p>{t('Chaque colis de l’arrêt a son contrôle, ou a été refusé. La suite de la chaîne de preuves vous attend.')}</p>
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
    const a = c.article
    const nCases = b.cases.filter(Boolean).length
    const pret = nCases === 6 && b.boite !== null && !!b.photo1 && (!b.depasse || !!b.photoClasse)
    const cocher = (i: number) => (signal('toucher'), maj((v) => ({ ...v, cases: v.cases.map((y, j) => (j === i ? !y : y)) })))
    const cases: [string, string][] = [
      ['Bon article', a.nom],
      ['Bonne variante', a.variante],
      ['Bonne quantité', quantiteTexte(a, t, tf)],
      ['État conforme', a.etat],
      ['Aucun dommage visible', t(DOMMAGES[a.categorie])],
      ['Accessoires annoncés présents', a.accessoires ?? t('Aucun')],
    ]
    const aide = !pret
      ? b.boite === null && nCases === 6
        ? t('Répondez à la question de la boîte, puis prenez la photo 1.')
        : b.depasse && b.photo1 && !b.photoClasse && nCases === 6
          ? t('Classe dépassée : la photo avec repère de taille est exigée.')
          : t('Cochez les 6 vérifications et prenez la photo 1.')
      : undefined
    return {
      corps: (
        <>
          {!enLigne && <HorsLigneRamassage quoi="Les photos et les coches restent sur le téléphone." />}
          <Avancement tournee={tournee} arret={arret} paquet={paquet} r={r} regles={regles} maintenant={maintenant} etape={1} courant={c.colisId} pastilles />
          <AideEtape etape="controle" />
          <FicheControle c={c} />

          <Sec titre={tf('Vérifications · {n} sur 6', { n: nCases })} />
          <div className="card tight">
            {cases.map(([titre, sous], i) => (
              <CaseVerif key={titre} etat={b.cases[i] ? 'on' : ''} titre={t(titre)} sous={sous} basculer={() => cocher(i)} />
            ))}
          </div>
          {nCases < 6 && <Hint icone="hand">{t('Aucune case n’est cochée d’avance : chaque vérification est un geste, devant le vendeur.')}</Hint>}
          <div className="btns">
            <Link className="btn ghost" to={chemin('refus', { a: arret.id, c: c.colisId, motif: 'non_conforme' })} style={{ color: 'var(--red)' }}>
              <Icone nom="circle-x" taille={18} />
              <span>{t('Un point ne va pas : refuser ce colis')}</span>
            </Link>
          </div>

          <div className="t13 b7 mt14" style={{ marginLeft: 2 }} id="lr-boite">
            {t('Boîte scellée par le fabricant ?')}
          </div>
          <div className="seg" role="radiogroup" aria-labelledby="lr-boite" style={{ marginTop: 8 }}>
            <button type="button" role="radio" aria-checked={b.boite === false} onClick={() => maj((v) => ({ ...v, boite: false }))}>
              {t('Non : sortir le produit')}
            </button>
            <button type="button" role="radio" aria-checked={b.boite === true} onClick={() => maj((v) => ({ ...v, boite: true }))}>
              {t('Oui : photographier toutes les faces')}
            </button>
          </div>
          <Hint icone="info">{t('Une boîte scellée d’usine n’est pas ouverte : elle est photographiée sur toutes ses faces.')}</Hint>

          <Sec titre={t(b.boite ? 'Photo 1 · boîte scellée, toutes les faces' : 'Photo 1 · produit à découvert')} />
          <PhotoPreuve
            titre={b.photo1 ? 'Photo 1 prise' : 'Prendre la photo 1'}
            sous={t(b.boite ? 'Boîte scellée, toutes les faces visibles.' : a.serie ? 'Produit sorti de sa boîte, numéro de série visible.' : 'Article déplié, étiquette visible.') + ' ' + t('Appareil photo de l’application uniquement.')}
            consigne={b.boite ? 'Photo 1 · boîte scellée, toutes les faces' : a.serie ? 'Photo 1 · produit à découvert, série visible' : 'Photo 1 · produit à découvert'}
            nature="photo1"
            objet={c.colisId}
            id={b.photo1?.id ?? null}
            heure={b.photo1?.heure}
            enFile={b.photo1?.enFile}
            verrou={b.boite === null ? 'Répondez d’abord à la question de la boîte.' : null}
            prise={(p) => maj((v) => ({ ...v, photo1: p }))}
            carte
            legende={t('Nette : la netteté est vérifiée avant l’envoi. Heure et position d’origine enregistrées.')}
            extra={
              <>
                <div className="lr-proofs">
                  <span className="lr-pf ok">
                    <Icone nom="focus" taille={14} />
                    {t('Nette')}
                  </span>
                  {b.photo1?.heure ? (
                    <span className="lr-pf">
                      <Icone nom="clock" taille={14} />
                      {heure(b.photo1.heure, langue)}
                    </span>
                  ) : null}
                  {b.photo1?.enFile && (
                    <span className="lr-pf or">
                      <Icone nom="cloud-upload" taille={14} />
                      {t('En file')}
                    </span>
                  )}
                </div>
                {a.serie && (
                  <div className="mt8">
                    <CaseVerif etat={b.serieIllisible ? 'on' : ''} titre={t('Série illisible')} sous={t('La photo est prise quand même ; ce n’est jamais un motif de refus à lui seul.')} basculer={() => maj((v) => ({ ...v, serieIllisible: !v.serieIllisible }))} />
                  </div>
                )}
              </>
            }
          />

          <Sec titre={t('Classe du colis')} />
          <div className="card tight">
            <CaseVerif
              etat={b.depasse ? 'on' : ''}
              titre={tf('Le colis dépasse la classe annoncée ({classe})', { classe: c.classe })}
              sous={t('Cochez seulement si vous le constatez : une photo avec repère de taille sera exigée.')}
              basculer={() => maj((v) => ({ ...v, depasse: !v.depasse }))}
            />
          </div>
          {b.depasse && (
            <>
              <PhotoPreuve titre="Photo avec repère de taille" sous="Colis à côté d’un repère de taille (mètre, feuille A4)." consigne="Colis à côté d’un repère de taille (mètre, feuille A4)" nature="classe" objet={c.colisId} id={b.photoClasse?.id ?? null} heure={b.photoClasse?.heure} enFile={b.photoClasse?.enFile} prise={(p) => maj((v) => ({ ...v, photoClasse: p }))} carte />
              <div className="card acc">
                <div className="row">
                  <span className="li" style={{ border: 0, padding: 0, minHeight: 0 }}>
                    <span className="ic acc">
                      <Icone nom="ruler" taille={20} />
                    </span>
                  </span>
                  <div className="grow">
                    <div className="b8 t15">{t('Le système reclasse ce colis')}</div>
                    <div className="t13 c3 mt4">{t('L’écart est facturé au vendeur, jamais au client. Le format conseillé à l’emballage suit la nouvelle classe ; vous ne saisissez aucun montant.')}</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {erreur && (
            <div className="mt12">
              <Message ton="erreur">{erreur}</Message>
            </div>
          )}
          <Hint icone="timer">{tf('Contrôle de {de} à {a} secondes par colis, compris dans la prestation. Vous ne testez pas l’appareil : le test n’a lieu qu’en audit C4 ou à la demande de la console.', { de: regles.controleS[0], a: regles.controleS[1] })}</Hint>
          <div className="btns">
            <Link className="btn danger" to={chemin('refus', { a: arret.id, c: c.colisId })}>
              <Icone nom="package-x" taille={18} />
              <span>{t('Refuser ce colis')}</span>
            </Link>
          </div>
          <FileArret r={r} />
          {!enLigne && <Foot icone="wifi-off">{tf('Hors connexion · tournée téléchargée à {h}', { h: heure(tournee.telechargeeA, langue) })}</Foot>}
        </>
      ),
      barre: (
        <BarreAction aide={aide}>
          <button type="button" className="btn primary xl" disabled={!pret || occupe} onClick={() => void valider()}>
            <Icone nom="package" taille={18} />
            <span>{t('Emballer et sceller')}</span>
          </button>
        </BarreAction>
      ),
    }
  }

  const k = contenu()
  return (
    <Ecran proto route="controle" titre={c && r && c.etat === 'attendu' ? tf('Contrôle · colis {i} sur {n}', { i: x.rang, n: r.colis.length }) : undefined} retour={arret ? chemin('arrivee', { a: arret.id }) : undefined}>
      <Lvp>
        {k.corps}
        {k.barre}
      </Lvp>
    </Ecran>
  )
}
