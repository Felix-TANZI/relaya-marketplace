// Modifier une offre (VD-08, route('offre3')) : stock et prix conseillé d'une offre existante (« ?o= » : « Modifier »,
// « Réapprovisionner », « Ajuster ») ; « ?focus=stock » place le curseur au stock. Un brouillon ou une offre refusée
// s'ouvre sur la page « Nouveau produit » (offre1, DP-58).
// - Couleur (variante de la fiche, chacune son stock et son prix, Q-35 ; les variantes déjà créées sont grisées,
//   DUP-04), Stock *, État * (six états, PRX-05) avant le prix (PRX-06) ; exemples « Ex. : » (PRX-04).
// - « Autres réglages · déjà remplis » (VD08-R23) : seuil d'alerte, délai de préparation, paiement au retrait, Made in
//   Cameroon (−2 points, VD08-R24), colis : au-delà de 5 kg ou 50 cm, poids et dimensions obligatoires, classe
//   calculée (VD08-R22) ; le repli s'ouvre seul quand un de ses champs devient obligatoire ou faux.
// - Prix de vente * : barre verte « À X F, vous gardez par vente Y F, soit Z % » calculée par le service de commission
//   300 ms après la dernière frappe (PRX-08, VD08-R17) ; 500 F minimum et plus petit prix publiable (PRX-03, DP-55) ;
//   sous 5 000 F, +3 points dits avant validation (VD08-R21) ; plages exactes de la commission minimale (Q-55, A-4) ;
//   plafond de démarrage (PRX-09) : la ligne du champ, publication bloquée, brouillon gardé.
// - Carte nuit « Pour vendre plus » (PRX-07, VD08-R26) : marché (nombre, plus bas, fourchette, PRX-02), prix conseillé
//   jamais plus haut que le prix tapé (PRX-01, DP-56 Q-36), gardé à ce prix, zones en premier ; « Pourquoi ce prix ? » ;
//   « Ajuster à … » / « Rester à … » terminent l'étape (« Rester » : aucun rappel avant 7 jours) ; déjà le moins cher :
//   un seul bouton « Continuer ». Plancher privé du prix automatique (Q-90). Accès Préparation : réservé.
import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { ChampsBrouillon, Reglages } from '../../donnees/domaines/offres'
import type { Produit, VarianteDeFiche } from '../../donnees/domaines/produits'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useMontantsVisibles } from '../../session'
import { Bouton, Chargement, HorsConnexion, Interrupteur, Reserve, useApresFrappe, useDelai, useEnLigne, useMontant } from './commun'
import { SansBrouillon } from './photos'

interface Formulaire {
  variante: string
  stock: string
  etatArticle: string
  seuil: string
  delaiH: number
  paiementAuRetrait: boolean
  madeInCameroon: boolean
  poids: string
  dims: [string, string, string]
  prix: string
  plancher: string
}
const SELECT = { flex: 1, minWidth: 0, border: 0, background: 'transparent', font: 'inherit', color: 'inherit', outline: 'none', height: '100%', appearance: 'none' } as const
const entier = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : null)
const nombre = (s: string) => {
  const v = Number(s.replace(',', '.'))
  return s.trim() && Number.isFinite(v) && v > 0 ? v : null
}

function versFormulaire(p: Produit): Formulaire {
  return {
    variante: p.variante,
    stock: p.stock > 0 || p.etat !== 'brouillon' ? String(p.stock) : '',
    etatArticle: p.etatArticle,
    seuil: String(p.seuilAlerte),
    delaiH: p.delaiPreparationH,
    paiementAuRetrait: p.paiementAuRetrait,
    madeInCameroon: p.madeInCameroon,
    poids: p.poidsKg !== null ? String(p.poidsKg).replace('.', ',') : '',
    dims: p.dimensionsCm ? (p.dimensionsCm.map(String) as [string, string, string]) : ['', '', ''],
    prix: p.prix !== null ? String(p.prix) : '',
    plancher: p.plancherPrive !== null ? String(p.plancherPrive) : '',
  }
}

