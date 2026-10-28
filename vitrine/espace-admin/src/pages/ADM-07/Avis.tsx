// ADM-P15 · Avis et droit de réponse (prototype route('avis') : 4 indicateurs, onglets Signalés · Masqués · Réponses
// privées · Tous les avis, file et avis — note, achat vérifié, fiche maître, texte, photos (visage flouté), signalement
// et vérifications (achat, photos du livreur, litige, droit de réponse), décision —, règles ADM-P15R-01 à 06).
// Des avis vrais, rattachés à des achats reçus, cumulés sur la fiche maître, que personne ne peut acheter ni effacer à
// sa convenance : la Vérification refuse un signalement ou masque seulement la partie illicite (insulte, donnée
// personnelle) ; seul le médiateur senior (la Direction au lancement) retire un avis, sur motif ; chantage → niveau 3.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Choix, Panel, Pill, Props } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { Avis as UnAvis } from '../../donnees/domaines/catalogue'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge, useRole } from '../../session'
import { P3, masquagePossible, masquerNumeros, type MotifSignalement } from '../ADM-06/calculs/regles'
import { Av, BandeauErreur, BandeauOk, Chargement, Chk, Controles, Item, Kick, NoteConflit, NoteLecture, Partage, Puce, Quand, Radios, Regles, Seen, useErreur } from '../ADM-06/commun'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { useFonctionsS } from '../ADM-03/kit'
import { GesteTraduction, TexteTraduisible, useTraduction } from '@client/traduction/Traduisible'

type Onglet = 'signale' | 'masque' | 'reponse' | 'tous'
const MOTIF: Record<MotifSignalement, [string, 'amber' | 'ink' | 'red']> = { faux_avis: ['Faux avis ?', 'amber'], hors_sujet: ['Hors sujet', 'ink'], insulte: ['Insulte', 'red'], donnee_personnelle: ['Donnée personnelle', 'red'], chantage: ['Chantage', 'red'] }
const ETAT: Record<UnAvis['etat'], [string, 'amber' | 'green' | 'ink' | 'red']> = { signale: ['Signalé', 'amber'], publie: ['Publié', 'green'], masque: ['Contenu masqué', 'ink'], retire: ['Retiré', 'red'] }
const etoiles = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)

