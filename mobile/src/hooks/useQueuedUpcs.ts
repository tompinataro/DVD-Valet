import { useEffect, useState } from 'react';

import { ensureSchema, listQueuedUpcs, type QueuedUpc } from '../db';
import { STARTUP_TIMEOUT_MS, toUserMessage, withTimeout } from '../startup';

export function useQueuedUpcs() {
  const [items, setItems] = useState<QueuedUpc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setError(null);
      setLoading(true);
      await withTimeout(ensureSchema(), STARTUP_TIMEOUT_MS, 'Preparing local library');
      const rows = await withTimeout(listQueuedUpcs(), STARTUP_TIMEOUT_MS, 'Loading saved DVDs');
      setItems(rows);
    } catch (error) {
      setItems([]);
      setError(
        toUserMessage(error, 'We could not load your saved DVDs yet. You can still add your first DVD.')
      );
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
