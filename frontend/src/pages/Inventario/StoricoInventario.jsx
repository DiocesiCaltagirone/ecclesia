import { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

const motivoBadgeColors = {
  venduto:     { background: '#dbeafe', color: '#1e40af' },
  rubato:      { background: '#fee2e2', color: '#991b1b' },
  donato:      { background: '#d1fae5', color: '#065f46' },
  distrutto:   { background: '#fef3c7', color: '#92400e' },
  deteriorato: { background: '#f3e8ff', color: '#6b21a8' },
  trasferito:  { background: '#e0f2fe', color: '#075985' },
  smarrito:    { background: '#fff7ed', color: '#9a3412' },
  altro:       { background: '#f3f4f6', color: '#374151' },
};

const StoricoInventario = () => {
  const [storico, setStorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtri
  const [filtroAnno, setFiltroAnno] = useState('');
  const [filtroMotivo, setFiltroMotivo] = useState('');
  const [ricerca, setRicerca] = useState('');

  // Modal dettaglio
  const [showDettaglio, setShowDettaglio] = useState(false);
  const [beneDettaglio, setBeneDettaglio] = useState(null);

  useEffect(() => {
    caricaStorico();
  }, [filtroAnno, filtroMotivo]);

  const caricaStorico = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtroAnno) params.anno = filtroAnno;
      if (filtroMotivo) params.motivo = filtroMotivo;

      const res = await api.get('/api/inventario/storico', { params });
      setStorico(res.data.storico || []);
      setError(null);
    } catch {
      setError('Errore nel caricamento dello storico');
    } finally {
      setLoading(false);
    }
  };

  // Filtro client-side per ricerca testo (backend non supporta search su storico)
  const storicoFiltrato = ricerca
    ? storico.filter(s =>
        (s.descrizione || '').toLowerCase().includes(ricerca.toLowerCase()) ||
        (s.categoria_nome || '').toLowerCase().includes(ricerca.toLowerCase())
      )
    : storico;

  // Anni unici per il dropdown
  const anniDisponibili = [...new Set(storico.map(s => {
    if (s.data_rimozione) return s.data_rimozione.split('-')[0];
    return null;
  }).filter(Boolean))].sort().reverse();

  const scaricaStoricoPdf = async () => {
    try {
      const params = {};
      if (filtroAnno) params.anno = filtroAnno;
      if (filtroMotivo) params.motivo = filtroMotivo;

      const res = await api.get('/api/inventario/storico/pdf', { params, responseType: 'blob' });
      const urlBlob = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = urlBlob;
      link.setAttribute('download', `storico_beni${filtroAnno ? '_' + filtroAnno : ''}.pdf`);
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

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', color: '#1a1a2e', fontSize: 24, fontWeight: 700, margin: 0 }}>
            Storico Beni
          </h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
            Beni non più presenti nell'inventario
          </p>
        </div>
        <button
          onClick={scaricaStoricoPdf}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{ color: '#1a2e55', border: '2px solid #1a2e55' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#1a2e55'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#1a2e55'; }}
        >
          🖨️ Stampa Storico Completo
        </button>
      </div>

      {/* FILTRI */}
      <div className="mb-4 p-4 rounded-xl" style={{ background: '#fefcf8', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1" style={{ minWidth: 200 }}>
            <span className="absolute left-3 top-2.5" style={{ color: '#6b7280' }}>🔍</span>
            <input
              type="text"
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              placeholder="Cerca per descrizione..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
              style={{ border: '1px solid #ddd', outline: 'none' }}
            />
          </div>
          <select
            value={filtroAnno}
            onChange={(e) => setFiltroAnno(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ border: '1px solid #ddd', minWidth: 120 }}
          >
            <option value="">Tutti gli anni</option>
            {anniDisponibili.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={filtroMotivo}
            onChange={(e) => setFiltroMotivo(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ border: '1px solid #ddd', minWidth: 140 }}
          >
            <option value="">Tutti i motivi</option>
            <option value="venduto">Venduto</option>
            <option value="rubato">Rubato</option>
            <option value="donato">Donato</option>
            <option value="distrutto">Distrutto</option>
            <option value="deteriorato">Deteriorato</option>
            <option value="trasferito">Trasferito</option>
            <option value="smarrito">Smarrito</option>
            <option value="altro">Altro</option>
          </select>
        </div>
      </div>

      {/* TABELLA O STATO VUOTO */}
      {storicoFiltrato.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl" style={{ background: '#fefcf8', border: '1px solid rgba(212,175,55,0.2)' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🗂️</div>
          <h3 style={{ fontFamily: 'Georgia, serif', color: '#1a1a2e', fontSize: 20, marginBottom: 8 }}>
            Nessun bene nello storico
          </h3>
          <p style={{ color: '#6b7280' }}>
            I beni rimossi dall'inventario appariranno qui
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: '#fefcf8', border: '1px solid rgba(212,175,55,0.2)' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1a2e55', color: '#fff', fontSize: 13, fontWeight: 600 }}>
                <th className="px-3 py-3 text-left" style={{ width: 60 }}>#</th>
                <th className="px-3 py-3 text-left">Descrizione</th>
                <th className="px-3 py-3 text-left">Categoria</th>
                <th className="px-3 py-3 text-center">Data rimozione</th>
                <th className="px-3 py-3 text-center">Motivo</th>
                <th className="px-3 py-3 text-left">Rimosso da</th>
                <th className="px-3 py-3 text-center" style={{ width: 60 }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {storicoFiltrato.map((s, idx) => {
                const motivoColors = motivoBadgeColors[s.motivo_rimozione] || motivoBadgeColors.altro;
                return (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: '1px solid rgba(212,175,55,0.1)',
                      background: idx % 2 === 0 ? '#fefcf8' : '#faf6ee',
                    }}
                  >
                    <td className="px-3 py-3" style={{ fontFamily: "'Courier New', monospace", color: '#d4af37', fontWeight: 700 }}>
                      {String(s.numero_progressivo).padStart(3, '0')}
                    </td>
                    <td className="px-3 py-3" style={{ fontWeight: 500, color: '#1a1a2e', fontSize: 14 }}>
                      {s.descrizione.length > 50 ? s.descrizione.substring(0, 50) + '...' : s.descrizione}
                    </td>
                    <td className="px-3 py-3" style={{ color: '#6b7280', fontSize: 13 }}>
                      {s.categoria_nome || '-'}
                    </td>
                    <td className="px-3 py-3 text-center" style={{ fontSize: 13 }}>
                      {formatDataItaliana(s.data_rimozione)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className="inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                        style={{ background: motivoColors.background, color: motivoColors.color }}
                      >
                        {s.motivo_rimozione}
                      </span>
                    </td>
                    <td className="px-3 py-3" style={{ color: '#6b7280', fontSize: 13 }}>
                      {s.rimosso_da || '-'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => { setBeneDettaglio(s); setShowDettaglio(true); }}
                        className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                        title="Visualizza dettaglio"
                        style={{ fontSize: 16 }}
                      >
                        👁️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DETTAGLIO BENE STORICO */}
      {showDettaglio && beneDettaglio && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" style={{ background: '#fefcf8' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(212,175,55,0.3)' }}>
              <h3 style={{ fontFamily: 'Georgia, serif', color: '#1a1a2e', fontSize: 18, fontWeight: 700 }}>
                Bene #{String(beneDettaglio.numero_progressivo).padStart(3, '0')}
              </h3>
              <button
                onClick={() => setShowDettaglio(false)}
                style={{ color: '#6b7280', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 600 }}>Descrizione</span>
                <p style={{ color: '#1a1a2e', fontWeight: 500 }}>{beneDettaglio.descrizione}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 600 }}>Categoria</span>
                  <p style={{ color: '#1a1a2e' }}>{beneDettaglio.categoria_nome || '-'}</p>
                </div>
                <div>
                  <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 600 }}>Ubicazione</span>
                  <p style={{ color: '#1a1a2e' }}>{beneDettaglio.ubicazione_nome || '-'}</p>
                </div>
                <div>
                  <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 600 }}>Data rimozione</span>
                  <p style={{ color: '#1a1a2e' }}>{formatDataItaliana(beneDettaglio.data_rimozione)}</p>
                </div>
                <div>
                  <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 600 }}>Motivo</span>
                  <p style={{ color: '#1a1a2e', textTransform: 'capitalize' }}>{beneDettaglio.motivo_rimozione}</p>
                </div>
                {beneDettaglio.valore_stimato != null && (
                  <div>
                    <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 600 }}>Valore stimato</span>
                    <p style={{ color: '#1a1a2e' }}>{formatCurrency(beneDettaglio.valore_stimato)}</p>
                  </div>
                )}
                <div>
                  <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 600 }}>Rimosso da</span>
                  <p style={{ color: '#1a1a2e' }}>{beneDettaglio.rimosso_da || '-'}</p>
                </div>
              </div>
              {beneDettaglio.note_rimozione && (
                <div>
                  <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 600 }}>Note rimozione</span>
                  <p style={{ color: '#1a1a2e' }}>{beneDettaglio.note_rimozione}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 flex justify-end" style={{ borderTop: '1px solid rgba(212,175,55,0.3)' }}>
              <button
                onClick={() => setShowDettaglio(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ border: '1px solid #ddd', color: '#6b7280' }}
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoricoInventario;
