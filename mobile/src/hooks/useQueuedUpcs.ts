import { useEffect, useState } from 'react';

import { ensureSchema, listQueuedUpcs, type QueuedUpc } from '../db';

export function useQueuedUpcs() {
  const [items, setItems] = useState<QueuedUpc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function refresh() {
    try {
      setError(null);
      setLoading(true);
      await ensureSchema();
      const rows = await listQueuedUpcs();
      setItems(rows);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { items, loading, error, refresh };
}