export default function Avis() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const maintenant = useHorloge()
  const lecture = useLecture(() => source.catalogue.avis(), [])
  const erreur = useErreur(lecture.erreur)
  const [fait, setFait] = useState<string | null>(null)
  const l = lecture.donnees ?? []
  const onglet = (['signale', 'masque', 'reponse', 'tous'].includes(params.get('onglet') ?? '') ? params.get('onglet') : 'signale') as Onglet
  const liste = l.filter((a) => (onglet === 'tous' ? true : onglet === 'reponse' ? !!a.reponse : a.etat === onglet))
  const a = l.find((x) => x.id === params.get('id')) ?? liste[0]
  const lien = (g: Onglet, id?: string) => chemin('avis', { onglet: g, id })
  const pret = !!lecture.donnees
  const role = useRole()
  const vers = (f: (x: UnAvis) => boolean, g: Onglet) => {
    const x = l.find(f)
    return { onglet: g, ...(x ? { id: x.id } : {}) }
  }
  const fonctions = useFonctionsS('avis', [
    { verbe: 'Modérer', n: l.filter((x) => x.etat === 'signale').length, unite: ['avis signalé', 'avis signalés'], icone: 'flag', route: 'avis', params: vers((x) => x.etat === 'signale', 'signale'), geste: true, si: ['superviseur', 'verification', 'mediation'].includes(role) },
    { verbe: 'Relire', n: l.filter((x) => !!x.reponse).length, unite: ['réponse privée', 'réponses privées'], icone: 'message-square-lock', route: 'avis', params: vers((x) => !!x.reponse, 'reponse') },
    { verbe: 'Suivre', n: l.filter((x) => x.etat === 'masque').length, unite: ['avis masqué', 'avis masqués'], icone: 'eye-off', route: 'avis', params: vers((x) => x.etat === 'masque', 'masque') },
  ])
  return (
    <Ecran
      route="avis"
      kicker={<Quand le={maintenant} />}
      fonctions={pret ? fonctions : undefined}
      actions={
        <Link className="btn secondary" to={chemin('catalogue', { onglet: 'maitres', id: a?.ficheId })}>
          <Icone nom="library" taille={18} />
          <span>{t('Fiche maître')}</span>
        </Link>
      }
    >
      {erreur && <BandeauErreur quoi="Les avis signalés" relire={lecture.relire} />}
      {fait && <BandeauOk>{fait}</BandeauOk>}
      <Choix
        forme="tabs"
        aria={t('Avis')}
        className="mt16"
        actif={onglet}
        items={[
          { id: 'signale' as const, t: t('Signalés'), icone: 'flag', n: l.filter((x) => x.etat === 'signale').length, to: lien('signale') },
          { id: 'masque' as const, t: t('Masqués'), icone: 'eye-off', n: l.filter((x) => x.etat === 'masque').length, to: lien('masque') },
          { id: 'reponse' as const, t: t('Réponses privées'), icone: 'message-square-lock', n: l.filter((x) => x.reponse).length, to: lien('reponse') },
          { id: 'tous' as const, t: t('Tous les avis'), icone: 'list', to: lien('tous') },
        ]}
      />
      {!lecture.donnees && !erreur ? (
        <Chargement />
      ) : (
        <Partage
          file={
            <>
              <Kick>{tf('{n} avis', { n: liste.length })}</Kick>
              {liste.map((x) => (
                <Item key={x.id} to={lien(onglet, x.id)} on={x.id === a?.id} av={<Av icone="star" />} t={`${x.fiche} · ${etoiles(x.note)}`} pill={x.signalement ? <Pill sm ton={MOTIF[x.signalement.motif][1]}>{t(MOTIF[x.signalement.motif][0])}</Pill> : <Pill sm ton={ETAT[x.etat][1]}>{t(ETAT[x.etat][0])}</Pill>} s={x.signalement ? tf('Signalé par {p}', { p: x.signalement.par }) : x.client} x={x.texte} xTon="ink" d={<>{tf('Achat vérifié {c}', { c: x.commande })}</>} r={<Quand le={x.le} />} />
              ))}
              {!liste.length && <p className="card-s">{t('Aucun avis dans cet onglet.')}</p>}
            </>
          }
          puces={liste.map((x) => (
            <Puce key={x.id} to={lien(onglet, x.id)} on={x.id === a?.id}>
              {x.id}
            </Puce>
          ))}
        >
          {a ? <UnAvisDetail key={a.id} a={a} onglet={onglet} fini={(m) => (setFait(m), lecture.relire())} /> : <p className="card-s">{t('Aucun avis.')}</p>}
        </Partage>
      )}
      <Regles
        liste={[
          ['ADM-P15R-01', 'Seul un client qui a reçu le produit peut noter ; l’avis est cumulé sur la fiche maître.'],
          ['ADM-P15R-02', tf('Droit de réponse privé du vendeur pendant {j} jours ; il ne supprime ni ne masque un avis.', { j: P3.avisReponseJ })],
          ['ADM-P15R-03', 'Retrait seulement sur décision motivée du médiateur senior, jamais parce que l’avis est négatif.'],
          ['ADM-P15R-04', 'Remboursement, cadeau ou remise contre un retrait d’avis : sanction de niveau 3.'],
          ['ADM-P15R-05', 'Photos réelles mises en avant ; visage ou donnée personnelle flouté.'],
          ['ADM-P15R-06', 'Sans motif de modération, un avis ne peut pas être masqué ; tout masquage est journalisé.'],
        ]}
      />
    </Ecran>
  )
}

