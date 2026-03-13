# ISTRUZIONI CLAUDE CODE — Frontend Modulo Inventario
## EcclesiaWeb — Diocesi di Caltagirone
*Leggi tutto prima di scrivere una riga di codice.*

---

## CONTESTO PROGETTO

Sistema gestionale web per parrocchie. Stack: React 19 + Vite + TailwindCSS (frontend), FastAPI (backend), PostgreSQL.

**Percorso progetto locale:** `C:\Users\Lux\parrocchia-app\`
**Frontend:** `C:\Users\Lux\parrocchia-app\frontend\src\`

---

## REGOLE CRITICHE — NON IGNORARE MAI

1. **Auth:** Tutte le chiamate API usano `import api from '../../services/api'` — MAI fetch() diretto, MAI axios diretto, MAI header manuali con token.
2. **Importi:** Usare SEMPRE `import { formatCurrency } from '../../utils/formatters'` — MAI `Intl.NumberFormat`.
3. **Date:** Formato italiano `gg/mm/aaaa` — MAI formato ISO nelle label visibili.
4. **sessionStorage:** Leggere ente attivo da `sessionStorage.getItem('current_ente')` (JSON) e token da `sessionStorage.getItem('token')`.
5. **Pattern DB backend:** Sincrono SQLAlchemy con `text()` — il backend è già scritto, il frontend chiama solo le API.
6. **TailwindCSS:** Usare SOLO classi Tailwind core utility (niente plugin, niente classi custom). Per stili complessi usare `style={{}}` inline.
7. **Nessun file CSS separato** — tutto inline o Tailwind.
8. **Coerenza visiva:** Il modulo Inventario usa lo stesso pattern di ContabilitaLayout.jsx con menu laterale dedicato.

---

## DESIGN — ESTETICA RICHIESTA

### Concept: "Archivio Sacro"
Ispirazione: registri ecclesiastici antichi + interfaccia moderna professionale.

**Palette colori:**
```
Primario navy:     #1a2e55  (sidebar, header)
Oro ecclesiastico: #d4af37  (accenti, bordi attivi, badge)
Oro chiaro:        #f0d060  (hover, highlights)
Sfondo carta:      #f5f0e8  (background principale)
Bianco caldo:      #fefcf8  (card, modal)
Testo scuro:       #1a1a2e  (testo principale)
Testo grigio:      #6b7280  (testo secondario)
Verde successo:    #2d6a4f  (stato ottimo/buono)
Arancio restauro:  #c0622a  (stato restauro)
Rosso scadente:    #9b2226  (stato scadente)
```

**Tipografia:**
```css
/* Titoli */   font-family: 'Georgia', 'Times New Roman', serif
/* Body/UI */  font-family: 'Segoe UI', system-ui, sans-serif
/* Codici */   font-family: 'Courier New', monospace
```

**Badge stato conservazione — colori precisi:**
```
ottimo:    background #d1fae5, color #065f46, border #6ee7b7
buono:     background #dbeafe, color #1e40af, border #93c5fd
discreto:  background #fef3c7, color #92400e, border #fcd34d
restauro:  background #ffedd5, color #9a3412, border #fdba74
scadente:  background #fee2e2, color #991b1b, border #fca5a5
```

---

## FILE DA CREARE

Tutti i file vanno in: `frontend/src/pages/Inventario/`

```
frontend/src/pages/Inventario/
├── InventarioLayout.jsx
├── ListaBeni.jsx
├── SchedaBene.jsx
├── NuovoBene.jsx
├── ListaRegistri.jsx
├── StoricoInventario.jsx
└── ImpostazioniInventario.jsx
```

Poi aggiornare `frontend/src/App.jsx` con le nuove route.

---

## FILE 1 — `InventarioLayout.jsx`

### Struttura HTML
```
<div> (flex, height 100vh, background #f5f0e8)
  ├── SIDEBAR (width 248px collassabile a 64px)
  └── MAIN CONTENT (flex-col)
       ├── HEADER BAR (altezza 56px)
       └── <Outlet /> (contenuto pagina)
```

### Sidebar — dettaglio
- **Background:** `linear-gradient(175deg, #0f1d3a 0%, #1a2e55 50%, #0d1a32 100%)`
- **Logo area:** icona 🏛️ con sfondo oro + testo "INVENTARIO" in oro, "Beni Parrocchiali" grigio chiaro
- **Voci menu:**
  ```
  📦 Beni          → /inventario/beni
  📋 Registri      → /inventario/registri
  🗂️ Storico      → /inventario/storico
  ⚙️ Impostazioni  → /inventario/impostazioni
  ```
- **Voce attiva:** bordo sinistro 3px oro, background `rgba(212,175,55,0.18)`, testo oro
- **Voce inattiva:** testo `rgba(255,255,255,0.65)`, hover `rgba(255,255,255,0.08)`
- **Tasto collassa:** freccia in basso a sinistra della sidebar
- **Footer sidebar:** nome parrocchia abbreviato + tasto "← Torna al gestionale" che naviga a `/`

### Header bar — dettaglio
- **Background:** bianco caldo `#fefcf8` con border-bottom `1px solid rgba(212,175,55,0.3)`
- **Sinistra:** breadcrumb "Inventario / [nome pagina corrente]"
- **Centro:** nome parrocchia in piccolo (da sessionStorage)
- **Destra:** avatar utente con iniziali + nome

### Comportamento
```javascript
// Leggere ente corrente
const ente = JSON.parse(sessionStorage.getItem('current_ente') || '{}')
const utente = JSON.parse(sessionStorage.getItem('user') || '{}')
```

---

## FILE 2 — `ListaBeni.jsx`

### Layout pagina
```
HEADER
  ├── Titolo "Inventario Beni" + contatore badge (es. "47 beni")
  ├── Bottone "+ Aggiungi Bene" (oro, onclick → navigate('/inventario/beni/nuovo'))
  ├── Bottone "🖨️ Bozza PDF" (outline navy)
  └── Bottone "📋 Genera Registro" (navy pieno)

BARRA FILTRI (card bianca, padding 16px, border-radius 12px)
  ├── 🔍 Input ricerca testo (cerca in descrizione, note, provenienza)
  ├── Select Categoria (tutte le opzioni dal backend)
  ├── Select Ubicazione
  ├── Select Stato conservazione (Tutti / Ottimo / Buono / Discreto / Restauro / Scadente)
  └── Bottone "Reset filtri" (solo se filtri attivi)

TABELLA (card bianca, border-radius 12px, overflow hidden)
  └── Righe beni
```

### Tabella beni — colonne
| # | Foto | Descrizione | Categoria | Ubicazione | Q.tà | Stato | Azioni |

**Dettaglio colonne:**
- **#** — numero progressivo, font monospace, colore oro, larghezza 60px
- **Foto** — thumbnail 48x48px, border-radius 6px, object-fit cover. Se nessuna foto: placeholder grigio con icona 📷
- **Descrizione** — testo principale bold + eventuale nota in grigio sotto (max 1 riga, overflow ellipsis). Se `bloccato=true` mostrare 🔒 piccolo a destra
- **Categoria** — badge pill con sfondo `#f0e6c0`, colore `#7a5c00`, border `#d4af37`
- **Ubicazione** — testo grigio con icona 📍 davanti
- **Q.tà** — centrato, se > 1 mostrare in bold
- **Stato** — badge colorato (vedi palette stati)
- **Azioni** — tre bottoni icon: 👁️ (visualizza, grigio), ✏️ (modifica, navy, disabilitato se bloccato), 🗑️ (rimuovi, rosso, sempre attivo)

### Stato vuoto
Se nessun bene: card centrata con icona grande 🏛️, testo "Nessun bene nell'inventario", bottone "+ Aggiungi il primo bene"

### API da chiamare
```javascript
// Al mount e quando cambiano i filtri
GET /api/inventario/beni?search=...&categoria_id=...&ubicazione_id=...&stato_conservazione=...

// Per i dropdown
GET /api/inventario/categorie
GET /api/inventario/ubicazioni

// Download bozza PDF
GET /api/inventario/stampa/bozza  → download file PDF

// Modal conferma rimozione
DELETE /api/inventario/beni/{id}  → poi ricaricare lista
```

### Modal rimozione bene
Quando si clicca 🗑️ aprire modal con:
- Titolo: "Rimuovi bene dall'inventario"
- Descrizione bene in grassetto
- Select motivo rimozione (obbligatorio): venduto / rubato / donato / distrutto / deteriorato / trasferito / smarrito / altro
- Textarea note rimozione (opzionale)
- Input data rimozione (default oggi, formato `yyyy-mm-dd` per il backend)
- Bottoni: "Annulla" + "Conferma rimozione" (rosso)
- API: `DELETE /api/inventario/beni/{id}` con body `{motivo_rimozione, note_rimozione, data_rimozione}`

---

## FILE 3 — `NuovoBene.jsx` + `SchedaBene.jsx`

Questi due file possono condividere un componente form. `NuovoBene` è per la creazione, `SchedaBene` è per visualizzazione/modifica.

### Struttura pagina
```
HEADER
  ├── Bottone "← Torna ai beni" (link back)
  ├── Titolo "Nuovo Bene" / "Bene #007 — [descrizione]"
  ├── Badge 🔒 BLOCCATO (se bloccato=true, oro/navy)
  └── Bottoni salva/annulla (solo se non bloccato)

FORM (grid 2 colonne su desktop, 1 colonna su mobile)
  ├── SEZIONE 1: Dati principali (card)
  ├── SEZIONE 2: Dati economici (card)
  ├── SEZIONE 3: Dati CEI - collassabile (card)
  ├── SEZIONE 4: Note (card)
  └── SEZIONE 5: Foto (card)

FOOTER (sticky bottom, solo se non bloccato)
  └── Bottoni "Annulla" + "Salva Bene" / "Aggiorna Bene"
```

### SEZIONE 1 — Dati principali
Campi nel form:
```
Descrizione *          → textarea 2 righe (obbligatorio)
Categoria *            → select con opzioni dal backend (obbligatorio)
Ubicazione *           → select con opzioni dal backend (obbligatorio)
Quantità               → input number (min 1, default 1)
Stato conservazione    → select: ottimo/buono/discreto/restauro/scadente
Provenienza            → input text (donazione, acquisto, eredità...)
Data acquisto          → input date
Fornitore/Donatore     → input text
```

### SEZIONE 2 — Dati economici
```
Valore stimato €       → input number con prefisso "€"
Valore assicurato €    → input number con prefisso "€"
```

### SEZIONE 3 — Dati catalogazione CEI (collassabile, chiusa di default)
Header cliccabile con freccia ▶/▼:
```
Codice Regione              → input text
Numero Catalogo Generale    → input text
Codice Ente Competente      → input text
```

### SEZIONE 4 — Note
```
Note generali          → textarea 3 righe
Note storiche          → textarea 3 righe (storia, autore, epoca, stile artistico)
```

### SEZIONE 5 — Foto
**Questa sezione è la più importante visivamente.**

Layout:
```
UPLOAD AREA (drag&drop)
  → bordo tratteggiato oro, sfondo giallo tenue
  → testo "Trascina le foto qui oppure clicca per selezionare"
  → accetta: image/jpeg, image/png, image/webp
  → max 10MB per foto

GRIGLIA FOTO (grid 3 colonne, gap 12px)
  Per ogni foto:
    ├── Immagine (aspect-ratio 1, object-fit cover, border-radius 8px)
    ├── Overlay su hover con: ⭐ "Principale" | 🗑️ "Elimina"
    ├── Input didascalia sotto (piccolo, placeholder "Didascalia...")
    └── Badge "Principale" (se ordine === 0) con sfondo oro
```

In modalità visualizzazione (bloccato=true): nascondere drag&drop, nascondere bottoni elimina, mostrare solo foto con didascalie.

**API foto:**
```javascript
// Carica foto esistenti (in SchedaBene)
GET /api/inventario/beni/{id}/foto

// Upload nuova foto
POST /api/inventario/beni/{id}/foto
  → FormData con campo "foto" (file)

// Elimina foto
DELETE /api/inventario/foto/{foto_id}

// Foto principale: ordine 0
PUT /api/inventario/foto/{foto_id}/ordine  con body {ordine: 0}
```

**Visualizzazione foto:** Le foto vengono servite da `/api/inventario/foto/{foto_id}/visualizza` — usare questo URL come `src` dell'img.

### API beni
```javascript
// Crea nuovo bene
POST /api/inventario/beni
  body: { descrizione, categoria_id, ubicazione_id, quantita, stato_conservazione,
          provenienza, data_acquisto, fornitore, valore_stimato, valore_assicurato,
          codice_regione, numero_catalogo_generale, codice_ente_competente,
          note, note_storiche }

// Carica bene esistente (SchedaBene)
GET /api/inventario/beni/{id}

// Aggiorna bene
PUT /api/inventario/beni/{id}  (stesso body del POST)
```

### Navigazione
- Dopo creazione bene: navigare a `/inventario/beni/{id_nuovo}` (scheda modifica con upload foto)
- Bottone "← Torna ai beni": `navigate('/inventario/beni')`

---

## FILE 4 — `ListaRegistri.jsx`

### Layout
```
HEADER
  ├── Titolo "Registri Ufficiali"
  └── Bottone "📋 Genera Nuovo Registro" (navy)

LISTA REGISTRI (se vuota: stato vuoto con messaggio)
  Card per ogni registro:
    ├── N° Registro (grande, font monospace, oro)
    ├── Anno
    ├── Data generazione (formato italiano)
    ├── Totale beni inclusi
    ├── Generato da (nome utente)
    └── Bottone "📥 Scarica PDF"
```

### Modal "Genera Registro"
Aprire quando si clicca "Genera Nuovo Registro":
```
Titolo: "Genera Registro Ufficiale"

Avviso (box giallo con bordo oro):
  ⚠️ "Questa operazione blocca tutti i [N] beni attivi.
  Una volta generato il registro, i beni non potranno
  più essere modificati."

Textarea: "Note (opzionale)"

Bottoni: "Annulla" + "Genera Registro" (navy)
```

Prima di mostrare il modal, fare `GET /api/inventario/beni?stato=attivo` per contare i beni.

**API:**
```javascript
// Lista registri
GET /api/inventario/registri

// Genera registro
POST /api/inventario/registri/genera  body: { note }

// Download PDF registro
GET /api/inventario/registri/{id}/pdf → download
```

---

## FILE 5 — `StoricoInventario.jsx`

### Layout
```
HEADER
  ├── Titolo "Storico Beni"
  ├── Sottotitolo "Beni non più presenti nell'inventario"
  └── Bottone "🖨️ Stampa Storico Completo" (outline navy)

BARRA FILTRI
  ├── 🔍 Ricerca testo
  ├── Select Anno
  ├── Select Motivo (tutti / venduto / rubato / donato / distrutto / deteriorato / trasferito / smarrito / altro)
  └── Select Categoria

TABELLA STORICO
  Colonne: # | Descrizione | Categoria | Data rimozione | Motivo | Rimosso da | Azioni
  Azioni: 👁️ (apre modal con snapshot completo del bene)
```

**Badge motivo rimozione — colori:**
```
venduto:    background #dbeafe, color #1e40af   (blu)
rubato:     background #fee2e2, color #991b1b   (rosso)
donato:     background #d1fae5, color #065f46   (verde)
distrutto:  background #fef3c7, color #92400e   (arancio)
deteriorato:background #f3e8ff, color #6b21a8   (viola)
trasferito: background #e0f2fe, color #075985   (celeste)
smarrito:   background #fff7ed, color #9a3412   (arancio scuro)
altro:      background #f3f4f6, color #374151   (grigio)
```

**Modal visualizzazione bene storico:**
Mostrare snapshot completo (tutti i campi) in sola lettura, con le foto se presenti nello snapshot_foto.

**API:**
```javascript
GET /api/inventario/storico?search=...&anno=...&motivo=...
GET /api/inventario/storico/pdf → download
```

---

## FILE 6 — `ImpostazioniInventario.jsx`

### Layout con due tab
```
TAB: [📁 Categorie] [📍 Ubicazioni]
```

### Tab Categorie
```
Bottone "+ Aggiungi Categoria" (in alto a destra)

Lista categorie:
  Per ogni categoria:
    ├── Nome categoria
    ├── Badge "Sistema" (oro) se is_sistema=true
    ├── Ordine (numero)
    └── Azioni: ✏️ Modifica | 🗑️ Elimina (disabilitati se is_sistema=true)

Form inline (appare sopra la lista quando si aggiunge/modifica):
  ├── Nome * (input text)
  ├── Descrizione (input text)
  └── Bottoni: Annulla | Salva
```

### Tab Ubicazioni
Stessa struttura delle categorie ma senza il concetto di `is_sistema` (tutte le ubicazioni sono modificabili, tranne quelle di default se vuoi proteggerle).

**API:**
```javascript
// Categorie
GET    /api/inventario/categorie
POST   /api/inventario/categorie          body: { nome, descrizione }
PUT    /api/inventario/categorie/{id}     body: { nome, descrizione }
DELETE /api/inventario/categorie/{id}

// Ubicazioni
GET    /api/inventario/ubicazioni
POST   /api/inventario/ubicazioni         body: { nome, descrizione }
PUT    /api/inventario/ubicazioni/{id}    body: { nome, descrizione }
DELETE /api/inventario/ubicazioni/{id}
```

**Errore eliminazione:** Se il backend risponde 400 (categoria/ubicazione usata da beni), mostrare alert: "Impossibile eliminare: questa categoria è usata da X beni."

---

## AGGIORNAMENTO `App.jsx`

Aggiungere le nuove route. Trovare la sezione dove sono definiti i `<Route>` e aggiungere:

```jsx
import InventarioLayout from './pages/Inventario/InventarioLayout'
import ListaBeni from './pages/Inventario/ListaBeni'
import SchedaBene from './pages/Inventario/SchedaBene'
import NuovoBene from './pages/Inventario/NuovoBene'
import ListaRegistri from './pages/Inventario/ListaRegistri'
import StoricoInventario from './pages/Inventario/StoricoInventario'
import ImpostazioniInventario from './pages/Inventario/ImpostazioniInventario'

// All'interno del router (dentro <Routes> o equivalente del progetto):
<Route path="/inventario" element={<InventarioLayout />}>
  <Route index element={<Navigate to="/inventario/beni" replace />} />
  <Route path="beni" element={<ListaBeni />} />
  <Route path="beni/nuovo" element={<NuovoBene />} />
  <Route path="beni/:id" element={<SchedaBene />} />
  <Route path="registri" element={<ListaRegistri />} />
  <Route path="storico" element={<StoricoInventario />} />
  <Route path="impostazioni" element={<ImpostazioniInventario />} />
</Route>
```

**IMPORTANTE:** Guarda come sono strutturate le route esistenti in App.jsx (probabilmente c'è un PrivateRoute wrapper) e usa lo stesso pattern.

---

## AGGIORNAMENTO MENU PRINCIPALE

Nel file `Layout.jsx` (il layout principale dell'app), aggiungere "Inventario" nel menu laterale.

Cercare dove sono le voci di menu esistenti (Contabilità, Anagrafica, Rendiconti, ecc.) e aggiungere:
```jsx
{ path: '/inventario', icon: '🏛️', label: 'Inventario' }
```

Verificare che il permesso `inventario: true` dal JSONB dei permessi utente sia rispettato (guarda come viene controllato per "contabilità" nel Layout.jsx esistente e replica lo stesso pattern).

---

## GESTIONE STATI DI CARICAMENTO

Per ogni chiamata API usare questo pattern (coerente col resto del progetto):
```jsx
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)

// Nel fetch:
setLoading(true)
try {
  const res = await api.get('/api/inventario/...')
  setDati(res.data)
} catch (err) {
  setError('Errore nel caricamento dei dati')
} finally {
  setLoading(false)
}

// Nel render:
if (loading) return <div style={{textAlign:'center', padding:40}}>Caricamento...</div>
if (error) return <div style={{color:'red', padding:20}}>{error}</div>
```

---

## GESTIONE DOWNLOAD PDF

Per il download dei PDF (bozza, registro, storico) usare questo pattern (coerente col progetto):
```javascript
const scaricaPdf = async (url, nomeFile) => {
  try {
    const res = await api.get(url, { responseType: 'blob' })
    const urlBlob = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = urlBlob
    link.setAttribute('download', nomeFile)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(urlBlob)
  } catch {
    alert('Errore nel download del PDF')
  }
}
```

---

## ORDINE DI IMPLEMENTAZIONE SUGGERITO

1. `InventarioLayout.jsx` — struttura e navigazione
2. Aggiornare `App.jsx` con le route
3. Aggiungere voce menu in `Layout.jsx`
4. `ListaBeni.jsx` — pagina principale
5. `NuovoBene.jsx` — form creazione
6. `SchedaBene.jsx` — visualizzazione/modifica/foto
7. `ListaRegistri.jsx`
8. `StoricoInventario.jsx`
9. `ImpostazioniInventario.jsx`

**Dopo ogni file:** Testare che la navigazione funzioni e che le API rispondano. Il backend è già completo su tutti gli endpoint elencati.

---

## ⚠️ PRIMA DEL COMMIT — REVISIONE OBBLIGATORIA

**NON fare il commit prima di questo passaggio.**

Quando hai scritto tutti i file, mostra il contenuto completo di ciascuno in questa chat (o copia il testo) e scrivi:
> "Ho finito, ecco i file per la revisione"

Luciano li passerà in revisione alla chat Claude per verificare:
- Che tutti gli import siano corretti (api.js, formatCurrency, ecc.)
- Che non ci siano pattern eliminati reintrodotti (X-User-ID, fetch diretto, ecc.)
- Che il design sia coerente con quanto specificato
- Che le API chiamate esistano davvero nel backend

**Solo dopo la revisione e l'ok, fare il commit:**
```
git add .
git commit -m "feat: frontend modulo inventario completo (INV.6-INV.9)"
git push
```

---

## VERIFICA FINALE

Prima di dire "fatto", controllare:
- [ ] La voce "Inventario" appare nel menu principale
- [ ] La navigazione tra le pagine inventario funziona
- [ ] La lista beni mostra i beni dal backend
- [ ] Si può aggiungere un bene (form + salva)
- [ ] Si possono caricare foto su un bene
- [ ] I filtri nella lista funzionano
- [ ] Il download PDF bozza funziona
- [ ] La pagina impostazioni mostra categorie e ubicazioni
- [ ] Il browser non mostra errori in console

---

*Fine istruzioni — EcclesiaWeb Modulo Inventario Frontend*
*Luciano: passa questo file a Claude Code e digli "segui queste istruzioni"*
