// LIV-P15 · Refus au ramassage — un refus motivé n'est JAMAIS reproché au livreur (LIV-P15R-01) : motif dans une liste
// fermée de sept, photo du motif et note (REFUS-NOTE-MIN caractères au moins) obligatoires ; le vendeur reçoit « Le
// livreur n'a pas pu prendre ce colis · motif » avec la photo ; contrefaçon ou produit interdit : dossier console
// automatique (le livreur n'accuse jamais le vendeur, aucune manipulation de plus). Le colis reste chez le vendeur ;
// BelivaY confie la commande au vendeur suivant (RUPTURE-TENTATIVES) ou rembourse le client ; les colis attendus sont
// recalculés. Correction sur place (bonne variante) : retour au contrôle depuis la photo 1, refus non envoyé.
// Vendeur agressif : quitter les lieux, déclarer l'incident.
// Structure : route « refus » du prototype, en deux temps (« ?s=preuve ») : Motif · liste fermée, puis photo, note et
// message au vendeur ; refus envoyé (héros, La suite) ou dossier console (Votre conduite).
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { MotifRefus } from '../../donnees/domaines/ramassage'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import type { Photo } from '../../composants/livraison/Camera'
import { AideEtape, AvisAnnuler, useDiffere } from '../../composants/livraison/enrichi'
import { Chargement, Erreur, Message, useAgir } from '../../composants/livraison/outils'
import { BarreAction, Choix, Foot, Hint, Li, Lvp, Note, Sec } from '../../composants/proto'
import { Avancement, FileArret, HorsLigneRamassage, PhotoPreuve, RienIciProto, Suite, useRamassage } from './commun'

export const MOTIFS: { id: MotifRefus; titre: string; aide: string }[] = [
  { id: 'non_conforme', titre: 'Non conforme à la fiche', aide: 'Autre article, autre variante, quantité différente' },
  { id: 'abime', titre: 'Abîmé', aide: 'Casse, rayure, tache, emballage d’origine détérioré' },
  { id: 'contrefacon', titre: 'Contrefaçon suspectée', aide: 'Dossier ouvert automatiquement à la console' },
  { id: 'interdit', titre: 'Produit interdit', aide: 'Arme, médicament, animal vivant : refus immédiat, dossier console' },
  { id: 'controle_refuse', titre: 'Contrôle refusé par le vendeur', aide: 'Le vendeur refuse l’ouverture ou l’audit' },
  { id: 'valeur_plafond', titre: 'Valeur au-dessus du plafond', aide: 'Au-delà du plafond par colis de votre entreprise' },
  { id: 'emballage_impossible', titre: 'Emballage impossible', aide: 'Liquide ouvert, forme hors gabarit sans carton d’origine' },
]

