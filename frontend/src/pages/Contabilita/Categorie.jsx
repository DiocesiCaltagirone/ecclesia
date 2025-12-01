import React, { useState, useEffect } from 'react';

const Categorie = () => {
  const [categorie, setCategorie] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCategoria, setDeletingCategoria] = useState(null);
  const [editing, setEditing] = useState(null);
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [collapsed, setCollapsed] = useState(new Set());
  const [formData, setFormData] = useState({
    nome: '',
    parent_id: null,
    livello: 1,
  });

  const token = localStorage.getItem('token');
  const enteId = localStorage.getItem('ente_id');
  const headers = { 'Authorization': `Bearer ${token}`, 'X-Ente-Id': enteId };

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
      const res = await fetch('/api/contabilita/categorie', { headers });
      if (res.ok) {
        const data = await res.json();
        setCategorie(data.categorie || []);
      } else {
        console.error('Errore fetch categorie:', res.status);
      }
    } catch (error) {
      console.error('Errore connessione:', error);
      alert('❌ Backend non raggiungibile!\n\nAssicurati che il server sia avviato:\ncd backend\nuvicorn main:app --reload --host 0.0.0.0 --port 8000');
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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

    try {
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchData();
        closeModal();
      } else {
        const error = await res.json();
        alert(`Errore: ${error.detail || JSON.stringify(error)}`);
      }
    } catch (error) {
      alert(`Errore: ${error.message}`);
    }
  };

  const openDeleteModal = (cat) => {
    setDeletingCategoria(cat);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingCategoria(null);
  };

  const confirmDelete = async () => {
    if (!deletingCategoria) return;

    try {
      const res = await fetch(`/api/contabilita/categorie/${deletingCategoria.id}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        if (selectedCategoria?.id === deletingCategoria.id) setSelectedCategoria(null);
        await fetchData();
        closeDeleteModal();
      } else {
        const error = await res.json();
        alert(`Errore: ${error.detail || 'Impossibile eliminare'}`);
      }
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Errore durante eliminazione');
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
