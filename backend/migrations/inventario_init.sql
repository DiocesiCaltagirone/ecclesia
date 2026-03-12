-- ============================================
-- INVENTARIO — Migration iniziale
-- EcclesiaWeb — Diocesi di Caltagirone
-- 12/03/2026
-- ============================================

-- Crea tabella migrations_history se non esiste
CREATE TABLE IF NOT EXISTS migrations_history (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255),
    executed_at TIMESTAMP DEFAULT NOW()
);

-- Verifica se migration già eseguita
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM migrations_history WHERE migration_name = 'inventario_init') THEN
        RAISE EXCEPTION 'Migration inventario_init già eseguita';
    END IF;
END $$;

-- ============================================
-- 1. TABELLA inventario_categorie
-- ============================================
CREATE TABLE IF NOT EXISTS inventario_categorie (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ente_id UUID NOT NULL REFERENCES enti(id),
    nome VARCHAR(100) NOT NULL,
    descrizione TEXT,
    ordine INTEGER DEFAULT 0,
    attivo BOOLEAN DEFAULT TRUE,
    is_sistema BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inventario_categorie_ente ON inventario_categorie(ente_id);

-- ============================================
-- 2. TABELLA inventario_ubicazioni
-- ============================================
CREATE TABLE IF NOT EXISTS inventario_ubicazioni (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ente_id UUID NOT NULL REFERENCES enti(id),
    nome VARCHAR(100) NOT NULL,
    descrizione TEXT,
    ordine INTEGER DEFAULT 0,
    attivo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inventario_ubicazioni_ente ON inventario_ubicazioni(ente_id);

-- ============================================
-- 3. TABELLA inventario_registri
-- (creata PRIMA di beni_inventario perché referenziata)
-- ============================================
CREATE TABLE IF NOT EXISTS inventario_registri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ente_id UUID NOT NULL REFERENCES enti(id),
    numero_registro INTEGER NOT NULL,
    anno INTEGER NOT NULL,
    data_generazione TIMESTAMP DEFAULT NOW(),
    totale_beni INTEGER,
    pdf_path VARCHAR(500),
    note TEXT,
    generato_da UUID REFERENCES utenti(id),
    created_at TIMESTAMP DEFAULT NOW()
    -- NESSUN updated_at — immutabile
);

CREATE INDEX idx_inventario_registri_ente ON inventario_registri(ente_id);

-- ============================================
-- 4. TABELLA beni_inventario
-- ============================================
CREATE TABLE IF NOT EXISTS beni_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ente_id UUID NOT NULL REFERENCES enti(id),
    numero_progressivo INTEGER NOT NULL,
    categoria_id UUID REFERENCES inventario_categorie(id),
    ubicazione_id UUID REFERENCES inventario_ubicazioni(id),

    -- Dati principali
    descrizione VARCHAR(500) NOT NULL,
    quantita INTEGER DEFAULT 1,
    provenienza TEXT,
    stato_conservazione VARCHAR(20),  -- ottimo/buono/discreto/restauro/scadente
    valore_stimato DECIMAL(12,2),
    valore_assicurato DECIMAL(12,2),
    data_acquisto DATE,
    fornitore VARCHAR(200),

    -- Dati culturali CEI (opzionali)
    codice_regione VARCHAR(50),
    numero_catalogo_generale VARCHAR(50),
    codice_ente_competente VARCHAR(50),

    -- Note
    note TEXT,
    note_storiche TEXT,

    -- Stato
    stato VARCHAR(20) DEFAULT 'attivo',  -- attivo / rimosso
    bloccato BOOLEAN DEFAULT FALSE,
    registro_id UUID REFERENCES inventario_registri(id),

    -- Rimozione (soft delete → storico)
    data_rimozione DATE,
    motivo_rimozione VARCHAR(50),
    note_rimozione TEXT,
    rimosso_da UUID REFERENCES utenti(id),
    rimosso_at TIMESTAMP,

    -- Audit
    created_by UUID REFERENCES utenti(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES utenti(id),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Vincoli
    UNIQUE(ente_id, numero_progressivo)
);

CREATE INDEX idx_beni_inventario_ente ON beni_inventario(ente_id);
CREATE INDEX idx_beni_inventario_categoria ON beni_inventario(categoria_id);
CREATE INDEX idx_beni_inventario_ubicazione ON beni_inventario(ubicazione_id);
CREATE INDEX idx_beni_inventario_stato ON beni_inventario(stato);

-- ============================================
-- 5. TABELLA inventario_foto
-- ============================================
CREATE TABLE IF NOT EXISTS inventario_foto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bene_id UUID NOT NULL REFERENCES beni_inventario(id) ON DELETE CASCADE,
    ente_id UUID NOT NULL REFERENCES enti(id),
    nome_file VARCHAR(255) NOT NULL,
    path_file VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    dimensione INTEGER,
    ordine INTEGER DEFAULT 0,
    didascalia TEXT,
    uploaded_by UUID REFERENCES utenti(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inventario_foto_bene ON inventario_foto(bene_id);

-- ============================================
-- 6. TABELLA inventario_storico
-- ============================================
CREATE TABLE IF NOT EXISTS inventario_storico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ente_id UUID NOT NULL REFERENCES enti(id),
    bene_id UUID,
    numero_progressivo INTEGER,
    snapshot_bene JSONB NOT NULL,
    snapshot_foto JSONB,
    data_rimozione DATE NOT NULL,
    motivo_rimozione VARCHAR(50) NOT NULL,
    note_rimozione TEXT,
    registro_era_generato BOOLEAN,
    rimosso_da UUID REFERENCES utenti(id),
    rimosso_at TIMESTAMP DEFAULT NOW()
    -- NESSUN updated_at — immutabile
);

CREATE INDEX idx_inventario_storico_ente ON inventario_storico(ente_id);

-- ============================================
-- 7. SEED — Categorie predefinite per ogni ente
-- ============================================
INSERT INTO inventario_categorie (ente_id, nome, ordine, is_sistema)
SELECT e.id, c.nome, c.ordine, TRUE
FROM enti e
CROSS JOIN (VALUES
    ('Vasi sacri', 1),
    ('Paramenti liturgici', 2),
    ('Arredi sacri', 3),
    ('Statue e sculture', 4),
    ('Quadri e opere d''arte', 5),
    ('Reliquiari e ostensori', 6),
    ('Croci e crocifissi', 7),
    ('Candelabri', 8),
    ('Campane', 9),
    ('Libri liturgici e manoscritti', 10),
    ('Strumenti musicali', 11),
    ('Impianti (audio, luci, riscaldamento)', 12),
    ('Attrezzature informatiche', 13),
    ('Immobili e terreni', 14),
    ('Veicoli', 15),
    ('Archivio storico', 16),
    ('Altro', 17)
) AS c(nome, ordine);

-- ============================================
-- 8. SEED — Ubicazioni predefinite per ogni ente
-- ============================================
INSERT INTO inventario_ubicazioni (ente_id, nome, ordine)
SELECT e.id, u.nome, u.ordine
FROM enti e
CROSS JOIN (VALUES
    ('Chiesa principale', 1),
    ('Sagrestia', 2),
    ('Cappella laterale', 3),
    ('Canonica', 4),
    ('Oratorio/Salone', 5),
    ('Archivio', 6),
    ('Deposito', 7),
    ('Esterno/Giardino', 8),
    ('Altra ubicazione', 9)
) AS u(nome, ordine);

-- ============================================
-- Registra migration
-- ============================================
INSERT INTO migrations_history (migration_name) VALUES ('inventario_init');
