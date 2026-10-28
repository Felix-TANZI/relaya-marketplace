// « Mes gains » (LIV-P25), vue « Relevés » (?vue=releves) : l'ancienne page ajoutée « Mes relevés » (gains), fusionnée
// dans la page de l'activité (DP-66 : une page par besoin ; l'ancienne adresse /gains y mène, semaine comprise) :
// relevé de chaque semaine, du samedi au vendredi (jour de règlement des entreprises), la semaine en cours (provisoire)
// puis les sept précédentes (`?semaine=<vendredi>`).
// Règles (LIV-09-R16 à R21, I-04, DED-12) : BelivaY ne paie jamais un livreur partenaire ; l'écran dit qui le paie ; un
// montant n'apparaît que si l'entreprise affiche son tarif par mission (sinon le compteur) ; seules les missions validées
// par le serveur comptent, une mission contestée est « en revue », hors compteurs. Le relevé sert à vérifier avec
// l'entreprise : en PDF (une page, partagée ou enregistrée) ou en CSV (tableur), par la barre d'action du bas.
import { useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { debutDuJour } from '../../calculs/temps'
import { Compteur, Masquable, exporterCsv, exporterPdf } from '../../composants/enrichis'
import { BarreAction, Btn, Carte, Hint, Kv, Li, Note, Pill, Sec, Vide } from '../../composants/proto'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { ReleveSemaine, TypeMission } from '../../donnees/domaines/activite'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Chargement, ErreurLecture } from '../LIV-08/commun'
import '../AJ-L/ajl.css'

const TYPES: Record<TypeMission, string> = { ramassage: 'Ramassages', depot: 'Dépôts au relais', domicile: 'Remises à domicile', retour: 'Retours, transferts' }
const midi = (j: string) => debutDuJour(j) + 12 * 3600_000