function Formulaire3({ p, r, variantes }: { p: Produit; r: Reglages; variantes: VarianteDeFiche[] }) {
  const { t, tf, langue } = usePreferences()
  const montant = useMontant()
  const delai = useDelai()
  const pct = (x: number) => (langue === 'en' ? String(x) : String(x).replace('.', ','))
  const enLigne = useEnLigne()
  const naviguer = useNavigate()
  const lieu = useLocation()
  const [params] = useSearchParams()
  const edition = p.etat !== 'brouillon' && p.etat !== 'refusee'
  const [f, setF] = useState<Formulaire>(() => versFormulaire(p))
  const [tente, setTente] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreurServeur, setErreurServeur] = useState<string | null>(null)
  const stockRef = useRef<HTMLInputElement>(null)
  const prixRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (params.get('focus') === 'stock') stockRef.current?.focus()
    else if (!edition && p.stock > 0) prixRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stock = entier(f.stock)
  const seuil = entier(f.seuil)
  const prix = entier(f.prix)
  const poids = nombre(f.poids)
  const dims = f.dims.map(nombre) as (number | null)[]
  const grand = Math.max(0, ...dims.map((x) => x ?? 0))
  const facture = Math.max(poids ?? 0, dims.every((x) => x !== null) ? (dims[0]! * dims[1]! * dims[2]!) / r.colis.diviseur : 0)
  const colisObligatoire = (poids ?? 0) > r.colis.seuilKg || grand > r.colis.seuilCm
  const colisIncomplet = colisObligatoire && (poids === null || dims.some((x) => x === null))
  const classe = r.colis.classes.find((c) => facture <= c.kg && grand <= c.cm)?.classe ?? null
  const plancher = entier(f.plancher)

  // Brouillon : chaque champ valide est gardé tout de suite (hors connexion, il part au retour du réseau, Q-93).
  const champs = (): ChampsBrouillon => ({
    ...(edition ? {} : { variante: f.variante }),
    ...(stock !== null ? { stock } : {}),
    etatArticle: f.etatArticle,
    ...(seuil !== null ? { seuilAlerte: seuil } : {}),
    delaiPreparationH: f.delaiH,
    paiementAuRetrait: f.paiementAuRetrait,
    madeInCameroon: f.madeInCameroon,
    poidsKg: poids,
    dimensionsCm: dims.every((x) => x !== null) ? (dims as [number, number, number]) : null,
  })
  const fGarde = useApresFrappe(f, 400)
  useEffect(() => {
    if (edition || fGarde === undefined) return
    void source.offres.modifier(p.id, { ...champs(), ...(entier(fGarde.prix) !== null ? { prix: entier(fGarde.prix) } : {}) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fGarde])

  // « Vous gardez » pendant la saisie : service de commission, 300 ms après la dernière frappe (PRX-08).
  const prixD = useApresFrappe(prix, 300)
  const micD = f.madeInCameroon
  const calcul = useLecture(async () => {
    if (prixD === null || prixD < 1) return null
    const apercu = await source.offres.apercu(p.id, prixD, micD)
    const conseil = apercu.refus === null && p.ficheId ? await source.offres.conseil(p.id, prixD) : null
    return { apercu, conseil, pour: prixD }
  }, [prixD, micD, p.id])
  const a = calcul.donnees?.apercu ?? null
  const c = calcul.donnees?.conseil ?? null
  const aJour = calcul.donnees?.pour === prix

  const fautes = {
    stock: stock === null || (!edition && stock < 1) || stock > 99999,
    seuil: seuil === null || seuil > 9999,
    colis: colisIncomplet || (poids !== null && poids >= 1000) || dims.some((x) => x !== null && x >= 1000),
    prix: prix === null || (aJour && a !== null && a.refus !== null),
    plancher: p.prixAuto && (plancher === null || plancher < r.prixMin || (prix !== null && plancher > prix)),
  }
  const ouvrirReglages = tente && (fautes.seuil || fautes.colis) ? true : colisObligatoire ? true : undefined
  const pret = !Object.values(fautes).some(Boolean) && aJour

  const terminer = async (prixChoisi: number, rester: boolean) => {
    setTente(true)
    if (!pret) {
      jouer('erreur')
      ;(fautes.stock ? stockRef : prixRef).current?.focus()
      return
    }
    setEnvoi(true)
    setErreurServeur(null)
    const m = await source.offres.modifier(p.id, { ...champs(), ...(edition ? {} : { prix: prixChoisi }), ...(p.prixAuto && plancher !== null ? { plancherPrive: plancher } : {}) })
    if (!m.ok) {
      setEnvoi(false)
      jouer('erreur')
      return setErreurServeur(t(m.raison === 'variante' ? 'Cette variante existe déjà dans vos produits : choisissez-en une autre.' : 'Vérifiez les champs en rouge.'))
    }
    if (edition) {
      const r2 = await source.offres.changerPrix(p.id, prixChoisi, rester)
      setEnvoi(false)
      if (!r2.ok) {
        jouer('erreur')
        return setErreurServeur(r2.raison === 'plafond' ? t('Au-dessus du plafond de démarrage : prix refusé, rien n’a changé.') : tf('Prix refusé : publiable dès {m}.', { m: montant(Number(r2.detail ?? 500)) }))
      }
      jouer('interrupteur')
      return naviguer(chemin('offre_detail', { p: p.id }), { replace: true, state: { message: tf('Offre mise à jour : {m}', { m: montant(prixChoisi) }) } })
    }
    setEnvoi(false)
    naviguer(chemin('offre4', { b: p.id, keep: rester ? 1 : undefined }), { state: lieu.state })
  }
  const maj = (c2: Partial<Formulaire>) => setF((x) => ({ ...x, ...c2 }))
  const inp = (faute: boolean) => 'inp' + (tente && faute ? ' err' : '')

  return (
    <>
      <h1 className="pg-t" style={{ marginTop: '14px' }}>
        {t('Votre stock et votre prix')}
      </h1>
      {edition && <p className="pg-s">{p.variante ? `${p.titre} · ${t(p.variante)}` : p.titre}</p>}
      <div className="split2">
        <div className="fld" style={{ minWidth: 0 }}>
          <label htmlFor="vd08-var">{t('Couleur')}</label>
          <div className="inp" style={edition ? { opacity: 0.7 } : undefined}>
            <select id="vd08-var" style={SELECT} value={f.variante} disabled={edition || variantes.length < 2} onChange={(e) => maj({ variante: e.target.value })}>
              {(variantes.length ? variantes : [{ variante: f.variante, offreId: p.id, etat: p.etat }]).map((v) => (
                <option key={v.variante} value={v.variante} disabled={!!v.offreId && v.offreId !== p.id}>
                  {v.offreId && v.offreId !== p.id ? tf('{v} · déjà créée', { v: t(v.variante) }) : t(v.variante)}
                </option>
              ))}
            </select>
            <span className="suf">
              <Icone nom="chevron-down" taille={16} />
            </span>
          </div>
        </div>
        <div className="fld" style={{ minWidth: 0 }}>
          <label htmlFor="vd08-stock">
            {t('Stock ')}
            <span className="req">{t('*')}</span>
          </label>
          <div className={inp(fautes.stock)}>
            <input size={1} id="vd08-stock" ref={stockRef} inputMode="numeric" value={f.stock} onChange={(e) => maj({ stock: e.target.value.replace(/\D/g, '').slice(0, 5) })} placeholder={t('Ex. : 12')} />
          </div>
          {tente && fautes.stock && <div className="hint cr">{t('Indiquez votre stock')}</div>}
        </div>
      </div>
      <div className="fld">
        <label htmlFor="vd08-etat">
          {t('État ')}
          <span className="req">{t('*')}</span>
        </label>
        <div className="inp">
          <select id="vd08-etat" style={SELECT} value={f.etatArticle} onChange={(e) => maj({ etatArticle: e.target.value })}>
            {r.etats.map((e) => (
              <option key={e} value={e}>
                {t(e)}
              </option>
            ))}
          </select>
          <span className="suf">
            <Icone nom="chevron-down" taille={16} />
          </span>
        </div>
        <div className="hint">{t('L’état exact évite les retours : « occasion bon état » se vend aussi.')}</div>
      </div>
      <details className="more" open={ouvrirReglages}>
        <summary>
          <Icone nom="sliders-horizontal" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">
            <span style={{ display: 'block' }}>{t('Autres réglages · déjà remplis')}</span>
            <span className="t12 c3" style={{ display: 'block', fontWeight: '600', marginTop: '1px' }}>
              {t('Seuil, délai, paiement au retrait, colis')}
            </span>
          </span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <div className="split2">
            <div className="fld" style={{ minWidth: 0 }}>
              <label htmlFor="vd08-seuil">{t('Seuil d’alerte')}</label>
              <div className={inp(fautes.seuil)}>
                <input size={1} id="vd08-seuil" inputMode="numeric" value={f.seuil} onChange={(e) => maj({ seuil: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder={t('Ex. : 5')} />
              </div>
            </div>
            <div className="fld" style={{ minWidth: 0 }}>
              <label htmlFor="vd08-delai">{t('Délai de préparation')}</label>
              <div className="inp">
                <select id="vd08-delai" style={SELECT} value={f.delaiH} onChange={(e) => maj({ delaiH: Number(e.target.value) })}>
                  {r.delaisH.map((h) => (
                    <option key={h} value={h}>
                      {delai(h)}
                    </option>
                  ))}
                </select>
                <span className="suf">
                  <Icone nom="chevron-down" taille={16} />
                </span>
              </div>
            </div>
          </div>
          <div className="hint">{t('Seuil : on vous prévient quand le stock y descend.')}</div>
          <div className="hint">{t('Sur commande ou sur-mesure : jusqu’à 7 jours de préparation.')}</div>
          <div className="mt8">
            <div className="row" style={{ padding: '12px 0', borderTop: '1px solid var(--line)' }}>
              <div className="grow">
                <div className="b8 t14" style={{ color: 'var(--ink)' }}>
                  {t('Paiement au retrait accepté')}
                </div>
                <div className="t12 c3 mt4" style={{ lineHeight: '1.4' }}>
                  {t('Rien n’est encaissé avant le retrait ; un refus ne vous coûte rien')}
                </div>
              </div>
              <Interrupteur on={f.paiementAuRetrait} libelle={t('Paiement au retrait accepté')} changer={(on) => maj({ paiementAuRetrait: on })} />
            </div>
            <div className="row" style={{ padding: '12px 0', borderTop: '1px solid var(--line)' }}>
              <div className="grow">
                <div className="b8 t14" style={{ color: 'var(--ink)' }}>
                  {t('Made in Cameroon')}
                </div>
                <div className="t12 c3 mt4" style={{ lineHeight: '1.4' }}>
                  {t('Sur certificat · vous gardez 2 points de plus')}
                </div>
              </div>
              <Interrupteur on={f.madeInCameroon} libelle={t('Made in Cameroon')} changer={(on) => maj({ madeInCameroon: on })} />
            </div>
          </div>
          <div className="row" style={{ padding: '12px 0 0', borderTop: '1px solid var(--line)', alignItems: 'flex-start' }}>
            <Icone nom="package" taille={20} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <div className="grow">
              <div className="b8 t14" style={{ color: 'var(--ink)' }}>
                {colisObligatoire ? tf('Colis {c} · poids facturé {k} kg', { c: classe ?? t('hors gabarit'), k: String(Math.round(facture * 10) / 10).replace('.', ',') }) : tf('Colis {c} · rien à déclarer', { c: poids !== null || dims.some((x) => x !== null) ? (classe ?? p.colis) : p.colis })}
              </div>
              <div className="t12 c3 mt4" style={{ lineHeight: '1.4' }}>
                {t('Poids et dimensions deviennent obligatoires au-delà de 5 kg ou 50 cm : l’écran affiche alors la classe du colis et son tarif.')}
              </div>
            </div>
          </div>
          <div className="split2">
            <div className="fld" style={{ minWidth: 0 }}>
              <label htmlFor="vd08-poids">
                {t('Poids (kg)')}
                {colisObligatoire && <span className="req">{t(' *')}</span>}
              </label>
              <div className={inp(fautes.colis && poids === null)}>
                <input size={1} id="vd08-poids" inputMode="decimal" value={f.poids} onChange={(e) => maj({ poids: e.target.value.replace(/[^\d,.]/g, '').slice(0, 6) })} placeholder={t('Ex. : 0,4')} />
              </div>
            </div>
            <div className="fld" style={{ minWidth: 0 }}>
              <label>
                {t('Dimensions (cm)')}
                {colisObligatoire && <span className="req">{t(' *')}</span>}
              </label>
              <div className="row" style={{ gap: '4px' }}>
                {(['L', 'l', 'h'] as const).map((x, i) => (
                  <div key={x} className={inp(fautes.colis && dims[i] === null)} style={{ padding: '0 6px', minWidth: 0, flex: 1 }}>
                    <input size={1}
                      inputMode="numeric"
                      aria-label={t(['Longueur (cm)', 'Largeur (cm)', 'Hauteur (cm)'][i])}
                      value={f.dims[i]}
                      onChange={(e) => {
                        const d = [...f.dims] as [string, string, string]
                        d[i] = e.target.value.replace(/[^\d,.]/g, '').slice(0, 5)
                        maj({ dims: d })
                      }}
                      placeholder={x}
                      style={{ textAlign: 'center' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          {colisObligatoire && <div className={'hint' + (tente && fautes.colis ? ' cr' : '')}>{t('Au-delà de 5 kg ou 50 cm, le poids et les trois dimensions sont obligatoires. Une sous-déclaration constatée au ramassage vous est facturée.')}</div>}
        </div>
      </details>
      <div className="divider-t">{t('Votre prix')}</div>
      <div className="fld">
        <label htmlFor="vd08-prix">
          {t('Prix de vente ')}
          <span className="req">{t('*')}</span>
        </label>
        <div className={inp(fautes.prix) + ' focus'}>
          <input size={1} id="vd08-prix" ref={prixRef} inputMode="numeric" value={f.prix} onChange={(e) => maj({ prix: e.target.value.replace(/\D/g, '').slice(0, 9) })} placeholder={t('Ex. : 20 000')} />
          <span className="suf">{t('F')}</span>
        </div>
        {a && aJour && a.refus === 'minimum' ? (
          <div className="hint cr">{a.minimum > r.prixMin ? tf('Publiable dès {m} : en dessous, vous ne gardez rien.', { m: montant(a.minimum) }) : t('500 F minimum')}</div>
        ) : a && aJour && a.refus === 'plafond' && a.plafond ? (
          <div className="hint cr">{tf('Au-dessus de {m}, attendez {n} commandes livrées sans incident ({l} sur {n}) : le brouillon est gardé.', { m: montant(a.plafond.montant), n: a.plafond.requises, l: a.plafond.livrees })}</div>
        ) : tente && prix === null ? (
          <div className="hint cr">{t('Indiquez votre prix de vente')}</div>
        ) : (
          <div className="hint">{t('Prix payé par le client, sans la livraison. 500 F minimum.')}</div>
        )}
      </div>
      {a && a.garde !== null && a.partPourCent !== null && (
        <div className="keep" aria-live="polite">
          <span className="kl">{tf('À {p}, vous gardez par vente', { p: montant(a.prix) })}</span>
          <span className="kv2">
            <span style={{ display: 'block' }}>{montant(a.garde)}</span>
            <span style={{ display: 'block', textAlign: 'right', fontSize: '12.5px', fontWeight: '700', letterSpacing: '0', marginTop: '1px' }}>{tf('soit {p} %', { p: pct(a.partPourCent) })}</span>
          </span>
        </div>
      )}
      {a && a.garde !== null && a.petitPrix && <div className="hint">{tf('Sous {s}, la commission prend {n} points de plus : affiché avant de publier.', { s: montant(a.seuilPetitPrix), n: a.points })}</div>}
      {a && a.garde !== null && a.plagesMinimale.some(([de, jusqua]) => a.prix >= de && a.prix <= jusqua) && (
        <div className="hint">{tf('{plages} : la commission minimale de {m} s’applique.', { m: montant(a.commissionMinimale), plages: a.plagesMinimale.map(([de, jusqua]) => tf('de {a} à {b}', { a: montant(de), b: montant(jusqua) })).join(t(' et ')) })}</div>
      )}
      {p.prixAuto && (
        <div className="fld">
          <label htmlFor="vd08-plancher">
            {t('Ne jamais descendre sous ')}
            <span className="req">{t('*')}</span>
          </label>
          <div className={inp(fautes.plancher)}>
            <input size={1} id="vd08-plancher" inputMode="numeric" value={f.plancher} onChange={(e) => maj({ plancher: e.target.value.replace(/\D/g, '').slice(0, 9) })} placeholder={t('Ex. : 18 000')} />
            <span className="suf">{t('F')}</span>
          </div>
          <div className={'hint' + (tente && fautes.plancher ? ' cr' : '')}>{tf('Prix automatique : il baisse de {n} % par semaine au plus, jamais sous ce prix. Il reste privé.', { n: r.prixAutoPct })}</div>
        </div>
      )}
      {!enLigne && <HorsConnexion texte="Hors connexion : votre saisie est gardée ; le prix conseillé revient avec le réseau." />}
      {erreurServeur && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{erreurServeur}</div>
        </div>
      )}
      {c && a && a.garde !== null && aJour ? (
        <div className="hero night">
          <div className="otop">
            <span className="hk">{t('Pour vendre plus')}</span>
            <Icone nom="trending-up" taille={18} style={{ color: 'var(--gold-l)' }} />
          </div>
          {c.dejaLeMoinsCher ? (
            <>
              <div className="t14 mt8" style={{ lineHeight: '1.45' }}>
                {t('Vous êtes déjà le prix le plus bas pour les clients : rien à changer.')}
              </div>
              <div className="row mt12" style={{ gap: '8px', alignItems: 'flex-start' }}>
                <Icone nom="circle-check" taille={17} style={{ color: 'var(--gold-l)', flexShrink: '0', marginTop: '1px' }} />
                <span className="t13" style={{ lineHeight: '1.45', color: 'rgba(255,255,255,.9)' }}>
                  {t('Les clients de ')}
                  <b style={{ color: '#fff' }}>{tf('{n} zones sur {m}', { n: c.zones.filter((z) => z.premier).length, m: c.zones.length })}</b>
                  {t(' voient votre offre en premier.')}
                </span>
              </div>
              <div className="mt12">
                <Bouton classe="white" icone="arrow-right" inactif={envoi} onClick={() => void terminer(prix!, false)}>
                  {t(edition ? 'Enregistrer' : 'Continuer')}
                </Bouton>
              </div>
            </>
          ) : (
            <>
              <div className="t14 mt8" style={{ lineHeight: '1.45' }}>
                {t('D’autres vendeurs vendent déjà à ')}
                <b>{montant(c.marche.min)}</b>
                {t('.')}
              </div>
              <div className="row mt12" style={{ alignItems: 'flex-start' }}>
                <div className="grow">
                  <div className="t12 b7" style={{ color: 'rgba(255,255,255,.72)' }}>
                    {t('Prix conseillé')}
                  </div>
                  <div className="b8" style={{ fontSize: '30px', letterSpacing: '-.03em', lineHeight: '1.1', marginTop: '4px' }}>
                    {montant(c.conseille)}
                  </div>
                </div>
                <div className="right">
                  <div className="t12 b7" style={{ color: 'rgba(255,255,255,.72)' }}>
                    {t('Vous gardez')}
                  </div>
                  <div className="b8" style={{ fontSize: '30px', letterSpacing: '-.03em', lineHeight: '1.1', marginTop: '4px' }}>
                    {montant(c.gardeConseille)}
                  </div>
                  <div className="t12 b7 mt4" style={{ color: 'rgba(255,255,255,.72)' }}>
                    {tf('soit {p} %', { p: pct(c.partConseille) })}
                  </div>
                </div>
              </div>
              <div className="hline" style={{ margin: '12px 0' }}></div>
              <div className="row" style={{ gap: '8px', alignItems: 'flex-start' }}>
                <Icone nom="circle-check" taille={17} style={{ color: 'var(--gold-l)', flexShrink: '0', marginTop: '1px' }} />
                <span className="t13" style={{ lineHeight: '1.45', color: 'rgba(255,255,255,.9)' }}>
                  {t('Les clients de ')}
                  <b style={{ color: '#fff' }}>{tf('{n} zones sur {m}', { n: c.zones.filter((z) => z.premierAuConseille).length, m: c.zones.length })}</b>
                  {t(' voient votre offre en premier.')}
                </span>
              </div>
              <details className="more flat" style={{ borderTopColor: 'rgba(255,255,255,.16)', marginTop: '12px' }}>
                <summary style={{ color: '#fff' }}>
                  <Icone nom="circle-help" taille={18} style={{ color: 'var(--gold-l)', flexShrink: '0' }} />
                  <span className="grow">{t('Pourquoi ce prix ?')}</span>
                  <Icone nom="chevron-down" taille={18} style={{ color: 'rgba(255,255,255,.7)', flexShrink: '0' }} />
                </summary>
                <div className="more-b" style={{ color: 'rgba(255,255,255,.84)' }}>
                  <p>{tf('{n} offres sont en vente, de {min} à {max}.', { n: c.marche.nombre, min: montant(c.marche.min).replace(/\s?F$/, ''), max: montant(c.marche.max) })}</p>
                  {c.economieClient > 0 && <p>{tf('Le client paie {m} de moins qu’avec l’offre la plus proche : c’est lui qui revient.', { m: montant(c.economieClient) })}</p>}
                  <p>{tf('Cette semaine, {n} clients ont regardé ce produit. Les moins chers ont reçu {a} commandes sur {b}.', { n: c.clientsSemaine, a: c.commandesAuxMoinsChers[0], b: c.commandesAuxMoinsChers[1] })}</p>
                  <p>{tf('BelivaY ne conseille jamais un prix plus haut. Le choix reste le vôtre : à {p}, aucun rappel avant {j} jours.', { p: montant(c.prixSaisi), j: r.rappelJours })}</p>
                </div>
              </details>
              <div className="mt12">
                <Bouton classe="white" icone="check" inactif={envoi} onClick={() => (maj({ prix: String(c.conseille) }), void terminer(c.conseille, false))}>
                  {tf('Ajuster à {p}', { p: montant(c.conseille) })}
                </Bouton>
              </div>
              <div className="mt8">
                <Bouton classe="dark" inactif={envoi} onClick={() => void terminer(c.prixSaisi, true)} style={{ height: '44px' }}>
                  {tf('Rester à {p}', { p: montant(c.prixSaisi) })}
                </Bouton>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mt16">
          <Bouton classe="primary" icone="arrow-right" inactif={envoi || (aJour && a?.refus !== null && a !== null)} onClick={() => void terminer(prix ?? 0, false)}>
            {t(edition ? 'Enregistrer' : 'Continuer')}
          </Bouton>
        </div>
      )}
      {!edition && <p className="scrim-note">{t('Brouillon gardé à chaque saisie : vous pouvez reprendre plus tard depuis Mes produits.')}</p>}
    </>
  )
}

export default function Offre3() {
  const montants = useMontantsVisibles()
  const [params] = useSearchParams()
  const id = params.get('o') ?? params.get('b')
  const lecture = useLecture(async () => {
    const p = params.get('o') ? await source.produits.detail(params.get('o')!) : await source.offres.brouillon(params.get('b'))
    const r = await source.offres.reglages()
    const variantes = p?.ficheId ? await source.produits.variantes(p.ficheId) : []
    return { p, r, variantes }
  }, [id, montants])
  const { t } = usePreferences()
  const d = lecture.donnees
  if (!montants) return <Reserve route="offre3" />
  if (!d) return <Chargement route="offre3" />
  // Un brouillon ou une offre refusée se complète sur la page « Nouveau produit » (DP-58).
  if (d.p && (d.p.etat === 'brouillon' || d.p.etat === 'refusee')) return <Navigate replace to={chemin('offre1', { b: d.p.id })} />
  if (!d.p || !d.p.ficheId) return <SansBrouillon route="offre3" />
  const edition = true
  return (
    <Ecran route="offre3" titre={edition ? t('Modifier l’offre') : undefined} retour={edition ? chemin('offre_detail', { p: d.p.id }) : chemin('offre2', { b: d.p.id })}>
      <Formulaire3 key={d.p.id} p={d.p} r={d.r} variantes={d.variantes} />
    </Ecran>
  )
}
