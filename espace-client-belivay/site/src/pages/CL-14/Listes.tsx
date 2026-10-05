// Écran « Mes listes d’envies » (CL-14), forme d'origine du prototype rendue réelle (DP-54) : les puces des listes
// (avec leur nombre d'articles), la liste par défaut (les favoris : un cœur sur une fiche l'ajoute ; « Baisse de
// prix » quand un favori a baissé depuis son ajout), les listes nommées (anniversaire, mariage, rentrée, dot…) avec
// leurs articles offerts (barre), leur remise (groupée à une date ou au fil de l'eau) et leur partage ; sans liste
// nommée : « Aucune autre liste » et « Nouvelle liste ». Interrupteur FF-LISTE-ENVIES fermé : une seule liste,
// les Sauvegardés. Le corps de la page sert aussi de fond à « Nouvelle liste » (ListeCreer).
// Échanges (DP-54 ; donnees/echanges.ts), sous les listes : un panier payé pour un proche (?envoi=commande : coche,
// confettis, ce que chacun paie) ; les colis offerts ou envoyés à accepter (ce que l'on paie au retrait, refus) ; les
// listes des proches (suivre, rappel avant la date, offrir) ; les anniversaires à venir (offrir, cotiser à plusieurs).
// Pour tout le monde (DP-54) : un visiteur sans compte voit « Créer ma liste », qui passe par l'inscription (compte
// au Cameroun, ou compte diaspora depuis l'étranger) et revient à la création (paramètre next).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { RAPPELS_JOURS } from '../../donnees/echanges'
import { source, type CommandePassee, type Favori, type ListeEnvies } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { CartesFavoris } from './ListeEnvies'
import { offerts, useListes } from './Commun'
import { CarteColis, joursAvant, useEchanges } from './Echanges'

const OUVERT = INTERRUPTEURS_DU_LANCEMENT['FF-LISTE-ENVIES']

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

export function BandeauInterrupteur() {
  const { t } = usePreferences()
  if (OUVERT) return null
  return (
    <div className="cl14-top">
      <span className="cl14-ff">
        <Icone nom="lock" taille={13} />
        {t('Après le lancement · interrupteur fermé')}
      </span>
      <span className="cl14-ffc">{t('FF-LISTE-ENVIES')}</span>
    </div>
  )
}

// Puces des listes : « Toutes » et chaque liste avec son nombre d'articles ; `on` : la liste ouverte.
// Dès 1024 px, elles deviennent la liste verticale de gauche du maître-détail (MaitreListes, § 5.12) : la rangée de
// puces du contenu laisse alors sa place.
export function PucesListes({ listes, on, colonne }: { listes: ListeEnvies[]; on: string | null; colonne?: boolean }) {
  const { t } = usePreferences()
  const grand = useDes('tab-l')
  if (grand && !colonne) return null
  if (colonne)
    return (
      <>
        <div className="kick">{t('Mes listes')}</div>
        <ul>
          <li>
            <Link to={chemin('listes')} className={on === null ? 'on' : undefined} aria-current={on === null ? 'page' : undefined}>
              <Icone nom="layout-list" taille={18} />
              <span className="grow">{t('Toutes ')}</span>
              <span className="n">{listes.length}</span>
            </Link>
          </li>
          {listes.map((l) => (
            <li key={l.id}>
              <Link to={chemin('liste-envies', { id: l.id })} className={on === l.id ? 'on' : undefined} aria-current={on === l.id ? 'page' : undefined}>
                <Icone nom={iconeListe(l)} taille={18} />
                <span className="grow">{t(l.nom)}</span>
                <span className="n">{l.articles.length}</span>
              </Link>
            </li>
          ))}
        </ul>
        {OUVERT && (
          <Link to={chemin('liste-creer')} className="btn soft">
            <Icone nom="plus" taille={18} />
            <span>{t('Nouvelle liste')}</span>
          </Link>
        )}
      </>
    )
  return (
    <div className="chips">
      <Link to={chemin('listes')} className={'chip' + (on === null ? ' on' : '')}>
        {t('Toutes ')}
        <span className="n">{listes.length}</span>
      </Link>
      {listes.map((l) => (
        <Link key={l.id} to={chemin('liste-envies', { id: l.id })} className={'chip' + (on === l.id ? ' on' : '')}>
          {t(l.nom) + ' '}
          <span className="n">{l.articles.length}</span>
        </Link>
      ))}
    </div>
  )
}

