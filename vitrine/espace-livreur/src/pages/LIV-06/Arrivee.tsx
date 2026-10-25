// LIV-P10 · Arrivée chez le vendeur — à l'appui sur « Je suis arrivé », position et heure enregistrées, et le vendeur
// reçoit « Votre livreur est là » avec la PHOTO VÉRIFIÉE du livreur : c'est la seule identification valable, il ne
// remettra son code qu'à ce visage (LIV-P10R-01, LIV-PRV-02 ; aucun QR chez le vendeur). Le livreur montre son écran
// (nom, photo, entreprise, véhicule), vérifie la liste des articles telle que la fiche les décrit (jamais un prix) et
// commence le contrôle. Attente (« ?s=attente ») : compteur jusqu'à ATTENTE-VENDEUR-MIN ; relance ; « vendeur pas prêt »
// possible seulement ensuite (le système décide du repassage ou de la dissociation, le livreur ne choisit rien).
// Boutique fermée (« ?s=ferme ») : photo de la devanture et note obligatoires, incident validé par l'entreprise
// (événement pour le vendeur, aucun pour le livreur). Aucun colis hors système ; jamais son numéro personnel.
// Structure : route « arrivee » du prototype (livRam_prog, héros « Montrez votre écran », « À ramasser ici », barre du bas).
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { useArrivee } from '../../composants/livraison/arrivee'
import type { Photo } from '../../composants/livraison/Camera'
import { BandeauModification } from '../../composants/livraison/contexte'
import { AideEtape, Rebours } from '../../composants/livraison/enrichi'
import { Chargement, Erreur, Message, RienIci, chrono, useAgir } from '../../composants/livraison/outils'
import { BarreAction, Foot, Hint, Li, Lvp, Note, Pill, Sec } from '../../composants/proto'
import { Anneau, Articles, Avancement, FileArret, HorsLigneRamassage, PhotoPreuve, commandes, rangArret, suite, useRamassage } from './commun'
import { BoutonProbleme, ContactArret } from '../../composants/livraison/terrain'
import { Camera } from '../../composants/livraison/Camera'
import type { ControleColis, Ramassage } from '../../donnees/domaines/ramassage'

