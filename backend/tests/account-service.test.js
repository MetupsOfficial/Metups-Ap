import assert from 'node:assert/strict';
import test from 'node:test';
import { toE164Phone } from '../src/account-service.js';

test('toE164Phone canonicalizes Meta sender digits without changing identity', () => {
  assert.equal(toE164Phone('263784617009'), '+263784617009');
  assert.equal(toE164Phone('+263 784 617 009'), '+263784617009');
});

test('toE164Phone rejects invalid phone input', () => {
  assert.throws(() => toE164Phone('123'), /Invalid WhatsApp phone number/);
});
