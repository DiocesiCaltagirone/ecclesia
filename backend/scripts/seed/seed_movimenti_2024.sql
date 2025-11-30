-- ============================================
-- SCRIPT: Seed movimenti 2024
-- DESCRIZIONE: Crea 30 movimenti fittizi per test rendiconto
-- PERIODO: 01/01/2024 - 31/12/2024
-- ============================================

BEGIN;

-- IDs conti
\set cassa_id '2ca42ae4-11b0-4f3a-b374-85d180acb4e1'
\set banca_id '7a007762-ebcc-4126-8fd6-f636fd6571fe'
\set postale_id '4565aeb7-6616-4621-9ece-692ed712e812'

-- ID Ente (recupera automaticamente)
\set ente_id (SELECT id FROM enti LIMIT 1)

\echo '================================================'
\echo 'CREAZIONE MOVIMENTI FITTIZI 2024'
\echo '================================================'

-- ============================================
-- ENTRATE (15 movimenti)
-- ============================================

\echo 'Creazione ENTRATE...'

-- Gennaio - Offerte Messe (Cassa)
INSERT INTO movimenti_contabili (id, ente_id, registro_id, data_movimento, tipo_movimento, importo, causale, descrizione)
VALUES 
(uuid_generate_v4(), :'ente_id', :'cassa_id', '2024-01-07', 'entrata', 150.00, 'Offerte Messe domenicali', 'Domenica Epifania'),
(uuid_generate_v4(), :'ente_id', :'cassa_id', '2024-01-21', 'entrata', 180.00, 'Offerte Messe domenicali', 'III Domenica T.O.');

-- Febbraio - Donazioni (Banca)
INSERT INTO movimenti_contabili (id, ente_id, registro_id, data_movimento, tipo_movimento, importo, causale, descrizione)
VALUES 
(uuid_generate_v4(), :'ente_id', :'banca_id', '2024-02-14', 'entrata', 1500.00, 'Donazione nominativa', 'Famiglia Rossi - Restauro chiesa'),
(uuid_generate_v4(), :'ente_id', :'cassa_id', '2024-02-28', 'entrata', 95.00, 'Offerte Messe', 'Mercoledì delle Ceneri');

-- Marzo - 8x1000 (Banca)
INSERT INTO movimenti_contabili (id, ente_id, registro_id, data_movimento, tipo_movimento, importo, causale, descrizione)
VALUES 
(uuid_generate_v4(), :'ente_id', :'banca_id', '2024-03-15', 'entrata', 12000.00, 'Contributo 8x1000 CEI', 'Primo accredito anno 2024'),
(uuid_generate_v4(), :'ente_id', :'cassa_id', '2024-03-31', 'entrata', 220.00, 'Offerte Pasqua', 'Domenica di Pasqua');

-- Aprile - Sacramenti (Cassa + Postale)
INSERT INTO movimenti_contabili (id, ente_id, registro_id, data_movimento, tipo_movimento, importo, causale, descrizione)
VALUES 
(uuid_generate_v4(), :'ente_id', :'cassa_id', '2024-04-13', 'entrata', 300.00, 'Offerta Matrimonio', 'Celebrazione matrimonio Bianchi-Verdi'),
(uuid_generate_v4(), :'ente_id', :'postale_id', '2024-04-27', 'entrata', 100.00, 'Offerta Battesimo', 'Battesimo Emma Colombo');

-- Maggio - Prime Comunioni (Cassa)
INSERT INTO movimenti_contabili (id, ente_id, registro_id, data_movimento, tipo_movimento, importo, causale, descrizione)
VALUES 
(uuid_generate_v4(), :'ente_id', :'cassa_id', '2024-05-05', 'entrata', 450.00, 'Offerte Prima Comunione', 'Gruppo parrocchiale 15 bambini'),
(uuid_generate_v4(), :'ente_id', :'cassa_id', '2024-05-19', 'entrata', 190.00, 'Offerte Messe', 'Domenica Pentecoste');

-- Giugno - Donazione grande (Banca)
INSERT INTO movimenti_contabili (id, ente_id, registro_id, data_movimento, tipo_movimento, importo, causale, descrizione)
VALUES 
(uuid_generate_v4(), :'ente_id', :'banca_id', '2024-06-10', 'entrata', 5000.00, 'Donazione testamentaria', 'Sig. Giuseppe Marino - Lascito'),
(uuid_generate_v4(), :'ente_id', :'cassa_id', '2024-06-29', 'entrata', 175.00, 'Festa patronale', 'Offerte SS. Pietro e Paolo');

-- Settembre - Ripresa attività (Cassa + Banca)
INSERT INTO movimenti_contabili (id, ente_id, registro_id, data_movimento, tipo_movimento, importo, causale, descrizione)
VALUES 
(uuid_generate_v4(), :'ente_id', :'banca_id', '2024-09-20', 'entrata', 8000.00, 'Contributo 8x1000 CEI', 'Secondo accredito anno 2024'),
(uuid_generate_v4(), :'ente_id', :'cassa_id', '2024-09-29', 'entrata', 85.00, 'Offerte Messe', 'XXVI Domenica T.O.');

-- Dicembre - Fine anno (Cassa + Banca)
INSERT INTO movimenti_contabili (id, ente_id, registro_id, data_movimento, tipo_movimento, importo, causale, descrizione)
VALUES 
(uuid_generate_v4(), :'ente_id', :'cassa_id', '2024-12-25', 'entrata', 650.00, 'Offerte Natale', 'S. Messa di Natale'),
(uuid_generate_v4(), :'ente_id', :'banca_id', '2024-12-31', 'entrata', 2000.00, 'Donazione fine anno', 'Azienda locale - Beneficenza');

