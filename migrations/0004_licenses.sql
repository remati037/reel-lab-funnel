-- Licenca za Reel Lab plugin. Licencu ima mejl koji je platio Studio (orders, kind = 'studio', status = 'paid')
-- ili mejl koji je ručno dodat ovde (tim, testeri, poklon). Chargeback menja status porudžbine u 'disputed',
-- pa licenca prestaje sama, bez posebnog koraka.
CREATE TABLE license_grants (
  email      TEXT PRIMARY KEY,
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Jednokratni kod koji stiže na mejl pri aktivaciji. Čuva se samo heš koda.
CREATE TABLE license_codes (
  email      TEXT PRIMARY KEY,
  code_hash  TEXT NOT NULL,
  expires_at INTEGER NOT NULL,             -- ms
  attempts   INTEGER NOT NULL DEFAULT 0,   -- pogrešnih unosa za ovaj kod
  sent       INTEGER NOT NULL DEFAULT 1,   -- koliko kodova je poslato u tekućem satu
  window_at  INTEGER NOT NULL              -- početak tekućeg sata (ms), za limit slanja
);

-- Računari na kojima je licenca aktivirana. Čuva se samo heš tokena koji plugin drži na računaru.
CREATE TABLE license_devices (
  email        TEXT NOT NULL,
  device_id    TEXT NOT NULL,              -- heš ID-a računara (plugin ga računa, ne šalje sirov)
  device_name  TEXT,
  token_hash   TEXT NOT NULL UNIQUE,
  activated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (email, device_id)
);
