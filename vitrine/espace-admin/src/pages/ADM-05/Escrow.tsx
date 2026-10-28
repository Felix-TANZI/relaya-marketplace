// ADM-P05 · Escrow et registre : l'état de l'argent, commande par commande, et le registre en partie double. Structure
// du prototype gardée (bandeau de l'escrow détenu chez l'agrégateur, onglets Bloqué / Se libère / Gelé / Libéré, liste,
// actions permises dans cet état, registre et journal des transitions). Aucun montant n'est éditable : la console fait
// changer l'argent d'état quand la règle le permet (gel motivé ; libération anticipée à quatre yeux, Finance et
// Direction : ESCROW-VALIDEURS), jamais son montant. Finance : la référence d'un litige, jamais son contenu.
// Page ajoutée : « Suivi du Wallet » (route « wallet »), liée depuis l'en-tête.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Icone } from '../../composants/Icone'
import { Perimetre } from '../../composants/Perimetre'
import { Choix, Frise, Hint, Li, Panel, Pill, Vide, type Ton } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { CommandeEscrow, EtatEscrow } from '../../donnees/domaines/argent'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useRole, useRouteOuverte } from '../../session'
import { Fr, Hero, Lu, Registre, useDate } from './commun'
import { Plie, useFonctionsS } from '../ADM-03/kit'

type Onglet = 'bloque' | 'selibere' | 'gele' | 'libere'
const DANS: Record<Onglet, EtatEscrow[]> = { bloque: ['bloque'], selibere: ['se_libere'], gele: ['gele'], libere: ['libere', 'verse', 'rembourse'] }
const ICONE: Record<Onglet, [string, Ton]> = { bloque: ['lock', 'blue'], selibere: ['calendar-clock', 'acc'], gele: ['snowflake', 'red'], libere: ['circle-check', 'green'] }
const NOM_ETAT: Record<EtatEscrow, [string, Ton]> = { bloque: ['Bloqué', 'blue'], se_libere: ['Se libère', 'acc'], gele: ['Gelé', 'red'], libere: ['Libéré', 'green'], verse: ['Libéré · versé', 'green'], rembourse: ['Remboursé', 'violet'] }

export default function Escrow() {
  return <Registres />
}

