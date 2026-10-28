// Écran « Mes adresses » (CL-13 ; CCO-10, CCO-11, CPR-23, DP-09), balisage du prototype du 1er octobre, repris à
// la main et rendu logique (DP-53) :
// - la liste vient des données : chaque adresse (nom, zone servie, repères, position), la principale marquée
//   quand il y en a plusieurs, « Utiliser par défaut » pour les autres ; sans adresse, l'état vide ;
// - « Ajouter » et « Modifier » ouvrent un vrai formulaire : nom, quartier (suggestions des zones servies ; hors
//   zone, le refus du prototype : « BelivaY ne livre pas encore à … », enregistrement impossible, le retrait au
//   relais continue), repères, position (toucher la carte pose le repère) ; erreurs écrites sous chaque champ ;
// - « Supprimer cette adresse » demande confirmation ; la principale passe alors à la suivante.
// Pour le client (DP-54) : zones servies écrites quand le quartier est hors zone ; une adresse modifiée ne change
// pas les colis en route (lien vers Mes commandes) ; rappel d'ajouter des consignes au livreur ; déroulé d'une
// livraison à domicile (appel masqué, code de retrait, jamais d'espèces).
// Les états du prototype restent ouverts par leur adresse (?st=ajout, modifier, hors, vide) pour la comparaison.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useRef, useState } from 'react'
import { reduirePhoto, TYPES_PHOTO } from '../../donnees/photo'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Dessin } from '../../composants/Dessin'
import { Feuille, useFeuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { CartePosition, MessagePosition, RechercheLieu, quartierProche, useMaPosition } from '../../composants/Position'
import { Bouton } from '../../composants/socle'
import { chemin } from '../../config/pages'
import { source, type Adresse, type DonneesAdresses } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { Bloc, EcranCompte } from './Larges'
import { useDes } from '../../composants/ecran'

// L'exemple du prototype pour une adresse hors zone (« ?st=hors »).
const EXEMPLE_HORS = { nom: 'Bureau', quartier: 'Akwa, Douala', reperes: 'Immeuble Mbanga, centre commercial', position: false }
const ville = (q: string) => (q.includes(',') ? q.split(',').pop()!.trim() : q.trim())

function Formulaire(p: { d: DonneesAdresses; adresse: Adresse | null; exempleHors: boolean; etat?: string; recharger: () => void }) {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const depart = p.exempleHors ? EXEMPLE_HORS : (p.adresse ?? { nom: '', quartier: '', reperes: '', position: false })
  const [nomSaisi, setNom] = useState(depart.nom)
  const [quartierSaisi, setQuartier] = useState(depart.quartier)
  const [reperesSaisis, setReperes] = useState(depart.reperes)
  // Comme la liste, le formulaire montre les valeurs enregistrées par t() tant qu'on n'y a pas touché (adresse et
  // exemple de démonstration traduits) ; un texte écrit par la cliente n'a pas d'entrée et reste tel quel.
  const [touche, setTouche] = useState(false)
  const nom = touche ? nomSaisi : t(nomSaisi)
  const quartier = touche ? quartierSaisi : t(quartierSaisi)
  const reperes = touche ? reperesSaisis : t(reperesSaisis)
  const toucher = () => {
    if (touche) return
    setNom(nom)
    setQuartier(quartier)
    setReperes(reperes)
    setTouche(true)
  }
  const [position, setPosition] = useState(depart.position)
  const [repere, setRepere] = useState(false) // repère posé pendant cette saisie
  // Pour le livreur : instructions, personne qui reçoit, moment préféré, photo de l'entrée.
  const [instructions, setInstructions] = useState(p.adresse?.instructions ?? '')
  const [destinataire, setDestinataire] = useState(p.adresse?.destinataire ?? '')
  const [creneau, setCreneau] = useState<Adresse['creneau']>(p.adresse?.creneau ?? null)
  const [photo, setPhoto] = useState<string | null>(p.adresse?.photo ?? null)
  const [errPhoto, setErrPhoto] = useState<string | null>(null)
  const fichier = useRef<HTMLInputElement>(null)
  // Position réelle (GPS) : le point exact, et le quartier servi le plus proche proposé.
  const gps = useMaPosition()
  const coords = gps.coords ?? p.adresse?.coords ?? null
  const proche = gps.coords ? quartierProche(gps.coords, p.d.zonesServies) : null
  useEffect(() => {
    if (!gps.coords) return
    setPosition(true)
    setRepere(true)
    if (proche && !quartier.trim()) (toucher(), setQuartier(proche.quartier))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gps.coords])
  const [vu, setVu] = useState(p.exempleHors)
  const [enCours, setEnCours] = useState(false)
  const supprimer = useFeuille('supprimer')

  const zone = p.d.zonesServies.find((z) => z.toLowerCase() === quartier.trim().toLowerCase())
  const hors = !!quartier.trim() && !zone && (vu || quartier.includes(','))
  const errNom = !nom.trim() ? 'Donne un nom à cette adresse : Maison, Travail…' : nom.trim().length > 30 ? '30 caractères au plus.' : null
  const errQuartier = !quartier.trim() ? 'Choisis ton quartier.' : null
  const errReperes = reperes.trim().length < 8 ? 'Écris au moins un repère : un carrefour, un commerce, la couleur de l’immeuble.' : null
  const valide = !errNom && !errQuartier && !errReperes && !!zone

  const enregistrer = async () => {
    setVu(true)
    if (!valide || enCours) return
    setEnCours(true)
    const r = await source.enregistrerAdresse({ id: p.adresse?.id, nom, quartier, reperes, position, coords: coords ?? undefined, instructions, destinataire, creneau, photo })
    setEnCours(false)
    if (r.ok) {
      p.recharger()
      naviguer(chemin('adresses'), { replace: true })
    }
  }
  const poserRepere = () => {
    setPosition(true)
    setRepere(true)
    // Le téléphone affine la position quand il le peut ; sinon le repère posé à la main suffit.
    navigator.geolocation?.getCurrentPosition(
      () => undefined,
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }
  const effacer = async () => {
    if (!p.adresse) return
    await source.supprimerAdresse(p.adresse.id)
    p.recharger()
    naviguer(chemin('adresses'), { replace: true })
  }

  const rouge = { color: 'var(--red)' }
  const titre = p.adresse ? `Modifier « ${p.adresse.nom} »` : 'Nouvelle adresse'
  const feuilleSupprimer = (
    <Feuille ouverte={supprimer.ouverte} fermer={supprimer.fermer} titre={t('Supprimer cette adresse')}>
      <h2 className="pg-t" style={{ fontSize: 19 }}>
        {t(`Supprimer « ${p.adresse?.nom ?? ''} » ?`)}
      </h2>
      <p className="pg-s">{t('Tes colis en cours ne changent pas de destination. Tu pourras la rajouter quand tu veux.')}</p>
      <div className="mt16">
        <Bouton genre="danger" icone="trash-2" onClick={effacer}>
          {t('Supprimer')}
        </Bouton>
      </div>
      <div className="mt10">
        <Bouton genre="ghost" onClick={supprimer.fermer}>
          {t('Garder cette adresse')}
        </Bouton>
      </div>
    </Feuille>
  )
  return (
    <EcranCompte route="adresses" parEtat etat={p.etat} fixes={feuilleSupprimer}>
      <div className="pg c13-adf-t">
        <h1 className="pg-t">{t(titre)}</h1>
        <p className="pg-s">{t('Écris ce que le livreur voit dans la rue : il s’en sert pour te trouver.')}</p>
      </div>
      <Bloc classe="c13-g2 c13-adf">
      <Bloc classe="c13-k">
      <div className="fld">
        <label htmlFor="ad-nom">{t('Nom de l’adresse')}</label>
        <div className={'inp' + (vu && errNom ? ' err' : '')}>
          <input id="ad-nom" value={nom} maxLength={30} placeholder={t('Ex. : Travail')} onChange={(e) => (toucher(), setNom(e.target.value))} />
        </div>
        {vu && errNom && (
          <div className="hint" style={rouge}>
            {t(errNom)}
          </div>
        )}
      </div>
      <div className="fld">
        <label htmlFor="ad-quartier">{t('Quartier')}</label>
        <div className={'inp' + (hors ? ' err' : zone ? ' ok' : vu && errQuartier ? ' err' : '')}>
          <Icone nom="map-pin" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
          <input
            id="ad-quartier"
            list="ad-zones"
            value={quartier}
            placeholder={t('Choisis ton quartier')}
            autoComplete="off"
            onChange={(e) => (toucher(), setQuartier(e.target.value))}
            onBlur={() => quartier.trim() && setVu(true)}
          />
          {zone && <span className="suf">{t('Zone servie')}</span>}
        </div>
        <datalist id="ad-zones">
          {p.d.zonesServies.map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist>
        {vu && errQuartier && (
          <div className="hint" style={rouge}>
            {t(errQuartier)}
          </div>
        )}
      </div>
      {hors && (
        <div className="hint" style={rouge}>
          {tf('BelivaY ne livre pas encore à {ville}\u00A0: au lancement, {n} zones de Yaoundé sont servies.', { ville: ville(quartier), n: p.d.zonesServies.length })}
        </div>
      )}
      {hors && <div className="hint">{tf('Livrés à domicile : {z}.', { z: p.d.zonesServies.join(' · ') })}</div>}
      <div className="fld">
        <label htmlFor="ad-reperes">{t('Repères')}</label>
        <div className={'inp area' + (vu && errReperes ? ' err' : '')}>
          <textarea
            id="ad-reperes"
            value={reperes}
            maxLength={160}
            rows={3}
            placeholder={t('Carrefour, couleur de l’immeuble, étage…')}
            onChange={(e) => (toucher(), setReperes(e.target.value))}
          />
        </div>
        <div className="hint" style={vu && errReperes ? rouge : undefined}>
          {t(vu && errReperes ? errReperes : 'Un carrefour, un commerce, la couleur de l’immeuble, l’étage.')}
        </div>
      </div>
      </Bloc>
      <Bloc classe="c13-k">
      <div className="fld">
        <label>{t('Position sur la carte')}</label>
{coords && !hors ? (
          <CartePosition c={coords} nom={nom || t('Mon adresse')} texte={[quartier, reperes].filter(Boolean).join(', ')} />
        ) : (
        <button
          type="button"
          className="cl13-map"
          onClick={hors ? undefined : poserRepere}
          aria-label={t('Poser le repère sur mon entrée')}
          style={{ display: 'block', width: '100%', padding: 0, border: 0, font: 'inherit', wordSpacing: 'inherit', letterSpacing: 'inherit', cursor: hors ? 'default' : 'pointer' }}
        >
          <Dessin id={hors ? 'b7ae60f502fe' : position && zone ? 'd9a664d69169' : 'f47e57cb6fed'} />
        </button>
        )}
        {!coords && (
          <div className="hint">
            {t(hors ? 'Position indisponible hors des zones servies.' : repere ? 'Position enregistrée sur la carte.' : 'Déplace le repère sur ton entrée.')}
          </div>
        )}
        {!hors && (
          <div className="links" style={{ justifyContent: 'flex-start' }}>
            <a href="#" aria-disabled={gps.etat === 'recherche' || undefined} onClick={(e) => (e.preventDefault(), gps.demander())}>
              <Icone nom="locate-fixed" taille={15} /> {t(gps.etat === 'recherche' ? 'Recherche de ta position…' : coords ? 'Reprendre ma position' : 'Utiliser ma position réelle')}
            </a>
          </div>
        )}
        <MessagePosition etat={gps.etat} />
        {!hors && <RechercheLieu id="ad-lieu" choisir={gps.setCoords} />}
        {proche && proche.quartier !== zone && (
          <div className="hint">
            {tf('Ta position est à {q}.', { q: proche.quartier })}{' '}
            <a href="#" onClick={(e) => (e.preventDefault(), toucher(), setQuartier(proche.quartier))}>
              {t('Utiliser ce quartier')}
            </a>
          </div>
        )}
        {gps.coords && !proche && <div className="hint">{t('Ta position est hors des zones servies : vérifie ton quartier, ou garde le retrait au relais.')}</div>}
      </div>
      </Bloc>
      </Bloc>
      {!hors && (
        <>
          <div className="sec">
            <h2>{t('Pour le livreur')}</h2>
          </div>
          <div className="fld">
            <label htmlFor="ad-instructions">{t('Instructions (facultatif)')}</label>
            <div className="inp area">
              <textarea id="ad-instructions" value={instructions} maxLength={140} rows={2} placeholder={t('Ex. : portail vert, sonner deux fois, demander Mama Rose')} onChange={(e) => setInstructions(e.target.value)} />
            </div>
          </div>
          <div className="fld">
            <label htmlFor="ad-dest">{t('Qui reçoit le colis (facultatif)')}</label>
            <div className="inp">
              <Icone nom="user-round" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
              <input id="ad-dest" value={destinataire} maxLength={40} placeholder={t('Toi, par défaut')} autoComplete="off" onChange={(e) => setDestinataire(e.target.value)} />
            </div>
            <div className="hint">{t('Il montre ton code de retrait au livreur. Son numéro n’est jamais demandé.')}</div>
          </div>
          <div className="fld">
            <label>{t('Le meilleur moment')}</label>
            <div className="chips">
              {([null, 'matin', 'apres-midi', 'soir'] as const).map((c) => (
                <a key={c ?? 'tous'} href="#" className={'chip' + (creneau === c ? ' on' : '')} aria-pressed={creneau === c} onClick={(e) => (e.preventDefault(), setCreneau(c))}>
                  {t(c === null ? 'Peu importe' : c === 'matin' ? 'Matin (8 h – 12 h)' : c === 'apres-midi' ? 'Après-midi (12 h – 17 h)' : 'Soir (17 h – 20 h)')}
                </a>
              ))}
            </div>
          </div>
          <div className="fld">
            <label>{t('Photo de l’entrée (facultatif)')}</label>
            <input
              ref={fichier}
              type="file"
              accept={TYPES_PHOTO.join(',')}
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                try {
                  setPhoto(await reduirePhoto(f))
                  setErrPhoto(null)
                } catch {
                  setErrPhoto('Cette image ne passe pas : choisis une photo JPG, PNG ou WebP de moins de 10 Mo.')
                }
              }}
            />
            {photo ? (
              <div className="row" style={{ gap: 12 }}>
                <img src={photo} alt={t('Photo de l’entrée')} style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 14 }} />
                <span className="grow">
                  <a href="#" onClick={(e) => (e.preventDefault(), fichier.current?.click())}>
                    {t('Changer la photo')}
                  </a>
                  <br />
                  <a href="#" style={{ color: 'var(--red)' }} onClick={(e) => (e.preventDefault(), setPhoto(null))}>
                    {t('Retirer la photo')}
                  </a>
                </span>
              </div>
            ) : (
              <button type="button" className="btn secondary sm" style={{ width: 'auto' }} onClick={() => fichier.current?.click()}>
                <Icone nom="camera" taille={18} />
                <span>{t('Ajouter une photo de l’entrée')}</span>
              </button>
            )}
            <div className="hint" style={errPhoto ? rouge : undefined}>
              {t(errPhoto ?? 'Seul le livreur la voit, pendant la livraison.')}
            </div>
          </div>
        </>
      )}
      {hors && (
        <div className="note ink">
          <Icone nom="map-pin" taille={18} />
          <div>
            {t('Tes colis continuent d’aller au ')}
            <b>
              <span className="nw">{t(p.d.relais)}</span>
            </b>
            {t(', ton relais habituel.')}
          </div>
        </div>
      )}
      <div className="btns mt16">
        <button type="button" className={'btn primary' + (hors || enCours ? ' off' : '')} onClick={enregistrer}>
          <Icone nom="check" taille={18} />
          <span>{t('Enregistrer l’adresse')}</span>
        </button>
      </div>
      {hors && (
        <div className="btns">
          <Link to={chemin('adresses')} className="btn secondary">
            <span>{t('Garder le retrait au relais')}</span>
          </Link>
        </div>
      )}
      {p.adresse && (
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>
            {t('Tes colis déjà en route gardent l’ancienne adresse. Pour en changer un, ouvre-le dans ')}
            <Link to={chemin('commandes')}>{t('Mes commandes')}</Link>
            {t('.')}
          </span>
        </div>
      )}
      {p.adresse && (
        <div className="links">
          <a
            href={chemin('adresses', { st: 'modifier' })}
            role="button"
            onClick={(e) => (e.preventDefault(), supprimer.ouvrir())}
            style={{ color: 'var(--red)' }}
          >
            {t('Supprimer cette adresse')}
          </a>
        </div>
      )}
    </EcranCompte>
  )
}