export function Releves() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const [params, setParams] = useSearchParams()
  const l = useLecture(() => source.activite.releves(), [])
  if (l.erreur) return <ErreurLecture relire={l.relire} />
  if (!l.donnees) return <Chargement lignes={4} />
  const d = l.donnees
  const choisie = d.semaines.find((x) => x.a === params.get('semaine')) ?? d.semaines[0]
  const tarif = d.affichage === 'tarif'
  const periode = (x: ReleveSemaine) => tf('du {de} au {a}', { de: jourLong(midi(x.de), langue), a: jourLong(midi(x.a), langue) })
  const nomFichier = `releve-${choisie.de}-${choisie.a}`
  const pdf = async () => {
    const lignes = [
      { texte: t('BelivaY livreur · Relevé de la semaine'), taille: 16, gras: true },
      { texte: s.livreur ? `${s.livreur.prenom} ${s.livreur.nom} · ${s.livreur.id}` : '', espace: 6 },
      { texte: periode(choisie) + (choisie.enCours ? ' · ' + t('provisoire') : '') },
      { texte: tf('Payé par {entreprise}, selon votre accord avec elle. BelivaY ne paie pas les livreurs.', { entreprise: d.payePar }), taille: 10 },
      { texte: t('Missions validées'), gras: true, espace: 14, droite: tarif ? t('Gains (F CFA)') : t('Missions') },
      ...choisie.missions.map((m) => ({ texte: tf('{type} · {n} missions, {c} colis', { type: t(TYPES[m.type]), n: m.nombre, c: m.colis }), droite: tarif ? F(m.gain ?? 0) : String(m.nombre) })),
      { texte: t('Total'), gras: true, espace: 6, droite: tarif ? F(choisie.gains ?? 0) : String(choisie.totalMissions) },
      { texte: tf('Colis ramassés : {n} · distance : {km} km', { n: choisie.colis, km: choisie.distanceKm }), espace: 10 },
      ...(choisie.enRevue ? [{ texte: tf('{n} missions en revue, hors compteurs jusqu’à la décision.', { n: choisie.enRevue }) }] : []),
      { texte: tf('Calculé par le serveur le {j} à {h}.', { j: jourLong(d.calculeA, langue), h: heure(d.calculeA, langue) }), taille: 9, espace: 18 },
    ]
    const r = await exporterPdf(nomFichier + '.pdf', t('Relevé de la semaine'), lignes)
    signal('succes')
    return r
  }
  const csv = () => {
    exporterCsv(nomFichier + '.csv', [
      [t('Semaine'), t('Type'), t('Missions'), t('Colis'), t('Tarif (F CFA)'), t('Gains (F CFA)')],
      ...choisie.missions.map((m) => [`${choisie.de} → ${choisie.a}`, t(TYPES[m.type]), m.nombre, m.colis, m.tarif ?? '', m.gain ?? '']),
    ])
    signal('succes')
  }
  const vide = choisie.totalMissions === 0
  return (
    <>
      <Sec titre={choisie.enCours ? t('Semaine en cours') : t('Semaine')} droite={choisie.enCours ? t('provisoire') : undefined} />
      <Carte>
        <div className="t13 c3">{periode(choisie)}</div>
        {vide ? (
          <Vide icone="chart-column" t={t('Aucune mission validée cette semaine')} s={choisie.enCours ? t('Les missions comptent dès que le serveur a reçu toutes leurs preuves.') : t('Pas de mission sur cette période.')} />
        ) : (
          <>
            <div className="ajl-total">
              <span className="ajl-total-v">{tarif && choisie.gains !== null ? <Masquable texte={F(choisie.gains) + ' F'} quoi="Gains de la semaine" /> : <Compteur valeur={choisie.totalMissions} />}</span>
              <span className="t13 c3">{tarif ? t('selon le tarif par mission de votre entreprise') : choisie.totalMissions === 1 ? t('mission validée') : t('missions validées')}</span>
            </div>
            {choisie.missions.map((m) => (
              <Kv key={m.type} k={t(TYPES[m.type])} v={tarif && m.gain !== null ? tf('{n} · {g} F', { n: m.nombre, g: F(m.gain) }) : tf(m.nombre > 1 ? '{n} missions · {c} colis' : '{n} mission · {c} colis', { n: m.nombre, c: m.colis })} />
            ))}
            <Kv k={t('Distance')} v={tf('{km} km', { km: choisie.distanceKm })} />
          </>
        )}
        {choisie.enRevue > 0 && (
          <Note ton="amber" icone="hourglass">
            {choisie.enRevue === 1 ? t('1 mission en revue, hors compteurs jusqu’à la décision.') : tf('{n} missions en revue, hors compteurs jusqu’à la décision.', { n: choisie.enRevue })}
          </Note>
        )}
      </Carte>
      <Note ton="ink" icone="building-2">
        {tarif
          ? tf('Vous êtes payé par {entreprise}, selon votre accord avec elle. BelivaY ne vous paie jamais et ne voit pas vos versements.', { entreprise: d.payePar })
          : tf('{entreprise} affiche un compteur de missions, pas de montant. Vos gains se règlent avec elle ; BelivaY ne vous paie jamais.', { entreprise: d.payePar })}
      </Note>
      <Sec titre={t('Semaines précédentes')} />
      <div className="card tight">
        {d.semaines.map((x) => (
          <Li
            key={x.a}
            icone={x.a === choisie.a ? 'check' : 'calendar-days'}
            ton={x.a === choisie.a ? 'acc' : 'ink'}
            t={periode(x)}
            s={x.enCours ? t('En cours · provisoire') : tarif && x.gains !== null ? tf('{n} missions · {g} F', { n: x.totalMissions, g: F(x.gains) }) : x.totalMissions === 1 ? t('1 mission validée') : tf('{n} missions validées', { n: x.totalMissions })}
            droite={x.a === choisie.a ? <Pill ton="acc" sm>{t('Affichée')}</Pill> : undefined}
            onClick={x.a === choisie.a ? undefined : () => setParams({ vue: 'releves', semaine: x.a }, { replace: true })}
          />
        ))}
      </div>
      <Hint icone="info">{t('Mêmes chiffres que l’historique et la clôture : une mission compte une fois validée par le serveur.')}</Hint>
      <div className="card tight" style={{ marginTop: 12 }}>
        <Li icone="message-circle" ton="acc" t={tf('Une question sur un versement ? Écrire à {entreprise}', { entreprise: d.payePar })} vers={chemin('messages', { fil: 'F1' })} />
      </div>
      <BarreAction aide={t('Le relevé de la semaine affichée, pour vérifier avec votre entreprise.')}>
        <Btn kind="primary" icone="file-down" onClick={() => void pdf()} off={vide}>
          {t('Relevé en PDF')}
        </Btn>
        <Btn kind="secondary" icone="sheet" onClick={csv} off={vide}>
          {t('Tableau CSV')}
        </Btn>
      </BarreAction>
    </>
  )
}
