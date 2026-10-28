// ENT-P04 · Zones et capacité. Les douze zones BelivaY sur la carte OpenStreetMap (la carte BelivaY fait foi :
// ENT-P04R-05), les zones déclarées par l'entreprise avec leur capacité honnête, leurs horaires, leurs livreurs, leur
// relais et leur santé (délai tenu sur la fenêtre du registre, litiges), l'état de chaque zone (ouverte, en pause,
// bloquée et sa raison : ENT-04-R02). Déclarer une zone (au moins un livreur actif coché : 422 sinon, ENT-P04R-01 ;
// capacité jamais au-delà de ce que la flotte cochée tient : ENT-RG-R54), modifier capacité, horaires et livreurs,
// mettre en pause (retrait dès le paquet suivant, acceptés dus : ENT-P04R-03). Une zone non exploitée se déclare mais
// ne reçoit aucun paquet avant son ouverture (ENT-RG-R53, DED-23). Saison des pluies : délai saisonnier « fixé par
// BelivaY » (ENT-P04R-07). Droits : propriétaire et répartiteur ; le comptable lit (ENT-02-R60).
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { jouer } from '@client/composants/Sons'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Livreur } from '../../donnees/domaines/livreurs'
import type { DeclarationZone, RefusZone, ZoneCarte, ZoneEntreprise } from '../../donnees/domaines/zones'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { PARAMETRES_FLOTTE, delaiTenu } from '../../calculs/flotte'
import { usePreferences } from '../../preferences'
import { useHorloge, usePeut } from '../../session'
import { Av, Barre, BarresH, Champ, exporterCsv, Kpi, Kv, Li, Note, Panel, Pill, Rangee, Sec, Table, type Ton, Verrou, Vide } from '../../composants/prototype'
import { Chargement, ErreurLecture, useFeuilleParams } from '../ENT-03/outils'
import { CarteZones, LegendeZones } from './CarteZones'
import { Ecran } from '../../composants/coque'

const P = PARAMETRES_FLOTTE
const ETAT: Record<ZoneEntreprise['etat'], [string, Ton]> = { ouverte: ['Active', 'green'], pause: ['En pause', 'ink'], bloquee: ['Bloquée', 'red'], retiree: ['Retirée par BelivaY', 'red'] }
const RAISON: Record<string, string> = { aucun_livreur: 'aucun livreur actif rattaché', piece: 'aucun véhicule ou pièce valide' }
const REFUS: Record<RefusZone, string> = {
  pas_ouverte: 'Cette zone n’est pas encore ouverte.',
  deja: 'Cette zone est déjà déclarée.',
  aucun_livreur: 'Cochez au moins un livreur actif : une zone sans livreur ne reçoit aucun paquet.',
  capacite: 'Capacité impossible : entre les colis déjà acceptés aujourd’hui et ce que les livreurs cochés peuvent tenir.',
  horaires: 'Horaires hors des heures de service logistique.',
  inconnue: 'Zone inconnue.',
}
/** Un livreur qui peut tenir une zone : actif et véhicule proposé à l'affectation (pas d'alerte de véhicule). */
export const disponible = (l: Livreur) => ['actif', 'en_ligne', 'en_mission'].includes(l.statut) && !l.retraitDemande && !(l.alertes ?? []).some((a) => a.startsWith('vehicule') || a === 'sans_vehicule')
const heures = Array.from({ length: P.service.fin - P.service.debut + 1 }, (_, i) => P.service.debut + i)
const santeDe = (z: ZoneEntreprise) => (z.sante ? delaiTenu(z.sante.dansLeDelai, z.sante.remis) : null)

