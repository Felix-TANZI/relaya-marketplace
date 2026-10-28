// Briques communes du guichet de retrait (PR-05), balisage du prototype (classes p-…) : saisie du code en six cases,
// carte d'erreur du comptoir (ERR-01 : titre court, une ou deux phrases, une action ; rouge bloquant, ambre
// temporaire), « Autres situations au comptoir » (six cas repliables, RET-08 à RET-12 mis à jour par v6), boutons du
// bas (signature PIN, états d'erreur, dépôt d'un retour validé), photo de preuve prise par l'application (D15),
// montants et jours écrits pour le ticket.
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { ecartJours, jourDe, jourSemaine, type Jour } from '../../calculs/temps'
import type { ClasseColis } from '../../donnees/communs'
import type { DetailCode, LigneGarde, RefusRetrait, Remise } from '../../donnees/domaines/retrait'
import { source } from '../../donnees/source'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { REGLES } from './regles'
import './pr05.css'

export type T = ReturnType<typeof usePreferences>

/** « 1 200 F » (anglais : « 1,200 F » par t()). */
export const montant = (n: number) => F(n) + ' F'

export const CLASSES: Record<ClasseColis, string> = { S: 'petit', M: 'moyen', L: 'encombrant' }

/** « sam. 19 » / « Sat 19 ». */
export function jourCourtDe(j: Jour, langue: 'fr' | 'en') {
  const n = jourSemaine(j)
  const noms = langue === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']
  return `${noms[n]} ${Number(j.slice(8, 10))}`
}
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Âge d'un colis : « arrivé aujourd'hui », « arrivé hier », « arrivé il y a 4 jours ». */
export function arrive(p: T, arriveLe: number | null, maintenant: number) {
  if (arriveLe === null) return p.t('arrivée en cours')
  const n = ecartJours(jourDe(arriveLe), jourDe(maintenant))
  return n <= 0 ? p.t('arrivé aujourd’hui') : n === 1 ? p.t('arrivé hier') : p.tf('arrivé il y a {n} jours', { n })
}

/** Détail de la garde, comme le ticket du prototype : jours payants consécutifs au même tarif regroupés. */
export function lignesGarde(p: T, lignes: LigneGarde[]): { libelle: string; valeur: string }[] {
  const out: { libelle: string; valeur: string }[] = []
  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i]
    const jour = l.aujourdhui ? p.t('aujourd’hui') : jourCourtDe(l.jour, p.langue)
    const rang = l.rang ?? 0 // un jour sans rang (constat) est « suspendu » : jamais lu ci-dessous
    if (l.nature === 'offert') out.push({ libelle: l.rang === 1 ? p.tf('1er jour · {jour}', { jour }) : p.tf('{r}e jour · {jour}', { r: rang, jour }), valeur: p.t('offert') })
    else if (l.nature === 'ferme') out.push({ libelle: p.tf('{jour} · relais fermé', { jour: majuscule(jour) }), valeur: p.t('non facturé') })
    else if (l.nature === 'suspendu') out.push({ libelle: p.tf('{jour} · constat', { jour: majuscule(jour) }), valeur: p.t('sans frais') })
    else {
      let k = i
      while (k + 1 < lignes.length && lignes[k + 1].nature === 'payant' && lignes[k + 1].montant === l.montant && !lignes[k + 1].aujourdhui && !l.aujourdhui) k++
      if (k > i) {
        const n = k - i + 1
        const v = { a: rang, b: lignes[k].rang ?? rang, n, m: F(l.montant) }
        out.push({ libelle: n === 2 ? p.tf('{a}e et {b}e jours · {n} × {m} F', v) : p.tf('{a}e au {b}e jour · {n} × {m} F', v), valeur: montant(l.montant * n) })
        i = k
      } else out.push({ libelle: p.tf('{r}e jour · {jour}', { r: rang, jour }), valeur: montant(l.montant) })
    }
  }
  return out
}

// ── Saisie du code (six cases) ─────────────────────────────────────────────────────────────────────────────────
/** Six cases : chiffres seulement, passage automatique à la case suivante, retour arrière, collage d'un code entier
 * (PR-05 « Pour le développeur »). Le gérant tape ce que le client montre ; le code n'est jamais gardé. */
export function SaisieCode(p: { valeur: string; changer: (v: string) => void; complet?: (v: string) => void; erreur?: boolean; libelle: string; id?: string; occupe?: boolean }) {
  const { tf } = usePreferences()
  const cases = useRef<(HTMLInputElement | null)[]>([])
  const n = REGLES.codeLongueur
  const poser = (texte: string, depuis: number) => {
    const chiffres = texte.replace(/\D/g, '')
    if (!chiffres) return
    const v = (p.valeur.slice(0, depuis) + chiffres).slice(0, n)
    p.changer(v)
    cases.current[Math.min(v.length, n - 1)]?.focus()
    if (v.length === n) p.complet?.(v)
  }
  return (
    <div className="p-i5o4bp" role="group" aria-label={p.libelle} id={p.id}>
      {Array.from({ length: n }, (_, i) => (
        <input
          key={i}
          ref={(el) => void (cases.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={n}
          aria-label={tf('Chiffre {n}', { n: i + 1 })}
          aria-invalid={p.erreur || undefined}
          disabled={p.occupe}
          value={p.valeur[i] ?? ''}
          className={p.erreur ? 'p-kf3cpi' : 'p-qpvkkz'}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const x = e.target.value.replace(/\D/g, '')
            if (!x) return
            poser(x, Math.min(i, p.valeur.length))
          }}
          onPaste={(e) => {
            e.preventDefault()
            poser(e.clipboardData.getData('text'), 0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault()
              const k = p.valeur[i] !== undefined ? i : Math.max(i - 1, 0)
              p.changer(p.valeur.slice(0, k))
              cases.current[k]?.focus()
            } else if (e.key === 'Enter' && p.valeur.length === n) p.complet?.(p.valeur)
          }}
        />
      ))}
    </div>
  )
}

// ── Carte d'erreur (ERR-01, ERR-02) ────────────────────────────────────────────────────────────────────────────
export function CarteErreur(p: { ton: 'rouge' | 'ambre'; icone: string; titre: string; children: ReactNode; actions?: ReactNode; horsLigne?: boolean }) {
  const id = useId()
  return (
    <div className={p.ton === 'rouge' ? 'p-9a9wu0' : 'p-zdebuk'} role={p.ton === 'rouge' ? 'alert' : 'status'} aria-labelledby={id} {...(p.horsLigne ? { 'data-hors-ligne': '' } : {})}>
      <div className="p-wa6ccw">
        <div className={p.ton === 'rouge' ? 'p-lqvhm1' : 'p-o4jtkl'}>
          <Icone nom={p.icone} taille={24} className={p.ton === 'rouge' ? 'p-woejqv' : 'p-lhsznn'} />
        </div>
        <div className="p-nlvkht" id={id}>
          {p.titre}
        </div>
      </div>
      <div className="p-5pu05p">{p.children}</div>
      {p.actions}
    </div>
  )
}

