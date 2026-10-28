// PR-06 · « Colis en stock » (onglet 4 du dock) : savoir où est chaque colis, lesquels traiter en premier et combien
// de places il reste. Structure du prototype (Stock) intacte : titre et compte, plan des étagères (cases colorées par
// état, taux d'occupation, légende, note de saturation), onglets, liste, carte « La grille de garde ».
// Enrichi des règles : STK-01 couleurs ; STK-02 onglets (A-VALIDER pr06 ARL-80/81 : Groupage seulement s'il y a un colis
// de liste, onglet « Hors garde » pour les constats et les retours) ; STK-04 renvoi (ARL-08 : premier jour ouvert
// après le 7e) ; STK-06/CAL-21 seuil de saturation ; STK-07 total dû à ce jour par le calcul de garde ; STK-09 grille
// v6 lue dans le registre ; STK-14 retours hors places ; recherche par référence, emplacement, classe ; puces « code
// bloqué » et « à payer au comptoir » ; occupation par classe ; inventaire. La part du relais n'est montrée qu'au
// propriétaire (PR-RC-09). Aucune donnée du client (GEN-01).
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { usePeutOuvrir } from '../../config/droits'
import type { ClasseColis } from '../../donnees/communs'
import type { CasePlan, CategorieStock, LigneStock, VueStock } from '../../donnees/domaines/stock'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { CLASSE, ETIQUETTES, Chargement, ErreurLecture, Etiquette, Vide, dateCourte, francs, rangJour } from './commun'

const ONGLETS: { id: CategorieStock; libelle: string }[] = [
  { id: 'urgents', libelle: 'Urgents' },
  { id: 'payants', libelle: 'Payants' },
  { id: 'groupage', libelle: 'Groupage' },
  { id: 'gratuits', libelle: 'Gratuits' },
  { id: 'hors_garde', libelle: 'Hors garde' },
]
/** États du prototype (?etat=pay|grp|free) : lien direct vers un onglet. */
const ETAT_PROTOTYPE: Record<string, CategorieStock> = { pay: 'payants', grp: 'groupage', free: 'gratuits' }
const CLE_ONGLET = 'blv_r_stock_onglet'
const PAR_PAGE = 8

function ongletGarde(): CategorieStock | null {
  try {
    const v = sessionStorage.getItem(CLE_ONGLET)
    return ONGLETS.some((o) => o.id === v) ? (v as CategorieStock) : null
  } catch {
    return null
  }
}

/** Ce qu'une ligne dit du colis (sans jamais nommer le client). */
function useSousLigne() {
  const { t, tf, langue } = usePreferences()
  return (l: LigneStock): string => {
    const c = l.colis
    const g = c.garde
    const taille = t(CLASSE[c.classe])
    const morceaux: string[] = [taille]
    switch (l.etiquette) {
      case 'a_renvoyer':
        morceaux.push(t('non retiré en 7 jours'), l.depart?.heure ? tf('part à {h}', { h: heure(l.depart.heure, langue) }) : t('prochaine collecte'))
        break
      case 'a_faire_partir':
        morceaux.push(c.etat === 'refuse_comptoir' ? t('refusé au comptoir') : t('décision du constat'), l.depart?.heure ? tf('part à {h}', { h: heure(l.depart.heure, langue) }) : t('prochaine collecte'))
        break
      case 'transfert':
        morceaux.push(t('le client a changé de relais'), t('prochaine collecte'))
        break
      case 'dernier_jour':
      case 'payant':
        if (g?.rang) morceaux.push(rangJour(g.rang, tf, t))
        morceaux.push(francs(g?.du ?? 0))
        break
      case 'gratuit':
        if (g?.rang) morceaux.push(rangJour(g.rang, tf, t))
        morceaux.push(g?.encaissee ? t('garde déjà réglée') : g?.rang === 1 ? t('gratuit aujourd’hui') : t('rien à payer'))
        break
      case 'pas_prevenu':
        morceaux.push(t('garde pas commencée'))
        break
      case 'incomplet':
        morceaux.push(tf('{n} colis sur {total} arrivés', { n: l.groupe.auRelais, total: l.groupe.total }))
        break
      case 'groupage':
        morceaux.push(t('liste groupée'), c.groupageJusquau ? tf('remise le {d}', { d: dateCourte(c.groupageJusquau, langue) }) : t('sans frais'))
        break
      case 'constat':
        morceaux.push(c.constat ? tf('constat {ref}', { ref: c.constat }) : t('constat en cours'), t('sans frais'))
        break
      case 'retour':
        morceaux.push(t('retour déposé'), t('jamais facturé'))
        break
    }
    if (c.paiement.mode === 'au_comptoir' && c.paiement.etat !== 'confirme') morceaux.push(t('à payer au comptoir'))
    if (c.code.bloqueJusqua) morceaux.push(t('code bloqué'))
    if (c.fragile) morceaux.push(t('fragile'))
    if (l.remplacement) morceaux.push(t('Remplacement'))
    return morceaux.join(' · ')
  }
}

