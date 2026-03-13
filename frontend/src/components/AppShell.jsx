import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { logout } from '../utils/auth';
import CambioPasswordModal from './CambioPasswordModal';

const AppShell = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [enteCorrente, setEnteCorrente] = useState(null);
  const [userName, setUserName] = useState('Utente');
  const [entiList, setEntiList] = useState([]);
  const [permessi, setPermessi] = useState({ anagrafica: true, contabilita: false, inventario: false });
  const [isEconomo, setIsEconomo] = useState(false);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [enteMenuOpen, setEnteMenuOpen] = useState(false);
  const [showCambioPassword, setShowCambioPassword] = useState(false);

  // Accordion: quale modulo e' aperto
  const [moduloAperto, setModuloAperto] = useState(null);
  const [rendicontoOpen, setRendicontoOpen] = useState(false);

  // Apri automaticamente il modulo in base alla route
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/contabilita')) {
      setModuloAperto('contabilita');
      if (path.startsWith('/contabilita/rendiconto')) {
        setRendicontoOpen(true);
      }
    } else if (path.startsWith('/inventario')) {
      setModuloAperto('inventario');
    } else if (path.startsWith('/persone') || path.startsWith('/famiglie') || path.startsWith('/registro')) {
      setModuloAperto('anagrafica');
    }
  }, [location.pathname]);

  useEffect(() => {
    caricaDati();
  }, []);

  const caricaDati = async () => {
    try {
      const enteId = sessionStorage.getItem('ente_id') || sessionStorage.getItem('current_ente_id');
      if (enteId) {
        sessionStorage.setItem('ente_id', enteId);
        sessionStorage.setItem('current_ente_id', enteId);
      }

      const [enteRes, entiRes] = await Promise.all([
        api.get(`/api/enti/${enteId}`),
        api.get('/api/enti/my-enti'),
      ]);

      setEnteCorrente(enteRes.data);
      setEntiList(entiRes.data.enti || []);

      // Permessi
      const enteCorrenteData = (entiRes.data.enti || []).find(e => e.id === enteId);
      if (enteCorrenteData?.permessi) {
        setPermessi(enteCorrenteData.permessi);
      }

      // User
      const userStored = sessionStorage.getItem('user');
      if (userStored) {
        const user = JSON.parse(userStored);
        let name = '';
        if (user.titolo) name += user.titolo + ' ';
        if (user.nome) name += user.nome + ' ';
        if (user.cognome) name += user.cognome;
        setUserName(name.trim() || 'Utente');
        if (user.is_economo) setIsEconomo(true);
      }
    } catch {
      // silenzioso
    }
  };

  const handleChangeEnte = (enteId) => {
    sessionStorage.setItem('current_ente_id', enteId);
    sessionStorage.setItem('ente_id', enteId);
    window.location.reload();
  };

  const handleLogout = () => logout(navigate);

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/contabilita') return location.pathname === '/contabilita';
    if (path === '/contabilita/movimenti') {
      return location.pathname === '/contabilita/movimenti' || location.pathname.startsWith('/contabilita/conti/');
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const toggleModulo = (key) => {
    if (moduloAperto === key) return;
    setModuloAperto(key);
    // Naviga alla prima sotto-voce del modulo
    if (key === 'contabilita') navigate('/contabilita');
    else if (key === 'inventario') navigate('/inventario/beni');
    else if (key === 'anagrafica') navigate('/persone');
  };

  const mostraModulo = (permesso) => {
    if (!permesso) return true;
    if (isEconomo) return true;
    return permessi[permesso] === true;
  };

  // Chiudi dropdown su click esterno
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.dropdown-container')) {
        setEnteMenuOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* HEADER — stile copiato da ContabilitaLayout.jsx */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-800">
                {enteCorrente?.comune?.toUpperCase() || 'CITTA\''} - {enteCorrente?.denominazione?.toUpperCase() || 'PARROCCHIA'}
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
            <div className="relative dropdown-container">
              <button
                onClick={(e) => {
                  e.stopPropagation();
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
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-blue-50 ${enteCorrente?.id === ente.id ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-700' : 'text-gray-700'}`}
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
            <div className="relative dropdown-container">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setUserMenuOpen(!userMenuOpen);
                  setEnteMenuOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">{userName}</span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setShowCambioPassword(true);
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

            {/* Esci */}
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
        {/* SIDEBAR */}
        <div className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-y-auto">
          {location.pathname === '/dashboard' ? (
            <>
              {/* SIDEBAR HOME */}
              <div className="p-3 space-y-1">
                <button
                  onClick={() => navigate('/impostazioni/dati-generali')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
                >
                  <span className="text-lg">🏛️</span>
                  <span>Dati Parrocchia</span>
                </button>
                <div>
                  <button
                    disabled
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 rounded-md cursor-not-allowed"
                  >
                    <span className="text-lg">📥</span>
                    <span>Documenti</span>
                  </button>
                  <p className="px-3 pl-10 text-[10px] text-gray-400 -mt-1">Prossimamente</p>
                </div>
              </div>
            </>
          ) : location.pathname === '/impostazioni/dati-generali' ? (
            <>
              {/* SIDEBAR IMPOSTAZIONI */}
              <div className="p-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  <span className="text-lg">🏠</span>
                  <span>HOME</span>
                </button>
              </div>

              <div className="mx-3 h-px bg-gray-200"></div>

              <div className="p-3 space-y-1">
                <button
                  onClick={() => mostraModulo('contabilita') && navigate('/contabilita')}
                  disabled={!mostraModulo('contabilita')}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    mostraModulo('contabilita') ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-700' : 'text-gray-300 cursor-not-allowed'
                  }`}
                >
                  <span className="text-lg">💰</span>
                  <span>CONTABILITÀ</span>
                </button>
                <button
                  onClick={() => mostraModulo('inventario') && navigate('/inventario/beni')}
                  disabled={!mostraModulo('inventario')}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    mostraModulo('inventario') ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-700' : 'text-gray-300 cursor-not-allowed'
                  }`}
                >
                  <span className="text-lg">🏛️</span>
                  <span>INVENTARIO</span>
                </button>
                <button
                  onClick={() => mostraModulo('anagrafica') && navigate('/persone')}
                  disabled={!mostraModulo('anagrafica')}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    mostraModulo('anagrafica') ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-700' : 'text-gray-300 cursor-not-allowed'
                  }`}
                >
                  <span className="text-lg">👥</span>
                  <span>ANAGRAFICA</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* SIDEBAR ACCORDION */}
              {/* HOME */}
              <div className="p-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                    isActive('/dashboard') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  <span className="text-lg">🏠</span>
                  <span>HOME</span>
                </button>
              </div>

              <div className="mx-3 h-px bg-gray-200"></div>

              {/* CONTABILITÀ */}
              <div className="p-3 space-y-1">
                <button
                  onClick={() => mostraModulo('contabilita') && toggleModulo('contabilita')}
                  disabled={!mostraModulo('contabilita')}
                  className={`w-full flex items-center justify-between px-2 py-1.5 text-sm font-bold rounded transition-colors ${
                    !mostraModulo('contabilita') ? 'text-gray-300 cursor-not-allowed' :
                    moduloAperto === 'contabilita' ? 'text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💰</span>
                    <span>CONTABILITÀ</span>
                  </div>
                  <span className={`transform transition-transform text-xs ${moduloAperto === 'contabilita' ? 'rotate-90' : ''}`}>▶</span>
                </button>

                {mostraModulo('contabilita') && moduloAperto === 'contabilita' && (
                  <div className="space-y-1">
                    <button
                      onClick={() => navigate('/contabilita')}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors bg-blue-600 text-white font-semibold"
                    >
                      <span>💳</span>
                      <span>Conti</span>
                    </button>
                    <button
                      onClick={() => navigate('/contabilita/movimenti')}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                        isActive('/contabilita/movimenti') ? 'bg-blue-600 text-white font-semibold' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span>📊</span>
                      <span>Movimentazione</span>
                    </button>
                    <button
                      onClick={() => navigate('/contabilita/rapporti')}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                        isActive('/contabilita/rapporti') ? 'bg-blue-600 text-white font-semibold' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span>📄</span>
                      <span>Stampa</span>
                    </button>
                    {/* Rendiconto sub-menu */}
                    <div className="space-y-1">
                      <button
                        onClick={() => setRendicontoOpen(!rendicontoOpen)}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <span>📋</span>
                          <span>Rendiconto</span>
                        </span>
                        <svg
                          className={`w-4 h-4 transition-transform ${rendicontoOpen ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {rendicontoOpen && (
                        <div className="pl-4 space-y-1">
                          <button
                            onClick={() => navigate('/contabilita/rendiconto/nuovo')}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                              location.pathname === '/contabilita/rendiconto/nuovo' ? 'bg-purple-100 text-purple-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <span>✨</span>
                            <span>Nuovo Rendiconto</span>
                          </button>
                          <button
                            onClick={() => navigate('/contabilita/rendiconto/lista')}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                              location.pathname === '/contabilita/rendiconto/lista' || (location.pathname.startsWith('/contabilita/rendiconto/') && location.pathname !== '/contabilita/rendiconto/nuovo')
                                ? 'bg-purple-100 text-purple-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <span>📚</span>
                            <span>Lista Rendiconti</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => navigate('/contabilita/impostazioni')}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                        isActive('/contabilita/impostazioni') ? 'bg-blue-600 text-white font-semibold' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span>⚙️</span>
                      <span>Impostazioni</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="mx-3 h-px bg-gray-200"></div>

              {/* INVENTARIO */}
              <div className="p-3 space-y-1">
                <button
                  onClick={() => mostraModulo('inventario') && toggleModulo('inventario')}
                  disabled={!mostraModulo('inventario')}
                  className={`w-full flex items-center justify-between px-2 py-1.5 text-sm font-bold rounded transition-colors ${
                    !mostraModulo('inventario') ? 'text-gray-300 cursor-not-allowed' :
                    moduloAperto === 'inventario' ? 'text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏛️</span>
                    <span>INVENTARIO</span>
                  </div>
                  <span className={`transform transition-transform text-xs ${moduloAperto === 'inventario' ? 'rotate-90' : ''}`}>▶</span>
                </button>

                {mostraModulo('inventario') && moduloAperto === 'inventario' && (
                  <div className="space-y-1">
                    <button
                      onClick={() => navigate('/inventario/beni')}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                        isActive('/inventario/beni') ? 'bg-blue-600 text-white font-semibold' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span>📦</span>
                      <span>Beni</span>
                    </button>
                    <button
                      onClick={() => navigate('/inventario/registri')}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                        isActive('/inventario/registri') ? 'bg-blue-600 text-white font-semibold' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span>📋</span>
                      <span>Registri</span>
                    </button>
                    <button
                      onClick={() => navigate('/inventario/storico')}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                        isActive('/inventario/storico') ? 'bg-blue-600 text-white font-semibold' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span>🗂️</span>
                      <span>Storico</span>
                    </button>
                    <button
                      onClick={() => navigate('/inventario/stampa')}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                        isActive('/inventario/stampa') ? 'bg-blue-600 text-white font-semibold' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span>📄</span>
                      <span>Stampa</span>
                    </button>
                    <button
                      onClick={() => navigate('/inventario/impostazioni')}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                        isActive('/inventario/impostazioni') ? 'bg-blue-600 text-white font-semibold' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span>⚙️</span>
                      <span>Impostazioni</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="mx-3 h-px bg-gray-200"></div>

              {/* ANAGRAFICA */}
              <div className="p-3 space-y-1">
                <button
                  onClick={() => mostraModulo('anagrafica') && toggleModulo('anagrafica')}
                  disabled={!mostraModulo('anagrafica')}
                  className={`w-full flex items-center justify-between px-2 py-1.5 text-sm font-bold rounded transition-colors ${
                    !mostraModulo('anagrafica') ? 'text-gray-300 cursor-not-allowed' :
                    moduloAperto === 'anagrafica' ? 'text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <span>ANAGRAFICA</span>
                  </div>
                  <span className={`transform transition-transform text-xs ${moduloAperto === 'anagrafica' ? 'rotate-90' : ''}`}>▶</span>
                </button>

                {mostraModulo('anagrafica') && moduloAperto === 'anagrafica' && (
                  <div className="space-y-1">
                    <button
                      onClick={() => navigate('/persone')}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                        isActive('/persone') ? 'bg-blue-600 text-white font-semibold' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span>👤</span>
                      <span>Persone</span>
                    </button>
                    <button
                      onClick={() => navigate('/registro')}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                        isActive('/registro') ? 'bg-blue-600 text-white font-semibold' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span>📖</span>
                      <span>Registro</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SPACER */}
              <div className="flex-1"></div>

              <div className="mx-3 h-px bg-gray-200"></div>

              {/* IMPOSTAZIONI */}
              <div className="p-3">
                <button
                  onClick={() => navigate('/impostazioni/dati-generali')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                    isActive('/impostazioni') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-lg">⚙️</span>
                  <span>Impostazioni</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* CONTENUTO PRINCIPALE */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>

      {/* MODAL CAMBIA PASSWORD */}
      {showCambioPassword && (
        <CambioPasswordModal onClose={() => setShowCambioPassword(false)} />
      )}
    </div>
  );
};

export default AppShell;