/** Refus du serveur → carte d'erreur au comptoir (même texte que l'écran « États d'erreur »). */
export function ErreurRefus(p: { raison: RefusRetrait | 'reseau'; detail?: string; ressaisir?: () => void; maintenant: number }) {
  const prefs = usePreferences()
  const { t, tf, langue } = prefs
  const d: DetailCode = p.detail ? (JSON.parse(p.detail) as DetailCode) : {}
  const ressaisir = p.ressaisir && (
    <button type="button" className="p-v96i0s" onClick={p.ressaisir}>
      {t('Ressaisir le code')}
    </button>
  )
  switch (p.raison) {
    case 'code_faux':
      return (
        <CarteErreur ton="rouge" icone="r-fermer" titre={d.essaisRestants !== undefined ? tf('Code incorrect · encore {n} essais', { n: d.essaisRestants }) : t('Code incorrect')} actions={ressaisir}>
          {t('Ce code ne correspond à aucun colis prêt dans votre relais.')} {d.essaisRestants === 1 ? <strong>{t('Dernier essai')}</strong> : null} {tf('Après {n} codes faux de suite, les colis du client sont bloqués {h} h.', { n: REGLES.codeEssais, h: REGLES.codeBlocageH })}
        </CarteErreur>
      )
    case 'trop_de_codes':
      return (
        <CarteErreur ton="rouge" icone="r-cadenas" titre={t('Trop de codes faux')} actions={ressaisir}>
          {t('Plusieurs codes faux de suite : BelivaY est prévenu. Demandez au client de réafficher son code dans son application (ou de demander un renvoi par SMS s’il n’a pas l’application).')}
        </CarteErreur>
      )
    case 'bloque':
      return (
        <CarteErreur
          ton="rouge"
          icone="r-cadenas"
          titre={tf('Colis bloqué {h} h', { h: REGLES.codeBlocageH })}
          actions={
            <Link to={chemin('messagerie')} className="p-rbzobc">
              {t('Écrire au support')}
            </Link>
          }
        >
          {d.bloqueJusqua ? tf('Colis bloqué jusqu’à {heure} · le client peut demander un nouveau code', { heure: (ecartJours(jourDe(p.maintenant), jourDe(d.bloqueJusqua)) > 0 ? t('demain') + ' ' : '') + heure(d.bloqueJusqua, langue) }) : t('Les colis du client sont bloqués.')}
          {'. '}
          {t('Le client demande lui-même un nouveau code dans son application ; vous ne pouvez pas débloquer.')}
        </CarteErreur>
      )
    case 'deja_remis':
      return (
        <CarteErreur
          ton="rouge"
          icone="package-check"
          titre={t('Colis déjà remis')}
          actions={
            <Link to={chemin('historique')} className="p-rbzobc">
              {t('Voir l’historique')}
            </Link>
          }
        >
          {d.colis ? tf('{colis} a déjà été remis : un code ne sert qu’une fois.', { colis: d.colis }) : t('Ce code a déjà servi : un code ne sert qu’une fois.')}
        </CarteErreur>
      )
    case 'non_remettable':
      return (
        <CarteErreur
          ton="ambre"
          icone="r-alerte"
          titre={t('Ce colis ne peut pas être remis')}
          actions={
            <Link to={d.constat ? chemin('dossier-litige', { id: d.constat }) : chemin('stock')} className="p-rbzobc">
              {d.constat ? t('Voir le dossier') : t('Voir le stock')}
            </Link>
          }
        >
          {tf('Ce colis ne peut pas être remis : {raison}', { raison: t(RAISONS_ETAT[d.etat ?? ''] ?? 'il n’est pas prêt') })}. {t('Il reste au relais, sans frais, jusqu’à la décision.')}
        </CarteErreur>
      )
    case 'pas_au_relais':
      return (
        <CarteErreur
          ton="rouge"
          icone="r-qr"
          titre={t('Ce colis n’est pas pour votre relais')}
          actions={
            <Link to={chemin('messagerie')} className="p-rbzobc">
              {t('Signaler au support')}
            </Link>
          }
        >
          {d.colis ? tf('L’étiquette scannée ({colis}) n’est pas celle d’un colis de votre relais.', { colis: d.colis }) : t('Ce QR n’est ni un code de retrait ni l’étiquette d’un colis de votre relais.')} {t('Ne prenez pas ce colis : le livreur doit l’y déposer.')}
        </CarteErreur>
      )
    case 'etiquette':
      return (
        <CarteErreur ton="ambre" icone="r-etiquette" titre={t('C’est l’étiquette du colis')} actions={ressaisir}>
          {t('Vous avez scanné l’étiquette du colis. Scannez le QR que le client montre dans son application, ou tapez ses 6 chiffres.')}
        </CarteErreur>
      )
    case 'reseau':
    case 'reseau_requis':
      return (
        <CarteErreur ton="ambre" icone="r-reseau" titre={t('Réseau nécessaire pour le paiement Mobile Money')} horsLigne>
          {tf('Sans réseau, seul un colis dont seule la garde est due peut être remis ({n} remises hors ligne par jour au plus). Attendez le retour du réseau ou proposez au client de repasser.', { n: REGLES.horsLigneRemises })}
        </CarteErreur>
      )
    default:
      return (
        <CarteErreur ton="rouge" icone="r-alerte" titre={t(TITRES_REFUS[p.raison] ?? 'Opération refusée')} actions={ressaisir}>
          {t(TEXTES_REFUS[p.raison] ?? 'Le serveur a refusé l’opération. Réessayez ; si cela se répète, écrivez au support.')}
        </CarteErreur>
      )
  }
}

/** Raison lisible d'un colis non remettable (états du cycle, PR-02). */
export const RAISONS_ETAT: Record<string, string> = {
  en_constat: 'il est en constat',
  en_groupage: 'il attend les autres colis de la liste d’envies',
  a_renvoyer: 'il est à renvoyer au vendeur (7 jours passés)',
  a_faire_partir: 'il doit repartir avec le livreur',
  refuse_comptoir: 'la commande a été refusée au comptoir',
  transfert_demande: 'le client a demandé un autre relais',
  attendu: 'il n’est pas encore arrivé',
  recu: 'le lot n’est pas encore validé',
  recu_reserve: 'le lot n’est pas encore validé',
}

const TITRES_REFUS: Partial<Record<RefusRetrait, string>> = {
  introuvable: 'Remise introuvable',
  paiement_requis: 'Paiement non confirmé',
  montant_insuffisant: 'Montant reçu insuffisant',
  encaissement_non_confirme: 'Encaissement non confirmé',
  controle_requis: '« Tout est en ordre ? » à faire',
  probleme_signale: 'Un problème a été signalé',
  photo_manquante: 'Photo de remise manquante',
  porteur_requis: 'Nom du porteur obligatoire',
  porteur_non_autorise: 'Colis de valeur : porteur non autorisé',
  pin_faux: 'PIN incorrect',
  pin_bloque: 'PIN bloqué',
  remise_annulee: 'Remise annulée',
  piece_non_verifiee: 'Pièce d’identité à vérifier',
  formation_incomplete: 'Formation à terminer',
  plafond_hors_ligne: 'Plafond hors ligne atteint',
  transition_interdite: 'Opération impossible',
}
const TEXTES_REFUS: Partial<Record<RefusRetrait, string>> = {
  introuvable: 'Cette remise n’existe plus : recommencez par le code du client.',
  paiement_requis: 'Le paiement Mobile Money n’est pas confirmé par le serveur : pas de remise.',
  montant_insuffisant: 'Le montant reçu est inférieur à la garde due : demandez le complément au client.',
  encaissement_non_confirme: 'La garde en espèces n’est pas confirmée : la remise reste bloquée.',
  controle_requis: 'Invitez le client à vérifier son colis, ou continuez s’il préfère ne pas ouvrir.',
  probleme_signale: 'Un constat est ouvert : la remise n’a pas lieu.',
  photo_manquante: 'Prenez la photo du colis remis : sans elle, pas de remise.',
  porteur_requis: 'Une autre personne retire : saisissez son nom, il est envoyé au client.',
  porteur_non_autorise: 'Seul le porteur nommé par le client peut retirer un colis de valeur.',
  pin_faux: 'Le PIN ne correspond pas à votre compte.',
  pin_bloque: 'Trop de PIN faux de suite : votre PIN est bloqué quelques minutes et la remise est annulée.',
  remise_annulee: 'La remise est annulée : le colis est resté en stock.',
  piece_non_verifiee: 'Vérifiez la pièce d’identité du porteur avant de remettre.',
  formation_incomplete: 'Les modules obligatoires de la formation ne sont pas terminés : pas de remise.',
  plafond_hors_ligne: 'Le nombre de remises hors ligne du jour est atteint : attendez le réseau.',
  transition_interdite: 'Ce colis ne peut plus suivre cette étape.',
}

// ── Autres situations au comptoir ──────────────────────────────────────────────────────────────────────────────
interface Situation {
  id: string
  titre: string
  icone: string
  fond: string
  couleur: string
}
const SITUATIONS: Situation[] = [
  { id: 'comptoir', titre: 'Commande payable au retrait', icone: 'r-carte-paiement', fond: 'p-iokv7g', couleur: 'p-672m16' },
  { id: 'refus', titre: 'Le client refuse le colis', icone: 'r-fermer', fond: 'p-gcwb3u', couleur: 'p-woejqv' },
  { id: 'plusieurs', titre: 'Plusieurs colis pour un même client', icone: 'r-pile', fond: 'p-iokv7g', couleur: 'p-672m16' },
  { id: 'conteste', titre: 'Le client ouvre et conteste sur place', icone: 'r-balance', fond: 'p-ft0t5q', couleur: 'p-lhsznn' },
  { id: 'code', titre: 'Code bloqué ou oublié', icone: 'r-cadenas', fond: 'p-i5jj8d', couleur: 'p-rd23br' },
  { id: 'relais', titre: 'Le client veut changer de relais', icone: 'r-lieu', fond: 'p-iokv7g', couleur: 'p-672m16' },
]

/** Recherche d'une commande payable au retrait (RET-08) : référence ou numéro dicté par le client, jamais affiché. */
export function Recherche() {
  const { t } = usePreferences()
  const aller = useNavigate()
  const [q, setQ] = useState('')
  const [etat, setEtat] = useState<'repos' | 'cherche' | 'rien' | 'erreur'>('repos')
  const id = useId()
  const chercher = async () => {
    const v = q.trim()
    if (!v) return
    setEtat('cherche')
    try {
      const chiffres = v.replace(/[\s+.-]/g, '')
      const r = await source.retrait.rechercher(/^\d{8,12}$/.test(chiffres) ? { telephone: chiffres } : { reference: v })
      if (!r) {
        setEtat('rien')
        signal('erreur')
        return
      }
      signal('succes')
      setQ('')
      aller(chemin('retrait', { remise: r.id, etat: 'colis' }))
    } catch {
      setEtat('erreur')
    }
  }
  return (
    <form
      className="pr05-recherche"
      onSubmit={(e) => {
        e.preventDefault()
        void chercher()
      }}
    >
      <label htmlFor={id} className="p-yscrc8">
        {t('RÉFÉRENCE OU NUMÉRO DU CLIENT')}
      </label>
      <div className="pr05-rang">
        <input id={id} className="pr05-champ" value={q} onChange={(e) => (setQ(e.target.value), setEtat('repos'))} autoComplete="off" placeholder={t('BLV-00038 ou 6XX XX XX XX')} enterKeyHint="search" />
        <button type="submit" className="p-v96i0s pr05-court" disabled={!q.trim() || etat === 'cherche'}>
          <Icone nom="r-recherche" taille={18} className="p-7dsggt" />
          {t('Rechercher')}
        </button>
      </div>
      <div className="p-81u2s6" role="status">
        {etat === 'rien' ? t('Aucune commande à payer au comptoir pour cette recherche, dans votre relais.') : etat === 'erreur' ? t('Recherche impossible pour l’instant : vérifiez le réseau et réessayez.') : t('Le numéro sert seulement à chercher : il n’est jamais affiché ni gardé.')}
      </div>
    </form>
  )
}

