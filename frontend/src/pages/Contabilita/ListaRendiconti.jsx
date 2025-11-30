import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ListaRendiconti = () => {
  const navigate = useNavigate();
  const [rendiconti, setRendiconti] = useState([]);
  const [showMotivoModal, setShowMotivoModal] = useState(false);
  const [motivoDettaglio, setMotivoDettaglio] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const enteId = localStorage.getItem('ente_id');
  const headers = { 'Authorization': `Bearer ${token}`, 'X-Ente-Id': enteId };

  useEffect(() => {
    caricaRendiconti();
  }, []);

  const caricaRendiconti = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/contabilita/rendiconti', { headers });
      if (res.ok) {
        const data = await res.json();
        setRendiconti(data.rendiconti || []);
      }
    } catch (error) {
      console.error('Errore caricamento rendiconti:', error);
    } finally {
      setLoading(false);
    }
  };

  const visualizzaMotivo = async (rendiconto) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/contabilita/rendiconti/${rendiconto.id}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error('Errore caricamento dettagli');
      }

      const data = await response.json();
      setMotivoDettaglio(data);
      setShowMotivoModal(true);
    } catch (error) {
      console.error('Errore caricamento motivo:', error);
      alert('Errore nel caricamento dei dettagli');
    }
  };

  const eliminaRendiconto = async (rendicontoId) => {
    if (!confirm('Sei sicuro di voler eliminare questo rendiconto?')) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/api/contabilita/rendiconti/${rendicontoId}`,
        {
          method: 'DELETE',
          headers
        }
      );

      if (!response.ok) {
        throw new Error('Errore eliminazione');
      }

      alert('Rendiconto eliminato con successo');
      setShowMotivoModal(false);
      caricaRendiconti();
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Errore nell\'eliminazione del rendiconto');
    }
  };

  const downloadPdf = async (rendicontoId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/contabilita/rendiconti/${rendicontoId}/pdf`, { headers });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rendiconto_${rendicontoId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Errore download:', error);
    }
  };

  const getBadgeStato = (stato, rendiconto) => {
    const badges = {
      'bozza': (
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
          📝 Bozza
        </span>
      ),
      'in_revisione': (
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
          🔍 In Revisione
        </span>
      ),
      'approvato': (
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
          ✅ Approvato
        </span>
      ),
      'respinto': (
        <button
          onClick={() => visualizzaMotivo(rendiconto)}
          className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold hover:bg-red-200 cursor-pointer"
          title="Clicca per vedere il motivo"
        >
          🔴 Respinto
        </button>
      )
    };

    return badges[stato] || null;
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Invio</th>
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
                    € {rend.totale_entrate.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-red-600 font-semibold">
                    € {rend.totale_uscite.toFixed(2)}
                  </td>
                  <td className={`px-6 py-4 text-sm text-right font-bold ${rend.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    € {rend.saldo.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {rend.data_invio ? new Date(rend.data_invio).toLocaleDateString('it-IT') : '-'}
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

                      {/* Elimina solo se BOZZA o RESPINTO */}
                      {(rend.stato === 'bozza' || rend.stato === 'respinto') && (
                        <button
                          onClick={() => eliminaRendiconto(rend.id)}
                          className="text-red-600 hover:text-red-800 text-xl"
                          title={`Elimina rendiconto ${rend.stato}`}
                        >
                          🗑️
                        </button>
                      )}

                      {/* Riprendi se BOZZA */}
                      {rend.stato === 'bozza' && (
                        <button
                          onClick={() => navigate('/contabilita/rendiconto/nuovo')}
                          className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                          title="Riprendi e completa"
                        >
                          ↗️ Riprendi
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
                      `http://localhost:8000/api/contabilita/rendiconti/allegati/${motivoDettaglio.allegato_id}/download`,
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
                onClick={() => eliminaRendiconto(motivoDettaglio.id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                🗑️ Elimina Rendiconto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaRendiconti;