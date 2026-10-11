// Offre envoyée (VD-08) — reprise du prototype (route('offre_publiee')), branchée sur la réponse de la publication
// (« ?o= » ; sans lui, la dernière offre envoyée).
// - Produit et prix, « Réponse au plus tard <date>, motif toujours écrit » (VD08-R30) ; hors connexion : l'offre part
//   au retour du réseau.
// - Carte « Meilleur prix » SEULEMENT si l'offre est vraiment la moins chère livrée dans toutes les zones (PUB-01,
//   VD08-R29) : badge, vitrine de quartier offerte et vente flash offerte (seulement si FF-FLASH est ouvert, VD08-R33).
// - « Comment ça marche » : garder le badge (hausse de plus de 10 % en 7 jours), suivi du marché à la baisse seulement.
// - « Voir mes produits », « Ajouter une autre variante » (Dupliquer, avec l'offre pour source) ; ajouts : « Voir
//   l'offre », « Ajouter un autre produit » ; produit nouveau : envoyé → en vérification (fiche écrite par BelivaY) →
//   en vente ; doublon rattaché à l'envoi (FCH-02) ; coche animée et son (famille du client). Accès Préparation : réservé.
import { useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useMontantsVisibles } from '../../session'
import { Bouton, Chargement, Reserve, dateHeure, useMontant } from './commun'

