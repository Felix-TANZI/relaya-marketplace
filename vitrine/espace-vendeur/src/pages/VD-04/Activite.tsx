// « Votre activité » sur le tableau de bord (l'accueil), d'après l'interface vendeur réelle (seller.belivay.com,
// logique-metier/vendeur/INTERFACE-REELLE.md) : jalons, objectif du mois, taux de livraison et de retour, ce que vous
// avez gardé sur 7 jours, 30 jours ou 12 mois, carte de chaleur des commandes (jour × heure, 30 derniers jours).
// AUCUN chiffre inventé : tout se calcule sur les données de la source (commandes, produits, avis), comme le reste de
// l'accueil ; un compteur à zéro le dit. Propriétaire seulement (montants : l'accès Préparation ne voit pas ce bloc).
// Sans « clients uniques » : le vendeur ne connaît pas ses clients (anonymat, CMD-06).
// L'objectif du mois : démonstration, gardé sur l'appareil (blv_v_objectif) ; mode API, gardé par le serveur
// (GET et PUT /seller/goal) pour qu'il suive le vendeur d'un appareil à l'autre.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { F } from '@client/i18n/format'
import { pagesApi } from '../../api/pages/actif'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Commande } from '../../donnees/domaines/commandes'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { DECALAGE_YAOUNDE_MS, JOUR, jourDe } from '../../calculs/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles } from '../../session'

