import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const Categorie = () => {
  const [categorie, setCategorie] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCategoria, setDeletingCategoria] = useState(null);
  const [editing, setEditing] = useState(null);
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [collapsed, setCollapsed] = useState(new Set());
  const [dialogRinomina, setDialogRinomina] = useState({ visibile: false, messaggio: '', movimenti: 0, payload: null, url: null });
  const [showStampaPanel, setShowStampaPanel] = useState(false);
  const [livelloStampa, setLivelloStampa] = useState({ l1: true, l2: true, l3: true });
  const [dialogRiassegna, setDialogRiassegna] = useState({ visibile: false, movimenti: [], categoriaId: null });
  const [riassegnazioni, setRiassegnazioni] = useState({});
  const [haMovimenti, setHaMovimenti] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    parent_id: null,
    livello: 1,
  });

  const toggleCollapse = (catId) => {
    const newCollapsed = new Set(collapsed);
    if (newCollapsed.has(catId)) {
      newCollapsed.delete(catId);
    } else {
      newCollapsed.add(catId);
    }
    setCollapsed(newCollapsed);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/api/contabilita/categorie');
      setCategorie(res.data.categorie || []);
    } catch (error) {
      if (error.response && error.response.status !== 401) {
        alert('Backend non raggiungibile!\n\nAssicurati che il server sia avviato.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getParentLevel = (parentId) => {
    const parent = categorie.find(c => c.id === parentId);
    if (!parent) return 1;
    return parent.parent_id ? 2 : 1;
  };

  const openModal = (cat = null, parentCat = null) => {
    if (cat) {
      setEditing(cat);
      setFormData({
        nome: cat.nome,
        parent_id: cat.parent_id,
        livello: cat.parent_id ? (getParentLevel(cat.parent_id) + 1) : 1,
        tipo: cat.tipo
      });
    } else if (parentCat) {
      const parentLevel = parentCat.parent_id ? 2 : 1;
      setEditing(null);
      setFormData({
        nome: '',
        parent_id: parentCat.id,
        livello: parentLevel + 1,
      });
    } else {
      setEditing(null);
      setFormData({ nome: '', parent_id: null, livello: 1, tipo: 'entrata' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setDialogRinomina({ visibile: false, messaggio: '', movimenti: 0, payload: null, url: null });
  };

  const handleSubmit = async (e, forzaRinomina = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.nome.trim()) {
      alert('Il nome della categoria è obbligatorio');
      return;
    }
    const url = editing
      ? `/api/contabilita/categorie/${editing.id}`
      : '/api/contabilita/categorie';
    const payload = {
      nome: formData.nome.trim(),
      parent_id: formData.parent_id
    };
    if (!formData.parent_id && formData.tipo) {
      payload.tipo = formData.tipo;
    }
    if (forzaRinomina) {
      payload.conferma_rinomina = true;
    }
    try {
      if (editing) {
        await api.put(url, payload);
      } else {
        await api.post(url, payload);
      }
      await fetchData();
      closeModal();
      setDialogRinomina({ visibile: false, messaggio: '', movimenti: 0, payload: null, url: null });
    } catch (error) {
      if (error.response && error.response.status === 409 && error.response.data?.detail?.tipo === 'rinomina_con_movimenti') {
        setShowModal(false);
        setDialogRinomina({
          visibile: true,
          messaggio: error.response.data.detail.messaggio,
          movimenti: error.response.data.detail.movimenti,
          payload,
          url
        });
      } else if (error.response && error.response.status === 400 && typeof error.response.data?.detail === 'string' && error.response.data.detail.includes('Esiste già')) {
        alert(`${error.response.data.detail}`);
      } else if (error.response && error.response.status !== 401) {
        alert(`Errore: ${error.response?.data?.detail || error.message}`);
      }
    }
  };

  const openDeleteModal = async (cat) => {
    setDeletingCategoria(cat);
    setShowDeleteModal(true);
    // Controlla in background se ha movimenti
    try {
      const res = await api.get(`/api/contabilita/categorie/${cat.id}/movimenti-abbinati`);
      setHaMovimenti(res.data.count > 0);
    } catch {
      setHaMovimenti(false);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingCategoria(null);
    setHaMovimenti(false);
  };

  const confirmDelete = async () => {
    if (!deletingCategoria) return;
    try {
      await api.post(`/api/contabilita/categorie/${deletingCategoria.id}/elimina-con-movimenti`);
      if (selectedCategoria?.id === deletingCategoria.id) setSelectedCategoria(null);
      await fetchData();
      closeDeleteModal();
    } catch (error) {
      if (error.response && error.response.status !== 401) {
        alert(`Errore: ${error.response?.data?.detail || 'Impossibile eliminare'}`);
      }
    }
  };

  const eseguiEliminaConRiassegnazione = async () => {
    const riassegnazioniList = Object.entries(riassegnazioni).map(([mov_id, sel]) => ({
      movimento_id: mov_id,
      nuova_categoria_id: sel.l3 || sel.l2 || sel.l1
    }));
    try {
      await api.post(`/api/contabilita/categorie/${dialogRiassegna.categoriaId}/elimina-con-riassegnazione`, {
        riassegnazioni: riassegnazioniList
      });
      setDialogRiassegna({ visibile: false, movimenti: [], categoriaId: null });
      setRiassegnazioni({});
      if (selectedCategoria?.id === dialogRiassegna.categoriaId) setSelectedCategoria(null);
      await fetchData();
    } catch (error) {
      if (error.response && error.response.status !== 401) {
        alert(`Errore: ${error.response?.data?.detail || 'Impossibile eliminare'}`);
      }
    }
  };

  const categorieRadice = categorie.filter(c => !c.parent_id);
  const getSottocategorie = (parentId) => categorie.filter(c => c.parent_id === parentId);

  const getLevelLabel = (livello) => {
    switch (livello) {
      case 1: return 'Categoria';
      case 2: return 'Sottocategoria';
      case 3: return 'Microcategoria';
      default: return 'Categoria';
    }
  };

  const stampaPDF = async () => {
    const livelli = [
      livelloStampa.l1 && '1',
      livelloStampa.l2 && '2',
      livelloStampa.l3 && '3'
    ].filter(Boolean).join(',');

    if (!livelli) return;

    try {
      const res = await api.get(`/api/contabilita/categorie/stampa-pdf?livelli=${livelli}`, {
        responseType: 'blob'
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(res.data);
      link.download = 'piano_conti.pdf';
      link.click();
    } catch (error) {
      if (error.response && error.response.status !== 401) {
        alert('Errore nella generazione del PDF');
      }
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Caricamento...</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-800">📋 Gestione Categorie</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {selectedCategoria ? `Selezionata: ${selectedCategoria.nome}` : 'Seleziona una categoria'}
            </p>
          </div>
          {/* STAMPA PDF */}
          <div className="relative">
            <button
              onClick={() => setShowStampaPanel(!showStampaPanel)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-semibold flex items-center gap-2 border"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Stampa PDF
            </button>

            {showStampaPanel && (
              <div className="absolute right-0 top-10 bg-white border rounded-lg shadow-lg p-4 z-50 w-52">
                <p className="text-xs font-bold text-gray-700 mb-3">Livelli da includere:</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={livelloStampa.l1}
                      onChange={(e) => setLivelloStampa({...livelloStampa, l1: e.target.checked})} />
                    Categorie (L1)
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={livelloStampa.l2}
                      onChange={(e) => setLivelloStampa({...livelloStampa, l2: e.target.checked})} />
                    Sottocategorie (L2)
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={livelloStampa.l3}
                      onChange={(e) => setLivelloStampa({...livelloStampa, l3: e.target.checked})} />
                    Microcategorie (L3)
                  </label>
                </div>
                <button
                  onClick={stampaPDF}
                  disabled={!livelloStampa.l1 && !livelloStampa.l2 && !livelloStampa.l3}
                  className="mt-3 w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Genera PDF
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuova Categoria
          </button>
        </div>
      </div>

      {/* TABELLA */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b-2 border-gray-300 sticky top-0">
            <tr>
              <th className="text-left px-4 py-2 font-semibold text-gray-700">Nome</th>
              <th className="text-center px-4 py-2 font-semibold text-gray-700 w-32">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {categorieRadice.length === 0 ? (
              <tr><td colSpan={2} className="text-center py-8 text-gray-500">Nessuna categoria</td></tr>
            ) : (
              categorieRadice.map((cat) => {
                const sotto = getSottocategorie(cat.id);
                return (
                  <React.Fragment key={cat.id}>
                    {/* CATEGORIA PRINCIPALE */}
                    <tr className={`border-b hover:bg-blue-50 ${selectedCategoria?.id === cat.id ? 'bg-blue-500 text-white' : ''}`}>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {sotto.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCollapse(cat.id);
                              }}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              {collapsed.has(cat.id) ? '▶️' : '▼'}
                            </button>
                          )}
                          <span
                            className="font-semibold cursor-pointer"
                            onClick={() => setSelectedCategoria(cat)}
                          >
                            {cat.nome}
                          </span>
                        </div>
                      </td>
                      <td className="text-center px-2">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); openModal(null, cat); }}
                            className="p-1 text-green-600 hover:bg-green-50 rounded" title="Aggiungi sotto">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openModal(cat); }}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Modifica">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openDeleteModal(cat); }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded" title="Elimina">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* SOTTOCATEGORIE */}
                    {!collapsed.has(cat.id) && sotto.map((s) => {
                      const micro = getSottocategorie(s.id);
                      return (
                        <React.Fragment key={s.id}>
                          <tr className={`border-b hover:bg-blue-50 ${selectedCategoria?.id === s.id ? 'bg-blue-400 text-white' : 'bg-gray-50'}`}>
                            <td className="px-4 py-2">
                              <div className="flex gap-2 pl-6 items-center">
                                {micro.length > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCollapse(s.id);
                                    }}
                                    className="text-gray-600 hover:text-gray-900"
                                  >
                                    {collapsed.has(s.id) ? '▶️' : '▼'}
                                  </button>
                                )}
                                <span className="text-gray-400">↳</span>
                                <span
                                  className="font-medium cursor-pointer"
                                  onClick={() => setSelectedCategoria(s)}
                                >
                                  {s.nome}
                                </span>
                              </div>
                            </td>
                            <td className="text-center px-2">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); openModal(null, s); }}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded" title="Aggiungi micro">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); openModal(s); }}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Modifica">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); openDeleteModal(s); }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded" title="Elimina">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* MICROCATEGORIE */}
                          {!collapsed.has(s.id) && micro.map((m) => (
                            <tr key={m.id} className={`border-b hover:bg-blue-50 ${selectedCategoria?.id === m.id ? 'bg-blue-300 text-white' : 'bg-gray-100'}`}>
                              <td className="px-4 py-2">
                                <div className="flex gap-2 pl-12 items-center">
                                  <span className="text-gray-400">↳</span>
                                  <span
                                    className="text-sm cursor-pointer"
                                    onClick={() => setSelectedCategoria(m)}
                                  >
                                    {m.nome}
                                  </span>
                                </div>
                              </td>
                              <td className="text-center px-2">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); openModal(m); }}
                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Modifica">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); openDeleteModal(m); }}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded" title="Elimina">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="bg-gray-100 border-t px-4 py-2 text-xs">
        <div>Totale categorie: <strong>{categorie.length}</strong></div>
      </div>

      {/* MODALE RIASSEGNAZIONE MOVIMENTI */}
      {dialogRiassegna.visibile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b bg-red-50 flex items-center gap-3 flex-shrink-0">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-bold text-base text-red-900">Categoria con movimenti abbinati</h3>
                <p className="text-xs text-red-700">Riassegna tutti i movimenti prima di procedere</p>
              </div>
            </div>

            {/* Progress */}
            <div className="px-4 py-2 bg-gray-50 border-b flex-shrink-0">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Movimenti riassegnati</span>
                <span className="font-bold">{Object.keys(riassegnazioni).length} / {dialogRiassegna.movimenti.length}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(Object.keys(riassegnazioni).length / dialogRiassegna.movimenti.length) * 100}%`,
                    backgroundColor: Object.keys(riassegnazioni).length === dialogRiassegna.movimenti.length ? '#22c55e' : '#3b82f6'
                  }}
                />
              </div>
            </div>

            {/* Lista movimenti */}
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {dialogRiassegna.movimenti.map((mov) => {
                const catCorrente = categorie.find(c => c.id === mov.categoria_id);
                const catCorrentePadre = catCorrente?.parent_id ? categorie.find(c => c.id === catCorrente.parent_id) : null;
                const catCorrenteNonno = catCorrentePadre?.parent_id ? categorie.find(c => c.id === catCorrentePadre.parent_id) : null;
                const catCorrenteLabel = [catCorrenteNonno?.nome, catCorrentePadre?.nome, catCorrente?.nome].filter(Boolean).join(' → ');

                // Stato riassegnazione per questo movimento
                const selL1 = riassegnazioni[mov.id]?.l1 || '';
                const selL2 = riassegnazioni[mov.id]?.l2 || '';
                const selL3 = riassegnazioni[mov.id]?.l3 || '';

                // Calcola categoria finale selezionata (la più profonda)
                const catFinale = selL3 || selL2 || selL1;
                const riassegnato = !!catFinale;

                // Dropdown a cascata
                const categorieL1 = categorie.filter(c => !c.parent_id && c.id !== dialogRiassegna.categoriaId);
                const categorieL2 = selL1 ? categorie.filter(c => c.parent_id === selL1) : [];
                const categorieL3 = selL2 ? categorie.filter(c => c.parent_id === selL2) : [];

                return (
                  <div key={mov.id} className={`border rounded-lg p-3 transition-colors ${riassegnato ? 'bg-green-50 border-green-300' : 'bg-gray-50'}`}>
                    {/* Info movimento */}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs text-gray-500">
                          {mov.data_movimento ? mov.data_movimento.substring(0,10).split('-').reverse().join('/') : '—'} — {mov.registro_nome}
                          {mov.descrizione && <span className="ml-2 text-gray-400">· {mov.descrizione}</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${mov.tipo_movimento === 'entrata' ? 'text-green-600' : 'text-red-600'}`}>
                          {mov.tipo_movimento === 'entrata' ? '+' : '-'}€{parseFloat(mov.importo).toFixed(2)}
                        </span>
                        {riassegnato && <span className="text-green-600 text-lg">✅</span>}
                      </div>
                    </div>

                    {/* Prima → Dopo */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="bg-red-50 border border-red-200 rounded p-2">
                        <p className="text-xs font-bold text-red-700 mb-1">📌 Categoria attuale</p>
                        <p className="text-xs text-red-800">{catCorrenteLabel || '—'}</p>
                      </div>
                      <div className={`border rounded p-2 ${riassegnato ? 'bg-green-50 border-green-200' : 'bg-gray-100 border-gray-200'}`}>
                        <p className={`text-xs font-bold mb-1 ${riassegnato ? 'text-green-700' : 'text-gray-500'}`}>🎯 Nuova categoria</p>
                        <p className="text-xs text-gray-700">
                          {riassegnato
                            ? [
                                categorie.find(c => c.id === selL1)?.nome,
                                selL2 && categorie.find(c => c.id === selL2)?.nome,
                                selL3 && categorie.find(c => c.id === selL3)?.nome,
                              ].filter(Boolean).join(' → ')
                            : '—'
                          }
                        </p>
                      </div>
                    </div>

                    {/* Dropdown a cascata */}
                    <div className="space-y-1">
                      <select
                        className="w-full text-xs border rounded px-2 py-1.5"
                        value={selL1}
                        onChange={(e) => {
                          const newRiass = { ...riassegnazioni };
                          newRiass[mov.id] = { l1: e.target.value, l2: '', l3: '' };
                          setRiassegnazioni(newRiass);
                        }}
                      >
                        <option value="">Seleziona categoria...</option>
                        {categorieL1.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>

                      {categorieL2.length > 0 && (
                        <select
                          className="w-full text-xs border rounded px-2 py-1.5 ml-2"
                          value={selL2}
                          onChange={(e) => {
                            const newRiass = { ...riassegnazioni };
                            newRiass[mov.id] = { ...newRiass[mov.id], l2: e.target.value, l3: '' };
                            setRiassegnazioni(newRiass);
                          }}
                        >
                          <option value="">Sottocategoria (opzionale)...</option>
                          {categorieL2.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                      )}

                      {categorieL3.length > 0 && (
                        <select
                          className="w-full text-xs border rounded px-2 py-1.5 ml-4"
                          value={selL3}
                          onChange={(e) => {
                            const newRiass = { ...riassegnazioni };
                            newRiass[mov.id] = { ...newRiass[mov.id], l3: e.target.value };
                            setRiassegnazioni(newRiass);
                          }}
                        >
                          <option value="">Microcategoria (opzionale)...</option>
                          {categorieL3.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t flex gap-3 flex-shrink-0">
              <button
                onClick={() => { setDialogRiassegna({ visibile: false, movimenti: [], categoriaId: null }); setRiassegnazioni({}); }}
                className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={eseguiEliminaConRiassegnazione}
                disabled={dialogRiassegna.movimenti.some(m => !(riassegnazioni[m.id]?.l1))}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Riassegna ed Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG CONFERMA RINOMINA */}
      {dialogRinomina.visibile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-4 py-3 border-b bg-yellow-50 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="font-bold text-base text-yellow-900">Attenzione</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-700">{dialogRinomina.messaggio}</p>
              <p className="text-sm text-gray-500">I movimenti già inseriti erediteranno automaticamente il nuovo nome.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDialogRinomina({ visibile: false, messaggio: '', movimenti: 0, payload: null, url: null })}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  onClick={() => handleSubmit(null, true)}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-semibold hover:bg-yellow-600"
                >
                  Rinomina comunque
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-4 py-3 border-b bg-blue-50 flex justify-between items-center">
              <h3 className="font-bold text-base">{editing ? '✏️ Modifica' : '➕ Nuova'} {getLevelLabel(formData.livello)}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Nome {getLevelLabel(formData.livello)} *</label>
                <input type="text" value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder={formData.livello === 1 ? 'Offerte' : formData.livello === 2 ? 'Battesimi' : 'Cerimonie'}
                  required autoFocus />
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded text-xs">
                <p className="font-semibold text-blue-900">💡 Gerarchia a 3 livelli</p>
                <p className="text-blue-800 mt-1">Categoria → Sottocategoria → Microcategoria</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Annulla</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{editing ? '💾 Salva' : '✅ Crea'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ELIMINA */}
      {showDeleteModal && deletingCategoria && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="px-4 py-3 border-b bg-red-50 flex items-center gap-3">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-bold text-lg text-red-900">⚠️ ATTENZIONE</h3>
                <p className="text-sm text-red-700">Conferma Eliminazione</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                <p className="text-sm font-semibold text-yellow-900">Stai per eliminare:</p>
                <p className="text-base font-bold text-yellow-800 mt-1">"{deletingCategoria.nome}"</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <span className="text-2xl">🚨</span>
                  <div>
                    <p className="text-sm font-bold text-red-900 mb-2">CONSEGUENZE IRREVERSIBILI:</p>
                    <ul className="text-sm text-red-800 space-y-1.5 ml-4 list-disc">
                      <li>Saranno eliminate <strong>TUTTE le sottocategorie e microcategorie</strong> collegate</li>
                      <li>Saranno eliminate <strong>TUTTE le operazioni/movimenti</strong> registrati</li>
                      <li>I dati eliminati <strong>NON potranno essere recuperati</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="bg-gray-100 border rounded-lg p-3">
                <p className="text-sm text-center font-semibold">Sei <strong>assolutamente sicuro</strong> di voler procedere?</p>
              </div>
              <div className="flex gap-3">
                <button onClick={closeDeleteModal} className="flex-1 px-5 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50">❌ Annulla</button>
                {haMovimenti && (
                  <button
                    onClick={() => {
                      closeDeleteModal();
                      api.get(`/api/contabilita/categorie/${deletingCategoria.id}/movimenti-abbinati`)
                        .then(res => {
                          setRiassegnazioni({});
                          setDialogRiassegna({ visibile: true, movimenti: res.data.movimenti, categoriaId: deletingCategoria.id });
                        });
                    }}
                    className="flex-1 px-5 py-2.5 bg-yellow-500 text-white rounded-lg text-sm font-bold hover:bg-yellow-600"
                  >
                    Riassegna movimenti
                  </button>
                )}
                <button onClick={confirmDelete} className="flex-1 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700">⚠️ SÌ, ELIMINA TUTTO</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categorie;