export default function Arrivee() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const naviguer = useNavigate()
  const [params, setParams] = useSearchParams()
  const x = useRamassage()
  const { agir, occupe, maintenant, enLigne } = useAgir()
  const { arriver, refus: refusArrivee, feuille } = useArrivee()
  const [pasPret, setPasPret] = useState(false)
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState<{ ton: 'ok' | 'erreur' | 'alerte'; texte: string } | null>(null)
  const { tournee, regles, arret, paquet, ramassage: r } = x
  const etat = params.get('s')
  const aller = (v: string | null) => {
    const p = new URLSearchParams(params)
    if (v) p.set('s', v)
    else p.delete('s')
    setMsg(null)
    setParams(p)
    window.scrollTo(0, 0)
  }
  const entreprise = s.livreur?.entreprise ?? ''

  const relancer = async () => {
    if (!arret) return
    const res = await agir('arrivee', arret.id, (o, s) => s.ramassage.relancer(arret.id, o))
    if (res?.r.ok) {
      signal('succes')
      setMsg({ ton: 'ok', texte: tf('{vendeur} est relancé par l’application.', { vendeur: r?.vendeur ?? '' }) })
    } else setMsg({ ton: 'alerte', texte: t('Le vendeur a déjà été relancé : attendez sa réponse.') })
  }
  const declarerPasPret = async () => {
    if (!arret) return
    const res = await agir('incident', arret.id, (o, s) => s.ramassage.pasPret(arret.id, o))
    if (res?.r.ok) {
      signal('succes')
      naviguer(chemin('tournee'))
    } else {
      signal('erreur')
      setPasPret(false)
      setMsg({ ton: 'erreur', texte: res && !res.r.ok && res.r.raison === 'trop_tot' && 'possibleA' in res.r && res.r.possibleA ? tf('Possible à partir de {h}.', { h: heure(res.r.possibleA, langue) }) : t('La déclaration n’a pas pu partir. Réessayez.') })
    }
  }
  const envoyerFermee = async () => {
    if (!arret || !photo) return
    const res = await agir('incident', arret.id, (o, s) => s.ramassage.boutiqueFermee(arret.id, photo.id, note, o))
    if (res?.r.ok) {
      signal('succes')
      naviguer(chemin('tournee'))
    } else {
      signal('erreur')
      setMsg({ ton: 'erreur', texte: t('L’incident n’a pas pu partir. Réessayez.') })
    }
  }

  const contenu = (): { corps: ReactNode; barre?: ReactNode } => {
    if (x.lecture.erreur || x.lectureR.erreur) return { corps: <Erreur relire={() => (x.lecture.relire(), x.lectureR.relire())} /> }
    if (!x.charge || !regles) return { corps: <Chargement /> }
    if (!tournee || !arret || !r) return { corps: <RienIci titre="Aucun ramassage en cours" texte="L’arrivée chez un vendeur s’ouvre depuis l’arrêt en cours de la tournée." icone="store" /> }
    if (arret.etat !== 'en_cours')
      return { corps: <RienIci titre={arret.etat === 'fait' ? 'Ramassage terminé' : 'Ramassage arrêté'} texte={arret.etat === 'fait' ? 'Les colis de cet arrêt sont sous votre responsabilité. La tournée continue.' : 'Cet arrêt attend la décision de votre entreprise ou a été retiré par le système.'} icone="store" /> }
    const surPlace = arret.phase === 'sur_place' && arret.arriveeA !== null
    const ecoule = surPlace ? maintenant - arret.arriveeA! : 0
    const max = regles.attenteVendeurMin * 60000
    const possibleA = (arret.arriveeA ?? maintenant) + max
    const plein = ecoule >= max
    const nColis = r.colis.length
    const nCmd = commandes(r)
    const tete = (
      <>
        {!enLigne && <HorsLigneRamassage quoi="Votre arrivée est enregistrée sur le téléphone." />}
        <BandeauModification tournee={tournee} />
        <Avancement tournee={tournee} arret={arret} paquet={paquet} r={r} regles={regles} maintenant={maintenant} etape={arret.etape <= 1 ? 0 : arret.etape} />
        <AideEtape etape="arrivee" />
      </>
    )
    const message = msg && (
      <div className="mt12">
        <Message ton={msg.ton}>{msg.texte}</Message>
      </div>
    )

    // Boutique fermée : photo de la devanture et note obligatoires ; l'entreprise valide, le système dissocie l'arrêt.
    if (surPlace && etat === 'ferme') {
      const restants = r.colis.filter((c) => c.etat !== 'refuse' && c.etat !== 'retire').length
      const total = paquet?.colisTotal ?? 0
      const n = note.trim().length
      const assez = n >= regles.noteMin
      return {
        corps: (
          <>
            {tete}
            <div className="hero red">
              <div className="hk" style={{ color: '#FFB4AB' }}>
                {t('Incident · boutique fermée')}
              </div>
              <div className="ht">{tf('{vendeur} est fermée à votre passage', { vendeur: r.vendeur })}</div>
              <div className="hs">{t('Elle n’était pas déclarée fermée. La photo de la devanture est obligatoire : sans elle, l’incident ne part pas.')}</div>
            </div>
            <Sec titre={t('Preuve')} />
            <div className="card">
              <PhotoPreuve
                titre="Photo de la devanture"
                sous="Devanture fermée, enseigne visible : prise avec l’appareil photo de l’application."
                consigne="Devanture fermée, enseigne visible"
                nature="devanture"
                objet={arret.id}
                type="incident"
                id={photo?.id ?? null}
                heure={photo?.heure}
                enFile={photo?.enFile}
                prise={setPhoto}
              />
              <div className="fld">
                <label htmlFor="lr-note-fermee">{tf('Note · {n} caractères au moins', { n: regles.noteMin })}</label>
                <textarea id="lr-note-fermee" className="inp area" style={{ width: '100%', font: 'inherit', resize: 'vertical' }} value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} placeholder={t('Ce que vous constatez : rideau baissé, affiche, personne sur place…')} />
                <div className={'lr-cnt' + (assez ? '' : ' ko')} aria-live="polite">
                  {tf(n === 1 ? '{n} caractère' : '{n} caractères', { n })} · {assez ? t('suffisant') : tf('{min} au moins', { min: regles.noteMin })}
                </div>
              </div>
            </div>
            <Sec titre={t('Ce qui va se passer')} />
            <div className="card tight">
              <Li icone="building-2" ton="acc" t={tf('{entreprise} valide l’incident', { entreprise })} s={t('Le système dissocie l’arrêt ; vous ne dissociez rien.')} />
              {paquet && <Li icone="package" ton="or" t={tf('Colis attendus : {a} → {b}', { a: total, b: Math.max(0, total - restants) })} s={t('Les autres colis du paquet restent à livrer, dans l’ordre imposé.')} />}
              <Li icone="gauge" ton="ink" t={t('Scores')} s={tf('{vendeur} : événement de ponctualité. Vous : aucun événement.', { vendeur: r.vendeur })} />
            </div>
            {message}
            <FileArret r={r} />
          </>
        ),
        barre: (
          <BarreAction aide={!photo ? t('La photo de la devanture est obligatoire.') : !assez ? tf('Note : {min} caractères au moins.', { min: regles.noteMin }) : undefined}>
            <button type="button" className="btn red xl" disabled={occupe || !photo || !assez} onClick={() => void envoyerFermee()}>
              <Icone nom="send" taille={18} />
              <span>{t('Envoyer l’incident')}</span>
            </button>
          </BarreAction>
        ),
      }
    }

    // Le vendeur n'est pas prêt : attente plafonnée, relance, déclaration possible seulement ensuite.
    if (surPlace && etat === 'attente') {
      return {
        corps: (
          <>
            {tete}
            <div className="hero amber">
              <div className="hk" style={{ color: '#FFD98A' }}>
                {t('Le vendeur n’est pas prêt')}
              </div>
              <div className="lr-wait mt12">
                <Anneau v={Math.min(ecoule, max)} max={max} couleur={plein ? '#FF8A80' : '#FFC845'} taille={92} libelle={chrono(Math.min(ecoule, max))} />
                <div className="grow">
                  <div className="ht" style={{ margin: 0 }}>
                    {plein ? tf('{n} minutes écoulées', { n: regles.attenteVendeurMin }) : tf('Sur place depuis {m} min {s} s', { m: Math.floor(ecoule / 60000), s: Math.floor((ecoule % 60000) / 1000) })}
                  </div>
                  <div className="hs">
                    {plein
                      ? tf('Attente maximale atteinte à {h}. Déclarez « vendeur pas prêt » pour poursuivre.', { h: heure(possibleA, langue) })
                      : tf('Attente maximale : {n} minutes. À {h}, vous pourrez déclarer « vendeur pas prêt » et poursuivre.', { n: regles.attenteVendeurMin, h: heure(possibleA, langue) })}
                  </div>
                </div>
              </div>
              <div className="btns" style={{ marginTop: 14 }}>
                <button type="button" className="btn white" disabled={occupe || !!r.relanceA} onClick={() => void relancer()}>
                  <Icone nom="bell-ring" taille={18} />
                  <span>{r.relanceA ? tf('Relancé à {h}', { h: heure(r.relanceA, langue) }) : t('Relancer le vendeur')}</span>
                </button>
              </div>
              {r.relanceA && (
                <div className="t12 mt8" style={{ color: 'rgba(255,255,255,.78)' }}>
                  {tf('Dernière relance envoyée à {h} par l’application.', { h: heure(r.relanceA, langue) })}
                </div>
              )}
            </div>
            {message}
            <div className="card">
              <button type="button" className="btn secondary" style={{ width: '100%' }} disabled={!plein} onClick={() => setPasPret(true)}>
                <Icone nom="hourglass" taille={18} />
                <span>{t('Déclarer « vendeur pas prêt »')}</span>
              </button>
              {!plein && (
                <Hint icone="lock">
                  {tf('Possible à partir de {h}, quand les {n} minutes sont écoulées.', { h: heure(possibleA, langue), n: regles.attenteVendeurMin })} <Rebours fin={possibleA} maintenant={maintenant} libelle={t('encore')} />
                </Hint>
              )}
            </div>
            <Note ton="ink" icone="info">
              {t('Le vendeur annonce encore 20 minutes ?')} <b>{t('Vous ne choisissez pas')}</b> {t(': le système relance le vendeur et décide du repassage dans la tournée ou de la dissociation de l’arrêt.')}
            </Note>
            <Note ton="red" icone="ban">
              {tf('N’attendez jamais au-delà de {n} minutes sans le déclarer.', { n: regles.attenteVendeurMin })}
            </Note>
            <Sec titre={tf('À ramasser ici · {n} colis', { n: nColis })} />
            <Articles r={r} enPlace={arret.phase === 'sur_place'} />
            <FileArret r={r} />
          </>
        ),
        barre: (
          <BarreAction>
            <button type="button" className="btn primary xl" onClick={() => aller(null)}>
              <Icone nom="package-check" taille={18} />
              <span>{t('Le vendeur est prêt : récupérer')}</span>
            </button>
          </BarreAction>
        ),
      }
    }

    // Arrivé (ou pas encore : « Je suis arrivé ») : montrez votre écran, articles attendus, commencer le contrôle.
    const nom = s.livreur ? s.livreur.prenom + ' ' + s.livreur.nom : ''
    return {
      corps: (
        <>
          {tete}
          <div className="hero night">
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 6 }}>
              <span className="hk">
                {surPlace ? t('Arrivé') : t('Créneau annoncé')}{' '}
                <span className="lr-t">{surPlace ? tf('à {h}', { h: heure(arret.arriveeA!, langue) }) : heure(r.creneau[0], langue) + ' – ' + heure(r.creneau[1], langue)}</span>
              </span>
              {surPlace && (
                <span aria-label={tf('Attente : {t} sur {max} minutes', { t: chrono(ecoule), max: regles.attenteVendeurMin })}>
                  <Pill ton="dk" icone="timer">
                    {tf('{t} sur {max}', { t: chrono(Math.min(ecoule, max)), max: chrono(max) })}
                  </Pill>
                </span>
              )}
            </div>
            <div className="lr-av mt14">
              <span style={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', flexShrink: 0, alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 3px rgba(255,255,255,.22)', background: 'var(--acc-btn)', color: 'var(--acc-btn-ink)', fontWeight: 800 }}>
                {s.livreur?.photo ? <img src={s.livreur.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.livreur?.initiales}
              </span>
              <div className="grow">
                <div className="nm" style={{ fontSize: '1.1875rem' }}>
                  {t('Montrez votre écran')}
                </div>
                <div className="ss2">{tf('{vendeur} voit votre nom et votre photo dans son application : c’est la seule identification valable.', { vendeur: r.vendeur })}</div>
              </div>
            </div>
            <div className="hline" />
            <div className="lr-kv" style={{ marginTop: 0 }}>
              <span className="k">{t('Livreur')}</span>
              <span className="v">{nom}</span>
              <span className="k">{t('Entreprise')}</span>
              <span className="v">{entreprise}</span>
              <span className="k">{t('Véhicule')}</span>
              <span className="v">{s.livreur?.vehicule}</span>
            </div>
            <div className="hline" />
            <div className="row t13" style={{ gap: 10, alignItems: 'flex-start', color: 'rgba(255,255,255,.88)' }}>
              <Icone nom={surPlace ? (enLigne ? 'bell-ring' : 'cloud-upload') : 'map-pin'} taille={18} style={{ color: 'var(--n-k)', flexShrink: 0 }} />
              <span>
                {!surPlace
                  ? t('À votre arrivée, appuyez sur « Je suis arrivé » : le vendeur reçoit « Votre livreur est là » avec votre photo.')
                  : enLigne
                    ? tf('« Votre livreur est là » envoyé à {vendeur} avec votre photo à {h}.', { vendeur: r.vendeur, h: heure(arret.arriveeA!, langue) })
                    : tf('Notification « Votre livreur est là » en file : elle part au retour du réseau. Votre photo est déjà chez {vendeur} depuis l’affectation.', { vendeur: r.vendeur })}
              </span>
            </div>
          </div>
          {refusArrivee && (
            <div className="mt12">
              <Message ton="erreur">{refusArrivee}</Message>
            </div>
          )}
          {surPlace ? (
            <Recuperation r={r} relire={x.lectureR.relire} />
          ) : (
            <>
              <Sec titre={t('À ramasser ici')} droite={(nCmd === 1 ? t('1 commande') : tf('{n} commandes', { n: nCmd })) + ' · ' + (nColis === 1 ? t('1 colis') : tf('{n} colis', { n: nColis }))} />
              <Articles r={r} enPlace={arret.phase === 'sur_place'} />
            </>
          )}
          <Note ton="acc" icone="package-check">
            {nCmd === 1 ? t('Seul ce qui est dans cette commande part avec vous.') : tf('Seul ce qui est dans ces {n} commandes part avec vous.', { n: nCmd })} {t('Un article en plus, même offert par le vendeur, reste en boutique :')} <b>{t('aucun colis hors système')}</b>.
          </Note>
          {message}
          {surPlace && <ContactArret a={arret} tournee={tournee} enfant={<BoutonProbleme arret={arret} />} />}
          <Note ton="ink" icone="eye-off">
            {t('Ne donnez jamais votre numéro au vendeur : tout passe par l’application et l’appel masqué.')} {t('Présentez-vous par votre prénom ; aucun commentaire sur le produit ni sur le prix.')}
          </Note>
          <FileArret r={r} />
          {!enLigne && <Foot icone="wifi-off">{tf('Hors connexion · tournée téléchargée à {h}', { h: heure(tournee.telechargeeA, langue) })}</Foot>}
        </>
      ),
      barre: (
        <BarreAction>
          {surPlace ? (
            <ToutRecupere r={r} />
          ) : (
            <button type="button" className="btn primary xl" onClick={() => void arriver(arret)}>
              <Icone nom="map-pin-check" taille={18} />
              <span>{t('Je suis arrivé')}</span>
            </button>
          )}
        </BarreAction>
      ),
    }
  }

  const c = contenu()
  const suivant = tournee && arret ? rangArret(tournee, arret).i + 1 : 0
  return (
    <Ecran proto
      route="arrivee"
      titre={r ? tf('Arrivée · {vendeur}', { vendeur: r.vendeur }) : undefined}
      fixes={
        <>
          {feuille}
          <Feuille ouverte={pasPret} fermer={() => setPasPret(false)} titre={t('Déclarer « vendeur pas prêt »')}>
            <Lvp>
              <div className="lr-sheet-h">{t('Déclarer « vendeur pas prêt »')}</div>
              <div className="t13 c3">{t('Ce qui se passe avant que vous confirmiez :')}</div>
              <div className="mt8">
                <Li icone="bell-ring" ton="or" t={tf('{vendeur} et {entreprise} sont prévenus', { vendeur: r?.vendeur ?? '', entreprise })} s={t('Le système relance le vendeur.')} />
                <Li icone="route" ton="acc" t={t('Le système décide de la suite')} s={t('Repassage dans la tournée ou dissociation de l’arrêt.') + (suivant > 1 ? ' ' + tf('Vous poursuivez vers l’arrêt {n}.', { n: suivant }) : '')} />
                <Li icone="gauge" ton="ink" t={t('Aucun effet sur votre Trust Score')} s={t('Pour le vendeur, l’effet suit son barème de ponctualité.')} />
              </div>
              <div className="btns lr-col" style={{ marginTop: 14 }}>
                <button type="button" className="btn primary xl" disabled={occupe} onClick={() => void declarerPasPret()}>
                  <Icone nom="send" taille={18} />
                  <span>{t('Déclarer et poursuivre la tournée')}</span>
                </button>
                {arret && (
                  <Link className="btn secondary" to={chemin('controle', { a: arret.id })}>
                    <Icone nom="clipboard-check" taille={18} />
                    <span>{t('Le vendeur est prêt finalement')}</span>
                  </Link>
                )}
              </div>
            </Lvp>
          </Feuille>
        </>
      }
    >
      <Lvp>
        {c.corps}
        {c.barre}
      </Lvp>
    </Ecran>
  )
}

/** Colis de l'arrêt encore attendus (ni refusés ni retirés). */
const aPrendre = (r: Ramassage) => r.colis.filter((c) => c.etat !== 'refuse' && c.etat !== 'retire')
/** Colis coché : photographié ou scanné ici, ou déjà passé au contrôle. */
const coche = (c: ControleColis) => !!c.recupere || c.etat !== 'attendu'

/**
 * Récupération groupée chez le vendeur : UNE liste des colis de cet arrêt, chacun coché par une photo ou un scan de son
 * étiquette (R66 : la photo est gardée avec la preuve) ; compteur « 3/5 » ; « Colis manquant / pas prêt » → attendre
 * (minuteur ATTENTE-VENDEUR-MIN) ou partir avec les autres (le colis reste chez le vendeur, l'entreprise est prévenue).
 */
function Recuperation({ r, relire }: { r: Ramassage; relire: () => void }) {
  const { t, tf, langue } = usePreferences()
  const { agir, occupe, maintenant } = useAgir()
  const [cam, setCam] = useState<{ colisId: string | null; par: 'photo' | 'scan' } | null>(null)
  const [manque, setManque] = useState<ControleColis | null>(null)
  const colis = aPrendre(r)
  const n = colis.filter(coche).length
  const restants = colis.filter((c) => !coche(c))
  const prise = async (ph: { id: string }) => {
    // Scan : en production l'étiquette lue désigne le colis ; en démonstration, le premier colis encore à cocher.
    const cible = cam?.colisId ?? restants[0]?.colisId
    const par = cam?.par ?? 'photo'
    setCam(null)
    if (!cible) return
    const res = await agir('photo', cible, (o, s) => s.ramassage.recuperer(cible, par, ph.id, o))
    signal(res?.r.ok ? 'succes' : 'erreur')
    relire()
  }
  const manquant = async (choix: 'attendre' | 'partir') => {
    if (!manque) return
    const c = manque
    setManque(null)
    const res = await agir('incident', c.colisId, (o, s) => s.ramassage.colisManquant(c.colisId, choix, o))
    signal(res?.r.ok ? (choix === 'partir' ? 'alerte' : 'succes') : 'erreur')
    relire()
  }
  return (
    <>
      <div className="card lvt-recup">
        <div className="lvt-recup-h">
          <div>
            <div className="kick acc">{t('Colis à récupérer')}</div>
            <div className="t13 c3 mt4">{t('Une photo ou un scan par colis.')}</div>
          </div>
          <div className="lvt-compteur" aria-label={tf('{n} colis récupérés sur {total}', { n, total: colis.length })}>
            {n}
            <small>/{colis.length}</small>
          </div>
        </div>
        <div className="mt8">
          {colis.map((c) => {
            const ok = coche(c)
            const attente = !ok && c.manquant && c.manquant.jusqua > maintenant ? c.manquant : null
            return (
              <div key={c.colisId} className={'lvt-colis' + (ok ? ' ok' : attente ? ' ko' : '')}>
                <span className="lvt-coche" aria-hidden="true">
                  <Icone nom={attente ? 'hourglass' : 'check'} taille={16} trait={3} />
                </span>
                <span className="lvt-grow">
                  <b>{c.article.nom}</b>
                  <span>
                    {ok
                      ? c.recupere
                        ? tf(c.recupere.par === 'scan' ? 'Scanné à {h} · photo gardée' : 'Photographié à {h}', { h: heure(c.recupere.quand, langue) })
                        : t('Déjà contrôlé')
                      : attente
                        ? <Rebours fin={attente.jusqua} maintenant={maintenant} libelle={t('Pas prêt · attente')} />
                        : c.colisId + ' · ' + tf('classe {c}', { c: c.classe })}
                  </span>
                </span>
                {!ok && (
                  <>
                    <button type="button" className="btn secondary" disabled={occupe} onClick={() => setCam({ colisId: c.colisId, par: 'photo' })} aria-label={t('Photographier') + ' · ' + c.article.nom}>
                      <Icone nom="camera" taille={18} />
                      <span>{t('Photo')}</span>
                    </button>
                    <button type="button" className="btn secondary" disabled={occupe} onClick={() => setManque(c)} aria-label={t('Colis manquant ou pas prêt') + ' · ' + c.article.nom}>
                      <Icone nom="package-x" taille={18} />
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
        {restants.length > 0 && (
          <button type="button" className="btn acc-soft lvt-scan" disabled={occupe} onClick={() => setCam({ colisId: null, par: 'scan' })}>
            <Icone nom="scan-barcode" taille={20} />
            <span>{t('Scanner un colis')}</span>
          </button>
        )}
      </div>
      <Camera
        ouverte={!!cam}
        fermer={() => setCam(null)}
        consigne={cam?.par === 'scan' ? 'Visez l’étiquette du colis' : 'Le colis entier, tenu devant la boutique'}
        nature="recuperation"
        objet={cam?.colisId ?? restants[0]?.colisId ?? r.arretId}
        type="photo"
        prise={(ph) => void prise(ph)}
      />
      <Feuille ouverte={!!manque} fermer={() => setManque(null)} titre={t('Colis manquant ou pas prêt')}>
        <Lvp>
          <div className="lr-sheet-h">{t('Colis manquant ou pas prêt')}</div>
          <div className="t13 c3">{manque?.article.nom}</div>
          <div className="btns lr-col" style={{ marginTop: 12 }}>
            <button type="button" className="lvt-option" disabled={occupe} onClick={() => void manquant('attendre')}>
              <span className="ic amber">
                <Icone nom="hourglass" taille={22} />
              </span>
              <span className="lvt-grow">
                <b>{t('Attendre')}</b>
                <span>{t('Un minuteur s’affiche ; cochez le colis dès qu’il arrive.')}</span>
              </span>
            </button>
            <button type="button" className="lvt-option" disabled={occupe} onClick={() => void manquant('partir')}>
              <span className="ic red">
                <Icone nom="route" taille={22} />
              </span>
              <span className="lvt-grow">
                <b>{t('Partir avec les autres')}</b>
                <span>{t('Le colis reste chez le vendeur ; votre entreprise est prévenue.')}</span>
              </span>
            </button>
          </div>
        </Lvp>
      </Feuille>
    </>
  )
}

/** « Tout récupéré » : actif seulement quand chaque colis est coché ; ouvre la suite de la chaîne (contrôle). */
function ToutRecupere({ r }: { r: Ramassage }) {
  const { t } = usePreferences()
  const colis = aPrendre(r)
  const tous = colis.length > 0 && colis.every(coche)
  const s = suite(r)
  return (
    <>
      {!tous && <p className="aide">{t('Cochez chaque colis : photo ou scan.')}</p>}
      {tous ? (
        <Link className="btn primary xl" to={chemin(s.route, { a: r.arretId, ...(s.c ? { c: s.c } : {}) })}>
          <Icone nom="package-check" taille={20} />
          <span>{t('Tout récupéré')}</span>
        </Link>
      ) : (
        <button type="button" className="btn primary xl" disabled>
          <Icone nom="package-check" taille={20} />
          <span>{t('Tout récupéré')}</span>
        </button>
      )}
    </>
  )
}
