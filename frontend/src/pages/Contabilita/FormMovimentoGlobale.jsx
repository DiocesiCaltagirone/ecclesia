import React, { useState, useEffect } from 'react';

const FormMovimentoGlobale = ({ movimento, onClose, onSave, categorie }) => {
  const [conti, setConti] = useState([]);
  const [loadingConti, setLoadingConti] = useState(true);

  // 🆕 Stati per giroconto
  const [isGiroconto, setIsGiroconto] = useState(false);
  const [contoDestinazione, setContoDestinazione] = useState('');

  const [formData, setFormData] = useState({
    registro_id: '',
    data_movimento: '',
    tipo_movimento: 'uscita',
    categoria_id: '',
    sottocategoria_id: '',
    microcategoria_id: '',
    importo: '',
    note: ''
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Categorie filtrate per livello
  const [categorieBase, setCategorieBase] = useState([]);
  const [sottocategorie, setSottocategorie] = useState([]);
  const [microcategorie, setMicrocategorie] = useState([]);

  const token = localStorage.getItem('token');
  const enteId = localStorage.getItem('ente_id');
  const headers = { 'Authorization': `Bearer ${token}`, 'X-Ente-Id': enteId };

  // Carica lista conti
  useEffect(() => {
    fetchConti();
  }, []);

  const fetchConti = async () => {
    try {
      const res = await fetch('/api/contabilita/registri', { headers });
      if (res.ok) {
        const data = await res.json();
        setConti(data || []);
      }
    } catch (error) {
      console.error('Errore caricamento conti:', error);
    } finally {
      setLoadingConti(false);
    }
  };

  // 🆕 UseEffect SOLO per inizializzare il form (una volta sola)
  useEffect(() => {
    // Carica TUTTE le categorie base (senza filtro per conto)
    const base = categorie.filter(cat => !cat.parent_id);
    setCategorieBase(base);

    // 🔧 FIX: Aggiunto movimento.id per distinguere modifica da nuovo con registro preimpostato
    if (movimento && movimento.id && categorie.length > 0) {
      const isModifica = movimento.id && movimento.categoria_id;

      let categoriaId = '';
      let sottocategoriaId = '';
      let microcategoriaId = '';

      if (isModifica) {
        const categoriaFinale = categorie.find(c => c.id === movimento.categoria_id);

        if (categoriaFinale) {
          if (categoriaFinale.parent_id) {
            const parent = categorie.find(c => c.id === categoriaFinale.parent_id);

            if (parent && parent.parent_id) {
              microcategoriaId = categoriaFinale.id;
              sottocategoriaId = parent.id;
              categoriaId = parent.parent_id;

              const sotto = categorie.filter(cat => cat.parent_id === categoriaId);
              setSottocategorie(sotto);
              const micro = categorie.filter(cat => cat.parent_id === sottocategoriaId);
              setMicrocategorie(micro);
            } else if (parent) {
              sottocategoriaId = categoriaFinale.id;
              categoriaId = parent.id;

              const sotto = categorie.filter(cat => cat.parent_id === categoriaId);
              setSottocategorie(sotto);
              setMicrocategorie([]);
            }
          } else {
            categoriaId = categoriaFinale.id;
            setSottocategorie([]);
            setMicrocategorie([]);
          }
        }
      }

      // Imposta formData iniziale
      setFormData({
        registro_id: movimento.registro_id || '',
        data_movimento: movimento.data_movimento || new Date().toISOString().split('T')[0],
        tipo_movimento: movimento.tipo_movimento || 'uscita',
        categoria_id: categoriaId,
        sottocategoria_id: sottocategoriaId,
        microcategoria_id: microcategoriaId,
        importo: movimento.importo || '',
        note: movimento.note || ''
      });

    // 🔧 FIX: Cambiato da "else if (!movimento)" a "else" per catturare anche nuovo con registro_id
    } else {
      // Nuovo movimento (con o senza registro_id preimpostato)
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        registro_id: movimento?.registro_id || '',  // 🔧 FIX: Prende registro_id se passato
        data_movimento: today,
        tipo_movimento: 'uscita',
        categoria_id: '',
        sottocategoria_id: '',
        microcategoria_id: '',
        importo: '',
        note: ''
      });
      setSottocategorie([]);
      setMicrocategorie([]);
    }
  }, [movimento, categorie]);

  // 🆕 Funzione per cambiare conto (mantiene le categorie selezionate)
  const handleContoChange = (nuovoConto) => {
    setFormData(prev => ({
      ...prev,
      registro_id: nuovoConto
    }));
    // Se il conto destinazione è uguale al nuovo conto origine, resetta
    if (contoDestinazione === nuovoConto) {
      setContoDestinazione('');
    }
  };

  // 🆕 Handler per toggle giroconto
  const handleGirocontoToggle = (checked) => {
    setIsGiroconto(checked);
    if (!checked) {
      setContoDestinazione('');
    }
  };

  const handleCategoriaChange = (value) => {
    setFormData(prev => ({
      ...prev,
      categoria_id: value,
      sottocategoria_id: '',
      microcategoria_id: ''
    }));

    // Tutte le sottocategorie di questa categoria
    const sotto = categorie.filter(cat => cat.parent_id === value);
    setSottocategorie(sotto);
    setMicrocategorie([]);
  };

  const handleSottocategoriaChange = (value) => {
    setFormData(prev => ({
      ...prev,
      sottocategoria_id: value,
      microcategoria_id: ''
    }));

    // Tutte le microcategorie di questa sottocategoria
    const micro = categorie.filter(cat => cat.parent_id === value);
    setMicrocategorie(micro);
  };

  const handleMicrocategoriaChange = (value) => {
    setFormData(prev => ({ ...prev, microcategoria_id: value }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.registro_id) newErrors.registro_id = 'Seleziona un conto';
    if (!formData.data_movimento) newErrors.data_movimento = 'Richiesta';
    if (!formData.importo || parseFloat(formData.importo) <= 0) newErrors.importo = 'Importo > 0';

    // 🆕 Validazione giroconto
    if (isGiroconto) {
      if (!contoDestinazione) {
        newErrors.contoDestinazione = 'Seleziona conto destinazione';
      }
    } else {
      // Solo per movimenti normali: richiedi categoria
      const categoriaFinale = formData.microcategoria_id || formData.sottocategoria_id || formData.categoria_id;
      if (!categoriaFinale) newErrors.categoria = 'Seleziona categoria';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      // 🆕 Se è un giroconto, chiama endpoint specifico
      if (isGiroconto) {
        const payload = {
          conto_origine_id: formData.registro_id,
          conto_destinazione_id: contoDestinazione,
          data_movimento: formData.data_movimento,
          importo: parseFloat(formData.importo),
          note: formData.note.trim()
        };

        const res = await fetch('/api/contabilita/movimenti/giroconto', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          onClose();
          // Ricarica dati
          if (typeof onSave === 'function') {
            await onSave({}, null); // Trigger refresh
          }
        } else {
          const errorData = await res.json();
          alert(errorData.detail || 'Errore creazione giroconto');
        }
      } else {
        // Movimento normale
        const categoriaFinale = formData.microcategoria_id || formData.sottocategoria_id || formData.categoria_id;

        const payload = {
          registro_id: formData.registro_id,
          data_movimento: formData.data_movimento,
          tipo_movimento: formData.tipo_movimento,
          importo: parseFloat(formData.importo),
          categoria_id: categoriaFinale,
          note: formData.note.trim()
        };

        await onSave(payload, movimento?.id);
        onClose();
      }
    } catch (error) {
      alert('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  // 🆕 Filtra conti per destinazione (escludi conto origine)
  const contiDestinazioneDisponibili = conti.filter(c => c.id !== formData.registro_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        {/* HEADER MINI */}
        <div className="px-3 py-2 border-b flex items-center justify-between bg-blue-50">
          <h3 className="text-sm font-bold text-gray-800">
            {movimento?.id ? '✏️ Modifica' : '➕ Nuovo'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* FORM SUPER-COMPATTO */}
        <form onSubmit={handleSubmit} className="p-3 space-y-2">

          {/* CONTO ORIGINE */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-0.5">
              {isGiroconto ? 'Conto Origine *' : 'Conto *'}
            </label>
            <select
              value={formData.registro_id}
              onChange={(e) => handleContoChange(e.target.value)}
              disabled={loadingConti}
              className={`w-full px-2 py-1 border rounded text-xs ${errors.registro_id ? 'border-red-500' : 'border-gray-300'
                } ${loadingConti ? 'bg-gray-100' : ''}`}
            >
              <option value="">
                {loadingConti ? 'Caricamento...' : 'Seleziona conto...'}
              </option>
              {conti.map(conto => (
                <option key={conto.id} value={conto.id}>
                  {conto.nome} {conto.tipo ? `(${conto.tipo})` : ''}
                </option>
              ))}
            </select>
            {errors.registro_id && <p className="text-red-500 text-xs mt-0.5">{errors.registro_id}</p>}
          </div>

          {/* 🆕 CHECKBOX GIROCONTO + CONTO DESTINAZIONE */}
          {!movimento?.id && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGiroconto}
                  onChange={(e) => handleGirocontoToggle(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-gray-700">Giroconto</span>
              </label>

              {/* Dropdown destinazione (visibile solo se giroconto attivo) */}
              {isGiroconto && (
                <select
                  value={contoDestinazione}
                  onChange={(e) => setContoDestinazione(e.target.value)}
                  className={`flex-1 px-2 py-1 border rounded text-xs ${errors.contoDestinazione ? 'border-red-500' : 'border-gray-300'
                    }`}
                >
                  <option value="">→ Seleziona destinazione...</option>
                  {contiDestinazioneDisponibili.map(conto => (
                    <option key={conto.id} value={conto.id}>
                      {conto.nome} {conto.tipo ? `(${conto.tipo})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          {errors.contoDestinazione && (
            <p className="text-red-500 text-xs">{errors.contoDestinazione}</p>
          )}

          {/* DATA */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-0.5">Data *</label>
            <input
              type="date"
              value={formData.data_movimento}
              onChange={(e) => handleChange('data_movimento', e.target.value)}
              className={`w-full px-2 py-1 border rounded text-xs ${errors.data_movimento ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.data_movimento && <p className="text-red-500 text-xs mt-0.5">{errors.data_movimento}</p>}
          </div>

          {/* 🆕 SEZIONE CATEGORIA/TIPO - NASCOSTA SE GIROCONTO */}
          {!isGiroconto && (
            <>
              {/* CATEGORIA */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-0.5">Categoria *</label>
                <select
                  value={formData.categoria_id}
                  onChange={(e) => handleCategoriaChange(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="">Seleziona...</option>
                  {categorieBase && categorieBase.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>

              {/* SOTTOCATEGORIA */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-0.5">Sottocategoria</label>
                <select
                  value={formData.sottocategoria_id}
                  onChange={(e) => handleSottocategoriaChange(e.target.value)}
                  disabled={!sottocategorie || sottocategorie.length === 0}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">{!sottocategorie || sottocategorie.length === 0 ? '---' : 'Nessuna'}</option>
                  {sottocategorie && sottocategorie.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>

              {/* MICROCATEGORIA */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-0.5">Microcategoria</label>
                <select
                  value={formData.microcategoria_id}
                  onChange={(e) => handleMicrocategoriaChange(e.target.value)}
                  disabled={!microcategorie || microcategorie.length === 0}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">{!microcategorie || microcategorie.length === 0 ? '---' : 'Nessuna'}</option>
                  {microcategorie && microcategorie.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>

              {errors.categoria && <p className="text-red-500 text-xs">{errors.categoria}</p>}

              {/* TIPO MOVIMENTO */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-0.5">Tipo</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleChange('tipo_movimento', 'uscita')}
                    className={`flex-1 px-2 py-1 rounded text-xs font-semibold ${formData.tipo_movimento === 'uscita'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                      }`}
                  >
                    📤 Uscita
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('tipo_movimento', 'entrata')}
                    className={`flex-1 px-2 py-1 rounded text-xs font-semibold ${formData.tipo_movimento === 'entrata'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                      }`}
                  >
                    📥 Entrata
                  </button>
                </div>
              </div>
            </>
          )}

          {/* IMPORTO */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-0.5">Importo *</label>
            <div className="relative">
              <span className="absolute left-2 top-1 text-gray-500 text-xs">€</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.importo}
                onChange={(e) => handleChange('importo', e.target.value)}
                placeholder="0,00"
                className={`w-full pl-6 pr-2 py-1 border rounded text-xs ${errors.importo ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>
            {errors.importo && <p className="text-red-500 text-xs mt-0.5">{errors.importo}</p>}
          </div>

          {/* NOTE */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-0.5">
              Note {isGiroconto && <span className="text-gray-400">(opzionale)</span>}
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => handleChange('note', e.target.value)}
              rows="2"
              placeholder={isGiroconto ? "Note aggiuntive..." : "Descrizione..."}
              maxLength="200"
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs resize-none"
            />
          </div>

          {/* 🆕 INFO GIROCONTO */}
          {isGiroconto && formData.registro_id && contoDestinazione && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-800">
              <div className="font-semibold mb-1">📋 Riepilogo Giroconto:</div>
              <div>• Uscita da: <strong>{conti.find(c => c.id === formData.registro_id)?.nome}</strong></div>
              <div>• Entrata in: <strong>{conti.find(c => c.id === contoDestinazione)?.nome}</strong></div>
              <div className="mt-1 text-[10px] text-blue-600">
                Verranno creati 2 movimenti automaticamente collegati
              </div>
            </div>
          )}

          {/* BUTTONS */}
          <div className="flex gap-1.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-2 py-1.5 border text-gray-700 rounded text-xs font-semibold hover:bg-gray-50"
              disabled={saving}
            >
              Annulla
            </button>
            <button
              type="submit"
              className={`flex-1 px-2 py-1.5 text-white rounded text-xs font-semibold disabled:opacity-50 ${
                isGiroconto 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={saving}
            >
              {saving ? 'Salvo...' : isGiroconto ? '🔄 Esegui Giroconto' : '💾 Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormMovimentoGlobale;
