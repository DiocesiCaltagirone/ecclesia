-- Migration 004: Rimuove constraint tipo su registri_contabili
-- Permette qualsiasi tipo di conto (non solo cassa, banca, postale)

ALTER TABLE registri_contabili DROP CONSTRAINT IF EXISTS registri_contabili_tipo_check;