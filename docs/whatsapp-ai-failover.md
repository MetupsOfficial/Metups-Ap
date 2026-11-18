# WhatsApp AI provider pool

The WhatsApp Worker uses a single provider-agnostic router. Webhook, search,
session, and formatter code call task wrappers only; they do not import a
provider implementation.

## Candidate model slots

The following slots are built into the router. A slot is inactive until every
required environment value is present, so adding this code does not send any
traffic or incur any provider cost by itself.

| # | Provider result label | Configuration required |
|---:|---|---|
| 1 | `local_llama` | `LOCAL_AI_BASE_URL`, `LOCAL_AI_API_KEY`, `LOCAL_AI_MODEL` |
| 2 | `cloudflare_workers_ai_glm` | Workers AI binding and `WORKERS_AI_GLM_MODEL` |
| 3 | `cloudflare_workers_ai_gemma` | Workers AI binding and `WORKERS_AI_GEMMA_MODEL` |
| 4 | `groq_fast` | `GROQ_BASE_URL`, `GROQ_API_KEY`, `GROQ_FAST_MODEL` |
| 5 | `groq_reasoning` | `GROQ_BASE_URL`, `GROQ_API_KEY`, `GROQ_REASONING_MODEL` |
| 6 | `gemini` | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| 7 | `mistral_fast` | `MISTRAL_BASE_URL`, `MISTRAL_API_KEY`, `MISTRAL_FAST_MODEL` |
| 8 | `mistral_strong` | `MISTRAL_BASE_URL`, `MISTRAL_API_KEY`, `MISTRAL_STRONG_MODEL` |
| 9 | `openai_fast` | `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_FAST_MODEL` |
| 10 | `openai_nano` | `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_NANO_MODEL` |
| 11 | `cerebras_fast` | `CEREBRAS_BASE_URL`, `CEREBRAS_API_KEY`, `CEREBRAS_FAST_MODEL` |

The external-provider base URLs are OpenAI-compatible API roots: include the
provider API version, but do not include `/chat/completions`. API keys must be
Cloudflare Worker secrets. Model names and timeouts are non-secret Worker vars.

## Failover policy

For buyer search and conversation tasks, the router tries enabled providers in
the table order. It never calls multiple providers in parallel for the same
buyer message.

- HTTP 429 and 503 receive one 200 ms delayed retry if the 12-second router
  budget still permits it.
- A second consecutive transient failure opens that provider's circuit for 30
  seconds in the current Worker isolate. During the cooldown it is skipped.
- Authentication/configuration failures, malformed JSON, and timeouts do not
  receive a retry. The router immediately proceeds to the next provider.
- Gemini remains the only configured image-analysis provider. Buyer WhatsApp
  discovery does not currently use image analysis.
- If every enabled provider fails, existing webhook behavior returns the
  deterministic helpful fallback rather than failing the Meta webhook.

Provider availability is deliberately in-memory at this stage. The existing
observability migration can aggregate provider outcomes; persistent provider
health/quota coordination should only be added after real traffic establishes
the appropriate thresholds.

## Adding a provider safely

1. Add its values locally to `backend/.dev.vars` and verify it with the
   development AI test endpoint.
2. Add the API key with `npx wrangler secret put <NAME> --env production`.
3. Add non-secret base URL, model, and timeout variables to the production
   Worker configuration.
4. Run a small capacity test. Confirm its provider label appears in output.
5. Deploy only after the test and existing WhatsApp flows pass.

Do not place an API key in `wrangler.jsonc`, source code, browser code, or a
Supabase table.
