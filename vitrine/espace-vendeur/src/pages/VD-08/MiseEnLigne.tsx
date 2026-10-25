// Assistant de mise en ligne en trois étapes (VAGUE-AMELIORATIONS.md n° 11), à côté de la page unique « Nouveau
// produit » (offre1, DP-58) : les mêmes services, dans l'ordre le plus court.
// 1. Photo : le produit pris en photo (photos réelles, PHO-01 : le minimum du registre) ; BelivaY le reconnaît
//    (« C'est celui-ci ? ») ou on le cherche ; l'offre se rattache à sa fiche (NOF-02).
// 2. Prix : le prix suggéré par la meilleure offre (R34, BV-DEV-02 § 8 : max(médiane des prix gagnants des zones ;
//    10e centile du marché ; 1 000 F ; plancher) ; demo/produits.ts prixConseille), « vous gardez » en direct (PRX-08).
// 3. Stock : la quantité et l'état de l'article, puis « Mettre en ligne » (vérification sous 48 h, comme offre1).
// Brouillon gardé à chaque étape (« ?b= ») : on reprend où l'on s'est arrêté. Accès Préparation : réservé.
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Apercu, Conseil, FicheCatalogue, PhotoPrise, Reglages } from '../../donnees/domaines/offres'
import type { PhotoReelle } from '../../donnees/domaines/produits'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { useMontantsVisibles } from '../../session'
import { Bouton, ImagePhoto, Reserve, useMontant } from './commun'
import { lireImage, preparerPhoto } from './photos'
import './nouveau.css'

const ETAPES = ['Photo', 'Prix', 'Stock'] as const
const REFUS: Record<string, string> = {
  photos: 'Il manque des photos réelles.',
  prix_minimum: 'Prix sous le minimum publiable.',
  plafond: 'Prix au-dessus du plafond de démarrage.',
  prix: 'Indiquez un prix.',
  stock: 'Indiquez au moins 1 article en stock.',
  etat: 'Choisissez l’état de l’article.',
  fiche: 'Choisissez le produit au catalogue.',
}

