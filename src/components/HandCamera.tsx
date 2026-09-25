"use client";

import { useEffect, useRef } from "react";
import { useHandTracking } from "@/hooks/useHandTracking";
import { computeMetric, type ExerciseType, type Landmark } from "@/lib/handMetrics";
import { drawHandOverlay } from "@/lib/drawHand";

type Props = {
  exerciseType: ExerciseType;
  active: boolean;
  onMetric: (value: number, timestampMs: number, landmarks: Landmark[]) => void;
  overlayColor?: string;
};

export default function HandCamera({ exerciseType, active, onMetric, overlayColor }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onMetricRef = useRef(onMetric);
  useEffect(() => {
    onMetricRef.current = onMetric;
  });

  const { start, stop, status, error } = useHandTracking(videoRef, (result, ts) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (canvas && video) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (result.landmarks.length > 0) {
          drawHandOverlay(ctx, result.landmarks[0] as Landmark[], canvas.width, canvas.height, overlayColor);
        }
      }
    }
    if (result.landmarks.length > 0) {
      const lm = result.landmarks[0] as Landmark[];
      const value = computeMetric(exerciseType, lm);
      onMetricRef.current(value, ts, lm);
    }
  });

  useEffect(() => {
    if (active) start();
    else stop();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const statusLabel: Record<string, string> = {
    idle: "Camera off",
    "loading-model": "Loading AI model…",
    "requesting-camera": "Requesting webcam access…",
    running: "Tracking hand",
    "no-hand": "No hand detected — show your hand to the camera",
    error: "Error",
  };

  return (
    <div className="relative w-full max-w-xl aspect-[4/3] bg-black rounded-lg overflow-hidden border border-white/10">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover -scale-x-100" playsInline muted />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full -scale-x-100" />
      <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 text-xs text-white">
        {error ? `Error: ${error}` : statusLabel[status]}
      </div>
    </div>
  );
}
