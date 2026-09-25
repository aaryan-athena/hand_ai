import type { Landmark } from "./handMetrics";

// Pairs of landmark indices to connect for a skeleton overlay.
export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17], // palm base
];

export function drawHandOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
  color = "#22d3ee"
) {
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  for (const [a, b] of HAND_CONNECTIONS) {
    const p1 = landmarks[a];
    const p2 = landmarks[b];
    ctx.beginPath();
    ctx.moveTo(p1.x * width, p1.y * height);
    ctx.lineTo(p2.x * width, p2.y * height);
    ctx.stroke();
  }
  ctx.fillStyle = "#f97316";
  for (const p of landmarks) {
    ctx.beginPath();
    ctx.arc(p.x * width, p.y * height, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
