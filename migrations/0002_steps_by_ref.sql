-- Koraci isporuke se vezuju za Stripe referencu (sesija, faktura, pretplata, spor),
-- ne samo za porudžbinu, jer otkazivanje i chargeback nemaju svoju porudžbinu.
CREATE TABLE steps (
  ref        TEXT NOT NULL,
  step       TEXT NOT NULL,
  status     TEXT NOT NULL,               -- done | failed
  attempts   INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (ref, step)
);

INSERT INTO steps (ref, step, status, attempts, last_error, updated_at)
SELECT o.stripe_ref, d.step, d.status, d.attempts, d.last_error, d.updated_at
FROM delivery_steps d JOIN orders o ON o.id = d.order_id;

DROP TABLE delivery_steps;

-- Upsell pamti i Stripe kupca i mejl, da invoice.paid zna kojoj sesiji pripada
ALTER TABLE upsells ADD COLUMN email TEXT;

-- Za Lab naplate: koji je mesec pretplate (1 = prvi mesec od 1€)
ALTER TABLE orders ADD COLUMN lab_month INTEGER;
