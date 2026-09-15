import { useEffect } from "react";
import type { MotionValue } from "framer-motion";

type Options = {
  /** Max horizontal offset in px */
  amplitudeX?: number;
  /** Max vertical offset in px */
  amplitudeY?: number;
  enabled?: boolean;
  /** Gentle automatic drift when no motion sensor is available */
  autoDrift?: boolean;
};

/**
 * Drives two motion values from device orientation
 * so the parallax hero feels three-dimensional on phones and tablets.
 *
 * Sensors can be unavailable for several reasons (iOS permission not granted,
 * embedded in an iframe without the `gyroscope` permission, no sensor at all).
 * In that case we fall back to a slow ambient drift so depth is still visible.
 */
export const useDeviceTilt = (
  x: MotionValue<number>,
  y: MotionValue<number>,
  {
    amplitudeX = 26,
    amplitudeY = 16,
    enabled = true,
    autoDrift = true,
  }: Options = {}
) => {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    // Keep desktop pointer handling separate, but do not reject hybrid phones.
    if (navigator.maxTouchPoints === 0 && window.innerWidth >= 1024) return;

    let disposed = false;
    let sensorActive = false;
    let baseGamma: number | null = null;
    let baseBeta: number | null = null;
    let driftFrame = 0;

    const clamp = (value: number, limit: number) =>
      Math.max(-limit, Math.min(limit, value));

    const stopDrift = () => {
      if (driftFrame) {
        cancelAnimationFrame(driftFrame);
        driftFrame = 0;
      }
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const { gamma, beta } = event;
      if (gamma === null || beta === null) return;
      if (!sensorActive) {
        sensorActive = true;
        stopDrift();
      }
      if (baseGamma === null || baseBeta === null) {
        baseGamma = gamma;
        baseBeta = beta;
        return;
      }
      // Compensate for portrait/landscape so layers follow the physical tilt.
      const angle = window.screen.orientation?.angle ?? 0;
      const deltaGamma = gamma - baseGamma;
      const deltaBeta = beta - baseBeta;
      const landscape = Math.abs(angle) === 90;
      const horizontal = landscape ? deltaBeta * Math.sign(angle || 1) : deltaGamma;
      const vertical = landscape ? -deltaGamma * Math.sign(angle || 1) : deltaBeta;

      // About 14 degrees reaches full travel: visible without becoming jumpy.
      x.set(clamp((horizontal / 14) * amplitudeX, amplitudeX));
      y.set(clamp((vertical / 14) * amplitudeY, amplitudeY));
    };

    const attach = () => {
      if (disposed) return;
      window.addEventListener("deviceorientation", handleOrientation, true);
    };

    const startDrift = () => {
      if (disposed || sensorActive || !autoDrift) return;
      const start = performance.now();
      const loop = (now: number) => {
        if (disposed || sensorActive) return;
        const t = (now - start) / 1000;
        x.set(Math.sin(t * 0.32) * amplitudeX * 0.55);
        y.set(Math.sin(t * 0.21 + 1.2) * amplitudeY * 0.5);
        driftFrame = requestAnimationFrame(loop);
      };
      driftFrame = requestAnimationFrame(loop);
    };

    const orientationPermission = (
      DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      }
    )?.requestPermission;
    const motionPermission = (
      DeviceMotionEvent as unknown as {
        requestPermission?: () => Promise<string>;
      }
    )?.requestPermission;

    let gestureHandler: (() => void) | undefined;

    if (typeof orientationPermission === "function" || typeof motionPermission === "function") {
      // iOS 13+: permission must be requested from a user gesture
      gestureHandler = () => {
        Promise.all([
          typeof orientationPermission === "function" ? orientationPermission() : Promise.resolve("granted"),
          typeof motionPermission === "function" ? motionPermission() : Promise.resolve("granted"),
        ])
          .then((states) => {
            if (states.every((state) => state === "granted")) attach();
          })
          .catch(() => undefined);
      };
      window.addEventListener("pointerup", gestureHandler, { once: true });
    } else if ("DeviceOrientationEvent" in window || "DeviceMotionEvent" in window) {
      attach();
    }

    // If no sensor data arrives, fall back to ambient drift
    const driftTimer = window.setTimeout(startDrift, 2200);

    return () => {
      disposed = true;
      stopDrift();
      window.clearTimeout(driftTimer);
      window.removeEventListener("deviceorientation", handleOrientation, true);
      if (gestureHandler) {
        window.removeEventListener("pointerup", gestureHandler);
      }
      x.set(0);
      y.set(0);
    };
  }, [x, y, amplitudeX, amplitudeY, enabled, autoDrift]);
};
