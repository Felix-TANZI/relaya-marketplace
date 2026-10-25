// Avis et questions au même endroit (chantier F, point 7) : deux onglets, chacun avec ce qui attend une réponse.
// Les réponses rapides (modèles modifiables, VAGUE n° 12) restent celles de la page Questions.
import { Link } from 'react-router-dom'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { sourceAJA } from '../AJ-A/donnees/source'

export function OngletsAvisQuestions({ actif }: { actif: 'avis' | 'questions' }) {
  const { t } = usePreferences()
  const maintenant = useHorloge(60_000)
  const n = useLecture(
    () =>
      Promise.all([
        source.boutique
          .avis()
          .then((a) => a.liste.filter((x) => !x.reponse && !!x.commentaire && x.limiteReponse > maintenant).length)
          .catch(() => 0),
        sourceAJA.questions
          .liste()
          .then((l) => l.compteurs.a_repondre)
          .catch(() => 0),
      ]),
    [],
  ).donnees
  const onglet = (route: 'avis' | 'questions', libelle: string, nombre: number | undefined) => (
    <Link to={chemin(route)} className={route === actif ? 'on' : ''} aria-current={route === actif ? 'page' : undefined} replace data-onglet={route} style={{ minHeight: '44px' }}>
      {t(libelle)}
      {nombre ? <span className="n">{nombre}</span> : null}
    </Link>
  )
  return (
    <div className="seg" style={{ marginTop: '12px' }}>
      {onglet('avis', 'Avis', n?.[0])}
      {onglet('questions', 'Questions', n?.[1])}
    </div>
  )
}
