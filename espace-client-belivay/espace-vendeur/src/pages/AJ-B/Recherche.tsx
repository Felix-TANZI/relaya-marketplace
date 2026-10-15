// Rechercher (AJ-B, DP-58) : une seule barre qui cherche partout dans l'espace vendeur. On l'ouvre depuis le Menu
// (barre « Rechercher partout »), le menu de l'avatar et toute page qui passe ?q= (lien profond).
// - Où : commandes (référence BLV-…, article, état), produits (titre, variante, rayon), litiges (référence, motif),
//   messages (sujet « Client de BLV-… », dernier message), versements (référence BLV-VS-…, propriétaire seulement :
//   aucun montant pour l'accès Préparation, Q-18), aide (questions fréquentes) et les écrans eux-mêmes.
// - Résultats groupés, dans cet ordre, avec leur nombre ; une référence exacte (BLV-00008, BLV-VS-4085) passe en tête.
// - Sans texte : recherches récentes (gardées sur l'appareil, effaçables) et raccourcis.
// - ANONYMAT (GEN-01) : rien du client n'est cherché ni montré (les domaines n'en portent pas).
// Tout se lit dans la source (démo ou API) ; aucune donnée écrite dans l'écran.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Vignette } from '../../composants/Dessin'
import { chemin } from '../../config/pages'
import type { Commande, StatutCommande } from '../../donnees/domaines/commandes'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useMontantsVisibles, useSession } from '../../session'
import { BandeauHorsLigne, CHAMP, dateCourte } from '../VD-11/communs'
import { lireRecents, normaliser, oublierRecents, retenirRecent } from './recents'
import './ajb.css'

const STATUTS: Record<StatutCommande, string> = {
  payee: 'Payée',
  payable_au_retrait: 'Payable au retrait',
  a_preparer: 'À préparer',
  prete: 'Prête · livreur attendu',
  chez_le_livreur: 'Chez le livreur',
  livree: 'Livrée',
  litige_gele: 'Litige en cours',
  retour_gele: 'Retour en cours',
  annulee: 'Annulée',
}

// Les écrans eux-mêmes (avec des mots proches) : « horaires », « mot de passe »…
const ECRANS: { route: string; titre: string; mots: string; icone: string; proprio?: boolean }[] = [
  { route: 'commandes', titre: 'Commandes', mots: 'préparer à faire', icone: 'shopping-bag' },
  { route: 'ramassages', titre: 'Ramassages', mots: 'livreur passage créneau calendrier remise', icone: 'truck' },
  { route: 'produits', titre: 'Mes produits', mots: 'catalogue offres stock', icone: 'package' },
  { route: 'offre1', titre: 'Ajouter un produit', mots: 'nouvelle offre publier', icone: 'plus', proprio: true },
  { route: 'litiges', titre: 'Litiges', mots: 'réclamation client problème', icone: 'scale' },
  { route: 'retours', titre: 'Retours', mots: 'inspection remplacement', icone: 'undo-2' },
  { route: 'argent', titre: 'Mon argent', mots: 'solde gagné gelé', icone: 'wallet', proprio: true },
  { route: 'versements', titre: 'Versements', mots: 'vendredi mobile money BLV-VS', icone: 'banknote', proprio: true },
  { route: 'documents', titre: 'Documents', mots: 'contrat factures relevés', icone: 'file-text', proprio: true },
  { route: 'palier', titre: 'Trust Score et palier', mots: 'score note confiance', icone: 'award' },
  { route: 'horaires', titre: 'Horaires et fermetures', mots: 'fermer aujourd’hui pause vacances', icone: 'clock' },
  { route: 'boutique', titre: 'Ma boutique', mots: 'vitrine logo description', icone: 'store' },
  { route: 'profil', titre: 'Mon profil', mots: 'photo nom e-mail téléphone langue', icone: 'circle-user-round' },
  { route: 'securite', titre: 'Sécurité, appareils et données', mots: 'mot de passe face id export', icone: 'shield-check' },
  { route: 'parametres', titre: 'Paramètres', mots: 'notifications thème taille du texte', icone: 'settings' },
  { route: 'apprendre', titre: 'Apprendre', mots: 'formation conseils photo prix colis', icone: 'graduation-cap' },
  { route: 'activite', titre: 'Activité de la boutique', mots: 'journal historique équipe qui a fait', icone: 'history' },
  { route: 'aide', titre: 'Aide', mots: 'support whatsapp contact question', icone: 'circle-help' },
]

interface Resultat {
  cle: string
  vers: string
  icone?: string
  dessin?: string
  titre: string
  sous: string
  exact?: boolean
}

