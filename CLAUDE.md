# PROGETTO ECCLESIA - ISTRUZIONI PER CLAUDE CODE

## DESCRIZIONE PROGETTO
EcclesiaWeb è un sistema gestionale web per le parrocchie della Diocesi di Caltagirone (Sicilia, Italia).
Nasce per sostituire il vecchio software WinG (2004, basato su Paradox/Visual Basic) con una soluzione moderna e web-based.
Il sistema gestisce: contabilità parrocchiale, anagrafica parrocchiani, sacramenti, rendiconti economici con generazione PDF, e in futuro inventario beni.
Sito produzione: https://ecclesiaweb.net
Repository GitHub: https://github.com/DiocesiCaltagirone/ecclesia

## IMPORTANTE - CONTESTO UTENTE
L'utente (Luciano) NON è un programmatore. Non conosce Python, React, SQL.
Quando fai modifiche:
- Spiega COSA stai facendo in italiano semplice
- Non chiedere all'utente di scegliere tra opzioni tecniche - decidi tu
- Se qualcosa si rompe, sistemalo tu senza chiedere
- Testa sempre che il codice funzioni prima di dire "fatto"

---

## ARCHITETTURA E STACK

### Stack Tecnologico
- Frontend: React 19 + Vite + TailwindCSS
- Backend: Python FastAPI
- Database: PostgreSQL 15
- Cache: Redis
- Storage: MinIO (porte 9000-9001)
- PDF Generation: WeasyPrint (funziona solo dentro Docker, NON su Windows)
- Containerizzazione: Docker Compose
- Version Control: Git + GitHub

### Ambiente Locale (Windows 10)
```
Percorso progetto: C:\Users\Lux\parrocchia-app\
```

| Container | Porta | Descrizione |
|-----------|-------|-------------|
| parrocchia-backend | 8000 | FastAPI (uvicorn) |
| parrocchia-postgres | 5432 | PostgreSQL 15 |
| parrocchia-redis | 6379 | Redis cache |
| parrocchia-minio | 9000-9001 | MinIO storage |

Database locale:
- Host: localhost (o `postgres` dentro Docker)
- User: parrocchia
- Password: parrocchia2025 (ATTENZIONE: NON è "parrocchia", è "parrocchia2025")
- Database: parrocchia_db

Avvio locale:
```powershell
# OPZIONE 1 - Backend in Docker (CONSIGLIATO):
cd C:\Users\Lux\parrocchia-app
docker-compose up -d

# Frontend (sempre così):
cd C:\Users\Lux\parrocchia-app\frontend
npm run dev

# OPZIONE 2 - Backend fuori Docker:
# Modifica backend\.env: postgres → localhost
cd C:\Users\Lux\parrocchia-app\backend
python -m uvicorn main:app --reload --port 8000
```

URL locali:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs

### Ambiente Server (Linux)
```
IP: 188.245.249.208
OS: Ubuntu 24.04.3 LTS
Accesso: SSH via PuTTY (user: root)
Percorso: /opt/ecclesia/
```

Container Docker su server:
```
parrocchia-frontend  → porta 80 (nginx)
parrocchia-backend   → porta 8000 (uvicorn)
parrocchia-postgres  → porta 5432 (PostgreSQL)
parrocchia-redis     → porta 6379 (Redis)
parrocchia-minio     → porta 9000-9001 (MinIO)
```

NOTA IMPORTANTE su .env backend:
- IN DOCKER: DATABASE_URL deve avere `postgres:5432`
- FUORI DOCKER: DATABASE_URL deve avere `localhost:5432`

---

## STRUTTURA FILE COMPLETA

