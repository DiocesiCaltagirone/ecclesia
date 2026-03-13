import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const NuovoBene = () => {
  const navigate = useNavigate();
  const [categorie, setCategorie] = useState([]);
  const [ubicazioni, setUbicazioni] = useState([]);
  const [saving, setSaving] = useState(false);
  const [ceiAperto, setCeiAperto] = useState(false);

  const [form, setForm] = useState({
    descrizione: '',
    categoria_id: '',
    ubicazione_id: '',
    quantita: 1,
    stato_conservazione: '',
    provenienza: '',
    data_acquisto: '',
    fornitore: '',
    valore_stimato: '',
    valore_assicurato: '',
    codice_regione: '',
    numero_catalogo_generale: '',
    codice_ente_competente: '',
    note: '',
    note_storiche: '',
  });

  useEffect(() => {
    const caricaDati = async () => {
      try {
        const [catRes, ubRes] = await Promise.all([
          api.get('/api/inventario/categorie'),
          api.get('/api/inventario/ubicazioni'),
        ]);
        setCategorie(catRes.data.categorie || []);
        setUbicazioni(ubRes.data.ubicazioni || []);
      } catch {
        // silenzioso
      }
    };
    caricaDati();
  }, []);

  const handleChange = (campo, valore) => {
    setForm(prev => ({ ...prev, [campo]: valore }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.descrizione.trim()) {
      alert('La descrizione è obbligatoria');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        quantita: parseInt(form.quantita) || 1,
        valore_stimato: form.valore_stimato ? parseFloat(String(form.valore_stimato).replace(',', '.')) : null,
        valore_assicurato: form.valore_assicurato ? parseFloat(String(form.valore_assicurato).replace(',', '.')) : null,
        categoria_id: form.categoria_id || null,
        ubicazione_id: form.ubicazione_id || null,
        data_acquisto: form.data_acquisto || null,
      };

      const res = await api.post('/api/inventario/beni', payload);
      navigate(`/inventario/beni/${res.data.id}`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 14,
    width: '100%',
    outline: 'none',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  };

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#1a1a2e',
    marginBottom: 4,
  };

  const cardStyle = {
    background: '#fefcf8',
    border: '1px solid rgba(212,175,55,0.2)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 900, margin: '0 auto' }}>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inventario/beni')}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{ color: '#6b7280', border: '1px solid #ddd' }}
          >
            ← Torna ai beni
          </button>
          <h1 style={{ fontFamily: 'Georgia, serif', color: '#1a1a2e', fontSize: 22, fontWeight: 700, margin: 0 }}>
            Nuovo Bene
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* SEZIONE 1 — Dati principali */}
        <div style={cardStyle}>
          <h3 style={{ fontFamily: 'Georgia, serif', color: '#1a2e55', fontSize: 16, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #d4af37' }}>
            Dati Principali
          </h3>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Descrizione *</label>
              <textarea
                value={form.descrizione}
                onChange={(e) => handleChange('descrizione', e.target.value)}
                style={{ ...inputStyle, resize: 'vertical' }}
                rows={2}
                placeholder="Descrizione del bene..."
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Categoria *</label>
              <select
                value={form.categoria_id}
                onChange={(e) => handleChange('categoria_id', e.target.value)}
                style={inputStyle}
              >
                <option value="">Seleziona categoria...</option>
                {categorie.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Ubicazione *</label>
              <select
                value={form.ubicazione_id}
                onChange={(e) => handleChange('ubicazione_id', e.target.value)}
                style={inputStyle}
              >
                <option value="">Seleziona ubicazione...</option>
                {ubicazioni.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Quantità</label>
              <input
                type="number"
                min="1"
                value={form.quantita}
                onChange={(e) => handleChange('quantita', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Stato conservazione</label>
              <select
                value={form.stato_conservazione}
                onChange={(e) => handleChange('stato_conservazione', e.target.value)}
                style={inputStyle}
              >
                <option value="">Seleziona...</option>
                <option value="ottimo">Ottimo</option>
                <option value="buono">Buono</option>
                <option value="discreto">Discreto</option>
                <option value="restauro">Restauro</option>
                <option value="scadente">Scadente</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Provenienza</label>
              <input
                type="text"
                value={form.provenienza}
                onChange={(e) => handleChange('provenienza', e.target.value)}
                style={inputStyle}
                placeholder="Es. donazione, acquisto, eredità..."
              />
            </div>
            <div>
              <label style={labelStyle}>Data acquisto</label>
              <input
                type="date"
                value={form.data_acquisto}
                onChange={(e) => handleChange('data_acquisto', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Fornitore / Donatore</label>
              <input
                type="text"
                value={form.fornitore}
                onChange={(e) => handleChange('fornitore', e.target.value)}
                style={inputStyle}
                placeholder="Nome fornitore o donatore"
              />
            </div>
          </div>
        </div>

        {/* SEZIONE 2 — Dati economici */}
        <div style={cardStyle}>
          <h3 style={{ fontFamily: 'Georgia, serif', color: '#1a2e55', fontSize: 16, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #d4af37' }}>
            Dati Economici
          </h3>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div>
              <label style={labelStyle}>Valore stimato</label>
              <div className="relative">
                <span className="absolute left-3 top-2" style={{ color: '#6b7280', fontSize: 14 }}>€</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.valore_stimato}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || /^\d*[.,]?\d{0,2}$/.test(v)) handleChange('valore_stimato', v);
                  }}
                  style={{ ...inputStyle, paddingLeft: 28 }}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Valore assicurato</label>
              <div className="relative">
                <span className="absolute left-3 top-2" style={{ color: '#6b7280', fontSize: 14 }}>€</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.valore_assicurato}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || /^\d*[.,]?\d{0,2}$/.test(v)) handleChange('valore_assicurato', v);
                  }}
                  style={{ ...inputStyle, paddingLeft: 28 }}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SEZIONE 3 — Dati CEI (collassabile) */}
        <div style={cardStyle}>
          <button
            type="button"
            onClick={() => setCeiAperto(!ceiAperto)}
            className="w-full flex items-center justify-between"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <h3 style={{ fontFamily: 'Georgia, serif', color: '#1a2e55', fontSize: 16, fontWeight: 700, margin: 0 }}>
              {ceiAperto ? '▼' : '▶'} Dati catalogazione CEI
            </h3>
            <span style={{ color: '#6b7280', fontSize: 12 }}>opzionale</span>
          </button>
          {ceiAperto && (
            <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              <div>
                <label style={labelStyle}>Codice Regione</label>
                <input
                  type="text"
                  value={form.codice_regione}
                  onChange={(e) => handleChange('codice_regione', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Numero Catalogo Generale</label>
                <input
                  type="text"
                  value={form.numero_catalogo_generale}
                  onChange={(e) => handleChange('numero_catalogo_generale', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Codice Ente Competente</label>
                <input
                  type="text"
                  value={form.codice_ente_competente}
                  onChange={(e) => handleChange('codice_ente_competente', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          )}
        </div>

        {/* SEZIONE 4 — Note */}
        <div style={cardStyle}>
          <h3 style={{ fontFamily: 'Georgia, serif', color: '#1a2e55', fontSize: 16, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #d4af37' }}>
            Note
          </h3>
          <div className="space-y-4">
            <div>
              <label style={labelStyle}>Note generali</label>
              <textarea
                value={form.note}
                onChange={(e) => handleChange('note', e.target.value)}
                style={{ ...inputStyle, resize: 'vertical' }}
                rows={3}
                placeholder="Note generali sul bene..."
              />
            </div>
            <div>
              <label style={labelStyle}>Note storiche</label>
              <textarea
                value={form.note_storiche}
                onChange={(e) => handleChange('note_storiche', e.target.value)}
                style={{ ...inputStyle, resize: 'vertical' }}
                rows={3}
                placeholder="Storia, autore, epoca, stile artistico..."
              />
            </div>
          </div>
        </div>

        {/* Info: le foto si aggiungono dopo il salvataggio */}
        <div className="p-4 rounded-lg mb-6" style={{ background: '#dbeafe', border: '1px solid #93c5fd', color: '#1e40af', fontSize: 14 }}>
          ℹ️ Dopo il salvataggio potrai aggiungere le foto dalla scheda del bene.
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 pb-6">
          <button
            type="button"
            onClick={() => navigate('/inventario/beni')}
            className="px-5 py-2.5 rounded-lg text-sm font-medium"
            style={{ border: '1px solid #ddd', color: '#6b7280' }}
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#d4af37', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Salvataggio...' : 'Salva Bene'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NuovoBene;