function UnAvisDetail({ a, onglet, fini }: { a: UnAvis; onglet: Onglet; fini: (m: string) => void }) {
  const { t, tf } = usePreferences()
  const role = useRole()
  const [feuille, setFeuille] = useState<'refuser' | 'masquer' | 'retirer' | 'sanction' | null>(null)
  const [raison, setRaison] = useState<'illicite' | 'faux' | 'sans_lien'>(a.signalement?.motif === 'hors_sujet' ? 'sans_lien' : 'illicite')
  const moderer = role === 'superviseur' || role === 'verification'
  const retirer = role === 'superviseur' || role === 'mediation'
  const masquable = !!a.signalement && masquagePossible(a.signalement.motif) && !!a.passage
  const texte = a.passage && a.etat !== 'masque' ? a.texte.split(a.passage) : null
  return (
    <>
      <div className="s3-g2" style={{ marginTop: 0 }}>
        <Panel>
          <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
            <Av nom={a.client} taille={42} />
            <div className="grow">
              <div className="row wrap" style={{ gap: 8 }}>
                <b className="t14">{a.client}</b>
                <span className="cor b8" aria-label={tf('{n} étoile(s) sur 5', { n: a.note })}>
                  {etoiles(a.note)}
                </span>
                <Pill ton="green" sm icone="badge-check">
                  {tf('Achat vérifié · {c}', { c: a.commande })}
                </Pill>
                <Pill sm dot ton={ETAT[a.etat][1]}>
                  {t(ETAT[a.etat][0])}
                </Pill>
              </div>
              <div className="t12 c3 mt4">
                <Quand le={a.le} /> · {tf('fiche maître « {f} »', { f: a.fiche })}
              </div>
              <div className="t14 mt10" style={{ lineHeight: 1.55 }}>
                {texte ? (
                  <>
                    {texte[0]}
                    <mark className="s3-masque">{a.passage}</mark>
                    {texte[1]}
                  </>
                ) : (
                  <TexteAvis texte={a.texte} />
                )}
              </div>
              {a.photos.length > 0 && (
                <div className="row wrap mt10" style={{ gap: 8 }}>
                  {a.photos.map((p) => (
                    <Pill key={p.legende} sm icone={p.floutee ? 'eye-off' : 'image'}>
                      {p.legende}
                    </Pill>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>
        <Panel titre={t(a.signalement ? 'Le signalement' : 'Vérifications')} icone="flag">
          {a.signalement && (
            <Seen k={tf('{p} · {m}', { p: a.signalement.par, m: t(MOTIF[a.signalement.motif][0]) })}>
              « <TexteTraduisible texte={a.signalement.texte} /> » · <Quand le={a.signalement.le} />
            </Seen>
          )}
          <div className="mt12">
            <Controles l={a.verifs} />
            <Chk ton="info" icone="message-square">
              {t('Droit de réponse privé du vendeur jusqu’au')} <Quand le={a.finReponse} />
            </Chk>
          </div>
        </Panel>
      </div>
      {a.conflit && <NoteConflit />}
      {(onglet === 'reponse' || a.reponse) && a.reponse && (
        <div className="s3-g2">
          <Panel titre={t('Réponse privée transmise, anonymisée')} icone="message-square-lock">
            <Seen k={tf('Ce que le vendeur a écrit · {v}', { v: a.vendeur })}>
              <TexteTraduisible texte={a.reponse.texte} /> · <Quand le={a.reponse.le} />
            </Seen>
            <Seen k={t('Ce que reçoit le client · « le vendeur »')} className="mt10">
              {masquerNumeros(a.reponse.texte)}
            </Seen>
            <div className="t12 c3 mt10">{t('Le client voit « le vendeur », jamais le nom de la boutique ; le numéro est masqué et l’échange passe par la messagerie de la commande.')}</div>
          </Panel>
          <Panel titre={t('Droit de réponse')} icone="shield-check">
            <Chk ton="ok" icone="calendar-clock">
              {tf('{j} jours à partir de l’avis', { j: P3.avisReponseJ })} · <Quand le={a.finReponse} />
            </Chk>
            <Chk ton="ok" icone="lock">
              {t('Réponse privée : un message au client, jamais publié sous l’avis')}
            </Chk>
            <Chk ton="ko" icone="ban">
              {t('Interdit : proposer un remboursement, un cadeau ou une remise contre le retrait d’un avis (sanction de niveau 3)')}
            </Chk>
          </Panel>
        </div>
      )}
      {a.etat === 'signale' && !a.conflit && (
        <div className="panel mt16" style={{ boxShadow: 'var(--shadow-card), inset 3px 0 0 var(--or)' }}>
          {moderer || retirer ? (
            <div className="admk-dec">
              {moderer && (
                <button type="button" className="btn primary" onClick={() => setFeuille('refuser')}>
                  <Icone nom="check" taille={18} />
                  <span>{t('Refuser le signalement')}</span>
                </button>
              )}
              {moderer && (
                <button type="button" className="btn secondary" aria-disabled={!masquable} title={masquable ? undefined : t('Aucun motif de modération : masquage impossible')} onClick={() => masquable && setFeuille('masquer')}>
                  <Icone nom="eye-off" taille={18} />
                  <span>{t('Masquer un contenu illicite')}</span>
                </button>
              )}
              {retirer && (
                <button type="button" className="btn danger" onClick={() => setFeuille('retirer')}>
                  <Icone nom="trash-2" taille={18} />
                  <span>{t('Retirer l’avis (médiateur)')}</span>
                </button>
              )}
              {a.signalement?.motif === 'chantage' && (
                <button type="button" className="btn ghost" onClick={() => setFeuille('sanction')}>
                  <Icone nom="gavel" taille={18} />
                  <span>{t('Transmettre en sanction (niveau 3)')}</span>
                </button>
              )}
              <span className="sp"></span>
              {!masquable && moderer && (
                <span className="lock t12 c3 b7">
                  <Icone nom="lock" taille={14} /> {t('Aucun motif de modération : masquage impossible')}
                </span>
              )}
            </div>
          ) : (
            <NoteLecture texte="Lecture seule : la Vérification modère les avis, le médiateur senior décide un retrait." />
          )}
          {!retirer && moderer && <div className="t12 c3 mt10">{t('Le retrait d’un avis revient au médiateur senior (la Direction au lancement), jamais parce qu’il est négatif.')}</div>}
        </div>
      )}
      {a.decision && (
        <Panel titre={t('Décision')} icone="gavel" className="mt16">
          <Props paires={[[t('Décision'), a.decision.quoi], [t('Auteur'), a.decision.par], [t('Date'), <Quand key="q" le={a.decision.le} />], [t('Motif'), a.decision.motif ?? '—']]} />
        </Panel>
      )}
      <DecisionMotivee ouverte={feuille === 'refuser'} fermer={() => setFeuille(null)} titre={t('Refuser le signalement')} resume={t('L’avis reste publié tel quel ; l’auteur du signalement reçoit la raison.')} libelle="Refuser le signalement" envoyer={(m) => source.catalogue.deciderAvis(a.id, { action: 'refuser', motif: m })} apres={() => fini(t('Signalement refusé : l’avis reste publié.'))} />
      <DecisionMotivee ouverte={feuille === 'masquer'} fermer={() => setFeuille(null)} titre={t('Masquer un contenu illicite')} resume={tf('Seule la partie « {p} » est remplacée ; la note et le reste restent publiés.', { p: a.passage ?? '' })} libelle="Masquer" icone="eye-off" envoyer={(m) => source.catalogue.deciderAvis(a.id, { action: 'masquer', motif: m })} apres={() => fini(t('Contenu illicite masqué ; texte d’origine conservé au journal.'))} />
      <DecisionMotivee
        ouverte={feuille === 'retirer'}
        fermer={() => setFeuille(null)}
        titre={t('Retirer l’avis · décision du médiateur senior')}
        resume={tf('{f} · {n} étoile(s) · achat vérifié {c}', { f: a.fiche, n: a.note, c: a.commande })}
        libelle="Retirer l’avis"
        icone="trash-2"
        danger
        vu={<Seen k={t('Ce que voit le client')}>{t('Son avis retiré avec ce motif, et l’invitation à noter le bon produit depuis sa commande.')}</Seen>}
        envoyer={(m) => source.catalogue.deciderAvis(a.id, { action: 'retirer', raison, motif: m })}
        apres={() => fini(t('Avis retiré, motif envoyé au client.'))}
      >
        <Radios nom="Raison du retrait" valeur={raison} choisir={setRaison} options={[{ v: 'sans_lien', t: 'Sans lien avec le produit', s: 'L’avis décrit un autre produit que la fiche' }, { v: 'illicite', t: 'Contenu illicite' }, { v: 'faux', t: 'Faux avis établi' }]} />
      </DecisionMotivee>
      <DecisionMotivee
        ouverte={feuille === 'sanction'}
        fermer={() => setFeuille(null)}
        titre={t('Transmettre en sanction (niveau 3)')}
        resume={tf('Offre d’argent contre une note : interdit (ADM-P15R-04). Un dossier s’ouvre pour {v}.', { v: a.vendeur })}
        libelle="Transmettre"
        icone="gavel"
        envoyer={async (m) => {
          const r = await source.acteurs.proposerSanction({ acteurId: a.vendeurId, acteur: a.vendeur, espace: 'vendeur', zone: null, niveau: 3, motif: m, origine: `Avis · ${a.id} · chantage` })
          return r.ok ? { ok: true } : r
        }}
        apres={() => fini(t('Dossier de sanction ouvert (niveau 3 proposé).'))}
      />
    </>
  )
}

/** Texte de l'avis (passages masqués par la modération signalés) avec le geste « Traduire / Voir l'original ». */
function TexteAvis({ texte }: { texte: string }) {
  const { t } = usePreferences()
  const MASQUE = '[contenu masqué par la modération]'
  const tr = useTraduction(texte.split(MASQUE).join(' '))
  return (
    <>
      {tr.etat === 'traduit' ? (
        <span lang={tr.langueAffichee}>{tr.affiche}</span>
      ) : (
        texte.split(MASQUE).map((x, i, l) => (
          <span key={i} lang={tr.langueAffichee}>
            {x}
            {i < l.length - 1 && <span className="s3-masque">{t(MASQUE)}</span>}
          </span>
        ))
      )}
      {tr.proposer && <GesteTraduction etat={tr.etat} basculer={tr.basculer} />}
    </>
  )
}
