/**
 * utils/rulesEngine.js
 *
 * Pure JavaScript compliance validation engine for the
 * Legal Metrology (Packaged Commodities) Rules, 2011 (PCR 2011).
 *
 * Validates scan JSON matching data/dummyScan.js and returns:
 *   - compliance score (0–100)
 *   - structured violations array citing exact PCR 2011 sub-rules
 *   - passed checks list & manual review flag
 */

// Standard SI metric units & permitted retail count units under PCR 2011 (Rule 12 & Second Schedule)
const VALID_SI_UNITS = new Set([
  // Weight / Mass
  "mg",
  "g",
  "kg",
  // Volume
  "ml",
  "l",
  // Length
  "mm",
  "cm",
  "m",
  // Area
  "cm2",
  "m2",
  "sq cm",
  "sq m",
  // Number / Count (for commodities sold by number)
  "n",
  "u",
  "no",
  "nos",
  "pcs",
  "piece",
  "pieces",
  "unit",
  "units",
  "pair",
  "pairs",
  "set",
  "sets",
  "tablet",
  "tablets",
  "capsule",
  "capsules",
  "pack",
]);

// Prohibited qualifier expressions near Net Quantity / MRP under Rule 11(1) & Rule 12(6)
const PROHIBITED_QUALIFIER_PATTERNS = [
  /\bapprox\.?\b/i,
  /\bapproximately\b/i,
  /\bwhen\s+packed\b/i,
  /\bnet\s+when\s+packed\b/i,
  /\bnot\s+less\s+than\b/i,
  /\bminimum\b/i,
  /\bmin\.?\b/i,
  /\bcirca\b/i,
];

/**
 * Validates a parsed label scan object against Legal Metrology (Packaged Commodities) Rules, 2011.
 *
 * @param {import('../services/geminiVision').ScanResult} scanData
 * @returns {{
 *   inspectionId: string,
 *   score: number,
 *   isCompliant: boolean,
 *   status: 'COMPLIANT' | 'MINOR_NON_COMPLIANCE' | 'NON_COMPLIANT' | 'CRITICAL_VIOLATION',
 *   requiresManualReview: boolean,
 *   totalChecks: number,
 *   passedChecks: number,
 *   violations: Array<{
 *     id: string,
 *     rule: string,
 *     title: string,
 *     severity: 'CRITICAL' | 'MAJOR' | 'MINOR',
 *     penalty: number,
 *     field: string,
 *     observedValue: string,
 *     expected: string,
 *     description: string
 *   }>,
 *   passedRules: Array<{
 *     rule: string,
 *     title: string,
 *     field: string
 *   }>,
 *   evaluatedAt: string
 * }}
 */
