ALTER TABLE rendiconti_allegati ADD COLUMN IF NOT EXISTS filename VARCHAR(255);
ALTER TABLE rendiconti_allegati ADD COLUMN IF NOT EXISTS filepath VARCHAR(500);
ALTER TABLE rendiconti_allegati ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE rendiconti_allegati ADD COLUMN IF NOT EXISTS file_size INTEGER;

UPDATE rendiconti_allegati SET filename = nome_file WHERE filename IS NULL;
UPDATE rendiconti_allegati SET filepath = path_file WHERE filepath IS NULL;
UPDATE rendiconti_allegati SET file_size = dimensione_kb WHERE file_size IS NULL;

ALTER TABLE rendiconti_allegati ALTER COLUMN path_file DROP NOT NULL;
ALTER TABLE rendiconti_allegati ALTER COLUMN nome_file DROP NOT NULL;
