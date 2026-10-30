// Préparation en trois gestes (chantier F, point 2) : 1. photo de l'article, 2. emballage, 3. « C'est prêt ».
// Photo et emballage ne bloquent pas « C'est prêt » (aucune règle ne l'exige) : ils disent où en est la commande et
// comptent « À marquer prête » à l'accueil. Heure limite (R45, R47) : prête avant 13 h, livrée le jour même.
import type { ChangeEvent, ReactNode } from 'react'
import { jouer } from '@client/composants/Sons'
import { sonner } from '../../composants/marque-sonore'
import { Icone } from '../../composants/Icone'
import type { GestePreparation, GestesPreparation } from '../../donnees/domaines/preparation'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { heure, jourCourt } from '../../i18n/temps'
import { heureLimite } from '../../calculs/heure-limite'
import { jourDe } from '../../calculs/temps'
import { Duree } from './commun'
import './gestes.css'

/** « Prête avant 13 h : livrée aujourd'hui » et le temps qui reste (domicile, R47). */
export function LimiteDuJour({ maintenant }: { maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  const r = heureLimite(maintenant)
  const jour = jourDe(r.livreAvant) === jourDe(maintenant) ? t('aujourd’hui') : jourDe(r.livreAvant) === jourDe(maintenant + 86400000) ? t('demain') : jourCourt(r.livreAvant, langue)
  return (
    <div className="vd5-limite" data-limite={r.limite ? 'jour-meme' : 'lendemain'}>
      <Icone nom="truck" taille={16} style={{ flexShrink: 0 }} />
      <span className="grow">
        {r.limite ? (
          <>
            {tf('Prête avant {h} : livrée {jour} avant {l}', { h: heure(r.limite, langue), jour, l: heure(r.livreAvant, langue) })}
            <b className="vd5-limite-d">
              {t('Il reste ')}
              <Duree ms={r.limite - maintenant} />
            </b>
          </>
        ) : (
          tf('Après 13 h : livrée {jour} avant {l}', { jour, l: heure(r.livreAvant, langue) })
        )}
      </span>
    </div>
  )
}

function Etape({ n, fait, titre, children }: { n: number; fait: boolean; titre: string; children: ReactNode }) {
  return (
    <li className={'vd5-geste' + (fait ? ' fait' : '')} data-geste={n}>
      <span className="vd5-geste-n" aria-hidden="true">
        {fait ? <Icone nom="check" taille={16} /> : n}
      </span>
      <span className="grow vd5-geste-t">{titre}</span>
      {children}
    </li>
  )
}

/** Les deux premiers gestes (le troisième, « C'est prêt », est le bouton principal de la carte). */
export function TroisGestes({ refCommande, g, apres, pret }: { refCommande: string; g: GestesPreparation; apres: () => void; pret: ReactNode }) {
  const { t } = usePreferences()
  const marquer = async (geste: GestePreparation, fait: boolean) => {
    await source.preparation.marquerGeste(refCommande, geste, fait)
    if (fait) sonner(geste === 'photo' ? 'photo' : 'valide')
    else jouer('interrupteur')
    apres()
  }
  const photo = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) void marquer('photo', true)
    e.target.value = ''
  }
  return (
    <ol className="vd5-gestes" aria-label={t('Préparer en trois gestes')}>
      <Etape n={1} fait={g.photo} titre={g.photo ? t('Photo prise') : t('Photo de l’article')}>
        <label className="vd5-geste-b">
          <input type="file" accept="image/*" capture="environment" onChange={photo} aria-label={t('Prendre la photo de l’article')} />
          <Icone nom="camera" taille={16} />
          <span>{g.photo ? t('Refaire') : t('Prendre')}</span>
        </label>
      </Etape>
      <Etape n={2} fait={g.emballage} titre={g.emballage ? t('Emballé') : t('Emballage')}>
        <button type="button" className="vd5-geste-b" aria-pressed={g.emballage} onClick={() => void marquer('emballage', !g.emballage)}>
          <Icone nom={g.emballage ? 'undo-2' : 'package'} taille={16} />
          <span>{g.emballage ? t('Annuler') : t('C’est emballé')}</span>
        </button>
      </Etape>
      <li className="vd5-geste vd5-geste-3" data-geste={3}>
        {pret}
      </li>
    </ol>
  )
}
