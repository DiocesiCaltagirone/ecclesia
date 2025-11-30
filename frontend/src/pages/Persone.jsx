import { useState, useEffect } from 'react';
import api from '../services/api';

function Persone() {
  const [persone, setPersone] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    cognome: '',
    nome: '',
    data_nascita: '',
    luogo_nascita: '',
    sesso: 'M',
    indirizzo: '',
    comune: '',
    cap: '',
    provincia: '',
    telefono: '',
    email: '',
    vivente: true
  });

  useEffect(() => {
    // Non carichiamo le persone all'inizio - solo dopo ricerca
  }, []);

  const handleSearch = async () => {
  if (!search.trim()) {
    alert('Inserisci un termine di ricerca');
    return;
  }

  setLoading(true);
  try {
    const enteId = localStorage.getItem('current_ente_id');
    const token = localStorage.getItem('token');
    
    if (!token || !enteId) {
      setError('Dati di autenticazione mancanti');
      setLoading(false);
      return;
    }

    const response = await api.get('/api/anagrafica/persone', {
      params: { 
        search: search,
        ente_id: enteId  // IMPORTANTE: aggiungi questo
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Ente-Id': enteId
      }
    });

    setPersone(response.data.persone || []);
  } catch (error) {
    console.error('Errore nella ricerca:', error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
};

  const handleReset = () => {
    setSearch('');
    setPersone([]);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const enteId = localStorage.getItem('current_ente_id');
      const token = localStorage.getItem('token');
      
      await api.post('/api/anagrafica/persone', {
        ...formData,
        ente_id: enteId  // AGGIUNGI QUESTA RIGA!
  }, {
        headers: {
        'Authorization': `Bearer ${token}`
    }
  });
      
      setShowModal(false);
      setFormData({
        cognome: '',
        nome: '',
        data_nascita: '',
        luogo_nascita: '',
        sesso: 'M',
        indirizzo: '',
        comune: '',
        cap: '',
        provincia: '',
        telefono: '',
        email: '',
        vivente: true
      });
      
      alert('Persona inserita con successo!');
      
      // Ricarica TUTTE le persone dopo l'inserimento
      const loadAll = async () => {
        try {
          const response = await api.get('/api/anagrafica/persone', {
            params: { 
              search: '',  // Ricerca vuota = tutte le persone
              ente_id: enteId
        },
        headers: {
           'Authorization': `Bearer ${token}`,
           'X-Ente-Id': enteId
       }
      });
    setPersone(response.data.persone || []);
  } catch (error) {
    console.error('Errore ricaricamento:', error);
  }
};
await loadAll();

      // Se c'è un termine di ricerca, ricarica i risultati
      if (search.trim()) {
        handleSearch();
      }
    } catch (error) {
      console.error('Errore inserimento persona:', error);
      alert('Errore durante l\'inserimento');
    }
  };

  return (
    <div className="p-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Anagrafica Persone</h2>
          {persone.length > 0 && (
            <span className="text-sm text-gray-500">{persone.length} persone trovate</span>
          )}
        </div>

        {/* BARRA RICERCA CON PULSANTE CERCA */}
        <div className="flex gap-3 mb-6">
          <input 
            type="text" 
            placeholder="🔍 Cerca per cognome o nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2 disabled:bg-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            Cerca
          </button>
          <button 
            onClick={handleReset}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
          >
            Reset
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
            </svg>
            Nuova Persona
          </button>
        </div>

        {/* CONTENUTO */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Caricamento...</p>
          </div>
        ) : persone.length > 0 ? (
          // TABELLA RISULTATI
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Cognome</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Data Nascita</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Luogo Nascita</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Vivente</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {persone.map((persona) => (
                  <tr key={persona.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{persona.cognome}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{persona.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {persona.data_nascita ? new Date(persona.data_nascita).toLocaleDateString('it-IT') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{persona.luogo_nascita || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {persona.vivente ? (
                        <span className="text-green-600 font-semibold">Sì</span>
                      ) : (
                        <span className="text-red-600 font-semibold">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-800">
                          ✏️ Modifica
                        </button>
                        <button className="text-red-600 hover:text-red-800">
                          🗑️ Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // MESSAGGIO VUOTO
          <div className="text-center py-12 text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <p className="text-lg font-semibold text-gray-600">Inserisci un termine di ricerca per visualizzare i risultati</p>
            <p className="text-sm mt-2">Oppure clicca su "Elenco Completo" nel menu per vedere tutte le persone</p>
          </div>
        )}
      </div>

      {/* MODAL INSERIMENTO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="sticky top-0 bg-white border-b px-5 py-3 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Nuova Persona</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5">
              <div className="grid grid-cols-5 gap-4">
                {/* Cognome */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Cognome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="cognome"
                    value={formData.cognome}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Nome */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Sesso */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Sesso</label>
                  <select
                    name="sesso"
                    value={formData.sesso}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </div>

                {/* Data Nascita */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Data Nascita</label>
                  <input
                    type="date"
                    name="data_nascita"
                    value={formData.data_nascita}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Luogo Nascita */}
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Luogo Nascita</label>
                  <input
                    type="text"
                    name="luogo_nascita"
                    value={formData.luogo_nascita}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Indirizzo */}
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Indirizzo</label>
                  <input
                    type="text"
                    name="indirizzo"
                    value={formData.indirizzo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Comune */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Comune</label>
                  <input
                    type="text"
                    name="comune"
                    value={formData.comune}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* CAP */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">CAP</label>
                  <input
                    type="text"
                    name="cap"
                    value={formData.cap}
                    onChange={handleInputChange}
                    maxLength="5"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Provincia */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Provincia</label>
                  <input
                    type="text"
                    name="provincia"
                    value={formData.provincia}
                    onChange={handleInputChange}
                    maxLength="2"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Telefono */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Telefono</label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Email */}
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Vivente */}
                <div className="col-span-5 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="vivente"
                      checked={formData.vivente}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">Vivente</span>
                  </label>
                </div>
              </div>

              {/* Bottoni */}
              <div className="flex gap-3 mt-5 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition text-sm"
                >
                  Salva
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition text-sm"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Persone;