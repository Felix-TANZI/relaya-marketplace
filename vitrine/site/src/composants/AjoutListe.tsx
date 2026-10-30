// « Ajouter à une liste » en un geste (consigne du porteur, favoris simplifiés) : une feuille qui montre les listes
// existantes (la liste du cœur « Mes favoris » et les listes nommées), chacune avec son statut lisible, et « Nouvelle
// liste » (un nom, puis l'article y entre aussitôt). Un toucher sur une liste y ajoute le ou les articles et ferme.
// Servie par la fiche (appui long sur le cœur, ou « Ajouter à une liste ») et par l'écran Favoris (un article, ou la
// sélection : « Vers une liste », avec « Retirer de mes favoris » pour déplacer).
// Interrupteur FF-LISTE-ENVIES fermé : seule la liste du cœur existe ; la feuille n'est pas proposée.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { chemin } from '../config/pages'
import { source, type ListeEnvies } from '../donnees/source'
import { jourSeul } from '../i18n/dates'
import { usePreferences, type Langue } from '../preferences'
import { useMajSession, useSession } from '../session'
import { Feuille } from './Feuille'
import { Icone } from './Icone'

// Icône d'une liste, d'après son nom (l'occasion n'est pas enregistrée à part).
export function iconeListe(l: ListeEnvies): string {
  if (l.favoris) return 'heart'
  const n = l.nom.toLowerCase()
  if (/anniv|birthday/.test(n)) return 'cake'
  if (/mariage|dot|wedding|dowry/.test(n)) return 'party-popper'
  if (/rentr|école|school/.test(n)) return 'backpack'
  if (/naissance|bébé|baby|birth/.test(n)) return 'baby'
  if (/crémaill|maison|house/.test(n)) return 'house'
  return 'gift'
}

type Tf = (m: string, v: Record<string, string | number>) => string
type T = (m: string) => string

// Statut d'une liste, en clair : où elle en est (pastille) et ce qu'elle contient (une ligne, accords justes).
export function statutListe(l: ListeEnvies, t: T, tf: Tf, langue: Langue): { pastille: { classe: string; icone: string; texte: string }; ligne: string } {
  const n = l.articles.length
  const o = l.articles.filter((a) => a.offert).length
  const articles = n === 0 ? t('Vide pour l’instant') : tf(n > 1 ? '{n} articles' : '{n} article', { n })
  const dons = o ? ' · ' + tf(o > 1 ? '{o} offerts' : '{o} offert', { o }) : ''
  const remise = l.favoris ? t('liste du cœur') : l.mode === 'groupe' && l.remiseLe ? tf('remise groupée le {d}', { d: jourSeul(l.remiseLe, langue) }) : t('remise au fil de l’eau')
  const pastille = l.demarree
    ? { classe: 'green', icone: 'truck', texte: t('Livraison démarrée') }
    : l.partage
      ? { classe: 'or', icone: 'link', texte: t('Partagée') }
      : { classe: 'ink', icone: 'lock', texte: t('Privée') }
  return { pastille, ligne: `${articles}${dons} · ${remise}` }
}

export interface ArticleAAjouter {
  p: string
  titre: string
  favori?: string // id du favori (écran Favoris) : pour « Retirer de mes favoris »
}

