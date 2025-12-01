import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderAmministrazione from '../components/HeaderAmministrazione';

const ParrocchieDiocesi = () => {
  const navigate = useNavigate();
  const [parrocchie, setParrocchie] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form nuova parrocchia
  const [formData, setFormData] = useState({
    comune: '',
    denominazione: '',
    provincia: '',
    diocesi: '',
    cap: ''
  });

  // Filtri
  const [filtri, setFiltri] = useState({
    diocesi: '',
    comune: '',
    parrocchia: '',
    provincia: ''
  });

  // Modale modifica
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingParrocchia, setEditingParrocchia] = useState(null);
  const [editFormData, setEditFormData] = useState({
    comune: '',
    denominazione: '',
    provincia: '',
    diocesi: '',
    cap: ''
  });

  useEffect(() => {
    loadParrocchie();
  }, []);

  const loadParrocchie = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/amministrazione/parrocchie-diocesi', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Errore nel caricamento');

      const data = await response.json();
      setParrocchie(data);
    } catch (err) {
      setError('Errore nel caricamento delle parrocchie');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/amministrazione/parrocchie-diocesi', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Errore nel salvataggio');

      await loadParrocchie();
      setFormData({ comune: '', denominazione: '', provincia: '', diocesi: '', cap: '' });
      alert('Parrocchia aggiunta con successo!');
    } catch (err) {
      alert('Errore nel salvataggio della parrocchia');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questa parrocchia?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/amministrazione/parrocchie-diocesi/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Errore nell\'eliminazione');

      await loadParrocchie();
      alert('Parrocchia eliminata con successo!');
    } catch (err) {
      alert('Errore nell\'eliminazione della parrocchia');
      console.error(err);
    }
  };

  const handleEdit = (parrocchia) => {
    setEditingParrocchia(parrocchia);
    setEditFormData({
      comune: parrocchia.comune,
      denominazione: parrocchia.denominazione,
      provincia: parrocchia.provincia,
      diocesi: parrocchia.diocesi || '',
      cap: parrocchia.cap || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/amministrazione/parrocchie-diocesi/${editingParrocchia.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      });

      if (!response.ok) throw new Error('Errore nell\'aggiornamento');

      await loadParrocchie();
      setShowEditModal(false);
      setEditingParrocchia(null);
      alert('Parrocchia aggiornata con successo!');
    } catch (err) {
      alert('Errore nell\'aggiornamento della parrocchia');
      console.error(err);
    }
  };

  const handleApplicaTemplate = async (parrocchia) => {
    const messaggio = `🎯 Applica Categorie Standard CEI\n\n` +
      `Parrocchia: ${parrocchia.denominazione}\n` +
      `Comune: ${parrocchia.comune}\n\n` +
      `Verranno copiate 110 categorie contabili standard nel piano dei conti.\n\n` +
      `⚠️ Note:\n` +
      `• Le categorie già esistenti NON verranno sovrascritte\n` +
      `• Il parroco potrà modificare/eliminare le categorie in seguito\n\n` +
      `Continuare?`;

    if (!confirm(messaggio)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/template-categorie/applica-a-ente/${parrocchia.id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Errore nell\'applicazione del template');
      }

      const data = await response.json();

      const risultato = `✅ Template Applicato con Successo!\n\n` +
        `Parrocchia: ${data.ente_denominazione}\n\n` +
        `📊 Risultati:\n` +
        `• Categorie già presenti: ${data.categorie_gia_presenti}\n` +
        `• Categorie copiate: ${data.categorie_copiate}\n` +
        `• Categorie totali: ${data.categorie_totali}\n\n` +
        `Il parroco può ora gestire le categorie dalla sezione Contabilità.`;

      alert(risultato);
    } catch (err) {
      alert(`❌ Errore nell'applicazione del template:\n\n${err.message}`);
      console.error(err);
    }
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim());

      const startIndex = lines[0].toLowerCase().includes('comune') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const [diocesi, comune, denominazione, provincia, cap] = lines[i].split(',').map(s => s.trim());

        if (comune && denominazione) {
          try {
            const token = localStorage.getItem('token');
            await fetch('/api/amministrazione/parrocchie-diocesi', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ diocesi, comune, denominazione, provincia, cap })
            });
          } catch (err) {
            console.error('Errore importazione riga:', err);
          }
        }
      }

      await loadParrocchie();
      alert(`Importate ${lines.length - startIndex} parrocchie!`);
    };

    reader.readAsText(file);
  };

  const parrocchieFiltrate = parrocchie.filter(p => {
    if (filtri.diocesi && !p.diocesi?.toLowerCase().includes(filtri.diocesi.toLowerCase())) return false;
    if (filtri.comune && !p.comune.toLowerCase().includes(filtri.comune.toLowerCase())) return false;
    if (filtri.parrocchia && !p.denominazione.toLowerCase().includes(filtri.parrocchia.toLowerCase())) return false;
    if (filtri.provincia && p.provincia !== filtri.provincia.toUpperCase()) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Caricamento parrocchie...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Riutilizzabile */}
      <HeaderAmministrazione />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">

        {/* Titolo Pagina + Torna Home */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">📖</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Parrocchie Diocesi</h2>
              <p className="text-xs text-gray-600">Archivio completo delle parrocchie (elenco CEI)</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/amministrazione')}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Torna alla Home
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded text-sm">
            {error}
          </div>
        )}

        {/* Form Aggiunta - PIÙ COMPATTO */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">➕ Aggiungi Nuova Parrocchia</h3>
            <label className="bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium cursor-pointer">
              📥 Importa CSV
              <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
            </label>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Diocesi..."
                  value={formData.diocesi}
                  onChange={(e) => setFormData({ ...formData, diocesi: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Comune *"
                  value={formData.comune}
                  onChange={(e) => setFormData({ ...formData, comune: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div className="col-span-5">
                <input
                  type="text"
                  placeholder="Parrocchia *"
                  value={formData.denominazione}
                  onChange={(e) => setFormData({ ...formData, denominazione: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div className="col-span-1">
                <input
                  type="text"
                  placeholder="Pr. *"
                  maxLength="2"
                  value={formData.provincia}
                  onChange={(e) => setFormData({ ...formData, provincia: e.target.value.toUpperCase() })}
                  className="w-full px-1 py-1.5 border border-gray-300 rounded text-xs text-center font-bold focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div className="col-span-1">
                <input
                  type="text"
                  placeholder="CAP"
                  maxLength="5"
                  value={formData.cap}
                  onChange={(e) => setFormData({ ...formData, cap: e.target.value })}
                  className="w-full px-1 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="col-span-1">
                <button
                  type="submit"
                  className="w-full bg-purple-600 text-white py-1.5 rounded hover:bg-purple-700 text-xs font-medium"
                  title="Salva"
                >
                  💾
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Filtri - PIÙ COMPATTI */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 mb-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Diocesi..."
              value={filtri.diocesi}
              onChange={(e) => setFiltri({ ...filtri, diocesi: e.target.value })}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="text"
              placeholder="Comune..."
              value={filtri.comune}
              onChange={(e) => setFiltri({ ...filtri, comune: e.target.value })}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="text"
              placeholder="Parrocchia..."
              value={filtri.parrocchia}
              onChange={(e) => setFiltri({ ...filtri, parrocchia: e.target.value })}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="text"
              placeholder="Pr..."
              maxLength="2"
              value={filtri.provincia}
              onChange={(e) => setFiltri({ ...filtri, provincia: e.target.value.toUpperCase() })}
              className="w-16 px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={() => setFiltri({ diocesi: '', comune: '', parrocchia: '', provincia: '' })}
              className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 text-xs font-medium"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Tabella - RIGHE PIÙ BASSE */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gradient-to-r from-purple-50 to-purple-100 border-b-2 border-purple-200">
                <tr>
                  <th className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase">Diocesi</th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase">Comune</th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase">Parrocchia</th>
                  <th className="px-1 py-1.5 text-center text-[10px] font-bold text-gray-700 uppercase">Pr.</th>
                  <th className="px-1 py-1.5 text-center text-[10px] font-bold text-gray-700 uppercase">CAP</th>
                  <th className="px-2 py-1.5 text-center text-[10px] font-bold text-gray-700 uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parrocchieFiltrate.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500 text-sm">
                      Nessuna parrocchia trovata
                    </td>
                  </tr>
                ) : (
                  parrocchieFiltrate.map((parrocchia, index) => (
                    <tr key={parrocchia.id} className={`hover:bg-purple-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-2 py-1.5 text-[11px] text-gray-700 truncate max-w-[150px]" title={parrocchia.diocesi}>
                        {parrocchia.diocesi || '-'}
                      </td>
                      <td className="px-2 py-1.5 text-[11px] font-semibold text-gray-900 truncate max-w-[120px]" title={parrocchia.comune}>
                        {parrocchia.comune}
                      </td>
                      <td className="px-2 py-1.5 text-[11px] text-gray-800 truncate max-w-[300px]" title={parrocchia.denominazione}>
                        {parrocchia.denominazione}
                      </td>
                      <td className="px-1 py-1.5 text-[10px] text-center font-bold text-gray-700">
                        {parrocchia.provincia}
                      </td>
                      <td className="px-1 py-1.5 text-[10px] text-center text-gray-600">
                        {parrocchia.cap || '-'}
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(parrocchia)}
                            className="text-blue-600 hover:bg-blue-100 p-1 rounded transition-colors"
                            title="Modifica"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(parrocchia.id)}
                            className="text-red-600 hover:bg-red-100 p-1 rounded transition-colors"
                            title="Elimina"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Contatore */}
        <div className="mt-3 text-center text-xs text-gray-600">
          Mostrando <span className="font-semibold text-gray-800">{parrocchieFiltrate.length}</span> di <span className="font-semibold text-gray-800">{parrocchie.length}</span> parrocchie
        </div>

      </div>

      {/* Modale Modifica */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">✏️ Modifica Parrocchia</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit}>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Diocesi</label>
                  <input
                    type="text"
                    value={editFormData.diocesi}
                    onChange={(e) => setEditFormData({ ...editFormData, diocesi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Comune *</label>
                  <input
                    type="text"
                    value={editFormData.comune}
                    onChange={(e) => setEditFormData({ ...editFormData, comune: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Denominazione *</label>
                  <input
                    type="text"
                    value={editFormData.denominazione}
                    onChange={(e) => setEditFormData({ ...editFormData, denominazione: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Provincia *</label>
                  <input
                    type="text"
                    maxLength="2"
                    value={editFormData.provincia}
                    onChange={(e) => setEditFormData({ ...editFormData, provincia: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">CAP</label>
                  <input
                    type="text"
                    maxLength="5"
                    value={editFormData.cap}
                    onChange={(e) => setEditFormData({ ...editFormData, cap: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm"
                >
                  💾 Salva
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-lg text-sm"
                >
                  ❌ Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParrocchieDiocesi;