// Menu (« ☰ » de l'en-tête ; ORGANISATION.md) : six tuiles du quotidien avec leur compteur d'abord (le travail, comme
// « Le guichet » du point relais), puis la recherche et la carte de l'entreprise, puis le reste en liste rangée par
// espace (Paquets, Missions, Livreurs, Argent, Qualité, Mon entreprise, Aide), compteurs à droite, et la mention de
// BelivaY en pied. La navigation est celle de la barre latérale, filtrée par rôle (ENT-RG-R25).
// La personne connectée (préférences, rôle, déconnexion) est le Profil, distinct du Menu (avatar).
// Les pages ajoutées (AJ-E : sécurité, activité, apprendre) vont dans leur espace. Le Menu n'est pas un onglet.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { badge } from '@client/i18n/format'
import { PARAMETRES } from '../../calculs/registre'
import { CarteEntreprise, Ecran, idGroupe, useNavigation } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Li } from '../../composants/prototype'
import { Tuiles } from '../../composants/tuiles'
import { chemin } from '../../config/pages'
import { usePreferences } from '../../preferences'
import { useRouteOuverte, useSession } from '../../session'

export default function Menu() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const groupes = useNavigation()
  const ouverte = useRouteOuverte()
  const naviguer = useNavigate()
  const [q, setQ] = useState('')
  // Pages sans entrée de barre latérale, rangées dans leur espace (ORGANISATION.md).
  const EN_PLUS: Record<string, { route: string; titre: string; icone: string }[]> = {
    'Mon entreprise': [
      { route: 'profil', titre: 'Mon entreprise', icone: 'building-2' },
      { route: 'securite', titre: 'Sécurité du compte', icone: 'lock' },
      { route: 'activite', titre: 'Activité de l’équipe', icone: 'history' },
    ],
    Aide: [
      { route: 'notifications', titre: 'Notifications', icone: 'bell' },
      { route: 'apprendre', titre: 'Apprendre', icone: 'graduation-cap' },
    ],
  }
  return (
    <Ecran route="menu">
      <Tuiles
        aria={t('Le travail du jour')}
        items={[
          { route: 'paquets', to: chemin('paquets'), titre: 'Paquets à accepter', sous: 'Compte à rebours de 15 min', icone: 'boxes', n: s.badges.paquets },
          { route: 'affectation', to: chemin('affectation'), titre: 'Affecter un livreur', sous: 'Paquets acceptés sans livreur', icone: 'user-plus' },
          { route: 'missions', to: chemin('missions'), titre: 'Missions en cours', sous: 'Tournées en direct, carte', icone: 'map', n: s.badges.missions, info: true },
          { route: 'flotte', to: chemin('flotte'), titre: 'Livreurs', sous: 'Flotte, pièces, absences', icone: 'users', n: s.badges.demandes },
          { route: 'incidents', to: chemin('incidents'), titre: 'Incidents à valider', sous: 'Décider, la tournée s’ajuste', icone: 'triangle-alert', n: s.badges.incidents },
          { route: 'reglements', to: chemin('reglements'), titre: 'Règlements', sous: 'Versement du vendredi', icone: 'banknote' },
        ]}
      />
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          naviguer(chemin('recherche', q.trim() ? { q: q.trim() } : undefined))
        }}
      >
        <label className="fld fld-l" style={{ marginTop: 12 }}>
          <span className="vh">{t('Rechercher partout')}</span>
          <span className="inp">
            <Icone nom="search" taille={18} />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Paquet, colis, livreur…')} enterKeyHint="search" />
          </span>
        </label>
      </form>
      <div className="mt14">
        <CarteEntreprise />
      </div>
      {groupes
        .filter((g) => g.titre !== 'Aujourd’hui')
        .map((g) => {
          const plus = (EN_PLUS[g.titre] ?? []).filter((e) => ouverte(e.route))
          return (
            <section key={g.titre} id={idGroupe(g.titre)} aria-label={t(g.titre)}>
              <div className="divider-t">{t(g.titre)}</div>
              <div className="card tight">
                {g.entrees.map((e) => {
                  const n = e.badge ? badge(s.badges[e.badge] ?? 0) : null
                  return (
                    <Li
                      key={e.route}
                      icone={e.icone}
                      ton="acc"
                      t={t(e.titre)}
                      to={chemin(e.route)}
                      aria={n ? tf('{entree}, {n}', { entree: t(e.titre), n }) : undefined}
                      droite={n && <span className={'badge-num' + (e.ton === 'alerte' ? ' red' : '')}>{n}</span>}
                    />
                  )
                })}
                {plus.map((e) => (
                  <Li key={e.route} icone={e.icone} ton="acc" t={t(e.titre)} to={chemin(e.route)} />
                ))}
              </div>
            </section>
          )
        })}
      <div className="foot">
        <Icone nom="shield-check" taille={16} />
        <span>{`${PARAMETRES.saisies.mentions.denomination} · RCCM ${PARAMETRES.saisies.mentions.rccm}`}</span>
      </div>
    </Ecran>
  )
}
