-- Tabella impostazioni diocesi
CREATE TABLE IF NOT EXISTS impostazioni_diocesi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_diocesi VARCHAR(200),
    vescovo_nome VARCHAR(200),
    vescovo_titolo VARCHAR(100) DEFAULT 'Vescovo',
    logo_path TEXT,
    logo_nome VARCHAR(255),
    logo_dimensione INTEGER,
    timbro_path TEXT,
    timbro_nome VARCHAR(255),
    timbro_dimensione INTEGER,
    firma_path TEXT,
    firma_nome VARCHAR(255),
    firma_dimensione INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);