import { createClient } from '@supabase/supabase-js';

let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return _supabase;
}

export class DatabaseService {
  /**
   * Convert camelCase JS supplement object to snake_case Postgres row.
   */
  static _supplementToRow(data) {
    return {
      barcode: data.barcode,
      product_name: data.productName || 'Unknown Product',
      brand: data.brand || 'Unknown Brand',
      category: data.category || 'supplement',
      sub_category: data.subCategory || 'other',
      form: data.form || 'other',
      servings_per_container: data.servingsPerContainer || null,
      serving_size: data.servingSize || { amount: null, unit: null },
      ingredients: data.ingredients || [],
      ingredient_list_text: data.ingredientListText || null,
      quality: data.quality || {
        underDosed: null,
        overDosed: null,
        fillerRisk: null,
        bioavailability: null
      },
      meta: data.meta || {
        source: 'user',
        verified: false,
        lastUpdated: new Date().toISOString()
      },
      pre_workout_data: data.preWorkoutData || null,
      herb_data: data.herbData || null,
      protein_data: data.proteinData || null
    };
  }

  /**
   * Convert snake_case Postgres row to camelCase JS supplement object.
   */
  static _rowToSupplement(row) {
    return {
      _schemaVersion: 1,
      barcode: row.barcode,
      productName: row.product_name,
      brand: row.brand,
      category: row.category,
      subCategory: row.sub_category,
      form: row.form,
      servingsPerContainer: row.servings_per_container,
      servingSize: row.serving_size,
      ingredients: row.ingredients,
      ingredientListText: row.ingredient_list_text,
      quality: row.quality,
      meta: row.meta,
      preWorkoutData: row.pre_workout_data,
      herbData: row.herb_data,
      proteinData: row.protein_data,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async initialize() {
    try {
      // Verify Supabase connection with a simple query
      const { error } = await getSupabase().from('products').select('barcode').limit(1);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to initialize Supabase: ${error.message}` };
    }
  }

  static async getByBarcode(barcode) {
    try {
      const { data, error } = await getSupabase()
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        return { success: true, data: this._rowToSupplement(data) };
      } else {
        return { success: false, error: `Supplement with barcode ${barcode} not found` };
      }
    } catch (error) {
      return { success: false, error: `Failed to get supplement: ${error.message}` };
    }
  }

  static async getOrCreateSupplement(barcode, supplementData) {
    try {
      // Check if it already exists
      const { data: existing, error: selectError } = await getSupabase()
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .maybeSingle();

      if (selectError) throw selectError;

      if (existing) {
        return { success: true, data: this._rowToSupplement(existing) };
      }

      if (!supplementData) {
        return { success: false, error: `Supplement with barcode ${barcode} not found` };
      }

      // Build the row and insert
      const row = this._supplementToRow({ ...supplementData, barcode });

      const { data: inserted, error: insertError } = await getSupabase()
        .from('products')
        .insert(row)
        .select()
        .single();

      if (insertError) throw insertError;

      return { success: true, data: this._rowToSupplement(inserted), backupCreated: true };
    } catch (error) {
      return { success: false, error: `Failed to get/create supplement: ${error.message}` };
    }
  }

  static async updateSupplement(barcode, updates) {
    try {
      // Build a partial row from the updates (only include fields that are present)
      const row = {};
      if (updates.productName !== undefined) row.product_name = updates.productName;
      if (updates.brand !== undefined) row.brand = updates.brand;
      if (updates.category !== undefined) row.category = updates.category;
      if (updates.subCategory !== undefined) row.sub_category = updates.subCategory;
      if (updates.form !== undefined) row.form = updates.form;
      if (updates.servingsPerContainer !== undefined) row.servings_per_container = updates.servingsPerContainer;
      if (updates.servingSize !== undefined) row.serving_size = updates.servingSize;
      if (updates.ingredients !== undefined) row.ingredients = updates.ingredients;
      if (updates.ingredientListText !== undefined) row.ingredient_list_text = updates.ingredientListText;
      if (updates.quality !== undefined) row.quality = updates.quality;
      if (updates.meta !== undefined) row.meta = updates.meta;
      if (updates.preWorkoutData !== undefined) row.pre_workout_data = updates.preWorkoutData;
      if (updates.herbData !== undefined) row.herb_data = updates.herbData;
      if (updates.proteinData !== undefined) row.protein_data = updates.proteinData;

      const { data, error } = await getSupabase()
        .from('products')
        .update(row)
        .eq('barcode', barcode)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this._rowToSupplement(data) };
    } catch (error) {
      return { success: false, error: `Failed to update supplement: ${error.message}` };
    }
  }

  static async search(query, options = {}) {
    try {
      let q = getSupabase().from('products').select('*');

      // Text search on product_name and brand using ilike
      if (query && query.trim()) {
        const pattern = `%${query.trim()}%`;
        q = q.or(`product_name.ilike.${pattern},brand.ilike.${pattern}`);
      }

      // Filters
      if (options.category) {
        q = q.eq('category', options.category);
      }
      if (options.brand) {
        q = q.ilike('brand', `%${options.brand}%`);
      }
      if (options.verified !== undefined) {
        q = q.eq('meta->>verified', String(options.verified));
      }

      // Pagination
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      q = q.range(offset, offset + limit - 1);

      const { data, error } = await q;
      if (error) throw error;

      return { success: true, data: (data || []).map(r => this._rowToSupplement(r)) };
    } catch (error) {
      return { success: false, error: `Search failed: ${error.message}` };
    }
  }

  static async getStats() {
    try {
      // Total count
      const { count: total, error: countError } = await getSupabase()
        .from('products')
        .select('*', { count: 'exact', head: true });
      if (countError) throw countError;

      // Fetch all rows (category, meta columns only) for aggregation
      const { data: rows, error: rowsError } = await getSupabase()
        .from('products')
        .select('category, meta, barcode, updated_at');
      if (rowsError) throw rowsError;

      const stats = {
        total: total || 0,
        byCategory: {},
        bySource: {},
        verified: 0,
        withBarcode: 0,
        lastUpdated: null
      };

      let maxTime = 0;
      for (const row of rows || []) {
        // byCategory
        stats.byCategory[row.category] = (stats.byCategory[row.category] || 0) + 1;
        // bySource
        const source = row.meta?.source || 'unknown';
        stats.bySource[source] = (stats.bySource[source] || 0) + 1;
        // verified
        if (row.meta?.verified) stats.verified++;
        // withBarcode
        if (row.barcode) stats.withBarcode++;
        // lastUpdated
        const t = new Date(row.updated_at || row.meta?.lastUpdated).getTime();
        if (t > maxTime) maxTime = t;
      }

      stats.lastUpdated = maxTime || null;

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: `Failed to get stats: ${error.message}` };
    }
  }

  static async deleteSupplement(barcode) {
    try {
      const { error } = await getSupabase()
        .from('products')
        .delete()
        .eq('barcode', barcode);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to delete supplement: ${error.message}` };
    }
  }
}
