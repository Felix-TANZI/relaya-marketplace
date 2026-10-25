// PR-09 · Avis des clients (gérant seul). Structure du prototype gardée : carte de tête (note moyenne, étoiles, nombre
// d'avis sur 30 jours, répartition de 5 à 1 étoile), « Ce qui revient le plus » (étiquettes comptées : vert, ambre,
// rouge), derniers avis en bulles ANONYMES (AVI-02, GEN-01 : ni nom ni numéro), rappel en pied de page (AVI-04 à AVI-06,
// AVIS-FENETRE). Gestes (DP-39, AVI-04, AVI-05 ; A-VALIDER ARL-117) :
// - « Répondre en privé » : une réponse par avis, partie dans la messagerie du client (« Relais … · réponse à ton
//   avis »), jamais publiée, coordonnées masquées ; en file hors connexion ;
// - « Signaler » : insulte, donnée personnelle ou hors-sujet ; BelivaY examine et ne retire l'avis que pour l'un de ces
//   motifs, avec un motif tracé ; une fois par avis.
// Chaque avis s'ouvre dans une feuille (?sheet=avis&avis=…) ; les plus anciens se chargent par « Voir plus ».
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { geste, useEnLigne } from '../../donnees/fileHorsLigne'
import type { Resultat } from '../../donnees/communs'
import type { Avis as UnAvis, MotifSignalement } from '../../donnees/domaines/qualite'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { jourCourt, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { Chargement, EcranGerant, ErreurLecture, useOrigine } from './commun'
import { PR } from './parametres'

const ETOILE = 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z'
const PAR_PAGE = 6
/** Ton d'une étiquette : ce qui plaît (vert), l'attente (ambre), ce qui fâche (rouge). */
const TONS: Record<string, string> = { rapide: 'p-nax3x4', accueillant: 'p-nax3x4', 'bien rangé': 'p-nax3x4', propre: 'p-nax3x4', attente: 'p-h4wlx0', horaires: 'p-ekng8o', fermé: 'p-ekng8o' }
const MOTIFS: [MotifSignalement, string][] = [
  ['insulte', 'Insulte'],
  ['donnee_personnelle', 'Donnée personnelle'],
  ['hors_sujet', 'Hors-sujet'],
]
const majuscule = (x: string) => x.charAt(0).toLocaleUpperCase() + x.slice(1)

export default function Avis() {
  const lec = useLecture(() => source.qualite.avis(), [])
  const [p] = useSearchParams()
  const f = useFeuille('avis')
  const a = lec.donnees?.find((x) => x.id === p.get('avis')) ?? null
  return (
    <EcranGerant route="avis" fixes={<FeuilleAvis ouverte={f.ouverte && !!a} fermer={f.fermer} a={a} />}>
      {lec.erreur ? <ErreurLecture relire={lec.relire} erreur={lec.erreur} /> : !lec.donnees ? <Chargement lignes={3} /> : <Contenu l={lec.donnees} />}
    </EcranGerant>
  )
}

function Etoiles({ n, classe = 'p-04k794', vide = 'p-62hci9' }: { n: number; classe?: string; vide?: string }) {
  return (
    <>
      {[1, 2, 3, 4, 5].map((k) => (
        <svg key={k} width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className={k <= n ? classe : vide}>
          <path d={ETOILE} />
        </svg>
      ))}
    </>
  )
}

function Contenu({ l }: { l: UnAvis[] }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge()
  const naviguer = useNavigate()
  const [p] = useSearchParams()
  const [nombre, setNombre] = useState(PAR_PAGE)
  const recents = l.filter((a) => a.le > maintenant - 30 * 86_400_000)
  const moyenne = recents.length ? recents.reduce((n, a) => n + a.etoiles, 0) / recents.length : 0
  const ecrite = moyenne.toLocaleString(langue === 'en' ? 'en-GB' : 'fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const etiquettes = Object.entries(recents.flatMap((a) => a.etiquettes).reduce<Record<string, number>>((m, e) => ((m[e] = (m[e] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1])
  const ouvrir = (id: string) => {
    const n = new URLSearchParams(p)
    n.set('sheet', 'avis')
    n.set('avis', id)
    naviguer({ search: n.toString() }, { state: { feuille: true } })
  }
  if (!l.length)
    return (
      <div className="p-0hxmj8">
        <div className="r-vide">
          <div className="r-vide-i">
            <Icone nom="r-etoile" taille={28} />
          </div>
          <h2>{t('Pas encore d’avis')}</h2>
          <p>{tf('Un client peut noter le relais pendant {n} jours après chaque retrait. Les premiers avis paraîtront ici, sans le nom du client.', { n: PR.avisFenetreJours })}</p>
        </div>
      </div>
    )
  return (
    <div className="p-0hxmj8 r-pile">
      <div className="p-g9jysb">
        <div className="p-8ri3e0">
          <div className="p-f42sy9">{ecrite}</div>
          <div>
            <div className="p-aqd7gy" role="img" aria-label={tf('{n} étoiles sur 5', { n: ecrite })}>
              <Etoiles n={Math.round(moyenne)} />
            </div>
            <div className="p-ldw158">{tf('{n} avis · 30 derniers jours', { n: recents.length })}</div>
          </div>
        </div>
        <div className="p-8tie5x">
          {[5, 4, 3, 2, 1].map((e) => {
            const n = recents.filter((a) => a.etoiles === e).length
            return (
              <div className="p-bcx9pi" key={e}>
                <span className="p-0wle4y">{e}</span>
                <div className="p-tqaj97 r9-barre" role="img" aria-label={tf('{e} étoiles : {n} avis', { e, n })}>
                  <div className="p-qzec4g" style={{ width: (recents.length ? Math.round((n * 100) / recents.length) : 0) + '%' }} />
                </div>
                <span className="p-l9l7m1">{n}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="p-yscrc8">{t('CE QUI REVIENT LE PLUS')}</div>
      <div className="p-8dmjde">
        {etiquettes.map(([e, n]) => (
          <span key={e} className={TONS[e] ?? 'p-6z26dm'}>
            {majuscule(t(e))} · {n}
          </span>
        ))}
      </div>
      <ul className="p-p6eb7m r9-bulles">
        {l.slice(0, nombre).map((a, k) => (
          <li key={a.id} className={k % 2 ? 'p-53zmp2' : 'p-fwuuqn'}>
            <button type="button" className="r9-bulle" onClick={() => ouvrir(a.id)} aria-label={tf('Avis {e} étoiles du {jour} : répondre ou signaler', { e: a.etoiles, jour: jourCourt(a.le, langue) })}>
              <div className="p-kek6w2">
                <span className="p-stzebw" aria-hidden="true">
                  {'★'.repeat(a.etoiles)}
                  <span className="p-6kosyr">{'★'.repeat(5 - a.etoiles)}</span>
                </span>
                <span className="p-46lk2m">{jourCourt(a.le, langue)}</span>
              </div>
              <div className="p-1w33xk">{a.texte ? `« ${a.texte} »` : a.etiquettes.map((e) => majuscule(t(e))).join(' · ')}</div>
              {(a.reponse || a.signalement) && (
                <div className="r9-suivi">
                  {a.reponse && <span className="p-nax3x4">{t('Répondu en privé')}</span>}
                  {a.signalement && <span className="p-h4wlx0">{a.signalement.etat === 'en_examen' ? t('Signalé · en examen') : a.signalement.etat === 'retire' ? t('Retiré par BelivaY') : t('Maintenu par BelivaY')}</span>}
                </div>
              )}
            </button>
          </li>
        ))}
      </ul>
      {nombre < l.length && (
        <button type="button" className="p-rbzobc" onClick={() => setNombre((n) => n + PAR_PAGE * 2)}>
          {tf('Voir plus d’avis ({n} de plus)', { n: Math.min(PAR_PAGE * 2, l.length - nombre) })}
        </button>
      )}
      <div className="p-p73eax">
        <Icone nom="r-cadenas" taille={18} className="p-rd23br" />
        <div>{tf('Les avis sont anonymes, ouverts {n} jours après le retrait. Un avis n’est retiré que pour une insulte, une donnée personnelle ou un hors-sujet, avec un motif tracé. Vous pouvez répondre en privé : la réponse arrive dans la messagerie du client, jamais publiée.', { n: PR.avisFenetreJours })}</div>
      </div>
    </div>
  )
}

function FeuilleAvis({ ouverte, fermer, a }: { ouverte: boolean; fermer: () => void; a: UnAvis | null }) {
  const { t, tf, langue } = usePreferences()
  const en = useEnLigne()
  const o = useOrigine()
  const [texte, setTexte] = useState('')
  const [motif, setMotif] = useState<MotifSignalement | null>(null)
  const [etat, setEtat] = useState<'non' | 'en_cours' | 'erreur' | 'en_file'>('non')
  if (!a) return null
  const faire = async (quoi: 'repondre' | 'signaler') => {
    setEtat('en_cours')
    const x = o()
    try {
      const r = await geste(en, 'message', a.id, x, (s): Promise<Resultat<object, string>> => (quoi === 'repondre' ? s.qualite.repondreAvis(a.id, texte, x) : s.qualite.signalerAvis(a.id, motif!, x)))
      signal(r.etat === 'en_file' || r.r.ok ? 'succes' : 'erreur')
      setEtat(r.etat === 'en_file' ? 'en_file' : r.r.ok ? 'non' : 'erreur')
      if (r.r.ok) quoi === 'repondre' ? setTexte('') : setMotif(null)
    } catch {
      signal('erreur')
      setEtat('erreur')
    }
  }
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Avis d’un client')}>
      <div className="r9-feuille">
        <h2 className="p-9j1bbu">{t('Avis d’un client')}</h2>
        <div className="r9-etoiles-feuille" role="img" aria-label={tf('{n} étoiles sur 5', { n: a.etoiles })}>
          <Etoiles n={a.etoiles} classe="r9-etoile-pleine" vide="r9-etoile-vide" />
          <span className="p-46lk2m">{jourLong(a.le, langue)}</span>
        </div>
        <div className="p-1w33xk">{a.texte ? `« ${a.texte} »` : a.etiquettes.map((e) => majuscule(t(e))).join(' · ')}</div>
        <div className="p-81u2s6">{t('Client anonyme : ni nom ni numéro, comme pour tous les avis.')}</div>
        {etat === 'en_file' && (
          <div className="p-gh7puf" role="status">
            <Icone nom="check" taille={18} className="p-672m16" />
            <div>{t('Gardé sur le téléphone : part au retour du réseau.')}</div>
          </div>
        )}
        <h3 className="r9-sous-titre">{t('Répondre en privé')}</h3>
        {a.reponse ? (
          <div className="p-gh7puf" role="status">
            <Icone nom="r-message" taille={18} className="p-672m16" />
            <div>
              <strong>{tf('Votre réponse du {jour}', { jour: jourCourt(a.reponse.le, langue) })}</strong> · {a.reponse.texte}
            </div>
          </div>
        ) : (
          <>
            <label className="p-ky12xr" htmlFor="r9-reponse">
              {t('VOTRE RÉPONSE')}
            </label>
            <textarea id="r9-reponse" className="p-afs6hh r9-texte" rows={3} value={texte} onChange={(e) => setTexte(e.target.value.slice(0, 500))} placeholder={t('Merci, ou une explication : le client la lit dans sa messagerie.')} />
            <button type="button" className="p-ncx7qc" disabled={!texte.trim() || etat === 'en_cours'} onClick={() => faire('repondre')}>
              {t('Envoyer la réponse privée')}
            </button>
          </>
        )}
        <h3 className="r9-sous-titre">{t('Signaler cet avis')}</h3>
        {a.signalement ? (
          <div className="p-81u2s6" role="status">
            {tf('Signalé le {jour} : BelivaY examine. L’avis n’est retiré que pour une insulte, une donnée personnelle ou un hors-sujet.', { jour: jourCourt(a.signalement.le, langue) })}
          </div>
        ) : (
          <>
            <div className="r9-choix" role="radiogroup" aria-label={t('Motif du signalement')}>
              {MOTIFS.map(([m, l]) => (
                <button key={m} type="button" role="radio" aria-checked={motif === m} className={motif === m ? 'p-jv7fel' : 'p-8xq01w'} onClick={() => setMotif(m)}>
                  {t(l)}
                </button>
              ))}
            </div>
            <button type="button" className="p-rbzobc" disabled={!motif || etat === 'en_cours'} onClick={() => faire('signaler')}>
              {t('Signaler à BelivaY')}
            </button>
          </>
        )}
        {etat === 'erreur' && (
          <div className="r9-erreur" role="alert">
            {t('Ce n’est pas parti. Réessayez.')}
          </div>
        )}
      </div>
    </Feuille>
  )
}
