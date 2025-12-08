import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderAmministrazione from '../components/HeaderAmministrazione';

const ImpostazioniDiocesi = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [impostazioni, setImpostazioni] = useState({
    nome_diocesi: '',
    vescovo_nome: '',
    vescovo_titolo: 'Vescovo',
    logo_path: null,
    logo_nome: null,
    logo_dimensione: null,
    timbro_path: null,
    timbro_nome: null,
    timbro_dimensione: null,
    firma_path: null,
    firma_nome: null,
    firma_dimensione: null
  });

  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    fetchImpostazioni();
  }, []);

  const fetchImpostazioni = async () => {
    try {
      const res = await fetch('/api/admin/impostazioni-diocesi', { headers });
      if (res.ok) {
        const data = await res.json();
        setImpostazioni(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Errore:', error);
    } finally {
      setLoading(false);
    }
  };

  const salvaImpostazioni = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/impostazioni-diocesi', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_diocesi: impostazioni.nome_diocesi,
          vescovo_nome: impostazioni.vescovo_nome,
          vescovo_titolo: impostazioni.vescovo_titolo
        })
      });
      if (res.ok) {
        alert('✅ Impostazioni salvate!');
      }
    } catch (error) {
      alert('❌ Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (tipo, file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`/api/admin/impostazioni-diocesi/upload/${tipo}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        await fetchImpostazioni();
      } else {
        alert('❌ Errore upload');
      }
    } catch (error) {
      alert('❌ Errore: ' + error.message);
    }
  };

  const eliminaFile = async (tipo) => {
    if (!confirm('Eliminare questo file?')) return;
    try {
      const res = await fetch(`/api/admin/impostazioni-diocesi/file/${tipo}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        await fetchImpostazioni();
      }
    } catch (error) {
      alert('❌ Errore eliminazione');
    }
  };

  const FileBox = ({ tipo, label, path, nome, dimensione }) => (
    <div className="flex-1 border border-gray-200 rounded-lg p-3 bg-white">
      <div className="text-xs font-semibold text-gray-600 mb-2">{label}</div>
      {path ? (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-green-600 text-xs">
            <span>✅</span>
            <span className="truncate max-w-[100px]" title={nome}>{nome || 'Caricato'}</span>
          </div>
          {dimensione && (
            <div className="text-[10px] text-gray-400">{(dimensione / 1024).toFixed(0)} KB</div>
          )}
          <div className="flex gap-1 mt-1">
            <label className="cursor-pointer text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
              🔄
              <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadFile(tipo, e.target.files[0])} className="hidden" />
            </label>
            <button onClick={() => eliminaFile(tipo)} className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">
              🗑️
            </button>
          </div>
        </div>
      ) : (
        <label className="cursor-pointer block text-center py-3 border-2 border-dashed border-gray-300 rounded text-xs text-gray-400 hover:border-purple-400 hover:text-purple-500">
          📤 Carica
          <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadFile(tipo, e.target.files[0])} className="hidden" />
        </label>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Caricamento impostazioni...</p>
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
              <span className="text-2xl">⚙️</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Impostazioni Diocesi</h2>
              <p className="text-xs text-gray-600">Configurazione generale della diocesi</p>
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

        {/* FORM COMPATTO */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {/* Dati Diocesi */}
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">📄 Dati Diocesi</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nome Diocesi</label>
                <input
                  type="text"
                  value={impostazioni.nome_diocesi || ''}
                  onChange={(e) => setImpostazioni({...impostazioni, nome_diocesi: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  placeholder="Diocesi di..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nome Vescovo (completo)</label>
                <input
                  type="text"
                  value={impostazioni.vescovo_nome || ''}
                  onChange={(e) => setImpostazioni({...impostazioni, vescovo_nome: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  placeholder="S.E. Mons. ..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Titolo Vescovo</label>
                <input
                  type="text"
                  value={impostazioni.vescovo_titolo || ''}
                  onChange={(e) => setImpostazioni({...impostazioni, vescovo_titolo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  placeholder="Vescovo"
                />
              </div>
            </div>
          </div>

          {/* Loghi e Firme */}
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">🖼️ Loghi e Firme</h3>
            <div className="flex gap-3">
              <FileBox 
                tipo="logo" 
                label="Logo Diocesi" 
                path={impostazioni.logo_path}
                nome={impostazioni.logo_nome}
                dimensione={impostazioni.logo_dimensione}
              />
              <FileBox 
                tipo="timbro" 
                label="Timbro Vescovo" 
                path={impostazioni.timbro_path}
                nome={impostazioni.timbro_nome}
                dimensione={impostazioni.timbro_dimensione}
              />
              <FileBox 
                tipo="firma" 
                label="Firma Vescovo" 
                path={impostazioni.firma_path}
                nome={impostazioni.firma_nome}
                dimensione={impostazioni.firma_dimensione}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">💡 Usa PNG con sfondo trasparente per risultati migliori nei PDF</p>
          </div>

          {/* Bottone Salva */}
          <div className="flex justify-end pt-3 border-t border-gray-200">
            <button
              onClick={salvaImpostazioni}
              disabled={saving}
              className="px-5 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 text-sm"
            >
              {saving ? '⏳ Salvataggio...' : '💾 Salva Impostazioni'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ImpostazioniDiocesi;