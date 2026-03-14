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
│   ├── main.py                         # Entry point FastAPI (anagrafica persone + root + health)
│   ├── database.py                     # Connessione DB (SQLAlchemy)
│   ├── auth.py                         # Autenticazione JWT
│   ├── constants.py                    # Enum: StatoRendiconto, RuoloUtente, TipoMovimento, TipoSpecialeMovimento, TipoRegistro
│   ├── .env                            # Configurazione (DATABASE_URL, SECRET_KEY)
│   ├── routes\
│   │   ├── enti.py                     # CRUD enti (my-enti, GET, PUT)
│   │   ├── amministrazione.py          # CRUD parrocchie per economo diocesano
│   │   ├── contabilita.py              # Registri, movimenti, categorie, saldi
│   │   ├── piano_conti.py              # Categorie gerarchiche
│   │   ├── rendiconti_crud.py          # CRUD rendiconti (creazione, stati, blocco movimenti)
│   │   ├── rendiconti_documenti.py     # Upload documenti + generazione PDF rendiconto
│   │   ├── persone.py                  # Anagrafica parrocchiani (NON usato dal frontend)
│   │   ├── sacramenti.py               # Gestione sacramenti (pattern DB incompatibile, da riscrivere)
│   │   ├── certificati.py              # Stampa certificati sacramentali PDF
│   │   ├── stampe.py                   # Report e stampe varie (pattern DB incompatibile, da riscrivere)
│   │   ├── audit.py                    # Sistema audit log
│   │   ├── inventario.py               # Aggregatore inventario (get_ente_id + include sub-routers)
│   │   ├── inventario_lookup.py        # CRUD categorie e ubicazioni inventario (8 endpoint)
│   │   ├── inventario_beni.py          # CRUD beni + foto inventario (10 endpoint)
│   │   ├── inventario_registri.py      # Registri ufficiali + storico beni (3 endpoint)
│   │   └── inventario_pdf.py           # Generazione PDF inventario (4 endpoint)
│   ├── services\
│   │   └── audit.py                    # Funzioni helper audit
│   ├── migrations\
│   │   ├── 001-008                     # Migration storiche
│   │   └── run_migrations.py
│   └── templates\
│       ├── rendiconto.html             # Template Jinja2 V4 per PDF rendiconto (WeasyPrint, 3 pagine)
│       ├── inventario_registro.html    # Template PDF registro beni (landscape, tabella)
│       ├── inventario_scheda_bene.html # Template PDF scheda singolo bene con foto
│       └── inventario_storico.html     # Template PDF storico beni rimossi
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
│   │   │   │   ├── ContabilitaLayout.jsx # Sub-header + modal "Aggiungi Conto" + modal transazione
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
│   │   │   ├── AppShell.jsx            # Layout unificato: header + sidebar accordion + Outlet
│   │   │   ├── ModalAllegati.jsx       # Modal per upload/visualizza allegati movimenti
│   │   │   └── CambioPasswordModal.jsx # Modal cambio password condiviso (usato in AppShell)
│   │   ├── utils\
│   │   │   ├── formatters.js           # Funzione condivisa formatCurrency (formato italiano)
│   │   │   └── auth.js                 # Funzione logout(navigate) condivisa
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
-- Campi canonici (migration 008):
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
tipo VARCHAR(20),             -- 'economico'/'patrimoniale' (attualmente NULL)
categoria VARCHAR(20),        -- 'entrata'/'uscita'/'attivo'/'passivo' (attualmente NULL)
livello INTEGER,              -- 1=padre, 2=figlio, 3=nipote
conto_padre_id UUID,
categoria_padre_id UUID,
is_sistema BOOLEAN,
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
nome VARCHAR(200),
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
descrizione TEXT,
numero_documento VARCHAR(50),
beneficiario VARCHAR(200),
tipo_speciale VARCHAR(30),    -- NULL, 'saldo_iniziale', 'giroconto'
riporto_saldo BOOLEAN,
bloccato BOOLEAN DEFAULT FALSE,
giroconto_collegato_id UUID,  -- riferimento al gemello per giroconti
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
stato VARCHAR(20),            -- 'bozza', 'inviato', 'approvato', 'respinto', 'parrocchia', 'diocesi'
periodo_inizio DATE,
periodo_fine DATE,
data_approvazione DATE,
note TEXT,
dati JSONB,
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
sesso CHAR(1),
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

