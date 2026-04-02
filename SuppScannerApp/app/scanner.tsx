import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { API_BASE_URL } from "../src/config/api";

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, []);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission needed</Text>
      </View>
    );
  }

  const handleBarcodeScanned = async ({ data: barcode }: { data: string }) => {
    if (scanned || loading) return;
    
    setScanned(true);
    setBarcode(barcode);
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/ingest/barcode/${barcode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      console.log('Full API response:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('Supplement:', result.data);
        
        // Check if manual input needed
        if (result.requiredFields && result.requiredFields.length > 0) {
          console.log('Manual input needed for fields:', result.requiredFields);
          // Navigate to manual add with required fields info
          router.push(`/manual-add?barcode=${encodeURIComponent(barcode)}&requiredFields=${encodeURIComponent(JSON.stringify(result.requiredFields))}` as any);
        } else {
          // Navigate to product page with complete data
          router.push(`/product/${encodeURIComponent(barcode)}` as any);
        }
      } else {
        console.log('Supplement not found, navigating to product page');
        // Still navigate to product page, let it handle the error
        router.push(`/product/${encodeURIComponent(barcode)}` as any);
      }
    } catch (error) {
      console.error('Scan error:', error);
      // Still navigate to product page, let it handle the error
      router.push(`/product/${encodeURIComponent(barcode)}` as any);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={handleBarcodeScanned}
      />

      {barcode && (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>
            {loading ? "Processing..." : "Scanned:"}
          </Text>
          <Text style={styles.code}>{barcode}</Text>
          {!loading && (
            <Text
              style={styles.link}
              onPress={() => {
                setScanned(false);
                setBarcode(null);
                setLoading(false);
              }}
            >
              Tap to scan again
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  resultBox: {
    position: "absolute",
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: "#0f172a",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  resultText: {
    color: "#94a3b8",
    fontSize: 14,
    marginBottom: 4,
  },
  code: {
    color: "#22c55e",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  link: {
    color: "#60a5fa",
    marginTop: 8,
  },
  text: {
    textAlign: "center",
  },
});

