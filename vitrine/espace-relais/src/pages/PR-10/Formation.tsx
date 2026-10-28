// Formation (PR-10 Fig. 6 ; FOR-01 à FOR-05, DRO-01, EQU-02, INV-03, PR03-R04, PR-CT01-R19 ; ARL-28, ARL-125). Ouvert
// à chaque membre : chacun suit SA formation (le gérant voit celle de son équipe dans Mon équipe).
// Structure du prototype : anneau de progression et état (« Relais formé »), six modules en tuiles (numéro, durée,
// facultatif, titre, état ou « Commencer »), explication de la formation initiale (modules sur téléphone + séance
// pratique d'1 h à la visite).
// Un module s'ouvre dans la même page (?module=m3) : leçons à lire, puis quiz (?etape=quiz) corrigé par le serveur ;
// il compte seulement réussi au seuil PR-FORMATION-QUIZ-PCT (FOR-02) ; une mise à jour des règles peut le rouvrir
// (« À revoir », FOR-03) ; aucune récompense en points (FOR-04). Sans les PR-FORMATION-MODULES modules obligatoires, un
// employé ne fait pas sa première remise (DRO-01) : l'écran le dit. Formation terminée : attestation téléchargeable.
// ARL-28 : module 3 « Paiement au comptoir » = garde en espèces + Mobile Money au comptoir ; module 6 « Servir en
// anglais » (pidgin retiré, DP-13).
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { ContenuModule, FicheRelais, ModuleFormation } from '../../donnees/domaines/relais'
import type { Membre } from '../../donnees/domaines/session'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Annonce, Chargement, ErreurLecture, useGesteRelais, useTexteRegle } from './commun'

const ICONES: Record<string, string> = { m1: 'r-colis', m2: 'r-cle', m3: 'r-telephone', m4: 'r-balance', m5: 'r-annuler', m6: 'r-globe' }
const RAYON = 38
const TOUR = 2 * Math.PI * RAYON

export default function Formation() {
  const lecture = useLecture(() => source.relais.relais(), [])
  const s = useSession()
  const [params] = useSearchParams()
  const f = lecture.donnees
  const m = s.membre
  if (!f || !m) return <Ecran route="formation">{lecture.erreur ? <ErreurLecture relire={lecture.relire} /> : <Chargement />}</Ecran>
  const modules = f.formation[m.id] ?? []
  const ouvert = modules.find((x) => x.id === params.get('module'))
  if (ouvert) return <Module key={ouvert.id} module={ouvert} modules={modules} membre={m} />
  return <Liste f={f} modules={modules} membre={m} />
}

