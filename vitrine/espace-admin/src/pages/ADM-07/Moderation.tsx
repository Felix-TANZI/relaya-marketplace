// ADM-P14 · Modération des offres et des prix (prototype route('moderation') : 4 indicateurs, onglets À modérer ·
// Dépubliées · Acceptées · Produits interdits, file et offre — écart à la médiane du maître (jauge et formule), prix sur
// 30 jours, prix barré et jours pratiqués, ce que voit le client, décision avec « Suggestion de prix envoyée au
// vendeur » —, règles ADM-P14R-01 à 06).
// Protéger le client des faux prix, faux rabais et produits interdits sans bloquer le vendeur honnête : la console
// suggère un prix (VD-CONSEIL-PRIX), ne l'impose jamais ; une modération n'annule pas une commande en cours ; toute
// dépublication a un motif visible et un recours d'une fois ; produit interdit → dossier de sanction.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Choix, Panel, Pill, Props, Tg } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { DemandeModeration, MotifModeration, OffreAModerer } from '../../donnees/domaines/catalogue'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge, useRole } from '../../session'
import { P3, ecartMediane, joursPratiques, prixBarreValide, prixConseille } from '../ADM-06/calculs/regles'
import { Ai, Av, BandeauErreur, BandeauOk, Chargement, Chk, CourbeScore, Item, Kick, NoteConflit, NoteLecture, Partage, Puce, Quand, Radios, Regles, Seen, Tete, useErreur } from '../ADM-06/commun'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { useFonctionsS } from '../ADM-03/kit'
import { CartePhoto } from '../SURVEILLER/Photo'
import { TexteTraduisible } from '@client/traduction/Traduisible'

type Onglet = 'a_moderer' | 'depubliee' | 'acceptee' | 'interdits'
const MOTIF: Record<MotifModeration, [string, 'amber' | 'or' | 'red' | 'ink']> = { ecart: ['Écart de prix', 'amber'], prix_barre: ['Prix barré', 'or'], prix_bas: ['Prix anormalement bas', 'red'], interdit: ['Produit interdit ?', 'red'], photo: ['Photo non conforme', 'amber'], signalement: ['Signalement', 'ink'] }
const DECIDENT = ['superviseur', 'verification']

