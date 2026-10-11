// Pièces de la remise (VD-06) :
// - Image : une photo remplaçable (adresse du dossier de la commande) ou, en démonstration, un dessin du prototype ;
// - CarteErreur : la carte d'erreur unique (ErrorCard, ERR-01, VD06-R17) : la commande concernée, un titre court, une
//   ou deux lignes, au plus deux faits, UN bouton plein (l'action, sur l'écran où elle se fait), au plus un lien,
//   « Pourquoi ? » replié. Teinte : rouge si bloquant, ambre si temporaire, encre si information. Aucun code technique
//   ni code de règle (ERR-02, ERR-03) ;
// - carteDe : les six cas (VD06-R18 à R23), écrits avec les données de la commande (créneaux, heures, plafonds).
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Dessin, Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { ErreurRemise, Remise } from '../../donnees/domaines/remise'
import { jourDe } from '../../calculs/temps'
import { entre, heure, jourCourt } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { enLettres } from '../VD-04/commun'
import '../VD-04/vd04.css'

const estAdresse = (s: string) => /^(data:|https?:|\/)/.test(s)

/** Photo du dossier, ou dessin de démonstration : toujours remplaçable par la vraie image. */
export function Image({ src, alt = '' }: { src: string; alt?: string }) {
  if (estAdresse(src)) return <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
  return <Dessin id={src} />
}

/** « aujourd'hui », « demain (mardi 22) », sinon « mercredi 23 ». */
export function jourRelatif(ms: number, maintenant: number, langue: 'fr' | 'en'): string {
  const j = jourDe(ms)
  if (j === jourDe(maintenant)) return langue === 'en' ? 'today' : 'aujourd’hui'
  if (j === jourDe(maintenant + 24 * 3600 * 1000)) return (langue === 'en' ? 'tomorrow' : 'demain') + ` (${jourCourt(ms, langue)})`
  return jourCourt(ms, langue)
}

export type Ton = 'red' | 'amber' | 'ink'
export interface Action {
  libelle: string
  icone: string
  vers?: string
  onClick?: () => void
}
export interface Carte {
  cas: ErreurRemise
  ton: Ton
  icone: string
  titre: string
  detail: string
  faits: { icone: string; texte: string }[]
  action: Action
  lien?: { libelle: string; vers: string }
  pourquoi: string
}

/** Écrire au support : la Messagerie, fil « Support BelivaY », avec la référence (VD06-R07 ; jamais le WhatsApp). */
export const versSupport = (ref: string) => chemin('messages', { fil: 'support', ref })

