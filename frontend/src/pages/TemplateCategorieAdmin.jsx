import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderAmministrazione from '../components/HeaderAmministrazione';

const TemplateCategorieAdmin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categorie, setCategorie] = useState([]);
  
  // Stati per accordion
  const [expanded, setExpanded] = useState(new Set());
  
  // Form nuova categoria
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    descrizione: '',
    categoria_padre_id: null,
    livello: 1,
    ordine: 0
  });

  // Modale modifica
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState(null);
  const [editFormData, setEditFormData] = useState({
    descrizione: '',
    ordine: 0
  });

  // Statistiche
  const [stats, setStats] = useState({
    totale: 0
  });

  useEffect(() => {
    loadCategorie();
  }, []);

  const loadCategorie = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/template-categorie', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Errore nel caricamento');

      const data = await response.json();
      
      // Costruisci albero manualmente
      const tree = buildTree(data);
      setCategorie(tree);
      
      setStats({
        totale: data.length
      });
      
    } catch (err) {
      setError('Errore nel caricamento delle categorie');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (flatList) => {
    const map = {};
    const roots = [];

    // Prima passata: crea mappa
    flatList.forEach(item => {
      map[item.id] = { ...item, children: [] };
    });

    // Seconda passata: collega figli
    flatList.forEach(item => {
      if (item.categoria_padre_id) {
        const parent = map[item.categoria_padre_id];
        if (parent) {
          parent.children.push(map[item.id]);
        }
      } else {
        roots.push(map[item.id]);
      }
    });

    // Funzione di ordinamento: numeri prima, poi alfabetico
    const smartSort = (a, b) => {
      const aStartsWithNum = /^\d/.test(a.descrizione);
      const bStartsWithNum = /^\d/.test(b.descrizione);
      
      // Se entrambi iniziano con numero o entrambi con lettera
      if (aStartsWithNum === bStartsWithNum) {
        return a.descrizione.localeCompare(b.descrizione, 'it', { numeric: true });
      }
      
      // Numeri prima delle lettere
      return aStartsWithNum ? -1 : 1;
    };

    // Ordina root
    roots.sort(smartSort);

    // Ordina figli ricorsivamente (sempre alfabetici)
    const sortChildren = (items) => {
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          item.children.sort((a, b) => a.descrizione.localeCompare(b.descrizione, 'it'));
          sortChildren(item.children);
        }
      });
    };
    sortChildren(roots);

    return roots;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      // Genera codice automatico progressivo
      const codice = generaCodiceAutomatico(formData.categoria_padre_id);
      
      const response = await fetch('/api/template-categorie', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          codice
        })
      });

      if (!response.ok) throw new Error('Errore nel salvataggio');

      await loadCategorie();
      setFormData({ descrizione: '', categoria_padre_id: null, livello: 1, ordine: 0 });
      setShowAddForm(false);
      alert('Categoria aggiunta con successo!');
    } catch (err) {
      alert('Errore nel salvataggio della categoria');
      console.error(err);
    }
  };

  const generaCodiceAutomatico = (padreId) => {
    if (!padreId) {
      // Categoria principale: trova il numero massimo e aggiungi 1
      const maxCodice = categorie
        .filter(c => !c.categoria_padre_id)
        .map(c => parseInt(c.codice) || 0)
        .reduce((max, num) => Math.max(max, num), 0);
      return String(maxCodice + 1);
    } else {
      // Sottocategoria: trova il padre e conta i figli
      const findCategory = (list, id) => {
        for (const cat of list) {
          if (cat.id === id) return cat;
          if (cat.children) {
            const found = findCategory(cat.children, id);
            if (found) return found;
          }
        }
        return null;
      };
      
      const padre = findCategory(categorie, padreId);
      if (!padre) return '1.1';
      
      const numFigli = padre.children ? padre.children.length : 0;
      return `${padre.codice}.${numFigli + 1}`;
    }
  };

  const handleDelete = async (id, descrizione) => {
    if (!window.confirm(`Sei sicuro di voler eliminare "${descrizione}"?\n\n⚠️ Verranno eliminate anche tutte le sottocategorie!`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/template-categorie/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Errore nell\'eliminazione');

      await loadCategorie();
      alert('Categoria eliminata con successo!');
    } catch (err) {
      alert('Errore nell\'eliminazione della categoria');
      console.error(err);
    }
  };

  const handleEdit = (categoria) => {
    setEditingCategoria(categoria);
    setEditFormData({
      descrizione: categoria.descrizione,
      ordine: categoria.ordine
    });
    setShowEditModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/template-categorie/${editingCategoria.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      });

      if (!response.ok) throw new Error('Errore nell\'aggiornamento');

      await loadCategorie();
      setShowEditModal(false);
      setEditingCategoria(null);
      alert('Categoria aggiornata con successo!');
    } catch (err) {
      alert('Errore nell\'aggiornamento della categoria');
      console.error(err);
    }
  };

  const toggleExpand = (id) => {
    const newSet = new Set(expanded);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpanded(newSet);
  };

  const expandAll = () => {
    const collectIds = (items) => {
      let ids = [];
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          ids.push(item.id);
          ids = ids.concat(collectIds(item.children));
        }
      });
      return ids;
    };

    const allIds = collectIds(categorie);
    setExpanded(new Set(allIds));
  };

  const collapseAll = () => {
    setExpanded(new Set());
  };

  const renderCategoria = (categoria, depth = 0) => {
    const hasChildren = categoria.children && categoria.children.length > 0;
    const isExpanded = expanded.has(categoria.id);
    const indent = depth * 24;

    return (
      <div key={categoria.id}>
        {/* Riga categoria */}
        <div 
          className={`flex items-center justify-between py-1.5 px-3 hover:bg-gray-50 border-b border-gray-100 ${
            depth === 0 ? 'bg-gray-50 font-semibold' : ''
          }`}
          style={{ paddingLeft: `${indent + 12}px` }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {hasChildren && (
              <button
                onClick={() => toggleExpand(categoria.id)}
                className="text-gray-500 hover:text-gray-700 flex-shrink-0"
              >
                <svg 
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
            {!hasChildren && <span className="w-4"></span>}
            
            <span className={`text-[10px] font-mono text-gray-500 w-14 flex-shrink-0 ${depth === 0 ? 'font-bold' : ''}`}>
              {categoria.codice}
            </span>
            
            <span className={`text-[11px] text-gray-800 truncate ${depth === 0 ? 'font-bold text-gray-900' : ''}`} title={categoria.descrizione}>
              {categoria.descrizione}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {hasChildren && (
              <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                {categoria.children.length}
              </span>
            )}
            <button
              onClick={() => handleEdit(categoria)}
              className="text-blue-600 hover:bg-blue-100 p-0.5 rounded transition-colors"
              title="Modifica"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => handleDelete(categoria.id, categoria.descrizione)}
              className="text-red-600 hover:bg-red-100 p-0.5 rounded transition-colors"
              title="Elimina"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sottocategorie */}
        {hasChildren && isExpanded && (
          <div>
            {categoria.children.map(child => renderCategoria(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Caricamento template categorie...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Riutilizzabile */}
      <HeaderAmministrazione />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">

        {/* Titolo Pagina + Torna Home */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">📋</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Categorie CEI</h2>
              <p className="text-xs text-gray-600">Gestione categorie contabili standard diocesano ({stats.totale} categorie)</p>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/amministrazione')}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Torna alla Home
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded text-sm">
            {error}
          </div>
        )}

        {/* Statistica Ultra-Compatta */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📋</span>
              <div>
                <div className="text-xs font-semibold text-purple-700 uppercase">Categorie</div>
                <div className="text-[10px] text-purple-600">Numero Categorie Presenti</div>
              </div>
            </div>
            <span className="text-2xl font-bold text-purple-800">{stats.totale}</span>
          </div>
        </div>

        {/* Bottone Aggiungi */}
        <div className="mb-3">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              showAddForm 
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {showAddForm ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Chiudi Form
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Aggiungi Categoria
              </>
            )}
          </button>
        </div>

        {/* Form Aggiungi - Collapsabile */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-3">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-8">
                  <input
                    type="text"
                    placeholder="Descrizione categoria *"
                    value={formData.descrizione}
                    onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <select
                    value={formData.categoria_padre_id || ''}
                    onChange={(e) => {
                      const padreId = e.target.value || null;
                      setFormData({ 
                        ...formData, 
                        categoria_padre_id: padreId,
                        livello: padreId ? 2 : 1
                      });
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">🔹 Principale</option>
                    {categorie.filter(c => c.livello === 1).map(cat => (
                      <option key={cat.id} value={cat.id}>
                        └─ {cat.descrizione}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1">
                  <input
                    type="number"
                    placeholder="Ord."
                    value={formData.ordine}
                    onChange={(e) => setFormData({ ...formData, ordine: parseInt(e.target.value) || 0 })}
                    className="w-full px-1 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-2 focus:ring-purple-500"
                    title="Ordine di visualizzazione"
                  />
                </div>
                <div className="col-span-1">
                  <button
                    type="submit"
                    className="w-full bg-purple-600 text-white py-1.5 rounded hover:bg-purple-700 text-xs font-medium"
                    title="Salva"
                  >
                    💾
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-gray-500">
                💡 <strong>Descrizione:</strong> Usa numeri all'inizio (es: "1. Offerte") per ordine custom, altrimenti ordine alfabetico.
                <strong> Sottocategorie:</strong> Sempre alfabetiche.
              </p>
            </form>
          </div>
        )}

        {/* LISTA UNICA CATEGORIE */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-b-2 border-purple-200 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <h3 className="font-bold text-purple-800 text-sm">TUTTE LE CATEGORIE</h3>
              <span className="bg-purple-200 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {stats.totale}
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={expandAll}
                className="text-[10px] bg-purple-200 text-purple-800 px-2 py-1 rounded hover:bg-purple-300 font-semibold"
              >
                ⬇ Espandi Tutto
              </button>
              <button
                onClick={collapseAll}
                className="text-[10px] bg-purple-200 text-purple-800 px-2 py-1 rounded hover:bg-purple-300 font-semibold"
              >
                ⬆ Chiudi Tutto
              </button>
            </div>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {categorie.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                <div className="text-4xl mb-2">📭</div>
                <div className="font-semibold">Nessuna categoria trovata</div>
                <div className="text-xs mt-1">Aggiungi la prima categoria usando il form sopra</div>
              </div>
            ) : (
              categorie.map(cat => renderCategoria(cat))
            )}
          </div>
        </div>

      </div>

      {/* Modale Modifica */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">✏️ Modifica Categoria</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit}>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Descrizione</label>
                  <input
                    type="text"
                    value={editFormData.descrizione}
                    onChange={(e) => setEditFormData({ ...editFormData, descrizione: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Ordine (solo categorie principali)</label>
                  <input
                    type="number"
                    value={editFormData.ordine}
                    onChange={(e) => setEditFormData({ ...editFormData, ordine: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Le sottocategorie sono ordinate alfabeticamente</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm"
                >
                  💾 Salva
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-lg text-sm"
                >
                  ❌ Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateCategorieAdmin;