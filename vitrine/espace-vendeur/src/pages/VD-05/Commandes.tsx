// Commandes reçues (VD-05, onglet 2) : repris du prototype (balisage de route('commandes') : phrase d'état, menu ⋮,
// quatre filtres avec leur nombre, cartes à préparer, en cours, terminées, problèmes, règle d'anonymat), branché sur
// la source (domaine commandes : liste et compteurs de la même requête, CMD-02 ; jamais un chiffre faux).
// - Règles : CMD-01…10, VD05-R01…R08, PRE-03, OFF-01, REFVD-R127…R135 ; la plus urgente d'abord, un seul bouton plein
//   (CMD-08) ; « il reste » en heures d'ouverture de la boutique (REFVD-R134), « Dépassement dans 18 min » (REFCL-R043).
// - Accès Préparation : aucun montant (prix, gardé, gelé), aucune facture ; une carte terminée ouvre la commande, pas
//   le reçu (ARG-07). Anonymat : rien du client (CMD-06).
// - Ajouts : recherche (référence, article, variante), filtres de l'argent sur « Terminées », annulées gardées avec
//   leur motif (Q-73), commandes prêtes en attente du livreur dans « En cours » (vers la remise et son code), tirer pour
//   actualiser, menu ⋮ en feuille (exporter en CSV, copier le résumé, factures, aide), hors connexion (liste gardée,
//   « C'est prêt » en file avec son heure), avis après un geste (rupture, nouvelle heure), son et cascade du client.
// - États du prototype par l'adresse : ?f=prep|cours|fin|pb (filtre), ?role=prep (accès Préparation, par la session).
import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { sonner } from '../../composants/marque-sonore'
import { mouvementLibre, useTirerPourActualiser } from '@client/composants/Animations'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Commande, FiltreCommandes, VueCommandes } from '../../donnees/domaines/commandes'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { duree, entre, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles, useRole, useSession } from '../../session'
import { jourDe } from '../../calculs/temps'
import { Avis, Bouton, EtatLecture, HorsLigne, LIEN_44, hhmm, jourCourtNum, jourMois, mettreEnFile, quand, restantOuvert, urgence, useAvisRecu, useEnLigne, useLien } from './commun'

const FILTRES: { id: FiltreCommandes; titre: string }[] = [
  { id: 'prep', titre: 'À préparer' },
  { id: 'cours', titre: 'En cours' },
  { id: 'fin', titre: 'Terminées' },
  { id: 'pb', titre: 'Problèmes' },
]
type SousFiltre = 'toutes' | 'se_libere' | 'a_verser' | 'verse' | 'annulees'

const ETATS_FR: Record<Commande['statut'], string> = {
  payee: 'Payée',
  payable_au_retrait: 'Payable au retrait',
  a_preparer: 'À préparer',
  prete: 'Prête',
  chez_le_livreur: 'Chez le livreur',
  livree: 'Livrée',
  litige_gele: 'Litige — gelé',
  retour_gele: 'En retour — gelé',
  annulee: 'Annulée',
}

const MOTIFS: Record<NonNullable<Commande['annulation']>['motif'], string> = {
  rupture: 'Rupture signalée',
  client_avant_ramassage: 'Annulée par le client avant le ramassage',
  litige_perdu: 'Litige perdu',
  belivay: 'Annulée par BelivaY',
}

/** Recherche : référence de commande, article, variante, référence de la boîte (sans accents ni casse). */
const plat = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const correspond = (c: Commande, q: string) => !q || plat([c.ref, ...c.lignes.flatMap((l) => [l.article.titre, l.article.variante, l.reference])].join(' ')).includes(plat(q))

