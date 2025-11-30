# Scripts Directory

Questa cartella contiene script SQL per manutenzione e gestione dati.

## 📁 Struttura

### `/maintenance`
Script per pulizia e manutenzione database:
- `pulisci_dati_test.sql` - Elimina dati di test mantenendo struttura

### `/seed`
Script per popolamento dati iniziali:
- `seed_categorie.sql` - Categorie piano conti standard CEI

## 🚀 Come usare
```bash
# Esempio: Eseguire pulizia dati test
docker cp backend/scripts/maintenance/pulisci_dati_test.sql parrocchia-postgres:/tmp/
docker exec -it parrocchia-postgres psql -U parrocchia -d parrocchia_db -f /tmp/pulisci_dati_test.sql
```

## ⚠️ Attenzione

Gli script in `/maintenance` modificano i dati. Eseguire sempre backup prima!