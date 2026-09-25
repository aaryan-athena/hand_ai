import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cleanDbErrorMessage } from "@/lib/apiHandler";

/**
 * Deployment diagnostics: visit /api/health on the deployed URL to see whether
 * the database env vars are present, the connection works, and the schema has
 * actually been pushed. Reports only presence/shape of the connection string,
 * never its contents.
 */
export async function GET() {
  const raw = process.env.DATABASE_URL;

  const env = {
    DATABASE_URL_set: Boolean(raw),
    DIRECT_URL_set: Boolean(process.env.DIRECT_URL),
    protocol: raw ? raw.split(":")[0] : null,
    host: (() => {
      if (!raw) return null;
      try {
        return new URL(raw).host;
      } catch {
        return "unparseable";
      }
    })(),
  };

  if (!raw) {
    return NextResponse.json(
      {
        ok: false,
        env,
        problem:
          "DATABASE_URL is not set in this environment. Add it in Vercel → Settings → Environment Variables, then redeploy.",
      },
      { status: 500 }
    );
  }

  try {
    const patients = await prisma.patient.count();
    const physicians = await prisma.physician.count();
    const exercises = await prisma.exercise.count();
    const attempts = await prisma.attempt.count();
    return NextResponse.json({
      ok: true,
      env,
      tables: { physicians, patients, exercises, attempts },
    });
  } catch (err) {
    console.error("Health check failed:", err);
    const message = cleanDbErrorMessage(err);
    const missingTables = /does not exist|relation .* does not exist|P2021/i.test(message);
    return NextResponse.json(
      {
        ok: false,
        env,
        problem: missingTables
          ? "Connected, but the tables are missing — run `npx prisma db push` against this database."
          : "Could not query the database.",
        detail: message,
      },
      { status: 500 }
    );
  }
}
