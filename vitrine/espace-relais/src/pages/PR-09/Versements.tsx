// PR-09 · Versements (gérant seul, VER-06) : combien, quand et où le relais est payé, avec la preuve. Structure du
// prototype (Versements) gardée : titre, carte de versement au dégradé (état et date du vendredi, montant net, « Sera
// versé sur » numéro masqué, opérateur), « Le détail de la semaine » ligne par ligne, trois tuiles (arrêté, frais,
// minimum), reçus du mois (référence BLV-VP, état), « Un souci de versement ? », numéro de versement. Enrichi des
// règles dites et cachées :
// - VER-04 : montant « prévu » provisoire jusqu'à l'arrêté du jeudi minuit (référence annoncée à l'arrêté, PR-RC-17) ;
// - v6 D12, ARL-05 : relevé avec la part BelivaY des espèces de garde déduite, la retenue fiscale à 0 % (ARL-34), le
//   report d'une semaine négative ; « Espèces à reverser » par Mobile Money (référence, numéro marchand, échéance
//   PR-DETTE-DELAI-H) au-delà de PR-DETTE-MAX ou après PR-DETTE-SEMAINES semaines, encaissement des gardes suspendu
//   après l'échéance ; réseau obligatoire pour payer ;
// - VER-03, MOM-03 : nouveau numéro en vérification par une personne, versement suspendu et reporté, rien n'est perdu ;
// - VER-07, VER-08 : états prévu, envoyé, crédité, refusé, suspendu ; refus : motif, prochain essai, support.
// Chaque semaine (en cours et passées) a son relevé complet (page « releve »).
import { Link } from 'react-router-dom'
import { F } from '@client/i18n/format'
import marque from '../../assets/marque-belivay.png'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { geste, ReseauRequis as ErreurReseau, useEnLigne } from '../../donnees/fileHorsLigne'
import type { Argent, Versement } from '../../donnees/domaines/argent'
import { useLecture } from '../../donnees/useLecture'
import { source } from '../../donnees/source'
import { echeance, heure, jourCourt, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { useState } from 'react'
import { Chargement, ETATS_VERSEMENT, EcranGerant, ErreurLecture, ReseauRequis, francs, useOrigine } from './commun'
import { P09, PR } from './parametres'
import { TableReleve } from './TableReleve'

export default function Versements() {
  const lec = useLecture(() => source.argent.argent(), [])
  return <EcranGerant route="versements">{lec.erreur ? <ErreurLecture relire={lec.relire} erreur={lec.erreur} /> : !lec.donnees ? <Chargement lignes={4} /> : <Contenu a={lec.donnees} />}</EcranGerant>
}

/** Dernier versement passé par état : l'objet des liens « Un souci de versement ? ». */
const dernier = (l: Versement[], f: (v: Versement) => boolean) => l.find(f) ?? null

function Contenu({ a }: { a: Argent }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge()
  const v = a.prochain
  const passes = useLecture(() => source.argent.versements(), []).donnees?.slice(1) ?? []
  const arrete = new Date(v.semaine.au + 'T12:00:00Z').getTime()
  const [etat] = ETATS_VERSEMENT[v.etat]
  const souci = dernier(passes, (x) => x.etat === 'envoye' || x.etat === 'credite')
  const refuse = dernier(passes, (x) => x.etat === 'refuse' || (x.etat === 'suspendu' && x.motifSuspension === 'refus_repetes'))
  return (
    <div className="p-0hxmj8 r-pile">
      <div>
        <h1 className="p-bvhkrl">{t('Vos versements')}</h1>
        <div className="p-t2u0o2">{tf('Chaque vendredi avant {h}, sans frais, sans rien demander.', { h: heure(`${PR.versement.avantHeure}:00`, langue) })}</div>
      </div>

      <div className="p-tgv863">
        <div className="p-yq5y59">
          <div>
            <div className="p-svzvpz">{tf('{etat} · {jour}', { etat: t(etat), jour: jourLong(v.date, langue) }).toLocaleUpperCase(langue)}</div>
            <div className="p-rpadgd">
              {F(v.total)} <span className="p-pa311l">{t('FCFA')}</span>
            </div>
          </div>
          <img src={marque} alt="" className="p-9gespx" />
        </div>
        <div className="r9-heros-note">
          {v.etat === 'suspendu' && v.motifSuspension === 'verification_numero' && v.reporteAu
            ? tf('Suspendu pendant la vérification de votre nouveau numéro : versé le {jour}, rien n’est perdu.', { jour: jourLong(v.reporteAu, langue) })
            : v.provisoire
              ? tf('Provisoire : se met à jour à chaque remise jusqu’à l’arrêté du {jour} à minuit.', { jour: jourCourt(arrete, langue) })
              : v.reference
                ? tf('Arrêté : référence {r}, transmise à l’opérateur.', { r: v.reference })
                : t('Arrêté : le montant ne bouge plus.')}
        </div>
        <div className="p-wcjyv8">
          <div>
            <div className="p-zp4ayv">{t('SERA VERSÉ SUR')}</div>
            <div className="p-jjsod9">{v.numero}</div>
          </div>
          <div className={v.numero.startsWith('MTN') ? 'p-skhqwa' : 'p-skhqwa r9-orange'}>{v.numero.startsWith('MTN') ? 'MTN' : 'Orange'}</div>
        </div>
      </div>

      {(a.dette.aReverser || a.dette.montant > 0 || a.dette.paiement?.etat === 'confirme') && <Dette a={a} maintenant={maintenant} />}

      <TableReleve v={v} />

      <div className="p-zmtdxo">
        <div className="p-hdjamr">
          <div className="p-g52657">{t('ARRÊTÉ')}</div>
          <div className="p-arv0mm">{t('jeudi minuit')}</div>
        </div>
        <div className="p-hdjamr">
          <div className="p-g52657">{t('FRAIS')}</div>
          <div className="p-arv0mm">{t('aucun')}</div>
        </div>
        <div className="p-hdjamr">
          <div className="p-g52657">{t('MINIMUM')}</div>
          <div className="p-arv0mm">{t('aucun')}</div>
        </div>
      </div>

      <div className="p-yi6rkz">
        <div className="p-unncbq">
          <h2 className="p-9j1bbu">{tf('Reçus en {mois}', { mois: t(a.recusDuMois.mois) })}</h2>
          <span className="p-nax3x4">{francs(a.recusDuMois.total)}</span>
        </div>
        {a.recusDuMois.versements.length === 0 && <div className="p-81u2s6">{passes.length ? t('Aucun versement crédité ce mois-ci pour l’instant.') : tf('Aucun versement reçu pour l’instant : le premier part le {jour}.', { jour: jourLong(v.date, langue) })}</div>}
        {a.recusDuMois.versements.map((x) => (
          <Link key={x.id} to={chemin('releve', { v: x.id })} className="p-br69f5 r9-lien">
            <Icone nom="check" taille={18} className="p-q7qjlz" />
            <div className="p-lmo74g">
              <div className="p-dfc4i3">{tf('{jour} · crédité', { jour: jourCourt(x.date, langue) })}</div>
              <div className="p-584cgi">{x.reference}</div>
            </div>
            <div className="p-lq04v6">{francs(x.total)}</div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
        ))}
        <div className="p-81u2s6">{t('La référence est annoncée à l’arrêté du jeudi minuit et figure sur votre relevé MoMo : c’est votre preuve auprès de l’opérateur.')}</div>
        <Link to={chemin('releve')} className="p-rbzobc">
          <Icone nom="r-historique" taille={18} className="p-emic6i" />
          {t('Toutes les semaines et leurs relevés')}
        </Link>
      </div>

      <div className="p-yi6rkz">
        <div className="p-unncbq">
          <h2 className="p-9j1bbu">{t('Un souci de versement ?')}</h2>
        </div>
        <Link to={souci ? chemin('releve', { v: souci.id }) : chemin('messagerie')} className="p-o24hsm">
          <div className="p-toppw8">
            <Icone nom="r-aide" taille={20} className="p-672m16" />
          </div>
          <div className="p-rnqj8n">
            <div className="p-ife3a2">{t('Versement non reçu')}</div>
            <div className="p-dfa05r">{t('Signalez-le avec la référence : réponse avant lundi midi')}</div>
          </div>
          <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
        </Link>
        <Link to={refuse ? chemin('releve', { v: refuse.id }) : chemin('messagerie')} className="p-o24hsm">
          <div className="p-19z9iu">
            <Icone nom="r-alerte" taille={20} className="p-woejqv" />
          </div>
          <div className="p-rnqj8n">
            <div className="p-ife3a2">{refuse ? tf('Versement refusé · {r}', { r: refuse.reference ?? '' }) : t('Versement refusé')}</div>
            <div className="p-dfa05r">{tf('Numéro au nom d’un tiers, compte plein ou préfixe qui ne correspond pas : {n} nouveaux essais à {h} h d’intervalle, puis suspension et appel du support', { n: P09.versementEssais, h: PR.versement.intervalleH })}</div>
          </div>
          <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
        </Link>
        <div className="p-81u2s6">{t('Un versement est prévu, envoyé, crédité, refusé ou suspendu : son état s’affiche ici et dans les notifications.')}</div>
      </div>

      <div className="p-yi6rkz">
        <div className="p-o24hsm">
          <div className={a.changement ? 'p-toppw8' : 'p-tc472u'}>
            <Icone nom="r-telephone" taille={20} className={a.changement ? 'p-672m16' : 'p-q7qjlz'} />
          </div>
          <div className="p-rnqj8n">
            <div className="p-ife3a2">{t('Numéro de versement')}</div>
            <div className="p-dfa05r">
              {a.numero.verifieLe ? tf('{n} · vérifié le {jour}', { n: a.numero.masque, jour: jourLong(a.numero.verifieLe, langue) }) : a.numero.masque}
              {a.changement?.etape === 'en_verification' && a.changement.revueJusqua && (
                <>
                  <br />
                  {tf('Nouveau numéro {n} en vérification jusqu’au {jour}', { n: a.changement.nouveau.masque, jour: jourLong(a.changement.revueJusqua, langue) })}
                </>
              )}
            </div>
          </div>
          <span className={a.changement ? 'r-pill r-ton-ambre r9-pastille' : 'p-nax3x4'}>{a.changement ? t('En vérification') : t('Vérifié')}</span>
        </div>
        <div className="p-81u2s6">{tf('Un nouveau numéro se confirme par deux codes SMS, puis une personne le vérifie : versements suspendus {n} jours, rien n’est perdu.', { n: P09.numeroVerifJours })}</div>
        <Link to={chemin('changer-momo')} className="p-rbzobc">
          <Icone nom="r-telephone" taille={18} className="p-emic6i" />
          {a.changement ? t('Voir le changement en cours') : t('Changer de numéro')}
        </Link>
      </div>
    </div>
  )
}

/** Espèces de garde dues à BelivaY (ARL-05) : reportées, ou à reverser par Mobile Money avant l'échéance. */
function Dette({ a, maintenant }: { a: Argent; maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  const en = useEnLigne()
  const o = useOrigine()
  const d = a.dette
  const [envoi, setEnvoi] = useState<'non' | 'en_cours' | 'erreur'>('non')
  const payer = async () => {
    setEnvoi('en_cours')
    try {
      const x = o()
      const r = await geste(en, 'reglage', 'dette', x, (s) => s.argent.reverserDette(x), { reseauRequis: true })
      if (r.r.ok) {
        signal('succes')
        setEnvoi('non')
      } else setEnvoi('erreur')
    } catch (e) {
      signal('erreur')
      setEnvoi(e instanceof ErreurReseau ? 'non' : 'erreur')
    }
  }
  if (!d.aReverser && d.paiement?.etat === 'confirme')
    return (
      <div className="p-gh7puf" role="status">
        <Icone nom="check" taille={18} className="p-672m16" />
        <div>
          <strong>{t('Espèces reversées.')}</strong> {tf('Paiement Mobile Money reçu le {jour} : l’encaissement des gardes est rétabli.', { jour: echeance(d.paiement.demandeLe, maintenant, langue) })}
        </div>
      </div>
    )
  if (!d.aReverser)
    return (
      <div className="p-fht1zk" role="note">
        <Icone nom="r-alerte" taille={18} className="p-lhsznn" />
        <div>
          <strong>{tf('Dette reportée : {m}.', { m: francs(d.montant) })}</strong> {tf('La part BelivaY des espèces de garde a dépassé votre versement : elle se déduit du prochain. Au-delà de {max} ou après {n} semaines de suite, elle se reverse par Mobile Money.', { max: francs(PR.dette.max), n: PR.dette.semaines })}
        </div>
      </div>
    )
  return (
    <div className="p-yi6rkz r9-alerte" role="region" aria-labelledby="r9-dette-titre">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu" id="r9-dette-titre">
          {t('Espèces à reverser')}
        </h2>
        <span className="r-pill r-ton-alerte r9-pastille">{francs(d.montant)}</span>
      </div>
      <div className="p-ug5qrn">
        {tf('{n} semaines de suite, la part BelivaY des espèces de garde a dépassé vos gains. Reversez-la par Mobile Money avec la référence ci-dessous.', { n: d.semaines })}
      </div>
      <div className="p-mqmvkk">
        <span className="p-ytl255">{t('Référence')}</span>
        <span className="p-2vq92h r-ref">{d.reference}</span>
      </div>
      <div className="p-mqmvkk">
        <span className="p-ytl255">{t('Vers')}</span>
        <span className="p-2vq92h">{d.marchand}</span>
      </div>
      <div className="p-mqmvkk">
        <span className="p-ytl255">{t('Échéance')}</span>
        <span className="p-2vq92h">{d.echeance ? echeance(d.echeance, maintenant, langue) : ''}</span>
      </div>
      {d.encaissementSuspendu && (
        <div className="p-ga7sqw" role="alert">
          <Icone nom="r-alerte" taille={18} className="p-woejqv" />
          <div>{t('Échéance dépassée : l’encaissement des gardes est suspendu. Les colis dont la garde est due vont au relais voisin, et un administrateur est prévenu. Reversez pour le rétablir.')}</div>
        </div>
      )}
      {!en && <ReseauRequis>{t('Il faut du réseau pour payer par Mobile Money.')}</ReseauRequis>}
      {envoi === 'erreur' && (
        <div className="p-81u2s6" role="alert">
          {t('Le paiement n’a pas abouti. Réessayez.')}
        </div>
      )}
      <button type="button" className="p-ncx7qc" disabled={!en || envoi === 'en_cours'} onClick={payer}>
        <Icone nom="r-carte-paiement" taille={18} />
        {envoi === 'en_cours' ? t('Demande envoyée sur votre téléphone…') : tf('Payer {m} par Mobile Money', { m: francs(d.montant) })}
      </button>
      <div className="p-81u2s6">{t('Vous validez sur votre téléphone avec votre code secret Mobile Money : BelivaY ne le voit jamais et ne le demande jamais. Non réglé au prochain arrêté, le montant se déduit du versement suivant.')}</div>
    </div>
  )
}