export function Adresses() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const st = params.get('st')
  const id = params.get('id')
  const [d, setD] = useState<DonneesAdresses | null>(null)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let vivant = true
    source.adresses().then((x) => vivant && setD(x))
    return () => {
      vivant = false
    }
  }, [version])
  // Dès 1024 px, « Ajouter une adresse » passe dans la barre de titre, à droite (déplacé, pas dupliqué).
  const large = useDes('tab-l')
  if (!d) return null
  const recharger = () => setVersion((v) => v + 1)
  const domicile = `Livraison à domicile : ${F(d.domicile.prix)} F, offerte dès ${F(d.domicile.offertDes)} F d’articles.`

  // Formulaires : nouvelle adresse, modification (la principale, ou celle de « id »), exemple hors zone.
  if (st === 'ajout' || st === 'modifier' || st === 'hors') {
    const adresse = st === 'modifier' ? (d.adresses.find((a) => a.id === id) ?? d.adresses.find((a) => a.principale) ?? null) : null
    return (
      <Formulaire
        key={st + (adresse?.id ?? '')}
        d={d}
        adresse={adresse}
        exempleHors={st === 'hors'}
        etat={st === 'modifier' ? 'adresses?st=modifier' : undefined}
        recharger={recharger}
      />
    )
  }

  // Aucune adresse (ou l'état vide du prototype).
  if (st === 'vide' || !d.adresses.length)
    return (
      <EcranCompte route="adresses" parEtat etat="adresses?st=vide">
        <div className="card ">
          <div className="empty">
            <div className="ei">
              <Icone nom="house" taille={26} />
            </div>
            <h3>{t('Aucune adresse')}</h3>
            <p>{t('Tes colis vont au relais. Ajoute une adresse seulement si tu veux la livraison à domicile.')}</p>
            <div className="btns">
              <Link to={chemin('adresses', { st: 'ajout' })} className="btn primary">
                <Icone nom="plus" taille={18} />
                <span>{t('Ajouter une adresse')}</span>
              </Link>
            </div>
          </div>
        </div>
        <div className="hint-l">
          <Icone nom="truck" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t(domicile)}</span>
        </div>
      </EcranCompte>
    )

  const plusieurs = d.adresses.length > 1
  return (
    <EcranCompte
      route="adresses"
      parEtat
      etat="adresses"
      // Dès 1024 px, « Ajouter une adresse » est à droite du titre de la page (déplacé, pas dupliqué).
      action={
        large && (
          <Link to={chemin('adresses', { st: 'ajout' })} className="btn primary hd-act">
            <Icone nom="plus" taille={18} />
            <span>{t('Ajouter une adresse')}</span>
          </Link>
        )
      }
    >
      <p className="cl13-intro">{t('Pour la livraison à domicile. Le livreur s’en sert pour te trouver.')}</p>
      <Bloc classe="c13-adr">
      {[...d.adresses]
        .sort((a, b) => Number(b.principale) - Number(a.principale))
        .map((a) => (
          <div key={a.id} className="card">
            <div className="row">
              <span className="ic-sq or">
                <Icone nom={/travail|bureau/i.test(a.nom) ? 'building-2' : 'house'} taille={22} />
              </span>
              <span className="grow">
                <b className="t15 b8" style={{ display: 'block' }}>
                  {t(a.nom)}
                </b>
                <span className="t13 c3">
                  {t(`Zone ${a.quartier} · servie`)}
                  {plusieurs && a.principale && t(' · par défaut')}
                </span>
              </span>
              <Link to={a.principale ? chemin('adresses', { st: 'modifier' }) : chemin('adresses', { st: 'modifier', id: a.id })} className="btn secondary sm">
                <Icone nom="pencil" taille={18} />
                <span>{t('Modifier')}</span>
              </Link>
            </div>
            <p className="t15 b7" style={{ margin: '12px 0 0', lineHeight: '1.4' }}>
              {t(`${a.quartier}, ${a.reperes}`)}
            </p>
            {(a.instructions || a.destinataire || a.creneau) && (
              <p className="t13 c3" style={{ margin: '4px 0 0', lineHeight: '1.45' }}>
                {[
                  a.instructions,
                  a.destinataire && tf('Reçu par {n}', { n: a.destinataire }),
                  a.creneau && t(a.creneau === 'matin' ? 'Le matin' : a.creneau === 'apres-midi' ? 'L’après-midi' : 'Le soir'),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            {!a.instructions && (
              <div className="links" style={{ justifyContent: 'flex-start' }}>
                <Link to={a.principale ? chemin('adresses', { st: 'modifier' }) : chemin('adresses', { st: 'modifier', id: a.id })}>{t('Ajouter des consignes pour le livreur')}</Link>
              </div>
            )}
            {a.photo && <img src={a.photo} alt={t('Photo de l’entrée')} style={{ display: 'block', width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 14, marginTop: 10 }} />}
            {a.coords ? (
              // Position réelle : la carte OpenStreetMap, l'ouverture dans les cartes et le partage.
              <div className="mt10">
                <CartePosition c={a.coords} nom={a.nom} texte={`${a.quartier}, ${a.reperes}`} />
              </div>
            ) : (
              <>
                <div className="cl13-map">
                  <Dessin id={a.position ? 'd9a664d69169' : 'f47e57cb6fed'} />
                </div>
                <div className="hint-l">
                  <Icone nom={a.position ? 'check' : 'info'} taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
                  <span>{t(a.position ? 'Position enregistrée sur la carte.' : 'Pas de position : le livreur se fie à tes repères.')}</span>
                </div>
              </>
            )}
            {plusieurs && !a.principale && (
              <div className="btns mt10">
                <button type="button" className="btn ghost sm" onClick={() => source.adresseParDefaut(a.id).then(recharger)}>
                  <span>{t('Utiliser par défaut')}</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </Bloc>
      <div className="note ink">
        <Icone nom="eye" taille={18} />
        <div>{t('Le livreur voit ton prénom et ces repères, jamais ton numéro : il t’appelle par un appel masqué.')}</div>
      </div>
      <div className="hint-l">
        <Icone nom="truck" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>
          {t(domicile + ' Par défaut, tes colis vont au ')}
          <span className="nw">{t(d.relais)}</span>
          {t('.')}
        </span>
      </div>
      <details className="more">
        <summary>
          <Icone nom="truck" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Comment se passe la livraison à domicile')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{t('Tu choisis le domicile ou le relais au moment de payer ; l’adresse par défaut est proposée en premier.')}</p>
          <p>{t('En arrivant, le livreur t’appelle par un appel masqué : il ne voit jamais ton numéro. Tu lui montres ton code de retrait (ou la personne qui reçoit).')}</p>
          <p>{t('Rien ne se paie en espèces au livreur : tout est réglé avant, sur BelivaY.')}</p>
          <p>{t('Les gros colis (XL et hors gabarit) vont seulement à domicile.')}</p>
        </div>
      </details>
      <details className="more">
        <summary>
          <Icone nom="map" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{tf('Zones livrées à domicile ({n})', { n: d.zonesServies.length })}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{d.zonesServies.join(' · ')}</p>
          <p>{tf('Livraison à domicile : {p} F, offerte dès {s} F d’articles. Ailleurs, le retrait au relais reste possible partout.', { p: F(d.domicile.prix), s: F(d.domicile.offertDes) })}</p>
        </div>
      </details>
      {!large && (
      <div className="btns mt16">
        <Link to={chemin('adresses', { st: 'ajout' })} className="btn primary">
          <Icone nom="plus" taille={18} />
          <span>{t('Ajouter une adresse')}</span>
        </Link>
      </div>
      )}
    </EcranCompte>
  )
}