export default function MiseEnLigne() {
  const { t, tf } = usePreferences()
  const montants = useMontantsVisibles()
  const montant = useMontant()
  const naviguer = useNavigate()
  const [params, setParams] = useSearchParams()
  const b = params.get('b')
  const etape = Math.min(3, Math.max(1, Number(params.get('e')) || 1))
  const aller = (e: number, brouillon = b) => setParams(Object.fromEntries(Object.entries({ e: String(e), b: brouillon ?? '' }).filter(([, v]) => v)), { replace: false })
  const [reglages, setReglages] = useState<Reglages | null>(null)
  const [locales, setLocales] = useState<PhotoPrise[]>([]) // avant le rattachement à une fiche
  const [photos, setPhotos] = useState<PhotoReelle[]>([])
  const [proposees, setProposees] = useState<FicheCatalogue[] | null>(null)
  const [q, setQ] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const [conseil, setConseil] = useState<Conseil | null>(null)
  const [prix, setPrix] = useState('')
  const [apercu, setApercu] = useState<Apercu | null>(null)
  const [stock, setStock] = useState(1)
  const [etat, setEtat] = useState('')
  useEffect(() => {
    source.offres.reglages().then(setReglages)
  }, [])
  useEffect(() => {
    if (b) source.offres.photos(b).then(setPhotos)
  }, [b])
  // Étape 2 : le conseil du marché de la fiche (R34, sans prix saisi : aucune borne haute) ; le prix suggéré pré-rempli.
  useEffect(() => {
    if (etape !== 2 || !b) return
    source.offres.conseil(b, 10_000_000).then((c) => {
      setConseil(c)
      if (!prix && c) setPrix(String(c.conseille))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape, b])
  const prixNombre = /^\d+$/.test(prix.trim()) ? Number(prix.trim()) : null
  useEffect(() => {
    if (etape !== 2 || !b || !prixNombre) return setApercu(null)
    let vivant = true
    source.offres.apercu(b, prixNombre).then((a) => vivant && setApercu(a))
    return () => void (vivant = false)
  }, [etape, b, prixNombre])
  useEffect(() => {
    if (reglages && !etat) setEtat(reglages.etats[0] ?? '')
  }, [reglages, etat])
  if (!montants) return <Reserve route="mise_en_ligne" />
  if (!reglages) return null
  const nb = b ? photos.length : locales.length
  const manque = Math.max(0, reglages.photosMin - nb)

  const ajouterFichier = async (f: File | undefined) => {
    if (!f) return
    setErreur(null)
    try {
      const img = await lireImage(f)
      const p = await preparerPhoto(img, img.naturalWidth, img.naturalHeight, null, reglages, f.size, f.lastModified || Date.now(), null)
      if (p === 'petite') return setErreur(t('Moins de 800 × 800 px : choisissez une photo plus grande.'))
      if (b) {
        const r = await source.offres.ajouterPhoto(b, p)
        if (!r.ok) return setErreur(t(r.raison === 'max' ? 'Nombre maximal de photos atteint.' : 'Moins de 800 × 800 px : choisissez une photo plus grande.'))
        setPhotos(await source.offres.photos(b))
      } else {
        setLocales((l) => [...l, p])
        // La première photo : BelivaY reconnaît le produit (fiches les plus proches du catalogue).
        if (!proposees) setProposees(await source.offres.reconnaitre(p))
      }
      jouer('interrupteur')
    } catch {
      setErreur(t('Cette photo ne s’ouvre pas sur ce téléphone : prenez-la avec la caméra.'))
    }
  }
  const chercher = async () => {
    if (q.trim().length < 3) return
    const r = await source.offres.rechercher(q.trim())
    setProposees([...r.exacts, ...r.proches])
  }
  const choisir = async (f: FicheCatalogue) => {
    setOccupe(true)
    const r = await source.offres.commencer(f.id)
    if (!r.ok) {
      setOccupe(false)
      return setErreur(t(r.raison === 'reserve' ? 'Réservé au propriétaire de la boutique.' : 'Cette fiche n’est plus au catalogue.'))
    }
    for (const p of locales) await source.offres.ajouterPhoto(r.brouillonId, p)
    setLocales([])
    setPhotos(await source.offres.photos(r.brouillonId))
    setOccupe(false)
    aller(1, r.brouillonId)
  }
  const validerPrix = async () => {
    if (!b || !prixNombre) return setErreur(t(REFUS.prix))
    if (apercu?.refus) return setErreur(t(apercu.refus === 'minimum' ? REFUS.prix_minimum : REFUS.plafond))
    const r = await source.offres.modifier(b, { prix: prixNombre })
    if (!r.ok) return setErreur(t('Ce prix n’est pas accepté : corrigez-le.'))
    setErreur(null)
    aller(3)
  }
  const publier = async () => {
    if (!b) return
    setOccupe(true)
    setErreur(null)
    const m = await source.offres.modifier(b, { stock, etatArticle: etat })
    const r = m.ok ? await source.offres.publier(b, { rester: false, horsLigne: !navigator.onLine }) : null
    setOccupe(false)
    if (r?.ok) {
      jouer('fin')
      return naviguer(chemin('offre_publiee', { o: b }))
    }
    jouer('erreur')
    setErreur(t(REFUS[r && !r.ok ? r.raison : 'stock'] ?? 'La mise en ligne n’a pas abouti : vérifiez chaque étape.'))
  }

  const suggere = conseil?.conseille ?? null
  const zonesPremier = conseil ? conseil.zones.filter((z) => z.premierAuConseille).length : 0
  return (
    <Ecran route="mise_en_ligne">
      <h1 className="pg-t" style={{ marginTop: '8px' }}>
        {t('Mettre en ligne')}
      </h1>
      <ol className="ml-etapes" aria-label={t('Étapes')}>
        {ETAPES.map((x, i) => (
          <li key={x} className={i + 1 < etape ? 'fait' : i + 1 === etape ? 'cur' : ''} aria-current={i + 1 === etape ? 'step' : undefined}>
            <span className="n">{i + 1 < etape ? <Icone nom="check" taille={14} trait={3} /> : i + 1}</span>
            {t(x)}
          </li>
        ))}
      </ol>
      {erreur && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{erreur}</div>
        </div>
      )}

      {etape === 1 && (
        <section className="np-panneau ml-panneau" aria-labelledby="ml-photo">
          <div className="np-corps">
            <h2 id="ml-photo" className="ml-t">
              {t('Prenez le produit en photo')}
            </h2>
            <p className="t13 c3">{tf('{n} photos réelles au moins (face, dos, détail) : la première sert à le reconnaître.', { n: reglages.photosMin })}</p>
            <div className="ml-photos">
              {(b ? photos : locales.map((p, i) => ({ ...p, id: 'l' + i }))).map((p) => (
                <span key={p.id} className="ml-ph">
                  <ImagePhoto p={p} />
                </span>
              ))}
              <label className="ml-ph ml-ajout">
                <Icone nom="camera" taille={22} />
                <span>{t('Prendre une photo')}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" data-assistant-photo onChange={(e) => void ajouterFichier(e.target.files?.[0])} />
              </label>
            </div>
            {manque > 0 && <p className="t13 b7 mt8">{tf(manque > 1 ? 'Encore {n} photos.' : 'Encore {n} photo.', { n: manque })}</p>}
            {!b && proposees && (
              <div className="mt12">
                <div className="t14 b8">{t(proposees.length ? 'C’est celui-ci ?' : 'Pas reconnu : cherchez-le.')}</div>
                <div className="np-liste mt8">
                  {proposees.map((f) => (
                    <button key={f.id} type="button" className="np-ligne ml-fiche" disabled={occupe} onClick={() => void choisir(f)}>
                      <span className="ml-vig">
                        <Vignette nom={f.dessin} taille={44} />
                      </span>
                      <span className="grow">
                        <b>{f.titre}</b>
                        <small>{[f.marque, t(f.rayon), f.fourchette ? tf('marché {a} – {b}', { a: montant(f.fourchette[0]), b: montant(f.fourchette[1]) }) : null].filter(Boolean).join(' · ')}</small>
                      </span>
                      <span className="pill green sm">{t('Je vends ce produit')}</span>
                    </button>
                  ))}
                </div>
                <form
                  className="ml-cherche mt8"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void chercher()
                  }}
                >
                  <input aria-label={t('Chercher le produit au catalogue')} placeholder={t('Ou cherchez-le : nom, marque…')} value={q} onChange={(e) => setQ(e.target.value)} />
                  <button type="submit" className="btn secondary sm">
                    {t('Chercher')}
                  </button>
                </form>
              </div>
            )}
            {b && <p className="t13 c3 mt8">{t('Produit choisi : l’offre est rattachée à sa fiche du catalogue.')}</p>}
            <div className="mt12">
              <Bouton classe={'primary' + (b && manque === 0 ? '' : ' off')} icone="arrow-right" inactif={!b || manque > 0} onClick={() => aller(2)}>
                {t('Continuer : le prix')}
              </Bouton>
            </div>
          </div>
        </section>
      )}

      {etape === 2 && (
        <section className="np-panneau ml-panneau" aria-labelledby="ml-prix">
          <div className="np-corps">
            <h2 id="ml-prix" className="ml-t">
              {t('Le prix')}
            </h2>
            {conseil && suggere !== null && (
              <div className="ml-sugg" data-prix-suggere={suggere}>
                <span className="k">{t('Prix suggéré par la meilleure offre')}</span>
                <b>{montant(suggere)}</b>
                <span className="t13">
                  {zonesPremier
                    ? tf(zonesPremier > 1 ? 'Le moins cher livré dans {n} zones : les clients vous sont attribués en priorité.' : 'Le moins cher livré dans {n} zone : les clients vous sont attribués en priorité.', { n: zonesPremier })
                    : t('Le prix le plus bas que le marché permet sans brader votre produit.')}
                </span>
              </div>
            )}
            <div className="fld">
              <label htmlFor="ml-prix-v">{t('Votre prix de vente')}</label>
              <div className="inp">
                <input id="ml-prix-v" inputMode="numeric" value={prix} onChange={(e) => setPrix(e.target.value.replace(/\D/g, ''))} />
                <span className="suf">{t('F')}</span>
              </div>
              {apercu && apercu.garde !== null && <div className="hint">{tf('Vous gardez {g} ({p} %).', { g: montant(apercu.garde), p: String(apercu.partPourCent).replace('.', ',') })}</div>}
              {apercu?.refus && <div className="hint err">{t(apercu.refus === 'minimum' ? REFUS.prix_minimum : REFUS.plafond)}</div>}
            </div>
            {suggere !== null && prixNombre !== suggere && (
              <button type="button" className="np-lien t14 b7" onClick={() => setPrix(String(suggere))}>
                <Icone nom="sparkles" taille={16} /> {tf('Prendre le prix suggéré ({m})', { m: montant(suggere) })}
              </button>
            )}
            <div className="ml-btns mt12">
              <Bouton classe="secondary" icone="arrow-left" onClick={() => aller(1)}>
                {t('Retour')}
              </Bouton>
              <Bouton classe="primary" icone="arrow-right" onClick={() => void validerPrix()}>
                {t('Continuer : le stock')}
              </Bouton>
            </div>
          </div>
        </section>
      )}

      {etape === 3 && (
        <section className="np-panneau ml-panneau" aria-labelledby="ml-stock">
          <div className="np-corps">
            <h2 id="ml-stock" className="ml-t">
              {t('Le stock')}
            </h2>
            <div className="ml-qte" role="group" aria-label={t('Quantité en stock')}>
              <button type="button" aria-label={t('Moins')} disabled={stock <= 1} onClick={() => setStock((s) => Math.max(1, s - 1))}>
                <Icone nom="minus" taille={18} />
              </button>
              <b aria-live="polite">{stock}</b>
              <button type="button" aria-label={t('Plus')} onClick={() => setStock((s) => s + 1)}>
                <Icone nom="plus" taille={18} />
              </button>
              <span className="t13 c3">{t('articles prêts à vendre')}</span>
            </div>
            <div className="t14 b8 mt12">{t('État de l’article')}</div>
            <div className="chips mt8" role="radiogroup" aria-label={t('État de l’article')}>
              {reglages.etats.map((x) => (
                <button key={x} type="button" role="radio" aria-checked={etat === x} className={'chip' + (etat === x ? ' on' : '')} onClick={() => setEtat(x)}>
                  {t(x)}
                </button>
              ))}
            </div>
            <div className="ml-btns mt16">
              <Bouton classe="secondary" icone="arrow-left" onClick={() => aller(2)}>
                {t('Retour')}
              </Bouton>
              <Bouton classe={'primary' + (occupe ? ' off' : '')} icone="send" inactif={occupe} onClick={() => void publier()}>
                {tf('Mettre en ligne · vérification sous {h} h', { h: reglages.moderationH })}
              </Bouton>
            </div>
          </div>
        </section>
      )}
    </Ecran>
  )
}
