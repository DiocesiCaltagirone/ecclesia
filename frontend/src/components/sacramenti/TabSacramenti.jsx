// frontend/src/components/sacramenti/TabSacramenti.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CardBattesimo from './CardBattesimo';
import CardPrimaComunione from './CardPrimaComunione';
import CardCresima from './CardCresima';
import CardMatrimonio from './CardMatrimonio';
import FormBattesimo from './FormBattesimo';
import FormPrimaComunione from './FormPrimaComunione';
import FormCresima from './FormCresima';
import FormMatrimonio from './FormMatrimonio';

const TabSacramenti = ({ persona }) => {
  const [sacramenti, setSacramenti] = useState({
    battesimo: null,
    prima_comunione: null,
    cresima: null,
    matrimoni: []
  });
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState(null); // 'battesimo' | 'comunione' | 'cresima' | 'matrimonio'
  const [editingData, setEditingData] = useState(null);

  useEffect(() => {
    loadSacramenti();
  }, [persona.id]);

  const loadSacramenti = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:8000/sacramenti/persone/${persona.id}/riepilogo`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSacramenti(response.data);
    } catch (error) {
      console.error('Errore caricamento sacramenti:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (tipo) => {
    setEditingData(null);
    setActiveForm(tipo);
  };

  const handleEdit = (tipo, data) => {
    setEditingData(data);
    setActiveForm(tipo);
  };

  const handleCloseForm = () => {
    setActiveForm(null);
    setEditingData(null);
  };

  const handleSave = async () => {
    await loadSacramenti();
    handleCloseForm();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Caricamento sacramenti...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* BATTESIMO */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            ✝️ Battesimo
          </h3>
          {!sacramenti.battesimo && (
            <button
              onClick={() => handleAdd('battesimo')}
              className="text-sm px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              + Aggiungi
            </button>
          )}
        </div>
        {sacramenti.battesimo ? (
          <CardBattesimo
            data={sacramenti.battesimo}
            onEdit={(data) => handleEdit('battesimo', data)}
            onDelete={loadSacramenti}
          />
        ) : (
          <div className="text-gray-500 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
            Non ancora ricevuto
          </div>
        )}
      </div>

      {/* PRIMA COMUNIONE */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            🕊️ Prima Comunione
          </h3>
          {!sacramenti.prima_comunione && (
            <button
              onClick={() => handleAdd('comunione')}
              className="text-sm px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              + Aggiungi
            </button>
          )}
        </div>
        {sacramenti.prima_comunione ? (
          <CardPrimaComunione
            data={sacramenti.prima_comunione}
            onEdit={(data) => handleEdit('comunione', data)}
            onDelete={loadSacramenti}
          />
        ) : (
          <div className="text-gray-500 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
            Non ancora ricevuta
          </div>
        )}
      </div>

      {/* CRESIMA */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            🔥 Cresima
          </h3>
          {!sacramenti.cresima && (
            <button
              onClick={() => handleAdd('cresima')}
              className="text-sm px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              + Aggiungi
            </button>
          )}
        </div>
        {sacramenti.cresima ? (
          <CardCresima
            data={sacramenti.cresima}
            onEdit={(data) => handleEdit('cresima', data)}
            onDelete={loadSacramenti}
          />
        ) : (
          <div className="text-gray-500 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
            Non ancora ricevuta
          </div>
        )}
      </div>

      {/* MATRIMONIO */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            💍 Matrimonio
          </h3>
          <button
            onClick={() => handleAdd('matrimonio')}
            className="text-sm px-3 py-1 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            + Aggiungi
          </button>
        </div>
        {sacramenti.matrimoni && sacramenti.matrimoni.length > 0 ? (
          <div className="space-y-3">
            {sacramenti.matrimoni.map((matrimonio) => (
              <CardMatrimonio
                key={matrimonio.id}
                data={matrimonio}
                personaId={persona.id}
                onEdit={(data) => handleEdit('matrimonio', data)}
                onDelete={loadSacramenti}
              />
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
            Nessun matrimonio registrato
          </div>
        )}
      </div>

      {/* MODALS FORM */}
      {activeForm === 'battesimo' && (
        <FormBattesimo
          personaId={persona.id}
          data={editingData}
          onClose={handleCloseForm}
          onSave={handleSave}
        />
      )}

      {activeForm === 'comunione' && (
        <FormPrimaComunione
          personaId={persona.id}
          data={editingData}
          onClose={handleCloseForm}
          onSave={handleSave}
        />
      )}

      {activeForm === 'cresima' && (
        <FormCresima
          personaId={persona.id}
          data={editingData}
          onClose={handleCloseForm}
          onSave={handleSave}
        />
      )}

      {activeForm === 'matrimonio' && (
        <FormMatrimonio
          personaId={persona.id}
          data={editingData}
          onClose={handleCloseForm}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default TabSacramenti;