// Maître-détail des listes d'envies dès 1024 px : les listes à gauche, la liste ouverte (ou toutes) à droite. Sous ce
// palier, rien n'est enveloppé.
export function MaitreListes({ listes, on, children }: { listes: ListeEnvies[]; on: string | null; children: ReactNode }) {
  const { t } = usePreferences()
  const grand = useDes('tab-l')
  if (!grand) return <>{children}</>
  return (
    <div className="g5-md">
      <nav className="g5-md-l" aria-label={t('Mes listes')}>
        <PucesListes listes={listes} on={on} colonne />
      </nav>
      <div className="g5-md-d">{children}</div>
    </div>
  )
}

// Le corps de « Mes listes » : puces, cartes des listes, indication du cœur.
export function CorpsListes({ listes, favoris }: { listes: ListeEnvies[]; favoris: Favori[] }) {
  const { t, tf, langue } = usePreferences()
  const nommees = listes.filter((l) => !l.favoris)
  const baisse = favoris.some((f) => f.prixAvant !== null && f.prixAvant > f.prix)
  const vignettes = (l: ListeEnvies, fin: ReactNode) => (
    <div className="row mt10" style={{ gap: '6px', flexWrap: 'wrap' }}>
      {l.articles.slice(0, 6).map((a) => (
        <span key={a.p} className="thumb" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
          <Dessin id={a.dessin} />
        </span>
      ))}
      <span className="grow"></span>
      {fin}
    </div>
  )
  const pillePartage = (l: ListeEnvies) =>
    l.partage ? (
      <span className="pill or sm">
        <Icone nom="link" taille={13} />
        {t('Partagée')}
      </span>
    ) : (
      <span className="pill ink sm">{t('Pas encore partagée')}</span>
    )
  const resume = (l: ListeEnvies) => {
    const n = l.articles.length
    const o = offerts(l)
    if (l.mode === 'groupe' && l.remiseLe) {
      const d = jourSeul(l.remiseLe, langue)
      return o ? tf('{n} article(s) · {o} offert(s). Remise groupée le {d}.', { n, o, d }) : tf('{n} article(s) · remise groupée le {d}.', { n, d })
    }
    return o ? tf('{n} article(s) · {o} offert(s). Au fil de l’eau.', { n, o }) : tf('{n} article(s) · au fil de l’eau.', { n })
  }
  return (
    <>
      <PucesListes listes={listes} on={null} />
      {listes.map((l) => (
        <Link key={l.id} to={chemin('liste-envies', { id: l.id })} className="card" style={{ display: 'block' }}>
          <div className="row">
            <span className="ic-sq or">
              <Icone nom={iconeListe(l)} taille={22} />
            </span>
            <div className="grow">
              <div className="t15 b8">{t(l.nom)}</div>
              <div className="t13 c3" style={{ marginTop: '2px', lineHeight: '1.4' }}>
                {l.favoris ? tf('Liste par défaut · {n} article(s). La même que tes Sauvegardés du panier.', { n: l.articles.length }) : resume(l)}
              </div>
            </div>
            <Icone nom="chevron-right" taille={18} style={{ color: 'var(--ink-4)' }} />
          </div>
          {!l.favoris && offerts(l) > 0 && (
            <div className="cl14-q" style={{ gridTemplateColumns: `repeat(${l.articles.length},1fr)` }}>
              {l.articles.map((a) => (
                <i key={a.p} className={a.offert ? 'on' : ''}></i>
              ))}
            </div>
          )}
          {(l.articles.length > 0 || !l.favoris) &&
            vignettes(
              l,
              l.favoris ? (
                baisse ? (
                  <span className="pill green sm">{t('Baisse de prix')}</span>
                ) : l.partage ? (
                  pillePartage(l)
                ) : null
              ) : (
                pillePartage(l)
              ),
            )}
        </Link>
      ))}
      {!nommees.length ? (
        <div className="empty">
          <div className="ei">
            <Icone nom="list-checks" taille={26} />
          </div>
          <h3>{t('Aucune autre liste')}</h3>
          <p>{t('Crée une liste pour un anniversaire, un mariage, la rentrée ou une dot, puis envoie-la à tes proches.')}</p>
          <div className="btns" style={{ justifyContent: 'center' }}>
            <Link to={chemin('liste-creer')} className="btn primary">
              <Icone nom="plus" taille={18} />
              <span>{t('Nouvelle liste')}</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="btns">
          <Link to={chemin('liste-creer')} className="btn soft">
            <Icone nom="plus" taille={18} />
            <span>{t('Nouvelle liste')}</span>
          </Link>
        </div>
      )}
      <div className="hint-l">
        <Icone nom="heart" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Tu suis des produits, jamais des boutiques : un cœur sur une fiche ajoute l’article à tes favoris.')}</span>
      </div>
    </>
  )
}

