import { useState } from 'react';
import { initialData } from '../data/fixtures';
import { normalizeDemoData } from '../data/normalizeDemoData';
const key = 'verifi-demo-v2';
export function useDemoStore() {
  const [data, setData] = useState<any>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? normalizeDemoData(JSON.parse(raw)) : structuredClone(initialData);
    } catch {
      return structuredClone(initialData);
    }
  });
  function update(fn: (d: any) => any) {
    setData((prev: any) => {
      const next = fn(prev);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  }
  return [data, update] as const;
}
