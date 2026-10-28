// Horaires et fermetures (VD-11) : repris du prototype (route('horaires'), feuille horaires?prog=1), branché sur la
// source. Composition VD11-R18, règles Q-39 :
// - « Fermé aujourd'hui » s'applique tout de suite, sans « Enregistrer » (VD11-R15, ACC-07), jusqu'à la prochaine
//   ouverture réelle ; l'accès Préparation ferme et rouvre le jour même (Q-18).
// - Pause : fermeture sans date de fin, 30 jours au plus, offres masquées, aucune faute si les commandes en cours
//   sont honorées (Q-39, PAR-03).
// - Horaires d'ouverture : une ligne par période, l'heure dans une case de 44 px ; l'heure de fermeture doit suivre
//   l'ouverture (VD11-R17) ; partent à « Enregistrer », en bas après le dernier champ (HOR-01), qui ramène à Ma boutique.
// - Passage du livreur en lecture seule, fixé avec l'entreprise de la zone (VD11-R16).
// - Fermetures programmées par jours entiers, 48 h à l'avance (calendrier grisé avant), motif interne ; « Annuler »
//   jusqu'au premier jour, puis « Rouvrir dès demain » (écourtable à tout moment, Q-39, HOR-03).
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Horaire } from '../../donnees/domaines/boutique'
import { source } from '../../donnees/source'
import { mettreEnFile } from '../../donnees/fileHorsLigne'
import { useLecture } from '../../donnees/useLecture'
import { ajouterJours, debutDuJour, jourDe } from '../../calculs/temps'
import { creneau, heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useDroit, useHorloge, useSession } from '../../session'
import { BandeauHorsLigne, Bouton, CHAMP, Chargement, ErreurLecture, Feuille, Interrupteur, JOURS_LONGS, LienTexte, dateCourte, jourDate, useAnnonce, useFeuilleAdresse } from './communs'

const PREAVIS_MS = 48 * 3600 * 1000
const CASE = { font: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px', height: '44px', padding: '0 10px 0 12px', borderRadius: '12px', border: '1.5px solid var(--input-line)', background: 'var(--input-bg)', fontSize: '14.5px', fontWeight: '700', whiteSpace: 'nowrap', color: 'var(--ink)', cursor: 'pointer' } as const
const hm = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5))

/** Groupes de jours consécutifs aux mêmes horaires (« Lundi au vendredi »). */
function groupes(h: Horaire[]) {
  const g: { jours: number[]; ouvert: boolean; de: string; a: string }[] = []
  for (const x of [...h].sort((a, b) => a.jour - b.jour)) {
    const d = g.at(-1)
    if (d && d.ouvert === x.ouvert && (!x.ouvert || (d.de === x.de && d.a === x.a)) && d.jours.at(-1) === x.jour - 1) d.jours.push(x.jour)
    else g.push({ jours: [x.jour], ouvert: x.ouvert, de: x.de, a: x.a })
  }
  return g
}

