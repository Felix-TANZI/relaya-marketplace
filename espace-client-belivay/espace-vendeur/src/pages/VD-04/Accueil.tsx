// Accueil vendeur (VD-04, onglet 1) — ÉCRAN DE RÉFÉRENCE de la méthode (METHODE.md) : repris du prototype à
// l'identique (balisage de route('accueil'), qPrep, qDispute, qReturn, shopState, a4Alert), branché sur la source.
// - Ce qu'il y a à faire, la plus urgente d'abord (GEN-07) : commandes à préparer, litiges, retours (domaine accueil,
//   qui compose commandes, litiges, retours et produits) ; « Cinq choses à faire » = le vrai nombre, en lettres.
// - Montants : « Vous gardez » est le montant figé au paiement (src/calculs/commission.ts dans la démonstration),
//   jamais écrit ; l'accès Préparation n'en voit aucun (bande retirée, consigne « Payable au retrait » sans montant).
// - Comptes à rebours vivants (heure du serveur), échéances en mots (demain à 05 h 30), FR et EN.
// - Gestes réels : « Fermer aujourd'hui » / « Rouvrir maintenant » (boutique), « C'est prêt » (preparation, puis la
//   remise), « Masquer » l'alerte avant un seuil (accueil) ; liens Rupture, Plus de temps, Détail, Répondre, Voir le
//   retour, Réapprovisionner, Voir mon palier.
// - États du prototype par l'adresse (scénarios de démonstration, pour la comparaison au pixel) : ?closed=1 (fermée),
//   ?alerte=1 (alerte avant un seuil), ?role=prep (accès Préparation, par la session) ; sans eux, l'écran suit les données.
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { mouvementLibre, useTirerPourActualiser } from '@client/composants/Animations'
import { useDes } from '@client/composants/ecran'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Activite } from './Activite'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Aujourdhui, ElementAFaire } from '../../donnees/domaines/accueil'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { creneau, duree, echeance, entre, heure, jourCourt, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles, useRouteOuverte, useSession } from '../../session'
import { jourDe } from '../../calculs/temps'
import { heuresOuvertes } from '../../calculs/ouverture'
import { nomPalier } from '../../composants/coque'
import type { Remise } from '../../donnees/domaines/remise'
import { Bouton, EtatBoutique, PiedConnexion, useFermer } from './boutique'
import { ErreurLecture, Squelette, geste, useReseau } from './commun'
import { CorpsCalme } from './AccueilCalme'
import { CorpsPremierJour } from './PremierJour'
import { CorpsSuspendu } from './Suspendu'

