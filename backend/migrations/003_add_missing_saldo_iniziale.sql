-- ============================================
-- MIGRATION 003: Aggiunge saldo_iniziale mancante
-- ============================================
-- Crea movimento saldo_iniziale per tutti i conti che non ce l'hanno

INSERT INTO movimenti_contabili (
    id, ente_id, registro_id, categoria_id,
    data_movimento, tipo_movimento, importo,
    causale, bloccato, tipo_speciale
)
SELECT 
    uuid_generate_v4(),
    r.ente_id,
    r.id,
    NULL,
    COALESCE(r.created_at::date, CURRENT_DATE),
    'entrata',
    0,
    'Saldo esercizio precedente',
    FALSE,
    'saldo_iniziale'
FROM registri_contabili r
WHERE NOT EXISTS (
    SELECT 1 FROM movimenti_contabili m 
    WHERE m.registro_id = r.id 
    AND m.tipo_speciale = 'saldo_iniziale'
);