export default function Horaires() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const maintenant = useHorloge()
  const naviguer = useNavigate()
  const prep = s.membre?.role === 'preparation'
  const peutFermer = useDroit('boutique.fermer') // droits de l'accès employé
  const lecture = useLecture(() => source.boutique.boutique(), [])
  const commandes = useLecture(() => source.commandes.compteurs(), [])
  const [annonce, dire] = useAnnonce()
  const prog = useFeuilleAdresse('prog')
  const edition = useFeuilleAdresse('jour')
  const pauseF = useFeuilleAdresse('pause')
  const [brouillon, setBrouillon] = useState<Horaire[] | null>(null)
  const [jours, setJours] = useState<number[]>([])
  const [ed, setEd] = useState({ ouvert: true, de: '08:00', a: '18:00' })
  const [du, setDu] = useState('')
  const [au, setAu] = useState('')
  const [motif, setMotif] = useState('')
  const [erreurProg, setErreurProg] = useState<string | null>(null)
  const [dureePause, setDureePause] = useState(7)
  const b = lecture.donnees
  const horaires = brouillon ?? b?.horaires ?? []
  const change = !!brouillon && !!b && JSON.stringify(brouillon) !== JSON.stringify(b.horaires)

  // Premier jour fermé possible : le premier jour qui commence au moins 48 h après maintenant (jours entiers).
  const auPlusTot = useMemo(() => {
    let j = jourDe(maintenant + PREAVIS_MS)
    if (debutDuJour(j) < maintenant + PREAVIS_MS) j = ajouterJours(j, 1)
    return j
  }, [maintenant])

  if (!b)
    return (
      <Ecran route="horaires">
        <div className="pg">
          <h1 className="pg-t">{t('Horaires et fermetures')}</h1>
        </div>
        {lecture.erreur ? <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} /> : <Chargement />}
      </Ecran>
    )

  const aujourdhui = jourDe(maintenant)
  const hJour = b.horaires.find((x) => x.jour === (new Date(aujourdhui + 'T12:00:00Z').getUTCDay() + 6) % 7)
  const fermeParProgramme = b.fermetures.some((f) => f.du <= aujourdhui && aujourdhui <= f.au)
  const fermeParTouche = b.fermeeJusqua !== null
  const peutRouvrir = !prep || b.fermeeLe === aujourdhui
  const basculer = async (fermer: boolean) => {
    // Hors connexion, « Fermer aujourd'hui » part en file (72 h au plus, Q-93) et sera rejoué au retour du réseau.
    if (!navigator.onLine) {
      await mettreEnFile(fermer ? 'fermer' : 'rouvrir', fermer ? 'Fermer aujourd’hui' : 'Rouvrir maintenant')
      return dire(t('Gardé : part dès le retour du réseau.'))
    }
    try {
      await source.boutique.fermerAujourdhui(fermer)
      dire(t(fermer ? 'Boutique fermée : plus de nouvelle commande jusqu’à la prochaine ouverture.' : 'Boutique rouverte : les commandes arrivent de nouveau.'))
    } catch {
      dire(t('Seul le propriétaire peut rouvrir un autre jour.'), 'erreur')
    }
  }
  const aPreparer = commandes.donnees?.prep ?? 0

  const ouvrirEdition = (js: number[]) => {
    const h = horaires.find((x) => x.jour === js[0])!
    setJours(js)
    setEd({ ouvert: h.ouvert, de: h.de, a: h.a })
    edition.ouvrir()
  }
  const erreurEd = ed.ouvert && hm(ed.a) <= hm(ed.de)
  const appliquer = () => {
    if (erreurEd || !jours.length) return
    setBrouillon(horaires.map((h) => (jours.includes(h.jour) ? { ...h, ...ed } : h)))
    edition.fermer()
  }
  const enregistrer = async () => {
    if (!brouillon) return naviguer(chemin('boutique'))
    const r = await source.boutique.changerHoraires(brouillon)
    if (!r.ok) return dire(t('L’heure de fermeture doit suivre l’ouverture.'), 'erreur')
    jouer('interrupteur')
    setBrouillon(null)
    naviguer(chemin('boutique'))
  }

  const nbJours = du && au && au >= du ? Math.round((debutDuJour(au) - debutDuJour(du)) / 86400000) + 1 : 0
  const erreurAu = !!du && !!au && au < du
  const erreurDu = !!du && du < auPlusTot
  const programmer = async () => {
    if (!du || !au || erreurAu || erreurDu) return
    const r = await source.boutique.programmerFermeture(du, au, motif)
    if (!r.ok) return setErreurProg(t(r.raison === 'preavis_48h' ? 'Au moins 48 h à l’avance.' : r.raison === 'chevauche' ? 'Ces jours touchent une fermeture déjà programmée.' : 'Choisissez un jour après le premier.'))
    setDu('')
    setAu('')
    setMotif('')
    prog.fermer()
    dire(tf(nbJours > 1 ? 'Fermeture programmée : {n} jours.' : 'Fermeture programmée : {n} jour.', { n: nbJours }))
  }

  const etatDuJour = b.pause ? (
    <div className="row t13 b7 mt4" style={{ gap: '6px', color: 'var(--ink-2)' }}>
      <i style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', display: 'block', flexShrink: '0' }}></i>
      {tf('En pause jusqu’au {d}', { d: jourDate(b.pause.jusqua, langue) })}
    </div>
  ) : b.fermeeAujourdhui ? (
    <div className="row t13 b7 cr mt4" style={{ gap: '6px' }}>
      <i style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', display: 'block', flexShrink: '0' }}></i>
      {b.fermeeJusqua ? tf('Fermée jusqu’à {jour} {h}', { jour: jourDate(b.fermeeJusqua, langue), h: heure(b.fermeeJusqua, langue) }) : t('Fermée aujourd’hui : fermeture programmée')}
    </div>
  ) : (
    <div className="row t13 b7 cg mt4" style={{ gap: '6px' }}>
      <i style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', display: 'block', flexShrink: '0' }}></i>
      {hJour?.ouvert ? tf('Ouverte aujourd’hui jusqu’à {h}', { h: heure(hJour.a, langue) }) : t('Fermée le dimanche : aucune commande aujourd’hui')}
    </div>
  )

  return (
    <Ecran
      route="horaires"
      fixes={
        <>
          {annonce}
          <Feuille ouverte={prog.ouverte && !prep} fermer={prog.fermer} titre="Programmer une fermeture">
            <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '800' }}>{t('Programmer une fermeture')}</h3>
            <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
              {t('Aucune nouvelle commande ne vous est confiée pendant ces jours.')}
            </p>
            <div className="split2">
              <div className="fld" style={{ minWidth: 0 }}>
                <label htmlFor="prog-du">{t('Premier jour fermé')}</label>
                <div className="inp" style={{ borderColor: erreurDu ? 'var(--red)' : undefined, overflow: 'hidden', padding: '0 8px' }}>
                  <input id="prog-du" type="date" min={auPlusTot} value={du} onChange={(e) => (setDu(e.target.value), setErreurProg(null), au && e.target.value > au && setAu(e.target.value))} style={CHAMP} />
                </div>
                {erreurDu && (
                  <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                    {t('Au moins 48 h à l’avance.')}
                  </div>
                )}
              </div>
              <div className="fld" style={{ minWidth: 0 }}>
                <label htmlFor="prog-au">{t('Dernier jour fermé')}</label>
                <div className="inp" style={{ borderColor: erreurAu ? 'var(--red)' : undefined, overflow: 'hidden', padding: '0 8px' }}>
                  <input id="prog-au" type="date" min={du || auPlusTot} value={au} onChange={(e) => (setAu(e.target.value), setErreurProg(null))} style={CHAMP} />
                </div>
                {erreurAu && (
                  <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                    {t('Choisissez un jour après le premier')}
                  </div>
                )}
              </div>
            </div>
            <div className="fld">
              <label htmlFor="prog-motif">{t('Motif (facultatif)')}</label>
              <div className="inp">
                <input id="prog-motif" maxLength={80} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder={t('Ex. : voyage, inventaire')} style={CHAMP} />
              </div>
              <div className="hint">{t('Pour vous seul : jamais montré au client.')}</div>
            </div>
            <div className="hint-l">
              <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{tf('Au moins 48 h à l’avance : au plus tôt {jour}.', { jour: jourLong(debutDuJour(auPlusTot) + 12 * 3600 * 1000, langue) })}</span>
            </div>
            {nbJours > 0 && !erreurDu && (
              <div className="hint-l" style={{ marginTop: '6px' }}>
                <Icone nom="calendar-x" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
                <span>{tf(nbJours > 1 ? '{n} jours fermés, du {du} au {au}.' : '{n} jour fermé, le {du}.', { n: nbJours, du: jourDate(du, langue), au: jourDate(au, langue) })}</span>
              </div>
            )}
            {erreurProg && (
              <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                {erreurProg}
              </div>
            )}
            <div className="mt14">
              <Bouton icone="calendar-check" inactif={!du || !au || erreurAu || erreurDu} onClick={() => void programmer()}>
                {t('Programmer')}
              </Bouton>
            </div>
            <div className="mt8">
              <Bouton classe="ghost" onClick={prog.fermer}>
                {t('Annuler')}
              </Bouton>
            </div>
          </Feuille>
          <Feuille ouverte={edition.ouverte && !prep && jours.length > 0} fermer={edition.fermer} titre="Horaires d’ouverture">
            <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '800' }}>{t('Horaires d’ouverture')}</h3>
            <div className="fld">
              <label>{t('Jours')}</label>
              <div className="chips" style={{ marginTop: '4px' }}>
                {JOURS_LONGS[langue].map((nom, i) => (
                  <button key={i} type="button" className={'chip' + (jours.includes(i) ? ' on' : '')} aria-pressed={jours.includes(i)} onClick={() => setJours((js) => (js.includes(i) ? js.filter((x) => x !== i) : [...js, i].sort()))}>
                    {nom.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div className="row mt14" style={{ gap: '10px' }}>
              <span className="grow b7 t15">{t('Ouvert ces jours-là')}</span>
              <Interrupteur actif={ed.ouvert} changer={(v) => setEd((x) => ({ ...x, ouvert: v }))} libelle="Ouvert ces jours-là" />
            </div>
            {ed.ouvert && (
              <div className="split2">
                <div className="fld">
                  <label htmlFor="h-de">{t('Ouverture')}</label>
                  <div className="inp">
                    <input id="h-de" type="time" step={900} value={ed.de} onChange={(e) => setEd((x) => ({ ...x, de: e.target.value }))} style={CHAMP} />
                  </div>
                </div>
                <div className="fld">
                  <label htmlFor="h-a">{t('Fermeture')}</label>
                  <div className="inp" style={{ borderColor: erreurEd ? 'var(--red)' : undefined }}>
                    <input id="h-a" type="time" step={900} value={ed.a} onChange={(e) => setEd((x) => ({ ...x, a: e.target.value }))} style={CHAMP} />
                  </div>
                </div>
              </div>
            )}
            {erreurEd && (
              <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                {t('L’heure de fermeture doit suivre l’ouverture')}
              </div>
            )}
            <div className="mt14">
              <Bouton icone="check" inactif={erreurEd || !jours.length} onClick={appliquer}>
                {t('Appliquer')}
              </Bouton>
            </div>
            <div className="mt8">
              <Bouton classe="ghost" onClick={edition.fermer}>
                {t('Annuler')}
              </Bouton>
            </div>
          </Feuille>
          <Feuille ouverte={pauseF.ouverte && !prep && !b.pause} fermer={pauseF.fermer} titre="Mettre la boutique en pause">
            <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '800' }}>{t('Mettre la boutique en pause')}</h3>
            <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
              {t('Plus aucune offre attribuée, vos offres sont masquées. Les commandes reçues restent à préparer : honorées, elles ne comptent pas comme une faute.')}
            </p>
            <div className="seg" role="radiogroup" aria-label={t('Durée de la pause')}>
              {[7, 14, 30].map((n) => (
                <a key={n} role="radio" tabIndex={0} aria-checked={dureePause === n} className={dureePause === n ? 'on' : ''} onClick={() => setDureePause(n)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setDureePause(n))}>
                  {tf('{n} jours', { n })}
                </a>
              ))}
            </div>
            <div className="hint-l">
              <Icone nom="calendar-clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{tf('Reprise automatique le {jour}. 30 jours au plus ; vous pouvez reprendre avant.', { jour: jourLong(debutDuJour(ajouterJours(aujourdhui, dureePause)) + 12 * 3600 * 1000, langue) })}</span>
            </div>
            <div className="mt14">
              <Bouton
                icone="circle-pause"
                onClick={() =>
                  void source.boutique.mettreEnPause(dureePause).then((r) => {
                    pauseF.fermer()
                    if (r.ok) dire(t('Boutique en pause : vos offres sont masquées.'))
                  })
                }
              >
                {t('Mettre en pause')}
              </Bouton>
            </div>
            <div className="mt8">
              <Bouton classe="ghost" onClick={pauseF.fermer}>
                {t('Annuler')}
              </Bouton>
            </div>
          </Feuille>
        </>
      }
    >
      <div className="pg">
        <h1 className="pg-t">{t('Horaires et fermetures')}</h1>
      </div>
      <BandeauHorsLigne texte="Hors connexion : « Fermer aujourd’hui » partira dès le retour du réseau (72 h au plus)." />
      <div className="card" style={{ border: '1.5px solid ' + (fermeParTouche ? 'var(--red-line)' : 'var(--line-2)') }}>
        <div className="row">
          <div className="grow">
            <div className="b8 t17">{t('Fermé aujourd’hui')}</div>
            {etatDuJour}
          </div>
          <Interrupteur actif={fermeParTouche} changer={(v) => void basculer(v)} libelle="Fermé aujourd’hui" verrou={!peutFermer || !!b.pause || fermeParProgramme || (fermeParTouche && !peutRouvrir)} />
        </div>
        <p className="t13 c3" style={{ margin: '10px 0 0', lineHeight: '1.45' }}>
          {fermeParTouche
            ? aPreparer > 1
              ? tf('Plus de nouvelle commande jusqu’à la prochaine ouverture. Les {n} commandes déjà reçues restent à préparer.', { n: aPreparer })
              : aPreparer === 1
                ? t('Plus de nouvelle commande jusqu’à la prochaine ouverture. La commande déjà reçue reste à préparer.')
                : t('Plus de nouvelle commande jusqu’à la prochaine ouverture.')
            : t('Activé : plus de nouvelle commande jusqu’à votre prochaine ouverture. Les commandes déjà reçues restent à préparer.')}
        </p>
        {!peutFermer && <p className="t13 c3" style={{ margin: '6px 0 0' }}>{t('Réservé : votre accès ne comprend pas « Fermer aujourd’hui ».')}</p>}
        {fermeParTouche && prep && !peutRouvrir && <p className="t13 c3" style={{ margin: '6px 0 0' }}>{t('Seul le propriétaire peut rouvrir un autre jour.')}</p>}
      </div>

      {!prep && (
        <div className="card">
          <div className="row" style={{ gap: '10px' }}>
            <Icone nom="circle-pause" taille={20} style={{ color: 'var(--ink-2)', flexShrink: '0' }} />
            <div className="grow">
              <div className="b8 t15">{t('Pause de la boutique')}</div>
              <div className="t13 c3 mt4" style={{ lineHeight: '1.45' }}>
                {b.pause ? tf('Vos offres sont masquées jusqu’au {d}.', { d: jourDate(b.pause.jusqua, langue) }) : t('Pour plusieurs jours sans date de retour : 30 jours au plus.')}
              </div>
            </div>
          </div>
          <div className="mt12">
            {b.pause ? (
              <Bouton classe="secondary" icone="store" onClick={() => void source.boutique.reprendre().then(() => dire(t('Boutique rouverte : les commandes arrivent de nouveau.')))}>
                {t('Reprendre maintenant')}
              </Bouton>
            ) : (
              <Bouton classe="secondary" icone="circle-pause" onClick={pauseF.ouvrir}>
                {t('Mettre en pause')}
              </Bouton>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <h3>{t('Horaires d’ouverture')}</h3>
        <div className="mt6">
          {groupes(horaires).map((g) => {
            const nom = g.jours.length === 1 ? JOURS_LONGS[langue][g.jours[0]] : tf('{a} au {b}', { a: JOURS_LONGS[langue][g.jours[0]], b: JOURS_LONGS[langue][g.jours.at(-1)!].toLowerCase() })
            const valeur = g.ouvert ? creneau([g.de, g.a], langue) : t('Fermé')
            return (
              <div key={g.jours.join()} className="li" style={{ minHeight: '0', padding: '8px 0' }}>
                <span className="grow t14 b7">{nom}</span>
                {prep ? (
                  <span style={{ ...CASE, color: g.ouvert ? 'var(--ink)' : 'var(--ink-3)', cursor: 'default' }}>{valeur}</span>
                ) : (
                  <button type="button" style={{ ...CASE, color: g.ouvert ? 'var(--ink)' : 'var(--ink-3)' }} onClick={() => ouvrirEdition(g.jours)} aria-label={tf('Changer les horaires : {jours}', { jours: nom })}>
                    {valeur}
                    <Icone nom="chevron-down" taille={16} style={{ color: 'var(--ink-3)' }} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {change && (
          <div className="hint-l" role="status" style={{ color: 'var(--amber)' }}>
            <Icone nom="pencil" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>
              {t('Modifications pas encore enregistrées. ')}
              <LienTexte onClick={() => setBrouillon(null)} style={{ minHeight: '24px', padding: 0 }}>
                {t('Tout annuler')}
              </LienTexte>
            </span>
          </div>
        )}
      </div>

      <div className="card">
        <h3>{t('Passage du livreur')}</h3>
        <div className="mt8">
          {b.passageLivreur.map((p) => (
            <div key={p.jours} className="kv">
              <span className="k">{t(p.jours === 'lun–ven' ? 'Lundi au vendredi' : p.jours === 'sam' ? 'Samedi' : p.jours)}</span>
              <span className="v ">{creneau([p.de, p.a], langue)}</span>
            </div>
          ))}
        </div>
        <div className="hint-l">
          <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('Fixé avec {societe}, l’entreprise de livraison de votre zone.', { societe: b.societeLivraison })}</span>
        </div>
      </div>

      <div className="card">
        <h3>{t('Fermetures programmées')}</h3>
        <div className="mt6">
          {b.fermetures.length === 0 && <p className="t13 c3" style={{ margin: '6px 0' }}>{t('Aucune fermeture programmée.')}</p>}
          {b.fermetures.map((f) => {
            const commencee = f.du <= aujourdhui
            return (
              <div key={f.id} className="li" style={{ minHeight: '0', padding: '10px 0' }}>
                <span className="ic">
                  <Icone nom="calendar" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {f.motif || t('Fermeture')}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {f.du === f.au
                      ? tf('Le {du} · annoncée le {le}', { du: jourDate(f.du, langue), le: dateCourte(f.annonceeLe, langue) })
                      : tf('Du {du} au {au} · annoncée le {le}', { du: jourDate(f.du, langue), au: jourDate(f.au, langue), le: dateCourte(f.annonceeLe, langue) })}
                  </span>
                </span>
                {!prep &&
                  (commencee ? (
                    <Bouton classe="ghost sm" style={{ height: '44px', padding: '0 8px' }} onClick={() => void source.boutique.ecourterFermeture(f.id, aujourdhui).then(() => dire(t('Vous rouvrez demain à l’heure d’ouverture.')))}>
                      {t('Rouvrir dès demain')}
                    </Bouton>
                  ) : (
                    <Bouton classe="ghost sm" style={{ height: '44px', padding: '0 8px' }} etiquette={tf('Annuler la fermeture du {du}', { du: jourDate(f.du, langue) })} onClick={() => void source.boutique.annulerFermeture(f.id).then(() => dire(t('Fermeture annulée.')))}>
                      {t('Annuler')}
                    </Bouton>
                  ))}
              </div>
            )
          })}
        </div>
        {!prep && (
          <>
            <div className="mt10">
              <Bouton classe="secondary" icone="plus" onClick={prog.ouvrir}>
                {t('Programmer une fermeture')}
              </Bouton>
            </div>
            <div className="hint-l">
              <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{t('Au moins 48 h à l’avance : le temps de confier vos commandes à d’autres vendeurs.')}</span>
            </div>
          </>
        )}
      </div>
      <div className="hint-l">
        <Icone nom="triangle-alert" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Une boutique fermée sans l’annoncer au passage du livreur compte comme un retard sur votre Trust Score.')}</span>
      </div>
      {!prep && (
        <div className="mt16">
          <Bouton icone="check" onClick={() => void enregistrer()}>
            {t('Enregistrer')}
          </Bouton>
        </div>
      )}
    </Ecran>
  )
}
