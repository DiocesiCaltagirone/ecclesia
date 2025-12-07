import React, { useState, useEffect } from 'react';
import HeaderAmministrazione from '../components/HeaderAmministrazione';

const EconomatoContabilita = () => {
  const [rendiconti, setRendiconti] = useState([]);
  const [filtroInviato, setFiltroInviato] = useState(true);
  const [filtroRespinti, setFiltroRespinti] = useState(false);
  const [filtroApprovati, setFiltroApprovati] = useState(false);
  const [filtroParrocchia, setFiltroParrocchia] = useState(false);
  const [filtroDefinitivo, setFiltroDefinitivo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filtroStato, setFiltroStato] = useState('');
  const [filtroComune, setFiltroComune] = useState('');
  const [filtroRicerca, setFiltroRicerca] = useState('');
  const [modalOsservazioni, setModalOsservazioni] = useState(null);
  const [osservazioni, setOsservazioni] = useState('');
  const [azione, setAzione] = useState(null);
  const [motivoRespingimento, setMotivoRespingimento] = useState('');
  const [allegatoRespingimento, setAllegatoRespingimento] = useState(null);


  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    caricaRendiconti();
  }, [filtroStato, filtroComune, filtroRicerca]);

  const caricaRendiconti = async () => {
    try {
      let url = '/api/contabilita/economo/rendiconti?';
      if (filtroStato) url += `stato=${filtroStato}&`;
      if (filtroComune) url += `comune=${filtroComune}`;
      if (filtroRicerca) url += `comune=${filtroRicerca}`;

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setRendiconti(data.rendiconti || []);
      }
    } catch (error) {
      console.error('Errore caricamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAzione = async (rendicontoId, tipo) => {
    setAzione(rendicontoId);

    try {
      if (tipo === 'approva') {
        // APPROVA
        const url = `/api/contabilita/economo/rendiconti/${rendicontoId}/approva`;
        const res = await fetch(url, {
          method: 'POST',
          headers
        });

        if (res.ok) {
          alert('Rendiconto approvato!');
          setModalOsservazioni(null);
          await caricaRendiconti();
        } else {
          alert('Errore durante l\'approvazione');
        }
      } else {
        // RESPINGI (CON MOTIVO + ALLEGATO)
        if (!motivoRespingimento.trim()) {
          alert('Il motivo è obbligatorio');
          setAzione(null);
          return;
        }

        const formData = new FormData();
        formData.append('motivo', motivoRespingimento);

        if (allegatoRespingimento) {
          formData.append('allegato', allegatoRespingimento);
        }

        const res = await fetch(
          `/api/contabilita/economo/rendiconti/${rendicontoId}/respingi`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          }
        );

        if (res.ok) {
          alert('Rendiconto respinto con successo');
          setModalOsservazioni(null);
          setOsservazioni('');
          setMotivoRespingimento('');
          setAllegatoRespingimento(null);
          await caricaRendiconti();
        } else {
          alert('Errore durante il respingimento');
        }
      }
    } catch (error) {
      console.error('Errore:', error);
      alert('Errore di connessione');
    } finally {
      setAzione(null);
    }
  };

  const downloadPdf = async (rendicontoId) => {
    try {
      const res = await fetch(`/api/contabilita/rendiconti/${rendicontoId}/pdf`, { headers });
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

  const getBadgeStato = (stato) => {
    const badges = {
      'parrocchia': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '📝 Parrocchia' },
      'definitivo': { bg: 'bg-gray-100', text: 'text-gray-800', label: '📌 Definitivo' },
      'inviato': { bg: 'bg-blue-100', text: 'text-blue-800', label: '📤 Inviato' },
      'approvato': { bg: 'bg-green-100', text: 'text-green-800', label: '✅ Approvato' },
      'respinto': { bg: 'bg-red-100', text: 'text-red-800', label: '❌ Respinto' }
    };
    const badge = badges[stato] || { bg: 'bg-gray-100', text: 'text-gray-600', label: stato };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const handleReset = () => {
    setFiltroStato('');
    setFiltroComune('');
    setFiltroRicerca('');
  };

  // Filtra rendiconti in base ai checkbox
  const rendicontiFiltrati = rendiconti.filter(r => {
    if (filtroInviato && r.stato === 'inviato') return true;
    if (filtroRespinti && r.stato === 'respinto') return true;
    if (filtroApprovati && r.stato === 'approvato') return true;
    if (filtroParrocchia && r.stato === 'parrocchia') return true;
    if (filtroDefinitivo && r.stato === 'definitivo') return true;
    return false;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Caricamento rendiconti...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Riutilizzabile */}
      <HeaderAmministrazione />

      {/* CONTENUTO PRINCIPALE */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Titolo Pagina + Torna Home */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Contabilità</h2>
              <p className="text-sm text-gray-600">Gestione e revisione rendiconti di tutte le parrocchie della diocesi</p>
            </div>
          </div>

          <button
            onClick={() => window.location.href = '/amministrazione'}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Torna alla Home
          </button>
        </div>

        {/* Filtri Compatti - TUTTO SU UNA RIGA */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
          {/* Checkbox Filtri Stato */}
          <div className="mb-3 pb-3 border-b border-gray-200 flex gap-6 items-center">
            <span className="text-sm font-semibold text-gray-700">Mostra:</span>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filtroInviato}
                onChange={(e) => setFiltroInviato(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">📤 Inviati</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filtroRespinti}
                onChange={(e) => setFiltroRespinti(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">❌ Respinti</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filtroApprovati}
                onChange={(e) => setFiltroApprovati(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">✅ Approvati</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filtroParrocchia}
                onChange={(e) => setFiltroParrocchia(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">📝 Parrocchia</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filtroDefinitivo}
                onChange={(e) => setFiltroDefinitivo(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">📌 Definitivi</span>
            </label>

          </div>

          <div className="flex items-end gap-3"></div>
          <div className="flex items-end gap-3">

            {/* Comune */}
            <div className="w-56">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Comune</label>
              <input
                type="text"
                value={filtroComune}
                onChange={(e) => setFiltroComune(e.target.value)}
                placeholder="Filtra per comune..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Stato */}
            <div className="w-56">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Stato</label>
              <select
                value={filtroStato}
                onChange={(e) => setFiltroStato(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tutti</option>
                <option value="parrocchia">Parrocchia</option>
                <option value="definitivo">Definitivo</option>
                <option value="inviato">Inviato</option>
                <option value="approvato">Approvato</option>
                <option value="respinto">Respinto</option>
              </select>
            </div>

            {/* Cerca (Ricerca Libera) */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Cerca</label>
              <input
                type="text"
                value={filtroRicerca}
                onChange={(e) => setFiltroRicerca(e.target.value)}
                placeholder="Cerca parrocchia, comune, provincia..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300"
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {/* Tabella Rendiconti */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Comune</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Parrocchia</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Periodo</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Stato</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Documenti</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Saldo</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rendicontiFiltrati.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-16 h-16 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-500 font-medium">Nessun rendiconto trovato</p>
                      <p className="text-sm text-gray-400 mt-1">Prova a modificare i filtri di ricerca</p>
                    </div>
                  </td>
                </tr>
              ) : (
                rendicontiFiltrati.map((rend, index) => (
                  <tr key={rend.id} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {rend.comune} <span className="text-gray-500">({rend.provincia})</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{rend.parrocchia}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(rend.periodo_inizio).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(rend.periodo_fine).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-center">{getBadgeStato(rend.stato)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold ${rend.num_documenti >= 5 ? 'text-green-600' : 'text-orange-600'
                        }`}>
                        {rend.num_documenti || 0} / 5
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-bold whitespace-nowrap ${rend.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      € {rend.saldo.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center items-center gap-2">
                        {/* Download PDF */}
                        <button
                          onClick={() => downloadPdf(rend.id)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Scarica PDF"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>

                        {rend.stato === 'inviato' && (
                          <>
                            {/* Approva */}
                            <button
                              onClick={() => handleAzione(rend.id, 'approva')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
                              disabled={azione === rend.id}
                              title="Approva rendiconto"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Approva
                            </button>

                            {/* Respingi */}
                            <button
                              onClick={() => setModalOsservazioni(rend.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                              title="Respingi rendiconto"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Respingi
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Info Footer */}
        <div className="mt-4 text-center text-sm text-gray-500">
          Totale rendiconti visualizzati: <span className="font-semibold text-gray-700">{rendicontiFiltrati.length}</span> su {rendiconti.length}
        </div>

        {/* Modal Osservazioni */}
        {modalOsservazioni && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Respingi Rendiconto
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Motivo (obbligatorio) <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      value={motivoRespingimento}
                      onChange={(e) => setMotivoRespingimento(e.target.value)}
                      rows="5"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                      placeholder="Inserisci il motivo del respingimento (es: importi non corretti, documentazione mancante, ecc.)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Documento allegato (opzionale)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => setAllegatoRespingimento(e.target.files[0])}
                      className="w-full border-2 border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                    {allegatoRespingimento && (
                      <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        File selezionato: <span className="font-semibold">{allegatoRespingimento.name}</span>
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-gray-500">Il parroco riceverà questa comunicazione e potrà correggere il rendiconto.</p>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                <button
                  onClick={() => {
                    setModalOsservazioni(null);
                    setOsservazioni('');
                    setMotivoRespingimento('');
                    setAllegatoRespingimento(null);
                  }}
                  className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={() => handleAzione(modalOsservazioni, 'respingi')}
                  className="px-5 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
                  disabled={azione === modalOsservazioni}
                >
                  {azione === modalOsservazioni ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Respingimento...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Conferma Respingimento
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EconomatoContabilita;