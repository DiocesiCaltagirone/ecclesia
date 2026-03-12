# REFACTORING PLAN — EcclesiaWeb

> Prima analisi: 03/03/2026 | Ultimo aggiornamento: 09/03/2026
> Backend: ~11.500 righe, 25 file Python | Frontend: ~16.000 righe, 41 file JSX/JS
> Legenda: ✅ COMPLETATO · ⏸️ SOSPESO · ⬜ DA FARE

---

## STATO AVANZAMENTO RAPIDO

| Fase | Descrizione | Stato |
|------|-------------|-------|
| Fase 1 | Fix critici, sicurezza, pulizia | ✅ COMPLETATA |
| Fase 2 | Eliminare duplicazioni backend | ✅ COMPLETATA (tranne 2.4 sospeso) |
| Fase 3 | Estrarre servizi e costanti | 🔄 IN CORSO (3.1 fatto) |
| Fase 4 | Refactoring frontend | ⬜ DA FARE |
| Fase 5 | Refactoring file grandi | ⬜ DA FARE |

---

## FASE 1 — Fix critici e pulizia ✅ COMPLETATA

### Blocco 1 (commit 9049516)
- ✅ Creato .gitignore, rimossi __pycache__ dal tracking git
- ✅ Eliminati 10 file backup/morti (~3.000 righe): main_OLD.py, certificati_OLD.py, certificati_backup.py, amministrazione_BACKUP.py, fix_db.py, fix_constraint.sql, test_certificati.py, Dockerfile.txt, templates/1.html, models/sacramenti.py.py
- ✅ Eliminati file duplicati frontend: Logo.jsx (x2), DataContext duplicato, directory src/src/
- ✅ Sicurezza: check is_economo aggiunto a 26 endpoint in amministrazione.py
- ✅ Sicurezza: whitelist tabella in services/audit.py (prevenzione SQL injection)
- ✅ Sicurezza: rimossa password predefinita dalle risposte API

### Blocco 2 (commit ea37326)
- ✅ Installato lucide-react (dipendenza mancante, sezione sacramenti non funzionava)
- ✅ Fix Registro.jsx: definiti handleEdit, handleDelete, importato useNavigate
- ✅ Fix Persone.jsx: aggiunto useState per error/setError
- ✅ Fix DettaglioPersona.jsx: corretto path import TabSacramenti
- ✅ Rimossi 132 console.log dal frontend (32 file)
- ✅ Rimossi ~98 print dal backend (sostituiti con logging dove necessario)

---

## FASE 2 — Eliminare duplicazioni backend ✅ COMPLETATA

### Blocco 3 (commit e3e1ff5)
- ✅ Rimossi endpoint duplicati da main.py: login, /auth/me, persone (ridotto da 694 a 419 righe)
- ✅ Fix auth.py: login accetta sia username che email
- ✅ Unificata get_current_user: eliminata versione locale da main.py

### Hotfix (commit a193eb6)
- ✅ Corrette 17 occorrenze current_user["id"] → current_user["user_id"] in main.py e contabilita.py

### Blocco 4+5 (commit 387d773)
- ✅ get_current_user esiste solo in auth.py — tutte le versioni duplicate eliminate
- ✅ persone.py: 6 endpoint migrati da X-User-ID insicuro a JWT
- ✅ certificati.py: 4 endpoint migrati da X-User-ID insicuro a JWT
- ✅ middleware.py: eliminate get_current_user, get_current_parrocchia, require_economo (65 righe)
- ✅ X-User-ID completamente eliminato. Unico pattern auth: Depends(get_current_user) da auth.py

### Fix produzione (commit 4413b3e)
- ✅ Dropdown Città duplicata: aggiunto TRIM(comune) in amministrazione.py

### Blocco 2.4 ⏸️ SOSPESO
- sacramenti.py (504 righe, asyncpg con $1) — pattern DB incompatibile col setup sincrono
- stampe.py (490 righe, async SQLAlchemy) — pattern DB incompatibile
- Auth JWT già OK in entrambi
- **Decisione**: riscrivere da zero quando si implementa il modulo anagrafica

---

## FASE 3 — Estrarre servizi e costanti 🔄 IN CORSO

### Blocco 3.1 (commits 8bc519f → 1d1385d) ✅
- ✅ Creato backend/constants.py con 5 Enum: StatoRendiconto (6 stati), RuoloUtente (3), TipoMovimento (2), TipoSpecialeMovimento (2), TipoRegistro (2)
- ✅ 32 magic strings sostituite in 4 file: rendiconti_crud.py (11), contabilita.py (12), rendiconti_documenti.py (7), amministrazione.py (2)
- ⚠️ Query SQL lasciate con stringhe letterali (SQLAlchemy text() non supporta Enum direttamente)

### Blocco 3.2 ⬜ DA FARE
Creare `backend/services/queries.py` con helper SQL riutilizzabili:

| Helper | Elimina duplicazioni in | Occorrenze |
|--------|------------------------|-----------|
| get_discendenti_categoria(db, id) | contabilita.py | x4 |
| get_operatori_ente(db, ente_id) | amministrazione.py | x2 |
| get_ente_nome(db, ente_id) | enti.py, contabilita.py, rendiconti_documenti.py, template_categorie.py | x4+ |
| get_parroco_ente(db, ente_id) | certificati.py | x2 |
| get_periodo_chiuso(db, ente_id) | contabilita.py | x2 |
| calcola_saldo_registro(db, registro_id) | contabilita.py, rendiconti_crud.py | x2 |

- **Tempo stimato**: 2 ore

### Blocco 3.3 ⬜ DA FARE
Spostare `verifica_economo()` in `backend/utils/auth_helpers.py` e importarla ovunque:

| File | Situazione attuale |
|------|-------------------|
| amministrazione.py | Ha la funzione verifica_economo() (riga 70) |
| template_categorie.py | Inline if not current_user.get('is_economo') x4 |
| contabilita.py | Inline if not current_user.get('is_economo') x2 |
| rendiconti_crud.py | Query SQL SELECT ruolo FROM utenti_enti x3 |

- **Tempo stimato**: 1 ora

### Blocco 3.4 ⬜ DA FARE
Fix connection leak psycopg2. File che aprono connessioni senza `finally: conn.close()`:
rendiconti_crud.py, rendiconti_documenti.py, persone.py, certificati.py, impostazioni_diocesi.py

- **Fix**: Usare context manager `with get_db_connection() as conn:` ovunque
- **Tempo stimato**: 3 ore

---

## FASE 4 — Refactoring frontend ⬜ DA FARE

### ✅ Blocco 4.1 — PRIORITÀ ALTA (commit 4c5cc96)
Migrare 36 file da fetch()/axios diretto a api.js.

| Metodo attuale | N. file | Problema |
|----------------|---------|----------|
| api.js (axios + interceptor) | 7 | ✅ Corretto |
| fetch() diretto | 28 | Token manuale, nessun redirect su 401 |
| axios senza interceptor | 8 (sacramenti) | Bypass interceptor |

**Impatto**: se il token scade, solo 7 file su 41 fanno redirect a /login.
- **Tempo stimato**: 3-4 ore

### ✅ Blocco 4.2 (commit dd27e5e)
Creare `frontend/src/utils/auth.js` con funzione `logout(navigate)`.
4 implementazioni diverse da unificare: Layout.jsx, ContabilitaLayout.jsx, HeaderAmministrazione.jsx, Amministrazione.jsx
- **Tempo stimato**: 1 ora

### ✅ Fix stampa PDF piano dei conti (commit b4f5e37)
- Bug: categorie con codici 020-055 fuori posto nel PDF
- Causa: ORDER BY CAST AS FLOAT trattava "020" come 20.0
- Fix: albero gerarchico in Python con walk() ricorsivo
- Query semplificata: rimosso filtro livello IN (...) e CAST AS FLOAT

### ✅ Fix codice automatico categorie (commit e834c31)
- Bug: POST categorie generava codici globali zfill(3) (020, 021...) ignorando parent_id
- Fix: radici → intero puro (21, 22...); sottocategorie → codice_padre.N (1.9, 13.8...)

### ✅ Fix allegati nome_originale (commit 7321643)
- Bug: colonna nome_originale mancante in produzione su movimenti_allegati
- Fix: migration add_nome_originale_allegati.sql

### Blocco 4.3 ⬜ DA FARE
Completare `frontend/src/utils/formatters.js` aggiungendo formatDate() e formatDateTime().
7 implementazioni sparse: CardBattesimo/Cresima/PrimaComunione/Matrimonio.jsx, ContabilitaLayout.jsx, MovimentiConto.jsx, MovimentiGenerale.jsx
- **Tempo stimato**: 1 ora

### Blocco 4.4 ⬜ DA FARE
Creare `frontend/src/utils/download.js` con `downloadFile(url, filename)`.
5 implementazioni identiche: ListaRendiconti.jsx, Rendiconto.jsx, NuovoRendiconto.jsx, EconomatoContabilita.jsx, ModalAllegati.jsx
- **Tempo stimato**: 30 minuti

### Blocco 4.5 ⬜ DA FARE
Creare `frontend/src/constants.js` centralizzando stringhe sparse in 32+ file:
- RUOLI: 'parroco', 'economo', 'operatore'
- STORAGE_KEYS: 'token', 'user', 'ente_id', 'current_ente_id', 'current_ente'
- TIPI_CONTO: oggetto da 10 chiavi (attualmente duplicato in ContabilitaLayout.jsx e Conti.jsx)
- **Tempo stimato**: 30 minuti

### Blocco 4.6 ⬜ DA FARE
Estrarre `components/FormNuovoConto.jsx` condiviso.
Form identico duplicato in ContabilitaLayout.jsx (righe 518-633) e Conti.jsx (righe 170-250).
⚠️ NOTA CLAUDE.md: modifiche al form vanno fatte in ENTRAMBI i file — questo blocco risolve il problema alla radice.
- **Tempo stimato**: 1.5 ore

### Blocco 4.7 ⬜ DA FARE
Estrarre `components/ContextMenu.jsx` condiviso.
~100 righe identiche in MovimentiConto.jsx e MovimentiGenerale.jsx.
- **Tempo stimato**: 1 ora

---

## FASE 5 — Refactoring file grandi ⬜ DA FARE

### Blocco 5.1 — Spezzare contabilita.py (2.850 righe) ⬜
Da fare DOPO blocchi 3.2 e 3.3 (helper già estratti prima di spezzare).

| File proposto | Contenuto | Righe stimate |
|---------------|-----------|-------------:|
| routes/registri.py | CRUD registri | ~330 |
| routes/movimenti.py | CRUD movimenti + giroconto | ~680 |
| routes/categorie.py | Piano dei conti + helpers | ~700 |
| routes/allegati.py | Upload/download allegati | ~250 |
| routes/report.py | Report con filtri | ~200 |
| routes/economo.py | Endpoint economo rendiconti | ~280 |
| services/contabilita.py | Helper condivisi | ~170 |

- **Tempo stimato**: 3-4 ore

### Blocco 5.2 — Spezzare amministrazione.py (1.303 righe) ⬜

| File proposto | Contenuto | Righe stimate |
|---------------|-----------|-------------:|
| routes/admin_enti.py | CRUD enti + parrocchie | ~500 |
| routes/admin_utenti.py | CRUD utenti + associazioni | ~400 |
| routes/admin_diocesi.py | Parrocchie diocesi + comuni | ~220 |

- **Tempo stimato**: 2 ore

### Blocco 5.3 — Componenti UI condivisi ⬜

| Componente | Sostituisce | File coinvolti |
|------------|-------------|----------------|
| ConfirmDialog | window.confirm() nativo | 17 file |
| Toast/Notification | alert() nativo (~117 chiamate) | 24 file |
| BaseModal | Modal inline | 22 file |
| Spinner condiviso | 24 implementazioni diverse | 24 file |
| EmptyState | 16 messaggi "nessun dato" diversi | 16 file |

- **Tempo stimato**: 4-6 ore

### Blocco 5.4 — Piccoli miglioramenti ⬜

| Azione | Tempo |
|--------|------:|
| ErrorBoundary + pagina 404 | 1 ora |
| Lazy loading route in App.jsx | 1 ora |
| Modelli Pydantic per endpoint che accettano dict | 4 ore |
| Fix N+1 query in amministrazione.py | 1 ora |
| Fix CSS globale Rapporti.jsx (spostare in useEffect) | 15 min |
| Rimuovere paginazione fittizia in GestioneEnti.jsx | 15 min |

---

## DA FARE CON IL MODULO ANAGRAFICA ⏸️

| Lavoro | Motivo sospensione |
|--------|-------------------|
| Riscrivere sacramenti.py (asyncpg → SQLAlchemy sincrono) | Da rifare da zero con anagrafica |
| Riscrivere stampe.py (async SQLAlchemy → sincrono) | Da rifare da zero con anagrafica |
| Soft delete (campo deleted_at su tabelle critiche) | Prerequisito per anagrafica e inventario |
| Sistema audit completo (tabella audit_log) | Da fare insieme o dopo soft delete |

---

## RIEPILOGO TEMPI RIMANENTI

| Fase | Lavoro rimasto | Tempo stimato |
|------|---------------|--------------|
| Fase 3 | Blocchi 3.2, 3.3, 3.4 | 6 ore |
| Fase 4 | Blocchi 4.1 → 4.7 | 8-9 ore |
| Fase 5 | Blocchi 5.1 → 5.4 | 12-15 ore |
| **TOTALE RIMANENTE** | | **26-30 ore** |

---

## REGOLA OPERATIVA

Dopo ogni blocco di lavoro con Claude Code:
1. Aggiornare CLAUDE.md — aggiungere commit nella sezione "Refactoring Eseguito"
2. Aggiornare questo file — segnare ✅ e togliere dalla lista DA FARE
3. Fare commit di entrambi i file insieme al codice

