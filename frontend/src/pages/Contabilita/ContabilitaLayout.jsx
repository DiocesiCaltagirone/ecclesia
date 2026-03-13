import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import FormMovimentoGlobale from './FormMovimentoGlobale';
import api from '../../services/api';

const ContabilitaLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showModalConto, setShowModalConto] = useState(false);
  const [formConto, setFormConto] = useState({
    tipo: 'banca',
    nome: '',
    numero: '',
    saldo_iniziale: 0,
    data_inizio: new Date().toISOString().split('T')[0]
  });
  const [showModalTransazione, setShowModalTransazione] = useState(false);
  const [categorie, setCategorie] = useState([]);

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
    const caricaCategorie = async () => {
      try {
        const categorieResponse = await api.get('/api/contabilita/categorie');
        setCategorie(categorieResponse.data.categorie || []);
      } catch (error) {
      }
    };
    caricaCategorie();
  }, []);

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

  const handleSubmitConto = async (e) => {
    e.preventDefault();

    const saldoStr = String(formConto.saldo_iniziale).replace(',', '.');
    const payload = {
      tipo: formConto.tipo,
      nome: formConto.nome,
      saldo_iniziale: parseFloat(saldoStr) || 0,
      data_inizio: formConto.data_inizio
    };

    try {
      await api.post('/api/contabilita/registri', payload);
      setShowModalConto(false);
      setFormConto({ tipo: 'banca', nome: '', numero: '', saldo_iniziale: 0, data_inizio: new Date().toISOString().split('T')[0] });
      window.location.reload();
    } catch (error) {
      if (error.response && error.response.status !== 401) {
        alert('Errore: ' + JSON.stringify(error.response?.data || error.message));
      }
    }
  };

  const handleSaveTransazione = async (payload) => {
    try {
      await api.post('/api/contabilita/movimenti', payload);
      window.location.reload();
    } catch (error) {
      if (error.response && error.response.status !== 401) {
        alert('Errore: ' + JSON.stringify(error.response?.data || error.message));
      }
    }
  };

  return (
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
            <button
              onClick={() => setShowModalTransazione(true)}
              className="px-2 py-2 text-sm font-semibold text-green-600 border-b-2 border-transparent hover:text-green-700 transition-colors"
            >
              + Aggiungi transazione
            </button>
          </div>
        </div>
      </div>

      {/* CONTENUTO */}
      <div className="flex-1 overflow-auto p-4">
        <Outlet />
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

              {/* DATA INIZIO CONTABILITÀ */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Data inizio contabilità <span className="text-gray-400">(opzionale)</span>
                </label>
                <p className="text-[10px] text-gray-500 mb-1.5 leading-tight">
                  📅 Da quale data iniziare a registrare i movimenti
                </p>
                <input
                  type="date"
                  value={formConto.data_inizio || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormConto({
                    ...formConto,
                    data_inizio: e.target.value
                  })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Saldo iniziale <span className="text-gray-400">(opzionale)</span>
                </label>
                <p className="text-[10px] text-gray-500 mb-1.5 leading-tight">
                  💡 Saldo iniziale del conto (anche negativo per scoperti)
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-gray-500 text-sm">€</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formConto.saldo_iniziale}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || val === '-' || /^-?\d*[.,]?\d{0,2}$/.test(val)) {
                        setFormConto({ ...formConto, saldo_iniziale: val });
                      }
                    }}
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
                    setFormConto({ tipo: 'banca', nome: '', numero: '', saldo_iniziale: 0, data_inizio: new Date().toISOString().split('T')[0] });
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
