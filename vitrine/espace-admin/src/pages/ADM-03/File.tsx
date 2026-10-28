// File d'action (ADM-P02, accueil de chaque rôle) : ce qui demande une décision humaine, du plus urgent au moins urgent.
// Structure du prototype gardée : filtres par type avec compteurs, colonne gauche des cartes typées (type, titre,
// contexte, ancienneté, échéance, verrou, montant), colonne droite du dossier ouvert (collante), indicateurs en bas
// seulement (en grand quand la file est vide) ; états surcharge (bandeau, « En retard · N », déléguer), vide, hors
// périmètre. Enrichi : TOUTES les files de travail de la console (identités, candidatures, litiges 1 et 2, retours,
// remboursements, départs échus, pièces, kits contestés, fraude, quatre yeux), chaque carte menant à l'écran qui
// décide ; tri de la source (retards d'abord, échéance, montant) ; verrou réel (ADM-VERROU-MIN) ; délégation journalisée.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Heure } from '../../composants/LigneJournal'
import { Anneau, Banniere, Kpi, Note, Pill, Rebours, useLarge, useSurtitre } from '../../composants/prototype'
import { fonctionsDuRole } from '../../config/fonctions'
import { NOM_ROLE, PERIMETRE_ROLE } from '../../config/libelles'
import { chemin } from '../../config/pages'
import type { CarteAction, FamilleCarte, IndicateursFile } from '../../donnees/domaines/files'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useDroit, useHorloge, usePerimetre, useSession } from '../../session'
import { PARAMETRES } from '../../calculs/registre'
import { ChainePreuves, Depuis, Echeance, FAMILLES, Lk } from './kit'
import { REGLES_S1 } from './regles'

const HORS: Partial<Record<string, string>> = {
  finance: 'Litiges, messages, identités, relais, paquets et fraude ne sont ni affichés ni envoyés à ce poste. Le serveur filtre avant l’envoi : masquer à l’écran ne suffit pas.',
  support: 'Recours, argent, identités, paquets et fraude ne sont ni affichés ni envoyés à ce poste : le serveur filtre avant l’envoi.',
  mediation: 'Argent, identités, paquets et messages ne sont ni affichés ni envoyés à ce poste : le serveur filtre avant l’envoi.',
  operations: 'Seules les cartes de vos zones arrivent ici, jamais l’argent : le serveur filtre avant l’envoi.',
  verification: 'Litiges, argent, paquets et fraude ne sont ni affichés ni envoyés à ce poste : le serveur filtre avant l’envoi.',
  audit: 'Seules les alertes de fraude et les contrôles arrivent ici ; aucune décision depuis ce poste.',
}

function Carte({ c, choisie, ouvrir, compacte }: { c: CarteAction; choisie: boolean; ouvrir: () => void; compacte?: boolean }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const n = useHorloge()
  const ty = FAMILLES[c.famille]
  const late = c.echeance !== null && c.echeance <= n
  const autre = c.verrou && c.verrou.agentId !== s.agent?.id
  return (
    <button type="button" className={['admA-q', choisie && 'sel', late && 'late', autre && 'locked', compacte && 'compact'].filter(Boolean).join(' ')} style={{ ['--qc' as string]: ty.c, ['--qt' as string]: ty.x }} onClick={ouvrir} aria-pressed={choisie} aria-label={tf('{type} : {titre}', { type: t(ty.t), titre: c.titre })}>
      <div className="r1">
        <span className="ty">
          <Icone nom={ty.i} taille={14} />
          {t(ty.t)}
        </span>
        {c.alerte && (
          <Pill ton="red" sm>
            {c.alerte}
          </Pill>
        )}
        <Depuis le={c.creeeLe} />
      </div>
      <div className="tt">{c.titre}</div>
      {!compacte && <div className="cx">{c.sous}</div>}
      <div className="r3">
        <Echeance fin={c.echeance} />
        {c.verrou && <Lk>{c.verrou.agentId === s.agent?.id ? <>{t('Vous · jusqu’à')} <Heure le={c.verrou.jusqua} /></> : tf('En cours · {agent}', { agent: c.verrou.agent })}</Lk>}
        {c.confieA && (
          <Pill ton="ink" sm icone="split">
            {tf('Confiée à {nom}', { nom: c.confieA })}
          </Pill>
        )}
        {c.montant !== null && c.montant > 0 && <span className="amt">{`${F(c.montant)} F`}</span>}
      </div>
    </button>
  )
}

