import { useEffect, useState } from 'react';
import { api } from './api';
/** Abort stale navigation requests; live events refetch the active resource. */
export function useResource<T = any>(path: string | null, revision: number) {
  const [state, setState] = useState<{
    path: string | null;
    data: T | null;
    error: string;
    loading: boolean;
  }>({ path, data: null, error: '', loading: !!path });
  useEffect(() => {
    const controller = new AbortController();
    if (!path) {
      setState({ path, data: null, error: '', loading: false });
      return;
    }
    setState((current) => ({
      path,
      data: current.path === path ? current.data : null,
      error: '',
      loading: true,
    }));
    api<T>(path, 'GET', undefined, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ path, data, error: '', loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ path, data: null, error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [path, revision]);
  return state.path === path ? state : { path, data: null, error: '', loading: true };
}
