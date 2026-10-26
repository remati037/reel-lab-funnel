-- Da li je Circle nalog napravljen pri ovoj kupovini (tada welcome mejl nosi lozinku)
ALTER TABLE orders ADD COLUMN circle_new INTEGER NOT NULL DEFAULT 0;
