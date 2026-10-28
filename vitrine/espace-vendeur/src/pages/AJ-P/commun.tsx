// Pièces communes de l'espace Publicité (AJ-P, DP-59) : coque (celle des pages ajoutées, enveloppe .aja pour la grille
// de l'ordinateur), états de lecture, noms des emplacements et des états, aperçu côté client avec l'étiquette
// « Sponsorisé » (garde-fou toujours visible), raisons de refus en mots.
import type { ReactNode } from 'react'
import { F } from '@client/i18n/format'
import { Vignette } from '../../composants/Dessin'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { ReserveAuProprietaire } from '../../donnees/communs'
import type { Campagne, Emplacement, Estimation, EtatCampagne, RefusCampagne, ReglesPub } from '../../donnees/domaines/publicite'
import { usePreferences } from '../../preferences'
import { Bouton } from '../VD-11/communs'
import '../AJ-A/aja.css'
import './ajp.css'

export { Bouton, Feuille } from '../VD-11/communs'
export { useToast } from '../VD-08/commun'
export { useCompteur } from '../VD-10/commun'
export { Selecteur, Indice } from '../AJ-A/commun'
export { useEnLigne } from '../../donnees/fileHorsLigne'

export function EcranAJP(p: { route: string; fixes?: ReactNode; children?: ReactNode }) {
  return (
    <Ecran route={p.route} fixes={p.fixes ? <div className="aja ajp">{p.fixes}</div> : undefined}>
      <div className="aja ajp">{p.children}</div>
    </Ecran>
  )
}

/** Montant en un seul nœud de texte (« 17 840 F », en anglais « 17,840 F »). */
export function useF() {
  const { t } = usePreferences()
  return (n: number) => t(`${F(n)} F`)
}

export function Chargement({ route }: { route: string }) {
  const { t } = usePreferences()
  return (
    <EcranAJP route={route}>
      <div className="card ajp-attente" style={{ marginTop: '18px' }} aria-busy="true">
        <span className="t13 c3">{t('Chargement…')}</span>
      </div>
    </EcranAJP>
  )
}

export function Erreur({ route, erreur, relire }: { route: string; erreur: Error; relire: () => void }) {
  const { t } = usePreferences()
  const reserve = erreur instanceof ReserveAuProprietaire || erreur.name === 'ReserveAuProprietaire'
  return (
    <EcranAJP route={route}>
      <div className="card" style={{ marginTop: '18px' }}>
        <div className="empty">
          <div className="ei" style={reserve ? undefined : { background: 'var(--red-soft)', color: 'var(--red)' }}>
            <Icone nom={reserve ? 'lock' : 'cloud-off'} taille={24} />
          </div>
          <h3>{t(reserve ? 'Réservé au propriétaire' : 'Cette page ne s’affiche pas')}</h3>
          <p>{t(reserve ? 'La publicité se paie sur le solde de la boutique : seul le propriétaire la gère.' : 'Vérifiez votre connexion, puis réessayez. Rien de ce que vous avez saisi n’est perdu.')}</p>
        </div>
        {reserve ? (
          <Bouton classe="secondary" icone="layout-grid" vers={chemin('accueil')}>
            {t('Retour à l’accueil')}
          </Bouton>
        ) : (
          <Bouton classe="secondary" icone="refresh-cw" onClick={relire}>
            {t('Réessayer')}
          </Bouton>
        )}
      </div>
    </EcranAJP>
  )
}

export const NOM_EMPLACEMENT: Record<Emplacement, string> = {
  recherche: 'Sponsorisé · recherche',
  categories: 'Sponsorisé · catégories',
  une: 'À la une',
  carrousel: 'Carrousel de l’accueil',
  boost_24h: 'Boost 24 h',
  boost_7j: 'Boost 7 jours',
  flash: 'Vente flash sur sélection',
}
export const ICONE_EMPLACEMENT: Record<Emplacement, string> = { recherche: 'search', categories: 'layout-grid', une: 'star', carrousel: 'images', boost_24h: 'rocket', boost_7j: 'rocket', flash: 'zap' }

export function PastilleEtat({ e, enchere = false }: { e: EtatCampagne; enchere?: boolean }) {
  const { t } = usePreferences()
  const [ton, nom] = ({ en_cours: ['green', 'En cours'], programmee: ['or', 'Programmée'], en_pause: ['amber', 'En pause'], candidature: ['violet', enchere ? 'Enchère envoyée' : 'Candidature envoyée'], terminee: ['ink', 'Terminée'], refusee: ['ink', 'Non retenue'] } as Record<EtatCampagne, [string, string]>)[e]
  return (
    <span className={'pill sm ' + ton}>
      {e === 'en_cours' && <i className="d"></i>}
      {t(nom)}
    </span>
  )
}

const REFUS: Record<RefusCampagne, string> = {
  sous_plancher: 'Enchère trop basse : {clic} F par clic au moins.',
  budget_min: 'Budget du jour trop bas : {budget} F au moins, et au moins votre enchère.',
  pas_en_vente: 'Seul un produit en vente peut être mis en avant.',
  rupture: 'Produit en rupture : réapprovisionnez d’abord.',
  score: 'Trust Score sous {score} : aucune publicité possible pour le moment.',
  litige: 'Un litige est en cours sur ce produit : attendez sa décision.',
  solde_insuffisant: 'Solde publicitaire insuffisant : rechargez-le d’abord.',
  remise_min: 'Remise trop faible : {remise} % au moins.',
  garde_negatif: 'Refusée : à ce prix, vous garderiez moins de 0 F.',
  deja_active: 'Ce produit a déjà une campagne de ce type.',
  semaines: 'De 1 à 4 semaines.',
  complet: 'Plus de place libre cette semaine : choisissez une autre semaine.',
  enchere_min: 'Enchère de la semaine trop basse : {une} F au moins pour À la une, {carrousel} F pour le carrousel.',
  etat: 'Cette campagne ne peut plus être modifiée.',
}
export function texteRefus(r: RefusCampagne, g: ReglesPub, tf: (k: string, v: Record<string, string | number>) => string) {
  return tf(REFUS[r], { clic: F(g.clicPlancher), budget: F(g.budgetJourMin), score: g.scoreMin, remise: g.flashRemiseMin, une: F(g.uneEnchereMin), carrousel: F(g.carrouselEnchereMin) })
}

const RAISON: Record<string, string> = { stock: 'Stock épuisé : diffusion suspendue, heures non diffusées remboursées.', litige: 'Litige en cours : diffusion suspendue, heures non diffusées remboursées.', rupture: 'Stock épuisé : diffusion suspendue.', score: 'Trust Score trop bas : diffusion suspendue.', pas_en_vente: 'Produit retiré de la vente : diffusion suspendue.', retiree: 'Candidature retirée.', enchere_depassee: 'Enchère dépassée : rien n’a été pris.', solde: 'Solde insuffisant à l’attribution : rien n’a été pris.', remise_min: 'Remise trop faible au moment de la sélection.', garde_negatif: 'Non retenue : à ce prix, vous garderiez moins de 0 F.' }
export const texteMotif = (m: string | null) => (m ? (RAISON[m] ?? m) : null)

/** Ce que voit le client : l'emplacement payé, toujours marqué « Sponsorisé » (vente flash : « Vente flash »). La liste
 *  vient de la source (placerAnnonces : 2 annonces au plus sur 10, jamais au-dessus d'une offre moins chère et mieux
 *  notée du même produit) ; autres vendeurs anonymes. */