function Case({ k, choisie, choisir }: { k: CasePlan; choisie: boolean; choisir: (code: string) => void }) {
  const { t, tf } = usePreferences()
  const cls = (k.etiquette ? ETIQUETTES[k.etiquette].kase : 'p-dg5xf2') + ' r6-case'
  const corps = (
    <>
      <span className="r-ref">{k.code}</span>
      <span className="r6-case-n">{tf('{n}/{total}', { n: k.occupee, total: k.capacite })}</span>
    </>
  )
  const nom = k.etiquette ? tf('Case {c} · {n} colis · {etat}', { c: k.code, n: k.colis.length, etat: t(ETIQUETTES[k.etiquette].libelle) }) : tf('Case {c} · libre', { c: k.code })
  if (!k.colis.length)
    return (
      <div className={cls} role="img" aria-label={nom}>
        {corps}
      </div>
    )
  if (k.colis.length === 1)
    return (
      <Link className={cls} to={chemin('colis', { ref: k.colis[0] })} aria-label={nom}>
        {corps}
      </Link>
    )
  return (
    <button type="button" className={cls} aria-label={nom} aria-pressed={choisie} onClick={() => choisir(k.code)}>
      {corps}
    </button>
  )
}

const ETAGERES: { e: 'A' | 'B' | 'C'; classe: ClasseColis; un: string; plusieurs: string; grille: string }[] = [
  { e: 'A', classe: 'S', un: 'ÉTAGÈRE A · PETITS ({n} PLACE)', plusieurs: 'ÉTAGÈRE A · PETITS ({n} PLACES)', grille: 'p-dwkjr6' },
  { e: 'B', classe: 'M', un: 'ÉTAGÈRE B · MOYENS ({n} PLACE)', plusieurs: 'ÉTAGÈRE B · MOYENS ({n} PLACES)', grille: 'p-ibectq' },
  { e: 'C', classe: 'L', un: 'SOL C · ENCOMBRANTS ({n} PLACE)', plusieurs: 'SOL C · ENCOMBRANTS ({n} PLACES)', grille: 'p-fha0sl' },
]

