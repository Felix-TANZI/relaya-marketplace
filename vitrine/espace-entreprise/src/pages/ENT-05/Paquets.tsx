// ENT-P10 — Paquets disponibles, repris sur le prototype (route('paquets') : tête datée et « Régler les alertes »,
// capacité libre par zone en quatre indicateurs, recherche et filtres, cartes de paquet, « Accepter vous engage »,
// « Son et notification par zone », note de pied). Les paquets que BelivaY publie à l'entreprise par zone (DP-63 :
// groupés vers les relais, une seule commande à domicile), seulement ceux qu'elle peut prendre (zone déclarée, palier,
// ENT-P10R-01), triés par échéance d'acceptation ; anneau du compte à rebours et fenêtre de priorité du premier rang
// (ENT-P10R-04) ; capacité libre par zone (ENT-PUB-06 : à 0, plus d'acceptation) ; ni nom de boutique ni client avant
// l'acceptation (ENT-P10R-02) ; un paquet pris ailleurs disparaît en moins de 3 s (relecture continue, ENT-02-R25) ;
// son et notification d'un nouveau paquet réglés par zone (ENT-P10R-03). Accepter : un geste, puis affecter SON livreur.
// Enrichi (ENRICHISSEMENTS.md, P10) : compte à rebours en direct sur chaque carte (ambre au seuil réglé dans Prix et
// délais) ; son et vibration à l'arrivée d'un paquet ; « Accepter » montré fait tout de suite, envoyé après 5 s sauf
// « Annuler », gardé hors connexion (geste) ; recherche « / », puces, tri (état dans l'adresse : ?q=, ?f=, ?tri=) ;
// capacité libre et plafond de valeur écrits sur la carte qu'ils bloquent ; « Accepter le plus urgent » au pouce.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { sonner } from '../../composants/marque-sonore'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import type { CodeZone } from '../../donnees/communs'
import type { Capacite, Paquet, RefusAcceptation } from '../../donnees/domaines/paquets'
import { Banniere, BarrePouce, correspond, Hint, Li, Limite, Note, Panel, Pill, Puces, Px, Rebours, Recherche, Sec, Tete, Tg, Tri, useAnnuler, useLarge, Vide as VideP } from '../../composants/prototype'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles, useSession } from '../../session'
import { Anneau, BandeauErreur, Chargement, Montant, NOM_GENRE, Retour, classesEnTexte, useDonnees, useDuree, useHeure, useSeuils } from './commun'
import { geste, useFile } from '../../donnees/fileHorsLigne'
import { REGLES, trancheTournee } from '../../calculs/livraison/regles-ecrans'

export const TEXTE_REFUS: Record<RefusAcceptation, string> = {
  pris: 'Déjà pris : un autre l’a accepté avant vous. Le paquet disparaît de la liste.',
  expire: 'Délai d’acceptation passé : le paquet est proposé à l’entreprise suivante.',
  capacite: 'Capacité de la zone atteinte : augmentez-la dans Zones et capacité avant d’accepter.',
  plafond: 'Un colis dépasse le plafond de votre palier : ce paquet ne peut pas vous être confié.',
  aucun_livreur: 'Aucun de vos livreurs n’est éligible et disponible pour ce paquet : accepter vous engagerait sans pouvoir le faire.',
}

/** Trajet d'un paquet en une ligne (« Boutique à Obili (Z2) → … → Relais Obili ») : quartiers avant l'acceptation. */
export function Trajet({ p }: { p: Paquet }) {
  const { t, tf } = usePreferences()
  return (
    <>
      {p.arrets.map((a, i) => (
        <span key={i}>
          {i > 0 && ' → '}
          {a.type === 'relais' ? (
            <b>{a.nom ?? p.relais}</b>
          ) : a.type === 'domicile' ? (
            <>
              <b>{tf('client à {q} ({z})', { q: a.quartier, z: a.zone })}</b>, {t('quartier seulement')}
            </>
          ) : (
            <>{a.nom ? `${a.nom} (${a.zone})` : tf('Boutique à {q} ({z})', { q: a.quartier, z: a.zone })}</>
          )}
        </span>
      ))}
    </>
  )
}

