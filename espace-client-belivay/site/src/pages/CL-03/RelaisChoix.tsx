// Écran « Choisir mon relais » (CL-03), forme d'origine du prototype rendue réelle (DP-54) : la photo « Ton colis
// t'attend au relais », le plan depuis ta position, ton relais habituel (gérant, distance, temps de trajet,
// horaires, jour de fermeture, carte OpenStreetMap), puis les autres relais par distance : position réelle du
// téléphone (GPS) ou recherche par quartier ; relais plein du jour non proposé ; hors zone : le plus proche et la
// livraison à domicile. Choisir un autre relais dit ce qui change ; le choix devient le relais habituel ; ?retour=
// ramène à l'écran d'où l'on vient (première commande, paiement). En bas : la garde chiffrée (DP-08) et le retrait
// pas à pas (code, comptoir, procuration, renvoi, relais fermé), avec l'aide.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import img_e414518c8c68_jpg from '../../assets/prototype/e414518c8c68.jpg'
import { norme } from '../../composants/Catalogue'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { CartePosition, centreQuartier, distance, useMaPosition } from '../../composants/Position'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source, type Relais } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useMajSession } from '../../session'
import { GRILLE_GARDE, RENVOI_GARDE } from '../CL-09/Commun'

// Garde d'un gros colis (cartons C1 et C2 ; DP-08, GARDE-GROS-AJOUT) : la grille + 300 F chaque jour, dès le 1er.
const GARDE_GROS_AJOUT = 300
// « 350 m », « 2,4 km ».
export const enMots = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`)
// Temps de trajet : à pied sous 1 km, en taxi au-delà.
export const trajet = (m: number) => (m < 1000 ? { min: Math.max(1, Math.round(m / 60)), pied: true } : { min: Math.round(1.5 + (m / 1000) * 3), pied: false })
// « 8 h – 19 h » → « 19 h ».
export const fermeA = (horaires: string) => horaires.split('–')[1]?.trim() ?? horaires

export function RelaisChoix() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const pos = useMaPosition()
  const majSession = useMajSession()
  const [d, setD] = useState<{ relais: Relais[]; habituel: string | null } | null>(null)
  const [choix, setChoix] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const tabL = useDes('tab-l')
  useEffect(() => {
    source.relaisListe().then((x) => (setD(x), setChoix(x.habituel)))
  }, [])
  if (!d) return null
  // Distance réelle depuis le téléphone quand la position est connue ; sinon, celle du relais habituel.
  const loin = (r: Relais) => {
    const c = centreQuartier(r.quartier)
    return pos.coords && c ? distance(pos.coords, c) : r.km * 1000
  }
  const tous = [...d.relais].sort((a, b) => loin(a) - loin(b))
  const proche = tous.find((r) => !r.plein)
  const horsZone = !!pos.coords && !!proche && loin(proche) > 2500
  const habituel = d.relais.find((r) => r.nom === d.habituel) ?? null
  const liste = tous.filter((r) => r.nom !== habituel?.nom && (!q.trim() || norme(r.nom + ' ' + r.quartier).includes(norme(q.trim()))))
  const sel = d.relais.find((r) => r.nom === choix) ?? null
  const change = !!sel && !!habituel && sel.nom !== habituel.nom
  const centre = habituel ? centreQuartier(habituel.quartier) : null
  const retour = params.get('retour')
  const vers = retour ? '/' + retour.replace(/^\//, '') : chemin('accueil')
  const valider = async () => {
    if (!sel || sel.plein || envoi) return
    setEnvoi(true)
    await source.choisirRelais(sel.nom)
    majSession(await source.session())
    naviguer(vers, { replace: true })
  }
  const domicile = async () => {
    await source.choisirModePanier('domicile')
    naviguer(vers, { replace: true })
  }
  const trajetEnMots = (m: number) => {
    const x = trajet(m)
    return tf(x.pied ? '{n} min à pied' : '{n} min en taxi', { n: x.min })
  }
  // Dès 1024 px (§ 5.15) : la carte des relais, ce qui change et « Choisir » passent dans l'aside collant, à droite
  // de la liste ; sur téléphone et tablette portrait, ils restent à leur place. Déplacés, jamais dupliqués.
  const carte = habituel && centre && (
    <CartePosition
      c={centre}
      nom={habituel.nom}
      texte={tf('{r} · quartier {q}', { r: habituel.nom, q: habituel.quartier })}
      // Google Maps : cliquer le repère d'un relais le choisit dans la liste (un relais plein ne se choisit pas).
      choisir={(nom) => tous.some((r) => r.nom === nom && !r.plein) && setChoix(nom)}
      marqueurs={[
        { ...centre, nom: habituel.nom, principal: true },
        ...tous
          .filter((r) => r.nom !== habituel.nom)
          .slice(0, 5)
          .flatMap((r) => {
            const c = centreQuartier(r.quartier)
            return c ? [{ lat: c.lat, lon: c.lon, nom: r.nom }] : []
          }),
        ...(pos.coords ? [{ lat: pos.coords.lat, lon: pos.coords.lon, nom: t('Ma position') }] : []),
      ]}
    />
  )
  const choisir = (
    <>
      {change && (
        <div className="note or">
          <Icone nom="info" taille={18} />
          <div>
            <b>{t('Ce qui change :')}</b>
            {t(' les distances et les prix livrés partiront de ce relais. Tes commandes en cours gardent le leur.')}
          </div>
        </div>
      )}
      <div className="mt12">
        <button type="button" className={'btn primary' + (sel && !sel.plein && !envoi ? '' : ' off')} onClick={valider}>
          <Icone nom="check" taille={18} />
          <span>{sel ? tf('Choisir le {r}', { r: t(sel.nom) }) : t('Choisis un relais')}</span>
        </button>
      </div>
    </>
  )
  return (
    <Ecran route="relais-choix" titre={retour === 'premiere-commande' ? 'Ton relais' : undefined} gabarit="colonnes">
      <Styles id="f16ded0d4c" />
      <Colonne>
        {horsZone && proche && (
          <div className="note amber">
            <Icone nom="map-pinned" taille={18} />
            <div>
              <b>{t('Tu es hors des zones servies au lancement.')}</b>
              {tf(' Le relais servi le plus proche est à {d}. Tu peux aussi te faire livrer à domicile, si ton adresse est dans une zone servie.', { d: enMots(loin(proche)) })}
            </div>
          </div>
        )}
        {(pos.etat === 'refus' || pos.etat === 'indisponible') && (
          <div className="note ink">
            <Icone nom="locate-fixed" taille={18} />
            <div>
              <b>{t(pos.etat === 'refus' ? 'Position non partagée.' : 'Position indisponible.')}</b>
              {t(' Cherche ton quartier ou un repère : on range les relais depuis là.')}
            </div>
          </div>
        )}
        <Styles id="1c3d953197" />
        <div className="ph-ban" style={{ backgroundImage: `url(${img_e414518c8c68_jpg})` }} role="img" aria-label={t('Ton colis t’attend au relais')}>
          <span className="tg3">
            <Icone nom="shield-check" taille={13} />
            {t('Argent bloqué jusqu’au retrait')}
          </span>
          <span className="tx">
            <b>{t('Ton colis t’attend au relais')}</b>
            <span>{t('Remis en main propre contre ton code, aux heures d’ouverture du relais.')}</span>
          </span>
        </div>
        <div className="cl03-map">
          <Dessin id="bfacba296041" />
          <a href="#" className="cl03-mapl" onClick={(e) => (e.preventDefault(), pos.demander())}>
            <Icone nom="locate-fixed" taille={15} />
            <span>{t(pos.etat === 'ok' ? 'Depuis ta position' : pos.etat === 'recherche' ? 'Recherche de ta position…' : 'Utiliser ma position')}</span>
          </a>
        </div>
        {habituel && (
          <div className={'card' + (choix === habituel.nom ? ' or' : '')} style={{ marginTop: '14px' }}>
            <div className="row" style={{ justifyContent: 'space-between', gap: '8px' }}>
              <span className={'cl03-k' + (choix === habituel.nom ? ' or' : '')}>{t('Ton relais habituel')}</span>
              {choix === habituel.nom ? (
                <span className="pill or sm">
                  <Icone nom="check" taille={13} />
                  {t('Choisi')}
                </span>
              ) : (
                <a href="#" className="t13 b8 cor" onClick={(e) => (e.preventDefault(), setChoix(habituel.nom))}>
                  {t('Le garder')}
                </a>
              )}
            </div>
            <div className="cl03-face mt10">
              <span className="portrait" style={{ width: '52px', height: '52px' }}>
                <Dessin id="bc270b4894be" />
              </span>
              <div className="grow">
                <b className="t17 b8" style={{ display: 'block' }}>
                  {t(habituel.nom)}
                </b>
                <span className="t13 c3">{tf('{g} t’y accueille', { g: t(habituel.gerant) })}</span>
              </div>
            </div>
            <div className="cl03-photo">
              <Dessin id="318e6abdcbb9" image={habituel.image} alt={habituel.nom} tailles="100vw" />
            </div>
            <span className="cl03-rm" style={{ marginTop: '10px' }}>
              <Icone nom="map-pin" taille={13} />
              <span>{enMots(loin(habituel))}</span>
              <span>{t('·')}</span>
              <span>{trajetEnMots(loin(habituel))}</span>
            </span>
            <span className="cl03-rm">
              <Icone nom="clock" taille={13} />
              <span>{tf('Ouvert jusqu’à {h} · fermé le {f}', { h: t(fermeA(habituel.horaires)), f: t(habituel.ferme) })}</span>
            </span>
            {!tabL && carte}
          </div>
        )}
        <div className="fld">
          <label htmlFor="rc-q">{t('Quartier ou repère')}</label>
          <div className={'inp' + (q ? ' focus' : '')}>
            <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
            <input id="rc-q" className="grow" type="search" placeholder={t('Quartier ou nom du relais')} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {pos.etat !== 'ok' && (
          <div className="mt10">
            <button type="button" className={'btn secondary' + (pos.etat === 'recherche' ? ' off' : '')} onClick={pos.demander}>
              <Icone nom="locate-fixed" taille={18} />
              <span>{t('Utiliser ma position')}</span>
            </button>
          </div>
        )}
        <div className="sec">
          <h2>{t(habituel ? 'Les autres relais par distance' : 'Du plus proche au plus loin')}</h2>
        </div>
        {liste.map((r) => {
          const on = choix === r.nom
          return (
            <a
              key={r.nom}
              href="#"
              className={'radio cl03-rr' + (on ? ' on' : '')}
              role="radio"
              aria-checked={on}
              aria-disabled={r.plein || undefined}
              style={r.plein ? { opacity: 0.55 } : undefined}
              onClick={(e) => (e.preventDefault(), !r.plein && setChoix(r.nom))}
            >
              <span className="ic-sq" aria-hidden="true">
                <Icone nom="store" taille={20} />
              </span>
              <span className="grow">
                <span className="rt" style={{ display: 'block' }}>
                  {t(r.nom)}
                </span>
                <span className="rs" style={{ display: 'block' }}>
                  <span>{t(r.gerant)}</span>
                  {t(' · ')}
                  <span>{trajetEnMots(loin(r))}</span>
                </span>
                <span className="cl03-rm">
                  <Icone nom="clock" taille={13} />
                  <span>{r.plein ? t('Plein aujourd’hui : pas de nouveaux colis') : tf('Ouvert jusqu’à {h} · fermé le {f}', { h: t(fermeA(r.horaires)), f: t(r.ferme) })}</span>
                </span>
                {r === proche && !habituel && (
                  <span className="cl03-tags">
                    <span className="pill green sm">{t('Le plus proche')}</span>
                  </span>
                )}
              </span>
              <span className={'cl03-km' + (r === proche ? ' near' : '')}>{enMots(loin(r))}</span>
            </a>
          )
        })}
        {!liste.length && <p className="t13 c3">{t('Aucun relais pour cette recherche.')}</p>}
        {!tabL && choisir}
        {change ? (
          <p className="cl03-legal">
            {t('Changer le relais d’une commande déjà payée ? ')}
            <Link to={chemin('commandes')} className="cl03-link">
              {t('Modifier la commande')}
            </Link>
          </p>
        ) : (
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Il devient ton relais habituel : on te le propose à chaque commande.')}</span>
          </div>
        )}
        {retour && (
          <a href="#" className="card row" style={{ marginTop: '14px', color: 'inherit' }} onClick={(e) => (e.preventDefault(), domicile())}>
            <span className="ic-sq">
              <Icone nom="house" taille={20} />
            </span>
            <span className="grow">
              <b className="t15 b8" style={{ display: 'block' }}>
                {t('Plutôt à domicile ?')}
              </b>
              <span className="t13 c3">{t('Livraison 1 000 F par colis · offerte dès 50 000 F')}</span>
            </span>
            <Icone nom="chevron-right" taille={18} style={{ color: 'var(--ink-4)' }} />
          </a>
        )}
        <div className="hint-l">
          <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>
            {tf('Le jour d’arrivée, la garde est gratuite. Ensuite : {j2} F les jours 2 à 4, {j5} F le 5e, {j6} F le 6e, {j7} F le 7e. Un jour de fermeture n’est jamais compté.', { j2: F(GRILLE_GARDE[1]), j5: F(GRILLE_GARDE[4]), j6: F(GRILLE_GARDE[5]), j7: F(GRILLE_GARDE[6]) })}{' '}
            <Link to={chemin('legal-doc', { d: 'garde' })}>{t('La politique de garde')}</Link>
          </span>
        </div>
        <details className="more">
          <summary>
            <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Comment ça marche')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            <p>{t('Au lancement, chaque zone a un seul relais. Les 12 zones servies reçoivent leurs colis en moins de 5 h.')}</p>
            <p>{t('Ton relais habituel est proposé à chaque commande. Les distances et les prix livrés partent de lui.')}</p>
            <p>{t('Un relais plein aujourd’hui reste dans la liste, mais ne prend pas de nouveaux colis.')}</p>
            <p>{t('Quand tes colis arrivent, on te prévient et tu reçois ton code de retrait à 6 chiffres. Tu le montres au gérant, aux heures d’ouverture.')}</p>
            <p>{t('Tu ouvres tes colis devant le gérant. Un souci : il prend les photos, garde le colis, et ton argent reste bloqué.')}</p>
            <p>{t('Quelqu’un peut retirer à ta place : envoie-lui le code. On te prévient au moment du retrait.')}</p>
            <p>{tf('Gros colis (cartons C1 et C2) : {g} F de plus par jour de garde, dès le jour d’arrivée.', { g: F(GARDE_GROS_AJOUT) })}</p>
            <p>{tf('Après le 7e jour, le colis repart chez le vendeur : la garde et {r} F de renvoi sont retenus sur ton remboursement.', { r: F(RENVOI_GARDE) })}</p>
            <p>{t('Si ton relais ferme plusieurs jours, tu en choisis un autre gratuitement.')}</p>
            <p>
              <Link to={chemin('faq', { t: 'retrait' })}>{t('Questions sur le retrait')}</Link>
              {t(' · ')}
              <Link to={chemin('aide')}>{t('Aide et contact')}</Link>
            </p>
          </div>
        </details>
      </Colonne>
      {tabL && (
        <Aside titre="Carte des relais">
          {carte && <div className="card rc-carte">{carte}</div>}
          {choisir}
        </Aside>
      )}
    </Ecran>
  )
}
