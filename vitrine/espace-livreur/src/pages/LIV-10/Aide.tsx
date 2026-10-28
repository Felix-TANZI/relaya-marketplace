// LIV-P30 · Aide et SOS (LIV-10-R34 à R40, LIV-P30R-01 à R05, LIV-08-R19, S-07, O-11).
// Structure du prototype (route('aide') : en-tête secondaire avec le bouton SOS à droite ; carte « Danger immédiat »
// au gros bouton SOS, « Accident avec blessé », champ de recherche, « Fiches par sujet », « Parler à quelqu'un »,
// pied des fiches hors connexion). États :
// - s=sos : l'appui long (LIV-SOS-APPUI-S, sans autre confirmation) ; le lien SOS de l'en-tête ouvre cet état ;
// - SOS actif (s=sos-en-cours du prototype) : coque « SOS en cours » sans barre ; appel à l'entreprise puis au support,
//   position partagée (une toutes les SOS-POSITION-S secondes) jusqu'à l'arrêt automatique, secours, « Arrêter le
//   SOS » en un geste ;
// - s=urgence : accident avec blessé, les numéros d'urgence du pays d'abord ;
// - ?sujet=… : les fiches d'un sujet ; ?fiche=… : une fiche (lecture vocale, étapes, interdit, conséquence, action) ;
// - fiches de travail (DP-66 : l'ancienne page « Apprendre » ; ?sujet=gestes, ?geste=…, gestes.tsx), cherchées avec
//   les autres ; les interdits (?sujet=interdits) reprennent l'ancienne page « Droits, interdits et limites » : une
//   limite s'affiche là où elle bloque, avec son « Pourquoi ? » ;
// - hors connexion : les fiches restent lisibles et audibles, le SOS appelle par le réseau téléphonique.
// Parler à quelqu'un : l'entreprise (appel masqué), le support BelivaY (fil ; WhatsApp quand son numéro est publié :
// aide seulement, jamais une preuve ni un code) ; « Ouvert · jusqu'à 21 h » ou « Fermé · rouvre à 7 h » selon l'heure.
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Barre, Btn, Carte, Chrono, Foot, HorsConnexion, Li, Note, Pill, Sec, Vide } from '../../composants/proto'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { noterPosition, useEnLigne } from '../../donnees/fileHorsLigne'
import type { Aide as DonneesAide, EtatSOS, Fiche, SujetFiche } from '../../donnees/domaines/aide'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { minutesDuJour } from '../../calculs/temps'
import { heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Chargement, ErreurLecture, FeuilleAppel, useAppel, useBattement, useLecteur, useMaintenant, useOrigine } from '../LIV-08/commun'
import { LivcLab } from './livc'
import { FicheGeste, ListeGestes, gestesTrouves, useValeursGestes } from './gestes'
import { fiche as ficheGesteDe } from './fiches-gestes'
import './liv10.css'

/* ---------- aides livc_ du prototype (LIV-P30) ---------- */

/** LIVC_FICHES : les sujets, dans l'ordre du prototype (icône, teinte, titre, ce qu'ils couvrent). */
const SUJETS: { id: SujetFiche; icone: string; ton: 'acc' | 'red' | 'amber' | 'blue' | 'night' | 'or'; titre: string; sous: string }[] = [
  { id: 'tournee', icone: 'route', ton: 'acc', titre: 'La tournée, étape par étape', sous: 'Ramasser, contrôler, emballer, déposer, remettre' },
  { id: 'incidents', icone: 'triangle-alert', ton: 'red', titre: 'Les incidents', sous: 'Une fiche par situation, avec sa conséquence' },
  { id: 'interdits', icone: 'ban', ton: 'amber', titre: 'Les interdits', sous: 'Les règles de la charte d’accès' },
  { id: 'securite', icone: 'hard-hat', ton: 'blue', titre: 'Sécurité et conduite', sous: 'Casque, pluie, agression, colis de valeur' },
  { id: 'sans_reseau', icone: 'wifi-off', ton: 'night', titre: 'Travailler sans réseau', sous: 'La file d’envoi, le téléphone perdu' },
  { id: 'zero_espece', icone: 'hand-coins', ton: 'or', titre: 'Aucun argent', sous: 'Tout est payé en ligne : vous ne recevez rien' },
]

