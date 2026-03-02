import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import api from '../services/api';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [ricordami, setRicordami] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem('saved_email');
    if (savedEmail) {
      setUsername(savedEmail);
      setRicordami(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(username, password);
      sessionStorage.setItem('token', data.access_token);
      sessionStorage.setItem('user', JSON.stringify(data.user));

      if (ricordami) {
        localStorage.setItem('saved_email', username);
      } else {
        localStorage.removeItem('saved_email');
      }

      const userResponse = await api.get('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        }
      });

      const userData = userResponse.data;

      if (userData.enti && userData.enti.length > 0) {
        const primoEnteId = userData.enti[0].id;
        sessionStorage.setItem('ente_id', primoEnteId);
      }

      if (data.user.is_economo) {
        navigate('/amministrazione');
      } else {
        navigate('/select-ente');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante il login');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage('');

    try {
      await api.post('/api/auth/reset-password', { email: resetEmail });
      setResetMessage('ok');
      setTimeout(() => {
        setShowResetModal(false);
        setResetEmail('');
        setResetMessage('');
      }, 2000);
    } catch (err) {
      setResetMessage('error');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="lp-page">
      <div className="lp-circle" />

      {/* Card */}
      <div className="lp-card">
        {/* Parte alta — bianca con logo */}
        <div className="lp-top">
          <img
            src="/logo-diocesi.png"
            alt="Diocesi di Caltagirone"
            className="lp-logo"
          />
          <h1 className="lp-title">EcclesiaWeb</h1>
          <p className="lp-subtitle">Sistema Gestionale Parrocchiale</p>
        </div>

        {/* Onda */}
        <svg viewBox="0 0 400 50" preserveAspectRatio="none" style={{width:'100%',height:'50px',display:'block'}}>
          <defs>
            <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor:'#1a365d'}} />
              <stop offset="50%" style={{stopColor:'#2c5282'}} />
              <stop offset="100%" style={{stopColor:'#1a365d'}} />
            </linearGradient>
          </defs>
          <path d="M0,20 C100,45 200,0 300,25 C350,37 380,30 400,20 L400,50 L0,50 Z" fill="url(#waveGrad)" />
        </svg>

        {/* Parte bassa — scura con form */}
        <div className="lp-bottom">
          {error && (
            <div className="lp-error">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="lp-field">
              <label className="lp-label">Email</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="lp-input"
                placeholder="Inserisci email"
                required
              />
            </div>

            <div className="lp-field" style={{ marginTop: 14 }}>
              <label className="lp-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="lp-input"
                  placeholder="Inserisci password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="lp-eye"
                >
                  {showPassword ? (
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Riga Ricordami + Password dimenticata */}
            <div className="lp-row">
              <label className="lp-check-label">
                <input
                  type="checkbox"
                  checked={ricordami}
                  onChange={(e) => setRicordami(e.target.checked)}
                  className="lp-check"
                />
                <span className="lp-check-custom" />
                <span className="lp-check-text">Ricordami</span>
              </label>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="lp-forgot"
              >
                Password dimenticata?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="lp-btn"
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg style={{ animation: 'lp-spin 1s linear infinite', marginRight: 10 }} width="20" height="20" fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Accesso in corso...
                </span>
              ) : (
                'Accedi al Sistema'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <p className="lp-footer">&copy; 2025 Diocesi di Caltagirone</p>

      {/* Modal Reset Password */}
      {showResetModal && (
        <div className="lp-modal-overlay">
          <div className="lp-modal">
            <button
              onClick={() => {
                setShowResetModal(false);
                setResetMessage('');
                setResetEmail('');
              }}
              className="lp-modal-close"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="lp-modal-title">Recupera Password</h3>
            <p className="lp-modal-desc">
              Inserisci il tuo indirizzo email per ricevere una nuova password temporanea.
            </p>

            {resetMessage && (
              <div className={`lp-modal-msg ${resetMessage === 'ok' ? 'lp-modal-msg-ok' : 'lp-modal-msg-err'}`}>
                {resetMessage === 'ok'
                  ? 'Password temporanea inviata via email!'
                  : 'Errore: Email non trovata'}
              </div>
            )}

            <form onSubmit={handleResetPassword}>
              <div className="lp-field">
                <label className="lp-label lp-label-modal">Email</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="lp-input lp-input-modal"
                  placeholder="tuo@email.it"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="lp-btn"
                style={{ marginTop: 20 }}
              >
                {resetLoading ? 'Invio in corso...' : 'Invia Password Temporanea'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .lp-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #1a365d 0%, #2c5282 40%, #2b6cb0 70%, #1a365d 100%);
          position: relative;
          overflow: hidden;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .lp-circle {
          position: absolute;
          width: 600px; height: 600px;
          border-radius: 50%;
          background: rgba(255,255,255,0.03);
          filter: blur(60px);
          top: -200px; right: -200px;
          pointer-events: none;
        }

        /* ===== CARD ===== */
        .lp-card {
          max-width: 400px;
          width: 90%;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          overflow: hidden;
          animation: lp-fadeSlideUp 0.7s ease-out both;
          position: relative;
          z-index: 1;
        }

        /* ===== PARTE ALTA ===== */
        .lp-top {
          background: #ffffff;
          padding: 32px 36px 20px;
          text-align: center;
        }

        .lp-logo {
          width: 200px;
          height: auto;
          display: block;
          margin: 0 auto 14px;
        }

        .lp-title {
          font-size: 1.5rem;
          color: #1a365d;
          font-weight: 700;
          letter-spacing: 2px;
          margin: 0 0 2px;
        }

        .lp-subtitle {
          font-size: 0.65rem;
          color: #718096;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin: 0;
        }

        /* ===== PARTE BASSA ===== */
        .lp-bottom {
          background: linear-gradient(180deg, #1a365d 0%, #1e3a5f 100%);
          padding: 24px 36px 32px;
        }

        /* ===== ERRORE ===== */
        .lp-error {
          background: rgba(255,100,100,0.15);
          border: 1px solid rgba(255,100,100,0.3);
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 14px;
          color: #ff8a8a;
          font-size: 0.82rem;
        }

        /* ===== CAMPI ===== */
        .lp-field {
          display: flex;
          flex-direction: column;
        }

        .lp-label {
          color: rgba(255,255,255,0.65);
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 6px;
          display: block;
          font-weight: 600;
        }

        .lp-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          color: #fff;
          font-size: 14px;
          outline: none;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }
        .lp-input::placeholder {
          color: rgba(255,255,255,0.3);
        }
        .lp-input:focus {
          border-color: rgba(200,168,78,0.5);
          box-shadow: 0 0 16px rgba(200,168,78,0.1);
          background: rgba(255,255,255,0.13);
        }

        /* ===== OCCHIO PASSWORD ===== */
        .lp-eye {
          position: absolute;
          top: 50%; right: 14px;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,0.35);
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.3s ease;
        }
        .lp-eye:hover {
          color: rgba(255,255,255,0.6);
        }

        /* ===== RIGA RICORDAMI + FORGOT ===== */
        .lp-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
        }

        /* ===== CHECKBOX CUSTOM ===== */
        .lp-check-label {
          display: flex;
          align-items: center;
          cursor: pointer;
          position: relative;
        }
        .lp-check {
          position: absolute;
          opacity: 0;
          width: 0; height: 0;
          pointer-events: none;
        }
        .lp-check-custom {
          width: 16px; height: 16px;
          border-radius: 4px;
          border: 1.5px solid rgba(255,255,255,0.3);
          background: transparent;
          display: inline-block;
          flex-shrink: 0;
          transition: all 0.2s ease;
          position: relative;
        }
        .lp-check:checked + .lp-check-custom {
          background: #C8A84E;
          border-color: #C8A84E;
        }
        .lp-check:checked + .lp-check-custom::after {
          content: '';
          position: absolute;
          left: 4.5px; top: 1.5px;
          width: 5px; height: 9px;
          border: solid #1a1a0a;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        .lp-check-text {
          color: rgba(255,255,255,0.5);
          font-size: 0.78rem;
          margin-left: 8px;
        }

        /* ===== FORGOT ===== */
        .lp-forgot {
          background: none;
          border: none;
          color: rgba(200,168,78,0.5);
          font-size: 0.78rem;
          cursor: pointer;
          transition: color 0.3s ease;
          padding: 0;
        }
        .lp-forgot:hover {
          color: rgba(200,168,78,0.9);
        }

        /* ===== BOTTONE ===== */
        .lp-btn {
          width: 100%;
          padding: 14px;
          margin-top: 20px;
          border: none;
          background: linear-gradient(135deg, #B8942E, #D4AF37, #C8A84E);
          color: #1a1a0a;
          font-weight: 700;
          font-size: 0.82rem;
          letter-spacing: 2px;
          text-transform: uppercase;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(200,168,78,0.3);
        }
        .lp-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(200,168,78,0.4);
          filter: brightness(1.1);
        }
        .lp-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .lp-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ===== FOOTER ===== */
        .lp-footer {
          color: rgba(255,255,255,0.3);
          font-size: 0.7rem;
          text-align: center;
          margin-top: 20px;
          position: relative;
          z-index: 1;
        }

        /* ===== MODAL ===== */
        .lp-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 50;
          animation: lp-fadeIn 0.2s ease;
        }
        .lp-modal {
          max-width: 380px;
          width: 90%;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 24px 48px rgba(0,0,0,0.3);
          padding: 30px;
          position: relative;
          animation: lp-fadeSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) both;
        }
        .lp-modal-close {
          position: absolute;
          top: 14px; right: 14px;
          background: none;
          border: none;
          color: #a0aec0;
          cursor: pointer;
          padding: 4px;
          display: flex;
          transition: color 0.3s ease;
        }
        .lp-modal-close:hover {
          color: #4a5568;
        }
        .lp-modal-title {
          font-size: 1.3rem;
          color: #1a365d;
          font-weight: 700;
          margin: 0 0 6px;
        }
        .lp-modal-desc {
          color: #718096;
          font-size: 0.85rem;
          margin: 0 0 22px;
          line-height: 1.5;
        }

        /* Modal — stili input/label override */
        .lp-label-modal {
          color: #4a5568;
        }
        .lp-input-modal {
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          color: #1a365d;
          border-radius: 10px;
        }
        .lp-input-modal::placeholder {
          color: #a0aec0;
        }
        .lp-input-modal:focus {
          border-color: #C8A84E;
          box-shadow: 0 0 12px rgba(200,168,78,0.12);
          background: #fff;
        }

        .lp-modal-msg {
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 16px;
          font-size: 0.85rem;
        }
        .lp-modal-msg-ok {
          background: #f0fff4;
          border: 1px solid #c6f6d5;
          color: #276749;
        }
        .lp-modal-msg-err {
          background: #fff5f5;
          border: 1px solid #fed7d7;
          color: #c53030;
        }

        /* ===== ANIMAZIONI ===== */
        @keyframes lp-fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lp-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Login;
