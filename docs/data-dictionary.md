# WhatsApp data dictionary

## Stage 1 intake records

`whatsappmessages` is the existing durable inbound-message table. One row is stored per Meta `message_id`; its unique constraint is the replay and retry guard.

| Field | Meaning |
| --- | --- |
| `request_id` | Worker correlation ID for the webhook delivery. |
| `message_id` | Meta's immutable inbound message ID. |
| `phone` | Sender's WhatsApp phone identifier, stored without display formatting. |
| `message_timestamp` | Timestamp supplied by Meta, normalized to UTC. |
| `type` | `text`, `image`, `interactive`, `button`, or `unknown`. |
| `text` | The usable text, caption, or reply title. |
| `content` | Type-specific metadata, such as image media ID or reply ID. |

`whatsapp_events` is append-only operational telemetry. Stage 1 writes `message_received` after a message is durably stored. It stores identifiers and type metadata, not the full raw webhook body.

`whatsapp_sessions` remains the existing one-row-per-phone session anchor. Stage 2 will extend it with intent, state, context, and expiry.
