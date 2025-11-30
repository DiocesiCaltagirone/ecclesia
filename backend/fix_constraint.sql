ALTER TABLE registri_contabili DROP CONSTRAINT IF EXISTS registri_contabili_tipo_check;

ALTER TABLE registri_contabili ADD CONSTRAINT registri_contabili_tipo_check 
CHECK (tipo IN ('cassa', 'banca', 'postale', 'debito', 'credito', 'prepagata', 'deposito', 'risparmio', 'polizza', 'titoli'));

SELECT 'Constraint aggiornato!' AS messaggio;
