import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Button, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supplementAPI } from "../src/services/api.js";
import { API_BASE_URL } from "../src/config/api";

export default function ManualAddScreen() {
  const { barcode, requiredFields } = useLocalSearchParams<{ 
    barcode?: string; 
    requiredFields?: string;
  }>();
  const router = useRouter();
  
  const [productName, setProductName] = useState("");
  const [brand, setBrand] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [servingsPerContainer, setServingsPerContainer] = useState("");
  const [ingredients, setIngredients] = useState<Array<{name: string, dosage: string, unit: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [fieldsNeeded, setFieldsNeeded] = useState<string[]>([]);
  const [productData, setProductData] = useState<any>(null);

  // Current ingredient being added
  const [currentIngredient, setCurrentIngredient] = useState("");
  const [currentDosage, setCurrentDosage] = useState("");
  const [currentUnit, setCurrentUnit] = useState("mg");

  // Fetch existing product data to pre-populate fields
  useEffect(() => {
    const fetchProductData = async () => {
      if (!barcode) return;
      
      try {
        setDataLoading(true);
        const result = await supplementAPI.getSupplement(barcode);
        
        if (result && result.data) {
          console.log('Fetched product data for manual add:', result.data);
          setProductData(result.data);
          
          // Pre-populate fields with existing data
          setProductName(result.data.productName || "");
          setBrand(result.data.brand || "");
          // Handle servingSize structure
          if (result.data.servingSize) {
            if (typeof result.data.servingSize === 'object') {
              const amount = result.data.servingSize.amount;
              const unit = result.data.servingSize.unit;
              setServingSize(amount && unit ? `${amount}${unit}` : "");
            } else {
              setServingSize(result.data.servingSize.toString());
            }
          }
          
          setServingsPerContainer(result.data.servingsPerContainer?.toString() || "");

          // Convert ingredients to structured format
          if (result.data.ingredients && Array.isArray(result.data.ingredients)) {
            const structuredIngredients = result.data.ingredients.map((ing: any) => ({
              name: ing.name || "",
              dosage: ing.dosage?.toString() || "",
              unit: ing.unit || "mg"
            }));
            setIngredients(structuredIngredients);
          }
        }
      } catch (error) {
        console.error('Error fetching product data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchProductData();
  }, [barcode]);

  useEffect(() => {
    if (requiredFields) {
      try {
        const parsed = JSON.parse(requiredFields);
        setFieldsNeeded(parsed);
      } catch (e) {
        console.error('Error parsing required fields:', e);
      }
    }
  }, [requiredFields]);

  const addIngredient = () => {
    if (!currentIngredient.trim()) {
      Alert.alert("Error", "Please enter an ingredient name");
      return;
    }

    setIngredients([...ingredients, {
      name: currentIngredient.trim(),
      dosage: currentDosage.trim(),
      unit: currentUnit
    }]);

    // Clear inputs
    setCurrentIngredient("");
    setCurrentDosage("");
    setCurrentUnit("mg");
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!productName.trim()) {
      Alert.alert("Error", "Please enter a product name");
      return;
    }

    setLoading(true);
    try {
      // Process ingredients for backend
      const processedIngredients = ingredients.map(ing => ({
        name: ing.name,
        dosage: ing.dosage ? parseFloat(ing.dosage) : null,
        unit: ing.unit || "mg",
        isStandardized: false,
        standardizedTo: null
      }));

      console.log('Processed ingredients array:', processedIngredients);

      const supplementData = {
        barcode,
        productName: productName.trim(),
        brand: brand.trim(),
        servingSize: {
          amount: servingSize ? parseFloat(servingSize) : null,
          unit: "g"
        },
        servingsPerContainer: servingsPerContainer ? parseInt(servingsPerContainer) : null,
        ingredients: processedIngredients
      };

      console.log('Sending supplement data:', JSON.stringify(supplementData, null, 2));

      // Use the new manual ingestion endpoint
      const response = await fetch(`${API_BASE_URL}/api/ingest/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(supplementData),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      // Try to parse as JSON, but handle HTML responses
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        console.error('Response was:', responseText.substring(0, 500));
        Alert.alert("Error", `Server returned an error. Check if the /api/manual-add endpoint exists.`);
        return;
      }

      console.log('API response:', JSON.stringify(result, null, 2));

      if (result.success) {
        Alert.alert("Success", "Product saved successfully!", [
          { text: "View Product", onPress: () => {
            const productBarcode = result.data.barcode || barcode;
            router.replace(`/product/${productBarcode}` as any);
          }}
        ]);
      } else {
        Alert.alert("Error", result.error || "Failed to save product");
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert("Error", "Failed to save product information");
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loading}>Loading product data...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Complete Product Information</Text>
      
      {barcode && (
        <View style={styles.barcodeContainer}>
          <Text style={styles.label}>Barcode:</Text>
          <Text style={styles.barcode}>{barcode}</Text>
        </View>
      )}

      {/* Show extracted product info */}
      {productData && (
        <View style={styles.extractedDataContainer}>
          <Text style={styles.extractedDataTitle}>✅ Found Product:</Text>
          <Text style={styles.extractedDataText}>
            <Text style={styles.extractedDataLabel}>Name: </Text>
            {productData.productName}
          </Text>
          <Text style={styles.extractedDataText}>
            <Text style={styles.extractedDataLabel}>Brand: </Text>
            {productData.brand}
          </Text>
          <Text style={styles.extractedDataText}>
            <Text style={styles.extractedDataLabel}>Category: </Text>
            {productData.subCategory || productData.category}
          </Text>
        </View>
      )}

      {fieldsNeeded.length > 0 && (
        <View style={styles.requiredFieldsContainer}>
          <Text style={styles.requiredFieldsTitle}>
            {productData?.meta?.sourceMap?.aiExtraction === false ? 
              "🔍 AI search found no detailed product page. Please help complete the quality data:" :
              "Please provide the missing information for quality assessment:"
            }
          </Text>
          {fieldsNeeded.map((field, index) => (
            <Text key={index} style={styles.requiredField}>• {field}</Text>
          ))}
        </View>
      )}

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Product Name *</Text>
        <TextInput
          style={styles.input}
          value={productName}
          onChangeText={setProductName}
          placeholder="Enter product name"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Brand</Text>
        <TextInput
          style={styles.input}
          value={brand}
          onChangeText={setBrand}
          placeholder="Enter brand name"
        />
      </View>

      {(fieldsNeeded.includes('servingSize') || fieldsNeeded.length === 0) && (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Serving Size</Text>
          <TextInput
            style={styles.input}
            value={servingSize}
            onChangeText={setServingSize}
            placeholder="e.g., 30g, 2 capsules"
          />
        </View>
      )}

      {(fieldsNeeded.includes('servingsPerContainer') || fieldsNeeded.length === 0) && (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Servings Per Container</Text>
          <TextInput
            style={styles.input}
            value={servingsPerContainer}
            onChangeText={setServingsPerContainer}
            placeholder="e.g., 25, 30"
            keyboardType="numeric"
          />
        </View>
      )}

      {(fieldsNeeded.includes('ingredients') || fieldsNeeded.length === 0) && (
        <View style={styles.ingredientsSection}>
          <Text style={styles.sectionTitle}>Ingredients</Text>

          {/* Add ingredient form */}
          <View style={styles.addIngredientContainer}>
            <View style={styles.ingredientInputRow}>
              <View style={styles.ingredientNameInput}>
                <Text style={styles.miniLabel}>Ingredient Name *</Text>
                <TextInput
                  style={styles.input}
                  value={currentIngredient}
                  onChangeText={setCurrentIngredient}
                  placeholder="e.g., Magnesium bisglycinat"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.ingredientInputRow}>
              <View style={styles.dosageInput}>
                <Text style={styles.miniLabel}>Amount</Text>
                <TextInput
                  style={styles.input}
                  value={currentDosage}
                  onChangeText={setCurrentDosage}
                  placeholder="700"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>

              <View style={styles.unitInput}>
                <Text style={styles.miniLabel}>Unit</Text>
                <TextInput
                  style={styles.input}
                  value={currentUnit}
                  onChangeText={setCurrentUnit}
                  placeholder="mg"
                />
              </View>

              <TouchableOpacity
                style={styles.addButton}
                onPress={addIngredient}
              >
                <Text style={styles.addButtonText}>+ Add</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.helpText}>
              Example: "klumpförebyggande medel: kiseldioxid(E551)" with amount "5" and unit "mg"
            </Text>
          </View>

          {/* Ingredients list */}
          {ingredients.length > 0 && (
            <View style={styles.ingredientsList}>
              <Text style={styles.ingredientsListTitle}>Added Ingredients ({ingredients.length}):</Text>
              {ingredients.map((ing, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>{ing.name}</Text>
                    {ing.dosage && (
                      <Text style={styles.ingredientDosage}>
                        {ing.dosage} {ing.unit}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => removeIngredient(index)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

        <View style={styles.buttonContainer}>
          <Button
            title={loading ? "Saving..." : "Save Product"}
            onPress={handleSave}
            disabled={loading}
          />
          <View style={{ height: 10 }} />
          <Button
            title="Cancel"
            onPress={() => router.back()}
            color="#666"
          />
        </View>

        {/* Extra padding for keyboard */}
        <View style={{ height: 50 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loading: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  barcodeContainer: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  extractedDataContainer: {
    backgroundColor: "#d4edda",
    borderColor: "#c3e6cb",
    borderWidth: 1,
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  extractedDataTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#155724",
    marginBottom: 8,
  },
  extractedDataText: {
    fontSize: 14,
    color: "#155724",
    marginBottom: 4,
  },
  extractedDataLabel: {
    fontWeight: "600",
  },
  requiredFieldsContainer: {
    backgroundColor: "#fff3cd",
    borderColor: "#ffeaa7",
    borderWidth: 1,
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  requiredFieldsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#856404",
    marginBottom: 8,
  },
  requiredField: {
    fontSize: 14,
    color: "#856404",
    marginLeft: 8,
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
    color: "#333",
  },
  helpText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    fontStyle: "italic",
  },
  barcode: {
    fontSize: 18,
    fontFamily: "monospace",
    color: "#007AFF",
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  buttonContainer: {
    marginTop: 30,
    marginBottom: 20,
  },
  ingredientsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 15,
    color: "#333",
  },
  addIngredientContainer: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  ingredientInputRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  ingredientNameInput: {
    flex: 1,
  },
  dosageInput: {
    flex: 1,
  },
  unitInput: {
    width: 80,
  },
  miniLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 5,
    color: "#555",
  },
  addButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignSelf: "flex-end",
    marginTop: 17,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  ingredientsList: {
    marginTop: 10,
  },
  ingredientsListTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  ingredientItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  ingredientDosage: {
    fontSize: 13,
    color: "#666",
  },
  removeButton: {
    backgroundColor: "#ff3b30",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});