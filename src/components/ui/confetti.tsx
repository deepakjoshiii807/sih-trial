import confetti from "canvas-confetti";

/** True when the user has asked for reduced motion — we then skip confetti. */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Small celebratory burst (used for skill adds, interview completion, onboarding). */
export function celebrate(opts?: { originY?: number; particleCount?: number }) {
  if (prefersReducedMotion()) return;
  const originY = opts?.originY ?? 0.65;
  const particleCount = opts?.particleCount ?? 80;

  try {
    confetti({
      particleCount,
      spread: 75,
      startVelocity: 32,
      origin: { x: 0.5, y: originY },
      colors: ["#244B35", "#E8D36B", "#C98B5F", "#8A6FB8", "#DCE6D0"],
      disableForReducedMotion: true,
    });
    setTimeout(() => {
      confetti({
        particleCount: Math.round(particleCount * 0.45),
        spread: 100,
        startVelocity: 24,
        scalar: 0.9,
        origin: { x: 0.25, y: originY + 0.08 },
        colors: ["#244B35", "#E8D36B", "#C98B5F"],
        disableForReducedMotion: true,
      });
    }, 180);
  } catch { /* never let a celebration break the flow */ }
}