/** Formulaire de déclaration ou de modification d'une zone. */
function FormZone({ zone, carte, livreurs, fermer }: { zone: ZoneEntreprise | null; carte: ZoneCarte[]; livreurs: Livreur[]; fermer: () => void }) {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const libres = carte.filter((z) => !z.declaree)
  const [code, setCode] = useState(zone?.code ?? (params.get('z') && libres.some((z) => z.code === params.get('z')) ? params.get('z')! : (libres.find((z) => z.exploitee)?.code ?? libres[0]?.code ?? '')))
  const [capacite, setCapacite] = useState(String(zone?.capacite ?? ''))
  const [debut, setDebut] = useState(zone?.horaires?.debut ?? P.service.debut)
  const [fin, setFin] = useState(zone?.horaires?.fin ?? P.service.fin)
  const [coches, setCoches] = useState<string[]>(zone?.livreurs ?? [])
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const cible = carte.find((z) => z.code === code)
  const tenable = livreurs.filter((l) => coches.includes(l.id) && disponible(l)).reduce((n, l) => n + (l.capacite ?? 0), 0)
  const n = Number(capacite)
  const valide = !!code && coches.some((id) => livreurs.find((l) => l.id === id && disponible(l))) && Number.isInteger(n) && n >= Math.max(1, zone?.acceptes ?? 0) && n <= tenable && debut < fin
  const envoyer = async () => {
    setEnvoi(true)
    setErreur(null)
    const d: DeclarationZone = { capacite: n, debut, fin, livreurs: coches }
    const r = zone ? await source.zones.modifier(zone.code, d) : await source.zones.declarer(code, d)
    setEnvoi(false)
    if (!r.ok) {
      setErreur(t(REFUS[r.raison]))
      jouer('erreur')
      return
    }
    jouer('interrupteur')
    fermer()
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (valide && !envoi) void envoyer()
      }}
    >
      <h2 className="card-t">{zone ? tf('Modifier {code} · {nom}', { code: zone.code, nom: zone.nom }) : t('Déclarer une zone')}</h2>
      {!zone && (
        <Champ t={t('Zone BelivaY')}>
          <select value={code} onChange={(e) => setCode(e.target.value)}>
            {libres.map((z) => (
              <option key={z.code} value={z.code}>
                {`${z.code} · ${z.nom}${z.exploitee ? '' : ' — ' + t('vente seulement')}`}
              </option>
            ))}
          </select>
        </Champ>
      )}
      {cible && !cible.exploitee && (
        <Note ton="amber" icone="info" className="mt10">

          {t('Zone ouverte à la vente seulement : vous pouvez la déclarer, elle ne recevra aucun paquet avant son ouverture logistique par BelivaY.')}

        </Note>
      )}
      <Champ t={t('Livreurs rattachés (au moins un actif)')} groupe>
        <div className="entA-chk">
          {livreurs.map((l) => {
            const ok = disponible(l)
            return (
              <label key={l.id}>
                <input type="checkbox" checked={coches.includes(l.id)} disabled={!ok && !coches.includes(l.id)} onChange={(e) => setCoches((c) => (e.target.checked ? [...c, l.id] : c.filter((x) => x !== l.id)))} />
                {l.nom}
                <small>{ok ? tf('{n} colis/j', { n: l.capacite ?? 0 }) : t('indisponible')}</small>
              </label>
            )
          })}
        </div>
      </Champ>
      <Champ t={t('Capacité par jour (colis)')}>
        <input type="number" inputMode="numeric" min={Math.max(1, zone?.acceptes ?? 0)} max={tenable || undefined} value={capacite} onChange={(e) => setCapacite(e.target.value)} aria-invalid={capacite !== '' && !(n >= 1 && n <= tenable)} />
        <span className="aide">{tenable ? tf('Ce que votre flotte peut vraiment tenir : {n} colis par jour au plus avec les livreurs cochés.', { n: tenable }) : t('Cochez un livreur actif pour connaître ce que la flotte peut tenir.')}</span>
        {zone && zone.acceptes > 0 && <span className="aide">{tf('Déjà {n} colis acceptés aujourd’hui : ils restent dus.', { n: zone.acceptes })}</span>}
      </Champ>
      <div className="g g2">
        <Champ t={t('Début')}>
          <select value={debut} onChange={(e) => setDebut(Number(e.target.value))}>
            {heures.slice(0, -1).map((h) => (
              <option key={h} value={h}>
                {tf('{h} h', { h })}
              </option>
            ))}
          </select>
        </Champ>
        <Champ t={t('Fin')}>
          <select value={fin} onChange={(e) => setFin(Number(e.target.value))} aria-invalid={debut >= fin}>
            {heures.slice(1).map((h) => (
              <option key={h} value={h}>
                {tf('{h} h', { h })}
              </option>
            ))}
          </select>
        </Champ>
      </div>
      <p className="aide mt10">{tf('Heures de service logistique : {jours}, {debut} h – {fin} h (fixé par BelivaY).', { jours: P.service.jours, debut: P.service.debut, fin: P.service.fin })}</p>
      {erreur && (
        <p className="err mt10" role="alert">
          {erreur}
        </p>
      )}
      <div className="btns mt16">
        <button type="submit" className="btn primary" disabled={!valide || envoi}>
          <Icone nom={zone ? 'check' : 'map-pinned'} taille={18} />
          <span>{zone ? t('Enregistrer') : t('Déclarer la zone')}</span>
        </button>
        <button type="button" className="btn ghost" onClick={fermer}>
          {t('Annuler')}
        </button>
      </div>
    </form>
  )
}

