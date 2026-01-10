-- Migration: 007_audit_log.sql
-- Descrizione: Sistema di audit completo

-- Tabella audit_log
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP DEFAULT NOW(),
    utente_id UUID REFERENCES utenti(id),
    utente_email VARCHAR(100),
    ente_id UUID REFERENCES enti(id),
    azione VARCHAR(20) NOT NULL,  -- INSERT/UPDATE/DELETE
    tabella VARCHAR(100) NOT NULL,
    record_id UUID,
    dati_precedenti JSONB,
    dati_nuovi JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    descrizione TEXT
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_audit_ente ON audit_log(ente_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_tabella ON audit_log(tabella);
CREATE INDEX IF NOT EXISTS idx_audit_utente ON audit_log(utente_id);
CREATE INDEX IF NOT EXISTS idx_audit_record ON audit_log(record_id);

-- Registra migration
INSERT INTO migrations_history (filename, description)
VALUES ('007_audit_log.sql', 'Sistema di audit completo')
ON CONFLICT (filename) DO NOTHING;