```
C:\Users\Lux\parrocchia-app\
├── backend\
│   ├── main.py                         # Entry point FastAPI + endpoint /api/enti (GET/PUT)
│   ├── database.py                     # Connessione DB (SQLAlchemy)
│   ├── auth.py                         # Autenticazione JWT
│   ├── .env                            # Configurazione (DATABASE_URL, SECRET_KEY)
│   ├── routes\
│   │   ├── amministrazione.py          # CRUD parrocchie per economo diocesano
│   │   ├── contabilita.py              # Registri, movimenti, categorie, saldi
│   │   ├── piano_conti.py              # Categorie gerarchiche
│   │   ├── rendiconti_crud.py          # CRUD rendiconti (creazione, stati, blocco movimenti)
│   │   ├── rendiconti_documenti.py     # Upload documenti + generazione PDF rendiconto
│   │   ├── persone.py                  # Anagrafica parrocchiani
│   │   ├── sacramenti.py               # Gestione sacramenti (battesimo, comunione, cresima, matrimonio)
│   │   ├── certificati.py              # Stampa certificati sacramentali PDF
│   │   ├── stampe.py                   # Report e stampe varie
│   │   └── audit.py                    # Sistema audit log
│   ├── services\
│   │   └── audit.py                    # Funzioni helper audit
│   ├── migrations\
│   │   ├── 001_add_firma_fields.sql
│   │   ├── 002_add_giroconto_fields.sql
│   │   ├── 003_add_missing_saldo_iniziale.sql
│   │   ├── 004_remove_tipo_check.sql
│   │   ├── 005_nuovi_stati_rendiconti.sql
│   │   ├── 006_impostazioni_diocesi.sql
│   │   ├── 007_audit_log.sql
│   │   ├── 008_add_dati_canonici_enti.sql
│   │   └── run_migrations.py
│   └── templates\
│       └── rendiconto.html             # Template Jinja2 V4 per PDF rendiconto (WeasyPrint, 3 pagine)
├── frontend\
│   ├── src\
│   │   ├── App.jsx                     # Router principale
│   │   ├── pages\
│   │   │   ├── Dashboard.jsx           # Home page ("Benvenuto in EcclesiaWeb")
│   │   │   ├── Login.jsx               # Pagina login (card bianca + onda blu, logo diocesi, ricordami)
│   │   │   ├── ImpostazioniDatiGenerali.jsx  # Form dati parrocchia + parroco + vicario
│   │   │   ├── Amministrazione\        # Sezione economo diocesano
│   │   │   │   └── GestioneParrocchie.jsx
│   │   │   ├── Contabilita\
│   │   │   │   ├── ContabilitaLayout.jsx # Layout con barra superiore + modal "Aggiungi Conto"
│   │   │   │   ├── Conti.jsx           # Lista conti (cassa/banca) + modal modifica conto
│   │   │   │   ├── MovimentiConto.jsx  # Movimenti per singolo conto
│   │   │   │   ├── MovimentiGenerale.jsx # Tutti i movimenti
│   │   │   │   ├── Categorie.jsx       # Piano dei conti gerarchico
│   │   │   │   ├── FormMovimentoGlobale.jsx # Form inserimento/modifica movimento
│   │   │   │   └── Rapporti.jsx        # Report contabili
│   │   │   ├── Anagrafica\
│   │   │   │   └── Persone.jsx         # Lista e gestione parrocchiani
│   │   │   ├── Sacramenti\
│   │   │   │   └── [vari componenti]
│   │   │   └── Rendiconti\
│   │   │       └── [vari componenti]
│   │   ├── components\
│   │   │   ├── Layout.jsx              # Layout con sidebar
│   │   │   ├── Logo.jsx                # Logo SVG placeholder (NON PIU USATO, sostituito da logo-diocesi.png)
│   │   │   ├── ModalAllegati.jsx       # Modal per upload/visualizza allegati movimenti
│   │   │   └── CambioPasswordModal.jsx # Modal cambio password condiviso (usato in Layout, ContabilitaLayout, HeaderAmministrazione)
│   │   ├── utils\
│   │   │   └── formatters.js           # Funzione condivisa formatCurrency (formato italiano)
│   │   └── services\
│   │       └── api.js                  # Configurazione Axios + base URL + interceptor 401
│   └── vite.config.js                  # Config Vite + proxy API
│   └── public\
│       ├── logo-diocesi.png            # Logo ufficiale Diocesi di Caltagirone (126KB)
│       └── vite.svg
├── anteprima_rendiconto_v4.html         # Riferimento visuale approvato per il PDF rendiconto
├── docker-compose.yml
├── deploy.sh                           # Script deploy su server
└── init-database.sql                   # Script inizializzazione DB
```

