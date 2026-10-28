// Bon de préparation (VD-05) : repris du prototype (balisage de route('bon') : en-tête sombre — logo, « Bon de
// préparation », référence, classe du colis, « Payée le … · prête avant … » —, article en très gros, quatre cases,
// « Ne fermez rien. », ramassage chez vous et consigne du code, « Vous gardez » et sa libération, « Aucune donnée du
// client », « Imprimer » et « Partager en PDF »), branché sur la source (preparation.bon, cocher, ouvrirBon).
// - Règles : BON-01 (aucune donnée du client, ni l'endroit où il retire), BON-02 (jamais le code de remise), VD05-R14,
//   CMD-04 (classe du colis), REFVD-R150/R153 ; s'imprime sur une page A4 ou un ticket de 80 mm.
// - Accès Préparation : sans « Vous gardez » (ni à l'écran, ni sur le papier, ni dans le PDF).
// - Ajouts : cases qui se cochent pour de vrai (qui a coché quoi, communes avec la commande), scan de la référence,
//   choix A4 / ticket 80 mm, PDF réel partagé (ou téléchargé), ouverture notée au journal (une fois par jour et par
//   membre), commande qui n'est plus à préparer dite clairement.
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { F } from '@client/i18n/format'
import logo from '../../assets/prototype/be926f70d2b8.png'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import type { BonPreparation } from '../../donnees/domaines/preparation'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { entre, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles, useRole } from '../../session'
import { jourDe } from '../../calculs/temps'
import { Bouton, EtatLecture, hhmm, jourCourtNum, jourDate, quand, useLien } from './commun'
import { pdfTexte, type LignePdf } from './pdf'
import { Verifications, libelleVerification } from './Verifications'

type Format = 'a4' | 'ticket'

export default function Bon() {
  const { tf } = usePreferences()
  const role = useRole()
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? 'BLV-00008'
  const lecture = useLecture(() => source.preparation.bon(ref).then((b) => ({ b })), [ref, role])
  const b = lecture.donnees?.b
  if (!b) return <EtatLecture route="bon" erreur={lecture.erreur} vide={lecture.donnees !== null} relire={lecture.relire} titre={tf('Bon · {ref}', { ref })} />
  return <Feuillet b={b} />
}

