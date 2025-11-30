// frontend/src/components/sacramenti/FormPrimaComunione.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';

const FormPrimaComunione = ({ personaId, data, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    data_comunione: data?.data_comunione?.split('T')[0] || '',
    luogo: data?.luogo || '',
    parrocchia: data?.parrocchia || '',
    celebrante: data?.celebrante || '',
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
      const response = await axios.get(
        'http://localhost:8000/api/comuni',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCitta(response.data);
    } catch (err) {
      console.error('Errore caricamento città:', err);
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

      if (!fuoriParrocchia && enteCorrente) {
        payload.luogo = `${enteCorrente.comune}`;
        payload.parrocchia = enteCorrente.denominazione;
      }

      if (data?.id) {
        await axios.put(
          `http://localhost:8000/sacramenti/prime-comunioni/${data.id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          'http://localhost:8000/sacramenti/prime-comunioni',
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      onSave();
    } catch (err) {
      console.error('Errore salvataggio prima comunione:', err);
      setError(err.response?.data?.detail || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-lg w-full max-w-2xl shadow-2xl">
        
        <div className="bg-white border-b px-4 py-2.5 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-800">
            🕊️ {data ? 'Modifica' : 'Aggiungi'} Prima Comunione
          </h3>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Fuori parrocchia?</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox"
                checked={fuoriParrocchia}
                onChange={(e) => setFuoriParrocchia(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
            </label>
          </div>
          
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded p-2.5">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">📅 Data</h4>
            <div>
              <label className="block text-[11px] text-gray-600 mb-0.5">
                Data Prima Comunione <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.data_comunione}
                onChange={(e) => setFormData({...formData, data_comunione: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-yellow-500"
              />
            </div>
          </div>

          {fuoriParrocchia ? (
            <div className="bg-orange-50 border border-orange-200 rounded p-2">
              <p className="text-xs text-orange-700 mb-2">
                ⚠️ Prima Comunione celebrata fuori dalla parrocchia
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Città</label>
                  <select
                    value={cittaSelezionata}
                    onChange={(e) => {
                      setCittaSelezionata(e.target.value);
                      setFormData({...formData, luogo: e.target.value});
                    }}
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
                    onChange={(e) => {
                      setParrocchiaSelezionata(e.target.value);
                      setFormData({...formData, parrocchia: e.target.value});
                    }}
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
                  <p className="text-xs font-semibold text-green-800">Prima Comunione nella tua parrocchia</p>
                  {enteCorrente && (
                    <p className="text-xs text-green-700">
                      {enteCorrente.denominazione} - {enteCorrente.comune}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Celebrante</label>
            <input
              type="text"
              value={formData.celebrante}
              onChange={(e) => setFormData({...formData, celebrante: e.target.value})}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-yellow-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Note</label>
            <textarea
              rows="2"
              value={formData.note}
              onChange={(e) => setFormData({...formData, note: e.target.value})}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-yellow-500 resize-none"
            />
          </div>

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
              className="px-3 py-1.5 text-sm text-white bg-yellow-600 rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormPrimaComunione;
