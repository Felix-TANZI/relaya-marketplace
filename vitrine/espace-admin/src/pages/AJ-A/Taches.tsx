// Page ajoutée (S6) · Tâches planifiées : le registre unique des tâches du serveur (kit : apps/console/taches.py
// TACHES) — dernière exécution, dernier succès, prochaine, en retard, échecs sur 7 jours — et « Lancer » : une seule
// exécution par période (un vendredi déjà versé ne se rejoue pas ; une tâche en échec se relance), motif écrit,
// journalisé. Liée depuis Santé du système. Direction ; Audit en lecture.
import { useState } from 'react'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Kpi, Px, St, Table, useSurtitre } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { TacheDetail } from '../../donnees/domaines/systeme'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { useFonctions } from '../AJ-A/fonctions-page'
import { usePreferences } from '../../preferences'
import { useDroit } from '../../session'
import { EtatLecture, useDate, useRaison } from '../ADM-12/commun-s6'

const PERIODE: Record<TacheDetail['periodicite'], string> = { minute: 'Chaque minute', heure: 'Chaque heure', jour: 'Chaque nuit', vendredi: 'Chaque vendredi', mois: 'Chaque mois' }

export default function Taches() {
  const { t, tf } = usePreferences()
  const surtitre = useSurtitre()
  const date = useDate()
  const raison = useRaison()
  const gestes = useDroit('taches').acces === 'oui'
  const l = useLecture(() => source.systeme.tableauTaches(), [])
  const [lancer, setLancer] = useState<TacheDetail | null>(null)
  const tt = l.donnees ?? []
  const fonctions = useFonctions([
    { verbe: 'Relancer', n: tt.filter((x) => x.derniere && !x.derniere.ok).length, unite: ['échec', 'échecs'], icone: 'rotate-cw', alerte: true, onClick: () => { const x = tt.find((y) => y.derniere && !y.derniere.ok); if (x) setLancer(x) }, droit: 'taches', geste: true },
    { verbe: 'Surveiller', n: tt.filter((x) => x.enRetard).length, unite: ['tâche en retard', 'tâches en retard'], icone: 'clock', route: 'sante' },
    { verbe: 'Installer', n: tt.filter((x) => !x.installee).length, unite: ['tâche', 'tâches'], icone: 'plug', route: 'sante' },
  ])
  return (
    <Ecran
      route="taches"
      kicker={surtitre}
      fonctions={fonctions}
      actions={
        <Link className="btn secondary" to={chemin('sante')}>
          <Icone nom="activity" taille={18} />
          <span>{t('Santé du système')}</span>
        </Link>
      }
    >
      <Px>
        <EtatLecture l={l} quoi="les tâches planifiées">
          {(d) => (
            <>
              <div className="g g4">
                <Kpi k={t('Tâches')} v={d.length} s={t('registre unique du serveur')} icone="clock" />
                <Kpi k={t('En échec')} v={d.filter((x) => x.derniere && !x.derniere.ok).length} s={t('dernière exécution')} icone="circle-x" iton="red" />
                <Kpi k={t('En retard')} v={d.filter((x) => x.enRetard).length} s={t('aucun succès dans le délai attendu')} icone="hourglass" iton="amber" />
                <Kpi k={t('Échecs sur 7 jours')} v={d.reduce((a, x) => a + x.echecs7j, 0)} icone="triangle-alert" ton="night" />
              </div>
              <div style={{ marginTop: 16 }}>
                <Table
                  cle={(x) => x.nom}
                  rows={d}
                  ligneCls={(x) => (x.derniere && !x.derniere.ok ? 'bad' : x.enRetard ? 'warn' : undefined)}
                  cols={[
                    { k: 'n', t: t('Tâche'), main: true, rendu: (x) => (<><b className="mono">{x.nom}</b><div className="t2">{t(x.quoi)}</div></>) },
                    { k: 'p', t: t('Périodicité'), rendu: (x) => t(PERIODE[x.periodicite]) },
                    { k: 'd', t: t('Dernière exécution'), rendu: (x) => (x.derniere ? (<>{date(x.derniere.debut)}<div className="t2">{x.derniere.ok ? (x.derniere.resultat ?? '') : (x.derniere.erreur ?? '')}{x.derniere.essais > 1 ? ' · ' + tf('{n} essais', { n: x.derniere.essais }) : ''}{x.derniere.par !== 'planificateur' ? ' · ' + tf('lancée par {p}', { p: x.derniere.par }) : ''}</div></>) : '—') },
                    { k: 's', t: t('Dernier succès'), hideM: true, rendu: (x) => (x.dernierSucces ? date(x.dernierSucces) : '—') },
                    { k: 'x', t: t('Prochaine'), hideM: true, rendu: (x) => date(x.prochaine) },
                    { k: 'e', t: t('État'), rendu: (x) => <St t={t(x.derniere && !x.derniere.ok ? 'En échec' : x.enRetard ? 'En retard' : 'À jour')} ton={x.derniere && !x.derniere.ok ? 'red' : x.enRetard ? 'amber' : 'green'} /> },
                    { k: 'go', t: '', cls: 'r', rendu: (x) => (gestes ? <button type="button" className={'btn sm ' + (x.derniere && !x.derniere.ok ? 'primary' : 'secondary')} onClick={() => setLancer(x)} aria-label={tf('Lancer {n}', { n: x.nom })}>{t('Lancer')}</button> : null) },
                  ]}
                  pied={<span>{t('Heure du serveur · Afrique/Douala (UTC+1)')}</span>}
                />
              </div>
              <DecisionMotivee
                ouverte={!!lancer}
                fermer={() => setLancer(null)}
                titre={lancer ? tf('Lancer {n}', { n: lancer.nom }) : ''}
                resume={lancer ? t(lancer.quoi) : ''}
                libelle="Lancer"
                icone="play"
                envoyer={async (m) => {
                  const r = await source.systeme.lancerTache(lancer!.nom, m)
                  return r.ok ? null : raison(r.raison, { deja_faite: 'Déjà exécutée avec succès pour cette période : elle ne se rejoue pas.', non_installee: 'Tâche non installée sur ce serveur.', inconnu: 'Tâche inconnue.' })
                }}
              />
            </>
          )}
        </EtatLecture>
      </Px>
    </Ecran>
  )
}