\echo 'ENTRATE create: 15'

-- ============================================
-- USCITE (15 movimenti)
-- ============================================

\echo 'Creazione USCITE...'

-- Gennaio - Utenze (Banca)
INSERT INTO movimenti_contabili (id, ente_id, registro_id, data_movimento, tipo_movimento, importo, causale, descrizione)
VALUES 
(uuid_generate_v4(), :'ente_id', :'banca_id', '2024-01-15', 'uscita', 450.00, 'Bolletta energia elettrica', 'Enel - Bimestre nov-dic 2023'),
(uuid_generate_v4(), :'ente_id', :'banca_id', '2024-01-25', 'uscita', 280.00, 'Bolletta gas', 'Italgas - Inverno');

-- Febbraio - Manutenzione (Banca)
INSERT INTO movimenti_contabili (id, ente_id, registro_id, data_movimento, tipo_movimento, importo, causale, descrizione)
VALUES 
(uuid_generate_v4(), :'ente_id', :'banca_id', '2024-02-10', 'uscita', 1200.00, 'Riparazione riscaldamento', 'Caldaia parrocchiale - Ditta Termo Service'),
(uuid_generate_v4(), :'ente_id', :'cassa_id', '2024-02-20', 'uscita', 150.00, 'Acquisto cera e ostie', 'Fornitore liturgico');

-- Marzo - Assicurazioni (Banca)
INSERT INTO movimenti_contabili (id, ente_id, registro_id, data_movimento, tipo_movimento, importo, causale, descrizione)
VALUES 
(uuid_generate_v4(), :'ente_id', :'banca_id', '2024-03-05', 'uscita', 2500.00, 'Assicurazione edificio', 'Polizza annuale 2024'),
(uuid_generate_v4(), :'ente_id', :'cassa_id', '2024-03-28', 'uscita', 85.00, 'Fiori Pasqua', 'Decorazione altare');

-- Aprile - Utenze primavera (Banca)
INSERT INTO movimenti_contabili (id, ente_id, registro_id, data_movimento, tipo_movimento, importo, causale, descrizione)
VALUES 
(uuid_generate_v4(), :'ente_id', :'banca_id', '2024-04-10', 'uscita', 380.00, 'Bolletta luce', 'Enel - Bimestre feb-mar'),
(uuid_generate_v4(), :'ente_id', :'banca_id', '2024-04-20', 'uscita', 120.00, 'Bolletta acqua', 'Acquedotto comunale');

-- Maggio - Manutenzione giardino (Cassa)
INSERT INTO movimenti_contabili (id, ente_id', registro_id, data_movimento, tipo_movimento, importo, causale, descrizione)
VALUES 
(uuid_generate_v4(), :'ente_id', :'cassa_id', '2024-05-08', 'uscita', 250.00, 'Potatura alberi', 'Giardiniere - Giardino parrocchiale'),
(uuid_generate_v4(), :'ente_id', :'cassa_id', '2024-05-25', 'uscita', 65.00, 'Materiale catechesi', 'Libri Prima Comunione');

-- Giugno - Tasse (Banca)
INSERT INTO movimenti_contabili (id, ente_id, registro_id, data_movimento, tipo_movimento, importo, causale, descrizione)
VALUES 
(uuid_generate_v4(), :'ente_id', :'banca_id', '2024-06-15', 'uscita', 1800.00, 'IMU edifici ecclesiastici', 'Comune di Caltagirone - I rata'),
(uuid_generate_v4(), :'ente_id', :'banca_id', '2024-06-30', 'uscita', 420.00, 'Bolletta luce estate', 'Enel - Bimestre apr-mag');

-- Settembre - Manutenzione straordinaria (Banca)
INSERT INTO movimenti_contabili (id, ente_id, registro_id, data_movimento, tipo_movimento, importo, causale, descrizione)
VALUES 
(uuid_generate_v4(), :'ente_id', :'banca_id', '2024-09-15', 'uscita', 3500.00, 'Riparazione tetto', 'Infiltrazioni acqua - Ditta Edil Sicilia'),
(uuid_generate_v4(), :'ente_id', :'cassa_id', '2024-09-20', 'uscita', 180.00, 'Pulizia locali', 'Impresa pulizie - Trimestre');

-- Dicembre - Chiusura anno (Banca + Cassa)
INSERT INTO movimenti_contabili (id, ente_id, registro_id, data_movimento, tipo_movimento, importo, causale, descrizione)
VALUES 
(uuid_generate_v4(), :'ente_id', :'banca_id', '2024-12-10', 'uscita', 1800.00, 'IMU edifici ecclesiastici', 'Comune - II rata'),
(uuid_generate_v4(), :'ente_id', :'cassa_id', '2024-12-20', 'uscita', 95.00, 'Addobbi natalizi', 'Presepe e decorazioni');

\echo 'USCITE create: 15'

\echo ''
\echo '================================================'
\echo 'RIEPILOGO MOVIMENTI CREATI'
\echo '================================================'

SELECT 
    tipo_movimento,
    COUNT(*) as numero,
    CONCAT('€ ', TO_CHAR(SUM(importo), '999,999.99')) as totale
FROM movimenti_contabili
WHERE data_movimento BETWEEN '2024-01-01' AND '2024-12-31'
GROUP BY tipo_movimento
ORDER BY tipo_movimento DESC;

\echo ''
\echo '✅ MOVIMENTI 2024 CREATI CON SUCCESSO!'
\echo '================================================'

COMMIT;