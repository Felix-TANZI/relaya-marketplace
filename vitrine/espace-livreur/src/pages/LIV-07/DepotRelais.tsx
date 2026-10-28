// LIV-P16 · Dépôt au point relais (maillon C2) — « Je suis au relais » affiche le QR DE MISSION (jeton signé qui porte
// le code de dépôt, écrit dessous en 6 chiffres pour une saisie de secours ; lisible seulement pendant l'arrêt en
// cours, masqué après la confirmation ; capture permise : aucune donnée client). La gérante le scanne UNE fois pour
// tout le lot, puis donne un résultat à chaque colis, en miroir ici (contrôlé, réserve 1 photo, refusé 2 photos,
// absent) ; l'emplacement est attribué par le relais. Un refus constaté est accepté en miroir et reste sous la garde
// de l'entreprise ; un écart (absent, en trop) est à la charge de l'entreprise, jamais du relais. Le lot est validé
// quand chaque colis a son résultat ET que le livreur confirme : la garde passe au relais, horodatée par le serveur ;
// sans confirmation après DEPOT-CONFIRM-MIN, le lot est « à confirmer » et le support est alerté. Aucun contact client
// pour un dépôt au relais : le client reçoit son code de retrait à l'arrivée de son dernier colis. Relais fermé dans
// ses heures : photo de la devanture, colis gardés, la console décide. Relais hors ligne : registre papier photographié.
// Structure : route « depot-relais » du prototype (07_remises.js) — avancement compact, carte du relais, QR de dépôt
// (héros de nuit), colis du lot, barre d'action du bas ; états fermé, hors ligne, confirmation (feuille), complet.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { qrMatrice } from '@client/composants/QrCode'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { ColisDepot } from '../../donnees/domaines/remises'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { NATURES } from '../../composants/livraison/Avancement'
import { useArrivee } from '../../composants/livraison/arrivee'
import type { Photo } from '../../composants/livraison/Camera'
import { AideDemo, BandeauModification, useArret } from '../../composants/livraison/contexte'
import { Chargement, Erreur, Message, RienIci, useAgir, useEcranAllume } from '../../composants/livraison/outils'
import { Barre, BarreAction, HorsConnexion, Li, Lvp, Note, Sec } from '../../composants/proto'
import { AideEtape, exporterPdf } from '../../composants/livraison/enrichi'
import { useSession } from '../../session'
import { CarteRelais, Chk, CodeDepot, Colis, Etat, FileRemise, Hk, PhotoPreuve, Prog, ResteUrgent, maj } from './commun'
import { Enchainement } from '../../composants/livraison/terrain'

/** Étapes de l'arrêt relais (prototype : ramassages faits, arrivée, contrôle par colis, garde transférée). */
export const ETAPES_DEPOT = ['Ramassages', 'Arrivé au relais', 'Contrôle par colis', 'Garde transférée']

const minuscule = (s: string) => s.replace(/^./, (x) => x.toLowerCase())

function Qr({ texte, taille }: { texte: string; taille?: number }) {
  const m = qrMatrice(texte)
  const n = m.length + 8
  return (
    <svg className="no-tr" viewBox={`0 0 ${n} ${n}`} width={taille} height={taille} role="img" aria-label="QR" shapeRendering="crispEdges">
      <rect width={n} height={n} fill="#fff" />
      {m.flatMap((ligne, y) => ligne.map((on, x) => (on ? <rect key={x + '-' + y} x={x + 4} y={y + 4} width={1} height={1} fill="#0F1F19" /> : null)))}
    </svg>
  )
}

function QrPleinEcran({ jeton, code, fermer }: { jeton: string; code: string; fermer: () => void }) {
  const { t } = usePreferences()
  useEcranAllume(true)
  return createPortal(
    <div className="lv-qr-plein" role="dialog" aria-modal="true" aria-label={t('QR de dépôt')}>
      <Qr texte={jeton} />
      <div className="lv-qr-code" aria-label={t('Code de dépôt')}>
        {code.slice(0, 3)} {code.slice(3)}
      </div>
      <p style={{ textAlign: 'center', maxWidth: 360 }}>{t('Présentez ce QR à la gérante : un seul scan ouvre tout le lot. Le code sert de secours si le scan ne passe pas.')}</p>
      <button type="button" onClick={fermer}>
        {t('Fermer')}
      </button>
    </div>,
    document.body,
  )
}

