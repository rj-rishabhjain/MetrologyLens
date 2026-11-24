/**
 * App.js — MetrologyLens root navigator
 *
 * Architecture:
 *   NavigationContainer
 *   └─ Tab.Navigator  (Bottom Tabs: "Scan" | "History")
 *       ├─ Tab "Scan"      → ScanStack.Navigator (Native Stack)
 *       │   ├─ ScanHome   (placeholder — tap "Demo Scan" → Result)
 *       │   └─ Result     (placeholder — renders scan JSON summary)
 *       └─ Tab "History"   → HistoryScreen (placeholder)
 *
 * Packages used (all present in package.json):
 *   @react-navigation/native        ^7.5.2
 *   @react-navigation/native-stack  ^7.21.1
 *   @react-navigation/bottom-tabs   ^7.22.0
 *   react-native-screens            ~4.30.1
 *   react-native-safe-area-context  ~5.11.1
 *   expo-status-bar                 ~58.0.5
 *
 * Colour palette:
 *   Dark Slate  #0F172A  (backgrounds)
 *   Slate       #1E293B  (card / tab bar)
 *   Emerald     #10B981  (primary accent)
 *   White       #F8FAFC  (primary text)
 *   Muted       #94A3B8  (secondary text)
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";

// Navigation
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

// Expo
import { StatusBar } from "expo-status-bar";

// Dummy data for the demo scan flow
import { DUMMY_SCAN_RESULT } from "./data/dummyScan";

// ── Colour constants ──────────────────────────────────────────────────────────

const COLORS = {
  background: "#0F172A",
  card: "#1E293B",
  accent: "#10B981",
  accentDim: "#065F46",
  textPrimary: "#F8FAFC",
  textMuted: "#94A3B8",
  border: "#334155",
  danger: "#F43F5E",
  warning: "#F59E0B",
};

// ── Navigator instances ───────────────────────────────────────────────────────

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── Shared component: compact tab bar icon (text emoji fallback) ──────────────

/**
 * Simple text-based tab icon — works in Expo Go without any icon library.
 * Teammates can swap this for expo-symbols or @expo/vector-icons later.
 */
function TabIcon({ label, focused }) {
  const icons = { Scan: "⬡", History: "☰" };
  return (
    <Text
      style={{
        fontSize: 20,
        color: focused ? COLORS.accent : COLORS.textMuted,
      }}
    >
      {icons[label] ?? "●"}
    </Text>
  );
}

// ── Placeholder screen: Scan Home ─────────────────────────────────────────────

/**
 * ScanHomeScreen
 *
 * Placeholder for the camera/scanner UI (teammates will build ScanScreen.js).
 * "Demo Scan" button navigates to Result passing DUMMY_SCAN_RESULT.
 */
