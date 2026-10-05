// Écran « Adresse de livraison » (CL-03, première commande à domicile), balisage du prototype du 1er octobre
// (route adresse), repris à la main et rendu logique (DP-53) :
// - nom (Maison, Travail, Autre : un nom à écrire), quartier tapé (zones servies proposées ; « Zone servie » ou
//   « Hors zone » s'affiche tout de suite), repères écrits, point sur la carte (ma position, ou toucher la carte) ;
// - l'adresse principale du compte est reprise si elle existe ; sinon le formulaire est vide ;
// - « Enregistrer l'adresse » l'enregistre vraiment (Mon compte, Adresses), puis le paiement ; hors zone : un relais.
// Pour le client (DP-54) : instructions pour le livreur, personne qui reçoit, meilleur moment (comme Mes adresses) ;
// prix de la livraison à domicile et seuil d'offre ; zones servies écrites hors zone ; adresse enregistrée
// relue avec ses consignes, modifiable avant de payer.
// Les états du prototype (?st=vide|enregistree|hors-zone) restent des scénarios de démonstration.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Dessin } from '../../composants/Dessin'
import { CartePosition, MessagePosition, RechercheLieu, quartierProche, useMaPosition } from '../../composants/Position'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source, type Adresse as DonneeAdresse, type DonneesAdresses } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'

const NOMS = [
  { nom: 'Maison', icone: 'house' },
  { nom: 'Travail', icone: 'building' },
  { nom: 'Autre', icone: 'map-pin' },
]
const norme = (s: string) => s.trim().toLowerCase()

