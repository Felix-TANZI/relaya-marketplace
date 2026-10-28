// Promotions et réductions (AJ-A, DP-58) : une promotion passe SEULEMENT par une vente flash à remise vérifiée
// (OFR-05, VD12-R38, DEC-17, VD10-R40) — remise réelle de FLASH-REMISE-MIN au moins, prix barré = prix réellement
// pratiqué (le plus bas des 30 derniers jours, jamais saisi), vraie fin et vrai stock (VIS-03, VD08-R06), durée
// FLASH-DUREE-MAX au plus, remise au-delà du seuil relue par la console sous 24 h (P-3), rien sous le Trust Score
// minimum ni en rupture (REFVD-R291) ; gratuite, jamais « Sponsorisé », aucune visibilité payante (DP-14, Q-32).
// - Remise en pourcentage ou en montant, sur une variante (Q-35 : chaque variante est une offre) ; début et fin.
// - Aperçu : ce que voit le client (prix barré, prix remisé, −X %, fin réelle) et ce que je garde : la commission se
//   calcule sur le prix remisé (F9), planchers compris ; refusée si je garderais moins de 0 F (DP-55 « BelivaY ne
//   perd jamais ») ou sous le prix minimum.
// - En cours / programmées / terminées ; « Arrêter » une promotion active (fin réelle immédiate).
// - Réservé au propriétaire (prix, VD02-DR05) ; FF-FLASH fermé : la page le dit, rien ne se programme (VD08-R33).
// - Adresses : ?p=<offre> ouvre le formulaire sur ce produit (raccourci de « Une offre ») ; ?nouvelle=1.
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { F } from '@client/i18n/format'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { useLecture } from '../../donnees/useLecture'
import { duree, echeance } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { HEURE, DECALAGE_YAOUNDE_MS } from '../../calculs/temps'
import { Bouton, Chargement, Erreur, Feuille, Indice, Selecteur, useToast, type Coque } from './commun'
import { EcranAJ } from './coque'
import { sourceAJA } from './donnees/source'
import type { ApercuPromotion, OffrePromouvable, Promotion, RefusPromotion, ReglesPromotion, TypeRemise } from './donnees/types'

const C: Coque = { route: 'promotions', titre: 'Promotions', onglet: 'produits' }
type Onglet = 'en_cours' | 'programmees' | 'terminees'

// Saisie de date et heure (heure de Yaoundé, UTC+1) ⇄ instant.
const versSaisie = (ms: number) => new Date(ms + DECALAGE_YAOUNDE_MS).toISOString().slice(0, 16)
const deSaisie = (v: string) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? Date.parse(v + ':00Z') - DECALAGE_YAOUNDE_MS : NaN)
const quartSuivant = (ms: number) => Math.ceil(ms / (15 * 60_000)) * 15 * 60_000

const REFUS: Record<RefusPromotion, string> = {
  ferme: 'Les ventes flash ne sont pas ouvertes pour le moment.',
  remise_min: 'Remise trop faible : {min} % au moins sur le prix pratiqué.',
  remise_max: 'Remise trop forte : moins de 90 %.',
  garde_negatif: 'Refusée : à ce prix, vous garderiez moins de 0 F après la commission minimale.',
  prix_min: 'Refusée : le prix remisé passe sous le prix minimum de {prix} F.',
  dates: 'La fin doit venir après le début, et le début pas dans le passé.',
  duree: 'Une vente flash dure {h} h au plus.',
  trop_loin: 'Le début se programme {j} jours à l’avance au plus.',
  chevauche: 'Une autre promotion de ce produit tombe sur ces dates.',
  rupture: 'Produit en rupture : réapprovisionnez avant une promotion.',
  etat: 'Seul un produit en vente peut avoir une promotion.',
  score: 'Pas de mise en avant sous un Trust Score de {s}.',
  valeur: 'Indiquez une remise : un pourcentage entier ou un montant en francs.',
}

