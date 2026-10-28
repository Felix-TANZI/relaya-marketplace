// Décision de BelivaY (page ajoutée à PR-03, « decision?id=… » ; ouverte par « Voir la décision et le motif » et
// « Contester » du statut, et par la notification de la sanction, STA-05). Ce que la personne de BelivaY a décidé,
// quand, son motif écrit, ce que la décision change pour le relais, et la contestation : UNE fois, réponse d'une
// personne sous PR-CONTEST-H heures ouvrées (STA-03). Le gérant demande, BelivaY décide (DP-66 appliquée au relais).
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { usePeut } from '../../config/droits'
import { chemin } from '../../config/pages'
import type { Decision as DecisionVue } from '../../donnees/domaines/acces'
import { origine, useEnLigne } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Chargement, ErreurLecture, Note, useMaintenant } from './commun'
import { ACCES } from './parametres'
import { NIVEAUX } from './StatutRelais'
import './pr03.css'

const EFFETS: Record<DecisionVue['niveau'], string> = {
  1: 'Un avertissement ne change rien au travail du relais ; il reste dans l’historique et compte si d’autres faits suivent.',
  2: 'Le relais reste ouvert mais il est proposé aux clients après les autres relais pendant la durée de la décision.',
  3: 'Plus de nouveaux colis ; le stock part vers le relais ouvert le plus proche ; les remises en cours restent possibles ; versements maintenus pour les opérations faites ; Trust Score gelé sous {gel}. Retour par une période probatoire.',
  4: 'Exclusion pour fraude : le relais est clos, le stock est transféré et les opérations faites sont payées.',
}
const TEXTE_MIN = 20
const TEXTE_MAX = 500

export default function Decision() {
  const { t } = usePreferences()
  const [params] = useSearchParams()
  const id = params.get('id')
  const lecture = useLecture(() => source.acces.statut(), [])
  const d = lecture.donnees?.decisions.find((x) => x.id === id) ?? null
  return (
    <Ecran route="decision">
      <div className="p-0hxmj8 r-pile pr3">
        {lecture.erreur ? (
          <ErreurLecture relire={lecture.relire} />
        ) : !lecture.donnees ? (
          <Chargement />
        ) : !d ? (
          <div className="p-yi6rkz">
            <div className="r-vide">
              <div className="r-vide-i">
                <Icone nom="r-balance" taille={28} />
              </div>
              <h2>{t('Décision introuvable')}</h2>
              <p>{t('Cette décision n’existe pas ou ne concerne pas votre relais. Les décisions de BelivaY sont toutes dans « Statut du relais ».')}</p>
            </div>
            <Link to={chemin('statut-relais')} className="p-rbzobc">
              {t('Voir le statut du relais')}
            </Link>
          </div>
        ) : (
          <Detail d={d} relire={lecture.relire} ouvrirForm={params.get('contester') === '1'} />
        )}
      </div>
    </Ecran>
  )
}

function Detail({ d, relire, ouvrirForm }: { d: DecisionVue; relire: () => void; ouvrirForm: boolean }) {
  const { t, tf, langue } = usePreferences()
  const session = useSession()
  const peut = usePeut('cloturerCompte')
  const enLigne = useEnLigne()
  const maintenant = useMaintenant()
  const [texte, setTexte] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const champ = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (ouvrirForm) champ.current?.focus()
  }, [ouvrirForm])
  const envoyer = async () => {
    if (texte.trim().length < TEXTE_MIN) return setMsg(tf('Expliquez en {n} caractères au moins ce que vous contestez.', { n: TEXTE_MIN }))
    const r = await source.acces.contester(d.id, texte, origine(maintenant()))
    signal(r.ok ? 'succes' : 'erreur')
    if (!r.ok) setMsg(r.raison === 'deja_contestee' ? t('Cette décision a déjà été contestée : une seule contestation par décision.') : t('Cette décision ne peut pas être contestée.'))
    relire()
  }
  const c = d.contestation
  return (
    <>
      <div className={d.niveau >= 3 ? 'p-9a9wu0' : 'p-yi6rkz'}>
        <div className="p-wa6ccw">
          <div className={d.niveau >= 3 ? 'p-lqvhm1' : 'p-toppw8'}>
            <Icone nom="r-balance" taille={24} className={d.niveau >= 3 ? 'p-woejqv' : 'p-672m16'} />
          </div>
          <h2 className="p-nlvkht">{tf('{niveau} · niveau {n} sur 4', { niveau: t(NIVEAUX[d.niveau]), n: d.niveau })}</h2>
        </div>
        <div className="p-mqmvkk">
          <span className="p-ytl255">{t('Décidée le')}</span>
          <span className="p-2vq92h">{jourLong(d.le, langue)}</span>
        </div>
        <div className="p-mqmvkk">
          <span className="p-ytl255">{t('Par')}</span>
          <span className="p-2vq92h">{t('une personne de BelivaY')}</span>
        </div>
        {d.jusquA && (
          <div className="p-mqmvkk">
            <span className="p-ytl255">{t('Fin prévue')}</span>
            <span className="p-2vq92h">{jourLong(d.jusquA, langue)}</span>
          </div>
        )}
        <div className="p-ky12xr">{t('MOTIF ÉCRIT')}</div>
        <div className="p-5pu05p">{d.motif}</div>
        <div className="p-ky12xr">{t('CE QUE CELA CHANGE')}</div>
        <div className="p-5pu05p">{tf(EFFETS[d.niveau], { gel: ACCES.gelSous })}</div>
      </div>
      <div className="p-yi6rkz" id="contester">
        <div className="p-unncbq">
          <h2 className="p-9j1bbu">{t('Contestation')}</h2>
          {c && <span className={c.etat === 'levee' ? 'p-nax3x4' : c.etat === 'maintenue' ? 'p-6z26dm' : 'p-rpzy79'}>{c.etat === 'en_cours' ? t('En cours') : c.etat === 'levee' ? t('Levée') : t('Maintenue')}</span>}
        </div>
        {c ? (
          <>
            <div className="p-ug5qrn">{tf('Envoyée le {le} ; une personne de BelivaY répond avant le {avant}.', { le: jourLong(c.le, langue), avant: echeance(c.reponseAvant, session.maintenant, langue) })}</div>
            <div className="p-5pu05p">« {c.texte} »</div>
            {c.reponse && <Note ton="accent">{c.reponse}</Note>}
          </>
        ) : !peut ? (
          <Note ton="accent">{t('Seul le gérant, signataire de la convention, peut contester une décision.')}</Note>
        ) : !d.contestable ? (
          <Note ton="accent">{t('Cette décision ne peut plus être contestée.')}</Note>
        ) : (
          <>
            <div className="p-ug5qrn">{tf('Vous pouvez contester une fois. Une personne de BelivaY relit le dossier et répond sous {h} h ouvrées. Joignez vos explications ; les preuves du relais (photos, journal) sont déjà au dossier.', { h: ACCES.contestationHeures })}</div>
            <label className="p-ky12xr">
              {t('VOS EXPLICATIONS')}
              <textarea ref={champ} className="p-afs6hh" minLength={TEXTE_MIN} maxLength={TEXTE_MAX} value={texte} onChange={(e) => (setTexte(e.target.value), setMsg(null))} />
              <span className="pr3-compte">{`${texte.length} / ${TEXTE_MAX}`}</span>
            </label>
            {msg && <Note ton="rouge">{msg}</Note>}
            {!enLigne && <Note ton="ambre">{t('Hors connexion : cette demande part avec le réseau.')}</Note>}
            <button type="button" className="p-ncx7qc" disabled={!enLigne} onClick={() => void envoyer()}>
              {t('Envoyer la contestation')}
            </button>
          </>
        )}
      </div>
      <Link to={chemin('messagerie')} className="p-rbzobc">
        <Icone nom="r-message" taille={18} className="p-emic6i" />
        {t('Écrire à BelivaY')}
      </Link>
    </>
  )
}
