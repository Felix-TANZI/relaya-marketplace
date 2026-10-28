// LIV-P19 · Collecte au relais : les départs — même passage que le dépôt (LIV-PAQ-03). La gérante PRÉSENTE chaque colis
// sortant dans son application ; le livreur le confirme sur son téléphone : la garde lui passe, horodatée (heure
// d'origine hors connexion) ; « Confirmer » n'existe que pour un colis présenté, aucune saisie libre d'étiquette.
// Motif et destination de chaque sortie visibles (garde dépassée, retour validé, changement de relais, refus au
// comptoir, fermeture). Scellé abîmé : photo AVANT de le prendre, constat rattaché au relais. Colis attendu absent :
// signalé, il reste en tête de liste au relais, alerte support après LIV-COLLECTE-ALERTE-H. Plus de colis que de place :
// prendre ce qui tient, le reste est reprogrammé. Un colis de retour (RT-…) n'est jamais ouvert.
// Structure : route « collecte » du prototype (07_remises.js) — avancement compact, carte du relais, consigne, colis
// sortants, colis manquant, scellé abîmé, motifs de sortie, rappels, barre d'action ; collecte terminée : héros,
// destinations dans la tournée.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { ColisDepart, MotifDepart } from '../../donnees/domaines/remises'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useArrivee } from '../../composants/livraison/arrivee'
import { AideDemo, BandeauModification, useArret } from '../../composants/livraison/contexte'
import { Chargement, Erreur, Message, RienIci, useAgir } from '../../composants/livraison/outils'
import { Arret as ArretLigne, BarreAction, Hint, Lvp, Note, Pill, Sec } from '../../composants/proto'
import { AideEtape, AvisAnnuler, Recherche, normer, useDiffere } from '../../composants/livraison/enrichi'
import { CarteRelais, Colis, Etat, FileRemise, Hk, HorsLigneRemise, PhotoPreuve, Prog, ResteUrgent } from './commun'
import { Enchainement } from '../../composants/livraison/terrain'

/** Motif de sortie et ce qu'il devient (prototype : « Motifs de sortie possibles »). */
const MOTIFS: Record<MotifDepart, [string, string]> = {
  garde_depassee: ['Garde dépassée', 'Renvoi au vendeur'],
  retour_valide: ['Retour validé', 'Vers le vendeur'],
  changement_relais: ['Changement de relais', 'Transfert'],
  refus_comptoir: ['Refus au comptoir', 'Renvoi au vendeur'],
  fermeture: ['Fermeture déclarée', 'Relais voisin'],
}

/** livRem_out : colis sortant (pris ✓, présenté → « Confirmer », manquant ✗, pas encore présenté). */
function LigneDepart({ c, occupe, confirmer }: { c: ColisDepart; occupe: boolean; confirmer: () => void }) {
  const { t, tf, langue } = usePreferences()
  const sous = t(MOTIFS[c.motif][0]) + ' · ' + tf('vers {d}', { d: c.destination })
  if (c.confirmeA) return <Colis st="ok" classe={c.classe} titre={c.etiquette} sous={sous} droite={<Etat ton="green">{heure(c.confirmeA, langue)}</Etat>} />
  if (c.manquant) return <Colis st="bad" classe={c.classe} titre={c.etiquette} sous={sous} droite={<Etat ton="red">{t('Manquant')}</Etat>} />
  if (c.presenteA)
    return (
      <Colis
        classe={c.classe}
        titre={c.etiquette}
        sous={sous}
        droite={
          <button type="button" className="btn primary sm" disabled={occupe} onClick={confirmer}>
            <Icone nom="check" taille={18} />
            <span>{t('Confirmer')}</span>
          </button>
        }
      />
    )
  return <Colis classe={c.classe} titre={c.etiquette} sous={sous} droite={<Etat ton="ink">{t('Pas encore présenté')}</Etat>} />
}

