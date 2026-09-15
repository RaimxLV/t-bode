import { useEffect } from "react";
import type { MotionValue } from "framer-motion";

type Options = {
  /** Max horizontal offset in px */
  amplitudeX?: number;
  /** Max vertical offset in px */
  amplitudeY?: number;
  enabled?: boolean;
};

/**
 * Drives two motion values from device tilt (gyroscope / accelerometer)
 * so the parallax hero feels three-dimensional on phones and tablets.
 * Falls back silently when the sensor or permission is unavailable.
 */
export const useDeviceTilt = (
  x: MotionValue<number>,
  y: MotionValue<number>,
  { amplitudeX = 26, amplitudeY = 16, enabled = true }: Options = {}
) => {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;
    // Only phones/tablets: skip devices with a precise pointer (mouse)
    if (window.matchMedia("(pointer: fine)").matches) return;

    let removed = false;
    let baseGamma: number | null = null;
    let baseBeta: number | null = null;

    const clamp = (value: number, limit: number) =>
      Math.max(-limit, Math.min(limit, value));

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma; // left/right tilt, -90..90
      const beta = event.beta; // front/back tilt, -180..180
      if (gamma === null || beta === null) return;
      if (baseGamma === null || baseBeta === null) {
        baseGamma = gamma;
        baseBeta = beta;
        return;
      }
      // 18 degrees of tilt reaches full amplitude
      x.set(clamp(((gamma - baseGamma) / 18) * amplitudeX, amplitudeX));
      y.set(clamp(((beta - baseBeta) / 18) * amplitudeY, amplitudeY));
    };

    const attach = () => {
      if (removed) return;
      window.addEventListener("deviceorientation", handleOrientation, true);
    };

    const RequestablePermission = (DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<PermissionState | "granted" | "denied">;
    }).requestPermission;

    let gestureHandler: (() => void) | undefined;

    if (typeof RequestablePermission === "function") {
      // iOS 13+: permission must be requested from a user gesture
      gestureHandler = () => {
        RequestablePermission()
          .then((state) => {
            if (state === "granted") attach();
          })
          .catch(() => undefined);
        if (gestureHandler) {
          window.removeEventListener("touchend", gestureHandler);
          window.removeEventListener("click", gestureHandler);
        }
      };
      window.addEventListener("touchend", gestureHandler, { once: true });
      window.addEventListener("click", gestureHandler, { once: true });
    } else {
      attach();
    }

    return () => {
      removed = true;
      window.removeEventListener("deviceorientation", handleOrientation, true);
      if (gestureHandler) {
        window.removeEventListener("touchend", gestureHandler);
        window.removeEventListener("click", gestureHandler);
      }
      x.set(0);
      y.set(0);
    };
  }, [x, y, amplitudeX, amplitudeY, enabled]);
};
