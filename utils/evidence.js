/**
 * utils/evidence.js
 *
 * Captures tamper-evident metadata for a field inspection:
 *   - SHA-256 hash of the scanned image (binds hash to exact bytes)
 *   - GPS coordinates from expo-location
 *   - UTC timestamp
 *
 * Dependencies (already in package.json):
 *   - expo-crypto   ~58.0.8
 *   - expo-location ~58.0.22
 *
 * Usage:
 *   import { captureEvidence } from '../utils/evidence';
 *   const evidence = await captureEvidence(base64Image);
 */

import * as Crypto from "expo-crypto";
import * as Location from "expo-location";

/**
 * Generates SHA-256 hash + GPS coordinates for a scanned image.
 *
 * @param {string} base64Image - Base64-encoded image string (WITHOUT the
 *   data-URI prefix, i.e. the raw base64 bytes, not "data:image/jpeg;base64,...").
 *
 * @returns {Promise<{
 *   latitude:  number | null,
 *   longitude: number | null,
 *   timestamp: string,
 *   sha256Hash: string
 * }>} Evidence object ready to embed in the scan result.
 */
export async function captureEvidence(base64Image) {
  // ── 1. Timestamp ───────────────────────────────────────────────────────────
  // Captured before async work so it reflects when the button was pressed,
  // not when permissions resolved.
  const timestamp = new Date().toISOString();

  // ── 2. SHA-256 hash of the raw image bytes ─────────────────────────────────
  // expo-crypto v58: digestStringAsync hashes a UTF-8 string.
  // We hash the base64 representation — deterministic and consistent across
  // platforms without binary Buffer support.
  const sha256Hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    base64Image
  );

  // ── 3. GPS coordinates ─────────────────────────────────────────────────────
  // Wrapped in try/catch so a permission denial never crashes the scan flow.
  // Inspectors on devices without GPS (emulators, tablets) still get a result.
  let latitude = null;
  let longitude = null;

  try {
    // Request foreground permission; if already granted this resolves instantly.
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status === "granted") {
      // `accuracy: Balanced` gives ~100 m accuracy with fast response —
      // sufficient for field-inspection locality records.
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      latitude = location.coords.latitude;
      longitude = location.coords.longitude;
    } else {
      console.warn(
        "[MetrologyLens] Location permission denied — GPS omitted from evidence."
      );
    }
  } catch (locationError) {
    // GPS hardware unavailable or timeout — degrade gracefully.
    console.warn(
      "[MetrologyLens] Could not obtain GPS coordinates:",
      locationError.message
    );
  }

  return {
    latitude,
    longitude,
    timestamp,
    sha256Hash,
  };
}
