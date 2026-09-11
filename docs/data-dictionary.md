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

## `whatsapp_sessions`

One row exists per WhatsApp phone number. Stage 2 makes it the durable conversational-memory record.

| Field | Meaning |
| --- | --- |
| `profile_id` | Optional linked Metups profile; preserved on session expiry. |
| `current_intent` | Current conversation intent; reset to `idle` after expiry. |
| `current_stage` | The pending step within that intent. |
| `context` | Only the data needed by the next conversation step. |
| `last_message_at` | Last accepted inbound-message time. |
| `expires_at` | Rolling session expiration; extended on every inbound message. |

The old `stage` field remains temporarily for compatibility, but new code reads and writes `current_stage`.
