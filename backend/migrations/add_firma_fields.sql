-- ============================================
-- MIGRATION: Aggiungi campi per firme vescovo
-- ============================================

ALTER TABLE rendiconti
ADD COLUMN IF NOT EXISTS parroco_nome VARCHAR(200),
ADD COLUMN IF NOT EXISTS firma_vescovo_path TEXT,
ADD COLUMN IF NOT EXISTS timbro_diocesi_path TEXT,
ADD COLUMN IF NOT EXISTS vescovo_nome VARCHAR(200),
ADD COLUMN IF NOT EXISTS luogo_firma VARCHAR(100) DEFAULT 'Caltagirone',
ADD COLUMN IF NOT EXISTS pdf_path TEXT,
ADD COLUMN IF NOT EXISTS pdf_firmato_path TEXT,
ADD COLUMN IF NOT EXISTS motivo_respingimento TEXT,
ADD COLUMN IF NOT EXISTS data_respingimento TIMESTAMP,
ADD COLUMN IF NOT EXISTS respinto_da UUID REFERENCES utenti(id);

ALTER TABLE enti
ADD COLUMN IF NOT EXISTS vescovo VARCHAR(200);