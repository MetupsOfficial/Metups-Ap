-- WhatsApp message intake: one row per Meta message ID and one active session per phone.
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  stage text NOT NULL DEFAULT 'idle',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsappmessages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL UNIQUE,
  phone text NOT NULL,
  message_timestamp timestamptz NOT NULL,
  request_id text,
  text text NOT NULL DEFAULT '',
  type text NOT NULL CHECK (type IN ('text', 'image', 'interactive', 'button', 'unknown')),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Safe upgrades for the already-deployed Stage 1 table.
ALTER TABLE whatsappmessages ADD COLUMN IF NOT EXISTS request_id text;
ALTER TABLE whatsappmessages ADD COLUMN IF NOT EXISTS content jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE whatsappmessages DROP CONSTRAINT IF EXISTS whatsappmessages_type_check;
ALTER TABLE whatsappmessages
  ADD CONSTRAINT whatsappmessages_type_check
  CHECK (type IN ('text', 'image', 'interactive', 'button', 'unknown'));

CREATE TABLE IF NOT EXISTS whatsapp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL,
  phone text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('message_received', 'error')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsappmessages_phone_timestamp_idx ON whatsappmessages (phone, message_timestamp DESC);
CREATE INDEX IF NOT EXISTS whatsapp_events_request_id_idx ON whatsapp_events (request_id);
CREATE INDEX IF NOT EXISTS whatsapp_events_phone_created_at_idx ON whatsapp_events (phone, created_at DESC);

ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsappmessages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_events ENABLE ROW LEVEL SECURITY;
