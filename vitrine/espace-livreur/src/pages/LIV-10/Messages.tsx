// LIV-P27 · Messages (LIV-10-R03 à R15, LIV-P27R-01 à R04, LIV-RG-R207 à R211, DED-13, DED-14, DP-61).
// Structure du prototype (route('messages') : en-tête racine, titre, puces, « Votre entreprise et le support », un bloc
// par mission ouverte, « Fils fermés · lecture seule », note des numéros masqués, pied de connexion).
// Fil (?fil=…, états s=fil / s=entreprise / s=ferme du prototype) : en-tête secondaire au nom de l'interlocuteur, carte
// du fil (mission, fermeture, appel masqué, revue), bulles datées, messages système, réponses rapides et zone d'écriture
// en bas (sans barre d'onglets) ; tout numéro, e-mail, identifiant social ou code est masqué par le serveur ;
// « Signaler » un message (le fil passe en revue au support). Fil fermé : lecture seule, contacter hors application
// après la mission interdit. Hors connexion : les fils déjà téléchargés restent lisibles ; un message part en file.
// Les messages d'un tiers ne sont jamais traduits (LIV-P31R-02) ; seuls les messages de BelivaY suivent la langue.
// Enrichissements : recherche dans les fils (titre, dernier message, paquet) et « Tout marquer comme lu » (M5).
import { GesteTraduction, useTraduction } from '@client/traduction/Traduisible'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Recherche, plier } from '../../composants/enrichis'
import { Icone } from '../../composants/Icone'
import { Btn, Carte, Chips, Foot, HorsConnexion, Note, Pill, Sec, Vide, type Ton } from '../../composants/proto'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { enAttente, useEnLigne, useFile } from '../../donnees/fileHorsLigne'
import type { Fil, Interlocuteur, Message } from '../../donnees/domaines/messages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance, heure, jourCourt, jourLong } from '../../i18n/temps'
import { jourDe } from '../../calculs/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Chargement, ErreurLecture, FeuilleAppel, useAppel, useMaintenant, useOrigine } from '../LIV-08/commun'
import { LivcIc, TexteMasque } from './livc'
import './liv10.css'

export default function Messages() {
  const [p] = useSearchParams()
  const id = p.get('fil')
  return id ? <FilOuvert id={id} /> : <Liste />
}

/* ---------- aides livc_ du prototype (LIV-P27) ---------- */

const ICONES: Record<Interlocuteur, [string, Ton]> = { entreprise: ['building-2', 'acc'], support: ['life-buoy', 'night'], vendeur: ['store', 'or'], relais: ['package-check', 'blue'], client: ['house', 'acc'] }

function quand(q: number, maintenant: number, langue: 'fr' | 'en') {
  return jourDe(q) === jourDe(maintenant) ? heure(q, langue) : `${jourCourt(q, langue)} ${heure(q, langue)}`
}

/** livc_thr : ligne d'un fil (avatar, titre, heure, aperçu, étiquettes, point non lu). */
function LivcThr({ x, vers, tm, etiquettes }: { x: Fil; vers: string; tm: string; etiquettes: ReactNode }) {
  const { t, tf } = usePreferences()
  const [icone, ton] = ICONES[x.interlocuteur]
  return (
    <Link className="livc-thr" to={vers}>
      <span className="av">
        <LivcIc icone={icone} ton={x.etat === 'ferme' ? 'ink' : ton} taille={46} style={{ borderRadius: 14 }} />
      </span>
      <span className="grow">
        <span className="tt">
          <b>{t(x.titre)}</b>
          <span>{tm}</span>
        </span>
        <span className={'pv' + (x.nonLus > 0 ? ' unread' : '')}>
          <TexteMasque texte={x.dernier.texte} />
        </span>
        <span className="tg2">{etiquettes}</span>
      </span>
      {x.nonLus > 0 && <span className="livc-dot" role="img" aria-label={x.nonLus > 1 ? tf('{n} non lus', { n: x.nonLus }) : t('1 non lu')}></span>}
    </Link>
  )
}

