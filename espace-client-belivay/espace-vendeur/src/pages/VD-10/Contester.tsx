// Contester une décision (VD-10, fig. 5) : repris du prototype (route('contester')), branché sur POST /score/appeal
// (domaine trust) pour une sanction ou une descente de palier, et sur la contestation d'un litige (domaine litiges,
// VD07-R20) quand l'adresse nomme une commande (?ref=BLV-…).
// - La décision vient de l'adresse (?d=<décision>, comme decision_id en production) ; sans décision, la liste des
//   décisions encore contestables, ou « Aucune décision à contester ».
// - Une seule contestation par décision (CON-01) : déjà contestée, l'écran montre la contestation, la réponse ou
//   l'heure limite (72 h ouvrées, dimanche non compté) ; le rappel est juste au-dessus du bouton d'envoi (CON-02).
// - Vraie saisie (VD10-R26) : explication obligatoire avec compteur (40 à 1 000 caractères ; vide : « Expliquez en une
//   phrase au moins. »), vraies preuves (photos choisies sur l'appareil, datées sur deux lignes, retirables).
// - « Envoyer ma contestation » renvoie à l'écran d'origine (?depuis=…), qui montre la contestation envoyée.
// - Hors connexion : envoi désactivé, avec la raison. Aucun montant : identique pour l'accès Préparation.
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Decision } from '../../donnees/domaines/trust'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { Bouton, dateCourteDe, dateEtHeure, Plus, Squelette, useEnLigne } from './commun'
import { useTitreDecision } from './Sanctions'
import { heure } from '../../i18n/temps'

const MIN = 40
const MAX = 1000
const MAX_PREUVES = 6
const ORIGINES = /^(palier|sanctions|suspendu|litige_envoye|litige|notifications)(\?[\w=&%.-]*)?$/

interface Preuve {
  nom: string
  date: number
  url: string
}

/** Écran d'origine, s'il est permis (jamais une adresse arbitraire). */
function useOrigine(): string {
  const [p] = useSearchParams()
  const d = p.get('depuis') ?? ''
  return ORIGINES.test(d) ? '/' + d : chemin('sanctions')
}

function CarteDecision({ titre, date, motif }: { titre: string; date: string; motif: string }) {
  const { t, tf } = usePreferences()
  return (
    <div className="card">
      <div className="kick" style={{ fontSize: '12px' }}>
        {t('La décision')}
      </div>
      <div className="row mt8" style={{ alignItems: 'flex-start' }}>
        <span className="li" style={{ padding: '0', border: '0', minHeight: '0' }}>
          <span className="ic red">
            <Icone nom="shield-alert" taille={20} />
          </span>
        </span>
        <div className="grow">
          <div className="b8 t15">{titre}</div>
          <div className="t13 c3 mt4">{date}</div>
          <div className="t13 c2 mt4">{tf('Motif : « {motif} »', { motif: t(motif) })}</div>
        </div>
      </div>
    </div>
  )
}

function Formulaire({ envoyer, origine }: { envoyer: (texte: string, preuves: string[]) => Promise<string | null>; origine: string }) {
  const { t, tf, langue } = usePreferences()
  const naviguer = useNavigate()
  const enLigne = useEnLigne()
  const [texte, setTexte] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [preuves, setPreuves] = useState<Preuve[]>([])
  const [envoi, setEnvoi] = useState(false)
  const fichier = useRef<HTMLInputElement>(null)
  const zone = useRef<HTMLTextAreaElement>(null)
  useEffect(() => () => preuves.forEach((p) => URL.revokeObjectURL(p.url)), []) // eslint-disable-line react-hooks/exhaustive-deps
  const n = texte.trim().length
  const ajouter = (e: ChangeEvent<HTMLInputElement>) => {
    const f = [...(e.target.files ?? [])].filter((x) => x.type.startsWith('image/')).slice(0, MAX_PREUVES - preuves.length)
    setPreuves((p) => [...p, ...f.map((x) => ({ nom: x.name, date: x.lastModified, url: URL.createObjectURL(x) }))])
    e.target.value = ''
  }
  const soumettre = async () => {
    if (n === 0) {
      setErreur(t('Expliquez en une phrase au moins.'))
      zone.current?.focus()
      jouer('erreur')
      return
    }
    if (n < MIN) {
      setErreur(tf('Encore {n} caractères au moins.', { n: MIN - n }))
      zone.current?.focus()
      jouer('erreur')
      return
    }
    setEnvoi(true)
    const refus = await envoyer(texte, preuves.map((p) => `${p.nom} · ${new Date(p.date).toISOString()}`))
    setEnvoi(false)
    if (refus) {
      setErreur(refus)
      jouer('erreur')
      return
    }
    jouer('message')
    naviguer(origine, { replace: true })
  }
  return (
    <>
      <div className="fld">
        <label htmlFor="vd10-explication">
          {t('Votre explication ')}
          <span className="req">{t('*')}</span>
        </label>
        <div className={'inp area' + (erreur ? ' err' : n >= MIN ? ' ok' : '')}>
          <textarea
            id="vd10-explication"
            ref={zone}
            className="vd10-area"
            value={texte}
            maxLength={MAX}
            rows={5}
            aria-invalid={!!erreur}
            aria-describedby="vd10-cnt vd10-err"
            placeholder={t('Ce qui s’est passé, avec les dates et les heures. Joignez vos photos.')}
            onChange={(e) => (setTexte(e.target.value), setErreur(null))}
          />
        </div>
        <div id="vd10-cnt" className={'cnt' + (n >= MIN ? ' ok' : '')}>
          {n === 1 ? t('1 caractère') : tf('{n} caractères', { n })}
          {n < MIN ? ` · ${tf('{m} au moins', { m: MIN })}` : ''}
        </div>
        {erreur && (
          <div id="vd10-err" className="vd10-err" role="alert">
            {erreur}
          </div>
        )}
      </div>
      <div className="fld">
        <label htmlFor="vd10-preuves">{t('Vos preuves')}</label>
        <div className="photos" style={{ marginTop: '0' }}>
          {preuves.map((p, i) => (
            <div key={p.url} className="photo vd10-prv">
              <img src={p.url} alt={tf('Preuve {n}', { n: i + 1 })} />
              <span className="ts" style={{ fontSize: '12px' }}>
                {dateCourteDe(p.date, langue)}
                <br />
                {heure(p.date, langue)}
              </span>
              <button type="button" aria-label={tf('Retirer la preuve {n}', { n: i + 1 })} onClick={() => (URL.revokeObjectURL(p.url), setPreuves((x) => x.filter((y) => y !== p)))}>
                <Icone nom="x" taille={16} />
              </button>
            </div>
          ))}
          {preuves.length < MAX_PREUVES && (
            <button type="button" className="addph" style={{ fontSize: '13px', cursor: 'pointer', font: 'inherit', color: 'inherit' }} onClick={() => fichier.current?.click()}>
              <Icone nom="paperclip" taille={22} />
              <span>{t('Ajouter')}</span>
            </button>
          )}
        </div>
        <input id="vd10-preuves" ref={fichier} className="vd10-fichier" type="file" accept="image/*" multiple onChange={ajouter} tabIndex={-1} />
        <p className="t12 c3 mt6">{tf('Photos datées : {n} au plus. Elles sont gardées 180 jours.', { n: MAX_PREUVES })}</p>
      </div>
      <div className="mt16">
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Une seule contestation par décision : relisez avant d’envoyer.')}</span>
        </div>
      </div>
      <div className="mt12">
        <Bouton classe="primary" icone="send" onClick={() => void soumettre()} desactive={!enLigne || envoi} raison={!enLigne ? t('Pas de connexion : réessayez dans un moment.') : undefined}>
          {envoi ? t('Envoi…') : t('Envoyer ma contestation')}
        </Bouton>
        {!enLigne && <p className="t13 cr mt6">{t('Pas de connexion : réessayez dans un moment.')}</p>}
      </div>
    </>
  )
}

function DejaContestee({ c }: { c: NonNullable<Decision['contestation']> }) {
  const { t, tf, langue } = usePreferences()
  return (
    <div className="card">
      <h3>{t('Votre contestation')}</h3>
      <div className="t12 c3 mt4">{tf('Envoyée {quand}', { quand: dateEtHeure(c.envoyeeA, langue) })}</div>
      <p className="t13 c2 mt8" style={{ lineHeight: '1.45' }}>{`« ${c.texte} »`}</p>
      {c.preuves.length > 0 && <div className="t12 c3">{c.preuves.length === 1 ? t('1 preuve jointe') : tf('{n} preuves jointes', { n: c.preuves.length })}</div>}
      {c.reponse ? (
        <div className={'note ' + (c.reponse.issue === 'annulee' ? 'green' : 'amber')}>
          <Icone nom={c.reponse.issue === 'annulee' ? 'circle-check' : 'info'} taille={18} />
          <div>
            <b>{t(c.reponse.issue === 'annulee' ? 'Décision annulée.' : 'Décision maintenue.')}</b> {tf('Motif : « {motif} »', { motif: t(c.reponse.motif) })}
          </div>
        </div>
      ) : (
        <div className="note ink">
          <Icone nom="clock" taille={18} />
          <div>{tf('Une personne vous répond avant {quand}. La réponse arrive en notification et reste dans l’historique.', { quand: dateEtHeure(c.reponseAvant, langue) })}</div>
        </div>
      )}
    </div>
  )
}

function Explication() {
  const { t } = usePreferences()
  return (
    <Plus titre={t('Comment ça marche')}>
      <p>{t('Un humain relit votre explication et vos preuves. Il répond avec un motif écrit.')}</p>
      <p>{t('Il répond sous 72 h ouvrées : toutes les heures comptent, sauf le dimanche.')}</p>
      <p>{t('La réponse reste dans votre historique, que la décision soit maintenue ou annulée.')}</p>
    </Plus>
  )
}

const avecDecision = (search: string, id: string) => {
  const p = new URLSearchParams(search)
  p.set('d', id)
  return p.toString()
}

function Choisir({ origine }: { origine: string }) {
  const { t, langue } = usePreferences()
  const { search } = useLocation()
  const titre = useTitreDecision()
  const lecture = useLecture(() => source.trust.decisions(), [search])
  const liste = (lecture.donnees ?? []).filter((d) => !d.contestation)
  return (
    <>
      {lecture.donnees === null && !lecture.erreur && <Squelette lignes={[96]} />}
      {lecture.erreur && (
        <div className="card">
          <p className="t13 c2">{t('Historique indisponible pour l’instant. Réessayez dans un moment.')}</p>
          <Bouton classe="secondary sm" icone="refresh-cw" onClick={lecture.relire} style={{ height: '44px' }}>
            {t('Réessayer')}
          </Bouton>
        </div>
      )}
      {lecture.donnees && liste.length === 0 && (
        <div className="card">
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <Icone nom="shield-check" taille={24} style={{ color: 'var(--green)', flexShrink: '0' }} />
            <div className="grow">
              <div className="b8 t15">{t('Aucune décision à contester.')}</div>
              <div className="t13 c2 mt4" style={{ lineHeight: '1.45' }}>
                {t('Une sanction ou une descente de palier arrive en notification, avec le bouton « Contester ».')}
              </div>
            </div>
          </div>
          <div className="mt12">
            <Bouton classe="secondary" icone="shield-check" vers={origine} style={{ height: '44px' }}>
              {t('Voir sanctions et contrôle')}
            </Bouton>
          </div>
        </div>
      )}
      {liste.length > 0 && (
        <div className="card tight">
          {liste.map((d) => (
            <Link key={d.id} to={'/contester?' + avecDecision(search, d.id)} className="li" replace>
              <span className="ic red">
                <Icone nom="shield-alert" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {titre(d)}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {dateEtHeure(d.decideeA, langue)}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

function SurDecision({ id, origine }: { id: string; origine: string }) {
  const { t, langue } = usePreferences()
  const titre = useTitreDecision()
  const lecture = useLecture(() => source.trust.decision(id).then((d) => ({ d })), [id])
  if (lecture.erreur)
    return (
      <div className="card">
        <p className="t13 c2">{t('Cette décision n’a pas pu arriver. Vérifiez votre réseau, puis réessayez.')}</p>
        <Bouton classe="secondary sm" icone="refresh-cw" onClick={lecture.relire} style={{ height: '44px' }}>
          {t('Réessayer')}
        </Bouton>
      </div>
    )
  if (!lecture.donnees) return <Squelette lignes={[110, 140]} />
  const d = lecture.donnees.d
  if (!d)
    return (
      <div className="card">
        <p className="t13 c2">{t('Cette décision n’existe plus.')}</p>
        <Bouton classe="secondary sm" icone="shield-check" vers={origine} style={{ height: '44px' }}>
          {t('Voir sanctions et contrôle')}
        </Bouton>
      </div>
    )
  return (
    <>
      <CarteDecision titre={titre(d)} date={dateEtHeure(d.decideeA, langue)} motif={d.motif} />
      {d.contestation ? (
        <DejaContestee c={d.contestation} />
      ) : (
        <Formulaire
          origine={origine}
          envoyer={async (texte, preuves) => {
            const r = await source.trust.contester(d.id, texte, preuves)
            if (r.ok) return null
            return t(r.raison === 'deja_contestee' ? 'Cette décision a déjà été contestée.' : r.raison === 'trop_court' ? 'Expliquez en une phrase au moins.' : r.raison === 'trop_long' ? 'Votre explication est trop longue.' : 'Cette décision n’existe plus.')
          }}
        />
      )}
    </>
  )
}

function SurLitige({ ref_, origine }: { ref_: string; origine: string }) {
  const { t, tf, langue } = usePreferences()
  const lecture = useLecture(() => source.litiges.detail(ref_).then((l) => ({ l })), [ref_])
  if (lecture.erreur)
    return (
      <div className="card">
        <p className="t13 c2">{t('Ce litige n’a pas pu arriver. Vérifiez votre réseau, puis réessayez.')}</p>
        <Bouton classe="secondary sm" icone="refresh-cw" onClick={lecture.relire} style={{ height: '44px' }}>
          {t('Réessayer')}
        </Bouton>
      </div>
    )
  if (!lecture.donnees) return <Squelette lignes={[110]} />
  const l = lecture.donnees.l
  if (!l)
    return (
      <div className="card">
        <p className="t13 c2">{t('Ce litige est clos.')}</p>
      </div>
    )
  const tranche = l.issue === 'perdu' || l.issue === 'gagne'
  return (
    <>
      <CarteDecision titre={tf('Litige · {ref}', { ref: l.ref })} date={dateEtHeure(l.ouvertA, langue)} motif={l.motif} />
      {tranche ? (
        <Formulaire
          origine={origine}
          envoyer={async (texte) => {
            const r = await source.litiges.contester(l.ref, texte)
            return r.ok ? null : t(r.raison === 'deja_contestee' ? 'Cette décision a déjà été contestée.' : 'Expliquez en une phrase au moins.')
          }}
        />
      ) : (
        <div className="note ink">
          <Icone nom="hourglass" taille={18} />
          <div>{t('Ce litige n’est pas encore tranché : vous pourrez contester la décision une fois prise, sous 48 h.')}</div>
        </div>
      )}
    </>
  )
}

export default function Contester() {
  const { t } = usePreferences()
  const [p] = useSearchParams()
  const origine = useOrigine()
  const id = p.get('d')
  const ref = p.get('ref')
  return (
    <Ecran route="contester" retour={origine}>
      <div className="pg">
        <h1 className="pg-t">{t('Contester une décision')}</h1>
        <p className="pg-s">{t('Dites pourquoi vous n’êtes pas d’accord. Un humain vous répond sous 72 h ouvrées.')}</p>
      </div>
      {id ? <SurDecision id={id} origine={origine} /> : ref ? <SurLitige ref_={ref} origine={origine} /> : <Choisir origine={origine} />}
      <Explication />
    </Ecran>
  )
}