---

## DATABASE - SCHEMA COMPLETO

### Tabelle Principali

#### `utenti` - Utenti del sistema
```sql
id UUID PRIMARY KEY,
username VARCHAR(100) UNIQUE NOT NULL,
email VARCHAR(100) UNIQUE NOT NULL,
password_hash VARCHAR(255) NOT NULL,
titolo VARCHAR(50),           -- es. "Don"
nome VARCHAR(100),
cognome VARCHAR(100),
is_economo BOOLEAN,           -- se e' economo diocesano (super admin)
attivo BOOLEAN DEFAULT TRUE,
created_at TIMESTAMP
```

#### `enti` - Parrocchie ed enti
```sql
id UUID PRIMARY KEY,
denominazione VARCHAR(200) NOT NULL,
codice_fiscale VARCHAR(16),
partita_iva VARCHAR(11),
indirizzo TEXT,
cap VARCHAR(5),
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
anno_fondazione INTEGER,
santo_patrono VARCHAR(200),
numero_abitanti INTEGER,
-- Campi canonici (aggiunti con migration 008):
data_erezione_canonica DATE,
data_riconoscimento_civile DATE,
registro_pg VARCHAR(100),
parroco_nato_a VARCHAR(100),
parroco_nato_il DATE,
parroco_nominato_il DATE,
parroco_possesso_canonico_il DATE,
vicario_nominato_il DATE,
attivo BOOLEAN DEFAULT TRUE,
created_at TIMESTAMP
```

#### `utenti_enti` - Associazione many-to-many utenti-enti
```sql
id UUID PRIMARY KEY,
utente_id UUID REFERENCES utenti(id),
ente_id UUID REFERENCES enti(id),
ruolo VARCHAR(50) NOT NULL DEFAULT 'operatore',  -- 'parroco', 'economo', 'operatore'
permessi JSONB DEFAULT '{"anagrafica": true, "contabilita": false, "inventario": false}',
created_at TIMESTAMP,
UNIQUE(utente_id, ente_id)
```

#### `piano_conti` - Categorie contabili gerarchiche
```sql
id UUID PRIMARY KEY,
ente_id UUID REFERENCES enti(id),
codice VARCHAR(20),           -- "01", "01.01", "01.02" (univoco per ente)
descrizione VARCHAR(200),
tipo VARCHAR(20),             -- 'economico'/'patrimoniale' (attualmente NULL, per futuro)
categoria VARCHAR(20),        -- 'entrata'/'uscita'/'attivo'/'passivo' (attualmente NULL)
livello INTEGER,              -- 1=padre, 2=figlio, 3=nipote
conto_padre_id UUID,          -- riferimento alla categoria padre
categoria_padre_id UUID,
is_sistema BOOLEAN,           -- categoria di sistema (non eliminabile)
ordine INTEGER,
attivo BOOLEAN DEFAULT TRUE,
created_at TIMESTAMP,
updated_at TIMESTAMP
```
NOTA: Codice "000" e' riservato per "SALDO DA ESERCIZIO PRECEDENTE" (riporti)

#### `registri_contabili` - Conti correnti e cassa
```sql
id UUID PRIMARY KEY,
ente_id UUID REFERENCES enti(id),
nome VARCHAR(200),            -- es. "Cassa Parrocchiale", "BCC Caltagirone"
tipo VARCHAR(20),             -- 'cassa', 'banca', 'postale', 'carta', ecc.
iban VARCHAR(34),
saldo_iniziale DECIMAL(12,2), -- NON USATO! I saldi iniziali sono movimenti
saldo_attuale DECIMAL(12,2),
attivo BOOLEAN DEFAULT TRUE,
created_at TIMESTAMP,
updated_at TIMESTAMP
```

#### `movimenti_contabili` - Transazioni finanziarie
```sql
id UUID PRIMARY KEY,
ente_id UUID REFERENCES enti(id),
registro_id UUID REFERENCES registri_contabili(id),
categoria_id UUID REFERENCES piano_conti(id),
tipo_movimento VARCHAR(10),   -- 'entrata' o 'uscita'
importo DECIMAL(12,2),
data_movimento DATE,
descrizione TEXT,             -- causale/descrizione
numero_documento VARCHAR(50),
beneficiario VARCHAR(200),
tipo_speciale VARCHAR(30),    -- NULL, 'saldo_iniziale', 'giroconto'
riporto_saldo BOOLEAN,        -- TRUE se e' riporto da esercizio precedente
bloccato BOOLEAN DEFAULT FALSE, -- TRUE se il rendiconto dell anno e' chiuso
created_by UUID REFERENCES utenti(id),
created_at TIMESTAMP,
updated_at TIMESTAMP
```

#### `rendiconti` - Bilanci/rendiconti economici
```sql
id UUID PRIMARY KEY,
ente_id UUID REFERENCES enti(id),
anno INTEGER,
tipo VARCHAR(20),
stato VARCHAR(20),            -- 'bozza', 'inviato', 'approvato'
periodo_inizio DATE,
periodo_fine DATE,
data_approvazione DATE,
note TEXT,
dati JSONB,                   -- dati calcolati del rendiconto
created_by UUID REFERENCES utenti(id),
created_at TIMESTAMP,
updated_at TIMESTAMP
```

#### `persone` - Anagrafica parrocchiani
```sql
id UUID PRIMARY KEY,
ente_id UUID REFERENCES enti(id),
cognome VARCHAR(100) NOT NULL,
nome VARCHAR(100) NOT NULL,
data_nascita DATE,
luogo_nascita VARCHAR(100),
sesso CHAR(1),               -- 'M' o 'F'
indirizzo TEXT,
comune VARCHAR(100),
cap VARCHAR(5),
provincia VARCHAR(2),
telefono VARCHAR(20),
email VARCHAR(100),
vivente BOOLEAN DEFAULT TRUE,
note TEXT,
created_by UUID REFERENCES utenti(id),
created_at TIMESTAMP
```

#### `sacramenti` - Sacramenti ricevuti
```sql
id UUID PRIMARY KEY,
persona_id UUID REFERENCES persone(id),
ente_id UUID REFERENCES enti(id),
tipo VARCHAR(50),             -- 'battesimo', 'comunione', 'cresima', 'matrimonio'
data_sacramento DATE,
luogo VARCHAR(200),
ministro VARCHAR(200),
padrino VARCHAR(200),
madrina VARCHAR(200),
note TEXT,
coniuge_nome VARCHAR(100),
coniuge_cognome VARCHAR(100),
created_at TIMESTAMP
```

#### `audit_log` - Storico modifiche (migration 007)
```sql
id UUID PRIMARY KEY,
timestamp TIMESTAMP DEFAULT NOW(),
utente_id UUID REFERENCES utenti(id),
utente_email VARCHAR(100),
ente_id UUID REFERENCES enti(id),
azione VARCHAR(20),           -- 'INSERT', 'UPDATE', 'DELETE'
tabella VARCHAR(100),
record_id UUID,
descrizione TEXT,
dati_precedenti JSONB,
dati_nuovi JSONB,
ip_address VARCHAR(45),
user_agent TEXT
```

#### `migrations_history` - Tracking migrazioni eseguite
```sql
id SERIAL PRIMARY KEY,
migration_name VARCHAR(255),
executed_at TIMESTAMP DEFAULT NOW()
```

---

## LOGICA CONTABILE - MOLTO IMPORTANTE

### Saldi Iniziali
I saldi iniziali NON sono salvati nel campo registri_contabili.saldo_iniziale.
Sono salvati come MOVIMENTI con tipo_speciale = 'saldo_iniziale'.
Quando si crea un nuovo conto, il sistema crea automaticamente un movimento di tipo saldo_iniziale.