/** livc_bub : bulle (reçue, envoyée : « Message rapide », en file ou distribuée). */
function LivcBub({ x, qui, rapide, peutSignaler, signaler }: { x: Message; qui?: string; rapide: boolean; peutSignaler: boolean; signaler: (id: string) => void }) {
  const { t, langue } = usePreferences()
  const dir = x.de === 'moi' ? 'out' : 'in'
  // Message reçu dans une autre langue que l'écran : « Traduire / Voir l'original » (@client/traduction).
  const tr = useTraduction(dir === 'in' ? x.texte : '')
  return (
    <div className={'livc-b ' + dir}>
      {dir === 'in' && qui && <span className="who">{qui}</span>}
      {rapide && (
        <>
          <span className="qk">
            <Icone nom="zap" taille={11} />
            {t('Message rapide')}
          </span>
          <br />
        </>
      )}
      <TexteMasque texte={dir === 'in' ? tr.affiche : x.texte} />
      {tr.proposer && <GesteTraduction etat={tr.etat} basculer={tr.basculer} />}
      <span className="tm">
        {x.etat === 'en_file' && t('en file') + ' · '}
        {heure(x.quand, langue)}
        {dir === 'out' && <Icone nom={x.etat === 'en_file' ? 'clock' : 'check-check'} taille={14} />}
      </span>
      {dir === 'in' && peutSignaler && (
        <button type="button" className="l10-signaler" onClick={() => signaler(x.id)} aria-label={t('Signaler ce message')} disabled={x.signale}>
          <Icone nom="flag" taille={14} />
          {t(x.signale ? 'Signalé' : 'Signaler')}
        </button>
      )}
    </div>
  )
}

/** livc_compose : réponses rapides et zone d'écriture. */
function LivcCompose({ rapides, envoyer, ecrire }: { rapides: string[]; envoyer: (v: string, e?: FormEvent) => void; ecrire: string }) {
  const { t } = usePreferences()
  const [texte, setTexte] = useState('')
  return (
    <>
      <div className="livc-qr" role="group" aria-label={t('Messages rapides')}>
        {rapides.map((r) => (
          <button key={r} type="button" onClick={() => envoyer(t(r))}>
            <Icone nom="zap" taille={14} />
            {t(r)}
          </button>
        ))}
      </div>
      <form className="livc-compose" onSubmit={(e) => (envoyer(texte, e), setTexte(''))}>
        <input className="in" value={texte} onChange={(e) => setTexte(e.target.value)} maxLength={600} placeholder={ecrire} aria-label={ecrire} />
        <button type="submit" className="send" disabled={!texte.trim()} aria-label={t('Envoyer')}>
          <Icone nom="send" taille={20} />
        </button>
      </form>
    </>
  )
}

/* ---------- liste des fils ---------- */

