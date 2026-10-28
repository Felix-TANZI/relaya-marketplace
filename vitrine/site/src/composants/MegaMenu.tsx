// Méga-menu « Catégories » de la barre de navigation (dès 1024 px, DISPOSITION-ECRANS.md § 6.4) : à gauche les dix
// univers (240 px), au centre les sous-catégories de l'univers survolé ou focalisé, en trois colonnes, avec leur
// nombre de produits ; à droite (280 px) la vignette de l'univers et son « Tout voir », puis « En promotion dans
// cet univers ». Les nombres sont réels : ceux du serveur pour l'univers, ceux du catalogue pour le reste.
// Flèches haut et bas : d'un univers à l'autre ; Échap ferme (géré par la barre de navigation).
import { useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { chemin } from '../config/pages'
import { F } from '../i18n/format'
import { usePreferences } from '../preferences'
import { UNIVERS } from './Catalogue'
import { Dessin } from './Dessin'
import { useMenuCoque, useProduitsCoque } from './donneesCoque'
import { Icone } from './Icone'
import { Illustration } from './socle'

export function MegaMenu({ id, fermer }: { id: string; fermer: () => void }) {
  const { t, tf } = usePreferences()
  const menu = useMenuCoque()
  const produits = useProduitsCoque() ?? []
  const [choisi, setChoisi] = useState(UNIVERS[0].id)
  const u = UNIVERS.find((x) => x.id === choisi) ?? UNIVERS[0]
  const infos = menu?.univers.find((x) => x.id === u.id)
  const dans = produits.filter((p) => p.univers === u.id)
  const promos = dans.filter((p) => (p.prixBarre ?? 0) > p.prix).slice(0, 3)
  const fleches = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const liens = [...e.currentTarget.querySelectorAll<HTMLElement>('.mm-u a')]
    const i = liens.indexOf(document.activeElement as HTMLElement)
    if (i < 0) return
    e.preventDefault()
    liens[(i + (e.key === 'ArrowDown' ? 1 : liens.length - 1)) % liens.length].focus()
  }
  return (
    <div id={id} className="mm" role="region" aria-label={t('Catégories')} onKeyDown={fleches}>
      <div className="mm-in">
        <ul className="mm-u">
          {UNIVERS.map((x) => {
            const n = menu?.univers.find((m) => m.id === x.id)?.produits ?? 0
            return (
              <li key={x.id}>
                <Link
                  to={chemin('categories', { u: x.id })}
                  className={x.id === u.id ? 'on' : undefined}
                  aria-current={x.id === u.id ? 'true' : undefined}
                  onMouseEnter={() => setChoisi(x.id)}
                  onFocus={() => setChoisi(x.id)}
                  onClick={fermer}
                >
                  <Icone nom={x.icone} taille={18} />
                  <span className="grow">{t(x.titre)}</span>
                  {n > 0 && <span className="mm-n">{n}</span>}
                  <Icone nom="chevron-right" taille={15} />
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="mm-s">
          <div className="kick">{t(u.titre)}</div>
          <ul>
            {u.subs.map((s) => {
              const n = dans.filter((p) => p.sousCategorie === s).length
              return (
                <li key={s}>
                  <Link to={chemin('liste', { cat: u.id, sub: s })} onClick={fermer}>
                    <span className="grow">{t(s)}</span>
                    {n > 0 && <span className="mm-n">{n}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
          <Link to={chemin('categories')} className="mm-tout" onClick={fermer}>
            {t('Toutes les catégories')}
            <Icone nom="arrow-right" taille={16} />
          </Link>
        </div>
        <div className="mm-d">
          <Link to={chemin('categories', { u: u.id })} className="mm-ban" onClick={fermer}>
            {infos && <Illustration image={infos.vignette} classe="mm-vi" />}
            <span className="mm-bt">
              <b>{t(u.titre)}</b>
              <small>
                {t('Tout voir')}
                <Icone nom="arrow-right" taille={14} />
              </small>
            </span>
          </Link>
          {promos.length > 0 && (
            <>
              <div className="kick mm-k">{t('En promotion dans cet univers')}</div>
              {promos.map((p) => (
                <Link key={p.p} to={chemin('fiche', { p: p.p })} className="mm-p" onClick={fermer}>
                  <span className="mm-ph">{(p.dessins[0] || p.images?.[0]) && <Dessin id={p.dessins[0] ?? ''} image={p.images?.[0]} alt={p.titre} tailles="64px" />}</span>
                  <span className="grow">
                    <span className="mm-pt">{t(p.titre)}</span>
                    <span className="mm-pp">
                      <b>{F(p.prix)}&nbsp;F</b>
                      <s>{F(p.prixBarre!)}&nbsp;F</s>
                    </span>
                  </span>
                  <span className="pill or">{tf('−{r} %', { r: Math.round((1 - p.prix / p.prixBarre!) * 100) })}</span>
                </Link>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
