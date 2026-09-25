"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

let sharedLandmarkerPromise: Promise<HandLandmarker> | null = null;

function getLandmarker(): Promise<HandLandmarker> {
  if (!sharedLandmarkerPromise) {
    sharedLandmarkerPromise = FilesetResolver.forVisionTasks(WASM_URL).then(
      (fileset) =>
        HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 1,
        })
    );
  }
  return sharedLandmarkerPromise;
}

export type HandTrackingStatus =
  | "idle"
  | "loading-model"
  | "requesting-camera"
  | "running"
  | "no-hand"
  | "error";

export function useHandTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onFrame: (result: HandLandmarkerResult, timestampMs: number) => void
) {
  const [status, setStatus] = useState<HandTrackingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onFrameRef = useRef(onFrame);
  useEffect(() => {
    onFrameRef.current = onFrame;
  });

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      setStatus("loading-model");
      const landmarker = await getLandmarker();

      setStatus("requesting-camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error("Video element not ready");
      video.srcObject = stream;
      await video.play();

      setStatus("running");

      const loop = () => {
        if (!videoRef.current) return;
        const v = videoRef.current;
        if (v.readyState >= 2) {
          const timestampMs = performance.now();
          const result = landmarker.detectForVideo(v, timestampMs);
          setStatus(result.landmarks.length > 0 ? "running" : "no-hand");
          onFrameRef.current(result, timestampMs);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start hand tracking");
      setStatus("error");
    }
  }, [videoRef]);

  useEffect(() => stop, [stop]);

  return { start, stop, status, error };
}