/** Le texte cherché, surligné dans un libellé (sans tenir compte des accents ni de la casse). */
function Surligne({ texte, q }: { texte: string; q: string }) {
  const n = normaliser(texte)
  const i = q ? n.indexOf(q) : -1
  if (i < 0) return <>{texte}</>
  return (
    <>
      {texte.slice(0, i)}
      <mark className="ajb-mark">{texte.slice(i, i + q.length)}</mark>
      {texte.slice(i + q.length)}
    </>
  )
}

export default function Recherche() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const montants = useMontantsVisibles()
  const prep = s.membre?.role === 'preparation'
  const naviguer = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [recents, setRecents] = useState(lireRecents)
  const champ = useRef<HTMLInputElement>(null)
  useEffect(() => {
    champ.current?.focus({ preventScroll: true })
  }, [])
  // L'adresse suit le texte (retour arrière, partage d'un lien) sans empiler l'historique.
  useEffect(() => {
    const id = setTimeout(() => {
      const p = new URLSearchParams(params)
      if (q.trim()) p.set('q', q.trim())
      else p.delete('q')
      if (p.toString() !== params.toString()) setParams(p, { replace: true })
    }, 250)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const commandes = useLecture(async () => {
    const listes = await Promise.all((['prep', 'cours', 'pb', 'fin'] as const).map((f) => source.commandes.liste(f)))
    const vues = new Map<string, Commande>()
    for (const c of listes.flat()) if (!vues.has(c.ref)) vues.set(c.ref, c)
    return [...vues.values()]
  }, [s.membre?.role])
  const produits = useLecture(() => source.produits.liste(), [s.membre?.role])
  const litiges = useLecture(() => source.litiges.liste(), [s.membre?.role])
  const fils = useLecture(() => source.messages.fils(), [s.membre?.role])
  const versements = useLecture(() => (montants ? source.versements.historique('tout') : Promise.resolve(null)), [montants])
  const aide = useLecture(() => source.aide.questions(), [s.membre?.role])

  const m = normaliser(q.trim())
  const groupes = useMemo(() => {
    if (!m) return []
    const a = (...x: (string | null | undefined)[]) => normaliser(x.filter(Boolean).join(' '))
    const exacte = (ref: string) => normaliser(ref) === m || normaliser(ref).replace(/^blv-0*/, '') === m.replace(/^blv-0*/, '')
    const g: { cle: string; titre: string; icone: string; items: Resultat[]; tout?: string }[] = []
    const cmd = (commandes.donnees ?? [])
      .filter((c) => a(c.ref, ...c.lignes.map((l) => `${l.article.titre} ${l.article.variante} ${l.reference}`), t(STATUTS[c.statut])).includes(m) || exacte(c.ref))
      .map<Resultat>((c) => ({ cle: c.ref, vers: chemin('commande', { ref: c.ref }), dessin: c.lignes[0]?.article.dessin, titre: c.ref, sous: `${c.lignes.map((l) => `${l.article.titre} · ${l.article.variante}`).join(', ')} · ${t(STATUTS[c.statut])}`, exact: exacte(c.ref) }))
      .sort((x, y) => Number(!!y.exact) - Number(!!x.exact))
    if (cmd.length) g.push({ cle: 'commandes', titre: 'Commandes', icone: 'shopping-bag', items: cmd, tout: chemin('commandes') })
    const prd = (produits.donnees?.produits ?? [])
      .filter((p) => a(p.titre, p.variante, p.rayon, p.categorie).includes(m))
      .map<Resultat>((p) => ({ cle: p.id, vers: chemin('offre_detail', { p: p.id }), dessin: p.dessin, titre: `${p.titre} · ${p.variante}`, sous: tf('{rayon} · {n} en stock', { rayon: p.rayon, n: p.stock }) }))
    if (prd.length) g.push({ cle: 'produits', titre: 'Produits', icone: 'package', items: prd, tout: chemin('produits') })
    const lit = (litiges.donnees ?? [])
      .filter((l) => a(l.ref, l.motif, l.article.titre).includes(m) || exacte(l.ref))
      .map<Resultat>((l) => ({ cle: l.ref, vers: chemin('litige', { ref: l.ref }), icone: 'scale', titre: tf('Litige {ref}', { ref: l.ref }), sous: `${t(l.motif)} · ${l.article.titre}`, exact: exacte(l.ref) }))
    if (lit.length) g.push({ cle: 'litiges', titre: 'Litiges', icone: 'scale', items: lit, tout: chemin('litiges') })
    const msg = (fils.donnees ?? [])
      .filter((f) => a(f.sujet, f.ref, f.dernier?.texte, f.commande?.titre).includes(m))
      .map<Resultat>((f) => ({ cle: f.id, vers: chemin('messages', { fil: f.id }), icone: f.type === 'support' ? 'headset' : 'messages-square', titre: t(f.sujet), sous: f.dernier ? f.dernier.texte : t('Aucun message pour le moment') }))
    if (msg.length) g.push({ cle: 'messages', titre: 'Messages', icone: 'messages-square', items: msg, tout: chemin('messages') })
    const vs = (versements.donnees?.versements ?? [])
      .filter((v) => a(v.reference, v.numero, ...v.commandes.map((c) => (c as { ref?: string }).ref)).includes(m) || exacte(v.reference))
      .map<Resultat>((v) => ({ cle: v.reference, vers: chemin('versements', { periode: 'tout' }), icone: 'banknote', titre: v.reference, sous: tf('Versement du vendredi {d} · {numero}', { d: dateCourte(v.vendredi, langue, true), numero: v.numero }), exact: exacte(v.reference) }))
    if (vs.length) g.push({ cle: 'versements', titre: 'Versements', icone: 'banknote', items: vs, tout: chemin('versements', { periode: 'tout' }) })
    const aid = (aide.donnees ?? [])
      .filter((x) => a(t(x.question), x.question, x.theme).includes(m))
      .map<Resultat>((x) => ({ cle: x.id, vers: chemin('aide'), icone: 'circle-help', titre: t(x.question), sous: t('Aide · questions fréquentes') }))
    if (aid.length) g.push({ cle: 'aide', titre: 'Aide', icone: 'circle-help', items: aid, tout: chemin('aide') })
    const ecr = ECRANS.filter((e) => !(e.proprio && prep))
      .filter((e) => a(t(e.titre), e.titre, e.mots).includes(m))
      .map<Resultat>((e) => ({ cle: e.route, vers: chemin(e.route), icone: e.icone, titre: t(e.titre), sous: t('Écran') }))
    if (ecr.length) g.push({ cle: 'ecrans', titre: 'Écrans', icone: 'layout-grid', items: ecr })
    // Une référence exacte passe en tête de tout.
    g.sort((x, y) => Number(y.items.some((i) => i.exact)) - Number(x.items.some((i) => i.exact)))
    return g
  }, [m, commandes.donnees, produits.donnees, litiges.donnees, fils.donnees, versements.donnees, aide.donnees, prep, t, tf, langue])

  const total = groupes.reduce((n, g) => n + g.items.length, 0)
  const charge = !!(commandes.donnees && produits.donnees && litiges.donnees && fils.donnees && aide.donnees)
  const choisir = (vers: string) => {
    if (q.trim()) setRecents(retenirRecent(q.trim()))
    naviguer(vers)
  }

  const raccourcis: { vers: string; icone: string; libelle: string }[] = [
    { vers: chemin('commandes', { f: 'prep' }), icone: 'package-check', libelle: 'À préparer' },
    { vers: chemin('ramassages'), icone: 'truck', libelle: 'Ramassages' },
    { vers: chemin('litiges'), icone: 'scale', libelle: 'Litiges' },
    ...(montants ? [{ vers: chemin('versements'), icone: 'banknote', libelle: 'Versements' }] : []),
    ...(!prep ? [{ vers: chemin('offre1'), icone: 'plus', libelle: 'Ajouter un produit' }] : []),
    { vers: chemin('messages'), icone: 'messages-square', libelle: 'Messagerie' },
    { vers: chemin('apprendre'), icone: 'graduation-cap', libelle: 'Apprendre' },
    { vers: chemin('aide'), icone: 'circle-help', libelle: 'Aide' },
  ]
  const exemples = [commandes.donnees?.find((c) => c.statut === 'a_preparer')?.ref, montants ? versements.donnees?.versements[0]?.reference : null, produits.donnees?.produits[0]?.titre].filter((x): x is string => !!x)

  let ligne: ReactNode = null
  if (m && charge && total === 0)
    ligne = (
      <div className="card ajb-vide">
        <Icone nom="search-x" taille={28} style={{ color: 'var(--ink-3)' }} />
        <div className="b8 t15 mt8">{tf('Rien pour « {q} »', { q: q.trim() })}</div>
        <p className="t13 c2" style={{ margin: '6px 0 12px' }}>
          {t('Vérifiez la référence (BLV-00008, BLV-VS-4085) ou essayez un autre mot. Une personne du support peut aussi chercher pour vous.')}
        </p>
        <Link to={chemin('messages', { fil: 'support', sujet: q.trim() })} className="btn secondary sm">
          <Icone nom="headset" taille={18} />
          <span>{t('Demander au support')}</span>
        </Link>
      </div>
    )

  return (
    <Ecran route="recherche">
      <BandeauHorsLigne texte="Hors connexion : la recherche porte sur ce qui est gardé sur le téléphone." />
      <form
        role="search"
        className="ajb-barre"
        onSubmit={(e) => {
          e.preventDefault()
          const premier = groupes[0]?.items[0]
          if (premier) choisir(premier.vers)
        }}
      >
        <div className="inp">
          <Icone nom="search" taille={19} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          <input ref={champ} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Commande, produit, litige, BLV-VS…')} aria-label={t('Rechercher partout')} autoComplete="off" enterKeyHint="search" style={CHAMP} />
          {q && (
            <button type="button" className="ajb-effacer" onClick={() => (setQ(''), champ.current?.focus())} aria-label={t('Effacer la recherche')}>
              <Icone nom="x" taille={18} />
            </button>
          )}
        </div>
      </form>

      {!m && (
        <>
          {recents.length > 0 && (
            <div className="card">
              <div className="row">
                <h3 className="grow" style={{ margin: 0 }}>
                  {t('Recherches récentes')}
                </h3>
                <button type="button" className="ajb-lien" onClick={() => setRecents(oublierRecents())}>
                  {t('Effacer')}
                </button>
              </div>
              <div className="mt6">
                {recents.map((r) => (
                  <button key={r} type="button" className="li ajb-li-bouton" onClick={() => setQ(r)}>
                    <span className="ic">
                      <Icone nom="history" taille={18} />
                    </span>
                    <span className="grow lt">{r}</span>
                    <span className="chev">
                      <Icone nom="arrow-up-right" taille={17} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="divider-t">{t('Raccourcis')}</div>
          <div className="ajb-raccourcis">
            {raccourcis.map((r) => (
              <Link key={r.vers} to={r.vers} className="ajb-raccourci">
                <span className="ajb-raccourci-ic">
                  <Icone nom={r.icone} taille={20} />
                </span>
                <span>{t(r.libelle)}</span>
              </Link>
            ))}
          </div>
          {exemples.length > 0 && (
            <>
              <div className="divider-t">{t('Essayez')}</div>
              <div className="chips" style={{ flexWrap: 'wrap' }}>
                {exemples.map((x) => (
                  <button key={x} type="button" className="chip" style={{ minHeight: '44px' }} onClick={() => setQ(x)}>
                    {x}
                  </button>
                ))}
              </div>
            </>
          )}
          <p className="t12 c3" style={{ margin: '16px 2px 0' }}>
            {t(montants ? 'On cherche dans les commandes, produits, litiges, messages, versements, l’aide et les écrans.' : 'On cherche dans les commandes, produits, litiges, messages, l’aide et les écrans.')}
          </p>
        </>
      )}

      {m && !charge && (
        <div className="card" aria-busy="true">
          <div className="row t14 c3" style={{ gap: '10px' }}>
            <Icone nom="hourglass" taille={18} />
            <span>{t('Recherche…')}</span>
          </div>
        </div>
      )}
      {m && charge && total > 0 && (
        <p className="t13 c3" role="status" style={{ margin: '14px 2px 0' }}>
          {tf(total > 1 ? '{n} résultats' : '{n} résultat', { n: total })}
        </p>
      )}
      {ligne}
      {groupes.map((g) => (
        <div key={g.cle} className="ajb-groupe">
          <div className="divider-t row" style={{ gap: '6px' }}>
            <span className="grow">{`${t(g.titre)} · ${g.items.length}`}</span>
            {g.tout && (
              <Link to={g.tout} className="ajb-tout">
                {t('Tout voir')}
              </Link>
            )}
          </div>
          <div className="card tight" style={{ marginTop: 0 }}>
            {g.items.slice(0, 6).map((r) => (
              <Link
                key={r.cle}
                to={r.vers}
                className="li"
                style={{ minHeight: '56px' }}
                onClick={(e) => {
                  e.preventDefault()
                  choisir(r.vers)
                }}
              >
                {r.dessin ? (
                  <Vignette nom={r.dessin} taille={40} />
                ) : (
                  <span className="ic">
                    <Icone nom={r.icone ?? g.icone} taille={19} />
                  </span>
                )}
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="lt" style={{ display: 'block' }}>
                    <Surligne texte={r.titre} q={m} />
                    {r.exact && <span className="pill green sm ajb-exact">{t('Référence exacte')}</span>}
                  </span>
                  <span className="ls ajb-coupe" style={{ display: 'block' }}>
                    <Surligne texte={r.sous} q={m} />
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={17} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </Ecran>
  )
}