/** livc_sosBig : le gros bouton SOS ; appui long (pointeur, ou Espace / Entrée maintenus), anneau de progression. */
function LivcSosBig({ appuiS, declencher }: { appuiS: number; declencher: () => void }) {
  const { t, tf } = usePreferences()
  const [p, setP] = useState(0)
  const [astuce, setAstuce] = useState(false)
  const debut = useRef<number | null>(null)
  const anim = useRef(0)
  const declenche = useRef(false)
  const arreter = () => {
    debut.current = null
    cancelAnimationFrame(anim.current)
    setP(0)
  }
  const tick = () => {
    if (debut.current === null) return
    const x = Math.min(1, (performance.now() - debut.current) / (appuiS * 1000))
    setP(x)
    if (x >= 1) {
      arreter()
      declenche.current = true
      signal('sos')
      declencher()
    } else anim.current = requestAnimationFrame(tick)
  }
  const appuyer = () => {
    if (debut.current !== null) return
    debut.current = performance.now()
    signal('toucher')
    anim.current = requestAnimationFrame(tick)
  }
  useEffect(() => () => cancelAnimationFrame(anim.current), [])
  const R = 92
  const c = 2 * Math.PI * R
  const sous = p > 0 ? tf('{x} s sur {s} s', { x: (p * appuiS).toLocaleString('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }), s: appuiS }) : astuce ? t('Maintenez le bouton') : tf('Maintenir {s} s', { s: appuiS })
  return (
    <div className="livc-sos">
      <button
        type="button"
        className="b l10-sosb"
        onPointerDown={appuyer}
        onPointerUp={arreter}
        onPointerLeave={arreter}
        onPointerCancel={arreter}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), appuyer())}
        onKeyUp={arreter}
        onContextMenu={(e) => e.preventDefault()}
        // Un toucher bref ne déclenche rien : il rappelle qu'il faut maintenir.
        onClick={() => {
          if (declenche.current) return void (declenche.current = false)
          setAstuce(true)
          window.setTimeout(() => setAstuce(false), 2500)
        }}
        aria-label={tf('SOS : maintenir {s} secondes', { s: appuiS })}
      >
        {p > 0 && (
          <svg className="rg" viewBox="0 0 198 198" aria-hidden="true">
            <circle cx="99" cy="99" r={R} fill="none" stroke="rgba(217,45,32,.18)" strokeWidth="8" />
            <circle cx="99" cy="99" r={R} fill="none" stroke="#B42318" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(c * p).toFixed(1)} ${c.toFixed(1)}`} />
          </svg>
        )}
        <b>{t('SOS')}</b>
        <span aria-live="polite">{sous}</span>
      </button>
    </div>
  )
}

/** Bouton d'écoute d'une ligne (rond, teinte du livreur). */
function Ecouter({ lit, lire, label }: { lit: boolean; lire: () => void; label: string }) {
  return (
    <button type="button" className="livc-ic acc l10-ecoute" aria-pressed={lit} aria-label={label} onClick={lire}>
      <Icone nom={lit ? 'pause' : 'volume-2'} taille={17} />
    </button>
  )
}

const lecture = (t: (x: string) => string, f: Fiche) => [t(f.titre), ...f.etapes.map(t), f.interdit ? t('Interdit') + ' : ' + t(f.interdit) : '', f.consequence ? t(f.consequence) : ''].filter(Boolean).join('. ')

export default function Aide() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const entreprise = s.livreur?.entreprise ?? ''
  const [p] = useSearchParams()
  const naviguer = useNavigate()
  const en = useEnLigne()
  const o = useOrigine()
  const horloge = useMaintenant()
  const battement = useBattement(5000)
  const a = useLecture(() => source.aide.aide(), [])
  const sos = useLecture(() => source.aide.sosEnCours().then((v) => ({ v })), [battement])
  const appel = useAppel()
  const lecteur = useLecteur()
  const [q, setQ] = useState('')
  const valeursGestes = useValeursGestes()
  const etat = p.get('s') ?? ''
  const ficheId = p.get('fiche')
  const sujetId = p.get('sujet') as SujetFiche | null
  if (a.erreur)
    return (
      <Ecran route="aide" proto action="sos">
        <ErreurLecture relire={a.relire} />
      </Ecran>
    )
  if (!a.donnees)
    return (
      <Ecran route="aide" proto action="sos">
        <Chargement lignes={3} />
      </Ecran>
    )
  const d: DonneesAide = a.donnees
  const actif = sos.donnees?.v && sos.donnees.v.arreteA === null ? sos.donnees.v : null
  const dernier = sos.donnees?.v && sos.donnees.v.arreteA !== null ? sos.donnees.v : null
  const declencher = async () => {
    await source.aide.sos(o(), en)
    sos.relire()
  }
  if (actif) return <SOSEnCours s={actif} d={d} entreprise={entreprise} relire={sos.relire} />
  const fond = <FeuilleAppel a={appel} />
  const pied = <Foot icone={en ? 'download' : 'wifi-off'}>{en ? tf('Fiches disponibles hors connexion · mises à jour le {d}', { d: jourLong(d.misesAJourLe, langue) }) : tf('Hors connexion · fiches téléchargées le {d}', { d: jourLong(d.misesAJourLe, langue) })}</Foot>

  // ----- Une fiche de travail ; les fiches de travail -----
  const geste = p.get('geste')
  if (geste && ficheGesteDe(geste)) return <FicheGeste id={geste} />
  if (p.get('sujet') === 'gestes') return <ListeGestes fond={fond} pied={pied} />

  // ----- Une fiche -----
  const fiche = d.fiches.find((x) => x.id === ficheId)
  if (fiche) {
    const sujet = SUJETS.find((x) => x.id === fiche.sujet)!
    const duSujet = d.fiches.filter((x) => x.sujet === fiche.sujet)
    const lit = lecteur.lit === fiche.id
    const incident = fiche.action?.route === 'incident'
    return (
      <Ecran route="aide" proto action="sos" titre={t('Fiche')} retour={chemin('aide', { sujet: fiche.sujet })}>
        <div className="card acc" style={{ marginTop: 12 }}>
          <div className="kick acc">{t(sujet.titre)}</div>
          <h1 className="b8 t19 mt4">{t(fiche.titre)}</h1>
          <div className="t13 c3 mt4">{tf('Fiche {k} sur {n} · disponible hors connexion', { k: duSujet.indexOf(fiche) + 1, n: duSujet.length })}</div>
          <div className="row mt12 l10-lecteur">
            <button type="button" className="livc-ic solid-red l10-play" aria-pressed={lit} aria-label={t(lit ? 'Arrêter la lecture' : 'Écouter la fiche')} onClick={() => lecteur.lire(fiche.id, lecture(t, fiche))}>
              <Icone nom={lit ? 'pause' : 'volume-2'} taille={20} />
            </button>
            <div className="grow">
              <div className="b8 t14 cacc">{t(lit ? 'Lecture vocale en cours' : 'Lecture vocale · dans la langue choisie')}</div>
              <div className="mt6">
                <Barre pct={lit ? 100 : 0} ton="acc" label={t('Lecture vocale')} />
              </div>
            </div>
            
          </div>
        </div>
        <Sec titre={t('Ce que vous faites')} />
        <Carte>
          <Chrono items={fiche.etapes.map((e, i) => ({ t: `${i + 1}. ${t(e)}` }))} />
        </Carte>
        {fiche.interdit && (
          <Note ton="red" icone="ban">
            <b>{t('Interdit :')}</b> {t(fiche.interdit)}
          </Note>
        )}
        {fiche.consequence && (
          <Note ton="green" icone="shield-check">
            {t(fiche.consequence)}
          </Note>
        )}
        {fiche.action && (
          <div className="btns" style={{ marginTop: 14 }}>
            <Btn kind={incident ? 'danger' : 'primary'} icone={incident ? 'triangle-alert' : 'arrow-right'} vers={chemin(fiche.action.route, fiche.action.params)}>
              {t(fiche.action.libelle)}
            </Btn>
          </div>
        )}
        <Foot icone="file-check">{t('Fiche versionnée par BelivaY ; la console sait quelle règle elle explique.')}</Foot>
      </Ecran>
    )
  }

  // ----- Appui long (lien SOS de l'en-tête) -----
  if (etat === 'sos')
    return (
      <Ecran route="aide" proto action="sos" titre={t('SOS')} fixes={fond}>
        {!en && <HorsConnexion>{t('Sans données, le SOS appelle par le réseau téléphonique ; vos positions partent au retour du réseau.')}</HorsConnexion>}
        <div className="card livc-center" style={{ padding: '26px 16px 18px', marginTop: 12 }}>
          <div className="kick l10-rouge-t">{t('Maintenez le bouton')}</div>
          <LivcSosBig appuiS={d.sos.appuiS} declencher={() => void declencher()} />
          <div className="b8 t17 mt10">{t('Relâchez pour annuler')}</div>
          <div className="t13 c3 mt4" style={{ lineHeight: 1.45 }}>
            {tf('Aucune confirmation longue : à {s} secondes, {entreprise} est appelée, puis le support BelivaY. Votre position est partagée {m} minutes.', { s: d.sos.appuiS, entreprise, m: d.sos.partageMin })}
          </div>
        </div>
        <Note ton="red" icone="shield-alert">
          <b>{t('Ne résistez jamais.')}</b> {t('Aucun colis ne vaut votre sécurité.')}
        </Note>
        <Note ton="ink" icone="info">
          {t('Le SOS est accessible depuis Moi, depuis Aide et SOS et depuis la famille « Sécurité » des incidents, sur toute page de la tournée.')}
        </Note>
      </Ecran>
    )

  // ----- Accident avec blessé -----
  if (etat === 'urgence')
    return (
      <Ecran route="aide" proto action="sos" titre={t('Accident avec blessé')} fixes={fond}>
        <div className="hero red" role="alert">
          <div className="hk" style={{ color: '#FFB4AB' }}>
            {t('Les secours d’abord')}
          </div>
          <div className="ht">{t('Appelez les secours avant toute autre action')}</div>
          <div className="hs">{t('Ne déplacez pas un blessé. Mettez-vous à l’abri de la circulation. Les colis attendront.')}</div>
        </div>
        <LivcLab>{t('Numéros d’urgence')}</LivcLab>
        <div className="livc-num">
          {d.urgences.map((u) => (
            <a key={u.numero} href={`tel:${u.numero}`} className="l10-num">
              <Icone nom="phone-call" taille={22} />
              <span className="grow">
                <b>{u.numero}</b>
                <span>{t(u.service)}</span>
              </span>
            </a>
          ))}
        </div>
        <Sec titre={t('Ensuite, quand c’est sans danger')} />
        <Carte cls="tight">
          <Li icone="siren" ton="red" t={t('SOS')} s={tf('{entreprise} puis le support BelivaY · position partagée {m} minutes', { entreprise, m: d.sos.partageMin })} vers={chemin('aide', { s: 'sos' })} />
          <Li icone="triangle-alert" ton="amber" t={t('Incident « Accident »')} s={tf('Famille « En route » · {entreprise} transfère le paquet à un autre livreur', { entreprise })} vers={chemin('incident', { famille: 'route' })} />
          <Li icone="camera" ton="ink" t={t('Photos')} s={t('Seulement si c’est sans danger pour vous')} />
        </Carte>
        <Note ton="ink" icone="globe">
          {t('Numéros de l’espace pays, fixés dans la console : ils changent avec le pays.')}
        </Note>
      </Ecran>
    )

  // ----- Les fiches d'un sujet -----
  const sujet = SUJETS.find((x) => x.id === sujetId)
  if (sujet) {
    const liste = d.fiches.filter((x) => x.sujet === sujet.id)
    return (
      <Ecran route="aide" proto action="sos" titre={t(sujet.titre)} retour={chemin('aide')} fixes={fond}>
        {!en && <HorsConnexion>{t('Toutes les fiches restent lisibles et audibles hors connexion.')}</HorsConnexion>}
        <Sec titre={liste.length > 1 ? tf('{n} fiches', { n: liste.length }) : t('1 fiche')} />
        <Carte cls="tight">
          {liste.map((f) => (
            <div key={f.id} className="l10-fli">
              <Li icone={sujet.icone} ton={sujet.ton} t={t(f.titre)} s={f.etapes.length > 1 ? tf('{n} étapes', { n: f.etapes.length }) : t('1 étape')} vers={chemin('aide', { fiche: f.id })} />
              <Ecouter lit={lecteur.lit === f.id} lire={() => lecteur.lire(f.id, lecture(t, f))} label={tf('Écouter : {f}', { f: t(f.titre) })} />
            </div>
          ))}
        </Carte>
        {pied}
      </Ecran>
    )
  }

  // ----- Aide et SOS -----
  const norme = (x: string) =>
    x
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
  const trouvees = q.trim() ? d.fiches.filter((f) => norme(t(f.titre) + ' ' + f.etapes.map(t).join(' ')).includes(norme(q.trim()))) : []
  const gestes = gestesTrouves(q, t, tf, valeursGestes)
  return (
    <Ecran route="aide" proto action="sos" fixes={fond}>
      {!en && (
        <HorsConnexion>
          <b>{t('Hors connexion')}</b> · {t('toutes les fiches restent lisibles et audibles. Le SOS appelle par le réseau téléphonique.')}
        </HorsConnexion>
      )}
      <div className="card livc-center l10-danger" style={{ padding: '18px 16px 16px', marginTop: 12 }}>
        <div className="kick l10-rouge-t">{t('Danger immédiat')}</div>
        <LivcSosBig appuiS={d.sos.appuiS} declencher={() => void declencher()} />
        <div className="t13 c3" style={{ lineHeight: 1.45, marginTop: 4 }}>
          {tf('Appui long de {s} secondes : {entreprise}, puis le support BelivaY. Position partagée {m} minutes, puis arrêt automatique.', { s: d.sos.appuiS, entreprise, m: d.sos.partageMin })}
        </div>
        <div className="btns">
          <Btn kind="danger" icone="ambulance" vers={chemin('aide', { s: 'urgence' })}>
            {t('Accident avec blessé')}
          </Btn>
        </div>
      </div>
      {dernier && (
        <Note ton="green" icone="circle-check" role="status">
          <b>{tf('SOS arrêté à {h}', { h: heure(dernier.arreteA ?? 0, langue) })}</b> · {t(dernier.arret === 'automatique' ? 'Le partage de position s’est arrêté tout seul.' : 'Vous l’avez arrêté ; votre entreprise est prévenue.')}{' '}
          <button type="button" className="l10-lien" onClick={() => naviguer(chemin('incident', { famille: 'securite' }))}>
            {t('Déclarer l’incident Sécurité')}
          </button>
        </Note>
      )}
      <form className="fld" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="inp l10-inp">
          <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          <input type="search" className="grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Rechercher une fiche')} aria-label={t('Rechercher une fiche')} />
        </label>
      </form>
      {q.trim() ? (
        <>
          <Sec titre={trouvees.length + gestes.length > 1 ? tf('{n} fiches trouvées', { n: trouvees.length + gestes.length }) : trouvees.length + gestes.length === 1 ? t('1 fiche trouvée') : t('Aucune fiche')} />
          {trouvees.length + gestes.length === 0 ? (
            <Carte>
              <Vide icone="search" t={t('Aucune fiche')} s={t('Essayez un autre mot, ou un autre sujet.')} />
            </Carte>
          ) : (
            <Carte cls="tight">
              {trouvees.map((f) => {
                const sj = SUJETS.find((x) => x.id === f.sujet)!
                return <Li key={f.id} icone={sj.icone} ton={sj.ton} t={t(f.titre)} s={t(sj.titre)} vers={chemin('aide', { fiche: f.id })} />
              })}
              {gestes.map((f) => (
                <Li key={'geste-' + f.id} icone={f.icone} ton="violet" t={t(f.titre)} s={t('Fiches de travail')} vers={chemin('aide', { geste: f.id })} />
              ))}
            </Carte>
          )}
        </>
      ) : (
        <>
          <Sec titre={t('Fiches par sujet')} />
          <Carte cls="tight">
            {SUJETS.map((sj) => {
              const fs = d.fiches.filter((x) => x.sujet === sj.id)
              if (!fs.length) return null
              const cle = 'sujet-' + sj.id
              return (
                <div key={sj.id} className="l10-fli">
                  <Li icone={sj.icone} ton={sj.ton} t={t(sj.titre)} s={(fs.length > 1 ? tf('{n} fiches', { n: fs.length }) : t('1 fiche')) + ' · ' + t(sj.sous)} vers={chemin('aide', { sujet: sj.id })} chev={false} />
                  <Ecouter lit={lecteur.lit === cle} lire={() => lecteur.lire(cle, fs.map((f) => lecture(t, f)).join('. '))} label={tf('Écouter : {f}', { f: t(sj.titre) })} />
                </div>
              )
            })}
            <Li icone="graduation-cap" ton="violet" t={t('Fiches de travail')} s={t('Une fiche par geste : ce que vous faites, et pourquoi')} vers={chemin('aide', { sujet: 'gestes' })} />
          </Carte>
        </>
      )}
      <Sec titre={t('Parler à quelqu’un')} />
      <Carte cls="tight">
        <Li icone="phone" ton="acc" t={tf('Appeler {entreprise}', { entreprise })} s={t('Votre entreprise : consignes, planning, transfert')} onClick={() => void appel.appeler('entreprise')} />
        {d.whatsappSupport ? (
          <a className="li" href={`https://wa.me/${d.whatsappSupport.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
            <span className="ic green">
              <Icone nom="message-square-text" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Support livreur BelivaY · WhatsApp')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Aide seulement : il ne valide jamais une mission, ne reçoit jamais une preuve et ne donne jamais un code')}
              </span>
            </span>
            <span className="chev">
              <Icone nom="external-link" taille={18} />
            </span>
          </a>
        ) : null}
        <Li
          icone="message-square-text"
          ton="green"
          t={t('Écrire au support BelivaY')}
          s={(d.whatsappSupport ? '' : t('WhatsApp à venir') + ' · ') + tf('{h} · première réponse : {d}. Aide seulement : jamais une preuve, jamais un code.', { h: d.horairesSupport, d: d.delaiSupport })}
          droite={<SupportOuvert horaires={d.horairesSupport} maintenant={horloge()} />}
          vers={chemin('messages', { fil: 'F3' })}
        />
      </Carte>
      {pied}
    </Ecran>
  )
}

/** Aide qui suit l'heure (M14) : le support est-il ouvert maintenant ? Lu dans ses horaires (SUP-HORAIRES, « 7 h – 21 h »),
 * à l'heure de Yaoundé ; horaires illisibles : rien d'affiché plutôt qu'un état faux. */
function SupportOuvert({ horaires, maintenant }: { horaires: string; maintenant: number }) {
  const { tf } = usePreferences()
  const h = /(\d{1,2})\s*h(?:\s*(\d{2}))?\s*[–-]\s*(\d{1,2})\s*h(?:\s*(\d{2}))?/.exec(horaires)
  if (!h) return null
  const de = Number(h[1]) * 60 + Number(h[2] ?? 0)
  const a = Number(h[3]) * 60 + Number(h[4] ?? 0)
  const mn = minutesDuJour(maintenant)
  const ouvert = mn >= de && mn < a
  return ouvert ? (
    <Pill ton="green" sm point>
      {tf('Ouvert · jusqu’à {h} h', { h: h[3] })}
    </Pill>
  ) : (
    <Pill ton="ink" sm>
      {tf('Fermé · rouvre à {h} h', { h: h[1] })}
    </Pill>
  )
}

/** SOS en cours (s=sos-en-cours du prototype) : appel, partage de position, minuteur, secours, arrêt en un geste. */
function SOSEnCours({ s, d, entreprise, relire }: { s: EtatSOS; d: DonneesAide; entreprise: string; relire: () => void }) {
  const { t, tf, langue } = usePreferences()
  const m = useMaintenant()
  const o = useOrigine()
  const naviguer = useNavigate()
  useBattement(1000)
  // Une position toutes les SOS-POSITION-S secondes, tant que le partage dure (si le téléphone l'accorde).
  useEffect(() => {
    const envoyer = () =>
      navigator.geolocation?.getCurrentPosition(
        (x) => {
          const pos = { lat: x.coords.latitude, lng: x.coords.longitude, precisionM: Math.round(x.coords.accuracy) }
          noterPosition(pos)
          void source.aide.positionSOS(s.id, pos)
        },
        () => undefined,
        { enableHighAccuracy: true, timeout: 10_000 },
      )
    envoyer()
    const id = setInterval(envoyer, d.sos.intervalleS * 1000)
    return () => clearInterval(id)
  }, [s.id, d.sos.intervalleS])
  const total = Math.max(1, s.partageJusqua - s.depuis)
  const resteMs = Math.max(0, s.partageJusqua - m())
  const reste = Math.floor(resteMs / 1000)
  const arreter = async () => {
    await source.aide.arreterSOS(s.id, o())
    signal('succes')
    // Arrêté : retour à « Aide et SOS », qui dit l'heure de l'arrêt et propose l'incident Sécurité.
    naviguer(chemin('aide'), { replace: true })
    relire()
  }
  const secours = d.urgences[0]
  const enCours = s.appels.find((x) => x.etat === 'en_cours') ?? s.appels.find((x) => x.etat === 'a_venir') ?? null
  const nomAppel = (v: 'entreprise' | 'support') => (v === 'entreprise' ? entreprise : t('Support BelivaY'))
  return (
    <Ecran route="aide" entete="enfant" barre={false} titre={t('SOS en cours')} proto action="aucune" retour={chemin('aide')}>
      <div className="hero red" role="alert">
        <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span className="hk" style={{ color: '#FFB4AB' }}>
            {tf('SOS en cours · depuis {h}', { h: heure(s.depuis, langue) })}
          </span>
          <Pill ton="dk" icone="map-pin">
            {t('Position partagée')}
          </Pill>
        </div>
        <div className="livc-big" aria-live="off">
          {String(Math.floor(reste / 60)).padStart(2, '0')}:{String(reste % 60).padStart(2, '0')}
          <small>{t('de partage restant')}</small>
        </div>
        <div className="mt10">
          <Barre pct={(resteMs / total) * 100} ton="red" label={t('Partage de position restant')} />
        </div>
        {enCours && (
          <div className="row mt14 l10-sos-appel">
            <span className="livc-ic l10-sos-av" aria-hidden="true">
              <Icone nom={enCours.vers === 'entreprise' ? 'building-2' : 'life-buoy'} taille={22} />
            </span>
            <div className="grow">
              <div className="b8 t15">{enCours.etat === 'en_cours' ? tf('Appel en cours · {qui}', { qui: nomAppel(enCours.vers) }) : tf('Appel à venir · {qui}', { qui: nomAppel(enCours.vers) })}</div>
              <div className="t12" style={{ color: 'rgba(255,255,255,.85)' }}>
                {s.appels.map((x) => `${nomAppel(x.vers)} : ${t(x.etat === 'en_cours' ? 'en cours' : x.etat === 'sans_reponse' ? 'sans réponse' : 'ensuite')}`).join(' · ')}
              </div>
            </div>
            <span className="livc-ic l10-sos-tel" aria-hidden="true">
              <Icone nom="phone-call" taille={20} />
            </span>
          </div>
        )}
        <div className="hs" style={{ marginTop: 10 }}>
          {tf('Sans réponse, le support BelivaY est appelé ensuite. Le partage s’arrête seul à {h}.', { h: heure(s.partageJusqua, langue) })}
          {s.horsLigne ? ' ' + t('Sans données : l’appel passe par le réseau téléphonique ; vos positions partent au retour du réseau.') : ''}
        </div>
      </div>
      <Carte cls="tight" style={{ marginTop: 12 }}>
        <Li icone="building-2" ton="acc" t={tf('{entreprise} voit votre position', { entreprise })} s={tf('Et le support BelivaY · pendant {m} minutes · {n} positions envoyées', { m: d.sos.partageMin, n: s.positions })} />
        <Li icone="folder-open" ton="blue" t={t('Dossier Sécurité ouvert')} s={t('À la console · aucune pénalité, aucune pression sur la tournée')} />
      </Carte>
      {secours && (
        <div className="btns" style={{ marginTop: 14 }}>
          <a className="btn red" href={`tel:${secours.numero}`}>
            <Icone nom="ambulance" taille={18} />
            <span>{tf('Appeler les secours · {n}', { n: secours.numero })}</span>
          </a>
        </div>
      )}
      <div className="btns">
        <Btn kind="secondary" icone="circle-stop" onClick={() => void arreter()}>
          {t('Arrêter le SOS')}
        </Btn>
      </div>
      <div className="t12 c3 center" style={{ marginTop: 8 }}>
        {tf('Déclenché par erreur ? Un geste suffit : {entreprise} est prévenue de l’annulation.', { entreprise })}
      </div>
    </Ecran>
  )
}
