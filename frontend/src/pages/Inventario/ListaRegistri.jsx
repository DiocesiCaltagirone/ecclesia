import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const formatDate = (date) => {
  const giorni = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  return `${giorni[date.getDay()]}, ${date.getDate()} ${mesi[date.getMonth()]} ${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const ListaRegistri = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [registri, setRegistri] = useState([]);
  const [beniCount, setBeniCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal genera registro
  const [showModal, setShowModal] = useState(false);
  const [noteRegistro, setNoteRegistro] = useState('');
  const [generaLoading, setGeneraLoading] = useState(false);

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
      const res = await api.get('/api/inventario/registri');
      setRegistri(res.data.registri || []);
      setError(null);
    } catch {
      setError('Errore nel caricamento dei registri');
    } finally {
      setLoading(false);
    }
  };

  const apriModal = async () => {
    try {
      const res = await api.get('/api/inventario/beni');
      setBeniCount(res.data.totale || 0);
      setNoteRegistro('');
      setShowModal(true);
    } catch {
      alert('Errore nel conteggio dei beni');
    }
  };

  const generaRegistro = async () => {
    setGeneraLoading(true);
    try {
      const anno = new Date().getFullYear();
      await api.post('/api/inventario/registri/genera', { anno, note: noteRegistro });
      setShowModal(false);
      caricaDati();
      alert('Registro generato con successo!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Errore nella generazione del registro');
    } finally {
      setGeneraLoading(false);
    }
  };

  const scaricaBozzaPdf = async () => {
    try {
      const res = await api.get('/api/inventario/stampa/bozza', { responseType: 'blob' });
      const urlBlob = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = urlBlob;
      link.setAttribute('download', 'bozza_registro_beni.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(urlBlob);
    } catch {
      alert('Errore nel download del PDF');
    }
  };

  const scaricaPdf = async (registroId, anno, numero) => {
    try {
      const res = await api.get(`/api/inventario/registri/${registroId}/pdf`, { responseType: 'blob' });
      const urlBlob = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = urlBlob;
      link.setAttribute('download', `registro_beni_${anno}_N${numero}.pdf`);
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
    // Prova con formato datetime
    const d = new Date(dateStr);
    if (!isNaN(d)) return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return dateStr;
  };

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
          <h1 className="text-base font-bold text-gray-800 flex-1 text-center tracking-wide">REGISTRI</h1>
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatDate(currentTime)}</span>
          </div>
        </div>
      </div>

      {/* AZIONI */}
      <div className="bg-white border-b border-gray-200 px-6 -mx-4 mb-4">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-4">
            <button
              onClick={scaricaBozzaPdf}
              className="px-2 py-2 text-sm font-semibold text-gray-600 border-b-2 border-transparent hover:text-blue-600 transition-colors"
            >
              Bozza PDF
            </button>
            <button
              onClick={apriModal}
              className="px-2 py-2 text-sm font-semibold text-green-600 border-b-2 border-transparent hover:text-green-700 transition-colors"
            >
              + Genera Registro
            </button>
          </div>
        </div>
      </div>

      {/* LISTA O STATO VUOTO */}
      {registri.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl" style={{ background: '#fefcf8', border: '1px solid rgba(212,175,55,0.2)' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📋</div>
          <h3 style={{ fontFamily: 'Georgia, serif', color: '#1a1a2e', fontSize: 20, marginBottom: 8 }}>
            Nessun registro generato
          </h3>
          <p style={{ color: '#6b7280' }}>
            Genera il primo registro per bloccare i beni attivi
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {registri.map((reg) => (
            <div
              key={reg.id}
              className="flex items-center justify-between p-5 rounded-xl"
              style={{ background: '#fefcf8', border: '1px solid rgba(212,175,55,0.2)' }}
            >
              <div className="flex items-center gap-6">
                <div style={{ fontFamily: "'Courier New', monospace", color: '#d4af37', fontSize: 28, fontWeight: 700, minWidth: 60, textAlign: 'center' }}>
                  N.{reg.numero_registro}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 16 }}>
                    Anno {reg.anno}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>
                    Generato il {formatDataItaliana(reg.data_generazione)} — {reg.totale_beni} beni inclusi
                  </div>
                  {reg.generato_da && (
                    <div style={{ color: '#999', fontSize: 12, marginTop: 2 }}>
                      Da: {reg.generato_da}
                    </div>
                  )}
                  {reg.note && (
                    <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
                      {reg.note}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => scaricaPdf(reg.id, reg.anno, reg.numero_registro)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{ color: '#1a2e55', border: '2px solid #1a2e55' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#1a2e55'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#1a2e55'; }}
              >
                📥 Scarica PDF
              </button>
            </div>
          ))}
        </div>
      )}

      {/* MODAL GENERA REGISTRO */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl shadow-xl w-full max-w-md mx-4" style={{ background: '#fefcf8' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(212,175,55,0.3)' }}>
              <h3 style={{ fontFamily: 'Georgia, serif', color: '#1a1a2e', fontSize: 18, fontWeight: 700 }}>
                Genera Registro Ufficiale
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="p-4 rounded-lg" style={{ background: '#fef3c7', border: '1px solid #d4af37' }}>
                <p style={{ color: '#92400e', fontSize: 14 }}>
                  ⚠️ Questa operazione blocca tutti i <strong>{beniCount}</strong> beni attivi.
                  Una volta generato il registro, i beni non potranno più essere modificati.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#1a1a2e' }}>Note (opzionale)</label>
                <textarea
                  value={noteRegistro}
                  onChange={(e) => setNoteRegistro(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #ddd' }}
                  rows={3}
                />
              </div>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid rgba(212,175,55,0.3)' }}>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ border: '1px solid #ddd', color: '#6b7280' }}
              >
                Annulla
              </button>
              <button
                onClick={generaRegistro}
                disabled={generaLoading || beniCount === 0}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#1a2e55', opacity: (generaLoading || beniCount === 0) ? 0.6 : 1 }}
              >
                {generaLoading ? 'Generazione...' : 'Genera Registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaRegistri;