export function Situations({ remise }: { remise?: Remise | null }) {
  const { t, tf } = usePreferences()
  const [ouvertes, setOuvertes] = useState<string[]>(['comptoir'])
  const base = useId()
  const contenu = (s: string): ReactNode => {
    switch (s) {
      case 'comptoir':
        return (
          <>
            {t('Pas encore de code : retrouvez la commande par sa référence ou le numéro du client. Le ticket affiche les articles à payer en Mobile Money et la garde à payer en espèces ; la livraison est toujours payée d’avance. Le client paie sur son téléphone : ce paiement débloque son code. Jamais d’espèces pour les articles. Les conditions sont vérifiées à la commande, pas par vous.')}
            <Recherche />
          </>
        )
      case 'refus':
        return tf('Avec un motif (non conforme, abîmé, contrefaçon) : touchez « Un problème » à l’étape « Tout est en ordre ? » ; un constat s’ouvre avec les photos du déballage, le colis reste chez vous sans frais jusqu’à la décision. Commande payable au retrait refusée sans motif : elle est annulée, la livraison payée d’avance n’est pas remboursée ; après {n} refus, le client paie d’avance. Commande déjà payée sans motif : le client peut la laisser, elle repart au vendeur après 7 jours.', { n: REGLES.refusAvantAvance })
      case 'plusieurs':
        return t('Chaque colis a son propre code. Après le premier code juste, l’écran montre les autres colis du client au relais : scannez leur code un par un. La garde se paie une seule fois par commande, au premier retrait. Posez tous les colis annoncés sur le comptoir : sinon la validation est refusée. Une seule photo pour toute la remise.')
      case 'conteste':
        return (
          <>
            {t('À l’étape « Tout est en ordre ? », le client ouvre ses colis devant vous. S’il constate un problème, touchez « Un problème » : photographiez le déballage devant lui, choisissez le motif ; on ne remet pas, la garde et le renvoi s’arrêtent jusqu’à la décision de BelivaY. Les espèces déjà reçues lui sont rendues.')}
            {remise && !remise.remiseA && !remise.annulee && (
              <Link className="p-rbzobc pr05-mt" to={chemin('retrait', { remise: remise.id, etat: 'ordre', constat: 1 })}>
                {t('Ouvrir le constat de ce client')}
              </Link>
            )}
          </>
        )
      case 'code':
        return tf('Code oublié : le client le réaffiche dans son application (QR ou 6 chiffres) ; sans application, il demande un renvoi par SMS, {n} fois par 24 h au plus. Vous ne voyez jamais le code et ne pouvez pas le redonner. Après {e} codes faux de suite, ses colis sont bloqués {h} h : le client demande lui-même un nouveau code dans son application.', { n: REGLES.codeRenvois, e: REGLES.codeEssais, h: REGLES.codeBlocageH })
      default:
        return tf('Le client change de relais dans son application : gratuit tant que rien n’est collecté ; colis déjà arrivé : {m} F à sa charge. Le colis passe dans « À faire partir » pour la prochaine collecte ; un nouveau code est émis, l’ancien ne marche plus.', { m: F(REGLES.transfert.S) })
    }
  }
  return (
    <div className="p-yi6rkz">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu">{t('Autres situations au comptoir')}</h2>
      </div>
      <div>
        {SITUATIONS.map((s) => {
          const ouverte = ouvertes.includes(s.id)
          return (
            <div key={s.id} className="p-jmaj5p">
              <button type="button" className="p-w3ueuk" aria-expanded={ouverte} aria-controls={ouverte ? base + s.id : undefined} onClick={() => (signal('toucher'), setOuvertes((o) => (ouverte ? o.filter((x) => x !== s.id) : [...o, s.id])))}>
                <div className={s.fond}>
                  <Icone nom={s.icone} taille={19} className={s.couleur} />
                </div>
                <div className="p-lh0lmv">{t(s.titre)}</div>
                <Icone nom={ouverte ? 'minus' : 'r-plus'} taille={18} className="p-672m16" />
              </button>
              {ouverte && (
                <div className="p-l8pg46" id={base + s.id}>
                  {contenu(s.id)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Bas de l'écran (prototype) : signature PIN, états d'erreur, dépôt d'un retour validé (PR-07). */
export function Bas({ remiseId }: { remiseId?: string | null }) {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0cipe3">
        <Link to={chemin('pin-remise', remiseId ? { remise: remiseId } : undefined)} className="p-rbzobc">
          <Icone nom="r-cadenas" taille={18} className="p-emic6i" />
          {t('Signature PIN')}
        </Link>
        <Link to={chemin('erreurs')} className="p-rbzobc">
          <Icone nom="r-alerte" taille={18} className="p-emic6i" />
          {t('États d’erreur')}
        </Link>
      </div>
      <Link to={chemin('litiges', { onglet: 'retour' })} className="p-jv4j92">
        <Icone nom="r-annuler" taille={20} className="p-q7qjlz" />
        <div className="p-lh0lmv">{t('Un client dépose un retour validé')}</div>
        <Icone nom="r-chevron-droite" taille={18} className="p-q7qjlz" />
      </Link>
    </>
  )
}

// ── Photo de preuve (D15) ──────────────────────────────────────────────────────────────────────────────────────
/** Aperçus des photos prises pendant la visite (la photo part au serveur ; l'aperçu reste sur l'appareil). */
const APERCUS = new Map<string, string>()
export const apercu = (id: string | null) => (id ? (APERCUS.get(id) ?? null) : null)

/** Réduit la photo (OFF-04 : PHOTO-MAX-KO) avant l'envoi ; renvoie son aperçu. */
async function reduire(f: File): Promise<string> {
  const url = URL.createObjectURL(f)
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = ko
      i.src = url
    })
    const echelle = Math.min(1, 1280 / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * echelle)
    c.height = Math.round(img.height * echelle)
    c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height)
    for (let q = 0.8; q > 0.3; q -= 0.15) {
      const d = c.toDataURL('image/jpeg', q)
      if ((d.length * 3) / 4 / 1024 <= REGLES.photoMaxKo) return d
    }
    return c.toDataURL('image/jpeg', 0.35)
  } catch {
    return url
  }
}

/** Bouton d'appareil photo (capture : l'appareil s'ouvre, jamais la galerie sur téléphone). */
export function PrisePhoto(p: { libelle: string; prise: (id: string) => void; classe?: string; children: ReactNode; multiple?: boolean; desactive?: boolean }) {
  const champ = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" className={p.classe ?? 'p-w5o8yg'} onClick={() => champ.current?.click()} aria-label={p.libelle} disabled={p.desactive}>
        {p.children}
      </button>
      <input
        ref={champ}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={p.multiple}
        hidden
        aria-label={p.libelle}
        onChange={async (e) => {
          const fichiers = [...(e.target.files ?? [])]
          e.target.value = ''
          for (const f of fichiers) {
            const id = 'ph-' + (crypto.randomUUID?.() ?? String(Date.now() + Math.random()))
            APERCUS.set(id, await reduire(f))
            signal('photo')
            p.prise(id)
          }
        }}
      />
    </>
  )
}

/** Vignette d'une photo prise (l'aperçu, ou une icône si la photo a été prise avant un rechargement). */
export function Vignette({ id, libelle }: { id: string; libelle: string }) {
  const url = apercu(id)
  return <span className="pr05-vignette">{url ? <img src={url} alt={libelle} /> : <Icone nom="image" taille={26} />}</span>
}

/** Intervalle qui relit une donnée (paiement en attente, client qui confirme) : en API, le serveur pousse ; ici on relit. */
export function useRelire(actif: boolean, relire: () => void, ms = 2_500) {
  useEffect(() => {
    if (!actif) return
    const i = window.setInterval(relire, ms)
    return () => window.clearInterval(i)
  }, [actif, relire, ms])
}
