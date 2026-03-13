import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

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

const ImpostazioniContabilita = () => {
  const navigate = useNavigate();
  const [dataMinima, setDataMinima] = useState(null);

  // Modal conto
  const [showModal, setShowModal] = useState(false);
  const [formConto, setFormConto] = useState({
    tipo: 'banca',
    nome: '',
    numero: '',
    saldo_iniziale: 0,
    data_inizio: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchRendiconto = async () => {
      try {
        const res = await api.get('/api/contabilita/ultimo-rendiconto');
        if (res.data?.periodo_fine) {
          const chiusura = new Date(res.data.periodo_fine);
          chiusura.setDate(chiusura.getDate() + 1);
          setDataMinima(chiusura.toISOString().split('T')[0]);
        }
      } catch {
        // silenzioso
      }
    };
    fetchRendiconto();
  }, []);

  const apriModal = () => {
    setFormConto({ tipo: 'banca', nome: '', numero: '', saldo_iniziale: 0, data_inizio: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  };

  const chiudiModal = () => {
    setShowModal(false);
  };

  const salvaConto = async (e) => {
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
      chiudiModal();
      navigate('/contabilita');
    } catch (err) {
      if (err.response && err.response.status !== 401) {
        alert(err.response?.data?.detail || 'Errore nel salvataggio del conto');
      }
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        {/* SEZIONE CONTI */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-800">Gestione Conti</h3>
          </div>
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-4">
              Crea un nuovo conto corrente, cassa o carta per registrare i movimenti.
            </p>
            <button
              onClick={apriModal}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              + Aggiungi Conto
            </button>
          </div>
        </div>

        {/* SEZIONE CATEGORIE */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-800">Categorie</h3>
          </div>
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-4">
              Gestisci il piano dei conti con categorie e sottocategorie gerarchiche.
            </p>
            <button
              onClick={() => navigate('/contabilita/categoria')}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Gestione Categorie
            </button>
          </div>
        </div>
      </div>

      {/* MODAL AGGIUNGI CONTO */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Nuovo Conto</h3>
              <button onClick={chiudiModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={salvaConto} className="p-4 space-y-3">
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
                  Data inizio contabilita <span className="text-gray-400">(opzionale)</span>
                </label>
                <p className="text-[10px] text-gray-500 mb-1.5 leading-tight">
                  Da quale data iniziare a registrare i movimenti
                </p>
                <input
                  type="date"
                  value={formConto.data_inizio || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormConto({ ...formConto, data_inizio: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                  min={dataMinima || ''}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Saldo iniziale <span className="text-gray-400">(opzionale)</span>
                </label>
                <p className="text-[10px] text-gray-500 mb-1.5 leading-tight">
                  Saldo iniziale del conto (anche negativo per scoperti)
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
                    className="w-full pl-7 pr-3 py-1.5 border border-gray-300 rounded-md text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={chiudiModal}
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
    </div>
  );
};

export default ImpostazioniContabilita;
