// Se faire voir (VD-10, fig. 9) : repris du prototype (route('visibilite'), feuille ?achat=1), refait selon DP-14 et
// Q-32 : plus aucune visibilité payante ni bande « Sponsorisé » ; restent les récompenses au mérite (P-3 : l'offre la
// moins chère livrée de sa zone 7 jours de suite ⇒ une vitrine de quartier de 7 jours et une vente flash par mois).
// API : GET /rewards, POST /rewards/{id}/use, POST /flash-sales (domaine plans).
// - Carte nuit « Offert ce mois » seulement quand une récompense est gagnée (VD10-R41) ; un seul bouton plein
//   (« Mettre l'ITEL AC52 en vitrine », VIS-04) ; la feuille ?achat=1 confirme la vitrine, sans paiement.
// - Vente flash (OFR-05, FF-FLASH) : vraie saisie de la remise (10 % au moins ; au-delà de 50 %, relue sous 24 h),
//   créneau et zones choisis par BelivaY ; masquée si l'interrupteur FF-FLASH est fermé.
// - Garde-fous (VIS-02, VD10-R42) : sous 50 de Trust Score ou offre en rupture, rien ne s'active ; la raison et le
//   geste pour y remédier sont dits en une ligne.
// - Ajouts : jauge de la série en cours (jours de suite au meilleur prix livré) et le geste pour la reprendre ;
//   vitrine en cours avec sa fin ; vente flash programmée ou en vérification.
// - Accès Préparation : réservé au propriétaire (VD-D12.A03).
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Recompense, Visibilite as DonneesVisibilite } from '../../donnees/domaines/plans'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { Attente, Bouton, dateEtHeure, Feuille, HorsLigne, LigneFeuille, Plus, useApparu, useEnLigne, useToast } from './commun'
import { duree } from '../../i18n/temps'

function Blocage({ v }: { v: DonneesVisibilite }) {
  const { t, tf } = usePreferences()
  if (!v.bloque) return null
  const score = v.bloque === 'score_trop_bas'
  return (
    <div className="card" style={{ border: '1.5px solid var(--amber-line)', background: 'var(--amber-soft)', boxShadow: 'none' }} role="status">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <Icone nom="triangle-alert" taille={22} style={{ color: 'var(--amber)', flexShrink: '0' }} />
        <div className="grow t13 c2" style={{ lineHeight: '1.45' }}>
          <b>{score ? tf('Sous {n} de Trust Score, aucune visibilité.', { n: v.scoreMin }) : t('Votre offre est en rupture : rien ne s’active sans stock.')}</b> {score ? t('Remontez votre score pour utiliser vos récompenses.') : t('Réapprovisionnez pour utiliser vos récompenses.')}
        </div>
      </div>
      <div className="mt12">
        <Bouton classe="secondary" icone={score ? 'award' : 'package'} vers={score ? chemin('palier') : chemin('offre_detail', { p: v.recompenses[0]?.offreId })} style={{ height: '44px' }}>
          {score ? t('Voir mon palier') : t('Réapprovisionner')}
        </Bouton>
      </div>
    </div>
  )
}

function Vitrine({ r, v, ouvrir }: { r: Recompense; v: DonneesVisibilite; ouvrir: () => void }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge()
  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="li" style={{ padding: '0', border: '0', minHeight: '0' }}>
          <span className="ic or">
            <Icone nom="store" taille={20} />
          </span>
        </span>
        <div className="grow">
          <div className="row">
            <span className="grow b8 t15">{tf('{titre} · {n} jours', { titre: t(r.titre), n: r.jours ?? 0 })}</span>
            <span className="b8 t15 cg">{t('Offerte')}</span>
          </div>
          <div className="t13 c3 mt4" style={{ lineHeight: '1.45' }}>
            {t('Montrée aux clients dont le relais est dans votre zone. Chaque vente remplit une tournée déjà prévue.')}
          </div>
        </div>
      </div>
      {r.enCoursJusqua ? (
        <div className="note green">
          <Icone nom="timer" taille={18} />
          <div>
            <b>{tf('{titre} en vitrine', { titre: r.offreTitre })}</b> {tf('jusqu’à {quand} · il reste {d}', { quand: dateEtHeure(r.enCoursJusqua, langue), d: duree(r.enCoursJusqua - maintenant, langue) })}
          </div>
        </div>
      ) : !r.disponible ? (
        <p className="t13 c3 mt8">{t('Déjà utilisée ce mois. La prochaine se gagne au meilleur prix livré.')}</p>
      ) : (
        <div className="mt12">
          <Bouton classe="primary" icone="store" onClick={ouvrir} desactive={!!v.bloque} raison={v.bloque ? t('Rien ne s’active sous 50 de Trust Score ou sans stock.') : undefined}>
            {tf('Mettre l’{titre} en vitrine', { titre: r.offreTitre })}
          </Bouton>
        </div>
      )}
    </div>
  )
}

function Flash({ r, v, ouvrir }: { r: Recompense; v: DonneesVisibilite; ouvrir: () => void }) {
  const { t, tf } = usePreferences()
  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="li" style={{ padding: '0', border: '0', minHeight: '0' }}>
          <span className="ic or">
            <Icone nom="zap" taille={20} />
          </span>
        </span>
        <div className="grow">
          <div className="row">
            <span className="grow b8 t15">{t('Vente flash')}</span>
            <span className="b8 t15 cg">{t('Offerte')}</span>
          </div>
          <div className="t13 c3 mt4" style={{ lineHeight: '1.45' }}>
            {tf('Remise réelle de {n} % au moins, sur votre {titre}. Créneau et zones choisis par BelivaY pour remplir les tournées.', { n: v.flash.remiseMin, titre: r.offreTitre })}
          </div>
        </div>
      </div>
      {r.venteFlash ? (
        <div className={'note ' + (r.venteFlash.etat === 'programmee' ? 'green' : 'ink')}>
          <Icone nom={r.venteFlash.etat === 'programmee' ? 'circle-check' : 'hourglass'} taille={18} />
          <div>
            {r.venteFlash.etat === 'programmee' ? tf('Vente flash à −{n} % programmée : BelivaY vous dit le créneau la veille.', { n: r.venteFlash.remisePourCent }) : tf('Remise de {n} % en vérification : la console la relit sous 24 h.', { n: r.venteFlash.remisePourCent })}{' '}
            {/* Une seule notion côté vendeur : la vente offerte se suit avec les autres, dans Promotions. */}
            <Link to={chemin('promotions')} className="b7 cor">
              {t('La suivre dans Promotions')}
            </Link>
          </div>
        </div>
      ) : !r.disponible ? (
        <p className="t13 c3 mt8">{t('Déjà utilisée ce mois.')}</p>
      ) : (
        <div className="mt12">
          <Bouton classe="secondary" icone="zap" onClick={ouvrir} desactive={!!v.bloque} raison={v.bloque ? t('Rien ne s’active sous 50 de Trust Score ou sans stock.') : undefined} style={{ height: '44px' }}>
            {t('Programmer la vente flash')}
          </Bouton>
        </div>
      )}
    </div>
  )
}

function FeuilleVitrine({ r, fermer, fait }: { r: Recompense; fermer: () => void; fait: (texte: string) => void }) {
  const { t, tf, langue } = usePreferences()
  const enLigne = useEnLigne()
  const [erreur, setErreur] = useState<string | null>(null)
  const activer = async () => {
    const x = await source.plans.utiliserRecompense(r.id)
    if (x.ok) fait(tf('{titre} en vitrine jusqu’à {quand}.', { titre: r.offreTitre, quand: dateEtHeure(x.jusqua, langue) }))
    else {
      setErreur(t(x.raison === 'deja_utilisee' ? 'Cette récompense est déjà utilisée ce mois.' : x.raison === 'rupture' ? 'Votre offre est en rupture : rien ne s’active sans stock.' : 'Sous 50 de Trust Score, aucune visibilité.'))
      jouer('erreur')
    }
  }
  return (
    <Feuille titre={tf('Mettre l’{titre} en vitrine', { titre: r.offreTitre })} fermer={fermer}>
      <div className="mt8">
        <LigneFeuille icone="store" ton="or">
          {tf('{n} jours dans la vitrine de quartier : montrée aux clients dont le relais est dans votre zone.', { n: r.jours ?? 0 })}
        </LigneFeuille>
        <LigneFeuille icone="gift" ton="green">
          <b style={{ color: 'var(--ink)' }}>{t('Rien à payer : c’est votre récompense.')}</b>
        </LigneFeuille>
        <LigneFeuille icone="timer">{t('Elle commence tout de suite et s’arrête seule.')}</LigneFeuille>
      </div>
      {erreur && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{erreur}</div>
        </div>
      )}
      <div className="mt14">
        <Bouton classe="primary" icone="store" onClick={() => void activer()} desactive={!enLigne} raison={t('Pas de connexion : réessayez dans un moment.')}>
          {t('Mettre en vitrine')}
        </Bouton>
        {!enLigne && <p className="t13 cr mt6">{t('Pas de connexion : réessayez dans un moment.')}</p>}
      </div>
      <div className="mt8">
        <Bouton classe="ghost" onClick={fermer}>
          {t('Annuler')}
        </Bouton>
      </div>
    </Feuille>
  )
}

function FeuilleFlash({ r, v, fermer, fait }: { r: Recompense; v: DonneesVisibilite; fermer: () => void; fait: (texte: string) => void }) {
  const { t, tf } = usePreferences()
  const enLigne = useEnLigne()
  const [remise, setRemise] = useState(String(v.flash.remiseMin))
  const [erreur, setErreur] = useState<string | null>(null)
  const n = Number(remise)
  const valide = /^\d{1,2}$/.test(remise) && n >= v.flash.remiseMin
  const programmer = async () => {
    if (!valide) {
      setErreur(tf('{n} % au moins.', { n: v.flash.remiseMin }))
      jouer('erreur')
      return
    }
    const x = await source.plans.programmerVenteFlash(r.id, n)
    if (x.ok) fait(x.etat === 'programmee' ? tf('Vente flash à −{n} % programmée.', { n }) : tf('Remise de {n} % envoyée en vérification.', { n }))
    else {
      setErreur(x.raison === 'remise_trop_basse' ? tf('{n} % au moins.', { n: v.flash.remiseMin }) : x.raison === 'remise_trop_haute' ? t('Remise trop forte.') : t('Cette vente flash ne peut pas être programmée.'))
      jouer('erreur')
    }
  }
  return (
    <Feuille titre={t('Programmer la vente flash')} fermer={fermer}>
      <div className="fld">
        <label htmlFor="vd10-remise">{tf('Remise sur votre {titre}', { titre: r.offreTitre })}</label>
        <div className={'inp' + (erreur ? ' err' : valide ? ' ok' : '')}>
          <input id="vd10-remise" inputMode="numeric" value={remise} maxLength={2} aria-invalid={!!erreur} onChange={(e) => (setRemise(e.target.value.replace(/\D/g, '')), setErreur(null))} />
          <span className="suf">{t('%')}</span>
        </div>
        {erreur ? (
          <div className="vd10-err" role="alert">
            {erreur}
          </div>
        ) : (
          <p className="t12 c3 mt6">{n > v.flash.relueAuDela ? tf('Au-delà de {n} %, la remise est relue par BelivaY sous 24 h.', { n: v.flash.relueAuDela }) : tf('{n} % au moins. Une vraie remise : le prix barré est celui que vous pratiquez.', { n: v.flash.remiseMin })}</p>
        )}
      </div>
      <div className="mt8">
        <LigneFeuille icone="clock">{tf('Pendant {n} h au plus, au créneau choisi par BelivaY pour remplir une tournée.', { n: v.flash.dureeMaxHeures })}</LigneFeuille>
        <LigneFeuille icone="hand-coins">{t('Ce que vous gardez se calcule sur le prix remisé.')}</LigneFeuille>
      </div>
      <div className="mt14">
        <Bouton classe="primary" icone="zap" onClick={() => void programmer()} desactive={!enLigne} raison={t('Pas de connexion : réessayez dans un moment.')}>
          {t('Programmer')}
        </Bouton>
      </div>
      <div className="mt8">
        <Bouton classe="ghost" onClick={fermer}>
          {t('Annuler')}
        </Bouton>
      </div>
    </Feuille>
  )
}