function Plan({ v, emplacement, choisir }: { v: VueStock; emplacement: string | null; choisir: (c: string) => void }) {
  const { t, tf } = usePreferences()
  const o = v.occupation
  return (
    <div className="p-yi6rkz" aria-labelledby="r6-plan-t">
      <div className="p-f623oo">
        <div className="p-unncbq">
          <h2 className="p-9j1bbu" id="r6-plan-t">
            {t('Plan des étagères')}
          </h2>
        </div>
        <div className="p-q0l0xx" aria-label={tf('{taux} % des places occupées', { taux: o.taux })}>
          {tf('{taux} %', { taux: o.taux })}
        </div>
      </div>
      <div className="r6-classes">
        {(['S', 'M', 'L'] as const).map((k) => (
          <span key={k} className="r6-classe">
            <b>{t(CLASSE[k])}</b> {tf('{n} colis · {p} places', { n: o.parClasse[k].colis, p: o.parClasse[k].places })}
          </span>
        ))}
        {o.retours > 0 && <span className="r6-classe">{tf('Retours : {n} (hors places)', { n: o.retours })}</span>}
      </div>
      {ETAGERES.map((x) => {
        const cases = v.plan.filter((k) => k.etagere === x.e)
        if (!cases.length) return null
        const n = v.regles.places[x.classe]
        return (
          <div key={x.e} className="r6-etagere">
            <div className="p-yscrc8 r6-etagere-t">
              <span>{tf(n > 1 ? x.plusieurs : x.un, { n })}</span>
              <span>{tf('{n}/{total} places', { n: cases.reduce((a, k) => a + k.occupee, 0), total: cases.reduce((a, k) => a + k.capacite, 0) })}</span>
            </div>
            <div className={x.grille + ' r6-cases'}>
              {cases.map((k) => (
                <Case key={k.code} k={k} choisie={emplacement === k.code} choisir={choisir} />
              ))}
            </div>
          </div>
        )
      })}
      <div className="p-8dmjde">
        <span className="p-ekng8o">{t('À faire partir')}</span>
        <span className="p-h4wlx0">{t('Dernier jour')}</span>
        <span className="p-yw05h9">{t('Garde payante')}</span>
        {v.speciaux.groupage > 0 && <span className="p-rpzy79">{t('Groupage')}</span>}
        <span className="p-nax3x4">{t('Gratuit')}</span>
        <span className="r6-pill-neutre">{t('Hors garde')}</span>
        <span className="r6-pill-libre">{t('Libre')}</span>
      </div>
      <div className="p-81u2s6">{tf('Touchez une case pour ouvrir le colis. À {seuil} %, BelivaY cesse d’envoyer de nouveaux colis ici.', { seuil: o.seuilPct })}</div>
    </div>
  )
}

function Grille({ v }: { v: VueStock }) {
  const { t, tf, langue } = usePreferences()
  const g = v.grille
  const jours = g.paliers[g.paliers.length - 1].a
  const libelle = (de: number, a: number) => (de === a ? tf('J{n}', { n: de }) : tf('J{de}–J{a}', { de, a }))
  const heureRappel = `${String(Math.floor(g.heureRappel / 60)).padStart(2, '0')}:${String(g.heureRappel % 60).padStart(2, '0')}`
  return (
    <div className="p-26n637" aria-labelledby="r6-grille-t">
      <div className="p-xmy0fy" id="r6-grille-t">
        {t('LA GRILLE DE GARDE')}
      </div>
      <div className="p-0jgkhm r6-grille">
        {g.paliers.map((p) => (
          <div key={p.de} className="p-nh2jfo">
            <div className="p-60x9ee">{libelle(p.de, p.a)}</div>
            <div className={p.tarif === 0 ? 'p-xnxtpi' : p.de >= 6 ? 'p-3hgrs4' : 'p-4sfgcn'}>{p.de !== p.a ? tf('{m} / jour', { m: francs(p.tarif) }) : francs(p.tarif)}</div>
          </div>
        ))}
        <div className="p-6fksbw">
          <div className="p-60x9ee">{tf('J{n}', { n: g.paliers[g.paliers.length - 1].a + 1 })}</div>
          <div className="p-38tfl1">{g.renvoi > 0 ? tf('renvoi + {m}', { m: francs(g.renvoi) }) : tf('renvoi au vendeur · garde de {m} au plus', { m: francs(g.totalSeptJours) })}</div>
        </div>
      </div>
      <div className="p-yz5dyd">
        {g.gainJour !== null && (
          <>
            {t('Vous touchez')}{' '}
            <strong className="p-ipp0fd">{tf('{m} par jour de garde', { m: francs(g.gainJour) })}</strong>
            {g.j1PayeParBelivay ? tf(', 1er jour compris (payé par BelivaY) : jusqu’à {m} sur {n} jours. ', { m: francs(g.gainJour * jours), n: jours }) : '. '}
          </>
        )}
        {t('La garde se paie en espèces, en une fois, au retrait : encaissez-la avant de remettre. Elle se compte une fois par commande et ne dépasse jamais la valeur des colis.')}{' '}
        {t('Jamais facturés : jours de fermeture, client pas encore prévenu, constat ou litige.')}{' '}
        {g.ajoutGros > 0 && tf('Gros carton : + {m} par jour. ', { m: francs(g.ajoutGros) })}
        {tf('BelivaY envoie les rappels au client à {h} ; vous n’avez rien à envoyer. Chaque commande garde sa grille : un changement est annoncé {n} jours avant, jamais rétroactif.', { h: heure(heureRappel, langue), n: g.preavisJours })}
      </div>
    </div>
  )
}

