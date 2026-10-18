import { useEffect, useRef, useState } from 'react';
import { initialData } from '../data/fixtures';
import { withMechanicShowcase } from '../data/mechanicShowcase';
import { normalizeDemoData } from '../data/normalizeDemoData';

export const demoStorageKey = 'verifi-demo-v2';

export function readDemoState(storage: Pick<Storage, 'getItem'>) {
  const raw = storage.getItem(demoStorageKey);
  const parsed = raw ? JSON.parse(raw) : structuredClone(initialData);
  return normalizeDemoData(withMechanicShowcase(parsed));
}

/** Returns false when the browser refuses the write. Callers must not claim a persistent save. */
export function persistDemoState(storage: Pick<Storage, 'setItem'>, value: unknown) {
  try {
    storage.setItem(demoStorageKey, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function loadInitial() {
  try {
    return readDemoState(localStorage);
  } catch {
    return normalizeDemoData(structuredClone(initialData));
  }
}

export function useDemoStore() {
  const [data, setData] = useState<any>(loadInitial);
  const dataRef = useRef(data);
  dataRef.current = data;
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== demoStorageKey || !event.newValue) return;
      try {
        const next = normalizeDemoData(JSON.parse(event.newValue));
        dataRef.current = next;
        setData(next);
      } catch {
        // Another tab wrote a value this tab cannot read. Keep the current session.
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  function update(fn: (d: any) => any) {
    const next = normalizeDemoData(fn(dataRef.current));
    if (!persistDemoState(localStorage, next)) return false;
    dataRef.current = next;
    setData(next);
    return true;
  }
  return [data, update] as const;
}
