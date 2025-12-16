import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function SelectEnte() {
  const [enti, setEnti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nomeUtente, setNomeUtente] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadEnti();
    caricaNomeUtente();
  }, []);

  const loadEnti = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/api/enti/my-enti', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setEnti(response.data.enti || []);
    } catch (err) {
      console.error('Errore caricamento enti:', err);
      setError('Errore nel caricamento degli enti');
    } finally {
      setLoading(false);
    }
  };

  const caricaNomeUtente = () => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        const { titolo, nome, cognome } = userData;
        let fullName = '';
        if (titolo) fullName += titolo + ' ';
        if (nome) fullName += nome + ' ';
        if (cognome) fullName += cognome;
        setNomeUtente(fullName.trim() || 'Utente');
      } catch (e) {
        setNomeUtente('Utente');
      }
    }
  };

  const selectEnte = (ente) => {
    localStorage.setItem('current_ente_id', ente.id);
    localStorage.setItem('ente_id', ente.id);
    localStorage.setItem('current_ente', JSON.stringify(ente));
    navigate('/dashboard');
  };

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto pt-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                ENTE
              </h1>
              <p className="text-gray-600">
                Scegli l'ente su cui lavorare
              </p>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Nome Utente */}
              <div className="text-right">
                <p className="text-sm text-gray-500">Utente</p>
                <p className="font-semibold text-gray-800">{nomeUtente}</p>
              </div>
              
              {/* Bottone Esci */}
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Esci
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {enti.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Nessuna parrocchia disponibile</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enti.map((ente) => (
                <button
                  key={ente.id}
                  onClick={() => selectEnte(ente)}
                  className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition duration-200 text-left group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 mb-2">
                        {ente.denominazione}
                      </h3>
                      <p className="text-sm text-gray-600 mb-1">
                        {ente.comune} {ente.provincia && `(${ente.provincia})`}
                      </p>
                      
                      {/* Ruolo e Moduli */}
                      <div className="mt-4">
                        {/* Ruolo */}
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Ruolo:</p>
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            {ente.ruolo}
                          </span>
                        </div>
                        
                        {/* Moduli attivi */}
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Moduli attivi:</p>
                          <div className="flex gap-2 flex-wrap">
                            {ente.permessi?.anagrafica && (
                              <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                Anagrafica
                              </span>
                            )}
                            {ente.permessi?.contabilita && (
                              <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                Contabilità
                              </span>
                            )}
                            {ente.permessi?.inventario && (
                              <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                                Inventario
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SelectEnte;