#### `audit_log` - Storico modifiche
```sql
id UUID PRIMARY KEY,
timestamp TIMESTAMP DEFAULT NOW(),
utente_id UUID REFERENCES utenti(id),
utente_email VARCHAR(100),
ente_id UUID REFERENCES enti(id),
azione VARCHAR(20),
tabella VARCHAR(100),
record_id UUID,
descrizione TEXT,
dati_precedenti JSONB,
dati_nuovi JSONB,
ip_address VARCHAR(45),
user_agent TEXT
```

#### Tabelle Inventario (migration 009)
- `inventario_categorie` — categorie beni (17 predefinite per ente)
- `inventario_ubicazioni` — ubicazioni beni (9 predefinite per ente)
- `beni_inventario` — beni mobili/immobili con soft delete
- `inventario_foto` — foto beni (filesystem, max 10MB, JPG/PNG/WEBP)
- `inventario_registri` — registri ufficiali con snapshot JSONB
- `inventario_storico` — storico beni rimossi

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
I giroconti hanno tipo_speciale = 'giroconto' e giroconto_collegato_id per collegare i gemelli.
Eliminando un giroconto si cancella automaticamente anche il gemello.
Giroconti esclusi dal rendiconto PDF (movimento interno neutro).

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

## FUNZIONALITA IMPLEMENTATE (stato al 13/03/2026)

### Completate
1. Autenticazione JWT con login/logout (sessionStorage per token, interceptor 401 in api.js)
2. Sistema multi-ente (un utente puo gestire piu parrocchie)
3. Sistema permessi basato su ruoli (economo, parroco, operatore)
4. Dashboard con messaggio "Benvenuto in EcclesiaWeb"
5. Gestione enti/parrocchie (CRUD completo, routes/enti.py)
6. Impostazioni Dati Generali (form con dati parrocchia, parroco, vicario, dati canonici)
7. Contabilita completa:
   - CRUD registri (cassa, banca, postale, carte, ecc.)
   - Movimenti con categorie gerarchiche
   - Saldo iniziale automatico alla creazione conto (anche negativo per scoperti)
   - Blocco creazione conti in periodi con rendiconto chiuso
   - Saldo iniziale bloccato (disabled) se incluso in un rendiconto
   - Menu contestuale (tasto destro) su movimenti con Modifica/Elimina/Allegati
   - Report per periodo/categoria
   - Saldi negativi visualizzati in rosso nella lista conti
   - Giroconto tra registri con cancellazione a cascata del gemello
8. Piano dei conti gerarchico (padre/figlio, codici numerici crescenti)
   - Stampa PDF con selezione livelli
   - Validazione duplicati nome (case-insensitive)
   - Rinomina categoria con alert se ha movimenti
   - Elimina categoria con riassegnazione movimenti
9. Rendiconti economici:
   - Workflow: bozza → parrocchia → inviato → diocesi → approvato/respinto
   - Generazione PDF V4 con WeasyPrint (template Jinja2, 3 pagine)
   - Upload/scarica/elimina documenti allegati
   - Chiusura esercizio con blocco movimenti e creazione riporti
   - Correggi rendiconto respinto (riporta a stato parrocchia)
   - Elimina rendiconto con o senza documenti
10. Anagrafica persone base
11. Sacramenti (battesimo, comunione, cresima, matrimonio)
12. Certificati sacramentali PDF
13. Sistema Audit (tabella audit_log)
14. Allegati ai movimenti contabili
15. Formattazione importi formato italiano (15.000,00) — formatCurrency in utils/formatters.js
16. Pagina Login redesign (card bianca + onda SVG + form su sfondo blu, logo diocesi, ricordami)
   - NOTA: endpoint /api/auth/reset-password NON ESISTE ancora
17. Gestione sessione (sessionStorage, interceptor 401, verifica scadenza JWT ogni 30s)
18. AppShell unificato con sidebar accordion (Home, Contabilità, Inventario, Anagrafica, Impostazioni)
   - Moduli senza permesso: visibili ma grigi e non navigabili
19. Modulo Inventario backend completo (INV.1–INV.5):
   - 6 tabelle DB, 25 endpoint API, 3 template PDF
   - CRUD beni + foto + categorie + ubicazioni
   - Registri ufficiali con snapshot + storico beni rimossi
   - Frontend: header unificato stile ContabilitaLayout su tutte le pagine

### Da implementare (priorita)
ALTA:
1. Endpoint backend POST /api/auth/reset-password + servizio email
2. Interfaccia visualizzazione Audit Log
3. Riconciliazione bancaria

MEDIA:
4. Import movimenti da CSV/Excel
5. Modulo Anagrafica completo (famiglie, relazioni)
6. Frontend Inventario completo
7. Export dati

BASSA:
8. Dashboard statistiche
9. Notifiche email
10. Backup automatico schedulato

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
- Frontend: usare SEMPRE `import { formatCurrency } from '../utils/formatters'` (o `../../utils/formatters` da sottocartelle). NON creare funzioni locali duplicate. La funzione usa implementazione manuale (regex), NON Intl.NumberFormat.
- Backend template Jinja2: usare il filtro `|ita` (formato_italiano) per importi e `|ita_int` per numeri interi. NON usare `"%.2f"|format()`.

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

## REFACTORING ESEGUITO

Piano completo in REFACTORING_PLAN.md.

### Fasi 1-2 — COMPLETATE
- Pulizia file morti, fix sicurezza, rimossi console.log/print
- Unificata get_current_user in auth.py, eliminato X-User-ID, migrato tutto a JWT
- sacramenti.py e stampe.py SOSPESI (pattern DB incompatibile, da riscrivere)

### Fase 3 — Costanti (COMPLETATA)
- backend/constants.py: 5 Enum (StatoRendiconto, RuoloUtente, TipoMovimento, TipoSpecialeMovimento, TipoRegistro)
- 32 magic strings sostituite in 4 file backend

### Fase 4 — Frontend (COMPLETATA)
- 19 file migrati a api.js (91 chiamate unificate), logout centralizzato in utils/auth.js
- Fix: stampa PDF categorie (ordinamento gerarchico), codice automatico categorie, allegati movimenti/rendiconti
- Modulo Rendiconti UI/UX completato (correggi respinto, elimina, gestione allegati)

### Fase 0 — AppShell (COMPLETATA — 13/03/2026)
- AppShell.jsx: header + sidebar accordion per tutte le pagine protette
- Layout.jsx eliminato
- ContabilitaLayout.jsx: solo sub-header + modal, senza header/sidebar
- InventarioLayout.jsx: thin wrapper (flex-col + p-4 + Outlet)
- Header inventario unificato su 6 pagine (stile ContabilitaLayout)

### Sessione 14/03/2026 — Modulo Inventario + Sidebar Contabilità
- Sidebar inventario: aggiunta voce Stampa, fix stile uniforme tutte le voci
- ListaBeni: rimossi bottoni Bozza PDF e Genera Registro (spostati in ListaRegistri)
- ListaRegistri: aggiunti Bozza PDF e Genera Registro
- Nuova pagina StampaInventario.jsx con filtri (categoria, ubicazione, stato, date, valori)
- ImpostazioniInventario: tab Import/Export (esporta CSV/Excel, scarica template, importa)
- ImpostazioniInventario: categorie e ubicazioni sistema ora rinominabili (non eliminabili)
- Backend: inventario_export.py con endpoint export CSV/Excel e import CSV/Excel
- Backend: stampa/bozza aggiornata con filtri opzionali query params
- Sidebar contabilità ristrutturata: Conti (sempre blu), Movimentazione, Stampa, Rendiconto ▶, Impostazioni ▶
- ContabilitaLayout: barra superiore eliminata completamente
- AppShell: accordion non si chiude su click modulo attivo, reset sotto-accordion al cambio modulo
- Voci attive sidebar: bordo sinistro blu (border-l-2) invece di sfondo pieno
- Impostazioni contabilità: tendina con Aggiungi Conto (?openModal=true) e Gestione Categorie
- Form inventario compatti: label 12px, input 13px, padding 6px 10px, gap 12px
- Rimosso bottone Impostazioni globale dalla sidebar, eliminata pagina ImpostazioniContabilita.jsx

