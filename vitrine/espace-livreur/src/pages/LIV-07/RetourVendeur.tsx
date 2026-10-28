// LIV-P20 · Course de retour chez le vendeur — le vendeur est prévenu (« votre livreur arrive avec N colis de
// retour ») ; la boutique, les colis de retour (étiquette RT ou BV, classe, motif, pastille Retour / Renvoi) ; JAMAIS
// d'action « ouvrir ». Retour valide : code de réception du vendeur (tapé par lui sur le téléphone du livreur, masqué)
// + photo de remise (colis tendus, scellés, étiquettes visibles) ; CODE-ESSAIS puis blocage. Le livreur rappelle le
// délai d'inspection (RET-INSPECT-H) : le vendeur ouvre APRÈS la remise, jamais devant lui. Vendeur absent ou qui
// refuse : photo, ne pas discuter, relais de sa zone (la console arbitre, le refus pèse sur le vendeur) ; jamais chez le
// livreur. Le coût de la course n'est jamais montré : qui paie se décide après arbitrage, hors de l'application.
// Structure : route « retour-vendeur » du prototype (07_remises.js) — avancement compact, carte de l'arrêt, colis de
// retour, code de réception, photo de remise, « À dire au vendeur », barre d'action ; vendeur absent ou qui refuse ;
// retour remis.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { RetourVendeur as RetourT } from '../../donnees/domaines/remises'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useArrivee } from '../../composants/livraison/arrivee'
import type { Photo } from '../../composants/livraison/Camera'
import { AideDemo, BandeauModification, useArret } from '../../composants/livraison/contexte'
import { Chargement, Erreur, Message, RienIci, distanceTexte, useAgir } from '../../composants/livraison/outils'
import { BarreAction, Li, Lvp, Mini, Note, Pill, Sec, SaisieCode } from '../../composants/proto'
import { AideEtape, AvisAnnuler, Rebours, useDiffere } from '../../composants/livraison/enrichi'
import { Colis, FileRemise, Hk, HorsLigneRemise, PhotoPreuve, Preuve, Prog, ResteUrgent } from './commun'
import { Enchainement } from '../../composants/livraison/terrain'

const ETAPES_RETOUR = ['En route', 'Arrivé', 'Code et photo', 'Remis']
type Raison = 'vendeur_absent' | 'vendeur_refuse'

/** Colis de retour (C.parcel) : étiquette, motif, pastille Retour / Renvoi ; ✓ une fois remis. */
function ListeRetour({ r }: { r: RetourT }) {
  const { t } = usePreferences()
  return (
    <div className="card tight">
      {r.colis.map((c) => (
        <Colis
          key={c.id}
          st={r.remisA ? 'ok' : ''}
          classe={c.classe}
          titre={c.etiquette + ' · ' + t(c.motif).replace(/^./, (x) => x.toLowerCase())}
          sous={t(c.nature === 'retour' ? 'À inspecter par le vendeur après la remise' : 'Renvoi : article remis en stock du vendeur')}
          droite={
            <Pill ton={c.nature === 'retour' ? 'or' : 'blue'} sm>
              {t(c.nature === 'retour' ? 'Retour' : 'Renvoi')}
            </Pill>
          }
        />
      ))}
      <div style={{ height: 8 }} />
    </div>
  )
}

export default function RetourVendeur() {
  const { t, tf, langue } = usePreferences()
  const { lecture, tournee, regles, arret, paquet } = useArret(['retour'])
  const d = useLecture(() => (arret ? source.remises.retour(arret.id) : Promise.resolve(null)), [arret?.id])
  const iti = useLecture(() => (arret && arret.phase !== 'sur_place' ? source.tournee.itineraire(arret.id) : Promise.resolve(null)), [arret?.id, arret?.phase]).donnees
  const { agir, occupe, enLigne, maintenant } = useAgir()
  const { arriver, refus, feuille } = useArrivee()
  const [code, setCode] = useState('')
  const [faux, setFaux] = useState<number | null>(null)
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [raison, setRaison] = useState<Raison | null>(null)
  const [photoI, setPhotoI] = useState<Photo | null>(null)
  const r = d.donnees
  const differe = useDiffere()

  const valider = async () => {
    if (!arret || !photo) return
    const saisi = code
    setCode('')
    const res = await agir('retour', arret.id, (o, s) => s.remises.remettreRetour(arret.id, saisi, photo.id, o))
    if (res?.r.ok) signal('remiseReussie')
    else {
      signal('codeFaux')
      setFaux(res && !res.r.ok ? (res.r.essaisRestants ?? 0) : 0)
      d.relire()
    }
  }
  const declarer = async () => {
    if (!arret || !photoI || !raison) return
    const res = await agir('retour', arret.id, (o, s) => s.remises.retourImpossible(arret.id, raison, photoI.id, o))
    if (res?.r.ok) signal('alerte')
  }
  const ouvrir = (x: Raison) => {
    setPhotoI(null)
    setRaison(x)
  }

  const contenu = () => {
    if (lecture.erreur || d.erreur) return <Erreur relire={() => (lecture.relire(), d.relire())} />
    if (!lecture.charge || !regles || (arret && !r)) return <Chargement />
    if (!tournee || !arret || !r) return <RienIci titre="Aucune course de retour en cours" texte="Le retour au vendeur s’ouvre quand c’est l’arrêt en cours de votre tournée." icone="undo-2" />
    const surPlace = arret.phase === 'sur_place'
    const echec = r.impossible?.raison ?? raison
    const etape = r.remisA ? 4 : echec ? 1 : surPlace ? 2 : 0
    const prog = (
      <Prog
        k={tf('Retour vendeur · arrêt {i} sur {n}', { i: arret.ordre, n: tournee.arrets.length })}
        titre={r.vendeur + ' · ' + r.quartier}
        sous={paquet?.id}
        n={tournee.colisSousGarde}
        sur={paquet?.colisTotal}
        etapes={ETAPES_RETOUR.map((e) => t(e))}
        cur={etape}
      >
        <ResteUrgent limite={r.remisA || r.impossible ? null : paquet?.heureLimite} maintenant={maintenant} regles={regles} />
      </Prog>
    )
    const premier = r.colis.find((c) => c.nature === 'retour')?.etiquette ?? r.colis[0]?.etiquette ?? ''

    // ---------- Retour remis ----------
    if (r.remisA)
      return (
        <>
          {prog}
          <div className="hero acc">
            <h2 className="hk" style={{ margin: 0 }}>
              {t('Retourné au vendeur')}
              <span className="lr-t"> · {heure(r.remisA, langue)}</span>
            </h2>
            <div className="row mt10" style={{ gap: 12 }}>
              <span className="ico-b">
                <Icone nom="store" taille={24} />
              </span>
              <div className="ht" style={{ margin: 0 }}>
                {r.colis.length === 1 ? tf('1 colis remis à {vendeur}', { vendeur: r.vendeur }) : tf('{n} colis remis à {vendeur}', { n: r.colis.length, vendeur: r.vendeur })}
              </div>
            </div>
            <div className="hs">{t('Code du vendeur, photo et heure enregistrés. La garde est au vendeur.')}</div>
            <div className="lr-proofs">
              <Preuve icone="lock-keyhole">{t('Code du vendeur')}</Preuve>
              <Preuve icone="camera">{t('Photo')}</Preuve>
              <Preuve icone="clock">{heure(r.remisA, langue)}</Preuve>
            </div>
          </div>
          <ListeRetour r={r} />
          <Note ton="acc" icone="info">
            {tf('Le vendeur ouvre {etiquette} après votre départ ; il a {n} heures pour l’inspecter dans son application.', { etiquette: premier, n: regles.inspectionRetourH })}
          </Note>
          <BarreAction>
            <Enchainement />
            <Link className="btn primary xl" to={chemin('tournee')}>
              <Icone nom="flag" taille={18} />
              <span>{t('Terminer le paquet')}</span>
            </Link>
          </BarreAction>
        </>
      )

    // ---------- Vendeur absent, ou qui refuse le retour ----------
    if (echec) {
      const abs = echec === 'vendeur_absent'
      const fait = r.impossible
      return (
        <>
          {prog}
          <div className={'hero ' + (abs ? 'amber' : 'red')}>
            <Hk couleur={abs ? '#FFD98A' : '#FFB4AB'} quand={fait ? heure(fait.quand, langue) : undefined}>
              {t(abs ? 'Vendeur absent' : 'Retour refusé par le vendeur')}
            </Hk>
            <div className="ht">{abs ? tf('La boutique {vendeur} est fermée', { vendeur: r.vendeur }) : t('Ne discutez pas')}</div>
            <div className="hs">{t(abs ? 'Photographiez la devanture. Les colis ne restent jamais chez vous : la suite est prévue.' : 'Photographiez les colis tendus. Rapportez-les au relais de la zone ; la console arbitre et le refus pèse sur le vendeur.')}</div>
          </div>
          {!fait && (
            <div className="card">
              <PhotoPreuve
                titre={abs ? 'Photo de la devanture' : 'Photo de preuve'}
                sous={abs ? 'Devanture fermée, enseigne visible.' : 'Colis tendus au vendeur, scellés, étiquettes visibles.'}
                consigne={abs ? 'Devanture fermée, enseigne visible' : 'Devanture, ou colis tendu au vendeur'}
                nature="retour_impossible"
                objet={arret.id}
                type="echec"
                id={photoI?.id ?? null}
                heure={photoI?.heure}
                enFile={photoI?.enFile}
                prise={setPhotoI}
              />
            </div>
          )}
          <Sec titre={t('Suite prévue')} />
          <div className="card tight">
            <Li icone="store" ton="acc" t={fait ? tf('Retour au {relais}', { relais: fait.relais }) : t('Retour au relais de la zone du vendeur')} s={t('Désigné par le système, ajouté à votre tournée · dépôt avec scan.')} />
            <Li icone="calendar" ton="or" t={t(abs ? 'Nouvelle course programmée' : 'Arbitrage par la console')} s={t(abs ? 'Au prochain jour de service.' : 'Vous n’avez rien à décider ni à expliquer.')} />
            <Li icone="house" ton="ink" t={t('Jamais chez vous')} s={tf('Seuls le relais de la zone ou le point de stockage de {entreprise} gardent un colis.', { entreprise: tournee.entreprise })} />
          </div>
          <ListeRetour r={r} />
          {!abs && (
            <Note ton="ink" icone="hand">
              {tf('Le vendeur veut ouvrir le colis devant vous ? Refus poli : il l’ouvre après la remise, avec {n} heures pour inspecter.', { n: regles.inspectionRetourH })}
            </Note>
          )}
          <FileRemise objets={[arret.id]} />
          {fait ? (
            <BarreAction>
              <Enchainement />
              <Link className="btn primary xl" to={chemin('tournee')}>
                <Icone nom="navigation" taille={18} />
                <span>{tf('Aller au {relais}', { relais: fait.relais })}</span>
              </Link>
            </BarreAction>
          ) : (
            <BarreAction aide={!photoI ? t('La photo est exigée avant de rapporter les colis.') : undefined}>
              <AvisAnnuler d={differe} />
              <button type="button" className="btn primary xl" disabled={!photoI || occupe || !!differe.attente} onClick={() => differe.lancer('Retour impossible déclaré', declarer)}>
                <Icone nom="navigation" taille={18} />
                <span>{t('Rapporter au relais de la zone')}</span>
              </button>
              <button type="button" className="btn ghost mt8" style={{ width: '100%' }} onClick={() => (differe.annuler(), setRaison(null))}>
                <span>{t('Le vendeur est là : revenir au retour')}</span>
              </button>
            </BarreAction>
          )}
        </>
      )
    }

    // ---------- En route ----------
    if (!surPlace)
      return (
        <>
          {!enLigne && <HorsLigneRemise quoi="Les confirmations de la collecte attendent le réseau." />}
          <BandeauModification tournee={tournee} />
          {prog}
          <div className="card acc" style={{ padding: 16 }}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <span className="li" style={{ border: 0, padding: 0, minHeight: 0 }}>
                <span className="ic or" style={{ width: 46, height: 46 }}>
                  <Icone nom="store" taille={22} />
                </span>
              </span>
              <div className="grow">
                <h2 className="b8 t19" style={{ margin: 0 }}>
                  {r.vendeur}
                </h2>
                <div className="t13 c3 mt4">
                  {r.quartier}
                  {r.repere ? ' · ' : ''}
                  {r.repere && <q>{r.repere}</q>}
                </div>
              </div>
            </div>
            <div className="split3 mt12">
              <Mini k={t('Distance')} v={iti ? distanceTexte(iti.distanceM, langue) : '—'} />
              <Mini k={t('Colis')} v={r.colis.length + ' · ' + r.colis.map((c) => c.classe).join(' ')} />
              <Mini k={t('Prévenu')} v={r.preavisA ? heure(r.preavisA, langue) : '—'} />
            </div>
            <div className="btns" style={{ marginTop: 14 }}>
              <Link className="btn acc-soft" to={chemin('navigation', { a: arret.id })}>
                <Icone nom="navigation" taille={18} />
                <span>{t('Itinéraire')}</span>
              </Link>
              <Link className="btn danger" to={chemin('incident', { arret: arret.id })}>
                <Icone nom="triangle-alert" taille={18} />
                <span>{t('Un problème ici ?')}</span>
              </Link>
            </div>
          </div>
          <Sec titre={t('Colis de retour')} />
          <ListeRetour r={r} />
          {r.preavisA && (
            <Note ton="acc" icone="bell-ring">
              {tf('{vendeur} a été prévenu à {h} : « votre livreur arrive avec {n} colis de retour ».', { vendeur: r.vendeur, h: heure(r.preavisA, langue), n: r.colis.length })}
            </Note>
          )}
          <FileRemise objets={[arret.id]} />
          <BarreAction aide={refus ?? undefined}>
            <button type="button" className="btn primary xl" onClick={() => void arriver(arret)}>
              <Icone nom="map-pin-check" taille={18} />
              <span>{t('Je suis arrivé')}</span>
            </button>
          </BarreAction>
        </>
      )

    // ---------- Sur place : code de réception et photo ----------
    const bloque = r.code.bloqueJusqua !== null && r.code.bloqueJusqua > maintenant
    return (
      <>
        {!enLigne && <HorsLigneRemise quoi="Le code est vérifié sur le téléphone, puis confirmé par le serveur." />}
        <BandeauModification tournee={tournee} />
        {prog}
        <AideEtape etape="retour" />
        <ListeRetour r={r} />
        <Sec titre={t('Code de réception du vendeur')} />
        <div className="card">
          {bloque ? (
            <>
              <Message ton="erreur">{tf('Code bloqué jusqu’à {quand} : un incident est ouvert, le vendeur redemande un code.', { quand: echeance(r.code.bloqueJusqua!, maintenant, langue) })}</Message>
              <div className="mt8">
                <Rebours fin={r.code.bloqueJusqua!} maintenant={maintenant} libelle={t('Déblocage dans')} icone="lock" />
              </div>
            </>
          ) : (
            <>
              <div className="t13 c3">{tf('{vendeur} saisit son code de réception à {n} chiffres sur votre téléphone, ou vous le dicte.', { vendeur: r.vendeur, n: regles.codeLongueur })}</div>
              <div className="mt12">
                <SaisieCode longueur={regles.codeLongueur} valeur={code} changer={(v) => (setCode(v), setFaux(null))} desactive={occupe} erreur={faux !== null} libelle="Code de réception" />
              </div>
              {faux !== null ? (
                <div className="lr-cnt ko" role="alert">
                  {faux === 1 ? t('Code incorrect · 1 essai restant. Réessayez.') : tf('Code incorrect · {n} essais restants. Réessayez.', { n: faux })}
                </div>
              ) : (
                code.length === regles.codeLongueur && <div className="lr-cnt">{t('Code saisi · vérifié à la validation')}</div>
              )}
            </>
          )}
        </div>
        <Sec titre={t('Photo de remise au vendeur')} />
        <div className="card">
          <PhotoPreuve
            titre="Photo de remise"
            sous="Les colis tendus au vendeur, scellés, étiquettes visibles."
            consigne="Colis de retour tendus, scellés, étiquettes visibles"
            nature="retour"
            objet={arret.id}
            type="depot"
            id={photo?.id ?? null}
            heure={photo?.heure}
            enFile={photo?.enFile}
            prise={setPhoto}
            legende={tf('Les {n} colis tendus au vendeur, scellés, étiquettes visibles.', { n: r.colis.length })}
          />
        </div>
        <div className="card acc">
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <span className="li" style={{ border: 0, padding: 0, minHeight: 0 }}>
              <span className="ic acc">
                <Icone nom="timer" taille={20} />
              </span>
            </span>
            <div className="grow">
              <div className="b8 t15">{t('À dire au vendeur')}</div>
              <div className="t13 c3 mt4">« {tf('Vous avez {n} heures pour inspecter {etiquette} dans votre application. Ouvrez-le après la remise.', { n: regles.inspectionRetourH, etiquette: premier })} »</div>
            </div>
          </div>
        </div>
        <Note ton="red" icone="ban">
          {t('Ne remettez jamais un retour sans le code du vendeur, et n’acceptez aucun paiement pour le retour. Les scellés ne s’ouvrent jamais devant vous.')}
        </Note>
        <Sec titre={t('Un problème ici ?')} />
        <div className="chips">
          <button type="button" className="chip" onClick={() => ouvrir('vendeur_absent')}>
            <Icone nom="door-open" taille={15} />
            {t('Vendeur absent')}
          </button>
          <button type="button" className="chip" onClick={() => ouvrir('vendeur_refuse')}>
            <Icone nom="ban" taille={15} />
            {t('Le vendeur refuse le retour')}
          </button>
          <Link className="chip" to={chemin('incident', { arret: arret.id })}>
            <Icone nom="triangle-alert" taille={15} />
            {t('Autre incident')}
          </Link>
          <Link className="chip" to={chemin('appel', { avec: 'vendeur', a: arret.id })}>
            <Icone nom="phone" taille={15} />
            {t('Appeler · numéro masqué')}
          </Link>
        </div>
        <FileRemise objets={[arret.id]} />
        {!bloque && (
          <AideDemo titre="le vendeur">
            {tf('{vendeur} lit son code de réception :', { vendeur: r.vendeur })} <code>{r.codeDemo}</code>
          </AideDemo>
        )}
        <BarreAction aide={bloque ? undefined : code.length !== regles.codeLongueur ? t('Le code du vendeur et la photo de remise sont exigés.') : !photo ? t('La photo de remise est exigée.') : undefined}>
          {bloque ? (
            <button type="button" className="btn primary xl" onClick={() => ouvrir('vendeur_absent')}>
              <Icone nom="navigation" taille={18} />
              <span>{t('Rapporter au relais de la zone')}</span>
            </button>
          ) : (
            <button type="button" className="btn primary xl" disabled={code.length !== regles.codeLongueur || !photo || occupe} onClick={() => void valider()}>
              <Icone nom="check" taille={18} />
              <span>{t('Valider le retour')}</span>
            </button>
          )}
        </BarreAction>
      </>
    )
  }

  return (
    <Ecran proto route="retour-vendeur" titre={r ? tf('Retour · {vendeur}', { vendeur: r.vendeur }) : undefined} fixes={feuille}>
      <Lvp className="liv07">{contenu()}</Lvp>
    </Ecran>
  )
}