function ScanHomeScreen({ navigation }) {
  function handleDemoScan() {
    navigation.navigate("Result", { scanResult: DUMMY_SCAN_RESULT });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.centeredContent}>
        {/* App brand mark */}
        <View style={styles.brandMark}>
          <Text style={styles.brandIcon}>⬡</Text>
          <Text style={styles.brandTitle}>MetrologyLens</Text>
          <Text style={styles.brandSubtitle}>
            Legal Metrology PCR 2011 — Field Inspector
          </Text>
        </View>

        {/* Status card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>📷  Scanner Ready</Text>
          <Text style={styles.infoCardBody}>
            Point the camera at any packaged commodity label. The AI will
            extract all mandatory PCR 2011 declarations and flag violations
            instantly.
          </Text>
        </View>

        {/* Primary CTA — demo flow */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleDemoScan}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>▶  Run Demo Scan</Text>
        </TouchableOpacity>

        <Text style={styles.hintText}>
          Teammates: replace this with ScanScreen.js in /screens
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ── Placeholder screen: Result ────────────────────────────────────────────────

/**
 * ResultScreen
 *
 * Receives a scanResult via route.params and renders a quick JSON summary.
 * Teammates will replace this with ResultScreen.js in /screens.
 */
function ResultScreen({ route, navigation }) {
  const { scanResult } = route.params ?? {};

  if (!scanResult) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centeredContent}>
          <Text style={styles.errorText}>No scan result received.</Text>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Determine overall compliance status from visual audit flags
  const { visualAudit } = scanResult;
  const hasViolation =
    visualAudit?.overlappingStickerDetected ||
    visualAudit?.lowContrastOrIllegible ||
    visualAudit?.prohibitedQualifiersFound;
  const statusColor = hasViolation ? COLORS.danger : COLORS.accent;
  const statusLabel = hasViolation ? "⚠  Non-Compliant" : "✓  Compliant";

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Compliance badge */}
        <View style={[styles.complianceBadge, { borderColor: statusColor }]}>
          <Text style={[styles.complianceLabel, { color: statusColor }]}>
            {statusLabel}
          </Text>
          <Text style={styles.inspectionIdText}>
            {scanResult.inspectionId}
          </Text>
        </View>

        {/* Product summary card */}
        <View style={styles.resultCard}>
          <Text style={styles.resultCardHeader}>Product</Text>
          <Row label="Name" value={scanResult.productName} />
          <Row label="Brand" value={scanResult.brand} />
          <Row label="Category" value={scanResult.category} />
          <Row label="Country" value={scanResult.countryOfOrigin} />
        </View>

        {/* Pricing card */}
        <View style={styles.resultCard}>
          <Text style={styles.resultCardHeader}>Pricing</Text>
          <Row label="MRP" value={`₹${scanResult.mrp}`} />
          <Row label="Net Qty" value={`${scanResult.netQuantityValue} ${scanResult.netQuantityUnit}`} />
          <Row label="Unit Price" value={`₹${scanResult.unitSalePrice} / 100 ${scanResult.netQuantityUnit}`} />
          <Row label="Mfg Date" value={scanResult.mfgOrPackDate} />
        </View>

        {/* Manufacturer card */}
        <View style={styles.resultCard}>
          <Text style={styles.resultCardHeader}>Manufacturer</Text>
          <Row label="Name" value={scanResult.manufacturerOrImporterName} />
          <Row label="Address" value={scanResult.manufacturerAddress} multiline />
          <Row label="Consumer Care" value={scanResult.consumerCareDetails} />
        </View>

        {/* Visual audit card */}
        <View style={styles.resultCard}>
          <Text style={styles.resultCardHeader}>Visual Audit</Text>
          <AuditFlag
            label="Overlapping Sticker"
            flagged={visualAudit?.overlappingStickerDetected}
          />
          <AuditFlag
            label="Low Contrast / Illegible"
            flagged={visualAudit?.lowContrastOrIllegible}
          />
          <AuditFlag
            label="Prohibited Qualifiers"
            flagged={visualAudit?.prohibitedQualifiersFound}
          />
          <Row
            label="AI Confidence"
            value={`${((visualAudit?.confidenceScore ?? 0) * 100).toFixed(0)}%`}
          />
        </View>

        {/* Evidence card */}
        {scanResult.evidence && (
          <View style={styles.resultCard}>
            <Text style={styles.resultCardHeader}>Evidence</Text>
            <Row
              label="GPS"
              value={
                scanResult.evidence.latitude != null
                  ? `${scanResult.evidence.latitude.toFixed(5)}, ${scanResult.evidence.longitude.toFixed(5)}`
                  : "Unavailable"
              }
            />
            <Row label="Timestamp" value={scanResult.evidence.timestamp} />
            <Row
              label="SHA-256"
              value={`${scanResult.evidence.sha256Hash.slice(0, 16)}…`}
              mono
            />
          </View>
        )}

        {/* Back button */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>← Back to Scanner</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helper sub-components ─────────────────────────────────────────────────────

/** Single label–value row inside a result card */
function Row({ label, value, multiline, mono }) {
  return (
    <View style={[styles.row, multiline && { alignItems: "flex-start" }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          multiline && { flexShrink: 1 },
          mono && { fontFamily: "monospace", fontSize: 11 },
        ]}
        numberOfLines={multiline ? 4 : 1}
        ellipsizeMode="tail"
      >
        {String(value ?? "—")}
      </Text>
    </View>
  );
}

/** Audit compliance flag row (green tick / red cross) */
function AuditFlag({ label, flagged }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={{ color: flagged ? COLORS.danger : COLORS.accent, fontWeight: "700" }}>
        {flagged ? "✗  Flagged" : "✓  OK"}
      </Text>
    </View>
  );
}

// ── Placeholder screen: History ───────────────────────────────────────────────

/**
 * HistoryScreen
 *
 * Placeholder — teammates will build this out with async-storage backed list.
 */
function HistoryScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.centeredContent}>
        <Text style={styles.placeholderIcon}>📋</Text>
        <Text style={styles.placeholderTitle}>Inspection History</Text>
        <Text style={styles.placeholderBody}>
          Past scans will appear here once the History module is implemented.
        </Text>
        <Text style={styles.hintText}>
          Teammates: add HistoryScreen.js in /screens
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ── Scan stack (Scan Home + Result) ───────────────────────────────────────────

function ScanStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: COLORS.background },
        // Smooth slide animation on Android & iOS
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen
        name="ScanHome"
        component={ScanHomeScreen}
        options={{ title: "MetrologyLens  ⬡" }}
      />
      <Stack.Screen
        name="Result"
        component={ResultScreen}
        options={{ title: "Inspection Result" }}
      />
    </Stack.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor={COLORS.background} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false, // each stack manages its own header
          tabBarStyle: {
            backgroundColor: COLORS.card,
            borderTopColor: COLORS.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: COLORS.accent,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
          tabBarIcon: ({ focused }) => (
            <TabIcon label={route.name} focused={focused} />
          ),
        })}
      >
        <Tab.Screen name="Scan" component={ScanStack} />
        <Tab.Screen name="History" component={HistoryScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Layout
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centeredContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
  },

  // Brand mark (Scan Home)
  brandMark: {
    alignItems: "center",
    marginBottom: 36,
  },
  brandIcon: {
    fontSize: 56,
    color: COLORS.accent,
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: "center",
  },

  // Info card (Scan Home)
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 28,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  infoCardTitle: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 8,
  },
  infoCardBody: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },

  // Buttons
  primaryButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    marginTop: 12,
    alignSelf: "center",
  },
  secondaryButtonText: {
    color: COLORS.textMuted,
    fontWeight: "600",
    fontSize: 14,
  },

  // Hint text
  hintText: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 4,
  },

  // Result screen
  complianceBadge: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: COLORS.card,
  },
  complianceLabel: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  inspectionIdText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  resultCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  resultCardHeader: {
    color: COLORS.accent,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  rowLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    flex: 0.45,
  },
  rowValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "500",
    flex: 0.55,
    textAlign: "right",
  },

  // Error
  errorText: {
    color: COLORS.danger,
    fontSize: 15,
    marginBottom: 16,
  },

  // History placeholder
  placeholderIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  placeholderTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
  },
  placeholderBody: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 12,
  },
});
