import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Amministrazione = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    parrocchieAttive: 0,
    utentiTotali: 0
  });
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ vecchia: '', nuova: '', conferma: '' });
  const [settingsData, setSettingsData] = useState({ titolo: '', nome: '', cognome: '', email: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    vecchia: false,
    nuova: false,
    conferma: false
  });

  useEffect(() => {
    // Carica info utente
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    setSettingsData({
      titolo: userData.titolo || '',
      nome: userData.nome || '',
      cognome: userData.cognome || '',
      email: userData.email || ''
    });

    // Carica statistiche
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');

      // Carica numero Enti
      const entiRes = await fetch('/api/amministrazione/enti', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const enti = await entiRes.json();

      // Carica numero Utenti (escluso economo)
      const utentiRes = await fetch('/api/amministrazione/utenti', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const utenti = await utentiRes.json();
      const utentiNonEconomi = utenti.filter(u => !u.is_economo);

      setStats({
        parrocchieAttive: enti.length || 0,           // Per card BLU (Enti)
        utentiTotali: utentiNonEconomi.length || 0    // Per card VERDE (Utenti)
      });
    } catch (error) {
      console.error('Errore caricamento statistiche:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('ente_id');
    navigate('/login');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.nuova !== passwordData.conferma) {
      setError('Le password non coincidono');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: passwordData.vecchia, new_password: passwordData.nuova })
      });

      if (response.ok) {
        setSuccess('Password cambiata!');
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordData({ vecchia: '', nuova: '', conferma: '' });
          setSuccess('');
        }, 1500);
      } else {
        setError('Password errata');
      }
    } catch (err) {
      setError('Errore di connessione');
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData)
      });

      if (response.ok) {
        const updated = await response.json();
        localStorage.setItem('user', JSON.stringify(updated));
        setUser(updated);
        setSuccess('Dati aggiornati!');
        setTimeout(() => {
          setShowSettingsModal(false);
          setSuccess('');
        }, 1500);
      } else {
        setError('Errore aggiornamento');
      }
    } catch (err) {
      setError('Errore di connessione');
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">⚙️ Amministrazione</h1>
              <p className="text-sm text-gray-600">Diocesi di Caltagirone - Gestione Sistema</p>
            </div>

            {/* Menu Utente */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
              >
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {user?.nome ? `${user.titolo || ''} ${user.nome} ${user.cognome}`.trim() : 'Admin Diocesano'}
                  </div>
                  <div className="text-xs text-gray-600">{user?.email || 'admin@diocesi.it'}</div>
                </div>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {user?.nome?.[0] || 'A'}
                </div>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      setShowSettingsModal(true);
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    ⚙️ Impostazioni
                  </button>
                  <button
                    onClick={() => {
                      setShowPasswordModal(true);
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    🔒 Cambia Password
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Statistiche Principali (2 CARD GRANDI) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          {/* Card Enti */}
          <button
            onClick={() => navigate('/gestione-enti')}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-8 text-white hover:shadow-xl transition-all hover:scale-105 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-6xl font-bold mb-2">
                  {loading ? (
                    <svg className="animate-spin h-14 w-14 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    stats.parrocchieAttive
                  )}
                </div>
                <div className="text-xl font-semibold opacity-90">Gestione Enti</div>
                <div className="text-sm opacity-75 mt-1">Click per gestire →</div>
              </div>
              <div className="text-7xl opacity-20">🏛️</div>
            </div>
          </button>

          {/* Card Utenti */}
          <button
            onClick={() => navigate('/gestione-utenti')}
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-8 text-white hover:shadow-xl transition-all hover:scale-105 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-6xl font-bold mb-2">
                  {loading ? (
                    <svg className="animate-spin h-14 w-14 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    stats.utentiTotali
                  )}
                </div>
                <div className="text-xl font-semibold opacity-90">Gestione Utenti</div>
                <div className="text-sm opacity-75 mt-1">Click per gestire →</div>
              </div>
              <div className="text-7xl opacity-20">👥</div>
            </div>
          </button>

        </div>

        {/* Barra Navigazione Moduli */}
        <div className="bg-white rounded-xl shadow-lg p-3 mb-8">
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/persone')}
              className="flex-1 px-8 py-6 rounded-lg bg-purple-50 border-2 border-purple-500 text-purple-700 font-bold text-lg hover:bg-purple-100 transition-colors"
            >
              📋 Anagrafica
            </button>
            <button
              onClick={() => navigate('/economo/contabilita')}
              className="flex-1 px-8 py-6 rounded-lg bg-gray-50 border-2 border-gray-200 text-gray-700 font-bold text-lg hover:bg-gray-100 transition-colors"
            >
              💰 Contabilità
            </button>
            <button
              onClick={() => navigate('/inventario')}
              className="flex-1 px-8 py-6 rounded-lg bg-gray-50 border-2 border-gray-200 text-gray-700 font-bold text-lg hover:bg-gray-100 transition-colors"
            >
              📦 Inventari
            </button>
          </div>
        </div>

        {/* Sezione Gestioni */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">🛠️ Altre Gestioni</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Bottone Gestione Parrocchie Diocesi */}
            <button
              onClick={() => navigate('/amministrazione/parrocchie-diocesi')}
              className="group"
            >
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 hover:bg-purple-100 hover:border-purple-300 transition-all cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center text-white text-lg">
                    📖
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-purple-700">Parrocchie Diocesi</div>
                    <div className="text-xs text-gray-500">Archivio CEI</div>
                  </div>
                </div>
              </div>
            </button>

            {/* Bottone Template Categorie CEI */}
            <button
              onClick={() => navigate('/amministrazione/template-categorie')}
              className="group"
            >
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 hover:bg-purple-100 hover:border-purple-300 transition-all cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center text-white text-lg">
                    📋
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-purple-700"> Gestione Categorie</div>
                    <div className="text-xs text-gray-500">Categorie CEI</div>
                  </div>
                </div>
              </div>
            </button>

            {/* Placeholder per future gestioni */}
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-3 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-xl mb-1">➕</div>
                <div className="text-xs font-medium">Aggiungi</div>
              </div>
            </div>

            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-3 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-xl mb-1">➕</div>
                <div className="text-xs font-medium">Aggiungi</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL CAMBIO PASSWORD */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-lg font-bold mb-4">🔒 Cambia Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="relative">
                <input
                  type={showPasswords.vecchia ? "text" : "password"}
                  placeholder="Password attuale"
                  value={passwordData.vecchia}
                  onChange={(e) => setPasswordData({ ...passwordData, vecchia: e.target.value })}
                  className="w-full px-3 py-2 border rounded pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, vecchia: !showPasswords.vecchia })}
                  className="absolute right-2 top-2.5 text-gray-500"
                >
                  {showPasswords.vecchia ? '🙈' : '👁️'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPasswords.nuova ? "text" : "password"}
                  placeholder="Nuova password"
                  value={passwordData.nuova}
                  onChange={(e) => setPasswordData({ ...passwordData, nuova: e.target.value })}
                  className="w-full px-3 py-2 border rounded pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, nuova: !showPasswords.nuova })}
                  className="absolute right-2 top-2.5 text-gray-500"
                >
                  {showPasswords.nuova ? '🙈' : '👁️'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPasswords.conferma ? "text" : "password"}
                  placeholder="Conferma password"
                  value={passwordData.conferma}
                  onChange={(e) => setPasswordData({ ...passwordData, conferma: e.target.value })}
                  className="w-full px-3 py-2 border rounded pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, conferma: !showPasswords.conferma })}
                  className="absolute right-2 top-2.5 text-gray-500"
                >
                  {showPasswords.conferma ? '🙈' : '👁️'}
                </button>
              </div>
              {error && <div className="text-red-600 text-sm">{error}</div>}
              {success && <div className="text-green-600 text-sm">{success}</div>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2 border rounded"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Cambia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPOSTAZIONI */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-lg font-bold mb-4">⚙️ Impostazioni Profilo</h2>
            <form onSubmit={handleUpdateSettings} className="space-y-3">
              <input
                type="text"
                placeholder="Titolo (opzionale)"
                value={settingsData.titolo}
                onChange={(e) => setSettingsData({ ...settingsData, titolo: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="text"
                placeholder="Nome"
                value={settingsData.nome}
                onChange={(e) => setSettingsData({ ...settingsData, nome: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
              <input
                type="text"
                placeholder="Cognome"
                value={settingsData.cognome}
                onChange={(e) => setSettingsData({ ...settingsData, cognome: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={settingsData.email}
                onChange={(e) => setSettingsData({ ...settingsData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
              {error && <div className="text-red-600 text-sm">{error}</div>}
              {success && <div className="text-green-600 text-sm">{success}</div>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 px-4 py-2 border rounded"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Amministrazione;