function texteRefus(r: RefusPromotion, g: ReglesPromotion, tf: (k: string, v: Record<string, string | number>) => string) {
  return tf(REFUS[r], { min: g.remiseMin, prix: F(g.prixMin), h: g.dureeMaxHeures, j: g.programmerJoursMax, s: g.scoreMin })
}

function PastilleEtat({ e }: { e: Promotion['etat'] }) {
  const { t } = usePreferences()
  const [ton, nom] = { en_cours: ['green', 'En cours'], programmee: ['or', 'Programmée'], en_verification: ['violet', 'Relue par BelivaY'], terminee: ['ink', 'Terminée'], arretee: ['ink', 'Arrêtée'] }[e]
  return (
    <span className={'pill sm ' + ton}>
      {e === 'en_cours' && <i className="d"></i>}
      {t(nom)}
    </span>
  )
}

/** La fiche telle que le client la voit pendant la vente flash (même famille que CL-06), sans nom de boutique. */
function VueClient({ dessin, titre, variante, ref_, promo, remise, fin, maintenant }: { dessin: string; titre: string; variante: string; ref_: number; promo: number; remise: number; fin: number; maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  return (
    <div className="aja-client" aria-label={t('Ce que voit le client')}>
      <Vignette nom={dessin} taille={56} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="t13 b7">{`${titre} · ${t(variante)}`}</div>
        <div className="row" style={{ gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
          <span className="b8 t17 cor">{t(`${F(promo)} F`)}</span>
          <span className="aja-barre t13">{t(`${F(ref_)} F`)}</span>
          <span className="aja-remise">{`−${String(Math.floor(remise)).replace('.', ',')} %`}</span>
        </div>
        <div className="t12 c3 mt4">{fin > maintenant ? tf('Vente flash · se termine {quand}', { quand: echeance(fin, maintenant, langue) }) : t('Vente flash terminée')}</div>
      </div>
    </div>
  )
}

function CartePromo({ p, maintenant, arreter }: { p: Promotion; maintenant: number; arreter: () => void }) {
  const { t, tf, langue } = usePreferences()
  const active = p.etat === 'en_cours' || p.etat === 'programmee' || p.etat === 'en_verification'
  return (
    <div className="card" data-promo={p.id}>
      <div className="otop">
        <PastilleEtat e={p.etat} />
        {p.origine === 'merite' && <span className="pill green sm">{t('Offerte au mérite')}</span>}
        {p.origine === 'selection' && <span className="pill violet sm">{t('Sélection BelivaY')}</span>}
        <span className="t12 b7 c3">{p.etat === 'en_cours' ? tf('il reste {d}', { d: duree(p.fin - maintenant, langue) }) : p.etat === 'programmee' ? tf('commence {quand}', { quand: echeance(p.debut, maintenant, langue) }) : p.etat === 'en_verification' && p.relueAvant ? tf('réponse avant {quand}', { quand: echeance(p.relueAvant, maintenant, langue) }) : echeance(p.arreteeA ?? p.fin, maintenant, langue)}</span>
      </div>
      <div style={{ marginTop: '10px' }}>
        <VueClient dessin={p.dessin} titre={p.titre} variante={p.variante} ref_={p.prixReference} promo={p.prixPromo} remise={p.remisePourCent} fin={p.arreteeA ?? p.fin} maintenant={maintenant} />
      </div>
      <div className="kv mt8">
        <span className="k">{t('Vous gardez par vente')}</span>
        <span className="v cg">{tf('{g} F au lieu de {a} F', { g: F(p.gardePromo), a: F(p.gardeAvant) })}</span>
      </div>
      <div className="kv">
        <span className="k">{t('Dates')}</span>
        <span className="v">{`${echeance(p.debut, maintenant, langue)} → ${echeance(p.fin, maintenant, langue)}`}</span>
      </div>
      {!active || p.vendues ? (
        <div className="kv">
          <span className="k">{t('Vendus pendant la promotion')}</span>
          <span className="v">{String(p.vendues)}</span>
        </div>
      ) : null}
      {active && (
        <div className="mt12">
          <Bouton classe="secondary" icone="circle-pause" onClick={arreter}>
            {t(p.etat === 'en_cours' ? 'Arrêter la promotion' : 'Annuler la promotion')}
          </Bouton>
        </div>
      )}
    </div>
  )
}

function Formulaire({ regles, offres, depart, maintenant, creee }: { regles: ReglesPromotion; offres: OffrePromouvable[]; depart: string | null; maintenant: number; creee: (p: Promotion) => void }) {
  const { t, tf } = usePreferences()
  const premiere = offres.find((o) => o.offreId === depart && !o.bloque) ?? offres.find((o) => !o.bloque) ?? null
  const [offreId, setOffreId] = useState(premiere?.offreId ?? '')
  const [type, setType] = useState<TypeRemise>('pourcent')
  const [valeur, setValeur] = useState(String(regles.remiseMin))
  const [debutTxt, setDebutTxt] = useState(versSaisie(quartSuivant(maintenant)))
  const [finTxt, setFinTxt] = useState(versSaisie(quartSuivant(maintenant) + 24 * HEURE))
  const [envoi, setEnvoi] = useState(false)
  const debut = deSaisie(debutTxt)
  const fin = deSaisie(finTxt)
  const v = Number(valeur.replace(',', '.'))
  const o = offres.find((x) => x.offreId === offreId) ?? null
  const ap = useLecture<ApercuPromotion | null>(() => (o ? sourceAJA.promotions.apercu({ offreId, type, valeur: v, debut, fin }) : Promise.resolve(null)), [offreId, type, v, debut, fin])
  const a = ap.donnees
  const choisirDuree = (h: number) => setFinTxt(versSaisie((Number.isNaN(debut) ? quartSuivant(maintenant) : debut) + h * HEURE))
  const dureeH = !Number.isNaN(debut) && !Number.isNaN(fin) ? Math.round((fin - debut) / HEURE) : null
  if (!o)
    return (
      <div className="card">
        <div className="empty">
          <div className="ei">
            <Icone nom="tag" taille={24} />
          </div>
          <h3>{t('Aucun produit à mettre en promotion')}</h3>
          <p>{t('Il faut un produit en vente, avec du stock, sans autre promotion prévue.')}</p>
        </div>
        <Bouton classe="secondary" icone="package" vers={chemin('produits')}>
          {t('Voir mes produits')}
        </Bouton>
      </div>
    )
  const creer = async () => {
    if (!a || a.refus || envoi) return
    setEnvoi(true)
    const r = await sourceAJA.promotions.creer({ offreId, type, valeur: v, debut, fin })
    setEnvoi(false)
    if (!r.ok) return jouer('erreur')
    jouer('paiement')
    creee(r.promotion)
  }
  return (
    <div className="card" id="aja-nouvelle">
      <h3 className="b8 t17" style={{ margin: 0 }}>
        {t('Nouvelle promotion')}
      </h3>
      <div className="fld">
        <label htmlFor="aja-produit">{t('Produit et variante')}</label>
        <select id="aja-produit" className="inp" value={offreId} onChange={(e) => setOffreId(e.target.value)}>
          {offres.map((x) => (
            <option key={x.offreId} value={x.offreId} disabled={!!x.bloque}>
              {`${x.titre} · ${t(x.variante)} · ${t(`${F(x.prix)} F`)}${x.bloque ? ' · ' + t(x.bloque === 'rupture' ? 'en rupture' : x.bloque === 'promotion' ? 'déjà en promotion' : 'pas en vente') : ''}`}
            </option>
          ))}
        </select>
      </div>
      <div className="fld" style={{ marginBottom: 0 }}>
        <label id="aja-type">{t('Type de remise')}</label>
      </div>
      <Selecteur
        etiquette="Type de remise"
        valeur={type}
        changer={(x) => {
          setType(x)
          setValeur(x === 'pourcent' ? String(regles.remiseMin) : String(Math.ceil((o.prixReference * regles.remiseMin) / 100 / 100) * 100))
        }}
        choix={[
          ['pourcent', 'Pourcentage'],
          ['montant', 'Montant en F'],
        ]}
      />
      <div className="fld">
        <label htmlFor="aja-valeur">{t(type === 'pourcent' ? 'Remise (%)' : 'Remise (F)')}</label>
        <div className={'inp' + (a?.refus && ['remise_min', 'remise_max', 'valeur', 'garde_negatif', 'prix_min'].includes(a.refus) ? ' err' : '')}>
          <input id="aja-valeur" inputMode="numeric" value={valeur} onChange={(e) => setValeur(e.target.value.replace(/[^\d]/g, '').slice(0, 7))} style={{ border: 0, background: 'none', outline: 'none', font: 'inherit', fontSize: '18px', fontWeight: 800, color: 'var(--ink)', flex: 1, minWidth: 0 }} />
          <span className="t14 b7 c3">{type === 'pourcent' ? '%' : 'F'}</span>
        </div>
      </div>
      {type === 'pourcent' && (
        <div className="chips">
          {[regles.remiseMin, 15, 20, 25, 30]
            .filter((x, i, l) => x >= regles.remiseMin && l.indexOf(x) === i)
            .map((x) => (
              <button key={x} type="button" className={'chip' + (v === x ? ' on' : '')} onClick={() => setValeur(String(x))}>
                {`${x} %`}
              </button>
            ))}
        </div>
      )}
      <div className="aja-ligne-ch">
        <div className="fld">
          <label htmlFor="aja-debut">{t('Début')}</label>
          <input id="aja-debut" type="datetime-local" className={'inp' + (a?.refus === 'dates' || a?.refus === 'trop_loin' ? ' err' : '')} value={debutTxt} onChange={(e) => setDebutTxt(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', font: 'inherit', fontSize: '15px' }} />
        </div>
        <div className="fld">
          <label htmlFor="aja-fin">{t('Fin')}</label>
          <input id="aja-fin" type="datetime-local" className={'inp' + (a?.refus === 'dates' || a?.refus === 'duree' ? ' err' : '')} value={finTxt} onChange={(e) => setFinTxt(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', font: 'inherit', fontSize: '15px' }} />
        </div>
      </div>
      <div className="chips" role="group" aria-label={t('Durée')}>
        {[6, 12, 24, regles.dureeMaxHeures]
          .filter((x, i, l) => x <= regles.dureeMaxHeures && l.indexOf(x) === i)
          .map((h) => (
            <button key={h} type="button" className={'chip' + (dureeH === h ? ' on' : '')} onClick={() => choisirDuree(h)}>
              {tf('{h} h', { h })}
            </button>
          ))}
      </div>

      <div className="divider-t">{t('Aperçu')}</div>
      {a && (
        <>
          <VueClient dessin={o.dessin} titre={o.titre} variante={o.variante} ref_={a.prixReference} promo={a.prixPromo} remise={a.remisePourCent} fin={Number.isNaN(fin) ? maintenant : fin} maintenant={maintenant} />
          <div className="t12 c3 mt6" style={{ lineHeight: '1.4' }}>
            {tf('Prix barré : {p} F, le plus bas pratiqué ces {j} derniers jours.', { p: F(a.prixReference), j: regles.joursReference })}
          </div>
          {a.gardePromo !== null ? (
            <div className="keep" style={{ display: 'block', marginTop: '12px' }}>
              <div className="row" style={{ gap: '8px' }}>
                <span className="grow kl">{t('Vous gardez par vente')}</span>
                <span className="kv2" data-garde={a.gardePromo}>
                  {t(`${F(a.gardePromo)} F`)}
                </span>
              </div>
              <div className="t12 c2" style={{ marginTop: '4px', lineHeight: '1.45' }}>
                {tf('Au lieu de {a} F sans promotion. Commission {c} F, calculée sur le prix remisé.', { a: F(a.gardeAvant), c: F(a.commissionPromo ?? 0) })}
                {a.plancherApplique ? t(' La commission minimale s’applique.') : ''}
              </div>
            </div>
          ) : null}
          {a.refus ? (
            <div className="note red" role="alert">
              <Icone nom="circle-alert" taille={16} />
              <div>{texteRefus(a.refus, regles, tf)}</div>
            </div>
          ) : a.relue ? (
            <div className="note or">
              <Icone nom="shield-check" taille={16} />
              <div>{tf('Remise de plus de {s} % : BelivaY la relit sous {h} h avant qu’elle commence.', { s: regles.relueAuDela, h: regles.relectureHeures })}</div>
            </div>
          ) : null}
        </>
      )}
      <div className="mt14">
        <Bouton classe="primary" icone="zap" inactif={!a || !!a.refus || envoi} onClick={() => void creer()}>
          {t('Programmer la promotion')}
        </Bouton>
      </div>
    </div>
  )
}

export default function Promotions() {
  const { t, tf } = usePreferences()
  const maintenant = useHorloge()
  const [params, setParams] = useSearchParams()
  const { dire, toast } = useToast()
  const depart = params.get('p')
  const [ouvert, setOuvert] = useState(!!depart || params.get('nouvelle') === '1')
  const [onglet, setOnglet] = useState<Onglet>('en_cours')
  const [succes, setSucces] = useState<Promotion | null>(null)
  const [arret, setArret] = useState<Promotion | null>(null)
  const lecture = useLecture(() => Promise.all([sourceAJA.promotions.regles(), sourceAJA.promotions.liste(), sourceAJA.promotions.offres()]), [])
  useEffect(() => {
    if (ouvert && depart) document.getElementById('aja-nouvelle')?.scrollIntoView?.({ block: 'start' })
  }, [ouvert, depart, lecture.donnees === null])
  const groupes = useMemo(() => {
    const l = lecture.donnees?.[1] ?? []
    return {
      en_cours: l.filter((p) => p.etat === 'en_cours'),
      programmees: l.filter((p) => p.etat === 'programmee' || p.etat === 'en_verification'),
      terminees: l.filter((p) => p.etat === 'terminee' || p.etat === 'arretee'),
    }
  }, [lecture.donnees])
  if (lecture.erreur) return <Erreur c={C} erreur={lecture.erreur} relire={lecture.relire} texteReserve="Les prix et les promotions sont réservés à {nom}, propriétaire. Vous pouvez mettre à jour le stock." />
  if (!lecture.donnees) return <Chargement c={C} />
  const [regles, , offres] = lecture.donnees
  const visibles = groupes[onglet]
  const fermer = () => {
    setOuvert(false)
    if (params.has('p') || params.has('nouvelle')) setParams({}, { replace: true })
  }
  return (
    <EcranAJ route={C.route} titre={C.titre} onglet={C.onglet} fixes={toast}>
      <div className="pg" style={{ paddingTop: '14px' }}>
        <h1 className="pg-t">{t('Vos ventes flash')}</h1>
        <p className="pg-s">{t('Une promotion, c’est une vente flash : remise réelle, vraie fin, vrai stock. Gratuite, jamais « Sponsorisé ».')}</p>
      </div>

      {!regles.ouvert ? (
        <div className="card" style={{ marginTop: '14px' }}>
          <div className="empty">
            <div className="ei">
              <Icone nom="clock" taille={24} />
            </div>
            <h3>{t('Les ventes flash ouvrent bientôt')}</h3>
            <p>{t('Vous pourrez programmer vos promotions ici dès leur ouverture côté client.')}</p>
          </div>
        </div>
      ) : (
        <>
          {succes && (
            <div className="note green blv-succes" role="status">
              <Icone nom="circle-check" taille={18} />
              <div>
                <b>{t(succes.etat === 'en_verification' ? 'Promotion envoyée à BelivaY' : succes.etat === 'en_cours' ? 'Promotion en cours' : 'Promotion programmée')}</b>
                {` · ${succes.titre} ${t(succes.variante)} · −${String(succes.remisePourCent).replace('.', ',')} %`}
              </div>
            </div>
          )}
          {ouvert ? (
            <>
              <Formulaire
                regles={regles}
                offres={offres}
                depart={depart}
                maintenant={maintenant}
                creee={(p) => {
                  setSucces(p)
                  fermer()
                  setOnglet(p.etat === 'en_cours' ? 'en_cours' : 'programmees')
                  dire(t('Promotion enregistrée'))
                }}
              />
              <div className="center">
                <button type="button" className="t13 b7 c2" onClick={fermer} style={{ minHeight: '44px', background: 'none', border: 0, font: 'inherit', fontWeight: 700, cursor: 'pointer' }}>
                  {t('Annuler')}
                </button>
              </div>
            </>
          ) : (
            <div className="mt14">
              <Bouton classe="primary" icone="plus" onClick={() => (setOuvert(true), setSucces(null))}>
                {t('Nouvelle promotion')}
              </Bouton>
            </div>
          )}
          <Selecteur
            etiquette="Filtrer les promotions"
            valeur={onglet}
            changer={setOnglet}
            choix={[
              ['en_cours', 'En cours', groupes.en_cours.length],
              ['programmees', 'Programmées', groupes.programmees.length],
              ['terminees', 'Terminées', groupes.terminees.length],
            ]}
          />
          {visibles.length === 0 ? (
            <div className="card" style={{ marginTop: '12px' }}>
              <div className="empty">
                <div className="ei">
                  <Icone nom="ticket-percent" taille={24} />
                </div>
                <h3>{t(onglet === 'en_cours' ? 'Aucune promotion en cours' : onglet === 'programmees' ? 'Aucune promotion programmée' : 'Aucune promotion terminée')}</h3>
                <p>{t('Une vente flash attire les clients de votre zone pendant quelques heures.')}</p>
              </div>
            </div>
          ) : (
            <div className="aja-liste deux">
              {visibles.map((p) => (
                <CartePromo key={p.id} p={p} maintenant={maintenant} arreter={() => setArret(p)} />
              ))}
            </div>
          )}
          <Indice icone="megaphone">
            {t('Plus de visibilité : candidatez à une vente flash sur sélection BelivaY. ')}
            <Link to={chemin('publicite_nouvelle', { type: 'flash' })}>{t('Publicité')}</Link>
          </Indice>
          <Indice icone="info">{tf('Règles : remise réelle de {min} % au moins sur le prix pratiqué, {h} h au plus, rien sous un Trust Score de {s}. La commission se calcule sur le prix payé.', { min: regles.remiseMin, h: regles.dureeMaxHeures, s: regles.scoreMin })}</Indice>
        </>
      )}

      <Feuille ouverte={!!arret} fermer={() => setArret(null)} titre={t('Arrêter la promotion')}>
        {arret && (
          <>
            <h2 className="pg-t" style={{ fontSize: '19px' }}>
              {t(arret.etat === 'en_cours' ? 'Arrêter la promotion ?' : 'Annuler la promotion ?')}
            </h2>
            <p className="pg-s">{t(arret.etat === 'en_cours' ? 'Le prix revient tout de suite à votre prix habituel. Les commandes déjà payées gardent le prix remisé.' : 'Elle ne commencera pas. Vous pourrez en programmer une autre.')}</p>
            <div className="split2 mt14">
              <Bouton classe="secondary" onClick={() => setArret(null)}>
                {t('Garder')}
              </Bouton>
              <Bouton
                classe="danger"
                icone="circle-pause"
                onClick={async () => {
                  const r = await sourceAJA.promotions.arreter(arret.id)
                  setArret(null)
                  if (r.ok) {
                    jouer('interrupteur')
                    dire(t('Promotion arrêtée'))
                    setOnglet('terminees')
                  }
                }}
              >
                {t(arret.etat === 'en_cours' ? 'Arrêter' : 'Annuler la promotion')}
              </Bouton>
            </div>
          </>
        )}
      </Feuille>
    </EcranAJ>
  )
}