function Registres() {
  const { t, tf } = usePreferences()
  const d = useDate()
  const [p, setP] = useSearchParams()
  const l = useLecture(() => source.argent.escrow(), [])
  const onglet = (['selibere', 'gele', 'libere'].includes(p.get('s') ?? '') ? p.get('s') : 'bloque') as Onglet
  const ouvre = useRouteOuverte()
  const nb = (o: Onglet) => (l.donnees?.commandes ?? []).filter((c) => DANS[o].includes(c.etat)).length
  const choisir = (o: Onglet) => setP(o === 'bloque' ? {} : { s: o }, { replace: true })
  const fonctions = useFonctionsS('escrow', [
    { verbe: 'Lever', n: nb('gele'), unite: ['gel', 'gels'], icone: 'snowflake', onClick: () => choisir('gele'), alerte: true },
    { verbe: 'Libérer', n: nb('selibere'), unite: ['commande', 'commandes'], icone: 'calendar-clock', onClick: () => choisir('selibere') },
    { verbe: 'Suivre', n: nb('bloque'), unite: ['commande bloquée', 'commandes bloquées'], icone: 'lock', onClick: () => choisir('bloque') },
    { verbe: 'Rapprocher', n: null, unite: ['', ''], icone: 'scale', route: 'rapprochement' },
  ])
  return (
    <Ecran
      route="escrow"
      kicker={d.quand(l.donnees?.le ?? Date.now())}
      fonctions={l.donnees ? fonctions : undefined}
      actions={
        <>
          {ouvre('rapprochement') && (
            <Link className="btn secondary" to={chemin('rapprochement')}>
              <Icone nom="scale-3d" taille={18} />
              <span>{t('Rapprochement')}</span>
            </Link>
          )}
          <Link className="btn secondary" to={chemin('wallet')}>
            <Icone nom="wallet" taille={18} />
            <span>{t('Suivi du Wallet')}</span>
          </Link>
        </>
      }
    >
      <Perimetre route="escrow" />
      <Lu l={l}>
        {(v) => {
          const de = (o: Onglet) => v.commandes.filter((c) => DANS[o].includes(c.etat))
          const liste = de(onglet).sort((a, b) => b.payeeLe - a.payeeLe)
          const choisie = liste.find((c) => c.ref === p.get('ref')) ?? liste[0] ?? null
          const total = v.bloque + v.seLibere + v.gele
          const pc = (x: number) => (total ? (x / total) * 100 : 0)
          const aller = (o: Onglet, ref?: string) => {
            const q = new URLSearchParams()
            if (o !== 'bloque') q.set('s', o)
            if (ref) q.set('ref', ref)
            setP(q, { replace: true })
          }
          return (
            <>
              <Hero
                k={tf('Escrow détenu chez l’agrégateur · {quand}', { quand: d.quand(v.le) })}
                v={Fr(total).replace(' F', '')}
                s={t('Argent des clients chez l’agrégateur, jusqu’à la libération')}
                droite={
                  <>
                    <Pill ton="dk" icone={v.equilibre ? 'circle-check' : 'triangle-alert'}>
                      {tf('Σ débits = Σ crédits · {n} commandes', { n: v.commandes.length })}
                    </Pill>
                    <div className="t12 mt6">
                      {v.equilibre ? t('contrôle permanent · 0 écart') : t('déséquilibre : carte Direction')}
                    </div>
                  </>
                }
                mesures={[
                  { l: t('Bloqué'), v: Fr(v.bloque), s: tf('{n} commandes · payées, pas encore fermées', { n: de('bloque').length }), icone: 'lock' },
                  { l: t('Se libère'), v: Fr(v.seLibere), s: tf('{n} commandes · libération datée', { n: de('selibere').length }), icone: 'calendar-clock' },
                  { l: t('Gelé'), v: Fr(v.gele), s: tf('{n} dossiers · sans date', { n: de('gele').length }), icone: 'snowflake' },
                  { l: tf('Versement du {jour}', { jour: d.jour(v.prochainVersement.le) }), v: Fr(v.prochainVersement.montant), s: t('prévision · tous les acteurs'), icone: 'banknote' },
                ]}
              >
                <div className="admA-split">
                  <i style={{ width: pc(v.bloque) + '%', background: 'var(--violet)' }}></i>
                  <i style={{ width: pc(v.seLibere) + '%', background: 'var(--gold-l)' }}></i>
                  <i style={{ width: pc(v.gele) + '%', background: 'var(--red)' }}></i>
                </div>
              </Hero>
              <div style={{ marginTop: 16 }}>
                <Choix
                  forme="tabs"
                  aria={t('État de l’argent')}
                  actif={onglet}
                  choisir={(o) => aller(o)}
                  items={[
                    { id: 'bloque', t: t('Bloqué'), n: de('bloque').length },
                    { id: 'selibere', t: t('Se libère'), n: de('selibere').length },
                    { id: 'gele', t: t('Gelé'), n: de('gele').length },
                    { id: 'libere', t: t('Libéré · 7 jours'), n: de('libere').length },
                  ]}
                />
              </div>
              <div className="g g-esc">
                <div className="col" style={{ gap: 16, display: 'flex', flexDirection: 'column' }}>
                  <Panel titre={t(['Commandes bloquées', 'Commandes qui se libèrent', 'Commandes gelées', 'Libérées sur 7 jours'][['bloque', 'selibere', 'gele', 'libere'].indexOf(onglet)])} icone="list">
                    {liste.length === 0 ? (
                      <Vide icone={ICONE[onglet][0]} t={t('Aucune commande dans cet état')} />
                    ) : (
                      liste.map((c) => (
                        <Li
                          key={c.ref}
                          icone={ICONE[onglet][0]}
                          ton={ICONE[onglet][1]}
                          t={c.ref}
                          s={`${c.article} · ${resume(c, t, d.quand)}`}
                          rv={Fr(c.total)}
                          onClick={() => aller(onglet, c.ref)}
                          aria={tf('Voir le registre de {ref}', { ref: c.ref })}
                          style={c.ref === choisie?.ref ? { background: 'var(--acc-soft)', margin: '0 -10px', padding: '0 10px', borderRadius: 12 } : undefined}
                        />
                      ))
                    )}
                  </Panel>
                  {choisie && <Actions c={choisie} />}
                </div>
                {choisie ? <Fiche c={choisie} /> : <div />}
              </div>
            </>
          )
        }}
      </Lu>
    </Ecran>
  )
}

