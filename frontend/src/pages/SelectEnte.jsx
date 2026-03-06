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

      {/* Header bianco */}
      <div className="se-header">
        <div className="se-header-inner">
          <div className="se-header-left">
            <img src="/logo-diocesi.png" alt="Diocesi" className="se-logo" style={{verticalAlign:'middle'}} />
            <div className="se-brand">
              <span className="se-brand-title">EcclesiaWeb</span>
              <span className="se-brand-sub">Sistema Gestionale Parrocchiale</span>
            </div>
          </div>
          <div className="se-header-right">
            <span className="se-user-name">{nomeUtente}</span>
            <button onClick={logout} className="se-esci">Esci</button>
          </div>
        </div>
      </div>

      {/* Onda bianca */}
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none"
        style={{display:'block',width:'100%',height:'80px'}}>
        <path d="M0,0 L1440,0 L1440,40 C1100,80 800,20 500,55
          C300,75 100,45 0,40 Z" fill="white"/>
      </svg>

      {/* Contenuto */}
      <div className="se-content">
        <p className="se-title">SELEZIONA ENTE</p>

        {error && <div className="se-error">{error}</div>}

        {enti.length === 0 ? (
          <div className="se-empty">Nessun ente disponibile</div>
        ) : (
          <div className="se-grid">
            {enti.map((ente, index) => (
              <div key={ente.id} className="se-card"
                onClick={() => selectEnte(ente)}
                style={{animationDelay:`${index*0.1}s`, cursor:'pointer'}}>

              {/* Parte bianca */}
              <div className="se-card-top">
                <img src={chiesaImg} alt="" className="se-chiesa" />
                <h3 className="se-card-nome">{ente.denominazione}</h3>
                <p className="se-card-luogo">
                  {ente.comune}{ente.provincia && ` (${ente.provincia})`}
                </p>
              </div>

              {/* Parte blu */}
              <div className="se-card-bottom">
                <div className="se-badge-ruolo-row">
                  <span className="se-badge se-badge-ruolo">{ente.ruolo}</span>
                </div>
                <div className="se-badge-moduli-row">
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

              </div>

            </div>
          ))}
        </div>
      )}
      </div>

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
    background: linear-gradient(135deg, #1a365d 0%, #2c5282 40%, #2b6cb0 70%, #1a365d 100%);
    position: relative;
    overflow-x: hidden;
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
    background: #ffffff;
    padding: 16px 40px 14px;
    position: relative;
    z-index: 2;
  }

  .se-header-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 800px;
    margin: 0 auto;
  }

  .se-header-left {
    display: flex;
    align-items: flex-end;
    gap: 16px;
  }

  .se-logo {
    width: 150px;
    height: auto;
  }

  .se-brand {
    display: flex;
    flex-direction: column;
  }

  .se-brand-title {
    font-size: 2rem;
    font-weight: 700;
    color: #1a365d;
    letter-spacing: 2px;
    line-height: 1.2;
  }

  .se-brand-sub {
    font-size: 0.6rem;
    color: #718096;
    text-transform: uppercase;
    letter-spacing: 3px;
  }

  .se-header-right {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .se-user-name {
    font-size: 1.15rem;
    font-weight: 700;
    color: #1a365d;
  }

  .se-esci {
    background: rgba(255,100,100,0.1);
    border: 1px solid rgba(255,100,100,0.25);
    color: #e53e3e;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 8px 18px;
    border-radius: 8px;
    cursor: pointer;
    align-self: stretch;
    transition: all 0.3s ease;
  }
  .se-esci:hover {
    background: rgba(255,100,100,0.2);
    border-color: rgba(255,100,100,0.4);
  }

  /* ===== CONTENT ===== */
  .se-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 40px 20px 40px 60px;
    position: relative;
    z-index: 1;
    flex: 1;
  }

  .se-title {
    font-size: 1.6rem;
    font-weight: 700;
    color: #ffffff;
    text-transform: uppercase;
    letter-spacing: 3px;
    margin: 0 0 30px;
    text-align: center;
    align-self: center;
    animation: se-fadeSlideUp 0.5s ease-out both;
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
    width: 100%;
    text-align: center;
  }

  /* ===== EMPTY ===== */
  .se-empty {
    color: rgba(255,255,255,0.4);
    font-size: 1rem;
    text-align: center;
    padding: 60px 20px;
  }

  /* ===== GRID ===== */
  .se-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    max-width: 360px;
    width: 100%;
    margin-left: 0;
    margin-right: auto;
  }

  /* ===== CARD ===== */
  .se-card {
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 16px 50px rgba(0,0,0,0.25);
    overflow: hidden;
    animation: se-fadeSlideUp 0.7s ease-out both;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  .se-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 24px 60px rgba(0,0,0,0.35);
  }

  /* ===== CARD PARTE ALTA ===== */
  .se-card-top {
    padding: 3px 20px 4px;
    text-align: center;
    border-bottom: 1px solid #e2e8f0;
  }

  .se-chiesa {
    width: 170px;
    height: 170px;
    object-fit: contain;
    display: block;
    margin: 0 auto 2px;
    opacity: 0.85;
  }

  .se-card-nome {
    font-size: 1.05rem;
    color: #1a365d;
    font-weight: 700;
    margin: 0 0 4px;
    line-height: 1.3;
  }

  .se-card-luogo {
    font-size: 0.78rem;
    color: #718096;
    margin: 0;
  }

  /* ===== CARD PARTE BASSA ===== */
  .se-card-bottom {
    background: linear-gradient(180deg, #1a365d 0%, #1e3a5f 100%);
    padding: 12px 20px 16px;
  }

  /* ===== BADGE ===== */
  .se-badge-ruolo-row {
    display: flex;
    justify-content: center;
    margin-bottom: 8px;
  }

  .se-badge-moduli-row {
    display: flex;
    flex-wrap: nowrap;
    justify-content: center;
    gap: 6px;
    margin-bottom: 12px;
  }

  .se-badge {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    padding: 4px 12px;
    border-radius: 20px;
    letter-spacing: 0.5px;
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

  /* ===== FOOTER ===== */
  .se-footer {
    color: rgba(255,255,255,0.25);
    font-size: 0.68rem;
    text-align: center;
    margin-top: 30px;
    padding-bottom: 20px;
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
