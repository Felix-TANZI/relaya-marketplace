// LIV-P17 · Remise à domicile — course individuelle (un client) : le livreur voit le PRÉNOM et le quartier, le repère
// écrit tel quel et la position de remise, seulement pendant cet arrêt (effacée après la remise) ; jamais le nom ni le
// numéro (appel masqué). Le client a TOUJOURS payé en ligne avant la course : aucun paiement sur place, aucun
// argent. Remise valide ⇔ code de livraison ∧ photo (LIV-02-R094). La cliente tape son code ;
// une autre personne peut recevoir si elle a le code (son prénom est noté, jamais une pièce d'identité). Constat avant
// validation (2 photos, note) si la cliente signale un problème. Position de validation enregistrée : au-delà de
// VALIDATION-ECART-M, signalée à la console. La cliente suit le livreur en direct (position arrondie, heure estimée).
// Structure : route « domicile » du prototype (07_remises.js) — avancement compact, carte de la cliente, carte,
// colis, code de livraison, « Remis à », photo de remise, problème signalé (feuille), barre d'action ; remis.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { RemiseDomicile } from '../../donnees/domaines/remises'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useArrivee } from '../../composants/livraison/arrivee'
import type { Photo } from '../../composants/livraison/Camera'
import { CarteZone } from '../../composants/livraison/CarteZone'
import { AideDemo, BandeauModification, useArret } from '../../composants/livraison/contexte'
import { Chargement, Erreur, Message, RienIci, distanceTexte, useAgir, usePositionMission } from '../../composants/livraison/outils'
import { BarreAction, Choix, Hint, Li, Lvp, Note, Pill, Sec, SaisieCode } from '../../composants/proto'
import { AideEtape, Rebours } from '../../composants/livraison/enrichi'
import { BoutonProbleme, ContactArret, Enchainement } from '../../composants/livraison/terrain'
import { Colis, FileRemise, HorsLigneRemise, PhotoPreuve, Preuve, Prog, ResteUrgent } from './commun'

export const ETAPES_DOMICILE = ['En approche', 'Code et photo', 'Remis']

/** livRem_client : la cliente (prénom et quartier seulement), créneau, repère écrit par elle. */
function CarteCliente({ r, repere }: { r: RemiseDomicile; repere: boolean }) {
  const { t, tf, langue } = usePreferences()
  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="li" style={{ border: 0, padding: 0, minHeight: 0 }}>
          <span className="ic night" style={{ width: 48, height: 48 }}>
            <Icone nom="house" taille={22} />
          </span>
        </span>
        <div className="grow">
          <div className="kick acc">{t('Cliente · prénom et quartier')}</div>
          <h2 className="b8 mt4" style={{ fontSize: '1.3125rem', letterSpacing: '-.015em', margin: '4px 0 0' }}>
            {tf('{prenom} · {quartier}', { prenom: r.prenom, quartier: r.quartier })}
          </h2>
          <div className="t13 c3 mt4">{tf('Créneau annoncé : {de} – {a}', { de: heure(r.creneau[0], langue), a: heure(r.creneau[1], langue) })}</div>
        </div>
      </div>
      {repere && r.repere && (
        <div className="lr-rep">
          <b>{t('Repère écrit par la cliente')}</b>« {r.repere} »
        </div>
      )}
    </div>
  )
}

