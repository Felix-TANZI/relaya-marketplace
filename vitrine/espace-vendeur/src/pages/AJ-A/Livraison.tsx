// Livraison et colis (AJ-A, DP-58) : ce que la boutique règle pour l'envoi de ses produits, rien de ce qui appartient
// au livreur ou au client (GEN-01 : jamais le relais ni le quartier d'un client).
// - Pour chaque nouveau produit (défauts) : colis (S ou M ; au-delà, poids et dimensions), délai de préparation (heures
//   ouvrées, sur commande jusqu'à 7 jours, VD05-R02), paiement au retrait accepté (OFR-02, vrai par défaut).
// - Par produit : classe du colis (VD08-R22, VD-COLIS : poids facturé = max(poids ; volume ÷ 5 000) et plus grande
//   dimension, mesures obligatoires au-delà de 5 kg ou 50 cm), délai, paiement au retrait (« Coupé, le client doit
//   payer ce produit d'avance ») ; une commande déjà validée n'est pas touchée.
// - Créneaux de ramassage préférés parmi les tournées de la zone (le livreur passe à l'un d'eux ; absent : délai
//   suspendu, VD06-R04) ; relais BelivaY proches (OpenStreetMap, DP-49, DP-54), préférés en tête.
// - Emballage : le vendeur ne fait pas le colis (PRE-02, REM-03, VD12-R12) : ce qu'il prépare, ce que fait le livreur.
// - Accès Préparation : lecture seule (VD02-DR05, DR10).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { lienOsm } from '@client/connecteurs/cartes'
import { CarteLieux } from '@client/composants/carte/CarteLieux'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { ClasseColis } from '../../donnees/communs'
import { useLecture } from '../../donnees/useLecture'
import { creneau } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { useDelai } from '../VD-08/commun'
import { Bouton, Chargement, Erreur, Feuille, Indice, Interrupteur, Selecteur, useEnLigne, useToast, type Coque } from './commun'
import { EcranAJ } from './coque'
import { sourceAJA } from './donnees/source'
import type { ProduitLivraison, ReglagesLivraison } from './donnees/types'

const C: Coque = { route: 'livraison', titre: 'Livraison et colis', onglet: null }

const distance = (m: number, langue: 'fr' | 'en') => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', langue === 'fr' ? ',' : '.')} km`)

/** Classe du colis (même règle que le serveur, VD08-R22) : pour l'aperçu pendant la saisie. */
function classeDe(r: ReglagesLivraison, poids: number, dims: number[]): ClasseColis {
  const facture = Math.max(poids, (dims[0] * dims[1] * dims[2]) / r.mesures.diviseur)
  const grand = Math.max(...dims)
  return (r.classes.find((c) => facture <= c.kg && grand <= c.cm)?.classe ?? 'XXL') as ClasseColis
}

function Plan({ r, carte, setCarte }: { r: ReglagesLivraison; carte: boolean; setCarte: (b: boolean) => void }) {
  const { t } = usePreferences()
  const enLigne = useEnLigne()
  const b = r.boutique.position
  return (
    <>
      <div className="aja-carte">
        <CarteLieux
          titre={t(carte && enLigne ? 'Carte des relais proches' : 'Plan simplifié : la boutique et les relais proches')}
          hauteur={200}
          plan={!(carte && enLigne)}
          libelles={{ boutique: 'Votre boutique', relais: 'Relais proche (entouré : préféré)' }}
          lieux={[
            { id: 'boutique', acteur: 'boutique', lat: b.lat, lon: b.lon, nom: t('Votre boutique'), choisi: true },
            ...r.relais.map((x) => ({ id: x.id, acteur: 'relais' as const, lat: x.position.lat, lon: x.position.lon, nom: x.quartier, etiquette: x.prefere ? x.quartier : undefined, choisi: x.prefere })),
          ]}
        />
      </div>
      <div className="row t12 c3" style={{ justifyContent: 'space-between', marginTop: '6px', gap: '8px' }}>
        <span>{carte && enLigne ? t('Carte : OpenStreetMap') : t('Plan simplifié : la boutique et les relais proches')}</span>
        {enLigne && (
          <button type="button" className="t12 b8 cor" onClick={() => setCarte(!carte)} style={{ background: 'none', border: 0, minHeight: '44px', cursor: 'pointer', font: 'inherit', fontWeight: 800 }}>
            {t(carte ? 'Plan simplifié' : 'Afficher la carte')}
          </button>
        )}
      </div>
    </>
  )
}

