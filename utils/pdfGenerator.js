/**
 * utils/pdfGenerator.js
 *
 * Generates an official-style Legal Metrology (Packaged Commodities) Rules, 2011
 * Inspection Memo PDF from a scan result, validation report, and evidence metadata,
 * then triggers the native OS share/save sheet.
 *
 * Dependencies (already in package.json):
 *   - expo-print
 *   - expo-sharing
 *   - expo-file-system
 */

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { validateScan } from "./rulesEngine";

/**
 * Escapes HTML special characters to prevent broken markup from OCR strings.
 */
function escapeHtml(value) {
  if (value === null || value === undefined) return "—";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Builds the image <img> source from either a raw base64 string, a data URI, or a file URI.
 */
function resolveImageSource(imageUri, base64Image) {
  if (imageUri && typeof imageUri === "string") {
    return imageUri;
  }
  if (base64Image && typeof base64Image === "string") {
    return base64Image.startsWith("data:image")
      ? base64Image
      : `data:image/jpeg;base64,${base64Image}`;
  }
  return null;
}

/**
 * Generates an HTML string for the Legal Metrology Field Inspection Memo.
 */
export function buildInspectionMemoHTML({
  scanResult,
  validationResult,
  imageUri = null,
  base64Image = null,
  officerRemarks = "",
  officerName = "Field Enforcement Officer",
  officerId = "LM-INSP-01",
}) {
  const report = validationResult || validateScan(scanResult);
  const evidence = scanResult.evidence || {};
  const resolvedImg = resolveImageSource(
    imageUri || scanResult.imageUri,
    base64Image || scanResult.base64Image
  );

  const isCompliant = report.isCompliant;
  const badgeBg = isCompliant ? "#DCFCE7" : "#FEE2E2";
  const badgeColor = isCompliant ? "#166534" : "#991B1B";
  const badgeBorder = isCompliant ? "#86EFAC" : "#FCA5A5";
  const statusLabel = isCompliant
    ? "COMPLIANT — PCR 2011 VERIFIED"
    : `${report.status.replace(/_/g, " ")} (${report.violations.length} VIOLATION${
        report.violations.length > 1 ? "S" : ""
      })`;

  const gpsText =
    typeof evidence.latitude === "number" && typeof evidence.longitude === "number"
      ? `${evidence.latitude.toFixed(6)}° N, ${evidence.longitude.toFixed(6)}° E`
      : "GPS Unavailable (Location Permission Denied / Indoor)";

  const violationsRowsHtml =
    report.violations.length === 0
      ? `
        <tr>
          <td colspan="5" style="text-align:center; padding: 14px; color: #166534; font-weight: 600; background: #F0FDF4;">
            No violations detected. All mandatory declarations conform to the Legal Metrology (Packaged Commodities) Rules, 2011.
          </td>
        </tr>
      `
      : report.violations
          .map(
            (v, idx) => `
          <tr>
            <td style="text-align:center; font-weight:600;">${idx + 1}</td>
            <td style="font-weight:700; color:#991B1B; white-space:nowrap;">${escapeHtml(
              v.rule
            )}</td>
            <td>
              <span class="sev-pill sev-${escapeHtml(v.severity)}">${escapeHtml(
              v.severity
            )}</span>
            </td>
            <td>
              <div style="font-weight:700; color:#0F172A; margin-bottom:2px;">${escapeHtml(
                v.title
              )}</div>
              <div style="font-size:10px; color:#475569;">${escapeHtml(v.description)}</div>
            </td>
            <td style="font-size:10px; color:#334155;">
              <div><strong>Observed:</strong> ${escapeHtml(v.observedValue)}</div>
              <div style="margin-top:3px;"><strong>Required:</strong> ${escapeHtml(
                v.expected
              )}</div>
            </td>
          </tr>
        `
          )
          .join("");

  const photoHtml = resolvedImg
    ? `<img src="${resolvedImg}" alt="Captured Package Evidence" class="evidence-img" />`
    : `<div class="no-photo-box">No package photo attached in demo scan payload.<br/><span>SHA-256 hash recorded from scan buffer.</span></div>`;

  const remarksText =
    officerRemarks && officerRemarks.trim().length > 0
      ? escapeHtml(officerRemarks.trim())
      : "On-site digital verification performed via MetrologyLens. Package declarations audited against Legal Metrology (Packaged Commodities) Rules, 2011.";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Inspection Memo - ${escapeHtml(scanResult.inspectionId)}</title>
  <style>
    @page {
      size: A4;
      margin: 14mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #0F172A;
      font-size: 11px;
      line-height: 1.45;
      background: #FFFFFF;
    }
    .header {
      border: 2px solid #0F172A;
      padding: 12px 14px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #F8FAFC;
    }
    .header-left h1 {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      color: #0F172A;
    }
    .header-left .sub {
      font-size: 10px;
      color: #334155;
      margin-top: 2px;
      font-weight: 600;
    }
    .header-right {
      text-align: right;
    }
    .memo-id {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      font-weight: 700;
      color: #0F172A;
    }
    .status-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 12px;
      margin-bottom: 12px;
      border: 1.5px solid ${badgeBorder};
      background: ${badgeBg};
      color: ${badgeColor};
    }
    .status-title {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.3px;
    }
    .score-box {
      font-size: 13px;
      font-weight: 800;
      padding: 3px 9px;
      background: #FFFFFF;
      border: 1px solid ${badgeBorder};
      color: #0F172A;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      background: #0F172A;
      color: #FFFFFF;
      padding: 5px 9px;
      margin-top: 10px;
      margin-bottom: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    th, td {
      border: 1px solid #CBD5E1;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #F1F5F9;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      color: #334155;
    }
    .kv-label {
      width: 28%;
      font-weight: 700;
      background: #F8FAFC;
      color: #1E293B;
    }
    .sev-pill {
      display: inline-block;
      padding: 2px 6px;
      font-size: 9px;
      font-weight: 800;
      border-radius: 3px;
      text-transform: uppercase;
    }
    .sev-CRITICAL {
      background: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FCA5A5;
    }
    .sev-MAJOR {
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #FCD34D;
    }
    .sev-MINOR {
      background: #E0F2FE;
      color: #075985;
      border: 1px solid #7DD3FC;
    }
    .evidence-grid {
      display: flex;
      border: 1px solid #CBD5E1;
      border-top: none;
      margin-bottom: 10px;
    }
    .evidence-photo-col {
      width: 34%;
      padding: 8px;
      border-right: 1px solid #CBD5E1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #F8FAFC;
    }
    .evidence-img {
      max-width: 100%;
      max-height: 155px;
      object-fit: contain;
      border: 1px solid #94A3B8;
    }
    .no-photo-box {
      text-align: center;
      padding: 18px 8px;
      font-size: 10px;
      color: #475569;
      border: 1px dashed #94A3B8;
      width: 100%;
    }
    .no-photo-box span {
      display: block;
      margin-top: 4px;
      font-size: 9px;
      color: #64748B;
    }
    .evidence-meta-col {
      width: 66%;
      padding: 8px 10px;
    }
    .meta-row {
      margin-bottom: 6px;
    }
    .meta-key {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
    }
    .meta-val {
      font-size: 11px;
      color: #0F172A;
      font-weight: 600;
    }
    .hash-box {
      font-family: 'Courier New', monospace;
      font-size: 9.5px;
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      padding: 5px 6px;
      word-break: break-all;
      margin-top: 2px;
    }
    .remarks-box {
      border: 1px solid #CBD5E1;
      border-top: none;
      padding: 8px 10px;
      min-height: 46px;
      background: #FFFFFF;
      margin-bottom: 14px;
    }
    .footer-sign {
      display: flex;
      justify-content: space-between;
      margin-top: 18px;
      padding-top: 8px;
    }
    .sign-block {
      width: 44%;
      border-top: 1px solid #0F172A;
      padding-top: 4px;
      font-size: 10px;
      color: #334155;
    }
  </style>
</head>
<body>

  <!-- Official Header -->
  <div class="header">
    <div class="header-left">
      <h1>Legal Metrology Field Inspection Memo</h1>
      <div class="sub">Under The Legal Metrology Act, 2009 &amp; Packaged Commodities Rules, 2011</div>
    </div>
    <div class="header-right">
      <div class="memo-id">${escapeHtml(scanResult.inspectionId || "INSP-MEMO")}</div>
      <div style="font-size:9.5px; color:#475569; margin-top:2px;">
        Generated: ${escapeHtml(new Date().toUTCString())}
      </div>
    </div>
  </div>

  <!-- Compliance Verdict Banner -->
  <div class="status-banner">
    <div class="status-title">VERDICT: ${escapeHtml(statusLabel)}</div>
    <div class="score-box">Compliance Score: ${report.score} / 100</div>
  </div>

  <!-- Section 1: Extracted Commodity Declarations -->
  <div class="section-title">1. Commodity &amp; Rule 6 Label Declarations</div>
  <table>
    <tr>
      <td class="kv-label">Product Name &amp; Brand</td>
      <td><strong>${escapeHtml(scanResult.productName)}</strong> (${escapeHtml(
    scanResult.brand
  )})</td>
      <td class="kv-label">Category</td>
      <td>${escapeHtml(scanResult.category)}</td>
    </tr>
    <tr>
      <td class="kv-label">Declared MRP</td>
      <td>₹ ${escapeHtml(scanResult.mrp)}</td>
      <td class="kv-label">Unit Sale Price (USP)</td>
      <td>${
        scanResult.unitSalePrice !== null && scanResult.unitSalePrice !== undefined
          ? `₹ ${escapeHtml(scanResult.unitSalePrice)}`
          : "—"
      }</td>
    </tr>
    <tr>
      <td class="kv-label">MRP Tax Declaration</td>
      <td colspan="3">${escapeHtml(scanResult.mrpIncludesTaxesText)}</td>
    </tr>
    <tr>
      <td class="kv-label">Net Quantity</td>
      <td><strong>${escapeHtml(scanResult.netQuantityValue)} ${escapeHtml(
    scanResult.netQuantityUnit
  )}</strong></td>
      <td class="kv-label">Mfg / Pack / Import Date</td>
      <td>${escapeHtml(scanResult.mfgOrPackDate)}</td>
    </tr>
    <tr>
      <td class="kv-label">Manufacturer / Importer</td>
      <td colspan="3">
        <strong>${escapeHtml(scanResult.manufacturerOrImporterName)}</strong><br/>
        ${escapeHtml(scanResult.manufacturerAddress)}
      </td>
    </tr>
    <tr>
      <td class="kv-label">Country of Origin</td>
      <td>${escapeHtml(scanResult.countryOfOrigin)}</td>
      <td class="kv-label">Consumer Care</td>
      <td>${escapeHtml(scanResult.consumerCareDetails)}</td>
    </tr>
  </table>

  <!-- Section 2: Rule Validation Audit -->
  <div class="section-title">2. Legal Metrology (PCR 2011) Audit Findings</div>
  <table>
    <thead>
      <tr>
        <th style="width:5%; text-align:center;">#</th>
        <th style="width:16%;">PCR Rule</th>
        <th style="width:11%;">Severity</th>
        <th style="width:36%;">Violation / Finding</th>
        <th style="width:32%;">Observed vs. Statutory Requirement</th>
      </tr>
    </thead>
    <tbody>
      ${violationsRowsHtml}
    </tbody>
  </table>

  <!-- Section 3: Cryptographic Chain of Custody -->
  <div class="section-title">3. Photographic &amp; Cryptographic Chain-of-Custody Evidence</div>
  <div class="evidence-grid">
    <div class="evidence-photo-col">
      ${photoHtml}
    </div>
    <div class="evidence-meta-col">
      <div class="meta-row">
        <div class="meta-key">Inspection GPS Coordinates</div>
        <div class="meta-val">${escapeHtml(gpsText)}</div>
      </div>
      <div class="meta-row">
        <div class="meta-key">Capture Timestamp (UTC ISO-8601)</div>
        <div class="meta-val">${escapeHtml(evidence.timestamp || report.evaluatedAt)}</div>
      </div>
      <div class="meta-row">
        <div class="meta-key">AI Audit Confidence</div>
        <div class="meta-val">${Math.round(
          ((scanResult.visualAudit && scanResult.visualAudit.confidenceScore) || 0) * 100
        )}% ${
    report.requiresManualReview ? "(Flagged for Manual Officer Verification)" : "(Verified)"
  }</div>
      </div>
      <div class="meta-row" style="margin-bottom:0;">
        <div class="meta-key">SHA-256 Image Integrity Hash</div>
        <div class="hash-box">${escapeHtml(
          evidence.sha256Hash || "HASH_NOT_CAPTURED"
        )}</div>
      </div>
    </div>
  </div>

  <!-- Section 4: Inspecting Officer Remarks -->
  <div class="section-title">4. Inspecting Officer Remarks</div>
  <div class="remarks-box">
    ${remarksText}
  </div>

  <div class="footer-sign">
    <div class="sign-block">
      <strong>Inspecting Officer:</strong> ${escapeHtml(officerName)} (${escapeHtml(
    officerId
  )})<br/>
      Department of Legal Metrology
    </div>
    <div class="sign-block" style="text-align:right;">
      <strong>Trader / Packer Representative Signature</strong><br/>
      Acknowledgment of Inspection Memo
    </div>
  </div>

</body>
</html>
  `;
}

/**
 * Moves/copies the temporary print PDF into the app-scoped cache directory
 * so Expo Go on Android permits Sharing.shareAsync() to read the file URI.
 */
async function movePdfToShareableCache(tempUri, inspectionId) {
  const safeId = String(inspectionId || "MEMO").replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `Inspection_Memo_${safeId}_${Date.now()}.pdf`;

  try {
    // Expo SDK 54–58 modern File/Paths API
    if (FileSystem.Paths && FileSystem.File) {
      const destFile = new FileSystem.File(FileSystem.Paths.cache, fileName);
      if (destFile.exists) {
        destFile.delete();
      }
      const sourceFile = new FileSystem.File(tempUri);
      sourceFile.copy(destFile);
      return destFile.uri;
    }

    // Legacy expo-file-system fallback
    if (FileSystem.cacheDirectory && FileSystem.copyAsync) {
      const destUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: tempUri, to: destUri });
      return destUri;
    }
  } catch (copyErr) {
    console.warn("[MetrologyLens] Could not copy PDF to scoped cache:", copyErr.message);
  }

  return tempUri;
}

/**
 * Generates a PDF file from an inspection scan and opens the native share sheet.
 * Supports both positional arguments and a single options object.
 *
 * @param {object} scanOrOptions - Either ScanResult or { scanResult, validationResult, imageUri, base64Image, officerRemarks, officerName, officerId, share }
 * @param {object} [validationResultArg]
 * @param {object} [extraOptions]
 * @returns {Promise<{ uri: string, validationResult: object }>}
 */
export async function generateInspectionPDF(
  scanOrOptions,
  validationResultArg = null,
  extraOptions = {}
) {
  const isOptionsWrapper =
    scanOrOptions &&
    typeof scanOrOptions === "object" &&
    "scanResult" in scanOrOptions;

  const config = isOptionsWrapper
    ? scanOrOptions
    : {
        scanResult: scanOrOptions,
        validationResult: validationResultArg,
        ...extraOptions,
      };

  const {
    scanResult,
    validationResult,
    imageUri = null,
    base64Image = null,
    officerRemarks = "",
    officerName = "Field Enforcement Officer",
    officerId = "LM-INSP-01",
    share = true,
  } = config;

  if (!scanResult) {
    throw new Error("generateInspectionPDF requires a valid scanResult object.");
  }

  const evaluatedReport = validationResult || validateScan(scanResult);

  const html = buildInspectionMemoHTML({
    scanResult,
    validationResult: evaluatedReport,
    imageUri,
    base64Image,
    officerRemarks,
    officerName,
    officerId,
  });

  const { uri: tempUri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  const shareableUri = await movePdfToShareableCache(
    tempUri,
    scanResult.inspectionId
  );

  if (share) {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(shareableUri, {
          mimeType: "application/pdf",
          dialogTitle: `Inspection Memo - ${scanResult.inspectionId || "MetrologyLens"}`,
          UTI: "com.adobe.pdf",
        });
      }
    } catch (shareError) {
      if (
        String(shareError?.message || "").includes("Not allowed to read file")
      ) {
        await Print.printAsync({ html });
      } else {
        throw shareError;
      }
    }
  }

  return {
    uri: shareableUri,
    validationResult: evaluatedReport,
  };
}

export default {
  buildInspectionMemoHTML,
  generateInspectionPDF,
};