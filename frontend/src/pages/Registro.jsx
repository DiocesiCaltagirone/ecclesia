import { useState, useEffect } from 'react';
import api from '../services/api';

function Registro() {
  const [persone, setPersone] = useState([]);
  const [filtri, setFiltri] = useState({
    cognome: '',
    nome: '',
    data_nascita_da: '',
    data_nascita_a: '',
    luogo_nascita: '',
    comune: '',
    vivente: 'tutti' // tutti, si, no
  });
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(true); // Mostra tutto all'inizio

  // Carica TUTTE le persone all'avvio
  useEffect(() => {
    loadAllPersone();
  }, []);

  const loadAllPersone = async () => {
    setLoading(true);
    try {
      const enteId = localStorage.getItem('current_ente_id');
      const token = localStorage.getItem('token');

      const response = await api.get('/api/anagrafica/persone', {
        params: {
          search: '',
          ente_id: enteId,
          limit: 1000 // Prendi tutte
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Ente-Id': enteId
        }
      });

      setPersone(response.data.persone || []);
    } catch (error) {
      console.error('Errore caricamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFiltri(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilter = () => {
    // Filtra i risultati localmente
    let risultati = [...persone];

    if (filtri.cognome) {
      risultati = risultati.filter(p =>
        p.cognome.toLowerCase().includes(filtri.cognome.toLowerCase())
      );
    }

    if (filtri.nome) {
      risultati = risultati.filter(p =>
        p.nome.toLowerCase().includes(filtri.nome.toLowerCase())
      );
    }

    if (filtri.luogo_nascita) {
      risultati = risultati.filter(p =>
        p.luogo_nascita?.toLowerCase().includes(filtri.luogo_nascita.toLowerCase())
      );
    }

    if (filtri.comune) {
      risultati = risultati.filter(p =>
        p.comune?.toLowerCase().includes(filtri.comune.toLowerCase())
      );
    }

    if (filtri.vivente !== 'tutti') {
      risultati = risultati.filter(p =>
        p.vivente === (filtri.vivente === 'si')
      );
    }

    // Data nascita range
    if (filtri.data_nascita_da) {
      risultati = risultati.filter(p =>
        p.data_nascita >= filtri.data_nascita_da
      );
    }

    if (filtri.data_nascita_a) {
      risultati = risultati.filter(p =>
        p.data_nascita <= filtri.data_nascita_a
      );
    }

    setPersone(risultati);
    setShowAll(false);
  };

  const handleReset = () => {
    setFiltri({
      cognome: '',
      nome: '',
      data_nascita_da: '',
      data_nascita_a: '',
      luogo_nascita: '',
      comune: '',
      vivente: 'tutti'
    });
    loadAllPersone();
    setShowAll(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Crea CSV
    const headers = ['Cognome', 'Nome', 'Data Nascita', 'Luogo Nascita', 'Comune', 'Telefono', 'Email', 'Vivente'];
    const rows = persone.map(p => [
      p.cognome,
      p.nome,
      p.data_nascita || '',
      p.luogo_nascita || '',
      p.comune || '',
      p.telefono || '',
      p.email || '',
      p.vivente ? 'Sì' : 'No'
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `registro_persone_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Registro Completo</h2>
            <p className="text-sm text-gray-500 mt-1">
              {showAll ? 'Tutte le persone registrate' : 'Risultati filtrati'}
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-sm text-gray-500">
              {persone.length} {persone.length === 1 ? 'persona' : 'persone'}
            </span>
          </div>
        </div>

        {/* FILTRI AVANZATI */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtri di Ricerca</h3>
          <div className="grid grid-cols-6 gap-3">
            {/* Prima riga */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">Cognome</label>
              <input
                type="text"
                name="cognome"
                value={filtri.cognome}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Nome</label>
              <input
                type="text"
                name="nome"
                value={filtri.nome}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Data Nascita Da</label>
              <input
                type="date"
                name="data_nascita_da"
                value={filtri.data_nascita_da}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Data Nascita A</label>
              <input
                type="date"
                name="data_nascita_a"
                value={filtri.data_nascita_a}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Luogo Nascita</label>
              <input
                type="text"
                name="luogo_nascita"
                value={filtri.luogo_nascita}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Comune</label>
              <input
                type="text"
                name="comune"
                value={filtri.comune}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Seconda riga */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">Vivente</label>
              <select
                name="vivente"
                value={filtri.vivente}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="tutti">Tutti</option>
                <option value="si">Solo viventi</option>
                <option value="no">Solo defunti</option>
              </select>
            </div>

            {/* Pulsanti */}
            <div className="col-span-5 flex items-end gap-2">
              <button
                onClick={handleFilter}
                className="px-4 py-2 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700"
              >
                🔍 Filtra
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded font-semibold text-sm hover:bg-gray-200"
              >
                Reset
              </button>
              <div className="flex-1"></div>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-gray-600 text-white rounded font-semibold text-sm hover:bg-gray-700"
              >
                🖨️ Stampa
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 text-white rounded font-semibold text-sm hover:bg-green-700"
              >
                📥 Esporta CSV
              </button>
            </div>
          </div>
        </div>

        {/* TABELLA COMPLETA */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Caricamento...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Cognome</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Nome</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Data di nascita</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Luogo</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 w-20">Vivente</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 w-28">Azioni</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 w-20">Dettagli</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {persone.map((persona) => (
                  <tr key={persona.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900 font-medium">{persona.cognome}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{persona.nome}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {persona.data_nascita ? new Date(persona.data_nascita).toLocaleDateString('it-IT') : '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">{persona.luogo_nascita || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      {persona.vivente ? (
                        <span className="text-green-600 text-lg">✓</span>
                      ) : (
                        <span className="text-red-600 text-lg">✗</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => handleEdit(persona.id)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Modifica"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(persona.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Elimina"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => navigate(`/persone/${persona.id}`)}
                        className="text-gray-600 hover:text-gray-800 text-lg"
                        title="Vedi dettagli"
                      >
                        →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {persone.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nessuna persona trovata con i filtri selezionati
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Registro;