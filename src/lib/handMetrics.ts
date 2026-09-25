// Pure math over MediaPipe HandLandmarker output (21 normalized landmarks per hand).
// No CV/browser dependencies here so this module is testable and reusable
// for both the physician calibration flow and the patient scoring flow.

export type Landmark = { x: number; y: number; z: number };
export type ExerciseType = "FIST_CURL" | "FINGER_SPREAD" | "THUMB_OPPOSITION";

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_TIP = 12;
const RING_TIP = 16;
const PINKY_TIP = 20;

function dist(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

// Distance from wrist to middle-finger MCP is a stable proxy for "hand size in
// frame" — it barely changes with finger pose, only with camera distance —
// so dividing by it makes every metric roughly scale-invariant.
function handScale(lm: Landmark[]): number {
  const s = dist(lm[WRIST], lm[MIDDLE_MCP]);
  return s > 1e-6 ? s : 1e-6;
}

export const EXERCISE_LABELS: Record<ExerciseType, string> = {
  FIST_CURL: "Fist Open / Close (grip)",
  FINGER_SPREAD: "Finger Spread (abduction)",
  THUMB_OPPOSITION: "Thumb Opposition",
};

export const EXERCISE_DESCRIPTIONS: Record<ExerciseType, string> = {
  FIST_CURL:
    "Start with fingers fully extended, curl all four fingers into a fist, then re-extend. Tracks grip range of motion.",
  FINGER_SPREAD:
    "Start with fingers together, spread them apart as wide as possible, then bring back together. Tracks finger abduction.",
  THUMB_OPPOSITION:
    "Touch the thumb tip to the pinky tip, then release back to a relaxed open hand. Tracks thumb opposition reach.",
};

/**
 * Computes a single scalar "how contracted is the hand" metric for the given
 * exercise type, from one frame of hand landmarks. Higher = more "open"/
 * extended; lower = more "closed"/contracted, by construction below.
 */
export function computeMetric(type: ExerciseType, lm: Landmark[]): number {
  const scale = handScale(lm);
  switch (type) {
    case "FIST_CURL": {
      const tips = [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP];
      const avg =
        tips.reduce((sum, i) => sum + dist(lm[i], lm[WRIST]), 0) / tips.length;
      return avg / scale;
    }
    case "FINGER_SPREAD": {
      const pairs: [number, number][] = [
        [INDEX_TIP, MIDDLE_TIP],
        [MIDDLE_TIP, RING_TIP],
        [RING_TIP, PINKY_TIP],
      ];
      const avg =
        pairs.reduce((sum, [a, b]) => sum + dist(lm[a], lm[b]), 0) / pairs.length;
      return avg / scale;
    }
    case "THUMB_OPPOSITION": {
      // Lower distance = thumb closer to pinky (more opposition); we invert
      // so the metric stays "higher = more open" like the other types.
      const d = dist(lm[THUMB_TIP], lm[PINKY_TIP]) / scale;
      return d;
    }
  }
}

export type Sample = { t: number; v: number };

export type Cycle = {
  startT: number;
  endT: number;
  minV: number;
  maxV: number;
  durationMs: number;
  jerk: number; // mean absolute jerk within the cycle (smoothness proxy)
};

/**
 * Mean absolute jerk (second derivative of the metric wrt time) over a
 * window of samples. Lower = smoother movement.
 */
function meanAbsJerk(samples: Sample[]): number {
  if (samples.length < 3) return 0;
  const velocities: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const dt = Math.max(1, samples[i].t - samples[i - 1].t);
    velocities.push((samples[i].v - samples[i - 1].v) / dt);
  }
  let sum = 0;
  let n = 0;
  for (let i = 1; i < velocities.length; i++) {
    const dt = Math.max(
      1,
      samples[i + 1].t - samples[i].t
    );
    sum += Math.abs((velocities[i] - velocities[i - 1]) / dt);
    n++;
  }
  return n > 0 ? sum / n : 0;
}

/**
 * Detects open<->close cycles in a recorded metric time series using a
 * two-threshold (hysteresis) state machine, so small jitter near the
 * midpoint doesn't register as spurious reps.
 *
 * `low`/`high` define the hysteresis band. When omitted, they're derived
 * from the series' own observed range (used during physician calibration,
 * where the therapeutic range isn't known yet). When scoring a patient
 * attempt, pass the physician-calibrated exercise thresholds instead so a
 * rep only counts if the patient actually reached therapeutic range.
 */
