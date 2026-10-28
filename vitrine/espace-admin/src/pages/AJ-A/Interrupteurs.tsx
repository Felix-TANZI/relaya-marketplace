// Page ajoutée · Interrupteurs de fonctions (A-30 ; ADM-CACHEE-25, ADM-P24R-07, DP-63/65). Chaque fonction FF-* : de
// lancement ou d'après lancement, branchée ou non (où le code la lit), état dans l'espace pays, paramètres et leur
// statut (un paramètre « À trancher » empêche l'ouverture : 423 MODULE_BLOQUE), demande en cours. Une bascule, dans un
// sens comme dans l'autre, est TOUJOURS à quatre yeux (Direction, puis Direction ou Finance d'un autre compte) ; le
// changement part vers les six espaces (pont). Alerte « après lancement ouvert » : fonction d'après lancement ouverte,
// ou ouverte pour le site par le registre (DP-50) alors que la v6 la cache.
import { useState } from 'react'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Banniere, Interdit, Kpi, Li, Note, Panel, Pill, Plus, Table, Tg, useSurtitre } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { InterrupteurVu } from '../../donnees/domaines/pilotage'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { useFonctions } from './fonctions-page'
import { usePreferences } from '../../preferences'
import { usePeut, useRouteOuverte } from '../../session'
import { Chargement, ErreurLecture, RAISONS, useDates } from '../ADM-11/commun-s5'

