// PR-09 · Relevés des versements (page ajoutée ; gérant seul) : toutes les semaines depuis l'ouverture (« releve ») et
// le relevé complet d'une semaine (« releve?v=… ») : état (prévu, envoyé, crédité, refusé, suspendu : VER-07), référence
// BLV-VP transmise à l'opérateur, dates d'envoi et de crédit, essais refusés et prochain essai (VER-08 : au plus
// PR-VER-ESSAIS nouveaux essais à 24 h, puis suspendu et appel du support), lignes du relevé (TableReleve), et
// « Versement non reçu » (VER-05 : une réclamation, réponse avant le lundi midi suivant avec la preuve de l'opérateur ;
// en file hors connexion), puis le fil du support dans la Messagerie.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { geste, useEnLigne } from '../../donnees/fileHorsLigne'
import type { MotifRefus, Versement } from '../../donnees/domaines/argent'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance, heure, jourCourt, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { Chargement, ETATS_VERSEMENT, EcranGerant, ErreurLecture, francs, useOrigine } from './commun'
import { P09 } from './parametres'
import { TableReleve } from './TableReleve'

const MOTIFS: Record<MotifRefus, string> = {
  numero_tiers: 'Numéro au nom d’un tiers',
  compte_plein: 'Compte Mobile Money plein',
  prefixe: 'Préfixe qui ne correspond pas à l’opérateur',
}

export default function Releve() {
  const { t } = usePreferences()
  const [p] = useSearchParams()
  const id = p.get('v')
  const lec = useLecture(() => source.argent.versements(), [])
  const v = id ? (lec.donnees?.find((x) => x.id === id) ?? null) : null
  return (
    <EcranGerant route="releve" titre={id && v?.reference ? v.reference : id ? t('Relevé du versement') : undefined}>
      {lec.erreur ? <ErreurLecture relire={lec.relire} erreur={lec.erreur} /> : !lec.donnees ? <Chargement lignes={4} /> : id ? v ? <UnReleve v={v} /> : <Introuvable /> : <Liste l={lec.donnees} />}
    </EcranGerant>
  )
}

function Introuvable() {
  const { t } = usePreferences()
  return (
    <div className="p-0hxmj8">
      <div className="r-vide" role="alert">
        <div className="r-vide-i">
          <Icone nom="r-document" taille={28} />
        </div>
        <h2>{t('Ce relevé n’existe pas')}</h2>
        <p>{t('Le lien est ancien ou incomplet. Toutes vos semaines sont dans la liste des relevés.')}</p>
      </div>
      <Link className="r-btn r-second" to={chemin('releve')}>
        <Icone nom="r-historique" taille={20} />
        <span>{t('Voir tous les relevés')}</span>
      </Link>
    </div>
  )
}