/** Les six cas, écrits avec les données de la commande. Les textes sont en français : l'écran les passe par t(). */
export function carteDe(
  cas: ErreurRemise,
  r: Remise,
  o: { maintenant: number; langue: 'fr' | 'en'; t: (s: string) => string; tf: (m: string, v: Record<string, string | number>) => string; actions?: Partial<Record<ErreurRemise, Action>> },
): Carte {
  const { maintenant, langue, t, tf } = o
  const nom = r.livreur?.nom ?? t('Le livreur')
  switch (cas) {
    case 'absent': {
      const manque = r.creneauManque
      const prochain = r.livreur
      return {
        cas,
        ton: 'amber',
        icone: 'clock-alert',
        titre: t('Le livreur n’est pas venu'),
        detail: manque ? tf('{nom} n’est pas passé {creneau}.', { nom, creneau: entre([hm(manque.debut), hm(manque.fin)], langue) }) : tf('{nom} n’est pas passé pendant son créneau.', { nom }),
        faits: [
          ...(prochain ? [{ icone: 'calendar-clock', texte: tf('Il repasse {jour} {creneau}', { jour: jourRelatif(prochain.debut, maintenant, langue), creneau: entre(prochain.creneau, langue) }) }] : []),
          { icone: 'shield-check', texte: t('Aucun effet pour vous : délai suspendu') },
        ],
        action: o.actions?.absent ?? { libelle: t('Voir le nouveau créneau'), icone: 'calendar-clock', vers: chemin('commande_prete', { ref: r.ref }) },
        pourquoi: t('Quand le livreur manque son créneau, votre délai de préparation s’arrête jusqu’à son prochain passage. Cela ne compte jamais contre vous.'),
      }
    }
    case 'bloque': {
      const fin = r.bloqueJusqua ?? maintenant + r.blocageHeures * 3600 * 1000
      return {
        cas,
        ton: 'red',
        icone: 'lock',
        titre: tf('Remise bloquée {h} h', { h: r.blocageHeures }),
        detail: tf('{n} codes faux ont été saisis. BelivaY est prévenu.', { n: enLettres(r.essaisMax, langue) }),
        faits: [
          { icone: 'hand', texte: t('Ne remettez l’article à personne') },
          { icone: 'clock', texte: r.bloqueJusqua ? tf('Débloquée {jour} à {h}', { jour: jourRelatif(fin, maintenant, langue), h: heure(fin, langue) }) : tf('Débloquée {h} h après le dernier code faux', { h: r.blocageHeures }) },
        ],
        action: o.actions?.bloque ?? { libelle: t('Écrire au support'), icone: 'message-circle', vers: versSupport(r.ref) },
        lien: o.actions?.bloque ? { libelle: t('Écrire au support'), vers: versSupport(r.ref) } : undefined,
        pourquoi: tf('Après {n} codes faux, la remise se bloque {h} h pour protéger votre article. Chaque essai est enregistré avec son heure.', { n: enLettres(r.essaisMax, langue).toLowerCase(), h: r.blocageHeures }),
      }
    }
    case 'annulee':
      return {
        cas,
        ton: 'amber',
        icone: 'circle-x',
        titre: t('Annulée par le client'),
        detail: t('Il a annulé avant le ramassage : ne la préparez plus.'),
        faits: [
          { icone: 'boxes', texte: t('Le stock réservé vous est rendu') },
          { icone: 'shield-check', texte: t('Aucun effet sur votre Trust Score') },
        ],
        action: o.actions?.annulee ?? { libelle: t('Retour aux commandes'), icone: 'arrow-left', vers: chemin('commandes') },
        pourquoi: t('Le client peut annuler tant que le livreur n’a pas pris le colis. Ce n’est pas de votre fait : cela ne compte pas contre vous. Le Trust Score est votre note de confiance, sur 100.'),
      }
    case 'depasse':
      return {
        cas,
        ton: 'red',
        icone: 'alarm-clock',
        titre: t('Délai dépassé'),
        detail: r.echeance ? tf('La commande devait être prête {jour} avant {h}.', { jour: jourRelatif(r.echeance, maintenant, langue), h: heure(r.echeance, langue) }) : t('La commande devait déjà être prête.'),
        faits: [{ icone: 'timer', texte: t('Chaque minute de retard compte sur votre Ponctualité') }],
        action: o.actions?.depasse ?? { libelle: t('C’est prêt'), icone: 'package-check', vers: chemin('commande_prete', { ref: r.ref }) },
        lien: { libelle: t('Plus l’article ? Signaler une rupture'), vers: chemin('rupture', { ref: r.ref }) },
        pourquoi: t('La Ponctualité est l’un des six critères de votre Trust Score, votre note de confiance sur 100. Un retard au-delà du délai compte comme une faute moyenne. Ne pas préparer du tout compte comme une faute grave, avec sanction.'),
      }
    case 'reseau':
      return {
        cas,
        ton: 'amber',
        icone: 'wifi-off',
        titre: t('Pas de réseau'),
        detail: t('Le code de remise marche quand même : donnez-le au livreur.'),
        faits: [{ icone: 'clock', texte: r.preteA ? tf('« C’est prêt » partira au retour du réseau, avec son heure d’origine ({h})', { h: heure(r.preteA, langue) }) : t('Vos gestes partiront au retour du réseau, avec leur heure d’origine') }],
        action: o.actions?.reseau ?? { libelle: t('Afficher le code'), icone: 'eye', vers: chemin('commande_prete', { ref: r.ref }) },
        pourquoi: tf('Le code est gardé dans votre téléphone. Ce que vous faites sans réseau attend avec son heure, puis part tout seul au retour du réseau, dans les {h} h.', { h: r.fileHeures }),
      }
    case 'plafond':
      return {
        cas,
        ton: 'ink',
        icone: 'shield-check',
        titre: t('Colis de valeur : livreur Or'),
        detail:
          r.valeurColis !== null
            ? tf('Ce colis vaut {v} : seule une entreprise de livraison Or, assurée, peut le prendre.', { v: t(`${F(r.valeurColis)} F`) })
            : t('Ce colis dépasse le plafond des autres entreprises : seule une entreprise de livraison Or, assurée, peut le prendre.'),
        faits: [{ icone: 'hourglass', texte: t('Votre délai de préparation commence à l’annonce de son créneau') }],
        action: o.actions?.plafond ?? { libelle: t('Voir les commandes à préparer'), icone: 'package', vers: chemin('commandes', { f: 'prep' }) },
        pourquoi: tf('Chaque entreprise de livraison a un plafond de valeur : {n} au niveau Nouveau, {c} au niveau Confirmé. Au-delà de {c}, seul le niveau Or, le plus haut et assuré sans plafond, peut prendre le colis.', {
          n: t(`${F(r.plafonds.nouveau)} F`),
          c: t(`${F(r.plafonds.confirme)} F`),
        }),
      }
  }
}

