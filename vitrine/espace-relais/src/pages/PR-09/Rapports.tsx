// PR-09 · Rapports (gérant seul : droit « argent », RAP-02 ; A-VALIDER ARL-118). Structure du prototype gardée : période
// (Ce mois · Trimestre · Depuis l'ouverture), bande nuit avec le gagné de la période et ses colonnes (semaine de
// versement ou mois ; colonne en cours atténuée, « versement prévu »), quatre chiffres (reçus, remis + retours déposés,
// retirés à temps, non retirés en 7 jours : RAP-01), délai de retrait en quatre segments sur la grille de garde v6
// (RAP-04, segmentsDelai), téléchargements (relevé mensuel PDF, relevé d'activité CSV : RAP-03).
// Règles : PR-09-R02 : changer de période change le graphique, le total et les chiffres ; total = somme des colonnes ;
// la colonne en cours = « Gagné cette semaine » du relevé de Versements (A-VALIDER ARL-110 : le gagné, pas le net
// versé, puisque les espèces de garde sont déjà dans la caisse du relais).
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import type { PeriodeRapport, Rapport } from '../../donnees/domaines/argent'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { jourCourt, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { Chargement, EcranGerant, ErreurLecture, francs } from './commun'
import { PR, segmentsDelai } from './parametres'

const PERIODES: [PeriodeRapport, string][] = [
  ['mois', 'Ce mois'],
  ['trimestre', 'Trimestre'],
  ['ouverture', 'Depuis l’ouverture'],
]
const MOIS = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  fr_court: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  en_court: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
}
const midi = (j: string) => new Date(j + 'T12:00:00Z').getTime()
const moisDe = (j: string, langue: 'fr' | 'en', court = false) => MOIS[`${langue}${court ? '_court' : ''}` as keyof typeof MOIS][Number(j.slice(5, 7)) - 1]
/** « 13,7 k » / « 13.7k » : milliers à une décimale, comme le prototype. */
const kilo = (n: number, langue: 'fr' | 'en') => (n / 1000).toLocaleString(langue === 'en' ? 'en-GB' : 'fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + (langue === 'en' ? 'k' : ' k')
const pct = (n: number, total: number) => (total ? Math.round((n * 100) / total) : 0)

export default function Rapports() {
  const [p, setP] = useSearchParams()
  const periode = (PERIODES.find(([x]) => x === p.get('periode'))?.[0] ?? 'mois') as PeriodeRapport
  const lec = useLecture(() => source.argent.rapport(periode), [periode])
  const choisir = (x: PeriodeRapport) => {
    const n = new URLSearchParams(p)
    if (x === 'mois') n.delete('periode')
    else n.set('periode', x)
    setP(n, { replace: true })
  }
  return (
    <EcranGerant route="rapports">
      <Contenu periode={periode} choisir={choisir} lec={lec} />
    </EcranGerant>
  )
}

function Contenu({ periode, choisir, lec }: { periode: PeriodeRapport; choisir: (x: PeriodeRapport) => void; lec: { donnees: Rapport | null; erreur: Error | null; relire: () => void } }) {
  const { t } = usePreferences()
  const r = lec.donnees && lec.donnees.periode === periode ? lec.donnees : null
  return (
    <div className="p-0hxmj8 r-pile">
      <div className="p-lvzt0c" role="tablist" aria-label={t('Période')}>
        {PERIODES.map(([x, l]) => (
          <button key={x} type="button" role="tab" aria-selected={periode === x} className={(periode === x ? 'p-h01hlk' : 'p-bq7aiq') + ' r9-onglet'} onClick={() => choisir(x)}>
            {t(l)}
          </button>
        ))}
      </div>
      {lec.erreur ? <ErreurLecture relire={lec.relire} erreur={lec.erreur} /> : !r ? <Chargement lignes={3} /> : <Periode r={r} />}
    </div>
  )
}

function Periode({ r }: { r: Rapport }) {
  const { t, tf, langue } = usePreferences()
  const max = Math.max(...r.colonnes.map((c) => c.gagne), 1)
  const enCours = r.colonnes.find((c) => c.enCours)
  const partiel = r.colonnes.find((c) => c.partiel)
  const sorties = r.delais.reduce((n, x) => n + x, 0)
  const aTemps = r.delais[0] + r.delais[1] + r.delais[2]
  const seg = segmentsDelai()
  const g = PR.garde.grille
  const titre = r.periode === 'mois' ? tf('GAGNÉ EN {mois}', { mois: moisDe(r.au, langue) }) : r.periode === 'trimestre' ? t('GAGNÉ CE TRIMESTRE') : t('GAGNÉ DEPUIS L’OUVERTURE')
  const libelleColonne = (c: Rapport['colonnes'][number]) => (r.periode === 'mois' ? jourCourt(midi(c.au) + 86_400_000, langue).split(' ').pop()! + ' ' + moisDe(c.au, langue, true) : moisDe(c.du, langue, true))
  const segments: [string, string][] = [
    [t('Le 1er jour · offert'), 'p-a8upqt'],
    [tf('Du {a}e au {b}e jour · {f} par jour', { a: seg[1][0] + 1, b: seg[1][1], f: francs(g[1]) }), 'p-hsb2xc'],
    [tf('Du {a}e au {b}e jour · {de} à {a2}', { a: seg[2][0] + 1, b: seg[2][1], de: francs(g[seg[2][0]]), a2: francs(g[seg[2][1] - 1]) }), 'p-c1nro7'],
    [t('Renvoyés'), 'p-p30qo8'],
  ]
  const couleurs = ['p-enqpyq', 'p-z3tnde', 'p-imse89', 'p-lgzow2']
  return (
    <>
      <div className="p-vrv3pc">
        <div className="p-ch33fq">{titre.toLocaleUpperCase(langue)}</div>
        <div className="p-2je1sf">
          {F(r.gagne)} <span className="p-9tekrm">{t('FCFA')}</span>
        </div>
        <div className="p-zf2e7o" role="img" aria-label={r.colonnes.map((c) => `${libelleColonne(c)} : ${francs(c.gagne)}`).join(' · ')}>
          {r.colonnes.map((c) => (
            <div className={'p-4vlkma' + (c.enCours ? ' r9-en-cours' : '')} key={c.du}>
              <div className="p-j3kuze">{kilo(c.gagne, langue)}</div>
              <div className="p-px4991 r9-colonne" style={{ height: Math.max(4, Math.round((150 * c.gagne) / max)) }} />
              <div className="p-60x9ee">{libelleColonne(c)}</div>
            </div>
          ))}
        </div>
        <div className="p-x64uqm">
          {[
            enCours && r.periode === 'mois' ? tf('Dernière colonne : semaine en cours, versement prévu le {jour}.', { jour: jourLong(midi(enCours.au) + 86_400_000, langue) }) : null,
            enCours && r.periode !== 'mois' ? t('Dernière colonne : mois en cours.') : null,
            partiel ? tf('Ouvert le {jour} : la première colonne est partielle.', { jour: jourLong(midi(r.ouvertLe), langue) }) : null,
            r.periode === 'ouverture' ? tf('{n} semaines d’activité.', { n: r.semainesActivite }) : null,
          ]
            .filter(Boolean)
            .join(' ')}
        </div>
      </div>

      <div className="p-0cipe3">
        <div className="p-2knnop">
          <div className="p-yscrc8">{t('COLIS REÇUS')}</div>
          <div className="p-2ry3a6">{F(r.colisRecus)}</div>
          <div className="p-g7lwlw">{r.periode === 'mois' ? tf('en {mois}', { mois: moisDe(r.au, langue) }) : r.periode === 'trimestre' ? t('sur le trimestre') : t('depuis l’ouverture')}</div>
        </div>
        <div className="p-2knnop">
          <div className="p-yscrc8">{t('COLIS REMIS')}</div>
          <div className="p-2ry3a6">{F(r.colisRemis)}</div>
          <div className="p-g7lwlw">{tf('+ {n} retours déposés', { n: r.retoursDeposes })}</div>
        </div>
        <div className="p-2knnop">
          <div className="p-yscrc8">{t('À TEMPS')}</div>
          <div className="p-pp8y7j">{pct(aTemps, sorties)} %</div>
          <div className="p-g7lwlw">{t('retirés en 7 jours')}</div>
        </div>
        <div className="p-2knnop">
          <div className="p-yscrc8">{t('RENVOYÉS')}</div>
          <div className="p-28dswb">{pct(r.delais[3], sorties)} %</div>
          <div className="p-g7lwlw">{t('non retirés en 7 jours')}</div>
        </div>
      </div>

      <div className="p-yi6rkz">
        <div className="p-unncbq">
          <h2 className="p-9j1bbu">{t('Délai de retrait')}</h2>
        </div>
        {sorties === 0 ? (
          <div className="p-81u2s6">{t('Aucun colis retiré ni renvoyé sur cette période pour l’instant.')}</div>
        ) : (
          <>
            <div className="p-ywubik" role="img" aria-label={segments.map(([l], k) => `${l} : ${pct(r.delais[k], sorties)} %`).join(' · ')}>
              {segments.map(([, c], k) => (
                <div key={c} className={c} style={{ width: pct(r.delais[k], sorties) + '%' }} />
              ))}
            </div>
            {segments.map(([l], k) => (
              <div className="p-mqmvkk" key={k}>
                <span className="p-ytl255">{l}</span>
                <span className={couleurs[k]}>{pct(r.delais[k], sorties)} %</span>
              </div>
            ))}
          </>
        )}
        <div className="p-81u2s6">{tf('Plus un colis part tôt, plus votre place tourne. Chaque jour de garde vous rapporte {f}, le 1er jour compris (payé par BelivaY).', { f: francs(PR.garde.gainRelaisJour) })}</div>
      </div>

      <Telecharger periode={r.periode} />
    </>
  )
}

function Telecharger({ periode }: { periode: PeriodeRapport }) {
  const { t } = usePreferences()
  const [etat, setEtat] = useState<'non' | 'pdf' | 'csv' | 'erreur'>('non')
  const telecharger = async (format: 'pdf' | 'csv') => {
    setEtat(format)
    try {
      const f = await source.argent.releve(periode, format)
      const octets = Uint8Array.from(f.contenu, (c) => c.charCodeAt(0) & 0xff)
      const url = URL.createObjectURL(new Blob([format === 'csv' ? new TextEncoder().encode('﻿' + f.contenu) : octets], { type: f.type }))
      const a = document.createElement('a')
      a.href = url
      a.download = f.nom
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      signal('succes')
      setEtat('non')
    } catch {
      signal('erreur')
      setEtat('erreur')
    }
  }
  const ligne = (format: 'pdf' | 'csv', icone: string, titre: string, sous: string) => (
    <button type="button" className="p-o24hsm r9-bouton-ligne" onClick={() => void telecharger(format)} disabled={etat === format}>
      <div className="p-toppw8">
        <Icone nom={icone} taille={20} className="p-672m16" />
      </div>
      <div className="p-rnqj8n">
        <div className="p-ife3a2">{t(titre)}</div>
        <div className="p-dfa05r">{etat === format ? t('Préparation du fichier…') : t(sous)}</div>
      </div>
      <Icone nom="r-telecharger" taille={20} className="p-672m16" />
    </button>
  )
  return (
    <div className="p-yi6rkz">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu">{t('Télécharger')}</h2>
      </div>
      {ligne('pdf', 'r-document', 'Relevé mensuel · PDF', 'Versements, colis et garde, pour votre comptabilité')}
      <div className="p-92xvtp" />
      {ligne('csv', 'r-graphique', 'Relevé d’activité · CSV', 'Chaque réception, remise et retour')}
      {etat === 'erreur' && (
        <div className="p-81u2s6" role="alert">
          {t('Le fichier n’a pas pu être préparé. Réessayez.')}
        </div>
      )}
    </div>
  )
}
