// Ramassages (AJ-B, DP-58) : le calendrier des passages du livreur chez la boutique, et ce qu'il faut lui remettre à
// chaque passage. Lié aux commandes (VD-05) et à la remise (VD-06).
// - Aujourd'hui, Demain, Semaine (?j=auj|dem|sem) : un créneau par jour d'ouverture, tiré des heures de passage de
//   la boutique (Horaires) ; un jour fermé (horaires, « Fermer aujourd'hui », fermeture programmée, pause : Q-39) n'a
//   pas de passage.
// - Chaque commande tombe dans le créneau que donne le serveur (livreur du créneau, REM-02 ; « Plus de temps » qui
//   déborde fait passer au créneau suivant, P-6) : à préparer avant son échéance, ou prête à remettre (code à
//   6 chiffres, VD-06) ; une commande remise aujourd'hui reste visible, avec son heure.
// - Créneau manqué (livreur absent, E9) : il est dit en tête, avec le passage suivant, « Écrire au support » (la
//   conversation garde la référence) et le téléphone du support ; le délai est suspendu jusqu'au nouveau passage
//   (DP-57, P-7), la commande ne compte pas contre la boutique.
// - Anonymat : ni client, ni adresse, ni point de retrait (GEN-01) ; accès Préparation : aucun montant (Q-18).
import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { HEURE, ajouterJours, debutDuJour, jourDe, jourSemaine } from '../../calculs/temps'
import type { Boutique } from '../../donnees/domaines/boutique'
import type { Remise } from '../../donnees/domaines/remise'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { creneau, echeance, heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { BandeauHorsLigne, Bouton, Chargement, ErreurLecture, useAnnonce } from '../VD-11/communs'
import './ajb.css'

const JOURS_ABR = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']
/** « lun–ven », « sam », « lun, mer » → jours de la semaine (lundi = 0). */
export function joursDe(texte: string): number[] {
  const n = (x: string) => JOURS_ABR.indexOf(x.trim().toLowerCase().slice(0, 3))
  const jours = new Set<number>()
  for (const morceau of texte.split(',')) {
    const [a, b] = morceau.split(/[–-]/).map(n)
    if (a < 0) continue
    if (b === undefined || b < 0) jours.add(a)
    else for (let i = a; i <= b; i++) jours.add(i)
  }
  return [...jours]
}

const COURTS = { fr: ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
/** « lun–ven » en mots de la langue (« Mon–Fri ») : jours consécutifs en plage, sinon en liste. */
function nomJours(texte: string, langue: 'fr' | 'en'): string {
  const j = joursDe(texte).sort((a, b) => a - b)
  if (!j.length) return texte
  const suite = j.every((x, i) => i === 0 || x === j[i - 1] + 1)
  return suite && j.length > 2 ? `${COURTS[langue][j[0]]}–${COURTS[langue][j[j.length - 1]]}` : j.map((x) => COURTS[langue][x]).join(', ')
}

const instant = (j: string, hm: string) => debutDuJour(j) + Number(hm.slice(0, 2)) * HEURE + Number(hm.slice(3, 5)) * 60000

type EtatCreneau = 'passe' | 'en_cours' | 'a_venir'
interface Creneau {
  jour: string
  debut: number
  fin: number
  heures: [string, string]
  etat: EtatCreneau
  remises: Remise[]
}
interface JourCalendrier {
  jour: string
  ferme: string | null // raison
  creneau: Creneau | null
}

/** Les sept jours à partir d'aujourd'hui, avec leur passage (ou la raison de son absence). */
function calendrier(b: Boutique, remises: Remise[], maintenant: number): { jours: JourCalendrier[]; plusTard: Remise[] } {
  const auj = jourDe(maintenant)
  const pris = new Set<string>()
  const jours: JourCalendrier[] = []
  for (let i = 0; i < 7; i++) {
    const j = ajouterJours(auj, i)
    const s = jourSemaine(j)
    const h = b.horaires.find((x) => x.jour === s)
    const passage = b.passageLivreur.find((p) => joursDe(p.jours).includes(s))
    const fermeture = b.fermetures.find((f) => f.du <= j && j <= f.au)
    const enPause = b.pause && debutDuJour(j) < b.pause.jusqua && debutDuJour(j) + 24 * HEURE > b.pause.depuis
    const ferme = !h?.ouvert ? 'Boutique fermée ce jour-là' : i === 0 && b.fermeeAujourdhui ? 'Fermée aujourd’hui' : fermeture ? 'Fermeture programmée' : enPause ? 'Boutique en pause' : !passage ? 'Pas de passage ce jour-là' : null
    if (ferme || !passage) {
      jours.push({ jour: j, ferme: ferme ?? 'Pas de passage ce jour-là', creneau: null })
      continue
    }
    const debut = instant(j, passage.de)
    const fin = instant(j, passage.a)
    const dans = remises.filter((r) => {
      const t = r.etape === 'remise' ? r.remiseA : r.livreur?.debut
      const ok = t !== null && t !== undefined && (r.etape === 'remise' ? jourDe(t) === j : t >= debut && t < fin)
      if (ok) pris.add(r.ref)
      return ok
    })
    jours.push({ jour: j, ferme: null, creneau: { jour: j, debut, fin, heures: [passage.de, passage.a], etat: maintenant >= fin ? 'passe' : maintenant >= debut ? 'en_cours' : 'a_venir', remises: dans } })
  }
  const plusTard = remises.filter((r) => !pris.has(r.ref) && r.etape !== 'remise')
  return { jours, plusTard }
}

function LigneColis({ r, maintenant }: { r: Remise; maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  const prete = r.etape === 'prete'
  const remise = r.etape === 'remise'
  return (
    <div className="li ajb-colis" style={{ alignItems: 'flex-start' }}>
      <Vignette nom={r.article.dessin} taille={44} />
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="lt" style={{ display: 'block' }}>
          {`${r.ref} · ${r.article.titre} · ${r.article.variante}`}
        </span>
        <span className="ls" style={{ display: 'block' }}>
          {remise ? tf('Remis au livreur à {h}', { h: heure(r.remiseA ?? maintenant, langue) }) : prete ? tf('Prête · colis {c} · code à donner au livreur', { c: r.colis }) : r.echeance ? tf('À préparer avant {h}', { h: echeance(r.echeance, maintenant, langue) }) : t('À préparer')}
        </span>
        {r.quantite > 1 && <span className="ls">{tf('{n} articles', { n: r.quantite })}</span>}
      </span>
      {remise ? (
        <span className="pill green sm">
          <Icone nom="check" taille={13} />
          {t('Remis')}
        </span>
      ) : prete ? (
        <Link to={chemin('commande_prete', { ref: r.ref })} className="btn primary sm ajb-mini">
          <Icone nom="qr-code" taille={16} />
          <span>{t('Remettre')}</span>
        </Link>
      ) : (
        <Link to={chemin('commande', { ref: r.ref })} className="btn secondary sm ajb-mini">
          <Icone nom="package-check" taille={16} />
          <span>{t('Préparer')}</span>
        </Link>
      )}
    </div>
  )
}

export default function Ramassages() {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge(15_000)
  const naviguer = useNavigate()
  const [params, setParams] = useSearchParams()
  const vue = (['auj', 'dem', 'sem'] as const).find((v) => v === params.get('j')) ?? 'auj'
  const remises = useLecture(() => source.remise.toutes(), [])
  const boutique = useLecture(() => source.boutique.boutique(), [])
  const contacts = useLecture(() => source.aide.contacts(), [])
  const [annonce, dire] = useAnnonce()
  const liste = useMemo(() => (remises.donnees ?? []).filter((r) => r.etape === 'a_preparer' || r.etape === 'prete' || (r.etape === 'remise' && r.remiseA !== null && jourDe(r.remiseA) === jourDe(maintenant))), [remises.donnees, maintenant])
  const cal = useMemo(() => (boutique.donnees ? calendrier(boutique.donnees, liste, maintenant) : null), [boutique.donnees, liste, maintenant])
  const manques = liste.filter((r) => r.erreur === 'absent' && r.creneauManque)
  const prochain = cal?.jours.map((j) => j.creneau).find((c): c is Creneau => !!c && c.etat !== 'passe') ?? null
  const aRemettre = liste.filter((r) => r.etape === 'prete').length
  const aPreparer = liste.filter((r) => r.etape === 'a_preparer').length
  const societe = boutique.donnees?.societeLivraison ?? ''
  const livreur = liste.find((r) => r.livreur)?.livreur ?? null

  const choisir = (v: 'auj' | 'dem' | 'sem') => {
    const p = new URLSearchParams(params)
    if (v === 'auj') p.delete('j')
    else p.set('j', v)
    setParams(p, { replace: true })
  }
  const signaler = async (r: Remise) => {
    const c = r.creneauManque!
    const { fil } = await source.messages.ecrireAuSupport(`Le livreur n’est pas passé ${jourLong(c.debut, 'fr')} entre ${heure(c.debut, 'fr')} et ${heure(c.fin, 'fr')}. Le colis est prêt.`, r.ref)
    jouer('message')
    dire(t('Message envoyé au support.'))
    naviguer(chemin('messages', { fil }))
  }

  const jours = !cal ? [] : vue === 'auj' ? cal.jours.slice(0, 1) : vue === 'dem' ? cal.jours.slice(1, 2) : cal.jours
  const nomJour = (j: string) => {
    const auj = jourDe(maintenant)
    if (j === auj) return t('Aujourd’hui')
    if (j === ajouterJours(auj, 1)) return t('Demain')
    const l = jourLong(debutDuJour(j) + 12 * HEURE, langue)
    return l.charAt(0).toUpperCase() + l.slice(1)
  }
  const erreur = remises.erreur ?? boutique.erreur

  return (
    <Ecran route="ramassages" fixes={annonce}>
      <BandeauHorsLigne texte="Hors connexion : le calendrier gardé sur le téléphone s’affiche ; le livreur passe quand même à l’heure prévue." />
      {erreur && <ErreurLecture erreur={erreur} relire={() => (remises.relire(), boutique.relire())} />}
      {!cal && !erreur && <Chargement />}
      {cal && (
        <>
          <div className="hero night ajb-prochain">
            <div className="kick" style={{ color: 'var(--gold-l)' }}>
              {t('Prochain passage du livreur')}
            </div>
            {prochain ? (
              <>
                <div className="ajb-prochain-h">{`${nomJour(prochain.jour)} · ${creneau(prochain.heures, langue)}`}</div>
                <div className="t13" style={{ color: 'rgba(255,255,255,.78)' }}>
                  {prochain.etat === 'en_cours' ? t('Le livreur peut arriver maintenant : gardez les colis prêts à la porte.') : livreur ? tf('{nom} · {societe}', { nom: livreur.nom, societe: livreur.societe }) : societe}
                </div>
              </>
            ) : (
              <div className="ajb-prochain-h">{t('Aucun passage cette semaine')}</div>
            )}
            <div className="ajb-compteurs">
              <span>
                <b>{aRemettre}</b>
                {t(aRemettre > 1 ? 'colis prêts à remettre' : 'colis prêt à remettre')}
              </span>
              <span>
                <b>{aPreparer}</b>
                {t(aPreparer > 1 ? 'commandes à préparer' : 'commande à préparer')}
              </span>
            </div>
          </div>

          {manques.map((r) => (
            <div key={r.ref} className="note red" role="alert">
              <Icone nom="clock-alert" taille={18} />
              <div className="grow">
                <b>{tf('Créneau manqué : le livreur n’est pas passé {quand}', { quand: `${jourLong(r.creneauManque!.debut, langue)} ${creneau([hhmm(r.creneauManque!.debut), hhmm(r.creneauManque!.fin)], langue)}` })}</b>
                <div className="mt4">{tf('{ref} reste prête. Le délai est suspendu jusqu’au prochain passage : rien ne compte contre vous.', { ref: r.ref })}</div>
                {r.livreur && <div className="mt4">{tf('Nouveau passage : {quand}', { quand: `${jourLong(r.livreur.debut, langue)} ${creneau(r.livreur.creneau, langue)}` })}</div>}
                <div className="row mt8" style={{ gap: '8px', flexWrap: 'wrap' }}>
                  <Bouton classe="secondary sm" icone="headset" onClick={() => void signaler(r)}>
                    {t('Écrire au support')}
                  </Bouton>
                  {contacts.donnees && (
                    <a href={contacts.donnees.telephoneLien} className="btn ghost sm">
                      <Icone nom="phone" taille={16} />
                      <span>{t('Appeler')}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="seg mt14" role="tablist" aria-label={t('Période')} style={{ width: '100%' }}>
            {(
              [
                ['auj', 'Aujourd’hui'],
                ['dem', 'Demain'],
                ['sem', 'Semaine'],
              ] as const
            ).map(([v, l]) => (
              <a key={v} role="tab" tabIndex={0} aria-selected={vue === v} className={vue === v ? 'on' : ''} style={{ height: '44px' }} onClick={() => choisir(v)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), choisir(v))}>
                {t(l)}
              </a>
            ))}
          </div>

          <div className={vue === 'sem' ? 'ajb-semaine' : undefined}>
            {jours.map((j) => (
              <div key={j.jour} className={'card ajb-jour' + (j.creneau?.etat === 'en_cours' ? ' en-cours' : '')}>
                <div className="row" style={{ gap: '10px' }}>
                  <span className={'ajb-date' + (j.ferme ? ' ferme' : '')}>
                    <Icone nom={j.ferme ? 'calendar-x' : 'truck'} taille={18} />
                  </span>
                  <span className="grow">
                    <span className="b8 t15" style={{ display: 'block' }}>
                      {nomJour(j.jour)}
                    </span>
                    <span className="t13 c3">{j.ferme ? t(j.ferme) : `${creneau(j.creneau!.heures, langue)} · ${societe}`}</span>
                  </span>
                  {j.creneau && <span className={'pill sm ' + (j.creneau.etat === 'en_cours' ? 'green' : j.creneau.etat === 'passe' ? 'ink' : 'or')}>{t(j.creneau.etat === 'en_cours' ? 'En cours' : j.creneau.etat === 'passe' ? 'Passé' : 'À venir')}</span>}
                </div>
                {j.creneau && j.creneau.remises.length > 0 && (
                  <div className="mt8">
                    {j.creneau.remises.map((r) => (
                      <LigneColis key={r.ref} r={r} maintenant={maintenant} />
                    ))}
                  </div>
                )}
                {j.creneau && j.creneau.remises.length === 0 && <p className="t13 c3" style={{ margin: '10px 0 0' }}>{t('Rien à remettre pour ce passage pour le moment.')}</p>}
              </div>
            ))}
          </div>

          {vue === 'sem' && cal.plusTard.length > 0 && (
            <div className="card">
              <h3>{t('Plus tard')}</h3>
              {cal.plusTard.map((r) => (
                <LigneColis key={r.ref} r={r} maintenant={maintenant} />
              ))}
            </div>
          )}

          <div className="card tight">
            <Link to={chemin('horaires')} className="li" style={{ minHeight: '56px' }}>
              <span className="ic">
                <Icone nom="clock" taille={19} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Heures de passage du livreur')}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {boutique.donnees!.passageLivreur.map((p) => `${nomJours(p.jours, langue)} ${creneau([p.de, p.a], langue)}`).join(' · ')}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to={chemin('commandes', { f: 'prep' })} className="li" style={{ minHeight: '56px' }}>
              <span className="ic">
                <Icone nom="shopping-bag" taille={19} />
              </span>
              <span className="grow lt">{t('Toutes les commandes à préparer')}</span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to={chemin('apprendre', { fiche: 'colis' })} className="li" style={{ minHeight: '56px' }}>
              <span className="ic">
                <Icone nom="graduation-cap" taille={19} />
              </span>
              <span className="grow lt">{t('Bien préparer un colis')}</span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>

          {contacts.donnees && (
            <div className="card">
              <h3>{t('Le livreur n’est pas venu ?')}</h3>
              <p className="t13 c2" style={{ margin: '6px 0 10px', lineHeight: 1.45 }}>
                {tf('Attendez la fin du créneau, puis prévenez le support : première réponse en {h} h au plus, de {de} à {a}.', { h: contacts.donnees.delaiReponseH, de: heure(contacts.donnees.horaires[0], langue), a: heure(contacts.donnees.horaires[1], langue) })}
              </p>
              <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                <Bouton classe="secondary sm" icone="headset" vers={chemin('messages', { fil: 'support', sujet: 'ramassage' })}>
                  {t('Écrire au support')}
                </Bouton>
                <a href={contacts.donnees.telephoneLien} className="btn ghost sm" aria-label={tf('Appeler BelivaY au {tel}', { tel: contacts.donnees.telephone })}>
                  <Icone nom="phone" taille={16} />
                  <span className="nw">{contacts.donnees.telephone}</span>
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </Ecran>
  )
}

/** « 14:00 » d'un instant (heure de Yaoundé). */
function hhmm(ms: number): string {
  const d = new Date(ms + HEURE)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}