export function Adresse() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const st = params.get('st')
  const [d, setD] = useState<DonneesAdresses | null>(null)
  const [nom, setNom] = useState('Maison')
  const [autre, setAutre] = useState('')
  const [quartier, setQuartier] = useState('')
  const [reperes, setReperes] = useState('')
  const [position, setPosition] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [destinataire, setDestinataire] = useState('')
  const [creneau, setCreneau] = useState<DonneeAdresse['creneau']>(null)
  const [vu, setVu] = useState(false)
  const [enregistree, setEnregistree] = useState<DonneeAdresse | null>(null)
  const gps = useMaPosition()
  const tabL = useDes('tab-l')
  const localise = gps.etat === 'recherche'
  const [edite, setEdite] = useState(false) // repères tapés : plus traduits (texte du client)
  const champReperes = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    source.adresses().then((x) => {
      setD(x)
      // Le compte a déjà une adresse : elle est reprise (sauf dans les états « vide » et « hors zone »).
      const a = x.adresses.find((y) => y.principale) ?? x.adresses[0]
      if (st === 'hors-zone') return setQuartier('Soa')
      if (!a || st === 'vide') return
      setNom(NOMS.some((n) => n.nom === a.nom) ? a.nom : 'Autre')
      if (!NOMS.some((n) => n.nom === a.nom)) setAutre(a.nom)
      setQuartier(a.quartier)
      setReperes(a.reperes)
      setPosition(a.position)
      setInstructions(a.instructions ?? '')
      setDestinataire(a.destinataire ?? '')
      setCreneau(a.creneau ?? null)
    })
  }, [st])
  useEffect(() => {
    if (!gps.coords || !d) return
    setPosition(true)
    const p = quartierProche(gps.coords, d.zonesServies)
    if (p && !quartier.trim()) setQuartier(p.quartier)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gps.coords])
  useEffect(() => {
    const el = champReperes.current
    const v = edite ? reperes : t(reperes)
    if (el && document.activeElement !== el && el.textContent !== v) el.textContent = v
  })
  if (!d) return null

  const zone = d.zonesServies.find((z) => norme(z) === norme(quartier))
  const hors = !!quartier.trim() && !zone && norme(quartier).length >= 3 && !d.zonesServies.some((z) => norme(z).startsWith(norme(quartier)))
  const nomFinal = nom === 'Autre' ? autre.trim() : nom
  const erreurs = {
    nom: !nomFinal ? 'Donne un nom à cette adresse.' : null,
    quartier: !quartier.trim() ? 'Écris ton quartier.' : !zone && !hors ? 'Choisis ton quartier dans la liste.' : null,
    reperes: reperes.trim().length < 8 ? 'Écris au moins un repère : carrefour, immeuble, couleur, étage…' : null,
    position: !position ? 'Pose le point devant ta porte, ou utilise ta position.' : null,
  }
  const enregistrer = async () => {
    setVu(true)
    if (hors || Object.values(erreurs).some(Boolean)) return
    const avant = d?.adresses.find((y) => y.principale) ?? d?.adresses[0]
    const r = await source.enregistrerAdresse({ id: st !== 'vide' && avant?.nom === nomFinal ? avant.id : undefined, nom: nomFinal, quartier, reperes, position, coords: gps.coords ?? (avant?.nom === nomFinal ? avant.coords : undefined), instructions, destinataire, creneau, photo: avant?.nom === nomFinal ? (avant.photo ?? null) : null })
    if (r.ok) setEnregistree(r.adresse)
  }
  // Position réelle (GPS) : le point exact sur OpenStreetMap, et le quartier servi le plus proche.
  const maPosition = () => gps.demander()

  const ok: Pick<DonneeAdresse, 'nom' | 'quartier' | 'reperes' | 'position' | 'instructions' | 'destinataire' | 'creneau'> | null =
    enregistree ?? (st === 'enregistree' ? { nom: 'Maison', quartier: 'Mvog-Ada', reperes: 'carrefour Emana, immeuble bleu, 2e étage', position: true } : null)
  const momentTexte = (c: DonneeAdresse['creneau']) => (c === 'matin' ? 'Le matin' : c === 'apres-midi' ? 'L’après-midi' : c === 'soir' ? 'Le soir' : null)
  const prixDomicile = tf('Livraison à domicile : {p} F, offerte dès {s} F d’articles.', { p: F(d.domicile.prix), s: F(d.domicile.offertDes) })
  if (ok)
    return (
      <Ecran route="adresse" parEtat etat="adresse?st=enregistree" gabarit="centre">
        <Styles id="f16ded0d4c" />
        <div className="card green cl03-done">
          <div className="cl03-bigic green">
            <Icone nom="check" taille={30} trait={2.6} />
          </div>
          <b>{t('Adresse enregistrée')}</b>
          <span>{t('Tu la retrouves dans Mon compte, Adresses.')}</span>
        </div>
        <div className="card ">
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <span className="ic-sq or">
              <Icone nom={NOMS.find((n) => n.nom === ok.nom)?.icone ?? 'map-pin'} taille={20} />
            </span>
            <span className="grow">
              <b className="t15 b8" style={{ display: 'block' }}>
                {t(ok.nom)}
              </b>
              <span className="t13 c2" style={{ display: 'block', marginTop: '2px', lineHeight: '1.4' }}>
                {t(ok.quartier + ', ' + ok.reperes)}
              </span>
              {(ok.instructions || ok.destinataire || ok.creneau) && (
                <span className="t13 c3" style={{ display: 'block', marginTop: '4px', lineHeight: '1.45' }}>
                  {[ok.instructions, ok.destinataire && tf('Reçu par {n}', { n: ok.destinataire }), ok.creneau && t(momentTexte(ok.creneau)!)].filter(Boolean).join(' · ')}
                </span>
              )}
              {ok.position && (
                <span className="cl03-rm">
                  <Icone nom="map-pin" taille={13} />
                  <span>{t('Point posé sur la carte')}</span>
                </span>
              )}
            </span>
          </div>
        </div>
        <div className="hint-l">
          <Icone nom="truck" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{prixDomicile}</span>
        </div>
        <div className="hint-l">
          <Icone nom="phone" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Le livreur t’appelle par un appel masqué en arrivant. Tu lui montres ton code de retrait ; rien ne se paie en espèces.')}</span>
        </div>
        <div className="mt16">
          <Link to={chemin('premiere-commande')} className="btn primary">
            <Icone nom="arrow-right" taille={18} />
            <span>{t('Continuer vers le paiement')}</span>
          </Link>
        </div>
        {enregistree && (
          <div className="links">
            <a href={chemin('adresse')} onClick={(e) => (e.preventDefault(), setEnregistree(null))}>
              {t('Modifier l’adresse')}
            </a>
            <Link to={chemin('relais-choix', { retour: 'premiere-commande' })}>{t('Plutôt retirer au relais')}</Link>
          </div>
        )}
      </Ecran>
    )

  const rouge = { color: 'var(--red)' }
  const vide = !quartier && !reperes && !position
  // Dès 1024 px (§ 5.15) : les champs à gauche ; le point sur la carte et « Enregistrer » dans l'aside collant, à
  // droite. Déplacés, jamais dupliqués : sur téléphone et tablette portrait, ils restent à leur place.
  const pointCarte = (
    <div className="fld">
      <label>{t('Point sur la carte')}</label>
      {gps.coords ? (
        <CartePosition c={gps.coords} nom={nomFinal || t('Mon adresse')} texte={[quartier, reperes].filter(Boolean).join(', ')} />
      ) : position ? (
        <div className="cl03-map" style={{ marginTop: '0' }} role="button" tabIndex={0} aria-label={t('Ajuster le point sur la carte')} onClick={maPosition} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), maPosition())}>
          <Dessin id="cfdba8da6a5e" />
          <span className="cl03-mapl">
            <Icone nom="locate-fixed" taille={15} />
            <span>{t('Déplace la carte pour ajuster')}</span>
          </span>
        </div>
      ) : (
        <div
          className="cl03-map"
          style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--map-bg)' }}
          onClick={(e) => e.target === e.currentTarget && setPosition(true)}
        >
          <div className="cl03-center" style={{ padding: '0 20px' }}>
            <div className="t14 b8 c2">{t('Pose le point devant ta porte')}</div>
            <div className="mt10">
              <a href={chemin('adresse')} className="btn secondary sm" aria-disabled={localise || undefined} onClick={(e) => (e.preventDefault(), maPosition())}>
                <Icone nom="locate-fixed" taille={18} />
                <span>{t(localise ? 'Recherche de ta position…' : 'Utiliser ma position')}</span>
              </a>
            </div>
          </div>
        </div>
      )}
      <MessagePosition etat={gps.etat} />
      <RechercheLieu id="ad-lieu" choisir={gps.setCoords} />
      {position && (
        <div className="links" style={{ justifyContent: 'flex-start' }}>
          <a href="#" onClick={(e) => (e.preventDefault(), maPosition())}>
            <Icone nom="locate-fixed" taille={15} /> {t(localise ? 'Recherche de ta position…' : gps.coords ? 'Reprendre ma position' : 'Utiliser ma position réelle')}
          </a>
        </div>
      )}
      {vu && erreurs.position && (
        <div className="hint" role="alert" style={rouge}>
          {t(erreurs.position)}
        </div>
      )}
    </div>
  )
  const enregistrerBouton = (
    <>
      {/* Formulaire vide : le bouton est grisé jusqu'à la première saisie. */}
      <div className="mt16">
        <a href={chemin('adresse', { st: 'enregistree' })} aria-disabled={vide || undefined} className={'btn primary' + (vide ? ' off' : '')} onClick={(e) => (e.preventDefault(), enregistrer())}>
          <Icone nom="check" taille={18} />
          <span>{t('Enregistrer l’adresse')}</span>
        </a>
      </div>
    </>
  )
  return (
    <Ecran route="adresse" parEtat etat={hors ? 'adresse?st=hors-zone' : vide ? 'adresse?st=vide' : 'adresse'} gabarit="colonnes">
      <Styles id="f16ded0d4c" />
      <Colonne>
        <div className="pg">
          <h1 className="pg-t">{t('Où te livrer ?')}</h1>
          <p className="pg-s">{t('Écris ce qui aide le livreur à trouver ta porte.')}</p>
        </div>
        <div className="fld">
          <label>{t('Nom de l’adresse')}</label>
          <div className="chips">
            {NOMS.map((n) => (
              <a key={n.nom} href="#" className={'chip' + (nom === n.nom && !vide ? ' on' : '')} aria-pressed={nom === n.nom} onClick={(e) => (e.preventDefault(), setNom(n.nom))}>
                <Icone nom={n.icone} taille={15} />
                {t(n.nom)}
              </a>
            ))}
          </div>
          {nom === 'Autre' && (
            <div className={'inp mt8' + (vu && erreurs.nom ? ' err' : '')}>
              <input aria-label={t('Nom de l’adresse')} placeholder={t('Ex. : Chez maman')} maxLength={30} value={autre} onChange={(e) => setAutre(e.target.value)} />
            </div>
          )}
          {vu && erreurs.nom && (
            <div className="hint" role="alert" style={rouge}>
              {t(erreurs.nom)}
            </div>
          )}
        </div>
        <div className="fld">
          <label htmlFor="ad-quartier">{t('Quartier')}</label>
          <div className={'inp' + (hors ? ' err' : zone ? ' ok' : !quartier ? ' ph' : vu && erreurs.quartier ? ' err' : '')}>
            <Icone nom="map-pin" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
            <input id="ad-quartier" list="ad-zones" autoComplete="off" placeholder={t('Ton quartier')} value={quartier} onChange={(e) => setQuartier(e.target.value)} />
            {(zone || hors) && (
              <span className="suf">
                {zone ? (
                  <span className="pill green sm">
                    <Icone nom="check" taille={13} />
                    {t('Zone servie')}
                  </span>
                ) : (
                  <span className="pill amber sm">{t('Hors zone')}</span>
                )}
              </span>
            )}
          </div>
          <datalist id="ad-zones">
            {d.zonesServies.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
          {vu && !hors && erreurs.quartier && (
            <div className="hint" role="alert" style={rouge}>
              {t(erreurs.quartier)}
            </div>
          )}
        </div>
        <div className="fld">
          <label>{t('Repères')}</label>
          <div className={'inp area' + (!reperes ? ' ph' : '') + (vu && erreurs.reperes && !hors ? ' err' : '')}>
            <span
              ref={champReperes}
              className="grow"
              role="textbox"
              aria-multiline="true"
              aria-label={t('Repères')}
              contentEditable="plaintext-only"
              suppressContentEditableWarning
              data-ph={t('Carrefour, couleur de l’immeuble, étage…')}
              onInput={(e) => (setEdite(true), setReperes((e.currentTarget.textContent ?? '').slice(0, 160)))}
            />
          </div>
          {!reperes && !hors && <div className="hint">{t('Exemple : « carrefour Emana, immeuble bleu, 2e étage ».')}</div>}
          {vu && erreurs.reperes && !hors && reperes && (
            <div className="hint" role="alert" style={rouge}>
              {t(erreurs.reperes)}
            </div>
          )}
        </div>
        {hors ? (
          <>
            <div className="note amber">
              <Icone nom="map-pinned" taille={18} />
              <div>
                <b>{tf('{q} est hors des {n} zones servies.', { q: quartier.trim(), n: d.zonesServies.length })}</b>
                {t(' Pas encore de livraison à domicile ici. Choisis un relais : sa date de retrait est écrite dans la liste.')}
              </div>
            </div>
            <div className="hint-l">
              <Icone nom="map" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{tf('Livrés à domicile : {z}.', { z: d.zonesServies.join(' · ') })}</span>
            </div>
            <div className="mt16">
              <Link to={chemin('relais-choix', { retour: 'premiere-commande' })} className="btn primary">
                <Icone nom="map-pin" taille={18} />
                <span>{t('Choisir un relais')}</span>
              </Link>
            </div>
          </>
        ) : (
          <>
            {!tabL && pointCarte}
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
                  <button key={c ?? 'tous'} type="button" className={'chip' + (creneau === c ? ' on' : '')} aria-pressed={creneau === c} onClick={() => setCreneau(c)}>
                    {t(c === null ? 'Peu importe' : c === 'matin' ? 'Matin (8 h – 12 h)' : c === 'apres-midi' ? 'Après-midi (12 h – 17 h)' : 'Soir (17 h – 20 h)')}
                  </button>
                ))}
              </div>
            </div>
            <div className="hint-l">
              <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{t('Le livreur voit ton prénom et cette adresse pendant la livraison. Le vendeur ne la voit jamais.')}</span>
            </div>
            <div className="hint-l">
              <Icone nom="truck" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{prixDomicile}</span>
            </div>
            {!tabL && enregistrerBouton}
          </>
        )}
      </Colonne>
      {tabL && !hors && (
        <Aside titre="Point sur la carte">
          {pointCarte}
          {enregistrerBouton}
        </Aside>
      )}
    </Ecran>
  )
}
