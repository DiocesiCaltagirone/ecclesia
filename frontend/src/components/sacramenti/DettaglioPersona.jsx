// frontend/src/components/DettaglioPersona.jsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import TabSacramenti from './sacramenti/TabSacramenti';

const DettaglioPersona = ({ persona, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('anagrafica');

  const tabs = [
    { id: 'anagrafica', label: '📋 Anagrafica', icon: '📋' },
    { id: 'sacramenti', label: '✝️ Sacramenti', icon: '✝️' },
    { id: 'famiglia', label: '👨‍👩‍👧 Famiglia', icon: '👨‍👩‍👧' },
    { id: 'note', label: '📝 Note', icon: '📝' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {persona.nome} {persona.cognome}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {persona.data_nascita && `Nato/a il ${new Date(persona.data_nascita).toLocaleDateString('it-IT')}`}
              {persona.luogo_nascita && ` a ${persona.luogo_nascita}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b bg-gray-50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'anagrafica' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <p className="text-gray-900">{persona.nome}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                  <p className="text-gray-900">{persona.cognome}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data di nascita</label>
                  <p className="text-gray-900">
                    {persona.data_nascita ? new Date(persona.data_nascita).toLocaleDateString('it-IT') : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Luogo di nascita</label>
                  <p className="text-gray-900">{persona.luogo_nascita || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sesso</label>
                  <p className="text-gray-900">{persona.sesso === 'M' ? 'Maschio' : persona.sesso === 'F' ? 'Femmina' : '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                  <p className="text-gray-900">{persona.telefono || '-'}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                  <p className="text-gray-900">{persona.indirizzo || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comune</label>
                  <p className="text-gray-900">{persona.comune || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CAP</label>
                  <p className="text-gray-900">{persona.cap || '-'}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{persona.email || '-'}</p>
                </div>
                {persona.note && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{persona.note}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sacramenti' && (
            <TabSacramenti persona={persona} />
          )}

          {activeTab === 'famiglia' && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">👨‍👩‍👧 Sezione Famiglia</p>
              <p className="text-sm mt-2">Funzionalità in sviluppo</p>
            </div>
          )}

          {activeTab === 'note' && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">📝 Sezione Note</p>
              <p className="text-sm mt-2">Funzionalità in sviluppo</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

export default DettaglioPersona;
