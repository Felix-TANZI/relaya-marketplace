// LIV-P18 · Remise impossible — cinq motifs (le client a toujours payé en ligne : aucun refus de payer) (un seul choix), chacun avec ses PREUVES EXIGÉES, cochées par le système et
// jamais déclarées : client absent ou injoignable (attente ABSENT-ATTENTE-MIN mesurée depuis l'arrivée, ABSENT-APPELS
// appels masqués espacés d'ABSENT-INTERVALLE-MIN au moins, journal des appels ; photo de la porte seulement), adresse
// introuvable (appel masqué, photo du lieu, position), la cliente refuse le colis (photo ; pour un défaut constaté, le
// constat fait foi et elle n'est pas comptée comme refus), lieu dangereux (« N'y allez pas » : note, photo facultative jamais au risque de sa sécurité,
// SOS ; sans pénalité). « Enregistrer l'échec » reste bloqué tant qu'une preuve manque. La suite est décidée par le
// système : dépôt au relais de la zone, la cliente y reçoit son code. Jamais chez un voisin, un gardien, devant la
// porte, ni chez soi. Le livreur ne reçoit jamais lui-même un litige (l'entreprise répond avec ses preuves).
// Structure : route « echec-domicile » du prototype (07_remises.js) — avancement compact ; motif (liste fermée) ;
// preuves du motif (motif choisi, preuves exigées, photo) ; lieu dangereux (héros, signalement, suite) ; suite décidée
// par le système (héros, destination du colis) ; barre d'action.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { MotifEchec, SuiteEchec } from '../../donnees/domaines/remises'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import type { Photo } from '../../composants/livraison/Camera'
import { useArret } from '../../composants/livraison/contexte'
import { Chargement, Erreur, Message, RienIci, useAgir } from '../../composants/livraison/outils'
import { AideEtape, AvisAnnuler, Rebours, useDiffere } from '../../composants/livraison/enrichi'
import { BarreAction, Choix, Hint, Li, Lvp, Note, Sec } from '../../composants/proto'
import { CarteRelais, Chk, FileRemise, Hk, HorsLigneRemise, PhotoPreuve, Preuve, Prog } from './commun'
import { Enchainement } from '../../composants/livraison/terrain'

const MOTIFS: { id: MotifEchec; titre: string; preuve: string; icone: string }[] = [
  { id: 'absent', titre: 'Client absent', preuve: 'Attente, deux appels masqués espacés, photo de la porte', icone: 'user-x' },
  { id: 'injoignable', titre: 'Client injoignable', preuve: 'Attente, deux appels masqués espacés, photo de la porte', icone: 'phone' },
  { id: 'introuvable', titre: 'Adresse introuvable', preuve: 'Un appel masqué, photo du lieu, position', icone: 'map-pin' },
  { id: 'refus_colis', titre: 'La cliente refuse le colis', preuve: 'Photo ; un défaut constaté est instruit en litige', icone: 'package-x' },
  { id: 'danger', titre: 'Lieu dangereux', preuve: 'Une note ; aucune photo exigée : protégez-vous d’abord', icone: 'siren' },
]
const titreMotif = (m: MotifEchec) => MOTIFS.find((x) => x.id === m)!.titre

