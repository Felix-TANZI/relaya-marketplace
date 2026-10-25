// LIV-P14 · Code de remise — remise valide ⇔ photo 1 ∧ photo 2 ∧ étiquette liée ∧ code correct (quatre conditions
// bloquantes, contrôle serveur). Le livreur TEND son téléphone : le vendeur tape lui-même son code (lu dans « Mes
// commandes à remettre »), six cases masquées, jamais affiché ni noté ; le livreur ne le devine, ne le demande à
// l'avance ni ne le reçoit par message. Code à usage unique ; CODE-ESSAIS essais puis blocage de CODE-BLOCAGE-H et
// incident automatique : le livreur ne part pas avec le colis, le vendeur redemande lui-même un code, sans effet pour
// lui. Validé : la responsabilité passe à l'entreprise, horodatée à la seconde ; le vendeur voit « Remis à … » en
// temps réel, le client passe « En route » et ne peut plus annuler (parcel.collected), le relais voit l'arrivée
// annoncée. Hors connexion : vérifié sur le téléphone contre une empreinte, confirmé par le serveur au retour du réseau.
// Structure : route « code-remise » du prototype (livRam_prog, Remise de n colis, « Tendez votre téléphone », C.otp,
// C.keypad, barre du bas ; héros « Remise validée » ; héros « Code bloqué » et suivi de l'incident).
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Pourquoi } from '../../composants/enrichis'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { echeance, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { AideDemo } from '../../composants/livraison/contexte'
import { AideEtape, Rebours } from '../../composants/livraison/enrichi'
import { Chargement, Erreur, useAgir } from '../../composants/livraison/outils'
import { BarreAction, Cases, Foot, Hint, Li, Lvp, Note, Pave, Sec } from '../../composants/proto'
import { Avancement, CaseVerif, FileArret, HorsLigneRamassage, RienIciProto, Suite, useRamassage } from './commun'
import { Enchainement } from '../../composants/livraison/terrain'

export default function CodeRemise() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const x = useRamassage()
  const { agir, occupe, enLigne, maintenant } = useAgir()
  const { tournee, regles, arret, paquet, ramassage: r } = x
  const [code, setCode] = useState('')
  const [faux, setFaux] = useState<number | null>(null)
  const [fait, setFait] = useState<{ garde: number; enFile: boolean; a: number } | null>(null)

  const valider = async () => {
    if (!arret) return
    const saisi = code
    setCode('') // le code n'est jamais gardé
    const res = await agir('code_remise', arret.id, (o, s) => s.ramassage.validerCode(arret.id, saisi, o))
    if (!res) return
    if (res.r.ok) {
      signal('codeValide')
      setFaux(null)
      setFait({ garde: res.r.garde, enFile: res.enFile, a: maintenant })
    } else {
      signal('codeFaux')
      setFaux(res.r.essaisRestants ?? 0)
      x.lectureR.relire()
    }
  }

  const contenu = (): { corps: ReactNode; barre?: ReactNode } => {
    if (x.lecture.erreur || x.lectureR.erreur) return { corps: <Erreur relire={() => (x.lecture.relire(), x.lectureR.relire())} /> }
    if (!x.charge || !regles) return { corps: <Chargement /> }
    if (!tournee || !r) return { corps: <RienIciProto titre="Aucune remise en cours" texte="Le code de remise se demande chez le vendeur de l’arrêt en cours, quand tous les colis sont scellés." icone="key-round" /> }
    const attendus = r.colis.filter((c) => c.etat !== 'refuse' && c.etat !== 'retire')
    const valide = fait ?? (r.code.valideA ? { garde: r.colis.filter((c) => c.etat === 'remis').length, enFile: false, a: r.code.valideA } : null)
    const tete = (etape: number) => (
      <>
        {!enLigne && <HorsLigneRamassage quoi="Le code est vérifié sur le téléphone." />}
        {arret && <Avancement tournee={tournee} arret={arret} paquet={paquet} r={r} regles={regles} maintenant={maintenant} etape={etape} courant={null} pastilles />}
      </>
    )
    const pied = !enLigne && <Foot icone="wifi-off">{tf('Hors connexion · tournée téléchargée à {h}', { h: heure(tournee.telechargeeA, langue) })}</Foot>

    // Un code par commande du vendeur (le serveur remet les colis de la commande dont le code est saisi) : tant qu'un
    // colis scellé de l'arrêt attend encore son code, la saisie revient pour la commande suivante.
    const restants = r.colis.filter((c) => c.etat === 'emballe')
    // Remise validée : la garde passe à l'entreprise, à la seconde.
    if (valide && restants.length === 0) {
      const remis = r.colis.filter((c) => c.etat === 'remis' || c.etat === 'emballe')
      return {
        corps: (
          <>
            {tete(4)}
            <div className="hero green">
              <h2 className="hk">
                {t('Remise validée')} <span className="lr-t">· {heure(valide.a, langue)}</span>
              </h2>
              <div className="row mt10" style={{ gap: 14, alignItems: 'flex-end' }}>
                <div className="bigN">
                  {tournee.colisSousGarde}
                  {paquet && <small style={{ fontSize: '1.375rem', opacity: 0.75 }}>/{paquet.colisTotal}</small>}
                </div>
                <div className="grow">
                  <div className="ht" style={{ margin: 0 }}>
                    {t('Colis sous votre responsabilité')}
                  </div>
                </div>
              </div>
              <div className="hs">
                {tf('{n} colis remis ici. À partir de maintenant, tout dommage ou toute perte est imputé à {entreprise}, sauf preuve contraire.', { n: valide.garde, entreprise: tournee.entreprise })}
                {valide.enFile && ' ' + t('Code vérifié sur le téléphone : le serveur le confirme au retour du réseau.')}
              </div>
            </div>
            <Sec titre={t('Ce qui vient de se passer')} />
            <div className="card tight">
              <Li icone="store" ton="or" t={tf('{vendeur} voit « Remis à {prenom} · {h} »', { vendeur: r.vendeur, prenom: s.livreur?.prenom ?? '', h: heure(valide.a, langue) })} s={t('En temps réel, dans son application.')} />
              <Li icone="bell-ring" ton="acc" t={t('Le client voit « En route »')} s={t('Il ne peut plus annuler ; le relais voit l’arrivée annoncée du lot.')} />
              <Li icone="shield-check" ton="green" t={tf('Responsabilité à {entreprise}', { entreprise: tournee.entreprise })} s={tf('Horodatée à {h} : tout dommage ou perte ensuite lui est imputé, sauf preuve contraire.', { h: heure(valide.a, langue) })} />
            </div>
            {remis.length > 0 && (
              <>
                <Sec titre={t('Remis ici')} droite={remis.length === 1 ? t('1 colis') : tf('{n} colis', { n: remis.length })} />
                <div className="card tight">
                  {remis.map((c) => (
                    <div key={c.colisId} className="parcel ok">
                      <span className="pc">
                        <Icone nom="check" taille={16} trait={3} />
                      </span>
                      <span className="grow">
                        <span className="b8 t14" style={{ display: 'block' }}>
                          {(c.etiquette ? c.etiquette + ' · ' : '') + c.article.nom}
                        </span>
                        <span className="t12 c3" style={{ display: 'block', marginTop: 1 }}>
                          {tf('Scellé · remis à {h}', { h: heure(valide.a, langue) })}
                        </span>
                      </span>
                    </div>
                  ))}
                  <div style={{ height: 8 }} />
                </div>
              </>
            )}
            <FileArret r={r} />
            {pied}
          </>
        ),
        barre: (
          <BarreAction>
            <Enchainement actif={!!fait} />
            <Link className="btn primary xl" to={chemin('tournee')}>
              <Icone nom="navigation" taille={18} />
              <span>{t('Continuer la tournée')}</span>
            </Link>
          </BarreAction>
        ),
      }
    }

    // Code bloqué : les colis restent chez le vendeur, un incident est ouvert.
    const bloque = r.code.bloqueJusqua !== null && r.code.bloqueJusqua > maintenant
    if (bloque)
      return {
        corps: (
          <>
            {tete(3)}
            <div className="hero red" role="alert">
              <div className="hk" style={{ color: '#FFB4AB' }}>
                {tf('Code bloqué · {n} heures', { n: regles.codeBlocageH })}
              </div>
              <div className="ht">{t('Vous ne partez pas avec les colis')}</div>
              <div className="hs">{tf('{n} codes faux. Un incident est ouvert ; les colis restent chez {vendeur}. Ne partez pas avec. Le vendeur redemandera lui-même un code ; c’est sans effet pour lui comme pour vous.', { n: regles.codeEssais, vendeur: r.vendeur })}</div>
              <div className="btns" style={{ marginTop: 14 }}>
                <Link className="btn white" to={chemin('appel', { avec: 'entreprise' })}>
                  <Icone nom="phone" taille={18} />
                  <span>{tf('Appeler {entreprise}', { entreprise: tournee.entreprise })}</span>
                </Link>
              </div>
            </div>
            <Sec titre={t('Suivi de l’incident')} />
            <div className="card">
              <div className="tl">
                <div className="ti done">
                  <div className="tt">{t('Incident ouvert automatiquement')}</div>
                  <div className="td">{tf('{n} codes faux', { n: regles.codeEssais })}</div>
                </div>
                <div className="ti cur">
                  <div className="tt">{t('En attente de validation')}</div>
                  <div className="td">{tf('{entreprise}, ou l’opérateur de zone BelivaY', { entreprise: tournee.entreprise })}</div>
                </div>
                <div className="ti">
                  <div className="tt">{t('Suite décidée par le système')}</div>
                  <div className="td">{tf('Code débloqué {quand} ; vous ne dissociez rien.', { quand: echeance(r.code.bloqueJusqua!, maintenant, langue) })}</div>
                  <div className="mt8">
                    <Rebours fin={r.code.bloqueJusqua!} maintenant={maintenant} libelle={t('Déblocage dans')} icone="lock" />
                  </div>
                </div>
              </div>
            </div>
            <Note ton="red" icone="ban">
              {t('Ne demandez pas un code par téléphone ou par message, et ne validez jamais avec un code donné par une personne absente.')}
            </Note>
            <Pourquoi fiche="remise">{t('Le code prouve que le vendeur vous remet lui-même ses colis. Le bloquer après quelques essais empêche de le deviner ; l’incident ouvert vous protège : personne ne vous reproche de ne pas partir.')}</Pourquoi>
            {pied}
          </>
        ),
        barre: (
          <BarreAction>
            <Link className="btn primary xl" to={chemin('tournee')}>
              <Icone nom="triangle-alert" taille={18} />
              <span>{t('Suivre l’incident')}</span>
            </Link>
          </BarreAction>
        ),
      }

    // Saisie : les quatre conditions, le téléphone tendu, le pavé.
    const prets = restants
    const dejaRemis = attendus.filter((c) => c.etat === 'remis').length
    const complet = prets.length > 0 && prets.length === attendus.length - dejaRemis
    const n = attendus.length
    const compte = (k: number) => tf('{k} sur {n}', { k, n })
    const etiquettes = attendus.map((c) => c.etiquette).filter(Boolean) as string[]
    return {
      corps: (
        <>
          {tete(3)}
          <AideEtape etape="code" />
          <Sec titre={prets.length === 1 ? t('Remise de 1 colis') : tf('Remise de {n} colis', { n: prets.length })} />
          {dejaRemis > 0 && complet && (
            <Note ton="acc" icone="circle-check">
              {tf('{n} colis déjà remis ici : saisissez le code de la commande suivante.', { n: dejaRemis })}
            </Note>
          )}
          <div className="card tight">
            <CaseVerif etat={attendus.every((c) => !!c.photo1) ? 'on' : 'wait'} titre={t('Photo 1 · produit à découvert')} sous={compte(attendus.filter((c) => !!c.photo1).length)} />
            <CaseVerif etat={attendus.every((c) => !!c.photo2) ? 'on' : 'wait'} titre={t('Photo 2 · colis scellé, étiquette lisible')} sous={compte(attendus.filter((c) => !!c.photo2).length)} />
            <CaseVerif etat={etiquettes.length === n ? 'on' : 'wait'} titre={t('Étiquettes liées')} sous={etiquettes.length ? etiquettes[0] + (etiquettes.length > 1 ? ' → ' + etiquettes[etiquettes.length - 1] : '') : compte(0)} />
            <CaseVerif etat="wait" titre={t('Code du vendeur')} sous={tf('À saisir par {vendeur}, ou dicté par lui', { vendeur: r.vendeur })} />
          </div>
          {!complet ? (
            <div className="card">
              <div className="empty">
                <div className="ei">
                  <Icone nom="lock-keyhole" taille={26} />
                </div>
                <h3>{t('Pas encore')}</h3>
                <p>{t('Le code se demande quand chaque colis de l’arrêt est contrôlé, scellé et photographié.')}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="card acc">
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <span className="li" style={{ border: 0, padding: 0, minHeight: 0 }}>
                    <span className="ic acc">
                      <Icone nom="hand" taille={20} />
                    </span>
                  </span>
                  <div className="grow">
                    <div className="b8 t15">{tf('Tendez votre téléphone à {vendeur}', { vendeur: r.vendeur })}</div>
                    <div className="t13 c3 mt4">{tf('Il saisit lui-même son code à {n} chiffres, ou vous le dicte. Il le retrouve dans son application, « Mes commandes à remettre ».', { n: regles.codeLongueur })}</div>
                  </div>
                </div>
                <Cases n={regles.codeLongueur} valeur={code} actif={!occupe} erreur={faux !== null && !code} libelle={tf('{libelle} : {n} chiffres sur {total}', { libelle: t('Code de remise'), n: code.length, total: regles.codeLongueur })} />
              </div>
              {faux !== null ? (
                <>
                  <Note ton="red" icone="circle-x" role="alert">
                    <b>{faux === 1 ? t('Code incorrect · 1 essai restant.') : tf('Code incorrect · {n} essais restants.', { n: faux })}</b> {tf('Au dernier code faux, le code est bloqué {h} heures.', { h: regles.codeBlocageH })}
                  </Note>
                  <Hint icone="info">{t('Le vendeur retrouve son code dans son application. Vous ne le lui fournissez jamais et ne le demandez jamais par message.')}</Hint>
                </>
              ) : !enLigne ? (
                <Note ton="acc" icone="shield-check">
                  {t('Pas de réseau : le code est vérifié sur le téléphone. Tout part au retour du réseau, avec l’heure et la position d’origine.')}
                </Note>
              ) : (
                <Hint icone="shield-alert">
                  <b>{r.code.essaisRestants === 1 ? t('1 essai restant') : tf('{n} essais restants', { n: r.code.essaisRestants })}</b> · {tf('{n} essais au plus : au dernier code faux, le code est bloqué {h} heures et un incident s’ouvre.', { n: regles.codeEssais, h: regles.codeBlocageH })}
                </Hint>
              )}
              <Pave actif={!occupe} vide={code.length === 0} plein={code.length >= regles.codeLongueur} ajouter={(c) => (setCode((v) => (v.length < regles.codeLongueur ? v + c : v)), setFaux(null))} effacer={() => (setCode((v) => v.slice(0, -1)), setFaux(null))} />
              <AideDemo titre="le vendeur">
                {tf('{vendeur} lit son code dans « Mes commandes à remettre » :', { vendeur: r.vendeur })} <code>{r.codeDemo}</code>
              </AideDemo>
            </>
          )}
          <FileArret r={r} />
          {pied}
        </>
      ),
      barre: complet ? (
        <BarreAction aide={code.length !== regles.codeLongueur ? tf('Le bouton s’active quand les {n} chiffres sont saisis.', { n: regles.codeLongueur }) : undefined}>
          <button type="button" className="btn primary xl" disabled={code.length !== regles.codeLongueur || occupe} onClick={() => void valider()}>
            <Icone nom="lock-keyhole" taille={18} />
            <span>{t('Valider la remise')}</span>
          </button>
        </BarreAction>
      ) : (
        <BarreAction>
          <Suite r={r} texte="Terminer les preuves" />
        </BarreAction>
      ),
    }
  }
  const k = contenu()
  return (
    <Ecran proto route="code-remise" titre={r ? tf('Code de remise · {vendeur}', { vendeur: r.vendeur }) : undefined}>
      <Lvp>
        {k.corps}
        {k.barre}
      </Lvp>
    </Ecran>
  )
}
