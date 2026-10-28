// Menu (onglet « Menu » de la barre du bas, « ☰ » de l'en-tête ; route du prototype « menu ») : surtitre de la console,
// recherche en tête, puis chaque groupe de navigation (Travail du jour, Argent, Acteurs et confiance, Catalogue,
// Logistique, Pilotage, Gouvernance, Console) en carte de lignes, compteurs à droite, mention en pied. La navigation est
// celle de la barre latérale, filtrée par rôle et par interrupteur. L'agent connecté (rôles, préférences, déconnexion)
// est le Profil, distinct du Menu (avatar).
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { badge } from '@client/i18n/format'
import { PARAMETRES } from '../../calculs/registre'
import { Ecran, idGroupe, useNavigation } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Li } from '../../composants/prototype'
import { fonctionsDuRole } from '../../config/fonctions'
import { chemin } from '../../config/pages'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'

export default function Menu() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const groupes = useNavigation()
  const naviguer = useNavigate()
  const [q, setQ] = useState('')
  return (
    <Ecran route="menu" kicker={t('Console d’administration')} fonctions={s.connecte ? fonctionsDuRole(s.role, s.badges) : undefined}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          naviguer(chemin('recherche', q.trim() ? { q: q.trim() } : undefined))
        }}
      >
        <label className="fld fld-l" style={{ marginTop: 4 }}>
          <span className="vh">{t('Rechercher partout')}</span>
          <span className="inp">
            <Icone nom="search" taille={18} />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Commande, étiquette, paquet, acteur…')} enterKeyHint="search" />
          </span>
        </label>
      </form>
      <div className="card tight mt10">
        <Li icone="user-round" ton="acc" t={t('Mon profil')} s={t('Agir en tant que · préférences · se déconnecter')} to={chemin('profil')} />
      </div>
      {groupes.map((g) => (
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
          </div>
        </section>
      ))}
      <div className="foot">
        <Icone nom="shield-check" taille={16} />
        <span>{`${t('Console v1')} · ${PARAMETRES.mentions.denomination} · RCCM ${PARAMETRES.mentions.rccm}`}</span>
      </div>
    </Ecran>
  )
}
