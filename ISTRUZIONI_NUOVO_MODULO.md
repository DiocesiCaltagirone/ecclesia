# ISTRUZIONI PER AGGIUNGERE UN NUOVO MODULO ALL'APPSHELL
## EcclesiaWeb — Layout Unificato
*Leggi tutto prima di toccare qualsiasi file.*

---

## OBIETTIVO IN PAROLE SEMPLICI

Attualmente l'app ha 3 layout separati che si duplicano:
- `Layout.jsx` — header + sidebar per Home/Anagrafica/Impostazioni
- `ContabilitaLayout.jsx` — header + sidebar per Contabilità (già ben fatto, è il riferimento)
- `InventarioLayout.jsx` — header + sidebar diversa per Inventario (stile diverso, da allineare)

**Il problema:** l'header in alto e la sidebar sinistra sono riscritti 3 volte.
**La soluzione:** un solo `AppShell.jsx` che contiene header + sidebar, scritto UNA VOLTA.

---

## COME DEVE FUNZIONARE LA SIDEBAR

La sidebar di ContabilitaLayout.jsx è il riferimento assoluto — già perfetta.
Deve diventare la sidebar globale dell'intera app.

```
🏠 HOME                        ← voce singola, link diretto

💰 CONTABILITÀ          ▼      ← aperto (ci sono dentro)
   Conti
   Movimentazione
   + Aggiungi transazione
   Stampa
   Rendiconto

🏛️ Inventario           ▶      ← chiuso
👥 Anagrafica           ▶      ← chiuso
⚙️ Impostazioni                ← voce singola, link diretto
```

### Regole comportamento

1. **HOME e Impostazioni** → voci singole, click naviga direttamente
2. **Moduli** (Contabilità, Inventario, Anagrafica...) → click apre il menu a tendina E naviga alla prima sotto-voce
3. **Un solo modulo aperto alla volta** → aprire uno chiude gli altri
4. **Apertura automatica** → se sono in `/contabilita/conti`, il blocco Contabilità è già aperto
5. **Voce attiva** → evidenziata (sfondo colorato, bordo sinistro)

---

## FASE 0 — ANALISI OBBLIGATORIA (prima di scrivere codice)

Leggi questi file e scrivi un riepilogo:

```
frontend/src/App.jsx
frontend/src/components/Layout.jsx
frontend/src/pages/Contabilita/ContabilitaLayout.jsx
frontend/src/pages/Inventario/InventarioLayout.jsx
frontend/src/utils/auth.js
frontend/src/components/CambioPasswordModal.jsx
```

Devi ricavare:
1. Struttura ESATTA dell'header in ContabilitaLayout.jsx
2. Voci ESATTE della sidebar in ContabilitaLayout.jsx (con path reali)
3. Voci ESATTE della sidebar in Layout.jsx (con path reali)
4. Come vengono letti `current_ente`, `user`, `permessi` da sessionStorage
5. Come funziona il logout (auth.js)
6. Struttura delle route in App.jsx (PrivateRoute, nesting esistente)

**Scrivi il riepilogo prima di procedere.**

---

## FASE 1 — Creare AppShell.jsx

Crea `frontend/src/components/AppShell.jsx`.

### Header
Copia ESATTAMENTE l'header da ContabilitaLayout.jsx:
- Nome parrocchia in alto a sinistra
- Indirizzo piccolo sotto
- Bottone "Cambio Ente"
- Nome utente con titolo (es. "Don Mario Rossi") — click apre CambioPasswordModal
- Bottone "Esci" rosso

### Sidebar — struttura moduli

```javascript
// I path e le sotto-voci vanno copiati ESATTAMENTE dai file esistenti
// Non inventare nulla — usa solo quello che trovi in ContabilitaLayout.jsx e Layout.jsx

const moduli = [
  {
    key: 'home',
    label: 'HOME',
    icon: '🏠',
    path: '/',
    sottoVoci: null,   // voce singola
  },
  {
    key: 'contabilita',
    label: 'CONTABILITÀ',
    icon: '💰',
    path: '/contabilita',
    permesso: 'contabilita',
    sottoVoci: [
      // COPIA LE VOCI ESATTE DA ContabilitaLayout.jsx
      // inclusi eventuali bottoni speciali come "+ Aggiungi transazione"
    ]
  },
  {
    key: 'inventario',
    label: 'INVENTARIO',
    icon: '🏛️',
    path: '/inventario',
    permesso: 'inventario',
    sottoVoci: [
      { path: '/inventario/beni',         label: 'Beni',         icon: '📦' },
      { path: '/inventario/registri',     label: 'Registri',     icon: '📋' },
      { path: '/inventario/storico',      label: 'Storico',      icon: '🗂️' },
      { path: '/inventario/impostazioni', label: 'Impostazioni', icon: '⚙️' },
    ]
  },
  {
    key: 'anagrafica',
    label: 'Anagrafica',
    icon: '👥',
    path: '/anagrafica',
    permesso: 'anagrafica',
    sottoVoci: [
      // COPIA LE VOCI ESATTE DA Layout.jsx
    ]
  },
  {
    key: 'impostazioni',
    label: 'Impostazioni',
    icon: '⚙️',
    path: '/impostazioni',
    sottoVoci: null,   // voce singola
  },
]
```

### Check permessi
- Mostrare il modulo solo se `permessi[modulo.permesso] === true`
- Se `utente.is_economo === true` → mostrare tutto sempre
- Moduli senza `permesso` (Home, Impostazioni) → sempre visibili

### Stile
Copia lo stile ESATTO da ContabilitaLayout.jsx. Non inventare nuovi colori.

### Outlet
`<Outlet />` occupa tutto lo spazio restante a destra della sidebar.

---

## FASE 2 — Semplificare ContabilitaLayout.jsx

Rimuovere header e sidebar (ci pensa AppShell).
Mantenere SOLO la logica specifica del modulo:

```jsx
export default function ContabilitaLayout() {
  // Mantenere qui SOLO eventuale barra superiore specifica
  // (es. barra con "+ Aggiungi Conto" e "Impostazione Categoria")
  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      {/* barra superiore se esiste */}
      <Outlet />
    </div>
  )
}
```

---

## FASE 3 — Semplificare InventarioLayout.jsx

```jsx
export default function InventarioLayout() {
  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <Outlet />
    </div>
  )
}
```

---

## FASE 4 — Aggiornare App.jsx

```jsx
<Routes>
  {/* Pagine senza layout */}
  <Route path="/login" element={<Login />} />
  <Route path="/select-ente" element={<SelectEnte />} />
  <Route path="/amministrazione" element={
    <PrivateRoute><Amministrazione /></PrivateRoute>
  } />

  {/* TUTTO il resto dentro AppShell */}
  <Route element={<PrivateRoute><AppShell /></PrivateRoute>}>
    <Route path="/" element={<Dashboard />} />
    <Route path="/impostazioni" element={<ImpostazioniDatiGenerali />} />

    {/* Contabilità — COPIA TUTTE LE ROUTE ESISTENTI SENZA MODIFICARLE */}
    <Route path="/contabilita" element={<ContabilitaLayout />}>
      ...
    </Route>

    {/* Inventario */}
    <Route path="/inventario" element={<InventarioLayout />}>
      <Route index element={<Navigate to="/inventario/beni" replace />} />
      <Route path="beni" element={<ListaBeni />} />
      <Route path="beni/nuovo" element={<NuovoBene />} />
      <Route path="beni/:id" element={<SchedaBene />} />
      <Route path="registri" element={<ListaRegistri />} />
      <Route path="storico" element={<StoricoInventario />} />
      <Route path="impostazioni" element={<ImpostazioniInventario />} />
    </Route>

    {/* Tutte le altre route esistenti — NON eliminare nessuna */}
  </Route>
</Routes>
```

---

## FASE 5 — Eliminare Layout.jsx

Solo DOPO che tutto funziona e build è pulito:
1. Verifica con `grep -r "from.*Layout" src/` che nessuno lo importi più
2. Elimina il file

---

## REGOLE CRITICHE

1. **MAI** fetch() diretto — sempre `import api from '../../services/api'`
2. **MAI** localStorage tranne `saved_email`
3. **MAI** reintrodurre X-User-ID
4. Logout: `import { logout } from '../../utils/auth'`
5. Emoji come caratteri diretti nel codice, **mai** `\u{...}`
6. Stile sidebar: copia da ContabilitaLayout.jsx, non inventare
7. Tutte le route esistenti vanno mantenute, nessuna eliminata
8. NON rompere nessuna funzionalità esistente di Contabilità

---

## ORDINE DI LAVORO

1. Leggi tutti i file (Fase 0) — scrivi riepilogo
2. Crea `AppShell.jsx`
3. Aggiorna `App.jsx`
4. Semplifica `ContabilitaLayout.jsx`
5. Semplifica `InventarioLayout.jsx`
6. `npx vite build` — verifica zero errori
7. Elimina `Layout.jsx`
8. Build finale di conferma

---

## ⚠️ VERIFICA PRIMA DEL COMMIT — OBBLIGATORIA

**NON fare commit prima di questo passaggio.**

Mostra il codice completo di:
1. `AppShell.jsx`
2. `ContabilitaLayout.jsx` modificato
3. `InventarioLayout.jsx` modificato
4. Righe cambiate in `App.jsx`

Scrivi **"Pronto per revisione"** e aspetta l'ok.

---

## DEPLOY (solo dopo ok revisione)

```bash
cd C:/Users/Lux/parrocchia-app/frontend && npx vite build
cd C:/Users/Lux/parrocchia-app
git add .
git commit -m "refactor: AppShell unificato — sidebar accordion professionale"
git push
# Via SSH 188.245.249.208:
cd /opt/ecclesia && bash deploy.sh
```

---
*Fine istruzioni — EcclesiaWeb AppShell Refactoring*
