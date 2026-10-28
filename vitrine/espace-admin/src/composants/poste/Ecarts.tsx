// Vue Audit (DECISIONS-ENCADREES.md § 7) : les décisions qui s'écartent de la suggestion de la règle, avec l'instantané
// des preuves (lignes corrigées, appels), le motif et la note ; « Tirer un échantillon » choisit des décisions à relire
// (tirage reproductible du jour, ADM-ECART-ECHANTILLON). Direction et Audit seulement (la source répond vide sinon).
import { useState } from 'react'
import { F } from '@client/i18n/format'
import { echantillon } from '../../calculs/decisions'
import { PARAMETRES } from '../../calculs/registre'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { Icone } from '../Icone'
import { Heure } from '../LigneJournal'
import { Panel, Pill } from '../prototype'
import { Link } from 'react-router-dom'
import { NOM_GENRE } from './Poste'

export function Ecarts() {
  const { t, tf } = usePreferences()
  const l = useLecture(() => source.decisions.ecarts(), [])
  const n = useHorloge()
  const [tires, setTires] = useState<string[] | null>(null)
  const lignes = l.donnees ?? []
  if (!lignes.length) return null
  const tirer = () => setTires(echantillon(lignes, PARAMETRES.decisions.echantillon, Math.floor(n / 86_400_000)).map((x) => x.genre + x.id))
  return (
    <Panel titre={tf('Décisions qui s’écartent de la suggestion · {n}', { n: lignes.length })} icone="shuffle" droite={<button type="button" className="btn sm secondary po-tirer" onClick={tirer}><Icone nom="shuffle" taille={16} />{tf('Tirer un échantillon ({n})', { n: PARAMETRES.decisions.echantillon })}</button>}>
      {tires && <p className="t13" role="status">{tf('{n} décisions tirées pour relecture : surlignées ci-dessous.', { n: tires.length })}</p>}
      <ul className="po-ec">
        {lignes.map((x) => (
          <li key={x.genre + x.id + x.le} className={tires?.includes(x.genre + x.id) ? 'tire' : ''}>
            <div className="po-ec-h">
              <b>
                {x.genre === 'litige' ? <Link to={chemin('litige', { id: x.id })}>{x.id}</Link> : x.id} · {t(NOM_GENRE[x.genre])}
              </b>
              {tires?.includes(x.genre + x.id) && <Pill ton="amber" sm icone="eye">{t('À relire')}</Pill>}
            </div>
            <span>{tf('Suggestion : {s} · décision : {d}', { s: x.suggestion ? t(x.suggestion) : '—', d: t(x.decision) })}{x.montant ? ` · ${F(x.montant)} F` : ''}</span>
            <span>{tf('Motif : {m}', { m: t(x.motif) })} · {x.note}</span>
            <span className="c3">
              {x.par} · <Heure le={x.le} /> · {tf('{c} ligne(s) corrigée(s), {a} appel(s), {p} pièces', { c: x.instantane.controles.filter((c) => c.corrige).length, a: x.instantane.appels, p: x.instantane.pieces })}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
