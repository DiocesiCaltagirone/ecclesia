import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const formatDate = (date) => {
  const giorni = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  return `${giorni[date.getDay()]}, ${date.getDate()} ${mesi[date.getMonth()]} ${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const ImpostazioniInventario = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tabAttiva, setTabAttiva] = useState('categorie');
  const [categorie, setCategorie] = useState([]);
  const [ubicazioni, setUbicazioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form inline
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formNome, setFormNome] = useState('');
  const [formDescrizione, setFormDescrizione] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    caricaDati();
  }, []);

  const caricaDati = async () => {
    setLoading(true);
    try {
      const [catRes, ubRes] = await Promise.all([
        api.get('/api/inventario/categorie'),
        api.get('/api/inventario/ubicazioni'),
      ]);
      setCategorie(catRes.data.categorie || []);
      setUbicazioni(ubRes.data.ubicazioni || []);
      setError(null);
    } catch {
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const apriForm = (item = null) => {
    if (item) {
      setEditId(item.id);
      setFormNome(item.nome);
      setFormDescrizione(item.descrizione || '');
    } else {
      setEditId(null);
      setFormNome('');
      setFormDescrizione('');
    }
    setShowForm(true);
  };

  const chiudiForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormNome('');
    setFormDescrizione('');
  };

  const salva = async () => {
    if (!formNome.trim()) {
      alert('Il nome è obbligatorio');
      return;
    }

    setSaving(true);
    const endpoint = tabAttiva === 'categorie' ? '/api/inventario/categorie' : '/api/inventario/ubicazioni';
    const payload = { nome: formNome.trim(), descrizione: formDescrizione.trim() || null };

    try {
      if (editId) {
        await api.put(`${endpoint}/${editId}`, payload);
      } else {
        await api.post(endpoint, payload);
      }
      chiudiForm();
      caricaDati();
    } catch (err) {
      alert(err.response?.data?.detail || 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const elimina = async (id) => {
    const tipo = tabAttiva === 'categorie' ? 'categoria' : 'ubicazione';
    if (!confirm(`Eliminare questa ${tipo}?`)) return;

    const endpoint = tabAttiva === 'categorie' ? '/api/inventario/categorie' : '/api/inventario/ubicazioni';
    try {
      await api.delete(`${endpoint}/${id}`);
      caricaDati();
    } catch (err) {
      alert(err.response?.data?.detail || `Errore nell'eliminazione della ${tipo}`);
    }
  };

  const items = tabAttiva === 'categorie' ? categorie : ubicazioni;

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Caricamento...</div>;
  if (error) return <div style={{ color: 'red', padding: 20 }}>{error}</div>;

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-6 py-2 -mx-4 -mt-4 mb-4">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 p-1" title="Indietro">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-bold text-gray-800 flex-1 text-center tracking-wide">IMPOSTAZIONI</h1>
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatDate(currentTime)}</span>
          </div>
        </div>
      </div>

      {/* TAB */}
      <div className="flex gap-1 mb-6">
        {[
          { key: 'categorie', icon: '📁', label: 'Categorie' },
          { key: 'ubicazioni', icon: '📍', label: 'Ubicazioni' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setTabAttiva(tab.key); chiudiForm(); }}
            className="px-5 py-2.5 rounded-t-lg text-sm font-semibold transition-colors"
            style={{
              background: tabAttiva === tab.key ? '#fefcf8' : '#e8e0d0',
              color: tabAttiva === tab.key ? '#1a2e55' : '#6b7280',
              borderBottom: tabAttiva === tab.key ? '3px solid #d4af37' : '3px solid transparent',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENUTO TAB */}
      <div className="rounded-xl p-5" style={{ background: '#fefcf8', border: '1px solid rgba(212,175,55,0.2)' }}>
        {/* Bottone aggiungi */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => apriForm()}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#d4af37' }}
          >
            + Aggiungi {tabAttiva === 'categorie' ? 'Categoria' : 'Ubicazione'}
          </button>
        </div>

        {/* Form inline */}
        {showForm && (
          <div className="mb-4 p-4 rounded-lg" style={{ background: '#fefbf0', border: '1px solid #d4af37' }}>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1" style={{ minWidth: 200 }}>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#1a1a2e' }}>Nome *</label>
                <input
                  type="text"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #ddd', outline: 'none' }}
                  placeholder={`Nome ${tabAttiva === 'categorie' ? 'categoria' : 'ubicazione'}...`}
                  autoFocus
                />
              </div>
              <div className="flex-1" style={{ minWidth: 200 }}>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#1a1a2e' }}>Descrizione</label>
                <input
                  type="text"
                  value={formDescrizione}
                  onChange={(e) => setFormDescrizione(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #ddd', outline: 'none' }}
                  placeholder="Descrizione (opzionale)"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={chiudiForm}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ border: '1px solid #ddd', color: '#6b7280' }}
                >
                  Annulla
                </button>
                <button
                  onClick={salva}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ background: '#1a2e55', opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista */}
        {items.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: 30 }}>
            Nessuna {tabAttiva === 'categorie' ? 'categoria' : 'ubicazione'} presente
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const isSistema = tabAttiva === 'categorie' && item.is_sistema;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-4 py-3 rounded-lg"
                  style={{ background: '#fff', border: '1px solid rgba(212,175,55,0.15)' }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ color: '#d4af37', fontSize: 12, fontFamily: "'Courier New', monospace", minWidth: 30 }}>
                      #{item.ordine}
                    </span>
                    <div>
                      <span style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 14 }}>{item.nome}</span>
                      {item.descrizione && (
                        <span style={{ color: '#6b7280', fontSize: 12, marginLeft: 8 }}>— {item.descrizione}</span>
                      )}
                    </div>
                    {isSistema && (
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{ background: '#f0e6c0', color: '#7a5c00', border: '1px solid #d4af37' }}
                      >
                        Sistema
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => !isSistema && apriForm(item)}
                      className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                      style={{ opacity: isSistema ? 0.3 : 1, cursor: isSistema ? 'not-allowed' : 'pointer', fontSize: 14 }}
                      disabled={isSistema}
                      title={isSistema ? 'Non modificabile' : 'Modifica'}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => !isSistema && elimina(item.id)}
                      className="p-1.5 rounded hover:bg-red-50 transition-colors"
                      style={{ opacity: isSistema ? 0.3 : 1, cursor: isSistema ? 'not-allowed' : 'pointer', fontSize: 14 }}
                      disabled={isSistema}
                      title={isSistema ? 'Non eliminabile' : 'Elimina'}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImpostazioniInventario;
