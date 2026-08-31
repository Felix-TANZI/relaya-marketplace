// frontend/src/features/payments/hooks/useFinanceAction.ts
// Executer une action qui deplace de l'argent.
//
// ─────────────────────────────────────────────────────────────────────────
// APPROUVER N'EST PAS CLIQUER
//
// Toute action financiere suit la meme sequence : appel, gestion de l'echec,
// rechargement, message. Un hook unique evite que chaque ecran la
// reimplemente — et surtout qu'un ecran l'implemente mal.
//
// Le message d'erreur du backend est transmis TEL QUEL : ces phrases sont
// ecrites pour etre lues par un humain, les reformuler une seconde fois ne
// ferait que perdre de l'information.
// ─────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react';

export interface FinanceActionState {
  running: boolean;
  error: string | null;
  success: string | null;
  run: (
    action: () => Promise<unknown>,
    successMessage?: string,
  ) => Promise<boolean>;
  reset: () => void;
}

export function useFinanceAction(onDone?: () => void): FinanceActionState {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const run = useCallback(
    async (action: () => Promise<unknown>, successMessage = '') => {
      setRunning(true);
      setError(null);
      setSuccess(null);
      try {
        await action();
        if (successMessage) setSuccess(successMessage);
        onDone?.();
        return true;
      } catch (exc: unknown) {
        setError(exc instanceof Error
          ? exc.message
          : "L'opération n'a pas abouti.");
        return false;
      } finally {
        setRunning(false);
      }
    },
    [onDone],
  );

  return { running, error, success, run, reset };
}