/** livRem_dep : résultat d'un colis au relais, en miroir de l'application de la gérante. */
function ColisLot({ c, entreprise }: { c: ColisDepot; entreprise: string }) {
  const { t, tf } = usePreferences()
  const titre = tf('{etiquette} · classe {c}', { etiquette: c.etiquette, c: c.classe })
  const motif = c.motif ? minuscule(t(c.motif)) : null
  const photos = c.photos ? (c.photos === 1 ? t('1 photo') : tf('{n} photos', { n: c.photos })) : null
  const range = c.emplacement ? tf('rangé en {e}', { e: c.emplacement }) : null
  if (c.resultat === 'controle') return <Colis st="ok" classe={c.classe} titre={titre} sous={[t('Contrôlé · scellé intact'), range].filter(Boolean).join(' · ')} droite={<Etat ton="green">{t('Contrôlé')}</Etat>} />
  if (c.resultat === 'reserve') return <Colis classe={c.classe} titre={titre} sous={[t('Réserve'), motif, photos, range].filter(Boolean).join(' · ')} droite={<Etat ton="amber">{t('Réserve')}</Etat>} />
  if (c.resultat === 'refuse') return <Colis st="bad" classe={c.classe} titre={titre} sous={[t('Refusé'), motif, photos, t('repart avec vous')].filter(Boolean).join(' · ')} droite={<Etat ton="red">{t('Refusé')}</Etat>} />
  if (c.resultat === 'absent') return <Colis st="bad" classe={c.classe} titre={titre} sous={tf('Annoncé mais absent du lot · écart à la charge de {entreprise}', { entreprise })} droite={<Etat ton="red">{t('Absent')}</Etat>} />
  return <Colis classe={c.classe} titre={titre} sous={t('En attente du contrôle du scellé par la gérante')} droite={<Etat ton="ink">{t('À contrôler')}</Etat>} />
}