function Liste({ f, modules, membre }: { f: FicheRelais; modules: ModuleFormation[]; membre: Membre }) {
  const { t, tf, langue } = usePreferences()
  const obligatoires = modules.filter((x) => x.obligatoire)
  const faits = obligatoires.filter((x) => x.statut === 'termine').length
  const total = modules.filter((x) => x.statut === 'termine').length
  const forme = faits >= f.formationModules
  const finLe = obligatoires.reduce<number | null>((n, x) => (x.termineLe && (n === null || x.termineLe > n) ? x.termineLe : n), null)
  const minutes = obligatoires.reduce((n, x) => n + x.minutes, 0)
  const facultatifs = modules.filter((x) => !x.obligatoire && x.statut !== 'termine').length
  const gerant = membre.role === 'proprietaire'
  const telecharger = () => {
    const lignes = [t('Attestation de formation BelivaY · Point relais'), `${membre.prenom} ${membre.nom}`, f.nom, finLe ? tf('Formation terminée le {date}', { date: jourLong(finLe, langue) }) : '', ...modules.filter((x) => x.statut === 'termine').map((x) => `✓ ${t(x.titre)} · ${x.score ?? ''} %`)]
    const url = URL.createObjectURL(new Blob([lignes.join('\n')], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'attestation-formation-belivay.txt'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <Ecran route="formation">
      <div className="p-0hxmj8 r-pile">
        <div className="p-4o1bpr p10-ligne">
          <svg width="92" height="92" viewBox="0 0 92 92" role="img" aria-label={tf('{n} modules terminés sur {total}', { n: total, total: modules.length })} className="p-bo3n4y">
            <circle cx="46" cy="46" r={RAYON} fill="none" strokeWidth="9" className="p-1gianx" />
            <circle cx="46" cy="46" r={RAYON} fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(TOUR * total) / Math.max(1, modules.length)} ${TOUR}`} transform="rotate(-90 46 46)" className="p-vs02iw" />
            <text x="46" y="52" textAnchor="middle" fontSize="20" fontWeight="800" fontFamily="Plus Jakarta Sans, sans-serif" className="p-rhdq61">
              {`${total}/${modules.length}`}
            </text>
          </svg>
          <div>
            <div className="p-6pd2ig">{tf('OBLIGATOIRES TERMINÉS · {n}/{total}', { n: faits, total: f.formationModules })}</div>
            <div className="p-vhnszu">{forme ? t(gerant ? 'Relais formé' : 'Formation terminée') : tf(f.formationModules - faits > 1 ? 'Encore {n} modules' : 'Encore {n} module', { n: f.formationModules - faits })}</div>
            <div className="p-kjpa7y">
              {forme && finLe ? tf('Depuis le {date}', { date: jourLong(finLe, langue) }) : t(gerant ? 'Avant l’ouverture du relais' : 'Avant votre première remise')}
              {facultatifs ? ' · ' + tf(facultatifs > 1 ? '{n} modules facultatifs' : '{n} module facultatif', { n: facultatifs }) : ''}
            </div>
          </div>
        </div>
        <div className="p-0cipe3">
          {modules.map((x, k) => (
            <div key={x.id} className="p-vdxjav">
              <div className={x.obligatoire ? 'p-jj5tcs' : 'p-ba19n3'}>
                <Icone nom={ICONES[x.id] ?? 'r-formation'} taille={28} className={x.obligatoire ? 'p-v08d0o' : 'p-gqbtfa'} />
              </div>
              <div className="p-g52657">{x.obligatoire ? tf('MODULE {n} · {m} MIN', { n: k + 1, m: x.minutes }) : tf('MODULE {n} · {m} MIN · FACULTATIF', { n: k + 1, m: x.minutes })}</div>
              <div className="p-2z3538">{t(x.titre)}</div>
              {x.statut === 'termine' ? (
                <>
                  <span className="p-nax3x4">{x.score !== null ? tf('Terminé · {s} %', { s: x.score }) : t('Terminé')}</span>
                  <Link to={chemin('formation', { module: x.id })} className="p-wn9elb p10-cible" aria-label={tf('Revoir : {titre}', { titre: t(x.titre) })}>
                    {t('Revoir')}
                  </Link>
                </>
              ) : (
                <>
                  {x.statut === 'a_revoir' && <span className="r-pill r-ton-ambre">{t('À revoir · règles mises à jour')}</span>}
                  <Link to={chemin('formation', { module: x.id })} className="p-ncx7qc" aria-label={tf(x.statut === 'a_faire' ? 'Commencer : {titre}' : 'Reprendre : {titre}', { titre: t(x.titre) })}>
                    <Icone nom="r-oeil" taille={18} className="p-7dsggt" />
                    {t(x.statut === 'a_faire' ? 'Commencer' : 'Continuer')}
                  </Link>
                </>
              )}
            </div>
          ))}
        </div>
        {!forme && !gerant && (
          <div className="p-fht1zk" role="note">
            <Icone nom="r-cadenas" taille={18} />
            <div>{tf('Tant que les {n} modules obligatoires ne sont pas terminés, la remise d’un colis vous reste fermée. Recevoir et faire partir restent possibles.', { n: f.formationModules })}</div>
          </div>
        )}
        {forme && (
          <div className="p10-attestation">
            <Icone nom="award" taille={28} />
            <div className="p-ife3a2">{tf('Attestation de formation · {nom}', { nom: `${membre.prenom} ${membre.nom}` })}</div>
            <div className="p-dfa05r">{finLe ? tf('{relais} · modules obligatoires terminés le {date}', { relais: f.nom, date: jourLong(finLe, langue) }) : f.nom}</div>
            <button type="button" className="p-rbzobc" onClick={telecharger}>
              <Icone nom="download" taille={18} />
              {t('Télécharger l’attestation')}
            </button>
          </div>
        )}
        {gerant && (
          <Link to={chemin('equipe')} className="p-rbzobc">
            <Icone nom="r-personne" taille={18} />
            {t('Voir la formation de mon équipe')}
          </Link>
        )}
        <div className="p-p73eax">
          <Icone nom="r-formation" taille={18} className="p-rd23br" />
          <div>{tf('Formation initiale : les {n} modules obligatoires sur téléphone (≈ {m} min) + une séance pratique d’1 h au comptoir lors de la visite BelivaY. Un module compte comme fait seulement s’il est suivi jusqu’au bout, quiz compris. Une mise à jour des règles peut rouvrir un module.', { n: f.formationModules, m: minutes })}</div>
        </div>
      </div>
    </Ecran>
  )
}

/** Un module : leçons, puis quiz corrigé par le serveur. */
function Module({ module, modules, membre }: { module: ModuleFormation; modules: ModuleFormation[]; membre: Membre }) {
  const { t, tf } = usePreferences()
  const [params, setParams] = useSearchParams()
  const contenu = useLecture(() => source.relais.module(module.id), [module.id])
  const quiz = params.get('etape') === 'quiz'
  const k = modules.indexOf(module)
  const titre = t(module.titre)
  const c = contenu.donnees
  return (
    <Ecran route="formation" titre={titre} retour={chemin('formation')}>
      {!c ? (
        contenu.erreur ? <ErreurLecture relire={contenu.relire} /> : <Chargement />
      ) : (
        <div className="p-0hxmj8 r-pile">
          <div>
            <div className="p-g52657">{module.obligatoire ? tf('MODULE {n} · {m} MIN', { n: k + 1, m: module.minutes }) : tf('MODULE {n} · {m} MIN · FACULTATIF', { n: k + 1, m: module.minutes })}</div>
            <h1 className="p-bvhkrl">{titre}</h1>
            <div className="p-t2u0o2">{t(module.resume)}</div>
          </div>
          {quiz ? (
            <Quiz contenu={c} module={module} modules={modules} membre={membre} />
          ) : (
            <>
              <Lecons contenu={c} />
              <button type="button" className="p-ncx7qc" onClick={() => setParams({ module: module.id, etape: 'quiz' })}>
                <Icone nom="check" taille={18} />
                {tf('J’ai tout lu : passer au quiz ({n} questions)', { n: c.questions.length })}
              </button>
            </>
          )}
        </div>
      )}
    </Ecran>
  )
}

function Lecons({ contenu }: { contenu: ContenuModule }) {
  const { t } = usePreferences()
  const texte = useTexteRegle()
  return (
    <>
      {contenu.lecons.map((l, i) => (
        <section key={l.titre} className="p-yi6rkz" aria-labelledby={'p10-lecon-' + i}>
          <h2 className="p-9j1bbu" id={'p10-lecon-' + i}>
            {t(l.titre)}
          </h2>
          <p className="p10-txt p-t2u0o2">{texte(l)}</p>
        </section>
      ))}
    </>
  )
}

function Quiz({ contenu, module, modules, membre }: { contenu: ContenuModule; module: ModuleFormation; modules: ModuleFormation[]; membre: Membre }) {
  const { t, tf } = usePreferences()
  const g = useGesteRelais()
  const [reponses, setReponses] = useState<(number | null)[]>(() => contenu.questions.map(() => null))
  const [resultat, setResultat] = useState<{ score: number; reussi: boolean; fausses: string[] } | null>(null)
  const complet = reponses.every((r) => r !== null)
  const suivant = modules.find((x, i) => i > modules.indexOf(module) && x.statut !== 'termine')
  const valider = () =>
    void g.faire('reglage', 'formation-' + module.id, (s, o) => s.relais.repondreQuiz(membre.id, module.id, reponses as number[], o), { ok: 'Réponses envoyées.' }, (r) => {
      setResultat(r)
      g.setMessage(null)
    })
  return (
    <form
      className="p10-col"
      onSubmit={(e) => {
        e.preventDefault()
        if (complet && !g.enCours) valider()
      }}
    >
      {contenu.questions.map((q, i) => {
        const faux = resultat?.fausses.includes(q.id)
        return (
          <div key={q.id} className={'p-yi6rkz p10-question' + (faux ? ' p10-faux' : '')} role="radiogroup" aria-labelledby={'p10-q-' + q.id}>
            <div className="p10-q" id={'p10-q-' + q.id}>
              {tf('{n}. {question}', { n: i + 1, question: t(q.texte) })}
            </div>
            <div className="p10-choix">
              {q.choix.map((ch, j) => (
                <label key={ch}>
                  <input type="radio" name={q.id} disabled={!!resultat?.reussi} checked={reponses[i] === j} onChange={() => (setReponses((r) => r.map((x, n) => (n === i ? j : x))), setResultat(null))} />
                  <span>{t(ch)}</span>
                </label>
              ))}
            </div>
            {faux && <span className="p-81u2s6">{t('Réponse à revoir : relisez la leçon.')}</span>}
          </div>
        )
      })}
      <Annonce message={g.message} />
      {resultat && (
        <div className={'p10-annonce ' + (resultat.reussi ? 'p10-ok' : 'p10-ko')} role="status">
          <Icone nom={resultat.reussi ? 'circle-check' : 'circle-alert'} taille={18} />
          <span>{resultat.reussi ? tf('Module terminé · {s} % de bonnes réponses.', { s: resultat.score }) : tf('{s} % de bonnes réponses, {seuil} % demandés : corrigez les réponses en orange et validez de nouveau.', { s: resultat.score, seuil: contenu.seuilPct })}</span>
        </div>
      )}
      {resultat?.reussi ? (
        <>
          {suivant && (
            <Link to={chemin('formation', { module: suivant.id })} className="p-ncx7qc">
              {tf('Module suivant : {titre}', { titre: t(suivant.titre) })}
            </Link>
          )}
          <Link to={chemin('formation')} className="p-rbzobc">
            {t('Retour à la formation')}
          </Link>
        </>
      ) : (
        <button type="submit" className="p-ncx7qc" aria-disabled={!complet || g.enCours || undefined} data-raison={!complet ? t('Répondez à chaque question.') : undefined}>
          <Icone nom="check" taille={18} />
          {t('Valider mes réponses')}
        </button>
      )}
      <p className="p-81u2s6 p10-txt">{tf('Le module compte quand {seuil} % des réponses au moins sont justes. Aucun point, aucune récompense : seulement le droit de servir.', { seuil: contenu.seuilPct })}</p>
    </form>
  )
}
