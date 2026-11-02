import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

/** Loads data once and lets the page reload it. Gives loading / error states for free. */
export function useLoad<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => {
    setLoading(true);
    setError("");
    load()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(run, [run]);
  return { data, error, loading, reload: run, setData };
}

export function StatusLine({ loading, error, onRetry }: { loading: boolean; error: string; onRetry: () => void }) {
  if (loading) return <p className="muted" role="status">Loading…</p>;
  if (error)
    return (
      <div className="card error" role="alert">
        {error} <button className="btn small" onClick={onRetry}>Try again</button>
      </div>
    );
  return null;
}

/** Like useLoad, but reloads whenever `path` changes (filters, search). A short delay avoids a request per keystroke. */
export function useQuery<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const run = useCallback(() => {
    setLoading(true);
    setError("");
    api<T>(path)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [path]);
  useEffect(() => {
    const t = setTimeout(run, 150);
    return () => clearTimeout(t);
  }, [run]);
  return { data, error, loading, reload: run, setData };
}