export default function Moderation() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const maintenant = useHorloge()
  const decide = DECIDENT.includes(useRole())
  const lecture = useLecture(() => source.catalogue.aModerer(), [])
  const erreur = useErreur(lecture.erreur)
  const [fait, setFait] = useState<string | null>(null)
  const l = lecture.donnees ?? []
  const onglet = (['a_moderer', 'depubliee', 'acceptee', 'interdits'].includes(params.get('onglet') ?? '') ? params.get('onglet') : 'a_moderer') as Onglet
  const liste = l.filter((o) => (onglet === 'interdits' ? o.motif === 'interdit' : onglet === 'acceptee' ? o.etat === 'acceptee' || o.etat === 'correction' : o.etat === onglet))
  const o = l.find((x) => x.id === params.get('id')) ?? liste[0]
  const lien = (g: Onglet, id?: string) => chemin('moderation', { onglet: g, id })
  const pret = !!lecture.donnees
  const aMod = l.filter((x) => x.etat === 'a_moderer')
  const premier = (f: (x: OffreAModerer) => boolean, g: Onglet) => {
    const x = l.find(f)
    return { onglet: g, ...(x ? { id: x.id } : {}) }
  }
  const fonctions = useFonctionsS('moderation', [
    { verbe: 'Modérer', n: aMod.length, unite: ['offre', 'offres'], icone: 'badge-check', route: 'moderation', params: premier((x) => x.etat === 'a_moderer', 'a_moderer'), geste: true, si: decide },
    { verbe: 'Instruire', n: aMod.filter((x) => x.motif === 'signalement').length, unite: ['signalement', 'signalements'], icone: 'flag', route: 'moderation', params: premier((x) => x.etat === 'a_moderer' && x.motif === 'signalement', 'a_moderer'), geste: true, si: decide, alerte: true },
    { verbe: 'Retirer', n: l.filter((x) => x.etat === 'a_moderer' && x.prixBarre !== null && !prixBarreValide(x.historique, x.prixBarre)).length, unite: ['prix barré', 'prix barrés'], icone: 'tag', route: 'moderation', params: premier((x) => x.prixBarre !== null, 'a_moderer'), geste: true, si: decide },
    { verbe: 'Trancher', n: l.filter((x) => x.recours).length, unite: ['recours', 'recours'], icone: 'scale', route: 'moderation', params: premier((x) => !!x.recours, 'depubliee'), geste: true, si: decide },
  ])
  return (
    <Ecran
      route="moderation"
      kicker={<Quand le={maintenant} />}
      fonctions={pret ? fonctions : undefined}
      actions={
        <Link className="btn secondary" to={chemin('catalogue', { onglet: 'demandes' })}>
          <Icone nom="shield-ban" taille={18} />
          <span>{t('Produits interdits')}</span>
        </Link>
      }
    >
      {erreur && <BandeauErreur quoi="La file de modération" relire={lecture.relire} />}
      {fait && <BandeauOk>{fait}</BandeauOk>}
      <Choix
        forme="tabs"
        aria={t('Modération')}
        className="mt16"
        actif={onglet}
        items={[
          { id: 'a_moderer' as const, t: t('À modérer'), icone: 'inbox', n: l.filter((x) => x.etat === 'a_moderer').length, to: lien('a_moderer') },
          { id: 'depubliee' as const, t: t('Dépubliées'), icone: 'eye-off', n: l.filter((x) => x.etat === 'depubliee').length, to: lien('depubliee') },
          { id: 'acceptee' as const, t: t('Acceptées'), icone: 'circle-check', to: lien('acceptee') },
          { id: 'interdits' as const, t: t('Produits interdits'), icone: 'shield-ban', to: lien('interdits') },
        ]}
      />
      {!lecture.donnees && !erreur ? (
        <Chargement />
      ) : (
        <Partage
          file={
            <>
              <Kick>{tf('{n} offre(s)', { n: liste.length })}</Kick>
              {liste.map((x) => (
                <Item key={x.id} to={lien(onglet, x.id)} on={x.id === o?.id} late={x.motif === 'prix_bas'} av={<Av icone="package" />} t={x.titre} pill={<Pill sm ton={MOTIF[x.motif][1]}>{t(MOTIF[x.motif][0])}</Pill>} s={`${x.vendeur} · ${F(x.prix)} F${x.prixBarre ? ` (${F(x.prixBarre)} F)` : ''}`} x={x.detail} xTon={x.motif === 'prix_bas' || x.motif === 'interdit' ? 'red' : 'amber'} d={x.id} r={<Quand le={x.signaleeLe} jour={false} />} />
              ))}
              {!liste.length && <p className="card-s">{t('Rien à modérer ici.')}</p>}
            </>
          }
          puces={liste.map((x) => (
            <Puce key={x.id} to={lien(onglet, x.id)} on={x.id === o?.id}>
              {x.titre}
            </Puce>
          ))}
        >
          {o ? <Offre key={o.id} o={o} decide={decide} fini={(m) => (setFait(m), lecture.relire())} /> : <p className="card-s">{t('Aucune offre dans cet onglet.')}</p>}
        </Partage>
      )}
      {!decide && <NoteLecture texte="Lecture seule : la Vérification et la Direction modèrent les offres (le Support lit, l’Audit contrôle)." />}
      <Regles
        liste={[
          ['ADM-P14R-01', tf('Prix barré accepté seulement s’il a été pratiqué {j} jours sur les {f} derniers.', { j: P3.prixBarreJours, f: P3.prixBarreFenetre })],
          ['ADM-P14R-02', tf('Écart de plus de {p} % avec la médiane du maître : retenue avant publication.', { p: Math.round(P3.ecartMax * 100) })],
          ['ADM-P14R-03', 'Produit interdit : dépublié immédiatement, dossier de sanction ; contrefaçon = veto.'],
          ['ADM-P14R-04', 'La console suggère des prix plus bas ; elle n’impose jamais un prix.'],
          ['ADM-P14R-05', 'Une modération n’annule pas les commandes en cours ; elle bloque les nouvelles ventes.'],
          ['ADM-P14R-06', 'Toute dépublication a un motif visible par le vendeur et un recours d’une fois.'],
        ]}
      />
    </Ecran>
  )
}