type Periode = '7' | '30' | '12'
const CLE_OBJECTIF = 'blv_v_objectif'
const JOURS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function lireObjectif(): number | null {
  try {
    const v = Number(localStorage.getItem(CLE_OBJECTIF))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch {
    return null
  }
}

async function lireTout() {
  const [prep, cours, fin, pb, produits, avis] = await Promise.all([
    source.commandes.liste('prep'),
    source.commandes.liste('cours'),
    source.commandes.liste('fin'),
    source.commandes.liste('pb'),
    source.produits.liste(),
    source.boutique.avis(),
  ])
  const vues = new Set<string>()
  const commandes: Commande[] = []
  for (const c of [...prep, ...cours, ...fin, ...pb]) if (!vues.has(c.ref)) (vues.add(c.ref), commandes.push(c))
  return { commandes, produits: produits.compteurs, avis: avis.liste.length }
}

// Heure et jour de la semaine à Yaoundé (lundi = 0).
const local = (a: number) => new Date(a + DECALAGE_YAOUNDE_MS)
const jourDeLaSemaine = (a: number) => (local(a).getUTCDay() + 6) % 7
const heureDe = (a: number) => local(a).getUTCHours()

export function Activite() {
  const montants = useMontantsVisibles()
  if (!montants) return null
  return <ActiviteProprietaire />
}

function ActiviteProprietaire() {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge(60_000)
  const lecture = useLecture(lireTout)
  const [periode, setPeriode] = useState<Periode>('7')
  const [objectifLocal, setObjectif] = useState<number | null>(lireObjectif)
  const serveur = useLecture(() => (pagesApi ? pagesApi.activite.objectif() : Promise.resolve(null)))
  const objectif = pagesApi ? (serveur.donnees?.montant ?? null) : objectifLocal
  const [saisie, setSaisie] = useState<string | null>(null)
  const d = lecture.donnees
  if (!d) return null
  const vendues = d.commandes.filter((c) => c.statut !== 'annulee')
  const garde = (c: Commande) => c.garde ?? 0

  // Jalons : chacun se lit dans les données.
  const jalons: { titre: string; fait: boolean; vers: string }[] = [
    { titre: 'Boutique créée', fait: true, vers: chemin('boutique') },
    { titre: 'Premier produit', fait: d.produits.total > 0, vers: chemin('produits') },
    { titre: 'Première vente', fait: vendues.length > 0, vers: chemin('commandes') },
    { titre: 'Première remise au livreur', fait: d.commandes.some((c) => c.remiseA || c.retireeA), vers: chemin('commandes', { f: 'cours' }) },
    { titre: 'Premier avis', fait: d.avis > 0, vers: chemin('avis') },
    { titre: 'Premier versement', fait: d.commandes.some((c) => c.argent?.etat === 'verse'), vers: chemin('versements') },
  ]
  const faits = jalons.filter((j) => j.fait).length

  // Objectif du mois : ce que vous avez gardé sur les ventes payées ce mois-ci (Yaoundé).
  const mois = jourDe(maintenant).slice(0, 7)
  const gardeMois = vendues.filter((c) => jourDe(c.payeeA).slice(0, 7) === mois).reduce((a, c) => a + garde(c), 0)
  const part = objectif ? Math.min(100, Math.round((gardeMois / objectif) * 100)) : 0
  const enregistrer = async () => {
    const v = Math.round(Number((saisie ?? '').replace(/[\s  ]/g, '')))
    if (!Number.isFinite(v) || v <= 0) return jouer('erreur')
    if (pagesApi) {
      const r = await pagesApi.activite.fixerObjectif(v).catch(() => null)
      if (!r?.ok) return jouer('erreur')
      setSaisie(null)
      return jouer('interrupteur')
    }
    try {
      localStorage.setItem(CLE_OBJECTIF, String(v))
    } catch {
      /* gardé pour la visite */
    }
    setObjectif(v)
    setSaisie(null)
    jouer('interrupteur')
  }

  // Taux (toutes les commandes reçues) : livrées sur livrées + annulées ; retours sur livrées.
  const livrees = d.commandes.filter((c) => c.retireeA).length
  const annulees = d.commandes.length - vendues.length
  const retours = d.commandes.filter((c) => c.statut === 'retour_gele' || c.probleme?.type === 'retour').length
  const tauxLivraison = livrees + annulees ? Math.round((livrees / (livrees + annulees)) * 100) : null
  const tauxRetour = livrees ? Math.round((retours / livrees) * 100) : null

  // Revenus : barres par jour (7 ou 30 derniers jours) ou par mois (12 derniers mois).
  const aujourdhui = jourDe(maintenant)
  const barres: { cle: string; libelle: string; valeur: number }[] =
    periode === '12'
      ? Array.from({ length: 12 }, (_, i) => {
          const dt = local(maintenant)
          dt.setUTCDate(1)
          dt.setUTCMonth(dt.getUTCMonth() - (11 - i))
          const m = dt.toISOString().slice(0, 7)
          return { cle: m, libelle: dt.toLocaleDateString(langue === 'en' ? 'en-GB' : 'fr-FR', { month: 'short', timeZone: 'UTC' }), valeur: vendues.filter((c) => jourDe(c.payeeA).slice(0, 7) === m).reduce((a, c) => a + garde(c), 0) }
        })
      : Array.from({ length: Number(periode) }, (_, i) => {
          const j = jourDe(maintenant - (Number(periode) - 1 - i) * JOUR)
          return { cle: j, libelle: periode === '7' ? t(JOURS_FR[jourDeLaSemaine(maintenant - (6 - i) * JOUR)]) : String(Number(j.slice(8))), valeur: vendues.filter((c) => jourDe(c.payeeA) === j).reduce((a, c) => a + garde(c), 0) }
        })
  const total = barres.reduce((a, b) => a + b.valeur, 0)
  const max = Math.max(1, ...barres.map((b) => b.valeur))

  // Carte de chaleur : commandes payées des 30 derniers jours, par jour de la semaine et par heure.
  const recentes = vendues.filter((c) => c.payeeA > maintenant - 30 * JOUR && c.payeeA <= maintenant)
  const chaleur = Array.from({ length: 7 }, () => Array<number>(24).fill(0))
  for (const c of recentes) chaleur[jourDeLaSemaine(c.payeeA)][heureDe(c.payeeA)]++
  const pic = Math.max(0, ...chaleur.flat())
  const [pj, ph] = pic ? (() => {
    for (let j = 0; j < 7; j++) for (let h = 0; h < 24; h++) if (chaleur[j][h] === pic) return [j, h]
    return [0, 0]
  })() : [0, 0]
  const resumeChaleur = pic ? tf('Le plus de commandes : {jour} vers {h} h ({n} sur 30 jours).', { jour: t(JOURS_FR[pj]), h: ph, n: recentes.length }) : t('Pas encore de commande sur les 30 derniers jours.')

  return (
    <section className="vd4-activite" aria-labelledby="vd4-act-t">
      <div className="sec">
        <h2 id="vd4-act-t">{t('Votre activité')}</h2>
        <Link to={chemin('chiffres')}>{t('Mes chiffres')}</Link>
      </div>

      <div className="card tight" style={{ marginTop: 0 }}>
        <div className="vd4-act-h">
          <b>{t('Vos jalons')}</b>
          <span className="pill sm ink">{tf('{n} sur {total}', { n: faits, total: jalons.length })}</span>
        </div>
        <ul className="vd4-jalons">
          {jalons.map((j) => (
            <li key={j.titre}>
              <Link to={j.vers} className={'pill sm ' + (j.fait ? 'green' : 'ink')}>
                <Icone nom={j.fait ? 'circle-check' : 'circle'} taille={14} />
                {t(j.titre)}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="vd4-act-g">
        <div className="card">
          <div className="vd4-act-h">
            <b>{t('Objectif du mois')}</b>
            {saisie === null && (
              <button type="button" className="btn sm soft vd4-act-mod" onClick={() => setSaisie(objectif ? String(objectif) : '')}>
                <Icone nom="pencil" taille={15} />
                <span>{t(objectif ? 'Modifier' : 'Fixer')}</span>
              </button>
            )}
          </div>
          {saisie !== null ? (
            <form
              className="vd4-obj-f"
              onSubmit={(e) => {
                e.preventDefault()
                void enregistrer()
              }}
            >
              <label className="inp">
                <input inputMode="numeric" value={saisie} onChange={(e) => setSaisie(e.target.value.replace(/[^\d\s]/g, ''))} aria-label={t('Objectif du mois en francs')} placeholder={t('Par exemple 500 000')} />
                <span className="c3">F</span>
              </label>
              <div className="vd4-obj-b">
                <button type="button" className="btn sm secondary" onClick={() => setSaisie(null)}>
                  {t('Annuler')}
                </button>
                <button type="submit" className="btn sm primary">
                  {t('Enregistrer')}
                </button>
              </div>
            </form>
          ) : (
            <div className="vd4-obj">
              <div className="vd4-anneau" role="img" aria-label={tf('{p} % de l’objectif', { p: part })} style={{ ['--p' as string]: part }}>
                <span>{t(`${part} %`)}</span>
              </div>
              <div>
                <b className="t15">{t(`${F(gardeMois)} F`)}</b>
                <span className="t13 c3" style={{ display: 'block' }}>
                  {objectif ? tf('gardés sur {o} F visés', { o: F(objectif) }) : t('gardés ce mois-ci · aucun objectif fixé')}
                </span>
                {objectif !== null && objectif > gardeMois && (
                  <span className="t13 c2" style={{ display: 'block' }}>
                    {tf('Encore {r} F', { r: F(objectif - gardeMois) })}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="vd4-taux">
          <div className="card">
            <span className="t13 c3">{t('Taux de livraison')}</span>
            <b className="vd4-taux-v cg">{tauxLivraison === null ? '—' : t(`${tauxLivraison} %`)}</b>
            <span className="t12 c3">{tf('{n} livrées · {a} annulées', { n: livrees, a: annulees })}</span>
          </div>
          <div className="card">
            <span className="t13 c3">{t('Taux de retour')}</span>
            <b className="vd4-taux-v">{tauxRetour === null ? '—' : t(`${tauxRetour} %`)}</b>
            <span className="t12 c3">{tf(retours > 1 ? '{n} retours' : '{n} retour', { n: retours })}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="vd4-act-h">
          <div>
            <b>{t('Ce que vous avez gardé')}</b>
            <span className="t13 c3" style={{ display: 'block' }}>
              {tf('Total : {t} F', { t: F(total) })}
            </span>
          </div>
          <div className="seg vd4-per" role="tablist" aria-label={t('Période')}>
            {(['7', '30', '12'] as Periode[]).map((p) => (
              <button key={p} type="button" role="tab" aria-selected={periode === p} className={periode === p ? 'on' : ''} onClick={() => setPeriode(p)}>
                {t(p === '12' ? '12 m' : `${p} j`)}
              </button>
            ))}
          </div>
        </div>
        <div className={'vd4-barres n' + barres.length} role="img" aria-label={tf('Ce que vous avez gardé, {p} : {t} F au total', { p: t(periode === '12' ? '12 derniers mois' : `${periode} derniers jours`), t: F(total) })}>
          {barres.map((b) => (
            <div key={b.cle} className="vd4-b">
              <i style={{ height: Math.max(b.valeur ? 6 : 2, Math.round((b.valeur / max) * 100)) + '%' }} className={b.cle === aujourdhui || b.cle === mois ? 'on' : ''}></i>
              {(periode !== '30' || Number(b.libelle) % 5 === 1) && <span>{b.libelle}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="vd4-act-h">
          <b>{t('Quand vos commandes arrivent')}</b>
          <span className="t12 c3">{t('30 derniers jours')}</span>
        </div>
        <div className="vd4-chaleur" role="img" aria-label={resumeChaleur}>
          {chaleur.map((ligne, j) => (
            <div key={j} className="vd4-ch-l">
              <span>{t(JOURS_FR[j])}</span>
              {ligne.map((n, h) => (
                <i key={h} style={{ opacity: n ? 0.25 + 0.75 * (n / pic) : undefined }} className={n ? 'on' : ''}></i>
              ))}
            </div>
          ))}
          <div className="vd4-ch-h">
            <span></span>
            {[0, 6, 12, 18].map((h) => (
              <span key={h} style={{ gridColumn: `${h + 2} / span 6` }}>{t(`${h} h`)}</span>
            ))}
          </div>
        </div>
        <p className="t13 c2" style={{ margin: '10px 0 0' }}>{resumeChaleur}</p>
      </div>
    </section>
  )
}