export function detectCycles(
  series: Sample[],
  opts?: { low?: number; high?: number }
): Cycle[] {
  if (series.length < 4) return [];

  let low = opts?.low;
  let high = opts?.high;
  if (low === undefined || high === undefined) {
    const values = series.map((s) => s.v);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    low = min + 0.3 * range;
    high = min + 0.7 * range;
  }

  const cycles: Cycle[] = [];
  // Start in "open" state (assume the patient begins at rest/extended).
  let state: "open" | "closed" = "open";
  let cycleStartIdx = 0;
  let troughIdx = 0;
  let peakIdx = 0;

  for (let i = 0; i < series.length; i++) {
    const v = series[i].v;
    if (state === "open" && v <= low!) {
      state = "closed";
      troughIdx = i;
    } else if (state === "closed" && v < series[troughIdx].v) {
      troughIdx = i;
    }

    if (state === "closed" && v >= high!) {
      // Completed one full open->closed->open cycle.
      const windowStart = series[cycleStartIdx];
      const windowEnd = series[i];
      peakIdx = i;
      const windowSamples = series.slice(cycleStartIdx, i + 1);
      const maxV = Math.max(series[cycleStartIdx].v, series[peakIdx].v);
      cycles.push({
        startT: windowStart.t,
        endT: windowEnd.t,
        minV: series[troughIdx].v,
        maxV,
        durationMs: windowEnd.t - windowStart.t,
        jerk: meanAbsJerk(windowSamples),
      });
      state = "open";
      cycleStartIdx = i;
    }
  }

  return cycles;
}

export type RepScore = {
  romScore: number;
  speedScore: number;
  smoothnessScore: number;
  cycle: Cycle;
};

export type CalibratedThresholds = {
  minValue: number;
  maxValue: number;
  avgRepMs: number;
  smoothness: number;
};

/** Derives exercise thresholds from a physician's demonstration recording. */
export function calibrateFromSeries(series: Sample[]): CalibratedThresholds | null {
  const cycles = detectCycles(series);
  if (cycles.length === 0) return null;
  const avg = (f: (c: Cycle) => number) =>
    cycles.reduce((s, c) => s + f(c), 0) / cycles.length;
  return {
    minValue: avg((c) => c.minV),
    maxValue: avg((c) => c.maxV),
    avgRepMs: avg((c) => c.durationMs),
    smoothness: avg((c) => c.jerk),
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/** Scores a patient's recorded attempt against the physician's calibrated thresholds. */
export function scoreAttempt(
  series: Sample[],
  thresholds: CalibratedThresholds,
  repsPrescribed: number
): {
  repsCompleted: number;
  romScore: number;
  speedScore: number;
  smoothnessScore: number;
  completionScore: number;
  overallScore: number;
  reps: RepScore[];
} {
  const range = Math.max(1e-6, thresholds.maxValue - thresholds.minValue);
  const lowThresh = thresholds.minValue + 0.25 * range;
  const highThresh = thresholds.maxValue - 0.25 * range;

  const cycles = detectCycles(series, { low: lowThresh, high: highThresh });
  const repsCompleted = cycles.length;

  const reps: RepScore[] = cycles.map((cycle) => {
    const rom = cycle.maxV - cycle.minV;
    const romScore = clamp((rom / range) * 100, 0, 100);
    const speedScore = clamp(
      100 - (Math.abs(cycle.durationMs - thresholds.avgRepMs) / thresholds.avgRepMs) * 100,
      0,
      100
    );
    const jerkBaseline = Math.max(1e-9, thresholds.smoothness);
    const smoothnessScore = clamp(
      100 - (Math.max(0, cycle.jerk - jerkBaseline) / jerkBaseline) * 100,
      0,
      100
    );
    return { romScore, speedScore, smoothnessScore, cycle };
  });

  const avg = (f: (r: RepScore) => number) =>
    reps.length > 0 ? reps.reduce((s, r) => s + f(r), 0) / reps.length : 0;

  const romScore = avg((r) => r.romScore);
  const speedScore = avg((r) => r.speedScore);
  const smoothnessScore = avg((r) => r.smoothnessScore);
  const completionScore = clamp((repsCompleted / repsPrescribed) * 100, 0, 100);

  const overallScore =
    0.4 * romScore + 0.3 * completionScore + 0.15 * speedScore + 0.15 * smoothnessScore;

  return { repsCompleted, romScore, speedScore, smoothnessScore, completionScore, overallScore, reps };
}
