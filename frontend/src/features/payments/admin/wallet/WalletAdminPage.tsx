// frontend/src/features/payments/admin/wallet/WalletAdminPage.tsx
// Suivi du Wallet des clients — feuille de route D16, spec v2.1 R03.
//
// Le controle qui compte : le compte 2050 du grand livre doit egaler la
// somme des Wallets (plus les retraits a issue inconnue, encore dus). Un
// ecart non nul est une alerte, pas un chiffre a corriger a la main.
//
// Un geste commercial (R03.6) est demande par un membre de la finance et
// approuve par un autre : le serveur refuse que le demandeur approuve.

import { useCallback, useEffect, useState } from 'react';

import { walletApi, type SuiviWallet } from '../../api/wallet.api';
import Money from '../../shared/Money';
import AdminCard from '../components/AdminCard';
import AdminPageShell from '../components/AdminPageShell';

export default function WalletAdminPage() {
  const [data, setData] = useState<SuiviWallet | null>(null);
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [client, setClient] = useState('');
  const [montant, setMontant] = useState('');
  const [motif, setMotif] = useState('');

  const charger = useCallback(() => {
    walletApi.suivi().then(setData).catch((e: Error) => setErreur(e.message));
  }, []);
  useEffect(charger, [charger]);

  const agir = async (fn: () => Promise<unknown>) => {
    setOccupe(true);
    setErreur('');
    try {
      await fn();
      charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Action refusée.');
    } finally {
      setOccupe(false);
    }
  };

  return (
    <AdminPageShell
      title="Wallet des clients"
      subtitle={data ? (data.ouvert ? 'Ouvert' : 'Fermé (r_wallet_ouvert = 0, R03.1)') : undefined}
      backTo="/admin/finance"
    >
      {erreur && <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>{erreur}</div>}
      {data && (
        <>
          <AdminCard title="Contrôle du grand livre">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12 }}>
              <div>Wallets<br /><b>{data.wallets}</b></div>
              <div>Part retirable<br /><Money value={data.retirable_xaf} /></div>
              <div>Gestes (non retirables)<br /><Money value={data.geste_xaf} /></div>
              <div>Retraits à issue inconnue<br /><Money value={data.retraits_inconnus_xaf} /></div>
              <div>Compte 2050<br /><Money value={data.grand_livre_2050_xaf} /></div>
              <div>Écart<br /><Money value={data.ecart_xaf} tone={data.ecart_xaf === 0 ? 'positive' : 'negative'} /></div>
            </div>
          </AdminCard>

          <AdminCard title="Geste commercial (R03.6)">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <input placeholder="Identifiant du client" value={client} onChange={(e) => setClient(e.target.value)} />
              <input placeholder="Montant (F)" inputMode="numeric" value={montant} onChange={(e) => setMontant(e.target.value)} />
              <input placeholder="Motif" value={motif} onChange={(e) => setMotif(e.target.value)} style={{ flex: 1 }} />
              <button
                type="button"
                disabled={occupe || !client || !montant || !motif.trim()}
                onClick={() => agir(() => walletApi.demanderGeste(Number(client), Number(montant), motif))}
              >
                Demander
              </button>
            </div>
            <table style={{ width: '100%', marginTop: 12 }}>
              <tbody>
                {data.gestes.map((g) => (
                  <tr key={g.id}>
                    <td>{g.client}</td>
                    <td><Money value={g.montant_xaf} /></td>
                    <td>{g.motif}</td>
                    <td>{g.statut} · demandé par {g.demande_par}{g.decide_par ? ` · décidé par ${g.decide_par}` : ''}</td>
                    <td>
                      {g.statut === 'EN_ATTENTE' && (
                        <>
                          <button type="button" disabled={occupe} onClick={() => agir(() => walletApi.deciderGeste(g.id, true))}>Approuver</button>{' '}
                          <button type="button" disabled={occupe} onClick={() => agir(() => walletApi.deciderGeste(g.id, false))}>Refuser</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminCard>

          <AdminCard title="Derniers mouvements">
            <table style={{ width: '100%' }}>
              <tbody>
                {data.mouvements.map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.le).toLocaleString('fr-FR')}</td>
                    <td>{m.client}</td>
                    <td>{m.libelle}</td>
                    <td><Money value={m.montant_xaf} tone={m.montant_xaf >= 0 ? 'positive' : 'negative'} /></td>
                    <td>{m.frais_xaf ? <>frais <Money value={m.frais_xaf} /></> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminCard>
        </>
      )}
    </AdminPageShell>
  );
}