function Liste() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const entreprise = s.livreur?.entreprise ?? ''
  const m = useMaintenant()
  const en = useEnLigne()
  const file = useFile()
  const [filtre, setFiltre] = useState<'tous' | 'missions' | 'entreprise' | 'support'>('tous')
  const [q, setQ] = useState('')
  const l = useLecture(() => source.messages.fils(), [])
  if (l.erreur)
    return (
      <Ecran route="messages" proto>
        <ErreurLecture relire={l.relire} />
      </Ecran>
    )
  const fils = l.donnees
  const enFile = enAttente(file, 'message')
  const enFileDe = (x: Fil) => enFile.filter((a) => a.objet.startsWith(x.id + '-')).length
  const nb = (f: (x: Fil) => boolean) => (fils ?? []).filter(f).length
  const cherche = plier(q.trim())
  const garde = (x: Fil) => (filtre === 'tous' || (filtre === 'missions' ? x.mission !== null : x.interlocuteur === filtre)) && (!cherche || plier([t(x.titre), x.dernier.texte, x.mission ?? ''].join(' ')).includes(cherche))
  const nonLus = (fils ?? []).filter((x) => x.nonLus > 0)
  const toutLu = async () => {
    await Promise.all(nonLus.map((x) => source.messages.marquerLu(x.id)))
    signal('toucher')
    l.relire()
  }
  const ouverts = (fils ?? []).filter((x) => x.etat === 'ouvert' && garde(x))
  const directs = ouverts.filter((x) => x.mission === null)
  const missions = [...new Set(ouverts.filter((x) => x.mission !== null).map((x) => x.mission!))]
  const fermes = (fils ?? []).filter((x) => x.etat === 'ferme' && garde(x))
  const enFilePill = (n: number) =>
    n > 0 && (
      <Pill ton="amber" sm icone="clock">
        {n > 1 ? tf('{n} messages en file', { n }) : t('1 message en file')}
      </Pill>
    )
  const etiquettes = (x: Fil) => {
    if (x.mission === null)
      return (
        <>
          <Pill ton="ink" sm>
            {t(x.interlocuteur === 'support' ? 'Protocoles et incidents' : 'Consignes et plannings')}
          </Pill>
          {enFilePill(enFileDe(x))}
        </>
      )
    return x.etat === 'ferme' ? (
      <Pill ton="ink" sm icone="lock">
        {t('Fermé')}
      </Pill>
    ) : (
      <>
        <Pill ton="green" sm point>
          {t('Ouvert')}
        </Pill>
        {x.enRevue && (
          <Pill ton="amber" sm icone="flag">
            {t('En revue')}
          </Pill>
        )}
        {enFilePill(enFileDe(x))}
      </>
    )
  }
  const ligne = (x: Fil) => <LivcThr key={x.id} x={x} vers={chemin('messages', { fil: x.id })} tm={quand(x.dernier.quand, m(), langue)} etiquettes={etiquettes(x)} />
  const depuis = file?.horsLigneDepuis ?? null
  return (
    <Ecran route="messages" proto>
      {!en && (
        <HorsConnexion>
          <b>{t('Hors connexion')}</b> · {enFile.length > 0 ? (enFile.length > 1 ? tf('{n} messages en file, envoyés au retour du réseau.', { n: enFile.length }) : t('1 message en file, envoyé au retour du réseau.')) + ' ' : ''}
          {t('Les fils déjà téléchargés restent lisibles.')}
        </HorsConnexion>
      )}
      <div className="pg">
        <h1 className="pg-t">{t('Messages')}</h1>
        <p className="pg-s">{t('Votre entreprise, le support BelivaY et les fils de vos missions, sans jamais un numéro.')}</p>
      </div>
      <div className="l10-chips">
      <Chips
        items={[
          { t: t('Tous'), n: nb(() => true), on: filtre === 'tous', onClick: () => setFiltre('tous') },
          { t: t('Missions'), n: nb((x) => x.mission !== null), on: filtre === 'missions', onClick: () => setFiltre('missions') },
          { t: entreprise || t('Entreprise'), n: nb((x) => x.interlocuteur === 'entreprise'), on: filtre === 'entreprise', onClick: () => setFiltre('entreprise') },
          { t: t('Support'), n: nb((x) => x.interlocuteur === 'support'), on: filtre === 'support', onClick: () => setFiltre('support') },
        ]}
      />
      </div>
      <Recherche valeur={q} changer={setQ} libelle={t('Chercher dans les messages')} resultats={cherche ? nb(garde) : undefined} />
      {nonLus.length > 0 && (
        <button type="button" className="l10-msg-lu" onClick={() => void toutLu()}>
          <Icone nom="check-check" taille={18} />
          {nonLus.length > 1 ? tf('Tout marquer comme lu · {n} fils', { n: nonLus.length }) : t('Tout marquer comme lu · 1 fil')}
        </button>
      )}
      {!fils ? (
        <Chargement lignes={3} />
      ) : directs.length + missions.length + fermes.length === 0 ? (
        <Carte style={{ marginTop: 12 }}>
          <Vide icone="message-circle" t={t('Aucun fil ici')} s={t('Les fils de mission s’ouvrent quand votre entreprise vous affecte un paquet.')} />
        </Carte>
      ) : (
        <>
          {directs.length > 0 && (
            <section aria-label={t('Votre entreprise et le support')}>
              <Sec titre={t('Votre entreprise et le support')} />
              <Carte cls="tight">{directs.map(ligne)}</Carte>
            </section>
          )}
          {missions.map((mi) => (
            <section key={mi} aria-label={tf('Fils de mission · {m}', { m: mi })}>
              <Sec titre={tf('Fils de mission · {m}', { m: mi })} />
              <Carte cls="tight">{ouverts.filter((x) => x.mission === mi).map(ligne)}</Carte>
            </section>
          ))}
          {fermes.length > 0 && (
            <section aria-label={t('Fils fermés · lecture seule')}>
              <Sec titre={t('Fils fermés · lecture seule')} />
              <Carte cls="tight">{fermes.map(ligne)}</Carte>
            </section>
          )}
        </>
      )}
      <Note ton="acc" icone="eye-off">
        {t('Numéros, e-mails et identifiants sociaux sont')} <b>{t('masqués automatiquement')}</b>. {t('Depuis chaque fil de mission ouvert, l’appel passe par un numéro masqué ; chaque appel est noté au journal (heure et durée, jamais son contenu).')}
      </Note>
      <Foot icone={en ? 'wifi' : 'wifi-off'}>{en ? t('Connecté · messages à jour') : depuis !== null ? tf('Hors connexion · dernière synchronisation à {h}', { h: heure(depuis, langue) }) : t('Hors connexion')}</Foot>
    </Ecran>
  )
}

/* ---------- fil ouvert ---------- */

