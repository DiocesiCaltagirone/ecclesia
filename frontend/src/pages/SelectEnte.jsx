import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import chiesaImg from '../assets/chiesa.png';

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
      const token = sessionStorage.getItem('token');
      const response = await api.get('/api/enti/my-enti', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setEnti(response.data.enti || []);
    } catch (err) {
      setError('Errore nel caricamento degli enti');
    } finally {
      setLoading(false);
    }
  };

  const caricaNomeUtente = () => {
    const user = sessionStorage.getItem('user');
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
    sessionStorage.setItem('current_ente_id', ente.id);
    sessionStorage.setItem('ente_id', ente.id);
    sessionStorage.setItem('current_ente', JSON.stringify(ente));
    navigate('/dashboard');
  };

  const logout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600 mx-auto mb-4"></div>
          <p className="text-green-700 font-medium">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100">
      {/* Header bar */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-green-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={chiesaImg} alt="EcclesiaWeb" className="w-10 h-10 object-contain" />
            <span className="text-lg font-bold text-gray-800">EcclesiaWeb</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Utente</p>
              <p className="text-sm font-semibold text-gray-700">{nomeUtente}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-200 font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Esci
            </button>
          </div>
        </div>
      </div>

      {/* Contenuto principale */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Titolo */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Seleziona Parrocchia
          </h1>
          <p className="text-gray-500">
            Scegli l'ente su cui lavorare
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl mb-8 flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}

        {enti.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-gray-400 text-lg">Nessuna parrocchia disponibile</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {enti.map((ente) => (
              <button
                key={ente.id}
                onClick={() => selectEnte(ente)}
                className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 hover:border-green-300 transition-all duration-300 text-left overflow-hidden transform hover:-translate-y-1"
              >
                {/* Icona chiesa decorativa sullo sfondo */}
                <div className="absolute top-4 right-4">
                  <img src={chiesaImg} alt="" className="w-20 h-20 object-contain opacity-20" />
                </div>

                <div className="p-6 relative">
                  {/* Nome parrocchia */}
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-green-700 transition-colors duration-200 mb-1 pr-12">
                    {ente.denominazione}
                  </h3>
                  <p className="text-sm text-gray-400 flex items-center gap-1 mb-5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {ente.comune} {ente.provincia && `(${ente.provincia})`}
                  </p>

                  {/* Ruolo */}
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {ente.ruolo}
                    </span>
                  </div>

                  {/* Moduli attivi */}
                  <div className="flex gap-2 flex-wrap">
                    {ente.permessi?.anagrafica && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-lg">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Anagrafica
                      </span>
                    )}
                    {ente.permessi?.contabilita && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 text-violet-600 text-xs font-medium rounded-lg">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Contabilità
                      </span>
                    )}
                    {ente.permessi?.inventario && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 text-xs font-medium rounded-lg">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Inventario
                      </span>
                    )}
                  </div>
                </div>

                {/* Barra inferiore verde al hover */}
                <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SelectEnte;
