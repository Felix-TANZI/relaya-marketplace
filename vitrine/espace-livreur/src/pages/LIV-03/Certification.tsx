// LIV-P03 · Certification : condition d'accès, pas une formation au sens de l'emploi (LIV-STA-03). 7 modules illustrés
// (3 à 6 cartes, une consigne par carte, conséquences pour chaque acteur), anneau x sur 7, durée restante = modules
// non faits + quiz (LIV-03-R30) ; quiz de 20 questions tirées et corrigées par le serveur, différentes à chaque essai,
// ouvert après les 7 modules, 10 min, seuil 16 ; échec : questions ratées expliquées avec leur module, modules à revoir,
// nouvel essai après 2 h, 3 par jour ; réussite : badge « Certifié BelivaY » daté, valable 12 mois, recertification
// ouverte 30 jours avant (LIV-CER-02/03, LIV-P03R-02/04). Lecture vocale de chaque carte et question (interrupteur
// mémorisé). Module et quiz s'ouvrent en plein écran, sans barre, fermés par le retour du téléphone (LIV-01-R020).
// Fiches de travail (dans l'Aide, DP-66) reliées depuis les modules et la certification réussie.
// Hors connexion : modules lisibles ; un quiz fini sans réseau est « en attente de validation » (LIV-CER-01).
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Anneau, Btn, Hint, Li, Note, Pill, Sec, Steps, type Ton } from '../../composants/proto'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { Certification as C, ModuleCertification, ResultatQuiz, TentativeQuiz } from '../../donnees/domaines/acces'
import { origine, useEnLigne } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { BasFixe, Chargement, ErreurLecture, mmss, parler, taire, useSecondes, jourAn } from './commun'
import './liv03.css'

/** Plein écran ouvert par l'adresse (?module=… ou ?quiz=1) : le retour du téléphone le ferme. */
function usePlein() {
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const lieu = useLocation()
  const ouvrir = (k: 'module' | 'quiz', v: string) => {
    const q = new URLSearchParams(params)
    q.set(k, v)
    naviguer({ search: q.toString() }, { state: { feuille: true } })
  }
  const fermer = () => {
    taire()
    if ((lieu.state as { feuille?: boolean } | null)?.feuille) return naviguer(-1)
    const q = new URLSearchParams(params)
    q.delete('module')
    q.delete('quiz')
    naviguer({ search: q.toString() }, { replace: true })
  }
  return { module: params.get('module'), quiz: params.get('quiz') === '1', ouvrir, fermer }
}

export default function Certification() {
  const lecture = useLecture(() => source.acces.certification(), [])
  const c = lecture.donnees
  const plein = usePlein()
  const m = c && plein.module ? c.modules.find((x) => x.id === plein.module) : null
  return (
    <Ecran route="certification" proto action="aucune" fixes={c && (m ? <VueModule m={m} c={c} fermer={plein.fermer} /> : plein.quiz ? <VueQuiz c={c} fermer={plein.fermer} /> : null)}>
      {lecture.erreur ? <ErreurLecture relire={lecture.relire} /> : !c ? <Chargement lignes={6} /> : <Contenu c={c} ouvrir={plein.ouvrir} />}
    </Ecran>
  )
}

