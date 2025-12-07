-- ============================================
-- MIGRATION 005: Nuovi stati rendiconti
-- ============================================
-- Stati: parrocchia, definitivo, inviato, approvato, respinto

-- 1. Aggiorna eventuali 'bozza' esistenti a 'parrocchia'
UPDATE rendiconti SET stato = 'parrocchia' WHERE stato = 'bozza';

-- 2. Aggiorna eventuali 'in_revisione' esistenti a 'inviato'
UPDATE rendiconti SET stato = 'inviato' WHERE stato = 'in_revisione';

-- 3. Verifica che il campo motivo_respingimento esista (già presente)
-- 4. Verifica che il campo allegato_economo_path esista (già presente)

-- 5. Aggiungi campo per tipo ente se non esiste
ALTER TABLE enti ADD COLUMN IF NOT EXISTS tipo_ente VARCHAR(50) DEFAULT 'parrocchia';

-- Fine migration