export default function Interrupteurs() {
  const { t, tf } = usePreferences()
  const surtitre = useSurtitre()
  const d = useDates()
  const peut = usePeut('interrupteur.basculer')
  const ouverte = useRouteOuverte()
  const l = useLecture(() => source.pilotage.interrupteurs(), [])
  const [cible, setCible] = useState<InterrupteurVu | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const v = l.donnees
  const alertes = (v ?? []).filter((i) => i.alerte)
  const fonctions = useFonctions([
    { verbe: 'Trancher', n: alertes.length, unite: ['fonction ouverte trop tôt', 'fonctions ouvertes trop tôt'], icone: 'triangle-alert', alerte: true, onClick: () => document.getElementById('s5-ff')?.scrollIntoView({ behavior: 'smooth' }) },
    { verbe: 'Contresigner', n: (v ?? []).filter((i) => i.demande).length, unite: ['bascule', 'bascules'], icone: 'users', route: 'parametrage', params: { s: 'quatre-yeux' } },
  ])
  return (
    <Ecran route="interrupteurs" kicker={surtitre} fonctions={fonctions}>
      <ErreurLecture erreur={l.erreur} relire={l.relire} />
      {!v ? (
        !l.erreur && <Chargement n={3} />
      ) : (
        <>
          <div className="g g4">
            <Kpi k={t('Fonctions suivies')} v={v.length} s={t('interrupteurs FF-* de l’espace Cameroun')} icone="toggle-right" ton="night" />
            <Kpi k={t('Ouvertes')} v={v.filter((i) => i.ouvert).length} s={t('visibles dans les applications')} icone="circle-check" iton="green" />
            <Kpi k={t('Après lancement ouvert')} v={alertes.length} s={t('à fermer ou à confirmer')} icone="triangle-alert" iton={alertes.length ? 'or' : 'green'} />
            <Kpi k={t('Demandes à contresigner')} v={v.filter((i) => i.demande).length} s={t('Direction ou Finance, autre compte')} icone="users" iton="amber" to={ouverte('parametrage') ? chemin('parametrage', { s: 'quatre-yeux' }) : undefined} />
          </div>
          {alertes.length > 0 && (
            <Banniere ton="amber" icone="triangle-alert" className="mt16" role="status">
              <b>{tf('{n} alerte(s) « après lancement ouvert »', { n: alertes.length })}</b> · {t('à trancher par le porteur (DP-50, DP-63, DP-65)')}
            </Banniere>
          )}
          {msg && (
            <Note ton="ink" icone="info" className="mt12" role="status">
              {msg}
            </Note>
          )}
          {!peut && <Interdit roles={['superviseur']} quoi="Ouvrir ou fermer une fonction (interrupteur)" />}
          <div className="mt16" id="s5-ff">
            <Table
              legende={t('Interrupteurs de fonctions')}
              rows={v}
              cle={(i) => i.code}
              ligneCls={(i) => (i.alerte ? 'warn' : undefined)}
              cols={[
                {
                  k: 'f',
                  t: t('Fonction'),
                  main: true,
                  rendu: (i) => (
                    <>
                      <b>{t(i.libelle)}</b>
                      <div className="t2 mono">{i.code}</div>
                      {i.alerte && <div className="t12 cr b7 mt4 s5-alerte">{t(i.alerte)}</div>}
                    </>
                  ),
                },
                { k: 'q', t: t('Quand'), rendu: (i) => <Pill ton={i.apresLancement ? 'violet' : 'green'} sm>{i.apresLancement ? t('Après le lancement') : t('Au lancement')}</Pill> },
                {
                  k: 'b',
                  t: t('Branché'),
                  hideM: true,
                  rendu: (i) =>
                    i.branche.length ? (
                      <Plus libelle={tf('Oui · {n} lecture(s)', { n: i.branche.length })} plat icone="plug">
                        <ul className="t12">{i.branche.map((b) => <li key={b}>{t(b)}</li>)}</ul>
                      </Plus>
                    ) : (
                      <Pill ton="ink" sm>{t('Non branché')}</Pill>
                    ),
                },
                {
                  k: 'p',
                  t: t('Paramètres'),
                  hideM: true,
                  rendu: (i) => (
                    <>
                      {i.parametres.length ? i.parametres.map((p) => <div key={p.code} className="t12"><span className="mono">{p.code}</span> · <span className={p.statut === 'À trancher' ? 'cr b7' : 'c3'}>{t(p.statut)}</span></div>) : <span className="t12 c3">{t('aucun')}</span>}
                      {i.bloque && <Pill ton="red" sm icone="lock">{t('Bloqué : à trancher')}</Pill>}
                    </>
                  ),
                },
                { k: 'r', t: t('Registre (site)'), hideM: true, rendu: (i) => <span className="t12">{i.registreSite ? t(i.registreSite) : '—'}</span> },
                {
                  k: 'e',
                  t: t('État'),
                  rendu: (i) => (
                    <span className="row wrap" style={{ gap: 6, alignItems: 'center' }}>
                      <Tg on={i.ouvert} lock={!peut || !!i.demande} libelle={tf('{c} : {e}', { c: i.code, e: i.ouvert ? t('ouvert, demander la fermeture') : t('fermé, demander l’ouverture') })} changer={() => setCible(i)} />
                      <span className="t12 b7">{i.ouvert ? t('Ouvert') : t('Fermé')}</span>
                      {i.demande && (
                        <Pill ton="violet" sm icone="users">
                          {tf('{id} · {s}', { id: i.demande.id, s: i.demande.ouvrir ? t('ouverture demandée') : t('fermeture demandée') })}
                        </Pill>
                      )}
                    </span>
                  ),
                },
              ]}
            />
          </div>
          <div className="g g2">
            <Panel titre={t('Historique des bascules')} icone="history">
              {v.flatMap((i) => i.historique.map((h) => ({ ...h, code: i.code }))).length ? (
                v
                  .flatMap((i) => i.historique.map((h) => ({ ...h, code: i.code })))
                  .sort((a, b) => b.le - a.le)
                  .map((h) => <Li key={h.code + h.le} icone={h.ouvert ? 'toggle-right' : 'circle-pause'} ton={h.ouvert ? 'green' : 'ink'} t={`${h.code} · ${h.ouvert ? t('ouvert') : t('fermé')}`} s={`${d.complet(h.le)} · ${h.par}${h.second ? ' · ' + h.second : ''} · ${h.motif}`} />)
              ) : (
                <p className="t13 c3">{t('Aucune bascule depuis le lancement : chaque fonction est dans son état d’origine.')}</p>
              )}
            </Panel>
            <Panel titre={t('Règles')} icone="shield-check">
              <Li icone="users" ton="acc" t={t('Quatre yeux, dans les deux sens')} s={t('La Direction demande, une autre personne (Direction ou Finance) contresigne')} />
              <Li icone="lock" ton="red" t={t('Aucun paramètre « à trancher »')} s={t('Une fonction ne s’ouvre pas tant qu’un de ses paramètres n’est pas décidé')} />
              <Li icone="eye-off" ton="ink" t={t('Fermée : invisible')} s={t('Jamais montrée comme disponible ; les brouillons sont gardés')} />
              {ouverte('parametrage') && (
                <Link className="btn secondary mt12" to={chemin('parametrage', { s: 'nouveautes' })}>
                  <Icone nom="sparkles" taille={18} />
                  <span>{t('Nouveautés EX-01 à EX-06')}</span>
                </Link>
              )}
            </Panel>
          </div>
        </>
      )}
      <DecisionMotivee
        ouverte={!!cible}
        fermer={() => setCible(null)}
        titre={cible ? tf('{a} {c}', { a: cible.ouvert ? t('Fermer') : t('Ouvrir'), c: cible.code }) : ''}
        resume={cible ? tf('{l} : {e} dans les six espaces après la contre-signature.', { l: t(cible.libelle), e: cible.ouvert ? t('cachée') : t('visible') }) : ''}
        libelle="Demander"
        quatreYeux
        rolesSecond={['superviseur', 'finance']}
        envoyer={async (m) => {
          const r = await source.pilotage.demanderBascule(cible!.code, !cible!.ouvert, m)
          l.relire()
          if (!r.ok) return t(RAISONS[r.raison] ?? 'Refusé.')
          setMsg(tf('{id} attend son second validateur (Direction ou Finance, autre compte).', { id: r.id }))
          return null
        }}
      />
    </Ecran>
  )
}
