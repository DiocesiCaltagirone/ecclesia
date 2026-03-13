import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const statoBadgeColors = {
  ottimo:    { background: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  buono:     { background: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  discreto:  { background: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  restauro:  { background: '#ffedd5', color: '#9a3412', border: '#fdba74' },
  scadente:  { background: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
};

const SchedaBene = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [bene, setBene] = useState(null);
  const [foto, setFoto] = useState([]);
  const [categorie, setCategorie] = useState([]);
  const [ubicazioni, setUbicazioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ceiAperto, setCeiAperto] = useState(false);
  const [editMode, setEditMode] = useState(false);

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
    caricaDati();
  }, [id]);

  const caricaDati = async () => {
    setLoading(true);
    try {
      const [beneRes, catRes, ubRes] = await Promise.all([
        api.get(`/api/inventario/beni/${id}`),
        api.get('/api/inventario/categorie'),
        api.get('/api/inventario/ubicazioni'),
      ]);

      const b = beneRes.data;
      setBene(b);
      setFoto(b.foto || []);
      setCategorie(catRes.data.categorie || []);
      setUbicazioni(ubRes.data.ubicazioni || []);

      setForm({
        descrizione: b.descrizione || '',
        categoria_id: b.categoria_id || '',
        ubicazione_id: b.ubicazione_id || '',
        quantita: b.quantita || 1,
        stato_conservazione: b.stato_conservazione || '',
        provenienza: b.provenienza || '',
        data_acquisto: b.data_acquisto || '',
        fornitore: b.fornitore || '',
        valore_stimato: b.valore_stimato != null ? b.valore_stimato : '',
        valore_assicurato: b.valore_assicurato != null ? b.valore_assicurato : '',
        codice_regione: b.codice_regione || '',
        numero_catalogo_generale: b.numero_catalogo_generale || '',
        codice_ente_competente: b.codice_ente_competente || '',
        note: b.note || '',
        note_storiche: b.note_storiche || '',
      });

      if (b.codice_regione || b.numero_catalogo_generale || b.codice_ente_competente) {
        setCeiAperto(true);
      }

      setError(null);
    } catch {
      setError('Errore nel caricamento del bene');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (campo, valore) => {
    setForm(prev => ({ ...prev, [campo]: valore }));
    if (!editMode) setEditMode(true);
  };

  const handleSave = async () => {
    if (!form.descrizione.trim()) {
      alert('La descrizione è obbligatoria');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        quantita: parseInt(form.quantita) || 1,
        valore_stimato: form.valore_stimato !== '' ? parseFloat(String(form.valore_stimato).replace(',', '.')) : null,
        valore_assicurato: form.valore_assicurato !== '' ? parseFloat(String(form.valore_assicurato).replace(',', '.')) : null,
        categoria_id: form.categoria_id || null,
        ubicazione_id: form.ubicazione_id || null,
        data_acquisto: form.data_acquisto || null,
      };

      await api.put(`/api/inventario/beni/${id}`, payload);
      setEditMode(false);
      caricaDati();
    } catch (err) {
      alert(err.response?.data?.detail || 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadFoto = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(`/api/inventario/beni/${id}/foto`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      // Ricarica foto
      const res = await api.get(`/api/inventario/beni/${id}/foto`);
      setFoto(res.data.foto || []);
    } catch (err) {
      alert(err.response?.data?.detail || 'Errore nel caricamento della foto');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFoto = async (fotoId) => {
    if (!confirm('Eliminare questa foto?')) return;
    try {
      await api.delete(`/api/inventario/foto/${fotoId}`);
      const res = await api.get(`/api/inventario/beni/${id}/foto`);
      setFoto(res.data.foto || []);
    } catch {
      alert('Errore nell\'eliminazione della foto');
    }
  };

  const handleSetPrincipale = async (fotoId) => {
    try {
      await api.put(`/api/inventario/foto/${fotoId}/ordine`, { ordine: 0 });
      const res = await api.get(`/api/inventario/beni/${id}/foto`);
      setFoto(res.data.foto || []);
    } catch {
      alert('Errore nell\'impostazione della foto principale');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    handleUploadFoto(files);
  };

  const scaricaSchedaPdf = async () => {
    try {
      const res = await api.get(`/api/inventario/stampa/bene/${id}`, { responseType: 'blob' });
      const urlBlob = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = urlBlob;
      link.setAttribute('download', `scheda_bene_${bene?.numero_progressivo || ''}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(urlBlob);
    } catch {
      alert('Errore nel download del PDF');
    }
  };

  const formatDataItaliana = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Caricamento...</div>;
  if (error) return <div style={{ color: 'red', padding: 20 }}>{error}</div>;
  if (!bene) return null;

  const bloccato = bene.bloccato;

  const inputStyle = {
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 14,
    width: '100%',
    outline: 'none',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    background: bloccato ? '#f3f4f6' : '#fff',
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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inventario/beni')}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{ color: '#6b7280', border: '1px solid #ddd' }}
          >
            ← Torna ai beni
          </button>
          <h1 style={{ fontFamily: 'Georgia, serif', color: '#1a1a2e', fontSize: 22, fontWeight: 700, margin: 0 }}>
            Bene #{String(bene.numero_progressivo).padStart(3, '0')} — {bene.descrizione.substring(0, 40)}
            {bene.descrizione.length > 40 ? '...' : ''}
          </h1>
          {bloccato && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: '#1a2e55', color: '#d4af37' }}>
              🔒 BLOCCATO
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={scaricaSchedaPdf}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ color: '#1a2e55', border: '2px solid #1a2e55' }}
          >
            🖨️ PDF
          </button>
          {!bloccato && editMode && (
            <>
              <button
                onClick={() => { setEditMode(false); caricaDati(); }}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ border: '1px solid #ddd', color: '#6b7280' }}
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#d4af37', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Salvataggio...' : 'Aggiorna Bene'}
              </button>
            </>
          )}
        </div>
      </div>

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
              disabled={bloccato}
            />
          </div>
          <div>
            <label style={labelStyle}>Categoria</label>
            <select value={form.categoria_id} onChange={(e) => handleChange('categoria_id', e.target.value)} style={inputStyle} disabled={bloccato}>
              <option value="">Seleziona...</option>
              {categorie.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Ubicazione</label>
            <select value={form.ubicazione_id} onChange={(e) => handleChange('ubicazione_id', e.target.value)} style={inputStyle} disabled={bloccato}>
              <option value="">Seleziona...</option>
              {ubicazioni.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Quantità</label>
            <input type="number" min="1" value={form.quantita} onChange={(e) => handleChange('quantita', e.target.value)} style={inputStyle} disabled={bloccato} />
          </div>
          <div>
            <label style={labelStyle}>Stato conservazione</label>
            <select value={form.stato_conservazione} onChange={(e) => handleChange('stato_conservazione', e.target.value)} style={inputStyle} disabled={bloccato}>
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
            <input type="text" value={form.provenienza} onChange={(e) => handleChange('provenienza', e.target.value)} style={inputStyle} disabled={bloccato} />
          </div>
          <div>
            <label style={labelStyle}>Data acquisto</label>
            <input type="date" value={form.data_acquisto} onChange={(e) => handleChange('data_acquisto', e.target.value)} style={inputStyle} disabled={bloccato} />
          </div>
          <div>
            <label style={labelStyle}>Fornitore / Donatore</label>
            <input type="text" value={form.fornitore} onChange={(e) => handleChange('fornitore', e.target.value)} style={inputStyle} disabled={bloccato} />
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
                disabled={bloccato}
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
                disabled={bloccato}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SEZIONE 3 — CEI */}
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
              <input type="text" value={form.codice_regione} onChange={(e) => handleChange('codice_regione', e.target.value)} style={inputStyle} disabled={bloccato} />
            </div>
            <div>
              <label style={labelStyle}>Numero Catalogo Generale</label>
              <input type="text" value={form.numero_catalogo_generale} onChange={(e) => handleChange('numero_catalogo_generale', e.target.value)} style={inputStyle} disabled={bloccato} />
            </div>
            <div>
              <label style={labelStyle}>Codice Ente Competente</label>
              <input type="text" value={form.codice_ente_competente} onChange={(e) => handleChange('codice_ente_competente', e.target.value)} style={inputStyle} disabled={bloccato} />
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
            <textarea value={form.note} onChange={(e) => handleChange('note', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={3} disabled={bloccato} />
          </div>
          <div>
            <label style={labelStyle}>Note storiche</label>
            <textarea value={form.note_storiche} onChange={(e) => handleChange('note_storiche', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={3} disabled={bloccato} placeholder="Storia, autore, epoca, stile artistico..." />
          </div>
        </div>
      </div>

      {/* SEZIONE 5 — Foto */}
      <div style={cardStyle}>
        <h3 style={{ fontFamily: 'Georgia, serif', color: '#1a2e55', fontSize: 16, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #d4af37' }}>
          Foto
        </h3>

        {/* Upload area (solo se non bloccato) */}
        {!bloccato && (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center py-8 mb-4 rounded-lg cursor-pointer transition-colors"
            style={{
              border: '2px dashed #d4af37',
              background: uploading ? '#fef3c7' : '#fefbf0',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => handleUploadFoto(e.target.files)}
              style={{ display: 'none' }}
            />
            <div style={{ fontSize: 32, marginBottom: 8 }}>{uploading ? '⏳' : '📷'}</div>
            <p style={{ color: '#7a5c00', fontSize: 14 }}>
              {uploading ? 'Caricamento in corso...' : 'Trascina le foto qui oppure clicca per selezionare'}
            </p>
            <p style={{ color: '#999', fontSize: 12, marginTop: 4 }}>JPG, PNG, WEBP — max 10MB</p>
          </div>
        )}

        {/* Griglia foto */}
        {foto.length > 0 ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {foto.map((f) => (
              <div key={f.id} className="relative group rounded-lg overflow-hidden" style={{ background: '#f0e6c0' }}>
                <div style={{ aspectRatio: '1', position: 'relative' }}>
                  <img
                    src={`${import.meta.env.DEV ? 'http://localhost:8000' : ''}/api/inventario/foto/${f.id}/visualizza`}
                    alt={f.didascalia || f.nome_file}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  {/* Badge principale */}
                  {f.ordine === 0 && (
                    <div
                      className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-semibold"
                      style={{ background: '#d4af37', color: '#fff' }}
                    >
                      ⭐ Principale
                    </div>
                  )}
                  {/* Overlay azioni */}
                  {!bloccato && (
                    <div
                      className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.5)' }}
                    >
                      {f.ordine !== 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSetPrincipale(f.id); }}
                          className="px-2 py-1 rounded text-xs font-semibold"
                          style={{ background: '#d4af37', color: '#fff' }}
                        >
                          ⭐ Principale
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFoto(f.id); }}
                        className="px-2 py-1 rounded text-xs font-semibold"
                        style={{ background: '#991b1b', color: '#fff' }}
                      >
                        🗑️ Elimina
                      </button>
                    </div>
                  )}
                </div>
                {f.didascalia && (
                  <p className="px-2 py-1 text-xs" style={{ color: '#6b7280' }}>{f.didascalia}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', padding: 20 }}>
            Nessuna foto caricata
          </p>
        )}
      </div>

      {/* FOOTER info */}
      <div className="flex items-center justify-between text-xs pb-6" style={{ color: '#6b7280' }}>
        <div>
          {bene.creato_da && <span>Creato da: {bene.creato_da}</span>}
          {bene.created_at && <span> — {formatDataItaliana(bene.created_at.split('T')[0])}</span>}
        </div>
        <div>
          {bene.modificato_da && <span>Modificato da: {bene.modificato_da}</span>}
          {bene.updated_at && <span> — {formatDataItaliana(bene.updated_at.split('T')[0])}</span>}
        </div>
      </div>
    </div>
  );
};

export default SchedaBene;
