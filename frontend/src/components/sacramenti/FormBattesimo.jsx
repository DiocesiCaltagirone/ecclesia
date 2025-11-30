// frontend/src/components/sacramenti/FormBattesimo.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';

const FormBattesimo = ({ personaId, data, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    data_battesimo: data?.data_battesimo?.split('T')[0] || '',
    volume: data?.volume || '',
    pagina: data?.pagina || '',
    numero_atto: data?.numero_atto || '',
    luogo: data?.luogo || '',
    parrocchia: data?.parrocchia || '',
    celebrante: data?.celebrante || '',
    padrino: data?.padrino || '',
    madrina: data?.madrina || '',
    note: data?.note || ''
  });
  
  const [fuoriParrocchia, setFuoriParrocchia] = useState(false);
  const [citta, setCitta] = useState([]);
  const [parrocchie, setParrocchie] = useState([]);
  const [cittaSelezionata, setCittaSelezionata] = useState('');
  const [parrocchiaSelezionata, setParrocchiaSelezionata] = useState('');
  const [enteCorrente, setEnteCorrente] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEnteCorrente();
    loadCitta();
  }, []);

  useEffect(() => {
    if (cittaSelezionata) {
      loadParrocchie(cittaSelezionata);
    }
  }, [cittaSelezionata]);

  const loadEnteCorrente = async () => {
    try {
      const token = localStorage.getItem('token');
      const enteId = localStorage.getItem('selectedEnteId');
      const response = await axios.get(
        `http://localhost:8000/api/enti/${enteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEnteCorrente(response.data);
    } catch (err) {
      console.error('Errore caricamento ente:', err);
    }
  };

  const loadCitta = async () => {
    try {
      const token = localStorage.getItem('token');
      // Assumo che ci sia un endpoint per ottenere i comuni
      const response = await axios.get(
        'http://localhost:8000/api/comuni',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCitta(response.data);
    } catch (err) {
      console.error('Errore caricamento città:', err);
      // Fallback con dati fissi
      setCitta([
        { comune: 'Caltagirone' },
        { comune: 'Catania' },
        { comune: 'Acireale' }
      ]);
    }
  };

  const loadParrocchie = async (comune) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:8000/api/enti?comune=${comune}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setParrocchie(response.data);
    } catch (err) {
      console.error('Errore caricamento parrocchie:', err);
      setParrocchie([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      
      let payload = {
        ...formData,
        persona_id: personaId
      };

      // Se NON è fuori parrocchia, usa i dati dell'ente corrente
      if (!fuoriParrocchia && enteCorrente) {
        payload.luogo = `${enteCorrente.comune}`;
        payload.parrocchia = enteCorrente.denominazione;
      }

      if (data?.id) {
        // UPDATE
        await axios.put(
          `http://localhost:8000/sacramenti/battesimi/${data.id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // CREATE
        await axios.post(
          'http://localhost:8000/sacramenti/battesimi',
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      onSave();
    } catch (err) {
      console.error('Errore salvataggio battesimo:', err);
      setError(err.response?.data?.detail || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFuoriParrocchia = (checked) => {
    setFuoriParrocchia(checked);
    if (!checked) {
      // Reset selezioni
      setCittaSelezionata('');
      setParrocchiaSelezionata('');
      setFormData({
        ...formData,
        luogo: '',
        parrocchia: ''
      });
    }
  };

  const handleCittaChange = (comune) => {
    setCittaSelezionata(comune);
    setFormData({ ...formData, luogo: comune });
  };

  const handleParrocchiaChange = (parrocchiaNome) => {
    setParrocchiaSelezionata(parrocchiaNome);
    setFormData({ ...formData, parrocchia: parrocchiaNome });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-lg w-full max-w-2xl shadow-2xl">
        
        {/* Header con Toggle */}
        <div className="bg-white border-b px-4 py-2.5 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-800">
            ✝️ {data ? 'Modifica' : 'Aggiungi'} Battesimo
          </h3>
          
          {/* Toggle Fuori Parrocchia */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Fuori parrocchia?</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox"
                checked={fuoriParrocchia}
                onChange={(e) => handleToggleFuoriParrocchia(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {/* Dati Registro */}
          <div className="bg-blue-50 border border-blue-200 rounded p-2.5">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">📖 Dati Registro</h4>
            
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <label className="block text-[11px] text-gray-600 mb-0.5">Volume</label>
                <input
                  type="text"
                  value={formData.volume}
                  onChange={(e) => setFormData({...formData, volume: e.target.value})}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 mb-0.5">Pagina</label>
                <input
                  type="text"
                  value={formData.pagina}
                  onChange={(e) => setFormData({...formData, pagina: e.target.value})}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 mb-0.5">N. Atto</label>
                <input
                  type="text"
                  value={formData.numero_atto}
                  onChange={(e) => setFormData({...formData, numero_atto: e.target.value})}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[11px] text-gray-600 mb-0.5">
                Data Battesimo <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.data_battesimo}
                onChange={(e) => setFormData({...formData, data_battesimo: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Sezione Fuori Parrocchia */}
          {fuoriParrocchia ? (
            <div className="bg-orange-50 border border-orange-200 rounded p-2">
              <p className="text-xs text-orange-700 mb-2">
                ⚠️ Battesimo celebrato fuori dalla parrocchia
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Città</label>
                  <select
                    value={cittaSelezionata}
                    onChange={(e) => handleCittaChange(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="">-- Seleziona città --</option>
                    {citta.map((c) => (
                      <option key={c.comune} value={c.comune}>{c.comune}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Parrocchia</label>
                  <select
                    value={parrocchiaSelezionata}
                    onChange={(e) => handleParrocchiaChange(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="">-- Seleziona parrocchia --</option>
                    {parrocchie.map((p) => (
                      <option key={p.id} value={p.denominazione}>{p.denominazione}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded p-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">✅</span>
                <div>
                  <p className="text-xs font-semibold text-green-800">Battesimo nella tua parrocchia</p>
                  {enteCorrente && (
                    <p className="text-xs text-green-700">
                      {enteCorrente.denominazione} - {enteCorrente.comune}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Celebrante */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Celebrante</label>
            <input
              type="text"
              value={formData.celebrante}
              onChange={(e) => setFormData({...formData, celebrante: e.target.value})}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Padrini */}
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2.5">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">🤝 Padrini</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-gray-600 mb-0.5">Padrino</label>
                <input
                  type="text"
                  value={formData.padrino}
                  onChange={(e) => setFormData({...formData, padrino: e.target.value})}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 mb-0.5">Madrina</label>
                <input
                  type="text"
                  value={formData.madrina}
                  onChange={(e) => setFormData({...formData, madrina: e.target.value})}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Note</label>
            <textarea
              rows="2"
              value={formData.note}
              onChange={(e) => setFormData({...formData, note: e.target.value})}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Bottoni */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormBattesimo;