---

## NOTE TECNICHE CRITICHE

- Cache Python: eliminare __pycache__ dopo modifiche backend
- Token JWT: salvati in sessionStorage (NON localStorage). Si cancellano alla chiusura tab. Interceptor 401 in api.js gestisce redirect automatico a /login.
- STORAGE POLICY: sessionStorage per dati di sessione (token, user, ente_id, current_ente_id, current_ente). localStorage SOLO per preferenze persistenti (saved_email per "Ricordami").
- Template PDF V4: backend/templates/rendiconto.html (Jinja2 + WeasyPrint, 3 pagine)
  - NO flexbox (WeasyPrint non lo supporta bene) — usa float per layout orizzontali
  - Footer via @page @bottom-center di WeasyPrint (non div manuali)
  - Riferimento visuale: anteprima_rendiconto_v4.html (NON modificare il CSS senza confrontare col riferimento)
- Categorie: codici numerici crescenti (1, 2, 1.1, 1.2), "000" per riporti
- api.js: gestisce automaticamente locale vs produzione, ha request interceptor (token + ente_id) e response interceptor (401 → redirect /login)
- Password DB locale: parrocchia2025 (NON parrocchia)
- .env backend: postgres:5432 in Docker, localhost:5432 fuori Docker
- FORM DUPLICATI: il form "Aggiungi Conto" esiste in DUE file: ContabilitaLayout.jsx e Conti.jsx. Modifiche al form vanno fatte in ENTRAMBI i file!
- SALDO INIZIALE NEGATIVO: contabilita.py gestisce saldi negativi come movimento tipo 'uscita' con valore assoluto (sia creazione che modifica conto)
- APPSHELL UNIFICATO: l'app usa un unico AppShell.jsx (header + sidebar) per tutte le pagine protette.
  - AppShell.jsx → header condiviso + sidebar accordion (3 varianti: home, impostazioni, accordion moduli)
  - ContabilitaLayout.jsx → solo sub-header (freccia+titolo+ora) + modal conto/transazione, NIENTE header/sidebar
  - InventarioLayout.jsx → thin wrapper (flex-col + p-4 + Outlet)
  - HeaderAmministrazione.jsx → pagina Amministrazione (standalone, fuori AppShell)
- LOGIN PAGE: design card bianca con onda SVG + form su fondo blu. Logo ufficiale diocesi (frontend/public/logo-diocesi.png, 200px). CSS tutto inline nel tag <style> del componente (NO file CSS separati, NO TailwindCSS nella pagina login). NON usa Logo.jsx (deprecato).
- SELECT ENTE PAGE: stile coerente al Login. Header bianco + onda SVG, grid flex con card 320px, CSS inline con prefisso `se-`. Immagine chiesa in frontend/src/assets/chiesa.png.
- RESET PASSWORD: frontend ha il modal ma endpoint backend NON ESISTE ancora.
- CURRENT_USER: get_current_user (auth.py) restituisce dict con chiave "user_id" (NON "id"). Usare SEMPRE current_user["user_id"].
- X-USER-ID ELIMINATO: NON reintrodurre mai. Unico pattern auth: Depends(get_current_user) da auth.py basato su JWT.
- SACRAMENTI/STAMPE NON FUNZIONANTI: pattern DB incompatibile col setup sincrono. Da riscrivere quando si implementa modulo anagrafica.
- MAIN.PY — stato attuale (~300 righe):
  - 2 endpoint anagrafica (/api/anagrafica/persone GET e POST) → da eliminare quando si riscrive anagrafica
  - DELETE /api/anagrafica/persone/{id} → chiamato da Registro.jsx ma non esiste — BUG
  - Root / e health /api/health → restano in main.py per sempre