function FilOuvert({ id }: { id: string }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const m = useMaintenant()
  const o = useOrigine()
  const en = useEnLigne()
  const lec = useLecture(() => source.messages.fil(id).then((v) => ({ v })), [id])
  const appel = useAppel()
  const feuille = useFeuille('signaler')
  const [aSignaler, setASignaler] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const bas = useRef<HTMLDivElement>(null)
  const f = lec.donnees?.v ?? null
  useEffect(() => {
    if (f && f.fil.nonLus > 0) void source.messages.marquerLu(id)
  }, [f, id])
  useEffect(() => {
    bas.current?.scrollIntoView?.({ block: 'end' })
  }, [f?.messages.length])
  if (lec.erreur)
    return (
      <Ecran route="messages" entete="enfant" barre={false} retour={chemin('messages')} titre={t('Fil de discussion')} proto action="aucune">
        <ErreurLecture relire={lec.relire} />
      </Ecran>
    )
  if (!lec.donnees)
    return (
      <Ecran route="messages" entete="enfant" barre={false} retour={chemin('messages')} titre={t('Fil de discussion')} proto action="aucune">
        <Chargement lignes={3} />
      </Ecran>
    )
  if (!f)
    return (
      <Ecran route="messages" entete="enfant" barre={false} retour={chemin('messages')} titre={t('Fil de discussion')} proto action="aucune">
        <Carte style={{ marginTop: 12 }}>
          <Vide icone="message-circle" t={t('Fil introuvable')} s={t('Ce fil n’est pas sur ce téléphone.')}>
            <div className="btns">
              <Btn kind="secondary" vers={chemin('messages')}>
                {t('Revenir aux messages')}
              </Btn>
            </div>
          </Vide>
        </Carte>
      </Ecran>
    )
  const fil = f.fil
  const ferme = fil.etat === 'ferme'
  const entreprise = s.livreur?.entreprise ?? ''
  const [icone, ton] = ICONES[fil.interlocuteur]
  const envoyer = async (v: string, e?: FormEvent) => {
    e?.preventDefault()
    if (!v.trim()) return
    const r = await source.messages.envoyer(id, v, o(), en)
    if (!r.ok) {
      setInfo(r.raison === 'fil_ferme' ? 'Ce fil est fermé : lecture seule.' : 'Écrivez un message.')
      signal('erreur')
      return
    }
    lec.relire()
    setInfo(r.masque ? 'Un numéro, une adresse ou un code ont été masqués : passez par l’application.' : en ? null : 'Pas de réseau : le message part au retour du réseau.')
    signal(en ? 'succes' : 'alerte')
  }
  const signaler = async () => {
    if (!aSignaler) return
    const r = await source.messages.signaler(id, aSignaler, o())
    feuille.fermer()
    lec.relire()
    setInfo(r.ok ? 'Message signalé : le fil passe en revue au support BelivaY.' : 'Ce message est déjà signalé.')
    signal(r.ok ? 'succes' : 'erreur')
  }
  // Carte du fil (prototype : « Fil de mission · PQ… », « Yafé Express · votre entreprise », fil fermé).
  const titreCarte = fil.mission ? tf('Fil de mission · {m}', { m: fil.mission }) : fil.interlocuteur === 'entreprise' ? tf('{e} · votre entreprise', { e: entreprise }) : t('Support BelivaY')
  const sousCarte = fil.mission
    ? ferme
      ? tf('Fermé {quand}, 2 heures après la fin de la mission · consultable par la console en cas de litige', { quand: echeance(fil.fermeA ?? 0, m(), langue) })
      : fil.fermeA
        ? tf('Ouvert à l’affectation · se ferme {quand}, 2 h après la fin de la mission · lisible par la console en cas de litige', { quand: echeance(fil.fermeA, m(), langue) })
        : t('Ouvert à l’affectation · se ferme 2 h après la fin de la mission · lisible par la console en cas de litige')
    : fil.interlocuteur === 'entreprise'
      ? t('Consignes et plannings')
      : tf('Protocoles et incidents · {h}', { h: f.horairesSupport })
  const appelLib = fil.interlocuteur === 'entreprise' ? tf('Appeler {e}', { e: entreprise }) : t('Appel masqué')
  // Fil : un séparateur « livc-day » à chaque changement de jour, messages système, bulles.
  const fils: ReactNode[] = []
  let jourPrec = ''
  f.messages.forEach((x) => {
    const j = jourDe(x.quand)
    if (j !== jourPrec) {
      jourPrec = j
      fils.push(
        <span key={'j' + x.id} className="livc-day">
          {j === jourDe(m()) ? t('Aujourd’hui') : jourLong(x.quand, langue)}
        </span>,
      )
    }
    if (x.de === 'systeme')
      fils.push(
        <span key={x.id} className="livc-sys">
          {t(x.texte)}
        </span>,
      )
    else {
      fils.push(<LivcBub key={x.id} x={x} qui={fil.interlocuteur === 'client' ? t('Client') : t(fil.titre)} rapide={x.de === 'moi' && f.rapides.some((r) => t(r) === x.texte || r === x.texte)} peutSignaler={!ferme && fil.interlocuteur !== 'support'} signaler={(mid) => (setASignaler(mid), feuille.ouvrir())} />)
      if (x.masque && x.de === 'eux')
        fils.push(
          <span key={x.id + '-m'} className="livc-sys">
            <Icone nom="eye-off" taille={13} /> {t('Numéro masqué automatiquement · utilisez l’appel masqué')}
          </span>,
        )
    }
  })
  if (ferme && fil.fermeA)
    fils.push(
      <span key="ferme" className="livc-sys">
        <Icone nom="lock" taille={13} /> {tf('Fil fermé à {h}', { h: heure(fil.fermeA, langue) })}
      </span>,
    )
  return (
    <Ecran
      route="messages"
      entete="enfant"
      barre={false}
      retour={chemin('messages')}
      titre={t(fil.titre)}
      proto
      action={
        ferme ? (
          'aucune'
        ) : (
          // Appel masqué à droite de l'en-tête, comme le prototype (subHeader, right : call()).
          <button type="button" className={'l-ibtn l10-appel' + (fil.appel === 'ouvert' ? '' : ' ko')} aria-label={appelLib} onClick={() => void appel.appeler(fil.interlocuteur === 'entreprise' ? 'entreprise' : fil.id)}>
            <Icone nom="phone" taille={22} />
          </button>
        )
      }
      fixes={
        <>
          <div className="bottom-cta l-verre l10-cta">
            {ferme ? (
              <div className="l10-ro">
                <Icone nom="lock" taille={16} />
                {t('Lecture seule · ce fil est fermé')}
              </div>
            ) : (
              <LivcCompose rapides={f.rapides} envoyer={(v, e) => void envoyer(v, e)} ecrire={fil.interlocuteur === 'entreprise' ? tf('Écrire à {e}…', { e: entreprise }) : t('Écrire un message…')} />
            )}
          </div>
          <FeuilleAppel a={appel} />
          <Feuille ouverte={feuille.ouverte} fermer={feuille.fermer} titre={t('Signaler ce message')} classe="livc-sheet">
            <div className="livc-sh-h">
              <LivcIc icone="flag" ton="amber" taille={46} />
              <div className="grow">
                <h2>{t('Signaler ce message')}</h2>
                <p>{t('Insulte, menace, demande d’argent ou de numéro : le support BelivaY relit le fil et vous répond. Votre interlocuteur ne sait pas qui a signalé.')}</p>
              </div>
            </div>
            <div className="btns" style={{ marginTop: 14 }}>
              <Btn kind="danger" icone="flag" onClick={() => void signaler()}>
                {t('Signaler au support')}
              </Btn>
            </div>
            <div className="btns">
              <Btn kind="ghost" onClick={feuille.fermer}>
                {t('Annuler')}
              </Btn>
            </div>
          </Feuille>
        </>
      }
    >
      <div className="card flat" style={{ padding: '12px 14px', marginTop: 12 }}>
        <div className="row" style={{ gap: 10 }}>
          <LivcIc icone={icone} ton={ferme ? 'ink' : ton} taille={40} />
          <div className="grow">
            <div className="b8 t14">{titreCarte}</div>
            <div className="t12 c3 mt4">{sousCarte}</div>
          </div>
          {ferme && (
            <Pill ton="ink" sm icone="lock">
              {t('Fermé')}
            </Pill>
          )}
        </div>
      </div>
      {fil.enRevue && (
        <Note ton="amber" icone="flag">
          <b>{t('Fil en revue au support')}</b> · {t('Un message a été signalé : le support BelivaY relit le fil.')}
        </Note>
      )}
      <div className="livc-thread" aria-live="polite">
        {fils}
        <div ref={bas}></div>
      </div>
      {info && (
        <Note ton="ink" icone="info" role="status">
          {t(info)}
        </Note>
      )}
      {ferme ? (
        <Note ton="red" icone="ban">
          {t('Contacter un client ou un vendeur hors de l’application après la mission est interdit, pendant le contrat de votre entreprise et 12 mois après.')}
        </Note>
      ) : fil.mission ? (
        <Note ton="ink" icone="image-off">
          {t('Pas de photo de colis ici : les preuves se prennent dans l’étape prévue, jamais par message. Jamais de code par message.')}
        </Note>
      ) : null}
      <div className="l10-cta-place" aria-hidden="true"></div>
    </Ecran>
  )
}
