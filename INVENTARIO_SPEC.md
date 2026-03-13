# MODULO INVENTARIO — Specifica Completa
## EcclesiaWeb — Diocesi di Caltagirone
*Documento di specifica tecnica e funzionale*
*Versione 1.1 — 12/03/2026*

---

## 1. OBIETTIVO

Modulo completo per la gestione dell'inventario dei beni parrocchiali (mobili e immobili), con:
- Inserimento e gestione beni con foto
- Ricerca avanzata
- Generazione registro ufficiale (immutabile)
- Storico beni non più presenti
- Storico registri generati
- Stampa PDF professionale

---

## 2. DATABASE — TABELLE

### 2.1 `inventario_categorie`
Categorie personalizzabili per ente.
```sql
id UUID PRIMARY KEY
ente_id UUID REFERENCES enti(id)
nome VARCHAR(100) NOT NULL
descrizione TEXT
ordine INTEGER DEFAULT 0
attivo BOOLEAN DEFAULT TRUE
is_sistema BOOLEAN DEFAULT FALSE  -- categorie predefinite non eliminabili
created_at TIMESTAMP DEFAULT NOW()
```

**Categorie predefinite (is_sistema = TRUE):**
- Vasi sacri
- Paramenti liturgici
- Arredi sacri
- Statue e sculture
- Quadri e opere d'arte
- Reliquiari e ostensori
- Croci e crocifissi
- Candelabri
- Campane
- Libri liturgici e manoscritti
- Strumenti musicali
- Impianti (audio, luci, riscaldamento)
- Attrezzature informatiche
- Immobili e terreni
- Veicoli
- Archivio storico
- Altro

---

### 2.2 `inventario_ubicazioni`
Ubicazioni personalizzabili per ente.
```sql
id UUID PRIMARY KEY
ente_id UUID REFERENCES enti(id)
nome VARCHAR(100) NOT NULL
descrizione TEXT
ordine INTEGER DEFAULT 0
attivo BOOLEAN DEFAULT TRUE
created_at TIMESTAMP DEFAULT NOW()
```

**Ubicazioni predefinite:**
- Chiesa principale
- Sagrestia
- Cappella laterale
- Canonica
- Oratorio/Salone
- Archivio
- Deposito
- Esterno/Giardino
- Altra ubicazione

---

### 2.3 `beni_inventario`
Tabella principale dei beni.
```sql
id UUID PRIMARY KEY
ente_id UUID REFERENCES enti(id)
numero_progressivo INTEGER NOT NULL  -- auto-incrementale per ente
categoria_id UUID REFERENCES inventario_categorie(id)
ubicazione_id UUID REFERENCES inventario_ubicazioni(id)

-- Dati principali
descrizione VARCHAR(500) NOT NULL
quantita INTEGER DEFAULT 1
provenienza TEXT
stato_conservazione VARCHAR(20)  -- ottimo/buono/discreto/restauro/scadente
valore_stimato DECIMAL(12,2)
valore_assicurato DECIMAL(12,2)
data_acquisto DATE
fornitore VARCHAR(200)

-- Dati culturali CEI (opzionali, collassati nel form)
codice_regione VARCHAR(50)
numero_catalogo_generale VARCHAR(50)
codice_ente_competente VARCHAR(50)

-- Note
note TEXT
note_storiche TEXT

-- Stato
stato VARCHAR(20) DEFAULT 'attivo'  -- attivo / rimosso
bloccato BOOLEAN DEFAULT FALSE      -- TRUE dopo generazione registro
registro_id UUID REFERENCES inventario_registri(id)

-- Rimozione (soft delete → storico)
data_rimozione DATE
motivo_rimozione VARCHAR(50)   -- venduto/rubato/donato/distrutto/deteriorato/trasferito/smarrito/altro
note_rimozione TEXT
rimosso_da UUID REFERENCES utenti(id)
rimosso_at TIMESTAMP

-- Audit
created_by UUID REFERENCES utenti(id)
created_at TIMESTAMP DEFAULT NOW()
updated_by UUID REFERENCES utenti(id)
updated_at TIMESTAMP DEFAULT NOW()
```

---

### 2.4 `inventario_foto`
Foto associate ai beni.
```sql
id UUID PRIMARY KEY
bene_id UUID REFERENCES beni_inventario(id) ON DELETE CASCADE
ente_id UUID REFERENCES enti(id)
nome_file VARCHAR(255) NOT NULL
path_file VARCHAR(500) NOT NULL      -- path su MinIO
mime_type VARCHAR(100)
dimensione INTEGER                   -- bytes
ordine INTEGER DEFAULT 0             -- foto principale = 0
didascalia TEXT
uploaded_by UUID REFERENCES utenti(id)
created_at TIMESTAMP DEFAULT NOW()
```

---

### 2.5 `inventario_registri`
Registri ufficiali generati (immutabili).
```sql
id UUID PRIMARY KEY
ente_id UUID REFERENCES enti(id)
numero_registro INTEGER NOT NULL     -- progressivo per ente
anno INTEGER NOT NULL
data_generazione TIMESTAMP DEFAULT NOW()
totale_beni INTEGER
pdf_path VARCHAR(500)
note TEXT
generato_da UUID REFERENCES utenti(id)
created_at TIMESTAMP DEFAULT NOW()
-- NESSUN updated_at — immutabile
```

---

### 2.6 `inventario_storico`
Storico beni non più presenti (immutabile).
```sql
id UUID PRIMARY KEY
ente_id UUID REFERENCES enti(id)
bene_id UUID
numero_progressivo INTEGER
snapshot_bene JSONB NOT NULL         -- copia completa bene al momento rimozione
snapshot_foto JSONB                  -- array URL foto
data_rimozione DATE NOT NULL
motivo_rimozione VARCHAR(50) NOT NULL
note_rimozione TEXT
registro_era_generato BOOLEAN
rimosso_da UUID REFERENCES utenti(id)
rimosso_at TIMESTAMP DEFAULT NOW()
-- NESSUN updated_at — immutabile
```

---

## 3. BACKEND — API ENDPOINTS

### Categorie
```
GET    /api/inventario/categorie              Lista categorie ente
POST   /api/inventario/categorie              Crea categoria
PUT    /api/inventario/categorie/{id}         Modifica (solo non-sistema)
DELETE /api/inventario/categorie/{id}         Elimina (solo se nessun bene)
```

### Ubicazioni
```
GET    /api/inventario/ubicazioni             Lista ubicazioni ente
POST   /api/inventario/ubicazioni             Crea ubicazione
PUT    /api/inventario/ubicazioni/{id}        Modifica ubicazione
DELETE /api/inventario/ubicazioni/{id}        Elimina (solo se nessun bene)
```

### Beni
```
GET    /api/inventario/beni                   Lista beni (con filtri)
GET    /api/inventario/beni/{id}              Dettaglio bene
POST   /api/inventario/beni                   Crea bene
PUT    /api/inventario/beni/{id}              Modifica (solo se non bloccato)
DELETE /api/inventario/beni/{id}              Rimuovi bene (soft delete → storico)
```

### Foto
```
GET    /api/inventario/beni/{id}/foto         Lista foto bene
POST   /api/inventario/beni/{id}/foto         Upload foto (MinIO)
DELETE /api/inventario/foto/{foto_id}         Elimina foto
PUT    /api/inventario/foto/{foto_id}/ordine  Riordina foto
```

### Registri
```
GET    /api/inventario/registri               Lista registri generati
GET    /api/inventario/registri/{id}/pdf      Download PDF registro
POST   /api/inventario/registri/genera        Genera registro (blocca beni)
```

### Stampa e Storico
```
GET    /api/inventario/stampa/bozza           PDF bozza registro attuale
GET    /api/inventario/stampa/bene/{id}       PDF scheda singolo bene
GET    /api/inventario/storico                Lista storico beni non più presenti
GET    /api/inventario/storico/pdf            PDF storico
```

---

## 4. FRONTEND — PAGINE E COMPONENTI

### 4.1 Layout navigazione
Inventario è un modulo separato con proprio layout e menu laterale.
Quando l'utente clicca "Inventario" dal menu principale, si apre il layout inventario con menu laterale dedicato:
- 📦 Beni
- 📋 Registri
- 🗂️ Storico
- ⚙️ Impostazioni

(Stesso pattern di Contabilità — menu laterale cambia in base al modulo attivo)

---

### 4.2 Pagina Lista Beni (`/inventario/beni`)

**Header:**
- Titolo "Inventario Beni"
- Contatore totale beni attivi
- Bottone "+ Aggiungi Bene"
- Bottone "🖨️ Stampa Bozza"
- Bottone "📋 Genera Registro"

**Barra ricerca/filtri:**
- 🔍 Campo ricerca testo libero (descrizione, note, provenienza)
- Filtro Categoria (dropdown)
- Filtro Ubicazione (dropdown)
- Filtro Stato conservazione (dropdown)
- Filtro Bloccato/Modificabile (toggle)
- Bottone Reset filtri

**Tabella beni:**
| N° | Foto | Descrizione | Categoria | Ubicazione | Q.tà | Stato | Azioni |
- Ordinabile per colonna
- Foto thumbnail 40x40px
- Badge stato conservazione colorato
- 🔒 icona se bloccato da registro
- Azioni: 👁️ Visualizza | ✏️ Modifica | Rimuovi

---

### 4.3 Pagina Dettaglio/Modifica Bene (`/inventario/beni/{id}`)

**Sezione dati principali:**
- Numero progressivo (auto, non modificabile)
- Descrizione *
- Categoria * (dropdown con ricerca)
- Ubicazione * (dropdown con ricerca)
- Quantità (default 1)
- Stato conservazione (Ottimo/Buono/Discreto/Restauro/Scadente)
- Provenienza
- Data acquisto
- Fornitore
- Valore stimato €
- Valore assicurato €

**Sezione CEI (collassabile — ▶ Dati catalogazione CEI — opzionale):**
- Codice Regione
- Numero Catalogo Generale
- Codice Ente Competente