function FeuilleProduit({ r, p, fermer, fini }: { r: ReglagesLivraison; p: ProduitLivraison | null; fermer: () => void; fini: (texte: string) => void }) {
  const { t, tf } = usePreferences()
  const delai = useDelai()
  const [pour, setPour] = useState<string | null>(null)
  const [mode, setMode] = useState<'S' | 'M' | 'grand'>('S')
  const [poids, setPoids] = useState('')
  const [dims, setDims] = useState(['', '', ''])
  const [d, setD] = useState(4)
  const [retrait, setRetrait] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  if (p && pour !== p.offreId) {
    setPour(p.offreId)
    setMode(p.colis === 'S' || p.colis === 'M' ? p.colis : 'grand')
    setPoids(p.poidsKg !== null ? String(p.poidsKg).replace('.', ',') : '')
    setDims(p.dimensionsCm ? p.dimensionsCm.map(String) : ['', '', ''])
    setD(p.delaiPreparationH)
    setRetrait(p.paiementAuRetrait)
    setErr(null)
  }
  const nPoids = Number(poids.replace(',', '.'))
  const nDims = dims.map((x) => Number(x.replace(',', '.')))
  const mesuresOk = nPoids > 0 && nPoids < 1000 && nDims.every((x) => x > 0 && x < 1000)
  const classe = mode === 'grand' && mesuresOk ? classeDe(r, nPoids, nDims) : null
  const enregistrer = async () => {
    if (!p) return
    if (mode === 'grand' && !mesuresOk) return setErr('Indiquez le poids et les trois dimensions.')
    const res = await sourceAJA.livraison.reglerProduit(p.offreId, {
      ...(mode === 'grand' ? { poidsKg: nPoids, dimensionsCm: nDims as [number, number, number] } : { colis: mode }),
      delaiPreparationH: d,
      paiementAuRetrait: retrait,
    })
    if (!res.ok) {
      jouer('erreur')
      return setErr(res.raison === 'mesures' ? 'Indiquez le poids et les trois dimensions.' : res.raison === 'reserve' ? 'Réservé au propriétaire.' : 'Ce réglage n’a pas pu être enregistré.')
    }
    jouer('interrupteur')
    fini(tf('{p} : colis {c} enregistré', { p: `${p.titre} ${t(p.variante)}`, c: res.produit.colis }))
  }
  const champ = (v: string, set: (s: string) => void, id: string, libelle: string, unite: string) => (
    <div className="fld" style={{ marginTop: '10px' }}>
      <label htmlFor={id}>{t(libelle)}</label>
      <div className="inp">
        <input id={id} inputMode="decimal" value={v} placeholder={t('Ex. : 12')} onChange={(e) => (set(e.target.value.replace(/[^\d,.]/g, '').slice(0, 6)), setErr(null))} style={{ border: 0, background: 'none', outline: 'none', font: 'inherit', fontSize: '16px', color: 'var(--ink)', flex: 1, minWidth: 0 }} />
        <span className="t13 c3">{unite}</span>
      </div>
    </div>
  )
  return (
    <Feuille ouverte={!!p} fermer={fermer} titre={t('Colis et préparation')}>
      {p && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void enregistrer()
          }}
        >
          <h2 className="pg-t" style={{ fontSize: '19px' }}>
            {t('Colis et préparation')}
          </h2>
          <p className="pg-s">{`${p.titre} · ${t(p.variante)} · ${tf('gabarit de la fiche : {c}', { c: p.colisFiche })}`}</p>
          <Selecteur
            etiquette="Taille du colis"
            valeur={mode}
            changer={(m) => (setMode(m), setErr(null))}
            choix={[
              ['S', tf('S · {kg} kg', { kg: r.classes[0]?.kg ?? 2 })],
              ['M', tf('M · {kg} kg', { kg: r.classes[1]?.kg ?? 5 })],
              ['grand', 'Plus grand'],
            ]}
          />
          {mode === 'grand' ? (
            <>
              <div className="t12 c2 mt8" style={{ lineHeight: '1.45' }}>
                {tf('Au-delà de {kg} kg ou {cm} cm, la classe se calcule : poids facturé = le plus grand du poids et du volume ÷ {d}.', { kg: r.mesures.seuilKg, cm: r.mesures.seuilCm, d: r.mesures.diviseur })}
              </div>
              {champ(poids, setPoids, 'aja-poids', 'Poids', 'kg')}
              <div className="aja-ligne-ch">
                {(['Longueur', 'Largeur', 'Hauteur'] as const).map((n, i) => (
                  <div key={n} style={{ flex: '1 1 80px' }}>
                    {champ(dims[i], (s) => setDims(dims.map((x, j) => (j === i ? s : x))), 'aja-dim-' + i, n, 'cm')}
                  </div>
                ))}
              </div>
              {classe && (
                <div className="note or" role="status">
                  <Icone nom="package" taille={16} />
                  <div>{tf('Classe du colis : {c}', { c: classe })}</div>
                </div>
              )}
            </>
          ) : (
            <div className="t12 c2 mt8">{tf('Jusqu’à {kg} kg et {cm} cm de côté.', { kg: r.classes.find((c) => c.classe === mode)?.kg ?? 0, cm: r.classes.find((c) => c.classe === mode)?.cm ?? 0 })}</div>
          )}
          <div className="fld">
            <label htmlFor="aja-delai-p">{t('Délai de préparation')}</label>
            <select id="aja-delai-p" className="inp" value={d} onChange={(e) => setD(Number(e.target.value))}>
              {r.delaisH.map((h) => (
                <option key={h} value={h}>
                  {delai(h)}
                </option>
              ))}
            </select>
          </div>
          <div className="row mt14" style={{ gap: '12px' }}>
            <div className="grow">
              <div className="t14 b7">{t('Accepter le paiement au retrait')}</div>
              <div className="t12 c3">{t(retrait ? 'Le client peut payer au relais, au retrait.' : 'Coupé, le client doit payer ce produit d’avance.')}</div>
            </div>
            <Interrupteur actif={retrait} changer={setRetrait} libelle="Accepter le paiement au retrait" />
          </div>
          {err && <div className="hint cr">{t(err)}</div>}
          <div className="mt14">
            <Bouton classe="primary" icone="check" type="submit">
              {t('Enregistrer')}
            </Bouton>
          </div>
        </form>
      )}
    </Feuille>
  )
}

