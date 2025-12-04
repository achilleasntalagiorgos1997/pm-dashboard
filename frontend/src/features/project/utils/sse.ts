export type SSEMessage =
  | { type: "project_created"; id: number }
  | {
      type: "project_updated";
      id: number;
      changed?: string[];
      patch?: Record<string, any>;
    }
  | { type: "project_deleted"; id: number }
  | { type: "project_recovered"; id: number }
  | { type: "event_created"; project_id: number; event: any }
  | Record<string, any>;

export function openSSE(url: string, onMessage: (msg: SSEMessage) => void) {
  const es = new EventSource(url, { withCredentials: false });
  es.onmessage = (evt) => {
    if (!evt.data) return; // comments/keepalives
    try {
      onMessage(JSON.parse(evt.data));
    } catch {}
  };
  // optional: es.onerror = () => console.warn("SSE error; browser will retry");
  return () => es.close();
}