const EN_LETTRES = ['Zéro', 'Une', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf', 'Dix']

const LIEN_44 = { display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '0 6px' } as const

function LiensCommande({ ref_ }: { ref_: string }) {
  const { t } = usePreferences()
  return (
    <div className="links" style={{ margin: '2px 0 -10px', alignItems: 'center', gap: '2px' }}>
      <Link to={chemin('rupture', { ref: ref_ })} style={LIEN_44}>
        {t('Rupture')}
      </Link>
      <span aria-hidden="true" style={{ opacity: '.5' }}>
        {t('·')}
      </span>
      <Link to={chemin('delai', { ref: ref_ })} style={LIEN_44}>
        {t('Plus de temps')}
      </Link>
      <span aria-hidden="true" style={{ opacity: '.5' }}>
        {t('·')}
      </span>
      <Link to={chemin('commande', { ref: ref_ })} style={LIEN_44}>
        {t('Détail')}
      </Link>
    </div>
  )
}

function Gele({ libelle, montant }: { libelle: string; montant: number }) {
  const { t } = usePreferences()
  return (
    <div className="row" style={{ gap: '8px', marginTop: '10px', padding: '9px 12px', borderRadius: '12px', background: 'var(--sand-2)', border: '1px solid var(--line-2)' }}>
      <Icone nom="lock" taille={16} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
      <span className="grow t13 b7 c2">{t(libelle)}</span>
      <span className="b8 t15">{t(`${F(montant)} F`)}</span>
    </div>
  )
}

// « C'est prêt » : la commande passe chez le livreur (preparation.cestPret), le bouton passe au vert, puis la remise.
// Hors connexion : le geste entre dans la file avec son heure d'origine (Q-93) ; la commande le montre, sans quitter l'accueil.
function useCestPret(enLigne: boolean, enFile: Set<string>) {
  const naviguer = useNavigate()
  const [vert, setVert] = useState<string | null>(null)
  const pret = async (ref: string) => {
    if (!enLigne) {
      await geste(false, 'pret', ref, async () => undefined)
      jouer('interrupteur')
      return
    }
    const r = await source.preparation.cestPret(ref)
    if (r.ok) {
      setVert(ref)
      jouer('retrait')
    }
    const aller = () => naviguer(chemin('commande_prete', { ref }))
    if (r.ok && mouvementLibre()) setTimeout(aller, 450)
    else aller()
  }
  return { vert, pret, enFile }
}

function APreparer({ x, heros, maintenant, cestPret }: { x: Extract<ElementAFaire, { type: 'preparer' }>; heros: boolean; maintenant: number; cestPret: ReturnType<typeof useCestPret> }) {
  const { t, tf, langue } = usePreferences()
  const montants = useMontantsVisibles()
  // Temps restant en heures d'ouverture de la boutique (REFVD-R134) : le décompte s'arrête quand elle est fermée.
  const depassee = x.echeance <= maintenant
  const reste = depassee ? t('Délai dépassé') : tf('il reste {d}', { d: duree(heuresOuvertes(maintenant, x.echeance, x.calendrier), langue) })
  // Échéance d'un autre jour (commande en retard) : le jour est écrit avant l'heure.
  const avant = (jourDe(x.echeance) === jourDe(maintenant) ? '' : jourCourt(x.echeance, langue) + ' · ') + t(heure(x.echeance, langue))
  const variante = t(x.article.variante)
  const ligne2 = tf(x.payableAuRetrait ? '{etat} · ×{q} · colis {c} · validée à {h}' : '{etat} · ×{q} · colis {c} · payée à {h}', { etat: t(x.article.etat), q: x.quantite, c: x.colis, h: heure(x.payeeA, langue) })
  const pret = (classe: string) =>
    cestPret.enFile.has(x.ref) ? (
      <div className="row t14 b7" role="status" style={{ gap: '8px', minHeight: '48px', color: classe === 'white' ? '#fff' : 'var(--amber)' }}>
        <Icone nom="clock" taille={16} />
        <span>{t('« C’est prêt » partira au retour du réseau, avec son heure d’origine.')}</span>
      </div>
    ) : (
    <Bouton
      classe={classe + (cestPret.vert === x.ref ? ' vd-okb' : '')}
      icone="package-check"
      vers={chemin('commande_prete', { ref: x.ref })}
      onClick={(e) => {
        e.preventDefault()
        void cestPret.pret(x.ref)
      }}
    >
      {t('C’est prêt')}
    </Bouton>
  )
  if (heros)
    return (
      <div className="hero orange">
        <div className="otop">
          <span className="hk" style={{ color: '#fff' }}>
            {tf('À préparer · {ref}', { ref: x.ref })}
          </span>
          <span className="pill" style={{ background: 'var(--braise-2)', color: '#fff', borderColor: 'rgba(255,255,255,.35)' }}>
            <Icone nom="timer" taille={13} />
            {reste}
          </span>
        </div>
        <div className="art" style={{ marginTop: '12px' }}>
          <Vignette nom={x.article.dessin} taille={60} />
          <div className="grow">
            <div className="an" style={{ color: '#fff', fontSize: '21px' }}>
              {`${x.article.titre} · ${variante.toUpperCase()}`}
            </div>
            <div className="av" style={{ color: '#fff' }}>
              {ligne2}
            </div>
          </div>
        </div>
        <div className="row t14" style={{ gap: '8px', marginTop: '14px', color: '#fff' }}>
          <Icone nom="clock" taille={16} style={{ flexShrink: '0' }} />
          <span>
            {t('Prête avant ')}
            <b>{avant}</b>
          </span>
        </div>
        <div className="row t14" style={{ gap: '8px', marginTop: '6px', color: '#fff' }}>
          <Icone nom="truck" taille={16} style={{ flexShrink: '0' }} />
          <span>
            {t('Livreur chez vous ')}
            <b>{t(entre(x.livreur.creneau, langue))}</b>
          </span>
        </div>
        {montants && x.garde !== null && (
          <div className="row" style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '12px', background: 'var(--braise-2)', border: '1px solid rgba(255,255,255,.25)' }}>
            <span className="grow t14 b7">{t('Vous gardez')}</span>
            <span className="b8" style={{ fontSize: '22px', letterSpacing: '-.02em' }}>
              {t(`${F(x.garde)} F`)}
            </span>
          </div>
        )}
        <div style={{ marginTop: montants ? '12px' : '16px' }}>{pret('white')}</div>
        <LiensCommande ref_={x.ref} />
      </div>
    )
  return (
    <div className="card ord amber">
      <div className="otop">
        <span className="oref">{tf('À PRÉPARER · {ref}', { ref: x.ref })}</span>
        <span className="cd">
          <Icone nom="timer" taille={14} />
          {reste}
        </span>
      </div>
      <div className="art">
        <Vignette nom={x.article.dessin} taille={52} />
        <div className="grow">
          <div className="an">{`${x.article.titre} · ${variante}`}</div>
          <div className="av">{ligne2}</div>
        </div>
      </div>
      <div className="row t13 c2" style={{ gap: '8px', marginTop: '10px', lineHeight: '1.4' }}>
        <Icone nom="clock" taille={16} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
        <span>
          {t('Prête avant ')}
          <b>{avant}</b>
          {t(' · livreur ')}
          <b>{t(creneau(x.livreur.creneau, langue))}</b>
        </span>
      </div>
      {x.payableAuRetrait &&
        (montants && x.garde !== null ? (
          <div className="keep" style={{ display: 'block', background: 'var(--amber-soft)', borderColor: 'var(--amber-line)' }}>
            <div className="row" style={{ gap: '8px' }}>
              <Icone nom="hand-coins" taille={16} style={{ color: 'var(--amber)', flexShrink: '0' }} />
              <span className="grow kl" style={{ color: 'var(--amber)', fontSize: '13px' }}>
                {t('Vous garderez')}
              </span>
              <span className="kv2" style={{ color: 'var(--amber)', fontSize: '18px' }}>
                {t(`${F(x.garde)} F`)}
              </span>
            </div>
            <div className="t13 c2" style={{ marginTop: '6px', lineHeight: '1.45' }}>
              <b>{t('Payable au retrait.')}</b>
              {t(' Rien n’est encaissé : préparez-la pareil. Un refus ou un non-retrait ne vous coûte rien.')}
            </div>
          </div>
        ) : (
          <div className="row t13 c2" style={{ gap: '8px', marginTop: '10px', lineHeight: '1.4' }}>
            <Icone nom="hand-coins" taille={16} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
            <span>
              <b>{t('Payable au retrait :')}</b>
              {t(' préparez-la pareil.')}
            </span>
          </div>
        ))}
      <div className="mt12">{pret('soft')}</div>
      <LiensCommande ref_={x.ref} />
    </div>
  )
}

