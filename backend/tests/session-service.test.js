import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildExpiredSessionReset,
  buildNewSession,
  buildSessionActivity,
  isSessionExpired,
  resolveSessionTtlMinutes,
} from '../src/session-service.js';

const now = new Date('2026-09-11T12:00:00.000Z');

test('creates an idle session with a configured rolling expiry', () => {
  const session = buildNewSession('263771234567', now, 30);

  assert.equal(session.phone, '263771234567');
  assert.equal(session.current_intent, 'idle');
  assert.equal(session.current_stage, null);
  assert.deepEqual(session.context, {});
  assert.equal(session.updated_at, '2026-09-11T12:00:00.000Z');
  assert.equal(session.last_message_at, '2026-09-11T12:00:00.000Z');
  assert.equal(session.expires_at, '2026-09-11T12:30:00.000Z');
});

test('identifies expired sessions and resets only conversational state', () => {
  assert.equal(isSessionExpired({ expires_at: '2026-09-11T11:59:59.999Z' }, now), true);
  assert.equal(isSessionExpired({ expires_at: '2026-09-11T12:00:00.001Z' }, now), false);

  const reset = buildExpiredSessionReset(now, 30);
  assert.equal(reset.current_intent, 'idle');
  assert.equal(reset.current_stage, null);
  assert.deepEqual(reset.context, {});
  assert.equal(reset.expires_at, '2026-09-11T12:30:00.000Z');
  assert.equal('profile_id' in reset, false);
});

test('uses the configured positive TTL and falls back safely when invalid', () => {
  assert.equal(resolveSessionTtlMinutes('45'), 45);
  assert.equal(resolveSessionTtlMinutes('0'), 30);
  assert.equal(resolveSessionTtlMinutes('not-a-number'), 30);
  assert.deepEqual(buildSessionActivity(now, 45), {
    updated_at: '2026-09-11T12:00:00.000Z',
    last_message_at: '2026-09-11T12:00:00.000Z',
    expires_at: '2026-09-11T12:45:00.000Z',
  });
});
