// frontend/src/features/payments/admin/payouts/ListeVendrediPage.tsx
// DP-42 : la liste du vendredi, validée en bloc — le comptable (Finance) d'abord, le porteur (Direction) ensuite,
// jamais la même personne. Le total et le détail s'affichent avant la validation ; le serveur refuse si la liste a
// changé depuis la lecture. Plus bas : les valideurs de secours (accès limité dans le temps, tracé).
//
// L'écran ne décide rien : rôles, ordre et durée des accès sont contrôlés par le serveur (settlements.dp42).

import { useCallback, useEffect, useState } from 'react';

import { api } from '@/services/api/client';
import { formatXaf } from '../../shared/format';

const BASE = '/api/payments/v2/admin/payouts';

interface Validation { role: string; par: string; le: string; secours: boolean }
interface Ligne {
  reference: string; beneficiaire: string; code: string; type: string;
  montant_xaf: number; frais_xaf: number; statut: string; validations: Validation[];
}
interface Liste {
  liste: string; total_xaf: number; total_en_attente_xaf: number; nombre: number; en_attente: number;
  etape: string | null; detail: Ligne[]; mes_roles: string[];
}
interface Secours {
  id: number; user: string; role: string; debut: string; fin: string; motif: string;
  accorde_par: string; accorde_le: string; revoque_le: string | null; revoque_par: string | null; actif: boolean;
}

const ROLES: Record<string, string> = {
  comptable: 'le comptable (Finance)',
  direction: 'le porteur (Direction)',
};
const date = (iso: string) => new Date(iso).toLocaleString('fr-FR');

export default function ListeVendrediPage() {
  const [liste, setListe] = useState<Liste | null>(null);
  const [secours, setSecours] = useState<Secours[]>([]);
  const [message, setMessage] = useState<{ ton: 'ok' | 'erreur'; texte: string } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [nouveau, setNouveau] = useState({ username: '', role: 'direction', fin: '', motif: '' });

  const charger = useCallback(() => {
    api.get<Liste>(`${BASE}/vendredi/`).then(setListe).catch(() => setListe(null));
    api.get<{ secours: Secours[] }>(`${BASE}/secours/`).then((r) => setSecours(r.secours)).catch(() => setSecours([]));
  }, []);
  useEffect(charger, [charger]);

  const agir = async (fn: () => Promise<unknown>, ok: string) => {
    setOccupe(true);
    setMessage(null);
    try {
      await fn();
      setMessage({ ton: 'ok', texte: ok });
      charger();
    } catch (e) {
      setMessage({ ton: 'erreur', texte: e instanceof Error ? e.message : 'Action refusée.' });
    } finally {
      setOccupe(false);
    }
  };

  const etape = liste?.etape && ROLES[liste.etape] ? liste.etape : null;
  const peutValider = Boolean(etape && liste?.mes_roles.includes(etape) && liste.en_attente > 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <header>
        <h1 className="text-2xl font-black">Liste du vendredi</h1>
        <p className="text-sm text-slate-500">
          Deux validations par deux personnes différentes : le comptable d'abord, le porteur ensuite (DP-42).
          À valider avant midi le vendredi (R22.2).
        </p>
      </header>

      {message && (
        <p role="status" className={message.ton === 'ok' ? 'font-semibold text-emerald-700' : 'font-semibold text-red-600'}>
          {message.texte}
        </p>
      )}

      {!liste || !liste.liste ? (
        <p className="text-slate-500">Aucune liste du vendredi pour l'instant.</p>
      ) : (
        <section className="rounded-xl border bg-white p-4 dark:bg-slate-900">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-sm text-slate-500">{liste.liste} · {liste.nombre} versement(s)</div>
              <div className="text-3xl font-black">{formatXaf(liste.total_xaf)}</div>
              <div className="text-sm text-slate-500">
                {liste.en_attente
                  ? `${liste.en_attente} en attente (${formatXaf(liste.total_en_attente_xaf)}) · étape : ${
                    etape ? ROLES[etape] : 'validations dans des étapes différentes'}`
                  : 'Toute la liste est validée.'}
              </div>
            </div>
            <button
              type="button"
              className="rounded-full bg-black px-5 py-2.5 font-bold text-white disabled:opacity-40"
              disabled={occupe || !peutValider}
              title={peutValider ? '' : 'Cette étape revient à une autre personne.'}
              onClick={() => void agir(
                () => api.post(`${BASE}/vendredi/${liste.liste}/valider/`, { total_xaf: liste.total_en_attente_xaf }),
                'Liste validée.')}
            >
              Valider la liste ({formatXaf(liste.total_en_attente_xaf)})
            </button>
          </div>

          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr><th>Bénéficiaire</th><th>Montant</th><th>Frais</th><th>Statut</th><th>Validations</th></tr>
            </thead>
            <tbody>
              {liste.detail.map((l) => (
                <tr key={l.reference} className="border-t">
                  <td className="py-2">{l.beneficiaire}<div className="text-xs text-slate-400">{l.reference}</div></td>
                  <td>{formatXaf(l.montant_xaf)}</td>
                  <td>{formatXaf(l.frais_xaf)}</td>
                  <td>{l.statut}</td>
                  <td className="text-xs">
                    {l.validations.length === 0 ? '—' : l.validations.map((v) => (
                      <div key={v.role}>{ROLES[v.role] ?? v.role} : {v.par}{v.secours ? ' (secours)' : ''}</div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="rounded-xl border bg-white p-4 dark:bg-slate-900">
        <h2 className="text-lg font-black">Valideurs de secours</h2>
        <p className="text-sm text-slate-500">
          Accordés par le porteur, pour une durée limitée, avec un motif. Chaque accès et chaque validation faite
          à ce titre restent tracés.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className="rounded-lg border px-3 py-2" placeholder="Identifiant" value={nouveau.username}
            onChange={(e) => setNouveau({ ...nouveau, username: e.target.value })} />
          <select className="rounded-lg border px-3 py-2" value={nouveau.role}
            onChange={(e) => setNouveau({ ...nouveau, role: e.target.value })}>
            <option value="comptable">Remplace le comptable</option>
            <option value="direction">Remplace le porteur</option>
          </select>
          <input className="rounded-lg border px-3 py-2" type="datetime-local" value={nouveau.fin}
            onChange={(e) => setNouveau({ ...nouveau, fin: e.target.value })} />
          <input className="min-w-60 flex-1 rounded-lg border px-3 py-2" placeholder="Motif (obligatoire)"
            value={nouveau.motif} onChange={(e) => setNouveau({ ...nouveau, motif: e.target.value })} />
          <button type="button" className="rounded-full border px-4 py-2 font-bold"
            disabled={occupe || !nouveau.username || !nouveau.fin || !nouveau.motif.trim()}
            onClick={() => void agir(
              () => api.post(`${BASE}/secours/`, { ...nouveau, fin: new Date(nouveau.fin).toISOString() }),
              'Accès de secours accordé.')}>
            Accorder
          </button>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {secours.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
              <span>
                <b>{s.user}</b> remplace {ROLES[s.role] ?? s.role} jusqu'au {date(s.fin)} · accordé par {s.accorde_par}
                {' '}— {s.motif}
                {s.revoque_le ? ` · retiré le ${date(s.revoque_le)} par ${s.revoque_par}` : ''}
              </span>
              {s.actif && (
                <button type="button" className="text-red-600 font-bold" disabled={occupe}
                  onClick={() => void agir(() => api.post(`${BASE}/secours/${s.id}/revoquer/`, {}), 'Accès retiré.')}>
                  Retirer
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
