ALTER TABLE movimenti_allegati ADD COLUMN IF NOT EXISTS nome_originale VARCHAR(255);
ALTER TABLE movimenti_allegati ADD COLUMN IF NOT EXISTS percorso VARCHAR(500);

UPDATE movimenti_allegati SET nome_originale = nome_file WHERE nome_originale IS NULL;
UPDATE movimenti_allegati SET percorso = nome_file WHERE percorso IS NULL;
