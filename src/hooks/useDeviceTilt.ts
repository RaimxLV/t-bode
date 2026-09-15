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
 * Drives two motion values from device tilt (gyroscope / accelerometer)
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
    // Only touch devices: skip anything with a precise pointer (mouse)
    if (window.matchMedia("(pointer: fine)").matches) return;

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
      // ~18 degrees of tilt reaches full amplitude
      x.set(clamp(((gamma - baseGamma) / 18) * amplitudeX, amplitudeX));
      y.set(clamp(((beta - baseBeta) / 18) * amplitudeY, amplitudeY));
    };

    const handleMotion = (event: DeviceMotionEvent) => {
      const g = event.accelerationIncludingGravity;
      if (!g || g.x === null || g.y === null) return;
      if (!sensorActive) {
        sensorActive = true;
        stopDrift();
      }
      x.set(clamp((-(g.x ?? 0) / 4) * amplitudeX, amplitudeX));
      y.set(clamp((((g.y ?? 0) - 9.8) / 4) * amplitudeY, amplitudeY));
    };

    const attach = () => {
      if (disposed) return;
      window.addEventListener("deviceorientation", handleOrientation, true);
      window.addEventListener("devicemotion", handleMotion, true);
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

    const requestPermission = (
      DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      }
    )?.requestPermission;

    let gestureHandler: (() => void) | undefined;

    if (typeof requestPermission === "function") {
      // iOS 13+: permission must be requested from a user gesture
      gestureHandler = () => {
        requestPermission()
          .then((state) => {
            if (state === "granted") attach();
          })
          .catch(() => undefined);
      };
      window.addEventListener("touchend", gestureHandler, { once: true });
      window.addEventListener("click", gestureHandler, { once: true });
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
      window.removeEventListener("devicemotion", handleMotion, true);
      if (gestureHandler) {
        window.removeEventListener("touchend", gestureHandler);
        window.removeEventListener("click", gestureHandler);
      }
      x.set(0);
      y.set(0);
    };
  }, [x, y, amplitudeX, amplitudeY, enabled, autoDrift]);
};
