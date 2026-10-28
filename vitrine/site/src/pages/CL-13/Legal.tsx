// Écran « Pages légales » (CL-13), balisage et logique du prototype du 1er octobre (route legal), repris à la main et
// rendu logique (DP-53) : la liste des dix documents (dont comptes diaspora et paiement par lien, DP-54), leur version et leur date viennent des données ; la date
// d'acceptation est celle du compte (sans compte : les conditions s'acceptent une fois, à l'inscription).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { Link } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { dateLongue } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useLegal } from './LegalDoc'
import type { DonneesLegal } from '../../donnees/source'
import { DetailVide, EcranCompte, MaitreDetail, useMaitreDetail } from './Larges'

export function Legal() {
  const d = useLegal()
  // Dès 1200 px : maître-détail, les documents à gauche, le document choisi à droite (LegalDoc.tsx, « ?d= »).
  const md = useMaitreDetail()
  if (!d) return null
  return (
    <EcranCompte route="legal" parEtat>
      {md ? <MaitreDetail etiquette="Document" liste={<CorpsLegal d={d} md />} detail={<DetailVide icone="scroll-text" texte="Choisis un document pour le lire" />} /> : <CorpsLegal d={d} />}
    </EcranCompte>
  )
}

// La liste des documents et les acceptations. En maître-détail (« md ») : le document ouvert (« actif ») allumé,
// et son ouverture remplace l'adresse.
export function CorpsLegal({ d, md, actif }: { d: DonneesLegal; md?: boolean; actif?: string }) {
  const { t, tf, langue } = usePreferences()
  return (
    <>
      <p className="cl13-intro">{t('En langage simple, en français et en anglais. Chaque texte a sa version et sa date.')}</p>
      {d.changement && (
        <Link to={chemin('cgu')} className="card vedette row" style={{ gap: 10, color: 'inherit' }}>
          <Icone nom="file-text" taille={20} />
          <span className="grow">
            <b className="t14" style={{ display: 'block' }}>
              {tf('Version {v} dès le {d}', { v: d.changement.version, d: dateLongue(d.changement.des, langue) })}
            </b>
            <span className="t13 c3">{t('Voir ce qui change et l’accepter')}</span>
          </span>
          <Icone nom="chevron-right" taille={18} />
        </Link>
      )}
      {d.acceptee ? (
        <div className="note green">
          <Icone nom="check" taille={18} />
          <div>
            {t('Tu as accepté les conditions une fois, à ton inscription le ')}
            <b>{dateLongue(d.acceptee, langue)}</b>
            {t('. Au paiement, aucune case à cocher. Si une version importante change, on te la montre à l’ouverture de l’application.')}
          </div>
        </div>
      ) : (
        <div className="note ink">
          <Icone nom="info" taille={18} />
          <div>{t('Tu acceptes ces conditions une fois, en créant ton compte. Au paiement, aucune case à cocher.')}</div>
        </div>
      )}
      <div className="card tight">
        {d.documents.map((doc) => (
          <Link key={doc.cle} to={chemin('legal-doc', { d: doc.cle })} replace={md} className={'li' + (doc.cle === actif ? ' on' : '')} aria-current={doc.cle === actif ? 'true' : undefined}>
            <span className="ic ">
              <Icone nom={doc.icone} taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(doc.fr.titre)}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {tf('Version {v} · {d}', { v: d.version, d: dateLongue(d.publiee, langue) })}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        ))}
      </div>
      <div className="hint-l">
        <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Aussi accessibles en bas de l’écran de paiement et sur la page de retour.')}</span>
      </div>
      {d.acceptee && (
        <>
          <div className="sec">
            <h2>{t('Mes acceptations')}</h2>
          </div>
          <div className="card tight">
            {d.documents
              .filter((x) => x.aAccepter)
              .map((x) => (
                <div key={x.cle} className="li">
                  <span className="ic green">
                    <Icone nom="check" taille={20} />
                  </span>
                  <span className="grow">
                    <span className="lt" style={{ display: 'block' }}>
                      {t(x.fr.titre)}
                    </span>
                    <span className="ls" style={{ display: 'block' }}>
                      {tf('Version {v} · acceptée le {d}', { v: d.version, d: dateLongue(d.acceptee!, langue) })}
                    </span>
                  </span>
                </div>
              ))}
          </div>
        </>
      )}
      <div className="card tight mt12">
        <Link to={chemin('confidentialite')} className="li">
          <span className="ic">
            <Icone nom="shield-check" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Confidentialité et données')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Tes choix, qui voit quoi, télécharger tes données')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
        <Link to={chemin('fil', { id: 'support', st: 'nouveau' })} className="li">
          <span className="ic">
            <Icone nom="messages-square" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Une question sur un texte')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Écris au support : réponse sous 2 h, de 7 h à 21 h')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
      </div>
    </>
  )
}
