// Emplacements (VD-11) : repris du prototype (route('emplacement')), branché sur la source (composition VD11-R70),
// puis ouvert à TOUS les lieux de la boutique à la demande du porteur (6 oct.) :
// - un lieu principal (origine du ramassage : coût total livré, zone) et d'autres lieux (deuxième boutique, entrepôt,
//   point de collecte…), choisis en tête (?lieu=<id>) ; chacun : carte OpenStreetMap avec son point (DP-49), GPS du
//   téléphone, coordonnées, adresse, repère pour le livreur (sans nouvelle vérification, EMP-02), horaires propres ou
//   ceux de la boutique, statut « Vérifié » / « À vérifier » ;
// - « Replacer le point » lit le GPS sur place ; au-delà de 200 m, « À vérifier » jusqu'au passage de l'agent de
//   zone, l'ancien point sert jusque-là (EMP-01, Q-91) ; localisation refusée ou imprécise : « Activez la
//   localisation… » et « Réessayer » ;
// - « Rendre principal » : lieu vérifié seulement, code SMS (l'origine du ramassage change) ; « Retirer ce lieu »
//   (jamais le principal) ;
// - centres BelivaY (relais, centres des zones exploitées) proposés en un geste comme point de collecte, vérifiés
//   d'office ;
// - en économie de données ou hors connexion, plan dessiné et « Afficher la carte » ; tout reste interne (VD11-R11) ;
// - employé : lecture seule (Q-18).
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { lienOsm, srcOsm } from '@client/connecteurs/cartes'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Horaire, Lieu, Position, TypeLieu } from '../../donnees/domaines/boutique'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { BandeauHorsLigne, Bouton, CHAMP, Chargement, CodeSms, ErreurLecture, Feuille, Interrupteur, JOURS_LONGS, dateCourte, resumeHoraires, useAnnonce, useEnLigne, useFeuilleAdresse } from './communs'

const PRECISION_MAX_M = 100 // au-delà, la position est jugée imprécise
const TYPES: { id: TypeLieu; nom: string; icone: string }[] = [
  { id: 'deuxieme_boutique', nom: 'Deuxième boutique', icone: 'store' },
  { id: 'entrepot', nom: 'Entrepôt', icone: 'box' },
  { id: 'collecte', nom: 'Point de collecte', icone: 'package' },
  { id: 'autre', nom: 'Autre lieu', icone: 'map-pin' },
]
const NOM_TYPE: Record<TypeLieu, string> = { boutique: 'Boutique', deuxieme_boutique: 'Deuxième boutique', entrepot: 'Entrepôt', collecte: 'Point de collecte', autre: 'Autre lieu' }
const ICONE_TYPE: Record<TypeLieu, string> = { boutique: 'store', deuxieme_boutique: 'store', entrepot: 'box', collecte: 'package', autre: 'map-pin' }

type EtatGps = 'attente' | 'recherche' | 'refus' | 'imprecis'

/** Lit le GPS du téléphone : position précise, ou la raison du refus. */
function lireGps(fini: (r: { ok: true; position: Position; precision: number } | { ok: false; raison: 'refus' | 'imprecis' }) => void) {
  if (!navigator.geolocation) return fini({ ok: false, raison: 'refus' })
  navigator.geolocation.getCurrentPosition(
    (p) => (p.coords.accuracy > PRECISION_MAX_M ? fini({ ok: false, raison: 'imprecis' }) : fini({ ok: true, position: { lat: p.coords.latitude, lon: p.coords.longitude }, precision: p.coords.accuracy })),
    (e) => fini({ ok: false, raison: e.code === e.PERMISSION_DENIED ? 'refus' : 'imprecis' }),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  )
}

