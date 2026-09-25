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
   tab (works locally too — just copy the connection strings out).
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` (pooled
   connection string) and `DIRECT_URL` (direct/non-pooled — same DB, just the
   non-pgbouncer connection string, used for schema pushes/migrations).
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
3. In the project's **Settings → Environment Variables**, set:
   - `DATABASE_URL` — the pooled connection string
   - `DIRECT_URL` — the direct/non-pooled connection string
4. Before (or after) the first deploy, push the schema to that database once:
   ```bash
   DATABASE_URL="<pooled>" DIRECT_URL="<direct>" npx prisma db push
   ```
   (run this from your machine, or via `vercel env pull` to grab the values
   locally first). This only needs to be re-run when `prisma/schema.prisma`
   changes.
5. Deploy. `npm run build` already runs `prisma generate` first (see
   `package.json`), and `postinstall` also runs it as a safety net — no extra
   Vercel build-command configuration needed.

No other Vercel-specific config is required: all routes are standard Next.js
API routes (Node runtime, not Edge), and the webcam/MediaPipe work is 100%
client-side.

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
