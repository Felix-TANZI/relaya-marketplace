// Visionneuse des preuves du poste de travail (DECISIONS-ENCADREES.md § 1) : une pièce en grand ou plusieurs côte à
// côte (ramassage, remise, photo du client ; recto, verso, selfie), zoom par paliers, heure et lieu sous chaque pièce.
// Démonstration : aucune photo réelle n'est stockée ; chaque pièce est une vignette dessinée d'après sa nature (colis,
// colis abîmé, article, porte, comptoir, pièce d'identité…), aux couleurs des jetons. Le serveur servira le fichier par
// lien court journalisé, comme les pièces d'identité (composants/PieceIdentite.tsx).
import { useState, type ReactElement } from 'react'
import { Feuille } from '@client/composants/Feuille'
import type { MotifImage, PieceDossier } from '../../donnees/domaines/decisions'
import { usePreferences } from '../../preferences'
import { Icone } from '../Icone'
import { Heure } from '../LigneJournal'
import { TexteTraduisible } from '@client/traduction/Traduisible'

/** Vignette dessinée d'une pièce (160 × 120). */
export function Vignette({ image, titre }: { image: NonNullable<PieceDossier['image']>; titre: string }) {
  const m: MotifImage = image.motif
  const colis = (abime = false, mouille = false) => (
    <g>
      <rect className="v-fond2" x="40" y="34" width="80" height="58" rx="4" />
      <path className="v-trait" d="M40 50h80M80 34v16" />
      <rect className="v-etiq" x="88" y="62" width="24" height="16" rx="2" />
      {abime && <path className="v-alerte" d="M52 92l8-14 6 8 8-16 6 10" fill="none" />}
      {mouille && <path className="v-eau" d="M56 70c0 4 6 4 6 0l-3-6zM70 80c0 4 6 4 6 0l-3-6z" />}
    </g>
  )
  const corps: Record<MotifImage, ReactElement> = {
    colis: colis(),
    colis_abime: colis(true),
    colis_mouille: colis(false, true),
    produit: (
      <g>
        <path className="v-fond2" d="M62 30h36l14 18-10 6v40H58V54l-10-6z" />
        <path className="v-motif" d="M64 62h32M64 72h32M64 82h32" />
      </g>
    ),
    produit_autre: (
      <g>
        <path className="v-fond2" d="M62 30h36l14 18-10 6v40H58V54l-10-6z" />
        <circle className="v-motif-plein" cx="70" cy="66" r="4" />
        <circle className="v-motif-plein" cx="88" cy="74" r="4" />
        <circle className="v-motif-plein" cx="74" cy="84" r="4" />
      </g>
    ),
    contenu_incomplet: (
      <g>
        <rect className="v-fond2" x="30" y="40" width="44" height="30" rx="3" />
        <rect className="v-fond2" x="30" y="74" width="44" height="22" rx="3" />
        <rect className="v-vide" x="84" y="40" width="44" height="56" rx="3" />
      </g>
    ),
    porte: (
      <g>
        <rect className="v-fond2" x="56" y="22" width="48" height="78" rx="3" />
        <circle className="v-trait-plein" cx="96" cy="64" r="3" />
        <rect className="v-etiq" x="70" y="30" width="20" height="10" rx="2" />
        <rect className="v-fond3" x="30" y="78" width="22" height="18" rx="2" />
      </g>
    ),
    comptoir: (
      <g>
        <rect className="v-fond2" x="22" y="70" width="116" height="26" rx="3" />
        <rect className="v-fond3" x="64" y="46" width="34" height="24" rx="3" />
        <path className="v-trait" d="M64 54h34" />
      </g>
    ),
    ecran: (
      <g>
        <rect className="v-fond2" x="60" y="20" width="40" height="80" rx="7" />
        <rect className="v-fond3" x="64" y="28" width="32" height="60" rx="3" />
      </g>
    ),
    ecran_fissure: (
      <g>
        <rect className="v-fond2" x="60" y="20" width="40" height="80" rx="7" />
        <rect className="v-fond3" x="64" y="28" width="32" height="60" rx="3" />
        <path className="v-alerte" d="M70 34l10 16-6 8 12 14-4 12" fill="none" />
      </g>
    ),
    piece_recto: (
      <g>
        <rect className="v-fond2" x="24" y="30" width="112" height="66" rx="6" />
        <rect className="v-fond3" x="32" y="40" width="32" height="40" rx="3" />
        <path className="v-trait" d="M74 46h50M74 58h40M74 70h46M74 82h30" />
      </g>
    ),
    piece_verso: (
      <g>
        <rect className="v-fond2" x="24" y="30" width="112" height="66" rx="6" />
        <path className="v-trait" d="M34 44h92M34 54h92M34 64h70" />
        <path className="v-motif" d="M34 80h92M34 86h92" />
      </g>
    ),
    selfie: (
      <g>
        <circle className="v-fond2" cx="80" cy="54" r="22" />
        <path className="v-fond2" d="M44 104c4-20 18-28 36-28s32 8 36 28z" />
      </g>
    ),
    kit: (
      <g>
        <rect className="v-fond2" x="40" y="36" width="56" height="56" rx="8" />
        <rect className="v-fond3" x="102" y="52" width="24" height="16" rx="2" />
        <rect className="v-fond3" x="102" y="74" width="24" height="16" rx="2" />
      </g>
    ),
    kit_incomplet: (
      <g>
        <rect className="v-vide" x="40" y="36" width="56" height="56" rx="8" />
        <rect className="v-fond3" x="102" y="52" width="24" height="16" rx="2" />
        <rect className="v-fond3" x="102" y="74" width="24" height="16" rx="2" />
      </g>
    ),
    facture: (
      <g>
        <rect className="v-fond2" x="50" y="20" width="60" height="82" rx="4" />
        <path className="v-trait" d="M58 34h44M58 44h36M58 54h44M58 64h28M58 84h44" />
      </g>
    ),
    carte: (
      <g>
        <path className="v-trait" d="M10 40h140M10 80h140M50 10v100M110 10v100" />
        <path className="v-epingle" d="M80 34c-9 0-15 6-15 14 0 11 15 26 15 26s15-15 15-26c0-8-6-14-15-14z" />
        <circle className="v-fond" cx="80" cy="48" r="5" />
      </g>
    ),
  }
  return (
    <svg className={'pv-img t-' + image.teinte} viewBox="0 0 160 120" role="img" aria-label={titre}>
      <rect className="v-fond" width="160" height="120" />
      {corps[m]}
    </svg>
  )
}

/** Légende d'une pièce : qui, quand (heure et saisie hors connexion), où (écart avec l'adresse). */
export function Legende({ p }: { p: PieceDossier }) {
  const { t, tf } = usePreferences()
  return (
    <div className="pv-leg">
      <b>{p.titre}</b>
      <span>
        <Icone nom="clock" taille={13} /> <Heure le={p.le} />
        {p.saisieLe !== null && (
          <>
            {' · '}
            {t('saisie à')} <Heure le={p.saisieLe} />
          </>
        )}
      </span>
      {p.lieu && (
        <span>
          <Icone nom="map-pin" taille={13} /> {p.lieu}
          {p.distanceM !== null && ` · ${tf('{m} m de l’adresse', { m: p.distanceM.toLocaleString('fr-FR').replace(/[\s  ]/g, ' ') })}`}
        </span>
      )}
      <span className="pv-par">{p.par}</span>
    </div>
  )
}

const PALIERS = [1, 1.5, 2, 3]

/** Visionneuse : une pièce, ou plusieurs côte à côte ; zoom par paliers. */
export function Visionneuse({ pieces, ouverte, fermer, titre }: { pieces: PieceDossier[]; ouverte: boolean; fermer: () => void; titre: string }) {
  const { t, tf } = usePreferences()
  const [z, setZ] = useState(0)
  const zoom = PALIERS[z]
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={titre} forme="large" classe="pv-feuille">
      <h2 className="card-t">{titre}</h2>
      <div className="pv-outils" role="toolbar" aria-label={t('Zoom')}>
        <button type="button" className="btn sm secondary" disabled={z === 0} aria-label={t('Réduire')} onClick={() => setZ((x) => Math.max(0, x - 1))}>
          <Icone nom="zoom-out" taille={18} />
        </button>
        <output className="pv-z" aria-live="polite">{tf('Zoom × {z}', { z: zoom.toLocaleString('fr-FR') })}</output>
        <button type="button" className="btn sm secondary" disabled={z === PALIERS.length - 1} aria-label={t('Agrandir')} onClick={() => setZ((x) => Math.min(PALIERS.length - 1, x + 1))}>
          <Icone nom="zoom-in" taille={18} />
        </button>
        {z > 0 && (
          <button type="button" className="btn sm secondary" onClick={() => setZ(0)}>
            {t('Taille réelle')}
          </button>
        )}
      </div>
      <div className={'pv-grille n' + Math.min(pieces.length, 3)}>
        {pieces.map((p) => (
          <figure key={p.id} className="pv-piece">
            <div className="pv-cadre" tabIndex={0} aria-label={tf('{titre}, zoom × {z}', { titre: p.titre, z: zoom })}>
              {p.image ? (
                <div className="pv-zoom" style={{ width: `${zoom * 100}%` }}>
                  <Vignette image={p.image} titre={p.titre} />
                </div>
              ) : (
                <div className={'pv-sans' + (p.manquante ? ' manque' : '')}>
                  <Icone nom={p.manquante ? 'camera-off' : 'file-text'} taille={30} />
                  {p.manquante ? t('Pièce manquante') : t('Sans image')}
                </div>
              )}
            </div>
            <figcaption>
              <Legende p={p} />
              <TexteTraduisible comme="p" classe="pv-note" texte={p.note} />
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="btns mt14">
        <button type="button" className="btn secondary" onClick={fermer}>
          {t('Fermer')}
        </button>
      </div>
    </Feuille>
  )
}