/** Bas de l'écran : l'action du moment (module suivant, quiz, revoir un module, retour). */
function Action({ c, ouvrir }: { c: C; ouvrir: (k: 'module' | 'quiz', v: string) => void }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const enLigne = useEnLigne()
  const [msg, setMsg] = useState<string | null>(null)
  const q = c.quiz
  const enActivation = s.etatCompte === 'en_activation'
  const suivant = c.modules.find((m) => m.aRevoir) ?? c.modules.find((m) => m.etat !== 'fait')
  const commencer = async () => {
    if (q.enCours) return ouvrir('quiz', '1')
    const r = await source.acces.commencerQuiz(origine(s.maintenant))
    if (r.ok) {
      signal('toucher')
      ouvrir('quiz', '1')
    } else setMsg(t('Le quiz n’est pas ouvert pour le moment.'))
  }
  let bouton
  if (q.enCours || q.ouvert)
    bouton = (
      <Btn kind="primary" icone="circle-play" cls="xl" onClick={() => void commencer()} off={!q.enCours && !enLigne}>
        {q.enCours ? t('Reprendre le quiz') : t('Commencer le quiz')}
      </Btn>
    )
  else if (suivant)
    bouton = (
      <Btn kind="primary" icone={suivant.aRevoir ? 'book-open' : 'circle-play'} cls="xl" onClick={() => ouvrir('module', suivant.id)}>
        {tf(suivant.aRevoir ? 'Revoir le module {n} · {titre}' : suivant.etat === 'en_cours' ? 'Reprendre le module {n} · {titre}' : 'Commencer le module {n} · {titre}', { n: suivant.numero, titre: t(suivant.titre) })}
      </Btn>
    )
  else
    bouton = (
      <Btn kind="primary" icone={enActivation ? 'list-checks' : 'house'} cls="xl" vers={chemin(enActivation ? 'activation' : 'aujourdhui')}>
        {enActivation ? t('Revenir à la liste d’activation') : t('Revenir à l’accueil')}
      </Btn>
    )
  return (
    <>
      {msg && (
        <div className="mt12">
          <Note ton="red" icone="circle-alert" role="alert">
            {msg}
          </Note>
        </div>
      )}
      {!enLigne && q.ouvert && !q.enCours && <Hint icone="wifi-off">{t('Le tirage des questions demande le réseau ; une fois commencé, le quiz peut se finir sans réseau.')}</Hint>}
      <BasFixe>{bouton}</BasFixe>
    </>
  )
}

function Contenu({ c, ouvrir }: { c: C; ouvrir: (k: 'module' | 'quiz', v: string) => void }) {
  const d = c.quiz.dernier
  if (c.etat === 'reussie' && c.badge) return <Reussi c={c} ouvrir={ouvrir} />
  if (d && !d.reussi && c.etat === 'echouee') return <Echec r={d} c={c} ouvrir={ouvrir} />
  return <AFaire c={c} ouvrir={ouvrir} />
}