**Mai dare a Claude Code più di un blocco alla volta.**
**Sempre leggere entrambi i file prima di iniziare una sessione.**

---

## MODULO RENDICONTI — Migliorie UI/UX

### Blocco R.1 — Badge e modal respingimento ✅ (commits 446520b, e782fee)
- ✅ Badge "Respinto" → aggiunto sotto "Clicca per vedere le osservazioni"
- ✅ Sostituito "Elimina Rendiconto" con "Correggi Rendiconto" (bottone arancione)
- ✅ Nuovo endpoint POST /rendiconti/{id}/correggi (respinto → parrocchia, documenti intatti)
- ✅ Fix GestioneUtenti.jsx: if/else orfano da migrazione fetch→axios (blocco 4.1)

### Blocco R.2 — Gestione eliminazione ✅ (commit b5a308c)
- ✅ DELETE /rendiconti/{id} con parametro ?elimina_documenti=true/false
- ✅ Bottone "Elimina rendiconto" (arancione, solo parrocchia): mantiene documenti su disco
- ✅ Bottone "Elimina tutto" (rosso, parrocchia o respinto): elimina rendiconto + file

### Blocco R.3 — Gestione allegati ✅ (commit 76a7922)
- ✅ Bottoni "Scarica" e "Elimina" per ogni documento caricato in NuovoRendiconto.jsx
- ✅ Funzioni downloadDocumento e eliminaDocumento (endpoint backend già esistenti)
- ✅ Dopo eliminazione, ricarica lista documenti e aggiorna contatore

**Modulo Rendiconti UI/UX: ✅ COMPLETATO (R.1 + R.2 + R.3)**

---

## MODULO INVENTARIO — Sviluppo (vedi INVENTARIO_SPEC.md)

### INV.1 — Migration DB ✅ (commit 310d8fd)
- ✅ 6 tabelle: inventario_categorie, inventario_ubicazioni, beni_inventario, inventario_foto, inventario_registri, inventario_storico
- ✅ Seed 17 categorie predefinite (is_sistema) + 9 ubicazioni per ogni ente
- ✅ CREATE TABLE IF NOT EXISTS migrations_history in testa al file
- ✅ Droppata vecchia tabella beni_inventario (schema incompatibile, 0 righe)

### INV.2 — Backend CRUD beni + categorie + ubicazioni ✅ (commit d3cf0f4)
- ✅ 13 endpoint in backend/routes/inventario.py
- ✅ CRUD categorie (protezione is_sistema), CRUD ubicazioni, CRUD beni
- ✅ Lista beni con 5 filtri, soft delete → snapshot in inventario_storico
- ✅ Router registrato in main.py

### INV.3 — Backend upload foto ✅ (commit d3cf0f4)
- ✅ 5 endpoint foto in inventario_beni.py (lista, upload, visualizza, elimina, riordina)
- ✅ Filesystem locale (uploads/inventario/ente_id/bene_id/) — NO MinIO
- ✅ Validazione MIME type (JPG, PNG, WEBP) e dimensione max 10MB
- ✅ Riordina foto con swap posizioni

### Refactor split inventario ✅ (commit 14580c1)
- ✅ inventario.py → aggregatore (get_ente_id + include sub-routers)
- ✅ inventario_lookup.py → 8 endpoint CRUD categorie e ubicazioni
- ✅ inventario_beni.py → 10 endpoint CRUD beni e foto
- ✅ 18 route totali verificate

### INV.4 — Backend registri + storico ✅ (commit ee120df)
- ✅ 3 endpoint in inventario_registri.py (registri lista, genera, storico lista)
- ✅ POST /registri/genera: snapshot JSONB di tutti i beni, bloccato=TRUE, audit log
- ✅ GET /storico: filtri anno e motivo, dati estratti dallo snapshot

### INV.5 — Backend PDF ✅ (commit 79f91fd)
- ✅ 4 endpoint in inventario_pdf.py (bozza, scheda bene, registro PDF, storico PDF)
- ✅ 3 template Jinja2+WeasyPrint: inventario_registro.html, inventario_scheda_bene.html, inventario_storico.html
- ✅ Foto embeddate come base64 nella scheda bene
- ✅ StreamingResponse in memoria (no file su disco)
- ✅ Rimossi 2 placeholder 501 da inventario_registri.py
- ✅ 25 route totali verificate
- **Backend inventario completo (INV.1–INV.5)**
### INV.6 — Frontend Layout + ListaBeni ⬜ DA FARE
### INV.7 — Frontend SchedaBene + foto ⬜ DA FARE
### INV.8 — Frontend Registri + Storico ⬜ DA FARE
### INV.9 — Frontend Impostazioni ⬜ DA FARE
### INV.10 — Test completo + fix ⬜ DA FARE