function useCestPret(enLigne: boolean) {
  const naviguer = useNavigate()
  const lien = useLien()
  const { t } = usePreferences()
  const [vert, setVert] = useState<string | null>(null)
  const [enAttente, setEnAttente] = useState<string | null>(null)
  const pret = async (ref: string) => {
    if (!enLigne) {
      // Hors connexion : l'action part en file avec son heure d'origine (VD05-R09, Q-93).
      mettreEnFile(ref)
      setEnAttente(ref)
      jouer('interrupteur')
      return
    }
    const r = await source.preparation.cestPret(ref)
    if (!r.ok) {
      jouer('erreur')
      return naviguer(lien('commande', { ref }), { state: { avis: { ton: 'ink', texte: t('Cette commande n’est plus à préparer.') } } })
    }
    setVert(ref)
    sonner('cestPret')
    const aller = () => naviguer(lien('commande_prete', { ref }))
    if (mouvementLibre()) setTimeout(aller, 450)
    else aller()
  }
  return { vert, enAttente, pret }
}

function APreparer({ c, premier, maintenant, cestPret, enLigne }: { c: Commande; premier: boolean; maintenant: number; cestPret: ReturnType<typeof useCestPret>; enLigne: boolean }) {
  const { t, tf, langue } = usePreferences()
  const lien = useLien()
  const montants = useMontantsVisibles()
  const l = c.lignes[0]
  const reste = restantOuvert(c, maintenant)
  const u = urgence(reste, c.echeance, maintenant)
  const prix = l.prixUnitaire !== null && montants ? l.prixUnitaire * l.quantite : null
  const etat = t(l.article.etat)
  const variante = t(l.article.variante)
  const r = c.ramassage
  const enFile = cestPret.enAttente === c.ref
  return (
    <div className={'card ord' + (c.payableAuRetrait ? ' amber' : '') + ' blv-cascade'}>
      <Link to={lien('commande', { ref: c.ref })} style={{ display: 'block' }}>
        <div className="otop">
          <span className="row b8 t15" style={{ gap: '6px' }}>
            <Icone nom="timer" taille={17} style={{ color: 'var(--or-txt)' }} />
            <span>{tf('Prête avant {h}', { h: c.echeance ? quand(c.echeance, maintenant, langue) : '' })}</span>
          </span>
          <span className={'cd' + (u === 'normale' ? '' : ' red')}>{u === 'depassee' ? t('Délai dépassé') : tf(u === 'imminente' ? 'Dépassement dans {d}' : 'il reste {d}', { d: duree(reste, langue) })}</span>
        </div>
        {c.payableAuRetrait && (
          <div className="meta">
            <span className="pill amber sm">
              <Icone nom="hand-coins" taille={13} />
              {t('Payable au retrait')}
            </span>
          </div>
        )}
        <div className="art">
          <Vignette nom={l.article.dessin} taille={56} />
          <div className="grow">
            <div className="an">
              {`${l.article.titre} · `}
              <span style={{ letterSpacing: '.02em' }}>{variante.toUpperCase()}</span>
            </div>
            <div className="av">{prix !== null ? tf('{etat} · ×{q} · colis {c} · {prix} F', { etat, q: l.quantite, c: c.colis, prix: F(prix) }) : tf('{etat} · ×{q} · colis {c}', { etat, q: l.quantite, c: c.colis })}</div>
            <div className="av">{tf(c.payableAuRetrait ? '{ref} · validée à {h}' : '{ref} · payée à {h}', { ref: c.ref, h: heure(c.payeeA, langue) })}</div>
          </div>
          <span className="c4" style={{ flexShrink: '0' }}>
            <Icone nom="chevron-right" taille={20} />
          </span>
        </div>
        {montants && c.garde !== null && (
          <div className="keep" style={c.payableAuRetrait ? { gap: '10px', background: 'var(--amber-soft)', borderColor: 'var(--amber-line)' } : undefined}>
            <span className="kl" style={c.payableAuRetrait ? { color: 'var(--amber)' } : undefined}>
              {t(c.payableAuRetrait ? 'Vous garderez · rien n’est encaissé' : 'Vous gardez')}
            </span>
            <span className="kv2" style={c.payableAuRetrait ? { color: 'var(--amber)' } : undefined}>
              {t(`${F(c.garde)} F`)}
            </span>
          </div>
        )}
      </Link>
      {!montants && c.payableAuRetrait && (
        <div className="row mt10 t13 c2" style={{ gap: '8px', lineHeight: '1.4' }}>
          <Icone nom="hand-coins" taille={16} style={{ color: 'var(--amber)', flexShrink: '0' }} />
          <span>{t('Rien n’est encaissé : préparez-la pareil.')}</span>
        </div>
      )}
      {c.livreur && r && (
        <div className="row mt10 t13 c3" style={{ gap: '8px' }}>
          <Icone nom="truck" taille={16} style={{ flexShrink: '0' }} />
          <span>
            {jourDe(r.debut) === jourDe(maintenant)
              ? tf('Livreur {nom} chez vous {entre}', { nom: c.livreur.nom, entre: entre([hhmm(r.debut), hhmm(r.fin)], langue) })
              : tf('Livreur {nom} chez vous {jour}, {entre}', { nom: c.livreur.nom, jour: jourCourtNum(r.debut, langue), entre: entre([hhmm(r.debut), hhmm(r.fin)], langue) })}
          </span>
        </div>
      )}
      <div className="mt12">
        {enFile ? (
          <div className="note ink" role="status" style={{ marginTop: '0' }}>
            <Icone nom="cloud-off" taille={18} />
            <div>{t('« C’est prêt » gardé : il part dès le retour du réseau, avec son heure.')}</div>
          </div>
        ) : (
          <Bouton
            classe={(premier ? 'primary' : 'soft') + (cestPret.vert === c.ref ? ' vd-okb' : '')}
            icone="package-check"
            vers={lien('commande_prete', { ref: c.ref })}
            onClick={(e: MouseEvent) => {
              e.preventDefault()
              void cestPret.pret(c.ref)
            }}
          >
            {t('C’est prêt')}
          </Bouton>
        )}
      </div>
      <div className="links" style={{ marginTop: '4px', gap: '4px' }}>
        {enLigne ? (
          <>
            <Link to={lien('rupture', { ref: c.ref })} style={LIEN_44}>
              {t('Rupture')}
            </Link>
            <span className="c4" aria-hidden="true" style={{ alignSelf: 'center' }}>
              {t('·')}
            </span>
            {!c.prolongee && (
              <>
                <Link to={lien('delai', { ref: c.ref })} style={LIEN_44}>
                  {t('Plus de temps')}
                </Link>
                <span className="c4" aria-hidden="true" style={{ alignSelf: 'center' }}>
                  {t('·')}
                </span>
              </>
            )}
          </>
        ) : (
          <span className="t12 c3" style={{ ...LIEN_44, opacity: 0.7 }}>
            {t('Rupture et délai : réseau nécessaire')}
          </span>
        )}
        <Link to={lien('bon', { ref: c.ref })} style={LIEN_44}>
          {t('Bon de préparation')}
        </Link>
      </div>
    </div>
  )
}

