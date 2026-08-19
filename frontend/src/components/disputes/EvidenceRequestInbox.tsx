import { useEffect, useState } from 'react';
import { AlertTriangle, FileUp, RefreshCw, ShieldCheck } from 'lucide-react';
import { customerApi, type DisputeEvidenceRequest } from '@/services/api/customer';
import { ensureImagesUnderLimit } from '@/lib/imageCompression';

export default function EvidenceRequestInbox({ accent = '#0ea5e9' }: { accent?: string }) {
  const [requests, setRequests] = useState<DisputeEvidenceRequest[]>([]);
  const [files, setFiles] = useState<Record<number, File[]>>({});
  const [sending, setSending] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = () => customerApi.getPendingEvidenceRequests().then(setRequests).catch(() => setRequests([]));
  useEffect(() => { void load(); }, []);

  if (!requests.length) return null;

  const submit = async (item: DisputeEvidenceRequest) => {
    const selected = files[item.id] || [];
    if (!selected.length) return;
    setSending(item.id);
    setError('');
    try {
      await customerApi.respondToEvidenceRequest(item.id, selected, `Preuves transmises par ${item.recipient_role}`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "L'envoi a échoué.");
    } finally {
      setSending(null);
    }
  };

  return (
    <section className="mb-5 overflow-hidden rounded-lg border border-amber-200 bg-white shadow-sm dark:border-amber-900 dark:bg-gray-900">
      <div className="flex items-center gap-3 border-b border-amber-100 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
        <AlertTriangle size={18} className="text-amber-600" />
        <div>
          <h2 className="text-sm font-black text-gray-950 dark:text-white">Preuves demandées par BelivaY</h2>
          <p className="text-xs text-gray-600 dark:text-gray-300">Répondez uniquement aux demandes officielles affichées ici.</p>
        </div>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {requests.map((item) => (
          <div key={item.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-2xl">
                <p className="text-sm font-bold text-gray-950 dark:text-white">Litige #{item.dispute} · {item.instructions}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {item.due_at ? `À transmettre avant le ${new Date(item.due_at).toLocaleString('fr-FR')}` : 'Aucune échéance définie'}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800"><ShieldCheck size={12} /> EN ATTENTE</span>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <label className="inline-flex min-h-11 flex-1 cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <FileUp size={17} style={{ color: accent }} />
                {(files[item.id] || []).length ? `${files[item.id].length} fichier(s) sélectionné(s)` : 'Sélectionner photos, vidéo ou PDF'}
                <input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4" className="sr-only" onChange={(event) => {
                  const selected = Array.from(event.target.files || []);
                  void ensureImagesUnderLimit(selected).then((compressed) => setFiles(current => ({ ...current, [item.id]: compressed })));
                }} />
              </label>
              <button type="button" disabled={!(files[item.id] || []).length || sending === item.id} onClick={() => void submit(item)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-black text-white disabled:opacity-50" style={{ background: accent }}>
                {sending === item.id ? <RefreshCw size={16} className="animate-spin" /> : <FileUp size={16} />}
                Transmettre
              </button>
            </div>
          </div>
        ))}
        {error && <p className="px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
      </div>
    </section>
  );
}
