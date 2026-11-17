# WhatsApp buyer-discovery milestones

Last updated: 2026-11-17 (Africa/Harare)

The WhatsApp feature is a buyer-discovery interface. Sellers create and manage
products, photos, and accounts in the existing Metups website.

| Milestone | Scope | Implementation status | Live validation status | Gate to advance |
|---|---|---|---|---|
| M1 — Infrastructure | Webhook verification, inbound persistence, Worker secrets | Implemented | Blocked by Meta outbound display-name approval | Meta approves the sending number; receive a real reply |
| M2 — Buyer understanding | Session memory, targeted search clarifications, and AI intent classification | Implemented | Local end-to-end classification passed; live reply blocked by Meta | Test 20 real buyer messages, including short answers to location questions, after approval |
| M3 — Buyer search | Shared catalogue search, conversational formatting, refinement, incremental unseen results | Implemented | Local integration tests passed; live reply blocked by Meta | Run 15 real searches, including pagination to exhaustion and zero-result alternatives, after approval |
| M4 — Seller publication | WhatsApp listing creation | Intentionally out of scope | Not applicable | Sellers use the website listing flow only |
| M5 — Buyer contact | Product selection, direct seller WhatsApp link, website product/chat link | Implemented | Awaiting real outbound WhatsApp test | One buyer contacts one seller successfully |
| M6 — Trust and visibility | Shared flags, source metadata, audit trail, WhatsApp admin activity | Implemented | Admin migration/dashboard should be checked in production | Moderate one WhatsApp report in the normal flags queue |
| M7 — Safety and measurement | Per-phone rate limiting, trust signals, provider-agnostic event metrics, buyer scenario tests | Implemented in code | Rate-limit, Stage 11 and Stage 13 migrations plus live usage review pending | Validate limit behavior and review one week of metrics |
| M8 — Soft launch | Small buyer group uses the approved number | Not started | Not started | Complete M1–M7 live validation |

## Current next action

Obtain Meta display-name approval for the production sending number, deploy the
current Worker, then run the M1–M5 buyer flow with real WhatsApp users:

1. Search for a product.
2. Start with an incomplete request such as “I need a fridge”; verify the bot asks for the town naturally and accepts “Harare” or “Harare under $100”.
3. Request more results until the current matching set is exhausted; verify no listing repeats.
4. Refine results, then confirm a changed filter starts a fresh result set.
5. Verify zero-result and exhausted-result replies offer a higher budget, another town, or another product.
6. Select a product from the latest batch.
7. Open the seller's direct WhatsApp link or the website product page.
8. Submit one report, including after an exhausted result set, and confirm it appears in the existing admin flags queue.

## Pending deployment note

Run `database/migrations/whatsapp_stage10_rate_limit.sql` before deploying the
rate-limit Worker revision, then run
`database/migrations/whatsapp_stage11_observability.sql`, then run
`database/migrations/whatsapp_stage13_provider_agnostic_observability.sql`.
Stage 13 updates dashboard metrics for the local AI provider and Gemini
fallback. Do not run the withdrawn WhatsApp listing-safety migration; seller
uploads are no longer part of the WhatsApp feature.
