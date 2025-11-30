import { useState, useEffect } from 'react';
import api from '../services/api';

function ImpostazioniDatiGenerali() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    denominazione: '',
    codice_fiscale: '',
    partita_iva: '',
    indirizzo: '',
    cap: '',
    comune: '',
    provincia: '',
    regione: '',
    telefono: '',
    fax: '',
    email: '',
    sito_web: '',
    parroco: '',
    vicario: '',
    diocesi: '',
    anno_fondazione: '',
    santo_patrono: '',
    numero_abitanti: ''
  });

  useEffect(() => {
    loadDatiEnte();
  }, []);

  const loadDatiEnte = async () => {
    try {
      const enteId = localStorage.getItem('current_ente_id');
      const token = localStorage.getItem('token');

      const response = await api.get(`/api/enti/${enteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const ente = response.data;
      setFormData({
        denominazione: ente.denominazione || '',
        codice_fiscale: ente.codice_fiscale || '',
        partita_iva: ente.partita_iva || '',
        indirizzo: ente.indirizzo || '',
        cap: ente.cap || '',
        comune: ente.comune || '',
        provincia: ente.provincia || '',
        regione: ente.regione || '',
        telefono: ente.telefono || '',
        fax: ente.fax || '',
        email: ente.email || '',
        sito_web: ente.sito_web || '',
        parroco: ente.parroco || '',
        vicario: ente.vicario || '',
        diocesi: ente.diocesi || '',
        anno_fondazione: ente.anno_fondazione || '',
        santo_patrono: ente.santo_patrono || '',
        numero_abitanti: ente.numero_abitanti || ''
      });
    } catch (error) {
      console.error('Errore caricamento dati:', error);
      alert('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const enteId = localStorage.getItem('current_ente_id');
      const token = localStorage.getItem('token');

      await api.put(`/api/enti/${enteId}`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      alert('Dati salvati con successo!');
      
      // Aggiorna i dati in localStorage
      const updatedEnte = await api.get(`/api/enti/${enteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      localStorage.setItem('current_ente', JSON.stringify(updatedEnte.data));
      
      // Ricarica la pagina per aggiornare l'header
      window.location.reload();
    } catch (error) {
      console.error('Errore salvataggio:', error);
      alert('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* HEADER */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Dati Generali Parrocchia</h2>
          <p className="text-gray-600 mt-1">Informazioni complete della parrocchia</p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Denominazione */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Denominazione ufficiale completa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="denominazione"
                value={formData.denominazione}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Codice Fiscale */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Codice Fiscale <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="codice_fiscale"
                value={formData.codice_fiscale}
                onChange={handleInputChange}
                required
                maxLength="16"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Partita IVA */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Partita IVA</label>
              <input
                type="text"
                name="partita_iva"
                value={formData.partita_iva}
                onChange={handleInputChange}
                maxLength="11"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Indirizzo */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Indirizzo (via, numero civico)
              </label>
              <input
                type="text"
                name="indirizzo"
                value={formData.indirizzo}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* CAP */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">CAP</label>
              <input
                type="text"
                name="cap"
                value={formData.cap}
                onChange={handleInputChange}
                maxLength="5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Comune */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Comune</label>
              <input
                type="text"
                name="comune"
                value={formData.comune}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Provincia */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Provincia</label>
              <input
                type="text"
                name="provincia"
                value={formData.provincia}
                onChange={handleInputChange}
                maxLength="2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Regione */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Regione</label>
              <input
                type="text"
                name="regione"
                value={formData.regione}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Telefono */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Telefono</label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Fax */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Fax</label>
              <input
                type="tel"
                name="fax"
                value={formData.fax}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email ufficiale</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Sito Web */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sito web</label>
              <input
                type="url"
                name="sito_web"
                value={formData.sito_web}
                onChange={handleInputChange}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Parroco */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Parroco (nome completo)</label>
              <input
                type="text"
                name="parroco"
                value={formData.parroco}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Vicario */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Vicario (nome completo)</label>
              <input
                type="text"
                name="vicario"
                value={formData.vicario}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Diocesi */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Diocesi di appartenenza</label>
              <input
                type="text"
                name="diocesi"
                value={formData.diocesi}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Anno Fondazione */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Anno di fondazione</label>
              <input
                type="number"
                name="anno_fondazione"
                value={formData.anno_fondazione}
                onChange={handleInputChange}
                min="1000"
                max="2100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Santo Patrono */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Santo patrono</label>
              <input
                type="text"
                name="santo_patrono"
                value={formData.santo_patrono}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Numero Abitanti */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Numero abitanti parrocchia</label>
              <input
                type="number"
                name="numero_abitanti"
                value={formData.numero_abitanti}
                onChange={handleInputChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* BOTTONE SALVA */}
          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {saving ? 'Salvataggio...' : 'Salva Modifiche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ImpostazioniDatiGenerali;
