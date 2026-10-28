// PR-09 · Journal du Trust Score (page ajoutée ; gérant seul) : TRU-02 (journal immuable et rejouable), TRU-06, TRU-07,
// PAL-02. Deux parties :
// - Décisions : sanction (niveaux 1 à 4) ou descente de palier, proposée par le calcul et validée par une personne avec
//   un motif écrit ; contestation, réponse, motif restent visibles au gérant ;
// - Événements : effet sur un critère, date, objet (référence BelivaY seulement) ; un dossier en cours n'a aucun effet.
// Contester (feuille « contester », adresse ?sheet=contester&cible=…) : UNE fois par événement ou décision, pendant
// PR-CONTESTATION-FENETRE-J jours (A-VALIDER ARL-115), avec un texte ; réponse motivée sous PR-CONTESTATION-H heures
// ouvrées ; effet suspendu pendant l'examen ; hors connexion, la contestation part en file. Le relais conteste, il ne
// décide pas (DP-66 appliquée au relais).
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { geste, useEnLigne } from '../../donnees/fileHorsLigne'
import type { Contestation, Decision, EvenementTrust, Trust } from '../../donnees/domaines/qualite'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance, jourCourt, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { CRITERES, Chargement, EcranGerant, ErreurLecture, NIVEAUX, useOrigine } from './commun'
import { P09 } from './parametres'

export default function TrustJournal() {
  const lec = useLecture(() => source.qualite.trust(), [])
  const [p] = useSearchParams()
  const f = useFeuille('contester')
  const cible = p.get('cible')
  const d = lec.donnees
  const objet = d && cible ? (d.evenements.find((x) => x.id === cible) ?? d.decisions.find((x) => x.id === cible) ?? null) : null
  return (
    <EcranGerant route="trust-journal" fixes={d && <FeuilleContester ouverte={f.ouverte && !!objet} fermer={f.fermer} objet={objet} />}>
      {lec.erreur ? <ErreurLecture relire={lec.relire} erreur={lec.erreur} /> : !d ? <Chargement lignes={4} /> : <Contenu d={d} />}
    </EcranGerant>
  )
}

/** Peut-on contester maintenant ? (une fois, dans le délai, effet négatif, pas un dossier en cours). */
const contestable = (x: EvenementTrust | Decision, t: number) => !x.contestation && x.contestableJusqua !== null && x.contestableJusqua > t && (!('effet' in x) || (x.effet < 0 && !x.dossierEnCours))

function useOuvrir() {
  const [p] = useSearchParams()
  const naviguer = useNavigate()
  return (id: string) => {
    const n = new URLSearchParams(p)
    n.set('sheet', 'contester')
    n.set('cible', id)
    naviguer({ search: n.toString() }, { state: { feuille: true } })
  }
}

function EtatContestation({ c }: { c: Contestation }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge()
  const [libelle, classe] = c.etat === 'en_examen' ? [t('Contestation en examen · effet suspendu'), 'p-h4wlx0'] : c.etat === 'acceptee' ? [t('Contestation acceptée'), 'p-nax3x4'] : [t('Contestation rejetée'), 'p-ekng8o']
  return (
    <div className="r9-contestation">
      <span className={classe}>{libelle}</span>
      <div className="p-46lk2m">
        {tf('Envoyée le {jour} : « {texte} »', { jour: jourCourt(c.le, langue), texte: c.texte })}
      </div>
      {c.reponse ? <div className="p-81u2s6">{tf('Réponse de BelivaY : {r}', { r: t(c.reponse) })}</div> : <div className="p-81u2s6">{tf('Réponse motivée {quand}.', { quand: echeance(c.reponseAvant, maintenant, langue) })}</div>}
    </div>
  )
}

function Contenu({ d }: { d: Trust }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge()
  const ouvrir = useOuvrir()
  return (
    <div className="p-0hxmj8 r-pile">
      <div>
        <h1 className="p-bvhkrl">{t('Journal du Trust Score')}</h1>
        <div className="p-t2u0o2">{tf('Chaque calcul et chaque décision, gardés et rejouables. Contestez une fois, dans le délai indiqué : réponse motivée sous {h} h ouvrées.', { h: P09.contestationH })}</div>
      </div>

      <div className="p-yi6rkz">
        <div className="p-unncbq">
          <h2 className="p-9j1bbu">{t('Décisions')}</h2>
        </div>
        {d.decisions.length === 0 && <div className="p-81u2s6">{t('Aucune décision : ni sanction ni descente de palier.')}</div>}
        <ul className="r9-liste">
          {d.decisions.map((x) => (
            <li key={x.id} className="r9-entree">
              <div className="p-unncbq">
                <div className="p-dfc4i3">{x.type === 'descente_palier' ? t('Descente de palier') : tf('Sanction niveau {n} · {l}', { n: x.niveau ?? 1, l: t(NIVEAUX[x.niveau ?? 1]) })}</div>
                <span className={x.etat === 'proposee' ? 'p-h4wlx0' : x.etat === 'annulee' ? 'p-6z26dm' : 'p-ekng8o'}>{x.etat === 'proposee' ? t('proposée') : x.etat === 'annulee' ? t('annulée') : t('validée')}</span>
              </div>
              <div className="p-ug5qrn">{t(x.motif)}</div>
              <div className="p-46lk2m">
                {jourLong(x.le, langue)} · {x.valideeLe ? t('validée par une personne de BelivaY, motif écrit') : t('proposée par le calcul, en attente d’une personne')}
              </div>
              {x.contestation && <EtatContestation c={x.contestation} />}
              {contestable(x, maintenant) ? (
                <button type="button" className="p-rbzobc" onClick={() => ouvrir(x.id)}>
                  {tf('Contester · jusqu’au {jour}', { jour: jourCourt(x.contestableJusqua!, langue) })}
                </button>
              ) : (
                !x.contestation && x.contestableJusqua !== null && <div className="p-46lk2m">{t('Délai de contestation passé.')}</div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-yi6rkz">
        <div className="p-unncbq">
          <h2 className="p-9j1bbu">{t('Événements')}</h2>
        </div>
        {d.evenements.length === 0 && <div className="p-81u2s6">{t('Aucun événement pour l’instant : le journal se remplit avec vos remises.')}</div>}
        <ul className="r9-liste">
          {d.evenements.map((e) => (
            <li key={e.id} className="r9-entree">
              <div className="p-br69f5">
                <span className={'r9-effet ' + (e.effet > 0 ? 'r9-plus' : e.effet < 0 ? 'r9-moins' : 'r9-neutre')} aria-label={tf('Effet : {n} points', { n: e.effet })}>
                  {e.effet > 0 ? '+' + e.effet : e.effet === 0 ? '0' : '−' + -e.effet}
                </span>
                <div className="p-lmo74g">
                  <div className="p-dfc4i3">{t(e.libelle)}</div>
                  <div className="p-46lk2m">
                    {jourLong(e.le, langue)} · {t(CRITERES[e.critere])}
                    {e.objet ? ' · ' : ''}
                    {e.objet && <span className="r-ref">{e.objet}</span>}
                  </div>
                </div>
              </div>
              {e.dossierEnCours && <div className="p-81u2s6">{t('Dossier en cours : aucun effet sur votre score tant qu’il n’est pas tranché.')}</div>}
              {e.contestation && <EtatContestation c={e.contestation} />}
              {contestable(e, maintenant) && (
                <button type="button" className="p-rbzobc" onClick={() => ouvrir(e.id)}>
                  {tf('Contester · jusqu’au {jour}', { jour: jourCourt(e.contestableJusqua!, langue) })}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <Link to={chemin('trust')} className="p-rbzobc">
        <Icone nom="r-graphique" taille={18} className="p-emic6i" />
        {t('Revenir au Trust Score')}
      </Link>
    </div>
  )
}

function FeuilleContester({ ouverte, fermer, objet }: { ouverte: boolean; fermer: () => void; objet: EvenementTrust | Decision | null }) {
  const { t, tf, langue } = usePreferences()
  const en = useEnLigne()
  const o = useOrigine()
  const [texte, setTexte] = useState('')
  const [etat, setEtat] = useState<'non' | 'en_cours' | 'erreur' | 'en_file'>('non')
  if (!objet) return null
  const deja = !!objet.contestation
  const envoyer = async () => {
    setEtat('en_cours')
    const x = o()
    try {
      const r = await geste(en, 'message', objet.id, x, (s) => s.qualite.contester(objet.id, texte, x))
      if (r.etat === 'en_file') {
        signal('succes')
        setEtat('en_file')
        return
      }
      if (r.r.ok) {
        signal('succes')
        setTexte('')
        setEtat('non')
        fermer()
      } else {
        signal('erreur')
        setEtat('erreur')
      }
    } catch {
      signal('erreur')
      setEtat('erreur')
    }
  }
  const titre = 'effet' in objet ? t(objet.libelle) : objet.type === 'descente_palier' ? t('Descente de palier') : tf('Sanction niveau {n} · {l}', { n: objet.niveau ?? 1, l: t(NIVEAUX[objet.niveau ?? 1]) })
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Contester')}>
      <div className="r9-feuille">
        <h2 className="p-9j1bbu">{t('Contester')}</h2>
        <div className="p-ug5qrn">
          <strong>{titre}</strong> · {jourLong(objet.le, langue)}
        </div>
        {deja || etat === 'en_file' ? (
          <div className="p-gh7puf" role="status">
            <Icone nom="check" taille={18} className="p-672m16" />
            <div>{etat === 'en_file' ? t('Contestation gardée sur le téléphone : elle part au retour du réseau.') : t('Déjà contestée : une seule contestation par décision.')}</div>
          </div>
        ) : (
          <>
            <label className="p-ky12xr" htmlFor="r9-texte">
              {t('VOTRE EXPLICATION')}
            </label>
            <textarea id="r9-texte" className="p-afs6hh r9-texte" rows={4} value={texte} onChange={(e) => setTexte(e.target.value.slice(0, 600))} placeholder={t('Ce qui s’est passé, et la preuve que vous avez (photo, heure, référence).')} />
            <div className="p-81u2s6">{tf('Une seule fois. Effet suspendu pendant l’examen ; réponse motivée sous {h} h ouvrées, dimanche non compté.', { h: P09.contestationH })}</div>
            {etat === 'erreur' && (
              <div className="r9-erreur" role="alert">
                {t('La contestation n’est pas partie. Réessayez.')}
              </div>
            )}
            <button type="button" className="p-ncx7qc" disabled={!texte.trim() || etat === 'en_cours'} onClick={envoyer}>
              {t('Envoyer la contestation')}
            </button>
          </>
        )}
      </div>
    </Feuille>
  )
}
