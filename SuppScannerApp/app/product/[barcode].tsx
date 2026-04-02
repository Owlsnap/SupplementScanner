// app/product/[barcode].tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text, View } from "react-native";
import { Product } from "../../schemas/product";
import { fetchProductByBarcode } from "../../services/product.service";

export default function ProductPage() {
  const { barcode, localData } = useLocalSearchParams<{ barcode: string; localData?: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!barcode) return;
    let mounted = true;
    
    // Check if we have local data first
    if (localData) {
      try {
        const parsedLocalData = JSON.parse(decodeURIComponent(localData));
        console.log('Using local data:', parsedLocalData);
        setProduct(parsedLocalData);
        setLoading(false);
        return;
      } catch (e) {
        console.error('Failed to parse local data:', e);
      }
    }
    
    const fetchWithRetry = async () => {
      setLoading(true);
      const res = await fetchProductByBarcode(barcode);
      if (!mounted) return;
      
      if (res) {
        setProduct(res);
        
        // If AI extraction is marked as true but quality data is empty, 
        // the processing might still be happening - retry after a delay
        const needsAIProcessing = res.meta?.sourceMap?.aiExtraction && 
          (!res.quality?.bioavailability && !res.ingredients?.length && res.subCategory === 'other');
          
        if (needsAIProcessing) {
          console.log('Product found but AI processing incomplete, will retry in 3 seconds...');
          setTimeout(async () => {
            if (!mounted) return;
            console.log('Retrying to get fully processed data...');
            const updatedRes = await fetchProductByBarcode(barcode);
            if (updatedRes && mounted) {
              console.log('Updated product data:', updatedRes);
              setProduct(updatedRes);
            }
          }, 3000);
        }
      } else {
        setError("Product not found. You can add it manually.");
      }
      setLoading(false);
    };
    
    fetchWithRetry();
    return () => { mounted = false; };
  }, [barcode]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loading}>Fetching product info…</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>No product found</Text>
        <Text style={styles.text}>{error}</Text>
        <Button title="Add manually" onPress={() => router.push(`/manual-add?barcode=${barcode}` as any)} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.name}>{product.name}</Text>
      {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
      
      {/* Show local data indicator */}
      {product.meta?.manuallyUpdated && (
        <View style={styles.localDataBanner}>
          <Text style={styles.localDataText}>📝 Showing your manual updates (not yet saved to server)</Text>
        </View>
      )}
      
      {/* AI Processing Status */}
      {product.meta?.sourceMap?.aiExtraction && 
       (!product.quality?.bioavailability && !product.ingredients?.length && product.subCategory === 'other') && (
        <View style={styles.processingBanner}>
          <Text style={styles.processingText}>🤖 AI is analyzing this product...</Text>
          <Text style={styles.processingSubtext}>Detailed information will appear shortly</Text>
        </View>
      )}
      
      {/* Product Details Section */}
      <View style={styles.detailsSection}>
        {product.category && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category:</Text>
            <Text style={styles.detailValue}>{product.category}</Text>
          </View>
        )}
        {product.subCategory && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>{product.subCategory}</Text>
          </View>
        )}
        {product.form && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Form:</Text>
            <Text style={styles.detailValue}>{product.form}</Text>
          </View>
        )}
        {product.servingSize && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Serving Size:</Text>
            <Text style={styles.detailValue}>{product.servingSize}</Text>
          </View>
        )}
        {product.servingsPerContainer && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Servings:</Text>
            <Text style={styles.detailValue}>{product.servingsPerContainer}</Text>
          </View>
        )}
      </View>

      {/* Quality Check Section */}
      {product.quality && (
        <>
          <Text style={styles.sectionTitle}>Quality Assessment</Text>
          <View style={styles.qualitySection}>
            {product.quality.bioavailability && (
              <View style={styles.qualityRow}>
                <Text style={styles.qualityLabel}>Bioavailability:</Text>
                <Text style={styles.qualityValue}>{product.quality.bioavailability}</Text>
              </View>
            )}
            {product.quality.fillerRisk && (
              <View style={styles.qualityRow}>
                <Text style={styles.qualityLabel}>Filler Risk:</Text>
                <Text style={[styles.qualityValue, { color: product.quality.fillerRisk === 'low' ? '#22c55e' : '#ef4444' }]}>
                  {product.quality.fillerRisk}
                </Text>
              </View>
            )}
            {product.quality.overDosed !== null && (
              <View style={styles.qualityRow}>
                <Text style={styles.qualityLabel}>Dosage:</Text>
                <Text style={[styles.qualityValue, { color: product.quality.overDosed ? '#ef4444' : '#22c55e' }]}>
                  {product.quality.overDosed ? 'Over-dosed' : 'Properly dosed'}
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Ingredients</Text>

      {product.ingredients.length === 0 && <Text style={styles.text}>No ingredients available.</Text>}

      {product.ingredients.map((ing, i) => (
        <View key={i} style={styles.ingredientRow}>
          <Text style={styles.ingName}>{ing.name}</Text>
          <Text style={styles.ingDose}>{ing.dosage_mg ? `${ing.dosage_mg} mg` : "—"}</Text>
        </View>
      ))}

      <View style={{ height: 30 }} />

      <Button title="Scan another" onPress={() => router.replace("/scanner")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  loading: { marginTop: 12 },
  title: { fontSize: 20, fontWeight: "600" },
  text: { marginTop: 8, color: "#666" },
  name: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  brand: { color: "#666", marginBottom: 12 },
  processingBanner: {
    backgroundColor: "#fff3cd",
    borderColor: "#ffeaa7",
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: "center"
  },
  processingText: {
    color: "#856404",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4
  },
  processingSubtext: {
    color: "#856404",
    fontSize: 14,
    textAlign: "center"
  },
  localDataBanner: {
    backgroundColor: "#cce5ff",
    borderColor: "#80bfff",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: "center"
  },
  localDataText: {
    color: "#0066cc",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center"
  },
  sectionTitle: { 
    marginTop: 24, 
    marginBottom: 12, 
    fontWeight: "700", 
    fontSize: 18,
    color: "#333"
  },
  detailsSection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef"
  },
  detailLabel: {
    fontWeight: "600",
    color: "#495057",
    flex: 1
  },
  detailValue: {
    color: "#212529",
    flex: 1,
    textAlign: "right"
  },
  qualitySection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16
  },
  qualityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef"
  },
  qualityLabel: {
    fontWeight: "600",
    color: "#495057",
    flex: 1
  },
  qualityValue: {
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    textTransform: "capitalize"
  },
  ingredientRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: "#eee",
    backgroundColor: "#fff"
  },
  ingName: { flex: 1, fontSize: 16 },
  ingDose: { 
    width: 120, 
    textAlign: "right", 
    color: "#333",
    fontSize: 16,
    fontWeight: "500"
  }
});
