import assert from 'node:assert/strict';
import test from 'node:test';
import { consumePhoneRateLimit, resolveMessagesPerMinute } from '../src/rate-limit-service.js';

test('rate limit uses a positive configured value and safe fallback', () => {
  assert.equal(resolveMessagesPerMinute('12'), 12);
  assert.equal(resolveMessagesPerMinute('0'), 20);
  assert.equal(resolveMessagesPerMinute(undefined), 20);
});

test('rate limit delegates one atomic consumption to Supabase', async () => {
  let call;
  const result = await consumePhoneRateLimit({
    rpc: async (name, parameters) => {
      call = { name, parameters };
      return { data: { allowed: false, count: 21, limit: 20 }, error: null };
    },
  }, '263784617009', { limit: '20' });
  assert.deepEqual(call, { name: 'consume_whatsapp_rate_limit', parameters: { p_phone: '263784617009', p_limit: 20 } });
  assert.equal(result.allowed, false);
});
