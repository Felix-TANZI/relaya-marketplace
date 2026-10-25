// Menu (PR-10 Fig. 1 ; MEN-01, MEN-02, FER-07 ; PR01-R01). Structure du prototype : bandeau du relais (avatar → Mon
// compte, nom du relais, membre et rôle, état d'ouverture), « Le guichet » en 4 tuiles avec compteurs, puis les groupes
// Opérations, Argent et performance, Mon relais, État du relais et appareil, Compte, logo.
// Selon le rôle (MEN-01) : une entrée que le membre ne peut pas ouvrir (config/droits.ts) n'apparaît pas ; un groupe
// vide disparaît. MEN-02 : l'employé qui a le droit « Fermeture imprévue du jour » voit « Fermeture », limitée à
// aujourd'hui. Compteurs réels de la session (masqués à 0, NAV-02). « Se déconnecter » ferme le groupe Compte.
// ARL-122 : les entrées de démonstration du prototype (Connexion, Invitation, Relais neuf, États d'erreur, Caméra,
// Devenir point relais) ne sont pas des besoins du membre connecté : le groupe garde sa place et ne montre que ce
// qui sert (statut du relais, hors connexion, installer l'application).
import { LiensLegaux } from '@client/composants/LiensLegaux'
import { Link } from 'react-router-dom'
import logo from '../../assets/logo-belivay.png'
import { Ecran, usePastilles } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { peutOuvrir } from '../../config/droits'
import { chemin } from '../../config/pages'
import { enAttente, useFile } from '../../donnees/fileHorsLigne'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { FeuilleDeconnexion, useDeconnexion } from './deconnexion'
import './pr10.css'

interface Entree {
  route: string
  params?: Record<string, string>
  icone: string
  titre: string
  compte?: number
  ton?: 'accent' | 'neutre'
}