function Feuillet({ b }: { b: BonPreparation }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge(30000)
  const montants = useMontantsVisibles()
  const lien = useLien()
  const [format, setFormat] = useState<Format>('a4')
  const [partage, setPartage] = useState<string | null>(null)
  // Ouvrir le bon s'écrit au journal (une fois par jour et par membre).
  useEffect(() => {
    void source.preparation.ouvrirBon(b.ref)
  }, [b.ref])
  const l = b.lignes[0]
  const variante = t(l.variante)
  const r = b.ramassage
  const ligneDates = tf(b.payableAuRetrait ? 'Validée {jour} à {h}' : 'Payée {jour} à {h}', { jour: jourDate(b.payeeA, langue), h: heure(b.payeeA, langue) }) + (b.echeance ? ' · ' + tf('prête avant {h}', { h: quand(b.echeance, maintenant, langue) }) : '')
  const quandRamassage = r ? (jourDe(r.debut) === jourDe(maintenant) ? t('aujourd’hui') : jourDe(r.debut) === jourDe(maintenant + 86400000) ? t('demain') : jourCourtNum(r.debut, langue)) : ''
  const ligneRamassage = r ? tf('{nom} · {quand} {entre}', { nom: r.livreur, quand: quandRamassage, entre: entre([hhmm(r.debut), hhmm(r.fin)], langue) }) : ''
  const liberation = tf('Libéré {n} jours après la confirmation du client', { n: b.liberationJours })

  const imprimer = () => {
    jouer('interrupteur')
    window.print()
  }
  const partager = async () => {
    const lignes: LignePdf[] = [
      { texte: 'BelivaY · ' + t('Bon de préparation'), taille: 15, gras: true },
      { texte: `${b.ref} · ${tf('Colis {c}', { c: b.colis })}`, taille: 12, gras: true, espace: 6 },
      { texte: ligneDates },
      { texte: `${l.titre} · ${variante.toUpperCase()} · ${t(l.etat).toUpperCase()} · ×${l.quantite}`, taille: 14, gras: true, espace: 14 },
      { texte: tf('Réf. {ref}', { ref: l.reference }) },
      { texte: t('À vérifier avant l’arrivée du livreur'), gras: true, espace: 14 },
      ...b.aVerifier.map((v) => ({ texte: `${v.fait ? '[x]' : '[  ]'} ${libelleVerification(v.cle, b, t, tf)}` })),
      { texte: t('Ne fermez rien.') + t(' Le livreur contrôle, emballe dans un emballage BelivaY et scelle devant vous.'), espace: 8 },
      ...(r ? [{ texte: t('Ramassage chez vous'), gras: true, espace: 14 }, { texte: ligneRamassage }, { texte: t('Donnez-lui le code de remise seulement après avoir vérifié sa photo dans l’application.') }] : []),
      ...(montants && b.garde !== null ? [{ texte: `${t(b.payableAuRetrait ? 'Vous garderez' : 'Vous gardez')} : ${t(`${F(b.garde)} F`)}`, gras: true, espace: 14 }, { texte: liberation }] : []),
      { texte: t('Aucune donnée du client ne figure sur ce bon.'), espace: 14 },
    ]
    const fichier = new File([pdfTexte(lignes, format)], `bon-${b.ref}${format === 'ticket' ? '-80mm' : ''}.pdf`, { type: 'application/pdf' })
    try {
      if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], title: tf('Bon de préparation {ref}', { ref: b.ref }) })
        setPartage(t('Bon partagé.'))
        jouer('copie')
        return
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(fichier)
    a.download = fichier.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    setPartage(tf('PDF enregistré : {nom}', { nom: fichier.name }))
    jouer('copie')
  }

  return (
    <Ecran route="bon" titre={tf('Bon · {ref}', { ref: b.ref })} retour={lien('commande', { ref: b.ref })}>
      {/* Impression : le bon seul, sur une page A4 ou un ticket de 80 mm (VD05-R14). */}
      <style>{`@media print{@page{size:${format === 'a4' ? 'A4' : '80mm auto'};margin:${format === 'a4' ? '14mm' : '3mm'}}body *{visibility:hidden!important}.vd05-bon,.vd05-bon *{visibility:visible!important}.vd05-bon{position:absolute;left:0;top:0;width:100%;box-shadow:none!important;margin:0!important}.vd05-bon .btn,.vd05-bon .pill.sm[aria-live]{display:none!important}}`}</style>
      {!b.aPreparer && (
        <div className="note ink" role="status">
          <Icone nom="info" taille={18} />
          <div>{t('Cette commande n’est plus à préparer : le bon reste lisible, ses cases ne se cochent plus.')}</div>
        </div>
      )}
      <div className="card vd05-bon" style={{ marginTop: '16px', padding: '0', overflow: 'hidden' }}>
        <div className="hero night" style={{ margin: '0', borderRadius: '0', padding: '16px 16px 14px', boxShadow: 'none' }}>
          <div className="row">
            <img src={logo} alt="BelivaY" style={{ height: '24px' }} />
            <span className="grow"></span>
            <span className="hk">{t('Bon de préparation')}</span>
          </div>
          <div className="row mt10">
            <span className="grow b8" style={{ fontSize: '20px', letterSpacing: '.02em' }}>
              {b.ref}
            </span>
            <span className="pill dk sm">{tf('Colis {c}', { c: b.colis })}</span>
          </div>
          <div className="t12 mt4" style={{ color: 'rgba(255,255,255,.72)' }}>
            {ligneDates}
          </div>
        </div>
        <div style={{ padding: '16px' }}>
          <div className="art" style={{ marginTop: '0' }}>
            <Vignette nom={l.dessin} taille={64} />
            <div className="grow">
              <div className="an" style={{ fontSize: '24px', letterSpacing: '-.02em' }}>
                {l.titre}
              </div>
              <div className="b8 mt4" style={{ fontSize: '18px', letterSpacing: '.06em', color: 'var(--or-txt)' }}>
                {`${variante.toUpperCase()} · ${t(l.etat).toUpperCase()} · ×${l.quantite}`}
              </div>
              <div className="av mono">{l.reference}</div>
            </div>
          </div>
          <div className="hr"></div>
          <Verifications bon={b} actif={b.aPreparer} />
          <div className="note or">
            <Icone nom="package-open" taille={18} />
            <div>
              <b>{t('Ne fermez rien.')}</b>
              {t(' Le livreur contrôle, emballe dans un emballage BelivaY et scelle devant vous.')}
            </div>
          </div>
          {r && (
            <>
              <div className="hr"></div>
              <div className="kick">{t('Ramassage chez vous')}</div>
              <div className="row mt8">
                <span style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', flexShrink: '0' }}>
                  <Vignette nom={r.photo} taille={44} alt={r.livreur} />
                </span>
                <div className="grow">
                  <div className="b8 t14">{ligneRamassage}</div>
                  <div className="t12 c3 mt4" style={{ lineHeight: '1.4' }}>
                    {t('Donnez-lui le code de remise seulement après avoir vérifié sa photo dans l’application.')}
                  </div>
                </div>
              </div>
            </>
          )}
          {montants && b.garde !== null && (
            <>
              <div className="hr"></div>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <div className="grow">
                  <div className="t14 b7">{t(b.payableAuRetrait ? 'Vous garderez' : 'Vous gardez')}</div>
                  <div className="t12 c3 mt4" style={{ lineHeight: '1.4' }}>
                    {b.payableAuRetrait ? t('Rien n’est encaissé : le client paie au retrait.') : liberation}
                  </div>
                </div>
                <span className={'b8 t17 nw ' + (b.payableAuRetrait ? 'ca' : 'cg')}>{t(`${F(b.garde)} F`)}</span>
              </div>
            </>
          )}
          <div className="t12 c3 mt10">
            <Icone nom="shield-check" taille={13} style={{ verticalAlign: '-2px' }} />
            {t(' Aucune donnée du client ne figure sur ce bon.')}
          </div>
        </div>
      </div>
      <div className="chips" role="radiogroup" aria-label={t('Format du bon')}>
        {(['a4', 'ticket'] as Format[]).map((x) => (
          <button key={x} type="button" role="radio" aria-checked={format === x} className={'chip' + (format === x ? ' on' : '')} onClick={() => (setFormat(x), setPartage(null), jouer('interrupteur'))}>
            <Icone nom={x === 'a4' ? 'file-text' : 'receipt'} taille={16} />
            {t(x === 'a4' ? 'Page A4' : 'Ticket 80 mm')}
          </button>
        ))}
      </div>
      <div className="mt16">
        <Bouton classe="primary" icone="printer" onClick={imprimer}>
          {t('Imprimer')}
        </Bouton>
      </div>
      <div className="mt8">
        <Bouton classe="secondary" icone="file-down" onClick={() => void partager()}>
          {t('Partager en PDF')}
        </Bouton>
      </div>
      {partage && (
        <div className="note green" role="status">
          <Icone nom="circle-check" taille={18} />
          <div>{partage}</div>
        </div>
      )}
    </Ecran>
  )
}