function Litige({ x, maintenant }: { x: Extract<ElementAFaire, { type: 'litige' }>; maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  return (
    <div className="card ord red">
      <div className="otop">
        <span className="oref">{tf('LITIGE · {ref}', { ref: x.ref })}</span>
        <span className="cd red">
          <Icone nom="hourglass" taille={14} />
          {tf('il reste {d}', { d: duree(x.echeance - maintenant, langue) })}
        </span>
      </div>
      <div className="art">
        <Vignette nom={x.article.dessin} taille={52} />
        <div className="grow">
          <div className="an">{x.article.titre}</div>
          <div className="av">{tf('Le client dit : « {motif} »', { motif: t(x.motif) })}</div>
        </div>
      </div>
      {x.gele !== null && <Gele libelle="Gelé jusqu’à la décision" montant={x.gele} />}
      <p className="t13 c2" style={{ margin: '10px 0 0', lineHeight: '1.45' }}>
        {t('Répondez avant ')}
        <b>{t(echeance(x.echeance, maintenant, langue))}</b>
        {t('. Sans réponse, BelivaY décide en partant de ce que dit le client.')}
      </p>
      <div className="mt12">
        <Bouton classe="danger" icone="scale" vers={chemin('litige', { ref: x.ref })}>
          {t('Répondre')}
        </Bouton>
      </div>
    </div>
  )
}

function Retour({ x, maintenant }: { x: Extract<ElementAFaire, { type: 'retour' }>; maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  const arrivee = new Date(x.arrivee.jour + 'T12:00:00+01:00').getTime()
  const demain = jourDe(maintenant + 24 * 3600 * 1000) === x.arrivee.jour
  const aujourdhui = jourDe(maintenant) === x.arrivee.jour
  const arrive = x.arrivee.jour < jourDe(maintenant) // déjà livré chez le vendeur : à inspecter
  return (
    <div className="card ord ink">
      <div className="otop">
        <span className="oref">{tf('RETOUR · {ref}', { ref: x.ref })}</span>
        <span className="cd" style={{ color: 'var(--ink-3)' }}>
          <Icone nom="truck" taille={14} />
          {arrive ? tf('arrivé {jour}', { jour: jourCourt(arrivee, langue) }) : aujourdhui ? t('arrive aujourd’hui') : demain ? t('arrive demain') : tf('arrive {jour}', { jour: jourCourt(arrivee, langue) })}
        </span>
      </div>
      <div className="art">
        <Vignette nom={x.article.dessin} taille={52} />
        <div className="grow">
          <div className="an">{`${x.article.titre} · ${t(x.article.variante)}`}</div>
          <div className="av">{tf('Motif : {motif}', { motif: t(x.motif) })}</div>
        </div>
      </div>
      {x.gele !== null && <Gele libelle="Gelé jusqu’à l’inspection" montant={x.gele} />}
      <p className="t13 c2" style={{ margin: '10px 0 0', lineHeight: '1.45' }}>
        {tf(arrive ? 'Livré chez vous {jour} {creneau}. Vous avez {n} h pour l’inspecter.' : 'Livré chez vous {jour} {creneau}. Vous aurez {n} h pour l’inspecter.', { jour: jourCourt(arrivee, langue), creneau: entre(x.arrivee.creneau, langue), n: x.inspectionH })}
      </p>
      <div className="mt12">
        <Bouton classe="secondary" icone="undo-2" vers={chemin('retours', { f: 'en_route' })} style={{ height: '44px' }}>
          {t('Voir le retour')}
        </Bouton>
      </div>
    </div>
  )
}

function Alerte({ a, compteurs, masquer }: { a: NonNullable<Aujourdhui['alerteScore']>; compteurs: Aujourdhui['compteurs']; masquer: () => void }) {
  const { t, tf, langue } = usePreferences()
  const g = (icone: string, texte: string) => (
    <div className="row t13 c2" style={{ gap: '10px', marginTop: '8px', lineHeight: '1.4', alignItems: 'flex-start' }}>
      <Icone nom={icone} taille={16} style={{ color: 'var(--amber)', flexShrink: '0', marginTop: '1px' }} />
      <span>{texte}</span>
    </div>
  )
  return (
    <div className="card" style={{ marginTop: '18px', border: '1.5px solid var(--amber-line)', background: 'var(--amber-soft)', boxShadow: 'none' }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0', background: 'var(--card)', color: 'var(--amber)' }}>
          <Icone nom="trending-up" taille={20} />
        </span>
        <div className="grow">
          <div className="b8 t15">{tf('Votre score approche de {seuil}', { seuil: a.seuil })}</div>
          <div className="t13 c2 mt4" style={{ lineHeight: '1.45' }}>
            {a.sens === 'montee'
              ? tf('Plus que {n} points pour passer {palier} et garder {gain} F de plus par {titre}.', { n: a.points, palier: nomPalier(a.palier, langue), gain: F(a.gainParVente), titre: a.titreReference.split(' ')[0] })
              : tf('Encore {n} points au-dessus du seuil {palier} : en dessous, vous garderiez {gain} F de moins par {titre}.', { n: a.points, palier: nomPalier(a.palier, langue), gain: F(a.gainParVente), titre: a.titreReference.split(' ')[0] })}
          </div>
        </div>
      </div>
      <div className="t12 b8 ca" style={{ marginTop: '14px', letterSpacing: '.06em', textTransform: 'uppercase' }}>
        {t('Pour y arriver')}
      </div>
      {compteurs.preparer > 0 && g('package-check', tf('Préparez à l’heure les {n} commandes du jour', { n: compteurs.preparer }))}
      {compteurs.litiges > 0 && g('scale', tf('Répondez aux {n} litiges avant l’échéance', { n: compteurs.litiges }))}
      {a.livreesCible > a.livrees && g('truck', tf('Encore {n} commandes livrées, pour arriver à {cible}', { n: a.livreesCible - a.livrees, cible: a.livreesCible }))}
      <div className="row mt12" style={{ gap: '4px' }}>
        <div className="grow">
          <Bouton classe="secondary" icone="award" vers={chemin('palier')} style={{ height: '44px' }}>
            {t('Voir mon palier')}
          </Bouton>
        </div>
        <a
          role="button"
          tabIndex={0}
          onClick={masquer}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), masquer())}
          className="t13 b7 c2"
          style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '0 12px', cursor: 'pointer' }}
        >
          {t('Masquer')}
        </a>
      </div>
    </div>
  )
}