**Sezione Note:**
- Note generali
- Note storiche (storia, autore, epoca)

**Sezione Foto:**
- Griglia foto con anteprima
- Upload drag&drop o click (da browser/telefono)
- Foto principale ⭐
- Didascalia per ogni foto
- Elimina singola foto
- Riordina foto

**Footer:**
- Data registrazione (auto)
- Creato da / Modificato da
- 🔒 "BLOCCATO — Registro N° X del gg/mm/aaaa" (se bloccato)

---

### 4.4 Pagina Registri (`/inventario/registri`)

**Lista registri:**
- N° Registro | Anno | Data generazione | Totale beni | Generato da | Azioni
- Azioni: 📥 Scarica PDF

**Modal Genera Registro:**
- Totale beni che verranno bloccati
- Avviso: i beni non saranno più modificabili
- Note opzionali
- Bottone "Genera Registro"

---

### 4.5 Pagina Storico (`/inventario/storico`)

**Filtri:**
- Ricerca per descrizione
- Filtro per anno
- Filtro per motivo
- Filtro per categoria

**Tabella:**
- N° | Descrizione | Categoria | Data | Motivo | Rimosso da | Azioni
- Azione: 👁️ Visualizza scheda (solo lettura) | 🖨️ Stampa scheda

**Bottone:** "🖨️ Stampa Storico Completo" (PDF)

---

### 4.6 Impostazioni (`/inventario/impostazioni`)

**Tab Categorie:**
- Lista con badge "Sistema" per categorie predefinite
- Aggiungi/Modifica/Elimina categorie personalizzate

**Tab Ubicazioni:**
- Lista ubicazioni
- Aggiungi/Modifica/Elimina ubicazioni

---

## 5. PDF — FORMATO STAMPE

### 5.1 Bozza Registro
- Header: logo diocesi + nome parrocchia
- Titolo: "REGISTRO INVENTARIO BENI — BOZZA"
- Tabella beni per numero progressivo
- Colonne: N° | Descrizione | Categoria | Ubicazione | Q.tà | Stato | Valore stimato
- Footer: "Documento non ufficiale — Bozza aggiornata al gg/mm/aaaa"

### 5.2 Registro Ufficiale
- Header: logo diocesi + nome parrocchia
- Titolo: "REGISTRO INVENTARIO BENI del gg/mm/aaaa"
- Tabella beni con foto thumbnail (opzionale)
- Firma parroco in fondo

### 5.3 Scheda Singolo Bene
- Tutti i dati del bene
- Foto grandi (max 2 per pagina)
- Note storiche
- Dati CEI (se presenti)

### 5.4 Storico
- Header: "STORICO BENI"
- Tabella con data e motivo rimozione
- Immutabile

---

## 6. REGOLE DI BUSINESS

1. **Numero progressivo:** auto-incrementale per ente, mai riutilizzato
2. **Bene modificabile:** solo se `bloccato = FALSE`
3. **Bene rimovibile:** sempre (bloccato o no) → va nello storico
4. **Genera registro:** blocca TUTTI i beni attivi → `bloccato = TRUE`
5. **Storico:** immutabile — nessun UPDATE/DELETE
6. **Foto:** su MinIO, path in DB
7. **Categorie sistema:** non eliminabili, non rinominabili
8. **Multi-ente:** ogni parrocchia ha il suo inventario separato

---

## 7. STRUTTURA FILE

### Backend
```
backend/routes/
└── inventario.py          # Tutti gli endpoint (~600 righe)
backend/
└── inventario_pdf.py      # PDF con WeasyPrint
```

### Frontend
```
frontend/src/pages/Inventario/
├── InventarioLayout.jsx       # Layout con menu laterale
├── ListaBeni.jsx              # Lista con ricerca/filtri
├── SchedaBene.jsx             # Dettaglio/modifica bene
├── ListaRegistri.jsx          # Registri ufficiali
├── StoricoInventario.jsx      # Storico beni
└── ImpostazioniInventario.jsx # Categorie/ubicazioni
```

---

## 8. PIANO DI SVILUPPO

| Blocco | Descrizione | Stima |
|--------|-------------|-------|
| INV.1 | Migration DB (6 tabelle) + seed categorie/ubicazioni | 1h |
| INV.2 | Backend CRUD beni + categorie + ubicazioni | 3h |
| INV.3 | Backend upload foto (MinIO) | 1h |
| INV.4 | Backend registri + storico | 2h |
| INV.5 | Backend PDF (bozza + ufficiale + scheda) | 3h |
| INV.6 | Frontend Layout + ListaBeni con filtri | 3h |
| INV.7 | Frontend SchedaBene con upload foto | 3h |
| INV.8 | Frontend Registri + Storico | 2h |
| INV.9 | Frontend Impostazioni categorie/ubicazioni | 1h |
| INV.10 | Test completo + fix | 2h |

**Totale stimato: ~21 ore (4-5 sessioni)**

---

*Fine documento specifica — Versione 1.1*
*EcclesiaWeb — Diocesi di Caltagirone — 2026*