function EnCours({ c, maintenant }: { c: Commande; maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  const lien = useLien()
  const montants = useMontantsVisibles()
  const l = c.lignes[0]
  const r = c.ramassage
  const prete = c.statut === 'prete'
  return (
    <div className={'card ord ' + (prete ? 'amber' : 'ink') + ' blv-cascade'}>
      <Link to={lien('commande', { ref: c.ref })} style={{ display: 'block' }}>
        <div className="otop">
          <span className={'pill sm ' + (prete ? 'or' : 'ink')}>
            <Icone nom={prete ? 'package-check' : 'truck'} taille={13} />
            {t(prete ? 'Prête · livreur attendu' : 'Chez le livreur')}
          </span>
          <span className="oref">{c.ref}</span>
        </div>
        <div className="art">
          <Vignette nom={l.article.dessin} taille={48} />
          <div className="grow">
            <div className="an" style={{ fontSize: '15.5px' }}>{`${l.article.titre} · ${t(l.article.variante)}`}</div>
            <div className="av">
              {prete
                ? r
                  ? jourDe(r.debut) === jourDe(maintenant)
                    ? tf('Livreur {nom} aujourd’hui {entre}', { nom: c.livreur?.nom ?? '', entre: entre([hhmm(r.debut), hhmm(r.fin)], langue) })
                    : tf('Livreur {nom} {jour}, {entre}', { nom: c.livreur?.nom ?? '', jour: jourCourtNum(r.debut, langue), entre: entre([hhmm(r.debut), hhmm(r.fin)], langue) })
                  : t('Livreur attendu')
                : tf('Remise au livreur à {h}', { h: c.remiseA ? quand(c.remiseA, maintenant, langue) : '' })}
            </div>
            <div className="av">{t(prete ? 'Donnez le code seulement après avoir vérifié sa photo' : 'Reste ici jusqu’au retrait par le client')}</div>
          </div>
          {montants && c.garde !== null && (
            <div className="right" style={{ flexShrink: '0' }}>
              <div className="t12 b7 c3">{t(c.payableAuRetrait ? 'Vous garderez' : 'Vous gardez')}</div>
              <div className="b8 t15 mt4">{t(`${F(c.garde)} F`)}</div>
            </div>
          )}
        </div>
      </Link>
      {prete && (
        <div className="mt12">
          <Bouton classe="soft" icone="qr-code" vers={lien('commande_prete', { ref: c.ref })}>
            {t('Remettre au livreur')}
          </Bouton>
        </div>
      )}
    </div>
  )
}

function Terminee({ c, maintenant }: { c: Commande; maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  const lien = useLien()
  const montants = useMontantsVisibles()
  const l = c.lignes[0]
  const a = c.argent
  const annulee = c.statut === 'annulee'
  // Pastille : l'état de l'argent (VD05-R04) ; sans montants, l'état de la commande.
  const pastille = annulee
    ? { ton: 'ink', texte: t('Annulée') }
    : !a
      ? { ton: 'green', texte: t('Livrée') }
      : a.etat === 'se_libere' && a.liberation
        ? { ton: 'or', texte: jourDe(a.liberation) === jourDe(maintenant) ? tf('Se libère aujourd’hui à {h}', { h: heure(a.liberation, langue) }) : tf('Se libère {quand}', { quand: quand(a.liberation, maintenant, langue) }) }
        : a.etat === 'a_verser' && a.vendredi
          ? { ton: 'green', texte: tf('À verser vendredi {d}', { d: jourMois(a.vendredi, langue) }) }
          : a.etat === 'verse' && a.vendredi
            ? { ton: 'ink', texte: tf('Versé le {d}', { d: jourMois(a.vendredi, langue) }) }
            : { ton: 'green', texte: t('Livrée') }
  const ligne2 = annulee ? t(MOTIFS[c.annulation!.motif]) : c.retireeA ? tf('Livrée le {d}', { d: jourMois(c.retireeA, langue) }) : t('Livrée')
  const ligne3 = annulee
    ? t('Un autre vendeur la reprend, sinon le client est remboursé.')
    : a?.etat === 'verse' && a.versement
      ? tf('Versement {ref}', { ref: a.versement })
      : a?.etat === 'a_verser' && a.liberation
        ? tf('Libérée le {d}', { d: jourMois(a.liberation, langue) })
        : c.confirmeeParLeClient
          ? t('Confirmée par le client')
          : t('Fenêtre de retour close')
  const vers = montants && !annulee ? lien('recu', { ref: c.ref }) : lien('commande', { ref: c.ref })
  return (
    <Link to={vers} className={'card ord ' + (pastille.ton === 'green' ? 'green' : pastille.ton === 'ink' ? 'ink' : '') + ' blv-cascade'} style={{ display: 'block' }}>
      <div className="otop">
        <span className={'pill sm ' + pastille.ton}>{pastille.texte}</span>
        <span className="oref">{c.ref}</span>
      </div>
      <div className="art">
        <Vignette nom={l.article.dessin} taille={48} />
        <div className="grow">
          <div className="an" style={{ fontSize: '15.5px' }}>{`${l.article.titre} · ${t(l.article.variante)}`}</div>
          <div className="av">{ligne2}</div>
          <div className="av">{ligne3}</div>
        </div>
        {montants && c.garde !== null && !annulee && (
          <div className="right" style={{ flexShrink: '0' }}>
            <div className="t12 b7 c3">{t('Vous gardez')}</div>
            <div className="b8 t15 mt4">{t(`${F(c.garde)} F`)}</div>
          </div>
        )}
      </div>
    </Link>
  )
}

function Probleme({ c, maintenant }: { c: Commande; maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  const lien = useLien()
  const montants = useMontantsVisibles()
  const role = useRole()
  const l = c.lignes[0]
  const p = c.probleme
  if (!p) return null
  const litige = p.type === 'litige'
  const titre = litige ? l.article.titre : `${l.article.titre} · ${t(l.article.variante)}`
  return (
    <Link to={litige ? lien('litige', { ref: c.ref }) : lien('retours')} className="card ord red blv-cascade" style={{ display: 'block' }}>
      <div className="otop">
        <span className="pill red sm">
          <Icone nom="lock" taille={13} />
          {t(litige ? 'Litige — gelé' : 'En retour — gelé')}
        </span>
        {litige ? (
          <span className="cd red">
            <Icone nom="hourglass" taille={14} />
            {p.echeance > maintenant ? tf('il reste {d}', { d: duree(p.echeance - maintenant, langue) }) : t('Délai dépassé')}
          </span>
        ) : (
          <span className="cd" style={{ color: 'var(--ink-3)' }}>
            <Icone nom="truck" taille={14} />
            {p.arrivee.jour === jourDe(maintenant) ? t('arrive aujourd’hui') : tf(p.arrivee.jour < jourDe(maintenant) ? 'arrivé {jour}' : 'arrive {jour}', { jour: jourCourtNum(p.arrivee.jour, langue) })}
          </span>
        )}
      </div>
      <div className="art">
        <Vignette nom={l.article.dessin} taille={48} />
        <div className="grow">
          <div className="an" style={{ fontSize: '15.5px' }}>{titre}</div>
          <div className="av">{litige ? tf('{ref} · « {motif} »', { ref: c.ref, motif: t(p.motif) }) : tf('{ref} · {motif} · inspection {n} h à réception', { ref: c.ref, motif: t(p.motif.split(',')[0]), n: p.inspectionHeures })}</div>
        </div>
        {montants && c.gele !== null && (
          <div className="right" style={{ flexShrink: '0' }}>
            <div className="t12 b7 c3">{t('Gelé')}</div>
            <div className="b8 t15 cr mt4">{t(`${F(c.gele)} F`)}</div>
          </div>
        )}
      </div>
      {litige ? (
        <div className="mt12">
          {/* Toute la carte est le lien (CMD-10) : le « bouton » est son libellé, pas un second élément actif. */}
          <span className={'btn ' + (p.repondu ? 'secondary' : 'danger')}>
            <Icone nom="scale" taille={18} />
            <span>{t(p.repondu ? 'Voir le litige · réponse envoyée' : role === 'preparation' ? 'Ajouter des preuves' : 'Répondre au litige')}</span>
          </span>
        </div>
      ) : (
        <div className="row mt8 t14 b8 cor" style={{ justifyContent: 'center', minHeight: '44px', gap: '4px' }}>
          {t('Voir le retour')}
          <Icone nom="chevron-right" taille={16} />
        </div>
      )}
    </Link>
  )
}

/** Phrase d'état (CMD-02) : « 9 commandes · 2 à préparer · 2 en litige · 1 en retour · 4 terminées ». */
function phrase(v: VueCommandes, tf: (s: string, p: Record<string, string | number>) => string): string {
  const d = v.detail
  const morceaux = [
    tf(v.total > 1 ? '{n} commandes' : '{n} commande', { n: v.total }),
    tf('{n} à préparer', { n: d.prep }),
    ...(d.cours ? [tf('{n} en cours', { n: d.cours })] : []),
    tf('{n} en litige', { n: d.litiges }),
    tf('{n} en retour', { n: d.retours }),
    tf(d.terminees > 1 ? '{n} terminées' : '{n} terminée', { n: d.terminees }),
    ...(d.annulees ? [tf(d.annulees > 1 ? '{n} annulées' : '{n} annulée', { n: d.annulees })] : []),
  ]
  return morceaux.join(' · ')
}

/** Export de la liste en CSV (VD05-R08, menu ⋮) : sans montant pour l'accès Préparation, jamais rien du client. */
function exporterCsv(items: Commande[], filtre: FiltreCommandes, montants: boolean, maintenant: number, t: (s: string) => string) {
  const champ = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const tete = ['Référence', 'État', 'Article', 'Variante', 'Quantité', 'Colis', 'Payée ou validée le', 'Prête avant', ...(montants ? ['Prix de vente (F)', 'Vous gardez (F)'] : [])].map(t)
  const lignes = items.map((c) => {
    const l = c.lignes[0]
    const date = (t: number | null) => (t ? new Date(t + 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ') : '')
    return [c.ref, t(ETATS_FR[c.statut]), l.article.titre, t(l.article.variante), l.quantite, c.colis, date(c.payeeA), date(c.echeance), ...(montants ? [l.prixUnitaire !== null ? l.prixUnitaire * l.quantite : '', c.garde ?? ''] : [])].map(champ).join(';')
  })
  const blob = new Blob(['﻿' + [tete.map(champ).join(';'), ...lignes].join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `commandes-${filtre}-${jourDe(maintenant)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export default function Commandes() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const montants = useMontantsVisibles()
  const maintenant = useHorloge(5000)
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const lien = useLien()
  const f = (FILTRES.find((x) => x.id === params.get('f'))?.id ?? 'prep') as FiltreCommandes
  const sous = (params.get('voir') ?? 'toutes') as SousFiltre
  const [q, setQ] = useState('')
  const [copie, setCopie] = useState(false)
  const lecture = useLecture(() => source.commandes.vue(f), [f, s.membre?.role])
  const { enLigne, file } = useEnLigne()
  const cestPret = useCestPret(enLigne)
  const menu = useFeuille('actions')
  const [avis, fermerAvis] = useAvisRecu()
  useTirerPourActualiser(lecture.relire)
  const v = lecture.donnees
  // Somme ≠ total (CMD-02, REFVD-R132) : jamais un chiffre faux. Alerte au suivi, la liste recharge.
  const juste = !v || Object.values(v.detail).reduce((a, b) => a + b, 0) === v.total
  useEffect(() => {
    if (juste) return
    console.warn('[commandes] somme des états ≠ total : rechargement')
    const id = setTimeout(lecture.relire, 800)
    return () => clearTimeout(id)
  }, [juste, lecture.relire])
  const items = useMemo(() => {
    if (!v) return []
    let x = v.items.filter((c) => correspond(c, q))
    if (f === 'fin' && sous !== 'toutes') x = x.filter((c) => (sous === 'annulees' ? c.statut === 'annulee' : c.argent?.etat === sous))
    return x
  }, [v, q, f, sous])
  if (!v || !juste) return <EtatLecture route="commandes" erreur={lecture.erreur} relire={lecture.relire} />
  const aller = (filtre: FiltreCommandes) => naviguer(lien('commandes', filtre === 'prep' ? {} : { f: filtre }), { replace: true })
  const voir = (x: SousFiltre) => naviguer(lien('commandes', { f: 'fin', ...(x === 'toutes' ? {} : { voir: x }) }), { replace: true })
  const copier = async () => {
    const lignes = [phrase(v, tf), ...v.items.map((c) => `${c.ref} · ${c.lignes[0].article.titre} ${t(c.lignes[0].article.variante)} · ${t(ETATS_FR[c.statut])}${c.echeance ? ' · ' + tf('Prête avant {h}', { h: quand(c.echeance, maintenant, langue) }) : ''}`)]
    try {
      await navigator.clipboard.writeText(lignes.join('\n'))
      jouer('copie')
      setCopie(true)
    } catch {
      jouer('erreur')
    }
  }
  const vide = {
    prep: { icone: 'package-check', titre: 'Aucune commande à préparer', texte: 'Les nouvelles commandes arrivent ici, la plus urgente d’abord. Vous recevez un SMS à chaque commande.' },
    cours: { icone: 'truck', titre: 'Aucune commande en route', texte: 'Une commande remise au livreur reste ici jusqu’au retrait par le client.' },
    fin: { icone: 'circle-check', titre: 'Aucune commande terminée', texte: 'Une commande retirée par le client arrive ici, avec l’état de son argent.' },
    pb: { icone: 'shield-check', titre: 'Aucun problème', texte: 'Litiges et retours s’affichent ici, avec le temps qu’il vous reste.' },
  }[f]
  const autre = f !== 'prep' && v.compteurs.prep > 0
  return (
    <Ecran
      route="commandes"
      fixes={
        <Feuille ouverte={menu.ouverte} fermer={menu.fermer} titre={t('Exporter, factures')}>
          <h3 style={{ margin: '0 0 6px' }}>{t('Commandes reçues')}</h3>
          <div className="card tight flat" style={{ margin: '0' }}>
            <button type="button" className="li" style={{ width: '100%', background: 'none', border: 0, textAlign: 'left' }} onClick={() => (exporterCsv(v.items, f, montants, maintenant, t), jouer('copie'), menu.fermer())}>
              <span className="ic">
                <Icone nom="download" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>{t('Exporter la liste')}</span>
                <span className="ls" style={{ display: 'block' }}>{montants ? t('Fichier CSV pour un tableur · aucune donnée du client') : t('Fichier CSV, sans montant · aucune donnée du client')}</span>
              </span>
            </button>
            <button type="button" className="li" style={{ width: '100%', background: 'none', border: 0, textAlign: 'left' }} onClick={() => void copier()}>
              <span className="ic">
                <Icone nom="copy" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>{copie ? t('Copié') : t('Copier le résumé')}</span>
                <span className="ls" style={{ display: 'block' }}>{t('À coller dans un message à votre équipe')}</span>
              </span>
            </button>
            {montants && (
              <Link to={chemin('documents')} className="li">
                <span className="ic">
                  <Icone nom="receipt" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>{t('Factures')}</span>
                  <span className="ls" style={{ display: 'block' }}>{t('Reçus, factures de commission et relevés')}</span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
            )}
            <Link to={lien('aide')} className="li">
              <span className="ic">
                <Icone nom="circle-help" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>{t('Aide sur les commandes')}</span>
                <span className="ls" style={{ display: 'block' }}>{t('Délais, rupture, remise au livreur')}</span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>
        </Feuille>
      }
    >
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <div className="pg">
            <h1 className="pg-t">{t('Commandes reçues')}</h1>
            <p className="pg-s">{phrase(v, tf)}</p>
          </div>
        </div>
        <button type="button" className="ibtn" aria-label={t('Exporter, factures')} onClick={menu.ouvrir} style={{ width: '44px', height: '44px', marginTop: '12px', background: 'var(--card)', boxShadow: 'var(--shadow-card)' }}>
          <Icone nom="ellipsis-vertical" taille={20} />
        </button>
      </div>
      {!enLigne && <HorsLigne lueA={v.maintenant} enFile={file.length} />}
      {avis && <Avis avis={avis} fermer={fermerAvis} />}
      <div className="seg stack" role="tablist" aria-label={t('Filtres des commandes')}>
        {FILTRES.map((x) => (
          <Link
            key={x.id}
            to={lien('commandes', x.id === 'prep' ? {} : { f: x.id })}
            replace
            role="tab"
            aria-selected={f === x.id}
            className={f === x.id ? 'on' : ''}
            onClick={(e) => (e.preventDefault(), aller(x.id))}
          >
            <b>{t(String(v.compteurs[x.id]))}</b>
            <span>{t(x.titre)}</span>
          </Link>
        ))}
      </div>
      {(v.items.length > 2 || q) && (
        <label className="inp mt12" style={{ height: '44px' }}>
          <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('Chercher une référence ou un article')}
            aria-label={t('Chercher une référence ou un article')}
            style={{ flex: '1', minWidth: '0', border: '0', outline: 'none', background: 'transparent', color: 'inherit', font: 'inherit' }}
          />
          {q && (
            <button type="button" className="ibtn" aria-label={t('Effacer la recherche')} onClick={() => setQ('')} style={{ width: '32px', height: '32px' }}>
              <Icone nom="x" taille={16} />
            </button>
          )}
        </label>
      )}
      {f === 'fin' && v.items.length > 0 && (
        <div className="chips" role="group" aria-label={t('Filtrer les commandes terminées')}>
          {(montants ? (['toutes', 'se_libere', 'a_verser', 'verse', 'annulees'] as SousFiltre[]) : (['toutes', 'annulees'] as SousFiltre[])).map((x) => {
            const n = x === 'toutes' ? v.items.length : v.items.filter((c) => (x === 'annulees' ? c.statut === 'annulee' : c.argent?.etat === x)).length
            if (x !== 'toutes' && n === 0) return null
            return (
              <button key={x} type="button" className={'chip' + (sous === x ? ' on' : '')} aria-pressed={sous === x} onClick={() => voir(x)}>
                {t({ toutes: 'Toutes', se_libere: 'Se libère', a_verser: 'À verser', verse: 'Versées', annulees: 'Annulées' }[x])}
                <span className="n">{n}</span>
              </button>
            )
          })}
        </div>
      )}
      {items.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom={q ? 'search-x' : vide.icone} taille={26} />
            </div>
            <h3>{q ? t('Aucune commande ne correspond') : t(vide.titre)}</h3>
            <p>{q ? tf('Rien pour « {q} » dans ce filtre.', { q }) : t(vide.texte)}</p>
            {(autre || q) && (
              <div className="mt14">
                {q ? (
                  <Bouton classe="secondary" icone="x" onClick={() => setQ('')}>
                    {t('Effacer la recherche')}
                  </Bouton>
                ) : (
                  <Bouton classe="primary" icone="package" vers={lien('commandes')}>
                    {v.compteurs.prep === 1 ? t('Voir la commande à préparer') : tf('Voir les {n} commandes à préparer', { n: v.compteurs.prep })}
                  </Bouton>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        items.map((c, i) =>
          f === 'prep' ? (
            <APreparer key={c.ref} c={c} premier={i === 0} maintenant={maintenant} cestPret={cestPret} enLigne={enLigne} />
          ) : f === 'cours' ? (
            <EnCours key={c.ref} c={c} maintenant={maintenant} />
          ) : f === 'fin' ? (
            <Terminee key={c.ref} c={c} maintenant={maintenant} />
          ) : (
            <Probleme key={c.ref} c={c} maintenant={maintenant} />
          ),
        )
      )}
      {!montants && s.proprietaire && (
        <div className="hint-l">
          <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('Les montants et les versements sont réservés à {nom}, propriétaire.', { nom: `${s.proprietaire.prenom} ${s.proprietaire.nom}` })}</span>
        </div>
      )}
      <p className="t12 c3 center" style={{ margin: '16px 10px 0', lineHeight: '1.5' }}>
        <Icone nom="shield-check" taille={14} style={{ verticalAlign: '-2px' }} />
        {t(' Vous ne voyez ni le client, ni son quartier, ni son relais.')}
        <br />
        {t('Le client ne voit pas votre boutique.')}
      </p>
    </Ecran>
  )
}