export default function Zones() {
  const { t, tf } = usePreferences()
  const maintenant = useHorloge()
  const peut = usePeut(['proprietaire', 'repartiteur'])
  const [params, setParams] = useSearchParams()
  const zones = useLecture(() => source.zones.zones())
  const carte = useLecture(() => source.zones.carte())
  const quartiers = useLecture(() => source.zones.quartiers())
  const livreurs = useLecture(() => source.livreurs.liste())
  const compte = useLecture(() => source.compte.etat())
  const fiche = useFeuilleParams('fiche', ['z'])
  const declarer = useFeuilleParams('declarer', ['z'])
  const modifier = useFeuilleParams('modifier', ['z'])
  const [cherche, setCherche] = useState('')
  const filtre = params.get('etat') ?? ''
  const zs = zones.donnees
  const ls = livreurs.donnees ?? []
  const erreur = zones.erreur ?? carte.erreur ?? livreurs.erreur
  const relire = () => [zones, carte, quartiers, livreurs].forEach((l) => l.relire())
  const alertes = useMemo(() => (zs ?? []).filter((z) => santeDe(z)?.alerte).map((z) => z.code), [zs])
  const ouvertes = (zs ?? []).filter((z) => z.etat === 'ouverte' && z.exploitee)
  const exploitees = (carte.donnees ?? []).filter((z) => z.exploitee).length
  const sante = (zs ?? []).reduce((a, z) => ({ d: a.d + (z.sante?.dansLeDelai ?? 0), r: a.r + (z.sante?.remis ?? 0) }), { d: 0, r: 0 })
  const santeGlobale = delaiTenu(sante.d, sante.r)
  const bloquee = (zs ?? []).find((z) => z.etat === 'bloquee')
  const zFiche = zs?.find((z) => z.code === fiche.param('z'))
  const zModif = zs?.find((z) => z.code === modifier.param('z'))
  const visibles = (zs ?? []).filter((z) => !filtre || z.etat === filtre).sort((a, b) => Number(a.code.slice(1)) - Number(b.code.slice(1)))
  const surZone = (code: string) => (zs?.some((z) => z.code === code) ? fiche.ouvrir({ z: code }) : peut ? declarer.ouvrir({ z: code }) : undefined)
  const pause = async (z: ZoneEntreprise) => {
    const r = await source.zones.mettreEnPause(z.code, z.etat !== 'pause')
    jouer(r.ok ? 'interrupteur' : 'erreur')
  }
  const nomLivreur = (id: string) => ls.find((l) => l.id === id)
  const vehiculesAlertes = ls.filter((l) => (l.alertes ?? []).some((a) => a.startsWith('vehicule')))
  const actions = peut ? (
    <button type="button" className="btn primary" onClick={() => declarer.ouvrir()}>
      <Icone nom="plus" taille={18} />
      <span>{t('Déclarer une zone')}</span>
    </button>
  ) : null
  // Export de la capacité par zone (M6) : ce que le tableau affiche, en CSV.
  const exporterCapacite = () =>
    exporterCsv('zones-capacite.csv', [t('Zone'), t('État'), t('Capacité par jour'), t('Acceptés aujourd’hui'), t('Libres'), tf('Délai tenu ({n} jours)', { n: P.fenetreSanteJours }), t('Litiges')], (zs ?? []).map((z) => [`${z.code} ${z.nom}`, t(ETAT[z.etat][0]), z.capacite, z.acceptes, Math.max(0, z.capacite - z.acceptes), santeDe(z) ? `${santeDe(z)!.pct} %` : '', z.sante?.litiges ?? 0]))
  const quartiersParZone = (zs ?? [])
    .map((z) => ({ z, q: (quartiers.donnees ?? []).filter((q) => q.zone === z.code && (!cherche || [q.nom, ...q.alias].some((x) => x.toLowerCase().includes(cherche.toLowerCase())))) }))
    .filter((x) => x.q.length > 0)
  const panneauQuartiers = (
    <Panel titre={t('Table de correspondance des quartiers')} icone="map" droite={<Verrou>{t('Tenue par BelivaY')}</Verrou>}>
      <div className="dt-tools" style={{ padding: '0 0 10px', borderBottom: 0 }}>
        <label className="srch" style={{ flex: 1 }}>
          <Icone nom="search" taille={16} />
          <input type="search" value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder={t('Chercher un quartier')} aria-label={t('Chercher un quartier')} />
        </label>
      </div>
      <div className="entA-kv2">
        {quartiersParZone.map(({ z, q }) => (
          <Kv
            key={z.code}
            k={
              <button type="button" className="lien-b" onClick={() => fiche.ouvrir({ z: z.code })} aria-label={tf('Voir la zone {z} sur la carte', { z: `${z.code} ${z.nom}` })}>
                {`${z.code} ${z.nom}`}
              </button>
            }
            v={
              <span className="t12 c2" style={{ fontWeight: 600 }}>
                {q.map((x) => x.nom).join(', ')}
              </span>
            }
          />
        ))}
        {cherche && quartiersParZone.length === 0 && <div className="t13 c3">{t('Aucun quartier de vos zones ne correspond.')}</div>}
      </div>
      <div className="t12 c3 mt8 lh">{t('Chaque quartier appartient à une seule zone BelivaY ; la carte BelivaY fait foi face à votre découpage. La table, alias de quartiers compris, est tenue par la console. Une adresse que la table ne sait pas placer n’est jamais proposée en paquet.')}</div>
    </Panel>
  )
  const carteBloc = carte.donnees && (
    <div className="entA-map">
      <CarteZones zones={carte.donnees} titre={t('Carte des zones de Yaoundé')} surZone={surZone} actives={peut ? undefined : zs?.map((z) => z.code)} alertes={alertes} choisie={fiche.param('z')} hauteurMax={560} />
      <LegendeZones />
    </div>
  )
  const sansSante = (zs ?? []).filter((z) => !santeDe(z))
  const litiges = (zs ?? []).filter((z) => (z.sante?.litiges ?? 0) > 0)

  return (
    <Ecran
      route="zones"
      actions={actions}
      fixes={
        <>
          <Feuille ouverte={fiche.ouverte && !!zFiche} fermer={fiche.fermer} titre={zFiche ? `${zFiche.code} · ${zFiche.nom}` : ''} forme="tiroir">
            {zFiche && (
              <div>
                <p className="kick">{t('Fiche de zone')}</p>
                <h2 className="card-t mt10">{`${zFiche.code} · ${zFiche.nom}`}</h2>
                <div className="e-pills mt10">
                  <Pill ton={ETAT[zFiche.etat][1]} dot sm>{t(ETAT[zFiche.etat][0])}</Pill>
                  {!zFiche.exploitee && <span className="pill ambre">{t('En attente d’ouverture')}</span>}
                </div>
                {zFiche.etat === 'bloquee' && <Note ton="red" icone="circle-x" className="mt10">{tf('Bloquée : {raison}. Elle ne reçoit plus de paquet et redevient active dès que la cause est levée.', { raison: t(RAISON[zFiche.raisonBlocage ?? 'aucun_livreur']) })}</Note>}
                <div className="mt14">
                  <div className="kv"><span className="k">{t('Capacité par jour')}</span><span className="v">{tf('{n} colis', { n: zFiche.capacite })}</span></div>
                  <div className="kv"><span className="k">{t('Acceptés aujourd’hui')}</span><span className="v">{zFiche.acceptes}</span></div>
                  <div className="kv"><span className="k">{t('Libres')}</span><span className="v">{Math.max(0, zFiche.capacite - zFiche.acceptes)}</span></div>
                  <div className="kv"><span className="k">{t('Horaires')}</span><span className="v">{tf('{debut} h – {fin} h', { debut: zFiche.horaires?.debut ?? P.service.debut, fin: zFiche.horaires?.fin ?? P.service.fin })}</span></div>
                  <div className="kv"><span className="k">{t('Relais de la zone')}</span><span className="v">{zFiche.relais ? `${zFiche.relais.nom} · ${tf('ferme à {h}', { h: zFiche.relais.fermeture })}` : t('Aucun relais ouvert')}</span></div>
                  <div className="kv"><span className="k">{tf('Délai tenu ({n} jours)', { n: P.fenetreSanteJours })}</span><span className="v">{santeDe(zFiche) ? `${santeDe(zFiche)!.pct} %` : t('aucun colis remis encore')}</span></div>
                  <div className="kv"><span className="k">{t('Litiges')}</span><span className="v">{zFiche.sante?.litiges ?? 0}</span></div>
                </div>
                <Sec t={t('Livreurs rattachés')} />
                {zFiche.livreurs?.length ? (
                  <div>
                    {zFiche.livreurs.map((id) => {
                      const l = nomLivreur(id)
                      return l ? <Li key={id} to={chemin('livreur', { id })} gauche={<Av initiales={l.initiales} taille={34} ton={disponible(l) ? undefined : 'gris'} />} t={l.nom} s={disponible(l) ? tf('{n} colis par jour', { n: l.capacite ?? 0 }) : t('indisponible')} /> : null
                    })}
                  </div>
                ) : (
                  <p className="t13 c3">{t('Aucun livreur rattaché.')}</p>
                )}
                {peut && (
                  <>
                    <div className="hr" />
                    <button type="button" role="switch" aria-checked={zFiche.etat === 'pause'} className="btn ghost bloc" onClick={() => void pause(zFiche)} disabled={zFiche.etat === 'retiree'}>
                      <Icone nom={zFiche.etat === 'pause' ? 'circle-check' : 'pause'} taille={18} />
                      <span>{zFiche.etat === 'pause' ? t('Reprendre la zone') : t('Mettre en pause')}</span>
                    </button>
                    <p className="aide mt10">{t('En pause, vous ne recevez plus de paquet de cette zone à partir du suivant ; les paquets acceptés restent dus.')}</p>
                    <button type="button" className="btn primary bloc mt10" onClick={() => modifier.ouvrir({ z: zFiche.code })}>
                      <Icone nom="pencil" taille={18} />
                      <span>{t('Modifier capacité, horaires, livreurs')}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </Feuille>
          <Feuille ouverte={declarer.ouverte && !!carte.donnees && peut} fermer={declarer.fermer} titre={t('Déclarer une zone')}>
            {carte.donnees && <FormZone zone={null} carte={carte.donnees} livreurs={ls} fermer={declarer.fermer} />}
          </Feuille>
          <Feuille ouverte={modifier.ouverte && !!zModif && peut} fermer={modifier.fermer} titre={t('Modifier une zone')}>
            {zModif && carte.donnees && <FormZone zone={zModif} carte={carte.donnees} livreurs={ls} fermer={modifier.fermer} />}
          </Feuille>
        </>
      }
    >
      {erreur ? (
        <ErreurLecture erreur={erreur} relire={relire} lu={zs ? maintenant : null} />
      ) : bloquee ? (
        <div className="dk-banner red" role="status">
          <Icone nom="circle-alert" taille={20} />
          <div className="grow">
            <b>{tf('{code} {nom} est bloquée : {raison}.', { code: bloquee.code, nom: bloquee.nom, raison: t(RAISON[bloquee.raisonBlocage ?? 'aucun_livreur']) })}</b> {t('Les paquets de cette zone ne vous sont plus proposés jusqu’à la correction.')}
          </div>
          {peut &&
            (bloquee.raisonBlocage === 'piece' ? (
              <Link className="btn primary" to={chemin('vehicules')}>
                <Icone nom="upload" taille={18} />
                <span>{t('Mettre à jour l’assurance')}</span>
              </Link>
            ) : (
              <button type="button" className="btn primary" onClick={() => modifier.ouvrir({ z: bloquee.code })}>
                <Icone nom="user-plus" taille={18} />
                <span>{t('Rattacher un livreur')}</span>
              </button>
            ))}
        </div>
      ) : null}
      {!zs || !carte.donnees ? (
        !erreur && <Chargement lignes={4} />
      ) : zs.length === 0 ? (
        <div className="g g21" style={{ alignItems: 'start' }}>
          <Panel>
            <Vide
              icone="map-pinned"
              t={t('Aucune zone déclarée')}
              s={t('Choisissez sur la carte les zones où vous livrez vraiment, avec la capacité par jour, les horaires et les livreurs rattachés. Une zone n’est active qu’avec au moins un livreur actif : commencez par inviter vos livreurs.')}
              action={
                peut ? (
                  <>
                    <Link className="btn primary" to={chemin('ajout')}>
                      <Icone nom="user-plus" taille={18} />
                      <span>{t('Ajouter un livreur')}</span>
                    </Link>
                    <button type="button" className="btn secondary" onClick={() => declarer.ouvrir()}>
                      <Icone nom="map-pinned" taille={18} />
                      <span>{t('Déclarer une zone')}</span>
                    </button>
                  </>
                ) : undefined
              }
            />
            <div className="mt8">{carteBloc}</div>
          </Panel>
          <div className="col" style={{ gap: 16 }}>
            <Note ton="acc" icone="info">
              {tf('{n} zones sont exploitées au lancement. Les autres sont ouvertes à la vente seulement : vous pouvez les déclarer, elles ne recevront des paquets qu’à leur ouverture logistique.', { n: exploitees })}
            </Note>
            {panneauQuartiers}
          </div>
        </div>
      ) : (
        <>
          <div className="g g4">
            <Kpi icone="map-pinned" iton={bloquee ? 'red' : undefined} k={t('Zones actives')} v={ouvertes.length} u={tf('sur {n}', { n: exploitees })} s={ouvertes.map((z) => z.code).join(', ') || t('aucune')} />
            <Kpi icone="gauge" k={t('Capacité déclarée')} v={ouvertes.reduce((n, z) => n + z.capacite, 0)} u={t('colis / jour')} s={ouvertes.map((z) => z.capacite).join(' + ')} />
            <Kpi icone="boxes" ton="night" k={t('Acceptés aujourd’hui')} v={ouvertes.reduce((n, z) => n + z.acceptes, 0) || '—'} u={ouvertes.reduce((n, z) => n + z.acceptes, 0) ? t('colis') : undefined} s={tf('{n} colis de capacité libre', { n: ouvertes.reduce((n, z) => n + Math.max(0, z.capacite - z.acceptes), 0) })} />
            <Kpi icone="timer" iton={santeGlobale?.alerte ? 'amber' : 'green'} k={tf('Délai tenu · {n} jours', { n: P.fenetreSanteJours })} v={santeGlobale ? santeGlobale.pct : '—'} u={santeGlobale ? '%' : undefined} s={santeGlobale ? tf('{d} colis sur {r} dans la promesse', { d: sante.d, r: sante.r }) : t('aucun colis remis encore')} />
          </div>

          <div className="g g21">
            {carteBloc}
            <div className="col" style={{ gap: 16 }}>
              <Panel titre={t('Santé des zones')} icone="activity">
                <BarresH
                  largeurLibelle={116}
                  lignes={zs
                    .filter((z) => santeDe(z))
                    .map((z) => {
                      const v = santeDe(z)!
                      return { l: `${z.code} ${z.nom}`, v: v.pct, max: 100, r: `${v.pct} %`, ton: v.pct < P.seuilDelaiTenu ? 'red' : 'acc', label: tf('{z} : {p} % dans la promesse', { z: z.code, p: v.pct }) }
                    })}
                />
                <div className="t12 c3 mt6">{tf('Part des colis livrés dans la promesse sur {n} jours glissants. Sous {s} % : alerte, puis capacité réduite par BelivaY après validation humaine.', { n: P.fenetreSanteJours, s: P.seuilDelaiTenu })}</div>
                {(sansSante.length > 0 || litiges.length > 0) && <div className="hr"></div>}
                {sansSante.map((z) => (
                  <Kv key={z.code} k={`${z.code} ${z.nom}`} v={t('aucun colis remis encore')} />
                ))}
                {litiges.length > 0 && <Kv k={t('Litiges en cours')} v={litiges.map((z) => `${z.code} · ${z.sante!.litiges}`).join(', ')} />}
              </Panel>
              {vehiculesAlertes.map((l) => (
                <Note key={l.id} ton="amber" icone="car">
                  <b>{tf('Véhicule de {nom}', { nom: l.nom })}</b> {t('non proposé à l’affectation : sans renouvellement, ses zones peuvent être bloquées.')}{' '}
                  <Link to={chemin('vehicules')}>{t('Voir les véhicules')}</Link>
                </Note>
              ))}
              <Panel titre={t('Saison des pluies')} icone="cloud-rain" droite={<Verrou>{t('Fixé par BelivaY')}</Verrou>}>
                <div className="t13 c2 lh">{compte.donnees?.pluie ? tf('Délai saisonnier en vigueur : +{h} h sur la promesse, annoncé aux clients avant paiement.', { h: P.pluieHeures }) : tf('Aucun délai saisonnier en vigueur aujourd’hui. Quand la console en applique un par zone (+{h} h sur la promesse), il s’affiche ici et au tableau de bord ; les clients le voient avant de payer.', { h: P.pluieHeures })}</div>
              </Panel>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <Table
              legende={t('Zones déclarées')}
              outils={
                <>
                  <span className="b8 t14">{t('Zones déclarées')}</span>
                  <Pill sm>{tf('{n} sur {t}', { n: zs.length, t: carte.donnees.length })}</Pill>
                  <span className="sp"></span>
                  <button type="button" className="btn sm ghost" onClick={exporterCapacite} disabled={!zs.length}>
                    <Icone nom="download" taille={16} />
                    <span>{t('Exporter (CSV)')}</span>
                  </button>
                  <label className={'flt' + (filtre ? ' on' : '')}>
                    <Icone nom="filter" taille={15} />
                    <span className="vh">{t('Filtrer par état')}</span>
                    <select
                      value={filtre}
                      onChange={(e) => {
                        const p = new URLSearchParams(params)
                        if (e.target.value) p.set('etat', e.target.value)
                        else p.delete('etat')
                        setParams(p, { replace: true })
                      }}
                    >
                      <option value="">{t('État : toutes')}</option>
                      <option value="ouverte">{t('Active')}</option>
                      <option value="pause">{t('En pause')}</option>
                      <option value="bloquee">{t('Bloquée')}</option>
                    </select>
                  </label>
                  <span className="lock">
                    <Icone nom="lock" taille={14} />
                    {t('Découpage des zones : carte BelivaY')}
                  </span>
                </>
              }
              pied={
                <>
                  <span>{tf('Capacité totale déclarée : {n} colis par jour · la capacité libre se décompte à chaque acceptation', { n: zs.reduce((n, z) => n + z.capacite, 0) })}</span>
                  <span>{tf('Service {jours}, {debut} h – {fin} h', { jours: P.service.jours, debut: P.service.debut, fin: P.service.fin })}</span>
                </>
              }
              cle={(z) => z.code}
              ligneCls={(z) => (z.etat === 'bloquee' ? 'bad' : santeDe(z)?.alerte ? 'warn' : '')}
              rows={visibles}
              cols={[
                {
                  k: 'zone',
                  t: t('Zone'),
                  main: true,
                  rendu: (z) => (
                    <div className="row" style={{ gap: 10 }}>
                      <span className="entA-zc" style={{ margin: 0 }}>
                        {z.code}
                      </span>
                      <span>
                        <b style={{ display: 'block' }}>{z.nom}</b>
                        <span className="t12 c3" style={{ display: 'block', maxWidth: 190 }}>
                          {z.relais ? `${z.relais.nom} · ${tf('ferme à {h}', { h: z.relais.fermeture })}` : t('Aucun relais ouvert')}
                        </span>
                      </span>
                    </div>
                  ),
                },
                {
                  k: 'cap',
                  t: t('Capacité et horaires'),
                  rendu: (z) => (
                    <div className="entA-c">
                      <b>{z.capacite}</b> <span className="t12 c3">{t('colis / jour')}</span>
                      <div className="t12 c3 mt4">{tf('{debut} h – {fin} h', { debut: z.horaires?.debut ?? P.service.debut, fin: z.horaires?.fin ?? P.service.fin })}</div>
                    </div>
                  ),
                },
                {
                  k: 'today',
                  t: t('Aujourd’hui'),
                  rendu: (z) => (
                    <div className="entA-c">
                      <b>{z.acceptes}</b> <span className="t12 c3">{tf('acceptés · {n} libres', { n: Math.max(0, z.capacite - z.acceptes) })}</span>
                      <div style={{ marginTop: 6, width: 120, maxWidth: '100%' }}>
                        <Barre pct={(100 * z.acceptes) / Math.max(1, z.capacite)} aria={tf('{a} colis acceptés sur {c}', { a: z.acceptes, c: z.capacite })} ton={z.acceptes >= z.capacite ? 'red' : 'acc'} />
                      </div>
                    </div>
                  ),
                },
                {
                  k: 'liv',
                  t: t('Livreurs et véhicules'),
                  rendu: (z) => {
                    const rattaches = (z.livreurs ?? []).map(nomLivreur).filter((x): x is Livreur => !!x)
                    return (
                      <div className="entA-c">
                        <div className="row" style={{ gap: 8 }}>
                          <span className="entA-avs">
                            {rattaches.map((l) => (
                              <span key={l.id} title={l.nom}>
                                <Av initiales={l.initiales} taille={28} ton={disponible(l) ? undefined : 'gris'} />
                              </span>
                            ))}
                          </span>
                          <span className="t12 c3">{tf('{n} actif(s)', { n: rattaches.filter(disponible).length })}</span>
                        </div>
                        <div className="t12 c3 mt4" style={{ maxWidth: 230 }}>
                          {rattaches.map((l) => l.plaque).filter(Boolean).join(' · ') || t('aucun véhicule proposé')}
                        </div>
                      </div>
                    )
                  },
                },
                {
                  k: 'sante',
                  t: tf('Santé · {n} jours', { n: P.fenetreSanteJours }),
                  rendu: (z) => {
                    const v = santeDe(z)
                    return (
                      <div className="entA-c">
                        {v ? (
                          <>
                            <b>{`${v.pct} %`}</b> <span className="t12 c3">{t('dans la promesse')}</span>
                          </>
                        ) : (
                          <span className="t12 c3">{t('aucun colis remis encore')}</span>
                        )}
                        <div className={'t12 ' + (z.sante?.litiges ? 'b7' : 'c3')} style={z.sante?.litiges ? { color: 'var(--amber)' } : undefined}>
                          {z.sante?.litiges ? tf('{n} litige(s) en cours', { n: z.sante.litiges }) : t('aucun litige')}
                        </div>
                      </div>
                    )
                  },
                },
                {
                  k: 'etat',
                  t: t('État'),
                  rendu: (z) => (
                    <div className="entA-c">
                      <Pill ton={z.etat === 'ouverte' ? 'green' : z.etat === 'pause' ? 'ink' : 'red'} dot sm>
                        {t(ETAT[z.etat][0])}
                      </Pill>
                      {!z.exploitee && <div className="t12 c3 mt4">{t('en attente d’ouverture')}</div>}
                      {z.etat === 'bloquee' && (
                        <div className="t12 b7 mt4" style={{ color: 'var(--red)', maxWidth: 190 }}>
                          {t(RAISON[z.raisonBlocage ?? 'aucun_livreur'])}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  k: 'go',
                  t: <span className="vh">{t('Ouvrir')}</span>,
                  l: t('Ouvrir'),
                  rendu: (z) => (
                    <button type="button" className="btn sm secondary" onClick={() => fiche.ouvrir({ z: z.code })} aria-label={tf('Ouvrir la fiche de {code}', { code: z.code })}>
                      <Icone nom="chevron-right" taille={18} />
                    </button>
                  ),
                },
              ]}
            />
            {visibles.length === 0 && <Vide icone="filter" t={t('Aucune zone dans cet état')} s={t('Changez de filtre pour voir vos autres zones.')} />}
          </div>

          <div className="g g2">
            {panneauQuartiers}
            <Panel titre={t('Capacité honnête')} icone="scale">
              <Rangee icone="gauge" ton="acc" titre={t('La capacité est une limite dure')} sous={t('Vous ne pouvez pas accepter au-delà de la capacité libre d’une zone ; elle se décompte à chaque acceptation.')} />
              <Rangee icone="users" ton="acc" titre={t('Au moins un livreur actif')} sous={t('Une zone n’est active qu’avec au moins un livreur actif et un véhicule valide ; jamais une capacité que la flotte ne peut pas tenir.')} />
              <Rangee icone="circle-pause" ton="acc" titre={t('Pause d’une zone')} sous={t('Effet dès le paquet suivant ; les paquets acceptés restent dus.')} />
              {peut && (
                <div className="btns">
                  <Link className="btn secondary" to={chemin('flotte')}>
                    <Icone nom="users" taille={18} />
                    <span>{t('Voir la flotte')}</span>
                  </Link>
                </div>
              )}
            </Panel>
          </div>
        </>
      )}
    </Ecran>
  )
}
