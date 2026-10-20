// Questions des clients (AJ-A, DP-58) : questions posées sur mes fiches par un client ANONYME (GEN-01 : ni nom, ni
// numéro, ni quartier), réponse publique (le client lit « Réponse du vendeur », jamais le nom de la boutique,
// VD11-R10), filtre des coordonnées (numéros, e-mails, liens, réseaux : refus avant publication, même règle que la
// messagerie VD11-R59 / REFCL-R006 ; aucun échange hors de BelivaY), modèles de réponse (BelivaY + les miens),
// délai de réponse affiché (le mien en moyenne, l'objectif, l'attente de chaque question), signaler une question
// (relue par BelivaY sous 48 h, masquée aux clients en attendant).
// - Répondre est réservé au propriétaire (réponse publique engageant la boutique, comme Q-17) ; l'accès Préparation
//   lit et signale.
// - Adresses : ?q=<question> (depuis une notification), ?f=repondue|signalee.
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { useLecture } from '../../donnees/useLecture'
import { echeance } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles } from '../../session'
import { Bouton, Chargement, Erreur, Feuille, Indice, LienTexte, Selecteur, useToast, type Coque } from './commun'
import { EcranAJ } from './coque'
import { sourceAJA } from './donnees/source'
import type { ModeleReponse, MotifSignalement, QuestionClient } from './donnees/types'

const C: Coque = { route: 'questions', titre: 'Questions des clients', onglet: null }
type Filtre = 'a_repondre' | 'repondue' | 'signalee'
const MAX = 600

const MOTIFS: [MotifSignalement, string][] = [
  ['coordonnees', 'Demande un numéro ou un échange hors de BelivaY'],
  ['insulte', 'Propos insultants'],
  ['hors_sujet', 'Sans rapport avec le produit'],
  ['concurrence', 'Publicité ou concurrence'],
  ['autre', 'Autre raison'],
]

/** Temps écoulé en mots : « 25 min », « 3 h », « 2 j ». */
export function ecoule(ms: number, langue: 'fr' | 'en'): string {
  const min = Math.max(1, Math.round(ms / 60000))
  if (min < 60) return `${min} min`
  const h = Math.round(min / 60)
  if (h < 48) return `${h} h`
  return langue === 'en' ? `${Math.round(h / 24)} d` : `${Math.round(h / 24)} j`
}

function Reponse({ q, modeles, envoye }: { q: QuestionClient; modeles: ModeleReponse[]; envoye: () => void }) {
  const { t } = usePreferences()
  const [texte, setTexte] = useState('')
  const [apercu, setApercu] = useState<{ propre: string; filtre: boolean } | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const champ = useRef<HTMLTextAreaElement>(null)
  useEffect(() => champ.current?.focus({ preventScroll: true }), [])
  useEffect(() => {
    let vivant = true
    if (!texte.trim()) return setApercu(null)
    void sourceAJA.questions.filtrer(texte).then((r) => vivant && setApercu(r))
    return () => {
      vivant = false
    }
  }, [texte])
  const publier = async () => {
    const r = await sourceAJA.questions.repondre(q.id, texte)
    if (!r.ok) {
      jouer('erreur')
      return setErreur(r.raison === 'court' ? 'Écrivez une réponse d’au moins 10 caractères.' : r.raison === 'long' ? 'La réponse fait 600 caractères au plus.' : r.raison === 'coordonnees' ? 'Retirez les numéros, e-mails et liens : tout se passe sur BelivaY.' : r.raison === 'reserve' ? 'Répondre est réservé au propriétaire.' : 'Cette question a déjà une réponse.')
    }
    jouer('message')
    envoye()
  }
  return (
    <div className="mt12">
      <div className="chips" role="group" aria-label={t('Modèles de réponse')}>
        {modeles.map((m) => (
          <button key={m.id} type="button" className="chip" onClick={() => (setTexte(m.texte), setErreur(null))}>
            {m.titre}
          </button>
        ))}
      </div>
      <label className="t13 b7 c2" htmlFor={'rep-' + q.id} style={{ display: 'block', marginTop: '10px', marginBottom: '6px' }}>
        {t('Votre réponse publique')}
      </label>
      <textarea id={'rep-' + q.id} ref={champ} className={'aja-champ' + (erreur || apercu?.filtre ? ' err' : '')} maxLength={MAX} value={texte} onChange={(e) => (setTexte(e.target.value), setErreur(null))} placeholder={t('Ex. : Bonjour, oui, il est livré avec…')} />
      <div className="row t12 c3" style={{ justifyContent: 'space-between', marginTop: '4px' }}>
        <span>{t('Visible de tous les clients, signée « le vendeur ».')}</span>
        <span>{`${texte.length} / ${MAX}`}</span>
      </div>
      {apercu?.filtre && (
        <div className="note red" role="alert">
          <Icone nom="shield-alert" taille={16} />
          <div>
            {t('Coordonnées détectées : le client ne doit jamais recevoir de numéro, d’e-mail ni de lien.')}
            <div className="mt4">
              <button type="button" className="t13 b8" onClick={() => setTexte(apercu.propre.replace(/\s*•••\s*/g, ' ').trim())} style={{ background: 'none', border: 0, padding: 0, color: 'inherit', textDecoration: 'underline', minHeight: '32px', cursor: 'pointer', font: 'inherit', fontWeight: 800 }}>
                {t('Les retirer de ma réponse')}
              </button>
            </div>
          </div>
        </div>
      )}
      {erreur && (
        <div className="hint cr" role="alert">
          {t(erreur)}
        </div>
      )}
      <div className="mt12">
        <Bouton classe="primary" icone="send" inactif={texte.trim().length < 10 || !!apercu?.filtre} onClick={() => void publier()}>
          {t('Publier la réponse')}
        </Bouton>
      </div>
    </div>
  )
}

function CarteQuestion({ q, maintenant, objectifH, peutRepondre, ouverte, ouvrir, modeles, signaler, envoye, enAvant }: { q: QuestionClient; maintenant: number; objectifH: number; peutRepondre: boolean; ouverte: boolean; ouvrir: (o: boolean) => void; modeles: ModeleReponse[]; signaler: () => void; envoye: () => void; enAvant: boolean }) {
  const { t, tf, langue } = usePreferences()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (enAvant) ref.current?.scrollIntoView?.({ block: 'center' })
  }, [enAvant])
  const attente = maintenant - q.poseeA
  const enRetard = q.etat === 'a_repondre' && attente > objectifH * 3600_000
  return (
    <div ref={ref} className={'card' + (q.etat === 'a_repondre' ? ' ord ' + (enRetard ? 'red' : 'amber') : '')} data-question={q.id} style={enAvant ? { boxShadow: '0 0 0 2px var(--or), var(--shadow-card)' } : undefined}>
      <Link to={chemin('offre_detail', { p: q.offreId })} className="row" style={{ gap: '10px' }}>
        <Vignette nom={q.dessin} taille={36} />
        <span className="grow t13 b7 c2">{`${q.titre} · ${t(q.variante)}`}</span>
        <Icone nom="chevron-right" taille={16} style={{ color: 'var(--ink-4)' }} />
      </Link>
      <div className="row t12 c3" style={{ gap: '6px', marginTop: '10px' }}>
        <Icone nom="circle-user" taille={14} />
        <span>{tf('Un client · {quand}', { quand: echeance(q.poseeA, maintenant, langue) })}</span>
        {q.etat === 'a_repondre' && <span className={'pill sm ' + (enRetard ? 'red' : 'amber')}>{tf('attend depuis {d}', { d: ecoule(attente, langue) })}</span>}
      </div>
      <p className="t15 b7" style={{ margin: '8px 0 0', lineHeight: '1.4' }}>{`« ${q.texte} »`}</p>
      {q.reponse && (
        <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '12px', background: 'var(--sand-2)' }}>
          <div className="t12 b8 c2">{tf('Réponse du vendeur · en {d}', { d: ecoule(q.reponse.a - q.poseeA, langue) })}</div>
          <div className="t14 mt4" style={{ lineHeight: '1.45' }}>
            {q.reponse.texte}
          </div>
          <div className="t12 c3 mt4">{tf('Écrite par {nom} (visible de vous seul) · {n} clients l’ont trouvée utile', { nom: q.reponse.auteur, n: q.utile })}</div>
        </div>
      )}
      {q.signalement && (
        <div className="note or" style={{ marginTop: '10px' }}>
          <Icone nom="shield-alert" taille={16} />
          <div>{tf('Signalée : masquée aux clients. BelivaY décide avant {quand}.', { quand: echeance(q.signalement.relueAvant, maintenant, langue) })}</div>
        </div>
      )}
      {q.etat === 'a_repondre' &&
        (ouverte ? (
          <Reponse q={q} modeles={modeles} envoye={envoye} />
        ) : (
          <div className="row mt12" style={{ gap: '6px' }}>
            <div className="grow">
              {peutRepondre ? (
                <Bouton classe="soft" icone="reply" onClick={() => ouvrir(true)}>
                  {t('Répondre')}
                </Bouton>
              ) : (
                <div className="t12 c3">{t('Répondre est réservé au propriétaire.')}</div>
              )}
            </div>
            <LienTexte onClick={signaler} classe="c2">
              {t('Signaler')}
            </LienTexte>
          </div>
        ))}
      {q.etat === 'a_repondre' && ouverte && (
        <div className="center">
          <LienTexte onClick={() => ouvrir(false)} classe="c2">
            {t('Annuler')}
          </LienTexte>
        </div>
      )}
    </div>
  )
}

function FeuilleModeles({ ouverte, fermer, modeles, peutEcrire, dire }: { ouverte: boolean; fermer: () => void; modeles: ModeleReponse[]; peutEcrire: boolean; dire: (s: string) => void }) {
  const { t } = usePreferences()
  const [titre, setTitre] = useState('')
  const [texte, setTexte] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const enregistrer = async () => {
    const r = await sourceAJA.questions.enregistrerModele(titre, texte)
    if (!r.ok) {
      jouer('erreur')
      return setErr(r.raison === 'titre' ? 'Donnez un titre court (2 à 40 caractères).' : r.raison === 'coordonnees' ? 'Pas de numéro, d’e-mail ni de lien dans un modèle.' : r.raison === 'max' ? 'Dix modèles au plus : supprimez-en un.' : r.raison === 'reserve' ? 'Réservé au propriétaire.' : 'Le texte fait de 10 à 600 caractères.')
    }
    jouer('interrupteur')
    setTitre('')
    setTexte('')
    dire(t('Modèle enregistré'))
  }
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Mes modèles de réponse')}>
      <h2 className="pg-t" style={{ fontSize: '19px' }}>
        {t('Mes modèles de réponse')}
      </h2>
      <p className="pg-s">{t('Un toucher remplit la réponse ; vous la relisez avant de publier.')}</p>
      <div className="card tight" style={{ marginTop: '12px' }}>
        {modeles.map((m) => (
          <div key={m.id} className="li" style={{ alignItems: 'flex-start' }}>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {m.titre}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {m.texte}
              </span>
              {!m.propre && <span className="t12 c3">{t('Proposé par BelivaY')}</span>}
            </span>
            {m.propre && peutEcrire && (
              <button type="button" className="ibtn" aria-label={t('Supprimer le modèle') + ' · ' + m.titre} onClick={() => void sourceAJA.questions.supprimerModele(m.id).then(() => dire(t('Modèle supprimé')))}>
                <Icone nom="trash-2" taille={18} />
              </button>
            )}
          </div>
        ))}
      </div>
      {peutEcrire && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void enregistrer()
          }}
        >
          <div className="fld">
            <label htmlFor="aja-mt">{t('Titre du modèle')}</label>
            <div className="inp">
              <input id="aja-mt" value={titre} maxLength={40} placeholder={t('Ex. : Garantie')} onChange={(e) => (setTitre(e.target.value), setErr(null))} style={{ border: 0, background: 'none', outline: 'none', font: 'inherit', fontSize: '16px', color: 'var(--ink)', flex: 1, minWidth: 0 }} />
            </div>
          </div>
          <div className="fld">
            <label htmlFor="aja-mx">{t('Texte')}</label>
            <textarea id="aja-mx" className="aja-champ" value={texte} maxLength={MAX} onChange={(e) => (setTexte(e.target.value), setErr(null))} />
          </div>
          {err && <div className="hint cr">{t(err)}</div>}
          <div className="mt12">
            <Bouton classe="primary" icone="plus" type="submit" inactif={!titre.trim() || texte.trim().length < 10}>
              {t('Ajouter le modèle')}
            </Bouton>
          </div>
        </form>
      )}
    </Feuille>
  )
}

export default function Questions() {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge()
  const proprio = useMontantsVisibles()
  const [params, setParams] = useSearchParams()
  const { dire, toast } = useToast()
  const enAvant = params.get('q')
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [signal, setSignal] = useState<QuestionClient | null>(null)
  const [motif, setMotif] = useState<MotifSignalement>('coordonnees')
  const [mesModeles, setMesModeles] = useState(false)
  const lecture = useLecture(() => Promise.all([sourceAJA.questions.liste(), sourceAJA.questions.modeles()]), [])
  const fParam = params.get('f')
  const [filtre, setFiltre] = useState<Filtre>(fParam === 'repondue' || fParam === 'signalee' ? fParam : 'a_repondre')
  // Une question ouverte depuis une notification : son onglet, et le formulaire de réponse ouvert.
  const qs = lecture.donnees?.[0].questions
  useEffect(() => {
    const q = qs?.find((x) => x.id === enAvant)
    if (!q) return
    setFiltre(q.etat)
    if (q.etat === 'a_repondre' && proprio) setOuverte(q.id)
  }, [enAvant, !!qs, proprio])
  if (lecture.erreur) return <Erreur c={C} erreur={lecture.erreur} relire={lecture.relire} texteReserve="Réservé à {nom}, propriétaire." />
  if (!lecture.donnees) return <Chargement c={C} />
  const [l, modeles] = lecture.donnees
  const visibles = l.questions.filter((q) => q.etat === filtre)
  const choisir = (f: Filtre) => {
    setFiltre(f)
    const p = new URLSearchParams(params)
    if (f === 'a_repondre') p.delete('f')
    else p.set('f', f)
    p.delete('q')
    setParams(p, { replace: true })
  }
  const moyenneH = l.delaiMoyenMs !== null ? l.delaiMoyenMs / 3600_000 : null
  return (
    <EcranAJ route={C.route} titre={C.titre} onglet={C.onglet} fixes={toast}>
      <div className="pg" style={{ paddingTop: '14px' }}>
        <h1 className="pg-t">{l.compteurs.a_repondre === 0 ? t('Aucune question en attente') : tf(l.compteurs.a_repondre > 1 ? '{n} questions à répondre' : '{n} question à répondre', { n: l.compteurs.a_repondre })}</h1>
        <p className="pg-s">{t('Les clients posent leurs questions sur vos fiches. Votre réponse aide aussi les suivants.')}</p>
      </div>
      <div className="card" style={{ marginTop: '14px' }}>
        <div className="row" style={{ gap: '12px' }}>
          <span style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: moyenneH !== null && moyenneH <= l.objectifH ? 'var(--green-soft)' : 'var(--amber-soft)', color: moyenneH !== null && moyenneH <= l.objectifH ? 'var(--green)' : 'var(--amber)', flexShrink: 0 }}>
            <Icone nom="timer" taille={20} />
          </span>
          <div className="grow">
            <div className="b8 t15">{l.delaiMoyenMs !== null ? tf('Vous répondez en {d} en moyenne', { d: ecoule(l.delaiMoyenMs, langue) }) : t('Pas encore de réponse ce mois-ci')}</div>
            <div className="t13 c2 mt4">{tf('Objectif : moins de {h} h. Une réponse rapide rassure le client avant l’achat.', { h: l.objectifH })}</div>
            {l.plusAncienne !== null && <div className="t13 c2 mt4">{tf('La plus ancienne attend depuis {d}.', { d: ecoule(maintenant - l.plusAncienne, langue) })}</div>}
          </div>
        </div>
      </div>
      <Selecteur
        etiquette="Filtrer les questions"
        valeur={filtre}
        changer={choisir}
        choix={[
          ['a_repondre', 'À répondre', l.compteurs.a_repondre],
          ['repondue', 'Répondues', l.compteurs.repondue],
          ['signalee', 'Signalées', l.compteurs.signalee],
        ]}
      />
      {visibles.length === 0 ? (
        <div className="card" style={{ marginTop: '12px' }}>
          <div className="empty">
            <div className="ei">
              <Icone nom="message-circle-question-mark" taille={24} />
            </div>
            <h3>{t(filtre === 'a_repondre' ? 'Tout est répondu' : filtre === 'repondue' ? 'Aucune réponse pour l’instant' : 'Aucune question signalée')}</h3>
            <p>{t('Une nouvelle question arrive en notification.')}</p>
          </div>
        </div>
      ) : (
        <div className="aja-liste deux">
          {visibles.map((q) => (
            <CarteQuestion
              key={q.id}
              q={q}
              maintenant={maintenant}
              objectifH={l.objectifH}
              peutRepondre={proprio}
              ouverte={ouverte === q.id}
              ouvrir={(o) => setOuverte(o ? q.id : null)}
              modeles={modeles}
              signaler={() => setSignal(q)}
              envoye={() => {
                setOuverte(null)
                dire(t('Réponse publiée'))
              }}
              enAvant={enAvant === q.id}
            />
          ))}
        </div>
      )}
      <div className="mt14">
        <Bouton classe="secondary" icone="notebook-pen" onClick={() => setMesModeles(true)}>
          {tf('Mes modèles de réponse · {n}', { n: modeles.length })}
        </Bouton>
      </div>
      <Indice icone="shield-check">{t('Le client reste anonyme ; il ne voit jamais le nom de votre boutique. Numéros, e-mails et liens sont refusés : tout se passe sur BelivaY.')}</Indice>

      <FeuilleModeles ouverte={mesModeles} fermer={() => setMesModeles(false)} modeles={modeles} peutEcrire={proprio} dire={dire} />
      <Feuille ouverte={!!signal} fermer={() => setSignal(null)} titre={t('Signaler la question')}>
        {signal && (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const r = await sourceAJA.questions.signaler(signal.id, motif)
              setSignal(null)
              if (r.ok) {
                jouer('interrupteur')
                dire(t('Question signalée : masquée en attendant BelivaY'))
              }
            }}
          >
            <h2 className="pg-t" style={{ fontSize: '19px' }}>
              {t('Signaler la question')}
            </h2>
            <p className="pg-s">{`« ${signal.texte} »`}</p>
            <div className="card tight" role="radiogroup" aria-label={t('Motif')} style={{ marginTop: '12px' }}>
              {MOTIFS.map(([id, nom]) => (
                <label key={id} className="li" style={{ cursor: 'pointer' }}>
                  <input type="radio" name="motif" checked={motif === id} onChange={() => setMotif(id)} style={{ width: '20px', height: '20px', accentColor: 'var(--or)' }} />
                  <span className="grow lt">{t(nom)}</span>
                </label>
              ))}
            </div>
            <div className="hint">{t('La question est masquée aux clients jusqu’à la décision de BelivaY.')}</div>
            <div className="mt14">
              <Bouton classe="primary" icone="shield-alert" type="submit">
                {t('Signaler')}
              </Bouton>
            </div>
          </form>
        )}
      </Feuille>
    </EcranAJ>
  )
}
