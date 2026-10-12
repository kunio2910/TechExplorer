import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBackup } from '../lib/backup';
import { seedProducts } from '../lib/seed';
test('backup accepts existing catalog and refuses duplicate IDs or malformed coordinates', () => {
  const product = structuredClone(seedProducts[0]);
  assert.equal(parseBackup({products:[product],components:[]}).products[0].id, product.id);
  assert.throws(() => parseBackup({products:[product,product],components:[]}));
  product.hotspots[0].x = 101;
  assert.throws(() => parseBackup({products:[product],components:[]}));
});
test('backup refuses missing lists and unsafe document IDs', () => {
  assert.throws(() => parseBackup({products:[]}));
  const product = structuredClone(seedProducts[0]);
  product.id = 'invalid/id';
  assert.throws(() => parseBackup({products:[product],components:[]}));
});
