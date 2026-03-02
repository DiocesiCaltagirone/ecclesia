import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CambioPasswordModal from './CambioPasswordModal';

const HeaderAmministrazione = () => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('ente_id');
    navigate('/login');
  };

  return (
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
      {/* MODAL CAMBIA PASSWORD */}
      {showPasswordModal && (
        <CambioPasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
};

export default HeaderAmministrazione;