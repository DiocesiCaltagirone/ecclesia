// frontend/src/components/sacramenti/CardMatrimonio.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { Calendar, MapPin, User, BookOpen, Users, Edit2, Trash2 } from 'lucide-react';

const CardMatrimonio = ({ data, personaId, onEdit, onDelete }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo matrimonio?')) return;

    try {
      setDeleting(true);
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:8000/sacramenti/matrimoni/${data.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onDelete();
    } catch (error) {
      console.error('Errore eliminazione matrimonio:', error);
      alert('Errore durante l\'eliminazione');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT');
  };

  // Determina se questa persona è sposo o sposa
  const isSposo = data.sposo_id === personaId;
  const ruolo = isSposo ? 'Sposo' : 'Sposa';

  return (
    <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 space-y-3">
      
      {/* Ruolo */}
      <div className="text-xs text-pink-600 font-medium">
        {ruolo} in questo matrimonio
      </div>

      {/* Data e Luogo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex items-start gap-2">
          <Calendar className="text-pink-600 mt-0.5" size={18} />
          <div>
            <div className="text-xs text-gray-600">Data</div>
            <div className="font-medium text-gray-900">{formatDate(data.data_matrimonio)}</div>
          </div>
        </div>

        {data.luogo && (
          <div className="flex items-start gap-2">
            <MapPin className="text-pink-600 mt-0.5" size={18} />
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
              <MapPin className="text-pink-600 mt-0.5" size={18} />
              <div>
                <div className="text-xs text-gray-600">Parrocchia</div>
                <div className="font-medium text-gray-900">{data.parrocchia}</div>
              </div>
            </div>
          )}

          {data.celebrante && (
            <div className="flex items-start gap-2">
              <User className="text-pink-600 mt-0.5" size={18} />
              <div>
                <div className="text-xs text-gray-600">Celebrante</div>
                <div className="font-medium text-gray-900">{data.celebrante}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dati Registro */}
      {(data.volume || data.pagina || data.numero_atto) && (
        <div className="flex items-start gap-2 bg-white bg-opacity-50 p-2 rounded">
          <BookOpen className="text-pink-600 mt-0.5" size={18} />
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

      {/* Rito */}
      {data.rito && (
        <div className="flex items-start gap-2">
          <User className="text-pink-600 mt-0.5" size={18} />
          <div>
            <div className="text-xs text-gray-600">Rito</div>
            <div className="font-medium text-gray-900">{data.rito}</div>
          </div>
        </div>
      )}

      {/* Testimoni */}
      {(data.testimone1_sposo || data.testimone2_sposo || data.testimone1_sposa || data.testimone2_sposa) && (
        <div className="flex items-start gap-2">
          <Users className="text-pink-600 mt-0.5" size={18} />
          <div className="flex-1">
            <div className="text-xs text-gray-600 mb-1">Testimoni</div>
            <div className="text-sm space-y-1">
              {data.testimone1_sposo && (
                <div>
                  <span className="text-gray-600">Testimone 1 sposo:</span>{' '}
                  <span className="font-medium text-gray-900">{data.testimone1_sposo}</span>
                </div>
              )}
              {data.testimone2_sposo && (
                <div>
                  <span className="text-gray-600">Testimone 2 sposo:</span>{' '}
                  <span className="font-medium text-gray-900">{data.testimone2_sposo}</span>
                </div>
              )}
              {data.testimone1_sposa && (
                <div>
                  <span className="text-gray-600">Testimone 1 sposa:</span>{' '}
                  <span className="font-medium text-gray-900">{data.testimone1_sposa}</span>
                </div>
              )}
              {data.testimone2_sposa && (
                <div>
                  <span className="text-gray-600">Testimone 2 sposa:</span>{' '}
                  <span className="font-medium text-gray-900">{data.testimone2_sposa}</span>
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
      <div className="flex justify-end gap-2 pt-2 border-t border-pink-200">
        <button
          onClick={() => onEdit(data)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-pink-600 hover:bg-pink-100 rounded-lg transition-colors"
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

export default CardMatrimonio;
