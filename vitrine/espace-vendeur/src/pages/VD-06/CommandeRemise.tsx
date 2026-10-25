// Remis au livreur (VD-06, route « commande_remise ») — balisage du prototype, branché sur la source et rendu logique :
// - s'ouvre seul quand le livreur a saisi le code (handover.completed) ; « <Livreur> a pris l'article <jour> à <heure> » ;
// - carte clé à liseré vert : « Vous êtes couvert » (REM-04), « Vous gardez » figé au paiement (VD06-R11 ; propriétaire
//   seulement), « Versés sans frais le vendredi qui suit la libération » hors du repli, frise « Comment ça marche »
//   calculée (palier et délai de libération, numéro de versement masqué : REM-07, VD06-R13) ;
// - « Deux photos au dossier », horodatées, légendes SOUS l'image (VD06-R14), lieu de la prise ; un toucher les agrandit ;
// - « Terminer » (vers Commandes) et « Voir le reçu » (propriétaire) ; ajouts : la remise suivante pour le même
//   livreur, le journal de la commande ; coche dessinée et gerbe à l'arrivée (.blv-succes du client).
// - Pas encore remise : l'écran le dit et renvoie à la remise ; accès Préparation : aucun montant, pas de reçu.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { PhotoRemise } from '../../donnees/domaines/remise'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { nomPalier } from '../../composants/coque'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles, useSession } from '../../session'
import { ErreurLecture, Squelette } from '../VD-04/commun'
import { Image, jourRelatif } from './commun'

const LEGENDES: Record<PhotoRemise['type'], string> = { decouvert: 'À découvert', scelle: 'Colis scellé' }

export default function CommandeRemise() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const montants = useMontantsVisibles()
  const maintenant = useHorloge()
  const [params] = useSearchParams()
  const refParam = params.get('ref')
  const lecture = useLecture(async () => {
    // Sans référence : la dernière remise, sinon la prochaine (commande prête, puis à préparer).
    const toutes = refParam ? [] : await source.remise.toutes()
    const ref = refParam ?? (toutes.find((x) => x.remiseA) ?? toutes.find((x) => x.etape === 'prete') ?? toutes.filter((x) => x.etape === 'a_preparer').sort((a, b) => (a.echeance ?? 0) - (b.echeance ?? 0))[0])?.ref ?? null
    return { r: ref ? await source.remise.remise(ref) : null }
  }, [refParam, s.membre?.role])
  const [photo, setPhoto] = useState<PhotoRemise | null>(null)
  const feuille = useFeuille('photo')
  const r = lecture.donnees?.r ?? null
  const titre = tf('Remis · {ref}', { ref: r?.ref ?? refParam ?? '' })
  if (lecture.erreur)
    return (
      <Ecran route="commande_remise" titre={titre}>
        <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />
      </Ecran>
    )
  if (!lecture.donnees)
    return (
      <Ecran route="commande_remise" titre={titre}>
        <Squelette cartes={2} />
      </Ecran>
    )
  if (!r || r.etape !== 'remise' || r.remiseA === null)
    return (
      <Ecran route="commande_remise" titre={titre}>
        <div className="empty" style={{ marginTop: '24px' }}>
          <div className="ei">
            <Icone nom="hourglass" taille={26} />
          </div>
          <h3>{r ? t('Pas encore remise au livreur') : t('Aucune remise pour l’instant')}</h3>
          <p>{t('L’écran « Remis » s’ouvre tout seul dès que le livreur a saisi votre code.')}</p>
          {r && (r.etape === 'prete' || r.etape === 'a_preparer') && (
            <div style={{ maxWidth: '260px', margin: '12px auto 0' }}>
              <Link to={chemin('commande_prete', { ref: r.ref })} className="btn secondary" style={{ height: '44px' }}>
                <Icone nom="key-round" taille={18} />
                <span>{t('Code de remise')}</span>
              </Link>
            </div>
          )}
        </div>
      </Ecran>
    )

  const nom = r.livreur?.nom ?? t('Le livreur')
  const lieu = r.photos[0]?.lieu
  const ouvrir = (p: PhotoRemise) => {
    setPhoto(p)
    feuille.ouvrir()
  }
  return (
    <Ecran
      route="commande_remise"
      titre={titre}
      fixes={
        <Feuille ouverte={feuille.ouverte && !!photo} fermer={feuille.fermer} titre={photo ? t(LEGENDES[photo.type]) : ''}>
          {photo && (
            <>
              <div className="vd6-grande">
                <Image src={photo.image} alt={t(LEGENDES[photo.type])} />
              </div>
              <div className="t13 b7 c2 mt8">{`${t(LEGENDES[photo.type])} · ${heure(photo.a, langue)} · ${photo.lieu}`}</div>
              <p className="t12 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
                {t('Horodatée et géolocalisée par l’application du livreur : une preuve en cas de litige.')}
              </p>
            </>
          )}
        </Feuille>
      }
    >
      <div className="center" style={{ paddingTop: '22px' }}>
        <div className="blv-succes" style={{ width: '76px', height: '76px', borderRadius: '50%', margin: '0 auto', background: 'var(--green-soft)', border: '1.5px solid var(--green-line)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icone nom="package-check" taille={38} />
        </div>
        <h1 className="pg-t" style={{ marginTop: '14px' }}>
          {t('Remis au livreur')}
        </h1>
        <p className="pg-s">{tf('{nom} a pris l’article {jour} à {h}.', { nom, jour: jourRelatif(r.remiseA, maintenant, langue), h: heure(r.remiseA, langue) })}</p>
      </div>
      <div className="card" style={{ border: '1.5px solid var(--green-line)' }}>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <span className="li" style={{ padding: '0', border: '0', minHeight: '0' }}>
            <span className="ic green">
              <Icone nom="shield-check" taille={20} />
            </span>
          </span>
          <div className="grow">
            <div className="b8 t17">{t('Vous êtes couvert')}</div>
            <div className="t14 c2 mt4" style={{ lineHeight: '1.45' }}>
              {t('L’entreprise de livraison répond du colis : perdu ou abîmé, il vous est payé.')}
            </div>
          </div>
        </div>
        {montants && r.garde !== null && (
          <div className="keep">
            <span className="kl">{t('Vous gardez')}</span>
            <span className="kv2">{t(`${F(r.garde)} F`)}</span>
          </div>
        )}
        {montants && (
          <div className="hint-l">
            <Icone nom="wallet" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Versés le vendredi qui suit la libération (1 % de frais Mobile Money)')}</span>
          </div>
        )}
        <details className="more flat">
          <summary>
            <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Comment ça marche')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            <div className="tl" style={{ marginTop: '0' }}>
              <div className="ti done">
                <div className="tt">{t('Remis au livreur')}</div>
                <div className="td">{t('C’est fait')}</div>
              </div>
              <div className="ti">
                <div className="tt">{t('Retiré par le client')}</div>
                <div className="td">{t('Au relais ou à domicile ; vous n’avez rien à faire')}</div>
              </div>
              <div className="ti">
                <div className="tt">{t('Confirmé par le client')}</div>
                <div className="td">{tf('« Tout est en ordre », ou {n} jours sans problème signalé', { n: r.suite?.confirmationJours ?? 7 })}</div>
              </div>
              {r.suite && (
                <>
                  <div className="ti">
                    <div className="tt">{tf('Se libère {n} jours plus tard', { n: r.suite.liberationJours })}</div>
                    <div className="td">{tf('Délai du palier {p}, votre niveau actuel', { p: nomPalier(r.suite.palier, langue) })}</div>
                  </div>
                  <div className="ti">
                    <div className="tt">{t('Versé le vendredi suivant')}</div>
                    <div className="td">{tf('Vers {numero}', { numero: r.suite.numero })}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </details>
      </div>
      {r.photos.length > 0 && (
        <div className="card">
          <div className="otop">
            <h3>{t('Deux photos au dossier')}</h3>
            <span className="pill green sm">
              <Icone nom="circle-check" taille={13} />
              {t('Horodatées')}
            </span>
          </div>
          <div className="split2 mt12">
            {r.photos.map((p) => (
              <div key={p.type}>
                <button type="button" className="vd6-photo" onClick={() => ouvrir(p)} aria-label={tf('Agrandir : {p}', { p: t(LEGENDES[p.type]) })}>
                  <div className="photo" style={{ aspectRatio: '4/3' }}>
                    <Image src={p.image} />
                  </div>
                </button>
                <div className="t12 b7 c2 mt6">{`${t(LEGENDES[p.type])} · ${heure(p.a, langue)}`}</div>
              </div>
            ))}
          </div>
          {lieu && (
            <p className="t12 c3" style={{ margin: '10px 0 0', lineHeight: '1.45' }}>
              {tf('Prises par le livreur à {lieu}, versées au dossier de la commande.', { lieu })}
            </p>
          )}
        </div>
      )}
      {r.autresPourCeLivreur.length > 0 && (
        <div className="card tight">
          <Link to={chemin('commande_prete', { ref: r.autresPourCeLivreur[0] })} className="li">
            <span className="ic or">
              <Icone nom="package-check" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {tf('Encore un colis pour {nom} : {ref}', { nom, ref: r.autresPourCeLivreur[0] })}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Montrez-lui son code avant qu’il reparte')}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        </div>
      )}
      <div className="mt16">
        <Link to={chemin('commandes')} className="btn primary">
          <Icone nom="check" taille={18} />
          <span>{t('Terminer')}</span>
        </Link>
      </div>
      <div className="links">
        {montants && (
          <Link to={chemin('recu', { ref: r.ref })} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '44px' }}>
            <Icone nom="receipt" taille={17} />
            {t('Voir le reçu')}
          </Link>
        )}
        <Link to={chemin('journal', { ref: r.ref })} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '44px' }}>
          <Icone nom="history" taille={17} />
          {t('Journal')}
        </Link>
      </div>
    </Ecran>
  )
}
