# HandRehab AI

A computer-vision hand rehabilitation web app — webcam only, no extra
hardware, no login (role-based profile selection instead).

## Workflow

1. **Physician** picks/creates their profile, then demonstrates an exercise in
   front of the webcam (`Physician → Exercise Library → Calibrate new
   exercise`). The system tracks the hand with MediaPipe, records the metric
   over time, and derives thresholds: range of motion, average rep duration,
   and a smoothness baseline.
2. The physician assigns the exercise to a patient with a prescribed
   repetition count (`Physician → Patients → [patient] → Assign from
   library`).
3. **Patient** picks their profile (`/patient`), opens an assigned exercise,
   and performs it in front of the webcam. Live feedback shows a rep counter
   and a range-of-motion gauge.
4. On finishing, the system scores the attempt against the physician's
   calibrated thresholds across four parameters — range of motion, speed,
   smoothness, and completion — and stores it.
5. Both the physician (`Patient → Export Report`) and the patient
   (`My Report`) can open a full report showing every parameter behind the
   score — target ROM/tempo/smoothness per exercise, every attempt's
   sub-scores, and a per-repetition breakdown (min/max reached, duration,
   jerk) — then print it to PDF or download it as CSV (summary or per-rep).

## Exercise types (v1)

All three only need one hand's 21 MediaPipe landmarks, no forearm/pose
tracking:

- **Fist Open/Close** — average fingertip-to-wrist distance (grip ROM)
- **Finger Spread** — average distance between adjacent fingertips (abduction)
- **Thumb Opposition** — thumb-tip to pinky-tip distance

Rep detection uses a hysteresis state machine over the metric time series
(`src/lib/handMetrics.ts`), so it's robust to jitter near the midpoint.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma + Postgres (Vercel Postgres / Neon / any Postgres works)
- `@mediapipe/tasks-vision` HandLandmarker — runs entirely client-side in the
  browser (webcam frames never leave the device)
- Recharts for the physician's progress charts

## Running locally

1. Get a Postgres database. Easiest: a free [Neon](https://neon.tech) project,
   or the "Neon"/"Postgres" integration from the Vercel dashboard's Storage
   tab (works locally too — just copy the connection string out).
2. Paste the env block from Neon's "Connection Details" panel into `.env`. It
   defines both `DATABASE_URL` (pooled — what the app uses) and
   `DATABASE_URL_UNPOOLED` (direct — what schema pushes use). See
   `.env.example` for why the distinction matters.
3.
   ```bash
   npm install
   npx prisma db push   # creates the tables from prisma/schema.prisma
   npm run dev
   ```

Open http://localhost:3000. First run needs internet once, to fetch the
MediaPipe wasm runtime + hand-landmark model from a CDN (cached by the browser
after that). Camera access requires `localhost` or HTTPS.

## Deploying to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket and import it in Vercel.
2. Add a Postgres database from the Vercel dashboard **Storage** tab (Neon
   integration), or bring your own — either way you'll get pooled + direct
   connection strings.
3. In the project's **Settings → Environment Variables**, set `DATABASE_URL`
   to the **pooled** connection string (the host containing `-pooler`).
4. **Create the tables** — this is a separate, manual step, and skipping it is
   the most common cause of a deployed app erroring on every page. Creating
   the Neon database does *not* create your app's tables.

   Neon's "Connection Details" panel hands you an env block containing both
   `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct); paste it into
   `.env`. Then run the push against the **unpooled** one, since the pooler
   runs PgBouncer in transaction mode and doesn't support the DDL locks
   Prisma needs:
   ```bash
   DATABASE_URL="$(grep -m1 '^DATABASE_URL_UNPOOLED=' .env | cut -d= -f2-)" npx prisma db push
   ```
   Re-run that whenever `prisma/schema.prisma` changes.
5. Deploy. `npm run build` already runs `prisma generate` first (see
   `package.json`), and `postinstall` also runs it as a safety net — no extra
   Vercel build-command configuration needed.

No other Vercel-specific config is required: all routes are standard Next.js
API routes (Node runtime, not Edge), and the webcam/MediaPipe work is 100%
client-side.

### Troubleshooting a deployment

Open **`/api/health`** on the deployed URL. It reports whether `DATABASE_URL`
is set, which host it points at, whether that host is the pooled one, and
whether the tables exist — without ever printing the credentials. Typical
results:

- `DATABASE_URL_set: false` → the env var isn't set for this environment in
  Vercel (check that it's enabled for Production, not just Preview), and
  remember env var changes only take effect on a **new deployment**.
- `"the tables are missing"` → the database is reachable but `prisma db push`
  was never run against it (step 4 above).
- `"Can't reach database server"` → wrong host, or the connection string is
  missing `?sslmode=require` (Neon requires SSL).
- `pooled: false` in production → you're using the direct string on Vercel;
  switch to the `-pooler` host to avoid exhausting connections.

Note: Neon Auth is unrelated to any of this — it adds its own `neon_auth`
schema and does not create or manage this app's tables.

## Data model

See `prisma/schema.prisma`. Key entities: `Physician`, `Patient`, `Exercise`
(physician-authored template with calibrated thresholds), `PatientExercise`
(assignment, with per-patient rep overrides), `Attempt` (one scored patient
session, with a JSON `repDetails` field holding the full per-rep breakdown
used by the report/export views).

## Notes / limitations (v1 scope)

- No authentication — profile selection only. Since patient/report data is
  now reachable by anyone with the URL once deployed, don't put real patient
  PII in it without adding auth first.
- Single hand tracked per session (`numHands: 1`).
- Scoring weights (ROM 40% / completion 30% / speed 15% / smoothness 15%) are
  a reasonable default, not clinically validated — tune in
  `src/lib/handMetrics.ts` (`scoreAttempt`) if needed.