/** Nom d'une zone (« Z6 Biyem-Assi ») depuis les capacités déclarées. */
export const nomZone = (caps: Capacite[], z: string) => {
  const c = caps.find((x) => x.zone === z)
  return c ? `${c.zone} ${c.nom}` : z
}

/** Carte de paquet (entb-pq du prototype) : genre · zone, identifiant, trajet, repères, priorité ; anneau, rémunération, gestes. */
function CartePaquet({ p, caps, accepter, enCours, perime, bloque, garde, seuils }: { p: Paquet; caps: Capacite[]; accepter(p: Paquet): void; enCours: boolean; perime: string | null; bloque: ReactNode; garde: boolean; seuils: { acceptation: number; critique: number } }) {
  const { t, tf } = usePreferences()
  const h = useHeure()
  const duree = useDuree()
  const n = useHorloge(1000)
  const prio = !!p.prioriteJusqua && p.prioriteJusqua > n
  const tarif = p.genre === 'tournee_relais' ? trancheTournee(p.colis.nombre) : null
  const detailGain = tarif !== null && p.remuneration === p.colis.nombre * tarif ? `${p.colis.nombre} × ${F(tarif)} F` : p.genre === 'domicile' ? t('course à domicile, tout compris') : t('si les preuves sont complètes')
  const slots = [
    tf('{a} arrêts · {n} colis', { a: p.arrets.length, n: p.colis.nombre }),
    classesEnTexte(p.colis.classes),
    p.genre === 'domicile' ? t('1 commande, livrée seule') : tf('{n} commandes', { n: p.commandes }),
    p.colis.valeurMax !== null ? tf('Valeur max {m}', { m: F(p.colis.valeurMax) + ' F' }) : null,
    tf('Limite {h}', { h: h(p.heureLimite) }),
    tf('{km} km · {d}', { km: String(p.distanceKm).replace('.', ','), d: duree(p.dureeMin) }),
  ].filter(Boolean) as string[]
  return (
    <article className={'panel entb-pq' + (prio ? ' hot' : '')} aria-labelledby={'pq-' + p.id}>
      <div className="entb-pq-main">
        <div className="row wrap" style={{ gap: 8 }}>
          <span className="kick acc">
            {t(NOM_GENRE[p.genre])} · {nomZone(caps, p.zone)}
          </span>
          {prio && (
            <Pill ton="acc" sm icone="crown">
              {t('Premier rang')}
            </Pill>
          )}
          {p.modifie && (
            <Pill ton="amber" sm icone="triangle-alert">
              {t('Paquet modifié')}
            </Pill>
          )}
          {perime && (
            <Pill ton="ink" sm icone="cloud-off">
              {tf('Données de {h}', { h: perime })}
            </Pill>
          )}
          {garde && (
            <Pill ton="amber" sm icone="cloud-upload">
              {t('Acceptation gardée, envoyée au retour du réseau')}
            </Pill>
          )}
        </div>
        <h3 className="lv-pq-t">
          <Link className="entb-id" id={'pq-' + p.id} to={chemin('paquet', { id: p.id })}>
            {p.id}
          </Link>
        </h3>
        <div className="t13 c2 mt4">
          <Trajet p={p} />
        </div>
        <div className="row wrap mt12" style={{ gap: 6 }}>
          {slots.map((s) => (
            <span className="slot" key={s}>
              {s}
            </span>
          ))}
        </div>
        {prio && (
          <Note ton="acc" icone="crown" className="mt12">
            <b>{t('Fenêtre de priorité')}</b> · {tf('vous êtes au premier rang jusqu’à {h} ; ensuite, les autres entreprises de la zone le voient aussi.', { h: h(p.prioriteJusqua!) })}
          </Note>
        )}
        {bloque && <div className="lv-pq-lim">{bloque}</div>}
      </div>
      <div className="entb-pq-side">
        <div className="row" style={{ gap: 12 }}>
          <Anneau debut={p.publieLe} fin={p.accepterAvant} texte={false} />
          <div>
            <div className="t12 c3 b7">{t('Temps pour accepter')}</div>
            <div className="b8 t15">{tf('avant {h}', { h: h(p.accepterAvant) })}</div>
            <Rebours fin={p.accepterAvant} urgent={seuils.acceptation} critique={seuils.critique} className="lv-pq-rb" echu={t('Délai d’acceptation passé')} />
          </div>
        </div>
        <div className="entb-pay">
          <div className="t12 c3 b7">{t('Rémunération')}</div>
          {p.remuneration !== null ? (
            <>
              <div className="v">
                <Montant n={p.remuneration} />
              </div>
              <div className="t12 c3">{detailGain}</div>
            </>
          ) : (
            <div className="t13 c3 mt4">{t('Montant visible du propriétaire')}</div>
          )}
        </div>
        <div className="entb-pq-act">
          <button type="button" className="btn primary" disabled={enCours || !!bloque || garde} onClick={() => accepter(p)}>
            <Icone nom="check" taille={18} />
            {t('Accepter')}
          </button>
          <Link className="btn secondary" to={chemin('paquet', { id: p.id })} aria-label={tf('Détail de {id}', { id: p.id })}>
            {t('Détail')}
          </Link>
        </div>
      </div>
    </article>
  )
}