export default function Collecte() {
  const { t, tf, langue } = usePreferences()
  const { lecture, tournee, regles, arret, paquet } = useArret(['collecte'])
  const d = useLecture(() => (arret ? source.remises.collecte(arret.id) : Promise.resolve(null)), [arret?.id])
  const { agir, occupe, enLigne, maintenant } = useAgir()
  const { arriver, refus, feuille } = useArrivee()
  const [erreur, setErreur] = useState(false)
  const [scelle, setScelle] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const differe = useDiffere()
  const col = d.donnees

  const confirmer = async (id: string) => {
    if (!arret) return
    const res = await agir('collecte', id, (o, s) => s.remises.confirmerDepart(arret.id, id, o))
    signal(res?.r.ok ? 'succes' : 'erreur')
    if (scelle === id) setScelle(null)
  }
  const manquant = async (id: string) => {
    if (!arret) return
    await agir('collecte', id, (o, s) => s.remises.departManquant(arret.id, id, o))
    signal('alerte')
  }
  const terminer = async () => {
    if (!arret) return
    const res = await agir('collecte', arret.id, (o, s) => s.remises.terminerCollecte(arret.id, o))
    if (res?.r.ok) signal('succes')
    else {
      signal('erreur')
      setErreur(true)
    }
  }

  const contenu = () => {
    if (lecture.erreur || d.erreur) return <Erreur relire={() => (lecture.relire(), d.relire())} />
    if (!lecture.charge || !regles || (arret && !col)) return <Chargement />
    if (!tournee || !arret || !col) return <RienIci titre="Aucune collecte en cours" texte="Les départs du relais s’ouvrent pour un paquet qui comprend une collecte, quand c’est l’arrêt en cours." icone="package-plus" />
    const surPlace = arret.phase === 'sur_place'
    const pris = col.colis.filter((c) => c.confirmeA)
    const manquants = col.colis.filter((c) => c.manquant)
    const apres = tournee.arrets[tournee.arrets.indexOf(arret) + 1]
    const retour = apres?.type === 'retour' ? apres : null
    const prog = (
      <Prog
        k={tf('Départs · arrêt {i} sur {n}', { i: arret.ordre, n: tournee.arrets.length })}
        titre={t('Départs à reprendre')}
        sous={[paquet?.id, retour ? tf('puis retour chez {vendeur}', { vendeur: retour.nom }) : null].filter(Boolean).join(' · ')}
        n={tournee.colisSousGarde}
        sur={paquet?.colisTotal}
      >
        <ResteUrgent limite={col.termineeA ? null : paquet?.heureLimite} maintenant={maintenant} regles={regles} />
      </Prog>
    )
    const relais = (
      <CarteRelais
        k={tf('Relais de la zone {z}', { z: arret.zone })}
        nom={col.relais}
        gerant={col.gerant}
        minis={[
          [t('Ferme à'), heure(col.fermeture, langue)],
          [t('Départs'), col.colis.length === 1 ? t('1 colis') : tf('{n} colis', { n: col.colis.length })],
          [t('Confirmés'), tf('{n} sur {total}', { n: pris.length, total: col.colis.length })],
        ]}
      />
    )

    // ---------- Collecte terminée : destinations ----------
    if (col.termineeA) {
      const suivant = tournee.arrets.find((a) => a.id === tournee.enCours)
      return (
        <>
          {prog}
          {relais}
          <div className="hero acc">
            <Hk quand={heure(col.termineeA, langue)}>{t('Collecte terminée')}</Hk>
            <div className="row mt10" style={{ gap: 14, alignItems: 'flex-end' }}>
              <div className="bigN">{pris.length}</div>
              <div className="grow">
                <div className="ht" style={{ margin: 0 }}>
                  {t('Colis sous votre garde')}
                </div>
              </div>
            </div>
            <div className="hs">{tf('Sortie confirmée des deux côtés : {prenom} a tendu chaque colis, vous l’avez confirmé sur votre téléphone. Les places sont libérées au relais.', { prenom: col.gerant })}</div>
          </div>
          <Sec titre={t('Destinations dans la tournée')} />
          <div className="card tight">
            <ArretLigne n={arret.ordre} etat="done" titre={col.relais} sous={(() => {
              const n = pris.length === 1 ? t('1 colis') : tf('{n} colis', { n: pris.length })
              const a = heure(Math.min(...pris.map((c) => c.confirmeA!), col.termineeA), langue)
              const b = heure(Math.max(...pris.map((c) => c.confirmeA!), col.termineeA), langue)
              return a === b ? tf('{n} pris à {h}', { n, h: a }) : tf('{n} pris entre {a} et {b}', { n, a, b })
            })()} />
            {retour && (
              <ArretLigne
                n={retour.ordre}
                etat={retour.etat === 'fait' ? 'done' : retour.etat === 'dissocie' ? 'bad' : 'cur'}
                titre={retour.nom + ' · ' + retour.quartier}
                sous={t('Retour vendeur') + ' · ' + pris.map((c) => c.etiquette).join(', ')}
                droite={
                  <Pill ton="or" sm>
                    {t('Retour')}
                  </Pill>
                }
              />
            )}
          </div>
          <div className="card tight">
            {col.colis.map((c) => (
              <LigneDepart key={c.id} c={c} occupe confirmer={() => undefined} />
            ))}
            <div style={{ height: 8 }} />
          </div>
          {manquants.length > 0 && (
            <Note ton="red" icone="package-x">
              {tf('Colis manquant : il reste en tête de liste au relais ; le support est alerté après {n} heures.', { n: regles.collecteAlerteH })}
            </Note>
          )}
          {retour && retour.etat !== 'dissocie' && (
            <Note ton="acc" icone="bell-ring">
              {tf('{vendeur} est prévenu : « votre livreur arrive avec vos colis de retour ».', { vendeur: retour.nom })}
            </Note>
          )}
          <BarreAction>
            <Enchainement />
            <Link className="btn primary xl" to={chemin(suivant?.type === 'retour' ? 'retour-vendeur' : 'tournee', suivant?.type === 'retour' ? { a: suivant.id } : undefined)}>
              <Icone nom="navigation" taille={18} />
              <span>{suivant?.type === 'retour' ? tf('Continuer vers {vendeur}', { vendeur: suivant.nom }) : t('Continuer la tournée')}</span>
            </Link>
          </BarreAction>
        </>
      )
    }

    // ---------- À collecter, colis par colis ----------
    const tousTraites = col.colis.every((c) => c.confirmeA || c.manquant)
    const nonPresentes = col.colis.filter((c) => !c.presenteA && !c.confirmeA && !c.manquant)
    const presentes = col.colis.filter((c) => c.presenteA && !c.confirmeA && !c.manquant)
    const vise = presentes.find((c) => c.id === scelle) ?? presentes.find((c) => c.scelleAbime) ?? null
    return (
      <>
        {!enLigne && <HorsLigneRemise quoi="Vos confirmations sont enregistrées sur le téléphone." />}
        <BandeauModification tournee={tournee} />
        {prog}
        {relais}
        <AideEtape etape="collecte" />
        <Note ton="ink" icone="hand">
          {tf('{prenom} vous tend chaque colis en le touchant dans son application ; il ne sort du relais qu’à votre confirmation, horodatée.', { prenom: col.gerant })}
        </Note>
        <Sec titre={t('Colis sortants')} droite={tf('{n} sur {total}', { n: pris.length, total: col.colis.length })} />
        {col.colis.length > 1 && <Recherche valeur={q} changer={setQ} libelle="Chercher un colis par son code" exemple="Code de l’étiquette" />}
        <div className="card tight">
          {col.colis
            .filter((c) => !q.trim() || normer(c.etiquette).includes(normer(q)))
            .map((c) => (
              <LigneDepart key={c.id} c={c} occupe={occupe || !surPlace} confirmer={() => void confirmer(c.id)} />
            ))}
          {q.trim() && !col.colis.some((c) => normer(c.etiquette).includes(normer(q))) && (
            <div className="lve-zero" role="status">
              <b>{t('Aucun colis ne porte ce code')}</b>
              {tf('Rien pour « {q} » dans les départs annoncés.', { q: q.trim() })}
              <div>
                <button type="button" className="btn secondary sm" onClick={() => setQ('')}>
                  <span>{t('Voir tous les colis')}</span>
                </button>
              </div>
            </div>
          )}
          <div style={{ height: 8 }} />
        </div>

        {manquants.map((c) => (
          <div key={c.id} className="card" style={{ boxShadow: 'var(--shadow-card),inset 3px 0 0 var(--red)' }}>
            <div className="kick" style={{ color: 'var(--red)' }}>
              {t('Colis manquant')}
              {c.manquant ? <span className="lr-t"> · {heure(c.manquant, langue)}</span> : null}
            </div>
            <div className="b8 t17 mt4">{tf('{etiquette} n’a pas été présenté', { etiquette: c.etiquette })}</div>
            <div className="t13 c3 mt4">{tf('Signalé : il reste en tête de liste au relais et le support est alerté s’il n’est toujours pas parti après {n} heures.', { n: regles.collecteAlerteH })}</div>
          </div>
        ))}
        {surPlace && nonPresentes.length > 0 && (
          <div className="card" style={{ boxShadow: 'var(--shadow-card),inset 3px 0 0 var(--red)' }}>
            <div className="kick" style={{ color: 'var(--red)' }}>
              {t('Colis attendu non présenté ?')}
            </div>
            <div className="t13 c3 mt4">{t('Si la gérante ne le trouve pas, signalez-le : il reste en tête de liste au relais.')}</div>
            <div className="btns liva-col">
              {nonPresentes.map((c) => (
                <button key={c.id} type="button" className="btn danger" disabled={occupe || !!differe.attente} onClick={() => differe.lancer(tf('{etiquette} signalé manquant', { etiquette: c.etiquette }), () => manquant(c.id))}>
                  <Icone nom="flag" taille={18} />
                  <span>{tf('Signaler {etiquette} manquant', { etiquette: c.etiquette })}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {surPlace && presentes.length > 0 && (
          <div className="card" style={{ boxShadow: 'var(--shadow-card),inset 3px 0 0 var(--amber)' }}>
            <div className="kick" style={{ color: 'var(--amber)' }}>
              {t('Scellé abîmé · avant de prendre')}
            </div>
            {vise ? (
              <>
                <div className="b8 t17 mt4">{tf('Photographiez {etiquette} avant de le confirmer', { etiquette: vise.etiquette })}</div>
                <div className="t13 c3 mt4">{t('Le constat est rattaché au relais, pas à vous.')}</div>
                <PhotoPreuve
                  titre="Photo du scellé abîmé"
                  sous="Scellé abîmé, avant de prendre le colis."
                  consigne="Scellé abîmé, avant de prendre le colis"
                  nature="scelle"
                  objet={vise.id}
                  type="photo"
                  id={vise.scelleAbime}
                  prise={(p) => void agir('photo', vise.id, (o, s) => s.remises.photoScelle(arret.id, vise.id, p.id, o))}
                />
              </>
            ) : (
              <>
                <div className="t13 c3 mt4">{t('Un scellé abîmé se photographie avant de prendre le colis ; le constat est rattaché au relais, pas à vous.')}</div>
                <div className="chips">
                  {presentes.map((c) => (
                    <button key={c.id} type="button" className="chip" onClick={() => setScelle(c.id)}>
                      <Icone nom="camera" taille={15} />
                      {c.etiquette}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <details className="more">
          <summary>
            <Icone nom="list-checks" taille={18} style={{ color: 'var(--acc-txt)', flexShrink: 0 }} />
            <span className="grow">{t('Motifs de sortie possibles')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
          </summary>
          <div className="more-b">
            <div className="lr-kv" style={{ marginTop: 0 }}>
              {Object.values(MOTIFS).map(([m, v]) => (
                <span key={m} style={{ display: 'contents' }}>
                  <span className="k">{t(m)}</span>
                  <span className="v">{t(v)}</span>
                </span>
              ))}
            </div>
          </div>
        </details>
        <Note ton="red" icone="ban">
          {t('N’ouvrez jamais un colis de retour : il garde son étiquette RT jusqu’au vendeur. Aucun colis ne sort sans votre confirmation.')}
        </Note>
        <Hint icone="bike">{t('Plus de colis que de place sur la moto ? Prenez ce qui tient ; le reste est reprogrammé, jamais de surcharge.')}</Hint>
        {erreur && <Message ton="erreur">{t('Chaque colis annoncé doit être confirmé ou signalé manquant.')}</Message>}
        <FileRemise objets={[arret.id, ...col.colis.map((c) => c.id)]} />

        {surPlace && (
          <AideDemo titre="la gérante du relais">
            <button type="button" disabled={col.colis.every((c) => c.presenteA || c.manquant)} onClick={() => void source.remises.simulerPresentation?.(arret.id)}>
              {t('Elle présente le colis suivant')}
            </button>
          </AideDemo>
        )}

        {surPlace ? (
          <BarreAction aide={!tousTraites ? t('Confirmez chaque colis que la gérante vous tend.') : undefined}>
            <AvisAnnuler d={differe} />
            <button type="button" className="btn primary xl" disabled={!tousTraites || occupe || !!differe.attente} onClick={() => void terminer()}>
              <Icone nom="navigation" taille={18} />
              <span>{retour ? tf('Continuer vers {vendeur}', { vendeur: retour.nom }) : t('Terminer la collecte')}</span>
            </button>
          </BarreAction>
        ) : (
          <BarreAction aide={refus ?? undefined}>
            <button type="button" className="btn primary xl" onClick={() => void arriver(arret)}>
              <Icone nom="map-pin-check" taille={18} />
              <span>{t('Je suis arrivé')}</span>
            </button>
          </BarreAction>
        )}
      </>
    )
  }

  return (
    <Ecran proto route="collecte" titre={col ? tf('Départs · {relais}', { relais: col.relais }) : undefined} fixes={feuille}>
      <Lvp className="liv07">{contenu()}</Lvp>
    </Ecran>
  )
}
