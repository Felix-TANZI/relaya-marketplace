// Panneau des filtres (CL-05) : le même panneau sert la page « Filtres » du téléphone (choix gardés sur place,
// puis « Voir les N résultats ») et, dès 1024 px, la colonne gauche des résultats et des listes (§ 5.3.1 :
// « enPlace » : chaque choix s'applique aussitôt à l'adresse, le nombre se met à jour en tête des résultats ;
// les 8 premières marques, puis « Voir toutes les marques »). Mêmes contrôles, même ordre.
import { useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { marqueDe, UNIVERS, type Contexte } from '../../composants/Catalogue'
import { Icone } from '../../composants/Icone'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { resultatsDe } from './Commun'

const CHAMP = { width: '100%', minWidth: 0, boxSizing: 'border-box', font: 'inherit', outline: 'none' } as const
export const EFFACABLES = ['min', 'max', 'km', 'note', 'stock', 'offert', 'promo', 'rel', 'dom', 'auj', 'f', 'marque', 'cat', 'sub']

// garder : ce que « Tout effacer » ne retire pas et que le nombre ne compte pas (l'univers d'une liste : c'est la page).
export function PanneauFiltres({ c, p, setP, enPlace, garder = [], children }: { c: Contexte; p: URLSearchParams; setP: (n: URLSearchParams) => void; enPlace?: boolean; garder?: string[]; children?: ReactNode }) {
  const effacables = EFFACABLES.filter((k) => !garder.includes(k))
  const { t, tf } = usePreferences()
  const [toutes, setToutes] = useState(false)
  const q = p.get('q') ?? ''
  const avec = (maj: Record<string, string | null>) => {
    const n = new URLSearchParams(p)
    Object.entries(maj).forEach(([k, v]) => (v === null || v === '' ? n.delete(k) : n.set(k, v)))
    return n
  }
  const maj = (k: string, v: string | null) => setP(avec({ [k]: v }))
  const nb = (x: URLSearchParams) => resultatsDe(c, x).liste.length
  const choisis = effacables.filter((k) => p.has(k)).length
  const sansPrix = resultatsDe(c, avec({ min: null, max: null })).liste
  const prix = sansPrix.map((x) => x.prix)
  const bascule = (k: string) => maj(k, p.get(k) === '1' ? null : '1')
  const chipCompte = (k: string, x: string, compte = true) => {
    const on = p.get(k) === '1' || (k === 'rel' && p.get('f') === 'relais') || (k === 'auj' && p.get('f') === 'auj')
    const nx = nb(avec({ [k]: '1' }))
    return (
      <a key={k} href="#" className={'chip' + (on ? ' on' : '')} aria-pressed={on} onClick={(e) => (e.preventDefault(), setP(avec({ [k]: on ? null : '1', ...(on ? { f: null } : {}) })))}>
        {t(x + ' ')}
        {compte && <span className="n">{nx}</span>}
      </a>
    )
  }
  // compte : le nombre de résultats avec ce choix (distance, note), comme pour la livrabilité.
  const chip = (k: string, v: string | null, x: string, compte = false) => (
    <a key={x} href="#" className={'chip' + ((p.get(k) ?? null) === v ? ' on' : '')} aria-pressed={(p.get(k) ?? null) === v} onClick={(e) => (e.preventDefault(), maj(k, v))}>
      {t(x)}
      {compte && v !== null && (
        <>
          {' '}
          <span className="n">{nb(avec({ [k]: v }))}</span>
        </>
      )}
    </a>
  )
  const ligne = (k: string, x: string) => (
    <div className="cl05-trow">
      <span className="grow">{t(x)}</span>
      <span className="n">{nb(avec({ [k]: '1' }))}</span>
      <button type="button" className={'tg' + (p.get(k) === '1' ? ' on' : '')} role="switch" aria-checked={p.get(k) === '1'} aria-label={t(x)} onClick={() => bascule(k)}></button>
    </div>
  )
  const uChoisi = UNIVERS.find((u) => u.id === p.get('cat'))
  const sansMarque = resultatsDe(c, avec({ marque: null })).liste
  // Marques des résultats, « Sans marque » (fait main, vrac) en dernier.
  const marques = [...new Set(resultatsDe(c, new URLSearchParams(q ? { q } : {})).liste.map(marqueDe))].sort((a, b) => Number(a === 'Sans marque') - Number(b === 'Sans marque') || a.localeCompare(b))
  // En place, les marques présentes d'abord (les 8 premières sont visibles, les autres se déplient).
  const nbMarque = (m: string) => sansMarque.filter((x) => marqueDe(x) === m).length
  const ordre = enPlace ? [...marques].sort((a, b) => Number(!nbMarque(a)) - Number(!nbMarque(b))) : marques
  const nomMarque = (m: string) => (m === 'Sans marque' ? t('Sans marque') : m)
  return (
    <div className={'cl05-fp' + (enPlace ? ' en-place' : '')}>
      <div className="cl05-ft">
        <h2>
          {t('Filtres')}
          {enPlace && choisis > 0 && <span className="cl05-fn">{choisis}</span>}
        </h2>
        <a
          href="#"
          className={choisis ? '' : 'cl05-dis'}
          aria-disabled={!choisis || undefined}
          onClick={(e) => {
            e.preventDefault()
            setP(avec(Object.fromEntries(effacables.map((k) => [k, null]))))
          }}
        >
          {t('Tout effacer')}
        </a>
      </div>
      <div className="cl05-lab">
        <span>{t('Prix')}</span>
      </div>
      <div className="cl05-pb2">
        <input
          className="cl05-pbox"
          style={CHAMP}
          inputMode="numeric"
          aria-label={t('Prix minimum')}
          placeholder={prix.length ? F(Math.min(...prix)) + ' F' : t('De')}
          value={p.get('min') ?? ''}
          onChange={(e) => maj('min', e.target.value.replace(/\D/g, ''))}
        />
        <input className="cl05-pbox" style={CHAMP} inputMode="numeric" aria-label={t('Prix maximum')} placeholder={prix.length ? F(Math.max(...prix)) + ' F' : t('À')} value={p.get('max') ?? ''} onChange={(e) => maj('max', e.target.value.replace(/\D/g, ''))} />
      </div>
      <div className="chips" style={{ marginTop: '8px' }}>
        {[
          ['10000', 'Moins de 10 000 F'],
          ['50000', 'Moins de 50 000 F'],
          ['150000', 'Moins de 150 000 F'],
        ].map(([v, x]) => (
          <a key={v} href="#" className={'chip' + (p.get('max') === v && !p.get('min') ? ' on' : '')} onClick={(e) => (e.preventDefault(), setP(avec({ min: null, max: v })))}>
            {t(x)}
          </a>
        ))}
      </div>
      <div className="cl05-lab">
        <span>{t('Livrabilité')}</span>
      </div>
      <div className="chips" style={{ marginTop: '8px' }}>
        {chipCompte('rel', 'Retirable à mon relais')}
        {chipCompte('dom', 'Livrable à domicile')}
        {chipCompte('auj', 'Retrait possible aujourd’hui')}
      </div>
      <p className="cl05-sub" style={{ marginTop: '8px' }}>
        <span>{c.adresse ? tf('{r} ou {a}.', { r: t(c.relais?.nom ?? 'Relais Mvog-Ada'), a: c.adresse }) : tf('{r}.', { r: t(c.relais?.nom ?? 'Relais Mvog-Ada') })}</span> <span>{t('Retrait du jour : si tu commandes maintenant.')}</span>
      </p>
      <div className="cl05-lab">
        <span>{t('Disponibilité')}</span>
      </div>
      {ligne('stock', 'En stock uniquement')}
      {ligne('offert', 'Retrait offert')}
      {ligne('promo', 'En promotion')}
      <div className="cl05-lab">
        <span>{t('Distance du relais')}</span>
      </div>
      <div className="chips" style={{ marginTop: '8px' }}>
        {chip('km', null, 'Toutes')}
        {chip('km', '1', '1 km', true)}
        {chip('km', '3', '3 km', true)}
        {chip('km', '5', '5 km', true)}
        {chip('km', '10', '10 km', true)}
      </div>
      <p className="cl05-sub" style={{ marginTop: '8px' }}>
        <span>{tf('De {r} à la boutique qui expédie, à vol d’oiseau.', { r: t(c.relais?.nom ?? 'Relais Mvog-Ada') })}</span>
      </p>
      <div className="cl05-lab">
        <span>{t('Note')}</span>
      </div>
      <div className="chips" style={{ marginTop: '8px' }}>
        {chip('note', null, 'Toutes')}
        {chip('note', '4', '4 ★ et plus', true)}
        {chip('note', '4.5', '4,5 ★ et plus', true)}
      </div>
      <div className="cl05-lab">
        <span>{t('Univers')}</span>
      </div>
      <div className="chips" style={{ marginTop: '8px' }}>
        <a href="#" className={'chip' + (!p.get('cat') ? ' on' : '')} aria-pressed={!p.get('cat')} onClick={(e) => (e.preventDefault(), setP(avec({ cat: null, sub: null })))}>
          {t('Tous')}
        </a>
        {UNIVERS.map((u) => (
          <a key={u.id} href="#" className={'chip' + (p.get('cat') === u.id ? ' on' : '')} aria-pressed={p.get('cat') === u.id} onClick={(e) => (e.preventDefault(), setP(avec({ cat: u.id, sub: null })))}>
            {t(u.titre)}
          </a>
        ))}
      </div>
      {uChoisi && (
        <>
          <div className="cl05-lab">
            <span>{tf('Dans {u}', { u: t(uChoisi.titre) })}</span>
          </div>
          <div className="chips" style={{ marginTop: '8px' }}>
            {chip('sub', null, 'Tout')}
            {uChoisi.subs.map((x) => chip('sub', x, x, true))}
          </div>
        </>
      )}
      {marques.length > 0 && (
        <>
          <div className="cl05-lab">
            <span>{t('Marque')}</span>
          </div>
          <div className="chips" style={{ marginTop: '8px' }}>
            {(enPlace && !toutes ? ordre.slice(0, 8) : ordre).map((m) => {
              const nm = sansMarque.filter((x) => marqueDe(x) === m).length
              const on = p.get('marque') === m
              return nm || on ? (
                <a key={m} href="#" className={'chip' + (on ? ' on' : '')} aria-pressed={on} onClick={(e) => (e.preventDefault(), maj('marque', on ? null : m))}>
                  {nomMarque(m) + ' '}
                  <span className="n">{nm}</span>
                </a>
              ) : (
                <span key={m} className="chip cl05-off" aria-disabled="true">
                  {nomMarque(m) + ' '}
                  <span className="n">0</span>
                </span>
              )
            })}
          </div>
          {enPlace && marques.length > 8 && (
            <button type="button" className="cl05-toutes" aria-expanded={toutes} onClick={() => setToutes(!toutes)}>
              {t(toutes ? 'Moins de marques' : 'Voir toutes les marques')}
              <Icone nom={toutes ? 'chevron-up' : 'chevron-down'} taille={16} />
            </button>
          )}
        </>
      )}
      {children}
    </div>
  )
}

// Dès 1024 px : le panneau en place, colonne gauche des listes et des résultats ; chaque choix change l'adresse.
export function FiltresEnPlace({ c }: { c: Contexte }) {
  const [params] = useSearchParams()
  const liste = useLocation().pathname === '/liste'
  const naviguer = useNavigate()
  const p = new URLSearchParams(params)
  p.delete('retour')
  p.delete('sheet')
  return <PanneauFiltres c={c} p={p} setP={(n) => naviguer({ search: n.toString() }, { replace: true })} enPlace garder={liste ? ['cat'] : []} />
}
