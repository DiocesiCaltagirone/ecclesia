import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import FormMovimentoGlobale from './FormMovimentoGlobale';
import ModalAllegati from "../../components/ModalAllegati.jsx";

const MovimentiConto = () => {
  const { registroId } = useParams();
  const [movimenti, setMovimenti] = useState([]);
  const [movimentiFiltrati, setMovimentiFiltrati] = useState([]);
  const [contoNome, setContoNome] = useState('');
  const [categorie, setCategorie] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showFiltri, setShowFiltri] = useState(false);
  const [ordineCrescente, setOrdineCrescente] = useState(true);
  const [saldiNascosti, setSaldiNascosti] = useState(false);

  // Menu contestuale
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, movimento: null });
  const menuRef = useRef(null);

  // Modal allegati
  const [modalAllegatiOpen, setModalAllegatiOpen] = useState(false);
  const [movimentoSelezionato, setMovimentoSelezionato] = useState(null);

  // Statistiche
  const [stats, setStats] = useState({
    totaleEntrate: 0,
    totaleUscite: 0,
    saldo: 0
  });

  // Filtri
  const [filtri, setFiltri] = useState({
    dataInizio: '',
    dataFine: '',
    tipo: '',
    categoriaId: '',
    cerca: ''
  });

  const token = localStorage.getItem('token');
  const enteId = localStorage.getItem('ente_id');
  const headers = { 'Authorization': `Bearer ${token}`, 'X-Ente-Id': enteId };

  useEffect(() => {
    fetchMovimenti();
    fetchCategorie();
  }, [registroId]);

  useEffect(() => {
    applicaFiltri();
  }, [filtri, movimenti, ordineCrescente, saldiNascosti]);

  // Chiudi menu contestuale quando si clicca fuori O si scrolla
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setContextMenu({ show: false, x: 0, y: 0, movimento: null });
      }
    };

    const handleScroll = () => {
      setContextMenu({ show: false, x: 0, y: 0, movimento: null });
    };

    if (contextMenu.show) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [contextMenu.show]);

  const fetchMovimenti = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/contabilita/movimenti/conto/${registroId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setContoNome(data.conto_nome);
        setMovimenti(data.movimenti || []);
        setMovimentiFiltrati(data.movimenti || []);
        // Usa i totali dal backend
        setStats({
          totaleEntrate: data.totale_entrate || 0,
          totaleUscite: data.totale_uscite || 0,
          saldo: data.saldo || 0
        });
      }
    } catch (error) {
      console.error('Errore caricamento movimenti:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorie = async () => {
    try {
      const res = await fetch('/api/contabilita/categorie', { headers });
      if (res.ok) {
        const data = await res.json();
        setCategorie(data.categorie || []);
      }
    } catch (error) {
      console.error('Errore caricamento categorie:', error);
    }
  };

  const applicaFiltri = () => {
    let risultato = [...movimenti];

    // Nascondi movimenti bloccati se checkbox è spuntato
    if (saldiNascosti) {
      risultato = risultato.filter(m => {
        if (m.tipo_speciale === 'saldo_iniziale') return true; // Riga marrone sempre visibile
        if (m.bloccato) return false; // Nascondi bloccati
        return true;
      });
    }

    if (filtri.dataInizio) {
      risultato = risultato.filter(m => m.data_movimento >= filtri.dataInizio);
    }

    if (filtri.dataFine) {
      risultato = risultato.filter(m => m.data_movimento <= filtri.dataFine);
    }

    if (filtri.tipo) {
      risultato = risultato.filter(m => m.tipo_movimento === filtri.tipo);
    }

    if (filtri.categoriaId) {
      risultato = risultato.filter(m => m.categoria_id === filtri.categoriaId);
    }

    if (filtri.cerca) {
      const cerca = filtri.cerca.toLowerCase();
      risultato = risultato.filter(m =>
        (m.note && m.note.toLowerCase().includes(cerca)) ||
        (m.categoria_completa && m.categoria_completa.toLowerCase().includes(cerca))
      );
    }

    // PRIMA calcola saldo in ordine CRONOLOGICO (dal più vecchio)
    const risultatoOrdinatoCronologico = [...risultato].sort((a, b) => {
      return new Date(a.data_movimento) - new Date(b.data_movimento);
    });

    // Calcola saldo progressivo in ordine cronologico
    let saldoProgressivo = 0;
    const saldiMap = {};
    risultatoOrdinatoCronologico.forEach(mov => {
      if (!mov.bloccato) {
        if (mov.tipo_movimento === 'entrata') {
          saldoProgressivo += parseFloat(mov.importo);
        } else {
          saldoProgressivo -= parseFloat(mov.importo);
        }
      }
      saldiMap[mov.id] = mov.bloccato ? 0 : saldoProgressivo;
    });

    // POI ordina per visualizzazione (crescente o decrescente)
    // Se stessa data, ordina per created_at
    risultato.sort((a, b) => {
      const dataA = new Date(a.data_movimento);
      const dataB = new Date(b.data_movimento);

      // Prima confronta le date
      if (dataA.getTime() !== dataB.getTime()) {
        return ordineCrescente ? dataB - dataA : dataA - dataB;
      }

      // Se stessa data, ordina per created_at
      const createdA = new Date(a.created_at || 0);
      const createdB = new Date(b.created_at || 0);
      return ordineCrescente ? createdB - createdA : createdA - createdB;
    });

    // Applica i saldi calcolati
    risultato = risultato.map(mov => ({
      ...mov,
      saldo_progressivo: saldiMap[mov.id]
    }));

    setMovimentiFiltrati(risultato);

  };

  const handleResetFiltri = () => {
    setFiltri({
      dataInizio: '',
      dataFine: '',
      tipo: '',
      categoriaId: '',
      cerca: ''
    });
  };

  const openModal = async (movimento = null) => {
    if (movimento && (movimento.bloccato || movimento.tipo_speciale === 'saldo_iniziale')) {
      if (movimento.tipo_speciale === 'saldo_iniziale') return; // Non mostrare alert
      alert('⚠️ Impossibile modificare: movimento in rendiconto');
      return;
    }

    if (movimento) {
      setEditing({
        ...movimento,
        registro_id: registroId
      });
    } else {
      setEditing({ registro_id: registroId });
    }
    await fetchCategorie(); // Ricarica categorie
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const handleSaveMovimento = async (payload, movimentoId) => {
    try {
      const url = movimentoId
        ? `/api/contabilita/movimenti/${movimentoId}`
        : '/api/contabilita/movimenti';

      const method = movimentoId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchMovimenti();
        closeModal();
      } else {
        const errorData = await res.json();
        alert(errorData.detail || 'Errore salvataggio movimento');
      }
    } catch (error) {
      console.error('Errore:', error);
      alert('Errore salvataggio movimento');
    }
  };

  const handleContextMenu = (e, movimento) => {
    e.preventDefault();

    // Dimensioni approssimative del menu
    const menuWidth = 200;
    const menuHeight = 200;

    // Calcola posizione ottimale
    let x = e.clientX;
    let y = e.clientY;

    // Se menu esce a destra, spostalo a sinistra
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }

    // Se menu esce in basso, spostalo in alto
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    setContextMenu({
      show: true,
      x: x,
      y: y,
      movimento
    });
  };

  const handleVisualizzaFile = (movimento) => {
    setMovimentoSelezionato(movimento);
    setModalAllegatiOpen(true);
    setContextMenu({ show: false, x: 0, y: 0, movimento: null });
  };

  const handleEliminaMovimento = async (movimento) => {
    if (!confirm(`Sei sicuro di voler eliminare questo movimento di €${formatCurrency(movimento.importo)}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/contabilita/movimenti/${movimento.id}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        await fetchMovimenti();
        setContextMenu({ show: false, x: 0, y: 0, movimento: null });
      } else {
        alert('Errore eliminazione movimento');
      }
    } catch (error) {
      console.error('Errore:', error);
      alert('Errore eliminazione movimento');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">💳 {contoNome}</h1>
          <button
            onClick={() => openModal()}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuova Transazione
          </button>
        </div>
      </div>

      {/* STATISTICHE */}
      <div className="bg-white border-b-2 border-gray-300 px-4 py-2 flex-shrink-0">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500 px-3 py-2 rounded">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-green-700">📊 ENTRATE</div>
                <div className="text-lg font-bold text-green-800">€{formatCurrency(stats.totaleEntrate)}</div>
              </div>
              <div className="text-3xl opacity-20">💰</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500 px-3 py-2 rounded">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-red-700">📉 USCITE</div>
                <div className="text-lg font-bold text-red-800">€{formatCurrency(stats.totaleUscite)}</div>
              </div>
              <div className="text-3xl opacity-20">💸</div>
            </div>
          </div>

          <div className={`bg-gradient-to-br ${stats.saldo >= 0 ? 'from-blue-50 to-blue-100 border-blue-500' : 'from-orange-50 to-orange-100 border-orange-500'} border-l-4 px-3 py-2 rounded`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-xs font-semibold ${stats.saldo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>💰 SALDO</div>
                <div className={`text-lg font-bold ${stats.saldo >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>€{formatCurrency(stats.saldo)}</div>
              </div>
              <div className="text-3xl opacity-20">{stats.saldo >= 0 ? '✅' : '⚠️'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTRI */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex-shrink-0">
        <button
          onClick={() => setShowFiltri(!showFiltri)}
          className="text-xs font-semibold text-gray-700 hover:text-blue-600 flex items-center gap-1"
        >
          🔍 Filtri {showFiltri ? '▼' : '▶'}
        </button>

        {showFiltri && (
          <div className="mt-2 grid grid-cols-5 gap-2">
            <input
              type="date"
              value={filtri.dataInizio}
              onChange={(e) => setFiltri({ ...filtri, dataInizio: e.target.value })}
              className="px-2 py-1 border border-gray-300 rounded text-xs"
            />
            <input
              type="date"
              value={filtri.dataFine}
              onChange={(e) => setFiltri({ ...filtri, dataFine: e.target.value })}
              className="px-2 py-1 border border-gray-300 rounded text-xs"
            />
            <select
              value={filtri.tipo}
              onChange={(e) => setFiltri({ ...filtri, tipo: e.target.value })}
              className="px-2 py-1 border border-gray-300 rounded text-xs"
            >
              <option value="">Tutti i tipi</option>
              <option value="entrata">Entrate</option>
              <option value="uscita">Uscite</option>
            </select>
            <input
              type="text"
              value={filtri.cerca}
              onChange={(e) => setFiltri({ ...filtri, cerca: e.target.value })}
              placeholder="Cerca..."
              className="px-2 py-1 border border-gray-300 rounded text-xs"
            />
            <button
              onClick={handleResetFiltri}
              className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-semibold hover:bg-gray-300"
            >
              × Reset
            </button>
          </div>
        )}
      </div>

      {/* TABELLA */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-xs border-collapse table-fixed">
          <thead className="bg-gray-50 border-b-2 border-gray-300 sticky top-0 z-10">
            <tr>
              <th
                className="text-left px-2 py-1.5 font-bold text-gray-700 border-r border-gray-200 cursor-pointer hover:bg-gray-100 select-none transition-colors"
                style={{ width: '80px', maxWidth: '80px' }}
                onClick={() => setOrdineCrescente(!ordineCrescente)}
              >
                <div className="flex items-center gap-1">
                  <span>Data</span>
                  <span className="text-blue-600 text-xs">{ordineCrescente ? '▲' : '▼'}</span>
                </div>
              </th>
              <th className="text-left px-2 py-1.5 font-bold text-gray-700 border-r border-gray-200" style={{ width: '280px', maxWidth: '280px' }}>Categoria</th>
              <th className="text-right px-2 py-1.5 font-bold text-gray-700 border-r border-gray-200" style={{ width: '90px', maxWidth: '90px' }}>Uscita</th>
              <th className="text-right px-2 py-1.5 font-bold text-gray-700 border-r border-gray-200" style={{ width: '100px', maxWidth: '100px' }}>Entrata</th>
              <th className="text-right px-2 py-1.5 font-bold text-gray-700 border-r border-gray-200" style={{ width: '100px', maxWidth: '100px' }}>Saldo</th>
              <th className="text-left px-2 py-1.5 font-bold text-gray-700 border-r border-gray-200" style={{ width: '200px', maxWidth: '200px' }}>Note</th>
              <th className="text-center px-2 py-1.5 font-bold text-gray-700" style={{ width: '48px', maxWidth: '48px' }}>📎</th>
            </tr>
          </thead>
          <tbody>
            {movimentiFiltrati.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-gray-500">
                  Nessun movimento trovato. Modifica i filtri o aggiungi una nuova transazione.
                </td>
              </tr>
            ) : (
              movimentiFiltrati.map((mov) => (
                <tr
                  key={mov.id}
                  className={`border-b border-gray-100 transition-colors ${mov.tipo_speciale === 'saldo_iniziale'
                    ? 'bg-amber-50 border-l-4 border-amber-600 cursor-default font-semibold'
                    : mov.bloccato
                      ? 'bg-gray-200 cursor-not-allowed opacity-70'
                      : 'hover:bg-blue-50 cursor-pointer'
                    }`}
                  onClick={() => {
                    if (mov.tipo_speciale !== 'saldo_iniziale') {
                      openModal(mov);
                    }
                  }}
                  onContextMenu={(e) => {
                    if (mov.tipo_speciale === 'saldo_iniziale' || mov.bloccato) {
                      e.preventDefault();
                    } else {
                      handleContextMenu(e, mov);
                    }
                  }}
                >
                  <td className="px-2 py-1.5 text-gray-700 border-r border-gray-100 font-mono align-middle" style={{ width: '80px', maxWidth: '80px' }}>
                    {formatDate(mov.data_movimento)}
                  </td>
                  <td className="px-2 py-1.5 text-gray-800 border-r border-gray-100 align-middle" style={{ width: '280px', maxWidth: '280px' }}>
                    <div className="truncate">
                      {mov.tipo_speciale === 'saldo_iniziale'
                        ? 'SALDO DA ESERCIZIO PRECEDENTE'
                        : (mov.categoria_completa || 'Non categorizzato')
                      }
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right text-red-600 font-semibold border-r border-gray-100 font-mono align-middle" style={{ width: '90px', maxWidth: '90px' }}>
                    {mov.tipo_movimento === 'uscita' ? formatCurrency(mov.importo) : ''}
                  </td>
                  <td className="px-2 py-1.5 text-right text-green-600 font-semibold border-r border-gray-100 font-mono align-middle" style={{ width: '100px', maxWidth: '100px' }}>
                    {mov.tipo_movimento === 'entrata' ? formatCurrency(mov.importo) : ''}
                  </td>
                  <td className={`px-2 py-1.5 text-right font-bold border-r border-gray-100 font-mono align-middle ${mov.saldo_progressivo >= 0 ? 'text-blue-700' : 'text-red-700'}`} style={{ width: '100px', maxWidth: '100px' }}>
                    {formatCurrency(mov.saldo_progressivo)}
                  </td>

                  {mov.tipo_speciale === 'saldo_iniziale' ? (
                    <td colSpan="2" className="px-3 py-2 align-middle">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saldiNascosti}
                          onChange={(e) => {
                            e.stopPropagation();
                            setSaldiNascosti(e.target.checked);
                          }}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700 font-medium">Nascondi movimenti bloccati</span>
                      </label>
                    </td>
                  ) : (
                    <>
                      <td className="px-2 py-1.5 text-gray-600 text-[10px] border-r border-gray-100 align-middle" style={{ width: '200px', maxWidth: '200px' }}>
                        <div className="line-clamp-2 leading-[14px] break-words overflow-hidden" title={mov.note || mov.descrizione || '-'}>
                          {mov.note || mov.descrizione || '-'}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-center align-middle" style={{ width: '48px', maxWidth: '48px' }}>
                        {mov.bloccato ? (
                          <div className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" title="Movimento bloccato da rendiconto">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVisualizzaFile(mov);
                              }}
                              className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Visualizza allegati (sola lettura)"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVisualizzaFile(mov);
                            }}
                            className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Allegati"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="bg-gray-100 border-t-2 border-gray-300 px-4 py-1.5 text-xs text-gray-700 flex justify-between items-center flex-shrink-0">
        <div className="font-semibold">
          Movimenti visualizzati: <strong>{movimentiFiltrati.length}</strong> / {movimenti.length}
        </div>
        <button
          onClick={fetchMovimenti}
          className="text-blue-600 hover:text-blue-800 font-semibold"
        >
          🔄 Aggiorna
        </button>
      </div>

      {/* MODAL FORM */}
      {showModal && (
        <FormMovimentoGlobale
          movimento={editing}
          onClose={closeModal}
          onSave={handleSaveMovimento}
          categorie={categorie}
        />
      )}

      {/* MENU CONTESTUALE CON PORTAL */}
      {contextMenu.show && createPortal(
        <div
          ref={menuRef}
          className="fixed bg-white rounded-lg shadow-2xl border-2 border-gray-300 py-2 min-w-[200px]"
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            zIndex: 99999
          }}
        >
          {contextMenu.movimento?.bloccato && (
            <>
              <div className="px-4 py-2 bg-orange-50 border-l-4 border-orange-500 mb-2">
                <div className="flex items-center gap-2 text-orange-800 text-xs font-semibold">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Movimento bloccato</span>
                </div>
                <p className="text-[10px] text-orange-700 mt-1">Incluso in rendiconto in revisione</p>
              </div>
              <hr className="my-1 border-gray-200" />
            </>
          )}

          <button
            onClick={() => {
              if (!contextMenu.movimento?.bloccato) {
                openModal(contextMenu.movimento);
                setContextMenu({ show: false, x: 0, y: 0, movimento: null });
              }
            }}
            disabled={contextMenu.movimento?.bloccato}
            className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 ${contextMenu.movimento?.bloccato
              ? 'text-gray-400 cursor-not-allowed bg-gray-50'
              : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
              }`}
          >
            <svg className={`w-4 h-4 ${contextMenu.movimento?.bloccato ? 'text-gray-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Modifica</span>
            {contextMenu.movimento?.bloccato && <span className="text-xs">(bloccato)</span>}
          </button>

          <button
            onClick={() => handleVisualizzaFile(contextMenu.movimento)}
            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-3 text-gray-700"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span>Visualizza file</span>
          </button>

          <hr className="my-1 border-gray-200" />

          <button
            onClick={() => {
              if (!contextMenu.movimento?.bloccato) {
                handleEliminaMovimento(contextMenu.movimento);
              }
            }}
            disabled={contextMenu.movimento?.bloccato}
            className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 ${contextMenu.movimento?.bloccato
              ? 'text-gray-400 cursor-not-allowed bg-gray-50'
              : 'text-red-600 hover:bg-red-50 cursor-pointer'
              }`}
          >
            <svg className={`w-4 h-4 ${contextMenu.movimento?.bloccato ? 'text-gray-400' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Elimina</span>
            {contextMenu.movimento?.bloccato && <span className="text-xs">(bloccato)</span>}
          </button>
        </div>,
        document.body
      )}

      {/* MODAL ALLEGATI */}
      {modalAllegatiOpen && movimentoSelezionato && (
        <ModalAllegati
          movimento={movimentoSelezionato}
          onClose={() => {
            setModalAllegatiOpen(false);
            setMovimentoSelezionato(null);
          }}
        />
      )}
    </div>
  );
};

export default MovimentiConto;