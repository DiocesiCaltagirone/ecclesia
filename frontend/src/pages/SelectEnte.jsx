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
      <div className="se-page">
        <div className="se-loading">
          <svg className="se-spinner" width="40" height="40" fill="none" viewBox="0 0 24 24">
            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p>Caricamento...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="se-page">
      <div className="se-circle" />

      {/* Header: logo + titolo */}
      <div className="se-header">
        <img src="/logo-diocesi.png" alt="Diocesi di Caltagirone" className="se-logo" />
        <h1 className="se-title">EcclesiaWeb</h1>
        <p className="se-subtitle">Seleziona Parrocchia</p>
      </div>

      {/* Utente + Esci */}
      <div className="se-user-bar">
        <span className="se-user-name">{nomeUtente}</span>
        <button onClick={logout} className="se-logout">Esci</button>
      </div>

      {/* Errore */}
      {error && (
        <div className="se-error">{error}</div>
      )}

      {/* Lista enti */}
      {enti.length === 0 ? (
        <div className="se-empty">
          <p>Nessuna parrocchia disponibile</p>
        </div>
      ) : (
        <div className="se-grid">
          {enti.map((ente, index) => (
            <div
              key={ente.id}
              className="se-card"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Parte alta — bianca con immagine chiesa */}
              <div className="se-card-top">
                <img src={chiesaImg} alt="" className="se-chiesa-img" />
                <h3 className="se-card-nome">{ente.denominazione}</h3>
                <p className="se-card-luogo">
                  {ente.comune} {ente.provincia && `(${ente.provincia})`}
                </p>
              </div>

              {/* Parte bassa — scura con badge e bottone */}
              <div className="se-card-bottom">
                {/* Ruolo */}
                <div className="se-badge-row">
                  <span className="se-badge se-badge-ruolo">{ente.ruolo}</span>
                </div>

                {/* Moduli */}
                <div className="se-badge-row">
                  {ente.permessi?.anagrafica && (
                    <span className="se-badge se-badge-modulo">Anagrafica</span>
                  )}
                  {ente.permessi?.contabilita && (
                    <span className="se-badge se-badge-modulo">Contabilità</span>
                  )}
                  {ente.permessi?.inventario && (
                    <span className="se-badge se-badge-modulo">Inventario</span>
                  )}
                </div>

                <button
                  onClick={() => selectEnte(ente)}
                  className="se-btn"
                >
                  Accedi
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <p className="se-footer">&copy; 2025 Diocesi di Caltagirone</p>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .se-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: linear-gradient(135deg, #1a365d 0%, #2c5282 40%, #2b6cb0 70%, #1a365d 100%);
    position: relative;
    overflow-x: hidden;
    padding: 30px 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .se-circle {
    position: absolute;
    width: 600px; height: 600px;
    border-radius: 50%;
    background: rgba(255,255,255,0.03);
    filter: blur(60px);
    top: -200px; right: -200px;
    pointer-events: none;
  }

  /* ===== LOADING ===== */
  .se-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: rgba(255,255,255,0.6);
    font-size: 0.9rem;
  }
  .se-spinner {
    color: #C8A84E;
    animation: se-spin 1s linear infinite;
    margin-bottom: 12px;
  }

  /* ===== HEADER ===== */
  .se-header {
    text-align: center;
    margin-bottom: 8px;
    position: relative;
    z-index: 1;
    animation: se-fadeSlideUp 0.5s ease-out both;
  }

  .se-logo {
    width: 160px;
    height: auto;
    display: block;
    margin: 0 auto 12px;
  }

  .se-title {
    font-size: 1.5rem;
    color: #ffffff;
    font-weight: 700;
    letter-spacing: 2px;
    margin: 0 0 2px;
  }

  .se-subtitle {
    font-size: 0.65rem;
    color: rgba(255,255,255,0.5);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin: 0;
  }

  /* ===== USER BAR ===== */
  .se-user-bar {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 16px 0 24px;
    position: relative;
    z-index: 1;
    animation: se-fadeSlideUp 0.6s ease-out both;
  }

  .se-user-name {
    color: rgba(255,255,255,0.6);
    font-size: 0.85rem;
  }

  .se-logout {
    background: rgba(255,100,100,0.15);
    border: 1px solid rgba(255,100,100,0.25);
    color: #ff8a8a;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 6px 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  .se-logout:hover {
    background: rgba(255,100,100,0.25);
    border-color: rgba(255,100,100,0.4);
  }

  /* ===== ERRORE ===== */
  .se-error {
    background: rgba(255,100,100,0.15);
    border: 1px solid rgba(255,100,100,0.3);
    border-radius: 10px;
    padding: 12px 18px;
    margin-bottom: 20px;
    color: #ff8a8a;
    font-size: 0.85rem;
    max-width: 700px;
    width: 90%;
    position: relative;
    z-index: 1;
  }

  /* ===== EMPTY ===== */
  .se-empty {
    color: rgba(255,255,255,0.4);
    font-size: 1rem;
    text-align: center;
    padding: 60px 20px;
    position: relative;
    z-index: 1;
  }

  /* ===== GRID ===== */
  .se-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;
    max-width: 700px;
    width: 90%;
    position: relative;
    z-index: 1;
  }

  /* ===== CARD ===== */
  .se-card {
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    overflow: hidden;
    animation: se-fadeSlideUp 0.7s ease-out both;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  .se-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 28px 70px rgba(0,0,0,0.4);
  }

  /* ===== CARD PARTE ALTA ===== */
  .se-card-top {
    background: #ffffff;
    padding: 28px 28px 18px;
    text-align: center;
  }

  .se-chiesa-img {
    width: 80px;
    height: 80px;
    object-fit: contain;
    display: block;
    margin: 0 auto 14px;
    opacity: 0.85;
  }

  .se-card-nome {
    font-size: 1.1rem;
    color: #1a365d;
    font-weight: 700;
    margin: 0 0 4px;
    line-height: 1.3;
  }

  .se-card-luogo {
    font-size: 0.8rem;
    color: #718096;
    margin: 0;
  }

  /* ===== CARD PARTE BASSA ===== */
  .se-card-bottom {
    background: linear-gradient(180deg, #1a365d 0%, #1e3a5f 100%);
    padding: 18px 28px 24px;
  }

  /* ===== BADGE ===== */
  .se-badge-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    margin-bottom: 10px;
  }

  .se-badge {
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    padding: 4px 12px;
    border-radius: 20px;
  }

  .se-badge-ruolo {
    background: rgba(200,168,78,0.2);
    border: 1px solid rgba(200,168,78,0.35);
    color: #C8A84E;
  }

  .se-badge-modulo {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    color: rgba(255,255,255,0.55);
  }

  /* ===== BOTTONE ORO ===== */
  .se-btn {
    width: 100%;
    padding: 12px;
    margin-top: 6px;
    border: none;
    background: linear-gradient(135deg, #B8942E, #D4AF37, #C8A84E);
    color: #1a1a0a;
    font-weight: 700;
    font-size: 0.78rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 16px rgba(200,168,78,0.3);
  }
  .se-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(200,168,78,0.4);
    filter: brightness(1.1);
  }
  .se-btn:active {
    transform: translateY(0);
  }

  /* ===== FOOTER ===== */
  .se-footer {
    color: rgba(255,255,255,0.3);
    font-size: 0.7rem;
    text-align: center;
    margin-top: 30px;
    position: relative;
    z-index: 1;
  }

  /* ===== ANIMAZIONI ===== */
  @keyframes se-fadeSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes se-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

export default SelectEnte;
