import { NextResponse } from "next/server";

/**
 * Prisma prefixes errors with the failed invocation and a source code frame,
 * which is noise for the client and leaks server file paths. The useful part
 * is whatever follows the code frame's `→` marker.
 */
export function cleanDbErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lines = raw.split("\n");
  const lastFrame = lines.map((l) => l.trimStart().startsWith("→")).lastIndexOf(true);
  const tail = lastFrame >= 0 ? lines.slice(lastFrame + 1) : lines;
  const cleaned = tail
    .filter((l) => l.trim() && !/^\s*\d+\s/.test(l))
    .join(" ")
    .trim();
  return cleaned || raw.trim() || "Unknown database error";
}

/**
 * Wraps a Route Handler so a thrown error (e.g. a DB connection failure)
 * always produces a JSON error body instead of Next's default empty/HTML
 * 500 response — the client always does `res.json()`, so an empty body
 * surfaces as a confusing "Unexpected end of JSON input" instead of the
 * real error.
 */
export function withApiErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      // Full detail (stack, code frame) stays in the server logs.
      console.error("API error:", err);
      return NextResponse.json({ error: cleanDbErrorMessage(err) }, { status: 500 });
    }
  };
}