const hm = (ms: number) => {
  const d = new Date(ms + 3600 * 1000)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

const TEINTES: Record<Ton, { bord: string; fond: string; couleur: string; pastille: string; titre: string; boite: string }> = {
  red: { bord: 'var(--red-line)', fond: 'var(--red-soft)', couleur: 'var(--red)', pastille: 'var(--card)', titre: 'var(--red)', boite: 'var(--card)' },
  amber: { bord: 'var(--amber-line)', fond: 'var(--amber-soft)', couleur: 'var(--amber)', pastille: 'var(--card)', titre: 'var(--amber)', boite: 'var(--card)' },
  ink: { bord: 'var(--line-2)', fond: 'var(--card)', couleur: 'var(--ink-2)', pastille: 'var(--sand-2)', titre: 'var(--ink)', boite: 'var(--sand-2)' },
}

/** La carte d'erreur, balisage du prototype (Erreurs). `entete` : la commande concernée (vignette, article, référence). */
// sobre : bouton secondaire, sur l'écran de remise qui n'a aucun bouton plein orange (REM-08).
export function CarteErreur({ c, entete, avant, sobre }: { c: Carte; entete: { dessin: string; titre: string; sous: string }; avant?: ReactNode; sobre?: boolean }) {
  const { t } = usePreferences()
  const x = TEINTES[c.ton]
  const bouton = (
    <>
      <Icone nom={c.action.icone} taille={18} />
      <span>{c.action.libelle}</span>
    </>
  )
  return (
    <div className="card" data-cas={c.cas} role={c.ton === 'red' ? 'alert' : undefined} style={{ border: `1.5px solid ${x.bord}`, background: x.fond }}>
      {avant}
      <div className="row" style={{ gap: '10px' }}>
        <Vignette nom={entete.dessin} taille={40} />
        <div className="grow">
          <div className="t14 b8">{entete.titre}</div>
          <div className="t12 c3" style={{ marginTop: '2px' }}>
            {entete.sous}
          </div>
        </div>
      </div>
      <div className="row mt14" style={{ alignItems: 'flex-start' }}>
        <span style={{ width: '44px', height: '44px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0', background: x.pastille, color: x.couleur }}>
          <Icone nom={c.icone} taille={22} />
        </span>
        <div className="grow">
          <div className="b8" style={{ fontSize: '19px', lineHeight: '1.25', letterSpacing: '-.01em', color: x.titre }}>
            {c.titre}
          </div>
          <div className="t14 c2 mt6" style={{ lineHeight: '1.45' }}>
            {c.detail}
          </div>
        </div>
      </div>
      <div style={{ marginTop: '14px', padding: '2px 12px', borderRadius: '12px', background: x.boite }}>
        {c.faits.slice(0, 2).map((f, i) => (
          <div key={i} className="row" style={{ gap: '10px', alignItems: 'flex-start', padding: '10px 0', borderTop: i ? '1px solid var(--line)' : undefined }}>
            <Icone nom={f.icone} taille={18} style={{ flexShrink: '0', marginTop: '1px', color: x.couleur }} />
            <span className="grow t14" style={{ lineHeight: '1.4' }}>
              {f.texte}
            </span>
          </div>
        ))}
      </div>
      <div className="mt14">
        {c.action.vers ? (
          <Link to={c.action.vers} className={'btn ' + (sobre ? 'secondary' : 'primary')} onClick={c.action.onClick}>
            {bouton}
          </Link>
        ) : (
          <button type="button" className={'btn ' + (sobre ? 'secondary' : 'primary')} onClick={c.action.onClick}>
            {bouton}
          </button>
        )}
      </div>
      {c.lien && (
        <div className="links" style={{ marginTop: '4px' }}>
          <Link to={c.lien.vers} style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
            {c.lien.libelle}
          </Link>
        </div>
      )}
      <details className="more flat">
        <summary>
          <Icone nom="circle-help" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Pourquoi ?')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{c.pourquoi}</p>
        </div>
      </details>
    </div>
  )
}