/** Modules à faire (état par défaut du prototype) : anneau x sur 7, durée restante, modules, quiz, lecture vocale. */
function AFaire({ c, ouvrir }: { c: C; ouvrir: (k: 'module' | 'quiz', v: string) => void }) {
  const { t, tf } = usePreferences()
  const faits = c.modules.filter((m) => m.etat === 'fait').length
  const restants = c.modules.filter((m) => m.etat !== 'fait')
  const reste = restants.reduce((n, m) => n + m.minutes, 0) + c.quiz.minutes
  const suivant = c.modules.find((m) => m.aRevoir) ?? restants[0]
  const q = c.quiz
  const ferme = q.raisonFerme === 'modules' ? tf('ouvert après les {n} modules', { n: c.modules.length }) : null
  return (
    <>
      <div className="hero night">
        <div className="row" style={{ gap: 16 }}>
          <Anneau v={faits} max={c.modules.length} couleur="var(--acc-2)" taille={86} label={`${faits}/${c.modules.length}`} />
          <div className="grow">
            <div className="hk">{c.etat === 'a_recertifier' ? t('Recertification') : c.etat === 'expiree' ? t('Certification expirée') : t('Certification BelivaY')}</div>
            <div className="ht">{tf('{x} modules sur {n}', { x: faits, n: c.modules.length })}</div>
            <div className="hs">
              {restants.length ? (
                <>
                  {t('Encore environ')} <b>{tf('{m} minutes', { m: reste })}</b> : {restants.length === 1 ? tf('module {n}', { n: restants[0].numero }) : tf('modules {liste}', { liste: restants.map((m) => m.numero).join(', ') })}
                  {t(', puis le quiz final.')}
                </>
              ) : (
                tf('Les {n} modules sont faits : il reste le quiz final ({m} min).', { n: c.modules.length, m: q.minutes })
              )}
            </div>
            {c.etat === 'expiree' && <div className="hs">{t('Sans certification valide, aucun nouveau paquet ne vous est affecté.')}</div>}
          </div>
        </div>
        <div className="hline"></div>
        <div className="row t13" style={{ gap: 8, color: 'rgba(255,255,255,.85)', alignItems: 'flex-start' }}>
          <Icone nom="download" taille={16} />
          <span>{t('Modules téléchargés : ils se suivent sans réseau ; le quiz part au retour du réseau.')}</span>
        </div>
      </div>

      <Sec titre={t('Modules obligatoires')} />
      <div className="card tight">
        {c.modules.map((m) => (
          <LigneModule key={m.id} m={m} suivant={m === suivant} ouvrir={ouvrir} />
        ))}
        <LigneQuiz c={c} ferme={ferme} ouvrir={ouvrir} />
      </div>

      <Lecture c={c} />
      <Hint icone="info">{tf('Questions sur des gestes concrets, jamais de théorie ni de piège de vocabulaire. En cas d’échec : nouvel essai après {h} h, {n} essais par jour au plus.', { h: q.delaiEssaiH, n: q.essaisParJour })}</Hint>
      <div className="card tight mt10">
        <Li icone="book-open" ton="violet" t={t('Fiches de travail')} s={t('Contrôle, audit, scellé, remise, incidents : à relire sur la route')} vers={chemin('aide', { sujet: 'gestes' })} />
      </div>
      <Action c={c} ouvrir={ouvrir} />
    </>
  )
}

function LigneModule({ m, suivant, ouvrir }: { m: ModuleCertification; suivant: boolean; ouvrir: (k: 'module' | 'quiz', v: string) => void }) {
  const { t, tf } = usePreferences()
  const fait = m.etat === 'fait' && !m.aRevoir
  const ton: Ton = fait ? 'green' : m.aRevoir ? 'amber' : suivant ? 'or' : 'ink'
  const etat = m.aRevoir ? 'À revoir' : fait ? 'Fait' : m.etat === 'en_cours' ? 'En cours' : 'À faire'
  return (
    <Li
      cls="l3-module l3-li"
      icone={fait ? 'circle-check' : m.aRevoir ? 'book-open' : suivant ? 'circle-play' : 'circle-dashed'}
      ton={ton}
      t={`${m.numero}. ${t(m.titre)}`}
      s={`${tf('{m} min', { m: m.minutes })} · ${m.cartes.map((x) => t(x.titre)).join(', ')}`}
      droite={
        <Pill ton={ton} sm>
          {t(etat)}
        </Pill>
      }
      onClick={() => ouvrir('module', m.id)}
    />
  )
}

function LigneQuiz({ c, ferme, ouvrir }: { c: C; ferme: string | null; ouvrir: (k: 'module' | 'quiz', v: string) => void }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const q = c.quiz
  const base = tf('{q} questions tirées au sort · {s} bonnes réponses au moins · {m} min', { q: q.questions, s: q.seuil, m: q.minutes })
  const quand = q.prochainEssaiA ? echeance(q.prochainEssaiA, s.maintenant, langue) : ''
  const detail =
    q.raisonFerme === 'modules'
      ? ferme
      : q.raisonFerme === 'attente'
        ? tf('nouvel essai {quand}', { quand })
        : q.raisonFerme === 'limite_jour'
          ? tf('{n} essais faits aujourd’hui : nouvel essai {quand}', { n: q.essaisParJour, quand })
          : q.raisonFerme === 'certifie' && q.prochainEssaiA
            ? tf('rouvre pour la recertification le {date}', { date: jourAn(q.prochainEssaiA, langue) })
            : q.ouvert
              ? q.essaisRestantsJour === 1
                ? t('1 essai restant aujourd’hui')
                : tf('{n} essais restants aujourd’hui', { n: q.essaisRestantsJour })
              : null
  const ouvert = q.ouvert || !!q.enCours
  return (
    <Li
      cls="l3-li"
      icone={ouvert ? 'list-checks' : 'lock'}
      ton={ouvert ? 'acc' : 'ink'}
      t={t('Quiz final')}
      s={detail ? `${base} · ${detail}` : base}
      droite={
        <Pill ton={ouvert ? 'acc' : 'ink'} sm>
          {q.enCours ? t('En cours') : ouvert ? t('Ouvert') : t('Verrouillé')}
        </Pill>
      }
      onClick={ouvert && q.enCours ? () => ouvrir('quiz', '1') : undefined}
    />
  )
}

function Lecture({ c }: { c: C }) {
  const { t } = usePreferences()
  return (
    <div className="card row" style={{ gap: 12 }}>
      <span className="li" style={{ border: 0, padding: 0, minHeight: 0 }}>
        <span className="ic acc">
          <Icone nom="volume-2" taille={20} />
        </span>
      </span>
      <div className="grow">
        <div className="b8 t14">{t('Lecture vocale')}</div>
        <div className="t12 c3 mt4">{t('Chaque carte et chaque question peuvent être lues à voix haute.')}</div>
      </div>
      <button type="button" className={'tg' + (c.lectureVocale ? ' on' : '')} role="switch" aria-checked={c.lectureVocale} aria-label={t('Lecture vocale')} onClick={() => void source.acces.reglerLectureVocale(!c.lectureVocale)}></button>
    </div>
  )
}

/** Échec au quiz : score, questions ratées expliquées avec leur module, modules à revoir, prochain essai. */
function Echec({ r, c, ouvrir }: { r: ResultatQuiz; c: C; ouvrir: (k: 'module' | 'quiz', v: string) => void }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const q = c.quiz
  const aRevoir = c.modules.filter((m) => m.aRevoir)
  const essais = q.essaisParJour - q.essaisRestantsJour
  return (
    <>
      <div className="pg">
        <div className="pg-k">{t('Certification')}</div>
        <h1 className="pg-t">{t('Quiz final')}</h1>
        <p className="pg-s">
          {jourAn(r.le, langue)} · {tf('essai de {h}', { h: heure(r.le, langue) })}
          {essais > 0 ? ' · ' + tf('{n} sur {m} aujourd’hui', { n: essais, m: q.essaisParJour }) : ''}
        </p>
      </div>
      <div className="hero red" aria-live="polite">
        <div className="liva-score">
          <Anneau v={r.bonnes} max={r.sur} couleur="#FF8A80" taille={86} label={String(r.bonnes)} />
          <div className="grow">
            <div className="hk" style={{ color: '#FFB4AB' }}>
              {t('Pas encore réussi')}
            </div>
            <div className="ht">{tf('{x} bonnes réponses sur {n}', { x: r.bonnes, n: r.sur })}</div>
            <div className="hs">
              {tf('Il en faut {s}.', { s: q.seuil })}{' '}
              {q.prochainEssaiA ? (
                <>
                  {t('Nouvel essai')} <b>{echeance(q.prochainEssaiA, s.maintenant, langue)}</b>
                  {q.essaisRestantsJour > 0 ? ' · ' + (q.essaisRestantsJour === 1 ? t('1 essai restant aujourd’hui') : tf('{n} essais restants aujourd’hui', { n: q.essaisRestantsJour })) : ''}.
                </>
              ) : q.ouvert ? (
                t('Vous pouvez faire un nouvel essai.')
              ) : null}
              {r.enAttenteDeValidation ? ' ' + t('Résultat calculé sans réseau : en attente de validation par le serveur.') : ''}
            </div>
          </div>
        </div>
      </div>
      {r.ratees.length > 0 && (
        <>
          <Sec titre={r.ratees.length === 1 ? t('La question ratée, expliquée') : tf('Les {n} questions ratées, expliquées', { n: r.ratees.length })} />
          <div className="card tight">
            {r.ratees.map((x, i) => (
              <Li
                key={i}
                icone="circle-x"
                ton="red"
                t={t(x.question)}
                s={`${t('Bonne réponse')} : ${t(x.bonneReponse)}. ${t(x.explication)}`}
                droite={
                  <Pill ton="ink" sm>
                    {tf('Module {n}', { n: x.module })}
                  </Pill>
                }
              />
            ))}
          </div>
        </>
      )}
      {aRevoir.length > 0 && (
        <>
          <Sec titre={t('À revoir avant l’essai suivant')} />
          <div className="card tight">
            {aRevoir.map((m) => (
              <Li key={m.id} cls="l3-module l3-li" icone="book-open" ton="acc" t={`${m.numero}. ${t(m.titre)}`} s={tf('{m} min · proposé à nouveau', { m: m.minutes })} onClick={() => ouvrir('module', m.id)} />
            ))}
          </div>
        </>
      )}
      <Hint icone="shuffle">{tf('Les {q} questions sont tirées au sort à chaque essai ; {n} essais par jour au plus, {h} h entre deux essais.', { q: q.questions, n: q.essaisParJour, h: q.delaiEssaiH })}</Hint>
      <Action c={c} ouvrir={ouvrir} />
    </>
  )
}

/** Réussite : badge daté, validité et alerte, effets (Trust Score, étape suivante, recertification), modules faits. */
function Reussi({ c, ouvrir }: { c: C; ouvrir: (k: 'module' | 'quiz', v: string) => void }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const b = c.badge!
  const d = c.quiz.dernier
  const enActivation = s.etatCompte === 'en_activation'
  const mois = Math.round((b.expireLe - b.obtenuLe) / (30.44 * 24 * 3600 * 1000))
  const alerteJ = c.recertificationDes ? Math.round((b.expireLe - c.recertificationDes) / (24 * 3600 * 1000)) : null
  return (
    <>
      <div className="hero acc l3-acc" style={{ textAlign: 'center', marginTop: 16 }}>
        <div className="hk">{t('Quiz final réussi')}</div>
        <div className="liva-badge mt14" aria-hidden="true">
          <div className="m">
            <Icone nom="badge-check" taille={52} />
          </div>
          <div className="rb">
            <i></i>
            <i></i>
          </div>
        </div>
        <div className="ht" style={{ marginTop: 10 }}>
          {t('Certifié BelivaY')}
        </div>
        <div className="hs">
          {d && d.reussi ? tf('{x} bonnes réponses sur {n}', { x: d.bonnes, n: d.sur }) + ' · ' : ''}
          {jourAn(b.obtenuLe, langue)}
          {d && d.reussi ? ' ' + tf('à {h}', { h: heure(d.le, langue) }) : ''}
        </div>
        <div className="money4" style={{ textAlign: 'left' }}>
          <div className="m4">
            <div className="l">
              <Icone nom="calendar-check" taille={14} />
              {t('Valable jusqu’au')}
            </div>
            <div className="v">{dateCourte(b.expireLe, langue)}</div>
            <div className="s">{tf('{n} mois', { n: mois })}</div>
          </div>
          <div className="m4">
            <div className="l">
              <Icone nom="bell" taille={14} />
              {t('Alerte')}
            </div>
            <div className="v">{c.recertificationDes ? dateCourte(c.recertificationDes, langue) : '—'}</div>
            <div className="s">{alerteJ !== null ? tf('{n} jours avant', { n: alerteJ }) : ''}</div>
          </div>
        </div>
      </div>
      <div className="card tight">
        <Li icone="gauge" ton="acc" t={t('Critère Formation du Trust Score : 100')} s={t('Il reste à 100 tant que la certification est à jour ; 0 dès qu’elle expire.')} vers={chemin('trust')} />
        {enActivation ? (
          <Li icone="building-2" ton="ink" t={t('Prochaine étape : approbation de votre entreprise')} s={t('Puis BelivaY active votre accès ; aucun paquet avant.')} vers={chemin('activation')} />
        ) : null}
        <Li icone="book-open" ton="violet" t={t('Fiches de travail')} s={t('Contrôle, audit, scellé, remise, incidents : à relire sur la route')} vers={chemin('aide', { sujet: 'gestes' })} />
        <Li icone="refresh-cw" ton="ink" t={t('Recertification')} s={t('Chaque année, ou sur les seuls modules liés à un manquement après une sanction de niveau 2 ou plus.')} />
      </div>
      <div className="card tight">
        {c.modules.map((m) => (
          <Li
            key={m.id}
            cls="l3-module l3-li"
            icone="circle-check"
            ton="green"
            t={`${m.numero}. ${t(m.titre)}`}
            s={tf('{m} min · à relire quand vous voulez', { m: m.minutes })}
            droite={
              <Pill ton="green" sm>
                {t('Fait')}
              </Pill>
            }
            onClick={() => ouvrir('module', m.id)}
          />
        ))}
      </div>
      <Action c={c} ouvrir={ouvrir} />
    </>
  )
}

