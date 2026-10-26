-- Stripe eventi koje smo primili: isti event se nikad ne obrađuje dvaput
CREATE TABLE stripe_events (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Svaka uspešna naplata iz funnela: Studio kupovina ili Lab naplata
CREATE TABLE orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  kind            TEXT NOT NULL,           -- studio | lab
  stripe_ref      TEXT NOT NULL UNIQUE,    -- checkout session ID (studio) ili invoice ID (lab)
  payment_intent  TEXT,
  customer_id     TEXT,
  subscription_id TEXT,
  email           TEXT NOT NULL,
  name            TEXT,
  amount_cents    INTEGER NOT NULL,
  currency        TEXT NOT NULL,
  price_type      TEXT,                    -- studio_launch | studio_regular | studio_lead | lab_monthly
  bump            INTEGER NOT NULL DEFAULT 0,
  buyer_no        INTEGER,                 -- redni broj Studio kupca (radionica za prvih N)
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  utm_term        TEXT,
  fbclid          TEXT,
  ph_id           TEXT,                    -- PostHog ID posetioca
  status          TEXT NOT NULL DEFAULT 'paid', -- paid | disputed
  woo_order_id    INTEGER,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX orders_email ON orders (email);

-- Koraci isporuke po porudžbini (circle, mailerlite, welcome, woo, analytics, notify)
CREATE TABLE delivery_steps (
  order_id   INTEGER NOT NULL REFERENCES orders (id),
  step       TEXT NOT NULL,
  status     TEXT NOT NULL,               -- done | failed
  attempts   INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (order_id, step)
);

-- One-click upsell: jedan pokušaj po checkout sesiji
CREATE TABLE upsells (
  session_id      TEXT PRIMARY KEY,
  subscription_id TEXT,
  status          TEXT NOT NULL,          -- processing | succeeded | requires_action | declined
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
