import React, { useState, useEffect } from 'react';

const ModalAllegati = ({ movimento, onClose }) => {
  const [allegati, setAllegati] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    caricaAllegati();
  }, [movimento.id]);

  const caricaAllegati = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8000/api/contabilita/movimenti/${movimento.id}/allegati`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAllegati(data);
      }
    } catch (error) {
      console.error('Errore caricamento allegati:', error);
      setError('Impossibile caricare gli allegati');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);

    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(
          `http://localhost:8000/api/contabilita/movimenti/${movimento.id}/allegati`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Errore upload');
        }
      }

      await caricaAllegati();

    } catch (error) {
      console.error('Errore upload:', error);
      setError(error.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = async (allegato) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8000/api/contabilita/allegati/${allegato.id}/download`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = allegato.nome_originale;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Errore download:', error);
      alert('Errore durante il download del file');
    }
  };

  const handleElimina = async (allegato) => {
    if (!window.confirm(`Eliminare "${allegato.nome_originale}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8000/api/contabilita/allegati/${allegato.id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        await caricaAllegati();
      }
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Errore durante l\'eliminazione del file');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (tipo) => {
    if (tipo?.startsWith('image/')) return '🖼️';
    return '📄';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[65vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-2.5 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold">📎 Allegati</h2>
            <p className="text-xs text-blue-100 mt-0.5">
              {new Date(movimento.data_movimento).toLocaleDateString('it-IT')} -
              {movimento.note || 'Movimento'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-700 p-2 rounded"
          >
            ✕
          </button>
        </div>

        {/* Contenuto */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Upload */}
          <div className="mb-3">
            <label className="block w-full">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors">
                <div className="text-2xl mb-1">📤</div>
                <p className="text-xs text-gray-600">
                  <span className="text-blue-600 font-semibold">Clicca per caricare</span> o trascina file
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, JPG, PNG (max 10MB)
                </p>
              </div>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {/* Stato Upload */}
          {uploading && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
              Caricamento in corso...
            </div>
          )}

          {/* Errori */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
              ⚠️ {error}
            </div>
          )}

          {/* Lista Allegati */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              Caricamento...
            </div>
          ) : allegati.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-5xl mb-2">📁</div>
              <p>Nessun allegato presente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allegati.map((allegato) => (
                <div
                  key={allegato.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl">{getFileIcon(allegato.tipo_file)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {allegato.nome_originale}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatBytes(allegato.dimensione)} • {new Date(allegato.created_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(allegato)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Scarica"
                    >
                      ⬇️
                    </button>
                    <button
                      onClick={() => handleElimina(allegato)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Elimina"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-2.5 flex justify-between items-center border-t">
          <p className="text-xs text-gray-600">
            Totale: {allegati.length} {allegati.length === 1 ? 'allegato' : 'allegati'}
          </p>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAllegati;