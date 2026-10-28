// ADM-P23 Emballages et étiquettes (prototype : #emballages, ?s=seuil, ?s=ecart, ?s=erreur). Un stock acheté et tenu
// par BelivaY, avancé aux entreprises, jamais donné ; couverture en jours par référence (seuil EMB-SEUIL-JOURS : un
// format dessous se commande, quantité = consommation × couverture cible − stock) ; plages d'étiquettes rattachées à
// une entreprise et à un livreur (attribuer, invalider une plage perdue) ; contrôle des écarts par entreprise
// (?ecart=<entreprise>) : on compte les étiquettes, pas le stock ; au-delà du seuil sur le mois, l'écart non justifié
// est facturé à l'entreprise (Finance), jamais au livreur.
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Perimetre } from '../../composants/Perimetre'
import { Anneau, Barre, Kpi, Li, Note, Panel, Pill, Table, useSurtitre } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { EcartEntreprise, Emballages as Donnees, RefEmballage } from '../../donnees/domaines/logistique'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { BoutonGeste, Check, Introuvable, Lu, dateCourte, francs, useGestes } from '../ADM-08/commun'
import { PARAM } from '../ADM-08/parametres'
import { useFonctions } from '../AJ-A/fonctions-page'

const NOM_REF: Record<RefEmballage, string> = { S: 'Pochette S', M: 'Pochette M', L: 'Pochette L', C1: 'Carton C1', C2: 'Carton C2' }

export default function Emballages() {
  const { t } = usePreferences()
  const surtitre = useSurtitre()
  const naviguer = useNavigate()
  const [p] = useSearchParams()
  const ecart = p.get('ecart')
  const l = useLecture(() => source.logistique.emballages(), [])
  const g = useGestes()
  const d0 = l.donnees
  const aFacturer = (d0?.ecarts ?? []).filter((e) => e.ecartPct > PARAM.emballages.ecartPct && !e.facture)
  const fonctions = useFonctions([
    { verbe: 'Commander', n: (d0?.stock ?? []).filter((x) => x.aCommander > 0).length, unite: ['format sous le seuil', 'formats sous le seuil'], icone: 'shopping-cart', onClick: () => document.getElementById('s4-stock')?.scrollIntoView({ behavior: 'smooth' }), droit: 'emballages', geste: true, alerte: true },
    { verbe: 'Facturer', n: aFacturer.length, unite: ['écart', 'écarts'], icone: 'receipt', route: 'emballages', params: { ecart: aFacturer[0]?.entrepriseId ?? 'e-mboa' }, geste: true },
    { verbe: 'Attribuer', n: (d0?.sansPlage ?? []).length, unite: ['plage d’étiquettes', 'plages d’étiquettes'], icone: 'tag', onClick: () => document.getElementById('s4-etiquettes')?.scrollIntoView({ behavior: 'smooth' }), droit: 'emballages', geste: true },
  ])
  const actions = ecart ? (
    <Link className="btn secondary" to={chemin('emballages')}><Icone nom="arrow-left" taille={18} /><span>{t('Retour au stock')}</span></Link>
  ) : (
    <Link className="btn secondary" to={chemin('emballages', { ecart: 'e-mboa' })}><Icone nom="scale" taille={18} /><span>{t('Contrôle des écarts')}</span></Link>
  )
  return (
    <Ecran route="emballages" titre={ecart ? t('Écart d’emballages') : undefined} retour={ecart ? chemin('emballages') : undefined} kicker={surtitre} actions={actions} fonctions={ecart ? undefined : fonctions}>
      <Perimetre route="emballages" />
      {g.rendu}
      <Lu l={l} quoi="Le stock d’emballages">
        {(d) => {
          if (ecart) {
            const e = d.ecarts.find((x) => x.entrepriseId === ecart)
            return e ? <Ecart e={e} tous={d.ecarts} g={g} /> : <Introuvable quoi="Entreprise introuvable" retour={() => naviguer(chemin('emballages'))} libelle="Retour au stock" />
          }
          return <Stock d={d} g={g} />
        }}
      </Lu>
    </Ecran>
  )
}

