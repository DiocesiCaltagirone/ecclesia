ALTER TABLE movimenti_allegati
ADD COLUMN IF NOT EXISTS nome_originale VARCHAR(255);

UPDATE movimenti_allegati
SET nome_originale = nome_file
WHERE nome_originale IS NULL;