function Offre({ o, decide, fini }: { o: OffreAModerer; decide: boolean; fini: (m: string) => void }) {
  const { t, tf } = usePreferences()
  const [feuille, setFeuille] = useState<DemandeModeration['action'] | 'recours' | null>(null)
  const [suggerer, setSuggerer] = useState(true)
  const [recours, setRecours] = useState<'recours_maintenir' | 'recours_accepter'>('recours_accepter')
  const [sanction, setSanction] = useState(false)
  const e = ecartMediane(o.prix, o.offresMaitre)
  const conseil = prixConseille(o.prixPratiques)
  const jours = o.prixBarre !== null ? joursPratiques(o.historique, o.prixBarre) : 0
  const barreOk = o.prixBarre !== null && prixBarreValide(o.historique, o.prixBarre)
  const pct = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(Math.round(x * 1000) / 10).toString().replace('.', ',')} %`
  const envoyer = (action: DemandeModeration['action']) => (m: string) => source.catalogue.deciderOffre(o.id, { action, motif: m, suggestion: suggerer && conseil !== null && conseil < o.prix })
  return (
    <>
      <Panel>
        <Tete
          av={<Av icone="package" taille={56} />}
          nom={o.titre}
          sous={tf('Offre de {v} ({z}) · fiche {f} · {n} commande(s) en cours', { v: o.vendeur, z: o.zone, f: o.fiche, n: o.commandesEnCours })}
          pills={
            <>
              <Pill sm dot ton={o.etat === 'acceptee' ? 'green' : o.etat === 'depubliee' ? 'red' : 'amber'}>
                {t(o.etat === 'a_moderer' ? 'À modérer' : o.etat === 'acceptee' ? 'Acceptée' : o.etat === 'correction' ? 'Correction demandée' : 'Dépubliée')}
              </Pill>
              <Pill sm ton={MOTIF[o.motif][1]}>
                {t(MOTIF[o.motif][0])}
              </Pill>
            </>
          }
          droite={
            <>
              <div className="t12 c3 b7">{t('Alerte')}</div>
              <div className="b8 t15">
                <Quand le={o.signaleeLe} />
              </div>
            </>
          }
        />
        <div className="t13 mt10">{o.detail}</div>
        {o.conflit && <NoteConflit />}
      </Panel>
      {o.prixBarre === null && e.mediane !== null && (
        <Panel titre={t('Écart avec la médiane du maître')} icone="calculator" className="mt16">
          <div className="row wrap" style={{ gap: 24, alignItems: 'flex-end' }}>
            <div>
              <div className="t12 c3 b7">{t('Prix proposé')}</div>
              <div className="b8" style={{ fontSize: '1.75rem' }}>{`${F(o.prix)} F`}</div>
            </div>
            <div>
              <div className="t12 c3 b7">{tf('Médiane des {n} offre(s) active(s) du maître', { n: o.offresMaitre.length })}</div>
              <div className="b8 c3" style={{ fontSize: '1.75rem' }}>{`${F(e.mediane)} F`}</div>
            </div>
            <span className="grow"></span>
            <Pill ton={e.retenue ? 'amber' : 'green'} dot>
              {tf('écart {e}', { e: pct((o.prix - e.mediane) / e.mediane) })}
            </Pill>
          </div>
          <div className="admk-gauge" style={{ marginTop: 18 }} role="img" aria-label={tf('Écart {e} ; modération au-delà de {s} %', { e: pct((o.prix - e.mediane) / e.mediane), s: Math.round(P3.ecartMax * 100) })}>
            <i className={e.retenue ? '' : 'ok'} style={{ width: `${Math.min(100, (e.ecart ?? 0) * 100)}%` }}></i>
            <b style={{ left: `${P3.ecartMax * 100}%` }} data-l={tf('{s} % : modération', { s: Math.round(P3.ecartMax * 100) })}></b>
          </div>
          <div className="codeblk mt16 no-tr">{`|${F(o.prix)} − ${F(e.mediane)}| ÷ ${F(e.mediane)} = ${(e.ecart ?? 0).toFixed(3).replace('.', ',')} ${e.retenue ? '>' : '≤'} ${P3.ecartMax.toFixed(2).replace('.', ',')}`}</div>
          <div className="t12 c3 mt10">{e.retenue ? t('Au-delà du seuil : retenue avant publication.') : t('Sous le seuil : l’offre reste publiée ; la relecture vient d’un signalement.')}</div>
        </Panel>
      )}
      <div className="s3-g2">
        <Panel titre={tf('Prix de l’offre sur {j} jours', { j: P3.prixBarreFenetre })} icone="chart-line">
          <CourbeScore valeurs={o.historique.map((x) => x / 1000)} seuil={e.mediane ? Math.round((e.mediane * (1 + P3.ecartMax)) / 1000) : null} descente={e.mediane ? Math.round((e.mediane * (1 - P3.ecartMax)) / 1000) : null} aria={t('Prix de l’offre sur 30 jours, en milliers de francs, avec les limites de modération')} />
          <div className="admk-legend">
            <span>{t('En milliers de francs')}</span>
            <span>
              <i style={{ background: 'var(--red)' }}></i>
              {t('Limites de modération (± médiane)')}
            </span>
          </div>
          {o.prixBarre !== null && (
            <div className="codeblk mt12 no-tr">{`jours_pratiqués(${F(o.prixBarre)} F, ${P3.prixBarreFenetre} j) = ${jours} ${barreOk ? '≥' : '<'} ${P3.prixBarreJours}`}</div>
          )}
        </Panel>
        <Panel titre={t('Ce que voit le client')} icone="eye">
          <b className="t14">{o.titre}</b>
          <div className="row mt6" style={{ gap: 10 }}>
            {o.prixBarre !== null && <span className="admk-strike t13">{`${F(o.prixBarre)} F`}</span>}
            <b className="t17">{`${F(o.prix)} F`}</b>
          </div>
          <div className="mt12">
            <Chk ton="info" icone="package">
              {tf('{n} commande(s) en cours : non annulées ; la modération bloque seulement les nouvelles ventes', { n: o.commandesEnCours })}
            </Chk>
            <Chk ton="info" icone="message-square">
              {t('Message au vendeur : motif en clair, recours possible une fois')}
            </Chk>
            {o.suggestion && (
              <Chk ton="ok" icone="trending-down">
                {tf('Suggestion envoyée : {p} F (conseil, jamais imposé)', { p: F(o.suggestion) })}
              </Chk>
            )}
          </div>
        </Panel>
      </div>
      <PhotoProduit o={o} decide={decide} />
      {o.recours && (
        <Panel titre={t('Le recours du vendeur')} icone="scale" className="mt16">
          {o.decision && <Seen k={t('Motif de la dépublication, visible par le vendeur')}>« {o.decision.motif} »</Seen>}
          <Seen k={t('Texte du vendeur')} className="mt10">
            « <TexteTraduisible texte={o.recours.texte} /> » · <Quand le={o.recours.le} />
          </Seen>
        </Panel>
      )}
      {decide && !o.conflit && (o.etat === 'a_moderer' || o.recours) && (
        <div className="panel mt16" style={{ boxShadow: 'var(--shadow-card), inset 3px 0 0 var(--or)' }}>
          {conseil !== null && conseil < o.prix && o.etat === 'a_moderer' && (
            <>
              <Ai texte={tf('prix conseillé {p} F ({c}e centile des prix pratiqués sur {j} jours). Un conseil, jamais une obligation.', { p: F(conseil), c: P3.conseilCentile, j: P3.conseilFenetre })} confiance={0.7} />
              <div className="row mt14" style={{ gap: 12, padding: '12px 14px', borderRadius: 14, border: '1px solid var(--line-2)', background: 'var(--card-2)' }}>
                <Icone nom="trending-down" taille={18} />
                <div className="grow">
                  <b className="t13">{tf('Suggestion de prix envoyée au vendeur : {p} F', { p: F(conseil) })}</b>
                  <div className="t12 c3">{t('La console n’impose jamais un prix.')}</div>
                </div>
                <Tg on={suggerer} changer={setSuggerer} libelle={t('Envoyer la suggestion de prix')} />
              </div>
            </>
          )}
          <div className="admk-dec mt14">
            {o.recours ? (
              <button type="button" className="btn primary" onClick={() => setFeuille('recours')}>
                <Icone nom="gavel" taille={18} />
                <span>{t('Enregistrer la décision du recours')}</span>
              </button>
            ) : o.motif === 'prix_barre' ? (
              <>
                <button type="button" className="btn primary" onClick={() => setFeuille('retirer_barre')}>
                  <Icone nom="check" taille={18} />
                  <span>{t('Confirmer le retrait du prix barré')}</span>
                </button>
                <button type="button" className="btn secondary" aria-disabled={!barreOk} title={barreOk ? undefined : tf('Impossible sans {j} jours pratiqués', { j: P3.prixBarreJours })} onClick={() => barreOk && setFeuille('valider')}>
                  <Icone nom="undo-2" taille={18} />
                  <span>{t('Rétablir le prix barré')}</span>
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn primary" onClick={() => setFeuille('valider')}>
                  <Icone nom="check" taille={18} />
                  <span>{t('Valider la publication')}</span>
                </button>
                <button type="button" className="btn secondary" onClick={() => setFeuille('correction')}>
                  <Icone nom="pencil" taille={18} />
                  <span>{t('Demander une correction')}</span>
                </button>
                <button type="button" className="btn danger" onClick={() => setFeuille('depublier')}>
                  <Icone nom="eye-off" taille={18} />
                  <span>{t('Dépublier')}</span>
                </button>
              </>
            )}
            <button type="button" className="btn ghost" onClick={() => setSanction(true)}>
              <Icone nom="gavel" taille={18} />
              <span>{t('Transmettre en sanction')}</span>
            </button>
          </div>
          <div className="t12 c3 mt10">{t('Chaque décision a un motif et un recours. Une modération ne se négocie jamais contre un abonnement.')}</div>
        </div>
      )}
      {o.decision && o.etat !== 'a_moderer' && !o.recours && (
        <Panel titre={t('Décision enregistrée')} icone="circle-check" className="mt16">
          <Props paires={[[t('Décision'), o.decision.quoi], [t('Motif'), o.decision.motif ?? '—'], [t('Auteur'), o.decision.par], [t('Date'), <Quand key="q" le={o.decision.le} />], [t('Suggestion envoyée'), o.suggestion ? `${F(o.suggestion)} F` : '—']]} />
        </Panel>
      )}
      <DecisionMotivee ouverte={feuille === 'valider'} fermer={() => setFeuille(null)} titre={t('Valider la publication')} resume={t('L’offre est publiée et attribuable ; le vendeur est prévenu.')} libelle="Valider la publication" envoyer={envoyer('valider')} apres={() => fini(t('Publication validée.'))} />
      <DecisionMotivee ouverte={feuille === 'correction'} fermer={() => setFeuille(null)} titre={t('Demander une correction')} resume={t('Le vendeur corrige son offre ; la console ne modifie jamais son prix.')} libelle="Demander la correction" icone="pencil" etiquetteMotif="Motif en clair · visible par le vendeur" envoyer={envoyer('correction')} apres={() => fini(t('Correction demandée au vendeur.'))} />
      <DecisionMotivee ouverte={feuille === 'depublier'} fermer={() => setFeuille(null)} titre={t('Dépublier l’offre')} resume={o.motif === 'interdit' ? t('Produit interdit : dépublication immédiate et dossier de sanction ouvert.') : t('L’offre sort de la vente ; les commandes en cours restent honorées.')} libelle="Dépublier" icone="eye-off" danger etiquetteMotif="Motif en clair · visible par le vendeur" envoyer={envoyer('depublier')} apres={() => fini(o.motif === 'interdit' ? t('Offre dépubliée ; dossier de sanction ouvert.') : t('Offre dépubliée ; le vendeur peut faire un recours une fois.'))} />
      <DecisionMotivee ouverte={feuille === 'retirer_barre'} fermer={() => setFeuille(null)} titre={t('Confirmer le retrait du prix barré')} resume={tf('{p} F pratiqué {j} jour(s) sur {f} : le client voit le prix sans rabais.', { p: F(o.prixBarre ?? 0), j: jours, f: P3.prixBarreFenetre })} libelle="Confirmer le retrait" envoyer={envoyer('retirer_barre')} apres={() => fini(t('Prix barré retiré ; le vendeur est prévenu.'))} />
      <DecisionMotivee ouverte={feuille === 'recours'} fermer={() => setFeuille(null)} titre={t('Décider le recours')} resume={t('Une fois ; décision motivée, envoyée au vendeur.')} libelle="Enregistrer la décision du recours" icone="gavel" envoyer={(m) => source.catalogue.deciderOffre(o.id, { action: recours, motif: m, suggestion: false })} apres={() => fini(t('Décision du recours enregistrée.'))}>
        <Radios nom="Décision" valeur={recours} choisir={setRecours} options={[{ v: 'recours_maintenir', t: 'Maintenir la dépublication', s: 'Le dossier de sanction continue' }, { v: 'recours_accepter', t: 'Accepter le recours, demander un nouveau titre', s: 'Produit générique : titre sans le mot litigieux ni nom de marque' }]} />
      </DecisionMotivee>
      <DecisionMotivee
        ouverte={sanction}
        fermer={() => setSanction(false)}
        titre={t('Transmettre en sanction')}
        resume={t('Un dossier s’ouvre en Sanctions et recours ; la Médiation ou la Direction décide.')}
        libelle="Transmettre"
        icone="gavel"
        envoyer={async (m) => {
          const r = await source.acteurs.proposerSanction({ acteurId: o.vendeurId, acteur: o.vendeur, espace: 'vendeur', zone: o.zone, niveau: o.motif === 'interdit' ? 3 : 2, motif: m, origine: `Modération · ${o.id}` })
          return r.ok ? { ok: true } : r
        }}
        apres={() => fini(t('Dossier de sanction ouvert en Sanctions et recours.'))}
      />
    </>
  )
}

// Photo du produit signalé (photo reprise d'une autre boutique, non conforme) : la console la remplace ou la retire,
// motif journalisé ; la fiche du client l'affiche (pont : photo_remplacee). La Vérification et la Direction seulement.
function PhotoProduit({ o, decide }: { o: OffreAModerer; decide: boolean }) {
  const { t } = usePreferences()
  const l = useLecture(() => source.pilotage.photos(), [o.id])
  return (
    <Panel titre={t('Photo du produit')} icone="image" className="mt16">
      <div className="sv-photos" style={{ marginTop: 0 }}>
        <CartePhoto cible="produit" id={o.id} libelle={`${o.id} · ${o.titre}`} titre={o.titre} actuelle={l.donnees?.find((p) => p.cible === 'produit' && p.id === o.id)} peut={decide && !o.conflit} apres={l.relire} />
      </div>
    </Panel>
  )
}
