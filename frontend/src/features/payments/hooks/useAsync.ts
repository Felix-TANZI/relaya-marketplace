// frontend/src/features/payments/hooks/useAsync.ts
// Chargement de donnees — un etat unique, partout pareil.
//
// ─────────────────────────────────────────────────────────────────────────
// UN SEUL ETAT, PAS TROIS
//
// La version naive tient trois `useState` — data, loading, error — et les
// remet a zero au debut de chaque effet. React le refuse desormais, et il a
// raison : trois `setState` synchrones dans un effet, c'est trois rendus en
// cascade avant meme le premier octet de reponse.
//
// Un reducteur resout les deux problemes a la fois : une seule transition
// par evenement, et des etats impossibles a former — on ne peut pas etre
// « en chargement » ET « en erreur ».
//
// L'etat de depart est deja `loading`, donc l'effet n'a plus rien a
// reinitialiser avant de lancer sa requete.
// ─────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

type Action<T> =
  | { type: 'start' }
  | { type: 'success'; data: T }
  | { type: 'failure'; error: string };

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case 'start':
      // On CONSERVE les donnees precedentes pendant un rechargement : faire
      // clignoter un ecran vide a chaque rafraichissement est desagreable.
      return { data: state.data, loading: true, error: null };
    case 'success':
      return { data: action.data, loading: false, error: null };
    case 'failure':
      return { data: state.data, loading: false, error: action.error };
    default:
      return state;
  }
}

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
): AsyncState<T> {
  const [state, dispatch] = useReducer(
    reducer as React.Reducer<State<T>, Action<T>>,
    { data: null, loading: true, error: null },
  );

  // Evite une mise a jour apres demontage — frequent quand on quitte un
  // ecran pendant son chargement.
  const monte = useRef(true);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    monte.current = true;
    dispatch({ type: 'start' });

    fetcher()
      .then((resultat) => {
        if (monte.current) dispatch({ type: 'success', data: resultat });
      })
      .catch((exc: unknown) => {
        if (!monte.current) return;
        dispatch({
          type: 'failure',
          error: exc instanceof Error
            ? exc.message
            : 'Impossible de charger ces données pour le moment.',
        });
      });

    return () => { monte.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { ...state, reload };
}