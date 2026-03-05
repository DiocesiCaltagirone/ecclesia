# REFACTORING PLAN — EcclesiaWeb

> Analisi completa del progetto eseguita il 03/03/2026
> Totale: ~11.500 righe backend, ~15.700 righe frontend, 44 file frontend, 140+ endpoint/funzioni backend

---

## INDICE

1. [Backend — Problemi Critici](#1-backend--problemi-critici)
2. [Backend — Codice Morto e File da Eliminare](#2-backend--codice-morto-e-file-da-eliminare)
3. [Backend — Duplicazioni](#3-backend--duplicazioni)
4. [Backend — Magic String](#4-backend--magic-string)
5. [Backend — Business Logic nelle Route](#5-backend--business-logic-nelle-route)
6. [Backend — Error Handling](#6-backend--error-handling)
7. [Backend — Sicurezza](#7-backend--sicurezza)
8. [Frontend — Bug Runtime Critici](#8-frontend--bug-runtime-critici)
9. [Frontend — Codice Morto](#9-frontend--codice-morto)
10. [Frontend — Duplicazioni](#10-frontend--duplicazioni)
11. [Frontend — Inconsistenze API e Stile](#11-frontend--inconsistenze-api-e-stile)
12. [Frontend — State Management](#12-frontend--state-management)
13. [Frontend — Accessibilita e Performance](#13-frontend--accessibilita-e-performance)
14. [Architettura Generale](#14-architettura-generale)
15. [Piano d'Azione in 5 Fasi](#15-piano-dazione-in-5-fasi)

---

## 1. BACKEND — PROBLEMI CRITICI

### 1.1 Tre pattern di accesso al DB incompatibili

| Pattern | File che lo usano | Funziona? |
|---------|-------------------|-----------|
| SQLAlchemy sincrono `db.execute(text(...))` | main.py, routes/contabilita.py, routes/auth.py, routes/amministrazione.py, routes/template_categorie.py, routes/audit.py | SI |
| psycopg2 diretto `cur.execute(...)` | routes/rendiconti_crud.py, routes/rendiconti_documenti.py, routes/persone.py, routes/certificati.py, routes/impostazioni_diocesi.py, permissions.py | SI |
| asyncpg `await db.fetchrow(...)` | routes/sacramenti.py | **NO — NON FUNZIONA** |
| async SQLAlchemy `await db.execute(...)` | routes/stampe.py | **NO — NON FUNZIONA** |

- **File**: `backend/routes/sacramenti.py` (504 righe) — usa asyncpg con parametri `$1`, completamente incompatibile
- **File**: `backend/routes/stampe.py` (493 righe) — usa async SQLAlchemy, incompatibile col setup sincrono
- **Priorita**: CRITICA
- **Fix**: Riscrivere entrambi con SQLAlchemy sincrono o psycopg2
- **Tempo**: 4-6 ore

### 1.2 Nessun controllo ruolo in amministrazione.py

- **File**: `backend/routes/amministrazione.py` — NESSUN endpoint verifica che l'utente sia economo
- **Impatto**: Chiunque autenticato puo creare/eliminare utenti, enti, resettare password
- **Endpoint esposti senza controllo**:
  - `POST /api/amministrazione/parrocchie` (riga 163)
  - `PUT /api/amministrazione/parrocchie/{id}` (riga 215)
  - `DELETE /api/amministrazione/parrocchie/{id}` (riga 277)
  - `POST /api/amministrazione/utenti` (riga 733)
  - `POST /api/amministrazione/utenti/{id}/reset-password` (riga 902) — **chiunque puo resettare password!**
  - `DELETE /api/amministrazione/utenti/{id}` (riga 860)
- **Priorita**: CRITICA
- **Fix**: Aggiungere check `if not current_user.get('is_economo'): raise HTTPException(403)` a ogni endpoint
- **Tempo**: 1 ora

### 1.3 Due sistemi di autenticazione incompatibili

| Sistema | Usato da | Sicurezza |
|---------|----------|-----------|
| JWT Bearer token | La maggior parte dei route | Sicuro |
| Header `X-User-ID` | persone.py, certificati.py, permissions.py | **INSICURO — l'utente si auto-identifica** |

- **File**: `backend/routes/persone.py`, `backend/routes/certificati.py`
- **Impatto**: Un attaccante puo impostare qualsiasi UUID come X-User-ID
- **Priorita**: CRITICA
- **Fix**: Migrare persone.py e certificati.py a JWT `Depends(get_current_user)`
- **Tempo**: 3-4 ore

### 1.4 Funzione get_current_user TRIPLICATA con chiavi diverse

| Versione | File | Chiave utente |
|----------|------|---------------|
| 1 | `backend/auth.py:59` | `user_id` |
| 2 | `backend/main.py:74` | `id` |
| 3 | `backend/middleware.py:265` | stringa UUID da header |

- **Impatto**: `current_user.get('id')` vs `current_user.get('user_id')` causa bug sottili
- **Priorita**: CRITICA
- **Fix**: Mantenere solo la versione in auth.py, eliminare le altre
- **Tempo**: 2 ore

---

## 2. BACKEND — CODICE MORTO E FILE DA ELIMINARE

### 2.1 File backup da eliminare

| File | Righe | Motivo |
|------|------:|--------|
| `backend/main_OLD.py` | 1.165 | Vecchia versione di main.py |
| `backend/certificati_OLD.py` | 549 | Vecchio generatore certificati |
| `backend/certificati_backup.py` | 680 | Altro backup certificati |
| `backend/routes/amministrazione_BACKUP.py` | 223 | Vecchia amministrazione asyncpg |
| `backend/fix_db.py` | 38 | Script fix una tantum |
| `backend/fix_constraint.sql` | — | Fix SQL una tantum |
| `backend/test_certificati.py` | 222 | Script test manuale |
| `backend/Dockerfile.txt` | — | Duplicato di Dockerfile |
| `backend/templates/1.html` | — | Vecchia bozza template |
| `backend/models/sacramenti.py.py` | 169 | File con doppia estensione .py.py |

- **Totale righe da eliminare**: ~3.046
- **Priorita**: ALTA
- **Tempo**: 15 minuti

### 2.2 __pycache__ committati in git

- **45 file .pyc** sono tracciati da git
- **Non esiste un file `.gitignore`** nel repository
- **Priorita**: ALTA
- **Fix**: Creare `.gitignore`, rimuovere __pycache__ dal tracking
- **Tempo**: 10 minuti

### 2.3 Import inutilizzati

| File | Riga | Import |
|------|------|--------|
| `backend/main.py` | 22 | `import permissions` — usato solo in endpoint test |
| `backend/middleware.py` | 11 | `import re` — mai usato |
| `backend/routes/contabilita.py` | 28 | `import time` — mai usato |
| `backend/routes/rendiconti_documenti.py` | 18-19 | `Path` e `datetime` duplicati |

- **Priorita**: BASSA
- **Tempo**: 10 minuti

### 2.4 Print statement (~130 nel codice attivo)

| File | N. print | Tipo |
|------|------:|------|
| `routes/contabilita.py` | 35 | Debug con emoji |
| `routes/rendiconti_crud.py` | 18 | Debug blocco/sblocco |
| `permissions.py` | 9 | Errori silenziati |
| `main.py` | 5 | **DEBUG LOGIN con user_id — LEAK INFO SENSIBILI** |
| `middleware.py` | 3 | Ogni richiesta HTTP genera 2 righe log |
| Altri file | ~60 | Vari |

- **Priorita**: ALTA (specialmente main.py righe 299-303 che logga credenziali)
- **Fix**: Rimuovere tutti i print, sostituire con modulo `logging` dove serve
- **Tempo**: 1 ora

---

## 3. BACKEND — DUPLICAZIONI

### 3.1 Endpoint duplicati (CRITICO)

**Login duplicato:**
- `backend/main.py:271` — `POST /api/auth/login` (con debug print)
- `backend/routes/auth.py:39` — `POST /api/auth/login` (versione pulita)

**Persone duplicate:**
- `backend/main.py:165,223` — `GET/POST /api/anagrafica/persone` (JWT, SQLAlchemy)
- `backend/routes/persone.py:110,211` — `GET/POST /api/persone/` (X-User-ID, psycopg2)

**Enti duplicati:**
- `backend/main.py:387-521` — `GET/PUT /api/enti/{id}`
- `backend/routes/amministrazione.py:332-601` — `GET/POST/PUT/DELETE /api/amministrazione/enti`

**Auth/Me duplicato:**
- `backend/main.py:346` — `GET /api/auth/me` (restituisce `id`)
- `backend/routes/auth.py:256` — `GET /api/auth/me` (restituisce `user_id`)

- **Priorita**: CRITICA
- **Fix**: Eliminare tutti gli endpoint duplicati da main.py, mantenere solo quelli nei route files
- **Tempo**: 2 ore

### 3.2 Audit duplicato

- `backend/services/audit.py` — `registra_audit` (SQLAlchemy) + `registra_audit_psycopg2`
- `backend/permissions.py:400` — `log_modifica` scrive su tabella `log_modifiche` (DIVERSA da `audit_log`)
- Due sistemi di audit per due tabelle diverse
- **Priorita**: MEDIA
- **Tempo**: 2 ore

### 3.3 Query SQL ripetute

- Verifica "utente e economo" in almeno 5 posti con logica diversa (`is_economo` vs `ruolo='economo'` vs `ruolo='economo_diocesano'`)
- Query "ottieni ente_id dell'utente" ripetuta in 3 file
- Query "ottieni operatori di un ente" ripetuta identica in 2 punti di amministrazione.py (righe 369-390 e 523-543)
- **Priorita**: MEDIA
- **Fix**: Creare funzioni helper in un servizio dedicato
- **Tempo**: 3 ore

---

## 4. BACKEND — MAGIC STRING

Stringhe hardcoded senza costanti centralizzate:

| Tipo | Valori | File coinvolti |
|------|--------|----------------|
| Stati rendiconto | `'bozza'`, `'parrocchia'`, `'definitivo'`, `'inviato'`, `'approvato'`, `'respinto'` | rendiconti_crud.py, rendiconti_documenti.py, contabilita.py |
| Tipi movimento | `'entrata'`, `'uscita'` | contabilita.py, rendiconti_crud.py |
| Tipi speciali | `'saldo_iniziale'`, `'giroconto'` | contabilita.py, rendiconti_crud.py |
| Ruoli utente | `'parroco'`, `'economo'`, `'operatore'`, `'economo_diocesano'`, `'cassiere'` | amministrazione.py, permissions.py, rendiconti_crud.py |
| Password predefinita | `"Parrocchia2024!"` | amministrazione.py righe 745, 913 |

- **Priorita**: MEDIA
- **Fix**: Creare `backend/constants.py` con classi Enum o costanti
- **Tempo**: 1.5 ore

---

## 5. BACKEND — BUSINESS LOGIC NELLE ROUTE

### 5.1 Funzioni troppo lunghe

| Funzione | File | Righe | Responsabilita |
|----------|------|------:|----------------|
| `crea_rendiconto` | rendiconti_crud.py:48-338 | 290 | Verifica duplicati, calcola totali, rende definitivi, crea rendiconto, audit, blocca movimenti, crea saldi, genera PDF |
| `genera_pdf_rendiconto` | rendiconti_documenti.py:479-815 | 330 | Query ente, query rendiconto, query movimenti, organizza dati, rendering Jinja2 + WeasyPrint |
| `create_giroconto` | contabilita.py:1160-1355 | 195 | Crea/trova categoria, crea 2 movimenti, collega, aggiorna saldi |

- **Priorita**: MEDIA
- **Fix**: Scomporre in servizi: `services/rendiconti.py`, `services/contabilita.py`, `services/pdf.py`
- **Tempo**: 6-8 ore

### 5.2 File troppo lunghi

| File | Righe | Consiglio |
|------|------:|-----------|
| `routes/contabilita.py` | 2.419 | Spezzare in: registri.py, movimenti.py, categorie.py, giroconti.py |
| `routes/amministrazione.py` | 1.263 | Spezzare in: parrocchie.py, utenti.py, enti_crud.py |
| `routes/rendiconti_crud.py` | 842 | OK ma estrarre logica in servizio |
| `routes/rendiconti_documenti.py` | 816 | OK ma estrarre generazione PDF |
| `main.py` | 699 | Rimuovere endpoint duplicati, dovrebbe scendere a ~100 righe |

- **Priorita**: MEDIA
- **Tempo**: 4-6 ore

---

## 6. BACKEND — ERROR HANDLING

### 6.1 Pattern inconsistente tra file

- `contabilita.py`: try/except con `except HTTPException: raise` poi `except Exception` — pattern corretto ma verboso
- `persone.py`: `conn.close()` nel blocco except — rischio se `conn` non esiste (righe 311-314, 400-404, 469-472)
- `certificati.py`: bare try/except che cattura tutto
- `audit.py`: `print(f"Errore...")` poi `raise HTTPException(500, str(e))` — espone dettagli interni
- `permissions.py`: tutte le funzioni inghiottono silenziosamente gli errori con `return False/None/[]`

### 6.2 Connection leak con psycopg2

File che aprono connessioni manuali senza `finally:conn.close()`: rendiconti_crud.py, rendiconti_documenti.py, persone.py, certificati.py, impostazioni_diocesi.py. Se un'eccezione avviene prima di `conn.close()`, la connessione resta aperta.

- **Priorita**: ALTA
- **Fix**: Usare context manager `with get_db_connection() as conn:` ovunque
- **Tempo**: 3 ore

---

## 7. BACKEND — SICUREZZA

### 7.1 SQL Injection potenziale

- **File**: `backend/services/audit.py:91` — `text(f"SELECT * FROM {tabella} WHERE id = :id")` — nome tabella in f-string senza whitelist
- **File**: `backend/permissions.py:172` — `f"SELECT ... FROM {tabella} s JOIN..."` — ha whitelist a riga 168-170 (OK)
- **Priorita**: ALTA
- **Fix**: Aggiungere validazione whitelist in audit.py
- **Tempo**: 15 minuti

### 7.2 Password predefinita esposta nella risposta API

- **File**: `backend/routes/amministrazione.py:780` — `return {"message": f"Utente creato! Password predefinita: {DEFAULT_PASSWORD}"}`
- **File**: `backend/routes/amministrazione.py:936` — `return {"password_predefinita": DEFAULT_PASSWORD}`
- **Priorita**: ALTA
- **Fix**: Non restituire la password nella risposta, inviarla via email o mostrarla solo una volta
- **Tempo**: 30 minuti

### 7.3 Nessuna validazione input Pydantic

- `backend/main.py` — endpoint che accettano `data: dict` senza schema: righe 223, 528, 556
- `backend/routes/contabilita.py` — molti endpoint con `data: dict`: righe 67, 203, 632
- **Priorita**: MEDIA
- **Fix**: Creare modelli Pydantic per ogni endpoint
- **Tempo**: 4 ore

### 7.4 N+1 query

- `routes/amministrazione.py:332-421` (`get_enti`): per ogni ente, query separata per operatori
- `routes/amministrazione.py:671-730` (`get_utenti`): per ogni utente, query separata per enti
- **Priorita**: MEDIA
- **Fix**: Usare JOIN o query batch
- **Tempo**: 1.5 ore

---

## 8. FRONTEND — BUG RUNTIME CRITICI

### 8.1 FormMatrimonio.jsx MANCANTE

- **File**: `frontend/src/components/sacramenti/TabSacramenti.jsx:11`
- `import FormMatrimonio from './FormMatrimonio'` — **il file NON ESISTE**
- **Impatto**: Crash a runtime quando si apre il form matrimonio
- **Priorita**: CRITICA
- **Tempo**: 2-3 ore (scrivere il componente)

### 8.2 lucide-react non installato

- 8 file in `components/sacramenti/` importano da `lucide-react` (X, Calendar, MapPin, User, etc.)
- `lucide-react` **NON e' in package.json**
- **Impatto**: Errore di build/runtime, tutta la sezione sacramenti non funziona
- **Priorita**: CRITICA
- **Fix**: `npm install lucide-react`
- **Tempo**: 1 minuto

### 8.3 Funzioni non definite in Registro.jsx

- **File**: `frontend/src/pages/Registro.jsx`
- Riga 327: `handleEdit(persona.id)` — **funzione MAI definita**
- Riga 333: `handleDelete(persona.id)` — **funzione MAI definita**
- Riga 344: `navigate(...)` — **useNavigate NON importato**
- **Impatto**: 3 crash a runtime quando l'utente clicca i bottoni
- **Priorita**: CRITICA
- **Tempo**: 30 minuti

### 8.4 setError non definito in Persone.jsx

- **File**: `frontend/src/pages/Persone.jsx:40,59`
- Chiama `setError(...)` ma lo stato `error`/`setError` **NON e' dichiarato** con useState
- **Impatto**: Crash a runtime quando si verifica un errore
- **Priorita**: CRITICA
- **Tempo**: 5 minuti

### 8.5 DettaglioPersona.jsx import path errato

- **File**: `frontend/src/components/sacramenti/DettaglioPersona.jsx:4`
- Importa `./sacramenti/TabSacramenti` ma e' GIA dentro `sacramenti/` — path errato
- **Priorita**: CRITICA
- **Tempo**: 2 minuti

---

## 9. FRONTEND — CODICE MORTO

### 9.1 Console.log — 132 occorrenze in 32 file

| File | N. | Tipo |
|------|---:|------|
| Rapporti.jsx | 13 | Debug dati |
| ContabilitaLayout.jsx | 10 | "LAYOUT DEBUG" con emoji |
| Dashboard.jsx | 9 | Debug |
| MovimentiGenerale.jsx | 8 | Debug |
| NuovoRendiconto.jsx | 8 | Debug |
| GestioneUtenti.jsx | 8 | Debug |
| Layout.jsx | 6 | "LAYOUT DEBUG" con emoji |
| Altri 25 file | ~70 | Vari |

- **Priorita**: ALTA
- **Tempo**: 30 minuti

### 9.2 File inutilizzati da eliminare

| File | Righe | Motivo |
|------|------:|--------|
| `frontend/src/components/Logo.jsx` | 39 | Non importato da nessun file (sostituito da logo-diocesi.png) |
| `frontend/src/src/components/Logo.jsx` | 56 | Directory `src/src/` errata, duplicato |
| `frontend/src/components/contexts/DataContext.jsx` | 66 | Copia duplicata del file in `contexts/` |

- **Priorita**: ALTA
- **Tempo**: 5 minuti

### 9.3 Stato inutilizzato

- `HeaderAmministrazione.jsx:8` — `showSettingsModal`/`setShowSettingsModal` dichiarato ma nessun modal renderizzato
- `EconomatoContabilita.jsx:17` — `osservazioni` resettata ma mai letta

- **Priorita**: BASSA
- **Tempo**: 5 minuti

---

## 10. FRONTEND — DUPLICAZIONI

### 10.1 Form "Aggiungi Conto" duplicato (noto)

- `ContabilitaLayout.jsx:528-643` e `Conti.jsx:327-454`
- Due form quasi identici, ogni bug fix va applicato 2 volte
- **Fix**: Estrarre in `components/FormNuovoConto.jsx`
- **Priorita**: ALTA
- **Tempo**: 1.5 ore

### 10.2 Funzione downloadPdf duplicata in 4 file

- `Rendiconto.jsx`, `NuovoRendiconto.jsx`, `ListaRendiconti.jsx`, `EconomatoContabilita.jsx`
- Stessa funzione (fetch blob, createObjectURL, click link)
- **Fix**: Estrarre in `utils/download.js`
- **Priorita**: ALTA
- **Tempo**: 30 minuti

### 10.3 handleLogout duplicato in 4 file

- `Layout.jsx`, `ContabilitaLayout.jsx`, `HeaderAmministrazione.jsx`, `Amministrazione.jsx`
- Stessa logica: sessionStorage.clear + navigate /login
- **Fix**: Estrarre in `utils/auth.js` o in un hook `useAuth()`
- **Priorita**: MEDIA
- **Tempo**: 30 minuti

### 10.4 Logica context menu duplicata

- `MovimentiConto.jsx` e `MovimentiGenerale.jsx` — ~100 righe identiche per menu tasto destro
- **Fix**: Estrarre in `components/ContextMenu.jsx`
- **Priorita**: MEDIA
- **Tempo**: 1 ora

### 10.5 formatDate duplicata in 4 file sacramenti

- `CardBattesimo.jsx:28`, `CardCresima.jsx:28`, `CardMatrimonio.jsx:28`, `CardPrimaComunione.jsx:28`
- **Fix**: Aggiungere a `utils/formatters.js`
- **Priorita**: MEDIA
- **Tempo**: 15 minuti

### 10.6 Logica "fuori parrocchia" duplicata in 3 form sacramenti

- `FormBattesimo.jsx`, `FormCresima.jsx`, `FormPrimaComunione.jsx` — ~80 righe identiche ciascuno
- **Fix**: Estrarre hook `useFuoriParrocchia()`
- **Priorita**: MEDIA
- **Tempo**: 1 ora

### 10.7 Modal Nuovo/Modifica Ente duplicato

- `GestioneEnti.jsx:597-759` e `762-903` — due modal quasi identici
- **Fix**: Unificare in un solo modal con prop `mode="create"|"edit"`
- **Priorita**: MEDIA
- **Tempo**: 1 ora

### 10.8 Oggetto tipiConto duplicato

- `ContabilitaLayout.jsx:33-44` e `Conti.jsx:21-32` — stessa mappa
- **Fix**: Estrarre in `utils/constants.js`
- **Priorita**: BASSA
- **Tempo**: 10 minuti

---

## 11. FRONTEND — INCONSISTENZE API E STILE

### 11.1 Tre modi diversi di fare chiamate HTTP

| Metodo | File che lo usano | Problema |
|--------|-------------------|----------|
| `api.js` (axios con interceptor) | Login.jsx, SelectEnte.jsx, ImpostazioniDatiGenerali.jsx | OK — modo corretto |
| `fetch()` diretto | 18+ file (ContabilitaLayout, Conti, Movimenti, Dashboard, GestioneEnti, GestioneUtenti, etc.) | Token gestito manualmente ogni volta |
| `import axios from 'axios'` (senza interceptor) | Rapporti.jsx, TabSacramenti.jsx, tutti i Card/Form sacramenti | Bypass completo degli interceptor |

- **Impatto**: L'interceptor 401 (redirect a /login su token scaduto) funziona SOLO per i file che usano `api.js`. I 25+ file che usano `fetch()` o `axios` diretto non gestiscono il 401.
- **Priorita**: ALTA
- **Fix**: Migrare tutti i file a usare `import api from '../services/api'`
- **Tempo**: 3-4 ore

### 11.2 Login.jsx usa CSS inline, resto usa TailwindCSS

- `Login.jsx`: ~345 righe di CSS in tag `<style>` con colori custom (#1a365d, #C8A84E)
- Tutte le altre pagine usano TailwindCSS
- Non e' un bug ma e' un'inconsistenza architettuale
- **Priorita**: BASSA (funziona, e' intenzionale)

### 11.3 Rapporti.jsx inietta CSS globale nel document.head

- `Rapporti.jsx:31-35`: inserisce un `<style>` nel `document.head` come side effect a livello modulo
- Viene eseguito al primo import e mai rimosso
- **Priorita**: MEDIA
- **Fix**: Spostare in useEffect con cleanup
- **Tempo**: 15 minuti

### 11.4 Paginazione fittizia in GestioneEnti.jsx

- `GestioneEnti.jsx:576-591`: bottoni "Prec", "1", "2", "Succ" hardcoded senza onClick
- L'utente vede una paginazione che non fa nulla
- **Priorita**: MEDIA
- **Fix**: Rimuovere o implementare
- **Tempo**: 15 min (rimuovere) o 2 ore (implementare)

---

## 12. FRONTEND — STATE MANAGEMENT

### 12.1 DataContext quasi completamente inutilizzato

- `frontend/src/contexts/DataContext.jsx` (67 righe): definisce refresh counters per utenti, enti, categorie, movimenti, registri
- **Consumato solo da**: GestioneEnti.jsx (usa `refreshCounters.enti`)
- **Non consumato da**: nessun componente contabilita, movimenti, registri, categorie
- Il DataProvider avvolge l'intera app in App.jsx ma e' di fatto inerte
- **Priorita**: MEDIA
- **Fix**: O utilizzarlo davvero o rimuoverlo
- **Tempo**: 1 ora

### 12.2 Nessun state management globale

- Lo "stato globale" e' `sessionStorage` (token, user, current_ente_id)
- Non e' reattivo: se un valore cambia, i componenti montati non si aggiornano
- Non c'e' Redux, Zustand, o Context funzionante
- **Priorita**: BASSA (funziona per le esigenze attuali)

### 12.3 sessionStorage letto in ogni componente

```javascript
const token = sessionStorage.getItem('token');
const enteId = sessionStorage.getItem('ente_id');
```

Ripetuto in quasi ogni file. Potrebbe essere centralizzato nell'interceptor di api.js (che gia lo fa) se tutti usassero api.js.

---

## 13. FRONTEND — ACCESSIBILITA E PERFORMANCE

### 13.1 Accessibilita — ZERO supporto

- Zero `aria-label` in tutta l'applicazione
- Zero `aria-hidden` su icone decorative
- Zero focus trap nei modal
- Menu contestuali non navigabili da tastiera
- Sidebar senza navigation landmarks
- Bottoni con solo icone/emoji senza testo accessibile (Registro.jsx righe 331, 337)
- **Priorita**: BASSA (per il momento, utenza limitata)
- **Tempo**: 8-12 ore per un supporto base

### 13.2 Performance

| Problema | File | Impatto |
|----------|------|---------|
| Zero `React.memo`, `useCallback`, `useMemo` | Tutti i 44 file | Re-render inutili, specialmente in tabelle grandi |
| Nessun `AbortController` per fetch | Tutti i file con useEffect+fetch | Memory leak potenziale |
| Nessun lazy loading route | App.jsx | Bundle iniziale include TUTTO |
| Registro.jsx carica 1000 persone | Registro.jsx:33 | Lento per parrocchie grandi |

- **Priorita**: BASSA (app piccola, utenza limitata)
- **Tempo**: 4-6 ore per i fix piu importanti

### 13.3 Componenti architetturali mancanti

| Componente | Impatto |
|------------|---------|
| ErrorBoundary | Un errore JS crasha tutta l'app |
| Pagina 404 / NotFound | URL errati mostrano pagina vuota |
| Componente Modal condiviso | Ogni pagina implementa i propri modal |
| Componente Table condiviso | Ogni pagina ha la sua tabella |
| Toast/Notification | Tutte le notifiche usano `alert()` nativo (~50 occorrenze) |
| Loading spinner condiviso | 15+ implementazioni diverse |

- **Priorita**: MEDIA
- **Tempo**: 6-8 ore per ErrorBoundary + 404 + Modal + Toast

---

## 14. ARCHITETTURA GENERALE

### 14.1 Metriche

| Metrica | Backend | Frontend | Totale |
|---------|--------:|--------:|-------:|
| Righe di codice attivo | ~11.500 | ~15.700 | ~27.200 |
| Righe codice morto/backup | ~3.050 | ~160 | ~3.210 |
| File | 25 | 44 | 69 |
| Endpoint/Componenti | 140+ | 44 | 184+ |
| Print/console.log | ~130 | ~132 | ~262 |

### 14.2 Struttura cartelle — Problemi

**Backend:**
- `main.py` ha 699 righe e contiene endpoint che dovrebbero essere nei route files
- Nessuna separazione model/service/route (tutto nelle route)
- `permissions.py` e `middleware.py` nella root ma non usati come middleware
- Directory `models/` contiene solo `sacramenti.py` (e il suo duplicato `.py.py`)

**Frontend:**
- Directory `src/src/` errata (contiene un Logo.jsx duplicato)
- `components/contexts/` contiene un DataContext.jsx duplicato (il vero e' in `contexts/`)
- Nessun barrel export (`index.js`) nelle cartelle

### 14.3 Manca .gitignore

Il repository non ha `.gitignore`. Da creare con almeno:
```
__pycache__/
*.pyc
.env
node_modules/
uploads/
certificati_output/
rendiconti/
dist/
.DS_Store
```

---

## 15. PIANO D'AZIONE IN 5 FASI

### FASE 1 — Fix critici e pulizia (Tempo stimato: 6-8 ore)

| # | Azione | Tempo | Priorita |
|---|--------|------:|----------|
| 1.1 | Creare `.gitignore` e rimuovere `__pycache__` dal git tracking | 10 min | CRITICA |
| 1.2 | Eliminare 10 file backup/morti dal backend | 15 min | ALTA |
| 1.3 | Eliminare file duplicati frontend (Logo.jsx x2, DataContext duplicato, src/src/) | 5 min | ALTA |
| 1.4 | Installare `lucide-react` (`npm install lucide-react`) | 1 min | CRITICA |
| 1.5 | Fix Registro.jsx: definire handleEdit, handleDelete, importare useNavigate | 30 min | CRITICA |
| 1.6 | Fix Persone.jsx: aggiungere `const [error, setError] = useState('')` | 5 min | CRITICA |
| 1.7 | Fix DettaglioPersona.jsx: path import corretto | 2 min | CRITICA |
| 1.8 | Creare FormMatrimonio.jsx (componente mancante) | 2-3 ore | CRITICA |
| 1.9 | Aggiungere check `is_economo` a tutti gli endpoint di amministrazione.py | 1 ora | CRITICA |
| 1.10 | Rimuovere print DEBUG LOGIN da main.py (leak credenziali) | 5 min | CRITICA |
| 1.11 | Rimuovere tutti i 132 console.log dal frontend | 30 min | ALTA |
| 1.12 | Rimuovere tutti i ~130 print dal backend (sostituire con logging dove serve) | 1 ora | ALTA |

### FASE 2 — Eliminare duplicazioni backend (Tempo stimato: 6-8 ore)

| # | Azione | Tempo |
|---|--------|------:|
| 2.1 | Eliminare endpoint duplicati da main.py (login, persone, enti, me) — ridurlo a ~100 righe | 2 ore | COMPLETATO (Blocco 3) |
| 2.2 | Unificare get_current_user: mantenere solo auth.py, aggiornare tutti i file | 2 ore | COMPLETATO (Blocco 4) |
| 2.3 | Migrare persone.py e certificati.py da X-User-ID a JWT | 3-4 ore | COMPLETATO (Blocco 4+5) |
| 2.4 | Riscrivere sacramenti.py e stampe.py con pattern DB compatibile | 4-6 ore | SOSPESO (Blocco 6) |

> **Nota Blocco 4+5 (05/03/2026):** middleware.py: eliminate get_current_user, get_current_parrocchia, require_economo (65 righe). log_operation ora riceve user_id e parrocchia_id dal JWT. persone.py (6 endpoint) e certificati.py (4 endpoint) migrati da header X-User-ID insicuro a Depends(get_current_user) da auth.py. get_current_user esiste ora in un solo posto: auth.py. X-User-ID completamente eliminato dal backend. Unico pattern auth: Depends(get_current_user) da auth.py basato su JWT.

> **Nota Blocco 6 — SOSPESO (05/03/2026):** sacramenti.py (504 righe, 17 endpoint, asyncpg con `$1`) e stampe.py (490 righe, 7 funzioni, async SQLAlchemy) usano pattern DB incompatibile col setup sincrono. Auth JWT gia OK (Depends(get_current_user) da auth.py). Verranno riscritti da zero quando si implementa il modulo anagrafica completo.

> **Fix produzione (05/03/2026):** Dropdown Citta duplicata — aggiunto TRIM(comune) nella query backend amministrazione.py per eliminare spazi nascosti nel campo comune.

### FASE 3 — Estrarre servizi e costanti (Tempo stimato: 8-10 ore)

| # | Azione | Tempo |
|---|--------|------:|
| 3.1 | Creare `backend/constants.py` con Enum per stati, ruoli, tipi | 1.5 ore |
| 3.2 | Creare `backend/services/rendiconti.py` — estrarre logica da rendiconti_crud.py | 3 ore |
| 3.3 | Creare `backend/services/contabilita.py` — estrarre logica da contabilita.py | 3 ore |
| 3.4 | Creare `backend/services/pdf.py` — estrarre generazione PDF | 2 ore |
| 3.5 | Aggiungere validazione whitelist tabella in services/audit.py | 15 min |
| 3.6 | Standardizzare error handling: context manager per connessioni psycopg2 | 3 ore |

### FASE 4 — Refactoring frontend (Tempo stimato: 8-10 ore)

| # | Azione | Tempo |
|---|--------|------:|
| 4.1 | Migrare tutti i file da `fetch()`/`axios` diretto a `api.js` | 3-4 ore |
| 4.2 | Estrarre FormNuovoConto.jsx (elimina duplicazione ContabilitaLayout/Conti) | 1.5 ore |
| 4.3 | Estrarre `utils/download.js` (downloadPdf condiviso) | 30 min |
| 4.4 | Estrarre `utils/auth.js` (handleLogout, costruzione nome utente) | 30 min |
| 4.5 | Estrarre `utils/formatters.js` — aggiungere formatDate | 15 min |
| 4.6 | Estrarre ContextMenu.jsx condiviso | 1 ora |
| 4.7 | Unificare modal Nuovo/Modifica Ente in GestioneEnti.jsx | 1 ora |
| 4.8 | Fix Rapporti.jsx CSS globale — spostare in useEffect | 15 min |
| 4.9 | Rimuovere/implementare paginazione fittizia GestioneEnti | 15 min |
| 4.10 | Pulire DataContext (usarlo o rimuoverlo) | 1 ora |

### FASE 5 — Architettura e qualita (Tempo stimato: 10-14 ore)

| # | Azione | Tempo |
|---|--------|------:|
| 5.1 | Spezzare contabilita.py (2419 righe) in 4 file | 3 ore |
| 5.2 | Spezzare amministrazione.py (1263 righe) in 3 file | 2 ore |
| 5.3 | Aggiungere ErrorBoundary e pagina 404 al frontend | 1 ora |
| 5.4 | Creare componente Modal condiviso | 2 ore |
| 5.5 | Sostituire `alert()` con sistema Toast | 3 ore |
| 5.6 | Aggiungere lazy loading route in App.jsx | 1 ora |
| 5.7 | Aggiungere modelli Pydantic per endpoint che accettano `dict` | 4 ore |
| 5.8 | Implementare endpoint POST /api/auth/reset-password + servizio email | 4 ore |

---

## RIEPILOGO TEMPI

| Fase | Descrizione | Tempo stimato |
|------|-------------|--------------|
| Fase 1 | Fix critici e pulizia | 6-8 ore |
| Fase 2 | Eliminare duplicazioni backend | 6-8 ore |
| Fase 3 | Estrarre servizi e costanti | 8-10 ore |
| Fase 4 | Refactoring frontend | 8-10 ore |
| Fase 5 | Architettura e qualita | 10-14 ore |
| **TOTALE** | | **38-50 ore** |

---

## NOTA IMPORTANTE

Questo piano NON include:
- Riscrittura delle funzionalita esistenti
- Aggiunta di nuove funzionalita (giroconto UI, audit log UI, etc.)
- Migrazione a TypeScript
- Test automatizzati (unit/integration/e2e)
- Setup CI/CD

Queste attivita sarebbero da pianificare separatamente dopo il refactoring base.