/** « 22 sept. 2027 » */
function dateCourte(ms: number, langue: 'fr' | 'en'): string {
  return new Intl.DateTimeFormat(langue === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Douala' }).format(ms)
}

// ---------- Module en plein écran ----------

function useVoix(actif: boolean, texte: string) {
  const { langue } = usePreferences()
  const [parle, setParle] = useState(false)
  const lire = useCallback(() => {
    if (parler(texte, langue, () => setParle(false))) setParle(true)
  }, [texte, langue])
  useEffect(() => {
    if (actif) lire()
    return () => void taire()
  }, [actif, lire])
  const basculer = () => {
    if (parle) {
      taire()
      setParle(false)
    } else {
      setParle(true)
      if (!parler(texte, langue, () => setParle(false))) setParle(false)
    }
  }
  return { parle, basculer }
}

function VueModule({ m, c, fermer }: { m: ModuleCertification; c: C; fermer: () => void }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const [i, setI] = useState(() => Math.min(Math.max(0, m.etat === 'fait' ? 0 : m.carteVue), m.cartes.length - 1))
  const carte = m.cartes[i]
  const texte = [t(carte.titre), t(carte.consigne), ...carte.consequences.map((x) => t(x))].join('. ')
  const voix = useVoix(c.lectureVocale, texte)
  useEffect(() => {
    void source.acces.lireCarte(m.id, i)
  }, [m.id, i])
  const derniere = i === m.cartes.length - 1
  const suite = async () => {
    signal('toucher')
    if (!derniere) return setI(i + 1)
    const r = await source.acces.terminerModule(m.id, origine(s.maintenant))
    if (r.ok) {
      signal('succes')
      fermer()
    }
  }
  const enLigne = useEnLigne()
  return (
    <div className="l3-plein l3-module-vue" role="dialog" aria-modal="true" aria-label={t(m.titre)}>
      <div className="row" style={{ justifyContent: 'space-between', paddingTop: 6, gap: 8 }}>
        <button type="button" className="l-ibtn" onClick={fermer} aria-label={t('Fermer le module')}>
          <Icone nom="x" taille={24} />
        </button>
        <div className="center grow">
          <div className="kick acc">{tf('Module {n} · {titre}', { n: m.numero, titre: t(m.titre) })}</div>
          <div className="b8 t15 mt4">{tf('Carte {x} sur {n}', { x: i + 1, n: m.cartes.length })}</div>
        </div>
        <Pill ton="acc" sm icone={enLigne ? 'download' : 'wifi-off'}>
          {t('Hors connexion')}
        </Pill>
      </div>
      <Steps n={m.cartes.length} cur={i} />
      <article className="liva-mod mt16" key={carte.id}>
        <div className="ill l3-ill">
          <Icone nom={carte.icone} taille={64} trait={1.5} />
          <span className="cap">
            <span className="pill solid-acc sm">{t(carte.lieu)}</span>
          </span>
        </div>
        <div className="bd">
          <h2 className="b8 t19" style={{ letterSpacing: '-.015em', margin: 0 }}>
            {t(carte.titre)}
          </h2>
          <div className="t15 mt8 lh">{t(carte.consigne)}</div>
          <div className="mt12">
            {carte.consequences.map((x) => (
              <Li key={x} icone="arrow-right" ton="acc" t={t(x)} />
            ))}
          </div>
          <div className="btns mt10">
            <Btn kind="acc-soft" icone="volume-2" onClick={voix.basculer}>
              {voix.parle ? t('Arrêter la lecture') : t('Écouter la carte')}
            </Btn>
          </div>
        </div>
      </article>
      <Hint icone="layers">{t('Une seule consigne par carte ; le module est fait quand toutes ses cartes sont lues.')}</Hint>
      <BasFixe>
        <Btn kind="primary" cls="xl" apres={derniere ? 'check' : 'arrow-right'} onClick={() => void suite()}>
          {derniere ? t('Terminer le module') : t('Carte suivante')}
        </Btn>
        {i > 0 && (
          <Btn kind="secondary" icone="chevron-left" onClick={() => setI(i - 1)}>
            {t('Carte précédente')}
          </Btn>
        )}
      </BasFixe>
    </div>
  )
}

// ---------- Quiz en plein écran ----------

const cleReponses = (id: string) => 'blv_l_quiz_' + id

function VueQuiz({ c, fermer }: { c: C; fermer: () => void }) {
  const { t } = usePreferences()
  const q = c.quiz.enCours
  if (!q)
    return (
      <div className="l3-plein" role="dialog" aria-modal="true" aria-label={t('Quiz final')}>
        <div className="row" style={{ paddingTop: 6, gap: 8 }}>
          <button type="button" className="l-ibtn" onClick={fermer} aria-label={t('Fermer le quiz')}>
            <Icone nom="x" taille={24} />
          </button>
          <div className="b8 t15">{t('Quiz final')}</div>
        </div>
        <div className="mt16">
          <Note ton="acc" icone="list-checks">
            {t('Aucun quiz en cours. Commencez-le depuis la page de certification.')}
          </Note>
        </div>
      </div>
    )
  return <Quiz q={q} c={c} fermer={fermer} />
}

function Quiz({ q, c, fermer }: { q: TentativeQuiz; c: C; fermer: () => void }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const enLigne = useEnLigne()
  const [reponses, setReponses] = useState<(number | null)[]>(() => {
    try {
      const g = JSON.parse(sessionStorage.getItem(cleReponses(q.id)) ?? 'null') as (number | null)[] | null
      if (g && g.length === q.questions.length) return g
    } catch {
      /* rien */
    }
    return q.questions.map(() => null)
  })
  const [i, setI] = useState(() => Math.max(0, Math.min(q.questions.length - 1, reponses.findIndex((r) => r === null) === -1 ? q.questions.length - 1 : reponses.findIndex((r) => r === null))))
  const [choix, setChoix] = useState<number | null>(reponses[i])
  const [envoi, setEnvoi] = useState(false)
  const decalage = s.maintenant - Date.now()
  const reste = useSecondes(q.finA, () => Date.now() + decalage)
  const question = q.questions[i]
  const voix = useVoix(c.lectureVocale, [t(question.texte), ...question.reponses.map((r, k) => `${k + 1}. ${t(r)}`)].join('. '))

  const envoyer = useCallback(
    async (rs: (number | null)[]) => {
      if (envoi) return
      setEnvoi(true)
      const r = await source.acces.envoyerQuiz(q.id, rs, !navigator.onLine, origine(s.maintenant))
      try {
        sessionStorage.removeItem(cleReponses(q.id))
      } catch {
        /* rien */
      }
      if (r.ok) signal(r.resultat.reussi ? 'succes' : 'erreur')
      fermer()
    },
    [envoi, q.id, s.maintenant, fermer],
  )
  // Temps écoulé : les réponses données partent telles quelles.
  useEffect(() => {
    if (reste === 0 && !envoi) void envoyer(reponses)
  }, [reste, envoi, envoyer, reponses])

  const valider = () => {
    const rs = reponses.map((r, k) => (k === i ? choix : r))
    setReponses(rs)
    try {
      sessionStorage.setItem(cleReponses(q.id), JSON.stringify(rs))
    } catch {
      /* rien */
    }
    signal('toucher')
    if (i === q.questions.length - 1) return void envoyer(rs)
    setI(i + 1)
    setChoix(rs[i + 1])
  }
  const essai = c.quiz.essaisParJour - c.quiz.essaisRestantsJour
  return (
    <div className="l3-plein l3-quiz" role="dialog" aria-modal="true" aria-label={t('Quiz final')}>
      <div className="row" style={{ justifyContent: 'space-between', paddingTop: 6, gap: 8 }}>
        <button type="button" className="l-ibtn" onClick={fermer} aria-label={t('Fermer le quiz')}>
          <Icone nom="x" taille={24} />
        </button>
        <div className="center grow">
          <div className="kick acc">{essai > 0 ? tf('Quiz final · essai {n} du jour', { n: essai }) : t('Quiz final')}</div>
          <div className="b8 t15 mt4">{tf('Question {x} sur {n}', { x: i + 1, n: q.questions.length })}</div>
        </div>
        <span className={'pill sm ' + (reste < 60 ? 'red' : 'ink')} role="timer" aria-label={t('Temps restant')}>
          <Icone nom="timer" taille={13} />
          {mmss(reste)}
        </span>
      </div>
      <Steps n={q.questions.length} cur={i} />
      <article className="liva-mod mt16" key={question.id}>
        <div className="ill l3-ill l3-ill-petite">
          <Icone nom={question.icone} taille={52} trait={1.5} />
          <span className="cap">
            <span className="pill solid-acc sm">{t(question.lieu)}</span>
          </span>
        </div>
        <div className="bd">
          <h2 id="l3-q" className="b8 t19" style={{ letterSpacing: '-.015em', lineHeight: 1.3, margin: 0 }}>
            {t(question.texte)}
          </h2>
          <div className="btns mt10">
            <Btn kind="acc-soft" icone="volume-2" onClick={voix.basculer}>
              {voix.parle ? t('Arrêter la lecture') : t('Écouter la question')}
            </Btn>
          </div>
        </div>
      </article>
      <div role="radiogroup" aria-labelledby="l3-q">
        {question.reponses.map((r, k) => (
          <button key={k} type="button" role="radio" aria-checked={choix === k} className={'radio l3-reponse' + (choix === k ? ' on' : '')} onClick={() => setChoix(k)}>
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ display: 'block' }}>
                {String.fromCharCode(65 + k)} · {t(r)}
              </span>
            </span>
          </button>
        ))}
      </div>
      {!enLigne ? <Hint icone="wifi-off">{t('Sans réseau : le résultat sera calculé ici puis validé par le serveur au retour du réseau.')}</Hint> : <Hint icone="info">{t('Le quiz continue si vous le fermez, jusqu’à la fin du temps.')}</Hint>}
      <BasFixe>
        <Btn kind="primary" cls="xl" icone={i === q.questions.length - 1 ? 'send' : 'check'} off={choix === null || envoi} onClick={valider}>
          {i === q.questions.length - 1 ? t('Envoyer mes réponses') : t('Valider ma réponse')}
        </Btn>
      </BasFixe>
    </div>
  )
}
