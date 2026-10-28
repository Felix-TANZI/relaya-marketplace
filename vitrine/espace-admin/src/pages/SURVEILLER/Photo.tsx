// Ajouter, remplacer ou retirer une photo depuis la console (bannière ou moment de l'accueil, catégorie, produit signalé,
// pièce d'un dossier). La photo est choisie sur l'appareil, réduite AVANT l'envoi (1 200 px au plus, JPEG) : bandeau
// recadré en 3:1 pour l'accueil (Rognage de la console, comme la couverture de l'entreprise), image entière ailleurs.
// Aperçu, puis décision motivée et journalisée ; « Retirer » rend la photo d'origine. Sans le droit : lecture seule.
import { useState } from 'react'
import { ouvrirPhoto } from '@client/donnees/photo'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Icone } from '../../composants/Icone'
import { useChoixPhoto } from '../../composants/MonCompte'
import type { CiblePhoto, PhotoConsole } from '../../donnees/domaines/pilotage'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { useDate } from '../ADM-12/commun-s6'
import './surveiller.css'

const COTE_MAX = 1200
const OCTETS_MAX = 600 * 1024
const octets = (d: string) => Math.round(((d.length - d.indexOf(',') - 1) * 3) / 4)

/** Réduit une image entière (sans recadrage) à COTE_MAX px au plus ; JPEG allégé deux fois au besoin, puis refus. */
export async function reduireImage(f: File): Promise<string> {
  const { img, url } = await ouvrirPhoto(f)
  try {
    const k = Math.min(1, COTE_MAX / Math.max(img.naturalWidth, img.naturalHeight))
    const toile = document.createElement('canvas')
    toile.width = Math.round(img.naturalWidth * k)
    toile.height = Math.round(img.naturalHeight * k)
    const ctx = toile.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, toile.width, toile.height)
    ctx.drawImage(img, 0, 0, toile.width, toile.height)
    for (const q of [0.85, 0.72, 0.6]) {
      const d = toile.toDataURL('image/jpeg', q)
      if (octets(d) <= OCTETS_MAX) return d
    }
    throw new Error('lourde')
  } finally {
    URL.revokeObjectURL(url)
  }
}

const REFUS: Record<string, string> = { photo: 'Image refusée : JPEG, PNG ou WebP réduit, 600 Ko au plus.', sans_effet: 'Aucune photo de la console à retirer.', inconnu: 'Emplacement inconnu.' }

export function CartePhoto(p: { cible: CiblePhoto; id: string; libelle: string; titre?: string; actuelle?: PhotoConsole; peut: boolean; bandeau?: boolean; apres?: () => void }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  const [nouvelle, setNouvelle] = useState<string | null>(null)
  const [retirer, setRetirer] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const choix = useChoixPhoto('couverture', setNouvelle, setErreur)
  const messageErreur = (e: unknown) => {
    const m = e instanceof Error ? e.message : ''
    return t(m === 'type' ? 'Photo refusée : JPG, PNG ou WebP seulement.' : m === 'taille' ? 'Photo trop lourde : 10 Mo au plus.' : m === 'lourde' ? 'Photo trop lourde même réduite : choisissez-en une autre.' : 'Photo illisible : essayez-en une autre.')
  }
  const libelleBouton = p.actuelle ? 'Remplacer' : 'Ajouter une photo'
  const choisirLibre = (
    <label className="btn secondary sm" style={{ cursor: 'pointer', position: 'relative' }}>
      <Icone nom="image-up" taille={16} />
      <span>{t(libelleBouton)}</span>
      <input
        type="file"
        accept="image/*"
        className="sv-fichier"
        aria-label={tf('{a} · {l}', { a: t(libelleBouton), l: p.libelle })}
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          setErreur(null)
          try {
            setNouvelle(await reduireImage(f))
          } catch (x) {
            setErreur(messageErreur(x))
          }
        }}
      />
    </label>
  )
  return (
    <div className="sv-photo" data-photo={`${p.cible}:${p.id}`}>
      <div className="sv-photo-t">
        <span>{p.titre ?? p.libelle}</span>
        {p.actuelle && <span className="pill green sm">{t('Remplacée')}</span>}
      </div>
      <div className={'sv-vignette' + (p.bandeau ? '' : ' carre')}>
        {p.actuelle ? (
          <img src={p.actuelle.photo} alt={p.libelle} />
        ) : (
          <>
            <Icone nom="image" taille={18} />
            <span>{t('Photo d’origine')}</span>
          </>
        )}
      </div>
      {p.actuelle && <div className="t12">{tf('{d} · {p} · {m}', { d: date(p.actuelle.le), p: p.actuelle.par, m: p.actuelle.motif })}</div>}
      {p.peut && (
        <div className="btns">
          {p.bandeau ? choix.bouton(libelleBouton, 'secondary sm', 'image-up') : choisirLibre}
          {p.actuelle && (
            <button type="button" className="btn ghost sm" onClick={() => setRetirer(true)}>
              <Icone nom="rotate-ccw" taille={16} />
              <span>{t('Retirer')}</span>
            </button>
          )}
        </div>
      )}
      {erreur && (
        <p className="e-erreur" role="alert">
          {erreur}
        </p>
      )}
      {choix.feuille}
      <DecisionMotivee
        ouverte={!!nouvelle}
        fermer={() => setNouvelle(null)}
        titre={tf('{a} · {l}', { a: t(p.actuelle ? 'Remplacer la photo' : 'Ajouter une photo'), l: p.libelle })}
        resume={p.cible === 'piece' ? t('Ajoutée au dossier, visible des seuls agents habilités ; jamais publiée.') : t('Visible aussitôt dans l’espace concerné ; « Retirer » rendra la photo d’origine.')}
        libelle={p.actuelle ? 'Remplacer la photo' : 'Ajouter la photo'}
        icone="image-up"
        refus={(r) => t(REFUS[r] ?? 'La décision n’a pas pu être enregistrée.')}
        envoyer={async (m) => {
          const r = await source.pilotage.remplacerPhoto({ cible: p.cible, id: p.id, libelle: p.libelle, photo: nouvelle ?? '' }, m)
          if (r.ok) p.apres?.()
          return r
        }}
      >
        {nouvelle && (
          <div className="sv-apercu">
            <img src={nouvelle} alt={t('Aperçu de la nouvelle photo')} />
          </div>
        )}
      </DecisionMotivee>
      <DecisionMotivee
        ouverte={retirer}
        fermer={() => setRetirer(false)}
        titre={tf('Retirer la photo · {l}', { l: p.libelle })}
        resume={t('La photo d’origine revient ; le retrait est journalisé.')}
        libelle="Retirer la photo"
        icone="rotate-ccw"
        refus={(r) => t(REFUS[r] ?? 'La décision n’a pas pu être enregistrée.')}
        envoyer={async (m) => {
          const r = await source.pilotage.retirerPhoto(p.cible, p.id, m)
          if (r.ok) p.apres?.()
          return r
        }}
      />
    </div>
  )
}
