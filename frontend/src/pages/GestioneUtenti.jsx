import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import HeaderAmministrazione from '../components/HeaderAmministrazione';

const GestioneUtenti = () => {
  const navigate = useNavigate();
  const { refreshEnti } = useData();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [utenti, setUtenti] = useState([]);
  const [enti, setEnti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRuolo, setSelectedRuolo] = useState('');
  const [selectedComune, setSelectedComune] = useState('');
  const [showModalNuovo, setShowModalNuovo] = useState(false);
  const [showModalModifica, setShowModalModifica] = useState(false);
  const [showModalReset, setShowModalReset] = useState(false);
  const [utenteSelezionato, setUtenteSelezionato] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    titolo: '',
    nome: '',
    cognome: ''
  });

  const [entiSelezionati, setEntiSelezionati] = useState([
    { ruolo: '', citta: '', ente_id: '' }
  ]);

  const [saving, setSaving] = useState(false);

  const aggiungiEnte = () => {
    setEntiSelezionati([...entiSelezionati, { ruolo: '', citta: '', ente_id: '' }]);
  };

  const rimuoviEnte = (index) => {
    const nuoviEnti = entiSelezionati.filter((_, i) => i !== index);
    setEntiSelezionati(nuoviEnti.length > 0 ? nuoviEnti : [{ ruolo: '', citta: '', ente_id: '' }]);
  };

  const aggiornaEnte = (index, campo, valore) => {
    const nuoviEnti = [...entiSelezionati];
    nuoviEnti[index][campo] = valore;
    if (campo === 'citta') {
      nuoviEnti[index].ente_id = '';
    }
    setEntiSelezionati(nuoviEnti);
  };

  const ruoliDisponibili = [
    { value: "parroco", label: "Parroco", color: "bg-purple-100 text-purple-700" },
    { value: "economo", label: "Economo", color: "bg-green-100 text-green-700" },
    { value: "cassiere", label: "Cassiere", color: "bg-yellow-100 text-yellow-700" },
    { value: "amministratore", label: "Amministratore", color: "bg-blue-100 text-blue-700" },
    { value: "operatore", label: "Operatore", color: "bg-blue-100 text-blue-700" },
    { value: "segretario", label: "Segretario/a", color: "bg-pink-100 text-pink-700" },
    { value: "responsabile", label: "Responsabile", color: "bg-indigo-100 text-indigo-700" },
    { value: "direttore", label: "Direttore", color: "bg-red-100 text-red-700" },
    { value: "presidente", label: "Presidente", color: "bg-orange-100 text-orange-700" },
  ];

  useEffect(() => {
    fetchUtenti();
    fetchEnti();
  }, []);

  useEffect(() => {
    if (highlightId) {
      setTimeout(() => {
        const element = document.getElementById(`utente-${highlightId}`);
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
    }
  };

  const fetchUtenti = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/amministrazione/utenti', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUtenti(data);
      }
    } catch (error) {
      console.error('Errore caricamento utenti:', error);
    } finally {
      setLoading(false);
    }
  };

  const utentiFiltrati = utenti
    .filter(u => {
      const matchSearch =
        u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.cognome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.enti?.some(e => e.denominazione?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRuolo = !selectedRuolo || u.enti?.some(e => e.ruolo === selectedRuolo);
      const matchComune = !selectedComune || u.enti?.some(e => enti.find(ente => ente.id === e.id)?.comune === selectedComune);

      return matchSearch && matchRuolo && matchComune;
    })
    .sort((a, b) => {
      const aIsEconomo = a.is_economo === true;
      const bIsEconomo = b.is_economo === true;

      if (aIsEconomo && !bIsEconomo) return -1;
      if (!aIsEconomo && bIsEconomo) return 1;

      const aParrocchia = a.enti?.[0]?.denominazione || 'zzz';
      const bParrocchia = b.enti?.[0]?.denominazione || 'zzz';
      const parrocchiaCompare = aParrocchia.localeCompare(bParrocchia);
      if (parrocchiaCompare !== 0) return parrocchiaCompare;

      return (a.cognome || '').localeCompare(b.cognome || '');
    });

  const handleModificaUtente = (utente) => {
    setUtenteSelezionato(utente);

    setFormData({
      username: utente.username || '',
      email: utente.email || '',
      password: '',
      titolo: utente.titolo || '',
      nome: utente.nome || '',
      cognome: utente.cognome || ''
    });

    if (utente.enti && utente.enti.length > 0) {
      setEntiSelezionati(
        utente.enti.map(e => ({
          ruolo: e.ruolo || '',
          citta: enti.find(ente => ente.id === e.id)?.comune || '',
          ente_id: e.id || ''
        }))
      );
    } else {
      setEntiSelezionati([{ ruolo: '', citta: '', ente_id: '' }]);
    }

    setShowModalModifica(true);
  };

  const handleSalvaModifica = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/amministrazione/utenti/${utenteSelezionato.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: formData.email,
          email: formData.email,
          nome: formData.nome,
          cognome: formData.cognome,
          titolo: formData.titolo
        })
      });

      if (response.ok) {
        if (utenteSelezionato.enti && utenteSelezionato.enti.length > 0) {
          for (const ente of utenteSelezionato.enti) {
            await fetch(`/api/amministrazione/utenti-enti/${utenteSelezionato.id}/${ente.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
          }
        }

        for (const ente of entiSelezionati) {
          if (ente.ente_id && ente.ruolo) {
            await fetch('/api/amministrazione/utenti-enti', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                utente_id: utenteSelezionato.id,
                ente_id: ente.ente_id,
                ruolo: ente.ruolo,
                permessi: {
                  anagrafica: false,
                  contabilita: false,
                  inventario: false
                }
              })
            });
          }
        }

        fetchUtenti();
        setShowModalModifica(false);
        setUtenteSelezionato(null);
        alert('Utente aggiornato con successo!');
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

  const handleNuovoUtente = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');

      const utenteData = {
        username: formData.email,
        email: formData.email,
        password: 'Parrocchia2024!',
        nome: formData.nome,
        cognome: formData.cognome,
        titolo: formData.titolo || null,
        attivo: true
      };

      const response = await fetch('/api/amministrazione/utenti', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(utenteData)
      });

      if (response.ok) {
        const nuovoUtente = await response.json();

        for (const ente of entiSelezionati) {
          if (ente.ente_id && ente.ruolo) {
            await fetch('/api/amministrazione/utenti-enti', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                utente_id: nuovoUtente.id,
                ente_id: ente.ente_id,
                ruolo: ente.ruolo,
                permessi: {
                  anagrafica: false,
                  contabilita: false,
                  inventario: false
                }
              })
            });
          }
        }

        fetchUtenti();
        setShowModalNuovo(false);
        setFormData({
          username: '',
          email: '',
          password: '',
          titolo: '',
          nome: '',
          cognome: ''
        });
        setEntiSelezionati([{ ruolo: '', citta: '', ente_id: '' }]);
        alert('Utente creato con successo!');
      } else {
        const errorData = await response.json();
        alert(`Errore: ${errorData.detail || 'Errore durante la creazione'}`);
      }
    } catch (error) {
      console.error('Errore creazione utente:', error);
      alert('Errore di connessione');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/amministrazione/utenti/${utenteSelezionato.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setShowModalReset(false);
        setUtenteSelezionato(null);
        alert('Password ripristinata con successo! Password predefinita: Parrocchia2024!');
      } else {
        alert('Errore durante il reset');
      }
    } catch (error) {
      console.error('Errore reset password:', error);
      alert('Errore di connessione');
    }
  };

  const handleEliminaUtente = async (utenteId, nomeCompleto) => {
    if (!confirm(`Sei sicuro di voler eliminare "${nomeCompleto}"?\n\nQuesta azione disattiverà l'utente.`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/amministrazione/utenti/${utenteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchUtenti();
        refreshEnti();
        alert('Utente eliminato con successo');
      } else {
        alert('Errore durante l\'eliminazione');
      }
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Errore di connessione');
    }
  };

  const togglePermesso = async (utenteId, enteId, permesso, valoreAttuale) => {
    try {
      const token = localStorage.getItem('token');

      const utente = utenti.find(u => u.id === utenteId);
      const ente = utente?.enti.find(e => e.id === enteId);

      if (!ente) return;

      const nuoviPermessi = {
        ...ente.permessi,
        [permesso]: !valoreAttuale
      };

      const response = await fetch(`/api/amministrazione/utenti-enti/${utenteId}/${enteId}/permessi`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(nuoviPermessi)
      });

      if (response.ok) {
        fetchUtenti();
      } else {
        const errorData = await response.json();
        console.error('Errore aggiornamento permessi:', errorData);
        alert('Errore durante l\'aggiornamento dei permessi');
      }
    } catch (error) {
      console.error('Errore toggle permesso:', error);
      alert('Errore di connessione');
    }
  };

  const getBadgeColor = (ruolo) => {
    const colori = {
      'parroco': 'bg-purple-100 text-purple-700',
      'economo': 'bg-green-100 text-green-700',
      'cassiere': 'bg-yellow-100 text-yellow-700',
      'amministratore': 'bg-blue-100 text-blue-700',
      'operatore': 'bg-blue-100 text-blue-700',
      'segretario': 'bg-pink-100 text-pink-700',
      'responsabile': 'bg-indigo-100 text-indigo-700',
      'direttore': 'bg-red-100 text-red-700',
      'presidente': 'bg-orange-100 text-orange-700'
    };
    return colori[ruolo] || 'bg-gray-100 text-gray-700';
  };

  const cittaDisponibili = [...new Set(enti.map(e => e.comune).filter(Boolean))].sort();
  const comuniDisponibili = [...new Set(enti.map(e => e.comune).filter(Boolean))].sort();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Caricamento utenti...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Riutilizzabile */}
      <HeaderAmministrazione />

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Header Pagina: SINISTRA (Home) - CENTRO (Titolo) - DESTRA (Aggiungi) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 px-6 py-4">
          <div className="flex items-center justify-between">

            {/* SINISTRA: Torna alla Home */}
            <button
              onClick={() => navigate('/amministrazione')}
              className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium">Torna alla Home</span>
            </button>

            {/* CENTRO: Icona + Titolo */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Gestione Utenti</h1>
                  <p className="text-xs text-gray-600">Amministrazione utenti e permessi</p>
                </div>
              </div>
            </div>

            {/* DESTRA: Aggiungi Utente */}
            <button
              onClick={() => {
                setFormData({
                  username: '',
                  email: '',
                  password: '',
                  titolo: '',
                  nome: '',
                  cognome: ''
                });
                setEntiSelezionati([{ ruolo: '', citta: '', ente_id: '' }]);
                setShowModalNuovo(true);
              }}
              className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition-all shadow-sm hover:shadow font-medium text-sm"
            >
              + Nuovo Utente
            </button>
          </div>
        </div>

        {/* Filtri SUPER COMPATTI: Comune - Ruolo - Cerca - Reset */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 mb-4">
          <div className="grid grid-cols-12 gap-3">
            {/* Comune */}
            <div className="col-span-3">
              <select
                value={selectedComune}
                onChange={(e) => setSelectedComune(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
              >
                <option value="">Tutti i comuni</option>
                {comuniDisponibili.map(comune => (
                  <option key={comune} value={comune}>{comune}</option>
                ))}
              </select>
            </div>

            {/* Ruolo */}
            <div className="col-span-3">
              <select
                value={selectedRuolo}
                onChange={(e) => setSelectedRuolo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
              >
                <option value="">Tutti i ruoli</option>
                {ruoliDisponibili.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Cerca */}
            <div className="col-span-5 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca per nome, email o parrocchia..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Reset */}
            <div className="col-span-1">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedRuolo('');
                  setSelectedComune('');
                }}
                className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm whitespace-nowrap"
                title="Reset Filtri"
              >
                🔄
              </button>
            </div>
          </div>
        </div>

        {/* Tabella COMPATTA - Header: UTENTE, COMUNE, PARROCCHIA, RUOLO, MODULI ATTIVI, AZIONI */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wide">Utente</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wide">Comune</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wide">Parrocchia</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wide">Ruolo</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wide">Moduli Attivi</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wide">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {utentiFiltrati.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500 text-sm">
                    Nessun utente trovato
                  </td>
                </tr>
              ) : (
                utentiFiltrati.map((utente) => {
                  const nomeCompleto = `${utente.titolo ? utente.titolo + ' ' : ''}${utente.nome} ${utente.cognome}`;
                  const isEconomo = utente.is_economo === true;

                  if (!utente.enti || utente.enti.length === 0) {
                    return (
                      <tr
                        key={utente.id}
                        id={`utente-${utente.id}`}
                        className={`transition-colors ${highlightId === utente.id
                          ? 'bg-blue-100 border-l-4 border-blue-500'
                          : isEconomo
                            ? 'bg-yellow-50 border-l-4 border-yellow-500'
                            : 'hover:bg-gray-50'
                          }`}
                      >
                        <td className="px-4 py-3">
                          <div className={`font-medium text-xs ${isEconomo ? 'text-yellow-700 font-bold' : 'text-gray-900'}`}>
                            {nomeCompleto}
                          </div>
                          <div className="text-xs text-gray-500">{utente.email}</div>
                          {isEconomo && (
                            <div className="text-xs font-semibold text-yellow-700 mt-0.5">
                              Amministratore Diocesano
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {isEconomo ? (
                            <span className="text-yellow-700 font-medium">Diocesi</span>
                          ) : (
                            <span className="text-gray-400 italic">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {isEconomo ? (
                            <span className="text-yellow-700 font-medium">Diocesi di Caltagirone</span>
                          ) : (
                            <span className="text-gray-400 italic">Nessun ente</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEconomo ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">
                              ECONOMO DIOCESANO
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEconomo ? (
                            <span className="text-xs text-yellow-700 font-medium">Tutti i permessi</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {!isEconomo && (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleModificaUtente(utente)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-all"
                                title="Modifica"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleEliminaUtente(utente.id, nomeCompleto)}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-all"
                                title="Elimina"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  return utente.enti.map((ente, enteIdx) => {
                    const comuneEnte = enti.find(e => e.id === ente.id)?.comune || '-';
                    
                    return (
                      <tr
                        key={`${utente.id}-${ente.id}`}
                        id={enteIdx === 0 ? `utente-${utente.id}` : undefined}
                        className={`transition-colors ${highlightId === utente.id
                          ? 'bg-blue-100 border-l-4 border-blue-500'
                          : isEconomo
                            ? 'bg-yellow-50 border-l-4 border-yellow-500'
                            : 'hover:bg-gray-50'
                          }`}
                      >
                        {enteIdx === 0 && (
                          <td rowSpan={utente.enti.length} className="px-4 py-3 border-r border-gray-100 align-middle">
                            <div className={`font-medium text-xs ${isEconomo ? 'text-yellow-700 font-bold' : 'text-gray-900'}`}>
                              {nomeCompleto}
                            </div>
                            <div className="text-xs text-gray-500">{utente.email}</div>
                            {isEconomo && (
                              <div className="text-xs font-semibold text-yellow-700 mt-0.5">
                                Amministratore Diocesano
                              </div>
                            )}
                          </td>
                        )}
                        
                        <td className="px-4 py-3">
                          <div className="text-xs font-semibold text-gray-900">{comuneEnte}</div>
                        </td>
                        
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-medium text-gray-900 truncate max-w-[250px]" title={ente.denominazione}>
                              {ente.denominazione}
                            </div>
                            <button
                              onClick={() => navigate(`/gestione-enti?highlight=${ente.id}`)}
                              className="ml-2 p-1 text-blue-500 hover:bg-blue-100 rounded transition-all flex-shrink-0"
                              title="Vai all'ente"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getBadgeColor(ente.ruolo)}`}>
                            {ente.ruolo.charAt(0).toUpperCase() + ente.ruolo.slice(1)}
                          </span>
                        </td>
                        
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePermesso(utente.id, ente.id, 'anagrafica', ente.permessi?.anagrafica);
                              }}
                              className={`p-1.5 rounded transition-all ${ente.permessi?.anagrafica
                                ? 'bg-purple-500 text-white shadow-sm'
                                : 'bg-gray-200 text-gray-400 opacity-40'
                                }`}
                              title="Anagrafica"
                            >
                              📋
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePermesso(utente.id, ente.id, 'contabilita', ente.permessi?.contabilita);
                              }}
                              className={`p-1.5 rounded transition-all ${ente.permessi?.contabilita
                                ? 'bg-yellow-500 text-white shadow-sm'
                                : 'bg-gray-200 text-gray-400 opacity-40'
                                }`}
                              title="Contabilità"
                            >
                              💰
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePermesso(utente.id, ente.id, 'inventario', ente.permessi?.inventario);
                              }}
                              className={`p-1.5 rounded transition-all ${ente.permessi?.inventario
                                ? 'bg-orange-500 text-white shadow-sm'
                                : 'bg-gray-200 text-gray-400 opacity-40'
                                }`}
                              title="Inventario"
                            >
                              📦
                            </button>
                          </div>
                        </td>
                        
                        {enteIdx === 0 && (
                          <td rowSpan={utente.enti.length} className="px-4 py-3 border-l border-gray-100 align-middle">
                            {!isEconomo && (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleModificaUtente(utente)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-all"
                                  title="Modifica"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    setUtenteSelezionato(utente);
                                    setShowModalReset(true);
                                  }}
                                  className="p-1.5 text-orange-600 hover:bg-orange-100 rounded transition-all"
                                  title="Reset password"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleEliminaUtente(utente.id, nomeCompleto)}
                                  className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-all"
                                  title="Elimina"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  });
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        <div className="mt-3 text-center text-xs text-gray-600">
          Mostrando <span className="font-semibold text-gray-800">{utentiFiltrati.length}</span> di <span className="font-semibold text-gray-800">{utenti.length}</span> utenti
        </div>

      </div>

      {/* MODAL NUOVO/MODIFICA - IDENTICO ALL'ORIGINALE */}
      {(showModalNuovo || showModalModifica) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">

            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>{showModalNuovo ? '✚' : '✏️'}</span>
                <span>{showModalNuovo ? 'Nuovo Utente' : 'Modifica Utente'}</span>
              </h2>
              <button
                onClick={() => {
                  setShowModalNuovo(false);
                  setShowModalModifica(false);
                  setUtenteSelezionato(null);
                }}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={showModalNuovo ? handleNuovoUtente : handleSalvaModifica} className="p-6 space-y-4">

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="mario.rossi@diocesi.it"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Mario"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Cognome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cognome}
                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                    placeholder="Rossi"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-gray-600 uppercase">Abbina Enti</h3>
                  <button
                    type="button"
                    onClick={aggiungiEnte}
                    className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium"
                  >
                    + Aggiungi Ente
                  </button>
                </div>

                {entiSelezionati.map((ente, index) => {
                  const entiFiltratiPerCitta = ente.citta ? enti.filter(e => e.comune === ente.citta) : enti;

                  return (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg mb-3 relative">
                      {entiSelezionati.length > 1 && (
                        <button
                          type="button"
                          onClick={() => rimuoviEnte(index)}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ruolo <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={ente.ruolo}
                            onChange={(e) => aggiornaEnte(index, 'ruolo', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                          >
                            <option value="">-- Seleziona Ruolo --</option>
                            {ruoliDisponibili.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Città <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={ente.citta}
                            onChange={(e) => aggiornaEnte(index, 'citta', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                          >
                            <option value="">-- Seleziona Città --</option>
                            {cittaDisponibili.map(citta => (
                              <option key={citta} value={citta}>{citta}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Parrocchia / Ente <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={ente.ente_id}
                            onChange={(e) => aggiornaEnte(index, 'ente_id', e.target.value)}
                            disabled={!ente.citta}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm disabled:bg-gray-100"
                          >
                            <option value="">-- Seleziona Parrocchia --</option>
                            {entiFiltratiPerCitta.map(e => (
                              <option key={e.id} value={e.id}>{e.denominazione}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-800 font-medium">
                  ℹ️ Password predefinita: <strong>Parrocchia2024!</strong>
                </p>
                <p className="text-xs text-green-700 mt-1">
                  L'utente dovrà cambiarla al primo accesso
                </p>
              </div>

            </form>

            <div className="bg-gray-50 px-6 py-3 flex items-center justify-end gap-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowModalNuovo(false);
                  setShowModalModifica(false);
                  setUtenteSelezionato(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={showModalNuovo ? handleNuovoUtente : handleSalvaModifica}
                disabled={saving}
                className="px-6 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? 'Salvataggio...' : '✓ Salva'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL RESET PASSWORD - IDENTICO ALL'ORIGINALE */}
      {showModalReset && utenteSelezionato && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">

            <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🔑</span>
                <span>Reset Password</span>
              </h2>
              <button
                onClick={() => { setShowModalReset(false); setUtenteSelezionato(null); }}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-700 mb-4">
                Utente: <strong>{utenteSelezionato.nome} {utenteSelezionato.cognome}</strong>
              </p>
              <p className="text-sm text-gray-700 mb-4">
                Email: <strong>{utenteSelezionato.email}</strong>
              </p>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-orange-800 font-medium">
                  ⚠️ La password verrà ripristinata al valore predefinito della diocesi.
                </p>
                <p className="text-sm text-orange-700 mt-2">
                  Nuova password: <strong>Parrocchia2024!</strong>
                </p>
                <p className="text-xs text-orange-600 mt-2">
                  L'utente dovrà cambiarla al prossimo accesso.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => { setShowModalReset(false); setUtenteSelezionato(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleResetPassword}
                className="px-6 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                🔑 Reset Password
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default GestioneUtenti;