// Ce qui attend le livreur : colis prêts, pas encore remis (le code de remise à portée de main), avec leur incident.
function EnAttenteDuLivreur({ liste, maintenant }: { liste: Remise[]; maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  if (!liste.length) return null
  return (
    <>
      <div className="sec">
        <h2>{t('En attente du livreur')}</h2>
      </div>
      <div className="card tight" style={{ marginTop: '0' }}>
        {liste.map((r) => (
          <Link key={r.ref} to={chemin('commande_prete', { ref: r.ref })} className="li">
            <span className={'ic ' + (r.erreur === 'bloque' ? 'red' : r.erreur === 'absent' ? 'amber' : 'green')}>
              <Icone nom={r.erreur === 'bloque' ? 'lock' : r.erreur === 'absent' ? 'clock-alert' : 'key-round'} taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {`${r.ref} · ${r.article.titre} · ${t(r.article.variante)}`}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {r.erreur === 'bloque'
                  ? t('Remise bloquée : ne remettez l’article à personne')
                  : r.erreur === 'absent'
                    ? t('Le livreur n’est pas venu : délai suspendu')
                    : r.livreur
                      ? tf('{nom} {jour} {creneau} · code de remise', { nom: r.livreur.nom, jour: echeance(r.livreur.debut, maintenant, langue).split(' ')[0], creneau: entre(r.livreur.creneau, langue) })
                      : t('Code de remise')}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}

// Ordinateur (dès 1024 px) : carte d'accueil « espace pro » en tête du tableau de bord : bonjour, boutique, palier,
// et quatre compteurs qui mènent chacun à leur liste (à préparer, litiges, retours ; à verser vendredi pour le
// propriétaire, Trust Score pour l'accès Préparation). Téléphone et tablette : inchangés (bonjour puis état).
function CarteAccueil({ d, bonjour }: { d: Aujourdhui; bonjour: string }) {
  const { t, tf, langue, soldeMasque } = usePreferences()
  const s = useSession()
  const montants = useMontantsVisibles()
  const argent = useLecture(() => (montants ? source.argent.resume() : Promise.resolve(null)), [montants]).donnees
  const b = s.boutique
  const c = d.compteurs
  // Employé : un raccourci vers une page qu'il n'a pas le droit d'ouvrir est masqué (DROIT_DE_ROUTE).
  const ouverte = useRouteOuverte()
  const tuile = (vers: string, icone: string, valeur: string, libelle: string, ton = '') =>
    ouverte(vers.split('?')[0].slice(1) || 'accueil') && (
      <Link to={vers} className={'vd4-cpt' + (ton ? ' ' + ton : '')}>
        <span className="vd4-cpt-i">
          <Icone nom={icone} taille={18} />
        </span>
        <b className="vd4-cpt-v">{valeur}</b>
        <span className="vd4-cpt-l">{libelle}</span>
      </Link>
    )
  return (
    <section className="hero night vd4-accueil" aria-label={t('Tableau de bord')}>
      <div className="vd4-accueil-g">
        <div className="hk">{bonjour}</div>
        <p className="vd4-accueil-t">{b?.nom ?? t("Espace vendeur")}</p>
        <p className="hs">{c.total === 0 ? t('Rien à faire pour l’instant : les nouvelles commandes arrivent ici.') : c.total === 1 ? t('Une chose à faire, la plus urgente d’abord.') : tf('{n} choses à faire, la plus urgente d’abord.', { n: c.total })}</p>
        {b && (
          <div className="meta">
            <span className="pill dk sm">{`${nomPalier(b.palier, langue)} · ${Math.round(b.trustScore)}`}</span>
            {montants && <span className="pill dk sm">{b.decouverte.active ? tf('{plan} · découverte', { plan: b.plan }) : b.plan}</span>}
          </div>
        )}
      </div>
      <div className="vd4-cpts">
        {tuile(chemin('commandes'), 'package-check', String(c.preparer), t('À préparer'), c.preparer ? 'or' : '')}
        {tuile(chemin('litiges'), 'scale', String(c.litiges), t('Litiges'), c.litiges ? 'rouge' : '')}
        {tuile(chemin('retours'), 'undo-2', String(c.retours), t('Retours'))}
        {montants
          ? tuile(chemin('argent'), 'wallet', argent ? (soldeMasque ? '•• •••' : `${F(argent.aVerser)} F`) : '—', t('À verser vendredi'))
          : b && tuile(chemin('palier'), 'award', String(Math.round(b.trustScore)), t('Trust Score'))}
      </div>
    </section>
  )
}

type Filtre = 'preparer' | 'litige' | 'retour' | null

export default function Accueil() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const montants = useMontantsVisibles()
  const maintenant = useHorloge()
  const [params] = useSearchParams()
  const ouverte = useRouteOuverte()
  const naviguer = useNavigate()
  const enLigne = useReseau()
  const ord = useDes('tab-l')
  const [filtre, setFiltre] = useState<Filtre>(null)
  const [alerteMasquee, setAlerteMasquee] = useState(false)
  const lecture = useLecture(
    () => Promise.all([source.accueil.aujourdhui(), source.remise.aRemettre(), source.accueil.file(), source.accueil.premierJour(), source.accueil.suspension(), source.accueil.calme()]),
    [s.membre?.role],
  )
  // Tirer pour actualiser (comme Mes commandes du client).
  useTirerPourActualiser(lecture.relire)
  const file = lecture.donnees?.[2]
  const enFile = new Set((file?.actions ?? []).filter((a) => a.type === 'pret' && a.etat === 'en_attente').map((a) => a.objet))
  const cestPret = useCestPret(enLigne, enFile)
  // Scénarios du prototype (démonstration) : ?closed=1, ?alerte=1. Sans eux, les données décident.
  const scenarioFerme = params.get('closed') === '1'
  const scenarioAlerte = params.get('alerte') === '1'
  const scenario = scenarioFerme || scenarioAlerte
  const fermerAujourdhui = useFermer(enLigne, (f) => {
    if (scenarioFerme && !f) naviguer(chemin('accueil'), { replace: true })
  })
  const prenom = s.membre?.prenom ?? ''
  const texteBonjour = montants ? tf('Bonjour {prenom} · {jour}', { prenom, jour: jourLong(maintenant, langue) }) : tf('Bonjour {prenom} · accès Préparation', { prenom })
  const bonjour = (
    <div className="pg-k" style={{ marginTop: '14px' }}>
      {texteBonjour}
    </div>
  )
  if (lecture.erreur)
    return (
      <Ecran route="accueil" parEtat={scenario}>
        {bonjour}
        <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />
      </Ecran>
    )
  if (!lecture.donnees)
    return (
      <Ecran route="accueil" parEtat={scenario}>
        {bonjour}
        <Squelette />
      </Ecran>
    )
  const [d, aRemettre, , premierJour, suspension, calme] = lecture.donnees
  // L'accueil laisse la place à la suspension (VD04-R07, SUS-01) et au premier jour tant qu'il n'est pas fini (ACC-14).
  if (suspension)
    return (
      <Ecran route="accueil">
        <CorpsSuspendu x={suspension} />
      </Ecran>
    )
  if (!premierJour.termine && !scenario)
    return (
      <Ecran route="accueil" calme>
        <CorpsPremierJour p={premierJour} />
        <PiedConnexion enLigne={enLigne} enAttente={d.enAttenteEnvoi} />
      </Ecran>
    )
  const fermee = scenarioFerme || s.boutique?.etat === 'fermee_aujourdhui'
  const fermetureEnFile = (file?.actions ?? []).some((a) => a.type === 'fermer' && a.etat === 'en_attente')
  const alerte = montants && !alerteMasquee && d.alerteScore && (!d.alerteScore.masquee || scenarioAlerte) ? d.alerteScore : null
  const preparer = d.aFaire.filter((x): x is Extract<ElementAFaire, { type: 'preparer' }> => x.type === 'preparer')
  const n = d.compteurs.total
  const masquer = async () => {
    // Hors connexion, la carte disparaît tout de suite ; le masquage part au retour du réseau (VD04-R06).
    if ((await geste(enLigne, 'masquer', 'alerte', () => source.accueil.masquerAlerte())) === 'en_file') setAlerteMasquee(true)
    if (scenarioAlerte) naviguer(chemin('accueil'), { replace: true })
  }
  const pastille = (f: Exclude<Filtre, null>, ton: string, texte: string) => (
    <button type="button" className={'pill vd4-filtre ' + ton} aria-pressed={filtre === f} onClick={() => setFiltre(filtre === f ? null : f)}>
      {texte}
    </button>
  )
  const visibles = d.aFaire.filter((x) => !filtre || x.type === filtre)
  const etat = <EtatBoutique fermee={fermee} aPreparer={d.compteurs.preparer} rouvrir={() => void fermerAujourdhui(false)} fermer={() => void fermerAujourdhui(true)} enFile={fermetureEnFile} />
  return (
    <Ecran route="accueil" parEtat={scenario}>
      {/* Ordinateur (dès 1024 px) : tableau de bord en cartes, ce qu'il y a à faire à gauche, le reste à droite ;
          téléphone et tablette : une seule colonne, dans cet ordre (DISPOSITION-ECRANS.md). */}
      <div className="vd4-tdb">
        {ord && <CarteAccueil d={d} bonjour={texteBonjour} />}
        <div className="vd4-tdb-a">
          {!ord && bonjour}
          {!ord && etat}
          {n === 0 && !scenario ? (
            <CorpsCalme c={calme} />
          ) : (
            <>
              <div className="pg" style={{ paddingTop: '18px' }}>
                <h1 className="pg-t">{n === 0 ? t('Rien à faire pour l’instant') : n === 1 ? t('Une chose à faire') : n <= 10 ? t(`${EN_LETTRES[n]} choses à faire`) : tf('{n} choses à faire', { n })}</h1>
                <p className="pg-s">{n === 0 ? t('Les nouvelles commandes arrivent ici, la plus urgente d’abord.') : t('La plus urgente d’abord')}</p>
              </div>
              {n > 0 && (
                <div className="meta" style={{ marginTop: '10px' }} role="group" aria-label={t('Filtrer ce qu’il y a à faire')}>
                  {d.compteurs.preparer > 0 && pastille('preparer', 'or', tf('{n} à préparer', { n: d.compteurs.preparer }))}
                  {d.compteurs.litiges > 0 && pastille('litige', 'red', tf(d.compteurs.litiges > 1 ? '{n} litiges' : '{n} litige', { n: d.compteurs.litiges }))}
                  {d.compteurs.retours > 0 && pastille('retour', 'ink', tf(d.compteurs.retours > 1 ? '{n} retours' : '{n} retour', { n: d.compteurs.retours }))}
                </div>
              )}
              {visibles.map((x) =>
                x.type === 'preparer' ? (
                  <APreparer key={x.ref} x={x} heros={x === preparer[0] && !filtre} maintenant={maintenant} cestPret={cestPret} />
                ) : x.type === 'litige' ? (
                  <Litige key={x.ref} x={x} maintenant={maintenant} />
                ) : (
                  <Retour key={x.ref} x={x} maintenant={maintenant} />
                ),
              )}
            </>
          )}
        </div>
        <div className="vd4-tdb-b">
          {ord && etat}
          <EnAttenteDuLivreur liste={aRemettre} maintenant={maintenant} />
          {alerte && <Alerte a={alerte} compteurs={d.compteurs} masquer={() => void masquer()} />}
          {ouverte('stock') && d.stockBas.map((p) => (
            <div key={p.offreId} className="card flat tight" style={{ marginTop: '18px' }}>
              <Link to={chemin('stock', { p: p.offreId })} className="li">
                <Vignette nom={p.dessin} taille={40} />
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {tf('Stock bas · {titre}', { titre: p.titre })}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {tf(p.stock > 1 ? '{n} restants, seuil réglé à {s}' : '{n} restant, seuil réglé à {s}', { n: p.stock, s: p.seuil })}
                    <b className="cor" style={{ display: 'block', marginTop: '2px' }}>
                      {t('Réapprovisionner')}
                    </b>
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
            </div>
          ))}
          {montants && (
            // DP-58 : l'entrée « Ajouter un produit » de l'accueil, vers la page « Nouveau produit » (recherche d'abord).
            <div className="card flat tight" style={{ marginTop: '18px' }}>
              <Link to={chemin('offre1')} className="li">
                <span className="ei" style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--or-soft)', color: 'var(--or-txt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icone nom="plus" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {t('Ajouter un produit')}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {t('Cherchez-le d’abord : un geste s’il est déjà au catalogue')}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
            </div>
          )}
          {!montants && s.proprietaire && (
            <div className="hint-l">
              <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{tf('Les montants et les versements sont réservés à {nom}, propriétaire.', { nom: `${s.proprietaire.prenom} ${s.proprietaire.nom}` })}</span>
            </div>
          )}
        </div>
      </div>
      <Activite />
      <PiedConnexion enLigne={enLigne} enAttente={d.enAttenteEnvoi} />
    </Ecran>
  )
}
