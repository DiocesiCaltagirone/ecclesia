import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import api from '../services/api';

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [anagraficaOpen, setAnagraficaOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentEnte, setCurrentEnte] = useState(null);
  const [entiList, setEntiList] = useState([]);
  const [showEnteDropdown, setShowEnteDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userName, setUserName] = useState('Utente');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ vecchia: '', nuova: '', conferma: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [permessi, setPermessi] = useState({
    anagrafica: true,
    contabilita: false,
    inventario: false
  });

  // Determina quale modulo è attivo
  const getActiveModule = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'home';
    if (path.includes('/impostazioni')) return 'impostazioni';
    if (path.includes('/persone') || path.includes('/famiglie') || path.includes('/registro')) return 'anagrafica';
    if (path.includes('/contabilita')) return 'contabilita';
    if (path.includes('/inventario')) return 'inventario';
    return 'home';
  };

  const activeModule = getActiveModule();

  useEffect(() => {
    loadEnteData();
    loadUserData();
  }, []);

  const loadEnteData = async () => {
    try {
      const enteId = localStorage.getItem('current_ente_id');
      localStorage.setItem('ente_id', enteId);  // ← AGGIUNTO! Sincronizza
      const token = localStorage.getItem('token');

      // Carica dati ente corrente
      const enteResponse = await api.get(`/api/enti/${enteId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Ente-Id': enteId
        }
      });
      console.log('Dati ente caricati:', enteResponse.data);
      setCurrentEnte(enteResponse.data);

      // Carica lista enti dell'utente
      const entiResponse = await api.get('/api/enti/my-enti', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setEntiList(entiResponse.data.enti || []);

      // Trova ente corrente e carica permessi
      const enteCorrente = (entiResponse.data.enti || []).find(e => e.id === enteId);
      if (enteCorrente && enteCorrente.permessi) {
        console.log('✅ Permessi caricati:', enteCorrente.permessi);
        setPermessi(enteCorrente.permessi);
      }
    } catch (error) {
      console.error('Errore caricamento ente:', error);
    }
  };

  const loadUserData = async () => {
    try {
      // Prima prova a caricare dal localStorage
      const userStored = localStorage.getItem('user');
      if (userStored) {
        const user = JSON.parse(userStored);
        console.log('👤 Utente da localStorage:', user);

        // Componi nome: titolo (Don/Suor) + nome + cognome
        let displayName = '';
        if (user.titolo) displayName += user.titolo + ' ';
        if (user.nome) displayName += user.nome + ' ';
        if (user.cognome) displayName += user.cognome;

        setUserName(displayName.trim() || 'Utente');
        return;
      }

      // Se non c'è nel localStorage, prova l'API
      const token = localStorage.getItem('token');
      const response = await api.get('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const user = response.data;
      console.log('👤 Utente da API:', user);

      let displayName = '';
      if (user.titolo) displayName += user.titolo + ' ';
      if (user.nome) displayName += user.nome + ' ';
      if (user.cognome) displayName += user.cognome;

      setUserName(displayName.trim() || 'Utente');
    } catch (error) {
      console.error('Errore caricamento utente:', error);
      setUserName('Utente');
    }
  };

  const handleChangeEnte = (enteId) => {
    localStorage.setItem('current_ente_id', enteId);
    localStorage.setItem('ente_id', enteId);  // ← AGGIUNTO!
    window.location.reload();
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.nuova !== passwordData.conferma) {
      setError('Le password non corrispondono');
      return;
    }

    try {
      const response = await api.post('/api/auth/change-password', {
        old_password: passwordData.vecchia,
        new_password: passwordData.nuova
      });

      if (response.status === 200) {
        setSuccess('Password modificata con successo!');
        setPasswordData({ vecchia: '', nuova: '', conferma: '' });
        setTimeout(() => {
          setShowPasswordModal(false);
          setSuccess('');
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore nel cambio password');
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Chiudi dropdown quando clicchi fuori
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.dropdown-container')) {
        setShowEnteDropdown(false);
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER FISSO */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 h-20 flex items-center px-6 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            {/* RIGA 1: CITTÀ - PARROCCHIA */}
            <h1 className="text-xl font-bold text-gray-800">
              {currentEnte?.comune?.toUpperCase() || 'CITTÀ'} - {currentEnte?.denominazione?.toUpperCase() || 'PARROCCHIA'}
            </h1>
            {/* RIGA 2: INDIRIZZO (solo se presente) */}
            {currentEnte?.indirizzo && (
              <p className="text-xs text-gray-500 mt-0.5">
                {currentEnte.indirizzo}
                {currentEnte.cap && ` - ${currentEnte.cap}`}
                {currentEnte.provincia && ` (${currentEnte.provincia})`}
              </p>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* CAMBIO ENTE DROPDOWN */}
          <div className="relative dropdown-container">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEnteDropdown(!showEnteDropdown);
                setShowUserDropdown(false);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span className="text-sm font-semibold">Cambio Ente</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showEnteDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 max-h-96 overflow-y-auto">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Seleziona Parrocchia</div>
                {entiList.map((ente) => (
                  <button
                    key={ente.id}
                    onClick={() => handleChangeEnte(ente.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 ${currentEnte?.id === ente.id ? 'border-l-4 border-blue-600 bg-blue-50' : ''
                      }`}
                  >
                    <div className="flex-1 text-left">
                      <div className="font-semibold">{ente.denominazione}</div>
                      <div className="text-xs text-gray-500">
                        {ente.comune} {ente.provincia && `(${ente.provincia})`}
                      </div>
                    </div>
                    {currentEnte?.id === ente.id && (
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* USER DROPDOWN */}
          <div className="relative dropdown-container">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowUserDropdown(!showUserDropdown);
                setShowEnteDropdown(false);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm font-semibold">{userName}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                <button
                  onClick={() => {
                    setShowPasswordModal(true);
                    setShowUserDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Cambia Password
                </button>
              </div>
            )}
          </div>

          {/* PULSANTE ESCI */}
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Esci
          </button>
        </div>
      </header>

      {/* SIDEBAR */}
      <aside
        className={`fixed top-20 left-0 bottom-0 w-72 bg-white border-r border-gray-200 overflow-y-auto transition-transform duration-300 z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="p-4">
          {/* HOME - SEMPRE VISIBILE */}
          <button
            onClick={() => navigate('/dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold mb-2 ${location.pathname === '/dashboard'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </button>

          <div className="h-px bg-gray-200 my-3"></div>

          {/* MENU DINAMICO */}
          {activeModule === 'home' || activeModule === 'impostazioni' ? (
            <>
              {/* IMPOSTAZIONI PARROCCHIA */}
              <div className="mb-2">
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold ${activeModule === 'impostazioni'
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
                    }`}
                  onClick={() => navigate('/impostazioni/dati-generali')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Impostazioni Parrocchia</span>
                </div>
                <div className="ml-8 mt-1 space-y-1">
                  <button
                    onClick={() => navigate('/impostazioni/dati-generali')}
                    className={`w-full text-left block px-4 py-2 text-sm rounded-lg ${location.pathname === '/impostazioni/dati-generali'
                      ? 'text-gray-700 bg-blue-50 font-semibold'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                  >
                    • Dati Generali
                  </button>
                  <button
                    onClick={() => navigate('/impostazioni/logo')}
                    className={`w-full text-left block px-4 py-2 text-sm rounded-lg ${location.pathname === '/impostazioni/logo'
                      ? 'text-gray-700 bg-blue-50 font-semibold'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                  >
                    • Logo e Immagini
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ANAGRAFICA */}
              {permessi.anagrafica && (
                <div className="mb-2">
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold ${location.pathname.startsWith('/persone') || location.pathname.startsWith('/famiglie') || location.pathname.startsWith('/registro')
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
                      }`}
                    onClick={() => setAnagraficaOpen(!anagraficaOpen)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Anagrafica</span>
                    <span className={`ml-auto transform transition-transform ${anagraficaOpen ? 'rotate-90' : ''}`}>
                      ▶
                    </span>
                  </div>
                  {anagraficaOpen && (
                    <div className="ml-8 mt-1 space-y-1">
                      <button
                        onClick={() => navigate('/persone')}
                        className={`w-full text-left block px-4 py-2 text-sm rounded-lg ${location.pathname === '/persone'
                          ? 'text-gray-700 bg-blue-50 font-semibold'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                      >
                        • Persone
                      </button>
                      <button
                        onClick={() => navigate('/famiglie')}
                        className={`w-full text-left block px-4 py-2 text-sm rounded-lg ${location.pathname === '/famiglie'
                          ? 'text-gray-700 bg-blue-50 font-semibold'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                      >
                        • Famiglie
                      </button>
                      <button
                        onClick={() => navigate('/registro')}
                        className={`w-full text-left block px-4 py-2 text-sm rounded-lg ${location.pathname === '/registro'
                          ? 'text-gray-700 bg-blue-50 font-semibold'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                      >
                        • Registro Completo
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="h-px bg-gray-200 my-3"></div>
              {/* CONTABILITÀ */}
              {permessi.contabilita && (
                <button
                  onClick={() => navigate('/contabilita')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold mb-2 ${location.pathname.startsWith('/contabilita')
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Contabilità</span>
                </button>
              )}

              {/* INVENTARIO */}
              <button
                onClick={() => navigate('/inventario')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold ${location.pathname.startsWith('/inventario')
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Inventario</span>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* CONTENUTO PRINCIPALE */}
      <main
        className={`pt-20 transition-all duration-300 ${sidebarOpen ? 'pl-72' : 'pl-0'
          }`}
      >
        <Outlet />
      </main>

      {/* MODAL CAMBIA PASSWORD */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">🔒 Cambia Password</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded mb-4 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password Attuale *</label>
                <div className="relative">
                  <input
                    type={showOldPassword ? "text" : "password"}
                    value={passwordData.vecchia}
                    onChange={(e) => setPasswordData({ ...passwordData, vecchia: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showOldPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nuova Password *</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.nuova}
                    onChange={(e) => setPasswordData({ ...passwordData, nuova: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conferma Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.conferma}
                    onChange={(e) => setPasswordData({ ...passwordData, conferma: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ vecchia: '', nuova: '', conferma: '' });
                    setError('');
                    setSuccess('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Cambia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Layout;