export function FeuilleAjoutListe({ ouverte, fermer, articles, deplacer = false, fini }: { ouverte: boolean; fermer: () => void; articles: ArticleAAjouter[]; deplacer?: boolean; fini: (message: string) => void }) {
  const { t, tf, langue } = usePreferences()
  const { interrupteurs, connecte } = useSession()
  const majSession = useMajSession()
  const [listes, setListes] = useState<ListeEnvies[] | null>(null)
  const [nom, setNom] = useState<string | null>(null) // « Nouvelle liste » ouverte : le nom saisi
  const [retirer, setRetirer] = useState(false)
  const [occupe, setOccupe] = useState(false)
  useEffect(() => {
    if (!ouverte) return
    setNom(null)
    setRetirer(false)
    source.listes().then(
      (d) => setListes(d.listes),
      () => setListes([]),
    )
  }, [ouverte])
  const ouvert = interrupteurs['FF-LISTE-ENVIES']
  // Depuis Favoris, la liste du cœur est celle d'où l'on part : seules les listes nommées sont proposées.
  const visibles = (listes ?? []).filter((l) => ouvert || l.favoris).filter((l) => !(deplacer && l.favoris))
  const titre = articles.length > 1 ? tf('Ajouter {n} articles à une liste', { n: articles.length }) : t('Ajouter à une liste')

  const ajouter = async (l: ListeEnvies) => {
    if (occupe) return
    setOccupe(true)
    const dedans = new Set(l.articles.map((a) => a.p))
    const nouveaux = articles.filter((a) => !dedans.has(a.p))
    for (const a of nouveaux) await source.ajouterArticleListe(l.favoris ? 'favoris' : l.id, a.p)
    if (deplacer && retirer) for (const a of articles) if (a.favori) await source.retirerFavori(a.favori)
    majSession(await source.session())
    setOccupe(false)
    const nomL = l.favoris ? t('Mes favoris') : t(l.nom)
    fini(
      !nouveaux.length
        ? tf(articles.length > 1 ? 'Ces articles sont déjà dans « {l} ».' : 'Déjà dans « {l} ».', { l: nomL })
        : deplacer && retirer
          ? tf(nouveaux.length > 1 ? '{n} articles déplacés vers « {l} ».' : '{n} article déplacé vers « {l} ».', { n: nouveaux.length, l: nomL })
          : nouveaux.length > 1
            ? tf('{n} articles ajoutés à « {l} ».', { n: nouveaux.length, l: nomL })
            : tf('« {p} » ajouté à « {l} ».', { p: t(nouveaux[0].titre), l: nomL }),
    )
    fermer()
  }
  const creer = async () => {
    const n = (nom ?? '').trim()
    if (!n || occupe) return
    setOccupe(true)
    const l = await source.creerListe({ nom: n, mode: 'fil', remiseLe: null, surprise: false })
    setOccupe(false)
    await ajouter(l)
  }

  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={titre} classe="al-f">
      <h3 className="al-t">{titre}</h3>
      {articles.length === 1 && <p className="al-s">{t(articles[0].titre)}</p>}
      {!connecte ? (
        <div className="btns">
          <Link to={chemin('connexion', { next: location.pathname + location.search })} className="btn primary">
            <span>{t('Me connecter pour créer mes listes')}</span>
          </Link>
        </div>
      ) : (
        <>
          <ul className="al-l" aria-busy={!listes}>
            {visibles.map((l) => {
              const s = statutListe(l, t, tf, langue)
              const tous = articles.every((a) => l.articles.some((x) => x.p === a.p))
              return (
                <li key={l.id}>
                  <button type="button" className="al-r" disabled={occupe} onClick={() => ajouter(l)}>
                    <span className="ic-sq or">
                      <Icone nom={iconeListe(l)} taille={20} />
                    </span>
                    <span className="grow">
                      <b>{l.favoris ? t('Mes favoris') : t(l.nom)}</b>
                      <span className="al-st">
                        <span className={'pill sm ' + s.pastille.classe}>
                          <Icone nom={s.pastille.icone} taille={12} />
                          {s.pastille.texte}
                        </span>
                        <span>{s.ligne}</span>
                      </span>
                    </span>
                    {tous ? (
                      <span className="al-ok" aria-label={t('Déjà dedans')}>
                        <Icone nom="check" taille={18} trait={2.4} />
                      </span>
                    ) : (
                      <Icone nom="plus" taille={20} style={{ color: 'var(--or-txt)' }} />
                    )}
                  </button>
                </li>
              )
            })}
            {ouvert && (
              <li>
                {nom === null ? (
                  <button type="button" className="al-r al-n" onClick={() => setNom('')}>
                    <span className="ic-sq">
                      <Icone nom="list-plus" taille={20} />
                    </span>
                    <span className="grow">
                      <b>{t('Nouvelle liste')}</b>
                      <span className="al-st">{t('Anniversaire, mariage, rentrée… l’article y entre tout de suite')}</span>
                    </span>
                  </button>
                ) : (
                  <form
                    className="al-c"
                    onSubmit={(e) => {
                      e.preventDefault()
                      void creer()
                    }}
                  >
                    <label htmlFor="al-nom">{t('Nom de la nouvelle liste')}</label>
                    <div className="inp">
                      <input id="al-nom" autoFocus maxLength={40} value={nom} placeholder={t('Ex. : Mon anniversaire')} onChange={(e) => setNom(e.target.value)} />
                    </div>
                    <button type="submit" className="btn primary" disabled={!nom.trim() || occupe}>
                      <Icone nom="plus" taille={18} />
                      <span>{t('Créer et ajouter')}</span>
                    </button>
                  </form>
                )}
              </li>
            )}
          </ul>
          {deplacer && articles.some((a) => a.favori) && (
            <label className="al-dep">
              <input type="checkbox" checked={retirer} onChange={(e) => setRetirer(e.target.checked)} />
              <span>{t('Retirer de mes favoris (déplacer)')}</span>
            </label>
          )}
        </>
      )}
    </Feuille>
  )
}
