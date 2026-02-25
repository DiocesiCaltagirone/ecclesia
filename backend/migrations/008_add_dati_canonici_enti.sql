-- ============================================
-- MIGRATION: Aggiunge dati canonici per rendiconto
-- ============================================

-- Aggiungi campi dati parrocchia
ALTER TABLE enti 
ADD COLUMN IF NOT EXISTS data_erezione_canonica DATE,
ADD COLUMN IF NOT EXISTS data_riconoscimento_civile DATE,
ADD COLUMN IF NOT EXISTS registro_pg VARCHAR(50);

-- Aggiungi campi dati parroco
ALTER TABLE enti
ADD COLUMN IF NOT EXISTS parroco_nato_a VARCHAR(100),
ADD COLUMN IF NOT EXISTS parroco_nato_il DATE,
ADD COLUMN IF NOT EXISTS parroco_nominato_il DATE,
ADD COLUMN IF NOT EXISTS parroco_possesso_canonico_il DATE;

-- Aggiungi campo vicario
ALTER TABLE enti
ADD COLUMN IF NOT EXISTS vicario_nominato_il DATE;

-- Verifica campi aggiunti
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'enti' 
AND column_name IN (
    'data_erezione_canonica',
    'data_riconoscimento_civile', 
    'registro_pg',
    'parroco_nato_a',
    'parroco_nato_il',
    'parroco_nominato_il',
    'parroco_possesso_canonico_il',
    'vicario_nominato_il'
)
ORDER BY column_name;