export default function Domicile() {
  const { t, tf, langue } = usePreferences()
  const { lecture, tournee, regles, arret, paquet } = useArret(['domicile'])
  const d = useLecture(() => (arret ? source.remises.domicile(arret.id) : Promise.resolve(null)), [arret?.id])
  const { agir, occupe, enLigne, maintenant } = useAgir()
  const gps = usePositionMission(!!arret && arret.id === tournee?.enCours)
  const { arriver, refus, feuille } = useArrivee()
  const [code, setCode] = useState('')
  const [faux, setFaux] = useState<number | null>(null)
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [params] = useSearchParams()
  // « Un problème ? » → Quelqu'un d'autre reçoit (R89) : la remise s'ouvre sur « une autre personne qui a le code ».
  const [autre, setAutre] = useState(params.get('tiers') === '1')
  const [porteur, setPorteur] = useState('')
  const [probleme, setProbleme] = useState(false)
  const [constat, setConstat] = useState<(Photo | null)[]>([null, null])
  const [note, setNote] = useState('')
  const [fait, setFait] = useState<{ ecartM: number | null } | null>(null)
  const r = d.donnees

  const valider = async () => {
    if (!arret || !photo) return
    const saisi = code
    setCode('')
    const res = await agir('domicile', arret.id, (o, s) => s.remises.livrerDomicile(arret.id, saisi, photo.id, autre ? porteur : null, o))
    if (!res) return
    if (res.r.ok) {
      signal('remiseReussie')
      setFait({ ecartM: res.r.ecartM })
    } else {
      signal('codeFaux')
      setFaux(res.r.essaisRestants ?? 0)
      d.relire()
    }
  }
  const envoyerConstat = async () => {
    if (!arret) return
    const res = await agir('domicile', arret.id, (o, s) => s.remises.constat(arret.id, constat.filter(Boolean).map((p) => p!.id), note, o))
    if (res?.r.ok) {
      signal('succes')
      setProbleme(false)
      d.relire()
    }
  }

  const contenu = () => {
    if (lecture.erreur || d.erreur) return <Erreur relire={() => (lecture.relire(), d.relire())} />
    if (!lecture.charge || !regles || (arret && !d.donnees)) return <Chargement />
    if (!tournee || !arret || !r) return <RienIci titre="Aucune remise à domicile en cours" texte="La remise à domicile s’ouvre quand elle devient l’arrêt en cours : avant, ni le prénom ni la position de la cliente ne sont servis." icone="house" />
    if (r.echec && !r.remiseA)
      return <RienIci titre="Remise impossible enregistrée" texte="La suite est décidée par le système : le dépôt au relais de la zone est dans votre tournée." icone="house" />
    const surPlace = arret.phase === 'sur_place'
    const remise = r.remiseA ?? (fait ? maintenant : null)
    const bloque = r.code.bloqueJusqua !== null && r.code.bloqueJusqua > maintenant
    const etape = remise ? 3 : !surPlace ? 0 : 1
    const prog = (
      <Prog
        k={tf('Domicile · arrêt {i} sur {n}', { i: arret.ordre, n: tournee.arrets.length })}
        titre={t('Remise à domicile')}
        sous={paquet?.id}
        n={tournee.colisSousGarde}
        sur={paquet?.colisTotal}
        etapes={ETAPES_DOMICILE.map((e) => t(e))}
        cur={etape}
      >
        <ResteUrgent limite={remise ? null : paquet?.heureLimite} maintenant={maintenant} regles={regles} toujours />
      </Prog>
    )

    // ---------- Remis ----------
    if (remise) {
      const ecart = fait?.ecartM ?? null
      return (
        <>
          {prog}
          <div className="hero acc">
            <h2 className="hk" style={{ margin: 0 }}>
              {t('Remis')}
              <span className="lr-t"> · {heure(remise, langue)}</span>
            </h2>
            <div className="row mt10" style={{ gap: 12 }}>
              <span className="ico-b">
                <Icone nom="house" taille={24} />
              </span>
              <div className="ht" style={{ margin: 0 }}>
                {tf('Colis remis à {prenom}', { prenom: r.porteur ?? r.prenom })}
              </div>
            </div>
            <div className="hs">{t('La remise est validée par le serveur : code, photo et position enregistrés. La cliente est invitée à confirmer la réception dans son application.')}</div>
            <div className="lr-proofs">
              <Preuve icone="lock-keyhole">{t('Code correct')}</Preuve>
              <Preuve icone="camera">{t('Photo')}</Preuve>
              {ecart !== null && <Preuve icone="map-pin" ko={ecart > regles.ecartRemiseM}>{tf('À {d} du repère', { d: distanceTexte(ecart, langue) })}</Preuve>}
            </div>
          </div>
          {ecart !== null && ecart > regles.ecartRemiseM && (
            <Note ton="amber" icone="map-pin">
              {tf('Validation à {d} du point de remise : signalée à la console, sans blocage.', { d: distanceTexte(ecart, langue) })}
            </Note>
          )}
          {photo && (
            <>
              <Sec titre={t('Preuve de remise')} />
              <div className="card">
                <PhotoPreuve titre="Photo de remise" sous="" consigne="" nature="remise" objet={arret.id} id={photo.id} heure={photo.heure} enFile={photo.enFile} prise={() => undefined} fige legende={t('Colis remis à la porte ; la position de validation est enregistrée.')} />
              </div>
            </>
          )}
          <Sec titre={t('Colis')} />
          <div className="card tight">
            {r.colis.map((c) => (
              <Colis key={c.id} st="ok" classe={c.classe} titre={tf('{etiquette} · classe {c}', { etiquette: c.etiquette, c: c.classe })} sous={t('Remis en main propre à la porte ; vous n’êtes pas entré.')} />
            ))}
            <div style={{ height: 8 }} />
          </div>
          <div className="card tight">
            <Li icone="eye-off" ton="acc" t={tf('L’adresse disparaît à {h}', { h: heure(remise + regles.positionClienteEffaceeMin * 60000, langue) })} s={tf('Le prénom, le quartier et la position de la cliente disparaissent {n} minutes après la remise.', { n: regles.positionClienteEffaceeMin })} />
          </div>
          <BarreAction>
            <Enchainement actif={!!fait} />
            <Link className="btn primary xl" to={chemin('tournee')}>
              <Icone nom="flag" taille={18} />
              <span>{t('Terminer la course')}</span>
            </Link>
          </BarreAction>
        </>
      )
    }

    const colis = (
      <>
        <Sec titre={t('Colis')} />
        <div className="card tight">
          {r.colis.map((c) => (
            <Colis
              key={c.id}
              classe={c.classe}
              titre={tf('{etiquette} · classe {c}', { etiquette: c.etiquette, c: c.classe })}
              sous={t('Scellé')}
              droite={
                <Pill ton="green" sm>
                  {t('Payé en ligne')}
                </Pill>
              }
            />
          ))}
          <div style={{ height: 8 }} />
        </div>
      </>
    )

    // ---------- En approche ----------
    if (!surPlace) {
      const l = arret.lieu
      return (
        <>
          {!enLigne && <HorsLigneRemise quoi="Carte, repère et consignes restent sur le téléphone." />}
          <BandeauModification tournee={tournee} />
          {prog}
          <CarteCliente r={r} repere />
          {l && (
            <div className="mt12">
              <CarteZone
                titre="Position de remise, trajet et votre position"
                trajet={tournee.trajet}
                reperes={[{ id: arret.id, ordre: arret.ordre, type: arret.type, etat: arret.etat, courant: true, lat: l.lat, lng: l.lng }]}
                position={gps.pos && Math.abs(gps.pos.lat - l.lat) < 0.2 ? gps.pos : tournee.position}
                incertitude={{ lat: l.lat, lng: l.lng, rayonM: l.precisionM }}
                cadre={[l, tournee.position]}
                hauteur={200}
              />
            </div>
          )}
          <Hint icone="eye-off">{t('Position de remise visible pendant la course seulement ; capture d’écran bloquée sur cet écran.')}</Hint>
          <div className="btns">
            <Link className="btn acc-soft" to={chemin('navigation', { a: arret.id })}>
              <Icone nom="navigation" taille={18} />
              <span>{t('Itinéraire')}</span>
            </Link>
            <BoutonProbleme arret={arret} />
          </div>
          <ContactArret a={arret} tournee={tournee} />
          <Note ton="acc" icone="shield-check">
            <b>{t('Appel masqué')}</b> : {tf('ni vous ni {prenom} ne voyez le numéro de l’autre. « Votre livreur arrive dans 10 min » lui part tout seul, selon votre position.', { prenom: r.prenom })}
          </Note>
          {colis}
          <BarreAction aide={refus ?? undefined}>
            <button type="button" className="btn primary xl" onClick={() => void arriver(arret)}>
              <Icone nom="map-pin-check" taille={18} />
              <span>{t('Je suis arrivé')}</span>
            </button>
          </BarreAction>
        </>
      )
    }

    // ---------- Code de livraison et photo ----------
    return (
      <>
        {!enLigne && <HorsLigneRemise quoi="Le code est vérifié sur le téléphone, puis confirmé par le serveur." />}
        <BandeauModification tournee={tournee} />
        {prog}
        <AideEtape etape="domicile" />
        <CarteCliente r={r} repere={false} />
        <Hint icone="circle-check">{t('Payé en ligne')} · {t('rien à recevoir : remettez avec le code et la photo.')}</Hint>
        <Sec titre={t('Code de livraison')} />
        <div className="card">
          {bloque ? (
            <>
              <Message ton="erreur">{tf('Code bloqué jusqu’à {quand} : la cliente redemande elle-même un code dans son application.', { quand: echeance(r.code.bloqueJusqua!, maintenant, langue) })}</Message>
              <div className="mt8">
                <Rebours fin={r.code.bloqueJusqua!} maintenant={maintenant} libelle={t('Déblocage dans')} icone="lock" />
              </div>
            </>
          ) : (
            <>
              <div className="t13 c3">{tf('Tendez votre téléphone à {prenom} : elle tape le code de livraison lu dans son application. Jamais une pièce d’identité à la place du code.', { prenom: r.prenom })}</div>
              <div className="mt12">
                <SaisieCode longueur={regles.codeLongueur} valeur={code} changer={(v) => (setCode(v), setFaux(null))} desactive={occupe} erreur={faux !== null && faux >= 0} libelle="Code de livraison" />
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
        {!bloque && (
          <>
            <Sec titre={t('Remis à')} />
            <div role="radiogroup" aria-label={t('Remis à')}>
              <Choix on={!autre} titre={tf('{prenom}, la cliente', { prenom: r.prenom })} sous={t('La personne qui a commandé')} onClick={() => setAutre(false)} />
              <Choix on={autre} titre={t('Une autre personne qui a le code')} sous={t('Saisissez son prénom ; jamais de pièce d’identité à la place du code')} onClick={() => setAutre(true)} />
            </div>
            {autre && (
              <label className="fld mt12" style={{ display: 'block' }}>
                <span className="b7 t13">{t('Prénom de la personne qui reçoit')}</span>
                <input className="inp" style={{ width: '100%', font: 'inherit', marginTop: 6 }} value={porteur} maxLength={40} onChange={(e) => setPorteur(e.target.value.replace(/[0-9+]/g, ''))} />
              </label>
            )}
            <Sec titre={t('Photo de remise · obligatoire')} />
            <div className="card">
              <PhotoPreuve
                titre="Photo de remise"
                sous="Colis tendu, porte d’entrée seulement."
                consigne="Photo de remise : colis tendu, porte d’entrée seulement"
                nature="remise"
                objet={arret.id}
                type="domicile"
                id={photo?.id ?? null}
                heure={photo?.heure}
                enFile={photo?.enFile}
                prise={setPhoto}
                legende={t('Colis remis à la porte ; la position de validation est enregistrée.')}
              />
            </div>
          </>
        )}
        {r.constat && (
          <Note ton="ink" icone="info">
            {t('Constat enregistré avec les photos : si la cliente refuse le colis pour ce défaut, déclarez « la cliente refuse le colis » ; sinon, continuez la remise.')}
          </Note>
        )}
        {!r.constat && (
          <div className="card tight"><Li icone="message-square-warning" ton="or" t={t('La cliente signale un problème')} s={t('Elle peut ouvrir le colis devant vous : constat avec photos avant validation.')} onClick={() => setProbleme(true)} /></div>
        )}
        <div className="btns">
          <BoutonProbleme arret={arret} />
        </div>
        <ContactArret a={arret} tournee={tournee} />
        <Note ton="acc" icone="shield-check">
          {t('Vous n’entrez pas dans le domicile et ne remettez jamais sans code, même à un client « connu ».')}
        </Note>
        <FileRemise objets={[arret.id]} />
        {!bloque && (
          <AideDemo titre="la cliente">
            {tf('{prenom} lit son code de livraison dans son application :', { prenom: r.prenom })} <code>{r.codeDemo}</code>
          </AideDemo>
        )}
        {!bloque && (
          <BarreAction aide={code.length !== regles.codeLongueur || !photo ? t('Code de la cliente et photo de remise : les deux sont obligatoires.') : autre && !porteur.trim() ? t('Notez le prénom de la personne qui reçoit.') : undefined}>
            <button type="button" className="btn primary xl" disabled={code.length !== regles.codeLongueur || !photo || (autre && !porteur.trim()) || occupe} onClick={() => void valider()}>
              <Icone nom="check" taille={18} />
              <span>{t('Valider la remise')}</span>
            </button>
          </BarreAction>
        )}
      </>
    )
  }

  const constatPret = !!constat[0] && !!constat[1] && !!regles && note.trim().length >= regles.noteMin
  return (
    <Ecran proto
      route="domicile"
      titre={r ? tf('Domicile · {prenom}', { prenom: r.prenom }) : undefined}
      fixes={
        <>
          {feuille}
          <Feuille ouverte={probleme && !!r && !r.constat} fermer={() => setProbleme(false)} titre={t('La cliente signale un problème')}>
            <Lvp className="liv07">
              <div className="lr-sheet-h">{t('La cliente signale un problème')}</div>
              <div className="t13 c3">{tf('{prenom} a ouvert le colis devant vous : c’est permis. Faites le constat avant toute validation.', { prenom: r?.prenom ?? '' })}</div>
              {[0, 1].map((i) => (
                <PhotoPreuve
                  key={i}
                  titre={i ? 'Photo 2 du défaut' : 'Photo 1 du défaut'}
                  sous="Le défaut constaté, sans la maison au-delà de la porte."
                  consigne="Photo du défaut constaté"
                  nature="constat"
                  objet={arret?.id ?? ''}
                  type="domicile"
                  id={constat[i]?.id ?? null}
                  heure={constat[i]?.heure}
                  enFile={constat[i]?.enFile}
                  verrou={i === 1 && !constat[0] ? 'Après la photo 1' : null}
                  prise={(p) => setConstat((c) => c.map((x, j) => (j === i ? p : x)))}
                />
              ))}
              <label className="fld mt12" style={{ display: 'block' }}>
                <span className="b7 t13">{t('Note : ce que vous voyez, sans commentaire sur le produit')}</span>
                <textarea className="inp area" style={{ width: '100%', minHeight: 88, font: 'inherit', marginTop: 6 }} value={note} maxLength={400} onChange={(e) => setNote(e.target.value)} />
                <span className={'lr-cnt' + (regles && note.trim().length >= regles.noteMin ? '' : ' ko')}>{tf('{n} caractères sur {min} au moins', { n: note.trim().length, min: regles?.noteMin ?? 0 })}</span>
              </label>
              <div className="mt8">
                <Li icone="undo-2" ton="or" t={tf('{prenom} refuse à cause du défaut ?', { prenom: r?.prenom ?? '' })} s={t('Vous reprenez le colis : échec « la cliente refuse le colis », litige instruit ; elle n’est pas comptée comme refus.')} />
              </div>
              <div className="btns lr-col" style={{ marginTop: 12 }}>
                <button type="button" className="btn primary xl" disabled={occupe || !constatPret} onClick={() => void envoyerConstat()}>
                  <Icone nom="camera" taille={18} />
                  <span>{t('Enregistrer le constat')}</span>
                </button>
                <button type="button" className="btn secondary" onClick={() => setProbleme(false)}>
                  <span>{t('Elle accepte le colis : continuer')}</span>
                </button>
              </div>
            </Lvp>
          </Feuille>
        </>
      }
    >
      <Lvp className="liv07">{contenu()}</Lvp>
    </Ecran>
  )
}