export default function Menu() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const m = s.membre
  const pastilles = usePastilles()
  const file = useFile()
  const deconnexion = useDeconnexion()
  const ouvrable = (e: Entree) => peutOuvrir(m, e.route)
  const gerant = m?.role === 'proprietaire'
  const ouverture = pastilles[0]
  const b = s.badges

  const tuiles: Entree[] = [
    { route: 'accueil', icone: 'r-grille', titre: 'Aujourd’hui' },
    { route: 'reception', icone: 'r-colis', titre: 'Réception', compte: b.reception },
    { route: 'retrait', icone: 'r-cle', titre: 'Retrait' },
    { route: 'stock', icone: 'r-pile', titre: 'Colis en stock', compte: b.stock },
  ]
  const groupes: { titre: string; entrees: Entree[] }[] = [
    {
      titre: 'OPÉRATIONS',
      entrees: [
        { route: 'departs', icone: 'r-camion', titre: 'À faire partir', compte: b.departs, ton: 'accent' },
        { route: 'litiges', icone: 'r-balance', titre: 'Constats et retours' },
        { route: 'historique', icone: 'r-historique', titre: 'Historique' },
        { route: 'notifications', icone: 'r-cloche', titre: 'Notifications', compte: b.notifications },
        { route: 'messagerie', icone: 'r-message', titre: 'Messagerie', compte: b.messages },
      ],
    },
    {
      titre: 'ARGENT ET PERFORMANCE',
      entrees: [
        { route: 'versements', icone: 'r-carte-paiement', titre: 'Versements' },
        { route: 'rapports', icone: 'r-graphique', titre: 'Rapports' },
        { route: 'trust', icone: 'r-bouclier', titre: 'Trust Score' },
        { route: 'avis', icone: 'r-etoile', titre: 'Avis des clients' },
        { route: 'paliers', icone: 'r-couches', titre: 'Paliers' },
      ],
    },
    {
      titre: 'MON RELAIS',
      entrees: [
        { route: 'capacite', icone: 'r-horloge', titre: 'Capacité et horaires' },
        { route: 'zone', icone: 'map-pin', titre: 'Ma zone sur la carte' },
        { route: 'fermeture', icone: 'r-fermeture', titre: gerant ? 'Fermeture exceptionnelle' : 'Fermeture imprévue du jour' },
        { route: 'documents', icone: 'r-document', titre: 'Documents' },
        { route: 'equipe', icone: 'r-personne', titre: 'Mon équipe' },
        { route: 'activation', icone: 'r-boutique', titre: 'Activation et partenariat' },
        { route: 'formation', icone: 'r-formation', titre: 'Formation' },
      ],
    },
    {
      titre: 'ÉTAT DU RELAIS ET APPAREIL',
      entrees: [
        { route: 'statut-relais', icone: 'r-boutique', titre: 'Statut du relais' },
        { route: 'accueil', params: { etat: 'hors-ligne' }, icone: 'r-reseau', titre: 'Hors connexion', compte: enAttente(file).length },
        { route: 'installer', icone: 'r-telecharger', titre: 'Installer l’application' },
      ],
    },
    {
      titre: 'COMPTE',
      entrees: [
        { route: 'aide', icone: 'r-aide', titre: 'Aide' },
        { route: 'parametres', icone: 'r-reglages', titre: 'Paramètres' },
      ],
    },
  ]

  return (
    <Ecran route="menu" fixes={<FeuilleDeconnexion />}>
      <div className="p-0hxmj8 r-pile">
        <div className="p-36va56">
          <div className="p-z3prj2">
            <Link to={chemin('parametres')} aria-label={t('Mon compte')} className={'p-jb3jyo' + (m?.photo ? ' p10-avatar-photo' : '')}>
              {m?.photo ? <img src={m.photo} alt="" /> : (m?.initiales ?? '')}
            </Link>
            <div className="p-lmo74g">
              <div className="p-nlvkht">{s.relais ? tf('{nom} · {quartier}', { nom: s.relais.nom, quartier: s.relais.quartier }) : t('Point relais')}</div>
              <div className="p-anbp2l">{m ? tf('{prenom} {nom}, {role}', { prenom: m.prenom, nom: m.nom, role: t(gerant ? 'gérant' : 'employé de comptoir') }) : ''}</div>
            </div>
            {ouverture && (
              <Link to={chemin(ouverture.vers)} className={(ouverture.ton === 'vert' ? 'p-nax3x4' : 'r-pill r-ton-' + ouverture.ton) + ' p10-cible'}>
                {'● ' + ouverture.texte}
              </Link>
            )}
          </div>
        </div>
        <div className="p-yscrc8">{t('LE GUICHET')}</div>
        <div className="p-0cipe3">
          {tuiles.filter(ouvrable).map((e) => (
            <Link key={e.route} to={chemin(e.route)} className="p-v298aq" aria-label={e.compte ? tf('{titre}, {n}', { titre: t(e.titre), n: e.compte }) : undefined}>
              <div className="p-hv0jfo">
                <Icone nom={e.icone} taille={19} className="p-7dsggt" />
              </div>
              <div className="p-dfc4i3">{t(e.titre)}</div>
              {!!e.compte && (
                <span className="p-4b7s50">
                  <span className="p-rpzy79">{e.compte}</span>
                </span>
              )}
            </Link>
          ))}
        </div>
        {groupes.map((g) => {
          const entrees = g.entrees.filter(ouvrable)
          if (!entrees.length) return null
          return (
            <nav key={g.titre} className="p-taaoze" aria-label={t(g.titre)}>
              <div className="p-yscrc8">{t(g.titre)}</div>
              {entrees.map((e, i) => (
                <div key={e.route + i}>
                  {i > 0 && <div className="p-92xvtp" />}
                  <Link to={chemin(e.route, e.params)} className="p-edt6n8">
                    <Icone nom={e.icone} taille={20} className="p-672m16" />
                    <div className="p-hngd8y">{t(e.titre)}</div>
                    {!!e.compte && <span className="p-rpzy79">{e.compte}</span>}
                    {e.route === 'trust' && s.relais?.trust != null && <span className="p-6z26dm">{Math.round(s.relais.trust)}</span>}
                    <Icone nom="r-chevron-droite" taille={16} className="p-2bmvtm" />
                  </Link>
                </div>
              ))}
              {g.titre === 'COMPTE' && (
                <>
                  <div className="p-92xvtp" />
                  <button type="button" className="p-edt6n8 p10-btn p10-rouge" onClick={deconnexion.ouvrir}>
                    <Icone nom="r-entrer" taille={20} />
                    <div className="p-hngd8y">{t('Se déconnecter')}</div>
                  </button>
                </>
              )}
            </nav>
          )
        })}
        <div className="p-98j47s">
          <img src={logo} alt="BelivaY" className="p-ghcggh" />
          <LiensLegaux />
        </div>
      </div>
    </Ecran>
  )
}