function Contenu({ v }: { v: DonneesVisibilite }) {
  const { t, tf } = usePreferences()
  const enLigne = useEnLigne()
  const apparu = useApparu()
  const [p, setP] = useSearchParams()
  const naviguer = useNavigate()
  const lieu = useLocation()
  const [toast, dire] = useToast()
  useEffect(() => {
    const st = lieu.state as { toast?: string } | null
    if (!st?.toast) return
    dire(st.toast, true)
    window.history.replaceState({ ...window.history.state, usr: null }, '')
  }, [lieu.key]) // eslint-disable-line react-hooks/exhaustive-deps
  const vitrine = v.recompenses.find((r) => r.type === 'vitrine') ?? null
  const flash = v.recompenses.find((r) => r.type === 'flash') ?? null
  const feuille = p.get('achat') === '1' && vitrine?.disponible ? 'vitrine' : p.get('flash') === '1' && flash?.disponible ? 'flash' : null
  const fermer = () => setP({}, { replace: true })
  const fait = (texte: string) => {
    jouer('paiement')
    naviguer(chemin('visibilite'), { replace: true, state: { toast: texte } })
  }
  const offertes = v.recompenses.filter((r) => r.disponible)
  return (
    <Ecran
      route="visibilite"
      parEtat={feuille === 'vitrine'}
      fixes={feuille === 'vitrine' && vitrine ? <FeuilleVitrine r={vitrine} fermer={fermer} fait={fait} /> : feuille === 'flash' && flash ? <FeuilleFlash r={flash} v={v} fermer={fermer} fait={fait} /> : undefined}
    >
      <div className="pg">
        <h1 className="pg-t">{t('Se faire voir')}</h1>
        <p className="pg-s">{t('Des récompenses au mérite pour montrer vos offres. Jamais payées, jamais dans la recherche.')}</p>
      </div>
      {!enLigne && <HorsLigne />}
      {v.merite.gagne && offertes.length > 0 && (
        <div className="hero night">
          <div className="otop">
            <span className="hk">{t('Offert ce mois')}</span>
            <Icone nom="gift" taille={20} style={{ color: 'var(--gold-l)' }} />
          </div>
          <div className="b8 mt8" style={{ fontSize: '20px', lineHeight: '1.3' }}>
            {offertes.length === 2 ? t('1 vente flash et 1 vitrine de quartier') : offertes[0].type === 'vitrine' ? t('1 vitrine de quartier') : t('1 vente flash')}
          </div>
          <div className="hs">{tf('Votre récompense : votre {titre} a été l’offre la moins chère livrée de votre zone, {quand}.', { titre: v.merite.offreTitre, quand: t(v.merite.raison) })}</div>
        </div>
      )}
      <Blocage v={v} />
      {vitrine && <Vitrine r={vitrine} v={v} ouvrir={() => setP({ achat: '1' })} />}
      {flash && v.flash.ouvert && <Flash r={flash} v={v} ouvrir={() => setP({ flash: '1' })} />}
      <div className="card">
        <h3>{t('La prochaine récompense')}</h3>
        <p className="t13 c3" style={{ margin: '6px 0 4px', lineHeight: '1.45' }}>
          {tf('Soyez l’offre la moins chère livrée de votre zone {n} jours de suite : une vitrine de 7 jours et une vente flash, le mois suivant.', { n: v.merite.joursRequis })}
        </p>
        <div className="bar mt8" role="progressbar" aria-valuemin={0} aria-valuemax={v.merite.joursRequis} aria-valuenow={v.merite.joursDeSuite} aria-label={t('La prochaine récompense')}>
          <i style={{ width: `${apparu ? Math.max(2, (v.merite.joursDeSuite / v.merite.joursRequis) * 100) : 0}%` }}></i>
        </div>
        <div className="row t13 b7 mt8">
          <span className="grow">{tf('{n} jours sur {m}', { n: v.merite.joursDeSuite, m: v.merite.joursRequis })}</span>
        </div>
        {v.merite.joursDeSuite === 0 && (
          <div className="mt8">
            <Bouton classe="secondary" icone="tag" vers={chemin('offre_detail', { p: vitrine?.offreId ?? flash?.offreId })} style={{ height: '44px' }}>
              {tf('Un vendeur est moins cher : voir mon {titre}', { titre: v.merite.offreTitre })}
            </Bouton>
          </div>
        )}
      </div>
      <Plus titre={t('Comment ça marche')}>
        <p>
          <b>{t('Vitrine de quartier :')}</b>
          {t(' chaque vente remplit une tournée déjà prévue.')}
        </p>
        <p>
          <b>{t('Vente flash :')}</b>
          {t(' créneaux et zones choisis par BelivaY pour remplir les tournées ; une vraie remise, jamais un prix barré inventé.')}
        </p>
        <p>
          <b>{t('Non utilisée :')}</b>
          {t(' une récompense ne passe pas au mois suivant.')}
        </p>
        <p className="b8" style={{ marginTop: '14px' }}>
          {t('Les garde-fous')}
        </p>
        <p>{t('La recherche ne se vend pas : aucun contenu payé dans les résultats, ni dans l’attribution d’une commande.')}</p>
        <p>{tf('Pas de visibilité sans stock, ni sous {n} de Trust Score.', { n: v.scoreMin })}</p>
        <p>{t('Aucune place ne s’achète : les vitrines se gagnent au meilleur prix livré.')}</p>
        <p>{t('10 à 20 % des emplacements sont réservés gratuitement aux nouveaux vendeurs.')}</p>
      </Plus>
      {toast}
    </Ecran>
  )
}

export default function Visibilite() {
  const lecture = useLecture(() => source.plans.visibilite(), [])
  return <Attente route="visibilite" lecture={lecture}>{(v) => <Contenu v={v} />}</Attente>
}
