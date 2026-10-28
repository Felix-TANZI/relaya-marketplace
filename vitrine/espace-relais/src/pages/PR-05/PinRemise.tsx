// PIN de remise (PR-05, PIN-01 à PIN-03 ; GEN-09 ; ARL-12, ARL-42, ARL-70 ; PR-RC-31) : s'intercale entre la photo et
// « Colis remis ». Le PIN personnel du membre connecté signe la remise et l'encaissement des espèces (toujours
// demandé : la garde en espèces le rend obligatoire, ARL-70). PR-PIN-REMISE-ESSAIS PIN faux pendant une remise
// l'annulent : colis remis en stock, espèces rendues (contre-écriture), gérant prévenu ; au PIN-ESSAIS-e faux de suite,
// le PIN est bloqué PR-PIN-BLOCAGE-MIN minutes. Clavier à l'écran (une main, 56 px) et clavier physique (comptoir).
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { DetailCode, RefusRetrait } from '../../donnees/domaines/retrait'
import { geste, origine, useEnLigne } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Vignette } from './commun'
import { REGLES } from './regles'
import './pr05.css'

const TOUCHES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export default function PinRemise() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const enLigne = useEnLigne()
  const aller = useNavigate()
  const [params] = useSearchParams()
  const id = params.get('remise')
  const lecture = useLecture(async () => ({ r: id ? await source.retrait.remise(id) : null }), [id])
  const r = lecture.donnees?.r ?? null
  const [pin, setPin] = useState('')
  const [erreur, setErreur] = useState<{ raison: RefusRetrait; essais?: number } | null>(null)
  const [occupe, setOccupe] = useState(false)
  const [annuler, setAnnuler] = useState(false)
  const n = REGLES.pinLongueur

  const valider = useCallback(async () => {
    if (!r || pin.length !== n || occupe) return
    setOccupe(true)
    const o = origine(s.maintenant)
    try {
      const x = await geste(enLigne, 'remise', r.id, o, (src) => src.retrait.remettre(r.id, pin, o), { local: true, photos: 1 })
      if (x.r.ok) {
        signal('remiseReussie')
        aller(chemin('retrait', { remise: r.id, etat: 'done' }), { replace: true })
        return
      }
      const d: DetailCode = x.r.detail ? (JSON.parse(x.r.detail) as DetailCode) : {}
      setPin('')
      signal('erreur')
      if (x.r.raison === 'remise_annulee' || x.r.raison === 'pin_bloque') {
        aller(chemin('retrait', { remise: r.id }), { replace: true })
        return
      }
      setErreur({ raison: x.r.raison, essais: d.essaisRestants })
    } catch {
      setErreur({ raison: 'introuvable' })
    } finally {
      setOccupe(false)
    }
  }, [r, pin, n, occupe, s.maintenant, enLigne, aller])

  const taper = useCallback(
    (k: string) => {
      if (!k) return
      signal('toucher')
      setErreur(null)
      setPin((p) => (k === '⌫' ? p.slice(0, -1) : p.length < n ? p + k : p))
    },
    [n],
  )
  // Clavier physique (ordinateur ou tablette du comptoir) : chiffres, effacement, Entrée.
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input,textarea')) return
      if (/^\d$/.test(e.key)) taper(e.key)
      else if (e.key === 'Backspace') taper('⌫')
      else if (e.key === 'Enter') void valider()
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [taper, valider])

  // Vérification automatique au dernier chiffre (comptoir : aucun bouton « Valider »).
  // Une seule tentative par PIN complet (la relecture de l'heure ne relance jamais la signature).
  const tente = useRef<string | null>(null)
  useEffect(() => {
    if (pin.length < n) tente.current = null
    else if (tente.current === null && !occupe) {
      tente.current = pin
      void valider()
    }
  }, [pin, n, occupe, valider])
  const pret = !!r && !r.remiseA && !r.annulee && !!r.preuve
  if (!lecture.donnees || !pret) {
    const charge = !!lecture.donnees
    return (
      <Ecran route="pin-remise" retour={chemin('retrait', id ? { remise: id, etat: 'colis' } : undefined)}>
        <div className="p-0hxmj8 pr05">
          {!charge && id ? (
            <div className="p-yi6rkz" role="status" aria-busy="true">
              {t('Chargement de la remise…')}
            </div>
          ) : (
            <>
              <div className="r-vide" role="status">
                <div className="r-vide-i">
                  <Icone nom="r-cadenas" taille={28} />
                </div>
                <h2>{r?.remiseA ? t('Remise déjà signée') : r && !r.preuve && !r.annulee ? t('Photo de remise d’abord') : t('Aucune remise à signer')}</h2>
                <p>{r?.remiseA ? t('Ce colis a été remis : la remise est au journal, signée.') : r && !r.preuve && !r.annulee ? t('Le PIN signe une remise prête : prenez la photo du colis remis, puis revenez.') : t('Le PIN se demande à la fin d’une remise, après la photo. Commencez par le code du client.')}</p>
              </div>
              <Link className="p-v96i0s" to={r && !r.annulee && !r.remiseA ? chemin('retrait', { remise: r.id, etat: 'colis' }) : chemin('retrait')}>
                {r && !r.preuve && !r.annulee && !r.remiseA ? t('Prendre la photo de remise') : t('Aller au retrait')}
              </Link>
            </>
          )}
          <div className="p-gh7puf">
            <Icone nom="r-bouclier" taille={18} className="p-672m16" />
            <div>{tf('Votre PIN est demandé à chaque remise : il signe la remise et l’encaissement des espèces, à votre nom. {n} PIN faux : la remise est annulée, le colis reste en stock, les espèces sont rendues et le gérant est prévenu. Au {e}e PIN faux de suite, votre PIN est bloqué {m} minutes.', { n: REGLES.pinEssaisRemise, e: REGLES.pinEssais, m: REGLES.pinBlocageMin })}</div>
          </div>
        </div>
      </Ecran>
    )
  }
  const emplacements = [...new Set(r.colis.map((c) => c.emplacement).filter(Boolean))] as string[]
  const paye = (r.garde.encaissement?.montant ?? 0) + (r.paiement?.etat === 'confirme' ? r.paiement.montant : 0)
  const message =
    erreur?.raison === 'pin_faux'
      ? erreur.essais === 1
        ? t('PIN incorrect · dernier essai avant l’annulation')
        : tf('PIN incorrect · encore {n} essais', { n: erreur.essais ?? REGLES.pinEssaisRemise - 1 })
      : erreur?.raison === 'plafond_hors_ligne'
        ? tf('Sans réseau : {n} remises hors ligne déjà faites aujourd’hui. Attendez le réseau.', { n: REGLES.horsLigneRemises })
        : erreur?.raison === 'formation_incomplete'
          ? t('Formation obligatoire à terminer avant une première remise.')
          : erreur?.raison === 'encaissement_non_confirme'
            ? t('Encaissement des espèces non confirmé : revenez au ticket.')
            : erreur?.raison === 'paiement_requis'
              ? t('Paiement Mobile Money non confirmé : pas de remise.')
              : erreur
                ? t('La remise n’a pas pu être signée : réessayez.')
                : null
  return (
    <Ecran route="pin-remise" retour={chemin('retrait', { remise: r.id, etat: 'colis' })}>
      <div className="p-0hxmj8 r-pile pr05">
        <div className="p-x1yexf">
          <div className="p-rv5edl">{emplacements[0] ?? '—'}</div>
          <div className="p-lmo74g">
            <div className="p-hz5rr5">{r.colis.length === 1 ? r.colis[0].id : tf('{n} colis · {liste}', { n: r.colis.length, liste: emplacements.join(', ') })}</div>
            <div className="p-t1lapd">{paye > 0 ? tf('{m} F payés · photo prise', { m: F(paye) }) : t('Rien à payer · photo prise')}</div>
          </div>
          <Vignette id={r.preuve!.photo} libelle={t('Photo du colis remis')} />
          <span className="p-nax3x4">{t('Prêt à remettre')}</span>
        </div>
        <div className="p-tw87fq">
          <div className="p-4kp1y3">
            <Icone nom="r-cadenas" taille={26} className="p-672m16" />
          </div>
          <div className="p-7qbps6">{t('Confirmez la remise')}</div>
          <div className="p-ietgpj">{t('Votre code PIN personnel signe l’opération')}</div>
        </div>
        <div className="p-j3bvre" role="img" aria-label={tf('{n} chiffres tapés sur {total}', { n: pin.length, total: n })}>
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className={erreur?.raison === 'pin_faux' ? 'p-xu43sj' : i < pin.length ? 'p-au0k5d' : 'p-3z2zrb'} />
          ))}
        </div>
        <div className="p-nhw7ne" role="alert">
          {message}
        </div>
        <div className="p-a71a3h">
          {TOUCHES.map((k, i) =>
            k ? (
              <button key={i} type="button" aria-label={k === '⌫' ? t('Effacer') : k} className="p-3ml6k6" disabled={occupe || (k === '⌫' ? !pin : pin.length >= n)} onClick={() => taper(k)}>
                {k}
              </button>
            ) : (
              <span key={i} />
            ),
          )}
        </div>
        <button type="button" className="p-rbzobc" aria-expanded={annuler} onClick={() => setAnnuler((x) => !x)}>
          {occupe ? t('Signature…') : t('Annuler la remise')}
        </button>
        {annuler && (
          <div className="pr05-confirmer" role="group" aria-label={t('Annuler la remise')}>
            <div className="p-81u2s6">{r.garde.encaissement?.montant ? tf('Rendez {m} F au client : la contre-écriture est inscrite au journal. Les colis restent en stock.', { m: F(r.garde.encaissement.montant) }) : t('Les colis restent en stock ; le client peut revenir avec ses codes.')}</div>
            <button
              type="button"
              className="p-rbzobc pr05-danger"
              onClick={async () => {
                const o = origine(s.maintenant)
                await geste(enLigne, 'remise', r.id, o, (src) => src.retrait.abandonner(r.id, 'abandon', null, o), { local: true })
                signal('alerte')
                aller(chemin('retrait', { remise: r.id }), { replace: true })
              }}
            >
              {t('Confirmer l’annulation')}
            </button>
          </div>
        )}
        <div className="p-gh7puf">
          <Icone nom="r-bouclier" taille={18} className="p-672m16" />
          <div>{tf('Le PIN signe la remise à votre nom ; il se valide tout seul. {n} PIN faux : remise annulée, colis en stock, espèces rendues.', { n: REGLES.pinEssaisRemise })}</div>
        </div>
      </div>
    </Ecran>
  )
}
