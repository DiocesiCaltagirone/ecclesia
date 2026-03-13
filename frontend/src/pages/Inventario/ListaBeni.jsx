import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const statoBadgeColors = {
  ottimo:    { background: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  buono:     { background: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  discreto:  { background: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  restauro:  { background: '#ffedd5', color: '#9a3412', border: '#fdba74' },
  scadente:  { background: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
};

const ListaBeni = () => {
  const navigate = useNavigate();
  const [beni, setBeni] = useState([]);
  const [categorie, setCategorie] = useState([]);
  const [ubicazioni, setUbicazioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtri
  const [ricerca, setRicerca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroUbicazione, setFiltroUbicazione] = useState('');
  const [filtroStato, setFiltroStato] = useState('');

  // Modal rimozione
  const [showModalRimozione, setShowModalRimozione] = useState(false);
  const [beneSelezionato, setBeneSelezionato] = useState(null);
  const [motivoRimozione, setMotivoRimozione] = useState('');
  const [noteRimozione, setNoteRimozione] = useState('');
  const [dataRimozione, setDataRimozione] = useState(new Date().toISOString().split('T')[0]);
  const [rimozioneLoading, setRimozioneLoading] = useState(false);

  // Modal genera registro
  const [showModalRegistro, setShowModalRegistro] = useState(false);
  const [noteRegistro, setNoteRegistro] = useState('');
  const [registroLoading, setRegistroLoading] = useState(false);

  useEffect(() => {
    caricaDropdown();
  }, []);

  useEffect(() => {
    caricaBeni();
  }, [filtroCategoria, filtroUbicazione, filtroStato, ricerca]);

  const caricaDropdown = async () => {
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

  const caricaBeni = async () => {
    setLoading(true);
    try {
      const params = {};
      if (ricerca) params.ricerca = ricerca;
      if (filtroCategoria) params.categoria = filtroCategoria;
      if (filtroUbicazione) params.ubicazione = filtroUbicazione;
      if (filtroStato) params.stato_conservazione = filtroStato;

      const res = await api.get('/api/inventario/beni', { params });
      setBeni(res.data.beni || []);
      setError(null);
    } catch {
      setError('Errore nel caricamento dei beni');
    } finally {
      setLoading(false);
    }
  };

  const filtriAttivi = ricerca || filtroCategoria || filtroUbicazione || filtroStato;

  const resetFiltri = () => {
    setRicerca('');
    setFiltroCategoria('');
    setFiltroUbicazione('');
    setFiltroStato('');
  };

  const apriModalRimozione = (bene) => {
    setBeneSelezionato(bene);
    setMotivoRimozione('');
    setNoteRimozione('');
    setDataRimozione(new Date().toISOString().split('T')[0]);
    setShowModalRimozione(true);
  };

  const confermaRimozione = async () => {
    if (!motivoRimozione) {
      alert('Seleziona un motivo di rimozione');
      return;
    }
    setRimozioneLoading(true);
    try {
      await api.delete(`/api/inventario/beni/${beneSelezionato.id}`, {
        data: {
          motivo_rimozione: motivoRimozione,
          note_rimozione: noteRimozione,
          data_rimozione: dataRimozione,
        }
      });
      setShowModalRimozione(false);
      caricaBeni();
    } catch (err) {
      alert(err.response?.data?.detail || 'Errore nella rimozione del bene');
    } finally {
      setRimozioneLoading(false);
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

  const apriModalRegistro = () => {
    setNoteRegistro('');
    setShowModalRegistro(true);
  };

  const generaRegistro = async () => {
    setRegistroLoading(true);
    try {
      const anno = new Date().getFullYear();
      await api.post('/api/inventario/registri/genera', { anno, note: noteRegistro });
      setShowModalRegistro(false);
      caricaBeni();
      alert('Registro generato con successo! I beni sono stati bloccati.');
    } catch (err) {
      alert(err.response?.data?.detail || 'Errore nella generazione del registro');
    } finally {
      setRegistroLoading(false);
    }
  };

  const fotoUrl = (bene) => {
    // foto_principale contiene il path_file, ma serve l'id per l'URL di visualizzazione
    // Nella lista usiamo un placeholder perché non abbiamo l'id della foto
    return null;
  };

  const formatDataItaliana = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  if (error) return <div style={{ color: 'red', padding: 20 }}>{error}</div>;

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 style={{ fontFamily: 'Georgia, serif', color: '#1a1a2e', fontSize: 24, fontWeight: 700, margin: 0 }}>
            Inventario Beni
          </h1>
          <span
            className="px-3 py-1 rounded-full text-sm font-semibold"
            style={{ background: '#f0e6c0', color: '#7a5c00', border: '1px solid #d4af37' }}
          >
            {beni.length} beni
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/inventario/beni/nuovo')}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: '#d4af37', color: '#fff', border: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#c49b2f'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#d4af37'; }}
          >
            + Aggiungi Bene
          </button>
          <button
            onClick={scaricaBozzaPdf}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: 'transparent', color: '#1a2e55', border: '2px solid #1a2e55' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#1a2e55'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#1a2e55'; }}
          >
            🖨️ Bozza PDF
          </button>
          <button
            onClick={apriModalRegistro}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: '#1a2e55', color: '#fff', border: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#0f1d3a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#1a2e55'; }}
          >
            📋 Genera Registro
          </button>
        </div>
      </div>

      {/* BARRA FILTRI */}
      <div className="mb-4 p-4 rounded-xl" style={{ background: '#fefcf8', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1" style={{ minWidth: 200 }}>
            <span className="absolute left-3 top-2.5" style={{ color: '#6b7280' }}>🔍</span>
            <input
              type="text"
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              placeholder="Cerca per descrizione, note, provenienza..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
              style={{ border: '1px solid #ddd', outline: 'none' }}
              onFocus={(e) => { e.target.style.borderColor = '#d4af37'; }}
              onBlur={(e) => { e.target.style.borderColor = '#ddd'; }}
            />
          </div>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ border: '1px solid #ddd', minWidth: 160 }}
          >
            <option value="">Tutte le categorie</option>
            {categorie.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select
            value={filtroUbicazione}
            onChange={(e) => setFiltroUbicazione(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ border: '1px solid #ddd', minWidth: 160 }}
          >
            <option value="">Tutte le ubicazioni</option>
            {ubicazioni.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          <select
            value={filtroStato}
            onChange={(e) => setFiltroStato(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ border: '1px solid #ddd', minWidth: 140 }}
          >
            <option value="">Tutti gli stati</option>
            <option value="ottimo">Ottimo</option>
            <option value="buono">Buono</option>
            <option value="discreto">Discreto</option>
            <option value="restauro">Restauro</option>
            <option value="scadente">Scadente</option>
          </select>
          {filtriAttivi && (
            <button
              onClick={resetFiltri}
              className="px-3 py-2 rounded-lg text-sm"
              style={{ color: '#991b1b', background: '#fee2e2' }}
            >
              Reset filtri
            </button>
          )}
        </div>
      </div>

      {/* TABELLA O STATO VUOTO */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Caricamento...</div>
      ) : beni.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl" style={{ background: '#fefcf8', border: '1px solid rgba(212,175,55,0.2)' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🏛️</div>
          <h3 style={{ fontFamily: 'Georgia, serif', color: '#1a1a2e', fontSize: 20, marginBottom: 8 }}>
            Nessun bene nell'inventario
          </h3>
          <p style={{ color: '#6b7280', marginBottom: 20 }}>
            {filtriAttivi ? 'Nessun risultato con i filtri selezionati' : 'Inizia aggiungendo il primo bene'}
          </p>
          {!filtriAttivi && (
            <button
              onClick={() => navigate('/inventario/beni/nuovo')}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: '#d4af37', color: '#fff' }}
            >
              + Aggiungi il primo bene
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: '#fefcf8', border: '1px solid rgba(212,175,55,0.2)' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1a2e55', color: '#fff', fontSize: 13, fontWeight: 600 }}>
                <th className="px-3 py-3 text-left" style={{ width: 60 }}>#</th>
                <th className="px-3 py-3 text-left" style={{ width: 56 }}>Foto</th>
                <th className="px-3 py-3 text-left">Descrizione</th>
                <th className="px-3 py-3 text-left">Categoria</th>
                <th className="px-3 py-3 text-left">Ubicazione</th>
                <th className="px-3 py-3 text-center" style={{ width: 50 }}>Q.tà</th>
                <th className="px-3 py-3 text-center">Stato</th>
                <th className="px-3 py-3 text-center" style={{ width: 120 }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {beni.map((bene, idx) => {
                const statoColors = statoBadgeColors[bene.stato_conservazione] || {};
                return (
                  <tr
                    key={bene.id}
                    style={{
                      borderBottom: '1px solid rgba(212,175,55,0.1)',
                      background: idx % 2 === 0 ? '#fefcf8' : '#faf6ee',
                    }}
                    className="hover:bg-yellow-50 transition-colors"
                  >
                    <td className="px-3 py-3" style={{ fontFamily: "'Courier New', monospace", color: '#d4af37', fontWeight: 700 }}>
                      {String(bene.numero_progressivo).padStart(3, '0')}
                    </td>
                    <td className="px-3 py-3">
                      <div
                        className="flex items-center justify-center"
                        style={{
                          width: 48, height: 48, borderRadius: 6,
                          background: '#f0e6c0', color: '#999', fontSize: 20,
                        }}
                      >
                        📷
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <span style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 14 }}>
                          {bene.descrizione.length > 60 ? bene.descrizione.substring(0, 60) + '...' : bene.descrizione}
                        </span>
                        {bene.bloccato && <span style={{ fontSize: 12 }} title="Bloccato da registro">🔒</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {bene.categoria_nome && (
                        <span
                          className="inline-block px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ background: '#f0e6c0', color: '#7a5c00', border: '1px solid #d4af37' }}
                        >
                          {bene.categoria_nome}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3" style={{ color: '#6b7280', fontSize: 13 }}>
                      {bene.ubicazione_nome && <>📍 {bene.ubicazione_nome}</>}
                    </td>
                    <td className="px-3 py-3 text-center" style={{ fontWeight: bene.quantita > 1 ? 700 : 400 }}>
                      {bene.quantita}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {bene.stato_conservazione && (
                        <span
                          className="inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                          style={{
                            background: statoColors.background || '#f3f4f6',
                            color: statoColors.color || '#374151',
                            border: `1px solid ${statoColors.border || '#d1d5db'}`,
                          }}
                        >
                          {bene.stato_conservazione}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => navigate(`/inventario/beni/${bene.id}`)}
                          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                          title="Visualizza"
                          style={{ fontSize: 16 }}
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => !bene.bloccato && navigate(`/inventario/beni/${bene.id}`)}
                          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                          title={bene.bloccato ? 'Bloccato da registro' : 'Modifica'}
                          style={{ fontSize: 16, opacity: bene.bloccato ? 0.3 : 1, cursor: bene.bloccato ? 'not-allowed' : 'pointer' }}
                          disabled={bene.bloccato}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => apriModalRimozione(bene)}
                          className="p-1.5 rounded hover:bg-red-100 transition-colors"
                          title="Rimuovi"
                          style={{ fontSize: 16 }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL RIMOZIONE */}
      {showModalRimozione && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl shadow-xl w-full max-w-md mx-4" style={{ background: '#fefcf8' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(212,175,55,0.3)' }}>
              <h3 style={{ fontFamily: 'Georgia, serif', color: '#1a1a2e', fontSize: 18, fontWeight: 700 }}>
                Rimuovi bene dall'inventario
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p style={{ color: '#1a1a2e' }}>
                Bene: <strong>{beneSelezionato?.descrizione}</strong>
              </p>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#1a1a2e' }}>Motivo rimozione *</label>
                <select
                  value={motivoRimozione}
                  onChange={(e) => setMotivoRimozione(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #ddd' }}
                >
                  <option value="">Seleziona motivo...</option>
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
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#1a1a2e' }}>Note rimozione</label>
                <textarea
                  value={noteRimozione}
                  onChange={(e) => setNoteRimozione(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #ddd' }}
                  rows={3}
                  placeholder="Note aggiuntive (opzionale)"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#1a1a2e' }}>Data rimozione</label>
                <input
                  type="date"
                  value={dataRimozione}
                  onChange={(e) => setDataRimozione(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #ddd' }}
                />
              </div>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid rgba(212,175,55,0.3)' }}>
              <button
                onClick={() => setShowModalRimozione(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ border: '1px solid #ddd', color: '#6b7280' }}
              >
                Annulla
              </button>
              <button
                onClick={confermaRimozione}
                disabled={rimozioneLoading}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#991b1b', opacity: rimozioneLoading ? 0.6 : 1 }}
              >
                {rimozioneLoading ? 'Rimozione...' : 'Conferma rimozione'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GENERA REGISTRO */}
      {showModalRegistro && (
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
                  ⚠️ Questa operazione blocca tutti i <strong>{beni.length}</strong> beni attivi.
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
                  placeholder="Note aggiuntive..."
                />
              </div>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid rgba(212,175,55,0.3)' }}>
              <button
                onClick={() => setShowModalRegistro(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ border: '1px solid #ddd', color: '#6b7280' }}
              >
                Annulla
              </button>
              <button
                onClick={generaRegistro}
                disabled={registroLoading || beni.length === 0}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#1a2e55', opacity: (registroLoading || beni.length === 0) ? 0.6 : 1 }}
              >
                {registroLoading ? 'Generazione...' : 'Genera Registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaBeni;
