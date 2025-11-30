-- ============================================
-- PARROCCHIA APP - Schema Database Completo
-- Moduli: Anagrafica, Sacramenti, Contabilità, Inventario
-- ============================================

-- Estensioni PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELLE MULTI-TENANCY (Sistema Base)
-- ============================================

-- Tabella Enti (Parrocchie/Diocesi)
CREATE TABLE IF NOT EXISTS enti (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(50) NOT NULL DEFAULT 'Parrocchia',
    denominazione VARCHAR(255) NOT NULL,
    codice_fiscale VARCHAR(16),
    partita_iva VARCHAR(11),
    indirizzo VARCHAR(255),
    cap VARCHAR(10),
    frazione VARCHAR(100),
    comune VARCHAR(100),
    provincia VARCHAR(2),
    regione VARCHAR(100),
    telefono VARCHAR(20),
    fax VARCHAR(20),
    email VARCHAR(100),
    sito_web VARCHAR(200),
    parroco VARCHAR(200),
    vicario VARCHAR(200),
    diocesi VARCHAR(200),
    diocesi_id UUID REFERENCES enti(id),
    anno_fondazione INTEGER,
    santo_patrono VARCHAR(200),
    numero_abitanti INTEGER,
    attivo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabella Utenti
CREATE TABLE IF NOT EXISTS utenti (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    titolo VARCHAR(50),
    nome VARCHAR(100),
    cognome VARCHAR(100),
    attivo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabella relazione Utenti-Enti (Multi-tenancy)
CREATE TABLE IF NOT EXISTS utenti_enti (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utente_id UUID REFERENCES utenti(id) ON DELETE CASCADE,
    ente_id UUID REFERENCES enti(id) ON DELETE CASCADE,
    ruolo VARCHAR(50) DEFAULT 'operatore',
    permessi JSONB DEFAULT '{"anagrafica": true, "contabilita": false, "inventario": false}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(utente_id, ente_id)
);

-- ============================================
-- MODULO ANAGRAFICA
-- ============================================

-- Tabella Persone
CREATE TABLE IF NOT EXISTS persone (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ente_id UUID NOT NULL REFERENCES enti(id) ON DELETE CASCADE,
    
    -- Dati anagrafici base
    cognome VARCHAR(100) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    secondo_nome VARCHAR(100),
    sesso CHAR(1) CHECK (sesso IN ('M', 'F')),
    data_nascita DATE,
    luogo_nascita VARCHAR(100),
    comune_nascita VARCHAR(100),
    provincia_nascita VARCHAR(2),
    cittadinanza VARCHAR(100) DEFAULT 'Italiana',
    codice_fiscale VARCHAR(16),
    
    -- Residenza
    indirizzo VARCHAR(255),
    frazione VARCHAR(100),
    cap VARCHAR(10),
    comune VARCHAR(100),
    provincia VARCHAR(2),
    residente BOOLEAN DEFAULT true,
    
    -- Contatti
    telefono VARCHAR(20),
    cellulare VARCHAR(20),
    email VARCHAR(100),
    
    -- Dati parrocchiali
    parrocchia_appartenenza_id UUID REFERENCES enti(id),
    stato_civile VARCHAR(50),
    professione VARCHAR(100),
    titolo_studio VARCHAR(100),
    
    -- Stato
    vivente BOOLEAN DEFAULT true,
    data_morte DATE,
    
    -- Note
    note TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES utenti(id)
);

-- ============================================
-- TABELLA PARROCCHIE DIOCESI
-- Elenco completo delle parrocchie della diocesi
-- Serve come riferimento per inserimenti guidati
-- ============================================
CREATE TABLE IF NOT EXISTS parrocchie_diocesi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comune VARCHAR(100) NOT NULL,
    denominazione VARCHAR(200) NOT NULL,
    provincia VARCHAR(2),
    cap VARCHAR(5),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indice per ricerca veloce per comune
CREATE INDEX IF NOT EXISTS idx_parrocchie_diocesi_comune ON parrocchie_diocesi(comune);

CREATE INDEX idx_persone_ente ON persone(ente_id);
CREATE INDEX idx_persone_cognome ON persone(cognome);
CREATE INDEX idx_persone_nome ON persone(nome);
CREATE INDEX idx_persone_data_nascita ON persone(data_nascita);
CREATE INDEX idx_persone_comune ON persone(comune);

-- Tabella Famiglie
CREATE TABLE IF NOT EXISTS famiglie (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ente_id UUID NOT NULL REFERENCES enti(id) ON DELETE CASCADE,
    cognome VARCHAR(100),
    indirizzo VARCHAR(255),
    cap VARCHAR(10),
    comune VARCHAR(100),
    provincia VARCHAR(2),
    telefono VARCHAR(20),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Relazione Persone-Famiglie
CREATE TABLE IF NOT EXISTS persone_famiglie (
    persona_id UUID REFERENCES persone(id) ON DELETE CASCADE,
    famiglia_id UUID REFERENCES famiglie(id) ON DELETE CASCADE,
    parentela VARCHAR(50),
    ordine INT DEFAULT 0,
    PRIMARY KEY (persona_id, famiglia_id)
);

-- ============================================
-- MODULO SACRAMENTI
-- ============================================

-- Tabella Battesimi
CREATE TABLE IF NOT EXISTS battesimi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    persona_id UUID NOT NULL REFERENCES persone(id) ON DELETE CASCADE,
    ente_id UUID NOT NULL REFERENCES enti(id),
    data_battesimo DATE NOT NULL,
    luogo VARCHAR(255),
    parrocchia VARCHAR(255),
    volume VARCHAR(50),
    pagina VARCHAR(50),
    numero_atto VARCHAR(50),
    celebrante VARCHAR(255),
    padrino VARCHAR(255),
    madrina VARCHAR(255),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_battesimi_persona ON battesimi(persona_id);
CREATE INDEX idx_battesimi_data ON battesimi(data_battesimo);

-- Tabella Cresime
CREATE TABLE IF NOT EXISTS cresime (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    persona_id UUID NOT NULL REFERENCES persone(id) ON DELETE CASCADE,
    ente_id UUID NOT NULL REFERENCES enti(id),
    data_cresima DATE NOT NULL,
    luogo VARCHAR(255),
    parrocchia VARCHAR(255),
    volume VARCHAR(50),
    pagina VARCHAR(50),
    numero_atto VARCHAR(50),
    ministro VARCHAR(255),
    padrino VARCHAR(255),
    madrina VARCHAR(255),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cresime_persona ON cresime(persona_id);

-- Tabella Prime Comunioni
CREATE TABLE IF NOT EXISTS prime_comunioni (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    persona_id UUID NOT NULL REFERENCES persone(id) ON DELETE CASCADE,
    ente_id UUID NOT NULL REFERENCES enti(id),
    data_comunione DATE NOT NULL,
    luogo VARCHAR(255),
    parrocchia VARCHAR(255),
    celebrante VARCHAR(255),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabella Matrimoni
CREATE TABLE IF NOT EXISTS matrimoni (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sposo_id UUID NOT NULL REFERENCES persone(id),
    sposa_id UUID NOT NULL REFERENCES persone(id),
    ente_id UUID NOT NULL REFERENCES enti(id),
    data_matrimonio DATE NOT NULL,
    luogo VARCHAR(255),
    parrocchia VARCHAR(255),
    volume VARCHAR(50),
    pagina VARCHAR(50),
    numero_atto VARCHAR(50),
    celebrante VARCHAR(255),
    testimone1_sposo VARCHAR(255),
    testimone2_sposo VARCHAR(255),
    testimone1_sposa VARCHAR(255),
    testimone2_sposa VARCHAR(255),
    rito VARCHAR(50),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabella Defunti
CREATE TABLE IF NOT EXISTS defunti (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    persona_id UUID NOT NULL REFERENCES persone(id) ON DELETE CASCADE,
    ente_id UUID NOT NULL REFERENCES enti(id),
    data_morte DATE NOT NULL,
    luogo_morte VARCHAR(255),
    causa_morte TEXT,
    luogo_sepoltura VARCHAR(255),
    data_funerale DATE,
    celebrante VARCHAR(255),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- MODULO ATTIVITÀ PASTORALI
-- ============================================

-- Tabella Attività/Gruppi Parrocchiali
CREATE TABLE IF NOT EXISTS attivita_pastorali (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ente_id UUID REFERENCES enti(id),
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) CHECK (tipo IN ('individuale', 'familiare', 'gruppo')),
    descrizione TEXT,
    attivo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Relazione Persone-Attività
CREATE TABLE IF NOT EXISTS persone_attivita (
    persona_id UUID REFERENCES persone(id) ON DELETE CASCADE,
    attivita_id UUID REFERENCES attivita_pastorali(id) ON DELETE CASCADE,
    data_inizio DATE,
    data_fine DATE,
    incarico VARCHAR(100),
    note TEXT,
    PRIMARY KEY (persona_id, attivita_id)
);

-- ============================================
-- MODULO CONTABILITÀ
-- ============================================

-- Piano dei Conti
CREATE TABLE IF NOT EXISTS piano_conti (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ente_id UUID NOT NULL REFERENCES enti(id),
    codice VARCHAR(20) NOT NULL,
    descrizione VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) CHECK (tipo IN ('economico', 'patrimoniale')),
    categoria VARCHAR(50) CHECK (categoria IN ('entrata', 'uscita', 'attivo', 'passivo')),
    livello INT NOT NULL,
    conto_padre_id UUID REFERENCES piano_conti(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(ente_id, codice)
);

-- Registri Contabili (Cassa, Banca, ecc.)
CREATE TABLE IF NOT EXISTS registri_contabili (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ente_id UUID NOT NULL REFERENCES enti(id),
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) CHECK (tipo IN ('cassa', 'banca', 'postale')),
    iban VARCHAR(50),
    saldo_iniziale DECIMAL(10,2) DEFAULT 0,
    saldo_attuale DECIMAL(10,2) DEFAULT 0,
    attivo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Movimenti Contabili
CREATE TABLE IF NOT EXISTS movimenti_contabili (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ente_id UUID NOT NULL REFERENCES enti(id),
    registro_id UUID NOT NULL REFERENCES registri_contabili(id),
    conto_id UUID NOT NULL REFERENCES piano_conti(id),
    data_movimento DATE NOT NULL,
    numero_documento VARCHAR(50),
    causale TEXT NOT NULL,
    importo DECIMAL(10,2) NOT NULL,
    tipo VARCHAR(10) CHECK (tipo IN ('entrata', 'uscita')),
    metodo_pagamento VARCHAR(50),
    beneficiario VARCHAR(255),
    note TEXT,
    created_by UUID REFERENCES utenti(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_movimenti_data ON movimenti_contabili(data_movimento);
CREATE INDEX idx_movimenti_registro ON movimenti_contabili(registro_id);

-- ============================================
-- MODULO INVENTARIO
-- ============================================

-- Categorie Inventario
CREATE TABLE IF NOT EXISTS categorie_inventario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ente_id UUID NOT NULL REFERENCES enti(id),
    nome VARCHAR(100) NOT NULL,
    descrizione TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Beni Inventariati
CREATE TABLE IF NOT EXISTS beni_inventario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ente_id UUID NOT NULL REFERENCES enti(id),
    categoria_id UUID REFERENCES categorie_inventario(id),
    codice VARCHAR(50),
    nome VARCHAR(255) NOT NULL,
    descrizione TEXT,
    ubicazione VARCHAR(255),
    valore_acquisto DECIMAL(10,2),
    data_acquisto DATE,
    stato VARCHAR(50) CHECK (stato IN ('buono', 'discreto', 'cattivo', 'da restaurare')),
    foto_url VARCHAR(500),
    note TEXT,
    created_by UUID REFERENCES utenti(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_beni_ente ON beni_inventario(ente_id);
CREATE INDEX idx_beni_categoria ON beni_inventario(categoria_id);

-- ============================================
-- COMUNI ITALIANI (per validazione indirizzi)
-- ============================================

CREATE TABLE IF NOT EXISTS comuni (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    provincia VARCHAR(2) NOT NULL,
    cap VARCHAR(5),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_comuni_nome ON comuni(nome);
CREATE INDEX idx_comuni_provincia ON comuni(provincia);

-- ============================================
-- DATI INIZIALI
-- ============================================

-- Utente ADMIN
-- Password: admin123
INSERT INTO utenti (id, username, email, password_hash, titolo, nome, cognome, attivo)
VALUES (
    '3be779d7-f045-4b51-b201-5021bd519557',
    'admin',
    'admin@parrocchia.it',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5DWxZ3LwhZj3i',
    NULL,
    'Amministratore',
    'Sistema',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Utente PARROCO
-- Password: parroco123
INSERT INTO utenti (id, username, email, password_hash, titolo, nome, cognome, attivo)
VALUES (
    'f7c8e9d0-1234-5678-9abc-def012345678',
    'parroco',
    'parroco@santamaria.it',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5DWxZ3LwhZj3i',
    'Don',
    'Mario',
    'Rossi',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Ente: Parrocchia Santa Maria del Popolo
INSERT INTO enti (id, denominazione, comune, provincia, codice_fiscale, indirizzo, cap, telefono, email, parroco, diocesi, attivo)
VALUES (
    '97bfa19e-7384-4f36-b55e-04420dd4621a',
    'Parrocchia Santa Maria del Popolo',
    'Caltagirone',
    'CT',
    '12345678901',
    'Via Roma, 123',
    '95041',
    '0933-123456',
    'info@santamaria.it',
    'Don Mario Rossi',
    'Diocesi di Caltagirone',
    TRUE
) ON CONFLICT (id) DO UPDATE SET
    denominazione = EXCLUDED.denominazione,
    comune = EXCLUDED.comune,
    provincia = EXCLUDED.provincia,
    indirizzo = EXCLUDED.indirizzo,
    cap = EXCLUDED.cap,
    telefono = EXCLUDED.telefono,
    email = EXCLUDED.email,
    parroco = EXCLUDED.parroco,
    diocesi = EXCLUDED.diocesi;

-- Associa ADMIN all'ente (economo con tutti i permessi)
INSERT INTO utenti_enti (utente_id, ente_id, ruolo, permessi)
VALUES (
    '3be779d7-f045-4b51-b201-5021bd519557',
    '97bfa19e-7384-4f36-b55e-04420dd4621a',
    'economo',
    '{"anagrafica": true, "contabilita": true, "inventario": true}'::jsonb
) ON CONFLICT (utente_id, ente_id) DO NOTHING;

-- Associa PARROCO all'ente
INSERT INTO utenti_enti (utente_id, ente_id, ruolo, permessi)
VALUES (
    'f7c8e9d0-1234-5678-9abc-def012345678',
    '97bfa19e-7384-4f36-b55e-04420dd4621a',
    'parroco',
    '{"anagrafica": true, "contabilita": true, "inventario": false}'::jsonb
) ON CONFLICT (utente_id, ente_id) DO NOTHING;

-- Alcuni comuni di esempio
INSERT INTO comuni (nome, provincia, cap) VALUES
('Roma', 'RM', '00100'),
('Milano', 'MI', '20100'),
('Napoli', 'NA', '80100'),
('Torino', 'TO', '10100'),
('Palermo', 'PA', '90100'),
('Catania', 'CT', '95100'),
('Caltagirone', 'CT', '95041')
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICA INSTALLAZIONE
-- ============================================

SELECT 'INSTALLAZIONE COMPLETATA!' AS status;
SELECT 'Utenti creati:' AS info;
SELECT username, email, titolo, nome, cognome FROM utenti;
SELECT 'Enti creati:' AS info;
SELECT denominazione, comune, provincia FROM enti;
SELECT 'Associazioni utente-ente:' AS info;
SELECT u.email, e.denominazione, ue.ruolo 
FROM utenti_enti ue
JOIN utenti u ON ue.utente_id = u.id
JOIN enti e ON ue.ente_id = e.id;