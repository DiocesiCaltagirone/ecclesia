import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

function Dashboard() {
  const navigate = useNavigate();
  const [permessi, setPermessi] = useState({
    anagrafica: false,
    contabilita: false,
    inventario: false
  });
  const [loading, setLoading] = useState(true);
  const [enteCorrente, setEnteCorrente] = useState(null);

  useEffect(() => {
    caricaPermessi();
  }, []);

  const caricaPermessi = async () => {
    try {
      const token = localStorage.getItem('token');
      const enteId = localStorage.getItem('ente_id');

      console.log('🔍 DEBUG - Token:', token ? 'Presente' : 'Mancante');
      console.log('🔍 DEBUG - Ente ID:', enteId);

      if (!enteId) {
        console.log('⚠️ Nessun ente selezionato');
        setLoading(false);
        return;
      }

      // USA L'API CHE FUNZIONA (quella di SelectEnte)
      const response = await fetch('/api/enti/my-enti', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('👤 Lista enti completa:', data);

        // Trova l'ente corrente
        const entiUtente = data.enti || [];
        const enteCorrente = entiUtente.find(e => e.id === enteId);

        console.log('🎯 Ente corrente trovato:', enteCorrente);

        if (enteCorrente && enteCorrente.permessi) {
          console.log('✅ Permessi caricati:', enteCorrente.permessi);
          setPermessi(enteCorrente.permessi);
          setEnteCorrente(enteCorrente);
        } else {
          console.log('❌ Nessun permesso trovato per questo ente');
        }
      } else {
        console.log('❌ Errore risposta API:', response.status);
      }
    } catch (error) {
      console.error('❌ Errore caricamento permessi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path, permesso) => {
    if (permesso) {
      navigate(path);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Caricamento...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* TITOLO */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Home</h1>
        <p className="text-gray-600">Benvenuto nel gestionale <span className="font-semibold text-blue-600">EcclesiaWeb</span></p>
        {enteCorrente && (
          <p className="text-sm text-gray-500 mt-2">
            📍 {enteCorrente.denominazione}
          </p>
        )}
      </div>

      {/* CARD MODULI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Anagrafica */}
        <button
          onClick={() => handleNavigate('/persone', permessi.anagrafica)}
          disabled={!permessi.anagrafica}
          className={`rounded-xl shadow-lg p-6 text-white transition text-left relative overflow-hidden
            ${permessi.anagrafica
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:shadow-xl cursor-pointer'
              : 'bg-gradient-to-br from-gray-400 to-gray-500 cursor-not-allowed opacity-60'
            }`}
        >
          {!permessi.anagrafica && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center">
              <div className="bg-gray-800/80 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                🔒 Non disponibile
              </div>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Anagrafica</h3>
            <svg className="w-8 h-8 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className={permessi.anagrafica ? "text-blue-100" : "text-gray-200"}>
            Gestione persone, famiglie e sacramenti
          </p>
        </button>

        {/* Contabilità */}
        <button
          onClick={() => handleNavigate('/contabilita', permessi.contabilita)}
          disabled={!permessi.contabilita}
          className={`rounded-xl shadow-lg p-6 text-white transition text-left relative overflow-hidden
            ${permessi.contabilita
              ? 'bg-gradient-to-br from-green-500 to-green-600 hover:shadow-xl cursor-pointer'
              : 'bg-gradient-to-br from-gray-400 to-gray-500 cursor-not-allowed opacity-60'
            }`}
        >
          {!permessi.contabilita && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center">
              <div className="bg-gray-800/80 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                🔒 Non disponibile
              </div>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Contabilità</h3>
            <svg className="w-8 h-8 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className={permessi.contabilita ? "text-green-100" : "text-gray-200"}>
            Entrate, uscite e bilanci
          </p>
        </button>

        {/* Inventario */}
        <button
          onClick={() => handleNavigate('/inventario', permessi.inventario)}
          disabled={!permessi.inventario}
          className={`rounded-xl shadow-lg p-6 text-white transition text-left relative overflow-hidden
            ${permessi.inventario
              ? 'bg-gradient-to-br from-purple-500 to-purple-600 hover:shadow-xl cursor-pointer'
              : 'bg-gradient-to-br from-gray-400 to-gray-500 cursor-not-allowed opacity-60'
            }`}
        >
          {!permessi.inventario && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center">
              <div className="bg-gray-800/80 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                🔒 Non disponibile
              </div>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Inventario</h3>
            <svg className="w-8 h-8 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className={permessi.inventario ? "text-purple-100" : "text-gray-200"}>
            Beni mobili e immobili
          </p>
        </button>
      </div>
    </div>
  );
}

export default Dashboard;