// « Je suis arrivé » (tournée, navigation) : POST stops/{id}/arrive avec heure et position ; refusé hors de l'arrêt en
// cours (ordre imposé) ou vers le relais avec des colis manquants ; au-delà de ARRIVEE-ECART-M du point enregistré, le
// livreur confirme (la position réelle corrige le repère pour les courses suivantes, LIV-P09R-03). À l'appui, le
// vendeur reçoit « Votre livreur est là » avec la photo (LIV-P10R-01) ; l'écran de l'arrêt s'ouvre.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { Arret } from '../../donnees/domaines/tournee'
import { usePreferences } from '../../preferences'
import { distanceTexte, useAgir } from './outils'
import { Hint, Lvp } from '../proto'

export function useArrivee() {
  const { t, tf, langue } = usePreferences()
  const naviguer = useNavigate()
  const { agir, occupe } = useAgir()
  const [ecart, setEcart] = useState<{ arret: Arret; m: number } | null>(null)
  const [refus, setRefus] = useState<string | null>(null)

  const arriver = async (a: Arret, confirme = false) => {
    setRefus(null)
    const res = await agir('arrivee', a.id, (o, s) => s.tournee.arriver(a.id, o, confirme))
    if (!res) return setRefus(t('L’arrivée n’a pas pu être enregistrée. Réessayez.'))
    const r = res.r
    if (r.ok) {
      setEcart(null)
      signal('arriveeArret')
      naviguer(chemin(r.route, { a: a.id }))
    } else if (r.raison === 'ecart_position') {
      signal('incident')
      setEcart({ arret: a, m: r.ecartM ?? 0 })
    } else {
      signal('erreur')
      setRefus(
        r.raison === 'ordre_impose'
          ? t('Ordre imposé : seul l’arrêt en cours peut être ouvert.')
          : t('Départ vers le relais refusé : des colis attendus n’ont pas été ramassés. Déclarez un incident ; le nombre attendu s’ajuste après sa validation.'),
      )
    }
  }

  const feuille = (
    <Feuille ouverte={ecart !== null} fermer={() => setEcart(null)} titre={t('Confirmer votre arrivée')}>
      <Lvp>
        <div className="liva-ico amber" style={{ marginTop: 4 }}>
          <Icone nom="map-pin" taille={30} />
        </div>
        <h2 className="b8 t19 center mt12" style={{ margin: '12px 0 0' }}>
          {tf('Vous êtes à {d} du point enregistré', { d: distanceTexte(ecart?.m ?? 0, langue) })}
        </h2>
        <p className="t14 c3 center mt6" style={{ margin: '6px 0 0' }}>
          {t(ecart?.arret.type === 'domicile' ? 'Confirmez-vous que la remise a lieu ici ? Votre position réelle corrigera le repère pour les prochaines courses à cette adresse.' : 'Êtes-vous bien arrivé ? Votre position réelle corrigera le repère pour les prochaines courses.')}
        </p>
        <div className="btns liva-col mt16">
          <button type="button" className="btn primary xl" disabled={occupe} onClick={() => ecart && void arriver(ecart.arret, true)}>
            <Icone nom="map-pin-check" taille={18} />
            <span>{t(ecart?.arret.type === 'domicile' ? 'Oui, la remise a lieu ici' : 'Oui, je suis bien arrivé')}</span>
          </button>
          <button type="button" className="btn secondary" onClick={() => setEcart(null)}>
            <Icone nom="search" taille={18} />
            <span>{t('Non, je continue à chercher')}</span>
          </button>
        </div>
        <Hint icone="shield-check">{t('Aucune photo de la maison en dehors de la photo de remise ; aucune position partagée hors de l’application.')}</Hint>
      </Lvp>
    </Feuille>
  )
  return { arriver, occupe, refus, feuille }
}
