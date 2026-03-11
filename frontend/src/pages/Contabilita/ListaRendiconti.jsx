import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters';
import api from '../../services/api';

const ListaRendiconti = () => {
  const navigate = useNavigate();
  const [rendiconti, setRendiconti] = useState([]);
  const [showMotivoModal, setShowMotivoModal] = useState(false);
  const [motivoDettaglio, setMotivoDettaglio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    caricaRendiconti();
  }, []);

  const caricaRendiconti = async () => {
    try {
      const res = await api.get('/api/contabilita/rendiconti');
      setRendiconti(res.data.rendiconti || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const visualizzaMotivo = async (rendiconto) => {
    try {
      const response = await api.get(`/api/contabilita/rendiconti/${rendiconto.id}`);
      setMotivoDettaglio(response.data);
      setShowMotivoModal(true);
    } catch (error) {
      alert('Errore nel caricamento dei dettagli');
    }
  };

  const correggiRendiconto = async (rendicontoId) => {
    if (!confirm('Vuoi correggere il rendiconto? Lo stato tornerà a "Parrocchia" e potrai modificarlo.')) {
      return;
    }
    try {
      await api.post(`/api/contabilita/rendiconti/${rendicontoId}/correggi`);
      alert('Rendiconto riportato in stato Parrocchia. Puoi ora modificarlo e reinviarlo.');
      setShowMotivoModal(false);
      caricaRendiconti();
    } catch (error) {
      if (error.response && error.response.status !== 401) {
        alert('Errore nella correzione del rendiconto');
      }
    }
  };

  const eliminaSoloRendiconto = async (rendicontoId) => {
    if (!confirm('Vuoi eliminare solo il rendiconto?\n\nI movimenti verranno sbloccati.\nI documenti allegati resteranno sul server.')) {
      return;
    }
    try {
      await api.delete(`/api/contabilita/rendiconti/${rendicontoId}?elimina_documenti=false`);
      alert('Rendiconto eliminato. I documenti sono stati mantenuti.');
      setShowMotivoModal(false);
      caricaRendiconti();
    } catch (error) {
      if (error.response && error.response.status !== 401) {
        alert('Errore nell\'eliminazione del rendiconto');
      }
    }
  };

  const eliminaTutto = async (rendicontoId) => {
    if (!confirm('Vuoi eliminare il rendiconto E tutti i documenti allegati?\n\nQuesta azione è irreversibile.')) {
      return;
    }
    try {
      await api.delete(`/api/contabilita/rendiconti/${rendicontoId}?elimina_documenti=true`);
      alert('Rendiconto e documenti eliminati con successo.');
      setShowMotivoModal(false);
      caricaRendiconti();
    } catch (error) {
      if (error.response && error.response.status !== 401) {
        alert('Errore nell\'eliminazione del rendiconto');
      }
    }
  };

  const downloadPdf = async (rendicontoId) => {
    try {
      const res = await api.get(`/api/contabilita/rendiconti/${rendicontoId}/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rendiconto_${rendicontoId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
    }
  };

  const getBadgeStato = (stato, rendiconto) => {
    const badges = {
      'parrocchia': (
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
          📝 Parrocchia
        </span>
      ),
      'definitivo': (
        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
          📌 Definitivo
        </span>
      ),
      'inviato': (
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
          📤 Inviato alla Diocesi
        </span>
      ),
      'approvato': (
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
          ✅ Approvato
        </span>
      ),
      'respinto': (
        <div className="flex flex-col items-start gap-1">
          <button
            onClick={() => visualizzaMotivo(rendiconto)}
            className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold hover:bg-red-200 cursor-pointer"
            title="Clicca per vedere il motivo"
          >
            ❌ Respinto
          </button>
          <button
            onClick={() => visualizzaMotivo(rendiconto)}
            className="text-xs text-red-500 hover:text-red-700 hover:underline cursor-pointer ml-1"
          >
            Clicca per vedere le osservazioni
          </button>
        </div>
      )
    };

    return badges[stato] || <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">{stato}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📚 Lista Rendiconti</h1>
          <p className="text-sm text-gray-600 mt-1">Tutti i rendiconti inviati e in lavorazione</p>
        </div>
        <button
          onClick={() => navigate('/contabilita/rendiconto/nuovo')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuovo Rendiconto
        </button>
      </div>

      {/* Tabella */}
      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periodo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entrate</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Uscite</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DATA CREAZIONE</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rendiconti.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  Nessun rendiconto presente. Crea il primo rendiconto.
                </td>
              </tr>
            ) : (
              rendiconti.map((rend) => (
                <tr key={rend.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(rend.periodo_inizio).toLocaleDateString('it-IT')} - {new Date(rend.periodo_fine).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-6 py-4">{getBadgeStato(rend.stato, rend)}</td>
                  <td className="px-6 py-4 text-sm text-right text-green-600 font-semibold">
                    € {formatCurrency(rend.totale_entrate)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-red-600 font-semibold">
                    € {formatCurrency(rend.totale_uscite)}
                  </td>
                  <td className={`px-6 py-4 text-sm text-right font-bold ${rend.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    € {formatCurrency(rend.saldo)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {rend.created_at ? new Date(rend.created_at).toLocaleDateString('it-IT') : '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => downloadPdf(rend.id)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Scarica PDF"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                      </button>

                      {/* Elimina solo rendiconto (solo PARROCCHIA) */}
                      {rend.stato === 'parrocchia' && (
                        <button
                          onClick={() => eliminaSoloRendiconto(rend.id)}
                          className="text-orange-600 hover:text-orange-800 text-sm font-semibold"
                          title="Elimina solo il rendiconto, i documenti restano"
                        >
                          📄 Elimina rendiconto
                        </button>
                      )}

                      {/* Elimina tutto (PARROCCHIA o RESPINTO) */}
                      {(rend.stato === 'parrocchia' || rend.stato === 'respinto') && (
                        <button
                          onClick={() => eliminaTutto(rend.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-semibold"
                          title="Elimina rendiconto e tutti i documenti allegati"
                        >
                          🗑️ Elimina tutto
                        </button>
                      )}

                      {/* Riprendi/Gestisci se PARROCCHIA */}
                      {rend.stato === 'parrocchia' && (
                        <button
                          onClick={() => navigate(`/contabilita/rendiconto/${rend.id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                          title="Gestisci e invia"
                        >
                          ↗️ Gestisci
                        </button>
                      )}

                      {/* Invia se DEFINITIVO (non ancora inviato) */}
                      {rend.stato === 'definitivo' && (
                        <button
                          onClick={() => navigate(`/contabilita/rendiconto/${rend.id}`)}
                          className="text-green-600 hover:text-green-800 text-sm font-semibold"
                          title="Invia alla Diocesi"
                        >
                          📤 Invia
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Motivo Respingimento */}
      {showMotivoModal && motivoDettaglio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold text-red-600 mb-4">
              ⚠️ RENDICONTO RESPINTO
            </h3>

            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">Data respingimento:</p>
                <p className="font-semibold">
                  {motivoDettaglio.data_respingimento
                    ? new Date(motivoDettaglio.data_respingimento).toLocaleDateString('it-IT')
                    : 'N/A'
                  }
                </p>
              </div>

              <div>
                <p className="font-semibold mb-2">📝 Motivo:</p>
                <div className="p-4 bg-red-50 border border-red-200 rounded">
                  <p className="whitespace-pre-wrap">{motivoDettaglio.motivo_respingimento}</p>
                </div>
              </div>

              {motivoDettaglio.allegato_id && (
                <div className="bg-blue-50 p-3 rounded">
                  <p className="font-semibold mb-2">📄 Documento allegato:</p>
                  <button
                    onClick={() => window.open(
                      `/api/contabilita/rendiconti/allegati/${motivoDettaglio.allegato_id}/download`,
                      '_blank'
                    )}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    ⬇️ Scarica Documento
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowMotivoModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Chiudi
              </button>
              <button
                onClick={() => correggiRendiconto(motivoDettaglio.id)}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                ✏️ Correggi Rendiconto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaRendiconti;