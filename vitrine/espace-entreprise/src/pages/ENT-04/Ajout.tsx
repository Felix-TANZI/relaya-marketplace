// ENT-P07 · Ajouter un livreur (propriétaire et répartiteur). Formulaire : nom et prénom, téléphone +237 (9 chiffres =
// numéro de connexion du livreur, ENT-DOC-06), véhicule (type, plaque), capacité, zones de l'entreprise. L'invitation
// part par SMS (nom de l'entreprise et lien de l'application), valable expiration_invitation_livreur jours tant
// qu'elle n'est pas ouverte (ENT-P07R-03) ; aucune pièce n'est envoyée par l'entreprise à la place du livreur
// (ENT-P07R-04). Numéro déjà rattaché ailleurs : refusé (409) ; numéro exclu : refus sans motif détaillé, la console
// est alertée (ENT-RG-R70). Suivi de chaque invité : Invitation · Charte · Pièces · Certification · Approbation ·
// Activé (ENT-RG-R73) ; approuver seulement quand pièces et certification sont validées (ENT-RG-R74) ; renvoyer,
// demander de renvoyer une pièce, abandonner.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { COORDONNEES } from '@client/config/coordonnees'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { ETAPES_INVITATION, type EtapeInvitation, type Invitation, type RefusInvitation } from '../../donnees/domaines/flotte'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { PARAMETRES_FLOTTE, TYPES_VEHICULE, type TypeVehicule } from '../../calculs/flotte'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import { Etape, Hint, Kv, Note, Panel, Pill, Sec, Vide, type Ton } from '../../composants/prototype'
import { Chargement, ErreurLecture, NOM_CLASSE, NOM_VEHICULE, telLisible, useDates } from '../ENT-03/outils'
import { Ecran } from '../../composants/coque'

const P = PARAMETRES_FLOTTE
const NOM_ETAPE: Record<EtapeInvitation, string> = { invitation: 'Invitation', charte: 'Charte', pieces: 'Pièces', certification: 'Certification', approbation: 'Approbation', active: 'Activé' }
const REFUS: Record<RefusInvitation, string> = {
  telephone: 'Numéro invalide : 9 chiffres après +237, commençant par 6.',
  doublon: 'Ce numéro a déjà une invitation en cours ou appartient déjà à l’un de vos livreurs.',
  nom: 'Écrivez le nom et le prénom du livreur.',
  autre_entreprise: 'Ce numéro appartient à un livreur actif d’une autre entreprise : un livreur n’est rattaché qu’à une entreprise à la fois.',
  refuse: 'Ce numéro ne peut pas être invité. Contactez le support BelivaY si vous pensez qu’il s’agit d’une erreur.',
  zones: 'Choisissez au moins une de vos zones.',
  capacite: 'Capacité : un nombre entier de colis, au moins 1.',
  plaque: 'Plaque invalide ou déjà déclarée (ex. : LT 220 CD).',
}