/** Horaires propres d'un lieu : jours ouverts et une plage, ou ceux de la boutique (null). */
function EditeurHoraires({ valeur, changer }: { valeur: Horaire[] | null; changer: (h: Horaire[] | null) => void }) {
  const { t, langue } = usePreferences()
  const propres = valeur !== null
  const h = valeur ?? [0, 1, 2, 3, 4, 5, 6].map((jour) => ({ jour, ouvert: jour < 6, de: '08:00', a: '18:00' }))
  const ref = h.find((x) => x.ouvert) ?? h[0]
  const regler = (jours: number[], de: string, a: string) => changer([0, 1, 2, 3, 4, 5, 6].map((jour) => ({ jour, ouvert: jours.includes(jour), de, a })))
  const jours = h.filter((x) => x.ouvert).map((x) => x.jour)
  return (
    <>
      <div className="row mt14" style={{ gap: '10px' }}>
        <span className="grow b7 t15">{t('Mêmes horaires que la boutique')}</span>
        <Interrupteur actif={!propres} changer={(v) => changer(v ? null : h)} libelle="Mêmes horaires que la boutique" />
      </div>
      {propres && (
        <>
          <div className="chips" style={{ marginTop: '8px' }} role="group" aria-label={t('Jours d’ouverture')}>
            {JOURS_LONGS[langue].map((nom, i) => (
              <button key={i} type="button" className={'chip' + (jours.includes(i) ? ' on' : '')} aria-pressed={jours.includes(i)} onClick={() => regler(jours.includes(i) ? jours.filter((x) => x !== i) : [...jours, i], ref.de, ref.a)}>
                {nom.slice(0, 3)}
              </button>
            ))}
          </div>
          <div className="split2">
            <div className="fld">
              <label htmlFor="l-de">{t('Ouverture')}</label>
              <div className="inp">
                <input id="l-de" type="time" step={900} value={ref.de} onChange={(e) => regler(jours, e.target.value, ref.a)} style={CHAMP} />
              </div>
            </div>
            <div className="fld">
              <label htmlFor="l-a">{t('Fermeture')}</label>
              <div className="inp">
                <input id="l-a" type="time" step={900} value={ref.a} onChange={(e) => regler(jours, ref.de, e.target.value)} style={CHAMP} />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function MessageGps({ gps, reessayer }: { gps: EtatGps; reessayer: () => void }) {
  const { t } = usePreferences()
  if (gps !== 'refus' && gps !== 'imprecis') return null
  return (
    <div className="hint-l" role="alert" style={{ color: 'var(--red)' }}>
      <Icone nom="circle-alert" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
      <span>
        {t(gps === 'refus' ? 'Activez la localisation, dans la boutique, puis réessayez.' : 'Position trop imprécise : sortez devant la boutique, puis réessayez.')}{' '}
        <button type="button" className="b8 cor" onClick={reessayer} style={{ background: 'none', border: 0, font: 'inherit', fontWeight: 800, cursor: 'pointer', padding: 0, minHeight: '24px' }}>
          {t('Réessayer')}
        </button>
      </span>
    </div>
  )
}

export default function Emplacement() {
  const { t, tf, langue, donneesEconomes } = usePreferences()
  const s = useSession()
  const naviguer = useNavigate()
  const enLigne = useEnLigne()
  const [params, setParams] = useSearchParams()
  const prep = s.membre?.role === 'preparation'
  const lecture = useLecture(() => Promise.all([source.boutique.lieux(), source.boutique.boutique()]), [])
  const [annonce, dire] = useAnnonce()
  const [brouillon, setBrouillon] = useState<{ id: string; adresse?: string; repere?: string; horaires?: Horaire[] | null } | null>(null)
  const [erreurRepere, setErreurRepere] = useState<string | null>(null)
  const [gps, setGps] = useState<EtatGps>('attente')
  const ajout = useFeuilleAdresse('ajouter')
  const [nouveau, setNouveau] = useState<{ type: TypeLieu; nom: string; adresse: string; repere: string; horaires: Horaire[] | null; position: Position | null; precision: number }>({ type: 'deuxieme_boutique', nom: '', adresse: '', repere: '', horaires: null, position: null, precision: 0 })
  const [gpsAjout, setGpsAjout] = useState<EtatGps>('attente')
  const [erreurAjout, setErreurAjout] = useState<string | null>(null)
  const [principal, setPrincipal] = useState<{ lieu: Lieu; masque: string } | null>(null)
  // Carte chargée d'office, sauf en économie de données (et sous navigateur piloté : tests sans réseau extérieur).
  const carteDOffice = !donneesEconomes && !navigator.webdriver
  const [carte, setCarte] = useState(carteDOffice)
  useEffect(() => setCarte(carteDOffice), [carteDOffice])
  if (!lecture.donnees)
    return (
      <Ecran route="emplacement">
        <div className="pg">
          <h1 className="pg-t">{t('Emplacements')}</h1>
        </div>
        {lecture.erreur ? <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} /> : <Chargement />}
      </Ecran>
    )
  const [{ lieux, max, centres }, b] = lecture.donnees
  const l = lieux.find((x) => x.id === params.get('lieu')) ?? lieux[0]
  const br = brouillon?.id === l.id ? brouillon : { id: l.id }
  const adresse = br.adresse ?? l.adresse
  const repere = br.repere ?? l.repere
  const horaires = br.horaires !== undefined ? br.horaires : l.horaires
  const coord = (x: number) => (langue === 'en' ? x.toFixed(3) : x.toFixed(3).replace('.', ','))
  const choisir = (id: string) => (setGps('attente'), setErreurRepere(null), setParams((p) => (p.set('lieu', id), p), { replace: true }))
  const plein = lieux.length >= max
  const dejaCentres = new Set(lieux.map((x) => x.centre).filter(Boolean))

  const replacer = () => {
    setGps('recherche')
    lireGps(async (r) => {
      if (!r.ok) return setGps(r.raison)
      setGps('attente')
      const res = await source.boutique.replacerLieu(l.id, r.position)
      if (!res.ok) return dire(t('Le point n’a pas pu être envoyé : réessayez.'), 'erreur')
      jouer('interrupteur')
      dire(res.nouvelleVerification ? tf('Point déplacé de {m} m : l’agent de zone viendra le vérifier. L’ancien point sert jusque-là.', { m: res.metres }) : tf('Point replacé ({m} m) : toujours vérifié.', { m: res.metres }))
    })
  }
  const enregistrer = async () => {
    const champs: Parameters<typeof source.boutique.modifierLieu>[1] = {}
    if (br.adresse !== undefined && br.adresse.trim() !== l.adresse) champs.adresse = br.adresse
    if (br.repere !== undefined && br.repere.trim() !== l.repere) {
      if (!br.repere.trim()) return setErreurRepere(t('Écrivez un repère simple pour le livreur.'))
      champs.repere = br.repere
    }
    if (br.horaires !== undefined) champs.horaires = br.horaires
    if (Object.keys(champs).length) {
      const res = await source.boutique.modifierLieu(l.id, champs)
      if (!res.ok) return res.raison === 'ordre' ? dire(t('L’heure de fermeture doit suivre l’ouverture'), 'erreur') : setErreurRepere(t('Repère trop long : 120 caractères au plus.'))
      setBrouillon(null)
    }
    naviguer(chemin('boutique'))
  }
  const copier = async () => {
    const texte = `${l.position.lat.toFixed(6)}, ${l.position.lon.toFixed(6)}`
    try {
      await navigator.clipboard.writeText(texte)
      jouer('copie')
      dire(t('Coordonnées copiées.'))
    } catch {
      dire(texte)
    }
  }
  const localiserNouveau = () => {
    setGpsAjout('recherche')
    lireGps((r) => {
      if (!r.ok) return setGpsAjout(r.raison)
      setGpsAjout('attente')
      setNouveau((n) => ({ ...n, position: r.position, precision: r.precision }))
    })
  }
  const ajouter = async () => {
    if (!nouveau.position) return setErreurAjout(t('Posez le point depuis le lieu : « Me localiser ici ».'))
    const res = await source.boutique.ajouterLieu({ ...nouveau, position: nouveau.position, centre: null })
    if (!res.ok)
      return setErreurAjout(
        t(
          {
            plein: 'Nombre de lieux atteint : retirez un lieu pour en ajouter un.',
            nom: 'Donnez un nom de 3 à 60 caractères.',
            repere: 'Repère trop long : 120 caractères au plus.',
            position: 'Position trop imprécise : sortez devant le lieu, puis réessayez.',
            hors_zone: 'Ce point est hors des zones servies par BelivaY.',
            ordre: 'L’heure de fermeture doit suivre l’ouverture',
          }[res.raison],
        ),
      )
    jouer('fin')
    dire(tf('{nom} ajouté : l’agent de zone viendra vérifier le point.', { nom: res.lieu.nom }))
    setNouveau({ type: 'deuxieme_boutique', nom: '', adresse: '', repere: '', horaires: null, position: null, precision: 0 })
    // Une seule navigation : fermer la feuille et choisir le nouveau lieu.
    const p = new URLSearchParams(params)
    p.delete('ajouter')
    p.set('lieu', res.lieu.id)
    setParams(p, { replace: true })
  }
  const utiliserCentre = async (id: string, nom: string) => {
    const res = await source.boutique.ajouterLieu({ nom, type: 'collecte', adresse: '', repere: '', horaires: null, position: { lat: 0, lon: 0 }, precision: 0, centre: id })
    if (!res.ok) return dire(t(res.raison === 'plein' ? 'Nombre de lieux atteint : retirez un lieu pour en ajouter un.' : 'Ce centre n’a pas pu être ajouté : réessayez.'), 'erreur')
    jouer('fin')
    dire(tf('{nom} ajouté à vos lieux : vérifié d’office.', { nom }))
    choisir(res.lieu.id)
  }
  const retirer = async () => {
    const res = await source.boutique.retirerLieu(l.id)
    if (!res.ok) return dire(t('Le lieu principal ne se retire pas : choisissez d’abord un autre principal.'), 'erreur')
    dire(tf('{nom} retiré de vos lieux.', { nom: l.nom }))
    choisir(res.lieux.lieux[0].id)
  }
  const ouvrirPrincipal = async () => {
    if (l.statut !== 'verifie' || l.point.enAttente) return dire(t('Un lieu à vérifier ne peut pas devenir principal : attendez le passage de l’agent de zone.'), 'erreur')
    const { masque } = await source.boutique.demanderCodePrincipal()
    setPrincipal({ lieu: l, masque })
  }

  return (
    <Ecran
      route="emplacement"
      fixes={
        <>
          {annonce}
          <Feuille ouverte={ajout.ouverte && !prep} fermer={ajout.fermer} titre="Ajouter un lieu">
            <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '800' }}>{t('Ajouter un lieu')}</h3>
            <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
              {t('À faire sur place : le point se pose avec le GPS du téléphone, puis l’agent de zone le vérifie.')}
            </p>
            <div className="fld" role="radiogroup" aria-label={t('Type de lieu')}>
              <label>{t('Type de lieu')}</label>
              <div className="chips" style={{ marginTop: '4px' }}>
                {TYPES.map((x) => (
                  <button key={x.id} type="button" role="radio" aria-checked={nouveau.type === x.id} className={'chip' + (nouveau.type === x.id ? ' on' : '')} onClick={() => setNouveau((n) => ({ ...n, type: x.id }))}>
                    <Icone nom={x.icone} taille={15} />
                    {t(x.nom)}
                  </button>
                ))}
              </div>
            </div>
            <div className="fld">
              <label htmlFor="l-nom">{t('Nom du lieu')}</label>
              <div className="inp">
                <input id="l-nom" value={nouveau.nom} maxLength={60} onChange={(e) => (setNouveau((n) => ({ ...n, nom: e.target.value })), setErreurAjout(null))} placeholder={t('Ex. : Entrepôt d’Essos')} style={CHAMP} />
              </div>
            </div>
            <div className="fld">
              <label htmlFor="l-adresse">{t('Adresse')}</label>
              <div className="inp">
                <input id="l-adresse" value={nouveau.adresse} maxLength={120} onChange={(e) => setNouveau((n) => ({ ...n, adresse: e.target.value }))} placeholder={t('Rue, immeuble, quartier')} style={CHAMP} />
              </div>
            </div>
            <div className="fld">
              <label htmlFor="l-repere">{t('Repère pour le livreur')}</label>
              <div className="inp">
                <input id="l-repere" value={nouveau.repere} maxLength={120} onChange={(e) => setNouveau((n) => ({ ...n, repere: e.target.value }))} placeholder={t('Ex. : portail vert après la station')} style={CHAMP} />
              </div>
            </div>
            <EditeurHoraires valeur={nouveau.horaires} changer={(h) => setNouveau((n) => ({ ...n, horaires: h }))} />
            <div className="mt14">
              <Bouton classe="secondary" icone="locate-fixed" onClick={localiserNouveau} inactif={gpsAjout === 'recherche'}>
                {t(gpsAjout === 'recherche' ? 'Recherche de votre position…' : nouveau.position ? 'Reprendre la position' : 'Me localiser ici')}
              </Bouton>
            </div>
            {nouveau.position && (
              <div className="hint-l">
                <Icone nom="circle-check" taille={15} style={{ flexShrink: '0', marginTop: '1px', color: 'var(--green)' }} />
                <span>{tf('Point posé : {lat}° N · {lon}° E (à {p} m près).', { lat: coord(nouveau.position.lat), lon: coord(nouveau.position.lon), p: Math.round(nouveau.precision) })}</span>
              </div>
            )}
            <MessageGps gps={gpsAjout} reessayer={localiserNouveau} />
            {erreurAjout && (
              <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                {erreurAjout}
              </div>
            )}
            <div className="mt14">
              <Bouton icone="plus" inactif={nouveau.nom.trim().length < 3} onClick={() => void ajouter()}>
                {t('Ajouter ce lieu')}
              </Bouton>
            </div>
            <div className="mt8">
              <Bouton classe="ghost" onClick={ajout.fermer}>
                {t('Annuler')}
              </Bouton>
            </div>
          </Feuille>
          <Feuille ouverte={!!principal} fermer={() => setPrincipal(null)} titre="Changer le lieu principal">
            {principal && (
              <>
                <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '800' }}>{tf('Faire de {nom} le lieu principal ?', { nom: principal.lieu.nom })}</h3>
                <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
                  {t('Le livreur ramassera ici, et la livraison se calculera depuis ce point : le coût total livré de vos offres peut changer.')}
                </p>
                <CodeSms
                  masque={principal.masque}
                  bouton="Confirmer le lieu principal"
                  icone="star"
                  annuler={() => setPrincipal(null)}
                  valider={async (code) => {
                    const r = await source.boutique.rendrePrincipal(principal.lieu.id, code)
                    if (!r.ok) return t(r.raison === 'code' ? 'Code incorrect, réessayez. Rien n’a changé.' : 'Un lieu à vérifier ne peut pas devenir principal : attendez le passage de l’agent de zone.')
                    dire(tf('{nom} est maintenant le lieu principal.', { nom: principal.lieu.nom }))
                    setPrincipal(null)
                    return null
                  }}
                />
              </>
            )}
          </Feuille>
        </>
      }
    >
      <div className="pg">
        <h1 className="pg-t">{t('Emplacements')}</h1>
        <p className="pg-s">{t('Votre prix + la livraison depuis ici : le total le plus bas l’emporte.')}</p>
      </div>
      <BandeauHorsLigne />
      <div className="card tight" role="list" aria-label={t('Vos lieux')}>
        {lieux.map((x) => (
          <button key={x.id} type="button" role="listitem" className={'li' + (x.id === l.id ? ' on' : '')} aria-current={x.id === l.id ? 'true' : undefined} onClick={() => choisir(x.id)} style={{ width: '100%', background: 'none', border: 0, boxShadow: x.id === l.id ? 'inset 3px 0 0 var(--braise-1)' : undefined, textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer' }}>
            <span className="ic ">
              <Icone nom={ICONE_TYPE[x.type]} taille={20} />
            </span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="row" style={{ gap: '6px', flexWrap: 'wrap' }}>
                <span className="lt">{x.nom}</span>
                {x.principal && <span className="pill or sm">{t('Principal')}</span>}
                <span className={'pill sm ' + (x.statut === 'verifie' && !x.point.enAttente ? 'green' : 'amber')}>{t(x.statut === 'verifie' && !x.point.enAttente ? 'Vérifié' : 'À vérifier')}</span>
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {`${t(NOM_TYPE[x.type])} · ${x.zone ? `${x.zone} · ${x.quartier}` : t('hors zone')}`}
              </span>
            </span>
          </button>
        ))}
      </div>
      {!prep && (
        <div className="row mt8" style={{ gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Bouton classe="secondary sm" icone="plus" inactif={plein} onClick={ajout.ouvrir}>
            {t('Ajouter un lieu')}
          </Bouton>
          <span className="t12 c3">{tf(lieux.length > 1 ? '{n} lieux sur {max}' : '{n} lieu sur {max}', { n: lieux.length, max })}</span>
        </div>
      )}

      <div className="sec">
        <h2>{l.nom}</h2>
      </div>
      <div className="map" style={{ position: 'relative' }}>
        {carte && enLigne ? <iframe title={tf('Carte de {nom}', { nom: l.nom })} src={srcOsm(l.position, 0.004)} loading="lazy" style={{ display: 'block', width: '100%', height: '100%', minHeight: '180px', border: 0 }} /> : <Dessin id="732aae44d0dd" />}
      </div>
      <div className="row t12 c3" style={{ gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
        <span>{carte && enLigne ? t('Carte : OpenStreetMap') : t('Plan simplifié : la carte s’affiche à la demande')}</span>
        <span className="grow"></span>
        {!(carte && enLigne) && enLigne && (
          <button type="button" className="t12 b8 cor" onClick={() => setCarte(true)} style={{ background: 'none', border: 0, minHeight: '44px', cursor: 'pointer', font: 'inherit', fontWeight: 800 }}>
            {t('Afficher la carte')}
          </button>
        )}
        <a href={lienOsm(l.position)} target="_blank" rel="noopener noreferrer" className="t12 b8 cor" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', minHeight: '44px' }}>
          <Icone nom="external-link" taille={14} />
          {t('Ouvrir dans les cartes')}
        </a>
      </div>
      <div className="card" data-lieu={l.id}>
        <div className="row">
          <div className="grow b8 t17">{l.zone ? `${l.zone} · ${l.quartier}` : t('Hors des zones servies')}</div>
          {l.statut === 'verifie' && !l.point.enAttente ? (
            <span className="pill green sm">
              <Icone nom="circle-check" taille={13} />
              {t('Vérifié')}
            </span>
          ) : (
            <span className="pill amber sm">
              <Icone nom="clock" taille={13} />
              {t('À vérifier')}
            </span>
          )}
        </div>
        <div className="mt8">
          <div className="kv">
            <span className="k">{t('Coordonnées')}</span>
            <span className="v ">
              <button type="button" onClick={() => void copier()} aria-label={t('Copier les coordonnées')} style={{ background: 'none', border: 0, font: 'inherit', fontWeight: 'inherit', color: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '32px', padding: 0 }}>
                {`${coord(l.position.lat)}° N · ${coord(l.position.lon)}° E`}
                <Icone nom="copy" taille={14} style={{ color: 'var(--ink-3)' }} />
              </button>
            </span>
          </div>
          <div className="kv">
            <span className="k">{t('Point posé')}</span>
            <span className="v ">{l.centre ? t('Centre BelivaY') : tf('Sur place, le {d}', { d: dateCourte(l.point.poseLe, langue) })}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Vérifié')}</span>
            <span className="v ">{l.point.verifieLe ? tf('Le {d}', { d: dateCourte(l.point.verifieLe, langue) }) : t('Pas encore')}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Horaires')}</span>
            <span className="v ">{l.horaires ? resumeHoraires(l.horaires, langue) : tf('Ceux de la boutique · {h}', { h: resumeHoraires(b.horaires, langue) })}</span>
          </div>
        </div>
        {l.point.enAttente && (
          <div className="hint-l" style={{ color: 'var(--amber)' }}>
            <Icone nom="map-pinned" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('Nouveau point posé le {d} : l’agent de zone est prévenu et passe le vérifier. L’ancien point sert jusque-là.', { d: dateCourte(l.point.enAttente.a, langue) })}</span>
          </div>
        )}
        {!l.point.enAttente && l.statut === 'a_verifier' && (
          <div className="hint-l" style={{ color: 'var(--amber)' }}>
            <Icone nom="map-pinned" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Nouveau lieu : l’agent de zone est prévenu et passe vérifier le point.')}</span>
          </div>
        )}
        {prep ? (
          <>
            <div className="kv">
              <span className="k">{t('Adresse')}</span>
              <span className="v ">{l.adresse || '—'}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Repère pour le livreur')}</span>
              <span className="v ">{l.repere || '—'}</span>
            </div>
          </>
        ) : (
          <>
            <div className="fld">
              <label htmlFor="adresse">{t('Adresse')}</label>
              <div className="inp">
                <input id="adresse" value={adresse} maxLength={120} onChange={(e) => setBrouillon({ ...br, adresse: e.target.value })} style={CHAMP} />
              </div>
            </div>
            <div className="fld">
              <label htmlFor="repere">{t('Repère pour le livreur')}</label>
              <div className="inp" style={{ borderColor: erreurRepere ? 'var(--red)' : undefined }}>
                <Icone nom="map-pin" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
                <input id="repere" value={repere} maxLength={120} onChange={(e) => (setBrouillon({ ...br, repere: e.target.value }), setErreurRepere(null))} style={CHAMP} />
              </div>
              {erreurRepere ? (
                <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                  {erreurRepere}
                </div>
              ) : (
                <div className="hint">{t('Une phrase simple pour trouver la boutique.')}</div>
              )}
            </div>
            {!l.principal && <EditeurHoraires valeur={horaires} changer={(h) => setBrouillon({ ...br, horaires: h })} />}
            {l.principal && <div className="hint">{t('Les horaires du lieu principal sont ceux de la boutique (Horaires et fermetures).')}</div>}
          </>
        )}
      </div>

      {prep ? (
        <div className="hint-l">
          <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Emplacement en lecture seule : seul le propriétaire replace le point.')}</span>
        </div>
      ) : (
        <>
          {!l.centre && (
            <div className="mt16">
              <Bouton classe="secondary" icone="locate-fixed" onClick={replacer} inactif={gps === 'recherche'}>
                {t(gps === 'recherche' ? 'Recherche de votre position…' : l.principal ? 'Replacer le point depuis la boutique' : 'Replacer le point depuis ce lieu')}
              </Bouton>
            </div>
          )}
          {gps === 'refus' || gps === 'imprecis' ? (
            <MessageGps gps={gps} reessayer={replacer} />
          ) : (
            !l.centre && (
              <div className="hint-l">
                <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
                <span>{t('À faire sur place. Au-delà de 200 m, une nouvelle vérification suit.')}</span>
              </div>
            )
          )}
          <div className="mt16">
            <Bouton icone="check" onClick={() => void enregistrer()}>
              {t('Enregistrer')}
            </Bouton>
          </div>
          {!l.principal && (
            <div className="row mt8" style={{ gap: '8px', flexWrap: 'wrap' }}>
              <Bouton classe="secondary sm" icone="star" onClick={() => void ouvrirPrincipal()}>
                {t('Rendre principal')}
              </Bouton>
              <Bouton classe="ghost sm" icone="trash-2" etiquette={tf('Retirer {nom}', { nom: l.nom })} onClick={() => void retirer()}>
                {t('Retirer ce lieu')}
              </Bouton>
            </div>
          )}
        </>
      )}

      <div className="sec">
        <h2>{t('Centres BelivaY')}</h2>
      </div>
      <p className="t13 c3" style={{ margin: '0 4px 8px', lineHeight: '1.45' }}>
        {t('Déposez vos colis dans un relais ou un centre BelivaY : ajoutez-le en un geste, il est vérifié d’office.')}
      </p>
      <div className="card tight">
        {centres.map((c) => (
          <div key={c.id} className="li">
            <span className="ic ">
              <Icone nom={c.type === 'relais' ? 'store' : 'building'} taille={20} />
            </span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="row" style={{ gap: '6px', flexWrap: 'wrap' }}>
                <span className="lt">{c.nom}</span>
                {c.exploitee && <span className="pill green sm">{t('Zone exploitée')}</span>}
              </span>
              <span className="ls" style={{ display: 'block' }}>{`${c.zone} · ${t(c.type === 'relais' ? 'Relais' : 'Centre de zone')} · ${t(c.horaires)}`}</span>
            </span>
            {!prep &&
              (dejaCentres.has(c.id) ? (
                <span className="pill ink sm">{t('Ajouté')}</span>
              ) : (
                <Bouton classe="secondary sm" icone="plus" inactif={plein} etiquette={tf('Ajouter {nom} à mes lieux', { nom: c.nom })} onClick={() => void utiliserCentre(c.id, c.nom)}>
                  {t('Ajouter')}
                </Bouton>
              ))}
          </div>
        ))}
      </div>

      <details className="more">
        <summary>
          <Icone nom="calculator" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Comment ça marche')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>
            <b>{t('Coût total livré')}</b>
            {t(' = votre prix + la livraison réelle depuis votre boutique. Le plus bas reçoit la commande.')}
          </p>
          <p>
            <b>{t('Le lieu principal')}</b>
            {t(' est celui d’où part la livraison : le livreur y ramasse vos colis. Il doit être vérifié ; le changer demande un code SMS.')}
          </p>
          <p>
            <b>{t('Les autres lieux')}</b>
            {t(' (entrepôt, deuxième boutique, point de collecte) aident l’agent de zone et le livreur ; chacun a son point, son repère et ses horaires.')}
          </p>
          <p>
            <b>{t('À coût égal')}</b>
            {t(', le meilleur Trust Score passe devant.')}
          </p>
          <p>
            <b>{t('Le client ne choisit pas de vendeur')}</b>
            {t(' : il choisit un produit, BelivaY choisit l’offre. Il ne voit jamais vos lieux.')}
          </p>
        </div>
      </details>
    </Ecran>
  )
}
