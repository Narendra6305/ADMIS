import { useEffect } from 'react';

export function useDocumentEvents(onEvent: (type: string, payload: any) => void, activeUserId: string) {
  useEffect(() => {
    if (!activeUserId) return;

    const url = `http://localhost:8000/events/stream?user_id=${encodeURIComponent(activeUserId)}`;
    const es = new EventSource(url);
    const eventTypes = ['document_published', 'document_updated', 'document_purged'];

    eventTypes.forEach((type) => {
      es.addEventListener(type, (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          onEvent(type, payload);
        } catch (err) {
          console.error('[SSE] Event parse error:', err);
        }
      });
    });

    return () => {
      es.close();
    };
  }, [onEvent, activeUserId]);
}
