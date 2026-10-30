// Page ajoutée « Candidatures des partenaires » (S4) : les candidatures des entreprises de livraison et des points
// relais, de bout en bout : prise en charge, contrôles automatiques (RCCM et NIU pour une entreprise, liste noire,
// doublon), complément demandé au candidat, acceptation (l'entreprise passe « en configuration », le relais « en
// configuration » : leurs chaînes d'activation continuent dans ADM-P17 et ADM-P18), refus motivé. Un second relais
// dans une zone qui en a déjà un est une décision de la Direction (RELAIS-PAR-ZONE). Une candidature en liste noire
// ou en doublon ne s'accepte jamais ; le motif du refus n'est pas détaillé au candidat.
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Perimetre } from '../../composants/Perimetre'
import { Kpi, Note, Panel, Pill, Vide, useSurtitre } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { Candidature } from '../../donnees/domaines/logistique'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { BoutonGeste, Check, Lu, StatutPill, quand, useGestes } from '../ADM-08/commun'
import { PARAM } from '../ADM-08/parametres'
import { useFonctions } from './fonctions-page'

const ETAT: Record<Candidature['etat'], [string, 'acc' | 'amber' | 'green' | 'red' | 'ink']> = {
  nouvelle: ['Nouvelle', 'acc'],
  prise: ['Prise en charge', 'ink'],
  complement: ['Complément demandé', 'amber'],
  acceptee: ['Acceptée', 'green'],
  refusee: ['Refusée', 'red'],
}
type Filtre = 'toutes' | 'entreprise' | 'relais' | 'closes' | 'pretes' | 'incompletes' | 'bloquees'
const bloquee = (c: Candidature) => c.controles.listeNoire || !!c.controles.doublon || c.controles.rccm === 'invalide' || c.controles.niu === 'invalide'
const prete = (c: Candidature) => !bloquee(c) && c.pieces.every((x) => x.recue)

export default function Candidatures() {
  const { t, tf } = usePreferences()
  const surtitre = useSurtitre()
  const [p, setP] = useSearchParams()
  const filtre = (p.get('genre') as Filtre) ?? 'toutes'
  const l = useLecture(() => source.logistique.candidatures(), [])
  const g = useGestes()
  const ouv = (l.donnees ?? []).filter((c) => c.etat !== 'acceptee' && c.etat !== 'refusee')
  const fonctions = useFonctions([
    { verbe: 'Accepter', n: ouv.filter(prete).length, unite: ['candidature complète', 'candidatures complètes'], icone: 'check', route: 'candidatures', params: { genre: 'pretes' }, geste: true },
    { verbe: 'Compléter', n: ouv.filter((c) => !bloquee(c) && !prete(c)).length, unite: ['dossier incomplet', 'dossiers incomplets'], icone: 'circle-help', route: 'candidatures', params: { genre: 'incompletes' }, geste: true },
    { verbe: 'Refuser', n: ouv.filter(bloquee).length, unite: ['candidature bloquée', 'candidatures bloquées'], icone: 'shield-x', route: 'candidatures', params: { genre: 'bloquees' }, geste: true, alerte: true },
    { verbe: 'Prendre', n: ouv.filter((c) => c.etat === 'nouvelle').length, unite: ['nouvelle', 'nouvelles'], icone: 'hand', route: 'candidatures', geste: true },
  ])
  return (
    <Ecran route="candidatures" kicker={surtitre} fonctions={fonctions}>
      <Perimetre route="candidatures" />
      {g.rendu}
      <Lu l={l} quoi="Les candidatures">
        {(cs) => {
          const ouvertes = cs.filter((c) => c.etat !== 'acceptee' && c.etat !== 'refusee')
          const liste = cs.filter((c) =>
            filtre === 'closes' ? !ouvertes.includes(c) : ouvertes.includes(c) && (filtre === 'toutes' || c.genre === filtre || (filtre === 'pretes' && prete(c)) || (filtre === 'bloquees' && bloquee(c)) || (filtre === 'incompletes' && !bloquee(c) && !prete(c))),
          )
          return (
            <>
              <div className="g g4">
                <Kpi k={t('À traiter')} v={ouvertes.length} s={tf('{n} nouvelle(s)', { n: cs.filter((c) => c.etat === 'nouvelle').length })} icone="inbox" ton="night" />
                <Kpi k={t('Entreprises candidates')} v={ouvertes.filter((c) => c.genre === 'entreprise').length} s={tf('Minimum {m} par zone', { m: PARAM.entreprises.minParZone })} icone="truck" />
                <Kpi k={t('Relais candidats')} v={ouvertes.filter((c) => c.genre === 'relais').length} s={tf('{n} relais par zone au lancement', { n: PARAM.relais.parZone })} icone="package-check" />
                <Kpi k={t('Bloquées par un contrôle')} v={ouvertes.filter((c) => c.controles.listeNoire || c.controles.doublon).length} s={t('Liste noire ou doublon')} icone="shield-x" iton="red" />
              </div>
              <div className="chips a-segs mt16" role="group" aria-label={t('Filtrer les candidatures')}>
                {(
                  [
                    ['toutes', 'À traiter', ouvertes.length],
                    ['entreprise', 'Entreprises', ouvertes.filter((c) => c.genre === 'entreprise').length],
                    ['relais', 'Relais', ouvertes.filter((c) => c.genre === 'relais').length],
                    ['pretes', 'Complètes', ouvertes.filter(prete).length],
                    ['bloquees', 'Bloquées', ouvertes.filter(bloquee).length],
                    ['closes', 'Closes', cs.length - ouvertes.length],
                  ] as [Filtre, string, number][]
                ).map(([id, lib, n]) => (
                  <button key={id} type="button" className={'chip' + (filtre === id ? ' on' : '')} aria-pressed={filtre === id} onClick={() => setP(id === 'toutes' ? {} : { genre: id }, { replace: true })}>
                    {t(lib)} <span className="n">{n}</span>
                  </button>
                ))}
              </div>
              {liste.length === 0 && <Vide icone="inbox" t={t('Aucune candidature ici')} />}
              {liste.map((c) => (
                <Fiche key={c.id} c={c} g={g} />
              ))}
            </>
          )
        }}
      </Lu>
    </Ecran>
  )
}

function Fiche({ c, g }: { c: Candidature; g: ReturnType<typeof useGestes> }) {
  const { t, tf, langue } = usePreferences()
  const bloque = bloquee(c)
  const manque = c.pieces.filter((x) => !x.recue)
  return (
    <Panel
      titre={`${c.id} · ${c.nom}`}
      icone={c.genre === 'entreprise' ? 'truck' : 'package-check'}
      tonIcone={bloque ? 'red' : 'acc'}
      droite={<StatutPill t={ETAT[c.etat][0]} ton={ETAT[c.etat][1]} />}
      className="mt16"
    >
      <div className="t13 c3">
        {tf('{g} · {r} · zone(s) {z} · déposée {h}', { g: t(c.genre === 'entreprise' ? 'Entreprise de livraison' : 'Point relais'), r: c.responsable, z: c.zones.join(', '), h: quand(c.deposeLe, langue) })}
        {c.prisePar && ` · ${tf('prise en charge par {qui}', { qui: c.prisePar })}`}
      </div>
      {(c.origine || (c.secondDansZone && c.genre === 'relais')) && (
        <div className="row wrap mt8" style={{ gap: 6 }}>
          {c.origine && <Pill ton="blue" sm icone="smartphone">{tf('Reçue de l’espace {e} · {d}', { e: t(c.genre === 'entreprise' ? 'entreprise' : 'relais'), d: c.origine.dossier })}</Pill>}
          {c.secondDansZone && c.genre === 'relais' && <Pill ton="amber" sm icone="git-branch">{tf('Second relais en {z} · Direction', { z: c.zone })}</Pill>}
        </div>
      )}
      <div className="g g2" style={{ marginTop: 10 }}>
        <div>
          <b className="t14">{t('Pièces')}</b>
          {c.pieces.map((x) => (
            <Check key={x.nature} ok={x.recue} mauvais={!x.recue}>
              {t(x.nature)}
            </Check>
          ))}
        </div>
        <div>
          <b className="t14">{t('Contrôles automatiques')}</b>
          <div className="row wrap mt8" style={{ gap: 6 }}>
            {c.controles.rccm !== 'sans_objet' && <Pill ton={c.controles.rccm === 'ok' ? 'green' : 'red'} sm icone={c.controles.rccm === 'ok' ? 'check' : 'x'}>{t(c.controles.rccm === 'ok' ? 'RCCM valide' : 'RCCM invalide')}</Pill>}
            {c.controles.niu !== 'sans_objet' && <Pill ton={c.controles.niu === 'ok' ? 'green' : 'red'} sm icone={c.controles.niu === 'ok' ? 'check' : 'x'}>{t(c.controles.niu === 'ok' ? 'NIU valide' : 'NIU invalide')}</Pill>}
            <Pill ton={c.controles.listeNoire ? 'red' : 'green'} sm icone={c.controles.listeNoire ? 'x' : 'check'}>{t(c.controles.listeNoire ? 'Liste noire : correspondance' : 'Liste noire : aucune correspondance')}</Pill>
            <Pill ton={c.controles.doublon ? 'red' : 'green'} sm icone={c.controles.doublon ? 'x' : 'check'}>{c.controles.doublon ? t(c.controles.doublon) : t('Aucun doublon')}</Pill>
          </div>
          {c.complement && <Note ton="amber" icone="circle-help" className="mt10">{tf('Complément demandé {h} : {d}', { h: quand(c.complement.le, langue), d: c.complement.demande })}</Note>}
          {c.issue && <Note ton={c.etat === 'acceptee' ? 'green' : 'red'} icone={c.etat === 'acceptee' ? 'check' : 'x'} className="mt10">{tf('{e} par {qui} · {h} : {m}', { e: t(ETAT[c.etat][0]), qui: c.issue.par, h: quand(c.issue.le, langue), m: c.issue.motif })}</Note>}
        </div>
      </div>
      {c.etat === 'acceptee' ? (
        <div className="s4-actes">
          <Link className="btn secondary sm" to={chemin(c.genre === 'entreprise' ? 'entreprises' : 'relais')}>
            <Icone nom="arrow-right" taille={16} />
            <span>{t(c.genre === 'entreprise' ? 'Suivre la chaîne d’activation' : 'Suivre la chaîne d’ouverture')}</span>
          </Link>
        </div>
      ) : c.etat !== 'refusee' ? (
        <div className="s4-actes">
          {/* Un bouton principal : accepter un dossier complet, compléter un dossier incomplet, refuser un dossier bloqué. */}
          {(() => {
            const accepter = <BoutonGeste key="a" g={g} action="candidature.accepter" objet={c.id} genre={!bloque && !manque.length ? 'primary' : 'ghost'} sm resume={c.genre === 'entreprise' ? tf('Accepter {n} : l’entreprise passe en configuration (pièces, visite, contrat, grille, premier livreur).', { n: c.nom }) : tf('Accepter {n} : le relais passe en configuration (KYC, Mobile Money, convention, visite, formation, capacité).', { n: c.nom })} />
            const completer = <BoutonGeste key="c" g={g} action="candidature.completer" objet={c.id} genre={!bloque && manque.length ? 'primary' : 'ghost'} sm resume={manque.length ? tf('Demander au candidat : {p}. Écrivez la demande dans le motif ; elle lui est envoyée.', { p: manque.map((x) => t(x.nature)).join(', ') }) : t('Demander un complément au candidat ; écrivez la demande dans le motif.')} />
            const refuser = <BoutonGeste key="r" g={g} action="candidature.refuser" objet={c.id} genre={bloque ? 'primary' : 'ghost'} sm resume={tf('Refuser {id} : le candidat reçoit un refus, sans le détail des contrôles.', { id: c.id })} />
            const prendre = c.etat === 'nouvelle' ? <BoutonGeste key="p" g={g} action="candidature.prendre" objet={c.id} genre="ghost" sm resume={tf('Prendre en charge {id} : vous en devenez responsable jusqu’à la décision.', { id: c.id })} /> : null
            return bloque ? [refuser, prendre, completer] : manque.length ? [completer, prendre, refuser] : [accepter, prendre, completer, refuser]
          })()}
        </div>
      ) : null}
    </Panel>
  )
}