export function validateScan(scanData) {
  if (!scanData || typeof scanData !== "object") {
    throw new Error("Invalid scanData payload passed to validateScan().");
  }

  const violations = [];
  const passedRules = [];
  let totalChecks = 0;

  function recordPass(rule, title, field) {
    totalChecks += 1;
    passedRules.push({ rule, title, field });
  }

  function recordViolation({
    id,
    rule,
    title,
    severity,
    penalty,
    field,
    observedValue,
    expected,
    description,
  }) {
    totalChecks += 1;
    violations.push({
      id,
      rule,
      title,
      severity,
      penalty,
      field,
      observedValue:
        observedValue === null || observedValue === undefined || observedValue === ""
          ? "MISSING / NOT DETECTED"
          : String(observedValue),
      expected,
      description,
    });
  }

  // ── 1. Rule 6(1)(e): Maximum Retail Price (MRP) Numeric Presence ───────────
  const mrpNum = Number(scanData.mrp);
  if (
    scanData.mrp === null ||
    scanData.mrp === undefined ||
    Number.isNaN(mrpNum) ||
    mrpNum <= 0
  ) {
    recordViolation({
      id: "RULE_6_1_E_MRP_MISSING",
      rule: "Rule 6(1)(e)",
      title: "Missing or Invalid Maximum Retail Price (MRP)",
      severity: "CRITICAL",
      penalty: 20,
      field: "mrp",
      observedValue: scanData.mrp,
      expected: "Positive numeric Retail Sale Price (MRP in ₹)",
      description:
        "Every pre-packaged commodity must bear a clear, legible Maximum Retail Price on the Principal Display Panel.",
    });
  } else {
    recordPass("Rule 6(1)(e)", "Maximum Retail Price (MRP) Declared", "mrp");
  }

  // ── 2. Rule 6(1)(e): Mandatory 'Inclusive of all taxes' Declaration ─────────
  const taxText = String(scanData.mrpIncludesTaxesText || "").trim();
  const hasMrpKeyword = /\b(mrp|maximum\s+retail\s+price)\b/i.test(taxText);
  const hasTaxInclusion = /\bincl(usive|\.)?\s*(of\s*)?(all\s*)?tax(es)?\b/i.test(taxText);

  if (!taxText || !hasTaxInclusion) {
    recordViolation({
      id: "RULE_6_1_E_TAX_INCLUSION",
      rule: "Rule 6(1)(e)",
      title: "Missing 'Inclusive of all taxes' Declaration",
      severity: "MAJOR",
      penalty: 15,
      field: "mrpIncludesTaxesText",
      observedValue: taxText,
      expected: "MRP ₹XX.XX (Inclusive of all taxes)",
      description:
        "Rule 6(1)(e) requires the retail sale price to be declared in the form 'MRP ₹... Inclusive of all taxes' (or 'Incl. of all taxes').",
    });
  } else if (!hasMrpKeyword) {
    recordViolation({
      id: "RULE_6_1_E_MRP_PREFIX",
      rule: "Rule 6(1)(e)",
      title: "Missing 'MRP' Prefix Alongside Tax Declaration",
      severity: "MINOR",
      penalty: 5,
      field: "mrpIncludesTaxesText",
      observedValue: taxText,
      expected: "Explicit 'MRP' prefix with '(Incl. of all taxes)'",
      description:
        "Tax inclusion text is present, but the statutory 'MRP' prefix was not detected.",
    });
  } else {
    recordPass(
      "Rule 6(1)(e)",
      "MRP 'Inclusive of all taxes' Declaration Present",
      "mrpIncludesTaxesText"
    );
  }

  // ── 3. Rule 6(1)(c) & Rule 12: Net Quantity & Valid SI Metric Unit ─────────
  const netQty = Number(scanData.netQuantityValue);
  const rawUnit = String(scanData.netQuantityUnit || "").trim();
  const normalizedUnit = rawUnit.toLowerCase().replace(/\.$/, "");

  if (
    scanData.netQuantityValue === null ||
    scanData.netQuantityValue === undefined ||
    Number.isNaN(netQty) ||
    netQty <= 0
  ) {
    recordViolation({
      id: "RULE_6_1_C_NET_QTY_MISSING",
      rule: "Rule 6(1)(c)",
      title: "Missing or Invalid Net Quantity Value",
      severity: "CRITICAL",
      penalty: 15,
      field: "netQuantityValue",
      observedValue: scanData.netQuantityValue,
      expected: "Positive numeric net weight, volume, length, or count",
      description:
        "Net quantity in terms of standard weight, measure, or number must be prominently printed on the package.",
    });
  } else if (!normalizedUnit || !VALID_SI_UNITS.has(normalizedUnit)) {
    recordViolation({
      id: "RULE_12_INVALID_SI_UNIT",
      rule: "Rule 12(1) & Rule 13",
      title: "Non-Standard or Missing SI Metric Unit",
      severity: "MAJOR",
      penalty: 12,
      field: "netQuantityUnit",
      observedValue: rawUnit,
      expected: "Standard SI unit (g, kg, ml, L, cm, m) or permitted count (nos, pcs, units)",
      description:
        "Quantities must use standard metric SI symbols (e.g., g, kg, ml, L). Imperial units (oz, lb) or non-standard abbreviations violate Rule 13.",
    });
  } else {
    recordPass(
      "Rule 6(1)(c) & Rule 13",
      "Net Quantity & Standard SI Unit Verified",
      "netQuantityUnit"
    );
  }

  // ── 4. Rule 11(1) & Rule 12(6): Prohibited Qualifier Phrases ───────────────
  const visualAudit = scanData.visualAudit || {};
  const searchableFields = [
    scanData.productName,
    scanData.mrpIncludesTaxesText,
    scanData.netQuantityUnit,
  ]
    .filter(Boolean)
    .join(" ");

  const matchedQualifier = PROHIBITED_QUALIFIER_PATTERNS.find((regex) =>
    regex.test(searchableFields)
  );

  if (visualAudit.prohibitedQualifiersFound === true || matchedQualifier) {
    recordViolation({
      id: "RULE_11_1_PROHIBITED_QUALIFIER",
      rule: "Rule 11(1) & Rule 12(6)",
      title: "Prohibited Qualifier Phrase Detected",
      severity: "MAJOR",
      penalty: 10,
      field: "visualAudit.prohibitedQualifiersFound",
      observedValue: matchedQualifier
        ? `Matched "${matchedQualifier.source}"`
        : "Flagged by Visual Audit",
      expected: "Exact unambiguous declaration without 'approx.', 'when packed', or promotional qualifiers",
      description:
        "Words or expressions tending to create an impression of larger quantity or qualifying net weight (such as 'approx.' or 'when packed') are prohibited.",
    });
  } else {
    recordPass(
      "Rule 11(1) & Rule 12(6)",
      "No Prohibited Qualifier Phrases Found",
      "visualAudit.prohibitedQualifiersFound"
    );
  }

  // ── 5. Rule 6(1)(d): Month & Year of Manufacture / Packing / Import ────────
  const mfgDate = String(scanData.mfgOrPackDate || "").trim();
  const validDatePattern =
    /^(\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?|(0[1-9]|1[0-2])[\/\-]\d{2,4}|[A-Za-z]{3,9}[\s\-\/,]+\d{2,4})$/;

  if (!mfgDate || !validDatePattern.test(mfgDate)) {
    recordViolation({
      id: "RULE_6_1_D_MFG_DATE",
      rule: "Rule 6(1)(d)",
      title: "Missing or Invalid Month & Year of Manufacture/Packing",
      severity: "MAJOR",
      penalty: 15,
      field: "mfgOrPackDate",
      observedValue: mfgDate,
      expected: "Valid Month & Year (e.g., YYYY-MM or MM/YYYY)",
      description:
        "The month and year in which the commodity is manufactured, pre-packed, or imported must be clearly mentioned.",
    });
  } else {
    recordPass(
      "Rule 6(1)(d)",
      "Month & Year of Manufacture/Packing Declared",
      "mfgOrPackDate"
    );
  }

  // ── 6. Rule 6(1)(a) & Rule 10: Manufacturer / Packer / Importer Details ────
  const mfgName = String(scanData.manufacturerOrImporterName || "").trim();
  const mfgAddress = String(scanData.manufacturerAddress || "").trim();

  if (mfgName.length < 3 || mfgAddress.length < 12) {
    recordViolation({
      id: "RULE_6_1_A_MANUFACTURER_ADDRESS",
      rule: "Rule 6(1)(a) & Rule 10",
      title: "Incomplete Manufacturer / Packer / Importer Name or Address",
      severity: "MAJOR",
      penalty: 15,
      field: "manufacturerAddress",
      observedValue: `${mfgName || "No Name"} | ${mfgAddress || "No Address"}`,
      expected: "Full legal name and complete postal address (street/area, city, state, PIN)",
      description:
        "Rule 10 requires the complete postal address where the factory/establishment is situated so a consumer or officer can identify and locate the manufacturer/importer.",
    });
  } else {
    recordPass(
      "Rule 6(1)(a) & Rule 10",
      "Manufacturer/Importer Legal Name & Address Verified",
      "manufacturerAddress"
    );
  }

  // ── 7. Rule 6(1)(aa): Country of Origin ────────────────────────────────────
  const origin = String(scanData.countryOfOrigin || "").trim();
  if (origin.length < 2) {
    recordViolation({
      id: "RULE_6_1_AA_COUNTRY_OF_ORIGIN",
      rule: "Rule 6(1)(aa)",
      title: "Missing Country of Origin Declaration",
      severity: "MINOR",
      penalty: 5,
      field: "countryOfOrigin",
      observedValue: origin,
      expected: "Explicit Country of Origin (e.g., 'India')",
      description:
        "Country of origin or manufacture must be declared on imported packages and digital/retail listings.",
    });
  } else {
    recordPass("Rule 6(1)(aa)", "Country of Origin Declared", "countryOfOrigin");
  }

  // ── 8. Rule 6(2): Consumer Care Details ────────────────────────────────────
  const careDetails = String(scanData.consumerCareDetails || "").trim();
  const hasPhoneOrEmail =
    /(\+?\d[\d\s\-()]{6,}\d)/.test(careDetails) ||
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(careDetails);

  if (!careDetails || !hasPhoneOrEmail) {
    recordViolation({
      id: "RULE_6_2_CONSUMER_CARE",
      rule: "Rule 6(2)",
      title: "Missing or Incomplete Consumer Care Details",
      severity: "MAJOR",
      penalty: 10,
      field: "consumerCareDetails",
      observedValue: careDetails,
      expected: "Consumer Care telephone/toll-free number and/or email address",
      description:
        "Every package must bear the name, address, telephone number, and email address (if available) of the person/office for consumer complaints.",
    });
  } else {
    recordPass(
      "Rule 6(2)",
      "Consumer Care Helpline / Email Declared",
      "consumerCareDetails"
    );
  }

  // ── 9. Rule 18(7) & Rule 6(1)(e) Proviso: Sticker Tampering / Overlapping ──
  if (visualAudit.overlappingStickerDetected === true) {
    recordViolation({
      id: "RULE_18_7_STICKER_TAMPERING",
      rule: "Rule 18(7) & Rule 6(1)(e)",
      title: "Unauthorized Overlapping Price Sticker / Label Tampering",
      severity: "CRITICAL",
      penalty: 25,
      field: "visualAudit.overlappingStickerDetected",
      observedValue: "Overlapping sticker detected on mandatory declaration",
      expected: "Original factory-printed MRP with zero overlapping/altering stickers",
      description:
        "Affixing individual stickers over printed MRP or mandatory declarations to alter or obscure statutory information is strictly prohibited under PCR 2011.",
    });
  } else {
    recordPass(
      "Rule 18(7)",
      "No Overlapping Sticker or Tampering Detected",
      "visualAudit.overlappingStickerDetected"
    );
  }

  // ── 10. Rule 7 & Rule 9(1): Typography, Contrast & Legibility ──────────────
  if (visualAudit.lowContrastOrIllegible === true) {
    recordViolation({
      id: "RULE_9_1_ILLEGIBLE_TEXT",
      rule: "Rule 9(1)(a) & Rule 7",
      title: "Poor Contrast or Below-Minimum Numeral/Font Legibility",
      severity: "MAJOR",
      penalty: 10,
      field: "visualAudit.lowContrastOrIllegible",
      observedValue: "Low contrast or illegible declaration text",
      expected: "Conspicuous, contrasting print meeting minimum 1mm/2mm numeral height rules",
      description:
        "Mandatory declarations must be legible, prominent, and in a colour that contrasts conspicuously with the background.",
    });
  } else {
    recordPass(
      "Rule 9(1)(a) & Rule 7",
      "Print Legibility & Background Contrast Acceptable",
      "visualAudit.lowContrastOrIllegible"
    );
  }

  // ── Score & Status Computation ─────────────────────────────────────────────
  const totalPenalty = violations.reduce((sum, item) => sum + item.penalty, 0);
  const score = Math.max(0, Math.min(100, 100 - totalPenalty));
  const isCompliant = violations.length === 0;

  const hasCritical = violations.some((v) => v.severity === "CRITICAL");
  let status = "COMPLIANT";
  if (!isCompliant) {
    if (hasCritical || score < 60) {
      status = "CRITICAL_VIOLATION";
    } else if (score < 85) {
      status = "NON_COMPLIANT";
    } else {
      status = "MINOR_NON_COMPLIANCE";
    }
  }

  const confidence =
    typeof visualAudit.confidenceScore === "number" ? visualAudit.confidenceScore : 1;
  const requiresManualReview = confidence < 0.7;

  return {
    inspectionId: scanData.inspectionId || "UNASSIGNED",
    score,
    isCompliant,
    status,
    requiresManualReview,
    totalChecks,
    passedChecks: passedRules.length,
    violations,
    passedRules,
    evaluatedAt: new Date().toISOString(),
  };
}

export default {
  validateScan,
};