function resume(c: CommandeEscrow, t: (s: string) => string, quand: (le: number) => string) {
  if (c.etat === 'gele') return `${c.dossier ?? ''}${c.dossierLisible ? '' : ' · ' + t('dossier en cours')}`
  if (c.remboursement && c.etat !== 'rembourse') return t('remboursement en cours')
  if (c.etat === 'se_libere' && c.liberationLe) return quand(c.liberationLe)
  if (c.etat === 'verse' && c.versementLe) return `${t('versé')} ${quand(c.versementLe)}`
  if (c.etat === 'libere' && c.versementLe) return `${t('versement')} ${quand(c.versementLe)}`
  return quand(c.payeeLe)
}

function Actions({ c }: { c: CommandeEscrow }) {
  const { t, tf } = usePreferences()
  const role = useRole()
  const ouvre = useRouteOuverte()
  const [feuille, setFeuille] = useState<'liberer' | 'geler' | 'lever' | null>(null)
  const second = role === 'finance' ? (['superviseur'] as const) : (['finance'] as const)
  const ligne = (nom: string, g: { permis: boolean; raison: string }, ton: 'primary' | 'secondary' | 'danger', faire: () => void) => (
    <div className="admA-chk" key={nom}>
      <span className="grow">
        <b>{t(nom)}</b>
        <span>{t(g.raison)}</span>
      </span>
      <button type="button" className={'btn sm ' + (g.permis ? ton : 'secondary')} disabled={!g.permis} onClick={faire}>
        {t(nom)}
      </button>
    </div>
  )
  return (
    <Panel titre={t('Actions permises dans cet état')} icone="sliders-horizontal">
      {c.etat === 'gele' && c.dossier && c.dossier !== 'Gel conservatoire' && (
        <div className="admA-chk">
          <span className="grow">
            <b>{tf('Dossier {id}', { id: c.dossier })}</b>
            <span>{c.dossierLisible ? t('Le seul chemin pour faire bouger cet argent') : t('Instruit par le Support et la Médiation : la Finance ne voit que la référence et l’effet de la décision')}</span>
          </span>
          {ouvre('litige') && (
            <Link className="btn sm secondary" to={chemin('litige', { id: c.dossier })}>
              {t('Ouvrir')}
            </Link>
          )}
        </div>
      )}
      {c.remboursement && ouvre('remboursements') && (
        <div className="admA-chk">
          <span className="grow">
            <b>{tf('Remboursement {id}', { id: c.remboursement })}</b>
            <span>{t('Vers le moyen d’origine ; suivi jusqu’à la réception')}</span>
          </span>
          <Link className="btn sm secondary" to={chemin('remboursements', { id: c.remboursement })}>
            {t('Ouvrir')}
          </Link>
        </div>
      )}
      {c.enAttenteQuatreYeux && (
        <div className="admA-chk">
          <span className="grow">
            <b>{tf('Libération anticipée · {id}', { id: c.enAttenteQuatreYeux })}</b>
            <span>{t('En attente du second validateur, d’un autre compte')}</span>
          </span>
          {ouvre('quatreyeux') && (
            <Link className="btn sm secondary" to={chemin('quatreyeux', { id: c.enAttenteQuatreYeux })}>
              {t('Ouvrir')}
            </Link>
          )}
        </div>
      )}
      {ligne('Libérer', c.gestes.liberer, 'primary', () => setFeuille('liberer'))}
      {c.dossier === 'Gel conservatoire' ? ligne('Lever le gel', c.gestes.lever, 'primary', () => setFeuille('lever')) : ligne('Geler', c.gestes.geler, 'danger', () => setFeuille('geler'))}
      {ligne('Rembourser', c.gestes.rembourser, 'secondary', () => undefined)}
      {ligne('Partager', c.gestes.partager, 'secondary', () => undefined)}
      <Plie titre={t('Quatre yeux')}>{t('Libérer avant la fermeture du droit de retour, hors décision de litige, est une action à quatre yeux ; toute transition passe par le serveur avec une clé d’idempotence.')}</Plie>
      <DecisionMotivee
        ouverte={feuille === 'liberer'}
        fermer={() => setFeuille(null)}
        titre={tf('Libérer {ref} en avance', { ref: c.ref })}
        action="escrow.liberer"
        objet={c.ref}
        resume={tf('Libérer {montant} de {ref} avant la date du serveur : net aux vendeurs, commission et livraison aux revenus.', { montant: Fr(c.total), ref: c.ref })}
        montant={c.total}
        quatreYeux
        rolesSecond={[...second]}
        preuves={[{ id: 'p1', libelle: tf('Registre de {ref} · équilibré', { ref: c.ref }), route: 'escrow', params: { ref: c.ref } }]}
      />
      <DecisionMotivee
        ouverte={feuille === 'geler'}
        fermer={() => setFeuille(null)}
        titre={tf('Geler {ref}', { ref: c.ref })}
        action="escrow.geler"
        objet={c.ref}
        resume={tf('Gel conservatoire de {montant} : aucune libération, aucun versement tant que le gel n’est pas levé. Aucun mouvement d’argent.', { montant: Fr(c.total) })}
        libelle="Geler"
      />
      <DecisionMotivee ouverte={feuille === 'lever'} fermer={() => setFeuille(null)} titre={tf('Lever le gel de {ref}', { ref: c.ref })} action="escrow.lever" objet={c.ref} resume={t('L’argent reprend son cours : libération datée par le serveur selon la règle.')} libelle="Lever le gel" />
    </Panel>
  )
}

function Fiche({ c }: { c: CommandeEscrow }) {
  const { t, tf } = usePreferences()
  const d = useDate()
  const [nom, ton] = NOM_ETAT[c.etat]
  const ouvre = useRouteOuverte()
  return (
    <Panel titre={tf('Registre en partie double · {ref}', { ref: c.ref })} icone="book-open" droite={<span className="b8 t15">{Fr(c.total)}</span>}>
      <div className="row wrap" style={{ gap: 8, margin: '-4px 0 10px' }}>
        <Pill ton={ton} sm dot>
          {t(nom)}
          {c.etat === 'se_libere' && c.liberationLe ? ` · ${d.quand(c.liberationLe)}` : ''}
          {c.etat === 'gele' && c.dossier ? ` · ${c.dossier}` : ''}
        </Pill>
        <span className="t13 c3">
          {c.article} · {c.vendeurs.join(', ')} → {c.relais ?? t('domicile')} · {c.client} · {c.numero}
        </span>
        {ouvre('commandes') && (
          <Link className="btn sm secondary" to={chemin('commandes', { ref: c.ref })}>
            {t('Fiche commande')}
          </Link>
        )}
      </div>
      <Registre ecritures={c.ecritures} heure={d.quand} total={c.etat === 'rembourse' ? t('remboursé · soldé') : c.etat === 'verse' ? t('soldé') : tf('{montant} détenus · écritures futures en gris', { montant: Fr(c.total) })} />
      {c.fraisClient > 0 && <Hint icone="info">{tf('Le client a aussi payé {frais} de frais Mobile Money : argent de passage reversé à l’agrégateur, jamais un revenu.', { frais: Fr(c.fraisClient) })}</Hint>}
      <div className="divide">{t('Soldes par compte · débit = compte qui reçoit · somme nulle')}</div>
      <div className="row wrap" style={{ gap: 6 }}>
        {c.soldes.map((s) => (
          <span className="slot" key={s.compte}>
            {s.compte} <b>{Fr(s.montant)}</b>
          </span>
        ))}
      </div>
      <div className="divide">{t('Journal des transitions')}</div>
      <div className="admA-tl">
        <Frise items={c.transitions.map((x) => ({ t: x.le ? `${d.quand(x.le)} · ${t(x.titre)}` : t(x.titre), d: t(x.detail), st: x.st }))} />
      </div>
    </Panel>
  )
}
