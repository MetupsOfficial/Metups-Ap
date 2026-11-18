import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('taxonomy migration preserves broad categories and adds exact item types', async () => {
  const sql = await readFile(new URL('../../database/migrations/product_item_taxonomy.sql', import.meta.url), 'utf8');

  assert.match(sql, /ADD COLUMN IF NOT EXISTS item_type text/i);
  assert.match(sql, /FOREIGN KEY \(item_type\) REFERENCES public\.product_item_types/i);
  assert.match(sql, /\('smartphones', 'Electronics', 'Smartphones'/);
  assert.match(sql, /\('laptops', 'Electronics', 'Laptops'/);
  assert.match(sql, /\('fridges-freezers', 'Appliances', 'Fridges & Freezers'/);
  assert.match(sql, /trg_products_item_type_category/i);
});