export default function Stock() {
  const { t, tf } = usePreferences()
  const [params, setParams] = useSearchParams()
  const naviguer = useNavigate()
  const peutDeparts = usePeutOuvrir('departs')
  // « stock?onglet=<catégorie> » (urgents, payants, groupage, gratuits, hors_garde) : un seul nom par onglet (ARL-45).
  const [onglet, setOnglet] = useState<CategorieStock>(() => ONGLETS.find((o) => o.id === params.get('onglet'))?.id ?? ETAT_PROTOTYPE[params.get('etat') ?? ''] ?? ongletGarde() ?? 'urgents')
  const [q, setQ] = useState('')
  const [classe, setClasse] = useState<ClasseColis | null>(null)
  const [codeBloque, setCodeBloque] = useState(false)
  const [auComptoir, setAuComptoir] = useState(false)
  const [emplacement, setEmplacement] = useState<string | null>(params.get('case'))
  const [tout, setTout] = useState(false)
  const liste = useRef<HTMLDivElement>(null)
  const lecture = useLecture(() => source.stock.vue({ q, classe, codeBloque, auComptoir, emplacement }), [q, classe, codeBloque, auComptoir, emplacement])
  const inv = useLecture(() => source.stock.inventaire(), [])
  const sousLigne = useSousLigne()
  const v = lecture.donnees
  const onglets = useMemo(() => ONGLETS.filter((o) => o.id !== 'groupage' || (v?.speciaux.groupage ?? 0) > 0), [v?.speciaux.groupage])
  const actif = onglets.some((o) => o.id === onglet) ? onglet : 'urgents'

  useEffect(() => {
    try {
      sessionStorage.setItem(CLE_ONGLET, actif)
    } catch {
      /* stockage refusé : l'onglet vaut pour la visite */
    }
  }, [actif])

  const choisirOnglet = (id: CategorieStock) => {
    setOnglet(id)
    setTout(false)
    setEmplacement(null)
    const p = new URLSearchParams(params)
    p.set('onglet', id)
    p.delete('etat')
    p.delete('case')
    setParams(p, { replace: true })
    signal('toucher')
  }
  const toucheOnglet = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = onglets.findIndex((o) => o.id === actif)
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const suivant = onglets[(i + d + onglets.length) % onglets.length]
    choisirOnglet(suivant.id)
    document.getElementById('r6-t-' + suivant.id)?.focus()
  }
  const choisirCase = (code: string) => {
    setEmplacement((x) => (x === code ? null : code))
    setTout(true)
    signal('toucher')
    requestAnimationFrame(() => liste.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
  }
  const effacer = () => {
    setQ('')
    setClasse(null)
    setCodeBloque(false)
    setAuComptoir(false)
    setEmplacement(null)
  }
  const filtre = !!(q || classe || codeBloque || auComptoir || emplacement)

  const contenu = () => {
    if (lecture.erreur) return <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />
    if (!v) return <Chargement lignes={6} titre="Chargement du stock…" />
    const o = v.occupation
    const lignes = emplacement ? v.lignes : v.lignes.filter((l) => l.categorie === actif)
    const visibles = tout ? lignes : lignes.slice(0, PAR_PAGE)
    const reste = lignes.length - visibles.length
    const enCours = inv.donnees && !inv.donnees.termineA
    return (
      <>
        <div>
          <h1 className="p-bvhkrl">{t('Colis en stock')}</h1>
          <div className="p-t2u0o2">{tf('{n} colis · {occ} places sur {decl}', { n: v.totalColis, occ: o.occupees, decl: o.declarees })}</div>
        </div>
        {o.seuilAtteint && (
          <div className="r6-alerte" role="alert">
            <Icone nom="triangle-alert" taille={20} />
            <div>
              <b>{tf('Relais saturé : {taux} % des places occupées.', { taux: o.taux })}</b>{' '}
              {t('BelivaY n’envoie plus de nouveaux colis ici et oriente les nouveaux clients vers un autre relais ; les colis déjà en route arrivent quand même. Faites partir ce qui doit partir pour libérer des places.')}
              {peutDeparts && (
                <>
                  {' '}
                  <Link to={chemin('departs')} className="r6-lien-texte">
                    {t('Voir les départs')}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
        <Plan v={v} emplacement={emplacement} choisir={choisirCase} />
        <div className="p-yi6rkz r6-filtres" role="search" aria-label={t('Chercher un colis')}>
          <label htmlFor="r6-q" className="r6-label">
            {t('Chercher un colis')}
          </label>
          <div className="r6-recherche">
            <Icone nom="search" taille={20} />
            <input
              id="r6-q"
              type="search"
              className="r-ref"
              placeholder={t('Référence ou emplacement : BLV-00041, A-03')}
              value={q}
              autoComplete="off"
              autoCapitalize="characters"
              enterKeyHint="search"
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && v.lignes.length === 1) naviguer(chemin('colis', { ref: v.lignes[0].colis.id }))
              }}
            />
            {q && (
              <button type="button" className="r6-ibtn" aria-label={t('Effacer la recherche')} onClick={() => setQ('')}>
                <Icone nom="x" taille={18} />
              </button>
            )}
          </div>
          <div className="r6-puces" role="group" aria-label={t('Filtrer par taille')}>
            {(['S', 'M', 'L'] as const).map((k) => (
              <button key={k} type="button" className="r6-puce" aria-pressed={classe === k} onClick={() => setClasse((x) => (x === k ? null : k))}>
                {t(k === 'S' ? 'Petits' : k === 'M' ? 'Moyens' : 'Encombrants')}
              </button>
            ))}
          </div>
          {(v.speciaux.codeBloque > 0 || v.speciaux.auComptoir > 0 || codeBloque || auComptoir) && (
            <div className="r6-puces" role="group" aria-label={t('Colis à surveiller')}>
              {(v.speciaux.auComptoir > 0 || auComptoir) && (
                <button type="button" className="r6-puce" aria-pressed={auComptoir} onClick={() => setAuComptoir((x) => !x)}>
                  {tf('À payer au comptoir · {n}', { n: v.speciaux.auComptoir })}
                </button>
              )}
              {(v.speciaux.codeBloque > 0 || codeBloque) && (
                <button type="button" className="r6-puce" aria-pressed={codeBloque} onClick={() => setCodeBloque((x) => !x)}>
                  {tf('Code bloqué · {n}', { n: v.speciaux.codeBloque })}
                </button>
              )}
            </div>
          )}
          {filtre && (
            <button type="button" className="r6-lien" onClick={effacer}>
              {t('Effacer les filtres')}
            </button>
          )}
          <Link className="r-btn r-second" to={chemin('inventaire')}>
            <Icone nom="list-checks" taille={20} />
            <span>{t(enCours ? 'Reprendre l’inventaire' : 'Faire l’inventaire des étagères')}</span>
          </Link>
        </div>
        <div className="p-lvzt0c r6-onglets" role="tablist" aria-label={t('Colis par état')} onKeyDown={toucheOnglet}>
          {onglets.map((x) => {
            const on = !emplacement && x.id === actif
            return (
              <button
                key={x.id}
                id={'r6-t-' + x.id}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls="r6-panneau"
                tabIndex={on || (emplacement && x.id === actif) ? 0 : -1}
                className={(on ? 'p-h01hlk' : 'p-bq7aiq') + ' r6-onglet'}
                onClick={() => choisirOnglet(x.id)}
              >
                {t(x.libelle)} <span className="r6-nb">{v.compteurs[x.id]}</span>
              </button>
            )
          })}
        </div>
        <div className="p-yi6rkz r6-liste" role="tabpanel" id="r6-panneau" aria-labelledby={emplacement ? undefined : 'r6-t-' + actif} aria-label={emplacement ? tf('Case {c}', { c: emplacement }) : undefined} ref={liste} tabIndex={-1}>
          {emplacement && (
            <div className="r6-case-choisie">
              <span>{tf('Case {c} · {n} colis', { c: emplacement, n: lignes.length })}</span>
              <button type="button" className="r6-lien" onClick={() => setEmplacement(null)}>
                {t('Toute la liste')}
              </button>
            </div>
          )}
          {!lignes.length ? (
            filtre ? (
              <Vide icone="search-x" titre="Aucun colis ne correspond" texte={t('Vérifiez la référence ou l’emplacement, ou effacez les filtres.')} />
            ) : (
              <Vide icone={actif === 'urgents' ? 'circle-check' : 'package'} titre={VIDES[actif][0]} texte={t(VIDES[actif][1])} />
            )
          ) : (
            visibles.map((l, i) => (
              <div key={l.colis.id} className="r6-ligne">
                {i > 0 && <div className="p-92xvtp" />}
                <Link to={chemin('colis', { ref: l.colis.id })} className="p-bqlgt9">
                  <div className="p-utsv4v">{l.colis.emplacement ?? '—'}</div>
                  <div className="p-lmo74g">
                    <div className="p-hz5rr5">{l.colis.retour?.reference ?? l.colis.id}</div>
                    <div className="p-t1lapd">{sousLigne(l)}</div>
                  </div>
                  <Etiquette e={l.etiquette} />
                </Link>
              </div>
            ))
          )}
          {reste > 0 && (
            <button type="button" className="p-nll9kf r6-plus" onClick={() => setTout(true)}>
              {reste === 1 ? t('+ 1 autre colis') : tf('+ {n} autres colis', { n: reste })}
            </button>
          )}
          {!emplacement && actif === 'urgents' && peutDeparts && v.compteurs.urgents > 0 && (
            <Link className="r-btn r-principal" to={chemin('departs')}>
              <Icone nom="r-camion" taille={20} />
              <span>{t('Préparer les départs')}</span>
            </Link>
          )}
          {!emplacement && actif === 'groupage' && (
            <div className="p-gh7puf">
              <Icone nom="r-couches" taille={18} className="p-672m16" />
              <div>
                {t('Colis d’une liste d’envies : gardé')} <strong>{t('sans frais')}</strong>{' '}
                {tf('jusqu’à la libération du groupe (date cible, au plus tard {n} jours après le paiement du premier cadeau, ou « Démarrer maintenant »). Le client n’a pas encore de code : le colis ne peut pas être remis.', { n: v.regles.groupageLiberationJ })}
              </div>
            </div>
          )}
          {!emplacement && actif === 'hors_garde' && (
            <div className="p-gh7puf">
              <Icone nom="r-balance" taille={18} className="p-672m16" />
              <div>{t('Constat en cours : le colis reste ici sans frais jusqu’à la décision de BelivaY, puis il est remis ou part. Retour déposé : hors places, jamais facturé, il part avec la prochaine collecte.')}</div>
            </div>
          )}
        </div>
        <Grille v={v} />
      </>
    )
  }

  return (
    <Ecran route="stock">
      <div className="p-0hxmj8 r-pile">{contenu()}</div>
    </Ecran>
  )
}

/** États vides rédigés (VID-04), un par onglet. */
const VIDES: Record<CategorieStock, [string, string]> = {
  urgents: ['Rien d’urgent', 'Aucun colis à faire partir ni au dernier jour. Les renvois paraissent ici le premier jour ouvert après le 7e jour.'],
  payants: ['Aucune garde payante', 'Aucun colis n’a de garde à encaisser aujourd’hui.'],
  groupage: ['Aucun colis en groupage', 'Les colis d’une liste d’envies attendent ici la libération de leur groupe.'],
  gratuits: ['Aucun colis au 1er jour', 'Les colis arrivés aujourd’hui sont gratuits pour le client jusqu’à ce soir.'],
  hors_garde: ['Rien hors garde', 'Ni constat en cours ni retour déposé.'],
}