const FILTRE_LIMITE = [
  ['toutes', 'Heure limite'],
  ['2h', 'Heure limite dans moins de 2 h'],
  ['4h', 'Heure limite dans moins de 4 h'],
] as const

export default function Paquets() {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const h = useHeure()
  const duree = useDuree()
  const large = useLarge()
  const montants = useMontantsVisibles()
  // Relecture continue : un paquet pris ailleurs ou expiré disparaît en moins de 3 s (ENT-02-R25).
  const tic = useHorloge(2500)
  const l = useDonnees(() => source.paquets.disponibles(), [Math.floor(tic / 2500)])
  const reglages = useDonnees(() => source.paquets.alertes())
  const ent = useSession().entreprise
  const seuils = useSeuils()
  const file = useFile()
  const { differer, enCours: aEnvoyer, vue: avisAnnuler } = useAnnuler()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const f = (params.get('f') ?? 'tous') as 'tous' | 'premier' | 'urgent'
  const tri = (params.get('tri') ?? 'echeance') as 'echeance' | 'limite' | 'gain' | 'distance'
  const poser = (k: string, v: string, defaut: string) =>
    setParams(
      (x) => {
        const n = new URLSearchParams(x)
        if (v && v !== defaut) n.set(k, v)
        else n.delete(k)
        return n
      },
      { replace: true },
    )
  const setQ = (v: string) => poser('q', v, '')
  const [surcharge, setSurcharge] = useState<Record<string, boolean>>({}) // réglages gardés hors connexion
  const [zone, setZone] = useState('')
  const [genre, setGenre] = useState('')
  const [limite, setLimite] = useState<(typeof FILTRE_LIMITE)[number][0]>('toutes')
  const [enCours, setEnCours] = useState<string | null>(null)
  const [retour, setRetour] = useState<{ ton: 'ok' | 'rouge' | 'ambre'; texte: string; id?: string } | null>(null)

  // Nouveau paquet : son selon le réglage de sa zone (une fois par paquet).
  const vus = useRef<Set<string> | null>(null)
  useEffect(() => {
    const ps = l.donnees?.paquets
    if (!ps) return
    if (vus.current) {
      const nouveaux = ps.filter((p) => !vus.current!.has(p.id))
      if (nouveaux.some((p) => reglages.donnees?.find((r) => r.zone === p.zone)?.son ?? true)) {
        sonner('nouveauPaquet') // son et vibration (au téléphone), réglés avec le son de la zone
      }
    }
    vus.current = new Set(ps.map((p) => p.id))
  }, [l.donnees, reglages.donnees])

  const d = l.donnees
  const caps = d?.capacites ?? []
  const pleines = caps.filter((c) => c.capacite - c.acceptes <= 0)
  const urgent = (p: Paquet) => p.accepterAvant - tic < seuils.acceptation
  const premier = (p: Paquet) => !!p.prioriteJusqua && p.prioriteJusqua > tic
  const base = useMemo(() => {
    if (!d) return []
    return d.paquets.filter(
      (p) =>
        !aEnvoyer.has(p.id) &&
        (!zone || p.zone === zone) &&
        (!genre || p.genre === genre) &&
        (limite === 'toutes' || p.heureLimite - tic < (limite === '2h' ? 2 : 4) * 3_600_000) &&
        correspond(q, p.id, p.relais, p.zone, t(NOM_GENRE[p.genre]), ...p.arrets.map((a) => `${a.quartier} ${a.nom ?? ''}`)),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, q, zone, genre, limite, tic, aEnvoyer.size, t])
  const liste = useMemo(() => {
    const l = base.filter((p) => f === 'tous' || (f === 'premier' ? premier(p) : urgent(p)))
    const cle = (p: Paquet) => (tri === 'limite' ? p.heureLimite : tri === 'gain' ? -(p.remuneration ?? 0) : tri === 'distance' ? p.distanceKm : p.accepterAvant)
    return [...l].sort((a, b) => cle(a) - cle(b) || a.accepterAvant - b.accepterAvant)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, f, tri, seuils.acceptation])
  const garde = (id: string) => file.gestes.some((g) => g.objet === id && g.libelle === 'Accepter un paquet')
  /** Ce qui bloque l'acceptation d'un paquet, écrit sur sa carte : capacité libre de la zone, plafond de valeur du palier. */
  const bloque = (p: Paquet): ReactNode => {
    const c = caps.find((x) => x.zone === p.zone)
    const libre = c ? Math.max(0, c.capacite - c.acceptes) : null
    if (libre !== null && libre < p.colis.nombre)
      return <Limite icone="gauge" titre={tf('Capacité libre en {z} : {l} colis pour {n}', { z: p.zone, l: libre, n: p.colis.nombre })} atteinte={t('Acceptation bloquée : augmentez la capacité dans Zones et capacité.')} />
    if (ent && ent.plafond !== null && p.colis.valeurMax !== null && p.colis.valeurMax > ent.plafond)
      return <Limite icone="shield-check" titre={tf('Plafond de valeur : {m} par colis', { m: F(ent.plafond) + ' F' })} atteinte={t('Un colis dépasse le plafond de votre palier : ce paquet ne peut pas vous être confié.')} />
    return null
  }
  const plusUrgent = liste.find((p) => !bloque(p) && !garde(p.id))
  const nouveau = d?.paquets.find((p) => p.prioriteJusqua && p.prioriteJusqua > tic)
  const perime = l.erreur && l.derniere ? h(l.derniere) : null

  // Accepter : montré fait tout de suite (la carte sort de la liste), envoyé après 5 s sauf « Annuler » ; sans réseau,
  // gardé en file et envoyé au retour (un paquet pris entre-temps revient alors en refus, avec sa raison).
  const accepter = (p: Paquet) => {
    if (bloque(p)) return
    setRetour(null)
    differer(p.id, tf('Paquet {id} accepté', { id: p.id }), async () => {
      setEnCours(p.id)
      const r = await geste('Accepter un paquet', (s) => s.paquets.accepter(p.id), p.id)
      setEnCours(null)
      if (r.etat === 'en_file') {
        setRetour({ ton: 'ambre', texte: tf('Hors connexion : l’acceptation de {id} est gardée sur cet appareil et sera envoyée au retour du réseau.', { id: p.id }) })
      } else if (r.r.ok) {
        sonner('paquetAccepte')
        setRetour({ ton: 'ok', texte: tf('Paquet {id} accepté : affectez maintenant votre livreur.', { id: p.id }), id: p.id })
      } else {
        jouer('erreur')
        setRetour({ ton: 'rouge', texte: t(TEXTE_REFUS[r.r.raison]) })
      }
      l.relire()
    })
  }
  const regler = async (z: CodeZone, quoi: 'son' | 'notification', v: boolean) => {
    const r = await geste('Régler le son et la notification d’une zone', (s) => s.paquets.reglerAlerte(z, quoi, v), z)
    if (r.etat === 'en_file') setSurcharge((x) => ({ ...x, [z + quoi]: v }))
    else reglages.relire()
  }

  const acts = (
    <Link className="btn secondary sm" to={chemin('notifications')}>
      <Icone nom="bell" taille={16} />
      {t('Régler les alertes')}
    </Link>
  )
  const enJeu = montants && d ? d.paquets.reduce((s, p) => s + (p.remuneration ?? 0), 0) : 0
  const filtre = (on: boolean, icone: string | null, aria: string, valeur: string, changer: (v: string) => void, options: ReactNode) => (
    <label className={'flt' + (on ? ' on' : '')}>
      {icone && <Icone nom={icone} taille={15} />}
      <select value={valeur} onChange={(e) => changer(e.target.value)} aria-label={aria}>
        {options}
      </select>
    </label>
  )

  return (
    <Ecran route="paquets" actions={large ? acts : undefined}>
      <Px>
        <Tete
          route="paquets"
          titre={t('Paquets disponibles')}
        />
        {avisAnnuler}
        {l.erreur && <BandeauErreur erreur={l.erreur} relire={l.relire} derniere={l.derniere} echecs={l.echecs} />}
        {retour && (
          <Retour ton={retour.ton}>
            {retour.texte}{' '}
            {retour.id && (
              <button type="button" className="btn primary sm" style={{ marginLeft: 8 }} onClick={() => naviguer(chemin('affectation', { id: retour.id }))}>
                {t('Affecter un livreur')}
              </button>
            )}
          </Retour>
        )}

        {!d ? (
          <Chargement n={3} hauteur={220} />
        ) : (
          <>
            {pleines.length > 0 && (
              <Banniere
                ton="red"
                icone="circle-alert"
                className="mt16"
                role="status"
                bouton={
                  <span className="entb-bbtn">
                    <Link className="btn primary sm" to={chemin('zones')}>
                      <Icone nom="plus" taille={16} />
                      {t('Augmenter la capacité')}
                    </Link>
                  </span>
                }
              >
                <b>{tf('Capacité du jour atteinte en {z}.', { z: pleines.map((c) => c.zone).join(', ') })}</b> {t('Les nouveaux paquets de cette zone ne vous sont plus proposés tant que la capacité n’est pas augmentée ; les paquets déjà acceptés restent dus.')}
              </Banniere>
            )}
            {nouveau && (
              <Banniere ton="night" icone="bell-ring" className="mt16" role="status">
                <b>{tf('Nouveau paquet dans {z}', { z: nouveau.zone })}</b> · {tf('publié à {p}, au premier rang jusqu’à {h}. Le compte à rebours de {m} minutes a commencé.', { p: h(nouveau.publieLe), h: h(nouveau.prioriteJusqua!), m: REGLES.acceptationMin })}
              </Banniere>
            )}
            {d.prioritePerdueJusqua && (
              <Banniere ton="amber" icone="shield-alert" className="mt16" role="status">
                {tf('Fenêtre de priorité perdue jusqu’au {d} : plus de {n} paquets rendus sur {j} jours.', { d: h(d.prioritePerdueJusqua), n: REGLES.rendus.max, j: REGLES.rendus.surJours })}
              </Banniere>
            )}

            <div className="g g21">
              <div>
                <div className="dt-wrap" style={{ marginTop: 16 }}>
                  <div className="dt-tools lv-pq-outils" role="search">
                    <Recherche q={q} setQ={setQ} placeholder={t('Paquet, quartier…')} aria={t('Rechercher un paquet')} />
                    <div className="e-filtres">
                    {filtre(
                      true,
                      'map-pin',
                      t('Zone'),
                      zone,
                      setZone,
                      <>
                        <option value="">{t('Zone : toutes')}</option>
                        {caps.map((c) => (
                          <option key={c.zone} value={c.zone}>
                            {c.zone} · {c.nom}
                          </option>
                        ))}
                      </>,
                    )}
                    {filtre(
                      !!genre,
                      null,
                      t('Type'),
                      genre,
                      setGenre,
                      <>
                        <option value="">{t('Type')}</option>
                        {(['tournee_relais', 'domicile', 'collecte', 'retour', 'transfert', 'mixte'] as const).map((g) => (
                          <option key={g} value={g}>
                            {t(NOM_GENRE[g])}
                          </option>
                        ))}
                      </>,
                    )}
                    {filtre(
                      limite !== 'toutes',
                      null,
                      t('Heure limite'),
                      limite,
                      (v) => setLimite(v as typeof limite),
                      FILTRE_LIMITE.map(([v, n]) => (
                        <option key={v} value={v}>
                          {t(n)}
                        </option>
                      )),
                    )}
                    <span className="sp"></span>
                    <Tri
                      tri={tri}
                      setTri={(v) => poser('tri', v, 'echeance')}
                      options={[
                        { id: 'echeance', t: 'Tri : échéance d’acceptation' },
                        { id: 'limite', t: 'Tri : heure limite de livraison' },
                        ...(montants ? [{ id: 'gain' as const, t: 'Tri : rémunération' }] : []),
                        { id: 'distance', t: 'Tri : distance' },
                      ]}
                    />
                    </div>
                  </div>
                  <Puces
                    aria={t('Filtrer les paquets')}
                    actif={f}
                    choisir={(v) => poser('f', v, 'tous')}
                    items={[
                      { id: 'tous', t: 'Tous', n: base.length },
                      { id: 'premier', t: 'Premier rang', n: base.filter(premier).length },
                      { id: 'urgent', t: 'Urgents', n: base.filter(urgent).length },
                    ]}
                  />
                  <div className="entb-cnt" aria-live="polite">
                    <span>{d.paquets.length === 0 ? t('Aucun paquet publié dans vos zones') : liste.length === 1 ? t('1 paquet à accepter') : tf('{n} paquets à accepter', { n: liste.length })}</span>
                    {montants && enJeu > 0 && <span> · {tf('{m} en jeu si tout est accepté et prouvé', { m: F(enJeu) + ' F' })}</span>}
                  </div>
                </div>
                <div className="entb-list">
                  {d.paquets.length === 0 ? (
                    <Panel>
                      <VideP icone="boxes" t={t('Rien pour l’instant dans vos zones')} s={tf('Les paquets de {z} apparaissent ici dès leur publication, avec {m} minutes pour les accepter. Une notification et un son vous préviennent.', { z: caps.map((c) => c.zone).join(', '), m: REGLES.acceptationMin })}>
                        <div className="btns" style={{ maxWidth: 420, margin: '14px auto 0' }}>
                          <Link className="btn secondary" to={chemin('zones')}>
                            <Icone nom="gauge" taille={18} />
                            {t('Vérifier la capacité')}
                          </Link>
                          <Link className="btn ghost" to={chemin('missions')}>
                            <Icone nom="map" taille={18} />
                            {t('Voir les missions')}
                          </Link>
                        </div>
                      </VideP>
                    </Panel>
                  ) : liste.length === 0 && aEnvoyer.size > 0 && base.length === 0 && !q ? (
                    <Panel>
                      <VideP icone="circle-check" t={t('Tous les paquets sont pris')} s={t('L’acceptation part dans quelques secondes : « Annuler » la reprend.')} />
                    </Panel>
                  ) : liste.length === 0 ? (
                    <Panel>
                      <VideP icone="search-x" t={t('Aucun paquet pour ces filtres')} s={t('D’autres paquets attendent : élargissez la recherche.')}>
                        <div className="btns" style={{ maxWidth: 320, margin: '14px auto 0' }}>
                          <button type="button" className="btn secondary" onClick={() => (setParams({}, { replace: true }), setZone(''), setGenre(''), setLimite('toutes'))}>
                            {t('Effacer les filtres')}
                          </button>
                        </div>
                      </VideP>
                    </Panel>
                  ) : (
                    liste.map((p) => <CartePaquet key={p.id} p={p} caps={caps} accepter={accepter} enCours={enCours === p.id} perime={perime} bloque={bloque(p)} garde={garde(p.id)} seuils={seuils} />)
                  )}
                </div>
                {/* Capacité libre par zone : après la liste, une rangée compacte (la zone pleine est en rouge). */}
                <Sec t={t('Capacité libre aujourd’hui')} a={t('Zones et capacité')} to={chemin('zones')} />
                <div className="e-capa">
                  {caps.map((c) => {
                    const libre = Math.max(0, c.capacite - c.acceptes)
                    return (
                      <Link key={c.zone} to={chemin('zones')} className={libre === 0 ? 'plein' : undefined} aria-label={tf('{z} · capacité libre', { z: `${c.zone} ${c.nom}` }) + ` : ${libre} / ${c.capacite}`}>
                        <Icone nom={libre === 0 ? 'circle-alert' : 'map-pinned'} taille={15} />
                        <span>
                          {c.zone} {c.nom}
                        </span>
                        <b>{libre}</b>
                        <span className="c3">{tf('/ {n} colis', { n: c.capacite })}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
              <div>
                <Panel titre={t('Accepter vous engage')} icone="handshake">
                  {ent && (
                    <Limite icone="shield-check" titre={ent.plafond === null ? t('Sans plafond de valeur') : tf('Plafond de valeur : {m} par colis', { m: F(ent.plafond) + ' F' })} texte={t('un colis au-dessus ne vous est jamais proposé')} />
                  )}
                  <Li icone="package-check" ton="acc" t={tf('Ramassage en {d} au plus', { d: duree(REGLES.ramassageMin) })} s={t('à compter de l’acceptation, dans l’ordre imposé des arrêts')} />
                  <Li icone="clock" ton="acc" t={tf('Livraison en moins de {h} h', { h: REGLES.livraisonH })} s={t('heure limite affichée sur chaque paquet ; une photo de preuve à chaque changement de main')} />
                  <Li icone="gauge" ton="acc" t={t('Capacité décomptée')} s={t('les colis du paquet sortent de la capacité libre de la zone')} />
                  <Li icone="users" ton="acc" t={t('Un livreur éligible')} s={tf('affecté dans les {m} minutes ; n’acceptez pas sans livreur disponible pour le faire', { m: REGLES.nonAffecteMin })} />
                  <Hint icone="undo-2">{tf('Rendre un paquet n’est possible qu’avant le premier ramassage ; plus de {n} rendus en {j} jours retirent la priorité {p} jours. Ignorer n’a aucun effet sur le score.', { n: REGLES.rendus.max, j: REGLES.rendus.surJours, p: REGLES.rendus.perteJours })}</Hint>
                </Panel>
                <Panel titre={t('Son et notification par zone')} icone="volume-2" droite={<Pill ton="amber" sm>{t('Paramètre proposé')}</Pill>} style={{ marginTop: 16 }}>
                  {!reglages.donnees ? (
                    <Chargement n={2} hauteur={40} />
                  ) : (
                    <div className="entb-snd">
                      <div className="h" aria-hidden="true">
                        <span></span>
                        <span>{t('Son')}</span>
                        <span>{t('Notification')}</span>
                      </div>
                      {reglages.donnees.map((z) => (
                        <div className="r" key={z.zone}>
                          <b>{nomZone(caps, z.zone)}</b>
                          <Tg on={surcharge[z.zone + 'son'] ?? z.son} libelle={tf('Son des nouveaux paquets en {z}', { z: z.zone })} changer={(v) => regler(z.zone, 'son', v)} />
                          <Tg on={surcharge[z.zone + 'notification'] ?? z.notification} libelle={tf('Notification des nouveaux paquets en {z}', { z: z.zone })} changer={(v) => regler(z.zone, 'notification', v)} />
                        </div>
                      ))}
                    </div>
                  )}
                  <Hint icone="bell-ring">{tf('Réglage propre à chaque utilisateur : il ne change rien pour vos collègues. Le compte à rebours de {m} minutes s’affiche quel que soit le réglage.', { m: REGLES.acceptationMin })}</Hint>
                </Panel>
              </div>
            </div>
            <Hint icone="eye-off">{t('Aucun nom de client ni adresse de remise avant l’acceptation : seulement la zone, le relais de dépôt et les quartiers des boutiques. Un paquet pris par une autre entreprise disparaît de la liste en quelques secondes.')}</Hint>
            <BarrePouce>
              <button type="button" className="btn primary" disabled={!plusUrgent} onClick={() => plusUrgent && accepter(plusUrgent)} aria-label={plusUrgent ? tf('Accepter le plus urgent : {id}', { id: plusUrgent.id }) : t('Accepter le plus urgent')}>
                <Icone nom="check" taille={18} />
                <span>{t('Accepter le plus urgent')}</span>
              </button>
              <Link className="btn secondary" to={chemin('notifications')}>
                <Icone nom="bell" taille={18} />
                <span>{t('Alertes')}</span>
              </Link>
            </BarrePouce>
          </>
        )}
      </Px>
    </Ecran>
  )
}