function Stock({ d, g }: { d: Donnees; g: ReturnType<typeof useGestes> }) {
  const { t, tf, langue } = usePreferences()
  const sous = d.stock.filter((x) => x.aCommander > 0)
  const bas = [...d.stock].sort((a, b) => (a.couvertureJ ?? Infinity) - (b.couvertureJ ?? Infinity))[0]
  const etiq = d.plages.filter((p) => p.etat === 'active')
  return (
    <>
      <div className="g g4">
        <Kpi k={t('Stock BelivaY')} v={d.stock.reduce((n, x) => n + x.total, 0)} s={d.stock.map((x) => `${x.ref} ${x.total}`).join(' · ')} icone="package-open" ton="night" />
        <Kpi k={t('Couverture la plus basse')} v={bas?.couvertureJ?.toLocaleString(langue) ?? '—'} u={t('jours')} s={bas ? tf('{r} : {e} le seuil de {s} jours', { r: t(NOM_REF[bas.ref]), e: t((bas.couvertureJ ?? 0) < PARAM.emballages.seuilJ ? 'sous' : 'au-dessus de'), s: PARAM.emballages.seuilJ }) : undefined} icone="timer" iton={sous.length ? 'red' : 'green'} />
        <Kpi k={t('Avancé aux entreprises')} v={d.stock.reduce((n, x) => n + x.avance, 0)} s={t('non consommé, propriété de BelivaY')} icone="truck" />
        <Kpi k={t('Étiquettes')} v={etiq.reduce((n, p) => n + p.consommees, 0)} u={`/ ${etiq.reduce((n, p) => n + p.total, 0)}`} s={tf('{n} plages actives', { n: etiq.length })} icone="tag" />
      </div>
      <div className="mt16" id="s4-stock">
        <Table
          legende={t('Stock par référence')}
          rows={d.stock}
          cle={(x) => x.ref}
          ligneCls={(x) => (x.aCommander ? 'bad' : undefined)}
          cols={[
            { k: 'r', t: t('Référence'), main: true, rendu: (x) => <><b>{t(NOM_REF[x.ref])}</b><div className="t2">{x.format} cm</div></> },
            { k: 's', t: t('Au siège'), cls: 'r', rendu: (x) => x.siege },
            { k: 'a', t: t('Avancé, non consommé'), cls: 'r', rendu: (x) => x.avance },
            { k: 'tot', t: t('Stock BelivaY'), cls: 'r', rendu: (x) => <b>{x.total}</b> },
            { k: 'c', t: t('Consommation'), cls: 'r', rendu: (x) => tf('{n} / jour', { n: x.consoJour.toLocaleString(langue) }) },
            { k: 'cov', t: tf('Couverture · seuil {s} j', { s: PARAM.emballages.seuilJ }), rendu: (x) => (
              <div className="admlg-gw" style={{ minWidth: 150 }}>
                <div className="admlg-gauge"><i className={x.aCommander ? 'bad' : ''} style={{ width: Math.min(100, ((x.couvertureJ ?? 0) / (2 * PARAM.emballages.couvertureJ)) * 100) + '%' }}></i><span className="m90" style={{ left: (PARAM.emballages.seuilJ / (2 * PARAM.emballages.couvertureJ)) * 100 + '%' }}></span></div>
                <b className={x.aCommander ? 's4-cr' : ''}>{x.couvertureJ === null ? '—' : tf('{n} j', { n: x.couvertureJ.toLocaleString(langue) })}</b>
              </div>
            ) },
            { k: 'pv', t: t('Prévu'), cls: 'r', hideM: true, rendu: (x) => `${x.prevuPct} %` },
            { k: 're', t: t('Réel'), cls: 'r', hideM: true, rendu: (x) => `${x.reelPct} %` },
            { k: 'go', t: '', cls: 'r', rendu: (x) => (x.aCommander ? <BoutonGeste g={g} action="emballage.commander" objet={x.ref} sm libelle={tf('Commander {n}', { n: x.aCommander })} resume={tf('Commander {n} {r} au fournisseur : couverture ramenée à {j} jours.', { n: x.aCommander, r: t(NOM_REF[x.ref]), j: PARAM.emballages.couvertureJ })} /> : null) },
          ]}
          pied={<><span>{tf('Couverture cible : {c} jours', { c: PARAM.emballages.couvertureJ })}</span></>}
        />
      </div>
      <div className="g g2">
        <Panel titre={t('Mouvements')} icone="arrow-right-left">
          <Table
            legende={t('Mouvements')}
            rows={d.mouvements}
            cle={(m) => m.le + m.nature}
            cols={[
              { k: 'd', t: t('Date'), main: true, rendu: (m) => <b style={{ whiteSpace: 'nowrap' }}>{dateCourte(m.le, langue)}</b> },
              { k: 'm', t: t('Mouvement'), rendu: (m) => <>{t(m.nature)}{m.piece && <div className="t2 s4-mono">{m.piece}</div>}</> },
              { k: 'q', t: t('Quantités'), rendu: (m) => <span className="t12">{m.quantites}</span> },
            ]}
          />
        </Panel>
        <Panel id="s4-etiquettes" titre={t('Plages d’étiquettes')} icone="tag">
          <Table
            legende={t('Plages d’étiquettes')}
            rows={d.plages}
            cle={(p) => p.id}
            ligneCls={(p) => (p.etat === 'invalidee' ? 'warn' : undefined)}
            cols={[
              { k: 'w', t: t('Attribuée à'), main: true, rendu: (p) => <><b>{p.livreur}</b><div className="t2">{p.entreprise}</div></> },
              { k: 'p', t: t('Plage'), rendu: (p) => <span className="s4-mono" style={{ whiteSpace: 'nowrap' }}>{p.plage}</span> },
              { k: 'c', t: t('Consommées'), cls: 'r', rendu: (p) => (p.etat === 'invalidee' ? <Pill ton="red" sm>{t('Invalidée')}</Pill> : `${p.consommees} / ${p.total}`) },
              { k: 'a', t: '', cls: 'r', rendu: (p) => (p.etat === 'active' ? <BoutonGeste g={g} action="etiquettes.invalider" objet={p.id} genre="ghost" sm resume={tf('Invalider la plage {p} de {l} (perdue) : tout numéro de cette plage sera refusé au scan.', { p: p.plage, l: p.livreur })} libelle="Invalider" /> : null) },
            ]}
          />
          {d.sansPlage.map((x) => (
            <div key={x.livreurId} className="li">
              <span className="ic amber"><Icone nom="tag" taille={20} /></span>
              <span className="grow"><span className="lt" style={{ display: 'block' }}>{tf('{l} · sans plage active', { l: x.livreur })}</span><span className="ls" style={{ display: 'block' }}>{x.entreprise}</span></span>
              <BoutonGeste g={g} action="etiquettes.attribuer" objet={x.livreurId} sm resume={tf('Attribuer une plage d’étiquettes à {l} ({e}) : chaque numéro est rattaché à l’entreprise et au livreur.', { l: x.livreur, e: x.entreprise })} />
            </div>
          ))}
        </Panel>
      </div>
      <div className="g g3">
        <Panel titre={t('L’étiquette')} icone="tag">
          <Check ok>{t('Numéro de colis, code-barres et QR')}</Check>
          <Check ok>{t('Zone, relais ou quartier de destination')}</Check>
          <Check ok>{t('Classe du colis')}</Check>
          <Check ok={false} mauvais>{t('Jamais le nom du client en clair')}</Check>
          <Check ok={false} mauvais>{t('Jamais le contenu ni la valeur')}</Check>
        </Panel>
        <Panel titre={t('Répartition prévue et réelle')} icone="chart-pie">
          {d.stock.map((x) => (
            <div key={x.ref} className="admlg-comp">
              <span className="b7">{x.ref}</span>
              <Barre pct={x.reelPct} ton={x.reelPct > 2 * x.prevuPct ? 'red' : 'acc'} aria={`${x.ref} : ${x.reelPct} %`} />
              <span className="w">{tf('prévu {p} %', { p: x.prevuPct })}</span>
              <span className="v">{`${x.reelPct} %`}</span>
            </div>
          ))}
        </Panel>
        <Panel titre={t('Avances aux entreprises')} icone="truck">
          {d.avances.map((a) => <Li key={a.entreprise} icone="truck" ton={a.remisLe ? 'accs' : 'ink'} t={tf('{e} · {n} non consommés', { e: a.entreprise, n: a.nonConsommes })} s={a.remisLe ? tf('Dernière remise le {d}, contre un bon signé', { d: dateCourte(a.remisLe, langue) }) : t('Aucune avance : possible après l’activation, contre un bon de remise signé')} />)}
        </Panel>
      </div>
      <Panel titre={t('Contrôle des écarts de la semaine')} icone="scale" className="mt16">
        {d.ecarts.map((e) => <Li key={e.entrepriseId} icone="truck" ton={e.ecartPct > PARAM.emballages.ecartPct ? 'red' : 'green'} t={tf('{e} · écart non justifié {p} % du mois', { e: e.entreprise, p: e.ecartPct.toLocaleString(langue) })} s={e.facture ? tf('Facturé {m} le {d}', { m: francs(e.facture.montant), d: dateCourte(e.facture.le, langue) }) : e.ecartPct > PARAM.emballages.ecartPct ? tf('Au-delà de {s} % : facturable à l’entreprise', { s: PARAM.emballages.ecartPct }) : tf('Sous {s} % : rien à facturer', { s: PARAM.emballages.ecartPct })} to={chemin('emballages', { ecart: e.entrepriseId })} />)}
      </Panel>
    </>
  )
}