export default function Refus() {
  const { t, tf, langue } = usePreferences()
  const naviguer = useNavigate()
  const [params, setParams] = useSearchParams()
  const x = useRamassage(['attendu', 'controle', 'audit'])
  const { agir, occupe, maintenant, enLigne } = useAgir()
  const { tournee, regles, arret, paquet, ramassage: r, colis: c } = x
  const motif = (params.get('motif') as MotifRefus | null) ?? null
  const preuve = params.get('s') === 'preuve' && !!motif
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [note, setNote] = useState('')
  const [envoye, setEnvoye] = useState<{ dossier: boolean; enFile: boolean; a: number } | null>(null)
  const [erreur, setErreur] = useState(false)
  const differe = useDiffere()
  const poser = (k: string, v: string | null) => {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v)
    else p.delete(k)
    setParams(p, { replace: k === 'motif' })
    if (k === 's') window.scrollTo(0, 0)
  }

  const envoyer = async () => {
    if (!c || !motif || !photo) return
    const res = await agir('refus', c.colisId, (o, s) => s.ramassage.refuser(c.colisId, motif, photo.id, note, o))
    if (res?.r.ok) {
      signal('succes')
      setEnvoye({ dossier: res.r.dossier, enFile: res.enFile, a: maintenant })
      x.lectureR.relire()
      window.scrollTo(0, 0)
    } else {
      signal('erreur')
      setErreur(true)
    }
  }
  const corriger = async () => {
    if (!c || !arret) return
    await agir('controle', c.colisId, (o, s) => s.ramassage.corrigerSurPlace(c.colisId, o))
    naviguer(chemin('controle', { a: arret.id, c: c.colisId }), { replace: true })
  }

  const contenu = (): { corps: ReactNode; barre?: ReactNode } => {
    if (x.lecture.erreur || x.lectureR.erreur) return { corps: <Erreur relire={() => (x.lecture.relire(), x.lectureR.relire())} /> }
    if (!x.charge || !regles) return { corps: <Chargement /> }
    if (!tournee || !arret || !r || !c) return { corps: <RienIciProto titre="Aucun colis à refuser" texte="Le refus se fait chez le vendeur, depuis le contrôle ou l’emballage d’un colis." icone="circle-x" /> }
    const fait = !!envoye || c.etat === 'refuse'
    const tete = (
      <>
        {!enLigne && <HorsLigneRamassage quoi="Le refus est enregistré sur le téléphone." />}
        <Avancement
          tournee={tournee}
          arret={arret}
          paquet={paquet}
          r={r}
          regles={regles}
          maintenant={maintenant}
          etape={null}
          courant={fait ? null : c.colisId}
          pastilles
          titre={tf('Colis {i} sur {n} · {nom}', { i: x.rang, n: r.colis.length, nom: c.article.nom })}
          sous={r.vendeur + ' · ' + r.quartier}
        />
      </>
    )
    const m = MOTIFS.find((y) => y.id === (c.refuse?.motif ?? motif))
    const restants = r.colis.filter((y) => y.etat !== 'refuse' && y.etat !== 'retire').length
    const pied = !enLigne && <Foot icone="wifi-off">{tf('Hors connexion · tournée téléchargée à {h}', { h: heure(tournee.telechargeeA, langue) })}</Foot>

    // Refus envoyé (ou enregistré hors connexion) : la suite est annoncée, le colis reste chez le vendeur.
    if (fait) {
      const dossier = envoye?.dossier ?? (c.refuse?.motif === 'contrefacon' || c.refuse?.motif === 'interdit')
      const quand = envoye?.a ?? c.refuse?.quand ?? null
      const longueur = (c.refuse?.note ?? note).trim().length
      const preuves = (
        <div className="lr-proofs">
          <span className="lr-pf ok">
            <Icone nom="camera" taille={14} />
            {t('Photo')}
          </span>
          {longueur > 0 && (
            <span className="lr-pf ok">
              <Icone nom="sticky-note" taille={14} />
              {tf('Note de {n} caractères', { n: longueur })}
            </span>
          )}
          <span className="lr-pf ok">
            <Icone nom="map-pin" taille={14} />
            {t('Position')}
          </span>
        </div>
      )
      return {
        corps: (
          <>
            {tete}
            {dossier ? (
              <div className="hero red">
                <h2 className="hk" style={{ color: '#FFB4AB' }}>
                  {t('Refus envoyé')} <span className="lr-t">· {m ? t(m.titre).toLowerCase() : ''}</span>
                </h2>
                <div className="ht">{t('Dossier ouvert automatiquement dans la console')}</div>
                <div className="hs">{t('La console instruit. Un événement grave, le veto, peut être décidé pour le vendeur : ce n’est pas à vous de trancher.')}</div>
                {preuves}
              </div>
            ) : (
              <div className="hero night">
                <h2 className="hk">
                  {envoye?.enFile ? t('Refus enregistré · en file') : t('Refus envoyé')}
                  {quand && !envoye?.enFile ? <span className="lr-t"> · {heure(quand, langue)}</span> : null}
                </h2>
                <div className="ht">{tf('Colis {i} refusé : {motif}', { i: x.rang, motif: m ? t(m.titre).toLowerCase() : '' })}</div>
                <div className="hs">
                  {envoye?.enFile
                    ? t('Le message au vendeur et les preuves partent au retour du réseau, avec l’heure et la position d’origine.')
                    : tf('{vendeur} est prévenu avec la photo. Le colis {colis} reste chez lui ; vous n’avez rien d’autre à faire.', { vendeur: r.vendeur, colis: c.colisId })}
                </div>
                {preuves}
              </div>
            )}
            {dossier ? (
              <>
                <Sec titre={t('Votre conduite')} />
                <div className="card tight">
                  <Li icone="message-circle" ton="acc" t={t('N’accusez jamais le vendeur oralement')} s={t('Dites seulement : « je ne peux pas prendre ce colis ».')} />
                  <Li icone="hand" ton="ink" t={t('Aucune manipulation supplémentaire')} s={t('Produit interdit ou suspect : vous ne le touchez plus, vous n’argumentez pas.')} />
                  <Li icone="siren" ton="red" t={t('Vendeur agressif ?')} s={t('Quittez les lieux et déclarez l’incident : la sécurité passe avant tout.')} vers={chemin('incident', { arret: arret.id })} />
                </div>
              </>
            ) : (
              <>
                <Sec titre={t('La suite')} />
                <div className="card tight">
                  <Li icone="refresh-cw" ton="acc" t={t('BelivaY confie la commande au vendeur suivant ou rembourse le client')} s={t('Vous n’avez rien à faire de plus.')} />
                  <Li icone="package" ton="or" t={t('Colis attendus recalculés')} s={restants === 0 ? t('Plus aucun colis à prendre à cet arrêt.') : restants === 1 ? t('1 colis reste à prendre à cet arrêt.') : tf('{n} colis restent à prendre à cet arrêt.', { n: restants })} />
                  <Li icone="store" ton="ink" t={t('Le colis reste chez le vendeur')} s={t('Vous ne l’emportez jamais « pour le rapporter plus tard ».')} />
                </div>
                <Note ton="red" icone="ban">
                  {t('Jamais de colis refusé accepté contre de l’argent ou une promesse, jamais de refus sans motif pour gagner du temps.')}
                </Note>
                <Hint icone="siren">
                  <Link to={chemin('incident', { arret: arret.id })} style={{ color: 'var(--red)', fontWeight: 700 }}>
                    {t('Vendeur agressif ? Quittez les lieux et déclarez l’incident')}
                  </Link>
                </Hint>
              </>
            )}
            <FileArret r={r} />
            {pied}
          </>
        ),
        barre: (
          <BarreAction>
            <Suite r={r} />
          </BarreAction>
        ),
      }
    }

    // Deuxième temps : photo du motif, note, message au vendeur.
    if (preuve && m) {
      const n = note.trim().length
      const assez = n >= regles.noteMin
      const pret = !!photo && assez
      return {
        corps: (
          <>
            {tete}
            <div className="card tight">
              <Li
                icone="package-x"
                ton="red"
                t={tf('Motif : {motif}', { motif: t(m.titre).toLowerCase() })}
                s={t(m.aide)}
                chev={false}
                droite={
                  <button type="button" className="btn ghost sm" onClick={() => poser('s', null)}>
                    {t('Changer')}
                  </button>
                }
              />
            </div>
            <Sec titre={t('Photo du motif · obligatoire')} />
            <PhotoPreuve titre="Photo du motif" sous="Ce qui motive le refus, net et en entier dans le cadre." consigne="Photo du motif du refus" nature="refus" objet={c.colisId} type="refus" id={photo?.id ?? null} heure={photo?.heure} enFile={photo?.enFile} prise={setPhoto} carte />
            <Sec titre={tf('Note · {n} caractères au moins', { n: regles.noteMin })} />
            <div className="card">
              <div className="fld" style={{ marginTop: 0 }}>
                <label htmlFor="lr-note-refus">{t('Note : ce que vous constatez, sans commentaire sur le vendeur')}</label>
                <textarea id="lr-note-refus" className="inp area" style={{ width: '100%', font: 'inherit', resize: 'vertical' }} value={note} onChange={(e) => (setNote(e.target.value), setErreur(false))} maxLength={500} />
              </div>
              <div className={'lr-cnt' + (assez ? '' : ' ko')} aria-live="polite">
                {tf(n === 1 ? '{n} caractère' : '{n} caractères', { n })} · {assez ? t('suffisant') : tf('{min} au moins', { min: regles.noteMin })}
              </div>
            </div>
            <Sec titre={t('Message envoyé au vendeur')} />
            <div className="card flat">
              <div className="t14 b7">« {tf('Le livreur n’a pas pu prendre ce colis · {motif}', { motif: t(m.titre).toLowerCase() })} »</div>
              <div className="t12 c3 mt4">{tf('Envoyé à {vendeur} avec la photo et l’heure ; la console et {entreprise} sont prévenues en même temps.', { vendeur: r.vendeur, entreprise: tournee.entreprise })}</div>
            </div>
            {motif === 'non_conforme' && (
              <div className="card tight">
                <Li icone="rotate-ccw" ton="acc" t={t('Le vendeur a la bonne variante ?')} s={t('Reprenez le contrôle depuis la photo 1 ; le refus n’est pas envoyé.')} onClick={occupe ? undefined : () => void corriger()} />
              </div>
            )}
            {erreur && (
              <div className="mt12">
                <Message ton="erreur">{t('Un refus sans photo ni note est impossible à envoyer.')}</Message>
              </div>
            )}
            <FileArret r={r} />
            {pied}
          </>
        ),
        barre: (
          <BarreAction aide={pret ? undefined : t('Motif, photo et note : les trois sont obligatoires.')}>
            <AvisAnnuler d={differe} />
            <button type="button" className="btn red xl" disabled={!pret || occupe || !!differe.attente} onClick={() => differe.lancer('Refus du colis', envoyer)}>
              <Icone nom="send" taille={18} />
              <span>{t('Envoyer le refus')}</span>
            </button>
          </BarreAction>
        ),
      }
    }

    // Premier temps : le motif, dans une liste fermée.
    return {
      corps: (
        <>
          {tete}
          <AideEtape etape="refus" />
          <Note ton="acc" icone="shield-check">
            {t('Un refus motivé ne vous est jamais reproché.')} {t('Sans photo ni note, il ne s’enregistre pas.')}
          </Note>
          <Sec titre={t('Motif · liste fermée')} />
          <div role="radiogroup" aria-label={t('Motif du refus')}>
            {MOTIFS.map((y) => (
              <Choix key={y.id} on={motif === y.id} titre={t(y.titre)} sous={t(y.aide)} onClick={() => poser('motif', y.id)} name="motif" />
            ))}
          </div>
          {pied}
        </>
      ),
      barre: (
        <BarreAction aide={motif ? undefined : t('Choisissez le motif du refus.')}>
          <button type="button" className="btn primary xl" disabled={!motif} onClick={() => poser('s', 'preuve')}>
            <Icone nom="camera" taille={18} />
            <span>{t('Continuer : photo et note')}</span>
          </button>
        </BarreAction>
      ),
    }
  }
  const k = contenu()
  return (
    <Ecran proto route="refus" titre={envoye || c?.etat === 'refuse' ? t('Refus envoyé') : t('Refuser ce colis')} retour={preuve && arret ? chemin('refus', { a: arret.id, c: c?.colisId, motif }) : undefined}>
      <Lvp>
        {k.corps}
        {k.barre}
      </Lvp>
    </Ecran>
  )
}
