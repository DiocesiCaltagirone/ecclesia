# REFACTORING PLAN — EcclesiaWeb

> Prima analisi: 03/03/2026 | Ultimo aggiornamento: 13/03/2026
> Backend: ~11.500 righe, 25 file Python | Frontend: ~16.000 righe, 41 file JSX/JS
> Legenda: ✅ COMPLETATO · ⏸️ SOSPESO · ⬜ DA FARE

---

## STATO AVANZAMENTO RAPIDO

| Fase | Descrizione | Stato |
|------|-------------|-------|
| Fase 0 | AppShell — Layout unificato (FONDAMENTO) | ✅ COMPLETATA |
| Fase 1 | Fix critici, sicurezza, pulizia | ✅ COMPLETATA |
| Fase 2 | Eliminare duplicazioni backend | ✅ COMPLETATA (tranne 2.4 sospeso) |
| Fase 3 | Estrarre servizi e costanti | 🔄 IN CORSO (3.1 fatto) |
| Fase 4 | Refactoring frontend | ⬜ DA FARE (dopo Fase 0) |
| Fase 5 | Refactoring file grandi | ⬜ DA FARE |

---

## ⚠️ NOTA ARCHITETTURALE (aggiunta 13/03/2026)

L'AppShell avrebbe dovuto essere il **fondamento** dell'architettura fin dal giorno 1,
prima di costruire qualsiasi modulo. È stata identificata tardi perché all'inizio
esistevano solo 2 layout e sembrava gestibile. Quando è arrivato InventarioLayout.jsx
con stile diverso, è diventato evidente che bisognava unificare tutto.

**Principio:** "scrivi una cosa sola volta" — header e sidebar scritti UNA VOLTA,
contenuto interno cambia pagina per pagina. Ogni nuovo modulo futuro
(Sacramenti, Anagrafica completa, ecc.) eredita automaticamente l'AppShell.

---

## FASE 0 — AppShell: Layout Unificato ✅ COMPLETATA (13/03/2026)

> **Prerequisito per tutto il lavoro futuro sul frontend.**

### Blocco A.1+A.2 ✅ (commit 37db5a0)
- AppShell.jsx creato: header unificato + sidebar accordion
- Layout.jsx eliminato
- ContabilitaLayout.jsx semplificato (solo sub-header + modal)
- InventarioLayout.jsx ridotto a thin wrapper
- App.jsx ristrutturato

### Commit successivi
- ✅ commit 82a9b52: sidebar dedicata per /dashboard
- ✅ commit 5b08b3b: rimosso titolo GESTIONALE dalla sidebar
- ✅ commit 7a00245: sidebar dedicata per /impostazioni/dati-generali
- ✅ commit 2883ac1: moduli senza permesso visibili ma grigi/disabilitati
- ✅ commit 1e12c15: header Inventario unificato stile ContabilitaLayout (6 file)
- ✅ commit c25eb4c: fix padding InventarioLayout allineato a ContabilitaLayout
- ✅ commit 2cd0503: fix header NuovoBene e SchedaBene full-width, maxWidth solo sul form

### Risultato
- ~1.240 righe di duplicazione eliminate
- Header e sidebar scritti UNA VOLTA in AppShell.jsx
- Ogni nuovo modulo futuro eredita automaticamente il layout

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
- ✅ Creato backend/constants.py con 5 Enum
- ✅ 32 magic strings sostituite in 4 file

### Blocco 3.2 ⬜ DA FARE
Creare `backend/services/queries.py` con helper SQL riutilizzabili.
- **Tempo stimato**: 2 ore

### Blocco 3.3 ⬜ DA FARE
Spostare `verifica_economo()` in `backend/utils/auth_helpers.py`.
- **Tempo stimato**: 1 ora

### Blocco 3.4 ⬜ DA FARE
Fix connection leak psycopg2 — usare context manager `with get_db_connection()`.
- **Tempo stimato**: 3 ore

---

## FASE 4 — Refactoring frontend ⬜ DA FARE
> ⚠️ Fare DOPO Fase 0 (AppShell) — alcuni blocchi diventano più semplici dopo

