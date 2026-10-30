// « Mes services BelivaY » du Compte (CL-13), regroupés (consigne du porteur : moins de boutons) : les services
// apparentés forment un seul accès (Diaspora avec « Mes proches » et « Diaspora : tout savoir » ; Offrir ; Payer à
// son rythme ; Assistance) ; un groupe ouvre sa feuille (?sheet=services&groupe=…) qui détaille chaque service en
// une ligne. Un groupe dont un seul service est ouvert (interrupteur, type de compte) mène droit à ce service ; un
// groupe vide disparaît.
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille, useFeuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import type { Interrupteur } from '../../config/interrupteurs'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'

interface Service {
  vers: string
  icone: string
  teinte: string // classe de couleur de la pastille (.dx-svc .i)
  texte: string
  detail: string
  ff?: Interrupteur
}
interface Groupe {
  id: string
  icone: string
  teinte: string
  texte: string
  detail: string
  services: Service[]
}

function groupes(diaspora: boolean): Groupe[] {
  const g: (Groupe | false)[] = [
    {
      id: 'premium',
      icone: 'crown',
      teinte: 'v',
      texte: diaspora ? 'Offrir Premium' : 'Premium',
      detail: '',
      services: [{ vers: diaspora ? '/abonnement-offrir' : '/mon-abonnement', icone: 'crown', teinte: 'v', texte: diaspora ? 'Offrir Premium' : 'Premium', detail: '', ff: 'FF-ABONNEMENT' }],
    },
    {
      id: 'diaspora',
      icone: 'globe',
      teinte: 'b',
      texte: diaspora ? 'Espace diaspora' : 'Diaspora',
      detail: 'Tes proches, ici ou à l’étranger',
      services: [
        diaspora
          ? { vers: '/espace-diaspora', icone: 'globe', teinte: 'b', texte: 'Espace diaspora', detail: 'Payer et suivre les paniers de tes proches au pays' }
          : { vers: '/diaspora', icone: 'globe', teinte: 'b', texte: 'Diaspora', detail: 'Envoyer ton panier à un proche à l’étranger, qui le paie' },
        { vers: '/proches', icone: 'users', teinte: 'g', texte: 'Mes proches', detail: 'Relier ta famille avec son code famille' },
        { vers: '/diaspora-infos', icone: 'circle-help', teinte: 'v', texte: 'Diaspora : tout savoir', detail: 'Comment ça marche, moyens de paiement, délais' },
      ],
    },
    {
      id: 'offrir',
      icone: 'gift',
      teinte: '',
      texte: 'Offrir',
      detail: 'Listes, paniers et cadeaux à plusieurs',
      services: [
        { vers: '/listes', icone: 'gift', teinte: '', texte: 'Listes cadeaux', detail: 'Ta liste d’envies, offerte par tes proches', ff: 'FF-LISTE-ENVIES' },
        { vers: '/famille', icone: 'users', teinte: 'b', texte: 'Panier famille', detail: 'Un panier commun pour toute la maison', ff: 'FF-EX05' },
        { vers: '/cotisation', icone: 'coins', teinte: 'a', texte: 'Cotisation', detail: 'Offrir un cadeau cher à plusieurs', ff: 'FF-EX02' },
        ...(diaspora ? [] : [{ vers: '/parrainage', icone: 'user-plus', teinte: 'g', texte: 'Parrainage', detail: 'Inviter un proche, gagner tous les deux', ff: 'FF-ABONNEMENT' as const }]),
      ],
    },
    !diaspora && {
      id: 'rythme',
      icone: 'piggy-bank',
      teinte: 'a',
      texte: 'Payer à mon rythme',
      detail: 'Épargner, mettre de côté',
      services: [
        { vers: '/cagnotte', icone: 'piggy-bank', teinte: '', texte: 'Cagnotte', detail: 'Ce que tes achats te rendent, à dépenser ici', ff: 'FF-ABONNEMENT' },
        { vers: '/cote', icone: 'hand-coins', teinte: 'a', texte: 'Mise de côté', detail: 'Réserver un article et le payer en plusieurs fois', ff: 'FF-EX03' },
      ],
    },
    {
      id: 'rentree',
      icone: 'graduation-cap',
      teinte: 'v',
      texte: 'Rentrée',
      detail: '',
      services: [{ vers: '/rentree', icone: 'graduation-cap', teinte: 'v', texte: 'Rentrée', detail: '', ff: 'FF-EX01' }],
    },
    !diaspora && {
      id: 'troc',
      icone: 'repeat',
      teinte: 'g',
      texte: 'Troc',
      detail: '',
      services: [{ vers: '/troc', icone: 'repeat', teinte: 'g', texte: 'Troc', detail: '', ff: 'FF-EX04' }],
    },
    {
      id: 'aide',
      icone: 'bot',
      teinte: '',
      texte: 'Assistance',
      detail: 'Une question, une réponse tout de suite',
      services: [
        { vers: '/assistant', icone: 'bot', teinte: '', texte: 'Assistant', detail: 'Tes commandes, tes retraits, tes questions', ff: 'FF-IA' },
        ...(diaspora ? [] : [{ vers: '/wa', icone: 'message-circle', teinte: 'g', texte: 'WhatsApp', detail: 'Commander et suivre depuis WhatsApp', ff: 'FF-EX06' as const }]),
      ],
    },
  ]
  return g.filter((x): x is Groupe => !!x)
}

// Les tuiles (dans .dx-svc) et la feuille d'un groupe (à poser dans les éléments fixes de l'écran).
export function useServicesBelivaY(diaspora: boolean) {
  const { t } = usePreferences()
  const { interrupteurs } = useSession()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const { ouverte, fermer } = useFeuille('services')
  const visibles = groupes(diaspora)
    .map((g) => ({ ...g, services: g.services.filter((s) => !s.ff || interrupteurs[s.ff]) }))
    .filter((g) => g.services.length > 0)
  const ouvrir = (id: string) => {
    const p = new URLSearchParams(params)
    p.set('sheet', 'services')
    p.set('groupe', id)
    naviguer({ search: p.toString() }, { state: { feuille: true } })
  }
  const tuiles = visibles.map((g) =>
    g.services.length === 1 ? (
      <Link key={g.id} to={g.services[0].vers}>
        <span className={'i ' + g.services[0].teinte}>
          <Icone nom={g.services[0].icone} taille={20} />
        </span>
        {t(g.services[0].texte)}
      </Link>
    ) : (
      <button key={g.id} type="button" className="dx-grp" aria-haspopup="dialog" onClick={() => ouvrir(g.id)}>
        <span className={'i ' + g.teinte}>
          <Icone nom={g.icone} taille={20} />
          <em aria-hidden="true">{g.services.length}</em>
        </span>
        {t(g.texte)}
      </button>
    ),
  )
  const g = visibles.find((x) => x.id === params.get('groupe'))
  const feuille = (
    <Feuille ouverte={ouverte && !!g} fermer={fermer} titre={g ? t(g.texte) : ''} classe="dx-grp-f">
      {g && (
        <>
          <h3 className="al-t">{t(g.texte)}</h3>
          {g.detail && <p className="al-s">{t(g.detail)}</p>}
          <div className="card tight dx-grp-l">
            {g.services.map((s) => (
              <Link key={s.vers} to={s.vers} className="li">
                <span className={'ic dx-i ' + s.teinte}>
                  <Icone nom={s.icone} taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {t(s.texte)}
                  </span>
                  {s.detail && (
                    <span className="ls" style={{ display: 'block' }}>
                      {t(s.detail)}
                    </span>
                  )}
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </Feuille>
  )
  return { tuiles, feuille }
}