function Suivi({ i, maintenant }: { i: Invitation; maintenant: number }) {
  const { t, tf } = usePreferences()
  const { date, dateHeure } = useDates()
  const [msg, setMsg] = useState<string | null>(null)
  const act = async (f: () => Promise<{ ok: boolean; raison?: string }>, reussi: string) => {
    const r = await f()
    jouer(r.ok ? 'interrupteur' : 'erreur')
    setMsg(r.ok ? reussi : r.raison === 'trop_tot' ? t('Invitation déjà renvoyée il y a moins d’une minute.') : r.raison === 'pas_pret' ? t('Pas encore prêt : pièces vérifiées et certification réussie d’abord.') : t('Ce geste n’est plus possible pour cette invitation.'))
  }
  const n = ETAPES_INVITATION.indexOf(i.etape ?? 'invitation')
  const pret = i.statut === 'acceptee' && i.etape === 'approbation'
  const [titre, ton, texte]: [string, Ton, string] =
    i.statut === 'expiree'
      ? [t('Invitation expirée'), 'red', tf('Envoyée le {d} et jamais ouverte : renvoyez-la.', { d: dateHeure(i.envoyeeLe) })]
      : i.statut === 'refusee'
        ? [t('Refusé par BelivaY'), 'red', i.refus ?? '']
        : i.statut === 'envoyee'
          ? [t('Invitation envoyée'), 'blue', tf('SMS envoyé le {d} · expire le {e} si l’invité ne l’ouvre pas', { d: dateHeure(i.envoyeeLe), e: dateHeure(i.expireLe) })]
          : pret
            ? [t('Prêt à approuver'), 'green', i.quiz != null ? tf('Pièces vérifiées · certification réussie ({q} sur {s}) · il ne manque que votre approbation', { q: i.quiz, s: P.quizSur }) : t('Il ne manque que votre approbation')]
            : [t('Activation en cours'), 'amber', `${i.ouverteLe ? tf('Invitation ouverte le {d} : elle n’expire plus', { d: date(i.ouverteLe) }) : ''}${i.quiz != null ? ' · ' + tf('quiz {q}/{s}', { q: i.quiz, s: P.quizSur }) : ''}`]
  return (
    <li className={'card ' + (i.statut === 'refusee' || i.statut === 'expiree' ? 'bad' : 'acc')}>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <span className="who">
          <span className="av">{i.nom.split(' ').map((x) => x[0]).slice(0, 2).join('')}</span>
          <span>
            <b>{i.nom}</b>
            <span>{[telLisible(i.telephone), i.vehicule ? `${t(NOM_VEHICULE[i.vehicule.type])} ${i.vehicule.plaque}` : null, (i.zones ?? []).join(', ')].filter(Boolean).join(' · ')}</span>
          </span>
        </span>
        <span className="grow"></span>
        <Pill ton={ton} dot sm>
          {titre}
        </Pill>
      </div>
      <div className="stepper" role="list" aria-label={tf('Suivi de {nom}', { nom: i.nom })}>
        {ETAPES_INVITATION.map((e, k) => {
          const st = i.statut === 'activee' || k < n ? 'done' : k === n ? (i.statut === 'refusee' ? 'bad' : 'cur') : ''
          return (
            <div key={e} role="listitem" className={'st ' + st} aria-current={k === n ? 'step' : undefined}>
              <b>{st === 'done' ? <Icone nom="check" taille={14} trait={3} /> : st === 'bad' ? <Icone nom="x" taille={14} trait={3} /> : k + 1}</b>
              <span>{t(NOM_ETAPE[e])}</span>
            </div>
          )
        })}
      </div>
      <div className="row mt14" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="grow">
          <div className="b8 t15">{titre}</div>
          {texte && (
            <div className="t13 c3 mt4 lh" style={i.statut === 'refusee' ? { color: 'var(--red)', fontWeight: 700 } : undefined}>
              {i.statut === 'refusee' ? tf('Motif : {m}', { m: texte }) : texte}
            </div>
          )}
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {(i.statut === 'envoyee' || i.statut === 'expiree') && (
            <button type="button" className="btn sm secondary" onClick={() => void act(() => source.flotte.renvoyer(i.id), tf('Nouvelle invitation envoyée : valable jusqu’au {d}.', { d: date(maintenant + P.invitationJours * 86_400_000) }))}>
              <Icone nom="rotate-cw" taille={18} />
              <span>{t('Renvoyer')}</span>
            </button>
          )}
          {pret && (
            <button type="button" className="btn sm primary" onClick={() => void act(() => source.flotte.approuver(i.id), t('Approuvé : BelivaY a activé son accès.'))}>
              <Icone nom="user-round-check" taille={18} />
              <span>{tf('Approuver {nom}', { nom: i.nom })}</span>
            </button>
          )}
          {i.statut === 'refusee' && (
            <button type="button" className="btn sm primary" onClick={() => void act(() => source.flotte.renvoyer(i.id), t('Le livreur est invité à renvoyer sa pièce depuis son application.'))}>
              <Icone nom="send" taille={18} />
              <span>{t('Demander de renvoyer la pièce')}</span>
            </button>
          )}
          {i.livreurId && !pret && i.etape === 'pieces' && (
            <Link className="btn sm primary" to={chemin('pieces', { id: i.livreurId })}>
              <Icone nom="id-card" taille={18} />
              <span>{t('Contrôler les pièces')}</span>
            </Link>
          )}
          {i.livreurId && !pret && (
            <Link className="btn sm secondary" to={chemin('livreur', { id: i.livreurId })}>
              <Icone nom="eye" taille={18} />
              <span>{t('Suivre')}</span>
            </Link>
          )}
          {i.statut !== 'activee' && (
            <button type="button" className={'btn sm ' + (i.statut === 'refusee' ? 'danger' : 'ghost')} onClick={() => void act(() => source.flotte.abandonner(i.id), t('Invitation abandonnée.'))}>
              <Icone nom="x" taille={18} />
              <span>{t('Abandonner')}</span>
            </button>
          )}
        </div>
      </div>
      {msg && (
        <div className="hint-l" role="status">
          <Icone nom="info" taille={15} />
          <span>{msg}</span>
        </div>
      )}
    </li>
  )
}

