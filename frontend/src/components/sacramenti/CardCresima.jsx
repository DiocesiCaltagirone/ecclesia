// frontend/src/components/sacramenti/CardCresima.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { Calendar, MapPin, User, BookOpen, Users, Edit2, Trash2 } from 'lucide-react';

const CardCresima = ({ data, onEdit, onDelete }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questa cresima?')) return;

    try {
      setDeleting(true);
      const token = localStorage.getItem('token');
      await axios.delete(
        `/sacramenti/cresime/${data.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onDelete();
    } catch (error) {
      console.error('Errore eliminazione cresima:', error);
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
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
      
      {/* Data e Luogo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex items-start gap-2">
          <Calendar className="text-red-600 mt-0.5" size={18} />
          <div>
            <div className="text-xs text-gray-600">Data</div>
            <div className="font-medium text-gray-900">{formatDate(data.data_cresima)}</div>
          </div>
        </div>

        {data.luogo && (
          <div className="flex items-start gap-2">
            <MapPin className="text-red-600 mt-0.5" size={18} />
            <div>
              <div className="text-xs text-gray-600">Luogo</div>
              <div className="font-medium text-gray-900">{data.luogo}</div>
            </div>
          </div>
        )}
      </div>

      {/* Parrocchia e Ministro */}
      {(data.parrocchia || data.ministro) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.parrocchia && (
            <div className="flex items-start gap-2">
              <MapPin className="text-red-600 mt-0.5" size={18} />
              <div>
                <div className="text-xs text-gray-600">Parrocchia</div>
                <div className="font-medium text-gray-900">{data.parrocchia}</div>
              </div>
            </div>
          )}

          {data.ministro && (
            <div className="flex items-start gap-2">
              <User className="text-red-600 mt-0.5" size={18} />
              <div>
                <div className="text-xs text-gray-600">Ministro</div>
                <div className="font-medium text-gray-900">{data.ministro}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dati Registro */}
      {(data.volume || data.pagina || data.numero_atto) && (
        <div className="flex items-start gap-2 bg-white bg-opacity-50 p-2 rounded">
          <BookOpen className="text-red-600 mt-0.5" size={18} />
          <div className="flex-1">
            <div className="text-xs text-gray-600 mb-1">Registro</div>
            <div className="text-sm text-gray-900">
              {data.volume && `Vol. ${data.volume}`}
              {data.pagina && `, Pag. ${data.pagina}`}
              {data.numero_atto && `, Atto n. ${data.numero_atto}`}
            </div>
          </div>
        </div>
      )}

      {/* Padrini */}
      {(data.padrino || data.madrina) && (
        <div className="flex items-start gap-2">
          <Users className="text-red-600 mt-0.5" size={18} />
          <div className="flex-1">
            <div className="text-xs text-gray-600 mb-1">Padrini di Cresima</div>
            <div className="text-sm space-y-1">
              {data.padrino && (
                <div>
                  <span className="text-gray-600">Padrino:</span>{' '}
                  <span className="font-medium text-gray-900">{data.padrino}</span>
                </div>
              )}
              {data.madrina && (
                <div>
                  <span className="text-gray-600">Madrina:</span>{' '}
                  <span className="font-medium text-gray-900">{data.madrina}</span>
                </div>
              )}
            </div>
          </div>
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
      <div className="flex justify-end gap-2 pt-2 border-t border-red-200">
        <button
          onClick={() => onEdit(data)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 rounded-lg transition-colors"
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

export default CardCresima;