### Riporti da Esercizio Precedente
Quando si chiude un rendiconto (es. anno 2023):
1. Tutti i movimenti dell anno vengono marcati come bloccato = TRUE
2. Viene creato un nuovo movimento al 01/01/2024 con:
   - tipo_speciale = 'saldo_iniziale'
   - riporto_saldo = TRUE
   - Importo = saldo finale dell anno precedente
   - Categoria = codice "000" (SALDO DA ESERCIZIO PRECEDENTE)

### Calcolo Totali Rendiconto
Nel rendiconto, i totali entrate/uscite ESCLUDONO:
- Movimenti con tipo_speciale = 'saldo_iniziale'
- Movimenti con tipo_speciale = 'giroconto'
Filtro SQL: AND tipo_speciale IS NULL

### Nelle Pagine Movimenti (frontend)
Le statistiche in MovimentiConto.jsx e MovimentiGenerale.jsx INCLUDONO i saldi iniziali nei totali.
I saldi iniziali sono visualizzati con righe di colore marrone nella tabella.

### Giroconti
I giroconti (trasferimento tra conti) hanno tipo_speciale = 'giroconto'.
DA IMPLEMENTARE: attualmente non c'e' un'interfaccia per i giroconti.

### Esempio Contabile Reale
Anno 2023 (primo anno):
- Saldo iniziale: 52.061,94 EUR (manuale, riporto_saldo = FALSE)
- Movimenti entrata: 10.591,16 EUR
- Movimenti uscita: 27.632,14 EUR
- TOTALE ENTRATE: 62.653,10 EUR (saldo + movimenti)
- TOTALE USCITE: 27.632,14 EUR
- SALDO FINALE: 35.020,96 EUR

Dopo chiusura rendiconto 2023:
- Tutti i movimenti 2023 bloccato = TRUE
- Nuovo movimento 01/01/2024: 35.020,96 EUR (tipo_speciale='saldo_iniziale', riporto_saldo=TRUE)

---

## SISTEMA RUOLI E PERMESSI

### Economo Diocesano (Super Admin)
- Puo vedere e gestire TUTTE le parrocchie della diocesi
- Crea/modifica/elimina enti e utenti
- Accesso completo a tutti i moduli
- Campo is_economo = TRUE nella tabella utenti

### Parroco
- Accesso SOLO alla sua parrocchia
- Gestisce contabilita, anagrafica, sacramenti
- NON puo creare altri enti o utenti

### Operatore
- Accesso limitato in base ai permessi JSONB
- Permessi granulari: anagrafica, contabilita, inventario

---

## FUNZIONALITA IMPLEMENTATE (stato al 03/03/2026)

### Completate
1. Autenticazione JWT con login/logout (sessionStorage per token, interceptor 401 in api.js)
2. Sistema multi-ente (un utente puo gestire piu parrocchie)
3. Sistema permessi basato su ruoli (economo, parroco, operatore)
4. Dashboard con messaggio "Benvenuto in EcclesiaWeb"
5. Gestione enti/parrocchie (CRUD completo)
6. Impostazioni Dati Generali (form con dati parrocchia, parroco, vicario, dati canonici)
7. Contabilita completa:
   - CRUD registri (cassa, banca, postale, carte, ecc.)
   - Movimenti con categorie gerarchiche
   - Saldo iniziale automatico alla creazione conto (anche negativo per scoperti)
   - Blocco creazione conti in periodi con rendiconto chiuso (endpoint GET /contabilita/ultimo-rendiconto)
   - Campo data_inizio_contabilita nel form creazione conto, con data minima da ultimo rendiconto
   - Saldo iniziale bloccato (disabled) se incluso in un rendiconto
   - Menu contestuale (tasto destro) su movimenti con Modifica/Elimina/Allegati
   - Report per periodo/categoria
   - Saldi negativi visualizzati in rosso nella lista conti
8. Piano dei conti gerarchico (padre/figlio, codici numerici crescenti)
9. Rendiconti economici:
   - Workflow: bozza - inviato - approvato
   - Generazione PDF V4 con WeasyPrint (template Jinja2, 3 pagine)
   - Template V4: frontespizio elegante, movimenti entrate e uscite in sezioni separate, riepilogo+firme
   - Categorie ordinate per codice numerico crescente (non alfabetico)
   - Riporto da esercizio precedente: SUM di tutti i conti (non LIMIT 1)
   - File di riferimento approvato: anteprima_rendiconto_v4.html (nella root)
   - Upload documenti allegati
   - Chiusura esercizio con blocco movimenti e creazione riporti
10. Anagrafica persone base
11. Sacramenti (battesimo, comunione, cresima, matrimonio)
12. Certificati sacramentali PDF
13. Sistema Audit (tabella audit_log)
14. Allegati ai movimenti contabili
15. Formattazione importi coerente formato italiano (15.000,00) ovunque:
   - Funzione condivisa formatCurrency in frontend/src/utils/formatters.js (implementazione manuale, NO Intl.NumberFormat che non e' affidabile su tutti i browser)
   - Usata in tutti i file frontend (Conti, MovimentiConto, MovimentiGenerale, Rapporti, ListaRendiconti, NuovoRendiconto, Rendiconto, EconomatoContabilita)
   - Template backend rendiconto.html usa filtro Jinja2 |ita (formato_italiano) e |ita_int (intero con separatore migliaia)
16. Pagina Login redesign completa:
   - Design: card bianca (logo + titolo) + onda SVG curva + form su sfondo blu scuro (#1a365d)
   - Logo ufficiale Diocesi di Caltagirone (frontend/public/logo-diocesi.png)
   - Checkbox "Ricordami" (salva email in localStorage, token resta in sessionStorage)
   - Modal "Password dimenticata?" (chiede email, chiama POST /api/auth/reset-password)
   - NOTA: endpoint /api/auth/reset-password NON ESISTE nel backend attivo (era in main_OLD.py). Nessun servizio email configurato (no SMTP/SendGrid). Da implementare.
17. Gestione sessione migliorata:
   - sessionStorage per token/user/ente_id (si cancella alla chiusura tab/browser, persiste su F5)
   - localStorage SOLO per saved_email (ricordami) — deve persistere tra sessioni
   - Interceptor response 401 in api.js: cancella sessione e redirect a /login se token scaduto

### Da implementare (priorita)
ALTA:
1. Endpoint backend POST /api/auth/reset-password + servizio email (SMTP o SendGrid)
2. Giroconto tra registri
3. Interfaccia visualizzazione Audit Log
4. Riconciliazione bancaria

MEDIA:
5. Import movimenti da CSV/Excel
6. Modulo Anagrafica completo (famiglie, relazioni)
7. Modulo Inventario (beni mobili/immobili)
8. Export dati

BASSA:
9. Dashboard statistiche
10. Notifiche email
11. Backup automatico schedulato

---

## CREDENZIALI DI TEST

### Economo (Super Admin)
- Email: nuovo@admin.it (oppure davipaglia11@gmail.com)
- Password: admin123

### Parroco (Santa Maria del Popolo)
- Email: parroco@santamaria.it
- Password: Parrocchia2024!

### Ente Test
- ID: 97bfa19e-7384-4f36-b55e-04420dd4621a
- Nome: Parrocchia Santa Maria del Popolo
- Comune: Caltagirone (CT)

---

## FRONTEND - CONFIGURAZIONE API

File frontend/src/services/api.js:
```javascript
const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:8000' : '';
```

File vite.config.js - Proxy:
```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true
    }
  }
}
```

---

## BACKEND - PATTERN E CONVENZIONI

### Query SQL
Usa text() da SQLAlchemy e accedi ai dati con indice numerico:
```python
from sqlalchemy import text
result = conn.execute(text("SELECT id, nome FROM enti WHERE id = :id"), {"id": ente_id})
row = result.fetchone()
# Accesso: row[0] = id, row[1] = nome
# NON usare row['campo'] - non funziona
```

### Autenticazione
Tutte le route protette usano Depends(get_current_user) da auth.py.
Token JWT nel header Authorization: Bearer <token>.

### Formattazione Importi
- Frontend: usare SEMPRE `import { formatCurrency } from '../utils/formatters'` (o `../../utils/formatters` da sottocartelle). NON creare funzioni locali duplicate. La funzione usa implementazione manuale (regex), NON Intl.NumberFormat (non affidabile su tutti i browser/OS).
- Backend template Jinja2: usare il filtro `|ita` (registrato in rendiconti_documenti.py come `formato_italiano`) per importi e `|ita_int` per numeri interi. NON usare `"%.2f"|format()`.

---

## COMANDI UTILI PER SVILUPPO LOCALE

### Database (via Docker)
```powershell
# Query singola
docker exec -it parrocchia-postgres psql -U parrocchia -d parrocchia_db -c "SELECT * FROM enti;"

# Shell interattiva
docker exec -it parrocchia-postgres psql -U parrocchia -d parrocchia_db

# Eseguire file SQL (migration)
Get-Content backend\migrations\XXX.sql | docker exec -i parrocchia-postgres psql -U parrocchia -d parrocchia_db

# Struttura tabella
docker exec -it parrocchia-postgres psql -U parrocchia -d parrocchia_db -c "\d nome_tabella"
```

### Docker
```powershell
cd C:\Users\Lux\parrocchia-app
docker-compose ps
docker-compose logs -f backend
docker-compose restart backend
docker-compose down && docker-compose up -d
```

### Git
```powershell
cd C:\Users\Lux\parrocchia-app
git add .
git commit -m "Descrizione modifica"
git push
```

---

## DEPLOY SU SERVER

```bash
# Via SSH su 188.245.249.208
cd /opt/ecclesia && bash deploy.sh

# Quick deploy
cd /opt/ecclesia && bash deploy.sh --quick

# Se git DNS fallisce
echo "nameserver 8.8.8.8" > /etc/resolv.conf

# Se git diverge
cd /opt/ecclesia && git fetch origin && git reset --hard origin/main && bash deploy.sh

# Migration sul server
docker exec -i parrocchia-postgres psql -U parrocchia -d parrocchia_db < /opt/ecclesia/backend/migrations/XXX.sql
docker restart parrocchia-backend
```

---

## BUG RISOLTI (storico)

1. Creazione conti falliva in locale: mancava tabella audit_log (migration 007)
2. Dati canonici non si salvavano: endpoint /api/enti in main.py incompleto
3. Git pull falliva sul server: DNS (fix: nameserver 8.8.8.8)
4. Migration falliva: mancava tabella migrations_history
5. Rendiconto numeri sbagliati: includeva saldo_iniziale/giroconto nei totali
6. Riporti non si creavano: categoria "000" non trovata
7. Saldo progressivo includeva movimenti bloccati
8. WeasyPrint non funzionava su Windows (import condizionale)
9. Menu contestuale Modifica non apriva form
10. Frontespizio PDF su 2 pagine (font 6.5pt)
11. Saldo iniziale negativo bloccato: ContabilitaLayout.jsx aveva input type="number" min="0" (form duplicato rispetto a Conti.jsx)
12. Totali rendiconto includevano saldi iniziali: rendiconti_crud.py usava `tipo_speciale IS NULL OR tipo_speciale = 'saldo_iniziale'` nella query calcolo totali (fix: solo `tipo_speciale IS NULL`)
13. Saldo anno precedente in stampe.py non filtrava tipo_speciale: includeva saldi iniziali e giroconti nel calcolo (fix: aggiunto `AND tipo_speciale IS NULL`)
14. Riporto PDF prendeva solo un conto (LIMIT 1): fix con SUM di tutti i saldi iniziali di tutti i conti
15. Saldo rendiconto sovrascitto: variabile `saldo` in rendiconti_crud.py sovrascritta nel loop creazione saldi iniziali (fix: rinominata in `saldo_conto`)
16. Ordinamento categorie PDF alfabetico: codice "12" prima di "8" (fix: ordinamento numerico con split('.'))
17. formatCurrency non metteva punto migliaia: Intl.NumberFormat('it-IT') non affidabile su tutti i browser (fix: implementazione manuale con regex)
18. PUT /registri check saldo bloccato usava colonna inesistente rendiconto_id (fix: controllo campo bloccato del movimento saldo_iniziale)
19. Cambio password funzionava solo dalla Home (Layout.jsx): ContabilitaLayout.jsx aveva solo `alert('Da implementare')`, HeaderAmministrazione.jsx non aveva il modal. Fix: estratto CambioPasswordModal.jsx come componente condiviso, importato in tutti e 3 i layout.
20. Sessione: pagina vuota dopo chiusura tab/browser perche token JWT in localStorage persisteva scaduto. Fix: migrato tutto a sessionStorage (si cancella alla chiusura). Aggiunto interceptor 401 in api.js per redirect automatico a /login.

---

## NOTE TECNICHE CRITICHE

- Cache Python: eliminare __pycache__ dopo modifiche backend
- Token JWT: salvati in sessionStorage (NON localStorage). Si cancellano alla chiusura tab. Interceptor 401 in api.js gestisce redirect automatico a /login.
- STORAGE POLICY: sessionStorage per dati di sessione (token, user, ente_id, current_ente_id, current_ente). localStorage SOLO per preferenze persistenti (saved_email per "Ricordami").
- Template PDF V4: backend/templates/rendiconto.html (Jinja2 + WeasyPrint, 3 pagine)
  - Pagina 1: Frontespizio (logo, dati parrocchia, periodo)
  - Pagina 2: Movimenti (entrate e uscite in sezioni separate con codici categoria, ordinamento numerico)
  - Pagina 3: Riepilogo economico, disponibilita liquide, dichiarazione parroco, approvazione
  - NO flexbox (WeasyPrint non lo supporta bene) — usa float per layout orizzontali
  - Footer via @page @bottom-center di WeasyPrint (non div manuali)
  - Logo come semplice <img> senza cerchio/bordo
  - Riferimento visuale: anteprima_rendiconto_v4.html (NON modificare il CSS del template senza confrontare col riferimento)
- Categorie: codici numerici crescenti (1, 2, 1.1, 1.2), "000" per riporti
- api.js: gestisce automaticamente locale vs produzione, ha request interceptor (token + ente_id) e response interceptor (401 → redirect /login)
- Password DB locale: parrocchia2025 (NON parrocchia)
- .env backend: postgres:5432 in Docker, localhost:5432 fuori Docker
- FORM DUPLICATI: il form "Aggiungi Conto" esiste in DUE file: ContabilitaLayout.jsx (modal nella barra superiore) e Conti.jsx (modal nella pagina conti). Modifiche al form vanno fatte in ENTRAMBI i file!
- SALDO INIZIALE NEGATIVO: contabilita.py gestisce saldi negativi come movimento tipo 'uscita' con valore assoluto (sia creazione che modifica conto)
- 3 LAYOUT SEPARATI: l'app NON ha un header condiviso. Esistono 3 layout indipendenti:
  - Layout.jsx → Home, Persone, Impostazioni, Registro
  - ContabilitaLayout.jsx → tutta la sezione /contabilita/*
  - HeaderAmministrazione.jsx → pagina Amministrazione
  Funzionalita comuni (es. CambioPasswordModal) vanno importate in TUTTI e 3.
- LOGIN PAGE: design card bianca con onda SVG + form su fondo blu. Logo ufficiale diocesi (frontend/public/logo-diocesi.png, 200px). CSS tutto inline nel tag <style> del componente (NO file CSS separati, NO TailwindCSS nella pagina login). NON usa Logo.jsx (SVG placeholder, deprecato).
- RESET PASSWORD: il frontend ha il modal ma l'endpoint backend /api/auth/reset-password NON ESISTE ancora. Il vecchio codice era in main_OLD.py. Nessun servizio email (SMTP/SendGrid) configurato.
