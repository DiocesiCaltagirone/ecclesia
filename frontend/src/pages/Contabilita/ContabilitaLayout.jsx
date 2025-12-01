import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import FormMovimentoGlobale from './FormMovimentoGlobale';

const ContabilitaLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [enteCorrente, setEnteCorrente] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [enteMenuOpen, setEnteMenuOpen] = useState(false);
  const [entiList, setEntiList] = useState([]);
  const [showModalConto, setShowModalConto] = useState(false);
  const [formConto, setFormConto] = useState({
    tipo: 'banca',
    nome: '',
    numero: '',
    saldo_iniziale: 0
  });
  const [showModalTransazione, setShowModalTransazione] = useState(false);
  const [categorie, setCategorie] = useState([]);
  const [rendicontoMenuOpen, setRendicontoMenuOpen] = useState(false);

  // Tipi di conto
  const tipiConto = {
    'cassa': { label: 'Cassa Contanti', icon: '💵' },
    'banca': { label: 'Conto Corrente Bancario', icon: '🏦' },
    'postale': { label: 'Conto Corrente Postale', icon: '📮' },
    'debito': { label: 'Carta di Debito', icon: '💳' },
    'credito': { label: 'Carta di Credito', icon: '💎' },
    'prepagata': { label: 'Carta Prepagata', icon: '🎫' },
    'deposito': { label: 'Conto Deposito', icon: '📊' },
    'risparmio': { label: 'Conto Risparmio', icon: '🏛️' },
    'polizza': { label: 'Polizza Investimento', icon: '📈' },
    'titoli': { label: 'Conto Titoli', icon: '🔐' }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const caricaDati = async () => {
      try {
        const enteId = localStorage.getItem('ente_id');
        const token = localStorage.getItem('token');

        const response = await fetch(`/api/enti/${enteId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Ente-Id': enteId
          }
        });

        if (response.ok) {
          const ente = await response.json();
          const userStored = localStorage.getItem('user');
          let displayName = 'Utente';

          if (userStored) {
            const user = JSON.parse(userStored);
            displayName = '';
            if (user.titolo) displayName += user.titolo + ' ';
            if (user.nome) displayName += user.nome + ' ';
            if (user.cognome) displayName += user.cognome;
            displayName = displayName.trim() || 'Utente';
          }

          setEnteCorrente({
            id: ente.id,
            comune: ente.comune,
            denominazione: ente.denominazione,
            indirizzo: ente.indirizzo,
            cap: ente.cap,
            provincia: ente.provincia,
            userName: displayName
          });
        }

        const entiResponse = await fetch('/api/enti/my-enti', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (entiResponse.ok) {
          const entiData = await entiResponse.json();
          setEntiList(entiData.enti || []);
        }

        // Carica categorie per il form transazione
        const categorieResponse = await fetch('/api/contabilita/categorie', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Ente-Id': enteId
          }
        });

        if (categorieResponse.ok) {
          const categorieData = await categorieResponse.json();
          setCategorie(categorieData.categorie || []);
        }

      } catch (error) {
        console.error('Errore caricamento dati:', error);
      }
    };

    caricaDati();
  }, []);

  const handleChangeEnte = (enteId) => {
    localStorage.setItem('current_ente_id', enteId);
    localStorage.setItem('ente_id', enteId);
    window.location.reload();
  };

  const formatDate = (date) => {
    const giorni = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
    const mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
    const giorno = giorni[date.getDay()];
    const numeroGiorno = date.getDate();
    const mese = mesi[date.getMonth()];
    const anno = date.getFullYear();
    const ore = String(date.getHours()).padStart(2, '0');
    const minuti = String(date.getMinutes()).padStart(2, '0');
    return `${giorno}, ${numeroGiorno} ${mese} ${anno} ${ore}:${minuti}`;
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleSubmitConto = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('token');
    const enteId = localStorage.getItem('ente_id');

    const payload = {
      tipo: formConto.tipo,
      nome: formConto.nome,
      saldo_iniziale: formConto.saldo_iniziale || 0  // ✅ PRENDE IL VALORE DAL FORM!
    };

    console.log('🔍 DEBUG - Payload inviato:', payload);  // Per verificare

    console.log('🔍 DEBUG - Token:', token ? 'Presente' : 'MANCANTE');
    console.log('🔍 DEBUG - Ente ID:', enteId);
    console.log('🔍 DEBUG - Payload:', payload);

    try {
      const response = await fetch('/api/contabilita/registri', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Ente-Id': enteId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('🔍 DEBUG - Response status:', response.status);

      if (response.ok) {
        setShowModalConto(false);
        setFormConto({ tipo: 'banca', nome: '', numero: '', saldo_iniziale: 0 });
        window.location.reload();
      } else {
        const errorData = await response.json();
        console.error('❌ ERRORE Backend:', errorData);
        alert('Errore: ' + JSON.stringify(errorData));
      }
    } catch (error) {
      console.error('❌ ERRORE Generale:', error);
      alert('Errore: ' + error.message);
    }
  };

  const handleSaveTransazione = async (payload) => {
    try {
      const token = localStorage.getItem('token');
      const enteId = localStorage.getItem('ente_id');

      const response = await fetch('/api/contabilita/movimenti', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Ente-Id': enteId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        window.location.reload(); // ✅ Ricarica direttamente senza alert
      } else {
        const errorData = await response.json();
        alert('Errore: ' + JSON.stringify(errorData));
      }
    } catch (error) {
      console.error('Errore salvataggio transazione:', error);
      alert('Errore di connessione');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* BARRA SUPERIORE - NON MODIFICATA */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-800">
                {enteCorrente?.comune?.toUpperCase() || 'CITTÀ'} - {enteCorrente?.denominazione?.toUpperCase() || 'PARROCCHIA'}
              </h1>
              {enteCorrente?.indirizzo && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {enteCorrente.indirizzo}
                  {enteCorrente.cap && ` - ${enteCorrente.cap}`}
                  {enteCorrente.provincia && ` (${enteCorrente.provincia})`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Cambio Ente */}
            <div className="relative">
              <button
                onClick={() => {
                  setEnteMenuOpen(!enteMenuOpen);
                  setUserMenuOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span className="font-medium">Cambio Ente</span>
              </button>

              {enteMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 py-1 max-h-96 overflow-y-auto z-50">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b">
                    Seleziona Parrocchia
                  </div>
                  {entiList.map((ente) => (
                    <button
                      key={ente.id}
                      onClick={() => handleChangeEnte(ente.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-blue-50 ${enteCorrente?.id === ente.id ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-700' : 'text-gray-700'
                        }`}
                    >
                      <div className="flex-1 text-left">
                        <div className="font-medium">{ente.denominazione}</div>
                        <div className="text-xs text-gray-500">{ente.comune} {ente.provincia && `(${ente.provincia})`}</div>
                      </div>
                      {enteCorrente?.id === ente.id && (
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Menu Utente */}
            <div className="relative">
              <button
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen);
                  setEnteMenuOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">{enteCorrente?.userName || 'Utente'}</span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      alert('Cambia Password - Da implementare');
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Cambia Password
                  </button>
                </div>
              )}
            </div>

            {/* Bottone Esci */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center gap-1.5 transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Esci
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR COMPATTA */}
        <div className="w-56 bg-white border-r border-gray-200 flex flex-col">
          {/* HOME */}
          <div className="p-3">
            <button
              onClick={() => {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                if (user.username === 'admin') {
                  navigate('/amministrazione');
                } else {
                  navigate('/dashboard');
                }
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors text-sm font-medium"
            >
              <span className="text-lg">🏠</span>
              <span>HOME</span>
            </button>
          </div>

          <div className="mx-3 h-px bg-gray-200"></div>

          {/* CONTABILITÀ */}
          <div className="p-3 space-y-1">
            <div className="flex items-center gap-2 px-2 py-1.5 text-blue-700 font-bold text-sm">
              <span className="text-lg">💰</span>
              <span>CONTABILITÀ</span>
            </div>
            <button
              onClick={() => navigate('/contabilita')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                location.pathname === '/contabilita'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <span>💳</span>
              <span>Conti</span>
            </button>
            <button
              onClick={() => navigate('/contabilita/movimenti')}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
              <span>📊</span>
              <span>Movimentazione</span>
            </button>
            <button
              onClick={() => setShowModalTransazione(true)}
              className="w-full px-3 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 rounded transition-colors"
            >
              + Aggiungi transazione
            </button>
            <button
              onClick={() => navigate('/contabilita/rapporti')}
              className="w-full px-3 py-1.5 text-sm bg-gray-600 text-white hover:bg-gray-700 rounded transition-colors"
            >
              📄 Stampa
            </button>
            <div className="space-y-1">
              <button
                onClick={() => setRendicontoMenuOpen(!rendicontoMenuOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span>📋</span>
                  <span>Rendiconto</span>
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${rendicontoMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {rendicontoMenuOpen && (
                <div className="pl-4 space-y-1">
                  <button
                    onClick={() => navigate('/contabilita/rendiconto/nuovo')}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${location.pathname === '/contabilita/rendiconto/nuovo'
                      ? 'bg-purple-100 text-purple-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <span>✨</span>
                    <span>Nuovo Rendiconto</span>
                  </button>

                  <button
                    onClick={() => navigate('/contabilita/rendiconto/lista')}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${location.pathname === '/contabilita/rendiconto/lista'
                      ? 'bg-purple-100 text-purple-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <span>📚</span>
                    <span>Lista Rendiconti</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mx-3 h-px bg-gray-200"></div>

          {/* ALTRI MODULI */}
          <div className="p-3 space-y-1 flex-1">
            <button
              onClick={() => navigate('/persone')}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors text-sm"
            >
              <span>👥</span>
              <span>Anagrafica</span>
            </button>
            <button
              onClick={() => navigate('/inventario')}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors text-sm"
            >
              <span>📦</span>
              <span>Inventario</span>
            </button>
          </div>
        </div>

        {/* AREA PRINCIPALE */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header con titolo - COMPATTO */}
          <div className="bg-white border-b border-gray-200 px-6 py-2">
            <div className="flex items-center justify-between">
              <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 p-1" title="Indietro">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-base font-bold text-gray-800 flex-1 text-center tracking-wide">CONTABILITÀ</h1>
              <div className="text-xs text-gray-500 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formatDate(currentTime)}</span>
              </div>
            </div>
          </div>

          {/* MENU ORIZZONTALE COMPATTO */}
          <div className="bg-white border-b border-gray-200 px-6">
            <div className="flex items-center justify-end">

              {/* Destra: Azioni */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowModalConto(true)}
                  className="px-2 py-2 text-sm font-semibold text-gray-600 border-b-2 border-transparent hover:text-blue-600 transition-colors"
                >
                  + Aggiungi Conto
                </button>
                <button
                  onClick={() => navigate('/contabilita/categoria')}
                  className={`px-2 py-2 text-sm font-semibold border-b-2 transition-colors ${isActive('/contabilita/categoria')
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-blue-600'
                    }`}
                >
                  Impostazione Categoria
                </button>
              </div>
            </div>
          </div>

          {/* CONTENUTO */}
          <div className="flex-1 overflow-auto p-4">
            <Outlet />
          </div>
        </div>
      </div>

      {/* MODAL AGGIUNGI CONTO */}
      {showModalConto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Nuovo Conto</h3>
              <button onClick={() => setShowModalConto(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitConto} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo Conto *</label>
                <select
                  value={formConto.tipo}
                  onChange={(e) => setFormConto({ ...formConto, tipo: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                  required
                >
                  {Object.entries(tipiConto).map(([key, value]) => (
                    <option key={key} value={key}>{value.icon} {value.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nome/Descrizione *</label>
                <input
                  type="text"
                  value={formConto.nome}
                  onChange={(e) => setFormConto({ ...formConto, nome: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                  placeholder="es. Conto Unicredit"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Numero/Codice <span className="text-gray-400">(opzionale)</span>
                </label>
                <input
                  type="text"
                  value={formConto.numero}
                  onChange={(e) => setFormConto({ ...formConto, numero: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm font-mono"
                  placeholder="IT00X... / 1234 5678"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Saldo iniziale <span className="text-gray-400">(opzionale)</span>
                </label>
                <p className="text-[10px] text-gray-500 mb-1.5 leading-tight">
                  💡 Se questo conto esisteva già prima di usare il sistema, inserisci il saldo al 31/12/{new Date().getFullYear() - 1}
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-gray-500 text-sm">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formConto.saldo_iniziale}
                    onChange={(e) => setFormConto({
                      ...formConto,
                      saldo_iniziale: parseFloat(e.target.value) || 0
                    })}
                    className="w-full pl-7 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModalConto(false);
                    setFormConto({ tipo: 'banca', nome: '', numero: '', saldo_iniziale: 0 });
                  }}
                  className="flex-1 px-4 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold"
                >
                  Crea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AGGIUNGI TRANSAZIONE GLOBALE */}
      {showModalTransazione && (
        <FormMovimentoGlobale
          movimento={null}
          onClose={() => setShowModalTransazione(false)}
          onSave={handleSaveTransazione}
          categorie={categorie}
        />
      )}

    </div>
  );
};

export default ContabilitaLayout;