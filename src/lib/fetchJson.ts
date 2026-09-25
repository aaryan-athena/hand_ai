/**
 * fetch + JSON parse that never throws a bare "Unexpected end of JSON input".
 *
 * Reads the body as text first, so an empty or non-JSON response (a crashed
 * serverless function, an HTML error page, a gateway timeout) reports what
 * actually happened instead of failing inside `res.json()`.
 */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error("Network error — could not reach the server.");
  }

  const text = await res.text();

  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // Response wasn't JSON (HTML error page, proxy message, etc).
    }
  }

  if (!res.ok) {
    const fromBody =
      parsed && typeof parsed === "object" && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : null;
    throw new Error(fromBody ?? `Request failed (${res.status} ${res.statusText || "error"}).`);
  }

  if (parsed === undefined) {
    throw new Error(`Server returned an empty response for ${url}.`);
  }

  return parsed as T;
}