export function ApercuClient({ c, apercu, regles }: { c: Pick<Campagne, 'emplacement' | 'titre' | 'variante' | 'dessin' | 'prix' | 'prixPromo' | 'remisePourCent'>; apercu: Estimation['apercu']; regles: ReglesPub }) {
  const { t, tf } = usePreferences()
  const f = useF()
  const flash = c.emplacement === 'flash'
  if (c.emplacement === 'une' || c.emplacement === 'carrousel' || !apercu.length)
    return (
      <div className="ajp-ecran" aria-label={t('Ce que voit le client')}>
        <div className="ajp-barre-cl">{t(c.emplacement === 'une' || c.emplacement === 'carrousel' ? 'Accueil BelivaY' : 'Liste BelivaY')}</div>
        <div className={'ajp-banniere' + (c.emplacement === 'carrousel' ? ' carrousel' : '')}>
          <Vignette nom={c.dessin} taille={64} />
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="t12 b7" style={{ opacity: 0.8 }}>{t(c.emplacement === 'une' ? 'À la une' : c.emplacement === 'carrousel' ? 'Sélection de la semaine' : flash ? 'Ventes flash' : 'Mis en avant')}</div>
            <div className="t15 b8 ajp-ell">{`${c.titre} · ${t(c.variante)}`}</div>
            <div className="t14 b8">{f(flash && c.prixPromo ? c.prixPromo : c.prix)}</div>
          </div>
          <span className="ajp-etiq clair">{t(flash ? `−${c.remisePourCent ?? 0} %` : 'Sponsorisé')}</span>
        </div>
        {c.emplacement === 'carrousel' && (
          <div className="ajp-points" aria-hidden="true">
            <i className="on"></i>
            <i></i>
            <i></i>
          </div>
        )}
        <div className="ajp-res fant"></div>
        <div className="ajp-res fant"></div>
      </div>
    )
  const montre = apercu.some((x) => x.nous)
  return (
    <div className="ajp-ecran" aria-label={t('Ce que voit le client')}>
      <div className="ajp-barre-cl">
        <Icone nom={c.emplacement === 'categories' ? 'layout-grid' : 'search'} taille={14} />
        <span>{c.emplacement === 'categories' ? t('Téléphones & accessoires') : c.titre.split(' ')[0]}</span>
      </div>
      {apercu.map((x, i) =>
        x.nous ? (
          <div className="ajp-res nous" key={i} data-apercu="nous">
            <Vignette nom={c.dessin} taille={44} />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="t13 b7 ajp-ell">{`${c.titre} · ${t(c.variante)}`}</div>
              <div className="row" style={{ gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                <span className="b8 t14 cor">{f(x.prix)}</span>
                {flash && c.prixPromo ? <span className="aja-barre t12">{f(c.prix)}</span> : null}
              </div>
            </div>
            {x.sponsorise && <span className={'ajp-etiq' + (flash ? ' flash' : '')}>{t(flash ? `Vente flash −${c.remisePourCent ?? 0} %` : 'Sponsorisé')}</span>}
          </div>
        ) : (
          <div className="ajp-res" key={i}>
            <span className="ajp-vig-vide" aria-hidden="true"></span>
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="t13 b7 c2">{t(x.memeProduit ? 'Même produit · autre vendeur' : 'Autre produit')}</div>
              <div className="t12 c3">{`${f(x.prix)} · ★ ${String(x.note).replace('.', ',')}`}</div>
            </div>
          </div>
        ),
      )}
      {!montre && (
        <div className="note amber" role="status">
          <Icone nom="info" taille={16} />
          <div>{t('Votre annonce ne serait pas montrée sur cette page : une offre du même produit, moins chère et mieux notée, passe avant. Rien ne vous serait facturé.')}</div>
        </div>
      )}
      <div className="t12 c3" style={{ padding: '6px 2px 0', lineHeight: 1.4 }}>
        {tf('{n} annonces au plus sur {f} résultats ({p} % de l’écran) ; jamais au-dessus d’une offre moins chère et mieux notée.', { n: regles.annoncesMax, f: regles.fenetre, p: regles.densiteMaxPourCent })}
      </div>
    </div>
  )
}

/** Garde-fous DP-59, visibles du vendeur. */
export function GardeFous({ regles }: { regles: ReglesPub }) {
  const { t, tf } = usePreferences()
  const l: [string, string][] = [
    ['tag', t('L’étiquette « Sponsorisé » est toujours visible du client.')],
    ['layout-grid', tf('Au plus {p} % de l’écran en annonces.', { p: regles.densiteMaxPourCent })],
    ['shield-check', tf('Seuil de qualité : du stock, un Trust Score de {s} au moins, aucun litige en cours.', { s: regles.scoreMin })],
    ['coins', t('Vous ne payez que les clics réels ou les heures réellement diffusées : jamais sans diffusion.')],
    ['undo-2', t('Heures non diffusées (rupture, litige, arrêt) : remboursées sur votre solde.')],
    ['wallet', t('Payé par votre solde publicitaire, jamais retenu sur vos versements.')],
  ]
  return (
    <div className="card ajp-garde">
      <h3 className="b8 t15" style={{ margin: 0 }}>
        {t('Nos garde-fous')}
      </h3>
      {l.map(([i, x]) => (
        <div className="ajp-gf" key={i}>
          <Icone nom={i} taille={16} />
          <span>{x}</span>
        </div>
      ))}
    </div>
  )
}

/** Télécharge un fichier texte (facture, export). */
export function telecharger(nom: string, texte: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob(['﻿' + texte], { type: type + ';charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