function Ecart({ e, tous, g }: { e: EcartEntreprise; tous: EcartEntreprise[]; g: ReturnType<typeof useGestes> }) {
  const { t, tf, langue } = usePreferences()
  const facturable = e.ecartPct > PARAM.emballages.ecartPct
  return (
    <>
      <div className="tabs" role="group" aria-label={t('Entreprises')}>
        {tous.map((x) => (
          <Link key={x.entrepriseId} to={chemin('emballages', { ecart: x.entrepriseId })} className={x.entrepriseId === e.entrepriseId ? 'on' : ''} aria-current={x.entrepriseId === e.entrepriseId ? 'true' : undefined} replace>
            {x.entreprise}
          </Link>
        ))}
      </div>
      <h2 className="sec">{tf('Écart d’emballages · {e}', { e: e.entreprise })}</h2>
      <Table
        legende={t('Écart d’emballages')}
        rows={e.lignes}
        cle={(l) => l.ref}
        cols={[
          { k: 'r', t: t('Format'), main: true, rendu: (l) => <b>{t(NOM_REF[l.ref])}</b> },
          { k: 'a', t: t('Remis'), cls: 'r', rendu: (l) => l.remis },
          { k: 'b', t: t('Étiquettes consommées'), cls: 'r', rendu: (l) => l.etiquettes },
          { k: 'c', t: t('Doit rester'), cls: 'r', rendu: (l) => l.doitRester },
          { k: 'd', t: t('Compté'), cls: 'r', rendu: (l) => l.compte },
          { k: 'e', t: t('Écart'), cls: 'r', rendu: (l) => <b className={l.doitRester - l.compte ? 's4-cr' : ''}>{l.doitRester - l.compte}</b> },
          { k: 'f', t: t('Justifié'), cls: 'r', rendu: (l) => l.justifie },
          { k: 'g', t: t('Non justifié'), cls: 'r', rendu: (l) => <b>{Math.max(0, l.doitRester - l.compte - l.justifie)}</b> },
        ]}
      />
      <div className="g g2">
        <Panel titre={t('Écart du mois et facturation')} icone="receipt">
          <div className="row" style={{ gap: 16 }}>
            <Anneau v={e.ecartPct} max={2 * PARAM.emballages.ecartPct} couleur={facturable ? 'var(--red)' : 'var(--green)'} taille={92} libelle={`${e.ecartPct} %`} aria={tf('Écart de {p} %', { p: e.ecartPct.toLocaleString(langue) })} />
            <div className="grow t13 lh">{tf('Écart non justifié du mois : {n} emballages sur {a} avancés. Au-delà de {s} % sur un mois, l’écart est facturé à l’entreprise au coût d’achat ({c} par emballage), retenu sur son versement ; jamais au livreur directement.', { n: e.nonJustifie, a: e.avancesMois, s: PARAM.emballages.ecartPct, c: francs(e.coutUnitaire) })}</div>
          </div>
          {e.facture && <Note ton="green" icone="check" className="mt10">{tf('Facturé {m} le {d} : retenu sur le prochain versement de l’entreprise.', { m: francs(e.facture.montant), d: dateCourte(e.facture.le, langue) })}</Note>}
          {e.justificationDemandee && <Note ton="amber" icone="message-circle" className="mt10">{tf('Justification demandée le {d}.', { d: dateCourte(e.justificationDemandee, langue) })}</Note>}
          <div className="s4-actes">
            <BoutonGeste g={g} action="emballage.facturer" objet={e.entrepriseId} resume={tf('Facturer à {e} l’écart non justifié : {n} × {c} = {m}, retenu sur son prochain versement.', { e: e.entreprise, n: e.nonJustifie, c: francs(e.coutUnitaire), m: francs(e.nonJustifie * e.coutUnitaire) })} libelle={facturable ? 'Facturer l’écart' : 'Facturer (inactif sous le seuil)'} />
            <BoutonGeste g={g} action="emballage.justifier" objet={e.entrepriseId} genre="secondary" resume={tf('Demander à {e} de justifier l’écart (perte déclarée, colis abîmé, réserve au relais) par la messagerie.', { e: e.entreprise })} />
          </div>
        </Panel>
        <Panel titre={t('Contrôle de la semaine')} icone="calculator">
          <div className="codeblk">{[t('doit rester = remis − étiquettes consommées'), t('écart = doit rester − compté'), t('on ne compte pas le stock : on compte les étiquettes')].join('\n')}</div>
          <div className="t13 lh mt10">{t('Une étiquette liée à une commande prouve qu’un emballage a servi. Ce qui manque sans étiquette est un écart, justifié ou non.')}</div>
        </Panel>
      </div>
    </>
  )
}
