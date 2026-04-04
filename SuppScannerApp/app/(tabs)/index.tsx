import { MaterialIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "../../src/config/api";
import { LOGO_URI, LOGO_ICON_URI } from "@/constants/logos";

const COLORS = {
  primary: "#00685f",
  primaryContainer: "#008378",
  primaryFixed: "#89f5e7",
  primaryFixedDim: "#6bd8cb",
  onPrimary: "#ffffff",
  onPrimaryFixedVariant: "#005049",
  surface: "#f5faf8",
  surfaceContainerLow: "#f0f5f2",
  surfaceContainerLowest: "#ffffff",
  onSurface: "#171d1c",
  onSurfaceVariant: "#3d4947",
  outline: "#6d7a77",
  tertiaryFixed: "#ffdbce",
  onTertiaryFixedVariant: "#773215",
};

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBarcodeScanned = async ({ data: barcode }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/ingest/barcode/${barcode}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const result = await response.json();
      if (result.success && result.requiredFields?.length > 0) {
        router.push(
          `/manual-add?barcode=${encodeURIComponent(
            barcode
          )}&requiredFields=${encodeURIComponent(
            JSON.stringify(result.requiredFields)
          )}` as any
        );
      } else {
        router.push(`/product/${encodeURIComponent(barcode)}` as any);
      }
    } catch {
      router.push(`/product/${encodeURIComponent(barcode)}` as any);
    } finally {
      setLoading(false);
      setScanned(false);
    }
  };

  const handleManualSearch = () => {
    if (searchQuery.trim()) {
      router.push(
        `/(tabs)/search?q=${encodeURIComponent(searchQuery.trim())}` as any
      );
    } else {
      router.push("/(tabs)/search" as any);
    }
  };

  // Permission not yet loaded
  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialIcons
          name="camera-alt"
          size={56}
          color={COLORS.primaryFixedDim}
          style={{ marginBottom: 20 }}
        />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionBody}>
          Allow camera access to scan supplement barcodes instantly.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
          activeOpacity={0.85}
        >
          <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Top bar — inside SafeAreaView for status bar padding */}
      <SafeAreaView edges={["top"]} style={styles.topBarSafe}>
        <View style={styles.topBar}>
          <View style={styles.topBarLogo}>
            <Image source={{ uri: LOGO_URI }} style={styles.headerLogo} contentFit="contain" />
          </View>
          <TouchableOpacity style={styles.topBarAction} activeOpacity={0.7}>
            <MaterialIcons name="settings" size={24} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Camera Section */}
        <View style={styles.cameraWrapper}>
          {cameraOpen ? (
            <View style={styles.cameraContainer}>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing={facing}
                enableTorch={flashOn}
                onBarcodeScanned={handleBarcodeScanned}
              />

              {/* Processing overlay */}
              {loading && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color={COLORS.primaryFixed} />
                  <Text style={styles.processingText}>Processing...</Text>
                </View>
              )}

              {/* Corner brackets */}
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />

              {/* Scanning line */}
              <View style={styles.scanLine} />

              {/* Pill instruction overlay */}
              <View style={styles.pillContainer}>
                <Text style={styles.pillText}>Align barcode within frame</Text>
              </View>

              {/* Camera controls row */}
              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={styles.cameraControlBtn}
                  onPress={() => setFlashOn((v) => !v)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={flashOn ? "flash-on" : "flash-off"}
                    size={22}
                    color="#ffffff"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cameraControlBtn}
                  onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="flip-camera-ios" size={22} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cameraControlBtn, styles.closeBtn]}
                  onPress={() => setCameraOpen(false)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="close" size={22} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.cameraContainer}>
              <View style={styles.logoButtonInner}>
                <TouchableOpacity onPress={() => setCameraOpen(true)} activeOpacity={0.75}>
                  <Image source={{ uri: LOGO_ICON_URI }} style={styles.logoButtonImage} contentFit="contain" />
                </TouchableOpacity>
                <Text style={styles.tapToScanHint}>tap to scan</Text>
              </View>
            </View>
          )}
        </View>

        {/* Heading + subtitle */}
        <View style={styles.headingSection}>
          <Text style={styles.headingText}>
            Instantly Analyze Any Supplement
          </Text>
          <Text style={styles.subtitleText}>
            Point your camera at a barcode or search by name to check purity,
            dosage, and ingredient quality.
          </Text>
        </View>

        {/* Manual search bar */}
        <View style={styles.searchBarContainer}>
          <MaterialIcons
            name="search"
            size={20}
            color={COLORS.outline}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Or type supplement name manually..."
            placeholderTextColor={COLORS.outline}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleManualSearch}
            returnKeyType="search"
            selectionColor={COLORS.primary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={handleManualSearch}
              style={styles.searchGoBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.searchGoText}>Go</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bento grid */}
        <View style={styles.bentoGrid}>
          {/* Purity Check card */}
          <View style={[styles.bentoCard, styles.bentoCardPrimary]}>
            <View style={styles.bentoIconCircle}>
              <MaterialIcons
                name="verified"
                size={26}
                color={COLORS.onPrimaryFixedVariant}
              />
            </View>
            <Text style={styles.bentoCardTitle}>Purity Check</Text>
            <Text style={styles.bentoCardBody}>
              Lab-verified ingredient purity and contaminant screening.
            </Text>
          </View>

          {/* Additives card */}
          <View style={[styles.bentoCard, styles.bentoCardSecondary]}>
            <View style={styles.bentoIconCircleWarn}>
              <MaterialIcons
                name="warning-amber"
                size={26}
                color={COLORS.onTertiaryFixedVariant}
              />
            </View>
            <Text style={styles.bentoCardTitle}>Additives</Text>
            <Text style={styles.bentoCardBody}>
              Flags fillers, artificial dyes, and questionable excipients.
            </Text>
          </View>
        </View>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  // Permission screen
  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  permissionTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontWeight: "800",
    fontSize: 22,
    color: COLORS.onSurface,
    textAlign: "center",
    marginBottom: 10,
  },
  permissionBody: {
    fontFamily: "Inter_400Regular",
    fontWeight: "400",
    fontSize: 15,
    color: COLORS.onSurfaceVariant,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderRadius: 28,
  },
  permissionButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    fontSize: 16,
    color: COLORS.onPrimary,
  },

  // Top bar
  topBarSafe: {
    backgroundColor: COLORS.surface,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(109,122,119,0.18)",
  },
  topBarLogo: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerLogo: {
    width: 180,
    height: 36,
  },
  topBarAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 20,
  },

  // Camera
  cameraWrapper: {
    width: "100%",
    aspectRatio: 3 / 4,
    marginBottom: 20,
  },
  cameraContainer: {
    flex: 1,
    borderRadius: 40,
    overflow: "hidden",
    backgroundColor: "#111",
  },

  // Processing overlay
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    gap: 12,
  },
  processingText: {
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    fontSize: 16,
    color: "#ffffff",
  },

  // Corner brackets
  corner: {
    position: "absolute",
    width: 48,
    height: 48,
    borderColor: COLORS.primary,
    borderWidth: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  cornerTopLeft: {
    top: 24,
    left: 24,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: 24,
    right: 24,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: 24,
    left: 24,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    bottom: 24,
    right: 24,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },

  // Scanning line
  scanLine: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(0,104,95,0.6)",
    zIndex: 10,
  },

  // Pill overlay
  pillContainer: {
    position: "absolute",
    bottom: 72,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  pillText: {
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    fontSize: 13,
    color: "#ffffff",
    backgroundColor: "rgba(0,0,0,0.42)",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    overflow: "hidden",
  },

  // Camera controls
  cameraControls: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    zIndex: 10,
  },
  cameraControlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    backgroundColor: "rgba(220,50,50,0.7)",
  },
  logoButtonInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceContainerLow,
  },
  logoButtonImage: {
    width: 180,
    height: 180,
  },
  tapToScanHint: {
    marginTop: 14,
    fontSize: 13,
    color: COLORS.outline,
    fontFamily: "Inter_400Regular",
    fontWeight: "400",
    letterSpacing: 0.5,
  },

  // Heading section
  headingSection: {
    marginBottom: 16,
  },
  headingText: {
    fontFamily: "Manrope_800ExtraBold",
    fontWeight: "800",
    fontSize: 24,
    color: COLORS.onSurface,
    letterSpacing: -0.4,
    marginBottom: 8,
    lineHeight: 32,
  },
  subtitleText: {
    fontFamily: "Inter_400Regular",
    fontWeight: "400",
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    lineHeight: 21,
  },

  // Search bar
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "rgba(109,122,119,0.25)",
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontWeight: "400",
    fontSize: 14,
    color: COLORS.onSurface,
    paddingVertical: 10,
  },
  searchGoBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginLeft: 8,
  },
  searchGoText: {
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    fontSize: 13,
    color: COLORS.onPrimary,
  },

  // Bento grid
  bentoGrid: {
    flexDirection: "row",
    gap: 12,
  },
  bentoCard: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    minHeight: 150,
  },
  bentoCardPrimary: {
    backgroundColor: COLORS.primaryFixed,
  },
  bentoCardSecondary: {
    backgroundColor: COLORS.tertiaryFixed,
  },
  bentoIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,80,73,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  bentoIconCircleWarn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(119,50,21,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  bentoCardTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontWeight: "800",
    fontSize: 15,
    color: COLORS.onSurface,
    marginBottom: 6,
  },
  bentoCardBody: {
    fontFamily: "Inter_400Regular",
    fontWeight: "400",
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    lineHeight: 17,
  },
});