function Liste({ l }: { l: Versement[] }) {
  const { t, tf, langue } = usePreferences()
  const total = l.filter((v) => v.etat === 'credite').reduce((n, v) => n + v.total, 0)
  return (
    <div className="p-0hxmj8 r-pile">
      <div>
        <h1 className="p-bvhkrl">{t('Relevés des versements')}</h1>
        <div className="p-t2u0o2">{t('Une semaine du vendredi au jeudi, arrêtée le jeudi à minuit, versée le vendredi.')}</div>
      </div>
      <div className="p-yi6rkz">
        <div className="p-unncbq">
          <h2 className="p-9j1bbu">{t('Toutes les semaines')}</h2>
          <span className="p-nax3x4">{tf('{m} crédités', { m: francs(total) })}</span>
        </div>
        {l.length <= 1 && <div className="p-81u2s6">{t('Votre premier relevé paraîtra après le premier vendredi : la semaine en cours est en tête de liste.')}</div>}
        <ul className="r9-liste">
          {l.map((v) => {
            const [etat, ton] = ETATS_VERSEMENT[v.etat]
            return (
              <li key={v.id}>
                <Link to={chemin('releve', { v: v.id })} className="p-br69f5 r9-lien">
                  <Icone nom={v.etat === 'credite' ? 'check' : v.etat === 'prevu' ? 'r-horloge' : 'r-alerte'} taille={18} className={v.etat === 'credite' ? 'p-q7qjlz' : v.etat === 'prevu' || v.etat === 'envoye' ? 'p-672m16' : 'p-woejqv'} />
                  <div className="p-lmo74g">
                    <div className="p-dfc4i3">{tf('Semaine du {du} · versement du {jour}', { du: jourCourt(new Date(v.semaine.du + 'T12:00:00Z').getTime(), langue), jour: jourCourt(v.date, langue) })}</div>
                    <div className="p-584cgi">
                      {v.reference ?? t('référence à l’arrêté')} · <span className={'r9-etat r9-ton-' + ton}>{t(etat)}</span>
                    </div>
                  </div>
                  <div className="p-lq04v6">{francs(v.total)}</div>
                  <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function UnReleve({ v }: { v: Versement }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge()
  const en = useEnLigne()
  const o = useOrigine()
  const [etat, ton] = ETATS_VERSEMENT[v.etat]
  const [envoi, setEnvoi] = useState<'non' | 'en_cours' | 'fait' | 'en_file' | 'erreur'>('non')
  const signaler = async () => {
    setEnvoi('en_cours')
    const x = o()
    try {
      const r = await geste(en, 'message', v.id, x, (s) => s.argent.signalerNonRecu(v.id, x))
      setEnvoi(r.etat === 'en_file' ? 'en_file' : r.r.ok ? 'fait' : 'erreur')
      signal(r.etat === 'en_file' || r.r.ok ? 'succes' : 'erreur')
    } catch {
      setEnvoi('erreur')
      signal('erreur')
    }
  }
  const dernierRefus = [...v.essais].reverse().find((e) => e.refus)
  return (
    <div className="p-0hxmj8 r-pile">
      <div>
        <h1 className="p-bvhkrl">{tf('Versement du {jour}', { jour: jourLong(v.date, langue) })}</h1>
        <div className="p-t2u0o2">
          <span className={'r9-etat r9-ton-' + ton}>{t(etat)}</span> · <span className="r-ref">{v.reference ?? t('référence annoncée à l’arrêté du jeudi minuit')}</span>
        </div>
      </div>

      <div className="p-yi6rkz">
        <div className="p-unncbq">
          <h2 className="p-9j1bbu">{t('Où en est-il ?')}</h2>
          <span className="p-lq04v6">{francs(v.total)}</span>
        </div>
        <div className="p-mqmvkk">
          <span className="p-ytl255">{t('Numéro')}</span>
          <span className="p-2vq92h">{v.numero}</span>
        </div>
        {v.envoyeLe && (
          <div className="p-mqmvkk">
            <span className="p-ytl255">{t('Envoyé')}</span>
            <span className="p-2vq92h">{tf('{jour} à {h}', { jour: jourCourt(v.envoyeLe, langue), h: heure(v.envoyeLe, langue) })}</span>
          </div>
        )}
        {v.crediteLe && (
          <div className="p-mqmvkk">
            <span className="p-ytl255">{t('Crédité')}</span>
            <span className="p-2vq92h">{tf('{jour} à {h}', { jour: jourCourt(v.crediteLe, langue), h: heure(v.crediteLe, langue) })}</span>
          </div>
        )}
        {v.etat === 'prevu' && (
          <div className="p-81u2s6">{v.provisoire ? t('Montant provisoire : il se met à jour à chaque remise jusqu’à l’arrêté du jeudi minuit.') : t('Arrêté : envoi vendredi avant midi, sans frais ni minimum.')}</div>
        )}
        {v.report > 0 && <div className="p-81u2s6">{tf('Rien n’est envoyé cette semaine : le solde négatif de {m} est reporté.', { m: francs(v.report) })}</div>}
        {v.etat === 'suspendu' && v.motifSuspension === 'verification_numero' && v.reporteAu && (
          <div className="p-fht1zk" role="note">
            <Icone nom="r-telephone" taille={18} className="p-lhsznn" />
            <div>{tf('Suspendu pendant la vérification de votre nouveau numéro : versé le {jour}, rien n’est perdu.', { jour: jourLong(v.reporteAu, langue) })}</div>
          </div>
        )}
        {dernierRefus && (
          <div className={v.etat === 'suspendu' ? 'p-ga7sqw' : 'p-fht1zk'} role="alert">
            <Icone nom="r-alerte" taille={18} className={v.etat === 'suspendu' ? 'p-woejqv' : 'p-lhsznn'} />
            <div>
              <strong>{tf('Refusé par l’opérateur : {motif}.', { motif: t(MOTIFS[dernierRefus.refus!]).toLocaleLowerCase(langue) })}</strong>{' '}
              {v.etat === 'suspendu'
                ? tf('{n} essais refusés : versement suspendu. Le support vous appelle ; changez de numéro si celui-ci n’est plus le bon. Rien n’est perdu.', { n: v.essais.length })
                : v.prochainEssai
                  ? tf('Prochain essai {quand} ({n} sur {max}).', { quand: echeance(v.prochainEssai, maintenant, langue), n: v.essais.length, max: P09.versementEssais })
                  : t('Nouvel essai en cours.')}
            </div>
          </div>
        )}
        {v.essais.length > 1 && (
          <ul className="r9-essais" aria-label={t('Essais d’envoi')}>
            {v.essais.map((e, k) => (
              <li key={k}>
                {tf('{jour} à {h}', { jour: jourCourt(e.le, langue), h: heure(e.le, langue) })} · {e.refus ? t(MOTIFS[e.refus]) : t('accepté')}
              </li>
            ))}
          </ul>
        )}
      </div>

      <TableReleve v={v} titre={t('Relevé ligne par ligne')} />

      {(v.envoyeLe || v.etat === 'refuse' || v.etat === 'suspendu') && v.id !== 'V-prochain' && (
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">{t('Un souci avec ce versement ?')}</h2>
          </div>
          {v.reclamation || envoi === 'fait' || envoi === 'en_file' ? (
            <div className="p-gh7puf" role="status">
              <Icone nom="check" taille={18} className="p-672m16" />
              <div>
                {envoi === 'en_file'
                  ? t('Signalement gardé sur le téléphone : il part au retour du réseau.')
                  : v.reclamation
                    ? tf('Signalé le {jour} : BelivaY vous répond {quand}, avec la preuve de l’opérateur.', { jour: jourCourt(v.reclamation.le, langue), quand: echeance(v.reclamation.reponseAvant, maintenant, langue) })
                    : t('Signalé : BelivaY vous répond avant lundi midi, avec la preuve de l’opérateur.')}
              </div>
            </div>
          ) : (
            v.envoyeLe && (
              <button type="button" className="p-ncx7qc" onClick={signaler} disabled={envoi === 'en_cours'}>
                <Icone nom="r-aide" taille={18} />
                {t('Signaler un versement non reçu')}
              </button>
            )
          )}
          {envoi === 'erreur' && (
            <div className="p-81u2s6" role="alert">
              {t('Le signalement n’est pas parti. Réessayez dans un instant.')}
            </div>
          )}
          <Link to={chemin('messagerie')} className="p-rbzobc">
            <Icone nom="r-message" taille={18} className="p-emic6i" />
            {t('Écrire au support')}
          </Link>
        </div>
      )}
    </div>
  )
}
