// src/features/project/utils/sse.ts

// ---------------------------------------------------------------------------
// SSEMessage
// ---------------------------------------------------------------------------
// Strongly-typed variants for all the SSE payloads we care about.
// This is a discriminated union on the `type` field.
// ---------------------------------------------------------------------------
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
  | { type: "event_created"; project_id: number; event: any };

// ---------------------------------------------------------------------------
// openSSE
// ---------------------------------------------------------------------------
// Small helper around EventSource that:
//   - connects to the given SSE URL
//   - parses JSON messages
//   - calls onMessage ONLY for objects that have a `type` field
//   - returns a cleanup function that closes the connection
//
// In the rest of the app, onMessage receives an SSEMessage, so you can
// safely narrow by `msg.type` and access fields like `msg.id` or `msg.patch`.
// ---------------------------------------------------------------------------
export function openSSE(url: string, onMessage: (msg: SSEMessage) => void) {
  const es = new EventSource(url, { withCredentials: false });

  es.onmessage = (evt) => {
    if (!evt.data) return; // comments / keepalives with no payload

    try {
      const raw = JSON.parse(evt.data);

      // We only care about messages that have a `type` field.
      if (!raw || typeof raw.type !== "string") {
        return;
      }

      // At this point we trust the backend to send something matching SSEMessage.
      // TypeScript sees this as SSEMessage, so narrowing by `msg.type` works.
      onMessage(raw as SSEMessage);
    } catch {
      // Ignore malformed JSON; let the stream continue.
    }
  };

  // Optional error handler if you want to debug SSE:
  // es.onerror = () => console.warn("SSE error; browser will retry automatically");

  // Return cleanup function so React effects can close the connection on unmount.
  return () => es.close();
}
