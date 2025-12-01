import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import HeaderAmministrazione from '../components/HeaderAmministrazione';

const GestioneEnti = () => {
  const navigate = useNavigate();
  const { refreshCounters } = useData();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [enti, setEnti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedComune, setSelectedComune] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showModalModifica, setShowModalModifica] = useState(false);
  const [enteSelezionato, setEnteSelezionato] = useState(null);
  const [formData, setFormData] = useState({
    denominazione: '',
    comune: '',
    provincia: '',
    codice_fiscale: '',
    indirizzo: '',
    cap: '',
    telefono: '',
    email: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEnti();
  }, [refreshCounters.enti]);

  useEffect(() => {
    if (highlightId) {
      setTimeout(() => {
        const element = document.getElementById(`ente-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [highlightId]);

  const fetchEnti = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/amministrazione/enti', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEnti(data);
      }
    } catch (error) {
      console.error('Errore caricamento enti:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEnte = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/amministrazione/enti', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const newEnte = await response.json();
        setEnti([newEnte, ...enti]);
        setShowModal(false);
        setFormData({
          denominazione: '',
          comune: '',
          provincia: '',
          codice_fiscale: '',
          indirizzo: '',
          cap: '',
          telefono: '',
          email: ''
        });
      } else {
        alert('Errore durante il salvataggio');
      }
    } catch (error) {
      console.error('Errore salvataggio ente:', error);
      alert('Errore di connessione');
    } finally {
      setSaving(false);
    }
  };

  const rimuoviOperatore = async (enteId, utenteId) => {
    if (!confirm('Rimuovere questo operatore dall\'ente?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/amministrazione/utenti-enti/${utenteId}/${enteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setEnti(enti.map(e => {
          if (e.id === enteId) {
            return {
              ...e,
              operatori: e.operatori.filter(op => op.id !== utenteId)
            };
          }
          return e;
        }));
      } else {
        alert('Errore durante la rimozione');
      }
    } catch (error) {
      console.error('Errore rimozione operatore:', error);
      alert('Errore di connessione');
    }
  };

  const handleModificaEnte = (ente) => {
    setEnteSelezionato(ente);
    setFormData({
      denominazione: ente.denominazione || '',
      comune: ente.comune || '',
      provincia: ente.provincia || '',
      codice_fiscale: ente.codice_fiscale || '',
      indirizzo: ente.indirizzo || '',
      cap: ente.cap || '',
      telefono: ente.telefono || '',
      email: ente.email || ''
    });
    setShowModalModifica(true);
  };

  const handleSalvaModifica = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/amministrazione/enti/${enteSelezionato.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const enteAggiornato = await response.json();
        setEnti(enti.map(e => e.id === enteSelezionato.id ? enteAggiornato : e));
        setShowModalModifica(false);
        setEnteSelezionato(null);
      } else {
        alert('Errore durante il salvataggio');
      }
    } catch (error) {
      console.error('Errore salvataggio:', error);
      alert('Errore di connessione');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminaEnte = async (enteId, denominazione) => {
    if (!confirm(`Sei sicuro di voler eliminare "${denominazione}"?\n\nQuesta azione disattiverà l'ente.`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/amministrazione/enti/${enteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setEnti(enti.filter(e => e.id !== enteId));
        alert('Ente eliminato con successo');
      } else {
        alert('Errore durante l\'eliminazione');
      }
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Errore di connessione');
    }
  };

  const handleApplicaTemplate = async (ente) => {
    const messaggio = `🎯 Applica Categorie Standard CEI\n\n` +
      `Ente: ${ente.denominazione}\n` +
      `Comune: ${ente.comune}\n\n` +
      `Verranno copiate 110 categorie contabili standard.\n\n` +
      `⚠️ Note:\n` +
      `• Le categorie già presenti NON verranno sovrascritte\n` +
      `• Gli operatori potranno modificare le categorie\n\n` +
      `Continuare?`;

    if (!confirm(messaggio)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/template-categorie/applica-a-ente/${ente.id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Errore applicazione template');
      }

      const data = await response.json();

      const risultato = `✅ Template Applicato!\n\n` +
        `Ente: ${data.ente_denominazione}\n\n` +
        `📊 Risultati:\n` +
        `• Già presenti: ${data.categorie_gia_presenti}\n` +
        `• Copiate: ${data.categorie_copiate}\n` +
        `• Totali: ${data.categorie_totali}`;

      alert(risultato);
    } catch (err) {
      alert(`❌ Errore:\n\n${err.message}`);
      console.error(err);
    }
  };

  const comuni = [...new Set(enti.map(e => e.comune).filter(Boolean))];

  const entiFiltrati = enti.filter(e => {
    const matchSearch = e.denominazione?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.comune?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchComune = !selectedComune || e.comune === selectedComune;
    return matchSearch && matchComune;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header Riutilizzabile */}
      <HeaderAmministrazione />

      <div className="max-w-[1600px] mx-auto px-6 py-6">

        {/* Header Pagina: SINISTRA (Home) - CENTRO (Titolo) - DESTRA (Aggiungi) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 px-6 py-4">
          <div className="flex items-center justify-between">

            {/* SINISTRA: Torna alla Home */}
            <button
              onClick={() => navigate('/amministrazione')}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium">Torna alla Home</span>
            </button>

            {/* CENTRO: Icona + Titolo */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-xl">🏛️</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Gestione Enti</h1>
                  <p className="text-xs text-gray-600">Amministrazione enti e operatori</p>
                </div>
              </div>
            </div>

            {/* DESTRA: Aggiungi Ente */}
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow font-medium text-sm"
            >
              + Aggiungi Ente
            </button>
          </div>
        </div>

        {/* Filtri: Comune PRIMA - Cerca DOPO - Reset */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 mb-4 flex gap-3">
          {/* Comune */}
          <select
            value={selectedComune}
            onChange={(e) => setSelectedComune(e.target.value)}
            className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
          >
            <option value="">Tutti i comuni</option>
            {comuni.map(comune => (
              <option key={comune} value={comune}>{comune}</option>
            ))}
          </select>

          {/* Cerca */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Cerca ente o comune..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Reset Filtri */}
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedComune('');
            }}
            className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm whitespace-nowrap"
          >
            Reset Filtri
          </button>
        </div>

        {/* Tabella - HEADER CENTRATI */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                  Comune
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                  Ente
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                  Utente
                </th>
                <th className="px-4 py-2.5 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                  Ruolo
                </th>
                <th className="px-4 py-2.5 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                  Moduli Attivi
                </th>
                <th className="px-4 py-2.5 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entiFiltrati.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400 text-sm">
                    Nessun ente trovato
                  </td>
                </tr>
              ) : (
                entiFiltrati.map((ente) => {
                  if (ente.operatori && ente.operatori.length > 0) {
                    return ente.operatori.map((operatore, index) => (
                      <tr
                        key={`${ente.id}-${operatore.id}`}
                        id={index === 0 ? `ente-${ente.id}` : undefined}
                        className={`transition-colors ${highlightId === ente.id
                          ? 'bg-blue-100 border-l-4 border-blue-500'
                          : 'hover:bg-blue-50/50'
                          }`}
                      >
                        {index === 0 ? (
                          <td className="px-4 py-3 align-middle" rowSpan={ente.operatori.length}>
                            <div className="text-sm font-semibold text-gray-900">
                              {ente.comune || '-'}
                            </div>
                          </td>
                        ) : null}

                        {index === 0 ? (
                          <td className="px-4 py-3 align-middle" rowSpan={ente.operatori.length}>
                            <div className="text-sm font-medium text-gray-900">
                              {ente.denominazione}
                            </div>
                          </td>
                        ) : null}

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-900">
                              {operatore.titolo ? `${operatore.titolo} ` : ''}
                              {operatore.nome} {operatore.cognome}
                            </div>
                            <button
                              onClick={() => navigate(`/gestione-utenti?highlight=${operatore.id}`)}
                              className="ml-2 p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-all"
                              title="Vai all'utente"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${operatore.ruolo === 'parroco' ? 'bg-purple-100 text-purple-700' :
                            operatore.ruolo === 'economo' ? 'bg-green-100 text-green-700' :
                              operatore.ruolo === 'cassiere' ? 'bg-yellow-100 text-yellow-700' :
                                operatore.ruolo === 'segretario' ? 'bg-pink-100 text-pink-700' :
                                  'bg-blue-100 text-blue-700'
                            }`}>
                            {operatore.ruolo.charAt(0).toUpperCase() + operatore.ruolo.slice(1)}
                          </span>
                        </td>

                        <td className="px-4 py-2">
                          <div className="flex items-center justify-center gap-2">
                            <div
                              className={`p-2 rounded transition-all ${operatore.permessi?.anagrafica
                                ? 'bg-purple-500 text-white shadow-md'
                                : 'bg-gray-200 text-gray-400 opacity-40'
                                }`}
                              title={operatore.permessi?.anagrafica ? 'Anagrafica: ATTIVO' : 'Anagrafica: NON ATTIVO'}
                            >
                              📋
                            </div>
                            <div
                              className={`p-2 rounded transition-all ${operatore.permessi?.contabilita
                                ? 'bg-yellow-500 text-white shadow-md'
                                : 'bg-gray-200 text-gray-400 opacity-40'
                                }`}
                              title={operatore.permessi?.contabilita ? 'Contabilità: ATTIVO' : 'Contabilità: NON ATTIVO'}
                            >
                              💰
                            </div>
                            <div
                              className={`p-2 rounded transition-all ${operatore.permessi?.inventario
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'bg-gray-200 text-gray-400 opacity-40'
                                }`}
                              title={operatore.permessi?.inventario ? 'Inventario: ATTIVO' : 'Inventario: NON ATTIVO'}
                            >
                              📦
                            </div>
                          </div>
                        </td>

                        {index === 0 ? (
                          <td className="px-4 py-3 align-middle" rowSpan={ente.operatori.length}>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleModificaEnte(ente)}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Modifica ente"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleApplicaTemplate(ente)}
                                className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                title="Applica Categorie CEI"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleEliminaEnte(ente.id, ente.denominazione)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Elimina ente"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ));
                  } else {
                    return (
                      <tr key={ente.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">
                            {ente.comune || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {ente.denominazione}
                          </div>
                        </td>
                        <td className="px-4 py-3" colSpan="3">
                          <span className="text-sm text-gray-400 italic">Nessun operatore abbinato</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleModificaEnte(ente)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Modifica ente"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>

                            <button
                              onClick={() => handleApplicaTemplate(ente)}
                              className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                              title="Applica Categorie CEI"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>

                            <button
                              onClick={() => handleEliminaEnte(ente.id, ente.denominazione)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Elimina ente"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {entiFiltrati.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-600">
              Mostrando <span className="font-semibold text-gray-900">1-{entiFiltrati.length}</span> di <span className="font-semibold text-gray-900">{enti.length}</span> enti
            </div>
            <div className="flex items-center gap-1">
              <button className="px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                ← Prec
              </button>
              <button className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium">
                1
              </button>
              <button className="px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                2
              </button>
              <button className="px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Succ →
              </button>
            </div>
          </div>
        )}

      </div>

      {/* MODAL NUOVO ENTE - IDENTICO ALL'ORIGINALE */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>➕</span>
                <span>Nuovo Ente</span>
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveEnte} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Denominazione <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.denominazione}
                    onChange={(e) => setFormData({ ...formData, denominazione: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="es. Parrocchia Santa Maria del Popolo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Comune <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.comune}
                    onChange={(e) => setFormData({ ...formData, comune: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="es. Caltagirone"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Provincia
                  </label>
                  <input
                    type="text"
                    maxLength="2"
                    value={formData.provincia}
                    onChange={(e) => setFormData({ ...formData, provincia: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="CT"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Codice Fiscale
                  </label>
                  <input
                    type="text"
                    maxLength="16"
                    value={formData.codice_fiscale}
                    onChange={(e) => setFormData({ ...formData, codice_fiscale: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="12345678901"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    CAP
                  </label>
                  <input
                    type="text"
                    maxLength="5"
                    value={formData.cap}
                    onChange={(e) => setFormData({ ...formData, cap: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="95041"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Indirizzo
                  </label>
                  <input
                    type="text"
                    value={formData.indirizzo}
                    onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="Via Roma, 123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Telefono
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="0933-123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    placeholder="info@ente.it"
                  />
                </div>
              </div>
            </form>

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveEnte}
                disabled={saving}
                className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Salvataggio...</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>Salva Ente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFICA ENTE - IDENTICO ALL'ORIGINALE */}
      {showModalModifica && enteSelezionato && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>✏️</span>
                <span>Modifica Ente</span>
              </h2>
              <button
                onClick={() => { setShowModalModifica(false); setEnteSelezionato(null); }}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSalvaModifica} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Denominazione <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.denominazione}
                    onChange={(e) => setFormData({ ...formData, denominazione: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Comune <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.comune}
                    onChange={(e) => setFormData({ ...formData, comune: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Provincia
                  </label>
                  <input
                    type="text"
                    maxLength="2"
                    value={formData.provincia}
                    onChange={(e) => setFormData({ ...formData, provincia: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Codice Fiscale
                  </label>
                  <input
                    type="text"
                    maxLength="16"
                    value={formData.codice_fiscale}
                    onChange={(e) => setFormData({ ...formData, codice_fiscale: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    CAP
                  </label>
                  <input
                    type="text"
                    maxLength="5"
                    value={formData.cap}
                    onChange={(e) => setFormData({ ...formData, cap: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Indirizzo
                  </label>
                  <input
                    type="text"
                    value={formData.indirizzo}
                    onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Telefono
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
              </div>
            </form>

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => { setShowModalModifica(false); setEnteSelezionato(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSalvaModifica}
                disabled={saving}
                className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? 'Salvataggio...' : '✓ Salva Modifiche'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GestioneEnti;