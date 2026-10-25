// Journal de la commande (VD-05) : repris du prototype (balisage de route('journal') : titre, « Qui a fait quoi, et
// quand… », fil du plus récent au plus ancien — action, auteur et rôle, heure à droite, avant → après en pastilles —,
// note « Personne ne peut modifier ni effacer ce journal »), branché sur la source (commandes.journal, en ajout seul).
// - Règles : JRN-01 (chaque action signée : nom et rôle, système BelivaY), JRN-02 (ni modification, ni effacement),
//   VD05-R15, ACC-27 (les actions de l'accès Préparation y figurent avec son nom), REFVD-R343 (date, heure, auteur,
//   action, avant, après), anonymat (le client n'est jamais nommé : « le client »).
// - Ajouts : séparateurs par jour, filtre par auteur (Tous · Propriétaire · Préparation · Système), copie du journal
//   comme preuve (texte daté et signé), lien vers la commande ; lecture seule, rien ne s'y modifie.
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import type { EntreeJournal } from '../../donnees/domaines/commandes'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useRole } from '../../session'
import { jourDe } from '../../calculs/temps'
import { Bouton, EtatLecture, ROLES, useLien, valeurJournal } from './commun'

type Qui = 'tous' | EntreeJournal['role']

export default function Journal() {
  const { tf } = usePreferences()
  const role = useRole()
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? 'BLV-00008'
  const lecture = useLecture(() => Promise.all([source.commandes.detail(ref), source.commandes.journal(ref)]).then(([c, j]) => ({ c, j })), [ref, role])
  const d = lecture.donnees
  if (!d?.c) return <EtatLecture route="journal" erreur={lecture.erreur} vide={d !== null} relire={lecture.relire} titre={tf('Journal · {ref}', { ref })} />
  return <Fil refc={ref} entrees={d.j} />
}

function Fil({ refc, entrees }: { refc: string; entrees: EntreeJournal[] }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge(30000)
  const lien = useLien()
  const [qui, setQui] = useState<Qui>('tous')
  const [copie, setCopie] = useState(false)
  const texte = (x: string, a?: number) => (a !== undefined ? t(x).replace('{h}', heure(a, langue)) : t(x))
  const signature = (e: EntreeJournal) => (e.role === 'systeme' ? (e.detail ? texte(e.detail, e.detailA) : t('Système BelivaY')) : `${e.auteur} · ${t(ROLES[e.role])}`)
  const action = (e: EntreeJournal) => (e.action.includes('{p}') ? t(e.action).replace('{p}', e.detail ?? '') : e.role !== 'systeme' && e.detail ? `${t(e.action)} · ${texte(e.detail, e.detailA)}` : t(e.action))
  const visibles = entrees.filter((e) => qui === 'tous' || e.role === qui)
  const presents = new Set(entrees.map((e) => e.role))
  const copier = async () => {
    const lignes = [tf('Journal de la commande {ref}', { ref: refc }), ...entrees.map((e) => `${jourLong(e.a, langue)} ${heure(e.a, langue)} · ${action(e)} · ${signature(e)}${e.avant !== undefined && e.apres !== undefined ? ` · ${valeurJournal(e.avant, maintenant, langue)} → ${valeurJournal(e.apres, maintenant, langue)}` : ''}`)]
    try {
      await navigator.clipboard.writeText(lignes.join('\n'))
      setCopie(true)
      jouer('copie')
    } catch {
      jouer('erreur')
    }
  }
  return (
    <Ecran route="journal" titre={tf('Journal · {ref}', { ref: refc })} retour={lien('commande', { ref: refc })}>
      <div className="pg">
        <h1 className="pg-t">{t('Journal de la commande')}</h1>
      </div>
      {presents.size > 1 && (
        <div className="chips" role="group" aria-label={t('Filtrer par auteur')}>
          {(['tous', 'proprietaire', 'preparation', 'systeme'] as Qui[])
            .filter((x) => x === 'tous' || presents.has(x as EntreeJournal['role']))
            .map((x) => (
              <button key={x} type="button" className={'chip' + (qui === x ? ' on' : '')} aria-pressed={qui === x} onClick={() => (setQui(x), jouer('interrupteur'))}>
                {t({ tous: 'Tous', proprietaire: 'Propriétaire', preparation: 'Accès Préparation', systeme: 'Système BelivaY' }[x])}
                <span className="n">{x === 'tous' ? entrees.length : entrees.filter((e) => e.role === x).length}</span>
              </button>
            ))}
        </div>
      )}
      <div className="card">
        {visibles.length === 0 ? (
          <div className="empty">
            <div className="ei">
              <Icone nom="list" taille={26} />
            </div>
            <h3>{t('Aucune action pour l’instant')}</h3>
            <p>{t('Chaque geste sur cette commande s’écrira ici, avec son auteur et son heure.')}</p>
          </div>
        ) : (
          <div className="tl" style={{ marginTop: '4px' }}>
            {visibles.map((e, i) => {
              const j = jourDe(e.a)
              const separateur = j !== jourDe(maintenant) && (i === 0 || jourDe(visibles[i - 1].a) !== j)
              return (
                <div key={`${e.a}-${i}`} className="ti done blv-cascade">
                  {separateur && (
                    <div className="t12 b8 c3" style={{ textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>
                      {jourLong(e.a, langue)}
                    </div>
                  )}
                  <div className="row" style={{ alignItems: 'flex-start' }}>
                    <div className="grow">
                      <div className="tt">{action(e)}</div>
                      <div className="td">{signature(e)}</div>
                      {e.avant !== undefined && e.apres !== undefined && (
                        <div className="row mt6" style={{ gap: '6px', flexWrap: 'wrap' }}>
                          <span className="pill ink sm">{valeurJournal(e.avant, maintenant, langue)}</span>
                          <Icone nom="arrow-right" taille={14} style={{ color: 'var(--ink-3)' }} />
                          <span className="pill or sm">{valeurJournal(e.apres, maintenant, langue)}</span>
                        </div>
                      )}
                    </div>
                    <span className="t12 b8 c3 nw">{t(heure(e.a, langue))}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div className="note ink">
        <Icone nom="lock" taille={18} />
        <div>{t('Personne ne peut modifier ni effacer ce journal. Il sert de preuve en cas de litige.')}</div>
      </div>
      <div className="mt12">
        <Bouton classe="secondary" icone="copy" onClick={() => void copier()}>
          {copie ? t('Journal copié') : t('Copier le journal comme preuve')}
        </Bouton>
      </div>
      <div className="mt8">
        <Bouton classe="ghost" vers={lien('commande', { ref: refc })}>
          {tf('Revenir à la commande {ref}', { ref: refc })}
        </Bouton>
      </div>
    </Ecran>
  )
}
