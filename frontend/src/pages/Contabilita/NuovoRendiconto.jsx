import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const NuovoRendiconto = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState({ inizio: '', fine: '' });
  const [rendicontoId, setRendicontoId] = useState(null);
  const [documenti, setDocumenti] = useState([]);
  const [infoRendiconto, setInfoRendiconto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [creando, setCreando] = useState(false);

  const token = localStorage.getItem('token');
  const enteId = localStorage.getItem('ente_id');
  const headers = { 'Authorization': `Bearer ${token}`, 'X-Ente-Id': enteId };

  const tipiDocumento = [
    {
      id: 'verbale_caep',
      label: 'Estratto verbale CAEP',
      descrizione: 'Approvazione bilancio con firme',
      icon: '📄',
      obbligatorio: true
    },
    {
      id: 'estratto_bancario',
      label: 'Estratto Bancario',
      descrizione: 'Completo dell\'anno di riferimento',
      icon: '🏦',
      obbligatorio: true
    },
    {
      id: 'imu_tari',
      label: 'IMU e TARI',
      descrizione: 'Attestazione rilasciata dal Comune',
      icon: '🏛️',
      obbligatorio: true
    },
    {
      id: 'fornitura_idrica',
      label: 'Fornitura Idrica',
      descrizione: 'Certificazione Comune o ente gestore',
      icon: '💧',
      obbligatorio: true
    },
    {
      id: 'agenzia_entrate',
      label: 'Agenzia Entrate',
      descrizione: 'Stampa posizione contributiva',
      icon: '🏢',
      obbligatorio: true
    },
    {
      id: 'altro',
      label: 'Documento Opzionale',
      descrizione: 'Documentazione integrativa',
      icon: '📎',
      obbligatorio: false
    }
  ];

  useEffect(() => {
    verificaBozzaEsistente();
  }, []);

  const verificaBozzaEsistente = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/contabilita/rendiconti?stato=bozza', { headers });
      if (res.ok) {
        const data = await res.json();
        const bozze = data.rendiconti || [];

        if (bozze.length > 0) {
          const bozza = bozze[0];
          setRendicontoId(bozza.id);
          setInfoRendiconto(bozza);
          await caricaDocumenti(bozza.id);
        }
      }
    } catch (error) {
      console.error('Errore verifica bozza:', error);
    } finally {
      setLoading(false);
    }
  };

  const caricaDocumenti = async (id) => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/contabilita/rendiconti/${id}/documenti`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        setDocumenti(data.documenti || []);
      }
    } catch (error) {
      console.error('Errore caricamento documenti:', error);
    }
  };

  const handleCreaRendiconto = async () => {
    if (!periodo.inizio || !periodo.fine) {
      alert('Seleziona entrambe le date');
      return;
    }

    if (new Date(periodo.inizio) > new Date(periodo.fine)) {
      alert('Data inizio deve essere prima della data fine');
      return;
    }

    try {
      setCreando(true);
      const res = await fetch('http://localhost:8000/api/contabilita/rendiconti', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodo_inizio: periodo.inizio,
          periodo_fine: periodo.fine
        })
      });

      if (res.ok) {
        const data = await res.json();
        setRendicontoId(data.id);
        setInfoRendiconto(data);
      } else {
        const error = await res.json();
        alert('Errore: ' + error.detail);
      }
    } catch (error) {
      console.error('Errore creazione rendiconto:', error);
      alert('Errore di connessione');
    } finally {
      setCreando(false);
    }
  };

  const handleUploadDocumento = async (tipoDoc, file) => {
    const formData = new FormData();
    formData.append('tipo_documento', tipoDoc);
    formData.append('file', file);

    try {
      setUploading(true);
      const res = await fetch(
        `http://localhost:8000/api/contabilita/rendiconti/${rendicontoId}/documenti`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'X-Ente-Id': enteId },
          body: formData
        }
      );

      if (res.ok) {
        await caricaDocumenti(rendicontoId);
      } else {
        const error = await res.json();
        alert('Errore: ' + error.detail);
      }
    } catch (error) {
      console.error('Errore upload:', error);
      alert('Errore upload documento');
    } finally {
      setUploading(false);
    }
  };

  const handleEliminaBozza = async () => {
    if (!window.confirm('Sei sicuro di voler eliminare questa bozza?')) {
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:8000/api/contabilita/rendiconti/${rendicontoId}`,
        { method: 'DELETE', headers }
      );

      if (res.ok) {
        alert('Bozza eliminata');
        setRendicontoId(null);
        setInfoRendiconto(null);
        setDocumenti([]);
        setPeriodo({ inizio: '', fine: '' });
      } else {
        alert('Errore eliminazione bozza');
      }
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Errore di connessione');
    }
  };

  const handleInviaDiocesi = async () => {
    if (!window.confirm('Confermi l\'invio alla Diocesi? Non potrai più modificare il rendiconto.')) {
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:8000/api/contabilita/rendiconti/${rendicontoId}/invia`,
        { method: 'POST', headers }
      );

      if (res.ok) {
        alert('✅ Rendiconto inviato con successo alla Diocesi!');
        navigate('/contabilita/rendiconto/lista');
      } else {
        const error = await res.json();
        alert('Errore: ' + error.detail);
      }
    } catch (error) {
      console.error('Errore invio:', error);
      alert('Errore di connessione');
    }
  };

  const downloadPdf = async () => {
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

  const documentiCaricati = documenti.map(d => d.tipo_documento);
  const haEsonero = infoRendiconto?.documenti_esonero || false;
  const documentiObbligatoriCaricati = haEsonero || tipiDocumento
    .filter(t => t.obbligatorio)
    .every(t => documentiCaricati.includes(t.id));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">

      {/* PROGRESS BAR ITER */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${rendicontoId ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
              }`}>
              {rendicontoId ? '✓' : '1'}
            </div>
            <span className="text-sm font-semibold">Crea Rendiconto</span>
          </div>

          <div className="flex-1 h-1 bg-gray-300"></div>

          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${rendicontoId ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
              2
            </div>
            <span className="text-sm font-semibold">
              Carica Documenti ({documenti.filter(d => tipiDocumento.find(t => t.id === d.tipo_documento && t.obbligatorio)).length}/5)
            </span>
          </div>

          <div className="flex-1 h-1 bg-gray-300"></div>

          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${documentiObbligatoriCaricati ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
              3
            </div>
            <span className="text-sm font-semibold">Invia alla Diocesi</span>
          </div>
        </div>
      </div>

      {/* FORM CREAZIONE (solo se non esiste bozza) */}
      {!rendicontoId && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📅 Crea Nuovo Rendiconto</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Inizio</label>
              <input
                type="date"
                value={periodo.inizio}
                onChange={(e) => setPeriodo({ ...periodo, inizio: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fine</label>
              <input
                type="date"
                value={periodo.fine}
                onChange={(e) => setPeriodo({ ...periodo, fine: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
          <button
            onClick={handleCreaRendiconto}
            disabled={creando || !periodo.inizio || !periodo.fine}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {creando ? 'Creazione in corso...' : 'Crea Rendiconto in Bozza'}
          </button>
        </div>
      )}

      {/* INFO RENDICONTO - TABELLA ORIZZONTALE */}
      {rendicontoId && infoRendiconto && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
            <tbody>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">
                  {new Date(infoRendiconto.periodo_inizio).toLocaleDateString('it-IT')} - {new Date(infoRendiconto.periodo_fine).toLocaleDateString('it-IT')}
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                    📝 Bozza
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-right text-green-600 font-semibold">
                  € {infoRendiconto.totale_entrate?.toFixed(2) || '0.00'}
                </td>
                <td className="px-6 py-4 text-sm text-right text-red-600 font-semibold">
                  € {infoRendiconto.totale_uscite?.toFixed(2) || '0.00'}
                </td>
                <td className="px-6 py-4 text-sm text-right text-blue-600 font-bold">
                  € {infoRendiconto.saldo?.toFixed(2) || '0.00'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {infoRendiconto.data_invio ? new Date(infoRendiconto.data_invio).toLocaleDateString('it-IT') : '-'}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={downloadPdf}
                    className="text-blue-600 hover:text-blue-800"
                    title="Scarica PDF"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* UPLOAD DOCUMENTI - 3 COLONNE CON DESCRIZIONI */}
      {rendicontoId && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">📤 Carica Documenti</h2>
            <span className="text-sm font-semibold text-blue-600">
              {documenti.filter(d => tipiDocumento.find(t => t.id === d.tipo_documento && t.obbligatorio)).length} / 5 obbligatori
            </span>
          </div>

          {/* Grid 3 colonne */}
          <div className="grid grid-cols-3 gap-3">
            {tipiDocumento.map(tipo => {
              const caricato = documenti.find(d => d.tipo_documento === tipo.id);

              return (
                <div
                  key={tipo.id}
                  className={`border-2 rounded-lg p-3 ${caricato ? 'border-green-300 bg-green-50' : tipo.obbligatorio ? 'border-gray-300' : 'border-dashed border-gray-300 opacity-75'
                    }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${caricato ? 'bg-green-500' : 'bg-gray-200'
                      }`}>
                      {caricato ? (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-sm">{tipo.icon}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 text-xs mb-0.5">
                        {tipo.label}
                        {!tipo.obbligatorio && <span className="text-gray-500 ml-1">(opz.)</span>}
                      </h4>
                      <p className="text-xs text-gray-500 mb-1">{tipo.descrizione}</p>
                      {caricato ? (
                        <p className="text-xs text-green-600 truncate">✓ {caricato.nome_file}</p>
                      ) : (
                        <label className="inline-block mt-1">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              if (e.target.files[0]) {
                                handleUploadDocumento(tipo.id, e.target.files[0]);
                              }
                            }}
                            className="hidden"
                            disabled={uploading}
                          />
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 cursor-pointer">
                            Carica
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AZIONI FINALI */}
      {rendicontoId && (
        <div className="space-y-4">
          {/* BANNER ESONERO */}
          {infoRendiconto && infoRendiconto.documenti_esonero && (
            <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-semibold">Documenti esoneranti dall'Economo</p>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Puoi inviare il rendiconto anche senza tutti i documenti obbligatori.
              </p>
            </div>
          )}

          {/* BOTTONI */}
          <div className="flex gap-3">
            <button
              onClick={handleEliminaBozza}
              className="flex-1 px-4 py-3 border-2 border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-semibold"
            >
              🗑️ Elimina Bozza
            </button>
            <button
              onClick={handleInviaDiocesi}
              disabled={!documentiObbligatoriCaricati}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${documentiObbligatoriCaricati
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            >
              {documentiObbligatoriCaricati ? '✅ Invia alla Diocesi' : '📤 Invia (5/5 obbligatori)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NuovoRendiconto;