export default function DepotRelais() {
  const { t, tf, langue } = usePreferences()
  const { lecture, tournee, regles, arret, paquet } = useArret(['relais'])
  const d = useLecture(() => (arret ? source.remises.depotRelais(arret.id) : Promise.resolve(null)), [arret?.id])
  const { agir, occupe, enLigne, maintenant } = useAgir()
  const { arriver, refus, feuille } = useArrivee()
  const [plein, setPlein] = useState(false)
  const [confirmer, setConfirmer] = useState(false)
  const [params] = useSearchParams()
  // « Un problème ? » → Relais fermé : l'écran s'ouvre sur la photo de la devanture.
  const [mode, setMode] = useState<'ferme' | 'registre' | null>(params.get('s') === 'ferme' ? 'ferme' : null)
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [coches, setCoches] = useState([false, false, false])
  const [erreur, setErreur] = useState<string | null>(null)
  const dep = d.donnees

  const confirmerLot = async () => {
    if (!arret) return
    const res = await agir('depot', arret.id, (o, s) => s.remises.confirmerDepot(arret.id, o))
    setConfirmer(false)
    if (res?.r.ok) signal('remiseReussie')
    else {
      signal('erreur')
      const r = res && !res.r.ok ? res.r.raison : null
      setErreur(r === 'non_scanne' ? t('La gérante n’a pas encore scanné le QR de dépôt : rien n’est reçu.') : r === 'lot_non_valide' ? t('La gérante n’a pas encore validé le lot (photo du lot) : attendez sa validation.') : r === 'constat_a_accepter' ? t('Acceptez d’abord le constat en miroir de chaque colis refusé ou reçu avec réserve.') : t('Chaque colis doit avoir son résultat avant la confirmation.'))
    }
  }
  const constat = async (colisId: string) => {
    if (!arret) return
    await agir('depot', colisId, (o, s) => s.remises.accepterConstat(arret.id, colisId, o))
    signal('toucher')
  }
  const envoyerPhoto = async (cas: 'ferme' | 'registre') => {
    if (!arret || !photo) return
    const res = await agir(cas === 'ferme' ? 'incident' : 'depot', arret.id, (o, s) => (cas === 'ferme' ? s.remises.relaisFerme(arret.id, photo.id, o) : s.remises.registrePapier(arret.id, photo.id, o)))
    setMode(null)
    setPhoto(null)
    setCoches([false, false, false])
    if (res?.r.ok) signal(cas === 'ferme' ? 'alerte' : 'succes')
  }
  const ouvrir = (m: 'ferme' | 'registre') => {
    setPhoto(null)
    setCoches([false, false, false])
    setMode(m)
  }

  const s = useSession()
  const contenu = () => {
    if (lecture.erreur || d.erreur) return <Erreur relire={() => (lecture.relire(), d.relire())} />
    if (!lecture.charge || !regles || (arret && !dep)) return <Chargement />
    if (!tournee || !arret || !dep) return <RienIci titre="Aucun dépôt au relais en cours" texte="Le dépôt s’ouvre depuis l’arrêt « relais » de la tournée, quand c’est l’arrêt en cours." icone="warehouse" />
    const surPlace = arret.phase === 'sur_place'
    const tous = dep.colis.length > 0 && dep.colis.every((c) => c.resultat)
    const avecResultat = dep.colis.filter((c) => c.resultat).length
    // PR-RC-08 : chaque réserve et chaque refus s'acceptent en miroir avant la confirmation du lot.
    const aAccepter = dep.colis.filter((c) => (c.resultat === 'refuse' || c.resultat === 'reserve') && !c.constatAccepte)
    const aConfirmerDepuis = tous && !dep.confirmeA && dep.resultatsA ? maintenant - dep.resultatsA : 0
    const enRetard = aConfirmerDepuis > regles.depotConfirmMin * 60000
    const etape = dep.confirmeA ? 4 : mode === 'registre' || (tous && !aAccepter.length) ? 3 : dep.scanneA ? 2 : 1
    const suivant = tournee.arrets.find((a) => a.id === tournee.enCours)
    const prog = (
      <Prog
        k={paquet ? maj(t(NATURES[paquet.nature])) + ' · ' + arret.zone : arret.zone}
        titre={tf('Dépôt de {n} colis', { n: dep.colis.length })}
        sous={paquet?.id}
        n={tournee.colisSousGarde}
        sur={paquet?.colisTotal}
        etapes={ETAPES_DEPOT.map((e) => t(e))}
        cur={etape}
      >
        <ResteUrgent limite={dep.confirmeA ? null : paquet?.heureLimite} maintenant={maintenant} regles={regles} />
      </Prog>
    )
    const relais = (
      <CarteRelais
        k={tf('Arrêt {i} sur {n} · dépôt', { i: arret.ordre, n: tournee.arrets.length })}
        nom={dep.relais}
        gerant={dep.gerant}
        icone={dep.fermeConstate || mode === 'ferme' ? 'door-open' : 'store'}
        minis={[
          [t('Ferme à'), heure(dep.fermeture, langue)],
          [t('Colis'), tf('{n} · {p} places', { n: dep.colis.length, p: dep.places.lot })],
          [t('Places libres'), tf('{l} sur {t}', { l: dep.places.libres, t: dep.places.total })],
        ]}
      />
    )

    // ---------- Dépôt complet : garde transférée ----------
    if (dep.confirmeA) {
      // Reçu de dépôt (M6) : ce qui a été remis, à qui, à quelle heure ; jamais le contenu ni la valeur d'un colis.
      const RESULTATS: Record<string, string> = { controle: 'Contrôlé', reserve: 'Réserve', refuse: 'Refusé · repart avec vous', absent: 'Absent du lot' }
      const recu = () =>
        exporterPdf(
          [
            { texte: 'BelivaY', taille: 20, gras: true },
            { texte: t('Reçu de dépôt au relais'), taille: 14, gras: true, espace: 6 },
            { texte: jourLong(dep.confirmeA!, langue) + ' · ' + heure(dep.confirmeA!, langue), espace: 4 },
            { texte: t('Relais'), droite: dep.relais, espace: 14 },
            { texte: t('Gérante'), droite: dep.gerant },
            { texte: t('Livreur'), droite: (s.livreur?.prenom ?? '') + ' · ' + tournee.entreprise },
            { texte: t('Paquet'), droite: paquet?.id ?? '—' },
            { texte: t('Mode'), droite: t(dep.registre ? 'Registre papier signé' : 'Scan du QR de dépôt') },
            { texte: t('Colis'), gras: true, espace: 14 },
            ...dep.colis.map((c) => ({ texte: c.etiquette + ' · ' + tf('classe {c}', { c: c.classe }), droite: t(RESULTATS[c.resultat ?? ''] ?? '—') })),
            { texte: tf('Garde transférée à {h}, horodatée par le serveur.', { h: heure(dep.confirmeA!, langue) }), espace: 14, taille: 10 },
            { texte: t('Ni contenu, ni prix, ni valeur : classe et étiquette seulement.'), taille: 10 },
          ],
          'recu-depot-' + arret.id + '.pdf',
          t('Reçu de dépôt au relais'),
        )
      const repartent = dep.colis.filter((c) => c.resultat === 'refuse' || c.resultat === 'absent').length
      const remis = dep.colis.length - repartent
      const refuses = dep.colis.filter((c) => c.resultat === 'refuse').length
      const collecteIci = suivant?.type === 'collecte'
      return (
        <>
          {prog}
          <div className="hero acc">
            <Hk quand={heure(dep.confirmeA, langue)}>{dep.registre ? t('Dépôt sur registre papier') : t('Dépôt complet · garde transférée')}</Hk>
            <div className="row mt10" style={{ gap: 14, alignItems: 'flex-end' }}>
              <div className="bigN">
                {remis}
                <small style={{ fontSize: '1.375rem', opacity: 0.75 }}>/{dep.colis.length}</small>
              </div>
              <div className="grow">
                <div className="ht" style={{ margin: 0 }}>
                  {tf('Colis au {relais}', { relais: dep.relais })}
                </div>
              </div>
            </div>
            <div className="hs">
              {dep.registre
                ? t('Remise notée sur le registre papier signé. À la reconnexion du relais, la gérante scanne le QR de dépôt et chaque colis : les résultats et la garde sont régularisés.')
                : tf('Garde transférée à {h}, à votre confirmation, horodatée par le serveur. Les colis ne sont plus sous votre responsabilité.', { h: heure(dep.confirmeA, langue) })}
            </div>
          </div>
          <Sec titre={t('Ce qui se passe maintenant')} />
          <div className="card tight">
            <Li icone="bell-ring" ton="or" t={t('Les clients sont prévenus par BelivaY')} s={t('Code de retrait au dernier colis de leur commande. Vous n’avez personne à contacter.')} />
            <Li icone="store" ton="blue" t={tf('{prenom} voit {n} colis en stock', { prenom: dep.gerant, n: remis })} s={t('Emplacements attribués par le relais, visibles dans son application.')} />
            {refuses > 0 && (
              <Li
                icone="package-x"
                ton="red"
                t={refuses === 1 ? t('1 colis refusé repart avec vous') : tf('{n} colis refusés repartent avec vous', { n: refuses })}
                s={tf('Il reste sous la garde de {entreprise} : le relais n’en est pas responsable.', { entreprise: tournee.entreprise })}
              />
            )}
            <Li
              icone="package-open"
              ton="ink"
              t={collecteIci ? t('Départs à reprendre ici : à la suite') : t('Départs à reprendre ici : aucun')}
              s={collecteIci ? t('La gérante vous présente les colis sortants, un par un.') : t('Pas de renvoi, de retour ni de transfert pour ce passage.')}
            />
          </div>
          <Sec titre={t('Déposés')} />
          <div className="card tight">
            {dep.colis.map((c) => (
              <ColisLot key={c.id} c={c} entreprise={tournee.entreprise} />
            ))}
            <div style={{ height: 8 }} />
          </div>
          <div className="btns">
            <button type="button" className="btn secondary" onClick={() => void recu()}>
              <Icone nom="file-down" taille={18} />
              <span>{t('Reçu de dépôt (PDF)')}</span>
            </button>
          </div>
          <BarreAction>
            <Enchainement vers={collecteIci && suivant ? chemin('collecte', { a: suivant.id }) : undefined} />
            {suivant ? (
              <Link className="btn primary xl" to={chemin(collecteIci ? 'collecte' : 'tournee', collecteIci ? { a: suivant.id } : undefined)}>
                <Icone nom={collecteIci ? 'package-plus' : 'route'} taille={18} />
                <span>{t(collecteIci ? 'Collecter les départs' : 'Continuer la tournée')}</span>
              </Link>
            ) : (
              <Link className="btn primary xl" to={chemin('tournee')}>
                <Icone nom="flag" taille={18} />
                <span>{t('Terminer le paquet')}</span>
              </Link>
            )}
          </BarreAction>
        </>
      )
    }

    // ---------- Relais fermé dans ses heures : constaté, ou à constater ----------
    if (dep.fermeConstate || mode === 'ferme') {
      const fait = dep.fermeConstate
      return (
        <>
          {prog}
          {relais}
          <div className="hero red">
            <Hk couleur="#FFB4AB" quand={fait ? heure(fait.quand, langue) : undefined}>
              {t('Incident · relais fermé')}
            </Hk>
            <div className="ht">{t('Le relais est fermé pendant ses heures')}</div>
            <div className="hs">{tf('Le {relais} annonce une ouverture jusqu’à {h}. Photographiez la devanture : vous gardez les colis et le dépôt est reprogrammé.', { relais: dep.relais, h: heure(dep.fermeture, langue) })}</div>
          </div>
          <Sec titre={t('Preuve')} />
          <div className="card">
            <PhotoPreuve
              titre="Photo de la devanture"
              sous="Devanture fermée, enseigne visible ; heure et position enregistrées."
              consigne="Devanture fermée, enseigne visible"
              nature="devanture"
              objet={arret.id}
              type="incident"
              id={fait ? fait.photo : (photo?.id ?? null)}
              heure={fait ? fait.quand : photo?.heure}
              enFile={!fait && photo?.enFile}
              prise={setPhoto}
              fige={!!fait}
              legende={t('Heure et position enregistrées ; aucun gérant sur place.')}
            />
          </div>
          <Sec titre={t('Ce qui va se passer')} />
          <div className="card tight">
            <Li icone="package" ton="or" t={dep.colis.length === 1 ? t('Vous gardez le colis') : tf('Vous gardez les {n} colis', { n: dep.colis.length })} s={t('Le dépôt est reprogrammé ; la console peut désigner un autre relais.')} />
            <Li icone="gauge" ton="ink" t={t('Incident au Trust Score du relais')} s={t('Vous n’êtes pas en cause : vous êtes arrivé avant la fermeture.')} />
            <Li icone="ban" ton="red" t={t('Ne déposez nulle part ailleurs')} s={t('Jamais dans un autre relais sans décision de la console.')} />
          </div>
          <FileRemise objets={[arret.id]} />
          <BarreAction aide={!fait && !photo ? t('La photo de la devanture est exigée avant l’envoi.') : undefined}>
            {fait ? (
              <Link className="btn primary xl" to={chemin('tournee')}>
                <Icone nom="route" taille={18} />
                <span>{t('Revenir à la tournée')}</span>
              </Link>
            ) : (
              <>
                <button type="button" className="btn red xl" disabled={!photo || occupe} onClick={() => void envoyerPhoto('ferme')}>
                  <Icone nom="send" taille={18} />
                  <span>{t('Envoyer l’incident')}</span>
                </button>
                <button type="button" className="btn ghost mt8" style={{ width: '100%' }} onClick={() => setMode(null)}>
                  <span>{t('Le relais est ouvert : revenir au dépôt')}</span>
                </button>
              </>
            )}
          </BarreAction>
        </>
      )
    }

    // ---------- Relais hors ligne : registre papier ----------
    if (mode === 'registre') {
      const premier = dep.colis[0]?.etiquette ?? ''
      const dernier = dep.colis[dep.colis.length - 1]?.etiquette ?? ''
      const libelles = [
        [dep.colis.length === 1 ? t('L’étiquette figure au registre') : tf('Les {n} étiquettes figurent au registre', { n: dep.colis.length }), premier === dernier ? premier : premier + ' → ' + dernier],
        [t('Scellés contrôlés par la gérante'), t('Colis par colis, devant vous')],
        [t('Registre signé des deux côtés'), t('Photo prise dans l’application')],
      ] as const
      const pret = !!photo && coches.every(Boolean)
      return (
        <>
          {prog}
          <HorsConnexion>
            <b>{t('Le relais est hors ligne.')}</b> {tf('{prenom} reçoit le lot sur le registre papier du relais ; tout est régularisé à la reconnexion.', { prenom: dep.gerant })}
          </HorsConnexion>
          {relais}
          <Sec titre={t('Registre papier')} />
          <div className="card">
            <PhotoPreuve
              titre="Photo du registre signé"
              sous="Registre papier signé, lignes lisibles."
              consigne="Registre papier signé, lignes lisibles"
              nature="registre"
              objet={arret.id}
              type="depot"
              id={photo?.id ?? null}
              heure={photo?.heure}
              enFile={photo?.enFile}
              prise={setPhoto}
              legende={tf('{n} étiquettes recopiées, signature de {prenom} et la vôtre.', { n: dep.colis.length, prenom: dep.gerant })}
            />
          </div>
          <div className="card tight">
            {libelles.map(([l, s], i) => (
              <Chk key={i} st={coches[i] ? 'on' : ''} titre={l} sous={s} basculer={() => setCoches((c) => c.map((x, j) => (j === i ? !x : x)))} />
            ))}
          </div>
          <Note ton="ink" icone="info">
            {tf('À la reconnexion du relais, {prenom} scanne le QR de dépôt et chaque colis : les résultats et la garde sont régularisés dans les deux applications.', { prenom: dep.gerant })}
          </Note>
          <FileRemise objets={[arret.id, ...dep.colis.map((c) => c.id)]} />
          <BarreAction aide={!pret ? t('Cochez les trois vérifications et photographiez le registre signé.') : undefined}>
            <button type="button" className="btn primary xl" disabled={!pret || occupe} onClick={() => void envoyerPhoto('registre')}>
              <Icone nom="clipboard-check" taille={18} />
              <span>{t('Confirmer la remise sur registre')}</span>
            </button>
            <button type="button" className="btn ghost mt8" style={{ width: '100%' }} onClick={() => setMode(null)}>
              <span>{t('Le relais est en ligne : revenir au dépôt')}</span>
            </button>
          </BarreAction>
        </>
      )
    }

    // ---------- Arrivée, QR de dépôt, contrôle par colis, anomalies ----------
    const reserves = dep.colis.filter((c) => c.resultat === 'reserve')
    const refuses = dep.colis.filter((c) => c.resultat === 'refuse')
    const ecart = refuses.length > 0 || reserves.length > 0 || dep.colis.some((c) => c.resultat === 'absent')
    return (
      <>
        {!enLigne && surPlace && (
          <HorsConnexion>
            <b>{t('Hors connexion')}</b> · {t('Le QR reste lisible. La confirmation part au retour du réseau, avec l’heure et la position d’origine.')}
          </HorsConnexion>
        )}
        <BandeauModification tournee={tournee} />
        {prog}
        <AideEtape etape="depot" />
        {relais}

        {surPlace && dep.qr && !dep.scanneA && (
          <>
            <div className="hero night" style={{ textAlign: 'center' }}>
              <div className="hk">{tf('QR de dépôt · à présenter à {prenom}', { prenom: dep.gerant })}</div>
              <div className="lr-qr">
                <Qr texte={dep.qr.jeton} />
              </div>
              <div className="hs" style={{ marginTop: 12 }}>
                {t('Un seul scan ouvre tout le lot. S’il ne passe pas, elle saisit le code de dépôt :')}
              </div>
              <CodeDepot code={dep.qr.code} label={t('Code de dépôt')} />
              <div className="t12 mt10" style={{ color: 'rgba(255,255,255,.7)' }}>
                {[paquet?.id, tf('{n} colis', { n: dep.colis.length }), tf('{p} places', { p: dep.places.lot })].filter(Boolean).join(' · ')}
              </div>
              <div className="btns" style={{ marginTop: 14 }}>
                <button type="button" className="btn white" onClick={() => setPlein(true)}>
                  <Icone nom="frame" taille={18} />
                  <span>{t('Afficher en plein écran')}</span>
                </button>
              </div>
            </div>
            <Note ton="red" icone="ban">
              {t('Aucun colis ne quitte votre garde sans le scan de la gérante : jamais à un employé non inscrit dans son application, jamais à un client qui attend au comptoir.')}
            </Note>
          </>
        )}

        {surPlace && dep.scanneA && !tous && (
          <div className="card">
            <div className="row">
              <div className="grow">
                <div className="b8 t15">{tf('{prenom} contrôle le scellé, colis par colis', { prenom: dep.gerant })}</div>
                <div className="t13 c3 mt4">{tf('QR scanné à {h}. Chaque colis passe au vert quand elle le touche, scellé intact.', { h: heure(dep.scanneA, langue) })}</div>
              </div>
              <div className="b8" style={{ fontSize: '1.375rem' }}>
                {avecResultat}
                <span className="c3" style={{ fontSize: '.875rem' }}>
                  /{dep.colis.length}
                </span>
              </div>
            </div>
            <div className="mt10">
              <Barre pct={(avecResultat / dep.colis.length) * 100} label={t('Colis contrôlés par la gérante')} />
            </div>
          </div>
        )}

        {refuses.map((c) => (
          <div key={c.id} className="card" style={{ boxShadow: 'var(--shadow-card),inset 3px 0 0 var(--red)' }}>
            <div className="kick" style={{ color: 'var(--red)' }}>
              {t('Refus constaté par la gérante')}
              {dep.resultatsA ? <span className="lr-t"> · {heure(dep.resultatsA, langue)}</span> : null}
            </div>
            <div className="b8 t17 mt4">
              {c.etiquette} : {minuscule(t(c.motif ?? 'refusé'))}
            </div>
            <div className="t13 c3 mt4">
              {tf('{prenom} l’a constaté avec {p}. Ce colis repart avec vous et reste sous la garde de {entreprise} : le relais n’en est pas responsable.', {
                prenom: dep.gerant,
                p: c.photos === 1 ? t('1 photo') : tf('{n} photos', { n: c.photos }),
                entreprise: tournee.entreprise,
              })}
            </div>
            <div className="btns">
              {c.constatAccepte ? (
                <span className="pill green sm">
                  <Icone nom="check-check" taille={13} />
                  {t('Constat accepté en miroir')}
                </span>
              ) : (
                <button type="button" className="btn secondary" disabled={occupe} onClick={() => void constat(c.id)}>
                  <Icone nom="check-check" taille={18} />
                  <span>{t('J’accepte le constat en miroir')}</span>
                </button>
              )}
            </div>
          </div>
        ))}
        {reserves.map((c) => (
          <div key={c.id}>
            <Note ton="amber" icone="triangle-alert">
              <b>{tf('{etiquette} accepté avec réserve', { etiquette: c.etiquette })}</b> : {[c.motif ? minuscule(t(c.motif)) : null, c.photos === 1 ? t('1 photo') : c.photos ? tf('{n} photos', { n: c.photos }) : null].filter(Boolean).join(', ')}.{' '}
              {t('Le colis reste au relais, signalé.')}
            </Note>
            <div className="btns">
              {c.constatAccepte ? (
                <span className="pill green sm">
                  <Icone nom="check-check" taille={13} />
                  {t('Constat accepté en miroir')}
                </span>
              ) : (
                <button type="button" className="btn secondary" disabled={occupe} onClick={() => void constat(c.id)}>
                  <Icone nom="check-check" taille={18} />
                  <span>{t('J’accepte la réserve en miroir')}</span>
                </button>
              )}
            </div>
          </div>
        ))}
        {ecart && (
          <Note ton="ink" icone="info">
            {tf('Colis non prévu dans le lot, ou colis annoncé absent : l’écart est à la charge de {entreprise}, jamais du relais ; il est tracé, jamais rangé sans trace.', { entreprise: tournee.entreprise })}
          </Note>
        )}
        {enRetard && (
          <Note ton="amber" icone="timer" role="alert">
            {tf('Lot « à confirmer » depuis plus de {n} min : le support est alerté. Confirmez maintenant.', { n: regles.depotConfirmMin })}
          </Note>
        )}
        {erreur && <Message ton="erreur">{erreur}</Message>}

        <Sec titre={t('Colis du lot')} droite={dep.scanneA ? tf('{n} sur {total} avec un résultat', { n: avecResultat, total: dep.colis.length }) : tf('{n} annoncés', { n: dep.colis.length })} />
        <div className="card tight">
          {dep.colis.map((c) => (
            <ColisLot key={c.id} c={c} entreprise={tournee.entreprise} />
          ))}
          <div style={{ height: 8 }} />
        </div>

        <Sec titre={t('Un problème ici ?')} />
        <div className="chips">
          {surPlace && !dep.scanneA && (
            <>
              <button type="button" className="chip" onClick={() => ouvrir('ferme')}>
                <Icone nom="door-open" taille={15} />
                {t('Relais fermé')}
              </button>
              <button type="button" className="chip" onClick={() => ouvrir('registre')}>
                <Icone nom="notebook-pen" taille={15} />
                {t('Relais hors ligne')}
              </button>
            </>
          )}
          <Link className="chip" to={chemin('incident', { arret: arret.id })}>
            <Icone nom="triangle-alert" taille={15} />
            {t('Autre incident')}
          </Link>
          {surPlace && (
            <Link className="chip" to={chemin('appel', { avec: 'relais', a: arret.id })}>
              <Icone nom="phone" taille={15} />
              {t('Appeler le relais')}
            </Link>
          )}
        </div>
        <Note ton="acc" icone="shield-check">
          {t('Jamais dans un autre relais que celui de la tournée. Aucun contact client pour un dépôt : BelivaY prévient le client.')}
        </Note>

        {surPlace && (
          <AideDemo titre="la gérante du relais">
            <button type="button" disabled={!!dep.scanneA} onClick={() => void source.remises.simulerScanRelais?.(arret.id, false)}>
              {t('Elle scanne : tout est conforme')}
            </button>
            <button type="button" disabled={!!dep.scanneA} onClick={() => void source.remises.simulerScanRelais?.(arret.id, true)}>
              {t('Elle scanne : une réserve et un refus')}
            </button>
          </AideDemo>
        )}

        {surPlace ? (
          <BarreAction aide={!tous ? t('Chaque colis doit avoir son résultat chez la gérante.') : aAccepter.length > 0 ? t('Acceptez d’abord le constat en miroir de chaque colis refusé ou reçu avec réserve.') : dep.attendValidation ? t('La gérante n’a pas encore validé le lot (photo du lot) : attendez sa validation.') : undefined}>
            <button type="button" className="btn primary xl" disabled={!tous || aAccepter.length > 0 || !!dep.attendValidation || occupe} onClick={() => setConfirmer(true)}>
              <Icone nom="package-check" taille={18} />
              <span>{t('Confirmer la remise du lot')}</span>
            </button>
          </BarreAction>
        ) : (
          <BarreAction aide={refus ?? undefined}>
            <button type="button" className="btn primary xl" onClick={() => void arriver(arret)}>
              <Icone nom="map-pin-check" taille={18} />
              <span>{t('Je suis au relais')}</span>
            </button>
          </BarreAction>
        )}
      </>
    )
  }

  const aRemettre = dep ? dep.colis.filter((c) => c.resultat === 'controle' || c.resultat === 'reserve').length : 0
  return (
    <Ecran proto
      route="depot-relais"
      titre={dep ? tf('Dépôt · {relais}', { relais: dep.relais }) : undefined}
      fixes={
        <>
          {feuille}
          {plein && dep?.qr && <QrPleinEcran jeton={dep.qr.jeton} code={dep.qr.code} fermer={() => setPlein(false)} />}
          <Feuille ouverte={confirmer} fermer={() => setConfirmer(false)} titre={t('Confirmer la remise du lot')}>
            <Lvp className="liv07">
              <div className="lr-sheet-h">{t('Confirmer la remise du lot')}</div>
              <div className="t13 c3">{dep ? tf('{n} colis contrôlés par {prenom}, gardés par le relais à votre confirmation.', { n: aRemettre, prenom: dep.gerant }) : null}</div>
              <div className="mt8">
                <Li icone="shield-check" ton="acc" t={dep ? tf('La garde passe au {relais}', { relais: dep.relais }) : ''} s={t('À votre confirmation, horodatée par le serveur.')} />
                <Li icone="timer" ton="amber" t={tf('{n} minutes pour confirmer', { n: regles?.depotConfirmMin ?? 0 })} s={t('Sans confirmation, le lot reste « à confirmer » et le support est alerté.')} />
                <Li icone="bell-ring" ton="or" t={t('Les clients sont prévenus au dernier colis')} s={t('Par BelivaY ; vous n’avez à contacter personne.')} />
              </div>
              <div className="btns lr-col" style={{ marginTop: 14 }}>
                <button type="button" className="btn primary xl" disabled={occupe} onClick={() => void confirmerLot()}>
                  <Icone nom="check" taille={18} />
                  <span>{t('Confirmer la remise')}</span>
                </button>
                <button type="button" className="btn secondary" onClick={() => setConfirmer(false)}>
                  <span>{t('Pas encore')}</span>
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