/** Dossier ouvert (colonne droite) : résumé, compte à rebours, preuves et croisement pour un litige, accès au dossier. */
function Dossier({ c, fermer, refus }: { c: CarteAction; fermer: () => void; refus: boolean }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const n = useHorloge()
  const litige = useLecture(() => (c.route === 'litige' ? source.litiges.litige(c.objet) : Promise.resolve(null)), [c.objet, c.route])
  const l = litige.donnees
  const moi = c.verrou?.agentId === s.agent?.id
  const ty = FAMILLES[c.famille]
  const vendeurAttendu = l && l.etat === 'ouvert'
  return (
    <section className="panel admA-dos" aria-label={t('Dossier ouvert')}>
      <div className="row wrap" style={{ gap: 6 }}>
        <Pill ton={c.famille === 'litige' || c.famille === 'fraude' ? 'red' : c.famille === 'recours' ? 'violet' : 'acc'} dot sm>
          {t(ty.t)}
        </Pill>
        {c.alerte && (
          <Pill ton="amber" sm>
            {c.alerte}
          </Pill>
        )}
        {c.verrou && (moi ? <Lk>{t('Vous traitez ce dossier · jusqu’à')} <Heure le={c.verrou.jusqua} /></Lk> : <Lk>{tf('En cours de traitement par {agent}', { agent: c.verrou.agent })}</Lk>)}
      </div>
      <h3 className="mt8">{c.titre}</h3>
      <div className="t13 c3 mt4">{c.sous}</div>
      {refus && (
        <Note ton="amber" icone="lock" className="mt10">
          {tf('{agent} traite ce dossier : vous le voyez en lecture, sans pouvoir le prendre avant la fin de son verrou ({min} min sans activité).', { agent: c.verrou?.agent ?? '', min: REGLES_S1.verrouMin })}
        </Note>
      )}
      {l && (
        <div className="row mt12" style={{ gap: 12 }}>
          <div className="grow">
            <div className="b8 t15">{l.article}</div>
            <div className="t12 c3 mt4">{l.trajet}</div>
          </div>
          {c.montant !== null && (
            <div className="right">
              <div className="b8" style={{ fontSize: 20 }}>{`${F(l.montantEnJeu)} F`}</div>
              <div className="t12 cr b7">{t(l.escrow)}</div>
            </div>
          )}
        </div>
      )}
      <div className="hr"></div>
      <div className="admA-cnt">
        {c.echeance !== null && <Anneau v={Math.max(0, Math.min(1, (c.echeance - n) / ((vendeurAttendu ? REGLES_S1.vendeurH : 24) * 3_600_000))) * 100} couleur={c.echeance <= n ? 'var(--red)' : 'var(--braise-1)'} taille={84} libelle={<span className="admA-ringl"><Rebours fin={c.echeance} echu={t('Dépassée')} icone={false} /></span>} aria={t('Temps restant avant l’échéance')} />}
        <div className="grow t13 c2 lh">
          {vendeurAttendu ? (
            <>
              {t('Réponse du vendeur attendue avant')} <b><Heure le={l.echeanceVendeur} /></b>.{' '}
              {tf('À {h} h sans réponse : arbitrage prioritaire, présomption en faveur du client ; la décision reste humaine et motivée.', { h: REGLES_S1.vendeurH })}
            </>
          ) : c.echeance === null ? (
            t('Sans échéance : à traiter dans l’ordre de la file, sans être oublié.')
          ) : c.echeance <= n ? (
            t('Échéance dépassée : la carte reste en tête, en rouge, et entre dans l’indicateur de délai de service.')
          ) : (
            t('Décision attendue avant l’échéance ; au-delà, la carte passe en tête, en rouge.')
          )}
        </div>
      </div>
      {l && (
        <>
          <div className="divide">{tf('Chaîne de preuves · {n} éléments', { n: l.preuves.length })}</div>
          <ChainePreuves preuves={l.preuves} />
          <div className="divide">{t('Croisement des parties')}</div>
          <table className="admA-xt">
            <thead>
              <tr>
                {l.croisement.colonnes.map((h, i) => (
                  <th key={i}>{i === 0 ? t(h) : h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {l.croisement.lignes.slice(0, 4).map((r, i) => (
                <tr key={i}>
                  {r.map((x, j) => (
                    <td key={j}>{j === 0 ? t(x) : x}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {vendeurAttendu && (
            <Note ton="ink" icone="info" className="mt10">
              {tf('Aucune décision avant la réponse du vendeur ou la fin des {h} h : attendre ou compléter le dossier. Le gel prime sur tout compte à rebours.', { h: REGLES_S1.vendeurH })}
            </Note>
          )}
        </>
      )}
      <div className="btns mt14">
        <Link className="btn primary" to={chemin(c.route, c.params)}>
          <Icone nom={ty.i} taille={18} />
          <span>{t('Ouvrir le dossier complet')}</span>
        </Link>
        {(c.famille === 'litige' || c.famille === 'recours' || c.famille === 'support') && (
          <Link className="btn secondary" to={chemin('messagerie', { objet: c.objet })}>
            <Icone nom="messages-square" taille={18} />
            <span>{t('Messagerie du dossier')}</span>
          </Link>
        )}
      </div>
      <div className="links" style={{ justifyContent: 'flex-start' }}>
        <button type="button" className="lnk" onClick={fermer}>
          <Icone nom="lock-open" taille={14} style={{ verticalAlign: -2 }} /> {moi ? t('Fermer le dossier et libérer le verrou') : t('Fermer le dossier')}
        </button>
      </div>
    </section>
  )
}

function Indicateurs({ i, grand }: { i: IndicateursFile; grand: boolean }) {
  const { t, tf } = usePreferences()
  const delta = i.litigesOuverts - i.litigesVeille
  const j = i.jour
  const D = ({ k, v, s, nuit, to }: { k: string; v: string; s: string; nuit?: boolean; to?: string }) => {
    const corps = (
      <>
        <div className="k">{t(k)}</div>
        <div className="v">{v}</div>
        <div className="s">{t(s)}</div>
      </>
    )
    return to ? (
      <Link className={'d' + (nuit ? ' n' : '')} to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
        {corps}
      </Link>
    ) : (
      <div className={'d' + (nuit ? ' n' : '')}>{corps}</div>
    )
  }
  return (
    <>
      <div className={'g g4' + (grand ? ' admA-big' : '')}>
        <Kpi k={t('Litiges ouverts')} v={i.litigesOuverts} s={<>{delta !== 0 && <span className={'delta ' + (delta > 0 ? 'down' : 'up')}><Icone nom={delta > 0 ? 'trending-up' : 'trending-down'} taille={13} /> {delta > 0 ? `+${delta}` : delta}</span>} {t('par rapport à la veille')}</>} icone="scale" iton="red" to={chemin('litige')} />
        <Kpi k={t('Délai médian d’arbitrage')} v={i.delaiMedianH ?? '—'} u={i.delaiMedianH !== null ? 'h' : undefined} s={tf('Médiane sur 7 jours · {n} dossiers décidés', { n: i.decides7j })} icone="timer" />
        <Kpi k={t('Coût SMS par commande')} v={i.coutSmsParCommande ?? '—'} u={i.coutSmsParCommande !== null ? 'F' : undefined} s={i.coutSmsParCommande === null ? t('Journal des envois pas encore relié : rien n’est estimé') : t('Envois du jour ÷ commandes')} icone="send" iton="or" to={chemin('messagerie')} />
        <Kpi k={t('Zones en alerte')} v={i.zonesEnAlerte} u={`/ ${i.zonesExploitees}`} s={t('Paquet en retard ou en incident, ou relais au seuil de capacité')} icone="map-pinned" iton="amber" to={chemin('direct')} />
      </div>
      <div className="admA-day">
        <D k="Commandes" v={String(j.commandes)} s="aujourd’hui" to={chemin('commandes', { filtre: 'jour' })} />
        {j.valeur !== null && <D k="Valeur des commandes" v={`${F(j.valeur)} F`} s="total payé, argent d’autrui" />}
        {j.revenus !== null && <D k="Revenus BelivaY" v={`${F(j.revenus)} F`} s="commissions + frais de livraison" />}
        {j.escrow !== null && <D k="Escrow bloqué" v={`${F(j.escrow)} F`} s="chez l’agrégateur" nuit to={chemin('escrow')} />}
        <D k="Paquets publiés" v={String(j.paquetsPublies)} s={tf('dont {n} sans preneur', { n: j.sansPreneur })} />
        <D k="Pièces KYC" v={String(j.piecesKyc)} s="à revoir" />
      </div>
    </>
  )
}

export default function File() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const droit = useDroit('file')
  const zones = usePerimetre()
  const surtitre = useSurtitre()
  const large = useLarge()
  const n = useHorloge()
  const [params, setParams] = useSearchParams()
  const filtre = params.get('filtre') ?? 'toutes'
  const choisie = params.get('carte')
  const file = useLecture(() => source.files.file(), [s.role, s.agent?.id])
  const ind = useLecture(() => source.files.indicateurs(), [s.role, s.agent?.id])
  const delegues = useLecture(() => (s.role === 'superviseur' ? source.files.delegues() : Promise.resolve([])), [s.role])
  const [refus, setRefus] = useState<string | null>(null)
  const [delegue, setDelegue] = useState<string | null>(null)
  const [motif, setMotif] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const poser = (k: string, v: string | null) =>
    setParams(
      (p) => {
        const q = new URLSearchParams(p)
        if (v === null) q.delete(k)
        else q.set(k, v)
        return q
      },
      { replace: true },
    )
  const cartes = file.donnees ?? []
  const retard = cartes.filter((c) => c.echeance !== null && c.echeance <= n)
  const visibles = filtre === 'toutes' ? cartes : filtre === 'retard' ? retard : cartes.filter((c) => c.famille === filtre)
  const carte = cartes.find((c) => c.id === choisie) ?? null
  const nb = (f: FamilleCarte) => cartes.filter((c) => c.famille === f).length
  // Six types les plus chargés en puces (le filtre en cours toujours visible), les autres dans « Autres ».
  const familles = (Object.keys(FAMILLES) as FamilleCarte[]).filter((f) => cartes.some((c) => c.famille === f)).sort((a, b) => nb(b) - nb(a))
  const principales = familles.slice(0, 6)
  const autres = familles.slice(6)
  const ouvrir = async (c: CarteAction) => {
    const r = await source.files.ouvrir(c.id)
    setRefus(r.ok ? null : c.id)
    poser('carte', c.id)
  }
  const fermer = async () => {
    if (carte) await source.files.liberer(carte.id)
    setRefus(null)
    poser('carte', null)
  }
  const capables = (delegues.donnees ?? []).filter((d) => retard.some((c) => d.familles.includes(c.famille)))
  const choisi = capables.find((d) => d.agentId === delegue) ?? null
  const aConfier = choisi ? retard.filter((c) => choisi.familles.includes(c.famille)) : []
  const deleguer = async () => {
    if (!choisi) return
    const r = await source.files.deleguer(
      aConfier.map((c) => c.id),
      choisi.agentId,
      motif,
    )
    if (!r.ok) setMessage(r.raison === 'motif_court' ? tf('Le motif doit compter au moins {n} caractères.', { n: PARAMETRES.console.motifMin }) : t('Agent inconnu.'))
    else {
      setMessage(tf('{n} carte(s) confiée(s) à {nom} ; rien n’a été fermé.', { n: r.n, nom: choisi.nom }))
      setMotif('')
    }
  }
  const perimetre = zones ? tf('{role} · {zones}', { role: t(NOM_ROLE[s.role]), zones: zones.join(', ') }) : tf('{role} · {perimetre}', { role: t(NOM_ROLE[s.role]), perimetre: t(PERIMETRE_ROLE[s.role]) })
  const actions = (
    <>
      <Link className="btn secondary" to={chemin('recherche')}>
        <Icone nom="search" taille={18} />
        <span>{t('Rechercher un dossier')}</span>
      </Link>
      <Link className="btn secondary" to={chemin('direct')}>
        <Icone nom="activity" taille={18} />
        <span>{t('Vue d’ensemble')}</span>
      </Link>
    </>
  )
  const dossierOuvert = carte && <Dossier c={carte} fermer={() => void fermer()} refus={refus === carte.id} />
  const vide = file.donnees !== null && cartes.length === 0
  const delegation = filtre === 'retard' && s.role === 'superviseur' && capables.length > 0 && !carte ? (
<section className="panel admA-dos" aria-label={t('Déléguer les cartes en retard')}>
  <div className="row" style={{ gap: 10 }}>
    <span className="ic acc" style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icone nom="split" taille={20} />
    </span>
    <h2 className="grow" style={{ fontSize: 18 }}>
      {t('Déléguer les cartes en retard')}
    </h2>
  </div>
  <div className="s1-oblig mt10" role="radiogroup" aria-label={t('Agent qui reprend les cartes')}>
    {capables.map((d) => {
      const nb = retard.filter((c) => d.familles.includes(c.famille)).length
      return (
        <button key={d.agentId} type="button" role="radio" aria-checked={delegue === d.agentId} className={'admA-opt' + (delegue === d.agentId ? ' on' : '')} onClick={() => setDelegue(d.agentId)}>
          <span className="rd"></span>
          <span className="grow">
            <b>{`${d.nom} · ${t(NOM_ROLE[d.role])}`}</b>
            <span>{tf('{n} carte(s) en retard de son métier', { n: nb })}</span>
          </span>
        </button>
      )
    })}
  </div>
  <label className="admA-motif" style={{ display: 'block' }}>
    <span className="lab">
      <span>{t('Motif écrit *')}</span>
      <span className={motif.trim().length >= PARAMETRES.console.motifMin ? 's1-ok' : 's1-court'}>{tf('{n} sur {min} caractères', { n: motif.trim().length, min: PARAMETRES.console.motifMin })}</span>
    </span>
    <textarea className="s1-motif mt4" value={motif} onChange={(e) => setMotif(e.target.value)} rows={3} />
  </label>
  {message && (
    <p className="t13 mt8" role="status">
      {message}
    </p>
  )}
  <div className="btns">
    <button type="button" className="btn primary" disabled={!choisi} onClick={() => void deleguer()} title={!choisi ? t('Choisissez d’abord un agent') : undefined}>
      <Icone nom="send" taille={18} />
      <span>{tf('Déléguer {n} carte(s)', { n: aConfier.length })}</span>
    </button>
    <button type="button" className="btn secondary" onClick={() => poser('filtre', null)}>
      <Icone nom="inbox" taille={18} />
      <span>{tf('Toutes · {n}', { n: cartes.length })}</span>
    </button>
  </div>
</section>
  ) : null
  return (
    <Ecran
      route="file"
      kicker={`${surtitre} · ${s.agent ? `${s.agent.prenom} ${s.agent.nom}` : ''}`}
      titre={file.donnees === null ? undefined : cartes.length === 0 ? t('Rien à décider') : cartes.length > 1 ? tf('{n} décisions à prendre', { n: cartes.length }) : t('1 décision à prendre')}
      actions={actions}
      fonctions={fonctionsDuRole(s.role, s.badges)}
    >
      {file.erreur && (
        <Banniere ton="red" icone="circle-alert" role="alert" bouton={<button type="button" className="btn sm white" onClick={file.relire}>{t('Réessayer')}</button>}>
          <b>{t('La file n’a pas pu être lue.')}</b> {t('Les cartes déjà affichées restent visibles ; aucune n’a été fermée.')}
        </Banniere>
      )}
      {retard.length > 0 && (
        <Banniere
          ton="red"
          icone="alarm-clock"
          bouton={
            filtre !== 'retard' ? (
              <button type="button" className="btn sm white" onClick={() => poser('filtre', 'retard')}>
                <Icone nom="list-filter" taille={16} />
                {tf('En retard · {n}', { n: retard.length })}
              </button>
            ) : undefined
          }
        >
          <b>{tf('{n} dossier(s) en retard', { n: retard.length })}</b>
          {retard.length >= REGLES_S1.surchargeDirection && s.role === 'superviseur' && ` · ${t('à réaffecter')}`}
        </Banniere>
      )}
      {!vide && (
        <div className="chips a-segs mt10" role="group" aria-label={t('Filtrer par type')}>
          <button type="button" className={'chip' + (filtre === 'toutes' ? ' on' : '')} aria-pressed={filtre === 'toutes'} onClick={() => poser('filtre', null)}>
            {t('Toutes')} <span className="n">{cartes.length}</span>
          </button>
          {retard.length > 0 && (
            <button type="button" className={'chip' + (filtre === 'retard' ? ' on' : '')} aria-pressed={filtre === 'retard'} onClick={() => poser('filtre', 'retard')}>
              <Icone nom="alarm-clock" taille={15} />
              {t('En retard')} <span className="n">{retard.length}</span>
            </button>
          )}
          {principales.map((f) => (
            <button key={f} type="button" className={'chip' + (filtre === f ? ' on' : '')} aria-pressed={filtre === f} onClick={() => poser('filtre', f)}>
              {t(FAMILLES[f].t)} <span className="n">{nb(f)}</span>
            </button>
          ))}
          {autres.length > 0 && (
            <label className={'chip a-autres' + (autres.includes(filtre as FamilleCarte) ? ' on' : '')}>
              <span className="vh">{t('Autres types')}</span>
              <select value={autres.includes(filtre as FamilleCarte) ? filtre : ''} onChange={(e) => poser('filtre', e.target.value || null)} aria-label={t('Autres types')}>
                <option value="">{tf('Autres · {n}', { n: autres.reduce((x, f) => x + nb(f), 0) })}</option>
                {autres.map((f) => (
                  <option key={f} value={f}>{`${t(FAMILLES[f].t)} · ${nb(f)}`}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      {file.donnees === null && !file.erreur && (
        <p className="t13 c3 mt14" aria-busy="true">
          {t('Chargement de la file…')}
        </p>
      )}
      {vide && (
        <>
          <section className="panel admA-empty mt16">
            <div className="ei">
              <Icone nom="check-check" taille={34} />
            </div>
            <h2>{zones ? t('Rien à décider dans vos zones') : t('Rien à décider')}</h2>
          </section>
          {ind.donnees && (
            <div className="admA-ind">
              <div className="sec">
                <h2>{zones ? t('Indicateurs de vos zones') : t('Indicateurs')}</h2>
              </div>
              <Indicateurs i={ind.donnees} grand />
            </div>
          )}
        </>
      )}
      {!vide && file.donnees && (
        <div className="admA-file">
          <div>
            <div className="admA-qhead">
              <span className="t">{filtre === 'retard' ? tf('En retard · {n} cartes', { n: visibles.length }) : tf('{n} cartes · par échéance, puis montant', { n: visibles.length })}</span>
              <Pill ton="acc" sm icone="shield-check">
                {perimetre}
              </Pill>
            </div>
            {visibles.map((c) => (
              <div key={c.id}>
                <Carte c={c} choisie={c.id === choisie} ouvrir={() => void ouvrir(c)} compacte={filtre === 'retard'} />
                {!large && c.id === choisie && <div className="mt10">{dossierOuvert}</div>}
              </div>
            ))}
            {!large && delegation && <div className="mt10">{delegation}</div>}
            {(droit.acces === 'part' || droit.acces === 'zone') && HORS[s.role] && (
              <details className="a-plie">
                <summary>{t('Cartes hors de votre périmètre')}</summary>
                <div className="a-plie-c t13 c3">{t(HORS[s.role]!)}</div>
              </details>
            )}
          </div>
          {large && (
            <div>
              {delegation ? (
                delegation
              ) : (
                dossierOuvert ?? (
                  <section className="panel admA-dos">
                    <div className="empty">
                      <div className="ei">
                        <Icone nom="inbox" taille={26} />
                      </div>
                      <h3>{t('Aucun dossier ouvert')}</h3>
                      <p>{tf('Touchez une carte : le dossier s’ouvre ici et reste verrouillé pour les autres pendant {min} min.', { min: REGLES_S1.verrouMin })}</p>
                      {visibles[0] && (
                        <div className="btns">
                          <button type="button" className="btn primary" onClick={() => void ouvrir(visibles[0])}>
                            <Icone nom="arrow-up-right" taille={18} />
                            <span>{t('Ouvrir la plus urgente')}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </section>
                )
              )}
            </div>
          )}
        </div>
      )}
      {!vide && ind.donnees && (
        <div className="admA-ind">
          <div className="sec">
            <h2>{t('Indicateurs')}</h2>
          </div>
          <Indicateurs i={ind.donnees} grand={false} />
        </div>
      )}
    </Ecran>
  )
}
