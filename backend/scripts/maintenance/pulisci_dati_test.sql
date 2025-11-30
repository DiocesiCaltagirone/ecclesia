-- ============================================
-- SCRIPT: Pulizia dati test
-- DESCRIZIONE: Elimina rendiconti, movimenti e documenti
--              Mantiene: utenti, enti, categorie, conti
-- AUTORE: Sistema Gestionale Parrocchie
-- DATA: 2025-11-28
-- VERSIONE: 1.0
-- ============================================

-- Abilita output dettagliato
\set QUIET off
\set ON_ERROR_STOP on

BEGIN;

\echo '================================================'
\echo 'INIZIO PULIZIA DATI TEST'
\echo '================================================'

-- 1. Backup count per verifica
\echo ''
\echo '📊 STATO PRIMA DELLA PULIZIA:'
SELECT 'Rendiconti' as tabella, COUNT(*) as totale FROM rendiconti
UNION ALL
SELECT 'Documenti rendiconti', COUNT(*) FROM rendiconti_documenti
UNION ALL
SELECT 'Movimenti contabili', COUNT(*) FROM movimenti_contabili
UNION ALL
SELECT 'Allegati movimenti', COUNT(*) FROM movimenti_allegati;

-- 2. Elimina dati in ordine (rispetta FK)
\echo ''
\echo '🗑️  Eliminazione documenti rendiconti...'
DELETE FROM rendiconti_documenti;

\echo '🗑️  Eliminazione allegati movimenti...'
DELETE FROM movimenti_allegati;

\echo '🗑️  Eliminazione movimenti contabili...'
DELETE FROM movimenti_contabili;

\echo '🗑️  Eliminazione rendiconti...'
DELETE FROM rendiconti;

-- 3. Verifica stato finale
\echo ''
\echo '✅ STATO DOPO LA PULIZIA:'
SELECT 'Rendiconti' as tabella, COUNT(*) as totale FROM rendiconti
UNION ALL
SELECT 'Movimenti contabili', COUNT(*) FROM movimenti_contabili;

\echo ''
\echo '📦 DATI MANTENUTI:'
SELECT 'Utenti' as tabella, COUNT(*) as totale FROM utenti
UNION ALL
SELECT 'Enti', COUNT(*) FROM enti
UNION ALL
SELECT 'Categorie piano conti', COUNT(*) FROM piano_conti
UNION ALL
SELECT 'Conti/Registri', COUNT(*) FROM registri_contabili;

\echo ''
\echo '================================================'
\echo '✅ PULIZIA COMPLETATA CON SUCCESSO!'
\echo '================================================'

COMMIT;