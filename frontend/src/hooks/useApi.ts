import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError };

/**
 * Runs `load` whenever `deps` change. Aborts the previous request so a slow
 * response can never overwrite a newer one (e.g. typing a new search).
 */
export function useApi<T>(load: (signal: AbortSignal) => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    load(controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: 'error',
          error: error instanceof ApiError ? error : new ApiError(0, 'UNKNOWN', 'Something went wrong.'),
        });
      });
    return () => controller.abort();
    // `load` is recreated every render; `deps` lists what it actually depends on.
  }, deps);

  return state;
}