const CLE_BROUILLON = 'blv_e_brouillon_ajout'
interface Brouillon {
  nom: string
  tel: string
  type: TypeVehicule
  plaque: string
  capacite: string
  zs: string[]
}
function lireBrouillon(): Brouillon | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(CLE_BROUILLON) ?? 'null') as Brouillon | null
    return v && typeof v.nom === 'string' && Array.isArray(v.zs) ? v : null
  } catch {
    return null
  }
}

export default function Ajout() {
  const { t, tf } = usePreferences()
  const { date } = useDates()
  const maintenant = useHorloge()
  const nomEntreprise = useSession().entreprise?.nom ?? ''
  const zones = useLecture(() => source.zones.zones())
  const invitations = useLecture(() => source.flotte.invitations())
  // Brouillon (M8) : une invitation commencée est gardée le temps de l'onglet (sessionStorage : un numéro ne reste pas
  // sur l'appareil après la visite) et reprise au retour ; envoyée ou effacée, elle disparaît.
  const [brouillon] = useState(lireBrouillon)
  const [nom, setNom] = useState(brouillon?.nom ?? '')
  const [tel, setTel] = useState(brouillon?.tel ?? '')
  const [type, setType] = useState<TypeVehicule>(brouillon?.type ?? 'moto')
  const [plaque, setPlaque] = useState(brouillon?.plaque ?? '')
  const [capacite, setCapacite] = useState(brouillon?.capacite ?? '')
  const [zs, setZs] = useState<string[]>(brouillon?.zs ?? [])
  const [repris, setRepris] = useState(!!brouillon)
  useEffect(() => {
    const vide = !nom && !tel && !plaque && !capacite && zs.length === 0
    try {
      if (vide) sessionStorage.removeItem(CLE_BROUILLON)
      else sessionStorage.setItem(CLE_BROUILLON, JSON.stringify({ nom, tel, type, plaque, capacite, zs }))
    } catch {
      /* stockage indisponible : pas de brouillon */
    }
  }, [nom, tel, type, plaque, capacite, zs])
  const [refus, setRefus] = useState<RefusInvitation | null>(null)
  const [envoyee, setEnvoyee] = useState<Invitation | null>(null)
  const [encours, setEncours] = useState(false)
  const chiffres = tel.replace(/\D/g, '')
  const telOk = /^6\d{8}$/.test(chiffres)
  const n = Number(capacite)
  const valide = nom.trim().length >= 2 && telOk && plaque.trim().length >= 5 && Number.isInteger(n) && n >= 1 && zs.length > 0
  const envoyer = async () => {
    setEncours(true)
    setRefus(null)
    const r = await source.flotte.inviter(nom, `+237 ${chiffres}`, { vehicule: { type, plaque }, capacite: n, zones: zs })
    setEncours(false)
    if (!r.ok) {
      setRefus(r.raison)
      jouer('erreur')
      return
    }
    jouer('envoi')
    setEnvoyee(r.invitation)
    effacerBrouillon()
  }
  const effacerBrouillon = () => {
    setRepris(false)
    try {
      sessionStorage.removeItem(CLE_BROUILLON)
    } catch {
      /* rien */
    }
  }
  const recommencer = () => {
    setEnvoyee(null)
    setNom('')
    setTel('')
    setPlaque('')
    setCapacite('')
    setZs([])
  }
  const liste = invitations.donnees ?? []
  const refusNumero = refus === 'refuse' || refus === 'autre_entreprise' || refus === 'doublon' || refus === 'telephone'
  const ICONE_TYPE: Record<TypeVehicule, string> = { moto: 'bike', tricycle: 'truck', voiture: 'car', camionnette: 'truck' } as Record<TypeVehicule, string>

  return (
    <Ecran
      route="ajout"
      actions={
        <Link className="btn secondary" to={chemin('flotte')}>
          <Icone nom="chevron-left" taille={18} />
          <span>{t('Retour aux livreurs')}</span>
        </Link>
      }
    >
      {(zones.erreur || invitations.erreur) && <ErreurLecture erreur={(zones.erreur ?? invitations.erreur)!} relire={() => (zones.relire(), invitations.relire())} />}
      {envoyee && (
        <div className="dk-banner acc" role="status">
          <Icone nom="circle-check" taille={20} />
          <div className="grow">
            <b>{tf('Invitation envoyée à {nom} par SMS.', { nom: envoyee.nom })}</b> {tf('Elle expire le {d} si elle n’est pas ouverte. Vous suivez ici chaque étape de son activation.', { d: date(envoyee.expireLe, true) })}
          </div>
        </div>
      )}
      {refus && (refus === 'refuse' || refus === 'autre_entreprise') && (
        <div className="dk-banner red" role="alert">
          <Icone nom="ban" taille={20} />
          <div className="grow">
            <b>{t('Invitation impossible pour ce numéro.')}</b> {t(REFUS[refus])}
          </div>
          <a className="btn secondary" href={COORDONNEES.whatsapp} target="_blank" rel="noreferrer">
            <Icone nom="headset" taille={18} />
            <span>{t('Contacter le support')}</span>
          </a>
        </div>
      )}
      <div className="g g21" style={{ alignItems: 'start' }}>
        {envoyee ? (
          <Panel titre={t('Invitation envoyée')} icone="user-plus">
            <Kv k={t('Nom et prénom')} v={envoyee.nom} />
            <Kv k={t('Téléphone')} v={telLisible(envoyee.telephone)} />
            {envoyee.vehicule && <Kv k={t('Véhicule')} v={`${t(NOM_VEHICULE[envoyee.vehicule.type])} · ${envoyee.vehicule.plaque}`} />}
            <Kv k={t('Zones')} v={(envoyee.zones ?? []).join(', ')} />
            <div className="t13 c3 mt8 lh">{tf('Un SMS est parti vers {tel} avec le nom de votre entreprise et le lien de l’application BelivaY Livreur. Il est valable jusqu’au {d} tant qu’il n’est pas ouvert.', { tel: telLisible(envoyee.telephone), d: date(envoyee.expireLe, true) })}</div>
            <div className="btns">
              <button type="button" className="btn secondary" onClick={recommencer}>
                <Icone nom="user-plus" taille={18} />
                <span>{t('Inviter un autre livreur')}</span>
              </button>
            </div>
            <Hint icone="eye-off">{tf('Le livreur complète lui-même ses pièces et sa certification : {e} n’envoie jamais de pièce d’identité à sa place.', { e: nomEntreprise })}</Hint>
          </Panel>
        ) : (
          <Panel titre={t('Nouveau livreur')} icone="user-plus">
            {repris && (
              <Note ton="acc" icone="history" className="mt10">
                {t('Votre invitation commencée a été reprise.')}{' '}
                <button type="button" className="lien-b" onClick={() => (recommencer(), effacerBrouillon())}>
                  {t('Tout effacer')}
                </button>
              </Note>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (valide && !encours) void envoyer()
              }}
            >
              <div className="fld" style={{ marginTop: 0 }}>
                <label>
                  {t('Nom et prénom')} <span className="req">*</span>
                  <span className={'inp' + (refus === 'nom' ? ' err' : '')}>
                    <Icone nom="user-round" taille={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                    <input value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="off" placeholder={t('Nom et prénom du livreur')} aria-label={t('Nom et prénom')} />
                  </span>
                </label>
              </div>
              <div className="fld">
                <label>
                  {t('Téléphone')} <span className="req">*</span>
                  <span className={'inp' + (refusNumero || (tel !== '' && !telOk) ? ' err' : '')}>
                    <Icone nom="phone" taille={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                    <b className="t14">+237</b>
                    <input type="tel" inputMode="numeric" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="6XX XX XX XX" aria-invalid={tel !== '' && !telOk} aria-label={t('Téléphone (numéro de connexion du livreur)')} />
                  </span>
                </label>
                <div className={'hint' + (refusNumero ? ' err' : '')} role={refusNumero && refus !== 'refuse' && refus !== 'autre_entreprise' ? 'alert' : undefined}>
                  {refusNumero ? t(REFUS[refus!]) : t('Numéro de connexion du livreur : 9 chiffres après +237, commençant par 6. Il reçoit l’invitation par SMS.')}
                </div>
              </div>
              <div className="fld" role="radiogroup" aria-label={t('Véhicule')}>
                <span className="lbl">
                  {t('Véhicule')} <span className="req">*</span>
                </span>
                <div className="entA-seg4">
                  {TYPES_VEHICULE.map((v) => (
                    <label key={v}>
                      <input type="radio" name="type-vehicule" checked={type === v} onChange={() => setType(v)} />
                      <Icone nom={ICONE_TYPE[v] ?? 'truck'} taille={24} />
                      {t(NOM_VEHICULE[v])}
                    </label>
                  ))}
                </div>
                <div className="hint">{tf('Classes : {c}', { c: P.classes[type].map((c) => t(NOM_CLASSE[c])).join(', ') })}</div>
              </div>
              <div className="g g2" style={{ marginTop: 0, gap: 12 }}>
                <div className="fld">
                  <label>
                    {t('Plaque')}
                    <span className={'inp' + (refus === 'plaque' ? ' err' : '')}>
                      <input value={plaque} onChange={(e) => setPlaque(e.target.value.toUpperCase())} placeholder="CE 000 XX" autoComplete="off" aria-label={t('Plaque')} />
                    </span>
                  </label>
                </div>
                <div className="fld">
                  <label>
                    {t('Capacité')}
                    <span className={'inp' + (refus === 'capacite' ? ' err' : '')}>
                      <input type="number" inputMode="numeric" min={1} value={capacite} onChange={(e) => setCapacite(e.target.value)} aria-label={t('Capacité par jour (colis)')} />
                      <span className="suf">{t('colis')}</span>
                    </span>
                  </label>
                </div>
              </div>
              <div className="fld">
                <span className="lbl">
                  {t('Zones')} <span className="req">*</span>
                </span>
                {zones.donnees && zones.donnees.length === 0 ? (
                  <div className="hint">
                    {t('Déclarez d’abord une zone.')} <Link to={chemin('zones')}>{t('Zones et capacité')}</Link>
                  </div>
                ) : (
                  <div className="entA-chk">
                    {(zones.donnees ?? []).map((z) => (
                      <label key={z.code}>
                        <input type="checkbox" checked={zs.includes(z.code)} onChange={(e) => setZs((x) => (e.target.checked ? [...x, z.code] : x.filter((c) => c !== z.code)))} />
                        {zs.includes(z.code) && <Icone nom="check" taille={14} />}
                        {`${z.code} ${z.nom}`}
                      </label>
                    ))}
                  </div>
                )}
                {refus === 'zones' && <div className="hint err">{t(REFUS.zones)}</div>}
              </div>
              <div className="btns">
                <button type="submit" className="btn primary" disabled={!valide || encours}>
                  <Icone nom="send" taille={18} />
                  <span>{t('Envoyer l’invitation par SMS')}</span>
                </button>
              </div>
              <Hint icone="eye-off">{tf('Le livreur complète lui-même ses pièces et sa certification : {e} n’envoie jamais de pièce d’identité à sa place.', { e: nomEntreprise })}</Hint>
            </form>
          </Panel>
        )}
        <Panel titre={t('Ce qui se passe ensuite')} icone="route">
          <Etape n={1} titre={t('Invitation par SMS')} sous={tf('Le nom de votre entreprise et un lien vers l’application livreur. Elle expire après {n} jours si elle n’est pas ouverte.', { n: P.invitationJours })} />
          <Etape n={2} titre={t('Charte et code PIN')} sous={t('Le livreur accepte la charte et les conditions d’accès.')} />
          <Etape n={3} titre={t('Pièces, envoyées par le livreur')} sous={t('Pièce d’identité, selfie avec preuve de vie, permis adapté, carte grise et photo du véhicule avec la plaque.')} />
          <Etape n={4} titre={t('Contrôle des pièces par votre entreprise')} sous={t('Vous ouvrez chaque pièce, la validez ou la refusez avec un motif ; BelivaY écarte d’office une pièce illisible ou un numéro en liste noire.')} />
          <Etape n={5} titre={t('Certification BelivaY')} sous={tf('Des modules courts et un quiz : {q} bonnes réponses sur {s} au moins.', { q: P.quizMin, s: P.quizSur })} />
          <Etape n={6} titre={t('Votre approbation, puis l’activation')} sous={t('Vous approuvez ; BelivaY active l’accès si pièces et certification sont valides.')} />
          <Note ton="red" icone="ban">
            {t('Interdit : inscrire un livreur mineur ou sans permis adapté ; inviter une personne pour lui prêter un compte.')}
          </Note>
        </Panel>
      </div>

      <Sec t={t('Suivi des invitations')} id="suivi" />
      {!invitations.donnees ? (
        !invitations.erreur && <Chargement lignes={2} />
      ) : liste.length === 0 ? (
        <Panel>
          <Vide icone="send" t={t('Aucune invitation en cours')} s={t('Les livreurs invités apparaissent ici jusqu’à leur activation.')} />
        </Panel>
      ) : (
        <ul className="e-suivi">
          {liste.map((i) => (
            <Suivi key={i.id} i={i} maintenant={maintenant} />
          ))}
        </ul>
      )}

      <div className="g g3">
        <Panel titre={t('Numéro refusé')} icone="phone-off">
          <div className="t13 c2 lh">{t('Un numéro déjà rattaché à un livreur actif d’une autre entreprise est refusé. Un numéro ou une pièce en liste noire est refusé sans motif détaillé ; la console est alertée.')}</div>
        </Panel>
        <Panel titre={tf('Invitation de {n} jours', { n: P.invitationJours })} icone="hourglass">
          <div className="t13 c2 lh">{tf('Une invitation non utilisée expire après {n} jours. Elle contient le nom de l’entreprise et un lien vers l’application livreur ; vous pouvez la renvoyer.', { n: P.invitationJours })}</div>
        </Panel>
        <Panel titre={t('Certification obligatoire')} icone="graduation-cap">
          <div className="t13 c2 lh">{tf('Aucune approbation sans certification réussie : {q} bonnes réponses sur {s} au moins. Aucun livreur n’est actif sans pièces vérifiées, certification et votre approbation.', { q: P.quizMin, s: P.quizSur })}</div>
        </Panel>
      </div>
    </Ecran>
  )
}
