#!/usr/bin/env node
/**
 * Controlled development-only AI capacity probe.
 *
 * It calls /__dev/ai-test directly, so it never invokes the WhatsApp webhook,
 * creates no marketplace data, and sends no WhatsApp messages. The default is
 * intentionally small; increase --max only after reviewing each run.
 */
import { readFileSync } from 'node:fs';

const NORMAL_BUYER_MESSAGES = [
  'I am looking for a reliable phone for school in Harare and I can spend about $150.',
  'Could you help me find a second-hand fridge in Bulawayo for under $120?',
  'I need a laptop for university around $300 in Harare.',
  'Please help me look for a sofa in Mutare. My budget is $180.',
  'I want a washing machine in Gweru, ideally below $200.',
];

const options = parseArgs(process.argv.slice(2));
const variables = loadDevVariables(options.varsFile);
const url = options.url ?? variables.AI_TEST_URL ?? 'http://127.0.0.1:8787';
const token = process.env.DEV_AI_TEST_TOKEN ?? variables.DEV_AI_TEST_TOKEN;

if (!token) {
  throw new Error('DEV_AI_TEST_TOKEN is required in the environment or .dev.vars');
}

const endpoint = `${url.replace(/\/+$/, '')}/__dev/ai-test`;
const startedAt = Date.now();
const results = [];
let nextIndex = 0;
let stop = false;

async function runWorker() {
  while (!stop) {
    const index = nextIndex;
    nextIndex += 1;
    if (index >= options.max) return;

    const result = await sendProbe(index);
    results.push(result);
    printProgress(result, index + 1, options.max);

    // A non-2xx response, an unknown provider result, or an explicitly
    // configured failure threshold ends the run instead of burning quota.
    if (!result.ok || result.provider === 'none' || results.filter(item => !item.ok).length >= options.maxFailures) {
      stop = true;
      return;
    }
    if (options.delayMs > 0) await delay(options.delayMs);
  }
}

await Promise.all(Array.from({ length: options.concurrency }, runWorker));
printSummary({ endpoint, options, results, durationMs: Date.now() - startedAt });

async function sendProbe(index) {
  const message = NORMAL_BUYER_MESSAGES[index % NORMAL_BUYER_MESSAGES.length];
  const started = Date.now();
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-metups-dev-token': token,
      },
      body: JSON.stringify({ message }),
    });
    const body = await response.json().catch(() => ({}));
    const provider = typeof body?.result?.provider === 'string' ? body.result.provider : null;
    return {
      ok: response.ok && body?.ok === true && provider !== 'none',
      status: response.status,
      provider: provider ?? 'unknown',
      intent: typeof body?.result?.intent === 'string' ? body.result.intent : 'unknown',
      durationMs: Date.now() - started,
      error: response.ok ? null : compactError(body),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      provider: 'unavailable',
      intent: 'unknown',
      durationMs: Date.now() - started,
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

function parseArgs(args) {
  const options = { max: 20, concurrency: 1, delayMs: 250, maxFailures: 1, url: null, varsFile: '.dev.vars' };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    const next = args[index + 1];
    if (value === '--max') { options.max = positiveInteger(next, '--max'); index += 1; }
    else if (value === '--concurrency') { options.concurrency = positiveInteger(next, '--concurrency'); index += 1; }
    else if (value === '--delay-ms') { options.delayMs = nonNegativeInteger(next, '--delay-ms'); index += 1; }
    else if (value === '--max-failures') { options.maxFailures = positiveInteger(next, '--max-failures'); index += 1; }
    else if (value === '--url') { options.url = requiredString(next, '--url'); index += 1; }
    else if (value === '--vars-file') { options.varsFile = requiredString(next, '--vars-file'); index += 1; }
    else if (value === '--help') {
      console.log('Usage: node scripts/ai-load-test.js [--url URL] [--max 20] [--concurrency 1] [--delay-ms 250] [--max-failures 1]');
      process.exit(0);
    } else throw new Error(`Unknown argument: ${value}`);
  }
  return options;
}

function loadDevVariables(file) {
  try {
    return Object.fromEntries(readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter(line => /^[A-Z][A-Z0-9_]*=/.test(line))
      .map(line => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }));
  } catch (error) {
    if (error?.code === 'ENOENT') return {};
    throw error;
  }
}

function printProgress(result, current, max) {
  const status = result.ok ? 'ok' : 'failed';
  console.log(`${current}/${max} ${status} status=${result.status} provider=${result.provider} intent=${result.intent} latency_ms=${result.durationMs}${result.error ? ` error=${result.error}` : ''}`);
}

function printSummary({ endpoint, options, results, durationMs }) {
  const successes = results.filter(result => result.ok);
  const failures = results.filter(result => !result.ok);
  const byProvider = Object.fromEntries([...new Set(results.map(result => result.provider))].map(provider => [
    provider,
    results.filter(result => result.provider === provider).length,
  ]));
  const latencies = successes.map(result => result.durationMs).sort((left, right) => left - right);
  const percentile = ratio => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor((latencies.length - 1) * ratio))] : null;

  console.log(JSON.stringify({
    endpoint,
    requested: options.max,
    attempted: results.length,
    successes: successes.length,
    failures: failures.length,
    providerCounts: byProvider,
    latencyMs: { p50: percentile(0.5), p95: percentile(0.95), max: latencies.at(-1) ?? null },
    stoppedEarly: results.length < options.max,
    durationMs,
    firstFailure: failures[0] ?? null,
  }, null, 2));
}

function compactError(body) {
  const message = typeof body?.error === 'string' ? body.error : 'HTTP request failed';
  return message.replace(/\s+/g, ' ').slice(0, 240);
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

function nonNegativeInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer`);
  return parsed;
}

function requiredString(value, name) {
  if (!value?.trim()) throw new Error(`${name} requires a value`);
  return value.trim();
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
