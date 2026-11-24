/**
 * services/geminiVision.js
 *
 * Calls the Google Gemini 2.5 Flash REST API to analyse a packaged-commodity
 * label image and return a structured JSON result matching the schema defined
 * in data/dummyScan.js.
 *
 * API key is read from EXPO_PUBLIC_GEMINI_API_KEY (set in .env, never committed).
 *
 * Dependencies: native fetch (available in React Native / Expo Go).
 *
 * Usage:
 *   import { analyzePackageImage } from '../services/geminiVision';
 *   const result = await analyzePackageImage(base64Image);
 */

// ── Constants ───────────────────────────────────────────────────────────────

const MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

/** HTTP status codes (and error keywords) that warrant trying the next model. */
const FALLBACK_STATUSES = new Set([503, 429, 404]);

/**
 * Structured prompt that instructs Gemini to act as a Legal Metrology
 * field inspector and return ONLY valid JSON — no markdown fences.
 *
 * The required JSON schema mirrors DUMMY_SCAN_RESULT in data/dummyScan.js.
 */
const SYSTEM_PROMPT = `You are an expert Legal Metrology field inspector trained on the
Packaged Commodities Rules (PCR) 2011 and Legal Metrology (Packaged Commodities)
Amendment Rules, 2017.

Analyse the provided packaged-commodity label image and extract every mandatory
declaration. Additionally, perform a visual compliance audit for common violations.

Return ONLY a valid JSON object (no markdown, no explanation) with EXACTLY these fields:

{
  "inspectionId": "auto-generated UUID string",
  "productName": "full product name as printed",
  "brand": "brand or trade name",
  "category": "commodity category under PCR 2011",
  "mrp": <number — MRP in INR, numeric only>,
  "mrpIncludesTaxesText": "exact MRP declaration text from label",
  "unitSalePrice": <number — price per standard SI unit, e.g. ₹ per 100 ml>,
  "netQuantityValue": <number>,
  "netQuantityUnit": "ml | g | kg | l | units",
  "mfgOrPackDate": "YYYY-MM or YYYY-MM-DD",
  "manufacturerOrImporterName": "full legal name",
  "manufacturerAddress": "complete address as printed",
  "countryOfOrigin": "country name",
  "consumerCareDetails": "helpline number and/or email",
  "visualAudit": {
    "overlappingStickerDetected": <boolean>,
    "lowContrastOrIllegible": <boolean>,
    "prohibitedQualifiersFound": <boolean>,
    "confidenceScore": <number 0.0–1.0>
  },
  "evidence": null
}

Rules:
- Use null for any field genuinely missing from the label (do not guess).
- "evidence" is ALWAYS null — it is populated by the app after Gemini responds.
- "inspectionId" should follow the pattern "INSP-YYYYMMDD-NNN".
- Confidence score < 0.7 means the image quality is poor; flag accordingly.`;

// ── Main exported function ───────────────────────────────────────────────────

/**
 * Sends a base64-encoded product image to Gemini 2.5 Flash for analysis.
 *
 * @param {string} base64Image - Raw base64 string of the image (no data-URI prefix).
 * @param {"image/jpeg" | "image/png" | "image/webp"} [mimeType="image/jpeg"]
 *   MIME type of the encoded image.
 *
 * @returns {Promise<object>} Parsed JSON result matching the dummyScan schema,
 *   with `evidence` field set to null (caller must populate via captureEvidence).
 *
 * @throws {Error} If the API key is missing, the network request fails,
 *   the API returns a non-200 status, or the response body is not valid JSON.
 */
export async function analyzePackageImage(base64Image, mimeType = "image/jpeg") {
  // ── 1. Validate API key ────────────────────────────────────────────────────
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_key_here" || apiKey.trim() === "") {
    throw new Error(
      "[MetrologyLens] EXPO_PUBLIC_GEMINI_API_KEY is not set. " +
        "Copy .env.example to .env and add your Gemini API key."
    );
  }

  // ── 2. Build the Gemini REST request body ──────────────────────────────────
  // Using the generateContent endpoint with:
  //   • A system instruction for role + output format
  //   • An inlineData part carrying the image bytes
  //   • responseMimeType: "application/json" for guaranteed JSON output
  //   • temperature: 0.1 for deterministic, fact-grounded extraction
  const requestBody = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image,
            },
          },
          {
            text: "Analyse this packaged commodity label and return the JSON as instructed.",
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  };

  // ── 3. Try each model in order, falling back on 503 / 429 / 404 ───────────
  let response;
  let lastError;

  for (const model of MODELS) {
    const endpoint = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;

    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
    } catch (networkError) {
      throw new Error(
        `[MetrologyLens] Network request to Gemini failed: ${networkError.message}`
      );
    }

    // ── 4. Check for retryable HTTP errors ──────────────────────────────────
    if (FALLBACK_STATUSES.has(response.status)) {
      let hint = "";
      try {
        const errBody = await response.json();
        hint = errBody?.error?.message ?? "";
      } catch (_) {
        hint = await response.text().catch(() => "");
      }
      console.warn(
        `[MetrologyLens] Model "${model}" returned ${response.status}${hint ? ` (${hint.slice(0, 120)})` : ""}. Trying next model…`
      );
      lastError = new Error(
        `[MetrologyLens] Gemini API error ${response.status} on model "${model}": ${hint}`
      );
      response = null;
      continue; // try the next model
    }

    // Non-retryable HTTP error — surface immediately
    if (!response.ok) {
      let errorDetails = "";
      try {
        const errBody = await response.json();
        errorDetails = errBody?.error?.message ?? JSON.stringify(errBody);
      } catch (_) {
        errorDetails = await response.text().catch(() => "");
      }
      throw new Error(
        `[MetrologyLens] Gemini API error ${response.status}: ${errorDetails}`
      );
    }

    // Successful response — break out of the loop
    break;
  }

  if (!response) {
    throw lastError ?? new Error("[MetrologyLens] All Gemini models failed to respond.");
  }

  // ── 5. Parse the response ──────────────────────────────────────────────────
  let responseJson;
  try {
    responseJson = await response.json();
  } catch (parseError) {
    throw new Error(
      `[MetrologyLens] Failed to parse Gemini API response: ${parseError.message}`
    );
  }

  // Extract the text content from the first candidate
  const rawText =
    responseJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!rawText) {
    throw new Error(
      "[MetrologyLens] Gemini returned an empty response. " +
        "The image may be unreadable or the model was blocked."
    );
  }

  // ── 6. Parse the JSON payload returned by the model ───────────────────────
  // With responseMimeType: "application/json" the text should already be
  // clean JSON, but we strip accidental markdown fences defensively.
  const cleanedText = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let scanResult;
  try {
    scanResult = JSON.parse(cleanedText);
  } catch (jsonError) {
    throw new Error(
      `[MetrologyLens] Gemini response was not valid JSON: ${jsonError.message}\n` +
        `Raw response: ${cleanedText.slice(0, 300)}`
    );
  }

  // evidence is always null from the model; the caller merges it from captureEvidence.
  scanResult.evidence = null;

  return scanResult;
}
