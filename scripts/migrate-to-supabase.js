/**
 * One-time migration script: reads existing supplements.json and
 * batch-inserts rows into the Supabase `products` table.
 *
 * Usage:
 *   node scripts/migrate-to-supabase.js
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function supplementToRow(s) {
  return {
    barcode: s.barcode,
    product_name: s.productName || 'Unknown Product',
    brand: s.brand || 'Unknown Brand',
    category: s.category || 'supplement',
    sub_category: s.subCategory || 'other',
    form: s.form || 'other',
    servings_per_container: s.servingsPerContainer || null,
    serving_size: s.servingSize || { amount: null, unit: null },
    ingredients: s.ingredients || [],
    ingredient_list_text: s.ingredientListText || null,
    quality: s.quality || null,
    meta: s.meta || { source: 'migrated', verified: false },
    pre_workout_data: s.preWorkoutData || null,
    herb_data: s.herbData || null,
    protein_data: s.proteinData || null
  };
}

async function migrate() {
  const filePath = path.resolve(process.cwd(), 'src/data/supplements.json');

  if (!fs.existsSync(filePath)) {
    console.log('No supplements.json found — nothing to migrate.');
    process.exit(0);
  }

  const supplements = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`Found ${supplements.length} supplements to migrate.`);

  if (supplements.length === 0) {
    console.log('Empty file — nothing to migrate.');
    process.exit(0);
  }

  const rows = supplements.map(supplementToRow);

  // Batch insert (upsert on barcode to avoid duplicates)
  const BATCH_SIZE = 100;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('products')
      .upsert(batch, { onConflict: 'barcode', ignoreDuplicates: true })
      .select('barcode');

    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} error:`, error.message);
      skipped += batch.length;
    } else {
      inserted += data.length;
      console.log(`Batch ${i / BATCH_SIZE + 1}: inserted ${data.length} rows`);
    }
  }

  console.log(`\nMigration complete: ${inserted} inserted, ${skipped} skipped/errored.`);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
