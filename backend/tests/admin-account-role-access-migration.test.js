import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('admin access migration requires a normal authenticated account and prevents self-promotion', async () => {
  const sql = await readFile(new URL('../../database/migrations/admin_account_role_access.sql', import.meta.url), 'utf8');

  assert.match(sql, /ADD COLUMN IF NOT EXISTS role text/i);
  assert.match(sql, /CHECK \(role IN \('user', 'admin'\)\)/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public\.profiles/i);
  assert.match(sql, /admin_issue_session_from_account/i);
  assert.match(sql, /IF auth\.uid\(\) IS NULL THEN/i);
  assert.match(sql, /v_profile\.role <> 'admin'/i);
  assert.match(sql, /role = public\.current_account_role\(\)/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.admin_login/i);
});
