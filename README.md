# MetrologyLens (PackCheck LM)

**MetrologyLens** is a cross-platform mobile compliance and field-inspection application built with **React Native (Expo)** for Legal Metrology enforcement officers, quality assurance auditors, and retail inspectors. It audits pre-packaged goods in real time against the **Legal Metrology (Packaged Commodities) Rules, 2011 (PCR 2011)** and generates tamper-evident inspection memos.

---

## Core Capabilities

- **AI Vision Label Extraction (`services/geminiVision.js`):** Extracts Rule 6 mandatory declarations (MRP, tax inclusion text, net quantity, SI unit, manufacturing/packing date, manufacturer/importer address, country of origin, and consumer care details) alongside visual tampering flags.
- **Legal Metrology PCR 2011 Rules Engine (`utils/rulesEngine.js`):** Pure JavaScript compliance validator scoring packages from `0–100` and citing exact violated sub-rules (`Rule 6(1)(a)`, `Rule 6(1)(c)`, `Rule 6(1)(d)`, `Rule 6(1)(e)`, `Rule 6(1)(aa)`, `Rule 6(2)`, `Rule 7`, `Rule 9(1)`, `Rule 10`, `Rule 11(1)`, `Rule 12`, `Rule 13`, and `Rule 18(7)`).
- **Cryptographic Chain of Custody (`utils/evidence.js`):** Captures SHA-256 image byte hashes via `expo-crypto`, GPS coordinates via `expo-location`, and UTC timestamps.
- **Official HTML-to-PDF Inspection Memo (`utils/pdfGenerator.js`):** Generates printable A4 Legal Metrology Inspection Memos via `expo-print` and `expo-sharing` containing package photography, violation tables, GPS coordinates, SHA-256 hashes, and officer remarks.

---

## Project Structure

```text
MetrologyLens/
├── App.js                   # Root navigator & demo scan flow
├── data/
│   └── dummyScan.js         # Canonical ScanResult JSON schema & mock payload
├── screens/                 # UI screens (ScanScreen, ResultScreen, HistoryScreen)
├── services/
│   └── geminiVision.js      # Gemini Vision API OCR & visual audit service
├── utils/
│   ├── evidence.js          # SHA-256 hash + GPS + timestamp capture
│   ├── rulesEngine.js       # Legal Metrology (PCR 2011) rule validation engine
│   └── pdfGenerator.js      # Official HTML-to-PDF Inspection Memo generator
├── test-samples/            # Real-world product packet test images (compliant & tampered)
└── .env.example             # Environment variable template (never commit .env)