export default function EchecDomicile() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const { lecture, tournee, regles, arret, paquet } = useArret(['domicile'])
  const d = useLecture(() => (arret ? source.remises.domicile(arret.id) : Promise.resolve(null)), [arret?.id])
  const p = useLecture(() => (arret ? source.remises.preuvesEchec(arret.id) : Promise.resolve(null)), [arret?.id])
  const { agir, occupe, enLigne, maintenant } = useAgir()
  const differe = useDiffere()
  const initial = (params.get('motif') as MotifEchec | null) ?? null
  const [motif, setMotif] = useState<MotifEchec | null>(initial)
  const [preuvesVues, setPreuvesVues] = useState(!!initial)
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [note, setNote] = useState('')
  const [suite, setSuite] = useState<SuiteEchec | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const r = d.donnees
  const pr = p.donnees

  const choisir = (m: MotifEchec) => {
    setMotif(m)
    setErreur(null)
    setPhoto(null)
    // Lieu dangereux : la sécurité d'abord, l'écran de signalement s'ouvre tout de suite.
    if (m === 'danger') setPreuvesVues(true)
  }
  const enregistrer = async () => {
    if (!arret || !motif) return
    setErreur(null)
    const res = await agir('echec', arret.id, (o, s) => s.remises.echecDomicile(arret.id, motif, { photo: photo?.id ?? null, note }, o))
    if (res?.r.ok) {
      signal('alerte')
      setSuite(res.r.suite)
    } else {
      signal('erreur')
      setErreur(res && !res.r.ok && res.r.raison === 'note_trop_courte' ? t('Écrivez une note plus précise pour le signalement.') : t('Une preuve exigée manque encore : l’échec ne peut pas être enregistré.'))
      p.relire()
    }
  }

  const contenu = () => {
    if (lecture.erreur || d.erreur || p.erreur) return <Erreur relire={() => (lecture.relire(), d.relire(), p.relire())} />
    if (!lecture.charge || !regles || (arret && (!r || !pr))) return <Chargement />
    if (!tournee || !arret || !r || !pr) return <RienIci titre="Aucune remise à domicile en cours" texte="Une remise impossible se déclare pendant la remise à domicile en cours." icone="house" />
    const prog = (
      <Prog
        k={t('Domicile · remise impossible')}
        titre={tf('{prenom} · {quartier}', { prenom: r.prenom, quartier: r.quartier })}
        sous={[paquet?.id, ...r.colis.map((c) => tf('{etiquette} · classe {c}', { etiquette: c.etiquette, c: c.classe }))].filter(Boolean).join(' · ')}
        n={tournee.colisSousGarde}
        sur={paquet?.colisTotal}
      />
    )
    const absence = motif === 'absent' || motif === 'injoignable'
    const appels = pr.appels.length ? pr.appels.map((a) => heure(a, langue)).join(' · ') : t('aucun appel encore')

    // ---------- Suite décidée par le système ----------
    const s = suite ?? r.echec?.suite ?? null
    if (s) {
      const m = r.echec?.motif ?? motif
      return (
        <>
          {!enLigne && <HorsLigneRemise quoi="L’échec et ses preuves sont enregistrés sur le téléphone." />}
          {prog}
          <div className="hero night">
            <Hk quand={r.echec ? heure(r.echec.quand, langue) : undefined}>{t('Échec enregistré')}</Hk>
            <div className="ht">{m ? tf('{motif} : dépôt au relais de la zone', { motif: t(titreMotif(m)) }) : t('Dépôt au relais de la zone')}</div>
            <div className="hs">{t('Suite décidée par le système. Vous n’avez rien à choisir.')}</div>
            <div className="lr-proofs">
              {(m === 'absent' || m === 'injoignable') && (
                <>
                  <Preuve icone="timer">{tf('Attente {n} min', { n: pr.attenteMin })}</Preuve>
                  <Preuve icone="phone">{pr.appels.length === 1 ? t('1 appel masqué') : tf('{n} appels masqués', { n: pr.appels.length })}</Preuve>
                </>
              )}
              {m === 'danger' && <Preuve icone="siren">{t('Signalement')}</Preuve>}
              {photo && <Preuve icone="camera">{t('Photo')}</Preuve>}
            </div>
          </div>
          <Sec titre={t('Destination du colis')} />
          <CarteRelais
            k={tf('Relais de la zone {z}', { z: arret.zone })}
            nom={s.relais}
            minis={[
              [t('Ouvert jusqu’à'), heure(s.ouvertJusqua, langue)],
              [t('Colis'), r.colis.map((c) => c.etiquette).join(', ')],
              [t('Zone'), arret.zone],
            ]}
          />
          <div className="card tight">
            <Li icone="bell-ring" ton="or" t={tf('{prenom} est prévenue avec son code de retrait', { prenom: r.prenom })} s={t('À l’arrivée du colis au relais ; elle choisit le retrait ou une nouvelle course.')} />
            <Li icone="house" ton="ink" t={t('Nouvelle tentative à domicile')} s={tf('Seulement si {prenom} la demande : c’est une nouvelle course.', { prenom: r.prenom })} />
            <Li icone="package" ton="acc" t={t('Le colis ne reste jamais sur vous')} s={t('Jamais chez un voisin, un gardien, devant la porte ni chez vous.')} />
          </div>
          <FileRemise objets={[arret.id]} />
          <BarreAction>
            <Enchainement actif={!!suite} />
            <Link className="btn primary xl" to={chemin('tournee')}>
              <Icone nom="navigation" taille={18} />
              <span>{tf('Aller au {relais}', { relais: s.relais })}</span>
            </Link>
          </BarreAction>
        </>
      )
    }
    if (r.remiseA) return <RienIci titre="Remise déjà validée" texte="Ce colis a été remis : il n’y a pas d’échec à déclarer." icone="circle-check" />

    // ---------- Motif ----------
    if (!motif || !preuvesVues)
      return (
        <>
          {prog}
          <Note ton="ink" icone="info">
            {t('Chaque motif exige ses preuves. La suite est décidée par le système, jamais par vous.')}
          </Note>
          <Sec titre={t('Motif de l’échec')} />
          <div role="radiogroup" aria-label={t('Motif')}>
            {MOTIFS.map((m) => (
              <Choix key={m.id} on={motif === m.id} titre={t(m.titre)} sous={t(m.preuve)} onClick={() => choisir(m.id)} />
            ))}
          </div>
          <BarreAction aide={!motif ? t('Choisissez d’abord le motif.') : undefined}>
            <button type="button" className="btn primary xl" disabled={!motif} onClick={() => setPreuvesVues(true)}>
              <Icone nom="camera" taille={18} />
              <span>{t('Continuer : preuves')}</span>
            </button>
            <Link className="btn ghost mt8" style={{ width: '100%' }} to={chemin('domicile', { a: arret.id })}>
              <span>{t('Revenir à la remise')}</span>
            </Link>
          </BarreAction>
        </>
      )

    // ---------- Lieu dangereux ----------
    if (motif === 'danger') {
      const assez = note.trim().length >= regles.noteMin
      return (
        <>
          {prog}
          <div className="hero red">
            <Hk couleur="#FFB4AB">{t('Lieu jugé dangereux')}</Hk>
            <h2 className="ht" style={{ marginBottom: 0 }}>
              {t('N’y allez pas')}
            </h2>
            <div className="hs">{t('Votre sécurité passe avant la remise, sans aucune pénalité. Signalez-le : la suite est décidée par le système.')}</div>
            <div className="btns" style={{ marginTop: 14 }}>
              <Link className="btn white" to={chemin('aide')}>
                <Icone nom="siren" taille={18} />
                <span>{t('SOS')}</span>
              </Link>
            </div>
          </div>
          <Sec titre={t('Signalement')} />
          <div className="card">
            <label className="fld" style={{ display: 'block' }}>
              <span className="b7 t13">{tf('Ce qui rend le lieu dangereux · {n} caractères au moins', { n: regles.noteMin })}</span>
              <textarea className="inp area" style={{ width: '100%', minHeight: 88, font: 'inherit', marginTop: 6 }} value={note} maxLength={400} onChange={(e) => setNote(e.target.value)} />
            </label>
            <div className={'lr-cnt' + (assez ? '' : ' ko')}>{assez ? tf('{n} caractères · suffisant', { n: note.trim().length }) : tf('{n} caractères sur {min} au moins', { n: note.trim().length, min: regles.noteMin })}</div>
            <Hint icone="camera-off">{t('Photo facultative : ne photographiez jamais au risque de votre sécurité.')}</Hint>
            <PhotoPreuve titre="Photo (facultative)" sous="Seulement si vous êtes en sécurité." consigne="Seulement si vous êtes en sécurité" nature="echec" objet={arret.id} type="echec" id={photo?.id ?? null} heure={photo?.heure} enFile={photo?.enFile} prise={setPhoto} facultative />
          </div>
          <Sec titre={t('Suite')} />
          <div className="card tight">
            <Li icone="store" ton="acc" t={t('Dépôt au relais de la zone de la cliente')} s={tf('Désigné par le système ; {prenom} y est prévenue avec son code de retrait.', { prenom: r.prenom })} />
            <Li icone="building-2" ton="ink" t={tf('{entreprise} et la console sont prévenues', { entreprise: tournee.entreprise })} s={t('Le lieu est signalé pour les courses suivantes.')} />
          </div>
          {erreur && <Message ton="erreur">{erreur}</Message>}
          <BarreAction aide={!assez ? t('Décrivez le danger : la note est la seule preuve exigée.') : undefined}>
            <button type="button" className="btn red xl" disabled={!assez || occupe} onClick={() => void enregistrer()}>
              <Icone nom="send" taille={18} />
              <span>{t('Envoyer le signalement')}</span>
            </button>
            <button type="button" className="btn ghost mt8" style={{ width: '100%' }} onClick={() => setPreuvesVues(false)}>
              <span>{t('Changer de motif')}</span>
            </button>
          </BarreAction>
        </>
      )
    }

    // ---------- Preuves du motif ----------
    const espaces = pr.appels.filter((a, i) => i === 0 || a - pr.appels[i - 1] >= regles.absentIntervalleMin * 60000).length
    const preuves: [string, boolean, string | null][] = absence
      ? [
          [tf('Attente sur place : {n} min sur {max}', { n: pr.attenteMin, max: regles.absentAttenteMin }), pr.attenteMin >= regles.absentAttenteMin, r.arriveeA ? tf('Depuis {h} · {n} minutes au moins', { h: heure(r.arriveeA, langue), n: regles.absentAttenteMin }) : tf('{n} minutes au moins', { n: regles.absentAttenteMin })],
          [tf('{n} appels masqués à {m} min d’intervalle au moins', { n: regles.absentAppels, m: regles.absentIntervalleMin }), espaces >= regles.absentAppels, appels],
          [t('Photo de la porte'), !!photo, t('Porte fermée, sans la maison au-delà de la porte')],
        ]
      : motif === 'introuvable'
        ? [
            [t('Un appel masqué à la cliente'), pr.appels.length >= 1, appels],
            [t('Photo du lieu et position'), !!photo, null],
          ]
        : [[t('Photo du colis refusé'), !!photo, r.constat ? t('constat déjà enregistré : refus pour défaut') : null]]
    const complet = preuves.every((x) => x[1])
    // Délais en direct (M17) : fin de l'attente exigée sur place, et prochain appel compté (intervalle minimal).
    const finAttente = r.arriveeA ? r.arriveeA + regles.absentAttenteMin * 60000 : 0
    const finAppel = pr.appels.length && espaces < regles.absentAppels ? pr.appels[pr.appels.length - 1] + regles.absentIntervalleMin * 60000 : 0
    const choisi = MOTIFS.find((x) => x.id === motif)!
    return (
      <>
        {!enLigne && <HorsLigneRemise quoi="L’échec et ses preuves sont enregistrés sur le téléphone." />}
        {prog}
        <AideEtape etape="echec" />
        <div className="card tight">
          <Li
            icone={choisi.icone}
            ton="red"
            t={tf('Motif : {motif}', { motif: t(choisi.titre).replace(/^./, (x) => x.toLowerCase()) })}
            s={r.arriveeA ? tf('Arrivé à {h} à la position de remise', { h: heure(r.arriveeA, langue) }) : t(choisi.preuve)}
            droite={
              <button type="button" className="btn ghost sm" onClick={() => setPreuvesVues(false)}>
                <span>{t('Changer')}</span>
              </button>
            }
          />
        </div>
        <Sec titre={t('Preuves exigées')} droite={t('cochées par le système')} />
        <div className="card tight">
          {preuves.map(([titre, ok, detail]) => (
            <Chk key={titre} st={ok ? 'on' : 'wait'} titre={titre} sous={detail ?? undefined} />
          ))}
        </div>
        {absence && (finAttente > maintenant || finAppel > maintenant) && (
          <div className="row mt8" style={{ flexWrap: 'wrap', gap: 8 }}>
            {finAttente > maintenant && <Rebours fin={finAttente} maintenant={maintenant} libelle={t('Attente exigée : encore')} />}
            {finAppel > maintenant && <Rebours fin={finAppel} maintenant={maintenant} libelle={t('Prochain appel possible dans')} icone="phone" />}
          </div>
        )}
        {(
          <div className="card">
            <PhotoPreuve
              titre={absence ? 'Photo de la porte' : motif === 'introuvable' ? 'Photo du lieu' : 'Photo du colis refusé'}
              sous={absence ? 'Porte de remise seulement, jamais l’intérieur.' : 'Prise dans l’application, avec l’heure et la position.'}
              consigne={absence ? 'Porte de remise seulement, jamais l’intérieur' : 'Photo du lieu ou du colis'}
              nature="echec"
              objet={arret.id}
              type="echec"
              id={photo?.id ?? null}
              heure={photo?.heure}
              enFile={photo?.enFile}
              prise={setPhoto}
            />
          </div>
        )}
        {(absence || motif === 'introuvable') && (
          <div className="btns">
            <Link className="btn secondary" to={chemin('appel', { avec: 'client', a: arret.id })}>
              <Icone nom="phone" taille={18} />
              <span>{tf('Appeler {prenom} · numéro masqué', { prenom: r.prenom })}</span>
            </Link>
          </div>
        )}
        {motif === 'introuvable' && (
          <label className="fld mt12" style={{ display: 'block' }}>
            <span className="b7 t13">{t('Ce que vous avez cherché (facultatif)')}</span>
            <textarea className="inp area" style={{ width: '100%', minHeight: 72, font: 'inherit', marginTop: 6 }} value={note} maxLength={400} onChange={(e) => setNote(e.target.value)} />
          </label>
        )}
        <Note ton="red" icone="ban">
          {t('Ne laissez jamais le colis à un voisin, à un gardien ou devant la porte, et ne le ramenez jamais chez vous.')}
        </Note>
        <Hint icone="info">{t('Vous ne recevez jamais vous-même un litige : votre entreprise répond avec vos preuves.')}</Hint>
        {erreur && <Message ton="erreur">{erreur}</Message>}
        <BarreAction aide={!complet ? t('Chaque preuve exigée doit être cochée par le système.') : undefined}>
          <AvisAnnuler d={differe} />
          <button type="button" className="btn red xl" disabled={!complet || occupe || !!differe.attente} onClick={() => differe.lancer('Échec de remise', enregistrer)}>
            <Icone nom="send" taille={18} />
            <span>{t('Enregistrer l’échec')}</span>
          </button>
        </BarreAction>
      </>
    )
  }

  return (
    <Ecran proto route="echec-domicile" titre={suite || r?.echec ? t('Échec de remise') : undefined}>
      <Lvp className="liv07">{contenu()}</Lvp>
    </Ecran>
  )
}
