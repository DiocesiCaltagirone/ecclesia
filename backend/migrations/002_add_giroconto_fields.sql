-- ============================================
-- MIGRATION: Aggiungi campo collegamento giroconti
-- Data: 2025-12-02
-- ============================================

-- Colonna per collegare i due movimenti di un giroconto
ALTER TABLE movimenti_contabili
ADD COLUMN IF NOT EXISTS giroconto_collegato_id UUID REFERENCES movimenti_contabili(id) ON DELETE SET NULL;

-- Indice per performance
CREATE INDEX IF NOT EXISTS idx_movimenti_giroconto_collegato 
ON movimenti_contabili(giroconto_collegato_id) 
WHERE giroconto_collegato_id IS NOT NULL;