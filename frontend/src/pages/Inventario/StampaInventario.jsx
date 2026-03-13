import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

const statoBadgeColors = {
  ottimo:    { background: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  buono:     { background: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  discreto:  { background: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  restauro:  { background: '#ffedd5', color: '#9a3412', border: '#fdba74' },
  scadente:  { background: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
};

const formatDate = (date) => {
  const giorni = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];
  const mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  return `${giorni[date.getDay()]}, ${date.getDate()} ${mesi[date.getMonth()]} ${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const StampaInventario = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [categorie, setCategorie] = useState([]);
  const [ubicazioni, setUbicazioni] = useState([]);
  const [loading, setLoading] = useState(false);
  const [beni, setBeni] = useState(null);

  // Filtri
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroUbicazione, setFiltroUbicazione] = useState('');
  const [filtroStato, setFiltroStato] = useState('');
  const [dataDa, setDataDa] = useState('');
  const [dataA, setDataA] = useState('');
  const [valoreMin, setValoreMin] = useState('');
  const [valoreMax, setValoreMax] = useState('');
  const [filtroBloccato, setFiltroBloccato] = useState('tutti');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    caricaDropdown();
  }, []);

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

  const caricaAnteprima = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtroCategoria) params.categoria = filtroCategoria;
      if (filtroUbicazione) params.ubicazione = filtroUbicazione;
      if (filtroStato) params.stato_conservazione = filtroStato;
      if (filtroBloccato === 'bloccati') params.bloccato = 'true';
      if (filtroBloccato === 'non_bloccati') params.bloccato = 'false';

      const res = await api.get('/api/inventario/beni', { params });
      let risultati = res.data.beni || [];

      // Filtri client-side per data e valore (non supportati dal backend beni)
      if (dataDa) risultati = risultati.filter(b => b.data_acquisto && b.data_acquisto >= dataDa);
      if (dataA) risultati = risultati.filter(b => b.data_acquisto && b.data_acquisto <= dataA);
      if (valoreMin) risultati = risultati.filter(b => b.valore_stimato && b.valore_stimato >= parseFloat(valoreMin));
      if (valoreMax) risultati = risultati.filter(b => b.valore_stimato && b.valore_stimato <= parseFloat(valoreMax));

      setBeni(risultati);
    } catch {
      alert('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const generaPdf = async () => {
    try {
      const params = {};
      if (filtroCategoria) params.categoria_id = filtroCategoria;
      if (filtroUbicazione) params.ubicazione_id = filtroUbicazione;
      if (filtroStato) params.stato_conservazione = filtroStato;
      if (dataDa) params.data_da = dataDa;
      if (dataA) params.data_a = dataA;
      if (valoreMin) params.valore_min = valoreMin;
      if (valoreMax) params.valore_max = valoreMax;
      if (filtroBloccato === 'bloccati') params.bloccato = 'true';
      if (filtroBloccato === 'non_bloccati') params.bloccato = 'false';

      const res = await api.get('/api/inventario/stampa/bozza', { params, responseType: 'blob' });
      const urlBlob = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = urlBlob;
      link.setAttribute('download', 'stampa_inventario.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(urlBlob);
    } catch {
      alert('Errore nella generazione del PDF');
    }
  };

  const resetFiltri = () => {
    setFiltroCategoria('');
    setFiltroUbicazione('');
    setFiltroStato('');
    setDataDa('');
    setDataA('');
    setValoreMin('');
    setValoreMax('');
    setFiltroBloccato('tutti');
    setBeni(null);
  };

  const formatDataItaliana = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

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
          <h1 className="text-base font-bold text-gray-800 flex-1 text-center tracking-wide">STAMPA</h1>
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatDate(currentTime)}</span>
          </div>
        </div>
      </div>

      {/* FILTRI */}
      <div className="bg-white rounded-lg shadow-sm mb-4">
        <div className="border-b border-gray-200 px-5 py-3">
          <h2 className="text-lg font-bold text-gray-800">Stampa Inventario</h2>
          <p className="text-xs text-gray-600">Genera un PDF filtrato dei beni dell'inventario</p>
        </div>

        <div className="p-5">
          <div className="space-y-3">

            {/* RIGA 1: Categoria + Ubicazione + Stato */}
            <div>
              <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Filtri</h3>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Categoria</label>
                  <select
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                    style={{ fontSize: 13, padding: '5px 8px' }}
                  >
                    <option value="">Tutte</option>
                    {categorie.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ubicazione</label>
                  <select
                    value={filtroUbicazione}
                    onChange={(e) => setFiltroUbicazione(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                    style={{ fontSize: 13, padding: '5px 8px' }}
                  >
                    <option value="">Tutte</option>
                    {ubicazioni.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Stato conservazione</label>
                  <select
                    value={filtroStato}
                    onChange={(e) => setFiltroStato(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                    style={{ fontSize: 13, padding: '5px 8px' }}
                  >
                    <option value="">Tutti</option>
                    <option value="ottimo">Ottimo</option>
                    <option value="buono">Buono</option>
                    <option value="discreto">Discreto</option>
                    <option value="restauro">Restauro</option>
                    <option value="scadente">Scadente</option>
                  </select>
                </div>
              </div>
            </div>

            {/* RIGA 2: Date + Valori */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-3">
                <label className="block text-xs text-gray-500 mb-1">Data acquisto da</label>
                <input
                  type="date"
                  value={dataDa}
                  onChange={(e) => setDataDa(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                  style={{ fontSize: 13, padding: '5px 8px' }}
                />
              </div>
              <div className="col-span-3">
                <label className="block text-xs text-gray-500 mb-1">Data acquisto a</label>
                <input
                  type="date"
                  value={dataA}
                  onChange={(e) => setDataA(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                  style={{ fontSize: 13, padding: '5px 8px' }}
                />
              </div>
              <div className="col-span-3">
                <label className="block text-xs text-gray-500 mb-1">Valore stimato min</label>
                <input
                  type="number"
                  value={valoreMin}
                  onChange={(e) => setValoreMin(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                  style={{ fontSize: 13, padding: '5px 8px' }}
                  placeholder="0,00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-xs text-gray-500 mb-1">Valore stimato max</label>
                <input
                  type="number"
                  value={valoreMax}
                  onChange={(e) => setValoreMax(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                  style={{ fontSize: 13, padding: '5px 8px' }}
                  placeholder="0,00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* RIGA 3: Bloccato */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Stato blocco</label>
              <div className="flex gap-4">
                {[
                  { value: 'tutti', label: 'Tutti' },
                  { value: 'bloccati', label: 'Solo bloccati' },
                  { value: 'non_bloccati', label: 'Solo non bloccati' },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="filtro-bloccato"
                      value={opt.value}
                      checked={filtroBloccato === opt.value}
                      onChange={(e) => setFiltroBloccato(e.target.value)}
                    />
                    <span className="font-medium text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* RIGA 4: AZIONI */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
              <button
                onClick={caricaAnteprima}
                disabled={loading}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {loading ? 'Caricamento...' : 'Anteprima'}
              </button>
              <button
                onClick={generaPdf}
                className="px-5 py-2 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-700 transition-colors shadow-sm"
              >
                Genera PDF
              </button>
              <button
                onClick={resetFiltri}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded hover:bg-gray-200"
              >
                Azzera
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* TABELLA ANTEPRIMA */}
      {beni !== null && (
        <div className="rounded-xl overflow-hidden" style={{ background: '#fefcf8', border: '1px solid rgba(212,175,55,0.2)' }}>
          <div className="px-5 py-3" style={{ background: '#1a2e55', color: '#fff' }}>
            <span className="text-sm font-semibold">Anteprima: {beni.length} beni trovati</span>
          </div>
          {beni.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
              Nessun bene corrisponde ai filtri selezionati
            </div>
          ) : (
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0e6c0', fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>
                  <th className="px-3 py-2 text-left" style={{ width: 50 }}>#</th>
                  <th className="px-3 py-2 text-left">Descrizione</th>
                  <th className="px-3 py-2 text-left">Categoria</th>
                  <th className="px-3 py-2 text-left">Ubicazione</th>
                  <th className="px-3 py-2 text-center" style={{ width: 50 }}>Q.ta</th>
                  <th className="px-3 py-2 text-center">Stato</th>
                  <th className="px-3 py-2 text-right">Valore</th>
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
                        fontSize: 13,
                      }}
                    >
                      <td className="px-3 py-2" style={{ fontFamily: "'Courier New', monospace", color: '#d4af37', fontWeight: 700 }}>
                        {String(bene.numero_progressivo).padStart(3, '0')}
                      </td>
                      <td className="px-3 py-2" style={{ fontWeight: 600, color: '#1a1a2e' }}>
                        {bene.descrizione.length > 50 ? bene.descrizione.substring(0, 50) + '...' : bene.descrizione}
                        {bene.bloccato && <span style={{ fontSize: 11, marginLeft: 4 }} title="Bloccato">🔒</span>}
                      </td>
                      <td className="px-3 py-2" style={{ color: '#6b7280' }}>{bene.categoria_nome || ''}</td>
                      <td className="px-3 py-2" style={{ color: '#6b7280' }}>{bene.ubicazione_nome || ''}</td>
                      <td className="px-3 py-2 text-center">{bene.quantita}</td>
                      <td className="px-3 py-2 text-center">
                        {bene.stato_conservazione && (
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize"
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
                      <td className="px-3 py-2 text-right" style={{ fontWeight: 600 }}>
                        {bene.valore_stimato ? `${formatCurrency(bene.valore_stimato)}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default StampaInventario;
