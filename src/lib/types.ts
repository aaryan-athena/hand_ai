export type ExerciseType = "FIST_CURL" | "FINGER_SPREAD" | "THUMB_OPPOSITION";

export type Physician = {
  id: string;
  name: string;
  createdAt: string;
};

export type Patient = {
  id: string;
  name: string;
  condition: string | null;
  physicianId: string | null;
  createdAt: string;
};

export type Exercise = {
  id: string;
  name: string;
  type: ExerciseType;
  description: string | null;
  physicianId: string;
  repetitions: number;
  hand: string;
  minValue: number;
  maxValue: number;
  avgRepMs: number;
  smoothness: number;
  calibratedAt: string | null;
  createdAt: string;
};

export type PatientExercise = {
  id: string;
  patientId: string;
  exerciseId: string;
  repetitions: number;
  active: boolean;
  assignedAt: string;
  notes: string | null;
  exercise: Exercise;
};

export type Attempt = {
  id: string;
  patientId: string;
  exerciseId: string;
  createdAt: string;
  repsPrescribed: number;
  repsCompleted: number;
  romScore: number;
  speedScore: number;
  smoothnessScore: number;
  completionScore: number;
  overallScore: number;
  repDetails: string;
  exercise?: Exercise;
};

export type PatientDetail = Patient & {
  physician: Physician | null;
  assignments: PatientExercise[];
  attempts: Attempt[];
};