### ✅ Blocco 4.1 (commit 4c5cc96) — 36 file migrati a api.js
### ✅ Blocco 4.2 (commit dd27e5e) — utils/auth.js con logout unificato
### ✅ Fix vari — stampa PDF, codici categorie, allegati

### Blocco 4.3 ⬜ — formatDate() e formatDateTime() in formatters.js (1 ora)
### Blocco 4.4 ⬜ — utils/download.js con downloadFile() (30 min)
### Blocco 4.5 ⬜ — frontend/src/constants.js con stringhe centralizzate (30 min)
### Blocco 4.6 ⬜ — FormNuovoConto.jsx componente condiviso (1.5 ore)
### Blocco 4.7 ⬜ — ContextMenu.jsx componente condiviso (1 ora)

---

## FASE 5 — Refactoring file grandi ⬜ DA FARE

### Blocco 5.1 ⬜ — Spezzare contabilita.py (2.850 righe) in 7 file (3-4 ore)
### Blocco 5.2 ⬜ — Spezzare amministrazione.py (1.303 righe) in 3 file (2 ore)
### Blocco 5.3 ⬜ — Componenti UI condivisi: ConfirmDialog, Toast, BaseModal, Spinner, EmptyState (4-6 ore)
### Blocco 5.4 ⬜ — Piccoli miglioramenti vari (ErrorBoundary, lazy loading, Pydantic, N+1...) (6 ore)

---

## DA FARE CON IL MODULO ANAGRAFICA ⏸️

| Lavoro | Motivo sospensione |
|--------|-------------------|
| Riscrivere sacramenti.py (asyncpg → SQLAlchemy sincrono) | Da rifare da zero con anagrafica |
| Riscrivere stampe.py (async SQLAlchemy → sincrono) | Da rifare da zero con anagrafica |
| Soft delete (campo deleted_at su tabelle critiche) | Prerequisito per anagrafica e inventario |

---

## RIEPILOGO TEMPI RIMANENTI

| Fase | Lavoro rimasto | Tempo stimato |
|------|---------------|--------------|
| Fase 0 | ✅ COMPLETATA | — |
| Fase 3 | Blocchi 3.2, 3.3, 3.4 | 6 ore |
| Fase 4 | Blocchi 4.3 → 4.7 | 5-6 ore |
| Fase 5 | Blocchi 5.1 → 5.4 | 12-15 ore |
| **TOTALE RIMANENTE** | | **23-27 ore** |

---

## MODULO INVENTARIO

### INV.1–INV.5 ✅ Backend completo
### INV.6–INV.9 ✅ Frontend completo (commit feat: frontend modulo inventario)
### INV.10 ⬜ Test completo + fix (dopo AppShell)

### Sessione 14/03/2026 — Miglioramenti Inventario + Sidebar
- ✅ commit ecd41dd: sidebar 5 voci, pagina Stampa, Import/Export, form compatti
- ✅ commit 14b6ad3: fix stile voce Stampa inventario
- ✅ commit 8e03190: ImpostazioniContabilita + sidebar contabilità ristrutturata
- ✅ commit 5ba237b: Rendiconto e sottovoci stile uniforme blu
- ✅ commit e477024: voci attive con bordo sinistro blu, rimosso Impostazioni globale
- ✅ commit a3469eb: rimossa barra azioni da ContabilitaLayout
- ✅ commit a040f2a: Impostazioni contabilità diventa tendina (Aggiungi Conto + Categorie)
- ✅ commit ff7247b: sidebar accordion si chiude navigando fuori dal modulo
- ✅ commit e8efb25: reset sotto-accordion al cambio modulo

---

## MODULO RENDICONTI

### R.1 + R.2 + R.3 ✅ COMPLETATO

---

## REGOLA OPERATIVA

Dopo ogni blocco:
1. Aggiornare CLAUDE.md
2. Aggiornare questo file — segnare ✅
3. Commit di entrambi i file insieme al codice

**Mai dare a Claude Code più di un blocco alla volta.**
**Sempre leggere CLAUDE.md e questo file prima di iniziare.**