export default function OffrePubliee() {
  const { t, tf, langue } = usePreferences()
  const montants = useMontantsVisibles()
  const montant = useMontant()
  const [params] = useSearchParams()
  const lecture = useLecture(async () => ({ p: await source.offres.publication(params.get('o')) }), [params.get('o'), montants])
  if (!montants) return <Reserve route="offre_publiee" />
  if (!lecture.donnees) return <Chargement route="offre_publiee" />
  const p = lecture.donnees.p
  if (!p)
    return (
      <Ecran route="offre_publiee">
        <div className="card" style={{ marginTop: '18px' }}>
          <div className="empty">
            <div className="ei">
              <Icone nom="send" taille={24} />
            </div>
            <h3>{t('Aucune offre envoyée pour l’instant')}</h3>
            <p>{t('Une offre envoyée attend sa vérification ici, puis dans Mes produits.')}</p>
          </div>
          <Bouton classe="primary" icone="plus" vers={chemin('offre1')}>
            {t('Ajouter un produit')}
          </Bouton>
        </div>
      </Ecran>
    )
  const nom = p.variante ? `${p.titre} ${t(p.variante)}` : p.titre
  return (
    <Ecran route="offre_publiee">
      <div className="center" style={{ paddingTop: '22px' }}>
        <div className="blv-succes" style={{ width: '76px', height: '76px', borderRadius: '50%', margin: '0 auto', background: 'var(--or-soft-2)', color: 'var(--or-txt)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 8px var(--or-soft)' }}>
          <Icone nom="send" taille={34} />
        </div>
        <h1 className="pg-t" style={{ marginTop: '16px' }}>
          {t(p.enFile ? 'Offre gardée' : 'Offre envoyée')}
        </h1>
        <p className="pg-s">
          {p.prix !== null ? tf('{nom} à {m}.', { nom, m: montant(p.prix) }) : `${nom}.`}
          <br />
          {p.enFile ? t('Hors connexion : elle part au retour du réseau, puis la vérification dure 48 h au plus.') : tf('Réponse au plus tard {d}, motif toujours écrit.', { d: dateHeure(p.reponseAvant, langue) })}
        </p>
      </div>
      {p.rattache && (
        <div className="note green blv-succes">
          <Icone nom="link" taille={18} />
          <div>{t('Ce produit existait déjà au catalogue : votre offre est rattachée à sa fiche. Rien de ce que vous avez saisi n’est perdu.')}</div>
        </div>
      )}
      {p.nouveau && (
        <div className="card flat tight">
          <div className="tl" style={{ marginTop: '2px' }}>
            <div className="ti done blv-cascade">
              <div className="tt">{t('Envoyé')}</div>
              <div className="td">{t('Vos photos, votre prix et votre proposition de fiche sont chez BelivaY.')}</div>
            </div>
            <div className="ti cur">
              <div className="tt">{t('En vérification')}</div>
              <div className="td">{t('BelivaY écrit la fiche du produit et vérifie votre offre.')}</div>
            </div>
            <div className="ti">
              <div className="tt">{t('En vente')}</div>
              <div className="td">{t('Le produit paraît chez les clients ; vous êtes prévenu.')}</div>
            </div>
          </div>
        </div>
      )}
      {p.meilleurPrix && (
        <div className="hero night">
          <div className="otop">
            <span className="hk">{t('Meilleur prix')}</span>
            <Icone nom="award" taille={20} style={{ color: 'var(--gold-l)' }} />
          </div>
          <div className="b8 mt8" style={{ fontSize: '22px', lineHeight: '1.25' }}>
            {tf('Votre offre est la moins chère livrée dans {n} zones sur {m}', { n: p.zonesPremier, m: p.zones })}
          </div>
          <div className="hline"></div>
          <div className="t13" style={{ color: 'rgba(255,255,255,.8)' }}>
            {t('Ce que vous gagnez ce mois :')}
          </div>
          <div className="mt4">
            {p.avantages.includes('badge') && (
              <div className="row" style={{ padding: '7px 0' }}>
                <Icone nom="badge-check" taille={18} style={{ flexShrink: '0', color: 'var(--gold-l)' }} />
                <span className="t14 b7">{t('Le badge « Meilleur prix » sur l’offre')}</span>
              </div>
            )}
            {p.avantages.includes('flash') && (
              <div className="row" style={{ padding: '7px 0' }}>
                <Icone nom="zap" taille={18} style={{ flexShrink: '0', color: 'var(--gold-l)' }} />
                <span className="t14 b7">{t('Une vente flash offerte')}</span>
              </div>
            )}
            {p.avantages.includes('vitrine') && (
              <div className="row" style={{ padding: '7px 0' }}>
                <Icone nom="store" taille={18} style={{ flexShrink: '0', color: 'var(--gold-l)' }} />
                <span className="t14 b7">{t('Une vitrine de quartier offerte')}</span>
              </div>
            )}
          </div>
        </div>
      )}
      {!p.meilleurPrix && p.zones > 0 && (
        <div className="card flat tight">
          <div className="row" style={{ gap: '10px', alignItems: 'flex-start' }}>
            <Icone nom="map-pin" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0', marginTop: '2px' }} />
            <span className="t13 c2" style={{ lineHeight: '1.45' }}>
              {tf('Une fois vérifiée, votre offre passera en premier dans {n} zones sur {m}.', { n: p.zonesPremier, m: p.zones })}
            </span>
          </div>
        </div>
      )}
      <details className="more">
        <summary>
          <Icone nom="bell" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Comment ça marche')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>
            <b>{t('Garder le badge')}</b>
            {t(' : une hausse de plus de 10 % en 7 jours fait perdre le badge et les ventes flash.')}
          </p>
          <p>
            <b>{t('Suivi du marché, à la baisse seulement')}</b>
            {t(' : on vous prévient au plus une fois par semaine, et seulement si un vendeur passe moins cher.')}
          </p>
        </div>
      </details>
      <div className="mt16">
        <Bouton classe="primary" icone="package" vers={chemin('produits')}>
          {t('Voir mes produits')}
        </Bouton>
      </div>
      {!p.nouveau && (
        <div className="mt8">
          <Bouton classe="ghost" icone="copy" vers={chemin('dupliquer', { p: p.offreId })} style={{ height: '44px' }}>
            {t('Ajouter une autre variante')}
          </Bouton>
        </div>
      )}
      <div className="btns" style={{ marginTop: '6px' }}>
        <Bouton classe="secondary" icone="eye" vers={chemin('offre_detail', { p: p.offreId })} style={{ height: '44px' }}>
          {t('Voir l’offre')}
        </Bouton>
        <Bouton classe="secondary" icone="plus" vers={chemin('offre1')} style={{ height: '44px' }}>
          {t('Ajouter un autre produit')}
        </Bouton>
      </div>
    </Ecran>
  )
}
