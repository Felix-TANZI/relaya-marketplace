// Aide et SOS (LIV-P30) : les « Fiches de travail », une par geste (l'ancienne page ajoutée « Apprendre », fusionnée dans
// l'Aide : DP-66, une page par besoin ; l'ancienne adresse /apprendre y mène, /apprendre?fiche=x → ?geste=x). Lisibles
// hors connexion (elles sont dans l'application) : consignes numérotées, « Pourquoi c'est ainsi », l'écran où cela se
// fait, la fiche suivante. Les nombres viennent des règles du serveur, jamais du code. La formation obligatoire reste
// dans Certification : ces fiches la rappellent, elles ne la remplacent pas.
import { Ecran } from '../../composants/coque'
import { plier } from '../../composants/enrichis'
import { Icone } from '../../composants/Icone'
import { Carte, Foot, Hint, Li, Note, Sec, type Ton } from '../../composants/proto'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { FICHES, fiche as ficheDe, type FicheApprendre } from './fiches-gestes'
import '../AJ-L/ajl.css'

/** Valeurs des règles du serveur citées par les fiches ; tant qu'elles ne sont pas lues, « … ». */
export function useValeursGestes(): Record<string, string | number> {
  const regles = useLecture(() => source.tournee.regles(), [])
  const securite = useLecture(() => source.session.securite(), [])
  const r = regles.donnees
  const rs = securite.donnees?.regles
  return {
    controleMin: r?.controleS[0] ?? '…',
    controleMax: r?.controleS[1] ?? '…',
    auditMaxMin: r?.auditMaxMin ?? '…',
    codeEssais: r?.codeEssais ?? '…',
    codeBlocageH: r?.codeBlocageH ?? '…',
    absentAttenteMin: r?.absentAttenteMin ?? '…',
    absentAppels: r?.absentAppels ?? '…',
    pinLongueur: rs?.pinLongueur ?? '…',
    pinEssais: rs?.pinEssais ?? '…',
    pinBlocageMin: rs?.pinBlocageMin ?? '…',
  }
}

/** Fiches de travail qui contiennent le texte cherché (titre, résumé, consignes). */
export function gestesTrouves(q: string, t: (x: string) => string, tf: (x: string, v: Record<string, string | number>) => string, valeurs: Record<string, string | number>): FicheApprendre[] {
  const n = plier(q.trim())
  if (!n) return []
  return FICHES.filter((x) => plier([t(x.titre), tf(x.resume, valeurs), ...x.etapes.map((e) => tf(e, valeurs))].join(' ')).includes(n))
}

/** Une fiche de travail (?geste=id). */
export function FicheGeste({ id }: { id: string }) {
  const { t, tf } = usePreferences()
  const valeurs = useValeursGestes()
  const f = ficheDe(id)!
  const i = FICHES.indexOf(f)
  const suivante = FICHES[(i + 1) % FICHES.length]
  return (
    <Ecran route="aide" titre={t(f.titre)} retour={chemin('aide', { sujet: 'gestes' })} proto action="sos">
      <div className="pg ajl-fiche-t">
        <span className={'livc-ic ' + f.ton} style={{ width: 52, height: 52 }} aria-hidden="true">
          <Icone nom={f.icone} taille={26} />
        </span>
        <div>
          <h1 className="pg-t">{t(f.titre)}</h1>
          <p className="pg-s">{tf(f.resume, valeurs)}</p>
        </div>
      </div>
      <Sec titre={t('Ce que vous faites')} />
      <Carte>
        <ol className="ajl-etapes">
          {f.etapes.map((e) => (
            <li key={e}>{tf(e, valeurs)}</li>
          ))}
        </ol>
      </Carte>
      <Note ton="acc" icone="lightbulb">
        <b>{t('Pourquoi c’est ainsi')}</b> · {t(f.pourquoi)}
      </Note>
      <div className="card tight" style={{ marginTop: 14 }}>
        {f.ecran && <Li icone="arrow-right" ton="acc" t={t(f.ecran.titre)} s={t('L’écran où cela se fait')} vers={chemin(f.ecran.route)} />}
        <Li icone={suivante.icone} ton={suivante.ton as Ton} t={t(suivante.titre)} s={t('Fiche suivante')} vers={chemin('aide', { geste: suivante.id })} remplacer />
      </div>
      <Foot icone="book-open">{t('Fiches lisibles sans réseau, mises à jour avec l’application.')}</Foot>
    </Ecran>
  )
}

/** Les fiches de travail (?sujet=gestes). */
export function ListeGestes({ fond, pied }: { fond: React.ReactNode; pied: React.ReactNode }) {
  const { t, tf } = usePreferences()
  const valeurs = useValeursGestes()
  return (
    <Ecran route="aide" proto action="sos" titre={t('Fiches de travail')} retour={chemin('aide')} fixes={fond}>
      <Sec titre={tf('{n} fiches', { n: FICHES.length })} />
      <div className="card tight">
        {FICHES.map((x) => (
          <Li key={x.id} icone={x.icone} ton={x.ton as Ton} t={t(x.titre)} s={tf(x.resume, valeurs)} vers={chemin('aide', { geste: x.id })} />
        ))}
      </div>
      <Hint icone="graduation-cap">{t('Ces fiches reprennent les modules de la certification ; elles ne la remplacent pas.')}</Hint>
      <div className="card tight" style={{ marginTop: 12 }}>
        <Li icone="badge-check" ton="violet" t={t('Ma certification')} s={t('Modules et quiz')} vers={chemin('certification')} />
      </div>
      {pied}
    </Ecran>
  )
}
