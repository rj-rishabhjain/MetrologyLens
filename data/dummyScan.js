/**
 * data/dummyScan.js
 *
 * Realistic dummy scan result used during development and
 * as the definitive JSON schema reference for Gemini Vision responses.
 *
 * All field names MUST match the Gemini prompt schema in services/geminiVision.js.
 */

/** @type {import('../services/geminiVision').ScanResult} */
export const DUMMY_SCAN_RESULT = {
  // ── Identification ────────────────────────────────────────────────────────
  /** Unique identifier generated per inspection session */
  inspectionId: "INSP-20261124-001",

  // ── Product Details ───────────────────────────────────────────────────────
  /** Full product name as printed on the label */
  productName: "Premium Refined Sunflower Oil",
  /** Brand / trade name */
  brand: "SunPure",
  /** Legal Metrology commodity category */
  category: "Edible Oils",

  // ── Pricing ───────────────────────────────────────────────────────────────
  /** Maximum Retail Price in Indian Rupees (numeric, no currency symbol) */
  mrp: 250.0,
  /** Mandatory declaration text verifying taxes are included */
  mrpIncludesTaxesText: "MRP (Incl. of all taxes) ₹250.00",
  /** Unit sale price computed for comparison (₹ per 100 ml) */
  unitSalePrice: 25.0,

  // ── Net Quantity ──────────────────────────────────────────────────────────
  /** Declared net quantity (numeric) */
  netQuantityValue: 1000,
  /** SI unit for net quantity, e.g. "ml", "g", "kg", "l" */
  netQuantityUnit: "ml",

  // ── Dates ─────────────────────────────────────────────────────────────────
  /** Manufacturing / packing date in ISO 8601 format (YYYY-MM) or (YYYY-MM-DD) */
  mfgOrPackDate: "2026-09",

  // ── Manufacturer / Importer ───────────────────────────────────────────────
  /** Full legal name of manufacturer or importer */
  manufacturerOrImporterName: "SunPure Agro Industries Pvt. Ltd.",
  /** Complete registered address */
  manufacturerAddress:
    "Survey No. 142, Industrial Area, Nashik Road, Nashik — 422101, Maharashtra, India",
  /** Country of origin as printed on label */
  countryOfOrigin: "India",

  // ── Consumer Care ─────────────────────────────────────────────────────────
  /** Toll-free / consumer helpline details as found on label */
  consumerCareDetails: "1800-123-4567 | care@sunpure.in",

  // ── Visual Audit (AI-detected flags) ─────────────────────────────────────
  /**
   * Results from the AI visual compliance audit.
   * These flags correspond to violations under PCR 2011 / LM(POMM) Rules 2011.
   */
  visualAudit: {
    /** True if a sticker is overlapping mandatory declarations */
    overlappingStickerDetected: false,
    /** True if text contrast or font size fails readability standards */
    lowContrastOrIllegible: false,
    /**
     * True if prohibited qualifiers like "Best", "Fresh", "Superior" are
     * found near the MRP or net quantity declaration
     */
    prohibitedQualifiersFound: false,
    /**
     * AI confidence score (0.0 – 1.0) for the overall visual audit.
     * Values below 0.7 should trigger a manual review flag.
     */
    confidenceScore: 0.95,
  },

  // ── Cryptographic Evidence ────────────────────────────────────────────────
  /**
   * Tamper-evident metadata captured at inspection time by utils/evidence.js.
   * Provides chain-of-custody proof for field inspectors.
   */
  evidence: {
    /** GPS latitude at time of scan (null if permission denied) */
    latitude: 19.998508,
    /** GPS longitude at time of scan (null if permission denied) */
    longitude: 73.790246,
    /** ISO 8601 UTC timestamp of the scan */
    timestamp: "2026-11-24T07:34:12.000Z",
    /**
     * SHA-256 hash of the base64-encoded image bytes.
     * Computed by expo-crypto; binds the evidence to the exact image.
     */
    sha256Hash:
      "a3f5e2c9b1d847603e4f8a2c5b7d9e1f3a4c6e8b0d2f4a6c8e0b2d4f6a8c0e2",
  },
};
