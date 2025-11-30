// frontend/src/components/sacramenti/CardPrimaComunione.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { Calendar, MapPin, User, Edit2, Trash2 } from 'lucide-react';

const CardPrimaComunione = ({ data, onEdit, onDelete }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questa prima comunione?')) return;

    try {
      setDeleting(true);
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:8000/sacramenti/prime-comunioni/${data.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onDelete();
    } catch (error) {
      console.error('Errore eliminazione prima comunione:', error);
      alert('Errore durante l\'eliminazione');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT');
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
      
      {/* Data e Luogo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex items-start gap-2">
          <Calendar className="text-yellow-600 mt-0.5" size={18} />
          <div>
            <div className="text-xs text-gray-600">Data</div>
            <div className="font-medium text-gray-900">{formatDate(data.data_comunione)}</div>
          </div>
        </div>

        {data.luogo && (
          <div className="flex items-start gap-2">
            <MapPin className="text-yellow-600 mt-0.5" size={18} />
            <div>
              <div className="text-xs text-gray-600">Luogo</div>
              <div className="font-medium text-gray-900">{data.luogo}</div>
            </div>
          </div>
        )}
      </div>

      {/* Parrocchia e Celebrante */}
      {(data.parrocchia || data.celebrante) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.parrocchia && (
            <div className="flex items-start gap-2">
              <MapPin className="text-yellow-600 mt-0.5" size={18} />
              <div>
                <div className="text-xs text-gray-600">Parrocchia</div>
                <div className="font-medium text-gray-900">{data.parrocchia}</div>
              </div>
            </div>
          )}

          {data.celebrante && (
            <div className="flex items-start gap-2">
              <User className="text-yellow-600 mt-0.5" size={18} />
              <div>
                <div className="text-xs text-gray-600">Celebrante</div>
                <div className="font-medium text-gray-900">{data.celebrante}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Note */}
      {data.note && (
        <div className="bg-white bg-opacity-50 p-2 rounded">
          <div className="text-xs text-gray-600 mb-1">Note</div>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">{data.note}</div>
        </div>
      )}

      {/* Azioni */}
      <div className="flex justify-end gap-2 pt-2 border-t border-yellow-200">
        <button
          onClick={() => onEdit(data)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors"
        >
          <Edit2 size={14} />
          Modifica
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <Trash2 size={14} />
          {deleting ? 'Eliminazione...' : 'Elimina'}
        </button>
      </div>
    </div>
  );
};

export default CardPrimaComunione;
