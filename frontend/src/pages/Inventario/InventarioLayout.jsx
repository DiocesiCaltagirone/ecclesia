import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { logout } from '../../utils/auth';
import CambioPasswordModal from '../../components/CambioPasswordModal';

const menuItems = [
  { path: '/inventario/beni', icon: '📦', label: 'Beni' },
  { path: '/inventario/registri', icon: '📋', label: 'Registri' },
  { path: '/inventario/storico', icon: '🗂️', label: 'Storico' },
  { path: '/inventario/impostazioni', icon: '⚙️', label: 'Impostazioni' },
];

const pageTitles = {
  '/inventario/beni': 'Beni',
  '/inventario/beni/nuovo': 'Nuovo Bene',
  '/inventario/registri': 'Registri',
  '/inventario/storico': 'Storico',
  '/inventario/impostazioni': 'Impostazioni',
};

const InventarioLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [enteCorrente, setEnteCorrente] = useState(null);
  const [userName, setUserName] = useState('Utente');
  const [userInitials, setUserInitials] = useState('U');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    const ente = JSON.parse(sessionStorage.getItem('current_ente') || '{}');
    setEnteCorrente(ente);

    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    let name = '';
    if (user.titolo) name += user.titolo + ' ';
    if (user.nome) name += user.nome + ' ';
    if (user.cognome) name += user.cognome;
    name = name.trim() || 'Utente';
    setUserName(name);

    const initials = ((user.nome || '')[0] || '') + ((user.cognome || '')[0] || '') || 'U';
    setUserInitials(initials.toUpperCase());

    // Se current_ente non ha dati, carica dall'API
    if (!ente.denominazione) {
      const enteId = sessionStorage.getItem('current_ente_id');
      if (enteId) {
        api.get(`/api/enti/${enteId}`).then(res => {
          setEnteCorrente(res.data);
        }).catch(() => {});
      }
    }
  }, []);

  const isActive = (path) => {
    if (path === '/inventario/beni') {
      return location.pathname === path || (location.pathname.startsWith('/inventario/beni') && location.pathname !== '/inventario/beni/nuovo');
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getCurrentPageTitle = () => {
    // Verifica percorsi specifici prima
    if (location.pathname.startsWith('/inventario/beni/nuovo')) return 'Nuovo Bene';
    if (location.pathname.match(/^\/inventario\/beni\/[^/]+$/)) return 'Scheda Bene';
    return pageTitles[location.pathname] || 'Beni';
  };

  const sidebarWidth = sidebarCollapsed ? 64 : 248;

  return (
    <div className="flex" style={{ height: '100vh', background: '#f5f0e8', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* SIDEBAR */}
      <aside
        className="flex flex-col flex-shrink-0 transition-all duration-300"
        style={{
          width: sidebarWidth,
          background: 'linear-gradient(175deg, #0f1d3a 0%, #1a2e55 50%, #0d1a32 100%)',
          overflow: 'hidden',
        }}
      >
        {/* Logo area */}
        <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'linear-gradient(135deg, #d4af37, #f0d060)',
              fontSize: 18,
            }}
          >
            🏛️
          </div>
          {!sidebarCollapsed && (
            <div>
              <div style={{ color: '#d4af37', fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>
                INVENTARIO
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Beni Parrocchiali</div>
            </div>
          )}
        </div>

        {/* Menu voci */}
        <nav className="flex-1 py-3 px-2 space-y-1">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200"
                style={{
                  borderLeft: active ? '3px solid #d4af37' : '3px solid transparent',
                  background: active ? 'rgba(212,175,55,0.18)' : 'transparent',
                  color: active ? '#d4af37' : 'rgba(255,255,255,0.65)',
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer sidebar */}
        <div className="px-3 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {!sidebarCollapsed && enteCorrente?.denominazione && (
            <div className="py-3 px-2" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
              {enteCorrente.denominazione.length > 30
                ? enteCorrente.denominazione.substring(0, 30) + '...'
                : enteCorrente.denominazione}
            </div>
          )}
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#d4af37'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >
            <span>←</span>
            {!sidebarCollapsed && <span>Torna al gestionale</span>}
          </button>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center mt-2 py-1.5 rounded transition-colors"
            style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header bar */}
        <header
          className="flex items-center justify-between px-6 flex-shrink-0"
          style={{
            height: 56,
            background: '#fefcf8',
            borderBottom: '1px solid rgba(212,175,55,0.3)',
          }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2" style={{ fontSize: 14 }}>
            <span style={{ color: '#6b7280' }}>Inventario</span>
            <span style={{ color: '#d4af37' }}>/</span>
            <span style={{ color: '#1a1a2e', fontWeight: 600 }}>{getCurrentPageTitle()}</span>
          </div>

          {/* Nome parrocchia al centro */}
          <div style={{ color: '#6b7280', fontSize: 12, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            {enteCorrente?.denominazione || ''}
          </div>

          {/* User area */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#1a2e55', color: '#d4af37',
                  fontSize: 12, fontWeight: 700,
                }}
              >
                {userInitials}
              </div>
              <span style={{ color: '#1a1a2e', fontSize: 13, fontWeight: 500 }}>{userName}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      {showPasswordModal && (
        <CambioPasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
};

export default InventarioLayout;
