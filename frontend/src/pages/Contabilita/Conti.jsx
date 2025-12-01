import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Conti = () => {
  const navigate = useNavigate();

  const [conti, setConti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConto, setEditingConto] = useState(null);
  const [formData, setFormData] = useState({
    tipo: 'banca',
    nome: '',
    numero: '',
    saldo_iniziale: 0
  });

  // Tipi di conto con icone
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
    fetchConti();
  }, []);

  const fetchConti = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const enteId = localStorage.getItem('ente_id');

      const response = await fetch('/api/contabilita/registri', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Ente-Id': enteId
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConti(data);
      }
    } catch (error) {
      console.error('Errore caricamento conti:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const enteId = localStorage.getItem('ente_id');
      const url = editingConto
        ? `/api/contabilita/registri/${editingConto.id}`
        : '/api/contabilita/registri';

      const method = editingConto ? 'PUT' : 'POST';

      const payload = {
        tipo: formData.tipo,
        nome: formData.nome,
        iban: formData.numero,
        saldo_iniziale: 0.00
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Ente-Id': enteId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        fetchConti();
        closeModal();
      }
    } catch (error) {
      console.error('Errore salvataggio conto:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questo conto?')) return;

    try {
      const token = localStorage.getItem('token');
      const enteId = localStorage.getItem('ente_id');
      const response = await fetch(`/api/contabilita/registri/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Ente-Id': enteId
        }
      });

      if (response.ok) {
        fetchConti();
      }
    } catch (error) {
      console.error('Errore eliminazione conto:', error);
    }
  };

  const openModal = (conto = null) => {
    if (conto) {
      setEditingConto(conto);
      setFormData({
        tipo: conto.tipo,
        nome: conto.nome,
        numero: conto.iban || '',
        saldo_iniziale: conto.saldo_iniziale || 0
      });
    } else {
      setEditingConto(null);
      setFormData({ tipo: 'banca', nome: '', numero: '', saldo_iniziale: 0 });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingConto(null);
    setFormData({ tipo: 'banca', nome: '', numero: '', saldo_iniziale: 0 });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Raggruppa conti per tipo
  const contiRaggruppati = conti.reduce((acc, conto) => {
    const tipo = conto.tipo;
    if (!acc[tipo]) {
      acc[tipo] = [];
    }
    acc[tipo].push(conto);
    return acc;
  }, {});

  // Calcola totale generale
  const totaleGenerale = conti.reduce((sum, conto) => sum + (conto.saldo_attuale || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conti.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">Nessun conto configurato.</p>
          <p className="text-xs text-gray-400 mt-1">Clicca "+ Aggiungi Conto" nel menu.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="px-3 py-1.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Conto
                </th>
                <th className="px-3 py-1.5 text-right text-xs font-bold text-gray-700 uppercase tracking-wide w-32">
                  Saldo
                </th>
                <th className="px-3 py-1.5 text-center text-xs font-bold text-gray-700 uppercase tracking-wide w-24">
                  Visualizza
                </th>
                <th className="px-3 py-1.5 text-center text-xs font-bold text-gray-700 uppercase tracking-wide w-24">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(contiRaggruppati).map(([tipo, contiGruppo], groupIndex) => {
                const totaleTipo = contiGruppo.reduce((sum, c) => sum + (c.saldo_attuale || 0), 0);

                return (
                  <React.Fragment key={tipo}>
                    {/* Riga Tipo (header gruppo) */}
                    <tr className="bg-blue-50 border-t border-gray-200">
                      <td colSpan="4" className="px-3 py-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{tipiConto[tipo]?.icon || '💰'}</span>
                          <span className="text-xs font-bold text-blue-900">
                            {tipiConto[tipo]?.label || tipo}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Righe conti del gruppo */}
                    {contiGruppo.map((conto, index) => (
                      <tr key={conto.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-1.5">
                          <div className="text-sm font-medium text-gray-900">{conto.nome}</div>
                          {conto.iban && (
                            <div className="text-xs text-gray-500 font-mono mt-0.5">{conto.iban}</div>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <div className="text-sm font-bold text-gray-900 font-mono">
                            €{formatCurrency(conto.saldo_attuale)}
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <button
                            onClick={() => navigate(`/contabilita/conti/${conto.id}/movimenti`)}
                            className="text-gray-600 hover:text-blue-600 transition-colors"
                            title="Visualizza movimenti"
                          >
                            <svg className="w-5 h-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openModal(conto)}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="Modifica"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(conto.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Elimina"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Riga Subtotale */}
                    <tr className="bg-blue-50 border-b-2 border-blue-200">
                      <td className="px-3 py-1.5 text-xs font-bold text-blue-900">
                        Subtotale {tipiConto[tipo]?.label || tipo}
                      </td>
                      <td className="px-3 py-1.5 text-right text-xs font-bold text-blue-900 font-mono">
                        €{formatCurrency(totaleTipo)}
                      </td>
                      <td></td>
                      <td></td>
                    </tr>

                    {/* Spazio tra gruppi */}
                    {groupIndex < Object.keys(contiRaggruppati).length - 1 && (
                      <tr>
                        <td colSpan="4" className="h-2 bg-gray-50"></td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {/* TOTALE GENERALE */}
              <tr className="bg-blue-100 border-t-2 border-blue-600">
                <td className="px-3 py-2 text-sm font-bold text-blue-900 uppercase">
                  Totale Generale
                </td>
                <td className="px-3 py-2 text-right text-sm font-bold text-blue-900 font-mono">
                  €{formatCurrency(totaleGenerale)}
                </td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Modifica */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                {editingConto ? 'Modifica Conto' : 'Nuovo Conto'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo Conto *</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
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
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
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
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500"
                  placeholder="IT00X... / 1234 5678"
                />
              </div>

              {/* ✅ NUOVO CAMPO SALDO INIZIALE */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Saldo iniziale <span className="text-gray-400">(opzionale)</span>
                </label>
                <p className="text-[10px] text-gray-500 mb-1.5 leading-tight">
                  💡 Saldo iniziale del conto (non modificare se già in uso)
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-gray-500 text-sm">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.saldo_iniziale}
                    onChange={(e) => setFormData({
                      ...formData,
                      saldo_iniziale: parseFloat(e.target.value) || 0
                    })}
                    className="w-full pl-7 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    disabled={editingConto !== null}
                  />
                </div>
                {editingConto && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    ⚠️ Modificare il saldo iniziale dopo aver già usato il conto può causare discrepanze
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold transition-colors"
                >
                  {editingConto ? 'Salva' : 'Crea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Conti;