export function useFavoris(): [Favori[], () => void] {
  const [f, setF] = useState<Favori[]>([])
  const [v, setV] = useState(0)
  useEffect(() => {
    source.favoris().then((x) => setF(x.favoris))
  }, [v])
  return [f, () => setV((x) => x + 1)]
}

// Visiteur sans compte : ce qu'est une liste d'envies, et « Créer ma liste » (inscription, puis la création).
function ListesVisiteur() {
  const { t } = usePreferences()
  const suite = chemin('liste-creer')
  return (
    <Ecran route="listes">
      <Styles id="02f3dac5cd" />
      <BandeauInterrupteur />
      <div className="empty">
        <div className="ei">
          <Icone nom="gift" taille={26} />
        </div>
        <h3>{t('Ta liste d’envies, offerte d’où qu’on soit')}</h3>
        <p>{t('Anniversaire, mariage, rentrée, dot, naissance : crée ta liste, mets-la en statut, et tes proches t’offrent tes cadeaux en Mobile Money au Cameroun ou par carte depuis l’étranger.')}</p>
        <div className="btns" style={{ justifyContent: 'center' }}>
          <Link to={chemin('connexion', { next: suite })} className="btn primary">
            <Icone nom="plus" taille={18} />
            <span>{t('Créer ma liste')}</span>
          </Link>
        </div>
      </div>
      <div className="links">
        <Link to={chemin('inscription-diaspora', { next: suite })}>{t('Je vis à l’étranger : ouvrir un compte diaspora')}</Link>
        <Link to={chemin('connexion', { next: chemin('listes') })}>{t('J’ai déjà un compte : me connecter')}</Link>
      </div>
      <div className="hint-l">
        <Icone nom="link" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Pour offrir un cadeau sur la liste d’un proche, pas besoin de compte : ouvre simplement le lien ou le QR code de son statut.')}</span>
      </div>
    </Ecran>
  )
}

export function Listes() {
  const { t } = usePreferences()
  const { connecte } = useSession()
  const [d] = useListes()
  const [favoris] = useFavoris()
  // Dès 1024, la barre de titre nomme la page comme le menu du compte (« Favoris › Listes d’envies »).
  const grand = useDes('tab-l')
  if (OUVERT && !connecte) return <ListesVisiteur />
  if (!d) return null
  // Interrupteur fermé : une seule liste, celle du cœur des fiches et des Sauvegardés du panier.
  if (!OUVERT)
    return (
      <Ecran route="listes" titre="Sauvegardés" sousTitre={null}>
        <Styles id="02f3dac5cd" />
        <BandeauInterrupteur />
        <div className="pg">
          <h1 className="pg-t">{t('Sauvegardés')}</h1>
          <p className="pg-s">{t('Interrupteur fermé : une seule liste, sans liste nommée ni partage.')}</p>
        </div>
        <CartesFavoris />
        <div className="hint-l">
          <Icone nom="heart" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Une seule liste : celle du cœur des fiches et des Sauvegardés du panier.')}</span>
        </div>
      </Ecran>
    )
  return (
    <Ecran route="listes" gabarit="compte" titre={grand ? 'Listes d’envies' : undefined}>
      <Styles id="02f3dac5cd" />
      <BandeauInterrupteur />
      <MaitreListes listes={d.listes} on={null}>
        <CorpsListes listes={d.listes} favoris={favoris} />
        <EchangesListes />
      </MaitreListes>
    </Ecran>
  )
}

// Les échanges avec les proches, sous les listes.
function EchangesListes() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const envoi = params.get('envoi')
  const [e, recharger] = useEchanges()
  const [cmd, setCmd] = useState<CommandePassee | null>(null)
  useEffect(() => {
    if (envoi) source.commandePassee(envoi).then(setCmd)
  }, [envoi])
  if (!e) return null
  const recus = e.colis.filter((c) => c.sens === 'recu' && c.etat !== 'retire')
  const envoyes = e.colis.filter((c) => c.sens === 'envoye').slice(0, 3)
  const suivies = new Map(e.suivies.map((x) => [x.code, x]))
  const listes = [...e.proches.filter((p) => p.liste).map((p) => ({ prenom: p.prenom, ...p.liste! })), ...e.suivies.filter((x) => !e.proches.some((p) => p.liste?.code === x.code)).map((x) => ({ prenom: x.prenom, code: x.code, nom: x.nom, remiseLe: x.remiseLe, offerts: 0, articles: 0 }))]
  const anniversaires = e.proches.filter((p) => p.anniversaire && p.anniversaire >= e.maintenant && p.anniversaire - e.maintenant < 60 * 864e5).sort((a, b) => a.anniversaire! - b.anniversaire!)
  const dans = (le: number) => {
    const n = joursAvant(le, e.maintenant)
    return n === 0 ? t('aujourd’hui') : tf(n > 1 ? 'dans {n} jours' : 'dans {n} jour', { n })
  }
  return (
    <>
      {envoi && cmd?.pour && (
        <div className="card">
          <div className="cl14-check blv-succes">
            <Icone nom="check" taille={30} trait={2.4} />
          </div>
          <div className="cl14-center">
            <div className="pg">
              <h1 className="pg-t">{tf('Payé pour {p}', { p: cmd.pour.prenom })}</h1>
              <p className="pg-s">{tf('Le colis part au {r}. {p} est prévenu et le retire avec son propre code.', { r: t(cmd.pour.relais), p: cmd.pour.prenom })}</p>
            </div>
          </div>
          <div className="kv">
            <span className="k">{t('Tu as payé')}</span>
            <span className="v ">{F(cmd.montant)}&nbsp;F</span>
          </div>
          <div className="kv">
            <span className="k">{tf('{p}, au retrait', { p: cmd.pour.prenom })}</span>
            <span className="v ">{cmd.pour.fraisRemise ? F(cmd.pour.fraisRemise) + ' F' : t('rien')}</span>
          </div>
          {cmd.pour.garantie > 0 && <div className="t12 c3 mt6">{tf('Ta garantie : au plus {g} F retenus sur le remboursement si {p} refuse après l’expédition.', { g: F(cmd.pour.garantie), p: cmd.pour.prenom })}</div>}
          <div className="links">
            <Link to={chemin('commande', { ref: cmd.ref })}>{tf('Suivre la commande {r}', { r: cmd.ref })}</Link>
          </div>
        </div>
      )}
      {recus.length > 0 && (
        <>
          <div className="sec">
            <h2>{t('Colis pour toi')}</h2>
          </div>
          {recus.map((c) => (
            <CarteColis key={c.id} c={c} apres={recharger} />
          ))}
        </>
      )}
      <div className="sec">
        <h2>{t('Les listes de tes proches')}</h2>
      </div>
      {listes.length ? (
        listes.map((l) => {
          const suivie = suivies.get(l.code)
          return (
            <div key={l.code} className="card blv-proche">
              <div className="row">
                <span className="ic-sq or">
                  <Icone nom={/anniv|birthday/i.test(l.nom) ? 'cake' : /naiss|baby/i.test(l.nom) ? 'baby' : 'gift'} taille={22} />
                </span>
                <div className="grow">
                  <div className="t15 b8">{tf('{p} · {n}', { p: l.prenom, n: t(l.nom) })}</div>
                  <div className="t13 c3" style={{ marginTop: '2px' }}>
                    {l.remiseLe ? tf('Remise le {d}, {q}', { d: jourSeul(l.remiseLe, langue), q: dans(l.remiseLe) }) : t('Au fil de l’eau')}
                    {l.articles > 0 ? ' · ' + tf('{o} sur {n} offerts', { o: l.offerts, n: l.articles }) : ''}
                  </div>
                </div>
              </div>
              {l.articles > 0 && (
                <div className="cl14-q" style={{ gridTemplateColumns: `repeat(${l.articles},1fr)` }}>
                  {Array.from({ length: l.articles }, (_, i) => (
                    <i key={i} className={i < l.offerts ? 'on' : ''}></i>
                  ))}
                </div>
              )}
              <div className="btns mt12">
                <Link to={chemin('liste-publique', { l: l.code })} className="btn soft">
                  <Icone nom="gift" taille={18} />
                  <span>{tf('Voir la liste de {p}', { p: l.prenom })}</span>
                </Link>
              </div>
              <div className="row mt8" style={{ gap: 12 }}>
                <span className="grow t13">{suivie ? (suivie.rappel ? tf(suivie.rappel > 1 ? 'Suivie · rappel {n} jours avant' : 'Suivie · rappel {n} jour avant', { n: suivie.rappel }) : t('Suivie · sans rappel')) : t('Suivre ses changements et la date')}</span>
                <button type="button" className={'tg' + (suivie ? ' on' : '')} role="switch" aria-checked={!!suivie} aria-label={tf('Suivre la liste de {p}', { p: l.prenom })} onClick={async () => (await source.suivreListe(l.code, !suivie, suivie?.rappel ?? (l.remiseLe ? 3 : null)), recharger())}></button>
              </div>
              {suivie && l.remiseLe && (
                <div className="chips mt8" role="radiogroup" aria-label={t('Rappel avant la date')}>
                  {RAPPELS_JOURS.map((j) => (
                    <a key={j} href="#" role="radio" aria-checked={suivie.rappel === j} className={'chip' + (suivie.rappel === j ? ' on' : '')} onClick={async (ev) => (ev.preventDefault(), await source.suivreListe(l.code, true, j), recharger())}>
                      <Icone nom="bell" taille={14} />
                      {tf(j > 1 ? '{n} jours avant' : '{n} jour avant', { n: j })}
                    </a>
                  ))}
                  <a href="#" role="radio" aria-checked={suivie.rappel === null} className={'chip' + (suivie.rappel === null ? ' on' : '')} onClick={async (ev) => (ev.preventDefault(), await source.suivreListe(l.code, true, null), recharger())}>
                    <Icone nom="bell-off" taille={14} />
                    {t('Sans rappel')}
                  </a>
                </div>
              )}
            </div>
          )
        })
      ) : (
        <div className="hint-l">
          <Icone nom="users" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Quand un proche t’envoie sa liste, elle apparaît ici : tu la suis et tu reçois un rappel avant la date.')}</span>
        </div>
      )}
      {anniversaires.length > 0 && (
        <>
          <div className="sec">
            <h2>{t('Anniversaires à venir')}</h2>
          </div>
          <div className="card tight">
            {anniversaires.map((p) => (
              <Link key={p.id} to={p.liste ? chemin('liste-publique', { l: p.liste.code }) : chemin('cotisation', { beneficiaire: p.prenom, occasion: 'Anniversaire' })} className="li">
                <span className="ic or">
                  <Icone nom="cake" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {tf('{p} · {d}', { p: p.prenom, d: jourSeul(p.anniversaire!, langue) })}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {p.liste ? tf('{q} · sa liste : choisis un cadeau', { q: dans(p.anniversaire!) }) : tf('{q} · pas de liste : offrez à plusieurs', { q: dans(p.anniversaire!) })}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
      {envoyes.length > 0 && (
        <>
          <div className="sec">
            <h2>{t('Tes cadeaux et envois')}</h2>
          </div>
          {envoyes.map((c) => (
            <CarteColis key={c.id} c={c} apres={recharger} />
          ))}
        </>
      )}
      <div className="links">
        <Link to={chemin('cotisation')}>{t('Offrir à plusieurs (cotisation)')}</Link>
        <Link to={chemin('parrainage')}>{t('Inviter un proche sur BelivaY')}</Link>
      </div>
    </>
  )
}
