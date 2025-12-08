// src/shared/api/api.ts

// ---------------------------------------------------------------------------
// BASE_URL
// ---------------------------------------------------------------------------
// This reads the backend base URL from Vite environment variables.
// If Vite does not provide one (e.g. in development), it falls back
// to http://127.0.0.1:8000.
//
// (import.meta.env is Vite’s way of exposing environment variables.)
//
// BASE_URL is used by the http<T> function to build full request URLs.
// ---------------------------------------------------------------------------
const BASE_URL =
  (import.meta as any).env?.VITE_API_URL ?? "http://127.0.0.1:8000";

// ---------------------------------------------------------------------------
// http<T>(path, init)
// ---------------------------------------------------------------------------
// Generic HTTP helper used by all features.
// - "path" is a relative endpoint (e.g. "/projects/1").
// - "init" is a standard RequestInit object (method, headers, body, etc).
//
// This function:
//   1. Builds the full URL using BASE_URL
//   2. Performs a fetch
//   3. Parses JSON responses into the expected TypeScript type <T>
//   4. Normalizes backend error messages into readable Error messages
//
// The function is completely *feature-agnostic*.
// No project-specific logic is allowed here.
// Every feature uses this for HTTP requests.
// ---------------------------------------------------------------------------
async function http<T>(path: string, init?: RequestInit): Promise<T> {
  // Execute the HTTP request
  const res = await fetch(`${BASE_URL}${path}`, init);

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------
  if (!res.ok) {
    // Default fallback error message
    let message = `Request failed (HTTP ${res.status})`;

    try {
      // Try parsing backend error response
      const body = await res.json();

      // Many FastAPI-style errors return: { detail: [...] }
      if (Array.isArray(body?.detail)) {
        // Collect error messages from array of details
        message = body.detail
          .map((d: any) => d.msg || d.detail || JSON.stringify(d))
          .join("; ");
      }
      // If detail is a single object/string
      else if (body?.detail) {
        message =
          typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail);
      }
    } catch {
      // If JSON parsing fails, ignore and keep the fallback message.
    }

    // Throw a clean JavaScript Error that can be caught by components/hooks
    throw new Error(message);
  }

  // -------------------------------------------------------------------------
  // Success: return parsed response body, typed as <T>
  // -------------------------------------------------------------------------
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
// Only export the low-level HTTP utilities.
// Feature modules (like projects) will import these and call:
//
//   http<Project>("/projects/1")
//
// They never directly use BASE_URL or fetch().
// ---------------------------------------------------------------------------
export { BASE_URL, http };