export default function Livraison() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const delai = useDelai()
  const { dire, toast } = useToast()
  const [produit, setProduit] = useState<ProduitLivraison | null>(null)
  const [carte, setCarte] = useState(false)
  const lecture = useLecture(() => sourceAJA.livraison.reglages(), [s.membre?.role])
  if (lecture.erreur) return <Erreur c={C} erreur={lecture.erreur} relire={lecture.relire} texteReserve="Réservé à {nom}, propriétaire." />
  if (!lecture.donnees) return <Chargement c={C} />
  const r = lecture.donnees
  const verrou = !r.peutRegler
  const defaut = async (d: Partial<ReglagesLivraison['defauts']>, texte: string) => {
    const x = await sourceAJA.livraison.regler(d)
    if (x.ok) dire(texte)
  }
  return (
    <EcranAJ route={C.route} titre={C.titre} onglet={C.onglet} fixes={toast}>
      <div className="pg" style={{ paddingTop: '14px' }}>
        <h1 className="pg-t">{t('Envoyer vos produits')}</h1>
        <p className="pg-s">{t('Le livreur vient chercher le colis chez vous. Ici, ce qu’il faut savoir de vos produits pour l’envoi.')}</p>
      </div>
      {verrou && <Indice icone="lock">{s.proprietaire ? tf('Lecture seule : ces réglages sont réservés à {nom}, propriétaire.', { nom: `${s.proprietaire.prenom} ${s.proprietaire.nom}` }) : t('Lecture seule : réservé au propriétaire.')}</Indice>}

      <div className="aja-deux">
        <div className="card" style={{ marginTop: '14px' }}>
          <h3 className="b8 t15" style={{ margin: 0 }}>
            {t('Pour chaque nouveau produit')}
          </h3>
          <div className="t12 c3 mt4">{t('Repris à l’ajout d’un produit ; vous pouvez changer chaque produit ensuite.')}</div>
          <div className="fld" style={{ marginBottom: 0 }}>
            <label>{t('Colis par défaut (produit sans gabarit)')}</label>
          </div>
          <Selecteur
            etiquette="Colis par défaut"
            valeur={r.defauts.colis === 'M' ? 'M' : 'S'}
            changer={(c) => !verrou && void defaut({ colis: c }, tf('Colis par défaut : {c}', { c }))}
            choix={[
              ['S', tf('S · {kg} kg', { kg: r.classes[0]?.kg ?? 2 })],
              ['M', tf('M · {kg} kg', { kg: r.classes[1]?.kg ?? 5 })],
            ]}
          />
          <div className="fld">
            <label htmlFor="aja-delai">{t('Délai de préparation')}</label>
            <select id="aja-delai" className="inp" value={r.defauts.delaiH} disabled={verrou} onChange={(e) => void defaut({ delaiH: Number(e.target.value) }, tf('Délai par défaut : {d}', { d: delai(Number(e.target.value)) }))}>
              {r.delaisH.map((h) => (
                <option key={h} value={h}>
                  {delai(h)}
                </option>
              ))}
            </select>
            <div className="t12 c3 mt4">{t('Compté pendant vos heures d’ouverture seulement.')}</div>
          </div>
          <div className="row mt14" style={{ gap: '12px' }}>
            <div className="grow">
              <div className="t14 b7">{t('Accepter le paiement au retrait')}</div>
              <div className="t12 c3">{t('Une commande payable au retrait se prépare pareil ; un refus ne vous coûte rien.')}</div>
            </div>
            <Interrupteur actif={r.defauts.paiementAuRetrait} verrou={verrou} changer={(v) => void defaut({ paiementAuRetrait: v }, t(v ? 'Paiement au retrait accepté par défaut' : 'Paiement au retrait coupé par défaut'))} libelle="Accepter le paiement au retrait par défaut" />
          </div>
        </div>

        <div className="card" style={{ marginTop: '14px' }}>
          <h3 className="b8 t15" style={{ margin: 0 }}>
            {t('Créneaux de ramassage préférés')}
          </h3>
          <div className="t12 c3 mt4">{t('Le livreur passe dans l’un d’eux. S’il ne vient pas, votre délai est suspendu jusqu’au créneau suivant.')}</div>
          {r.creneaux.map((c) => (
            <div key={c.id} className="li">
              <span className="ic">
                <Icone nom="truck" taille={18} />
              </span>
              <span className="grow lt">{`${t(c.jours)} · ${creneau([c.de, c.a], langue)}`}</span>
              <Interrupteur
                actif={c.prefere}
                verrou={verrou}
                libelle={`${t('Créneau préféré')} · ${t(c.jours)} ${creneau([c.de, c.a], langue)}`}
                changer={async (v) => {
                  const x = await sourceAJA.livraison.creneau(c.id, v)
                  if (!x.ok) dire(t(x.raison === 'dernier' ? 'Gardez au moins un créneau.' : 'Réservé au propriétaire.'))
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="sec">
        <h2>{t('Colis et préparation par produit')}</h2>
      </div>
      <div className="card tight" style={{ marginTop: 0 }}>
        {r.produits.map((p, i) => (
          <button key={p.offreId} type="button" className="li" disabled={verrou} onClick={() => setProduit(p)} style={{ width: '100%', background: 'none', border: 0, borderTop: i ? '1px solid var(--line)' : 0, font: 'inherit', color: 'inherit', textAlign: 'left', cursor: verrou ? 'default' : 'pointer' }} aria-label={tf('Régler le colis de {p}', { p: `${p.titre} ${t(p.variante)}` })}>
            <Vignette nom={p.dessin} taille={40} />
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {`${p.titre} · ${t(p.variante)}`}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {`${tf('Colis {c}', { c: p.colis })} · ${delai(p.delaiPreparationH)} · ${t(p.paiementAuRetrait ? 'retrait accepté' : 'payé d’avance')}`}
              </span>
            </span>
            {!verrou && (
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="sec">
        <h2>{t('Relais BelivaY proches')}</h2>
      </div>
      <Plan r={r} carte={carte} setCarte={setCarte} />
      <div className="card tight" style={{ marginTop: '8px' }}>
        {r.relais.map((x) => (
          <div key={x.id} className="li">
            <span className={'ic' + (x.prefere ? ' or' : '')}>
              <Icone nom="map-pin" taille={18} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {x.nom}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {`${distance(x.distanceM, langue)} · ${t(x.horaires)}`}
              </span>
              <a href={lienOsm(x.position)} target="_blank" rel="noreferrer" className="t12 b8 cor" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '32px' }}>
                {t('Voir sur la carte')}
              </a>
            </span>
            <Interrupteur
              actif={x.prefere}
              verrou={verrou}
              libelle={`${t('Relais préféré')} · ${x.nom}`}
              changer={async (v) => {
                const y = await sourceAJA.livraison.relais(x.id, v)
                if (!y.ok) dire(y.raison === 'max' ? tf('{n} relais préférés au plus.', { n: r.relaisMax }) : t('Réservé au propriétaire.'))
              }}
            />
          </div>
        ))}
      </div>
      <div className="t12 c3 mt6">{tf('Vos relais préférés ({n} au plus) s’affichent en premier sur le plan.', { n: r.relaisMax })}</div>

      <div className="sec">
        <h2>{t('Emballage')}</h2>
      </div>
      <div className="card" style={{ marginTop: 0 }}>
        <div className="row" style={{ gap: '12px', alignItems: 'flex-start' }}>
          <span className="ic" style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--green-soft)', color: 'var(--green)', flexShrink: 0 }}>
            <Icone nom="package-check" taille={20} />
          </span>
          <div className="grow">
            <div className="b8 t15">{t('Vous ne faites pas le colis')}</div>
            <div className="t13 c2 mt4">{t('Le livreur emballe et scelle devant vous.')}</div>
          </div>
        </div>
        <div className="divider-t">{t('Ce que vous préparez')}</div>
        {['L’article de la commande : bon modèle, bonne variante, bon état.', 'Ses accessoires et sa boîte d’origine, comme sur la fiche.', 'Un article volumineux garde son carton d’origine : le livreur le filme.'].map((x) => (
          <div key={x} className="row t13 c2" style={{ gap: '8px', marginTop: '8px', alignItems: 'flex-start', lineHeight: '1.45' }}>
            <Icone nom="check" taille={16} style={{ color: 'var(--green)', flexShrink: 0, marginTop: '1px' }} />
            <span>{t(x)}</span>
          </div>
        ))}
        <details style={{ marginTop: '12px' }}>
          <summary className="t13 b8" style={{ minHeight: '44px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            {t('Ce que fait le livreur')}
          </summary>
          {['Il contrôle l’article devant vous.', 'Il prend deux photos : l’article à découvert, puis le colis fermé et étiqueté.', 'Il emballe dans un emballage BelivaY et scelle.', 'Aucun code à écrire, aucun emballage à acheter.'].map((x, i) => (
            <div key={x} className="row t13 c2" style={{ gap: '8px', marginTop: '6px', lineHeight: '1.45' }}>
              <span className="b8 cor">{`${i + 1}.`}</span>
              <span>{t(x)}</span>
            </div>
          ))}
        </details>
      </div>
      <div className="mt14">
        <Bouton classe="secondary" icone="clock" vers={chemin('horaires')}>
          {t('Mes horaires d’ouverture')}
        </Bouton>
      </div>
      <Indice icone="info">
        {t('Le client choisit son relais ; vous ne le voyez jamais.')}{' '}
        <Link to={chemin('aide')} className="cor b7">
          {t('Aide')}
        </Link>
      </Indice>
      <FeuilleProduit r={r} p={produit} fermer={() => setProduit(null)} fini={(x) => (setProduit(null), dire(x))} />
    </EcranAJ>
  )
}
